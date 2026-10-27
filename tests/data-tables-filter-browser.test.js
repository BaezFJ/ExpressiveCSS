import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const table = `<div class="data-table" data-sort>
  <div class="field"><input id="query" type="search" data-table-filter><label for="query">Search customers</label></div>
  <output data-table-filter-count role="status" aria-live="polite" aria-label="Matching records"></output>
  <table><caption>Customers</caption><thead><tr>
    <th><label><input type="checkbox" aria-label="Select all"></label></th>
    <th data-filter><button type="button">Name</button></th><th>Status</th>
  </tr></thead><tbody>
    <tr id="alpha"><td><label><input type="checkbox" aria-label="Select Alpha"></label><button type="button" aria-label="Alpha details" aria-expanded="true">Details</button></td><th scope="row">Alpha</th><td>Ready</td></tr>
    <tr id="alpha-detail" class="data-table-detail"><td colspan="3">Alpha information</td></tr>
    <tr id="beta"><td><label><input type="checkbox" checked aria-label="Select Beta"></label></td><th scope="row">Beta</th><td>Ready</td></tr>
    <tr id="locked"><td><label><input type="checkbox" disabled aria-label="Select locked"></label></td><th scope="row">Alpha locked</th><td>Ready</td></tr>
    <tr id="secret" hidden><td><label><input type="checkbox" aria-label="Select secret"></label><button type="button" aria-expanded="true">Details</button></td><th scope="row">Alpha secret</th><td>Ready</td></tr>
    <tr id="secret-detail" class="data-table-detail"><td colspan="3">Secret information</td></tr>
    <tr id="css-hidden" style="display:none"><td><input type="checkbox" aria-label="Select CSS hidden"></td><th scope="row">Alpha CSS</th><td>Ready</td></tr>
  </tbody></table></div>`;

