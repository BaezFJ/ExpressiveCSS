// Currency input. Typing goes through the real keyboard. A paste is
// `insertText`, the one-step insertion of a whole string that a paste
// performs, because clipboard access needs permissions only Chromium grants.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const field = (id, currency, extra = '') => `<div class="field">
      <input id="${id}" name="${id}" type="text" inputmode="decimal" placeholder=" " data-currency="${currency}" ${extra}>
      <label for="${id}">${id}</label>
    </div>`;

const html = `<style>${css}</style>
  <form id="form" lang="de">
    ${field('amount', 'EUR')}
    ${field('saved', 'EUR', 'value="1234.5"')}
    ${field('checked', 'EUR', 'class="validate"')}
    ${field('german', 'EUR', `data-currency-input-options='{"i18n":{"invalid":"Betrag eingeben."}}'`)}
    ${field('off', 'EUR', 'value="5" disabled')}
    <div class="field"><input id="unnamed" type="text" data-currency="EUR" value="7"><label for="unnamed">unnamed</label></div>
    <button type="submit">Send</button>
    <button type="reset" id="clear">Reset</button>
  </form>
  <form id="us" lang="en">
    ${field('price', 'USD')}
  </form>
  <div lang="de">${field('loose', 'EUR')}</div>
  <div id="host"></div>
  <script>${js}</script>
  <script>
    window.submitted = {};
    for (const form of document.forms) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        window.submitted[form.id] = Object.fromEntries(new FormData(form));
      });
    }
    // Attached before AutoInit runs, so they come first in their phase.
    window.events = [];
    for (const type of ['input', 'change']) {
      document.getElementById('saved').addEventListener(type, () => window.events.push(type));
    }
    window.seen = {};
    const amount = document.getElementById('amount');
    for (const type of ['change', 'blur']) amount.addEventListener(type, () => (window.seen[type] = amount.value));
  </script>`;

/** Opens the fixture and returns the page and a reader for a field's state. */
async function open(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent(html);
  await page.evaluate(() => {
    const root = document.getElementById('host').attachShadow({ mode: 'open' });
    root.innerHTML = '<form lang="de"><input name="shadowed" data-currency="EUR" value="1234.5"></form>';
    Expressive.AutoInit();
    Expressive.CurrencyInput.init(root.querySelector('input'));
  });
  const state = (id = 'amount') =>
    page.evaluate((id) => {
      const field = document.getElementById(id);
      return { value: field.value, start: field.selectionStart, end: field.selectionEnd };
    }, id);
  return { page, state };
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

each('a typed amount shows in the locale and currency after blur, and the form gets the number', async ({ page, state }) => {
  await page.click('#amount');
  await page.keyboard.type('1234.5');
  await page.keyboard.press('Tab');
  assert.equal((await state()).value, '1.234,50\u00a0€');

  const read = await page.evaluate(() => {
    const form = document.getElementById('form');
    form.requestSubmit();
    return { formData: new FormData(form).get('amount'), submitted: window.submitted.form.amount };
  });
  assert.deepEqual(read, { formData: '1234.5', submitted: '1234.5' });
});

each('focus shows the plain number, and change and blur listeners read the formatted text', async ({ page, state }) => {
  await page.click('#amount');
  await page.keyboard.type('1234.5');
  await page.keyboard.press('Tab');
  assert.deepEqual(await page.evaluate(() => window.seen), { change: '1.234,50\u00a0€', blur: '1.234,50\u00a0€' });
  await page.focus('#amount');
  assert.deepEqual(await state(), { value: '1234,5', start: 6, end: 6 });
});

each('a pasted amount submits as a number with Enter while the field has focus', async ({ page, state }) => {
  await page.click('#amount');
  await page.keyboard.insertText('1.234,50 €');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.submitted.form);
  assert.equal(await page.evaluate(() => window.submitted.form.amount), '1234.5');

  await page.click('#price');
  await page.keyboard.insertText('$1,234.50');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.submitted.us);
  // The other form's field adds no entry here.
  assert.deepEqual(await page.evaluate(() => window.submitted.us), { price: '1234.5' });
  await page.keyboard.press('Tab');
  assert.equal((await state('price')).value, '$1,234.50');
});

each('text that holds no amount stays as typed and marks the field invalid until it does', async ({ page, state }) => {
  const validity = (id) =>
    page.evaluate((id) => {
      const field = document.getElementById(id);
      return { valid: field.checkValidity(), message: field.validationMessage, invalid: field.getAttribute('aria-invalid') };
    }, id);
  await page.click('#checked');
  await page.keyboard.type('abc');
  await page.keyboard.press('Tab');
  assert.equal((await state('checked')).value, 'abc');
  assert.deepEqual(await validity('checked'), { valid: false, message: 'Enter an amount.', invalid: 'true' });

  await page.focus('#checked');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('12');
  await page.keyboard.press('Tab');
  assert.equal((await state('checked')).value, '12,00\u00a0€');
  assert.deepEqual(await validity('checked'), { valid: true, message: '', invalid: null });

  await page.click('#german');
  await page.keyboard.type('abc');
  await page.keyboard.press('Tab');
  assert.equal((await validity('german')).message, 'Betrag eingeben.');
});

each('a saved value is formatted on start without events, and again after a reset', async ({ page, state }) => {
  assert.equal((await state('saved')).value, '1.234,50\u00a0€');
  assert.deepEqual(await page.evaluate(() => window.events), []);
  for (const reset of [() => page.click('#clear'), () => page.evaluate(() => document.getElementById('form').reset())]) {
    await page.fill('#saved', '99');
    await page.keyboard.press('Tab');
    await reset();
    await page.waitForFunction(() => document.getElementById('saved').value === '1.234,50\u00a0€');
  }
});

each('destroy() stops formatting, clears the validity message and leaves the form data alone', async ({ page, state }) => {
  await page.click('#amount');
  await page.keyboard.type('abc');
  await page.keyboard.press('Tab');
  await page.evaluate(() => Expressive.CurrencyInput.getInstance(document.getElementById('amount')).destroy());
  assert.equal(await page.evaluate(() => document.getElementById('amount').checkValidity()), true);
  await page.focus('#amount');
  await page.keyboard.press('End');
  await page.keyboard.type('5');
  await page.keyboard.press('Tab');
  assert.equal((await state()).value, 'abc5');
  assert.equal(await page.evaluate(() => new FormData(document.getElementById('form')).get('amount')), 'abc5');
});

each('Enter without a submit leaves the field editable, so typing on adds to the amount', async ({ page, state }) => {
  await page.click('#loose');
  await page.keyboard.type('1234.5');
  await page.keyboard.press('Enter');
  assert.equal((await state('loose')).value, '1234.5');
  await page.keyboard.type('6');
  await page.keyboard.press('Tab');
  assert.equal((await state('loose')).value, '1.234,56\u00a0€');
});

each('a disabled or unnamed field adds no entry to the form data', async ({ page }) => {
  const entries = await page.evaluate(() => [...new FormData(document.getElementById('form')).keys()]);
  assert.ok(!entries.includes('off'));
  assert.ok(!entries.includes(''));
  assert.ok(entries.includes('amount'));
});

each('a field in a shadow root submits the number and formats after a reset', async ({ page }) => {
  const read = () =>
    page.evaluate(() => {
      const root = document.getElementById('host').shadowRoot;
      return { value: root.querySelector('input').value, data: new FormData(root.querySelector('form')).get('shadowed') };
    });
  assert.deepEqual(await read(), { value: '1.234,50\u00a0€', data: '1234.5' });
  await page.evaluate(() => {
    const root = document.getElementById('host').shadowRoot;
    root.querySelector('input').value = '9';
    root.querySelector('form').reset();
  });
  await page.waitForFunction(() => document.getElementById('host').shadowRoot.querySelector('input').value === '1.234,50\u00a0€');
});
