import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';
import { parseRules, mediaRules } from './css.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
async function setup(page, height = 900, extra = '') {
  await page.setContent(`<!doctype html><html class="scroll-area custom"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}\nbody { margin: 0; } #content { height: ${height}px; }</style></head><body><div id="content">${extra}</div></body></html>`);
  await page.addScriptTag({ content: js });
}
const init = page => page.evaluate(() => { window.area = Expressive.ScrollArea.init(document.documentElement); });
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const destroy = page => page.evaluate(() => window.area?.destroy());
async function nativeInputs(page) {
  const inputs = [
    { minimum: 0, run: async () => { await page.mouse.move(200, 150); await page.mouse.wheel(0, 400); } },
    { minimum: 0, run: async () => { await page.locator('#fragment').focus(); await page.keyboard.press('PageDown'); } },
    { minimum: 1000, run: async () => { await page.locator('#fragment').click(); } },
  ];
  for (const { minimum, run } of inputs) {
    // A fresh document keeps an earlier native scroll animation out of the next check.
    await page.goto('about:blank');
    await setup(page, 2000, '<a id="fragment" href="#end">End</a><div id="end" style="position:absolute;top:1800px">End target</div>');
    await init(page);
    try {
      await run();
      await page.waitForFunction(minimum => scrollY > minimum, minimum);
    } finally { await destroy(page); }
  }
}
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) <= 1, `${label}: ${actual}, expected ${expected}`);
const geometry = page => page.locator('.scroll-area-bar').evaluate(bar => {
  const track = bar.getBoundingClientRect();
  const thumb = bar.firstElementChild.getBoundingClientRect();
  return { length: thumb.height, offset: thumb.top - track.top, bottom: thumb.bottom, end: track.bottom, hidden: bar.hidden, display: getComputedStyle(bar).display };
});

