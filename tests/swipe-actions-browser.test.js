// Swipe actions on list rows. Chromium swipes with real touches through CDP.
// Firefox and WebKit get touch events dispatched from the page: WebKit has no
// Touch constructor, so each event carries a plain `touches` list instead.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const row = (n) => `<li id="row${n}">
    Message ${n}
    <button type="button" class="icon-button" data-swipe-toggle aria-label="Actions for message ${n}">
      <span class="material-symbols" aria-hidden="true">more_horiz</span>
    </button>
    <span class="swipe-actions">
      <button type="button" class="icon-button" data-action="archive" aria-label="Archive message ${n}">
        <span class="material-symbols" aria-hidden="true">archive</span>
      </button>
      <button type="button" class="icon-button" data-action="delete" aria-label="Delete message ${n}">
        <span class="material-symbols" aria-hidden="true">delete</span>
      </button>
    </span>
  </li>`;

const fixture = (dir = 'ltr') => `<html dir="${dir}"><style>${css}</style>
  <div id="box" style="width:360px">
    <ul class="list swipeable" id="list" aria-label="Inbox">${Array.from({ length: 10 }, (_, i) => row(i + 1)).join('')}</ul>
  </div>
  <script>${js}</script>
  <script>
    window.clicks = [];
    window.toggles = [];
    document.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]');
      if (action) window.clicks.push(action.getAttribute('aria-label'));
    });
    document.addEventListener('expressive:swipetoggle', (event) => {
      window.toggles.push({ row: event.detail.row.id, open: event.detail.open });
    });
    // Synthetic touches, for engines without CDP touch input. \`points\`
    // are the fingers still down after the event; the first finger's
    // target receives every event, as a real touch's does.
    window.touch = (type, points) => {
      if (type === 'touchstart' && points.length === 1) window.touchTarget = document.elementFromPoint(points[0].x, points[0].y);
      const touches = points.map(({ x, y }, i) => ({ identifier: i + 1, clientX: x, clientY: y, target: window.touchTarget }));
      const event = new TouchEvent(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'touches', { value: touches });
      Object.defineProperty(event, 'changedTouches', { value: touches.slice(-1) });
      window.touchTarget.dispatchEvent(event);
    };
  </script></html>`;

/** Opens the fixture with touch input and returns the page and a swipe function. */
async function open(browser, engine, { dir = 'ltr', reducedMotion = 'no-preference', html = fixture(dir) } = {}) {
  const context = await browser.newContext({ hasTouch: true, reducedMotion, viewport: { width: 600, height: 900 } });
  const page = await context.newPage();
  await page.setContent(html);
  await page.evaluate(() => Expressive.AutoInit());
  const cdp = engine === 'chromium' ? await context.newCDPSession(page) : null;
  /** Sends a touch event with the fingers still down after it: none for an end. */
  const send = async (type, ...points) => {
    if (cdp) {
      const cdpType = { touchstart: 'touchStart', touchmove: 'touchMove', touchend: 'touchEnd', touchcancel: 'touchCancel' }[type];
      await cdp.send('Input.dispatchTouchEvent', { type: cdpType, touchPoints: points });
    } else {
      await page.evaluate(([type, points]) => window.touch(type, points), [type, points]);
    }
  };
  /**
   * Drags `dx` pixels sideways (negative is left) and `dy` down across a
   * row's label, in ten steps, then ends as `end` says, or not at all.
   */
  const swipe = async (selector, dx, { dy = 0, end = 'touchend' } = {}) => {
    const box = await page.locator(selector).boundingBox();
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await send('touchstart', from);
    for (let i = 1; i <= 10; i++) {
      await send('touchmove', { x: from.x + (dx * i) / 10, y: from.y + (dy * i) / 10 });
    }
    if (end) await send(end);
    await page.waitForTimeout(50);
  };
  return { page, swipe, send };
}

/** Whether a row's actions sit wholly inside the list, where they can be seen. */
const revealed = (page, selector) => page.locator(selector).evaluate((row) => {
  const list = row.parentElement.getBoundingClientRect();
  const actions = row.querySelector('.swipe-actions').getBoundingClientRect();
  return actions.width > 0 && actions.left >= list.left - 1 && actions.right <= list.right + 1;
});

/** Waits until a row's actions are fully revealed, or fully hidden past the list's edge. */
const settled = (page, selector, open) => page.waitForFunction(([selector, open]) => {
  const row = document.querySelector(selector);
  const list = row.parentElement.getBoundingClientRect();
  const actions = row.querySelector('.swipe-actions').getBoundingClientRect();
  const inside = actions.left >= list.left - 1 && actions.right <= list.right + 1;
  const outside = actions.left >= list.right - 1 || actions.right <= list.left + 1;
  return open ? inside : outside;
}, [selector, open]);

const expanded = (page, selector) => page.locator(`${selector} [data-swipe-toggle]`).getAttribute('aria-expanded');

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: a swipe reveals a row's actions, and a keyboard user reaches the same actions`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      let { page, swipe } = await open(browser, engine);
      assert.equal(await revealed(page, '#row2'), false, 'the actions are hidden at rest');
      assert.equal(await expanded(page, '#row2'), 'false');

      await swipe('#row2', -150);
      await settled(page, '#row2', true);
      assert.equal(await expanded(page, '#row2'), 'true', 'the toggle reports the open row');
      assert.deepEqual(await page.evaluate(() => window.clicks), [], 'a swipe runs no action');
      await page.close();

      ({ page } = await open(browser, engine));
      await page.focus('#row2 .swipe-actions [data-action="delete"]');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Actions for message 3');
      await page.keyboard.press('Enter');
      await settled(page, '#row3', true);
      assert.equal(await expanded(page, '#row3'), 'true');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Archive message 3');
      assert.equal(await revealed(page, '#row3'), true, 'the focused action is visible');
      await page.keyboard.press('Enter');
      assert.deepEqual(await page.evaluate(() => window.clicks), ['Archive message 3'], 'Enter runs the action once');
      await page.evaluate(() => Expressive.SwipeActions.getInstance(document.getElementById('list')).destroy());
    } finally {
      await browser.close();
    }
  });
}
