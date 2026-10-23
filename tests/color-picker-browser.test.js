import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const markup = `<!doctype html><html lang="en" dir="rtl"><head><style>${css}</style></head><body style="padding: 80px">
<form id="form" onsubmit="window.submitted = true; return false">
  <div class="color-picker no-autoinit" id="picker" role="group" aria-label="Accent">
    <input type="color" name="accent" value="#ff0000" aria-label="Accent">
  </div>
</form>
<script>${js}</script>
<script>
  window.log = [];
  const input = document.querySelector('[name="accent"]');
  input.addEventListener('input', () => log.push('input ' + input.value));
  input.addEventListener('change', () => log.push('change ' + input.value));
  window.picker = Expressive.ColorPicker.init(document.getElementById('picker'), { onChange: (v) => log.push('onChange ' + v) });
</script></body></html>`;

for (const [name, engine, test] of engines) {
  test(`${name}: color picker drives the native input from the area, hue and hex field`, { timeout: 30000 }, async (t) => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(markup);
      const value = () => page.locator('[name="accent"]').inputValue();
      const area = page.getByRole('slider', { name: 'Saturation and brightness' });
      const hue = page.getByRole('slider', { name: 'Hue' });
      const hex = page.getByRole('textbox', { name: 'Hex color' });

      assert.equal(await page.getByRole('group', { name: 'Accent' }).count(), 1);
      assert.equal(await hue.inputValue(), '0');
      assert.equal(await hex.inputValue(), '#ff0000');
      assert.equal(await area.getAttribute('aria-valuetext'), 'Saturation 100%, brightness 100%');

      // Keyboard: Down lowers brightness by 1%, Shift+Left lowers saturation by 10%.
      await area.focus();
      await page.keyboard.press('ArrowDown');
      assert.equal(await value(), '#fc0000');
      await page.keyboard.press('Shift+ArrowLeft');
      assert.equal(await area.getAttribute('aria-valuetext'), 'Saturation 90%, brightness 99%');
      assert.deepEqual(await page.evaluate(() => log.slice(0, 3)), ['input #fc0000', 'change #fc0000', 'onChange #fc0000']);

      // Pointer: a press picks the point, and a drag past the edge clamps to
      // it. The area does not mirror in RTL: saturation still grows rightward.
      const box = await page.locator('.color-picker-area').boundingBox();
      await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2);
      await page.mouse.down();
      assert.equal(await area.getAttribute('aria-valuetext'), 'Saturation 25%, brightness 50%');
      await page.mouse.move(box.x + box.width + 40, box.y - 40, { steps: 4 });
      await page.mouse.up();
      assert.equal(await value(), '#ff0000', 'dragged past the top-right corner: full saturation and brightness');
      assert.equal(await page.evaluate(() => log.at(-1)), 'onChange #ff0000');

      // Hue: the native range moves the hue and keeps saturation and brightness.
      await hue.fill('120');
      assert.equal(await value(), '#00ff00');

      // Hex: Enter applies without submitting the form; an invalid value reverts.
      await hex.fill('#3366cc');
      await hex.press('Enter');
      assert.equal(await value(), '#3366cc');
      assert.equal(await page.evaluate(() => window.submitted), undefined);
      assert.equal(await hue.inputValue(), '220');
      await hex.fill('nope');
      await hex.press('Enter');
      assert.equal(await hex.inputValue(), '#3366cc');

      // The value property sets the color without firing events.
      const before = await page.evaluate(() => log.length);
      await page.evaluate(() => { picker.value = '#123456'; });
      assert.equal(await value(), '#123456');
      assert.equal(await hex.inputValue(), '#123456');
      assert.equal(await page.evaluate(() => log.length), before);

      // A change made through the native input updates the picker.
      await page.evaluate(() => {
        const input = document.querySelector('[name="accent"]');
        input.value = '#00ffff';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      assert.equal(await hue.inputValue(), '180');

      assert.deepEqual(await page.evaluate(() => [...new FormData(document.getElementById('form')).keys()]), ['accent']);

      await page.evaluate(() => picker.destroy());
      assert.equal(await page.locator('#picker > *').count(), 1, 'destroy leaves only the native input');
    } finally {
      await browser.close();
    }
  });
}
