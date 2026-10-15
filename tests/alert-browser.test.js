import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<main style="width:640px">
  <div id="full" class="alert">
    <span id="icon" class="material-symbols" aria-hidden="true">cloud_off</span>
    <h2 id="heading">You're offline</h2>
    <p id="text">Edits are saved on this device and sync when the connection returns. <a href="#help">Learn more</a></p>
    <div id="actions" class="alert-actions">
      <button class="button text" type="button">Retry sync</button>
    </div>
    <button id="close" class="icon-button" type="button" aria-label="Dismiss"><span class="material-symbols" aria-hidden="true">close</span></button>
  </div>
  <div id="plain" class="alert"><p id="plain-text">Your trial ends in 3 days.</p></div>
  <div id="critical" class="alert critical" role="alert"><p>Payment failed.</p></div>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: alert lays out icon, text, close and actions, and colors the critical tone`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
      await page.setContent(markup);
      const box = (selector) => page.locator(selector).evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
      });
      const style = (selector, property) => page.locator(selector).evaluate((el, p) => getComputedStyle(el)[p], property);

      const full = await box('#full');
      const icon = await box('#icon');
      const heading = await box('#heading');
      const text = await box('#text');
      const close = await box('#close');
      const actions = await box('#actions');
      assert.ok(icon.right <= heading.left, 'icon leads the text');
      assert.ok(Math.abs(icon.top - heading.top) < 6, 'icon sits beside the first line');
      assert.ok(text.top >= heading.bottom, 'text stacks under the heading');
      assert.ok(close.left >= heading.right, 'close button trails the text');
      assert.ok(close.top < heading.bottom, 'close button stays on the first row');
      assert.ok(actions.top >= text.bottom, 'actions sit under the text');
      const button = await box('#actions > button');
      assert.ok(Math.abs(button.right - text.right) < 1 || button.right > text.right, 'actions align to the end');
      assert.ok(button.right <= full.right, 'actions stay inside the alert');
      assert.equal(await style('#full', 'borderTopLeftRadius'), '16px');
      assert.equal(await style('#heading', 'fontSize'), '14px', 'heading is title-small');
      assert.equal(await style('#text a', 'textDecorationLine'), 'underline');

      const plain = await box('#plain');
      const plainText = await box('#plain-text');
      assert.ok(Math.abs(plainText.left - plain.left - 17) < 1, 'without an icon the text starts at the padding');

      const tone = await page.evaluate(() => {
        const probe = document.createElement('div');
        document.body.append(probe);
        const read = (v) => { probe.style.color = `var(${v})`; return getComputedStyle(probe).color; };
        return {
          secondary: read('--md-sys-color-secondary-container'),
          error: read('--md-sys-color-error-container'),
          onError: read('--md-sys-color-on-error-container'),
        };
      });
      assert.equal(await style('#full', 'backgroundColor'), tone.secondary);
      assert.equal(await style('#critical', 'backgroundColor'), tone.error);
      assert.equal(await style('#critical', 'color'), tone.onError);
      assert.equal(await page.getByRole('alert').count(), 1, 'only the authored role is exposed');

      await page.setViewportSize({ width: 320, height: 900 });
      await page.locator('main').evaluate((el) => { el.style.width = '280px'; });
      const narrow = await box('#full');
      const narrowButton = await box('#actions > button');
      const narrowClose = await box('#close');
      assert.ok(narrowButton.right <= narrow.right && narrowClose.right <= narrow.right + 12, 'narrow alerts keep their controls inside');
    } finally {
      await browser.close();
    }
  });
}