for (const [engine, browserType, browserTest] of engines) {
  browserTest(`${engine}: canceled table filtering preserves the view until server sync`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>${table}<script>${js}</script></body></html>`);
      const search = page.getByRole('searchbox', { name: 'Search customers' });
      const count = page.getByRole('status', { name: 'Matching records' });
      await search.fill('beta');
      await expect(count).toHaveText('1');
      await page.evaluate(() => {
        window.requests = [];
        window.cancelFilter = (e) => { e.preventDefault(); window.requests.push(e.detail); };
        document.addEventListener('expressive:filter', window.cancelFilter);
      });
      await search.fill(' MISSING ');
      await expect(page.locator('#alpha')).toBeHidden();
      await expect(page.locator('#beta')).toBeVisible();
      await expect(count).toHaveText('1');
      await expect(search).toBeFocused();
      await page.evaluate(async () => {
        await Promise.resolve();
        const body = document.querySelector('tbody');
        body.replaceWith(body.cloneNode(true));
        document.querySelector('[data-table-filter-count]').textContent = '87';
        Expressive.DataTables.sync(document.querySelector('.data-table'));
      });
      assert.deepEqual(await page.evaluate(() => window.requests), [{ query: 'MISSING' }]);
      await expect(count).toHaveText('87');
      await expect(page.locator('#alpha')).toBeVisible();
      await expect(page.locator('#alpha-detail')).toBeVisible();
      await expect(page.locator('#secret-detail')).toBeHidden();
      await expect(page.locator('#css-hidden')).toBeHidden();
      await expect(search).toBeFocused();
      await page.getByRole('checkbox', { name: 'Select all', exact: true }).check();
      assert.deepEqual(await page.locator('tbody input').evaluateAll((boxes) => boxes.map((box) => box.checked)), [true, true, false, false, false]);
      await page.evaluate(() => document.removeEventListener('expressive:filter', window.cancelFilter));
      await search.fill('beta');
      await expect(count).toHaveText('1');
      await expect(page.locator('#alpha')).toBeHidden();
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: server filter requests cross shadow roots and allow sync during dispatch`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><body><div id="host"></div><script>${js}</script></body></html>`);
      await page.evaluate(({ css, table }) => {
        const root = document.querySelector('#host').attachShadow({ mode: 'open' });
        root.innerHTML = `<style>${css}</style>${table}`;
        const wrapper = root.querySelector('.data-table');
        Expressive.DataTables.sync(wrapper);
        window.requests = [];
        document.addEventListener('expressive:filter', (e) => {
          e.preventDefault();
          window.requests.push({ detail: e.detail, flags: [e.bubbles, e.composed, e.cancelable], fromWrapper: e.composedPath()[0] === wrapper });
          const body = root.querySelector('tbody');
          body.replaceWith(body.cloneNode(true));
          root.querySelector('[data-table-filter-count]').textContent = '87';
          Expressive.DataTables.sync(wrapper);
        });
      }, { css, table });
      await page.getByRole('searchbox', { name: 'Search customers' }).fill(' Unmatched ');
      assert.deepEqual(await page.evaluate(() => window.requests), [{ detail: { query: 'Unmatched' }, flags: [true, true, true], fromWrapper: true }]);
      await expect(page.getByRole('status', { name: 'Matching records' })).toHaveText('87');
      await expect(page.locator('#alpha')).toBeVisible();
      await expect(page.locator('#alpha-detail')).toBeVisible();
      await expect(page.locator('#beta')).toBeVisible();
      await expect(page.locator('#secret-detail')).toBeHidden();
      await expect(page.getByRole('searchbox')).toBeFocused();
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: table filtering preserves detail visibility, focus and hidden selections`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>${table}<script>${js}</script></body></html>`);
      const search = page.getByRole('searchbox', { name: 'Search customers' });
      const count = page.getByRole('status', { name: 'Matching records' });
      await expect(count).toHaveText('3');
      await expect(page.locator('#secret-detail')).toBeHidden();
      await search.focus();
      await page.keyboard.type('ALPHA');
      await expect(count).toHaveText('2');
      await expect(search).toBeFocused();
      await expect(page.locator('#alpha-detail')).toBeVisible();
      await expect(page.locator('#beta')).toBeHidden();
      await expect(page.locator('#secret')).toBeHidden();
      await expect(page.locator('#css-hidden')).toBeHidden();
      await page.getByRole('checkbox', { name: 'Select all', exact: true }).check();
      assert.deepEqual(await page.locator('tbody input').evaluateAll((boxes) => boxes.map((box) => box.checked)), [true, true, false, false, false]);
      await search.fill('beta');
      await expect(page.locator('#alpha-detail')).toBeHidden();
      await expect(page.locator('#alpha button')).toHaveAttribute('aria-expanded', 'true');
      await search.fill('missing');
      await expect(count).toHaveText('0');
      await expect(page.locator('thead input')).not.toBeChecked();
      await search.fill('');
      await expect(count).toHaveText('3');
      await expect(page.locator('#alpha-detail')).toBeVisible();
      await expect(page.locator('#secret-detail')).toBeHidden();
      await page.getByRole('button', { name: 'Name', exact: true }).press('Enter');
      await expect(page.locator('#alpha + #alpha-detail')).toBeVisible();
      await expect(page.getByRole('table', { name: 'Customers' })).toBeVisible();
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: table filtering works with shadow-only styles and input events`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><body><div id="host"></div><script>${js}</script></body></html>`);
      await page.evaluate(({ css, table }) => {
        const root = document.querySelector('#host').attachShadow({ mode: 'open' });
        root.innerHTML = `<style>${css}</style>${table}`;
        Expressive.DataTables.sync(root.querySelector('.data-table'));
      }, { css, table });
      await page.getByRole('searchbox', { name: 'Search customers' }).fill('beta');
      await expect(page.getByRole('status', { name: 'Matching records' })).toHaveText('1');
      await expect(page.locator('#beta')).toBeVisible();
      await expect(page.locator('#alpha')).toBeHidden();
      await expect(page.getByRole('searchbox')).toBeFocused();
      await page.getByRole('checkbox', { name: 'Select all', exact: true }).uncheck();
      assert.deepEqual(await page.locator('tbody input').evaluateAll((boxes) => boxes.map((box) => box.checked)), [false, false, false, false, false]);
    } finally {
      await browser.close();
    }
  });
}
