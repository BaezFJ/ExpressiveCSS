import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const items = (copy) => ['Alpha', 'Beta', 'Gamma'].map((name) =>
  `<li><a href="#${name}"${copy ? ' tabindex="-1"' : ''}>${name}</a></li>`).join('');
const strip = (id, classes = '', attrs = '') => `<div class="marquee ${classes}" id="${id}" ${attrs}>
  <ul class="marquee-content" aria-label="Partners">${items(false)}</ul>
  <ul class="marquee-content" aria-hidden="true">${items(true)}</ul>
</div>`;

const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body style="margin:0">
<main style="width:600px">
  ${strip('h')}
  ${strip('rtl', '', 'dir="rtl"')}
  ${strip('rev', 'reverse')}
  ${strip('v', 'vertical', 'style="height:200px"')}
  ${strip('p', 'paused')}
</main>
</body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: marquee loops its two groups, pauses, follows direction and stops under reduced motion`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
      await page.setContent(markup);
      // Seek each strip's animations to half a cycle and report where its groups sit.
      const halfway = (id) => page.locator(`#${id}`).evaluate((el) => {
        const groups = [...el.querySelectorAll('.marquee-content')];
        for (const g of groups) for (const a of g.getAnimations()) a.currentTime = 10000;
        const strip = el.getBoundingClientRect();
        const [a, b] = groups.map((g) => g.getBoundingClientRect());
        return { strip: strip.toJSON(), a: a.toJSON(), b: b.toJSON(), states: groups.flatMap((g) => g.getAnimations().map((x) => x.playState)) };
      });

      const h = await halfway('h');
      assert.ok(Math.abs(h.a.width - h.strip.width) < 1, 'a short group fills the strip');
      assert.ok(Math.abs(h.b.left - (h.a.right + 32)) < 1, 'the copy follows one gap after the first group');
      assert.ok(Math.abs(h.a.left - (h.strip.left - (h.a.width + 32) / 2)) < 2, 'halfway through, the groups have moved left half a cycle');

      const rtl = await halfway('rtl');
      assert.ok(Math.abs(rtl.a.left - (rtl.strip.left + (rtl.a.width + 32) / 2)) < 2, 'right to left scrolls right');

      const rev = await page.locator('#rev .marquee-content').first().evaluate((g) => getComputedStyle(g).animationDirection);
      assert.equal(rev, 'reverse', 'reverse runs the cycle backward');

      const v = await halfway('v');
      assert.ok(Math.abs(v.b.top - (v.a.bottom + 32)) < 1, 'a vertical copy sits one gap below');
      assert.ok(Math.abs(v.a.top - (v.strip.top - (v.a.height + 32) / 2)) < 2, 'halfway through, a vertical strip has moved up half a cycle');
      assert.ok(Math.abs(v.a.left - v.strip.left) < 1, 'a vertical strip moves only up');

      assert.deepEqual((await halfway('h')).states, ['running', 'running']);
      assert.deepEqual((await halfway('p')).states, ['paused', 'paused'], '.paused stops the strip');
      await page.locator('#h a').first().focus();
      assert.deepEqual((await halfway('h')).states, ['paused', 'paused'], 'focus inside pauses the strip');
      await page.locator('#h a').first().blur();
      await page.locator('#rev').hover();
      assert.deepEqual((await halfway('rev')).states, ['paused', 'paused'], 'hover pauses the strip');

      const snapshot = await page.locator('#h').ariaSnapshot();
      assert.equal(snapshot.match(/link "Alpha"/g)?.length, 1, 'the copy is hidden from the accessibility tree');

      await page.emulateMedia({ reducedMotion: 'reduce' });
      const still = await page.locator('#h').evaluate((el) => ({
        overflow: getComputedStyle(el).overflowX,
        copy: getComputedStyle(el.lastElementChild).display,
        animations: el.getAnimations({ subtree: true }).length,
      }));
      assert.deepEqual(still, { overflow: 'auto', copy: 'none', animations: 0 }, 'reduced motion stops, drops the copy and scrolls by hand');
    } finally {
      await browser.close();
    }
  });
}
