import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<dl id="dl" class="description-list">
  <dt id="t1">Status</dt><dd id="d1">Shipped</dd>
  <div><dt id="t2">Ship to</dt><dd id="d2">Alvin Lee</dd><dd id="d3">12 Harbor Road, Portland</dd></div>
  <dt id="t3">Total</dt><dd id="d4">$87.00</dd>
</dl></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: description list pairs labels and values in two columns and stacks them when compact`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.setContent(markup);
      const box = (id) => page.locator(`#${id}`).boundingBox();
      const border = (id) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).borderTopWidth);

      const [t1, d1, t2, d2, d3] = await Promise.all(['t1', 'd1', 't2', 'd2', 'd3'].map(box));
      assert.ok(t1.x + t1.width <= d1.x, 'labels sit in the first column');
      assert.ok(Math.abs(t1.y - d1.y) < 1, 'a value shares its label row');
      assert.ok(Math.abs(t2.y - d2.y) < 1, 'a wrapping div does not break the row');
      assert.ok(Math.abs(d3.x - d2.x) < 1 && d3.y > d2.y, 'a second value stacks under the first');
      assert.deepEqual(await Promise.all(['t1', 'd1', 'd3'].map(border)), ['1px', '1px', '0px'], 'one divider per group');

      await page.setViewportSize({ width: 400, height: 600 });
      const [c1, e1] = await Promise.all(['t1', 'd1'].map(box));
      assert.ok(Math.abs(c1.x - e1.x) < 1 && e1.y >= c1.y + c1.height, 'compact widths put each label above its value');
      assert.equal(await border('d1'), '0px', 'no divider between a stacked label and its value');

      const terms = await page.locator('dt').allTextContents();
      assert.deepEqual(terms, ['Status', 'Ship to', 'Total'], 'reading order is unchanged');
    } finally {
      await browser.close();
    }
  });
}
