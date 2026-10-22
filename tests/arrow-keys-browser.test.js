import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const tabs = (id, dir = 'ltr') => `<div dir="${dir}"><nav class="tabs" id="${id}" aria-label="${id}">
  <a class="active" aria-current="page" href="#${id}-1">One</a><a href="#${id}-2">Two</a>
  <a href="#${id}-3" class="disabled" aria-disabled="true">Three</a><a href="#${id}-4">Four</a></nav>
  <div id="${id}-1">1</div><div id="${id}-2">2</div><div id="${id}-3">3</div><div id="${id}-4">4</div></div>`;

const html = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
  ${tabs('ltr')}
  ${tabs('rtl', 'rtl')}
  <ul class="list" id="rows">
    <li><a href="#!">Inbox</a></li>
    <li><button type="button">Starred</button></li>
    <li><button type="button" disabled>Snoozed</button></li>
    <li><a href="#!">Sent</a></li>
  </ul>
  <ul class="list" id="mixed">
    <li><a href="#!">Edit</a> <button type="button">Delete</button></li>
    <li><a href="#!">Share</a> <button type="button">Copy</button></li>
  </ul>
  <script>${js}</script></body></html>`;

const focused = (page) => page.evaluate(() => document.activeElement.textContent.trim());

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: arrow keys move focus between tabs and between list rows`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      // Tabs: Right moves on, skips the disabled tab and wraps; Home and End go to the ends.
      await page.focus('#ltr a');
      const ltr = [];
      for (const key of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowLeft', 'End', 'Home']) {
        await page.keyboard.press(key);
        ltr.push(await focused(page));
      }
      assert.deepEqual(ltr, ['Two', 'Four', 'One', 'Four', 'Four', 'One']);
      // Moving focus does not choose a tab; Enter does, as a link.
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.getAttribute('#ltr a:nth-child(2)', 'aria-current'), null);
      await page.keyboard.press('Enter');
      assert.equal(await page.getAttribute('#ltr a:nth-child(2)', 'aria-current'), 'page');

      // In RTL the arrows still move the way they point: Left is the next tab.
      await page.focus('#rtl a');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await focused(page), 'Two');

      // A modified arrow belongs to the browser.
      await page.focus('#ltr a');
      const prevented = await page.evaluate(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true, cancelable: true });
        document.activeElement.dispatchEvent(event);
        return event.defaultPrevented;
      });
      assert.equal(prevented, false);

      // Lists of single-control rows: Up and Down skip disabled rows and stop at the ends.
      await page.focus('#rows a');
      const rows = [];
      for (const key of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowUp', 'End', 'Home', 'ArrowUp']) {
        await page.keyboard.press(key);
        rows.push(await focused(page));
      }
      assert.deepEqual(rows, ['Starred', 'Sent', 'Sent', 'Starred', 'Sent', 'Inbox', 'Inbox']);

      // Rows holding several controls keep native keys.
      await page.focus('#mixed a');
      await page.keyboard.press('ArrowDown');
      assert.equal(await focused(page), 'Edit');
    } finally {
      await browser.close();
    }
  });
}
