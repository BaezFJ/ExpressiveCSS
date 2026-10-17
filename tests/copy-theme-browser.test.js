import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = `<!doctype html><html lang="en" theme="dark"><head><style>${css}</style></head><body>
<input id="key" value="sk-123" readonly>
<pre id="snippet">
  npm install @expressivecss/expressive
</pre>
<button id="copy-key" class="icon-button" type="button" data-copy-for="key" aria-label="Copy API key"><span class="material-symbols" aria-hidden="true">content_copy</span></button>
<button id="copy-snippet" class="button text" type="button" data-copy-for="snippet" data-copy-message="Command copied">Copy</button>
<button id="copy-literal" class="button text" type="button" data-copy="https://example.com/share/42" data-copy-error="Copy failed">Share link</button>
<button id="copy-missing" class="button text" type="button" data-copy-for="nothing">Broken</button>
<button id="copy-disabled" class="button text" type="button" data-copy="no" disabled>Disabled</button>
<button id="copy-aria-disabled" class="button text" type="button" data-copy="no" aria-disabled="true">Unavailable</button>

<div class="button-group">
  <button id="light" class="button" type="button" data-theme-set="light">Light</button>
  <button id="dark" class="button" type="button" data-theme-set="dark">Dark</button>
  <button id="auto" class="button" type="button" data-theme-set="auto">Auto</button>
  <button id="bogus" class="button" type="button" data-theme-set="sepia">Sepia</button>
  <button id="locked" class="button" type="button" data-theme-set="dark" aria-disabled="true">Dark (locked)</button>
</div>
<menu role="menu"><li id="menu-light" role="menuitemradio" data-theme-set="light" tabindex="-1">Light</li></menu>
<script>${js}</script>
</body></html>`;

// A secure origin rather than setContent: init scripts run on navigation, and
// localStorage needs a real origin.
const open = async (page) => {
  await page.route('https://expressive.test/', (route) => route.fulfill({ contentType: 'text/html', body: markup }));
  await page.goto('https://expressive.test/');
};

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: copy buttons write the clipboard and confirm with a snackbar`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage();
      await page.addInitScript(() => {
        window.__copied = [];
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: async (text) => { if (window.__fail) throw new Error('denied'); window.__copied.push(text); } },
        });
      });
      await open(page);
      const status = page.getByRole('status');

      await page.click('#copy-key');
      await assert.doesNotReject(status.filter({ hasText: 'Copied' }).waitFor());
      await page.click('#copy-snippet');
      await assert.doesNotReject(status.filter({ hasText: 'Command copied' }).waitFor());
      await page.click('#copy-literal');
      await page.click('#copy-missing');
      await page.click('#copy-disabled', { force: true });
      await page.click('#copy-aria-disabled', { force: true });
      assert.deepEqual(await page.evaluate(() => window.__copied), [
        'sk-123',
        'npm install @expressivecss/expressive',
        'https://example.com/share/42',
      ], 'field value, trimmed text and literal text; missing targets and disabled buttons copy nothing');

      await page.evaluate(() => { window.__fail = true; });
      await page.click('#copy-literal');
      await assert.doesNotReject(status.filter({ hasText: 'Copy failed' }).waitFor());
      assert.equal(await status.count(), 1, 'one snackbar at a time');
    } finally {
      await browser.close();
    }
  });

  test(`${name}: theme controls write the theme, save it and mark the current choice`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage();
      await open(page);
      const state = () => page.evaluate(() => ({
        theme: document.documentElement.getAttribute('theme'),
        stored: localStorage.getItem('theme'),
        pressed: ['light', 'dark', 'auto'].map((id) => document.getElementById(id).getAttribute('aria-pressed')),
        checked: document.getElementById('menu-light').getAttribute('aria-checked'),
        scheme: getComputedStyle(document.body).colorScheme,
      }));

      let s = await state();
      assert.equal(s.theme, 'dark');
      assert.equal(s.stored, null, 'Init does not write storage');
      assert.deepEqual(s.pressed, ['false', 'true', 'false'], 'Init marks the current theme');
      assert.equal(s.checked, 'false', 'menu item radios use aria-checked');

      await page.click('#light');
      s = await state();
      assert.deepEqual([s.theme, s.stored, s.pressed, s.checked], ['light', 'light', ['true', 'false', 'false'], 'true']);
      assert.match(s.scheme, /^light/);

      await page.click('#bogus');
      assert.equal((await state()).theme, 'light', 'unknown values are ignored');
      await page.click('#locked', { force: true });
      assert.equal((await state()).theme, 'light', 'aria-disabled controls are ignored');

      await page.click('#auto');
      s = await state();
      assert.deepEqual([s.theme, s.stored, s.pressed], ['auto', 'auto', ['false', 'false', 'true']]);

      await page.evaluate(() => {
        const late = document.createElement('button');
        late.id = 'late';
        late.dataset.themeSet = 'auto';
        document.body.append(late);
        Expressive.Theme.sync();
      });
      assert.equal(await page.getAttribute('#late', 'aria-pressed'), 'true', 'sync marks controls rendered later');
      assert.equal(await page.evaluate(() => Expressive.Theme.get()), 'auto');
    } finally {
      await browser.close();
    }
  });
}
