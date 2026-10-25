// Show more. Clicks and keys go through the real pointer and keyboard; the
// text heights come from layout, which jsdom does not have.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const long = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';

const html = `<style>${css}</style>
  <button type="button" id="before">Before</button>
  <div id="box" style="width: 320px">
    <div class="show-more" id="cut">
      <p class="line-clamp-2" id="text" style="line-height: 24px">${long}</p>
      <button type="button" id="toggle">Show more</button>
    </div>
    <div class="show-more">
      <p class="line-clamp-2" style="line-height: 24px">Short.</p>
      <button type="button" id="short">Show more</button>
    </div>
    <div class="show-more">
      <p class="line-clamp-2 expanded:line-clamp-none" style="line-height: 24px">${long}</p>
      <button type="button" id="wide">Show more</button>
    </div>
  </div>
  <button type="button" id="after">After</button>
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

for (const [engine, browserType, browserTest] of engines) {
  browserTest(`${engine}: the button hides while the clamped text fits`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await open(browser);
      const hidden = (id) => page.evaluate((id) => document.getElementById(id).hidden, id);
      /** Where Tab from the button before the fixtures lands. */
      const tabbed = async () => {
        await page.focus('#before');
        await page.keyboard.press('Tab');
        return page.evaluate(() => document.activeElement.id);
      };
      assert.equal(await hidden('toggle'), false, 'cut text keeps its button');
      assert.equal(await hidden('short'), true, 'text that fits hides its button');
      assert.equal(await tabbed(), 'toggle', 'Tab reaches the shown button');
      await page.focus('#before');

      await page.evaluate(() => (document.getElementById('box').style.width = '2400px'));
      await settle(page);
      assert.equal(await hidden('toggle'), true, 'widened until the text fits');
      assert.equal(await tabbed(), 'after', 'every text fits at this width, so Tab skips all three buttons');

      // Text opened at 320px, then widened until it fits clamped: collapsing it
      // keeps the focused button, which hides once focus moves on.
      await page.evaluate(() => (document.getElementById('box').style.width = '320px'));
      await settle(page);
      await page.click('#toggle');
      await page.evaluate(() => (document.getElementById('box').style.width = '2400px'));
      await settle(page);
      await page.keyboard.press('Enter');
      await settle(page);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'toggle', 'focus stays on the button');
      assert.equal(await hidden('toggle'), false, 'the focused button stays');
      await page.keyboard.press('Tab');
      assert.equal(await hidden('toggle'), true, 'it hides on blur');

      await page.evaluate(() => (document.getElementById('box').style.width = '320px'));
      await settle(page);
      assert.equal(await hidden('toggle'), false, 'narrowed until the text is cut');

      assert.equal(await hidden('wide'), false, 'line-clamp-2 cuts the text below Expanded');
      await page.setViewportSize({ width: 1000, height: 600 });
      await settle(page);
      assert.equal(await hidden('wide'), true, 'expanded:line-clamp-none shows all of it from Expanded up');
    } finally {
      await browser.close();
    }
  });
}
