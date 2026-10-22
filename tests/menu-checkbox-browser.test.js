// Menu checkbox items: click and Space toggle aria-checked and keep the menu
// open, Enter toggles and closes, and each toggle fires one expressive:change.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const markup = `<button type="button" class="menu-trigger no-autoinit" id="t" data-target="m">View</button>
  <menu id="m">
    <li role="menuitemcheckbox" aria-checked="false"><button type="button">Ruler</button></li>
    <li role="menuitemcheckbox" aria-checked="true"><button type="button">Grid</button></li>
  </menu>`;

for (const [engine, browserType, browserTest] of engines) {

  const setup = async (browser) => {
    const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
    await page.setContent(`<style>${css}</style>${markup}<script>${js}</script>`);
    await page.evaluate(() => {
      window.changes = [];
      document.addEventListener('expressive:change', (e) => {
        window.changes.push({ item: e.detail.item.textContent.trim(), checked: e.detail.checked });
      });
      window.menu = Expressive.Menu.init(document.getElementById('t'), { inDuration: 0, outDuration: 0 });
    });
    await page.locator('#t').focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => document.activeElement?.textContent.trim() === 'Ruler');
    const state = () => page.evaluate(() => ({
      checked: document.querySelector('#m > li').getAttribute('aria-checked'),
      open: window.menu.isOpen,
      focused: document.activeElement.textContent.trim(),
      changes: window.changes.length
    }));
    return { page, state };
  };

  browserTest(`${engine}: Space and click toggle a checkbox item and keep the menu open`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, state } = await setup(browser);
      await page.keyboard.press(' ');
      assert.deepEqual(await state(), { checked: 'true', open: true, focused: 'Ruler', changes: 1 });
      await page.keyboard.press(' ');
      assert.deepEqual(await state(), { checked: 'false', open: true, focused: 'Ruler', changes: 2 });
      await page.locator('#m > li').first().click();
      assert.deepEqual(await state(), { checked: 'true', open: true, focused: 'Ruler', changes: 3 });
      assert.deepEqual(await page.evaluate(() => window.changes), [
        { item: 'Ruler', checked: true },
        { item: 'Ruler', checked: false },
        { item: 'Ruler', checked: true }
      ]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: Enter toggles a checkbox item and closes the menu`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, state } = await setup(browser);
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 't');
      assert.deepEqual(await state(), { checked: 'true', open: false, focused: 'View', changes: 1 });
    } finally {
      await browser.close();
    }
  });
}
