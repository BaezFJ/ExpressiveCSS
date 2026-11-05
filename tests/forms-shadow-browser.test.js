// A form in a shadow root: submit and reset do not reach the document, so a
// revealed password has to be covered from the form itself.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines } from './browser.js';

const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

for (const [name, engine, test] of engines) {
  test(`${name}: a password revealed in a shadow root is hidden again on submit and on reset`, { timeout: 30000 }, async () => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><body><div id="host"></div><script>${js}</script></body></html>`);
      const state = () => page.evaluate(() => {
        const input = host.shadowRoot.querySelector('input');
        return [input.type, host.shadowRoot.querySelector('.password-toggle').getAttribute('aria-pressed')];
      });
      const reveal = () => page.evaluate(() => host.shadowRoot.querySelector('.password-toggle').click());
      await page.evaluate(() => {
        document.getElementById('host').attachShadow({ mode: 'open' }).innerHTML = `<form onsubmit="return false">
          <div class="field"><input type="password" aria-label="Password" value="secret">
            <button type="button" class="password-toggle" aria-label="Show password" aria-pressed="false"></button></div>
        </form>`;
      });
      await reveal();
      assert.deepEqual(await state(), ['text', 'true']);
      await page.evaluate(() => host.shadowRoot.querySelector('form').requestSubmit());
      assert.deepEqual(await state(), ['password', 'false'], 'submit hides it');

      await reveal();
      assert.deepEqual(await state(), ['text', 'true']);
      await page.evaluate(() => host.shadowRoot.querySelector('form').reset());
      assert.deepEqual(await state(), ['password', 'false'], 'reset hides it');
    } finally {
      await browser.close();
    }
  });
}
