import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([n]) => !requested || requested === n)) {
  test(`${name}: an anchored tooltip sits on its side, centered, and follows its trigger through scrolling`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>
        <div id="scroller" style="height: 300px; overflow: auto; margin-top: 100px"><div style="height: 900px; padding-top: 150px">
          <button id="trigger" style="margin-left: 300px">Save</button></div></div>
        <script>${js}</script></body></html>`);
      const read = () => page.evaluate(() => {
        const tip = Expressive.Tooltip.getInstance(document.getElementById('trigger')).tooltipEl.getBoundingClientRect();
        const anchor = document.getElementById('trigger').getBoundingClientRect();
        return { gap: Math.round(tip.top - anchor.bottom), offCenter: Math.round((tip.left + tip.right) / 2 - (anchor.left + anchor.right) / 2) };
      });
      await page.evaluate(() => {
        const instance = Expressive.Tooltip.init(document.getElementById('trigger'), { text: 'Save draft', position: 'bottom', enterDelay: 0, inDuration: 0 });
        instance.open();
      });
      await page.waitForFunction(() => getComputedStyle(Expressive.Tooltip.getInstance(document.getElementById('trigger')).tooltipEl).visibility === 'visible');
      const before = await read();
      assert.ok(before.gap > 0, `the tooltip is below its trigger: gap ${before.gap}`);
      assert.ok(Math.abs(before.offCenter) <= 1, `the tooltip is centered on its trigger: ${before.offCenter}`);
      await page.evaluate(() => { document.getElementById('scroller').scrollTop = 60; });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      assert.deepEqual(await read(), before, 'the tooltip moved with its trigger');
    } finally {
      await browser.close();
    }
  });
}
