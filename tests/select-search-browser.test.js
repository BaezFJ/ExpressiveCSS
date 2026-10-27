import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

async function open(browser, attributes = '', options = {}) {
  const page = await browser.newPage();
  page.setDefaultTimeout(10_000);
  await page.setContent(`<style>${css}</style><form style="padding:2rem;max-width:30rem">
    <button id="before" type="button">Before</button>
    <label for="choice">Destination</label><select id="choice" name="place" ${attributes}>
      <option value="paris" selected>Paris</option>
      <optgroup label="Europe"><option value="rome">Rome</option><option value="lyon" disabled>Lyon</option></optgroup>
      <optgroup label="Asia"><option value="tokyo">Tokyo</option></optgroup>
    </select><button id="after" type="submit">Submit</button></form><script>${js}</script>`);
  await page.evaluate(options => {
    window.instance = Expressive.FormSelect.init(document.querySelector('select'), {
      searchable: true, menuOptions: { inDuration: 0, outDuration: 0 }, ...options
    });
    window.changes = 0;
    instance.el.addEventListener('change', () => changes++);
    instance.el.form.onsubmit = event => {
      event.preventDefault();
      window.submitted = [...new FormData(event.target)];
    };
  }, options);
  return page;
}

function each(name, body) {
  for (const [engine, type, test] of engines) {
    test(`${engine}: searchable select ${name}`, async () => {
      const browser = await leaseBrowser(type);
      let page;
      try {
        page = await open(browser);
        await body(page, engine);
      } finally {
        await page?.evaluate(() => instance.destroy());
        await browser.close();
      }
    });
  }
}

each('filters grouped options and submits the chosen value by pointer', async page => {
  await page.locator('.field > input').click();
  await page.waitForFunction(() => instance.input.ariaExpanded === 'true');
  await page.getByRole('searchbox').fill('rOm');
  assert.deepEqual(await page.getByRole('option').allTextContents(), ['Rome']);
  await page.getByRole('option', { name: 'Rome' }).click();
  await page.locator('#after').click();
  assert.deepEqual(await page.evaluate(() => submitted), [['place', 'rome']]);
  assert.equal(await page.evaluate(() => changes), 1);
});

each('keeps text editing separate from row navigation and restores focus', async page => {
  await page.locator('.field > input').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => instance.input.ariaExpanded === 'true');
  assert.equal(await page.getByRole('searchbox').evaluate(el => el === document.activeElement), true);
  await page.keyboard.type('ro me');
  assert.equal(await page.getByRole('searchbox').inputValue(), 'ro me');
  await page.keyboard.press('Home');
  assert.equal(await page.getByRole('searchbox').evaluate(el => el.selectionStart), 0);
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.submitted), undefined);
  await page.getByRole('searchbox').fill('o');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.getByRole('option', { name: 'Rome' }).evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.getByRole('option', { name: 'Tokyo' }).evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowUp');
  assert.equal(await page.getByRole('searchbox').evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  assert.equal(await page.evaluate(() => instance.el.value), 'tokyo');
  assert.equal(await page.locator('.field > input').evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => instance.input.ariaExpanded === 'true');
  assert.equal(await page.getByRole('searchbox').inputValue(), '');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.field > input').evaluate(el => el === document.activeElement), true);
});

each('tabs through search and a result and exits after the trigger', async page => {
  await page.locator('.field > input').click();
  await page.waitForFunction(() => instance.input.ariaExpanded === 'true');
  await page.getByRole('searchbox').fill('rome');
  await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('option', { name: 'Rome' }).evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.getByRole('searchbox').evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('#after').evaluate(el => el === document.activeElement), true);
  assert.equal(await page.evaluate(() => instance.menu.isOpen), false);
  await page.locator('.field > input').click();
  await page.waitForFunction(() => instance.input.ariaExpanded === 'true');
  await page.getByRole('searchbox').fill('missing');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('#after').evaluate(el => el === document.activeElement), true);
});

each('refreshes a live query, preserves the caret, and resets native state', async page => {
  await page.locator('.field > input').click();
  await page.waitForFunction(() => instance.input.ariaExpanded === 'true');
  await page.getByRole('searchbox').fill('o');
  await page.evaluate(() => {
    document.activeElement.setSelectionRange(0, 0);
    instance.el.options[1].textContent = 'Oslo';
    instance.refresh();
  });
  assert.equal(await page.getByRole('searchbox').evaluate(el => el.selectionStart), 0);
  assert.equal(await page.getByRole('searchbox').evaluate(el => el === document.activeElement), true);
  assert.deepEqual(await page.getByRole('option').allTextContents(), ['Oslo', 'Lyon', 'Tokyo']);
  await page.keyboard.press('ArrowDown');
  await page.evaluate(() => { instance.el.options[1].disabled = true; instance.refresh(); });
  assert.equal(await page.getByRole('searchbox').evaluate(el => el === document.activeElement), true);
  await page.evaluate(() => {
    instance.el.form.addEventListener('reset', event => event.preventDefault(), { once: true });
    instance.el.form.reset();
  });
  assert.equal(await page.getByRole('searchbox').inputValue(), 'o');
  await page.evaluate(() => instance.el.form.reset());
  await page.waitForFunction(() => !instance.menu.isOpen);
  assert.deepEqual(await page.evaluate(() => [instance.el.value, instance.input.value, instance.menuEl.querySelector('input').value]), ['paris', 'Paris', '']);
  await page.locator('.field > input').click();
  await page.waitForFunction(() => instance.input.ariaExpanded === 'true');
  await page.evaluate(() => { instance.el.disabled = true; instance.refresh(); });
  assert.equal(await page.evaluate(() => instance.menu.isOpen), false);
  assert.equal(await page.locator('.field > input').isDisabled(), true);
});

