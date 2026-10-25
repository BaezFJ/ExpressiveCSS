// Input mask. Typing goes through the real keyboard. A paste is
// `insertText`, the one-step insertion of a whole string that a paste
// performs, because clipboard access needs permissions only Chromium grants.
// IME composition is dispatched from the page in every engine, and also
// driven through CDP in Chromium; no engine here runs a real IME.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const field = (id, mask, extra = '') => `<div class="field">
      <input id="${id}" name="${id}" type="tel" placeholder=" " data-mask="${mask}" ${extra}>
      <label for="${id}">${id}</label>
    </div>`;

const html = `<style>${css}</style>
  <form id="form">
    ${field('phone', '(000) 000-0000', 'inputmode="numeric"')}
    ${field('code', 'aa-0000', 'type="text"')}
    ${field('escaped', '\\0*0', 'type="text"')}
    ${field('saved', '(000) 000-0000', 'value="5551234567"')}
    ${field('keyed', '(000) 000-0000', 'inputmode="none"')}
    <div class="keypad" role="group" aria-label="Keypad" aria-controls="keyed">
      <button type="button" value="1">1</button>
      <button type="button" value="5">5</button>
    </div>
    <button type="reset" id="clear">Reset</button>
  </form>
  <script>${js}</script>
  <script>
    const form = document.getElementById('form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      window.submitted = new FormData(event.target).get('phone');
    });
    // Attached before AutoInit runs, so they come first in their phase.
    window.events = [];
    for (const type of ['input', 'change']) {
      document.getElementById('saved').addEventListener(type, () => window.events.push(type));
    }
    window.seen = {};
    const phone = document.getElementById('phone');
    for (const [name, target] of Object.entries({ field: phone, form, document })) {
      target.addEventListener('input', (event) => {
        if (event.target === phone) window.seen[name] = phone.value;
      });
    }
  </script>`;

/** Opens the fixture and returns the page and a reader for a field's state. */
async function open(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent(html);
  await page.evaluate(() => Expressive.AutoInit());
  const state = (id = 'phone') =>
    page.evaluate((id) => {
      const field = document.getElementById(id);
      return { value: field.value, start: field.selectionStart, end: field.selectionEnd };
    }, id);
  /** Sets the phone field's value and selection as a starting point. */
  const start = (value, from, to = from) =>
    page.evaluate(
      ([value, from, to]) => {
        const field = document.getElementById('phone');
        field.focus();
        field.value = value;
        field.setSelectionRange(from, to);
      },
      [value, from, to]
    );
  return { page, state, start };
}

/** Runs `body` with a fresh page in each engine, then closes the browser. */
function each(name, body) {
  for (const [engine, browserType, browserTest] of engines) {
    browserTest(`${engine}: ${name}`, async () => {
      const browser = await leaseBrowser(browserType);
      try {
        await body(await open(browser), engine);
      } finally {
        await browser.close();
      }
    });
  }
}

each("typed and pasted digits take the mask's pattern, and the form submits it", async ({ page, state }) => {
  await page.click('#phone');
  await page.keyboard.type('5551');
  assert.deepEqual(await state(), { value: '(555) 1', start: 7, end: 7 });
  await page.keyboard.type('234567');
  assert.deepEqual(await state(), { value: '(555) 123-4567', start: 14, end: 14 });

  await page.fill('#phone', '');
  await page.keyboard.insertText('555.123.4567');
  assert.deepEqual(await state(), { value: '(555) 123-4567', start: 14, end: 14 });

  const read = await page.evaluate(() => {
    const form = document.getElementById('form');
    form.requestSubmit();
    return { formData: new FormData(form).get('phone'), submitted: window.submitted };
  });
  assert.deepEqual(read, { formData: '(555) 123-4567', submitted: '(555) 123-4567' });
});

each('characters that fit no slot, a typed literal and characters past the end are dropped', async ({ page, state }) => {
  await page.click('#phone');
  await page.keyboard.type('55a5)');
  assert.equal((await state()).value, '(555');
  await page.keyboard.type('12345678');
  assert.equal((await state()).value, '(555) 123-4567');
  await page.click('#code');
  await page.keyboard.type('ÉB1234');
  assert.equal((await state('code')).value, 'ÉB-1234');
  await page.click('#escaped');
  await page.keyboard.type('x5');
  assert.equal((await state('escaped')).value, '0x5');
});

each('Backspace and Delete next to a literal remove the digit across it', async ({ page, state, start }) => {
  await start('(555) 123-4567', 6);
  await page.keyboard.press('Backspace');
  assert.deepEqual(await state(), { value: '(551) 234-567', start: 3, end: 3 });
  await start('(555) 123-4567', 4);
  await page.keyboard.press('Delete');
  assert.deepEqual(await state(), { value: '(555) 234-567', start: 4, end: 4 });
  await start('(555) 123-4567', 6, 9);
  await page.keyboard.press('Backspace');
  assert.deepEqual(await state(), { value: '(555) 456-7', start: 4, end: 4 });
  await start('(555', 1);
  await page.keyboard.type('9');
  assert.deepEqual(await state(), { value: '(955) 5', start: 2, end: 2 });
});

each('the field waits for a composition to end, in either event order', async ({ page, state }, engine) => {
  for (const order of ['input first', 'compositionend first']) {
    const during = await page.evaluate((order) => {
      const field = document.getElementById('phone');
      field.focus();
      field.value = '';
      field.dispatchEvent(new CompositionEvent('compositionstart', { data: '' }));
      field.value = '55a';
      field.setSelectionRange(3, 3);
      const end = () => field.dispatchEvent(new CompositionEvent('compositionend', { data: '55a' }));
      const input = (isComposing) =>
        field.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing, inputType: 'insertCompositionText', data: '55a' }));
      input(true);
      const during = field.value;
      if (order === 'input first') end();
      else {
        end();
        input(false);
      }
      return during;
    }, order);
    assert.equal(during, '55a', order);
    assert.deepEqual(await state(), { value: '(55', start: 3, end: 3 }, order);
  }
  if (engine !== 'chromium') return;
  const cdp = await page.context().newCDPSession(page);
  await page.fill('#phone', '');
  await cdp.send('Input.imeSetComposition', { text: '５５５１', selectionStart: 4, selectionEnd: 4 });
  assert.equal((await state()).value, '５５５１');
  await cdp.send('Input.insertText', { text: '５５５１' });
  assert.deepEqual(await state(), { value: '(555) 1', start: 7, end: 7 });
});

each('a saved value is formatted on start without events, and again after a reset', async ({ page, state }) => {
  assert.equal((await state('saved')).value, '(555) 123-4567');
  assert.deepEqual(await page.evaluate(() => window.events), []);
  for (const reset of [() => page.click('#clear'), () => page.evaluate(() => document.getElementById('form').reset())]) {
    await page.fill('#saved', '1');
    await reset();
    await page.waitForFunction(() => document.getElementById('saved').value === '(555) 123-4567');
  }
});

each("the page's input listeners read the formatted value", async ({ page }) => {
  await page.click('#phone');
  await page.keyboard.type('5551');
  assert.deepEqual(await page.evaluate(() => window.seen), { field: '(555) 1', form: '(555) 1', document: '(555) 1' });
});

each('keypad keys format the field like typing', async ({ page, state }) => {
  await page.click('#keyed');
  for (const key of ['5', '5', '5', '1']) await page.click(`.keypad button[value="${key}"]`);
  assert.equal((await state('keyed')).value, '(555) 1');
});

each('destroy() stops formatting', async ({ page, state }) => {
  await page.evaluate(() => Expressive.InputMask.getInstance(document.getElementById('phone')).destroy());
  await page.click('#phone');
  await page.keyboard.type('5551');
  assert.equal((await state()).value, '5551');
});
