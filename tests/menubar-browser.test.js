import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;
const engines = Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name);
const markup = (dir) => `<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head><body>
<div id="bar" class="menubar" aria-label="Editor">
  <button type="button" class="menu-trigger" data-target="file">File</button>
  <button type="button" class="menu-trigger" data-target="edit">Edit</button>
  <button type="button" class="menu-trigger" data-target="view">View</button>
</div>
<menu id="file"><li><button type="button">New</button></li><li><button type="button">Open</button></li></menu>
<menu id="edit"><li><button type="button">Undo</button></li><li><button type="button">Find</button><menu><li><button type="button">Find next</button></li></menu></li></menu>
<menu id="view"><li><button type="button">Zoom in</button></li></menu>
<script>${js}</script><script>Expressive.AutoInit();</script></body></html>`;

for (const [name, engine] of engines) {
  test(`${name}: a menubar has one tab stop and moves between its menus with the arrow keys`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
      await page.setContent(markup('ltr'));
      const focused = () => page.evaluate(() => document.activeElement.textContent.trim());
      const open = () => page.evaluate(() => [...document.querySelectorAll('#bar > .menu-trigger')].filter((b) => b.getAttribute('aria-expanded') === 'true').map((b) => b.textContent));

      assert.equal(await page.getByRole('menubar', { name: 'Editor' }).count(), 1);
      assert.equal(await page.getByRole('menuitem', { name: 'File' }).count(), 1);
      assert.deepEqual(await page.locator('#bar > button').evaluateAll((b) => b.map((el) => el.tabIndex)), [0, -1, -1], 'one tab stop');

      await page.keyboard.press('Tab');
      assert.equal(await focused(), 'File');
      await page.keyboard.press('ArrowRight');
      assert.equal(await focused(), 'Edit');
      assert.deepEqual(await page.locator('#bar > button').evaluateAll((b) => b.map((el) => el.tabIndex)), [-1, 0, -1], 'the tab stop follows focus');
      await page.keyboard.press('End');
      assert.equal(await focused(), 'View');
      await page.keyboard.press('ArrowRight');
      assert.equal(await focused(), 'File', 'Right wraps');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await focused(), 'View', 'Left wraps');
      await page.keyboard.press('Home');

      await page.keyboard.press('ArrowDown');
      await page.waitForFunction(() => document.activeElement.textContent.trim() === 'New');
      assert.deepEqual(await open(), ['File'], 'Down opens the menu on its first item');
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.activeElement.textContent.trim() === 'Undo');
      assert.deepEqual(await open(), ['Edit'], 'Right in an open menu opens the next one');
      await page.keyboard.press('ArrowDown');
      await page.waitForFunction(() => document.activeElement.textContent.trim().startsWith('Find'));
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.querySelector('#edit > li:nth-child(2)').classList.contains('open'));
      await page.waitForTimeout(100);
      assert.deepEqual(await open(), ['Edit'], 'Right on a submenu row opens the flyout instead of the next menu');
      await page.keyboard.press('ArrowLeft');
      await page.waitForFunction(() => document.activeElement.textContent.trim() === 'New');
      assert.deepEqual(await open(), ['File'], 'Left from the top level opens the previous menu');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.activeElement.textContent.trim() === 'File');
      assert.deepEqual(await open(), [], 'Escape closes and returns to the bar');

      // From the bar: open Edit, go to the row with a flyout, press Right.
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');
      await page.waitForFunction(() => document.activeElement.textContent.trim() === 'Undo');
      await page.keyboard.press('ArrowDown');
      await page.waitForFunction(() => document.activeElement.textContent.trim().startsWith('Find'));
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(150);
      assert.deepEqual(await open(), ['Edit'], 'a flyout row keeps Right for its submenu');
      await page.keyboard.press('Escape');

      await page.setContent(markup('rtl'));
      await page.keyboard.press('Tab');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await focused(), 'Edit', 'in RTL, Left moves to the next item');
    } finally {
      await browser.close();
    }
  });
}
