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
    <button type="button" class="text" data-refresh>Refresh</button>
    <ul>${rows}</ul>
  </div>
  <div class="pull-to-refresh" id="page" style="width:400px">
    <span class="loading-indicator contained" role="status" aria-label="Refreshing"></span>
    <button type="button" class="text" data-refresh>Refresh</button>
    <ul>${rows}${rows}${rows}</ul>
  </div>
  <div class="pull-to-refresh" id="nest" style="width:400px;height:300px;overflow-y:auto">
    <span class="loading-indicator contained" role="status" aria-label="Refreshing"></span>
    <button type="button" class="text" data-refresh>Refresh</button>
    <div id="inner" style="height:200px;overflow-y:auto"><ul>${rows}</ul></div>
  </div>
  <main id="pane" style="width:400px;height:300px;overflow-y:auto">
    <div class="pull-to-refresh" id="inpane">
      <span class="loading-indicator contained" role="status" aria-label="Refreshing"></span>
      <button type="button" class="text" data-refresh>Refresh</button>
      <ul>${rows}</ul>
    </div>
  </main>
  <script>${js}</script>
  <script>
    window.refreshes = 0;
    // Moves the component cancelled, so they did not scroll.
    window.prevented = 0;
    document.addEventListener('touchmove', (event) => { if (event.defaultPrevented) window.prevented++; }, { passive: true });
    document.addEventListener('expressive:refresh', (event) => {
      window.refreshes++;
      if (window.onPull) window.onPull(event);
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
  </script>`;

/** Opens the fixture with touch input and returns the page and a pull function. */
async function open(browser, engine) {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 600, height: 700 } });
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
  /** Drags `distance` pixels down (negative is up) from the list's middle, then ends as `end` says. */
  const pull = async (distance, { end = 'touchend', dx = 0, selector = '#list' } = {}) => {
    const box = await page.locator(selector).boundingBox();
    const from = { x: box.x + box.width / 2, y: Math.max(box.y, 0) + 60 };
    await send('touchstart', from);
    for (let i = 1; i <= 10; i++) {
      await send('touchmove', { x: from.x + (dx * i) / 10, y: from.y + (distance * i) / 10 });
    }
    if (end) await send(end);
    await page.waitForTimeout(50);
  };
  return { page, pull, send };
}

/** Waits for the indicator to go back up and hide. */
const hidden = (page, selector = '#list') => page.waitForFunction(
  (selector) => getComputedStyle(document.querySelector(`${selector} > .loading-indicator`)).visibility === 'hidden', selector);

/** The instance on an element, called in the page. */
const call = (page, method, selector = '#list') => page.evaluate(
  ([method, selector]) => Expressive.PullToRefresh.getInstance(document.querySelector(selector))[method](), [method, selector]);

/** The list's refresh state, as the test reads it. */
const state = (page, selector = '#list') => page.locator(selector).evaluate((el) => {
  const indicator = el.querySelector(':scope > .loading-indicator');
  return {
    refreshes: window.refreshes,
    prevented: window.prevented,
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
      assert.ok(now.prevented > 0, 'the pull cancels its moves, so nothing scrolls under it');
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

  browserTest(`${engine}: a short pull, a cancelled pull, a pull while scrolled down, a sideways drag and a mouse drag do nothing`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, pull } = await open(browser, engine);
      const list = page.locator('#list');

      await pull(40);
      assert.equal(await list.evaluate((el) => el.classList.contains('pulling')), false, 'the pull ends on release');
      await hidden(page);
      await pull(150, { end: 'touchcancel' });
      await hidden(page);
      await page.evaluate(() => { window.prevented = 0; });
      await pull(100, { dx: 300 });
      await hidden(page);

      await list.evaluate((el) => { el.scrollTop = 200; });
      await pull(150);
      assert.equal((await state(page)).prevented, 0, 'a drag that is no pull keeps its moves, so it scrolls');
      if (engine === 'chromium') {
        assert.ok(await list.evaluate((el) => el.scrollTop) < 200, 'a real touch scrolls the list back up');
      }
      await list.evaluate((el) => { el.scrollTop = 0; });

      const box = await list.boundingBox();
      await page.mouse.move(box.x + 200, box.y + 60);
      await page.mouse.down();
      await page.mouse.move(box.x + 200, box.y + 210, { steps: 10 });
      await page.mouse.up();

      const now = await state(page);
      assert.equal(now.refreshes, 0, 'none of them refreshes');
      assert.equal(now.busy, null);
      assert.equal(now.visible, false);
      assert.equal(await list.evaluate((el) => el.style.getPropertyValue('--pull-to-refresh-offset')), '', 'no offset left behind');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: while a refresh runs, pulls, the button and refresh() start no second one`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, pull } = await open(browser, engine);
      await page.evaluate(() => { window.onPull = (event) => event.detail.waitUntil(new Promise(() => {})); });
      await pull(150);
      await pull(150);
      await page.click('#list [data-refresh]');
      await call(page, 'refresh');
      let now = await state(page);
      assert.equal(now.refreshes, 1, 'one refresh in all');
      assert.equal(now.busy, 'true', 'a promise that never settles keeps the refresh running');

      await call(page, 'complete');
      assert.equal((await state(page)).busy, null);
      await pull(150);
      now = await state(page);
      assert.equal(now.refreshes, 2, 'a pull after the finish refreshes again');
      assert.equal(now.busy, 'true');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: the refresh button, by click, Enter or Space, and refresh() each start a refresh`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page } = await open(browser, engine);
      const button = page.locator('#list [data-refresh]');
      const ways = [
        () => button.click(),
        async () => { await button.focus(); await page.keyboard.press('Enter'); },
        async () => { await button.focus(); await page.keyboard.press('Space'); },
        () => call(page, 'refresh'),
      ];
      for (const [i, way] of ways.entries()) {
        await way();
        const now = await state(page);
        assert.equal(now.refreshes, i + 1, `way ${i + 1} refreshes once`);
        assert.equal(now.visible, true, `way ${i + 1} shows the indicator`);
        assert.equal(now.busy, 'true');
        await call(page, 'complete');
      }
      await hidden(page);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a container that does not scroll pulls the page, only at its top`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, pull } = await open(browser, engine);
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY), 'contain', 'the page\'s own pull is contained');

      await pull(150, { selector: '#page' });
      assert.equal((await state(page, '#page')).refreshes, 1, 'a pull with the page at its top refreshes');
      await call(page, 'complete', '#page');

      await page.evaluate(() => window.scrollTo(0, 500));
      await pull(150, { selector: '#page' });
      assert.equal((await state(page, '#page')).refreshes, 1, 'a pull with the page scrolled down does not');
      if (engine === 'chromium') {
        assert.ok(await page.evaluate(() => window.scrollY) < 500, 'a real touch scrolls the page back up');
      }
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: under reduced motion the indicator hides at once, and a pull still refreshes`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, pull } = await open(browser, engine);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      // The docs show a page overriding a duration token on :root. That
      // beats the token zeroing under reduced motion, so the component's own
      // rule has to hold.
      await page.addStyleTag({ content: ':root { --md-sys-motion-spring-default-spatial-duration: 500ms; }' });
      await pull(40);
      const short = await page.locator('#list > .loading-indicator').evaluate((el) => new Promise((resolve) => {
        requestAnimationFrame(() => resolve({ visibility: getComputedStyle(el).visibility, animations: el.getAnimations().length }));
      }));
      assert.deepEqual(short, { visibility: 'hidden', animations: 0 }, 'no transition back up');

      await pull(150);
      const now = await state(page);
      assert.equal(now.refreshes, 1);
      assert.equal(now.visible, true);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: destroy() undoes a pull in progress and a running refresh, and stops later ones`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, pull, send } = await open(browser, engine);
      const read = () => page.locator('#list').evaluate((el) => ({
        busy: el.getAttribute('aria-busy'),
        pulling: el.classList.contains('pulling'),
        offset: el.style.getPropertyValue('--pull-to-refresh-offset'),
        progress: el.style.getPropertyValue('--pull-to-refresh-progress'),
      }));

      // A finger still down, past the threshold.
      await pull(150, { end: null });
      assert.deepEqual(await read(), { busy: null, pulling: true, offset: '64px', progress: '1' });
      await call(page, 'destroy');
      assert.deepEqual(await read(), { busy: null, pulling: false, offset: '', progress: '' });
      await send('touchend');
      assert.equal((await state(page)).refreshes, 0, 'lifting the finger after destroy() does not refresh');

      // A refresh that never finishes on its own.
      await page.evaluate(() => {
        window.onPull = (event) => event.detail.waitUntil(new Promise(() => {}));
        Expressive.PullToRefresh.init(document.getElementById('list'));
      });
      await page.click('#list [data-refresh]');
      assert.equal((await read()).busy, 'true');
      await call(page, 'destroy');
      assert.deepEqual(await read(), { busy: null, pulling: false, offset: '', progress: '' });
      assert.equal(await page.locator('#list').evaluate((el) => !!Expressive.PullToRefresh.getInstance(el)), false);
      await hidden(page);

      await pull(150);
      await page.click('#list [data-refresh]');
      assert.equal((await state(page)).refreshes, 1, 'no event after destroy()');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a drag that a scroller inside the container or around it can take scrolls it instead of pulling`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, pull } = await open(browser, engine);

      // A scrolled-down list inside a container that is at its top.
      await page.locator('#nest').scrollIntoViewIfNeeded();
      await page.locator('#inner').evaluate((el) => { el.scrollTop = 100; });
      await pull(150, { selector: '#inner' });
      let now = await state(page, '#nest');
      assert.equal(now.refreshes, 0, 'the inner list takes the drag');
      assert.equal(now.prevented, 0, 'and scrolls');
      await page.locator('#inner').evaluate((el) => { el.scrollTop = 0; });
      await pull(150, { selector: '#inner' });
      assert.equal((await state(page, '#nest')).refreshes, 1, 'with the inner list at its top, the container pulls');
      await call(page, 'complete', '#nest');

      // A container that does not scroll, inside a scrolled-down pane.
      await page.locator('#pane').scrollIntoViewIfNeeded();
      await page.locator('#pane').evaluate((el) => { el.scrollTop = 200; });
      await pull(150, { selector: '#pane' });
      now = await state(page, '#inpane');
      assert.equal(now.refreshes, 1, 'the pane takes the drag');
      await page.locator('#pane').evaluate((el) => { el.scrollTop = 0; });
      await pull(150, { selector: '#pane' });
      assert.equal((await state(page, '#inpane')).refreshes, 2, 'with the pane at its top, the container pulls');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a second finger ends a pull`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, send } = await open(browser, engine);
      const box = await page.locator('#list').boundingBox();
      const finger = (x, y) => ({ x: box.x + x, y: box.y + y });
      await send('touchstart', finger(150, 60));
      for (let y = 70; y <= 160; y += 10) await send('touchmove', finger(150, y));
      assert.equal(await page.locator('#list').evaluate((el) => el.classList.contains('pulling')), true);

      await send('touchstart', finger(150, 160), finger(250, 60));
      assert.equal(await page.locator('#list').evaluate((el) => el.classList.contains('pulling')), false, 'the pull ends');
      await page.evaluate(() => { window.prevented = 0; });
      for (let y = 170; y <= 220; y += 10) await send('touchmove', finger(150, y), finger(250, y - 100));
      await send('touchend');
      const now = await state(page);
      assert.equal(now.refreshes, 0, 'lifting the fingers does not refresh');
      assert.equal(now.prevented, 0, 'two fingers keep their moves, for a pinch');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: waitUntil() waits for every promise, rejected ones too, and only the running refresh's`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page } = await open(browser, engine);
      const busy = () => page.locator('#list').evaluate((el) => el.getAttribute('aria-busy'));
      await page.evaluate(() => {
        window.settle = {};
        const deferred = (name) => new Promise((resolve, reject) => { window.settle[name] = { resolve, reject }; });
        window.onPull = (event) => {
          for (const name of window.next) event.detail.waitUntil(deferred(name));
        };
        window.next = ['a', 'b'];
      });
      await call(page, 'refresh');
      await page.evaluate(() => window.settle.b.reject(new Error('offline')));
      assert.equal(await busy(), 'true', 'one promise is still pending');
      await page.evaluate(() => window.settle.a.resolve());
      await page.waitForFunction(() => !document.getElementById('list').hasAttribute('aria-busy'));

      // complete() ends a refresh whose promise is still pending; that
      // promise settling later must not end the next refresh.
      await page.evaluate(() => { window.next = ['old']; });
      await call(page, 'refresh');
      await call(page, 'complete');
      await page.evaluate(() => { window.next = ['new']; });
      await call(page, 'refresh');
      await page.evaluate(() => window.settle.old.resolve());
      await page.waitForTimeout(50);
      assert.equal(await busy(), 'true', 'the earlier refresh\'s promise does not end this one');
      await page.evaluate(() => window.settle.new.resolve());
      await page.waitForFunction(() => !document.getElementById('list').hasAttribute('aria-busy'));
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: the threshold comes from markup options and onRefresh gets the detail`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, pull } = await open(browser, engine);
      await page.evaluate(() => {
        const list = document.getElementById('list');
        Expressive.PullToRefresh.getInstance(list).destroy();
        list.setAttribute('data-pull-to-refresh-options', '{"threshold": 200}');
        Expressive.AutoInit();
      });
      await pull(150);
      assert.equal((await state(page)).refreshes, 0, '150px is short of a 200px threshold');
      await pull(300);
      assert.equal((await state(page)).refreshes, 1);
      await call(page, 'complete');

      const got = await page.evaluate(() => new Promise((resolve) => {
        Expressive.PullToRefresh.init(document.getElementById('list'), {
          onRefresh(detail) { resolve(typeof detail.waitUntil); },
        });
        document.querySelector('#list [data-refresh]').click();
      }));
      assert.equal(got, 'function');
    } finally {
      await browser.close();
    }
  });
}
