// Show more. Clicks and keys go through the real pointer and keyboard; the
// text heights come from layout, which jsdom does not have.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const long = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';

const html = `<style>${css}</style>
  <div id="box" style="width: 320px">
    <div class="show-more" id="cut">
      <p class="line-clamp-2" id="text" style="line-height: 24px">${long}</p>
      <button type="button" id="toggle">Show more</button>
    </div>
  </div>
  <script>${js}</script>`;

// Two frames let a resize reach the observer and its callback run.
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const height = (page, id) => page.evaluate((id) => document.getElementById(id).getBoundingClientRect().height, id);
const attr = (page, id, name) => page.evaluate(([id, name]) => document.getElementById(id).getAttribute(name), [id, name]);

async function open(browser) {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.setContent(html);
  await page.evaluate(() => Expressive.AutoInit());
  await settle(page);
  return page;
}

for (const [engine, browserType, browserTest] of engines) {
  browserTest(`${engine}: the button shows the full text and collapses it again`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await open(browser);
      assert.equal(await attr(page, 'toggle', 'aria-expanded'), 'false');
      assert.equal(await attr(page, 'toggle', 'aria-controls'), 'text');
      assert.equal(await height(page, 'text'), 48, 'the text starts at two lines');

      await page.click('#toggle');
      assert.equal(await attr(page, 'toggle', 'aria-expanded'), 'true');
      assert.ok((await height(page, 'text')) > 48, 'the full text shows');

      await page.keyboard.press('Enter');
      assert.equal(await attr(page, 'toggle', 'aria-expanded'), 'false');
      assert.equal(await height(page, 'text'), 48, 'the text is clamped again');
    } finally {
      await browser.close();
    }
  });
}
