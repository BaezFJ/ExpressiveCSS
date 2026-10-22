import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
for (const [name, engine, test] of engines) {
  test(`${name}: a color input is a round swatch of its color with a 48px target`, { timeout: 30000 }, async (t) => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ deviceScaleFactor: 1 });
      await page.setContent(`<!doctype html><html lang="en" theme="light"><head><style>${css}</style></head><body style="background:#fff;padding:20px">
        <label for="c">Accent</label> <input id="c" type="color" value="#ff0000">
        <div class="field"><input id="in-field" type="color" value="#00ff00" aria-label="Field color"></div>
        <script>${js}</script></body></html>`);
      const box = await page.locator('#c').boundingBox();
      assert.deepEqual([Math.round(box.width), Math.round(box.height)], [48, 48], '40px swatch with 4px padding');
      assert.equal(await page.locator('#c').evaluate((el) => getComputedStyle(el).borderTopLeftRadius), '50%');
      const png = (await import('playwright-core/lib/utilsBundle')).default.PNG.sync.read(await page.locator('#c').screenshot());
      const center = [...png.data.subarray(((24 * png.width) + 24) * 4, ((24 * png.width) + 24) * 4 + 3)];
      assert.ok(center[0] > 200 && center[1] < 60 && center[2] < 60, `the swatch shows the value: ${center}`);
      const field = await page.locator('#in-field').boundingBox();
      assert.equal(Math.round(field.height), 48, 'a field does not give the swatch the 56dp text well');
      // WebKit's default tab order skips color inputs, so the ring is checked where Tab reaches it.
      if (name !== 'webkit') {
        await page.keyboard.press('Tab');
        assert.notEqual(await page.locator('#c').evaluate((el) => getComputedStyle(el).outlineStyle), 'none', 'keyboard focus draws the ring');
      }
    } finally {
      await browser.close();
    }
  });
}
