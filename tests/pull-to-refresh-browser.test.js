// Pull-to-refresh. Chromium pulls with real touches through CDP. Firefox and
// WebKit get touch events dispatched from the page: WebKit has no Touch
// constructor, so each event carries a plain `touches` list instead.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const rows = Array.from({ length: 40 }, (_, i) => `<li>Row ${i + 1}</li>`).join('');
const html = `<style>${css}</style>
  <div class="pull-to-refresh" id="list" style="width:400px;height:300px;overflow-y:auto">
    <span class="loading-indicator contained" role="status" aria-label="Refreshing"></span>
    <button type="button" class="btn text" data-refresh>Refresh</button>
    <ul>${rows}</ul>
  </div>
  <script>${js}</script>
  <script>
    window.refreshes = 0;
    document.addEventListener('expressive:refresh', (event) => {
      window.refreshes++;
      if (window.onPull) window.onPull(event);
    });
    // Synthetic touches, for engines without CDP touch input.
    window.touch = (type, x, y) => {
      if (type === 'touchstart') window.touchTarget = document.elementFromPoint(x, y);
      const point = { identifier: 1, clientX: x, clientY: y, target: window.touchTarget };
      const event = new TouchEvent(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'touches', { value: type === 'touchend' || type === 'touchcancel' ? [] : [point] });
      Object.defineProperty(event, 'changedTouches', { value: [point] });
      window.touchTarget.dispatchEvent(event);
    };
  </script>`;

/** Opens the fixture with touch input and returns the page and a pull function. */
async function open(browser, engine) {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 600, height: 700 } });
  const page = await context.newPage();
  await page.setContent(html);
  await page.evaluate(() => Expressive.AutoInit());
  const cdp = engine === 'chromium' ? await context.newCDPSession(page) : null;
  const send = async (type, point) => {
    if (cdp) {
      const cdpType = { touchstart: 'touchStart', touchmove: 'touchMove', touchend: 'touchEnd', touchcancel: 'touchCancel' }[type];
      const ending = type === 'touchend' || type === 'touchcancel';
      await cdp.send('Input.dispatchTouchEvent', { type: cdpType, touchPoints: ending ? [] : [point] });
    } else {
      await page.evaluate(([type, x, y]) => window.touch(type, x, y), [type, point.x, point.y]);
    }
  };
  /** Drags `distance` pixels down (negative is up) from the list's middle, then ends as `end` says. */
  const pull = async (distance, { end = 'touchend', dx = 0, selector = '#list' } = {}) => {
    const box = await page.locator(selector).boundingBox();
    const from = { x: box.x + box.width / 2, y: box.y + 60 };
    await send('touchstart', from);
    for (let i = 1; i <= 10; i++) {
      await send('touchmove', { x: from.x + (dx * i) / 10, y: from.y + (distance * i) / 10 });
    }
    if (end) await send(end, from);
    await page.waitForTimeout(50);
  };
  return { page, pull, send };
}

/** The list's refresh state, as the test reads it. */
const state = (page, selector = '#list') => page.locator(selector).evaluate((el) => {
  const indicator = el.querySelector(':scope > .loading-indicator');
  return {
    refreshes: window.refreshes,
    busy: el.getAttribute('aria-busy'),
    visible: getComputedStyle(indicator).visibility === 'visible',
    overscroll: getComputedStyle(el).overscrollBehaviorY,
  };
});

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: a pull past the threshold refreshes once and the indicator stays until the page reports the finish`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, pull } = await open(browser, engine);
      assert.equal((await state(page)).overscroll, 'contain', 'the browser\'s own pull is contained');
      assert.equal((await state(page)).visible, false, 'the indicator is hidden at rest');

      // waitUntil(): the refresh lasts until the promise settles.
      await page.evaluate(() => {
        window.onPull = (event) => event.detail.waitUntil(new Promise((resolve) => { window.finish = resolve; }));
      });
      await pull(150);
      let now = await state(page);
      assert.equal(now.refreshes, 1, 'one refresh event');
      assert.equal(now.visible, true, 'the indicator shows while refreshing');
      assert.equal(now.busy, 'true');
      await page.waitForTimeout(200);
      assert.equal((await state(page)).visible, true, 'the indicator stays until the page reports the finish');
      await page.evaluate(() => window.finish());
      await page.waitForTimeout(50);
      now = await state(page);
      assert.equal(now.busy, null, 'aria-busy is removed when the refresh finishes');
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#list > .loading-indicator')).visibility === 'hidden');

      // complete(): the instance ends the refresh.
      await page.evaluate(() => { window.onPull = null; });
      await pull(150);
      now = await state(page);
      assert.equal(now.refreshes, 2);
      assert.equal(now.visible, true);
      await page.evaluate(() => Expressive.PullToRefresh.getInstance(document.getElementById('list')).complete());
      assert.equal((await state(page)).busy, null);
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#list > .loading-indicator')).visibility === 'hidden');
      await page.evaluate(() => Expressive.PullToRefresh.getInstance(document.getElementById('list')).destroy());
    } finally {
      await browser.close();
    }
  });
}