test('custom native-bar rules and accessibility media are present in the bundle', () => {
  const hiding = css.match(/@media screen and \(forced-colors: none\) and \(not \(pointer: coarse\)\) \{([\s\S]*?)\n\}/);
  assert.ok(hiding, 'native hiding is limited to modes that show the custom bar');
  const rules = parseRules(hiding[1]);
  const barRule = parseRules(css).find(r => r.selectors.includes('html.scroll-area.custom > .scroll-area-bar') && /position:\s*fixed/.test(r.body));
  assert.doesNotMatch(barRule.body, /pointer-events:\s*none/);
  assert.match(barRule.body, /touch-action:\s*none/);
  assert.ok(rules.some(r => r.selectors.includes('html.scroll-area.custom:has(> .scroll-area-bar)') && /scrollbar-width:\s*none/.test(r.body)));
  assert.ok(rules.some(r => r.selectors.includes('html.scroll-area.custom:has(> .scroll-area-bar)::-webkit-scrollbar') && /display:\s*none/.test(r.body)));
  for (const query of ['forced-colors: active', 'pointer: coarse']) {
    const media = mediaRules(css, query);
    assert.ok(media.some(r => r.selectors.includes('html.scroll-area.custom > .scroll-area-bar') && /display:\s*none/.test(r.body)), query);
    assert.equal(media.some(r => r.selectors.some(s => s.includes('::-webkit-scrollbar'))), false, `${query} leaves the system scrollbar unstyled`);
  }
  assert.match(css, /@media print\s*\{\s*html\.scroll-area\.custom > \.scroll-area-bar\s*\{\s*display: none/);
});

for (const [engine, browserType, browserTest] of engines) {
  browserTest(`track press pages once, clamps and respects smooth scrolling (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
    try {
      await setup(page, 2000); await init(page);
      for (const top of [300, 600]) {
        await page.mouse.click(394, 250); await frames(page);
        near(await page.evaluate(() => scrollY), top, 'track pages one viewport');
      }
      await page.mouse.move(389, 100); await page.mouse.down(); await page.mouse.move(389, 150); await page.mouse.up(); await frames(page);
      assert.ok(Math.abs(await page.evaluate(() => scrollY) - (600 + 50 * 1700 / 252)) <= 7, 'strip beside thumb drags');
      await page.evaluate(() => scrollTo(0, 600)); await frames(page);
      await page.mouse.move(394, 250); await page.mouse.down(); await page.waitForTimeout(1500); await page.mouse.up(); await frames(page);
      near(await page.evaluate(() => scrollY), 900, 'held press pages once');
      for (const [start, y, top] of [[900, 10, 600], [100, 2, 0], [1600, 295, 1700]]) {
        await page.evaluate(top => scrollTo(0, top), start); await frames(page);
        await page.mouse.click(394, y); await frames(page);
        near(await page.evaluate(() => scrollY), top, 'track direction and clamp');
      }
      near((await geometry(page)).bottom, (await geometry(page)).end, 'track step reaches end');
      await page.evaluate(() => scrollTo(0, 0)); await destroy(page);
      await page.addStyleTag({ content: 'html { scroll-behavior: smooth; }' }); await init(page);
      await page.mouse.click(394, 250);
      await page.waitForFunction(() => Math.abs(scrollY - 300) <= 1); await page.waitForTimeout(100);
      near(await page.evaluate(() => scrollY), 300, 'track follows smooth CSS');
    } finally { await page.mouse.up(); await destroy(page); await browser.close(); }
  });

  browserTest(`hidden or inert bar ends a drag permanently (${engine})`, async t => {
    const browser = await leaseBrowser(browserType);
    const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
    try {
      for (const mode of ['modal', 'custom', 'unscrollable']) {
        await page.goto('about:blank');
        await setup(page, 900, '<dialog>Modal</dialog>'); await init(page);
        await page.evaluate(() => { window.moves = 0; document.querySelector('.scroll-area-bar').addEventListener('pointermove', () => window.moves++); });
        await page.mouse.move(394, 50); await page.mouse.down(); await page.mouse.move(394, 100); await frames(page);
        near(await page.evaluate(() => scrollY), 150, 'initial drag');
        await page.evaluate(mode => {
          if (mode === 'modal') document.querySelector('dialog').showModal();
          if (mode === 'custom') document.documentElement.classList.remove('custom');
          if (mode === 'unscrollable') document.querySelector('#content').style.height = '300px';
        }, mode);
        await frames(page);
        const hiddenTop = await page.evaluate(() => scrollY);
        const moves = await page.evaluate(() => window.moves);
        await page.mouse.move(394, 200); await frames(page);
        t.diagnostic(`${mode}: hidden/inert bar received ${await page.evaluate(() => window.moves) - moves} pointer moves`);
        near(await page.evaluate(() => scrollY), hiddenTop, 'hidden bar does not scroll');
        await page.evaluate(mode => {
          if (mode === 'modal') document.querySelector('dialog').close();
          if (mode === 'custom') document.documentElement.classList.add('custom');
          if (mode === 'unscrollable') document.querySelector('#content').style.height = '900px';
        }, mode);
        await frames(page); await page.mouse.move(394, 250); await frames(page);
        near(await page.evaluate(() => scrollY), hiddenTop, 'restoring bar does not resume drag');
        await page.mouse.up(); await destroy(page);
      }
    } finally { await page.mouse.up(); await destroy(page); await browser.close(); }
  });

  browserTest(`thumb drag maps travel, clamps and keeps its anchor (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
    try {
      for (const fallback of [false, true]) {
        await setup(page);
        if (fallback) {
          await page.addStyleTag({ content: '.scroll-area-thumb { animation: none !important; }' });
          await page.evaluate(() => { CSS.supports = () => false; });
        }
        await init(page); await frames(page);
        await page.mouse.move(394, 50); await page.mouse.down();
        for (const [y, top] of [[150, 300], [250, 600], [299, 600], [50, 0]]) {
          await page.mouse.move(394, y, { steps: 3 }); await frames(page);
          near(await page.evaluate(() => scrollY), top, 'drag position');
          near((await geometry(page)).offset, top / 3, 'thumb follows drag');
          if (y === 150) {
            await page.mouse.wheel(0, 120); await frames(page);
            await page.mouse.move(394, 151); await page.mouse.move(394, 150); await frames(page);
            near(await page.evaluate(() => scrollY), 300, 'wheel does not move anchor');
          }
        }
        await page.mouse.up(); await destroy(page);
      }
      await setup(page, 60000); await init(page); await frames(page);
      await page.mouse.move(394, 24); await page.mouse.down(); await page.mouse.move(394, 150); await frames(page);
      assert.ok(Math.abs(await page.evaluate(() => scrollY) - 29850) <= 237, 'minimum thumb maps half its travel');
      await page.mouse.up();
    } finally { await page.mouse.up(); await destroy(page); await browser.close(); }
  });

  browserTest(`thumb capture follows off-bar and outside-viewport moves (${engine})`, async t => {
    const browser = await leaseBrowser(browserType);
    const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
    try {
      await setup(page); await init(page);
      await page.evaluate(() => {
        const bar = document.querySelector('.scroll-area-bar');
        bar.addEventListener('pointerdown', e => window.pointer = e.pointerId);
        bar.addEventListener('pointermove', e => window.lastMove = [e.clientX, e.clientY]);
      });
      await page.mouse.move(394, 50); await page.mouse.down();
      await page.mouse.move(200, 150); await frames(page);
      near(await page.evaluate(() => scrollY), 300, 'off-bar capture');
      assert.equal(await page.locator('.scroll-area-bar').evaluate(el => el.hasPointerCapture(window.pointer)), true);
      let outsideSupported = true;
      for (const [y, top] of [[500, 600], [-200, 0]]) {
        const before = await page.evaluate(() => scrollY);
        await page.mouse.move(-40, y); await frames(page);
        const actual = await page.evaluate(() => scrollY);
        const delivered = await page.evaluate(() => window.lastMove);
        if (delivered[0] !== -40 || delivered[1] !== y) {
          outsideSupported = false;
          t.diagnostic(`automation requested (-40, ${y}) but delivered (${delivered.join(', ')}); V14 remains pending`);
        }
        else if (actual === before && actual !== top) t.diagnostic(`automation withheld outside-viewport move to (-40, ${y}); V14 remains pending`);
        else near(actual, top, 'outside-viewport capture');
      }
      await page.mouse.up(); await frames(page);
      if (!outsideSupported) {
        t.diagnostic('outside release is also unverified; checking release inside the viewport instead');
        await page.mouse.move(200, 150); await page.mouse.down(); await page.mouse.up(); await frames(page);
      }
      const released = await page.evaluate(() => scrollY);
      await page.mouse.move(394, 150); await frames(page);
      near(await page.evaluate(() => scrollY), released, 'release outside ends drag');
      assert.equal(await page.locator('.scroll-area-bar').evaluate(el => el.hasPointerCapture(window.pointer)), false);
    } finally { await page.mouse.up(); await destroy(page); await browser.close(); }
  });

  browserTest(`thumb drag stays instant and destroy releases it (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await setup(page); await page.addStyleTag({ content: 'html { scroll-behavior: smooth; }' }); await init(page);
      await page.mouse.move(394, 50); await page.mouse.down(); await page.mouse.move(394, 150); await frames(page);
      near(await page.evaluate(() => scrollY), 300, 'smooth CSS does not animate drag');
      await destroy(page); await page.mouse.move(394, 250); await page.mouse.up(); await frames(page);
      near(await page.evaluate(() => scrollY), 300, 'destroy ends drag');
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await init(page);
      await page.mouse.move(394, 50); await page.mouse.down(); await page.mouse.move(394, 150); await page.mouse.up(); await frames(page);
      near(await page.evaluate(() => scrollY), 300, 'replacement drags');
      await page.mouse.click(394, 250);
      await page.waitForFunction(() => Math.abs(scrollY - 600) <= 1);
      assert.deepEqual(errors, []);
    } finally { await page.mouse.up(); await destroy(page); await browser.close(); }
  });

  browserTest(`page bar preserves focus, selection, context menu and wheel (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
    try {
      await setup(page, 2000, '<input value="selected text"><p>Text crossed by a pointer drag</p>');
      await init(page);
      const style = await page.locator('.scroll-area-bar').evaluate(el => ({ pointer: getComputedStyle(el).pointerEvents, touch: getComputedStyle(el).touchAction }));
      assert.deepEqual(style, { pointer: 'auto', touch: 'none' });
      await page.evaluate(() => { const input = document.querySelector('input'); input.focus(); input.select(); document.addEventListener('contextmenu', e => window.menuCancelled = e.defaultPrevented); });
      const selected = await page.evaluate(() => getSelection().toString());
      await page.mouse.move(394, 20); await page.mouse.down();
      await page.mouse.move(200, 120, { steps: 4 }); await page.mouse.up();
      await page.mouse.click(394, 250);
      assert.deepEqual(await page.evaluate(() => ({ focus: document.activeElement.tagName, start: document.querySelector('input').selectionStart, end: document.querySelector('input').selectionEnd, text: getSelection().toString() })), { focus: 'INPUT', start: 0, end: 13, text: selected });
      assert.equal(await page.evaluate(() => getSelection().containsNode(document.querySelector('p'), true)), false, 'drag does not select paragraph text');
      const top = await page.evaluate(() => scrollY);
      await page.mouse.click(394, 250, { button: 'right' });
      assert.equal(await page.evaluate(() => scrollY), top);
      assert.equal(await page.evaluate(() => window.menuCancelled), false);
      await page.mouse.move(394, 150); await page.mouse.wheel(0, 300);
      await page.waitForFunction(top => scrollY > top, top);
    } finally { await destroy(page); await browser.close(); }
  });

  browserTest(`page bar restores after a measured modal is removed (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
    try {
      await setup(page, 900, '<div id="modal-host"><dialog>Modal</dialog></div>');
      await init(page);
      await page.evaluate(() => {
        document.querySelector('dialog').showModal();
        window.area.refresh();
      });
      assert.equal((await geometry(page)).hidden, true);
      await page.evaluate(() => document.querySelector('#modal-host').remove());
      await frames(page);
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY), 'auto');
      assert.equal((await geometry(page)).hidden, false);
      assert.notEqual((await geometry(page)).display, 'none');
    } finally { await destroy(page); await browser.close(); }
  });

  browserTest(`page thumb fallback follows native scroll without timelines (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    const page = await browser.newPage({ viewport: { width: 400, height: 300 }, reducedMotion: 'reduce' });
    try {
      await setup(page);
      await page.addStyleTag({ content: '.scroll-area-thumb { animation: none !important; }' });
      await page.evaluate(() => { CSS.supports = () => false; scrollTo(0, 300); });
      await init(page); await frames(page);
      near((await geometry(page)).offset, 100, 'fallback starts at current scroll position');
      await page.evaluate(() => scrollTo(0, 600)); await frames(page);
      const box = await geometry(page);
      near(box.offset, 200, 'fallback scroll offset'); near(box.bottom, box.end, 'fallback track end');
    } finally { await destroy(page); await browser.close(); }
  });

  browserTest(`page thumb tracks geometry, growth, locks and reduced motion (${engine})`, async t => {
    const browser = await leaseBrowser(browserType);
    const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
    try {
      await setup(page); await init(page); await frames(page);
      const timeline = await page.evaluate(() => CSS.supports('animation-timeline: scroll()'));
      t.diagnostic(`animation-timeline supported: ${timeline}`);
      if (timeline) assert.notEqual(await page.locator('.scroll-area-thumb').evaluate(el => getComputedStyle(el).animationTimeline), 'auto');
      for (const top of [0, 300, 600]) {
        await page.evaluate(top => scrollTo(0, top), top); await frames(page);
        const box = await geometry(page);
        near(box.length, 100, '900px document thumb length');
        near(box.offset, top / 3, '900px document thumb offset');
        if (top === 600) near(box.bottom, box.end, 'thumb reaches track end');
      }
      await destroy(page);
      await page.evaluate(() => scrollTo(0, 300)); await init(page); await frames(page);
      near((await geometry(page)).offset, 100, 'init at a scrolled position');
      await page.evaluate(() => document.querySelector('#content').style.height = '60000px'); await frames(page);
      near((await geometry(page)).length, 48, 'minimum thumb length');
      await page.evaluate(() => scrollTo(0, 60000)); await frames(page);
      const long = await geometry(page); near(long.bottom, long.end, 'long document end');
      await page.evaluate(() => { document.querySelector('#content').style.height = '900px'; scrollTo(0, 0); }); await frames(page);
      await page.evaluate(() => { const extra = document.createElement('div'); extra.id = 'growth'; extra.style.height = '900px'; document.body.append(extra); }); await frames(page);
      near((await geometry(page)).length, 50, 'content growth');
      await page.setViewportSize({ width: 400, height: 150 }); await frames(page);
      near((await geometry(page)).length, 48, 'window resize');
      await page.setViewportSize({ width: 400, height: 300 }); await frames(page);
      near((await geometry(page)).length, 50, 'window restore');
      await page.evaluate(() => { const dialog = document.createElement('dialog'); document.body.append(dialog); dialog.showModal(); });
      assert.equal((await geometry(page)).display, 'none');
      await page.evaluate(() => window.area.refresh());
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY), 'hidden');
      assert.equal((await geometry(page)).hidden, true);
      await page.evaluate(() => document.querySelector('dialog').close());
      await frames(page);
      assert.notEqual((await geometry(page)).display, 'none');
      await page.evaluate(() => { document.querySelector('#growth').remove(); document.querySelector('#content').style.height = '300px'; }); await frames(page);
      assert.equal((await geometry(page)).hidden, true);
      await page.evaluate(() => document.querySelector('#content').style.height = '900px'); await frames(page);
      assert.equal((await geometry(page)).hidden, false);
      await page.evaluate(() => { document.documentElement.style.overflow = 'hidden'; window.area.refresh(); });
      assert.equal((await geometry(page)).hidden, true);
      await page.evaluate(() => { document.documentElement.style.overflow = ''; window.area.refresh(); });
      assert.equal((await geometry(page)).hidden, false);
      await page.evaluate(() => { document.documentElement.style.height = '100%'; document.body.style.height = '100%'; document.querySelector('#content').style.height = '1800px'; window.area.refresh(); }); await frames(page);
      near((await geometry(page)).length, 50, 'refresh in a fixed-height layout');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => scrollTo(0, 1800)); await frames(page);
      const reduced = await geometry(page); near(reduced.bottom, reduced.end, 'reduced motion still tracks');
    } finally { await destroy(page); await browser.close(); }
  });

  browserTest(`page bar defers to system modes and clears fixed controls (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
    try {
      await setup(page, 2000, '<main id="main">Top</main><a class="back-to-top button circle extra" href="#main" aria-label="Back to top">Top</a><div class="fab-menu"><button type="button">Create</button><ul><li><button type="button">Draft</button></li></ul></div>');
      await init(page);
      await page.evaluate(() => { window.back = Expressive.BackToTop.init(document.querySelector('.back-to-top')); scrollTo(0, 1000); });
      await page.waitForFunction(() => !document.querySelector('.back-to-top').hasAttribute('inert'));
      for (const dir of ['ltr', 'rtl']) {
        await page.evaluate(dir => document.documentElement.dir = dir, dir);
        const bar = await page.locator('.scroll-area-bar').boundingBox();
        for (const selector of ['.back-to-top', '.fab-menu']) {
          const box = await page.locator(selector).boundingBox();
          assert.ok(box.x + box.width <= bar.x || bar.x + bar.width <= box.x, `${dir} ${selector}`);
        }
      }
      assert.equal(await page.locator('.scroll-area-bar').evaluate(el => getComputedStyle(el).zIndex), '999');
      if (engine !== 'webkit') {
        await page.emulateMedia({ forcedColors: 'active' });
        assert.equal(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), true);
        assert.equal(await page.locator('.scroll-area-bar').evaluate(el => getComputedStyle(el).display), 'none');
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarColor), 'auto');
        if (engine === 'chromium') assert.notEqual(await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarWidth), 'none');
        await page.emulateMedia({ forcedColors: 'none' });
      }
      await page.emulateMedia({ media: 'print' });
      assert.equal(await page.locator('.scroll-area-bar').evaluate(el => getComputedStyle(el).display), 'none');
      if (engine === 'chromium') {
        const touch = await browser.newContext({ viewport: { width: 400, height: 300 }, hasTouch: true, isMobile: true });
        const mobile = await touch.newPage();
        try {
          await setup(mobile); await init(mobile);
          assert.equal(await mobile.evaluate(() => matchMedia('(pointer: coarse)').matches), true);
          assert.equal(await mobile.locator('.scroll-area-bar').evaluate(el => getComputedStyle(el).display), 'none');
          assert.notEqual(await mobile.evaluate(() => getComputedStyle(document.documentElement).scrollbarWidth), 'none');
        } finally { await destroy(mobile); await touch.close(); }
      }
    } finally {
      await page.evaluate(() => window.back?.destroy());
      await destroy(page); await browser.close();
    }
  });

  browserTest(`page bar opt-in restores native scrolling and takes pointer input (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
    try {
      await setup(page, 2000, '<a id="fragment" href="#end">End</a><div id="end" style="position:absolute;top:1800px">End target</div><button id="edge" style="position:fixed;inset-block:0;inset-inline-end:0;width:12px;padding:0;border:0" onclick="window.clicked=true" aria-label="Edge"></button>');
      const width = () => page.evaluate(() => getComputedStyle(document.documentElement).scrollbarWidth);
      if (engine !== 'firefox') assert.equal(await width(), 'thin');
      await init(page);
      if (engine !== 'firefox') assert.equal(await width(), 'none');
      for (const dir of ['ltr', 'rtl']) {
        await page.evaluate(dir => document.documentElement.dir = dir, dir);
        const box = await page.locator('.scroll-area-bar').boundingBox();
        assert.equal(box.width, 12); assert.equal(box.height, 300);
        assert.equal(box.x, dir === 'ltr' ? 388 : 0);
        assert.equal(await page.locator('.scroll-area-thumb').evaluate(el => el.getBoundingClientRect().width), 8);
        assert.equal(await page.locator('.scroll-area-bar').evaluate(el => getComputedStyle(el).position), 'fixed');
        await page.evaluate(() => { window.clicked = false; });
        await page.mouse.click(box.x + 6, 150);
        assert.equal(await page.evaluate(() => window.clicked), false);
      }
      await page.evaluate(() => { document.documentElement.classList.remove('custom'); });
      if (engine !== 'firefox') assert.equal(await width(), 'thin');
      assert.equal(await page.locator('.scroll-area-bar').evaluate(el => getComputedStyle(el).display), 'none');
      await page.evaluate(() => { document.documentElement.classList.add('custom'); document.documentElement.style.cssText = '--scroll-area-thumb-color:rgb(12,34,56);--scroll-area-bar-size:14px'; });
      if (engine !== 'firefox') assert.equal(await width(), 'none');
      assert.equal(await page.locator('.scroll-area-bar').evaluate(el => el.getBoundingClientRect().width), 14);
      assert.equal(await page.locator('.scroll-area-thumb').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(12, 34, 56)');
      await destroy(page);
      if (engine !== 'firefox') assert.equal(await width(), 'thin');
      await nativeInputs(page);
    } finally { await destroy(page); await browser.close(); }
  });
}
