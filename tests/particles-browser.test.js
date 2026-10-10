import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body style="margin:0">
<div id="box" style="position:relative;width:400px;height:400px;margin:100px">
  <canvas class="particles no-autoinit" id="particles" aria-hidden="true"></canvas>
</div>
</body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: particles fill their box in the theme color, follow the pointer, drift, refit on resize and stay still under reduced motion`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      await page.setContent(markup);
      await page.addScriptTag({ content: js });
      // One particle at the canvas center, with no drift of its own and a
      // magnetism of 2.1, so `staticity: 2.1` and `ease: 1` put it on the
      // pointer at once.
      const start = (options) => page.evaluate((options) => {
        const random = Math.random;
        Math.random = () => 0.5;
        try {
          window.Expressive.Particles.init(document.getElementById('particles'), { quantity: 1, ...options });
        } finally {
          Math.random = random;
        }
      }, options);
      const instance = () => page.evaluate(() => !!window.Expressive.Particles.getInstance(document.getElementById('particles')));
      // The painted pixels of the canvas in CSS pixels, with the color of the
      // most opaque one, after the given number of frames.
      const painted = (frames = 30) => page.evaluate((frames) => new Promise((resolve) => {
        const read = () => {
          if (--frames > 0) return requestAnimationFrame(read);
          const canvas = document.getElementById('particles');
          const { width, height } = canvas;
          const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
          const scale = width / canvas.clientWidth;
          let box = null;
          let best = 0;
          let color = null;
          for (let i = 0; i < data.length; i += 4) {
            if (!data[i + 3]) continue;
            const x = (i / 4) % width / scale;
            const y = Math.floor(i / 4 / width) / scale;
            if (data[i + 3] > best) { best = data[i + 3]; color = [data[i], data[i + 1], data[i + 2]]; }
            box = box ? { left: Math.min(box.left, x), right: Math.max(box.right, x), top: Math.min(box.top, y), bottom: Math.max(box.bottom, y) } : { left: x, right: x, top: y, bottom: y };
          }
          resolve({ box, color, alpha: best, rect: canvas.getBoundingClientRect().toJSON() });
        };
        requestAnimationFrame(read);
      }), frames);
      const center = (box) => ({ x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 });
      const near = (a, b, tolerance) => Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;

      await start({ staticity: 2.1, ease: 1 });
      const first = await painted();
      assert.deepEqual([first.rect.width, first.rect.height], [400, 400], 'the canvas covers its positioned ancestor');
      assert.ok(first.box, 'the particle fades in');
      assert.ok(near(center(first.box), { x: 200, y: 200 }, 2), `the particle starts where it was placed, got ${JSON.stringify(center(first.box))}`);
      const onSurface = await page.evaluate(() => {
        const probe = document.createElement('span');
        document.body.append(probe);
        probe.style.color = 'var(--md-sys-color-on-surface)';
        const color = getComputedStyle(probe).color;
        probe.remove();
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      });
      assert.ok(first.color.every((v, i) => Math.abs(v - onSurface[i]) <= 8), `the particle is the theme on-surface color, got ${first.color}`);

      await page.mouse.move(100 + 260, 100 + 150);
      assert.ok(near(center((await painted(5)).box), { x: 260, y: 150 }, 2), 'the particle follows the pointer inside the canvas');
      await page.mouse.move(700, 650);
      assert.ok(near(center((await painted(5)).box), { x: 260, y: 150 }, 2), 'a pointer outside the canvas leaves the particle in place');

      await page.evaluate(() => window.Expressive.Particles.getInstance(document.getElementById('particles')).destroy());
      assert.equal((await painted(5)).box, null, 'destroy() clears the canvas');
      assert.equal(await instance(), false);

      await start({ vx: 1, color: 'rgb(255, 0, 0)' });
      const drifted = await painted(40);
      assert.ok(center(drifted.box).x > 220, `vx drifts the particle right, got ${JSON.stringify(center(drifted.box))}`);
      assert.deepEqual(drifted.color, [255, 0, 0], 'the color option overrides the theme color');
      // Scrolled out of view, the loop stops painting; back in view, it resumes.
      const paints = (frames) => page.evaluate((frames) => new Promise((resolve) => {
        const ctx = document.getElementById('particles').getContext('2d');
        let count = 0;
        const clear = ctx.clearRect;
        ctx.clearRect = function (...args) { count++; return clear.apply(this, args); };
        const read = () => {
          if (--frames > 0) return requestAnimationFrame(read);
          delete ctx.clearRect;
          resolve(count);
        };
        requestAnimationFrame(read);
      }), frames);
      await page.locator('#box').evaluate((box) => { box.style.marginTop = '2000px'; });
      await painted(5);
      assert.equal(await paints(20), 0, 'an offscreen canvas keeps painting');
      await page.locator('#box').evaluate((box) => { box.style.marginTop = ''; });
      await painted(5);
      assert.ok(await paints(20) > 0, 'the canvas does not resume painting when back in view');
      await page.locator('#box').evaluate((box) => { box.style.width = '300px'; });
      await painted(3);
      assert.deepEqual(await page.locator('#particles').evaluate((c) => [c.width / devicePixelRatio, c.clientWidth]), [300, 300], 'the pixel buffer follows a resize');
      await page.evaluate(() => window.Expressive.Particles.getInstance(document.getElementById('particles')).destroy());

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await start({ vx: 1, staticity: 2.1, ease: 1 });
      const still = await painted(2);
      assert.ok(still.box, 'reduced motion still draws the particles');
      await page.mouse.move(100 + 50, 100 + 50);
      assert.deepEqual((await painted(20)).box, still.box, 'reduced motion keeps the particles still');
      await page.evaluate(() => window.Expressive.Particles.getInstance(document.getElementById('particles')).destroy());
    } finally {
      await browser.close();
    }
  });
}
