// Native multiple leaf choices, tree focus and form submission in real engines.
import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { engines, leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const html = `<style>${css}</style><button id="before" type="button">Before</button>
  <form id="form"><div class="field"><select id="place" name="place" multiple required data-tree>
    <option value="europe" disabled>Europe</option>
    <option value="france" data-parent="europe" disabled>France</option>
    <option value="paris" data-parent="france">Paris</option>
    <option value="lyon" data-parent="france">Lyon</option>
    <option value="asia">Asia</option>
    <option value="tokyo" data-parent="asia">Tokyo</option>
    <option value="kyoto" data-parent="asia" disabled>Kyoto</option>
  </select><label for="place">Places</label></div><button id="send" type="submit">Send</button></form>
  <button id="after" type="button">After</button><script>${js}</script>`;

function each(name, settings, body) {
  for (const [engine, type, browserTest] of engines) {
    browserTest(`${engine}: multiple tree ${name}`, async () => {
      const browser = await leaseBrowser(type);
      let page;
      try {
        page = await browser.newPage();
        await page.setContent(html);
        await page.evaluate(settings => {
          const select = document.querySelector('#place');
          const { menuOptions, ...markup } = settings;
          select.dataset.treeSelectOptions = JSON.stringify(markup);
          Expressive.AutoInit(document.body, { TreeSelect: { menuOptions: { inDuration: 0, outDuration: 0, ...menuOptions } } });
          window.multiTree = Expressive.TreeSelect.getInstance(select);
          window.changes = [];
          window.submitted = null;
          select.addEventListener('change', e => changes.push({ values: multiTree.getSelectedValues(), composed: e.composed }));
          select.form.addEventListener('submit', e => {
            e.preventDefault();
            window.submitted = new FormData(e.target).getAll('place');
          });
        }, settings);
        await body(page, engine);
      } finally {
        try {
          await page?.evaluate(() => {
            window.multiTree?.destroy();
            document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
          });
        } finally { await browser.close(); }
      }
    });
  }
}

const trigger = page => page.locator('#form .field > input');
const label = (page, text) => page.locator('#form li[role="treeitem"] > span').filter({ hasText: new RegExp('^' + text + '$') });
const search = page => page.getByRole('searchbox', { name: 'Search options', includeHidden: true });
const values = page => page.evaluate(() => multiTree.getSelectedValues());

each('toggles leaves by keyboard and pointer, preserves branch choices and submits both native values', {}, async page => {
  assert.equal(await page.evaluate(() => document.querySelector('#form').reportValidity()), false);
  await expect(trigger(page)).toBeFocused();
  await expect(trigger(page)).toHaveAttribute('aria-invalid', 'true');
  await trigger(page).click();
  const tree = page.getByRole('tree', { name: 'Places' });
  await expect(tree).toHaveAttribute('aria-multiselectable', 'true');
  await expect(label(page, 'Europe').locator('..')).toBeFocused();
  for (const key of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'Space', 'End', 'ArrowRight', 'ArrowRight', 'Enter']) await page.keyboard.press(key);
  await expect(label(page, 'Tokyo').locator('..')).toBeFocused();
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
  assert.deepEqual(await values(page), ['paris', 'tokyo']);
  assert.equal(await page.evaluate(() => multiTree.el.checkValidity()), true);
  await expect(trigger(page)).not.toHaveAttribute('aria-invalid', 'true');
  assert.equal(await page.evaluate(() => submitted), null);
  const disabled = await label(page, 'Kyoto').boundingBox();
  await page.mouse.click(disabled.x + disabled.width / 2, disabled.y + disabled.height / 2);
  assert.deepEqual(await values(page), ['paris', 'tokyo']);
  await label(page, 'Asia').click();
  await expect(label(page, 'Asia').locator('..')).toBeFocused();
  await expect(label(page, 'Asia').locator('..')).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Enter');
  await expect(label(page, 'Asia').locator('..')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Enter');
  await expect(label(page, 'Asia').locator('..')).toHaveAttribute('aria-expanded', 'false');
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  assert.equal(await tree.evaluate(el => getComputedStyle(el).direction), 'rtl');
  await page.keyboard.press('ArrowLeft');
  await expect(label(page, 'Asia').locator('..')).toHaveAttribute('aria-expanded', 'true');
  await expect(label(page, 'Asia').locator('..')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(label(page, 'Asia').locator('..')).toHaveAttribute('aria-expanded', 'false');
  await page.evaluate(() => { document.documentElement.dir = 'ltr'; });
  assert.deepEqual(await page.evaluate(() => changes), [
    { values: ['paris'], composed: true }, { values: ['paris', 'tokyo'], composed: true }
  ]);
  await label(page, 'Paris').click();
  await expect(label(page, 'Paris').locator('..')).toBeFocused();
  assert.deepEqual(await values(page), ['tokyo']);
  await label(page, 'Paris').click();
  await page.keyboard.press('Escape');
  await expect(trigger(page)).toBeFocused();
  await trigger(page).press('Enter');
  await expect(label(page, 'Paris').locator('..')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(label(page, 'Lyon').locator('..')).toBeFocused();
  await expect(label(page, 'Lyon').locator('..')).toHaveAttribute('aria-selected', 'false');
  assert.deepEqual(await values(page), ['paris', 'tokyo']);
  await page.keyboard.press('Tab');
  await expect(trigger(page)).toBeFocused();
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Tab');
  await expect(page.locator('#send')).toBeFocused();
  await page.locator('#send').click();
  assert.deepEqual(await page.evaluate(() => submitted), ['paris', 'tokyo']);
  assert.equal(await page.evaluate(() => changes.length), 4);
});

each('search keeps hidden choices, query and expansion while native submission retains both leaves', { searchable: true }, async page => {
  await trigger(page).click();
  const input = search(page);
  await expect(input).toBeFocused();
  await expect(page.getByRole('dialog', { name: 'Places' })).toBeVisible();
  await expect(page.getByRole('tree', { name: 'Places' })).toHaveAttribute('aria-multiselectable', 'true');
  await input.press('Enter');
  assert.equal(await page.evaluate(() => submitted), null);
  await input.fill('tok');
  await input.press('ArrowUp');
  await page.keyboard.press('Space');
  await expect(label(page, 'Tokyo').locator('..')).toBeFocused();
  await expect(input).toHaveValue('tok');
  await page.keyboard.press('Shift+Tab');
  await expect(input).toBeFocused();
  await input.fill('par');
  await input.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(label(page, 'Paris').locator('..')).toBeFocused();
  await expect(input).toHaveValue('par');
  await expect(label(page, 'Tokyo')).toBeHidden();
  assert.deepEqual(await values(page), ['paris', 'tokyo']);
  await page.evaluate(() => {
    const paris = Array.from(multiTree.tree.querySelectorAll('li')).find(row => row.firstChild.textContent === 'Paris');
    for (const options of [{ isComposing: true }, { keyCode: 229 }]) {
      paris.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true, ...options }));
    }
  });
  assert.equal(await page.evaluate(() => changes.length), 2);
  await page.keyboard.press('Shift+Tab');
  await input.fill('missing');
  await expect(page.getByRole('status')).toHaveText('No results');
  assert.deepEqual(await values(page), ['paris', 'tokyo']);
  await input.press('Tab');
  await expect(page.locator('#send')).toBeFocused();
  await expect(input).toHaveValue('');
  await trigger(page).click();
  await expect(input).toBeFocused();
  for (const branch of ['Europe', 'France', 'Asia']) await expect(label(page, branch).locator('..')).toHaveAttribute('aria-expanded', 'false');
  await input.press('Escape');
  await expect(trigger(page)).toBeFocused();
  await page.locator('#send').click();
  assert.deepEqual(await page.evaluate(() => submitted), ['paris', 'tokyo']);
  assert.equal(await page.evaluate(() => changes.length), 2);
});

