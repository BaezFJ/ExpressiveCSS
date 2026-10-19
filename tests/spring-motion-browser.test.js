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

  // A side sheet slides in from its docked edge. Its outer edge, the physical
  // right for an end sheet in LTR, must never come inside the viewport.
  for (const [label, dir, cls, outer] of [
    ['end, ltr', 'ltr', '', 'right'],
    ['start, ltr', 'ltr', 'start', 'left'],
    ['end, rtl', 'rtl', '', 'left'],
  ]) {
    test(`${name}: a side sheet (${label}) opens on the spatial spring without uncovering its edge`, { timeout: 30000 }, async (t) => {
      if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
      const browser = await engine.launch({ headless: true });
      try {
        const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
        await page.setContent(`<!doctype html><html lang="en" dir="${dir}" motion="expressive"><head><style>${css}</style></head><body>
          <dialog class="side-sheet ${cls}" id="sheet" aria-label="Details"><header><h2>Details</h2></header><p id="body">Body</p></dialog></body></html>`);
        const edges = await page.evaluate((outer) => new Promise((resolve) => {
          const sheet = document.getElementById('sheet');
          const seen = [];
          const start = performance.now();
          sheet.showModal();
          const tick = () => {
            seen.push(sheet.getBoundingClientRect()[outer]);
            if (performance.now() - start < 700) requestAnimationFrame(tick); else resolve(seen);
          };
          requestAnimationFrame(tick);
        }, outer));
        const inside = outer === 'right' ? Math.min(...edges) < 1000 : Math.max(...edges) > 0;
        assert.equal(inside, false, `the ${outer} edge came into view: ${outer === 'right' ? Math.min(...edges) : Math.max(...edges)}`);
        const settled = await page.evaluate((outer) => {
          const body = document.getElementById('body').getBoundingClientRect();
          const sheet = document.getElementById('sheet').getBoundingClientRect();
          return { body: Math.round(body[outer]), sheet: Math.round(sheet[outer]) };
        }, outer);
        assert.equal(settled.sheet, outer === 'right' ? 1024 : -24, 'the bleed sits past the viewport edge');
        assert.equal(settled.body, outer === 'right' ? 1000 : 0, 'content ends at the viewport edge');
      } finally {
        await browser.close();
      }
    });
  }

  test(`${name}: a navigation rail expands on the spatial spring and settles at its expanded width`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 700 } });
      await page.setContent(`<!doctype html><html lang="en" motion="expressive"><head><style>${css}</style></head><body>
        <nav class="navigation-rail" id="rail" aria-label="Main"><a href="#" aria-current="page">Home</a></nav></body></html>`);
      const widths = await page.evaluate(() => new Promise((resolve) => {
        const rail = document.getElementById('rail');
        const seen = [];
        const start = performance.now();
        rail.classList.add('expanded');
        const tick = () => {
          seen.push(rail.getBoundingClientRect().width);
          if (performance.now() - start < 700) requestAnimationFrame(tick); else resolve(seen);
        };
        requestAnimationFrame(tick);
      }));
      const final = widths.at(-1);
      assert.equal(Math.round(final), 280);
      assert.ok(Math.max(...widths) > final + 1, `the expressive spring did not overshoot: ${Math.max(...widths)}`);
      assert.ok(Math.max(...widths) < final * 1.03, `the overshoot is larger than the spring allows: ${Math.max(...widths)}`);
      assert.match(await page.locator('#rail').evaluate((el) => getComputedStyle(el).transitionTimingFunction), /^linear\(/);
    } finally {
      await browser.close();
    }
  });
}
