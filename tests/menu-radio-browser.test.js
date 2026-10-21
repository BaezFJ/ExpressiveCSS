// Menu radio groups: rows inside <li role="none"><ul role="group"> are reached
// and styled like direct rows, and a radio item checks within its group.
// Space keeps the menu open; click and Enter close it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const mixed = `<button type="button" class="menu-trigger no-autoinit" id="t" data-target="m">View</button>
  <menu id="m">
    <li><button type="button">Copy</button></li>
    <li class="label">Sort</li>
    <li role="none"><ul role="group" aria-label="Sort by">
      <li role="menuitemradio" aria-checked="true"><button type="button">Name</button></li>
      <li role="menuitemradio" aria-checked="false"><button type="button">Date</button></li>
    </ul></li>
    <li role="menuitemcheckbox" aria-checked="true"><button type="button">Reset</button></li>
  </menu>`;

const groups = `<button type="button" class="menu-trigger no-autoinit" id="t" data-target="m">View</button>
  <menu id="m">
    <li role="none"><ul role="group" aria-label="Sort by">
      <li role="menuitemradio" aria-checked="true"><button type="button">Name</button></li>
      <li role="menuitemradio" aria-checked="false"><button type="button">Date</button></li>
      <li role="menuitemradio" aria-checked="false"><button type="button">Size</button></li>
    </ul></li>
    <li class="divider" role="separator"></li>
    <li role="none"><ul role="group" aria-label="Order">
      <li role="menuitemradio" aria-checked="true"><button type="button">Ascending</button></li>
      <li role="menuitemradio" aria-checked="false"><button type="button">Descending</button></li>
      <li role="menuitemradio" aria-checked="false"><button type="button">Custom</button></li>
    </ul></li>
  </menu>`;

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  const setup = async (browser, markup) => {
    const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
    await page.setContent(`<style>${css}</style>${markup}<script>${js}</script>`);
    await page.evaluate(() => {
      window.changes = [];
      document.addEventListener('expressive:change', (e) => {
        window.changes.push({ item: e.detail.item.textContent.trim(), checked: e.detail.checked });
      });
      window.menu = Expressive.Menu.init(document.getElementById('t'), { inDuration: 0, outDuration: 0 });
    });
    return page;
  };
  const focused = (page) => page.evaluate(() => document.activeElement.textContent.trim());
  const press = async (page, key) => {
    await page.keyboard.press(key);
    return focused(page);
  };

  browserTest(`${engine}: one item per group stays checked, and the other group is unaffected`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await setup(browser, groups);
      const state = () => page.evaluate(() => ({
        checked: [...document.querySelectorAll('[aria-checked="true"]')].map((li) => li.textContent.trim()),
        open: window.menu.isOpen,
        focused: document.activeElement.textContent.trim(),
        changes: window.changes.length
      }));
      const openByKey = async () => {
        await page.locator('#t').focus();
        await page.keyboard.press('ArrowDown');
        await page.waitForFunction(() => document.activeElement?.textContent.trim() === 'Name');
      };
      await openByKey();
      assert.deepEqual([await press(page, 'ArrowDown'), await press(page, 'ArrowDown'), await press(page, 'ArrowDown')], ['Date', 'Size', 'Ascending']);
      assert.equal(await press(page, 'ArrowUp'), 'Size');
      await page.keyboard.press(' ');
      assert.deepEqual(await state(), { checked: ['Size', 'Ascending'], open: true, focused: 'Size', changes: 1 });
      await page.getByRole('menuitemradio', { name: 'Descending' }).click();
      await page.waitForFunction(() => !window.menu.isOpen);
      assert.deepEqual((await state()).checked, ['Size', 'Descending']);
      await openByKey();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 't');
      assert.deepEqual(await state(), { checked: ['Date', 'Descending'], open: false, focused: 'View', changes: 3 });
      assert.deepEqual(await page.evaluate(() => window.changes), [
        { item: 'Size', checked: true },
        { item: 'Descending', checked: true },
        { item: 'Date', checked: true }
      ]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: arrow keys, Home, End and type-ahead reach rows inside a group`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await setup(browser, mixed);
      await page.locator('#t').focus();
      await page.keyboard.press('ArrowDown');
      await page.waitForFunction(() => document.activeElement?.textContent.trim() === 'Copy');
      assert.deepEqual(
        [await press(page, 'ArrowDown'), await press(page, 'ArrowDown'), await press(page, 'ArrowDown')],
        ['Name', 'Date', 'Reset']
      );
      assert.equal(await press(page, 'ArrowUp'), 'Date');
      assert.equal(await press(page, 'Home'), 'Copy');
      assert.equal(await press(page, 'End'), 'Reset');
      assert.equal(await press(page, 'd'), 'Date');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: rows inside a group size and color like direct rows`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await setup(browser, mixed);
      await page.evaluate(() => window.menu.open());
      await page.waitForFunction(() => window.menu.isOpen);
      // Measure with focus parked on the trigger, so no row shows a focus layer.
      await page.locator('#t').focus();
      const box = (text) => page.evaluate((text) => {
        const li = [...document.querySelectorAll('#m li')].find((el) => el.textContent.trim() === text);
        const row = getComputedStyle(li);
        const button = getComputedStyle(li.querySelector('button'));
        return {
          height: li.getBoundingClientRect().height,
          width: li.getBoundingClientRect().width,
          paddingStart: button.paddingInlineStart,
          background: row.backgroundColor,
          color: button.color
        };
      }, text);
      const [copy, date, name, reset] = await Promise.all(['Copy', 'Date', 'Name', 'Reset'].map(box));
      assert.deepEqual(
        { height: date.height, width: date.width, paddingStart: date.paddingStart, color: date.color },
        { height: copy.height, width: copy.width, paddingStart: copy.paddingStart, color: copy.color }
      );
      assert.deepEqual({ background: name.background, color: name.color }, { background: reset.background, color: reset.color });
      assert.notEqual(name.background, copy.background, 'a checked group row takes the selected fill');
    } finally {
      await browser.close();
    }
  });
}
