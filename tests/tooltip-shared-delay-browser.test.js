// Tooltips along a toolbar: once one has shown, moving the mouse to the next
// shows it without waiting its enterDelay. After the window the delay is back.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  browserTest(`${engine}: moving along a toolbar skips the next tooltip's enterDelay until the window passes`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css}</style><div style="display: flex; gap: 8px; margin: 100px"><button id="a">Bold</button><button id="b">Italic</button></div><script>${js}</script>`);
      await page.evaluate(() => {
        for (const id of ['a', 'b']) {
          Expressive.Tooltip.init(document.getElementById(id), { text: id, enterDelay: 2000, inDuration: 0, outDuration: 0 });
        }
      });
      const shown = (id) => page.evaluate((id) => Expressive.Tooltip.getInstance(document.getElementById(id)).tooltipEl.style.visibility === 'visible', id);
      const hover = async (id) => {
        const box = await page.locator(`#${id}`).boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      };

      await hover('a');
      await page.waitForFunction(() => Expressive.Tooltip.getInstance(document.getElementById('a')).tooltipEl.style.visibility === 'visible');
      await hover('b');
      await page.waitForTimeout(400);
      assert.equal(await shown('b'), true, 'the next tooltip skips its delay');

      await page.mouse.move(5, 5);
      await page.waitForTimeout(1500);
      await hover('a');
      await page.waitForTimeout(400);
      assert.equal(await shown('a'), false, 'after the window the delay applies');
      await page.waitForFunction(() => Expressive.Tooltip.getInstance(document.getElementById('a')).tooltipEl.style.visibility === 'visible');
    } finally {
      await browser.close();
    }
  });
}
