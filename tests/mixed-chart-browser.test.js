import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines } from './browser.js';

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

for (const [engine, browserType, browserTest] of engines) {

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

  browserTest(`${engine}: mixed chart stacks its columns and marks straight lines`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(`<style>${css}</style>
        <div style="width: 400px">
          ${chart('class="mixed-chart stacked points straight" id="stacked" data-max="100"',
            '<th class="column">Online</th><th class="column">Store</th><th>Target</th><th class="column end">Returns</th>',
            [['Jan', '40', '20', '50', '5'], ['Feb', '', '30', '60', '10'], ['Mar', '30', '30', '', '15']])}
          ${chart('class="mixed-chart" id="smooth"', '<th>Target</th>', [['Jan', '40'], ['Feb', '60'], ['Mar', '50']])}
        </div>
        <script>${js}</script>`);
      await page.evaluate(() => Expressive.AutoInit());

      const stacked = await page.locator('#stacked').evaluate((el) => {
        const chart = Expressive.MixedChart.getInstance(el);
        const rows = [...el.querySelectorAll('.mixed-chart-columns > div')];
        return {
          tops: chart.series.map((series) => series.tops),
          spans: rows.map((row) => [...row.children].map((span) => [span.style.getPropertyValue('--top'), span.style.getPropertyValue('--bottom')])),
          columns: [...rows[0].children].map((span) => getComputedStyle(span).gridColumnStart),
          rounded: [...rows[0].children].map((span) => getComputedStyle(span).getPropertyValue('--mixed-chart-ends').trim() !== '0'),
          line: el.querySelector('.mixed-chart-line').getAttribute('d'),
          points: [...el.querySelectorAll('.mixed-chart-points')].map((path) => path.getAttribute('d')),
          dot: getComputedStyle(el.querySelector('.mixed-chart-points')).strokeLinecap,
          tooltip: (chart.show(0), [...el.querySelectorAll('.mixed-chart-tooltip span')].map((span) => span.textContent)),
        };
      });
      // The columns on each scale stack; Store sits on Online, and Returns, on the end scale, on nothing.
      // Online's gap in Feb leaves Store's base there unknown, so the segment is left out.
      assert.deepEqual(stacked.tops, [[40, null, 30], [60, null, 60], [50, 60, null], [5, 10, 15]]);
      assert.deepEqual(stacked.spans[0].slice(0, 2), [['60%', '0%'], ['40%', '40%']], 'Jan: Online 0-40, Store 40-60 on a 0-100 scale');
      assert.deepEqual(stacked.columns, ['1', '1', '2'], 'the stack shares one column, and the end scale\'s stands beside it');
      assert.deepEqual(stacked.rounded, [false, true, true], 'only the top of each stack is rounded');
      assert.equal(stacked.line, 'M16.666666666666664,50L50,40', 'a line keeps its own values, straight, and breaks at its gap');
      assert.deepEqual(stacked.points, ['M16.666666666666664,50h0M50,40h0'], 'points mark each value of each line');
      assert.equal(stacked.dot, 'round');
      assert.deepEqual(stacked.tooltip, ['Online', '40', 'Store', '20', 'Target', '50', 'Returns', '5'], 'the tooltip shows the values, not the totals');

      const smooth = await page.locator('#smooth').evaluate((el) => [el.querySelector('.mixed-chart-line').getAttribute('d'), el.querySelectorAll('.mixed-chart-points').length]);
      assert.match(smooth[0], /C/, 'lines are smooth without .straight');
      assert.equal(smooth[1], 0, 'no dots without .points');
    } finally {
      await browser.close();
    }
  });
}
