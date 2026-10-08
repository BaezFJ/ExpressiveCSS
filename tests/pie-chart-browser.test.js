import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const chart = (attrs, caption, header, rows, foot = '') => `<figure ${attrs}>
  <figcaption>${caption}</figcaption>
  <table>
    <thead><tr><th>Plan</th>${header}</tr></thead>
    <tbody>${rows.map(([label, ...cells]) => `<tr><th>${label}</th>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
    ${foot}
  </table>
</figure>`;

const html = `<style>${css}</style>
  <div style="width: 400px">
    ${chart('class="pie-chart" id="plans"', 'Plans', '<th>Revenue</th><th>Change</th>', [
      ['Basic', '$50', '+10%'], ['Premium', '$25', '−2%'], ['Free', '$0', '0%'], ['Enterprise', '$25', '+4%']])}
    ${chart('class="pie-chart donut values" id="donut"', 'Donut', '<th>Leads</th>', [
      ['Referrals', '96'], ['Search', '3'], ['Paid', '1']], '<tfoot><tr><th>Total leads</th><td>100</td></tr></tfoot>')}
    ${chart('class="pie-chart" id="seven"', 'Seven', '<th>V</th>', [['A', '1'], ['B', '1'], ['C', '1'], ['D', '1'], ['E', '1'], ['F', '1'], ['G', '1']])}
    ${chart('class="pie-chart" id="trailing"', 'Trailing', '<th>V</th>', [['A', '1'], ['B', '1'], ['C', '1'], ['D', '1'], ['E', '1'], ['F', '1'], ['G', '1'], ['H', '0']])}
    ${chart('class="pie-chart" id="whole"', 'Whole', '<th>V</th>', [['Only', '5'], ['None', '']])}
    ${chart('class="pie-chart sparkline" id="spark"', 'Spark', '<th>V</th>', [['A', '1'], ['B', '2']])}
  </div>
  <script>${js}</script>`;

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  browserTest(`${engine}: pie chart draws slices, a legend and a donut total from its table`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      const plans = await page.locator('#plans').evaluate((el) => {
        const plot = el.querySelector('.pie-chart-plot');
        return {
          table: getComputedStyle(el.querySelector('table')).position,
          plot: [plot.tabIndex, plot.getAttribute('aria-label'), plot.getAttribute('aria-roledescription')],
          square: plot.offsetWidth === plot.offsetHeight && plot.offsetWidth === 240,
          hidden: el.querySelector('.pie-chart-pie').getAttribute('aria-hidden'),
          slices: [...el.querySelectorAll('.pie-chart-slice')].map((path) => path.dataset.series),
          legend: [...el.querySelectorAll('.pie-chart-legend li')].map((li) =>
            [li.dataset.series, ...[...li.children].map((span) => span.textContent)]),
          labels: el.querySelectorAll('.pie-chart-labels, .pie-chart-values').length,
          instance: [!!Expressive.PieChart.getInstance(el), !!Expressive.LineChart.getInstance(el)],
          hole: getComputedStyle(el.querySelector('.pie-chart-hole')).transform,
          total: getComputedStyle(el.querySelector('.pie-chart-pie')).display,
        };
      });
      assert.equal(plans.table, 'absolute', 'the table is visually hidden');
      assert.deepEqual(plans.plot, [0, 'Plans', 'pie chart']);
      assert.equal(plans.square, true, 'the plot is a square as wide as the height token');
      assert.equal(plans.hidden, 'true', 'the drawn pie is hidden; the table carries the data');
      // A zero row draws nothing and takes no color, but keeps its legend row.
      assert.deepEqual(plans.slices, ['1', '2', '3']);
      assert.deepEqual(plans.legend, [
        ['1', 'Basic', '$50', '50%'], ['2', 'Premium', '$25', '25%'], [undefined, 'Free', '$0', ''], ['3', 'Enterprise', '$25', '25%']]);
      assert.equal(plans.labels, 0, 'a pie has no row labels, and no values without .values');
      assert.deepEqual(plans.instance, [true, false]);
      assert.match(plans.hole, /^matrix\(0, 0, 0, 0, 0, 0\)$/, 'a pie has no hole');
      assert.equal(await page.getByRole('table').first().getByRole('cell', { name: '$50' }).count(), 1,
        'the hidden table stays in the accessibility tree');

      // Basic is the right half, so its slice runs from the top to the bottom.
      const basic = await page.locator('#plans .pie-chart-slice').first().getAttribute('d');
      assert.equal(basic, 'M0,0L0.000,-46.000A46,46 0 0 1 0.000,46.000Z');

      const donut = await page.locator('#donut').evaluate((el) => ({
        hole: getComputedStyle(el.querySelector('.pie-chart-hole')).transform,
        total: [getComputedStyle(el.querySelector('.pie-chart-total')).display, el.querySelector('.pie-chart-total').textContent],
        values: [...el.querySelectorAll('.pie-chart-values span')].map((span) => [span.dataset.series, span.textContent]),
        legend: [...el.querySelectorAll('.pie-chart-legend li')].map((li) => li.lastElementChild.textContent),
        rows: el.querySelectorAll('.pie-chart-legend li').length,
      }));
      assert.match(donut.hole, /^matrix\(0\.6, 0, 0, 0\.6, 0, 0\)$/);
      assert.deepEqual(donut.total, ['flex', '100Total leads'], 'the <tfoot> row is the total, not a slice');
      assert.deepEqual(donut.values, [['1', '96%']], 'slices under 5% get no value label');
      assert.deepEqual(donut.legend, ['96%', '3%', '1%']);
      assert.equal(donut.rows, 3);

      // The seventh row would repeat the first row's color beside it.
      assert.deepEqual(await page.locator('#seven .pie-chart-slice').evaluateAll((paths) => paths.map((path) => path.dataset.series)),
        ['1', '2', '3', '4', '5', '6', '2']);
      assert.equal(await page.locator('#seven .pie-chart-gaps').getAttribute('d').then((d) => d.split('M').length - 1), 7);
      // So does the seventh slice when an empty row comes after it.
      assert.deepEqual(await page.locator('#trailing .pie-chart-slice').evaluateAll((paths) => paths.map((path) => path.dataset.series)),
        ['1', '2', '3', '4', '5', '6', '2']);

      const whole = await page.locator('#whole').evaluate((el) => [
        el.querySelectorAll('.pie-chart-slice').length,
        el.querySelector('.pie-chart-slice').getAttribute('d').split('A').length - 1,
        el.querySelector('.pie-chart-gaps').getAttribute('d'),
      ]);
      assert.deepEqual(whole, [1, 2, ''], 'one slice is a whole circle of two arcs with no gap');

      assert.deepEqual(await page.locator('#spark').evaluate((el) => [
        el.querySelector('.pie-chart-plot').hasAttribute('tabindex'),
        getComputedStyle(el.querySelector('.pie-chart-legend')).display,
        el.querySelector('.pie-chart-plot').offsetWidth,
      ]), [false, 'none', 48]);

      await page.evaluate(() => Expressive.PieChart.getInstance(document.querySelector('#plans')).destroy());
      assert.deepEqual(await page.locator('#plans').evaluate((el) => [
        el.querySelectorAll('.pie-chart-plot, .pie-chart-legend').length,
        getComputedStyle(el.querySelector('table')).clipPath,
        el.Expressive_PieChart,
      ]), [0, 'none', undefined]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: pie chart tooltip follows the pointer round the pie and the arrow keys`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      const plot = page.locator('#plans .pie-chart-plot');
      const tooltip = page.locator('#plans .pie-chart-tooltip');
      const text = () => tooltip.innerText().then((value) => value.replace(/\s+/g, ' ').trim());
      const active = () => page.locator('#plans .pie-chart-slice.active').evaluateAll((paths) => paths.map((path) => path.dataset.series));
      const box = await plot.boundingBox();
      const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];

      // Right of the middle is Basic, the first half turn; lower left is Premium.
      await page.mouse.move(x + 40, y);
      assert.equal(await text(), 'Basic Revenue $50 (50%) Change +10%');
      assert.deepEqual(await active(), ['1']);
      assert.equal(await tooltip.evaluate((el) => el.classList.contains('end')), true, 'on the right half it opens leftwards');
      await page.mouse.move(x - 40, y + 20);
      assert.equal(await text(), 'Premium Revenue $25 (25%) Change −2%');
      assert.deepEqual(await tooltip.locator('[data-series]').evaluateAll((spans) => spans.map((span) => span.dataset.series)), ['2', '2'],
        'the tooltip swatches take the slice color');
      await page.mouse.move(x - 40, y - 20);
      assert.match(await text(), /^Enterprise/);
      assert.equal(await tooltip.evaluate((el) => el.classList.contains('end')), false);

      // The plot's corners are off the pie.
      await page.mouse.move(box.x + 2, box.y + 2);
      assert.equal(await tooltip.isVisible(), false);
      assert.deepEqual(await active(), []);
      // The slices end at 46% of the width, so the ring past them is off the pie too,
      // except over the active slice, which grows by 6%.
      await page.mouse.move(x + box.width * 0.48, y);
      assert.equal(await tooltip.isVisible(), false, 'blank ring past the slices');
      await page.mouse.move(x + box.width * 0.4, y);
      await page.mouse.move(x + box.width * 0.48, y);
      assert.match(await text(), /^Basic/, 'the grown active slice keeps the pointer');

      // An index past the last row hides the tooltip, as in other charts.
      assert.equal(await page.evaluate(() => {
        const chart = Expressive.PieChart.getInstance(document.querySelector('#plans'));
        chart.show(99);
        return chart.el.querySelector('.pie-chart-tooltip').hidden;
      }), true);

      // A donut's hole, where the total is, is off the slices.
      const donut = await page.locator('#donut .pie-chart-plot');
      await donut.scrollIntoViewIfNeeded();
      const hole = await donut.boundingBox();
      const donutTooltip = page.locator('#donut .pie-chart-tooltip');
      await page.mouse.move(hole.x + hole.width * 0.5 + 10, hole.y + hole.height * 0.5);
      assert.equal(await donutTooltip.isVisible(), false, 'pointer over the total');
      await page.mouse.move(hole.x + hole.width * 0.85, hole.y + hole.height * 0.5);
      assert.match(await donutTooltip.innerText(), /^Referrals/);

      await plot.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      assert.match(await text(), /^Basic/);
      await page.keyboard.press('ArrowRight');
      assert.match(await text(), /^Premium/);
      await page.keyboard.press('ArrowDown');
      assert.equal(await text(), 'Free Revenue $0 Change 0%', 'a zero row is reachable but has no share');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowLeft');
      assert.match(await text(), /^Basic/);
      await page.keyboard.press('End');
      assert.match(await text(), /^Enterprise/);
      await page.keyboard.press('Escape');
      assert.equal(await tooltip.isVisible(), false);

      // In RTL the slices still run clockwise, and so do the arrows: right moves to the next row.
      const rtl = await page.evaluate(() => {
        const wrap = document.createElement('div');
        wrap.dir = 'rtl';
        wrap.append(document.querySelector('#plans').cloneNode(true));
        document.body.append(wrap);
        const el = wrap.firstElementChild;
        el.querySelectorAll('.pie-chart-plot, .pie-chart-legend').forEach((node) => node.remove());
        const chart = Expressive.PieChart.init(el);
        chart.show(0);
        el.querySelector('.pie-chart-plot').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        return [el.querySelector('.pie-chart-slice').getAttribute('d'), chart.activeIndex];
      });
      assert.deepEqual(rtl, ['M0,0L0.000,-46.000A46,46 0 0 1 0.000,46.000Z', 1]);
    } finally {
      await browser.close();
    }
  });
}