each('works in a native modal dialog and an open shadow root', async page => {
  for (const kind of ['dialog', 'shadow']) {
    await page.evaluate(kind => {
      const select = instance.el;
      instance.destroy();
      const label = select.labels[0];
      const host = document.createElement(kind === 'dialog' ? 'dialog' : 'div');
      document.body.append(host);
      const root = kind === 'shadow' ? host.attachShadow({ mode: 'open' }) : host;
      root.append(document.querySelector('style').cloneNode(true), select, label);
      if (kind === 'dialog') host.showModal();
      window.instance = Expressive.FormSelect.init(select, { searchable: true, menuOptions: { inDuration: 0, outDuration: 0 } });
    }, kind);
    await page.getByRole('combobox').click();
    await page.waitForFunction(() => instance.input.ariaExpanded === 'true');
    await page.getByRole('searchbox').fill('tok');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => instance.el.value), 'tokyo');
    assert.equal(await page.getByRole('combobox').evaluate(el => el === el.getRootNode().activeElement), true);
    assert.equal(await page.getByRole('combobox').getAttribute('aria-controls'), await page.evaluate(() => instance.menuEl.id));
    await page.evaluate(() => document.querySelector('dialog')?.close());
  }
});

each('keeps search visible while results scroll with enlarged RTL text and forced colors', async page => {
  await page.setViewportSize({ width: 360, height: 600 });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.style.fontSize = '32px';
    for (let index = 0; index < 120; index++) instance.el.append(new Option('Item ' + index, String(index)));
    instance.refresh();
  });
  await page.getByRole('combobox').click();
  await page.waitForFunction(() => instance.input.ariaExpanded === 'true');
  await page.getByRole('searchbox').fill('Item');
  assert.notEqual(await page.getByRole('searchbox').evaluate(el => getComputedStyle(el).outlineStyle), 'none');
  await page.keyboard.press('ArrowUp');
  const geometry = await page.evaluate(() => {
    const popup = instance.menuEl.getBoundingClientRect();
    const input = instance.menuEl.querySelector('input').getBoundingClientRect();
    const list = instance.menuEl.querySelector('[role="listbox"]');
    return { top: popup.top, right: popup.right, bottom: popup.bottom, inputTop: input.top, inputBottom: input.bottom, scrolled: list.scrollTop > 0, focused: document.activeElement.textContent };
  });
  assert.equal(geometry.focused, 'Item 119');
  assert.equal(geometry.scrolled, true);
  assert.ok(geometry.inputTop >= geometry.top && geometry.inputBottom <= geometry.bottom);
  assert.ok(geometry.top >= 0 && geometry.right <= 361 && geometry.bottom <= 601, JSON.stringify(geometry));
});

each('respects autoFocus false, callbacks, composition, and outside dismissal', async page => {
  await page.evaluate(() => {
    instance.destroy();
    window.calls = [];
    window.instance = Expressive.FormSelect.init(document.querySelector('select'), {
      searchable: true, menuOptions: { inDuration: 0, outDuration: 0, autoFocus: false,
        onOpenEnd() { calls.push('open'); }, onCloseStart() { calls.push('close'); } }
    });
    document.getElementById('before').focus();
    instance.menu.open();
  });
  await page.waitForFunction(() => instance.input.ariaExpanded === 'true');
  assert.equal(await page.locator('#before').evaluate(el => el === document.activeElement), true);
  await page.getByRole('combobox').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('searchbox').evaluate(el => el === document.activeElement), true);
  await page.getByRole('searchbox').fill('rome');
  await page.getByRole('searchbox').dispatchEvent('keydown', { key: 'Enter', isComposing: true });
  assert.equal(await page.evaluate(() => instance.el.value), 'paris');
  await page.locator('#before').click();
  await page.waitForFunction(() => !instance.menu.isOpen);
  assert.equal(await page.locator('#before').evaluate(el => el === document.activeElement), true);
  assert.deepEqual(await page.evaluate(() => calls), ['open', 'close']);
  assert.equal(await page.evaluate(() => instance.menuEl.querySelector('input').value), '');
});
