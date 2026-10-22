import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

const html = `<style>${css}</style>
  <button id="round">Round</button>
  <button id="square" class="square">Square</button>
  <button id="medium" class="square medium">Medium</button>
  <button id="large" class="square large">Large</button>
  <button id="toggle-off" aria-pressed="false">Off</button>
  <button id="toggle-on" aria-pressed="true">On</button>
  <button id="square-on" class="square" aria-pressed="true">Square on</button>
  <button id="outlined-on" class="outlined" aria-pressed="true">Outlined on</button>
  <button id="text-on" class="text" aria-pressed="true">Text</button>
  <button id="disabled-on" aria-pressed="true" disabled>Disabled</button>
  <button id="press">Press</button>
  <div class="button-group"><button id="grouped" aria-pressed="true">Grouped</button></div>
  <div class="timepicker-container"><button id="am" class="am-btn filled" aria-pressed="true">AM</button></div>
  <div id="colors" style="color: var(--md-sys-color-surface-container); background: var(--md-sys-color-primary); border-color: var(--md-sys-color-inverse-surface)"></div>`;

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: common buttons take a square shape, toggle shape and colour, and morph when pressed`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      const radius = (id) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
      const style = (id) => page.locator(`#${id}`).evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.backgroundColor, s.color, s.borderTopColor];
      });
      const [surface, primary, inverse] = await page.locator('#colors').evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.color, s.backgroundColor, s.borderTopColor];
      });

      const full = await radius('round');
      assert.ok(parseFloat(full) > 100, `a button is round: ${full}`);
      assert.deepEqual([await radius('square'), await radius('medium'), await radius('large')], ['12px', '16px', '28px'], 'square takes the size\'s corner');
      assert.equal(await radius('toggle-on'), '12px', 'a selected round toggle goes square');
      assert.equal(await radius('toggle-off'), full);
      assert.equal(await radius('square-on'), full, 'a selected square toggle goes round');

      // Unselected filled is surface-container; selected is primary.
      assert.equal((await style('toggle-off'))[0], surface);
      assert.equal((await style('toggle-on'))[0], primary);
      const outlined = await style('outlined-on');
      assert.equal(outlined[0], inverse, 'a selected outlined toggle fills with inverse-surface');
      assert.equal(outlined[2], 'rgba(0, 0, 0, 0)', 'and drops its outline');
      assert.equal((await style('text-on'))[0], 'rgba(0, 0, 0, 0)', 'text buttons do not toggle');
      assert.notEqual((await style('disabled-on'))[0], primary, 'a disabled toggle takes the disabled colours');

      // Pressed, the corners morph to the size's pressed corner.
      await page.locator('#press').hover();
      await page.mouse.down();
      assert.equal(await radius('press'), '8px');
      await page.mouse.up();
      assert.equal(await radius('press'), full);

      // Buttons in fixed slots keep their own shape and colours.
      const untouched = await page.evaluate(() => ['grouped', 'am'].map((id) => {
        const s = getComputedStyle(document.getElementById(id));
        return [s.getPropertyValue('--_shape'), s.getPropertyValue('--_toggle-container')].join('');
      }));
      assert.deepEqual(untouched, ['', ''], 'group items and the time picker\'s AM and PM keep their own shape and colours');
    } finally {
      await browser.close();
    }
  });
}
