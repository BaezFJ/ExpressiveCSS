// Data tables with real input: a click on the select-all box and a key press
// on a sort button, after the page loaded with one row already checked.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const html = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
  <div class="data-table" data-sort>
    <table>
      <thead><tr>
        <th scope="col"><label><input type="checkbox" aria-label="Select all"></label></th>
        <th scope="col"><button type="button">Customer</button></th>
        <th scope="col" class="numeric"><button type="button">Total</button></th>
      </tr></thead>
      <tbody>
        <tr><td><label><input type="checkbox" checked aria-label="Select Alvin"></label></td><th scope="row">Alvin</th><td class="numeric">$87.00</td></tr>
        <tr><td><label><input type="checkbox" aria-label="Select Alan"></label></td><th scope="row">Alan</th><td class="numeric">$3.76</td></tr>
        <tr><td><label><input type="checkbox" aria-label="Select Jonathan"></label></td><th scope="row">Jonathan</th><td class="numeric">$142.50</td></tr>
      </tbody>
    </table>
  </div>
  <script>${js}</script></body></html>`;

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: data table select-all and sorting work from a click and a key`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      const all = page.getByRole('checkbox', { name: 'Select all' });
      assert.equal(await all.evaluate((box) => box.indeterminate), true, 'a row checked in the markup shows mixed');

      await all.click();
      assert.deepEqual(await page.locator('tbody input').evaluateAll((boxes) => boxes.map((box) => box.checked)), [true, true, true]);
      assert.equal(await all.evaluate((box) => [box.checked, box.indeterminate].join()), 'true,false');

      await page.getByRole('button', { name: 'Total' }).focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      assert.deepEqual(await page.locator('tbody th').allTextContents(), ['Jonathan', 'Alvin', 'Alan']);
      assert.equal(await page.locator('th:has(> button:text("Total"))').getAttribute('aria-sort'), 'descending');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: select-all works inside a shadow root`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate(() => {
        const host = document.createElement('div');
        document.body.append(host);
        const root = host.attachShadow({ mode: 'open' });
        root.innerHTML = document.querySelector('.data-table').outerHTML;
        root.querySelectorAll('tbody input').forEach((box) => (box.checked = false));
        host.id = 'host';
        window.selected = null;
        document.addEventListener('expressive:change', (e) => (window.selected = e.detail.selected.length));
      });
      await page.locator('#host').getByRole('checkbox', { name: 'Select all' }).click();
      const result = await page.evaluate(() => [
        [...document.getElementById('host').shadowRoot.querySelectorAll('tbody input')].map((box) => box.checked),
        window.selected,
      ]);
      assert.deepEqual(result, [[true, true, true], 3]);
    } finally {
      await browser.close();
    }
  });
}
