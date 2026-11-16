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

test('custom native-bar rules and accessibility media are present in the bundle', () => {
  const rules = parseRules(css);
  assert.ok(rules.some(r => r.selectors.includes('html.scroll-area.custom:has(> .scroll-area-bar)') && /scrollbar-width:\s*none/.test(r.body)));
  assert.ok(rules.some(r => r.selectors.includes('html.scroll-area.custom:has(> .scroll-area-bar)::-webkit-scrollbar') && /display:\s*none/.test(r.body)));
  for (const query of ['forced-colors: active', 'pointer: coarse']) {
    const media = mediaRules(css, query);
    assert.ok(media.some(r => r.selectors.includes('html.scroll-area.custom > .scroll-area-bar') && /display:\s*none/.test(r.body)), query);
    assert.ok(media.some(r => r.selectors.includes('html.scroll-area.custom:has(> .scroll-area-bar)') && /scrollbar-width:\s*(auto|thin)/.test(r.body)), query);
  }
  assert.match(css, /@media print\s*\{\s*html\.scroll-area\.custom > \.scroll-area-bar\s*\{\s*display: none/);
});

for (const [engine, browserType, browserTest] of engines) {
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

  browserTest(`page bar opt-in restores native scrolling and ignores pointer (${engine})`, async () => {
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
        await page.mouse.click(box.x + 6, 150);
        assert.equal(await page.evaluate(() => window.clicked), true);
      }
      await page.evaluate(() => { document.documentElement.classList.remove('custom'); });
      if (engine !== 'firefox') assert.equal(await width(), 'thin');
      assert.equal(await page.locator('.scroll-area-bar').evaluate(el => getComputedStyle(el).display), 'none');
      await page.evaluate(() => { document.documentElement.classList.add('custom'); document.documentElement.style.cssText = '--scroll-area-thumb-color:rgb(12,34,56);--scroll-area-bar-size:14px'; });
      if (engine !== 'firefox') assert.equal(await width(), 'none');
      assert.equal(await page.locator('.scroll-area-bar').evaluate(el => el.getBoundingClientRect().width), 14);
      assert.equal(await page.locator('.scroll-area-thumb').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(12, 34, 56)');
      await page.mouse.move(200, 150); await page.mouse.wheel(0, 400);
      await page.waitForFunction(() => scrollY > 0);
      await page.evaluate(() => { scrollTo(0, 0); document.body.focus(); });
      await page.keyboard.press('PageDown'); await page.waitForFunction(() => scrollY > 0);
      await page.evaluate(() => { scrollTo(0, 0); document.querySelector('#fragment').click(); });
      await page.waitForFunction(() => scrollY > 1000);
      await destroy(page);
      if (engine !== 'firefox') assert.equal(await width(), 'thin');
    } finally { await destroy(page); await browser.close(); }
  });
}
