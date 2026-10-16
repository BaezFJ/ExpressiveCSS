// A sheet's drag-to-dismiss runs on pointer events. On a touch screen the
// browser takes a drag for a pan unless the drag area sets touch-action, then
// fires pointercancel and the sheet snaps back instead of dismissing.
// Chromium only: a real touch drag needs CDP touch input.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;
const browserTest = existsSync(chromium.executablePath()) && (!requested || requested === 'chromium') ? test : test.skip;

const long = '<p>Text</p>'.repeat(60);

browserTest('chromium: a touch drag on a sheet handle or header dismisses the sheet', { timeout: 30000 }, async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ hasTouch: true, viewport: { width: 400, height: 700 } });
    const page = await context.newPage();
    await page.setContent(`<style>${css}</style><main style="height:3000px;width:1200px">${long}</main>
      <dialog class="bottom-sheet" id="bottom"><button type="button" class="drag-handle" aria-label="Dismiss"></button>${long}</dialog>
      <dialog class="side-sheet" id="side"><header><h2>Filters</h2></header>${long}</dialog>`);
    await page.addScriptTag({ content: js });
    const cdp = await context.newCDPSession(page);
    const drag = async (from, to) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
      for (let i = 1; i <= 12; i++) {
        const point = { x: from.x + ((to.x - from.x) * i) / 12, y: from.y + ((to.y - from.y) * i) / 12 };
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(400);
    };

    await page.evaluate(() => document.getElementById('bottom').showModal());
    // Past the entry animation, so the drag starts on the sheet where it rests.
    await page.waitForTimeout(600);
    const handle = await page.locator('#bottom > .drag-handle').boundingBox();
    const start = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
    await drag(start, { x: start.x, y: start.y + 200 });
    assert.equal(await page.evaluate(() => document.getElementById('bottom').open), false, 'dragging the bottom sheet handle down dismisses it');

    await page.evaluate(() => document.getElementById('side').showModal());
    // Past the entry animation, so the drag starts on the sheet where it rests.
    await page.waitForTimeout(600);
    const header = await page.locator('#side > header').boundingBox();
    const from = { x: header.x + header.width / 2, y: header.y + header.height / 2 };
    await drag(from, { x: from.x + 220, y: from.y });
    assert.equal(await page.evaluate(() => document.getElementById('side').open), false, 'dragging the side sheet header toward its edge dismisses it');
  } finally {
    await browser.close();
  }
});
