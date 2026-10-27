import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const table = `<div class="data-table" data-sort data-page-size="2">
  <label>Records per page<select class="browser-default" data-table-page-size><option value="1">1</option><option value="2" selected>2</option><option value="4">4</option></select></label>
  <label>Search records<input type="search" data-table-filter value="absent"></label>
  <output data-table-filter-count role="status" aria-live="polite" aria-label="Matching records">87</output>
  <table><caption>Records</caption><thead><tr><th><label><input type="checkbox" aria-label="Select all"></label></th><th scope="col" data-filter><button type="button">Name</button></th></tr></thead><tbody>
    <tr id="r3"><td><label><input type="checkbox" aria-label="Select Birch"></label><button type="button" aria-expanded="true">Details</button></td><th scope="row">Birch</th></tr>
    <tr id="detail" class="data-table-detail"><td colspan="2">Birch details</td></tr>
    <tr id="private-detail" class="data-table-detail" hidden><td colspan="2">Private detail</td></tr>
    <tr id="r4"><td><fieldset disabled><label><input type="checkbox" aria-label="Select Delta"></label></fieldset></td><th scope="row">Delta</th></tr>
    <tr id="secret" hidden><td><label><input type="checkbox" checked aria-label="Select secret"></label></td><th scope="row">Secret</th></tr>
    <tr id="secret-detail" class="data-table-detail"><td colspan="2">Secret detail</td></tr>
    <tr id="css-hidden" style="display:none"><td><label><input type="checkbox" aria-label="Select CSS hidden"></label></td><th scope="row">CSS hidden</th></tr>
  </tbody></table>
  <nav class="pagination" aria-label="Record pages"><ol>
    <li><button type="button" data-table-page="previous">Previous</button></li>
    <li><output data-table-page-status role="status" aria-live="polite" aria-label="Pages"></output></li>
    <li><button type="button" data-table-page="next">Next</button></li>
  </ol></nav>
  <nav class="pagination" aria-label="Other pages"><ol><li><a href="#server-page-2">Server page 2</a></li></ol></nav></div>`;

