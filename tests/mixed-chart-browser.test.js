import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const chart = (attrs, header, rows) => `<figure ${attrs}>
  <figcaption>Sales</figcaption>
  <table>
    <thead><tr><th>Month</th>${header}</tr></thead>
    <tbody>${rows.map(([label, ...cells]) => `<tr><th>${label}</th>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</figure>`;

const html = `<style>${css}</style>
  <div style="width: 400px">
    ${chart('class="mixed-chart" id="mixed" data-end-min="0" data-end-max="100"',
      '<th class="column">Revenue</th><th class="area end">Margin</th><th class="dashed">Target</th>',
      [['Jan', '$40', '25%', '50'], ['Feb', '$80', '50%', ''], ['Mar', '', '75%', '60'], ['Apr', '$60', '100%', '70']])}
    ${chart('class="mixed-chart" id="fitted"', '<th class="end">Visits</th><th class="end">Orders</th>',
      [['Jan', '100'], ['Feb', '200', '150']])}
    ${chart('class="mixed-chart" id="empty"', '<th class="column">Revenue</th>', [['Jan', 'n/a']])}
  </div>
  <script>${js}</script>`;

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  browserTest(`${engine}: mixed chart draws columns, areas and lines on two scales`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      const mixed = await page.locator('#mixed').evaluate((el) => {
        const plot = el.querySelector('.mixed-chart-plot');
        return {
          table: getComputedStyle(el.querySelector('table')).position,
          plot: [plot.tabIndex, plot.getAttribute('aria-label'), plot.getAttribute('aria-roledescription')],
          hidden: el.querySelector('.mixed-chart-columns').getAttribute('aria-hidden'),
          columns: [...el.querySelectorAll('.mixed-chart-columns > div')].map((row) =>
            [...row.children].map((span) => [span.dataset.series, span.style.getPropertyValue('--top')])),
          series: [...el.querySelectorAll('.mixed-chart-series')].map((g) => [g.getAttribute('class'), g.dataset.series]),
          areas: [...el.querySelectorAll('.mixed-chart-area')].map((area) => getComputedStyle(area).display),
          dash: getComputedStyle(el.querySelector('.dashed .mixed-chart-line')).strokeDasharray,
          // Margin is on the end scale, 0 to 100; its first point is 25% up.
          margin: el.querySelector('.area .mixed-chart-line').getAttribute('d').match(/^M[\d.]+,([\d.]+)/)[1],
          legend: [...el.querySelectorAll('.mixed-chart-legend li')].map((li) => [li.dataset.series, li.textContent]),
          instance: [!!Expressive.MixedChart.getInstance(el), !!Expressive.ColumnChart.getInstance(el)],
        };
      });
      assert.equal(mixed.table, 'absolute', 'the table is visually hidden');
      assert.deepEqual(mixed.plot, [0, 'Sales', 'mixed chart']);
      assert.equal(mixed.hidden, 'true');
      // Revenue alone is on the start scale, 0 to 80 plus a tenth: 88.
      assert.deepEqual(mixed.columns, [
        [['1', `${100 - (40 / 88) * 100}%`]], [['1', `${100 - (80 / 88) * 100}%`]], [[undefined, '']], [['1', `${100 - (60 / 88) * 100}%`]]]);
      assert.deepEqual(mixed.series, [['mixed-chart-series area end', '2'], ['mixed-chart-series dashed', '3']]);
      assert.deepEqual(mixed.areas, ['inline', 'none'], 'only an area series fills');
      assert.notEqual(mixed.dash, 'none');
      assert.equal(Number(mixed.margin), 75);
      assert.deepEqual(mixed.legend, [['1', 'Revenue'], ['2', 'Margin'], ['3', 'Target']]);
      assert.deepEqual(mixed.instance, [true, false]);

      // Series on the end scale fit their own values, with a tenth to spare.
      const fitted = await page.locator('#fitted .mixed-chart-line').evaluateAll((lines) =>
        lines.map((line) => line.getAttribute('d').match(/^M[\d.]+,([\d.]+)/)[1]));
      // Both share it: 100 to 200 widens to 90 to 210.
      assert.deepEqual(fitted.map((y) => Number(Number(y).toFixed(3))), [Number((100 - (10 / 120) * 100).toFixed(3)), 50]);

      assert.equal(await page.locator('#empty .mixed-chart-plot').count(), 0, 'a chart of gaps shows its table');

      // The tooltip lists every series; points mark the lines and areas, not the columns.
      await page.locator('#mixed .mixed-chart-plot').focus();
      await page.keyboard.press('Home');
      const shown = await page.locator('#mixed').evaluate((el) => ({
        tooltip: [...el.querySelectorAll('.mixed-chart-tooltip > *')].map((node) => node.textContent),
        points: [...el.querySelectorAll('.mixed-chart-cursor > span')].map((dot) => [dot.dataset.series, getComputedStyle(dot).display]),
      }));
      assert.deepEqual(shown.tooltip, ['Jan', 'Revenue', '$40', 'Margin', '25%', 'Target', '50']);
      assert.deepEqual(shown.points, [['1', 'none'], ['2', 'block'], ['3', 'block']]);
    } finally {
      await browser.close();
    }
  });
}
