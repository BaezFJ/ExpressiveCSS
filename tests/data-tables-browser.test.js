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

// Column resize: a .drag-handle button ending a header cell resizes its
// column. Fixture columns are wide enough that the table starts at the
// wrapper's width.
const handle = (name) => `<button type="button" class="drag-handle" aria-label="Resize ${name}"></button>`;
const resizeHtml = (dir = 'ltr') => `<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head><body>
  <div id="sorted" class="data-table" data-sort style="inline-size: 600px">
    <table>
      <thead><tr>
        <th scope="col" aria-sort="ascending"><button type="button">Customer</button>${handle('Customer')}</th>
        <th scope="col">Status${handle('Status')}</th>
        <th scope="col" class="numeric"><button type="button">Total</button>${handle('Total')}</th>
        <th scope="col">Notes</th>
      </tr></thead>
      <tbody>
        <tr><th scope="row">Alan</th><td>Pending</td><td class="numeric">$3.76</td><td>Gift</td></tr>
        <tr><th scope="row">Alvin</th><td>Shipped</td><td class="numeric">$87.00</td><td>None</td></tr>
      </tbody>
    </table>
  </div>
  <div id="pinned" class="data-table sticky-column" style="inline-size: 400px">
    <table>
      <thead><tr>
        <th scope="col"><label><input type="checkbox" aria-label="Select all"></label></th>
        <th scope="col">Account${handle('Account')}</th>
        ${'<th scope="col">Quarter figures</th>'.repeat(6)}
      </tr></thead>
      <tbody>
        <tr><td><label><input type="checkbox" aria-label="Select Acme"></label></td><th scope="row">Acme</th>${'<td>1,024,000</td>'.repeat(6)}</tr>
      </tbody>
    </table>
  </div>
  <div id="plain" class="data-table" style="inline-size: 600px">
    <table><thead><tr><th scope="col">Customer</th><th scope="col">Total</th></tr></thead>
      <tbody><tr><th scope="row">Alan</th><td>$3.76</td></tr></tbody></table>
  </div>
  <script>${js}</script></body></html>`;

/** Each header cell's width in a table, in pixels. */
const widths = (page, id) => page.locator(`#${id} thead th`).evaluateAll((cells) => cells.map((cell) => cell.getBoundingClientRect().width));

/** Records the resize and sort events the page fires. */
const listen = (page) => page.evaluate(() => {
  window.fired = [];
  for (const type of ['resize', 'sort']) {
    document.addEventListener(`expressive:${type}`, (e) => window.fired.push({ type, label: e.detail.header.textContent, column: e.detail.column, width: e.detail.width }));
  }
});

/** Drags a handle sideways by `dx` pixels with the mouse. */
async function drag(page, locator, dx) {
  const box = await locator.boundingBox();
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 5 });
  await page.mouse.up();
}

/** Asserts two widths agree within a pixel. */
function near(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) <= 1, `${message}: ${actual} vs ${expected}`);
}

