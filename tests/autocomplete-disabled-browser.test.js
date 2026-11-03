// Autocomplete entries with `disabled: true`, under real keyboard and pointer
// input. jsdom has no layout, so it cannot show that a click on a dimmed row
// lands nowhere and leaves focus in the field.

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
    <div class="field"><input type="text" id="fruit" class="autocomplete no-autoinit" placeholder=" ">
    <label for="fruit">Fruit</label></div></div><script>${js}</script>`);
  await page.evaluate(options => {
    window.changes = 0;
    window.instance = Expressive.Autocomplete.init(document.getElementById('fruit'), {
      data: [
        { id: 'banana', text: 'Banana pie', disabled: true },
        { id: 'apple', text: 'Apple pie' },
        { id: 'cherry', text: 'Cherry pie', disabled: true },
        { id: 'date', text: 'Date pie' }
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
    test(`${engine}: autocomplete disabled entries ${name}`, async () => {
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

/** Types into the field and waits for the list to open. */
async function search(page, text) {
  const combobox = page.getByRole('combobox', { name: 'Fruit' });
  await combobox.focus();
  await page.keyboard.type(text);
  await page.waitForFunction(() => instance.isOpen);
  return combobox;
}

/** Clicks the middle of a row as a person would, whatever the row accepts. */
async function clickRow(page, name) {
  const box = await page.getByRole('option', { name }).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

each('are skipped by the arrows and refused by Enter and the pointer', async page => {
  const combobox = await search(page, 'pie');
  const active = [];
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('ArrowDown');
    active.push(await activeText(page));
  }
  await page.keyboard.press('ArrowUp');
  active.push(await activeText(page));
  assert.deepEqual(active, ['Apple pie', 'Date pie', 'Date pie', 'Apple pie']);

  await clickRow(page, 'Banana pie');
  assert.deepEqual(await ids(page), []);
  assert.equal(await page.evaluate(() => [changes, instance.isOpen, instance.el.value].join()), '0,true,pie');
  await expect(combobox).toBeFocused();

  await page.keyboard.press('Enter');
  assert.deepEqual(await ids(page), ['apple']);
  assert.equal(await page.evaluate(() => changes), 1);
});

each('keep a preselected entry in a multi select', async page => {
  const combobox = await search(page, 'pie');
  await clickRow(page, 'Cherry pie');
  await clickRow(page, 'Banana pie');
  assert.deepEqual(await ids(page), ['cherry']);
  assert.equal(await page.evaluate(() => changes), 0);
  await expect(combobox).toBeFocused();
  await clickRow(page, 'Apple pie');
  assert.deepEqual(await ids(page), ['cherry', 'apple']);
  assert.equal(await page.evaluate(() => changes), 1);
}, { isMultiSelect: true, selected: ['cherry'] });

each('are dimmed, in forced colors too', async page => {
  const opacity = () => page.evaluate(() => ['banana', 'apple'].map(id =>
    getComputedStyle(instance.container.querySelector(`li[data-id="${id}"]`)).opacity));
  await search(page, 'pie');
  assert.deepEqual(await opacity(), ['0.38', '1']);
  await page.emulateMedia({ forcedColors: 'active' });
  assert.deepEqual(await opacity(), ['0.38', '1']);
});

// Not about disabled entries, but this file has the pointer helpers. A press
// that leaves the list before its release must not leave the field thinking a
// press is still in flight: then leaving the field is not noticed, and late
// search results reopen the list under a field nobody is using.
each('(and others) let late results stay closed after a press released outside the list', async page => {
  const combobox = await search(page, 'pie');
  const box = await page.getByRole('option', { name: 'Apple pie' }).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(2, 2);
  await page.mouse.up();
  assert.deepEqual(await ids(page), [], 'a release off the row chooses nothing');
  await combobox.focus();
  await combobox.blur();
  await page.waitForFunction(() => !instance.isOpen);
  await page.evaluate(() => instance.setMenuItems([{ id: 'fig', text: 'Fig pie' }]));
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 50)));
  assert.equal(await page.evaluate(() => instance.isOpen), false);
});
