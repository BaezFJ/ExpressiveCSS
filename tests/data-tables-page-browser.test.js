import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const table = `<div class="data-table" data-sort data-page-size="2">
  <label>Search records<input type="search" data-table-filter></label>
  <output data-table-filter-count role="status" aria-live="polite" aria-label="Matching records"></output>
  <table><caption>Records</caption><thead><tr><th><label><input type="checkbox" aria-label="Select all"></label></th><th scope="col" data-filter><button type="button">Name</button></th></tr></thead><tbody>
    ${['Cedar', 'Amber', 'Birch', 'Delta', 'Elm', 'Fir', 'Grove'].map((name, i) => `<tr id="r${i + 1}"><td><fieldset ${i === 3 ? 'disabled' : ''}><label><input type="checkbox" aria-label="Select ${name}" ${i === 4 ? 'checked' : ''}></label></fieldset><button type="button" aria-label="${name} details" aria-expanded="true">Details</button></td><th scope="row">${name}</th></tr>${i === 0 ? '<tr id="detail" class="data-table-detail"><td colspan="2">Cedar details</td></tr><tr id="more-detail" class="data-table-detail" hidden><td colspan="2">Private detail</td></tr>' : ''}`).join('')}
    <tr id="secret" hidden><td><label><input type="checkbox" checked aria-label="Select secret"></label><button type="button" aria-expanded="true">Details</button></td><th scope="row">Secret</th></tr>
    <tr id="secret-detail" class="data-table-detail"><td colspan="2">Secret detail</td></tr>
    <tr id="css-hidden" style="display:none"><td><label><input type="checkbox" aria-label="Select CSS hidden"></label></td><th scope="row">CSS hidden</th></tr>
  </tbody></table>
  <nav class="pagination" aria-label="Record pages"><ol>
    <li><button type="button" data-table-page="previous">Previous</button></li>
    <li><output data-table-page-status role="status" aria-live="polite" aria-label="Pages"></output></li>
    <li><button type="button" data-table-page="next">Next</button></li>
  </ol></nav>
  <nav class="pagination" aria-label="Server pages"><ol><li><a href="#server-page-2">Server page 2</a></li></ol></nav></div>`;

for (const [engine, browserType, browserTest] of engines) {
  browserTest(`${engine}: local table pages preserve selection, details and boundary focus`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>${table}<script>${js}</script></body></html>`);
      const status = page.getByRole('status', { name: 'Pages', exact: true });
      const next = page.getByRole('button', { name: 'Next', exact: true });
      const search = page.getByRole('searchbox', { name: 'Search records' });
      await expect(status).toHaveText('1 / 4');
      await expect(page.locator('#detail')).toBeVisible();
      await next.click();
      await expect(status).toHaveText('2 / 4');
      await expect(page.locator('#r3')).toBeVisible();
      await expect(page.locator('#detail')).toBeHidden();
      await page.getByRole('checkbox', { name: 'Select all', exact: true }).check();
      assert.deepEqual(await page.locator('tbody input').evaluateAll((boxes) => boxes.map((box) => box.checked)), [false, false, true, false, true, false, false, true, false]);
      await next.press('Enter');
      await expect(status).toHaveText('3 / 4');
      await next.press('Space');
      await expect(status).toHaveText('4 / 4');
      await expect(next).toBeFocused();
      await expect(next).toHaveAttribute('aria-disabled', 'true');
      await expect(page.locator('#r7')).toBeVisible();
      await next.press('Enter');
      await expect(status).toHaveText('4 / 4');
      await search.fill('Cedar');
      await expect(status).toHaveText('1 / 1');
      await expect(page.getByRole('status', { name: 'Matching records' })).toHaveText('1');
      await expect(page.locator('#detail')).toBeVisible();
      await expect(page.locator('#more-detail')).toBeHidden();
      await expect(page.locator('#secret-detail')).toBeHidden();
      await expect(search).toBeFocused();
      await search.fill('');
      await page.getByRole('button', { name: 'Name', exact: true }).press('Enter');
      await expect(page.locator('#r2')).toBeVisible();
      await expect(page.locator('#r3')).toBeVisible();
      await next.click();
      await expect(page.locator('#r1')).toBeVisible();
      await expect(page.locator('#r4')).toBeVisible();
      await page.getByRole('link', { name: 'Server page 2' }).click();
      await expect(page).toHaveURL(/#server-page-2$/);
      await expect(status).toHaveText('2 / 4');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: shadow table pages keep server-filter counts and silently clamp replacement rows`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><body><div id="host"></div><script>${js}</script></body></html>`);
      await page.evaluate(({ css, table }) => {
        const root = document.querySelector('#host').attachShadow({ mode: 'open' });
        root.innerHTML = `<style>${css}</style>${table}`;
        const wrapper = root.querySelector('.data-table');
        Expressive.DataTables.sync(wrapper);
        window.events = [];
        for (const type of ['change', 'sort']) wrapper.addEventListener(`expressive:${type}`, () => window.events.push(type));
        document.addEventListener('expressive:filter', (e) => {
          e.preventDefault();
          window.events.push(e.detail.query);
          root.querySelector('tbody').innerHTML = [1, 2, 3].map((id) => `<tr id="remote${id}"><td><label><input type="checkbox" aria-label="Select remote ${id}"></label></td><th scope="row">Remote ${id}</th></tr>`).join('');
          root.querySelector('[data-table-filter-count]').textContent = '87';
          Expressive.DataTables.sync(wrapper);
        });
      }, { css, table });
      const status = page.getByRole('status', { name: 'Pages', exact: true });
      await page.getByRole('button', { name: 'Next', exact: true }).press('Enter');
      await expect(status).toHaveText('2 / 4');
      await page.getByRole('searchbox', { name: 'Search records' }).fill('server');
      await expect(status).toHaveText('2 / 2');
      await expect(page.locator('#remote3')).toBeVisible();
      await expect(page.locator('#remote1')).toBeHidden();
      const previous = page.getByRole('button', { name: 'Previous', exact: true });
      await previous.press('Space');
      await expect(status).toHaveText('1 / 2');
      await expect(previous).toBeFocused();
      await expect(previous).toHaveAttribute('aria-disabled', 'true');
      await expect(page.getByRole('status', { name: 'Matching records' })).toHaveText('87');
      await page.evaluate(() => {
        const root = document.querySelector('#host').shadowRoot;
        root.querySelector('tbody').replaceChildren(root.querySelector('#remote3'));
        Expressive.DataTables.sync(root.querySelector('.data-table'));
      });
      await expect(status).toHaveText('1 / 1');
      await expect(page.locator('#remote3')).toBeVisible();
      assert.deepEqual(await page.evaluate(() => window.events), ['server']);
    } finally {
      await browser.close();
    }
  });
}
