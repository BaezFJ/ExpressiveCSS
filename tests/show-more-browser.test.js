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
      <p class="line-clamp-2" style="font-size: 15.5px; line-height: 1.37">Two words</p>
      <button type="button" id="fraction">Show more</button>
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
      // Firefox reports this 21.23px box as 22 tall in scrollHeight and 21 in clientHeight.
      assert.equal(await hidden('fraction'), true, 'a fractional line height that fits hides its button');
      assert.equal(await tabbed(), 'toggle', 'Tab reaches the shown button');
      await page.focus('#before');

      await page.evaluate(() => (document.getElementById('box').style.width = '2400px'));
      await settle(page);
      assert.equal(await hidden('toggle'), true, 'widened until the text fits');
      assert.equal(await tabbed(), 'after', 'every text fits at this width, so Tab skips all three buttons');

      // Text opened at 320px, then widened until it fits clamped. Collapsing it
      // leaves the box the same size, so no resize reports it, and the button
      // hides once focus moves on.
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

      // A resize while the button has focus keeps it, so focus does not drop
      // on the page.
      await page.focus('#toggle');
      await page.evaluate(() => (document.getElementById('box').style.width = '2400px'));
      await settle(page);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'toggle', 'focus stays on the button');
      assert.equal(await hidden('toggle'), false, 'a resize does not hide the focused button');
      await page.keyboard.press('Tab');
      assert.equal(await hidden('toggle'), true, 'it hides on blur');
      await page.evaluate(() => (document.getElementById('box').style.width = '320px'));
      await settle(page);

      assert.equal(await hidden('wide'), false, 'line-clamp-2 cuts the text below Expanded');
      await page.setViewportSize({ width: 1000, height: 600 });
      await settle(page);
      assert.equal(await hidden('wide'), true, 'expanded:line-clamp-none shows all of it from Expanded up');
    } finally {
      await browser.close();
    }
  });
}

const font = readFileSync(new URL('../dist/fonts/roboto-latin-400.woff2', import.meta.url));
// Monospace fallback cuts this text at two lines and Roboto fits it in two,
// while the clamped box stays 48px either way, so no resize reports the swap.
// WebKit paints nothing, and runs no animation frame, until a page shows
// enough text, so a plain paragraph comes first.
const fontText = 'aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii jjjj kkkk llll mmmm nnnn oooo pppp';
const fontHtml = `<!doctype html><html lang="en"><head><style>${css}
  @font-face { font-family: ShowMoreProbe; src: url(/font.woff2) format('woff2'); font-display: swap; }
  .show-more p { width: 320px; line-height: 24px; font-family: ShowMoreProbe, monospace; }
  </style></head><body>
  <p>${long}</p>
  <div class="show-more"><p class="line-clamp-2">${fontText}</p><button type="button" id="live">Show more</button></div>
  <div class="show-more"><p class="line-clamp-2">${fontText}</p><button type="button" id="gone">Show more</button></div>
  <script>${js}</script></body></html>`;

for (const [engine, browserType, browserTest] of engines) {
  browserTest(`${engine}: a web font that swaps in hides the button once its text fits`, async () => {
    const browser = await leaseBrowser(browserType);
    let release;
    const held = new Promise((resolve) => (release = resolve));
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.route('http://show-more.test/**', async (route) => {
        if (!route.request().url().endsWith('/font.woff2')) return route.fulfill({ body: fontHtml, contentType: 'text/html' });
        await held;
        return route.fulfill({ body: font, contentType: 'font/woff2' });
      });
      // WebKit's load event waits for the font, which the route holds back.
      await page.goto('http://show-more.test/', { waitUntil: 'domcontentloaded' });
      await settle(page);
      assert.equal(await page.evaluate(() => document.fonts.status), 'loading', 'the font is still loading at init');
      await page.evaluate(() => Expressive.AutoInit());
      await settle(page);
      const hidden = (id) => page.evaluate((id) => document.getElementById(id).hasAttribute('hidden'), id);
      assert.equal(await hidden('live'), false, 'the fallback font cuts the text');
      await page.evaluate(() => Expressive.ShowMore.getInstance(document.getElementById('gone').parentElement).destroy());

      release();
      await page.waitForFunction(() => document.fonts.status === 'loaded');
      await settle(page);
      assert.equal(await hidden('live'), true, 'the web font fits the text, so the button hides');
      assert.equal(await hidden('gone'), false, 'a destroyed instance leaves its button alone');
    } finally {
      // A failed check before the release must not leave the route waiting.
      release();
      await browser.close();
    }
  });
}
