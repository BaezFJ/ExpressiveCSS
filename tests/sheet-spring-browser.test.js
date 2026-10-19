import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([n]) => !requested || requested === n)) {
  test(`${name}: a bottom sheet opens on the spatial spring without uncovering a gap below it`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
      await page.setContent(`<!doctype html><html lang="en" motion="expressive"><head><style>${css}</style></head><body>
        <dialog class="bottom-sheet" id="sheet" aria-label="Filters"><h2>Filters</h2><p id="last">Last line</p></dialog></body></html>`);
      // Track the sheet's bottom edge every frame while it opens.
      const frames = await page.evaluate(() => new Promise((resolve) => {
        const sheet = document.getElementById('sheet');
        const bottoms = [];
        const start = performance.now();
        sheet.showModal();
        const tick = () => {
          bottoms.push(sheet.getBoundingClientRect().bottom);
          if (performance.now() - start < 700) requestAnimationFrame(tick); else resolve(bottoms);
        };
        requestAnimationFrame(tick);
      }));
      const viewport = 800;
      assert.ok(Math.min(...frames) >= viewport, `a gap opened under the sheet: bottom reached ${Math.min(...frames)}`);
      assert.ok(Math.max(...frames) > viewport + 100, 'the sheet did not animate in from below');

      const settled = await page.evaluate(() => {
        const sheet = document.getElementById('sheet');
        const style = getComputedStyle(sheet);
        return {
          timing: style.transitionTimingFunction.startsWith('linear('),
          duration: style.transitionDuration,
          lastBottom: Math.round(document.getElementById('last').getBoundingClientRect().bottom),
          sheetBottom: Math.round(sheet.getBoundingClientRect().bottom),
        };
      });
      assert.equal(settled.timing, true);
      assert.notEqual(settled.duration, '0s');
      assert.equal(settled.sheetBottom, viewport + 24, 'the bleed sits below the viewport');
      assert.ok(settled.lastBottom <= viewport, 'content stays above the viewport edge');
    } finally {
      await browser.close();
    }
  });
}
