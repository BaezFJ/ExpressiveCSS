import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

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

// Six extra columns make each table wider than its 400px wrapper.
const extra = (tag, label) => Array.from({ length: 6 }, (_, i) => `<${tag}>${label} ${i + 1}</${tag}>`).join('');
const pick = (label) => `<label><input type="checkbox" aria-label="${label}"></label>`;
const sticky = (dir) => `<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head><body>
<div id="wide" class="data-table sticky-column" style="inline-size:400px;max-block-size:240px">
  <table style="min-inline-size:1200px">
    <caption>Orders</caption>
    <thead><tr><th scope="col">${pick('Select all')}</th><th id="h-name" scope="col">Customer</th>${extra('th', 'Column')}</tr></thead>
    <tbody>${names.map((person, index) => `<tr id="w${index}">
      <td>${index === 5 ? '' : pick(`Select ${person}`)}</td><th scope="row">${person}</th>${extra('td', 'Value')}</tr>`).join('')}</tbody>
    <tfoot><tr><td></td><th scope="row">Total</th>${extra('td', 'Sum')}</tr></tfoot>
  </table>
</div>
<div id="plain" class="data-table sticky-column" style="inline-size:400px">
  <table style="min-inline-size:1200px">
    <thead><tr><th scope="col">Customer</th><th scope="col">Status</th>${extra('th', 'Column')}</tr></thead>
    <tbody><tr><th scope="row">Ada</th><td>Shipped</td>${extra('td', 'Value')}</tr></tbody>
    <tfoot><tr><th scope="row">Total</th><td></td>${extra('td', 'Sum')}</tr></tfoot>
  </table>
</div>
<div id="off" class="data-table" style="inline-size:400px">
  <table style="min-inline-size:1200px">
    <thead><tr><th scope="col">${pick('Select all')}</th><th scope="col">Customer</th>${extra('th', 'Column')}</tr></thead>
    <tbody><tr><td>${pick('Select Ada')}</td><th scope="row">Ada</th>${extra('td', 'Value')}</tr></tbody>
  </table>
</div>
</body></html>`;

// The inline-start and inline-end edges of a box, its width, and the
// inline-start edge of its scrollport inside the 1px outline.
const edges = (page, selector) => page.locator(selector).evaluate((el) => {
  const box = el.getBoundingClientRect();
  if (getComputedStyle(el).direction === 'rtl') return { start: box.right, end: box.left, inner: box.right - el.clientLeft, width: box.width };
  return { start: box.left, end: box.right, inner: box.left + el.clientLeft, width: box.width };
});

// Scrolls a wrapper to its far inline end, and down by top; returns the sideways distance.
const scrollAcross = (page, selector, top = 0) => page.locator(selector).evaluate((el, y) => {
  el.scrollLeft = (getComputedStyle(el).direction === 'rtl' ? -1 : 1) * el.scrollWidth;
  el.scrollTop = y;
  return Math.abs(el.scrollLeft);
}, top);

// The table cell painted on top at a point.
const hit = (page, x, y) => page.evaluate(([px, py]) => {
  const cell = document.elementFromPoint(px, py).closest('th, td');
  return { group: cell.parentElement.parentElement.localName, index: cell.cellIndex, id: cell.id };
}, [x, y]);

const near = (dir, a, b, message) => assert.ok(Math.abs(a - b) < 1, `${dir}: ${message}, got ${a} vs ${b}`);
const style = (page, selector, property) => page.locator(selector).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);

// V1: without a checkbox column only the first cell is pinned, in every row group.
async function checkPlain(page, dir) {
  const third = (await edges(page, '#plain tbody td:nth-child(3)')).start;
  const moved = await scrollAcross(page, '#plain');
  assert.ok(moved > 300, `${dir}: the plain table scrolls sideways, got ${moved}`);
  const { inner } = await edges(page, '#plain');
  for (const cell of ['thead th:first-child', 'tbody th:first-child', 'tfoot th:first-child']) {
    near(dir, (await edges(page, `#plain ${cell}`)).start, inner, `${cell} stays at the scrollport edge`);
  }
  near(dir, Math.abs((await edges(page, '#plain tbody td:nth-child(3)')).start - third), moved, 'the third column moves by the scroll distance');
  const gap = (await edges(page, '#plain tbody td:nth-child(2)')).start - (await edges(page, '#plain tbody th:first-child')).end;
  assert.ok(Math.abs(gap) > 1, `${dir}: the second cell is not pinned without a checkbox column`);
}