/** Scrolls a wrapper to its far inline end. */
const scrollToEnd = (page, id) => page.locator(`#${id}`).evaluate((wrapper) => {
  wrapper.scrollLeft = getComputedStyle(wrapper).direction === 'rtl' ? -wrapper.scrollWidth : wrapper.scrollWidth;
});

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: dragging a column handle resizes that column and fires one event`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(resizeHtml());
      await listen(page);
      const before = await widths(page, 'sorted');
      await drag(page, page.getByRole('button', { name: 'Resize Status' }), 60);
      const after = await widths(page, 'sorted');
      near(after[1], before[1] + 60, 'Status follows the pointer');
      [0, 2, 3].forEach((i) => near(after[i], before[i], `column ${i} keeps its width`));
      const fired = await page.evaluate(() => window.fired);
      assert.equal(fired.length, 1, JSON.stringify(fired));
      assert.deepEqual([fired[0].type, fired[0].label, fired[0].column], ['resize', 'Status', 1]);
      near(fired[0].width, after[1], 'the event carries the new width');
      const overflow = await page.locator('#sorted').evaluate((wrapper) => wrapper.scrollWidth - wrapper.clientWidth);
      near(overflow, 60, 'the wider table scrolls inside its wrapper');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a column handle never sorts`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(resizeHtml());
      await listen(page);
      const customer = page.getByRole('button', { name: 'Resize Customer' });
      await customer.click();
      await drag(page, customer, 30);
      await customer.focus();
      await page.keyboard.press('Enter');
      assert.deepEqual(await page.locator('#sorted tbody th').allTextContents(), ['Alan', 'Alvin']);
      assert.equal(await page.locator('#sorted th[aria-sort]').count(), 1);
      assert.equal(await page.locator('#sorted thead th').first().getAttribute('aria-sort'), 'ascending');
      assert.equal((await page.evaluate(() => window.fired)).filter((each) => each.type === 'sort').length, 0);
      assert.equal(await customer.evaluate((button) => getComputedStyle(button, '::after').content), 'none', 'the handle draws no sort arrow');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: resizing a pinned column keeps the sticky-column offset`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(resizeHtml());
      await scrollToEnd(page, 'pinned');
      const before = await widths(page, 'pinned');
      await drag(page, page.getByRole('button', { name: 'Resize Account' }), 60);
      near((await widths(page, 'pinned'))[1], before[1] + 60, 'the pinned name column resizes');
      await scrollToEnd(page, 'pinned');
      const [wrapper, box, name] = await page.evaluate(() => {
        const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
        const outer = document.getElementById('pinned');
        return [rect('#pinned').left + outer.clientLeft, rect('#pinned thead th:first-child'), rect('#pinned thead th:nth-child(2)')];
      });
      near(box.left, wrapper, 'the checkbox cell stays pinned');
      near(name.left, box.right, 'the name cell stays right after it');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: setWidth clamps to the minimum and fires nothing; a table without handles is untouched`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(resizeHtml());
      await listen(page);
      const result = await page.evaluate(() => {
        const header = document.querySelector('#sorted thead th:nth-child(2)');
        Expressive.DataTables.setWidth(header, 30);
        const narrowest = Expressive.DataTables.width(header);
        Expressive.DataTables.setWidth(header, 200);
        return [narrowest, Expressive.DataTables.width(header), window.fired.length];
      });
      near(result[0], 48, 'setWidth stops at the minimum token');
      near(result[1], 200, 'setWidth sets the width');
      assert.equal(result[2], 0, 'setWidth fires no event');

      const handleStyle = await page.getByRole('button', { name: 'Resize Status' }).evaluate((button) => {
        const [own, cell] = [button.getBoundingClientRect(), button.parentElement.getBoundingClientRect()];
        return { cursor: getComputedStyle(button).cursor, gap: cell.right - own.right };
      });
      assert.equal(handleStyle.cursor, 'col-resize');
      near(handleStyle.gap, 0, 'the handle sits at the cell end edge');
      assert.deepEqual(await page.locator('#plain > table').evaluate((table) => [table.getAttribute('style'), getComputedStyle(table).tableLayout]), [null, 'auto']);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: arrow keys resize a column by 16px, 64px with Shift, one event per press`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(resizeHtml());
      await listen(page);
      const start = (await widths(page, 'sorted'))[1];
      await page.getByRole('button', { name: 'Resize Status' }).focus();
      await page.keyboard.press('ArrowRight');
      near((await widths(page, 'sorted'))[1], start + 16, 'ArrowRight widens');
      await page.keyboard.press('Shift+ArrowRight');
      near((await widths(page, 'sorted'))[1], start + 80, 'Shift+ArrowRight widens by 64');
      const fired = await page.evaluate(() => window.fired);
      assert.deepEqual(fired.map((each) => [each.type, each.label, each.column]), [['resize', 'Status', 1], ['resize', 'Status', 1]]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: in a right-to-left page, Left and a leftward drag widen a column`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(resizeHtml('rtl'));
      const status = page.getByRole('button', { name: 'Resize Status' });
      const start = (await widths(page, 'sorted'))[1];
      await status.focus();
      await page.keyboard.press('ArrowLeft');
      near((await widths(page, 'sorted'))[1], start + 16, 'ArrowLeft widens');
      await drag(page, status, -60);
      near((await widths(page, 'sorted'))[1], start + 76, 'a leftward drag widens');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: Home stops at the minimum, and clicks step through narrow, middle and wide`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(resizeHtml());
      await listen(page);
      const status = page.getByRole('button', { name: 'Resize Status' });
      const width = async () => (await widths(page, 'sorted'))[1];
      const count = () => page.evaluate(() => window.fired.length);
      await status.focus();
      await page.keyboard.press('Home');
      near(await width(), 48, 'Home goes to the minimum token');
      assert.notEqual(await status.evaluate((button) => getComputedStyle(button).outlineStyle), 'none', 'a focused handle shows a focus ring');
      await page.keyboard.press('ArrowLeft');
      near(await width(), 48, 'ArrowLeft stops at the minimum');
      assert.equal(await count(), 1, 'a key that changes nothing fires nothing');

      const wide = await page.locator('#sorted').evaluate((wrapper) => wrapper.clientWidth);
      await status.click();
      near(await width(), (48 + wide) / 2, 'a click steps to the middle');
      await status.click();
      near(await width(), wide, 'then to the widest, the wrapper inner width');
      await status.click();
      near(await width(), 48, 'then wraps to the narrowest');
      await page.keyboard.press('Space');
      near(await width(), (48 + wide) / 2, 'Space steps too');
      assert.equal(await count(), 5, 'each step fires one event');
    } finally {
      await browser.close();
    }
  });
}

// Column visibility: menu checkbox items with data-column hide and show the
// column whose first-row header cell they name.
const toggleItem = (id, label, checked = true) => `<li role="menuitemcheckbox" aria-checked="${checked}" data-column="${id}"><button type="button">${label}</button></li>`;
const visibilityHtml = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
  <div class="data-table-actions">
    <button type="button" class="button text menu-trigger no-autoinit" id="columns" data-target="column-menu">Columns</button>
  </div>
  <menu id="column-menu">${toggleItem('h-status', 'Status')}${toggleItem('h-region', 'Region')}${toggleItem('h-total', 'Total')}${toggleItem('h-owner', 'Owner', false)}</menu>
  <div id="accounts" class="data-table" data-sort style="inline-size: 700px">
    <table>
      <thead><tr>
        <th scope="col"><label><input type="checkbox" aria-label="Select all"></label></th>
        <th scope="col">Account</th>
        <th scope="col" id="h-status">Status</th>
        <th scope="col" id="h-region">Region</th>
        <th scope="col" id="h-total" class="numeric"><button type="button">Total</button>${handle('Total')}</th>
        <th scope="col" id="h-owner">Owner</th>
      </tr></thead>
      <tbody>
        <tr><td><label><input type="checkbox" aria-label="Select Acme"></label></td><th scope="row">Acme</th><td>Active</td><td>eu-west</td><td class="numeric">$87.00</td><td>Ada</td></tr>
        <tr><td><label><input type="checkbox" aria-label="Select Initech"></label></td><th scope="row">Initech</th><td>Paused</td><td>us-east</td><td class="numeric">$3.76</td><td>Grace</td></tr>
      </tbody>
      <tfoot><tr><td></td><th scope="row">Sum</th><td></td><td></td><td class="numeric">$90.76</td><td></td></tr></tfoot>
    </table>
  </div>
  <script>${js}</script></body></html>`;