for (const [engine, browserType, browserTest] of engines) {
  browserTest(`${engine}: server page requests preserve accepted records until a silent response`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>${table}<script>${js}</script></body></html>`);
      await page.evaluate(() => {
        const wrapper = document.querySelector('.data-table');
        wrapper.querySelector('[data-table-filter-count]').textContent = '87';
        Expressive.DataTables.setPage(wrapper, { page: 2, pageSize: 2, total: 7 });
        window.requests = [];
        wrapper.addEventListener('expressive:page', event => { window.requests.push(event.detail); event.preventDefault(); });
      });
      const status = page.getByRole('status', { name: 'Pages', exact: true });
      const next = page.getByRole('button', { name: 'Next', exact: true });
      const previous = page.getByRole('button', { name: 'Previous', exact: true });
      await expect(status).toHaveText('2 / 4');
      for (const id of ['r3', 'r4', 'detail']) await expect(page.locator(`#${id}`)).toBeVisible();
      for (const id of ['private-detail', 'secret', 'secret-detail', 'css-hidden']) await expect(page.locator(`#${id}`)).toBeHidden();
      await next.click();
      await expect(next).toBeFocused();
      await previous.press('Enter');
      await next.press('Space');
      assert.deepEqual(await page.evaluate(() => window.requests), [{ page: 3, pageSize: 2 }, { page: 1, pageSize: 2 }, { page: 3, pageSize: 2 }]);
      await expect(status).toHaveText('2 / 4');
      const select = page.getByRole('combobox', { name: 'Records per page', exact: true });
      if (await select.evaluate(el => getComputedStyle(el).appearance === 'base-select')) {
        await select.click();
        await page.getByRole('option', { name: '4', exact: true }).click();
      } else {
        const native = page.locator('select[data-table-page-size]');
        await native.evaluate(el => { el.size = 3; });
        await page.getByRole('option', { name: '4', exact: true }).click();
        await expect(native).toBeFocused();
        await native.evaluate(el => el.removeAttribute('size'));
      }
      assert.deepEqual(await page.evaluate(() => window.requests.slice(3)), [{ page: 2, pageSize: 4 }]);
      await expect(page.locator('.data-table')).toHaveAttribute('data-page-size', '2');
      await expect(status).toHaveText('2 / 4');
      await page.getByRole('checkbox', { name: 'Select all', exact: true }).check();
      await expect(page.locator('#r3 input')).toBeChecked();
      await expect(page.locator('#r4 input')).not.toBeChecked();
      await expect(page.locator('#secret input')).toBeChecked();
      await page.evaluate(() => Expressive.DataTables.setPage(document.querySelector('.data-table'), { page: 2, pageSize: 4, total: 7 }));
      await expect(status).toHaveText('2 / 2');
      await expect(next).toHaveAttribute('aria-disabled', 'true');
      await next.click({ force: true });
      assert.equal(await page.evaluate(() => window.requests.length), 4);
      for (const id of ['r3', 'r4', 'detail']) await expect(page.locator(`#${id}`)).toBeVisible();
      await expect(page.getByRole('status', { name: 'Matching records' })).toHaveText('87');
      await page.getByRole('link', { name: 'Server page 2' }).click();
      await expect(page).toHaveURL(/#server-page-2$/);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: shadow server pages handle FormSelect requests and application-owned records`, async () => {
    const browser = await leaseBrowser(browserType);
    let page;
    try {
      page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><body><div id="host"></div><script>${js}</script></body></html>`);
      await page.evaluate(({ css, table }) => {
        const root = document.querySelector('#host').attachShadow({ mode: 'open' });
        root.innerHTML = `<style>${css}</style>${table}`;
        const wrapper = root.querySelector('.data-table');
        wrapper.querySelector('[data-table-filter-count]').textContent = '87';
        const control = root.querySelector('[data-table-page-size]');
        control.classList.remove('browser-default');
        window.sizeSelect = Expressive.FormSelect.init(control, { menuOptions: { inDuration: 0, outDuration: 0 } });
        Expressive.DataTables.setPage(wrapper, { page: 2, pageSize: 2, total: 7 });
        window.requests = [];
        document.addEventListener('expressive:page', event => { window.requests.push(event.detail); event.preventDefault(); });
      }, { css, table });
      const status = page.getByRole('status', { name: 'Pages', exact: true });
      const control = page.getByRole('combobox', { name: 'Records per page', exact: true });
      await control.press('Enter');
      await page.getByRole('option', { name: '4', exact: true }).click();
      await expect(control).toBeFocused();
      assert.deepEqual(await page.evaluate(() => window.requests), [{ page: 2, pageSize: 4 }]);
      await expect(status).toHaveText('2 / 4');
      await page.getByRole('searchbox', { name: 'Search records' }).fill('Delta');
      await page.getByRole('button', { name: 'Name', exact: true }).click();
      await page.getByRole('button', { name: 'Name', exact: true }).press('Enter');
      await expect(page.locator('#r3')).toBeVisible();
      await expect(page.locator('#r4')).toBeVisible();
      await expect(status).toHaveText('2 / 4');
      await expect(page.getByRole('status', { name: 'Matching records' })).toHaveText('87');
      await page.evaluate(() => {
        const root = document.querySelector('#host').shadowRoot;
        const extra = root.querySelector('#r3').cloneNode(true);
        extra.id = 'r5';
        root.querySelector('tbody').append(extra);
        Expressive.DataTables.setPage(root.querySelector('.data-table'), { page: 3, pageSize: 1, total: 10 });
        Expressive.DataTables.sync(root.querySelector('.data-table'));
      });
      await expect(status).toHaveText('3 / 10');
      for (const id of ['r3', 'r4', 'r5']) await expect(page.locator(`#${id}`)).toBeVisible();
      assert.equal(await page.evaluate(() => window.requests.length), 1);
      await page.evaluate(() => {
        const root = document.querySelector('#host').shadowRoot;
        root.querySelector('[data-table-filter]').value = '';
        Expressive.DataTables.setPage(root.querySelector('.data-table'), null);
      });
      await expect(status).toHaveText('1 / 3');
      await expect(page.locator('#r3')).toBeVisible();
      await expect(page.locator('#r4')).toBeHidden();
    } finally {
      await page?.evaluate(() => window.sizeSelect?.destroy());
      await browser.close();
    }
  });
}
