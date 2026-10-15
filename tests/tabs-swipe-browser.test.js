// A swipe in progress belongs to the user. Swipeable tabs re-align their track
// when its width changes, and a panel growing taller (an image loading in it)
// changes only the height, so it must not pull the track back mid-swipe.
// Chromium only: a real touch drag needs CDP touch input.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;
const browserTest = existsSync(chromium.executablePath()) && (!requested || requested === 'chromium') ? test : test.skip;

browserTest('chromium: a panel growing taller does not move a swipe in progress', { timeout: 30000 }, async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ hasTouch: true, viewport: { width: 400, height: 700 } });
    const page = await context.newPage();
    await page.setContent(`<style>${css}</style><main style="width:320px">
      <nav class="tabs" aria-label="Sections"><a href="#one">One</a><a href="#two">Two</a><a href="#three">Three</a></nav>
      <section id="one" style="height:200px">One</section><section id="two" style="height:200px">Two</section><section id="three" style="height:200px">Three</section></main>`);
    await page.addScriptTag({ content: js });
    await page.evaluate(() => { window.tabs = Expressive.Tabs.init(document.querySelector('nav'), { swipeable: true }); });
    const box = await page.locator('.tabs-content').boundingBox();
    const cdp = await context.newCDPSession(page);
    const y = box.y + 100;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 300, y }] });
    for (let x = 300; x >= 180; x -= 10) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + x, y }] });
    }
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => document.querySelector('.tabs-content').scrollLeft);
    await page.evaluate(() => { document.getElementById('three').style.height = '400px'; });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => document.querySelector('.tabs-content').scrollLeft);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.ok(before > 50, `the drag did not move the track: ${before}`);
    assert.equal(after, before, 'the height change moved the track under the finger');
  } finally {
    await browser.close();
  }
});
