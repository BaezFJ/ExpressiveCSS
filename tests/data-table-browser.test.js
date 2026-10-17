import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const names = ['Alvin', 'Alan', 'Jonathan', 'Shannon', 'Ada', 'Grace', 'Edsger', 'Barbara'];
const rows = names.map((person, index) => `<tr id="r${index}">
  <td><label><input type="checkbox"${index === 0 ? ' checked' : ''} aria-label="Select ${person}"></label></td>
  <th scope="row">${person}</th>
  <td class="numeric">$${index + 1}.00</td>
  <td>Shipped</td>
</tr>`).join('');

const markup = (dir) => `<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head><body>
<main style="width:500px">
<div id="wrap" class="data-table" tabindex="0" role="region" aria-labelledby="cap" style="max-block-size:240px">
  <table>
    <caption id="cap">Orders</caption>
    <thead><tr>
      <th scope="col"><label><input type="checkbox" aria-label="Select all orders"></label></th>
      <th id="customer" scope="col" aria-sort="ascending"><button type="button">Customer</button></th>
      <th scope="col" class="numeric"><button type="button">Total</button></th>
      <th id="status" scope="col"><button type="button">Status</button></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>
<div class="data-table"><table>
  <thead><tr><th id="desc" scope="col" aria-sort="descending"><button type="button">Date</button></th></tr></thead>
  <tbody><tr><td>Today</td></tr></tbody>
</table></div>
<div id="probe" style="background-color:var(--md-sys-color-secondary-container)"></div>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: data table keeps table semantics, sticks its header and draws sort and selection`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
      for (const dir of ['ltr', 'rtl']) {
        await page.setContent(markup(dir));
        const box = (selector) => page.locator(selector).evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top };
        });

        const table = page.getByRole('table', { name: 'Orders' });
        assert.equal(await table.count(), 1, `${dir}: the wrapped table keeps its role and caption name`);
        assert.equal(await table.getByRole('columnheader').count(), 4);
        assert.equal(await table.getByRole('rowheader').count(), names.length);
        assert.equal(await page.getByRole('region', { name: 'Orders' }).count(), 1, `${dir}: the scroll region is named`);

        // Numbers sit on the end edge, inside the 16px cell padding.
        const gap = await page.locator('#r0 > td.numeric').evaluate((el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          const text = range.getBoundingClientRect();
          const cell = el.getBoundingClientRect();
          return document.dir === 'rtl' ? text.left - cell.left : cell.right - text.right;
        });
        assert.ok(Math.abs(gap - 16) < 1, `${dir}: numeric cell ends at the padding, got ${gap}`);

        const after = (selector) => page.locator(`${selector} > button`).evaluate((el) => {
          const s = getComputedStyle(el, '::after');
          return { opacity: s.opacity, turned: s.transform.startsWith('matrix(-1') };
        });
        assert.deepEqual(await after('#customer'), { opacity: '1', turned: false }, `${dir}: ascending arrow points up`);
        assert.deepEqual(await after('#desc'), { opacity: '1', turned: true }, `${dir}: descending arrow is turned over`);
        assert.equal((await after('#status')).opacity, '0', `${dir}: unsorted column hides its arrow`);

        const fill = (selector) => page.locator(selector).evaluate((el) => getComputedStyle(el).backgroundColor);
        assert.equal(await fill('#r0'), await fill('#probe'), `${dir}: checked row takes the selected container`);
        assert.equal(await fill('#r1'), 'rgba(0, 0, 0, 0)', `${dir}: unchecked row stays clear`);

        await page.locator('#wrap').evaluate((el) => { el.scrollTop = 200; });
        const wrap = await box('#wrap');
        const header = await box('#customer');
        assert.ok(Math.abs(header.top - (wrap.top + 1)) < 1, `${dir}: header sticks under the 1px outline, got ${header.top - wrap.top}`);
      }
    } finally {
      await browser.close();
    }
  });

  test(`${name}: data table joins a bulk-action bar and expands detail rows`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>
        <div id="bar" class="data-table-actions"><span id="count">1 selected</span><button class="button text" type="button">Archive</button></div>
        <div id="table" class="data-table"><table>
          <thead><tr><th scope="col"></th><th scope="col">Order</th><th scope="col"></th></tr></thead>
          <tbody>
            <tr><td><label><input id="pick" type="checkbox" aria-label="Select order 1"></label></td>
              <th scope="row">Order 1</th>
              <td><button id="toggle" class="icon-button" type="button" aria-expanded="false" aria-controls="detail" aria-label="Details for order 1"><span id="chevron" class="material-symbols" aria-hidden="true">expand_more</span></button></td></tr>
            <tr id="detail" class="data-table-detail"><td colspan="3">Two items, shipped Monday.</td></tr>
            <tr><td></td><th scope="row">Order 2</th>
              <td><button id="row-menu" class="icon-button" type="button" aria-haspopup="menu" aria-expanded="true" aria-label="Actions for order 2"><span id="dots" class="material-symbols" aria-hidden="true">more_vert</span></button></td></tr>
            <tr id="menu-detail" class="data-table-detail"><td colspan="3">Not a disclosure.</td></tr>
          </tbody>
        </table></div>
        <div id="lone-bar" class="data-table-actions" hidden>Hidden bar</div>
        <div id="lone" class="data-table"><table><tbody><tr><td>x</td></tr></tbody></table></div>
      </body></html>`);
      const style = (selector, property) => page.locator(selector).evaluate((el, p) => getComputedStyle(el)[p], property);
      const bar = await page.locator('#bar').boundingBox();
      const table = await page.locator('#table').boundingBox();
      assert.ok(Math.abs(bar.y + bar.height - table.y) < 1, 'the bar sits on the table with no gap');
      assert.equal(await style('#table', 'borderTopLeftRadius'), '0px', 'the joined table squares its top corners');
      assert.equal(await style('#lone', 'borderTopLeftRadius'), '12px', 'a hidden bar leaves the table corners alone');
      assert.equal(await style('#lone-bar', 'display'), 'none');

      const resting = await style('#bar', 'backgroundColor');
      await page.check('#pick');
      assert.notEqual(await style('#bar', 'backgroundColor'), resting, 'a selected row tints the bar');
      const count = await page.locator('#count').boundingBox();
      const archive = await page.locator('#bar button').boundingBox();
      assert.ok(count.x < archive.x && archive.x + archive.width > bar.x + bar.width - 24, 'the label leads and the buttons sit at the end');

      assert.equal(await style('#detail', 'display'), 'none', 'a collapsed toggle hides its detail row');
      await page.locator('#toggle').evaluate((el) => el.setAttribute('aria-expanded', 'true'));
      assert.equal(await style('#detail', 'display'), 'table-row', 'an expanded toggle shows its detail row');
      await page.waitForTimeout(250);
      assert.match(await style('#chevron', 'transform'), /^matrix\(-1, /, 'the chevron turns over');
      assert.equal(await style('#menu-detail', 'display'), 'none', 'an open row menu does not reveal a detail row');
      assert.equal(await style('#dots', 'transform'), 'none', 'nor turn its icon');
      assert.equal(await page.locator('#table').getByRole('row').count(), 4, 'the expanded detail row stays a table row');
    } finally {
      await browser.close();
    }
  });
}
