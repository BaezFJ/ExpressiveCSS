import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const field = (id, attrs = '') => `<div class="field" style="width: 280px">
  <input id="${id}" type="number" placeholder=" " ${attrs}><label for="${id}">Quantity</label>
  <button type="button" class="icon-button suffix" data-step="down" aria-label="Decrease"><span class="material-symbols" aria-hidden="true">remove</span></button>
  <button type="button" class="icon-button suffix" data-step="up" aria-label="Increase"><span class="material-symbols" aria-hidden="true">add</span></button>
</div>`;

for (const [name, engine, test] of engines) {
  test(`${name}: number stepper buttons step within min, max and step and fire input and change`, { timeout: 30000 }, async (t) => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>
        ${field('qty', 'value="1" min="0" max="2"')}
        ${field('locked', 'value="5" readonly')}
        <div dir="rtl">${field('rtl', 'value="0" step="5"')}</div>
        <script>${js}</script>
        <script>window.log = []; for (const t of ['input', 'change']) document.addEventListener(t, (e) => log.push(t + ' ' + e.target.id + ' ' + e.target.value));</script>
      </body></html>`);
      const qty = page.locator('#qty');
      const button = (id, label) => page.locator(`#${id} ~ [aria-label="${label}"]`);

      await button('qty', 'Increase').click();
      assert.equal(await qty.inputValue(), '2');
      await button('qty', 'Increase').click();
      assert.equal(await qty.inputValue(), '2', 'max holds');
      await button('qty', 'Decrease').click();
      await button('qty', 'Decrease').click();
      await button('qty', 'Decrease').click();
      assert.equal(await qty.inputValue(), '0', 'min holds');
      assert.deepEqual((await page.evaluate(() => log)).slice(0, 2), ['input qty 2', 'change qty 2']);

      await button('locked', 'Increase').click();
      assert.equal(await page.locator('#locked').inputValue(), '5', 'read-only is left alone');

      await button('rtl', 'Increase').click();
      assert.equal(await page.locator('#rtl').inputValue(), '5', 'steps by step');

      // Down sits before up, mirrored in RTL, and the label clears both.
      const x = async (id, label) => (await button(id, label).boundingBox()).x;
      assert.ok(await x('qty', 'Decrease') < await x('qty', 'Increase'));
      assert.ok(await x('rtl', 'Decrease') > await x('rtl', 'Increase'));
      const padding = await qty.evaluate((el) => getComputedStyle(el).paddingRight);
      assert.equal(padding, '96px');
    } finally {
      await browser.close();
    }
  });
}
