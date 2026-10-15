import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;
const engines = Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name);
const svg = (fill) => `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect width='400' height='200' fill='${fill}'/%3E%3C/svg%3E`;
const compare = (id, dir, value = 50) => `<div dir="${dir}" style="width:400px"><div id="${id}" class="image-compare">
  <img src="${svg('red')}" alt="Before: red" width="400" height="200"><img src="${svg('blue')}" alt="After: blue" width="400" height="200">
  <input type="range" min="0" max="100" value="${value}" aria-label="Compare before and after">
</div></div>`;
const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body style="margin:0">
${compare('ltr', 'ltr', 25)}${compare('rtl', 'rtl')}<script>${js}</script></body></html>`;

for (const [name, engine] of engines) {
  test(`${name}: image compare reveals the second image up to the range's value`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 500, height: 500 }, deviceScaleFactor: 1 });
      await page.setContent(markup);
      await page.waitForFunction(() => [...document.images].every((img) => img.complete));
      const utils = (await import('playwright-core/lib/utilsBundle')).default;
      const colorAt = async (id, x) => {
        const png = utils.PNG.sync.read(await page.locator(`#${id}`).screenshot());
        const i = (40 * png.width + x) * 4;
        return png.data[i] > 200 && png.data[i + 2] < 60 ? 'red' : png.data[i + 2] > 200 && png.data[i] < 60 ? 'blue' : 'other';
      };
      assert.equal(await page.locator('#ltr').evaluate((el) => el.style.getPropertyValue('--md-comp-image-compare-position')), '25%', 'the initial value is applied on load');
      assert.deepEqual([await colorAt('ltr', 50), await colorAt('ltr', 200)], ['red', 'blue'], 'before shows left of the divider, after right of it');

      const range = page.locator('#ltr input');
      await range.focus();
      for (let i = 0; i < 50; i++) await page.keyboard.press('ArrowRight');
      assert.equal(await range.inputValue(), '75');
      assert.deepEqual([await colorAt('ltr', 200), await colorAt('ltr', 340)], ['red', 'blue'], 'the arrow keys move the divider');
      const handle = await page.locator('#ltr').evaluate((el) => getComputedStyle(el, '::after').outlineStyle);
      assert.notEqual(handle, 'none', 'keyboard focus rings the handle');

      assert.deepEqual([await colorAt('rtl', 50), await colorAt('rtl', 350)], ['blue', 'red'], 'in RTL the before image starts at the right');
      assert.equal(await page.getByRole('slider', { name: 'Compare before and after' }).count(), 2, 'each is a named native slider');
      assert.equal(await range.evaluate((el) => el.Expressive_Slider), undefined, 'Slider leaves the range alone');
    } finally {
      await browser.close();
    }
  });
}
