import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

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
    const browser = await engine.launch({ headless: true });
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
}
