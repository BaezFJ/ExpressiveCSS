// Real focus and layout for Tabs: a tablist is one Tab stop whose arrow keys
// select, and an overflowing bar scrolls the selected tab into view without
// scrolling the page.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;
const engines = Object.entries({ chromium, firefox, webkit }).filter(([n]) => !requested || requested === n);

const tabs = (count) => Array.from({ length: count }, (_, i) =>
  `<a role="tab" id="t${i}" href="#p${i}" aria-controls="p${i}">Destination ${i}</a>`).join('');
const panels = (count) => Array.from({ length: count }, (_, i) =>
  `<div id="p${i}" role="tabpanel" aria-labelledby="t${i}">Panel ${i}</div>`).join('');

for (const [name, engine] of engines) {
  test(`${name}: a tablist is one Tab stop, and its arrows select while the bar scrolls the tab into view`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body style="height: 3000px">
        <button id="before">Before</button>
        <div class="tabs" role="tablist" aria-label="Destinations">${tabs(10)}</div>${panels(10)}
        <button id="after">After</button>
        <script>${js}</script></body></html>`);
      await page.evaluate(() => Expressive.Tabs.init(document.querySelector('.tabs')));
      const bar = page.locator('.tabs');
      assert.ok(await bar.evaluate((el) => el.scrollWidth > el.clientWidth), 'the bar overflows at 360px');

      await page.locator('#before').focus();
      await page.keyboard.press('Tab');
      await expect(page, '#t0');
      await page.keyboard.press('Tab');
      await expect(page, '#after', 'one Tab stop for the whole strip');
      await page.keyboard.press('Shift+Tab');
      await expect(page, '#t0');

      await page.keyboard.press('End');
      await expect(page, '#t9');
      assert.equal(await page.locator('#t9').getAttribute('aria-selected'), 'true');
      assert.equal(await page.locator('#p9').isVisible(), true);
      // The scroll is smooth unless motion is reduced; wait for it to land.
      await page.waitForFunction(() => {
        const bar = document.querySelector('.tabs').getBoundingClientRect();
        const tab = document.getElementById('t9').getBoundingClientRect();
        return tab.right <= bar.right + 1 && tab.left >= bar.left - 1;
      });
      assert.equal(await page.evaluate(() => window.scrollY), 0, 'only the bar scrolled');
    } finally {
      await browser.close();
    }
  });
}

for (const [name, engine] of engines) {
  test(`${name}: a tablist whose first tab is hidden is still entered by Tab`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>
        <button id="before">Before</button>
        <div class="tabs" role="tablist" aria-label="Destinations">${tabs(3)}</div>${panels(3)}
        <script>${js}</script></body></html>`);
      await page.evaluate(() => {
        document.getElementById('t0').style.display = 'none';
        Expressive.Tabs.init(document.querySelector('.tabs'));
      });
      await page.locator('#before').focus();
      await page.keyboard.press('Tab');
      await expect(page, '#t1');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await expect(page, '#t1', 'the arrows wrap past the hidden tab');
    } finally {
      await browser.close();
    }
  });
}

for (const [name, engine] of engines) {
  test(`${name}: a tablist set up in a closed dialog is entered by Tab once the dialog opens`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>
        <dialog><button id="before">Before</button>
          <div class="tabs" role="tablist" aria-label="Destinations">${tabs(3)}</div>${panels(3)}</dialog>
        <script>${js}</script></body></html>`);
      await page.evaluate(() => {
        document.getElementById('t0').style.display = 'none';
        Expressive.Tabs.init(document.querySelector('.tabs'));
        document.querySelector('dialog').showModal();
      });
      await page.locator('#before').focus();
      await page.keyboard.press('Tab');
      await expect(page, '#t1', 'the Tab stop moved off the hidden tab when the dialog opened');
    } finally {
      await browser.close();
    }
  });
}

/** Waits until focus is on `selector`. */
async function expect(page, selector, message = `focus on ${selector}`) {
  await page.waitForFunction((s) => document.activeElement?.matches(s), selector, { timeout: 2000 })
    .catch(() => assert.fail(message));
}
