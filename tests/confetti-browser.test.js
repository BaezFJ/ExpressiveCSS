import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body style="margin:0">
<main style="padding:100px">
  <button type="button" class="filled confetti" id="trigger">Celebrate</button>
  <div id="box" style="position:relative;width:300px;height:200px">
    <canvas class="confetti" id="auto" aria-hidden="true"></canvas>
  </div>
  <div style="position:relative;width:300px;height:200px">
    <canvas class="confetti" id="manual" aria-hidden="true"></canvas>
  </div>
  <dialog id="dialog"><button type="button" class="confetti" id="in-dialog">Done</button></dialog>
</main>
</body></html>`;

// Pieces that stay where they start: no speed, gravity or drift.
const still = { startVelocity: 0, gravity: 0, drift: 0, spread: 0 };

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: confetti bursts from its trigger in theme colors, on its own canvas, above a modal dialog and not under reduced motion`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      await page.setContent(markup);
      await page.addScriptTag({ content: js });
      await page.evaluate((still) => {
        window.Expressive.AutoInit(document.body, { Confetti: { ...still, particleCount: 1, shapes: ['square'], ticks: 60 } });
        window.Expressive.Confetti.getInstance(document.getElementById('manual')).destroy();
        window.Expressive.Confetti.init(document.getElementById('manual'), { manualStart: true });
      }, still);

      // The painted pixels of a canvas, in CSS pixels, with the first opaque
      // color. Waits up to ten frames, since a fluttering piece can be edge-on.
      const painted = (selector) => page.evaluate((selector) => new Promise((resolve) => {
        let frames = 0;
        const read = () => {
        const canvas = document.querySelector(selector);
        if (!canvas) return resolve(null);
        const { width, height } = canvas;
        const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
        const scale = width / canvas.clientWidth;
        let box = null;
        let color = null;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 200) continue;
          const x = (i / 4) % width / scale;
          const y = Math.floor(i / 4 / width) / scale;
          color ??= [data[i], data[i + 1], data[i + 2]];
          box = box ? { left: Math.min(box.left, x), right: Math.max(box.right, x), top: Math.min(box.top, y), bottom: Math.max(box.bottom, y) } : { left: x, right: x, top: y, bottom: y };
        }
        if (!box && ++frames < 10) return requestAnimationFrame(read);
        resolve({ box, color, rect: canvas.getBoundingClientRect().toJSON() });
        };
        requestAnimationFrame(read);
      }), selector);
      // A CSS color as the RGB a canvas paints it.
      const rgb = (color) => page.evaluate((color) => {
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      }, color);
      const near = (a, b, tolerance = 3) => a.every((v, i) => Math.abs(v - b[i]) <= tolerance);

      const auto = await painted('#auto');
      assert.ok(auto.box, 'a canvas bursts once at init');
      const center = { x: auto.rect.width / 2, y: auto.rect.height / 2 };
      assert.ok(Math.abs((auto.box.left + auto.box.right) / 2 - center.x) < 20 && Math.abs((auto.box.top + auto.box.bottom) / 2 - center.y) < 20, 'the canvas burst starts at its center');
      assert.equal((await painted('#manual')).box, null, 'manualStart waits for fire()');
      await page.evaluate((still) => { window.Expressive.Confetti.getInstance(document.getElementById('manual')).fire(still); }, still);
      assert.ok((await painted('#manual')).box, 'fire() bursts on a manual canvas');

      await page.locator('#trigger').click();
      const overlay = await page.locator('canvas.confetti-overlay').evaluate((c) => ({
        hidden: c.getAttribute('aria-hidden'),
        pointer: getComputedStyle(c).pointerEvents,
        open: c.matches(':popover-open'),
        rect: c.getBoundingClientRect().toJSON()
      }));
      assert.equal(overlay.hidden, 'true', 'the overlay is hidden from assistive technology');
      assert.equal(overlay.pointer, 'none', 'clicks pass through the overlay');
      assert.ok(overlay.open, 'the overlay is in the top layer');
      assert.deepEqual([overlay.rect.width, overlay.rect.height], [800, 700], 'the overlay covers the viewport');
      const burst = await painted('canvas.confetti-overlay');
      const button = await page.locator('#trigger').boundingBox();
      assert.ok(Math.abs((burst.box.left + burst.box.right) / 2 - (button.x + button.width / 2)) < 20 && Math.abs((burst.box.top + burst.box.bottom) / 2 - (button.y + button.height / 2)) < 20, 'a trigger bursts from its center');
      const primary = await page.evaluate(() => {
        const probe = document.createElement('span');
        document.body.append(probe);
        probe.style.color = 'var(--md-sys-color-primary)';
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      });
      assert.ok(near(burst.color, await rgb(primary)), `the first piece is the theme primary color, got ${burst.color}`);

      await page.locator('canvas.confetti-overlay').waitFor({ state: 'detached' });
      assert.equal(await page.evaluate(() => window.Expressive.Confetti.fire({ ticks: 10 }).then(() => document.querySelector('canvas.confetti-overlay'))), null, 'fire() resolves once the overlay is gone');

      await page.evaluate(() => document.getElementById('dialog').showModal());
      await page.locator('#in-dialog').click();
      assert.ok(await page.locator('canvas.confetti-overlay').evaluate((c) => c.matches(':popover-open')), 'a burst from a modal dialog opens the overlay over it');
      assert.ok((await painted('canvas.confetti-overlay')).box, 'the overlay draws while a modal dialog is open');
      await page.evaluate(() => document.getElementById('dialog').close());
      await page.locator('canvas.confetti-overlay').waitFor({ state: 'detached' });

      await page.evaluate(() => window.Expressive.Confetti.getInstance(document.getElementById('trigger')).destroy());
      await page.locator('#trigger').click();
      assert.equal(await page.locator('canvas.confetti-overlay').count(), 0, 'destroy() removes the click handler');

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('#in-dialog').evaluate((b) => b.click());
      assert.equal(await page.locator('canvas.confetti-overlay').count(), 0, 'reduced motion draws nothing');
      await page.evaluate(() => window.Expressive.Confetti.fire());
    } finally {
      await browser.close();
    }
  });
}
