import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { leaseBrowser } from './browser.js';

// The x-expressive directive documented on the Auto Init page, run against
// real Alpine: elements Alpine renders later get an instance, x-model stays in
// sync both ways, and Alpine's cleanup destroys the instance.
const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const alpine = readFileSync(new URL('../node_modules/alpinejs/dist/cdn.min.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<main x-data="{ show: true, letter: 'b' }">
  <template x-if="show">
    <div class="field">
      <select id="letter" class="no-autoinit" x-model="letter" x-expressive:formselect
        x-effect="letter; $nextTick(() => $el.Expressive_FormSelect?.refresh())">
        <option value="a">Alpha</option>
        <option value="b">Beta</option>
      </select>
      <label for="letter">Letter</label>
    </div>
  </template>
  <output id="value" x-text="letter"></output>
  <button id="toggle" type="button" @click="show = !show">Toggle</button>
  <button id="pick-a" type="button" @click="letter = 'a'">Pick Alpha</button>
  <button id="pick-b" type="button" @click="letter = 'b'">Pick Beta</button>
</main>
<script>${js}</script>
<script>
  document.addEventListener('alpine:init', () => {
    Alpine.directive('expressive', (el, { value, expression }, { evaluate, cleanup }) => {
      const name = Object.keys(Expressive).find((key) => key.toLowerCase() === value);
      const instance = Expressive[name].init(el, expression ? evaluate(expression) : {});
      cleanup(() => instance.destroy());
    });
  });
</script>
<script>${alpine}</script>
</body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: an Alpine directive starts, syncs and destroys a Select inside x-if`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.setContent(markup);

      const shown = () => page.locator('.field input').inputValue();
      const value = () => page.locator('#value').textContent();
      await page.waitForFunction(() => document.getElementById('letter')?.Expressive_FormSelect);

      assert.equal(await page.evaluate(() => {
        const keys = Object.keys(Expressive).map((key) => key.toLowerCase());
        return new Set(keys).size === keys.length;
      }), true, 'export names stay unique when lowercased');
      assert.equal(await shown(), 'Beta', 'the field shows the initial x-model value');

      await page.locator('.field input').click();
      await page.getByRole('option', { name: 'Alpha' }).click();
      assert.equal(await value(), 'a', 'picking an option updates x-model');

      await page.locator('#pick-b').click();
      await page.waitForFunction(() => document.querySelector('.field input').value === 'Beta');

      await page.evaluate(() => { window.removedSelect = document.getElementById('letter'); });
      await page.locator('#toggle').click();
      await page.waitForFunction(() => !document.querySelector('.field'));
      assert.equal(await page.evaluate(() => window.removedSelect.Expressive_FormSelect), undefined, 'Alpine cleanup destroyed the instance');

      await page.locator('#pick-a').click();
      await page.locator('#toggle').click();
      await page.waitForFunction(() => document.getElementById('letter')?.Expressive_FormSelect);
      assert.equal(await shown(), 'Alpha', 'a re-rendered Select starts from the current x-model value');
      assert.equal(await page.locator('.field').count(), 1);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
}
