// Currency input. Typing goes through the real keyboard. A paste is
// `insertText`, the one-step insertion of a whole string that a paste
// performs, because clipboard access needs permissions only Chromium grants.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const field = (id, currency, extra = '') => `<div class="field">
      <input id="${id}" name="${id}" type="text" inputmode="decimal" placeholder=" " data-currency="${currency}" ${extra}>
      <label for="${id}">${id}</label>
    </div>`;

const html = `<style>${css}</style>
  <form id="form" lang="de">
    ${field('amount', 'EUR')}
    <button type="submit">Send</button>
  </form>
  <script>${js}</script>
  <script>
    document.getElementById('form').addEventListener('submit', (event) => {
      event.preventDefault();
      window.submitted = new FormData(event.target).get('amount');
    });
  </script>`;

/** Opens the fixture and returns the page and a reader for a field's state. */
async function open(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent(html);
  await page.evaluate(() => Expressive.AutoInit());
  const state = (id = 'amount') =>
    page.evaluate((id) => {
      const field = document.getElementById(id);
      return { value: field.value, start: field.selectionStart, end: field.selectionEnd };
    }, id);
  return { page, state };
}

/** Runs `body` with a fresh page in each engine, then closes the browser. */
function each(name, body) {
  for (const [engine, browserType, browserTest] of engines) {
    browserTest(`${engine}: ${name}`, async () => {
      const browser = await leaseBrowser(browserType);
      try {
        await body(await open(browser), engine);
      } finally {
        await browser.close();
      }
    });
  }
}

each('a typed amount shows in the locale and currency after blur, and the form gets the number', async ({ page, state }) => {
  await page.click('#amount');
  await page.keyboard.type('1234.5');
  await page.keyboard.press('Tab');
  assert.equal((await state()).value, '1.234,50\u00a0€');

  const read = await page.evaluate(() => {
    const form = document.getElementById('form');
    form.requestSubmit();
    return { formData: new FormData(form).get('amount'), submitted: window.submitted };
  });
  assert.deepEqual(read, { formData: '1234.5', submitted: '1234.5' });
});