/** Each row of a table as a string of 1 for a rendered cell and 0 for a hidden one. */
const rendered = (page, id) => page.locator(`#${id} > table`).evaluate((table) =>
  Array.from(table.rows, (row) => Array.from(row.cells, (cell) => (cell.getClientRects().length ? 1 : 0)).join('')));

/** Loads the visibility fixture with its column menu started. */
async function columnsPage(browser) {
  const page = await browser.newPage();
  await page.setContent(visibilityHtml);
  await page.evaluate(() => Expressive.Menu.init(document.getElementById('columns'), { inDuration: 0, outDuration: 0 }));
  return page;
}

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: a column menu hides and shows a column's header and every cell`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await columnsPage(browser);
      assert.deepEqual(await rendered(page, 'accounts'), Array(4).fill('111110'), 'an unchecked item starts its column hidden');
      await page.locator('#columns').click();
      const region = page.locator('[data-column="h-region"]');
      await region.click();
      assert.deepEqual(await rendered(page, 'accounts'), Array(4).fill('111010'));
      assert.equal(await page.getByRole('columnheader', { name: 'Region' }).count(), 0, 'a hidden header leaves the accessibility tree');
      await region.click();
      assert.deepEqual(await rendered(page, 'accounts'), Array(4).fill('111110'));
    } finally {
      await browser.close();
    }
  });
}
