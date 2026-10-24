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
   * `rest` holds the finger still first, past the flick window.
   */
  const swipe = async (selector, dx, { dy = 0, end = 'touchend', rest = 0 } = {}) => {
    const box = await page.locator(selector).boundingBox();
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await send('touchstart', from);
    for (let i = 1; i <= 10; i++) {
      await send('touchmove', { x: from.x + (dx * i) / 10, y: from.y + (dy * i) / 10 });
    }
    if (rest) await page.waitForTimeout(rest);
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

/** The fixture with its list in a 300px tall scrolling box. */
const scrolling = () => fixture().replace('<div id="box" style="width:360px">', '<div id="box" style="width:360px;height:300px;overflow-y:auto">');

/** The instance on the list, called in the page. */
const call = (page, method, ...args) => page.evaluate(([method, args]) => {
  const list = document.getElementById('list');
  return Expressive.SwipeActions.getInstance(list)[method](...args.map((id) => document.getElementById(id)));
}, [method, args]);

const offset = (page, selector) => page.locator(selector).evaluate((row) => row.style.getPropertyValue('--swipe-offset'));
const actionsWidth = (page, selector) => page.locator(`${selector} .swipe-actions`).evaluate((el) => el.offsetWidth);

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: a short swipe closes, the row slides no farther than its actions, and a swipe back closes it`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, swipe, send } = await open(browser, engine);
      await swipe('#row2', -20, { rest: 150 });
      await settled(page, '#row2', false);
      assert.equal(await expanded(page, '#row2'), 'false', 'a short swipe that rests leaves the row closed');

      const width = await actionsWidth(page, '#row2');
      await swipe('#row2', -400, { end: null });
      assert.equal(await offset(page, '#row2'), `${-width}px`, 'the row slides only as far as its actions reach');
      await send('touchend');
      await settled(page, '#row2', true);
      assert.equal(await expanded(page, '#row2'), 'true');

      await swipe('#row2', 150);
      await settled(page, '#row2', false);
      assert.equal(await expanded(page, '#row2'), 'false', 'a swipe toward the inline end closes an open row');

      await swipe('#row4', 150);
      await settled(page, '#row4', false);
      assert.equal(await offset(page, '#row4'), '', 'a closed row does not slide the other way');
      assert.deepEqual(await page.evaluate(() => window.toggles), [{ row: 'row2', open: true }, { row: 'row2', open: false }]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a vertical drag, a mouse drag, a second finger and touchcancel open nothing`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, swipe, send } = await open(browser, engine, { html: scrolling() });
      await swipe('#row2', -30, { dy: -150 });
      assert.equal(await expanded(page, '#row2'), 'false', 'a drag that moves up first is a scroll');
      if (engine === 'chromium') {
        assert.ok(await page.locator('#box').evaluate((el) => el.scrollTop) > 0, 'a real touch scrolls the box');
      }
      await page.locator('#box').evaluate((el) => { el.scrollTop = 0; });

      const box = await page.locator('#row3').boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 - 150, box.y + box.height / 2, { steps: 10 });
      await page.mouse.up();
      assert.equal(await expanded(page, '#row3'), 'false', 'a mouse drag never swipes');

      const row = await page.locator('#row4').boundingBox();
      const from = { x: row.x + row.width / 2, y: row.y + row.height / 2 };
      await send('touchstart', from);
      for (let i = 1; i <= 5; i++) await send('touchmove', { x: from.x - i * 30, y: from.y });
      await send('touchstart', { x: from.x - 150, y: from.y }, { x: from.x, y: from.y + 100 });
      await send('touchmove', { x: from.x - 160, y: from.y }, { x: from.x, y: from.y + 110 });
      await send('touchend');
      await settled(page, '#row4', false);
      assert.equal(await expanded(page, '#row4'), 'false', 'a second finger ends the swipe');

      await swipe('#row5', -150, { end: 'touchcancel' });
      await settled(page, '#row5', false);
      assert.equal(await expanded(page, '#row5'), 'false', 'a cancelled swipe opens nothing');
      assert.deepEqual(await page.evaluate(() => window.toggles), []);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: the toggle opens and closes a row, and a tap outside, Escape or an action closes it`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page } = await open(browser, engine);
      await page.click('#row2 [data-swipe-toggle]');
      await settled(page, '#row2', true);
      assert.equal(await expanded(page, '#row2'), 'true');
      await page.click('#row2 [data-swipe-toggle]');
      await settled(page, '#row2', false);
      assert.equal(await expanded(page, '#row2'), 'false');

      await page.click('#row2 [data-swipe-toggle]');
      await settled(page, '#row2', true);
      const label = await page.locator('#row5').boundingBox();
      await page.mouse.click(label.x + 40, label.y + label.height / 2);
      await settled(page, '#row2', false);
      assert.equal(await expanded(page, '#row2'), 'false', 'a tap outside closes the row');

      await page.focus('#row2 [data-action="archive"]');
      await settled(page, '#row2', true);
      assert.equal(await expanded(page, '#row2'), 'true', 'focus on an action opens its closed row');
      await page.keyboard.press('Escape');
      await settled(page, '#row2', false);
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Actions for message 2', 'Escape moves focus to the toggle');

      await page.click('#row2 [data-swipe-toggle]');
      await settled(page, '#row2', true);
      await page.click('#row2 [data-action="delete"]');
      assert.deepEqual(await page.evaluate(() => window.clicks), ['Delete message 2'], 'the action runs once');
      await settled(page, '#row2', false);
      assert.equal(await expanded(page, '#row2'), 'false', 'the row closes after its action');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: one row is open at a time, and each change fires one event and runs onToggle`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, swipe } = await open(browser, engine);
      await page.evaluate(() => {
        window.callbacks = [];
        Expressive.SwipeActions.getInstance(document.getElementById('list')).options.onToggle = (detail) => window.callbacks.push({ row: detail.row.id, open: detail.open });
      });
      await swipe('#row2', -150);
      await page.click('#row4 [data-swipe-toggle]');
      await call(page, 'open', 'row6');
      assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#list > .swipe-open')].map((row) => row.id)), ['row6'], 'only the last row stays open');
      await call(page, 'close');
      const expected = [
        { row: 'row2', open: true }, { row: 'row2', open: false },
        { row: 'row4', open: true }, { row: 'row4', open: false },
        { row: 'row6', open: true }, { row: 'row6', open: false },
      ];
      assert.deepEqual(await page.evaluate(() => window.toggles), expected);
      assert.deepEqual(await page.evaluate(() => window.callbacks), expected);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: in a right-to-left page the actions are at the left and a swipe to the right reveals them`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, swipe } = await open(browser, engine, { dir: 'rtl' });
      await swipe('#row2', 150);
      await settled(page, '#row2', true);
      const [actions, list] = await page.locator('#row2').evaluate((row) => [
        row.querySelector('.swipe-actions').getBoundingClientRect().left,
        row.parentElement.getBoundingClientRect().left,
      ]);
      assert.ok(Math.abs(actions - list) < 2, 'the actions sit at the left edge');
      await swipe('#row3', -150);
      await settled(page, '#row3', false);
      assert.equal(await expanded(page, '#row3'), 'false', 'a swipe to the left opens nothing');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: with reduced motion the row follows the finger but opens and closes without animating`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      // The documented override on :root outranks the zeroed motion tokens.
      const html = fixture().replace('<style>', '<style>:root { --md-sys-motion-spring-default-spatial-duration: 500ms; }</style><style>');
      const { page, swipe, send } = await open(browser, engine, { reducedMotion: 'reduce', html });
      await swipe('#row2', -60, { end: null });
      assert.equal(await offset(page, '#row2'), '-60px', 'the row follows the finger');
      await send('touchend');
      const animations = () => page.locator('#row2').evaluate((row) => new Promise((resolve) => {
        requestAnimationFrame(() => resolve(row.getAnimations().length));
      }));
      assert.equal(await animations(), 0, 'release does not animate');
      assert.equal(await revealed(page, '#row2'), true);
      await page.click('#row2 [data-swipe-toggle]');
      assert.equal(await animations(), 0, 'the toggle does not animate');
      assert.equal(await revealed(page, '#row2'), false);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: destroy() closes the open row silently and undoes what it set`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, swipe, send } = await open(browser, engine);
      await page.click('#row2 [data-swipe-toggle]');
      await call(page, 'destroy');
      const toggles = await page.evaluate(() => window.toggles.length);
      assert.equal(toggles, 1, 'destroy() fires no event');
      assert.equal(await offset(page, '#row2'), '');
      assert.equal(await page.locator('#row2 [data-swipe-toggle]').getAttribute('aria-expanded'), null);
      await swipe('#row3', -150);
      await page.click('#row4 [data-swipe-toggle]');
      assert.equal(await page.locator('#list > .swipe-open').count(), 0, 'nothing opens after destroy()');

      await page.evaluate(() => Expressive.SwipeActions.init(document.getElementById('list')));
      await swipe('#row5', -100, { end: null });
      await call(page, 'destroy');
      await send('touchend');
      assert.equal(await offset(page, '#row5'), '', 'a swipe in progress leaves no offset');
      assert.equal(await page.locator('#row5').evaluate((row) => row.classList.contains('swiping')), false);
      assert.equal(await page.evaluate(() => window.toggles.length), 1);
    } finally {
      await browser.close();
    }
  });
}
