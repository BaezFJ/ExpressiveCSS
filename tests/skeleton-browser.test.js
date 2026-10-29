import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

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

for (const [name, engine, test] of engines) {
  test(`${name}: skeleton shimmers, stops under reduced motion and stays out of the accessibility tree`, { timeout: 30000 }, async (t) => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      const style = (id) => page.locator(`#${id}`).evaluate((el) => {
        const s = getComputedStyle(el);
        const shimmer = getComputedStyle(el, '::before');
        const r = el.getBoundingClientRect();
        return { animation: shimmer.animationName, direction: shimmer.animationDirection, image: shimmer.backgroundImage, radius: s.borderTopLeftRadius, width: r.width, height: r.height, border: s.borderTopWidth };
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

        const positions = await page.locator('#box').evaluate((el) => {
          const animation = el.getAnimations({ subtree: true })[0];
          animation.pause();
          return [375, 1125].map((time) => {
            animation.currentTime = time;
            return new DOMMatrix(getComputedStyle(el, '::before').transform).m41;
          });
        });
        assert.deepEqual(positions, dir === 'rtl' ? [250, -50] : [-50, 250], `${dir}: the half-width shimmer crosses the box`);
      }

      await page.locator('#box').evaluate((el) => {
        el.style.setProperty('--md-comp-skeleton-shimmer-color', 'rgba(240, 10, 20, 0.5)');
        el.style.setProperty('--md-comp-skeleton-shape', '22px');
      });
      assert.match((await style('box')).image, /240, 10, 20/);
      assert.equal((await style('box')).radius, '22px');

      const tree = await page.locator('main').ariaSnapshot();
      assert.equal(tree.trim(), '- main:\n  - status: Loading messages', 'only the status reaches the accessibility tree');

      await page.emulateMedia({ reducedMotion: 'reduce' });
      const still = await style('box');
      assert.equal(still.animation, 'none', 'reduced motion stops the shimmer');
      assert.equal(still.image, 'none');
      assert.equal(still.width, 400, 'the shape stays');

      await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'active' });
      const forced = await style('box');
      assert.equal(forced.animation, 'none');
      assert.equal(forced.image, 'none');
      assert.equal(forced.border, '1px', 'forced colors keep an outline');
      assert.equal(forced.width, 400);
    } finally {
      await browser.close();
    }
  });

  if (name === 'chromium') test('chromium: skeleton shimmer runs without steady-state repainting', { timeout: 30000 }, async () => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
      await page.setContent(`<style>${css}</style><style>.grid{display:grid;grid-template-columns:repeat(10,90px);gap:8px}.skeleton{height:80px}</style><div class="grid">${'<div class="skeleton"></div>'.repeat(100)}</div>`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      assert.equal(await page.locator('.grid').evaluate(el => el.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length), 100);
      const cdp = await page.context().newCDPSession(page);
      const events = [];
      cdp.on('Tracing.dataCollected', e => events.push(...e.value));
      const done = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve));
      await cdp.send('Tracing.start', { categories: 'devtools.timeline', transferMode: 'ReportEvents' });
      await page.waitForTimeout(500);
      await cdp.send('Tracing.end');
      await done;
      assert.ok(events.filter(e => e.name === 'Paint' && e.ph === 'X').length <= 4, 'the shimmer repainted after warming up');
    } finally {
      await browser.close();
    }
  });
}