each('nonsearch opening honors autoFocus false and preserves a leaf reached before completion',
  { menuOptions: { inDuration: 100, outDuration: 0, autoFocus: false } }, async page => {
    await page.clock.install({ time: 0 });
    await page.clock.pauseAt(1000);
    await page.locator('#before').focus();
    await page.evaluate(() => multiTree.menu.open());
    assert.equal(await page.evaluate(() => multiTree.menu.options.autoFocus), false);
    await page.clock.runFor(100);
    await expect(page.locator('#before')).toBeFocused();
    await page.evaluate(() => {
      const select = multiTree.el;
      multiTree.destroy();
      window.multiTree = Expressive.TreeSelect.init(select, { menuOptions: { inDuration: 100, outDuration: 0 } });
    });
    await trigger(page).click();
    for (const text of ['Europe', 'France', 'Paris', 'Asia', 'Tokyo']) await label(page, text).click();
    await expect(label(page, 'Tokyo').locator('..')).toBeFocused();
    assert.deepEqual(await values(page), ['paris', 'tokyo']);
    await page.clock.runFor(100);
    await expect(label(page, 'Tokyo').locator('..')).toBeFocused();
    await page.keyboard.press('Enter');
    assert.deepEqual(await values(page), ['paris']);
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
  });

each('search refresh, reset and disabled recovery preserve native leaf ownership and caret', { searchable: true }, async page => {
  await page.evaluate(() => {
    for (const value of ['paris', 'tokyo', 'asia']) multiTree.el.querySelector(`[value="${value}"]`).defaultSelected = true;
    multiTree.refresh();
  });
  await trigger(page).click();
  const input = search(page);
  await input.fill('par');
  await input.press('ArrowUp');
  await page.keyboard.press('Space');
  await page.keyboard.press('Shift+Tab');
  await input.press('Home');
  await input.press('ArrowRight');
  await input.press('Shift+ArrowRight');
  await page.evaluate(() => {
    multiTree.el.querySelector('[value="lyon"]').selected = true;
    multiTree.el.querySelector('[value="tokyo"]').remove();
    multiTree.el.querySelector('[value="asia"]').selected = true;
    const branch = new Option('Oceania', 'oceania', true, true);
    const leaf = new Option('Paris Island', 'island');
    leaf.dataset.parent = 'oceania';
    multiTree.el.append(branch, leaf);
    multiTree.refresh();
  });
  await expect(input).toHaveValue('par');
  await expect(input).toBeFocused();
  assert.deepEqual(await input.evaluate(el => [el.selectionStart, el.selectionEnd]), [1, 2]);
  assert.deepEqual(await values(page), ['lyon']);
  await expect(label(page, 'Paris Island')).toBeVisible();
  await page.evaluate(async () => {
    const form = multiTree.el.form;
    form.addEventListener('reset', e => e.preventDefault(), { once: true });
    form.reset();
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  await expect(input).toHaveValue('par');
  assert.deepEqual(await values(page), ['lyon']);
  await page.evaluate(async () => {
    multiTree.el.form.reset();
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  await expect(input).toHaveValue('');
  await expect(trigger(page)).toBeFocused();
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
  assert.deepEqual(await values(page), ['paris']);
  for (const branch of ['Europe', 'France', 'Asia', 'Oceania']) await expect(label(page, branch).locator('..')).toHaveAttribute('aria-expanded', 'false');
  for (const kind of ['select', 'fieldset']) {
    await trigger(page).click();
    await expect(input).toBeFocused();
    await page.evaluate(kind => {
      if (kind === 'select') multiTree.el.disabled = true;
      else {
        window.boundary = document.createElement('fieldset');
        multiTree.wrapper.before(boundary);
        boundary.append(multiTree.wrapper);
        boundary.disabled = true;
      }
      multiTree.refresh();
    }, kind);
    await expect(trigger(page)).toBeDisabled();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
    assert.deepEqual(await values(page), ['paris']);
    assert.deepEqual(await page.evaluate(() => new FormData(multiTree.el.form).getAll('place')), []);
    await page.evaluate(kind => {
      if (kind === 'select') multiTree.el.disabled = false;
      else boundary.disabled = false;
      multiTree.refresh();
      if (kind === 'fieldset') boundary.replaceWith(multiTree.wrapper);
    }, kind);
    await expect(trigger(page)).toBeEnabled();
  }
  assert.deepEqual(await values(page), ['paris']);
  assert.equal(await page.evaluate(() => changes.length), 1);
});

each('search respects autoFocus false, callback context and uncovered outside focus', { searchable: true }, async page => {
  await page.evaluate(() => {
    const select = multiTree.el;
    multiTree.destroy();
    window.calls = [];
    window.multiTree = Expressive.TreeSelect.init(select, { searchable: true, menuOptions: {
      inDuration: 0, outDuration: 0, autoFocus: false,
      onOpenEnd(el) { calls.push(['open', el === select, this === multiTree.menu]); },
      onCloseStart(el) { calls.push(['close', el === select, this === multiTree.menu]); }
    } });
    document.querySelector('#form').style.marginBlockStart = '5rem';
    document.querySelector('#before').focus();
    multiTree.menu.open();
  });
  await expect.poll(() => page.evaluate(() => calls.length)).toBe(1);
  await expect(page.locator('#before')).toBeFocused();
  await trigger(page).focus();
  await page.keyboard.press('Tab');
  const input = search(page);
  await expect(input).toBeFocused();
  await input.fill('par');
  await input.press('ArrowUp');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.locator('#send')).toBeFocused();
  assert.deepEqual(await values(page), ['paris']);
  await page.evaluate(() => { document.querySelector('#before').focus(); multiTree.menu.open(); });
  await expect.poll(() => page.evaluate(() => calls.length)).toBe(3);
  assert.equal(await page.locator('#before').evaluate(el => {
    const box = el.getBoundingClientRect();
    return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === el;
  }), true);
  await page.locator('#before').click();
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#before')).toBeFocused();
  await expect(input).toHaveValue('');
  assert.deepEqual(await page.evaluate(() => calls), [
    ['open', true, true], ['close', true, true], ['open', true, true], ['close', true, true]
  ]);
  assert.equal(await page.evaluate(() => changes.length), 1);
});

each('search retains both native values and timed focus inside modal dialogs and shadow roots', { searchable: true }, async page => {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  for (const kind of ['dialog', 'shadow']) {
    await page.evaluate(kind => {
      const form = multiTree.el.form;
      const select = multiTree.el;
      multiTree.destroy();
      Array.from(select.options).forEach(option => { option.selected = false; });
      window.changes = [];
      window.submitted = null;
      const host = document.createElement(kind === 'dialog' ? 'dialog' : 'div');
      document.body.append(host);
      const root = kind === 'shadow' ? host.attachShadow({ mode: 'open' }) : host;
      root.append(document.querySelector('style').cloneNode(true), form);
      if (kind === 'dialog') host.showModal();
      window.multiTree = Expressive.TreeSelect.init(select, { searchable: true,
        menuOptions: { inDuration: 100, outDuration: 0 } });
    }, kind);
    await trigger(page).click();
    const input = search(page);
    await input.fill('tok');
    await input.press('ArrowUp');
    await page.keyboard.press('Space');
    await expect(label(page, 'Tokyo').locator('..')).toBeFocused();
    await page.clock.runFor(100);
    await expect(label(page, 'Tokyo').locator('..')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await input.fill('par');
    await input.press('ArrowUp');
    await page.keyboard.press('Enter');
    await expect(label(page, 'Paris').locator('..')).toBeFocused();
    assert.deepEqual(await values(page), ['paris', 'tokyo']);
    await page.keyboard.press('Escape');
    await page.clock.runFor(1);
    await expect(trigger(page)).toBeFocused();
    if (kind === 'dialog') await expect(page.locator('dialog')).toHaveAttribute('open', '');
    await page.locator('#send').click();
    assert.deepEqual(await page.evaluate(() => submitted), ['paris', 'tokyo']);
    assert.equal(await page.evaluate(() => changes.length), 2);
    await page.evaluate(() => document.querySelector('dialog[open]')?.close());
  }
});

each('search separates chosen and focused rows while enlarged RTL results scroll in forced colors', { searchable: true }, async page => {
  await page.setViewportSize({ width: 360, height: 600 });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  assert.equal(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), true);
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.style.fontSize = '32px';
    for (let index = 0; index < 120; index++) {
      const option = new Option('Item ' + String(index).padStart(3, '0'), 'item' + index);
      option.dataset.parent = 'asia';
      multiTree.el.append(option);
    }
    multiTree.refresh();
  });
  await trigger(page).click();
  const input = search(page);
  await expect(input).toBeFocused();
  await input.fill('Item');
  await input.press('ArrowUp');
  await page.keyboard.press('Space');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowUp');
  const focused = label(page, 'Item 118');
  const selected = label(page, 'Item 119');
  await expect(focused.locator('..')).toBeFocused();
  await expect(focused.locator('..')).toHaveAttribute('aria-selected', 'false');
  await expect(selected.locator('..')).toHaveAttribute('aria-selected', 'true');
  await expect(focused).toBeInViewport({ ratio: 1 });
  assert.deepEqual(await values(page), ['item0', 'item119']);
  const selectedPaint = await selected.evaluate(el => getComputedStyle(el).backgroundColor);
  const focusedPaint = await focused.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, outline: getComputedStyle(el).outlineStyle }));
  assert.notEqual(selectedPaint, focusedPaint.background);
  assert.notEqual(focusedPaint.outline, 'none');
  const geometry = await page.evaluate(() => {
    const popup = multiTree.menuEl.getBoundingClientRect();
    const input = multiTree.menuEl.querySelector('input').getBoundingClientRect();
    return { top: popup.top, left: popup.left, right: popup.right, bottom: popup.bottom,
      inputTop: input.top, inputBottom: input.bottom, scrolled: multiTree.tree.scrollTop > 0 };
  });
  assert.equal(geometry.scrolled, true);
  assert.ok(geometry.inputTop >= geometry.top && geometry.inputBottom <= geometry.bottom, JSON.stringify(geometry));
  assert.ok(geometry.top >= 0 && geometry.left >= -1 && geometry.right <= 361 && geometry.bottom <= 601, JSON.stringify(geometry));
});
