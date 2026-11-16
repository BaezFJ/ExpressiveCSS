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
const geometry = page => page.locator('.scroll-area-bar:not(.horizontal)').evaluate(bar => {
  const track = bar.getBoundingClientRect();
  const thumb = bar.firstElementChild.getBoundingClientRect();
  return { length: thumb.height, offset: thumb.top - track.top, bottom: thumb.bottom, end: track.bottom, hidden: bar.hidden, display: getComputedStyle(bar).display };
});

async function clearanceFixture(page) {
  await setup(page, 2000, '<main id="main">Top</main><a id="back" class="back-to-top button circle extra" href="#main" aria-label="Top" style="bottom:180px">Top</a><div class="fab-menu"><button class="button circle extra" type="button">Add</button><ul><li><button type="button">Draft</button></li></ul></div><button id="edge" style="position:fixed;inset-block:0;inset-inline-end:0;width:12px;padding:0;border:0">Edge</button><dialog>Modal</dialog>');
  await page.evaluate(() => {
    document.body.insertAdjacentHTML('afterbegin', '<header><nav aria-label="Main"><button type="button" aria-label="Menu"><span class="material-symbols" aria-hidden="true">menu</span></button><h2>Title</h2><button id="trailing" type="button" aria-label="More"><span class="material-symbols" aria-hidden="true">more_vert</span></button></nav></header>');
    window.clicks = {};
    for (const el of document.querySelectorAll('#trailing, #back, .fab-menu > button, .fab-menu li button, #edge')) el.addEventListener('click', e => { e.preventDefault(); window.clicks[el.id || el.textContent] = (window.clicks[el.id || el.textContent] || 0) + 1; });
    window.fab = Expressive.FloatingActionButton.init(document.querySelector('.fab-menu'));
  });
}
const clearance = page => page.evaluate(() => [
  getComputedStyle(document.querySelector('header > nav')).paddingInlineEnd,
  getComputedStyle(document.querySelector('#back')).insetInlineEnd,
  getComputedStyle(document.querySelector('.fab-menu')).insetInlineEnd,
]);

async function nativeClearance(page) {
  assert.deepEqual(await clearance(page), ['4px', '16px', '16px']);
  try {
    for (const offset of ['0', '-20px', '40px']) {
      await page.evaluate(offset => {
        document.querySelector('#back').style.setProperty('--md-comp-back-to-top-offset', offset);
        document.querySelector('.fab-menu').style.setProperty('--md-comp-fab-menu-offset', offset);
      }, offset);
      const expected = offset === '0' ? '0px' : offset;
      assert.deepEqual(await clearance(page), ['4px', expected, expected]);
    }
  } finally {
    await page.evaluate(() => {
      document.querySelector('#back').style.removeProperty('--md-comp-back-to-top-offset');
      document.querySelector('.fab-menu').style.removeProperty('--md-comp-fab-menu-offset');
    });
  }
}

