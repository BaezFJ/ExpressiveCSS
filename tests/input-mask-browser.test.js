// Input mask. Typing goes through the real keyboard. A paste is
// `insertText`, the one-step insertion of a whole string that a paste
// performs, because clipboard access needs permissions only Chromium grants.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const html = `<style>${css}</style>
  <form id="form">
    <div class="field">
      <input id="phone" name="phone" type="tel" inputmode="numeric" placeholder=" " data-mask="(000) 000-0000">
      <label for="phone">Phone</label>
    </div>
  </form>
  <script>${js}</script>
  <script>
    document.getElementById('form').addEventListener('submit', (event) => {
      event.preventDefault();
      window.submitted = new FormData(event.target).get('phone');
    });
  </script>`;

/** Opens the fixture and returns the page and a reader for the field's state. */
async function open(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent(html);
  await page.evaluate(() => Expressive.AutoInit());
  const state = () =>
    page.evaluate(() => {
      const field = document.getElementById('phone');
      return { value: field.value, start: field.selectionStart, end: field.selectionEnd };
    });
  return { page, state };
}

for (const [engine, browserType, browserTest] of engines) {
  browserTest(`${engine}: typed and pasted digits take the mask's pattern, and the form submits it`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, state } = await open(browser);
      await page.click('#phone');
      await page.keyboard.type('5551');
      assert.deepEqual(await state(), { value: '(555) 1', start: 7, end: 7 });
      await page.keyboard.type('234567');
      assert.deepEqual(await state(), { value: '(555) 123-4567', start: 14, end: 14 });

      await page.fill('#phone', '');
      await page.keyboard.insertText('555.123.4567');
      assert.deepEqual(await state(), { value: '(555) 123-4567', start: 14, end: 14 });

      const read = await page.evaluate(() => {
        const form = document.getElementById('form');
        form.requestSubmit();
        return { formData: new FormData(form).get('phone'), submitted: window.submitted };
      });
      assert.deepEqual(read, { formData: '(555) 123-4567', submitted: '(555) 123-4567' });
    } finally {
      await browser.close();
    }
  });
}
