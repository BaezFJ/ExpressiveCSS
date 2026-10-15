import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: meter paints its track and colors the fill by region`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 400 }, deviceScaleFactor: 1 });
      await page.setContent(`<!doctype html><html lang="en" theme="light"><head><style>${css}</style></head><body>
        <div style="width:200px">
          <meter id="good" min="0" max="100" low="40" high="80" optimum="10" value="20">20%</meter>
          <meter id="fair" min="0" max="100" low="40" high="80" optimum="10" value="60">60%</meter>
          <meter id="poor" min="0" max="100" low="40" high="80" optimum="10" value="90">90%</meter>
        </div></body></html>`);
      const colors = await page.evaluate(() => {
        const probe = document.createElement('div');
        document.body.append(probe);
        const ctx = document.createElement('canvas').getContext('2d');
        // Computed colors can be oklch(); a canvas pixel gives sRGB bytes in every engine.
        const read = (v) => {
          probe.style.color = `var(${v})`;
          ctx.fillStyle = getComputedStyle(probe).color;
          ctx.fillRect(0, 0, 1, 1);
          return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
        };
        return {
          primary: read('--md-sys-color-primary'),
          tertiary: read('--md-sys-color-tertiary'),
          error: read('--md-sys-color-error'),
          track: read('--md-sys-color-secondary-container'),
        };
      });
      const sample = async (id) => {
        const locator = page.locator(`#${id}`);
        const r = await locator.boundingBox();
        assert.equal(Math.round(r.height), 8, `${id} is 8px thick`);
        assert.equal(Math.round(r.width), 200, `${id} fills its container`);
        const png = (await import('playwright-core/lib/utilsBundle')).default.PNG.sync.read(await locator.screenshot());
        const y = Math.floor(png.height / 2);
        const at = (x) => [...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 3)];
        const edge = [...png.data.subarray((1 * png.width + 8) * 4, (1 * png.width + 8) * 4 + 3)];
        return { fill: at(8), edge, track: at(png.width - 8) };
      };
      const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 3);
      for (const [id, role] of [['good', 'primary'], ['fair', 'tertiary'], ['poor', 'error']]) {
        const { fill, edge, track } = await sample(id);
        assert.ok(near(fill, colors[role]), `${id} fill is ${role}: ${fill} vs ${colors[role]}`);
        assert.ok(near(edge, colors[role]), `${id} fill spans the bar's full height: ${edge} vs ${colors[role]}`);
        if (id !== 'poor') assert.ok(near(track, colors.track), `${id} track is secondary-container: ${track} vs ${colors.track}`);
      }
      assert.equal(await page.getByRole('meter').count(), 3, 'meters keep their role');
      if (name === 'chromium') {
        await page.emulateMedia({ forcedColors: 'active' });
        const { fill, track } = await sample('good');
        assert.ok(!near(fill, track), `forced colors keep the fill distinct from the track: ${fill} vs ${track}`);
      }
    } finally {
      await browser.close();
    }
  });
}
