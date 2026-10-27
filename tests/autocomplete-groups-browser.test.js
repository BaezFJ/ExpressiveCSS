// Autocomplete entries with a `group`, under real keyboard and pointer input.
// jsdom has no layout, so it cannot show that a heading looks like a label,
// or that a click on one lands nowhere and leaves focus in the field.

import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

async function open(browser, options = {}) {
  const page = await browser.newPage();
  page.setDefaultTimeout(10_000);
  await page.setContent(`<style>${css}</style><div style="padding:2rem;max-width:30rem">
    <div class="field"><input type="text" id="food" class="autocomplete no-autoinit" placeholder=" ">
    <label for="food">Food</label></div></div><script>${js}</script>`);
  await page.evaluate(options => {
    window.changes = 0;
    window.instance = Expressive.Autocomplete.init(document.getElementById('food'), {
      data: [
        { id: 'apple', text: 'Apple pie', group: 'Fruit' },
        { id: 'pear', text: 'Pear pie', group: 'Fruit' },
        { id: 'carrot', text: 'Carrot pie', group: 'Vegetables' },
        { id: 'leek', text: 'Leek pie', group: 'Vegetables', disabled: true }
      ],
      menuOptions: { inDuration: 0, outDuration: 0 },
      ...options
    });
    // Only the component's own change. A multi-select row click blurs the field
    // for a moment, and the browser reports that blur as a change of its own.
    instance.el.addEventListener('change', event => { if (!event.isTrusted) changes++; });
  }, options);
  return page;
}

function each(name, body, options) {
  for (const [engine, type, test] of engines) {
    test(`${engine}: autocomplete option groups ${name}`, async () => {
      const browser = await leaseBrowser(type);
      let page;
      try {
        page = await open(browser, options);
        await body(page);
      } finally {
        await page?.evaluate(() => instance.destroy()).catch(() => {});
        await browser.close();
      }
    });
  }
}

const ids = page => page.evaluate(() => instance.selectedValues.map(entry => entry.id));
const activeText = page => page.evaluate(() => document.getElementById(instance.el.getAttribute('aria-activedescendant'))?.textContent);
const heading = (page, name) => page.locator('.autocomplete-group-label', { hasText: name });

/** Types into the field and waits for the list to open. */
async function search(page, text) {
  const combobox = page.getByRole('combobox', { name: 'Food' });
  await combobox.focus();
  await page.keyboard.type(text);
  await page.waitForFunction(() => instance.isOpen);
  return combobox;
}

/** Clicks the middle of a box as a person would, whatever it accepts. */
async function clickAt(page, locator) {
  const box = await locator.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

each('cross a heading with the arrows and choose with Enter', async page => {
  await search(page, 'pie');
  const active = [];
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('ArrowDown');
    active.push(await activeText(page));
  }
  await page.keyboard.press('ArrowUp');
  active.push(await activeText(page));
  assert.deepEqual(active, ['Apple pie', 'Pear pie', 'Carrot pie', 'Carrot pie', 'Pear pie']);
  await page.keyboard.press('Enter');
  assert.deepEqual(await ids(page), ['pear']);
  assert.equal(await page.evaluate(() => changes), 1);
});

each('select a grouped row by click and ignore a click on a heading', async page => {
  const combobox = await search(page, 'pie');
  await clickAt(page, heading(page, 'Vegetables'));
  assert.deepEqual(await ids(page), []);
  assert.equal(await page.evaluate(() => [changes, instance.isOpen].join()), '0,true');
  await expect(combobox).toBeFocused();
  await clickAt(page, page.getByRole('option', { name: 'Carrot pie' }));
  assert.deepEqual(await ids(page), ['carrot']);
  assert.equal(await page.evaluate(() => changes), 1);
});

each('toggle grouped rows in a multi select', async page => {
  const combobox = await search(page, 'pie');
  await clickAt(page, page.getByRole('option', { name: 'Pear pie' }));
  await clickAt(page, page.getByRole('option', { name: 'Carrot pie' }));
  await clickAt(page, heading(page, 'Fruit'));
  assert.deepEqual(await ids(page), ['pear', 'carrot']);
  assert.equal(await page.evaluate(() => changes), 2);
  await expect(page.getByRole('option', { name: 'Pear pie' })).toHaveAttribute('aria-selected', 'true');
  await expect(combobox).toBeFocused();
}, { isMultiSelect: true });

each('show headings as labels, in forced colors too', async page => {
  await search(page, 'pie');
  const widths = await page.evaluate(() => ['li[data-id="apple"]', ':scope > li[role="none"]']
    .map(selector => instance.container.querySelector(selector).getBoundingClientRect().width));
  assert.equal(widths[0], widths[1], 'a grouped row spans the list');
  const style = () => heading(page, 'Fruit').evaluate(el => {
    const { cursor, color, backgroundColor } = getComputedStyle(el);
    const label = getComputedStyle(instance.container.querySelector('li[data-id="apple"] .item-text > div'));
    return { cursor, backgroundColor, differs: color !== label.color, height: el.getBoundingClientRect().height };
  });
  const before = await style();
  assert.equal(before.cursor, 'default');
  assert.equal(before.differs, true);
  assert.ok(before.height >= 32, `heading is ${before.height}px tall`);
  await heading(page, 'Fruit').hover();
  assert.equal((await style()).backgroundColor, before.backgroundColor, 'no hover layer');
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(heading(page, 'Fruit')).toBeVisible();
  assert.ok((await heading(page, 'Fruit').evaluate(el => el.getBoundingClientRect().height)) >= 32);
});