// V2: a checkbox column pins its cell and the name after it, in every row,
// including the row with no checkbox and the footer.
async function checkPaired(page, dir) {
  await scrollAcross(page, '#wide');
  const { inner } = await edges(page, '#wide');
  const width = await page.locator('#wide').evaluate((el) => {
    const probe = el.appendChild(document.createElement('div'));
    probe.style.inlineSize = 'var(--md-comp-data-table-checkbox-column-width)';
    const value = probe.getBoundingClientRect().width;
    probe.remove();
    return value;
  });
  assert.ok(width > 0, `${dir}: the checkbox column width token is set`);
  for (const row of ['thead tr', '#w0', '#w5', 'tfoot tr']) {
    const box = await edges(page, `#wide ${row} > :first-child`);
    near(dir, box.start, inner, `${row} checkbox cell stays at the edge`);
    near(dir, (await edges(page, `#wide ${row} > :nth-child(2)`)).start, box.end, `${row} name cell meets the checkbox cell`);
    near(dir, box.width, width, `${row} checkbox cell takes the token width`);
  }
}

// V3: scrolled down too, the corner paints above scrolled header cells and
// pinned body cells, and pinned body cells above scrolled body cells.
async function checkStacking(page, dir) {
  await scrollAcross(page, '#wide', 120);
  const corner = await page.locator('#h-name').boundingBox();
  const middle = corner.y + corner.height / 2;
  assert.equal((await hit(page, corner.x + corner.width / 2, middle)).id, 'h-name', `${dir}: the corner cell is on top`);
  const beside = dir === 'rtl' ? corner.x - 20 : corner.x + corner.width + 20;
  const header = await hit(page, beside, middle);
  assert.equal(header.group, 'thead', `${dir}: a scrolled header cell covers the body`);
  assert.ok(header.index > 1, `${dir}: that header cell is a scrolled one`);
  const body = await hit(page, corner.x + corner.width / 2, corner.y + corner.height + 10);
  assert.deepEqual([body.group, body.index], ['tbody', 1], `${dir}: the pinned name cell covers scrolled body cells`);
}

// V6: the divider on the last pinned cell, and an unmodified table left alone.
async function checkDividers(page, dir) {
  for (const selector of ['#wide #w0 > :nth-child(2)', '#plain tbody th:first-child']) {
    assert.equal(await style(page, selector, 'border-inline-end-width'), '1px', `${dir}: ${selector} draws the divider`);
    assert.equal(await style(page, selector, 'border-inline-end-style'), 'solid');
  }
  assert.equal(await style(page, '#wide #w0 > :first-child', 'border-inline-end-width'), '0px', `${dir}: no divider between checkbox and name`);
  assert.equal(await style(page, '#off thead th:nth-child(3)', 'z-index'), '1', `${dir}: an unmodified header keeps its stacking`);
  assert.equal(await style(page, '#off tbody td:first-child', 'position'), 'static', `${dir}: an unmodified table pins nothing`);
  const hug = await page.locator('#off tbody td:first-child').evaluate((el) => el.getBoundingClientRect().width - el.querySelector('label').getBoundingClientRect().width);
  near(dir, hug, 16, 'an unmodified checkbox cell still hugs its box');
}

for (const [name, engine, test] of engines) {
  test(`${name}: a sticky-column data table pins its first column, and the name after a checkbox`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
      for (const dir of ['ltr', 'rtl']) {
        await page.setContent(sticky(dir));
        await checkPlain(page, dir);
        await checkPaired(page, dir);
        await checkStacking(page, dir);
        await checkDividers(page, dir);
      }
    } finally {
      await browser.close();
    }
  });

  test(`${name}: data table keeps table semantics, sticks its header and draws sort and selection`, { timeout: 30000 }, async (t) => {
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
