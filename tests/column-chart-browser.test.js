import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const chart = (attrs, caption, header, rows) => `<figure ${attrs}>
  <figcaption>${caption}</figcaption>
  <table>
    <thead><tr><th>Month</th>${header}</tr></thead>
    <tbody>${rows.map(([label, ...cells]) => `<tr><th>${label}</th>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</figure>`;

const html = `<style>${css}</style>
  <div style="width: 600px">
    ${chart('class="column-chart" id="plans" data-max="10"', 'Plans', '<th>Basic</th><th class="dashed">Premium</th>', [
      ['Jan', '$4', '$2'], ['Feb', '$6', ''], ['Mar', '$5', '$8'], ['Apr', '$1', '$3']])}
    ${chart('class="column-chart stacked" id="stacked" data-max="10"', 'Stacked', '<th>A</th><th>B</th>', [
      ['Jan', '1', '2'], ['Feb', '', '2'], ['Mar', '3', '4']])}
    ${chart('class="column-chart" id="profit"', 'Profit', '<th>Profit</th>', [['Jan', '4'], ['Feb', '−4']])}
    ${chart('class="column-chart" id="raised" data-min="2" data-max="12"', 'Raised', '<th>V</th>', [['Jan', '7'], ['Feb', '12']])}
    ${chart('class="column-chart" id="floor" data-min="50"', 'Floor', '<th>V</th>', [['Jan', '60'], ['Feb', '100']])}
    ${chart('class="column-chart fade" id="fade"', 'Fade', '<th>V</th>', [['Jan', '4'], ['Feb', '−4']])}
    ${chart('class="column-chart stacked track" id="stacked-track"', 'Stacked track', '<th>A</th><th>B</th><th>C</th>', [['Jan', '1', '2', '3']])}
    ${chart('class="column-chart stacked" id="mixed"', 'Mixed', '<th>A</th><th>B</th>', [['Jan', '5', '−3']])}
    ${chart('class="column-chart sparkline" id="spark"', 'Spark', '<th>V</th>', [['Jan', '1'], ['Feb', '2']])}
    ${chart('class="line-chart" id="line"', 'Line', '<th>V</th>', [['Jan', '1'], ['Feb', '2']])}
  </div>
  <script>${js}</script>`;

// Each row's columns as [series, top %, bottom %], to a tenth of a percent.
const columns = (el) => [...el.querySelectorAll('.column-chart-columns > div')].map((row) =>
  [...row.children].map((span) => [span.dataset.series ?? '',
    ...['--top', '--bottom'].map((name) => span.style.getPropertyValue(name) && Math.round(parseFloat(span.style.getPropertyValue(name)) * 10) / 10)]));

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: column chart draws grouped, stacked and negative columns from its table`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      const plans = await page.locator('#plans').evaluate((el) => ({
        table: getComputedStyle(el.querySelector('table')).position,
        plot: [el.querySelector('.column-chart-plot').tabIndex, el.querySelector('.column-chart-plot').getAttribute('aria-label'),
          el.querySelector('.column-chart-plot').getAttribute('aria-roledescription')],
        hidden: el.querySelector('.column-chart-columns').getAttribute('aria-hidden'),
        labels: [...el.querySelectorAll('.column-chart-labels li')].map((li) => li.textContent),
        legend: [...el.querySelectorAll('.column-chart-legend li')].map((li) => li.textContent),
        dashed: el.querySelectorAll('.column-chart-columns span.dashed').length,
        instance: [!!Expressive.ColumnChart.getInstance(el), !!Expressive.LineChart.getInstance(el), !!el.Expressive_LineChart],
        clip: getComputedStyle(el.querySelector('.column-chart-columns span')).clipPath,
      }));
      assert.equal(plans.table, 'absolute', 'the table is visually hidden');
      assert.deepEqual(plans.plot, [0, 'Plans', 'column chart']);
      assert.equal(plans.hidden, 'true', 'the drawn columns are hidden; the table carries the data');
      assert.deepEqual(plans.labels, ['Jan', 'Feb', 'Mar', 'Apr']);
      assert.deepEqual(plans.legend, ['Basic', 'Premium']);
      assert.equal(plans.dashed, 3, 'a series header class reaches its columns');
      assert.deepEqual(plans.instance, [true, false, false], 'a column chart is not a line chart instance');
      assert.match(plans.clip, /^inset\(60% 0(px)? 0% round 4px 4px 0(px)? 0(px)?\)$/);
      // Zero to data-max 10; a gap keeps its slot so the series stay aligned.
      assert.deepEqual(await page.locator('#plans').evaluate(columns), [
        [['1', 60, 0], ['2', 80, 0]],
        [['1', 40, 0], ['', '', '']],
        [['1', 50, 0], ['2', 20, 0]],
        [['1', 90, 0], ['2', 70, 0]],
      ]);
      assert.equal(await page.getByRole('table').first().getByRole('cell', { name: '$4' }).count(), 1,
        'the hidden table stays in the accessibility tree');

      // Each segment sits on the total below it; a gap leaves the total unknown.
      assert.deepEqual(await page.locator('#stacked').evaluate(columns), [
        [['1', 90, 0], ['2', 70, 10]],
        [],
        [['1', 70, 0], ['2', 30, 30]],
      ]);
      // Only the top segment rounds its end.
      assert.deepEqual(await page.locator('#stacked .column-chart-columns > div').nth(2).evaluate((row) =>
        [...row.children].map((span) => /round 4px 4px 0(px)? 0(px)?\)$/.test(getComputedStyle(span).clipPath))), [false, true]);

      // Zero is in the middle with 10% of the span to spare at each end.
      const profit = await page.locator('#profit').evaluate((el) => ({
        negative: [...el.querySelectorAll('.column-chart-columns span')].map((span) => span.classList.contains('negative')),
        zero: el.querySelector('.column-chart-columns').style.getPropertyValue('--zero'),
      }));
      assert.deepEqual(await page.locator('#profit').evaluate(columns), [[['1', 8.3, 50]], [['1', 50, 8.3]]]);
      assert.deepEqual(profit.negative, [false, true]);
      assert.equal(profit.zero, '50%');

      // With zero below the scale, columns start at the plot's bottom edge.
      assert.deepEqual(await page.locator('#raised').evaluate(columns), [[['1', 50, 0]], [['1', 0, 0]]]);
      // Headroom is 10% of the span from data-min, not from zero: the scale runs 50 to 105.
      assert.deepEqual(await page.locator('#floor').evaluate(columns), [[['1', 81.8, 0]], [['1', 9.1, 0]]]);

      // A negative column fades from its tip at the bottom up toward zero.
      const fades = await page.locator('#fade').evaluate((el) =>
        [...el.querySelectorAll('.column-chart-columns span')].map((span) => getComputedStyle(span).backgroundImage));
      assert.doesNotMatch(fades[0], /^linear-gradient\((to top|0deg)/, fades[0]);
      assert.match(fades[1], /^linear-gradient\((to top|0deg),/, fades[1]);

      // A stack rounds its top and, on a track, its base, but not the joints between segments.
      const ends = (id) => page.locator(id).evaluate((el) => [...el.querySelectorAll('.column-chart-columns span')].map((span) =>
        getComputedStyle(span).clipPath.match(/round (.*)\)$/)?.[1].replace(/\b0(px)?/g, '0') ?? 'none'));
      assert.deepEqual(await ends('#stacked-track'), ['0 0 4px 4px', 'none', '4px 4px 0 0']);
      assert.deepEqual(await ends('#mixed'), ['none', '4px 4px 0 0'], 'a stacked segment below zero keeps its top rounding');

      const spark = await page.locator('#spark').evaluate((el) => [
        el.querySelector('.column-chart-plot').hasAttribute('tabindex'),
        getComputedStyle(el.querySelector('.column-chart-labels')).display,
        getComputedStyle(el.querySelector('.column-chart-plot')).height,
      ]);
      assert.deepEqual(spark, [false, 'none', '48px']);
      assert.equal(await page.locator('#line .line-chart-plot').getAttribute('aria-roledescription'), 'line chart');

      await page.evaluate(() => Expressive.ColumnChart.getInstance(document.querySelector('#plans')).destroy());
      assert.deepEqual(await page.locator('#plans').evaluate((el) => [
        el.querySelectorAll('.column-chart-plot, .column-chart-labels, .column-chart-legend').length,
        getComputedStyle(el.querySelector('table')).clipPath,
        el.Expressive_ColumnChart,
      ]), [0, 'none', undefined]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: column chart tooltip and band follow the pointer and the arrow keys`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      const plot = page.locator('#plans .column-chart-plot');
      const tooltip = page.locator('#plans .column-chart-tooltip');
      const cursor = page.locator('#plans .column-chart-cursor');
      const box = await plot.boundingBox();

      await page.mouse.move(box.x + box.width * 0.6, box.y + 10);
      assert.equal(await tooltip.innerText().then((text) => text.replace(/\s+/g, ' ').trim()), 'Mar Basic $5 Premium $8');
      assert.equal(await cursor.locator('span').count(), 0, 'a column chart has no points');
      const band = await cursor.boundingBox();
      assert.ok(Math.abs(band.width - box.width / 4) < 1 && Math.abs(band.x - (box.x + box.width / 2)) < 1, JSON.stringify(band));

      await page.mouse.move(box.x + box.width * 0.3, box.y + 10);
      assert.equal(await tooltip.innerText().then((text) => text.replace(/\s+/g, ' ').trim()), 'Feb Basic $6',
        'an empty cell is left out of the tooltip');

      await page.mouse.move(box.x + box.width / 2, box.y + box.height + 200);
      assert.equal(await tooltip.isVisible(), false);
      await plot.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      assert.match(await tooltip.innerText(), /^Jan/);
      await page.keyboard.press('End');
      assert.match(await tooltip.innerText(), /^Apr/);
      await page.keyboard.press('Escape');
      assert.equal(await tooltip.isVisible(), false);

      const rtl = await page.evaluate(() => {
        const wrap = document.createElement('div');
        wrap.dir = 'rtl';
        wrap.style.width = '400px';
        wrap.append(document.querySelector('#raised').cloneNode(true));
        document.body.append(wrap);
        const el = wrap.firstElementChild;
        el.querySelectorAll('.column-chart-plot, .column-chart-labels, .column-chart-legend').forEach((node) => node.remove());
        Expressive.ColumnChart.init(el);
        const plotBox = el.querySelector('.column-chart-plot').getBoundingClientRect();
        const first = el.querySelector('.column-chart-columns span').getBoundingClientRect();
        return first.left - plotBox.left > plotBox.width / 2;
      });
      assert.equal(rtl, true, 'the first row sits on the right in RTL');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: column chart range series float between their ends`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(`<style>${css}</style>
        <div style="width: 400px">
          ${chart('class="column-chart" id="ranges" data-max="40"', 'Ranges', '<th class="range">Range</th><th>Mean</th>', [
            ['Jan', '−10 – 10', '0'], ['Feb', '$5–$15', '10'], ['Mar', '30 to 20', '25'], ['Apr', 'n/a', '30'], ['May', '<span>5</span>', '5']])}
          ${chart('class="column-chart stacked" id="stacked-range"', 'Stacked', '<th class="range">Range</th><th>A</th><th>B</th>', [['Jan', '10–20', '5', '5']])}
          <figure class="bar-chart" id="bars"><figcaption>Bars</figcaption><table>
            <thead><tr><th>Month</th><th class="range">Range</th></tr></thead>
            <tbody><tr><th>Jan</th><td data-value="2 8">two to eight</td></tr><tr><th>Feb</th><td>4–6</td></tr></tbody>
          </table></figure>
        </div>
        <script>${js}</script>`);
      await page.evaluate(() => Expressive.AutoInit());

      const ranges = await page.locator('#ranges').evaluate((el) => {
        const chart = Expressive.ColumnChart.getInstance(el);
        const rows = [...el.querySelectorAll('.column-chart-columns > div')];
        const first = rows[0].children[0];
        return {
          values: [chart.series[0].base, chart.series[0].values],
          scale: [chart.series[0].scale.min, chart.series[0].scale.max],
          slots: rows.map((row) => row.children.length),
          spans: rows.slice(0, 3).map((row) => [row.children[0].style.getPropertyValue('--top'), row.children[0].style.getPropertyValue('--bottom')]),
          gap: rows[3].children[0].className,
          ends: getComputedStyle(first).getPropertyValue('--column-chart-ends').trim().split(/\s+/),
          tooltip: (chart.show(0), [...el.querySelectorAll('.column-chart-tooltip span')].map((span) => span.textContent)),
        };
      });
      // An en dash, a spaced hyphen with a minus sign, "to" in either order, and currency all read;
      // anything else is a gap.
      assert.deepEqual(ranges.values, [[-10, 5, 20, null, null], [10, 15, 30, null, null]]);
      assert.equal(ranges.scale[0] < -10, true, `the scale makes room for the low ends: ${ranges.scale}`);
      assert.deepEqual(ranges.slots, [2, 2, 2, 2, 2], 'a gap keeps its slot so the rows stay aligned');
      assert.equal(ranges.gap, '', 'a gap draws nothing');
      const [top, bottom] = ranges.spans[1].map(parseFloat);
      assert.ok(top > 0 && bottom > 0 && top + bottom < 100, `a range floats off zero: ${ranges.spans[1]}`);
      assert.equal(new Set(ranges.ends).size, 1, `both ends of a range are rounded: ${ranges.ends}`);
      assert.deepEqual(ranges.tooltip, ['Range', '−10 – 10', 'Mean', '0'], 'the tooltip shows the cell as written');

      const stackedRange = await page.locator('#stacked-range').evaluate((el) => Expressive.ColumnChart.getInstance(el).series.map((series) => [series.base, series.tops]));
      assert.deepEqual(stackedRange, [[[10], [20]], [[0], [5]], [[5], [10]]], 'with .stacked a range keeps its ends, and only the other series stack');

      const bars = await page.locator('#bars').evaluate((el) => Expressive.BarChart.getInstance(el).series[0].base);
      assert.deepEqual(bars, [2, 4], 'data-value gives the two ends as numbers');
    } finally {
      await browser.close();
    }
  });
}