test('custom native-bar rules and accessibility media are present in the bundle', () => {
  const hiding = css.match(/@media screen and \(forced-colors: none\) and \(not \(pointer: coarse\)\) \{(\s*html\.scroll-area\.custom:has\(> \.scroll-area-bar\) \{[\s\S]*?)\n  \}/);
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
  const container = '.scroll-area-wrapper > .scroll-area.custom:has(~ .scroll-area-bar:not([hidden]))';
  const active = parseRules(css.slice(css.indexOf('@media screen and (forced-colors: none)'), css.indexOf('html.scroll-area.custom > .scroll-area-bar[hidden]')));
  assert.ok(active.some(r => r.selectors.includes(container) && /scrollbar-width:\s*none/.test(r.body)));
  assert.ok(active.some(r => r.selectors.includes(`${container}::-webkit-scrollbar`) && /display:\s*none/.test(r.body)));
  assert.match(css, /inset-inline-end: calc\(anchor\(self-end\)/);
  assert.match(css, /html\.scroll-area\.custom > \.scroll-area-bar > \.scroll-area-thumb/);
  assert.match(css, /@media print\s*\{\s*html\.scroll-area\.custom > \.scroll-area-bar\s*\{\s*display: none/);
});

for (const [engine, browserType, browserTest] of engines) {
  browserTest(`shadow fixed controls inherit page-bar clearance (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
    const insets = () => page.evaluate(() => [...window.shadowRoot.querySelectorAll('.back-to-top, .fab-menu')].map(el => getComputedStyle(el).insetInlineEnd));
    const offsets = value => page.evaluate(value => {
      window.shadowRoot.querySelector('.back-to-top').style.setProperty('--md-comp-back-to-top-offset', value);
      window.shadowRoot.querySelector('.fab-menu').style.setProperty('--md-comp-fab-menu-offset', value);
    }, value);
    try {
      await setup(page);
      await page.evaluate(css => {
        const host = document.createElement('div');
        document.body.append(host);
        window.shadowRoot = host.attachShadow({ mode: 'closed' });
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        window.shadowRoot.adoptedStyleSheets = [sheet];
        window.shadowRoot.innerHTML = '<header><nav aria-label="Shadow"><h2>Shadow page</h2></nav></header><a class="back-to-top button circle extra" href="#content">Top</a><div class="fab-menu"><button type="button" class="button circle extra">Add</button></div>';
      }, css);
      assert.deepEqual(await insets(), ['16px', '16px']);
      await init(page);
      assert.deepEqual(await insets(), ['18px', '18px']);
      assert.ok(await page.evaluate(() => getComputedStyle(window.shadowRoot.host).getPropertyValue('--scroll-area-bar-clearance')));
      assert.equal(await page.evaluate(() => getComputedStyle(window.shadowRoot.querySelector('nav')).paddingInlineEnd), '4px');
      // A shadow header is not a document-level app bar; its author opts into page clearance.
      await page.evaluate(() => {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync('header > nav { padding-inline-end: var(--scroll-area-bar-clearance, 4px); }');
        window.shadowRoot.adoptedStyleSheets = [...window.shadowRoot.adoptedStyleSheets, sheet];
      });
      for (const dir of ['ltr', 'rtl']) {
        await page.evaluate(dir => document.documentElement.dir = dir, dir);
        for (const [size, expected] of [[12, '18px'], [14, '19px'], [30, '30px']]) {
          await page.evaluate(size => document.documentElement.style.setProperty('--scroll-area-bar-size', `${size}px`), size);
          assert.deepEqual(await insets(), [expected, expected]);
          assert.equal(await page.evaluate(() => getComputedStyle(window.shadowRoot.querySelector('nav')).paddingInlineEnd), expected);
        }
        await offsets('40px');
        assert.deepEqual(await insets(), ['40px', '40px']);
        await offsets('16px');
      }
      for (const disable of [
        () => page.evaluate(() => document.documentElement.classList.remove('custom')),
        ...(engine === 'webkit' ? [] : [() => page.emulateMedia({ forcedColors: 'active' })]),
        () => page.emulateMedia({ media: 'print' }),
        () => destroy(page),
      ]) {
        await disable();
        for (const offset of ['0', '-20px', '40px', '16px']) {
          await offsets(offset);
          const expected = offset === '0' ? '0px' : offset;
          assert.deepEqual(await insets(), [expected, expected]);
        }
        assert.equal(await page.evaluate(() => getComputedStyle(window.shadowRoot.querySelector('nav')).paddingInlineEnd), '4px');
        await page.emulateMedia({ media: 'screen', forcedColors: 'none' });
        await page.evaluate(() => document.documentElement.classList.add('custom'));
      }
    } finally { await destroy(page); await browser.close(); }
  });

  browserTest(`page bar clearance defers to native modes and runtime removal (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
    try {
      await clearanceFixture(page); await nativeClearance(page); await init(page);
      for (const media of [...(engine === 'webkit' ? [] : [{ forcedColors: 'active' }]), { media: 'print' }]) {
        await page.emulateMedia(media);
        await nativeClearance(page);
        await page.emulateMedia({ media: 'screen', forcedColors: 'none' });
      }
      for (const remove of ['custom', 'destroy']) {
        await page.evaluate(remove => {
          if (remove === 'custom') document.documentElement.classList.remove('custom');
          else window.area.destroy();
        }, remove);
        await nativeClearance(page);
        await page.mouse.click(394, 250);
        assert.equal(await page.evaluate(() => window.clicks.edge), remove === 'custom' ? 1 : 2);
        await page.evaluate(() => document.documentElement.classList.add('custom'));
      }
      if (engine === 'chromium') {
        const context = await browser.newContext({ viewport: { width: 400, height: 300 }, hasTouch: true, isMobile: true });
        const mobile = await context.newPage();
        try {
          await clearanceFixture(mobile); await init(mobile);
          assert.equal(await mobile.evaluate(() => matchMedia('(pointer: coarse)').matches), true);
          await nativeClearance(mobile);
        } finally { await mobile.evaluate(() => window.fab?.destroy()); await destroy(mobile); await context.close(); }
      }
    } finally { await page.evaluate(() => window.fab?.destroy()); await destroy(page); await browser.close(); }
  });

  browserTest(`page bar gives edge controls target spacing in both directions (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    const page = await browser.newPage({ viewport: { width: 400, height: 300 }, reducedMotion: 'reduce' });
    try {
      for (const dir of ['ltr', 'rtl']) {
        await page.goto('about:blank'); await clearanceFixture(page);
        await page.evaluate(dir => document.documentElement.dir = dir, dir);
        assert.deepEqual(await clearance(page), ['4px', '16px', '16px']);
        await page.locator('#back').evaluate(el => el.style.setProperty('--md-comp-back-to-top-offset', '0'));
        assert.equal((await clearance(page))[1], '0px');
        await page.locator('#back').evaluate(el => el.style.removeProperty('--md-comp-back-to-top-offset'));
        await init(page);
        assert.deepEqual(await clearance(page), ['18px', '18px', '18px']);
        await page.evaluate(() => { window.backArea = Expressive.BackToTop.init(document.querySelector('#back')); scrollTo(0, 1000); });
        await page.waitForFunction(() => !document.querySelector('#back').inert);
        for (const selector of ['#trailing', '#back', '.fab-menu > button', '.fab-menu li button']) {
          await page.evaluate(() => window.fab.open()); await frames(page);
          const box = await page.locator(selector).boundingBox();
          const bar = await page.locator('.scroll-area-bar:not(.horizontal)').boundingBox();
          const distance = dir === 'ltr' ? bar.x + bar.width / 2 - box.x - box.width : box.x - bar.x - bar.width / 2;
          assert.ok(distance >= 12, `${selector} has ${distance}px center-line clearance`);
          await page.mouse.click(dir === 'ltr' ? box.x + box.width - 1 : box.x + 1, box.y + box.height / 2);
        }
        assert.deepEqual(await page.evaluate(() => window.clicks), { trailing: 1, back: 1, Add: 1, Draft: 1 });
        await page.evaluate(() => { window.fab.close(); scrollTo(0, 0); }); await frames(page);
        await page.mouse.click(dir === 'ltr' ? 394 : 6, 250); await frames(page);
        near(await page.evaluate(() => scrollY), 300, 'bar takes edge press');
        assert.equal(await page.evaluate(() => window.clicks.edge || 0), 0);
        for (const variant of ['medium', 'large', '']) {
          await page.locator('header').evaluate((el, value) => el.className = value, variant);
          assert.deepEqual(await clearance(page), ['18px', '18px', '18px']);
        }
        for (const [size, inset] of [[14, '19px'], [30, '30px'], [12, '18px']]) {
          await page.evaluate(size => document.documentElement.style.setProperty('--scroll-area-bar-size', `${size}px`), size);
          assert.deepEqual(await clearance(page), [inset, inset, inset]);
        }
        await page.locator('#back').evaluate(el => el.style.setProperty('--md-comp-back-to-top-offset', '40px'));
        assert.equal((await clearance(page))[1], '40px');
        await page.locator('#back').evaluate(el => el.style.removeProperty('--md-comp-back-to-top-offset'));
        await page.evaluate(() => { const article = document.createElement('article'); document.body.append(article); article.append(document.querySelector('header')); });
        assert.equal((await clearance(page))[0], '4px');
        await page.evaluate(() => { const shell = document.createElement('div'); shell.className = 'scaffold'; document.body.prepend(shell); shell.append(document.querySelector('header')); });
        assert.equal((await clearance(page))[0], '18px');
        await page.evaluate(() => { document.querySelector('dialog').showModal(); window.area.refresh(); });
        await page.setViewportSize({ width: 400, height: 200 }); await frames(page);
        assert.equal((await geometry(page)).hidden, true);
        assert.deepEqual(await clearance(page), ['18px', '18px', '18px']);
        await page.evaluate(() => { document.querySelector('dialog').close(); document.body.prepend(document.querySelector('header')); document.querySelector('.scaffold').remove(); window.backArea.destroy(); document.querySelector('#content').style.height = '0px'; scrollTo(0, 0); });
        await page.setViewportSize({ width: 400, height: 300 }); await frames(page);
        assert.equal((await geometry(page)).hidden, true);
        assert.deepEqual(await clearance(page), ['18px', '18px', '18px']);
        await page.evaluate(() => window.fab.destroy()); await destroy(page);
      }
    } finally { await page.evaluate(() => { window.backArea?.destroy(); window.fab?.destroy(); }); await destroy(page); await browser.close(); }
  });

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
        await page.evaluate(() => { window.moves = 0; document.querySelector('.scroll-area-bar:not(.horizontal)').addEventListener('pointermove', () => window.moves++); });
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

  browserTest(`native media transitions end a drag without a hidden pointer move (${engine})`, async () => {
    const browser = await leaseBrowser(browserType);
    const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
    try {
      for (const media of [...(engine === 'webkit' ? [] : [{ forcedColors: 'active' }]), { media: 'print' }]) {
        await page.goto('about:blank'); await setup(page); await init(page);
        await page.locator('.scroll-area-bar:not(.horizontal)').evaluate(bar => bar.addEventListener('pointerdown', e => window.pointer = e.pointerId));
        await page.mouse.move(394, 50); await page.mouse.down(); await page.mouse.move(394, 100); await frames(page);
        near(await page.evaluate(() => scrollY), 150, 'initial drag');
        await page.emulateMedia(media); await frames(page);
        assert.equal((await geometry(page)).display, 'none');
        assert.equal(await page.locator('.scroll-area-bar:not(.horizontal)').evaluate(bar => bar.hasPointerCapture(window.pointer)), false);
        const top = await page.evaluate(() => scrollY);
        await page.emulateMedia({ media: 'screen', forcedColors: 'none' }); await frames(page);
        await page.mouse.move(394, 150); await frames(page);
        near(await page.evaluate(() => scrollY), top, 'restoring screen media does not resume drag');
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
        const bar = document.querySelector('.scroll-area-bar:not(.horizontal)');
        bar.addEventListener('pointerdown', e => window.pointer = e.pointerId);
        bar.addEventListener('pointermove', e => window.lastMove = [e.clientX, e.clientY]);
      });
      await page.mouse.move(394, 50); await page.mouse.down();
      await page.mouse.move(200, 150); await frames(page);
      near(await page.evaluate(() => scrollY), 300, 'off-bar capture');
      assert.equal(await page.locator('.scroll-area-bar:not(.horizontal)').evaluate(el => el.hasPointerCapture(window.pointer)), true);
      let outsideSupported = true;
      for (const [y, top] of [[500, 600], [-200, 0]]) {
        await page.mouse.move(-40, y); await frames(page);
        const actual = await page.evaluate(() => scrollY);
        const delivered = await page.evaluate(() => window.lastMove);
        if (delivered[0] !== -40 || delivered[1] !== y) {
          outsideSupported = false;
          t.diagnostic(`automation requested (-40, ${y}) but delivered (${delivered.join(', ')}); V14 remains pending`);
        }
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
      assert.equal(await page.locator('.scroll-area-bar:not(.horizontal)').evaluate(el => el.hasPointerCapture(window.pointer)), false);
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
      const style = await page.locator('.scroll-area-bar:not(.horizontal)').evaluate(el => ({ pointer: getComputedStyle(el).pointerEvents, touch: getComputedStyle(el).touchAction }));
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
      if (timeline) assert.notEqual(await page.locator('.scroll-area-bar:not(.horizontal) > .scroll-area-thumb').evaluate(el => getComputedStyle(el).animationTimeline), 'auto');
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
        const bar = await page.locator('.scroll-area-bar:not(.horizontal)').boundingBox();
        for (const selector of ['.back-to-top', '.fab-menu']) {
          const box = await page.locator(selector).boundingBox();
          assert.ok(box.x + box.width <= bar.x || bar.x + bar.width <= box.x, `${dir} ${selector}`);
        }
      }
      assert.equal(await page.locator('.scroll-area-bar:not(.horizontal)').evaluate(el => getComputedStyle(el).zIndex), '999');
      if (engine !== 'webkit') {
        await page.emulateMedia({ forcedColors: 'active' });
        assert.equal(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), true);
        assert.equal(await page.locator('.scroll-area-bar:not(.horizontal)').evaluate(el => getComputedStyle(el).display), 'none');
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarColor), 'auto');
        if (engine === 'chromium') assert.notEqual(await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarWidth), 'none');
        await page.emulateMedia({ forcedColors: 'none' });
      }
      await page.emulateMedia({ media: 'print' });
      assert.equal(await page.locator('.scroll-area-bar:not(.horizontal)').evaluate(el => getComputedStyle(el).display), 'none');
      if (engine === 'chromium') {
        const touch = await browser.newContext({ viewport: { width: 400, height: 300 }, hasTouch: true, isMobile: true });
        const mobile = await touch.newPage();
        try {
          await setup(mobile); await init(mobile);
          assert.equal(await mobile.evaluate(() => matchMedia('(pointer: coarse)').matches), true);
          assert.equal(await mobile.locator('.scroll-area-bar:not(.horizontal)').evaluate(el => getComputedStyle(el).display), 'none');
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
        const box = await page.locator('.scroll-area-bar:not(.horizontal)').boundingBox();
        assert.equal(box.width, 12); assert.equal(box.height, 300);
        assert.equal(box.x, dir === 'ltr' ? 388 : 0);
        assert.equal(await page.locator('.scroll-area-bar:not(.horizontal) > .scroll-area-thumb').evaluate(el => el.getBoundingClientRect().width), 8);
        assert.equal(await page.locator('.scroll-area-bar:not(.horizontal)').evaluate(el => getComputedStyle(el).position), 'fixed');
        await page.evaluate(() => { window.clicked = false; });
        await page.mouse.click(box.x + 6, 150);
        assert.equal(await page.evaluate(() => window.clicked), false);
      }
      await page.evaluate(() => { document.documentElement.classList.remove('custom'); });
      if (engine !== 'firefox') assert.equal(await width(), 'thin');
      assert.equal(await page.locator('.scroll-area-bar:not(.horizontal)').evaluate(el => getComputedStyle(el).display), 'none');
      await page.evaluate(() => { document.documentElement.classList.add('custom'); document.documentElement.style.cssText = '--scroll-area-thumb-color:rgb(12,34,56);--scroll-area-bar-size:14px'; });
      if (engine !== 'firefox') assert.equal(await width(), 'none');
      assert.equal(await page.locator('.scroll-area-bar:not(.horizontal)').evaluate(el => el.getBoundingClientRect().width), 14);
      assert.equal(await page.locator('.scroll-area-bar:not(.horizontal) > .scroll-area-thumb').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(12, 34, 56)');
      await destroy(page);
      if (engine !== 'firefox') assert.equal(await width(), 'thin');
      await nativeInputs(page);
    } finally { await destroy(page); await browser.close(); }
  });
}
