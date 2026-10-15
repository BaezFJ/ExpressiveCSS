import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;
const engines = Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name);
const markup = `<!doctype html><html lang="en" theme="light"><head><style>${css}</style></head><body style="margin:0">
<header style="padding:8px 16px"><nav id="nav" class="mega-menu" aria-label="Main">
  <a href="#home" aria-current="page">Home</a>
  <button id="products" type="button" popovertarget="products-panel">Products</button>
  <div id="products-panel" class="mega-menu-panel" popover>
    <section><h2>Build</h2><ul><li><a id="first" href="#editor">Editor<small>Write and preview</small></a></li><li><a href="#api">API</a></li></ul></section>
    <section><h2>Ship</h2><ul><li><a href="#deploy">Deploy</a></li></ul></section>
    <section><h2>Learn</h2><ul><li><a href="#docs">Docs</a></li></ul></section>
  </div>
  <a href="#pricing">Pricing</a>
</nav></header><main><p>Content</p></main></body></html>`;

for (const [name, engine] of engines) {
  test(`${name}: mega menu opens a wide panel of link groups below its button`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
      await page.setContent(markup);
      const products = page.getByRole('button', { name: 'Products' });
      assert.equal(await products.getAttribute('aria-expanded'), null, 'no authored state');
      await products.click();
      const panel = page.locator('#products-panel');
      assert.equal(await panel.evaluate((el) => el.matches(':popover-open')), true);
      const p = await panel.boundingBox();
      const b = await products.boundingBox();
      assert.ok(p.y >= b.y + b.height, 'the panel opens below the button');
      assert.ok(Math.abs(p.x - 16) < 1 && Math.abs(p.x + p.width - 984) < 1, `the panel spans the window less its margins: ${p.x}, ${p.width}`);
      const columns = await page.locator('#products-panel > section').evaluateAll((s) => new Set(s.map((el) => Math.round(el.getBoundingClientRect().top))).size);
      assert.equal(columns, 1, 'sections sit side by side');
      await page.waitForTimeout(250);
      assert.match(await page.locator('#products').evaluate((el) => getComputedStyle(el, '::after').transform), /^matrix\(-1/, 'the chevron turns');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'first', 'Tab moves into the open panel');
      await page.keyboard.press('Escape');
      assert.equal(await panel.evaluate((el) => el.matches(':popover-open')), false, 'Escape closes it');
      assert.equal(await page.getByRole('link').count(), 2, 'closed panel links are out of reach');

      await page.setViewportSize({ width: 400, height: 700 });
      await products.click();
      const narrow = await page.locator('#products-panel > section').evaluateAll((s) => s.map((el) => Math.round(el.getBoundingClientRect().left)));
      assert.ok(new Set(narrow).size === 1, 'on a phone the groups stack');
    } finally {
      await browser.close();
    }
  });
}
