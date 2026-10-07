import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = (dir) => `<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head><body>
<main style="width:400px">
  <p role="status">Loading messages</p>
  <div id="region" aria-busy="true">
    <div id="box" class="skeleton" style="height:100px"></div>
    <div id="circle" class="skeleton circle"></div>
    <div id="t1" class="skeleton text"></div>
    <div id="t2" class="skeleton text"></div>
  </div>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: skeleton shimmers, stops under reduced motion and stays out of the accessibility tree`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      const style = (id) => page.locator(`#${id}`).evaluate((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return { animation: s.animationName, direction: s.animationDirection, image: s.backgroundImage, radius: s.borderTopLeftRadius, width: r.width, height: r.height };
      });

      for (const dir of ['ltr', 'rtl']) {
        await page.setContent(markup(dir));
        const box = await style('box');
        assert.equal(box.animation, 'skeleton-shimmer', `${dir}: shimmer runs`);
        assert.equal(box.direction, dir === 'rtl' ? 'reverse' : 'normal', `${dir}: shimmer follows the reading direction`);
        assert.match(box.image, /linear-gradient/);
        assert.equal(box.width, 400);
        assert.equal(box.height, 100);

        const circle = await style('circle');
        assert.deepEqual([circle.width, circle.height, circle.radius], [40, 40, '50%'], `${dir}: circle`);

        const first = await style('t1');
        const last = await style('t2');
        assert.equal(first.width, 400, `${dir}: a text line fills the row`);
        assert.equal(last.width, 240, `${dir}: the last line runs shorter`);
        assert.equal(first.radius, '4px');
      }

      const tree = await page.locator('main').ariaSnapshot();
      assert.equal(tree.trim(), '- main:\n  - status: Loading messages', 'only the status reaches the accessibility tree');

      await page.emulateMedia({ reducedMotion: 'reduce' });
      const still = await style('box');
      assert.equal(still.animation, 'none', 'reduced motion stops the shimmer');
      assert.equal(still.image, 'none');
      assert.equal(still.width, 400, 'the shape stays');
    } finally {
      await browser.close();
    }
  });
}
