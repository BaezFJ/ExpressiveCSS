import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

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
    ${chart('class="bar-chart" id="plans" data-max="10"', 'Plans', '<th>Basic</th><th>Premium</th>', [
      ['Jan', '$4', '$2'], ['Feb', '$6', ''], ['Mar', '$5', '$8'], ['Apr', '$1', '$3']])}
    ${chart('class="bar-chart stacked" id="stacked" data-max="10"', 'Stacked', '<th>A</th><th>B</th>', [['Jan', '1', '2']])}
    ${chart('class="bar-chart stacked split" id="split" data-max="10"', 'Split', '<th>A</th><th>B</th>', [['Jan', '4', '2']])}
    ${chart('class="bar-chart values" id="profit"', 'Profit', '<th>Profit</th>', [['Jan', '4'], ['Feb', '−4']])}
    ${chart('class="bar-chart sparkline" id="spark"', 'Spark', '<th>V</th>', [['Jan', '1'], ['Feb', '2']])}
    ${chart('class="bar-chart track values" id="short" data-max="100"', 'Short', '<th>V</th>', [['Big', '90'], ['Small', '1']])}
    <div style="direction: rtl">${chart('class="bar-chart" id="css-rtl" data-max="10"', 'CSS RTL', '<th>V</th>', [['Jan', '4']])}</div>
    ${chart('class="column-chart" id="column"', 'Column', '<th>V</th>', [['Jan', '1'], ['Feb', '2']])}
  </div>
  <script>${js}</script>`;

// Each row's bars as [series, space before %, space after %] from the
// computed clip-path, left to right, to a tenth of a percent.
const bars = (el) => [...el.querySelectorAll('.bar-chart-bars > div')].map((row) => [...row.children].map((span) => {
  const box = getComputedStyle(span).clipPath.match(/^inset\((.*?)(?: round .*)?\)$/)[1];
  const values = box.match(/calc\([^)]*\)|\S+/g).map((value) => Math.round(parseFloat(value.replace('calc(', '')) * 10) / 10);
  const [, right = values[0], , left = right] = values;
  return [span.dataset.series ?? '', left, right];
}));
const ends = (el) => [...el.querySelectorAll('.bar-chart-bars span')].map((span) =>
  getComputedStyle(span).clipPath.match(/round (.*)\)$/)?.[1].replace(/\b0px/g, '0') ?? 'none');

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  browserTest(`${engine}: bar chart draws grouped, stacked and negative bars from its table`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      const plans = await page.locator('#plans').evaluate((el) => {
        const plot = el.querySelector('.bar-chart-plot');
        const labels = el.querySelector('.bar-chart-labels');
        return {
          table: getComputedStyle(el.querySelector('table')).position,
          plot: [plot.tabIndex, plot.getAttribute('aria-label'), plot.getAttribute('aria-roledescription')],
          hidden: el.querySelector('.bar-chart-bars').getAttribute('aria-hidden'),
          labels: [...labels.children].map((li) => li.textContent),
          legend: [...el.querySelectorAll('.bar-chart-legend li')].map((li) => li.textContent),
          instance: [!!Expressive.BarChart.getInstance(el), !!Expressive.ColumnChart.getInstance(el)],
          height: plot.getBoundingClientRect().height,
          beside: labels.getBoundingClientRect().right <= plot.getBoundingClientRect().left
            && Math.abs(labels.getBoundingClientRect().top - plot.getBoundingClientRect().top) < 1,
          values: el.querySelectorAll('.bar-chart-values').length,
        };
      });
      assert.equal(plans.table, 'absolute', 'the table is visually hidden');
      assert.deepEqual(plans.plot, [0, 'Plans', 'bar chart']);
      assert.equal(plans.hidden, 'true', 'the drawn bars are hidden; the table carries the data');
      assert.deepEqual(plans.labels, ['Jan', 'Feb', 'Mar', 'Apr']);
      assert.deepEqual(plans.legend, ['Basic', 'Premium']);
      assert.deepEqual(plans.instance, [true, false], 'a bar chart is not a column chart instance');
      assert.equal(plans.height, 160, 'four 40px rows');
      assert.equal(plans.beside, true, 'the labels sit before the plot, level with it');
      assert.equal(plans.values, 0, 'values are written only with .values');
      // Zero to data-max 10 from the left; a gap keeps its slot so the series stay aligned.
      assert.deepEqual(await page.locator('#plans').evaluate(bars), [
        [['1', 0, 60], ['2', 0, 80]],
        [['1', 0, 40], ['', 0, 100]],
        [['1', 0, 50], ['2', 0, 20]],
        [['1', 0, 90], ['2', 0, 70]],
      ]);
      assert.equal((await page.locator('#plans').evaluate(ends))[0], '0 4px 4px 0', 'a bar rounds its right end');
      assert.equal(await page.getByRole('table').first().getByRole('cell', { name: '$4' }).count(), 1,
        'the hidden table stays in the accessibility tree');

      // Each segment starts at the total before it; only the last rounds its end.
      assert.deepEqual(await page.locator('#stacked').evaluate(bars), [[['1', 0, 90], ['2', 10, 70]]]);
      assert.deepEqual(await page.locator('#stacked').evaluate(ends), ['none', '0 4px 4px 0']);
      // Split segments round each joint and stand 2px back from it; the
      // stack's outer ends stay on zero and the total.
      assert.deepEqual(await page.locator('#split').evaluate(ends), ['0 4px 4px 0', '4px']);
      const split = await page.locator('#split').evaluate((el) => [...el.querySelectorAll('.bar-chart-bars span')]
        .map((span) => getComputedStyle(span).clipPath));
      assert.match(split[0], /^inset\(0px calc\(60% \+ 2px\) 0px (calc\()?0%( \+ 0px\))? /, split[0]);
      assert.match(split[1], /^inset\(0px (calc\()?40%( \+ 0px\))? 0px calc\(40% \+ 2px\) /, split[1]);

      // Zero is in the middle; a negative bar grows left and rounds its left end.
      const profit = await page.locator('#profit').evaluate((el) => ({
        negative: [...el.querySelectorAll('.bar-chart-bars span')].map((span) => span.classList.contains('negative')),
        values: [...el.querySelectorAll('.bar-chart-values span')].map((span) => [span.textContent, getComputedStyle(span).textAlign]),
      }));
      assert.deepEqual(await page.locator('#profit').evaluate(bars), [[['1', 50, 8.3]], [['1', 8.3, 50]]]);
      assert.deepEqual(await page.locator('#profit').evaluate(ends), ['0 4px 4px 0', '4px 0 0 4px']);
      assert.deepEqual(profit.negative, [false, true]);
      assert.deepEqual(profit.values, [['4', 'left'], ['−4', 'right']], 'values write the cell text from each base');

      // A value longer than its bar runs on past the bar's end, unclipped.
      const short = await page.locator('#short').evaluate((el) => [...el.querySelectorAll('.bar-chart-values span')].map((span) => {
        const range = document.createRange();
        range.selectNodeContents(span);
        const text = range.getBoundingClientRect();
        const box = span.getBoundingClientRect();
        const barEnd = box.left + box.width * (1 - parseFloat(span.style.getPropertyValue('--top')) / 100);
        return [Math.round(text.width) > 0, text.right > barEnd, getComputedStyle(span).clipPath];
      }));
      assert.deepEqual(short, [[true, false, 'none'], [true, true, 'none']]);
      assert.equal(await page.locator('#column .column-chart-columns span').first().getAttribute('data-text'), null,
        'column charts carry no value text');

      // In RTL the labels sit on the right and the bars grow leftwards.
      const rtl = await page.evaluate(() => {
        const wrap = document.createElement('div');
        wrap.dir = 'rtl';
        wrap.style.width = '400px';
        wrap.append(document.querySelector('#profit').cloneNode(true));
        document.body.append(wrap);
        const el = wrap.firstElementChild;
        el.id = 'profit-rtl';
        el.querySelectorAll('.bar-chart-plot, .bar-chart-labels, .bar-chart-legend').forEach((node) => node.remove());
        Expressive.BarChart.init(el);
        return el.querySelector('.bar-chart-labels').getBoundingClientRect().left >= el.querySelector('.bar-chart-plot').getBoundingClientRect().right;
      });
      assert.equal(rtl, true, 'the labels sit on the right in RTL');
      assert.deepEqual(await page.locator('#profit-rtl').evaluate(bars), [[['1', 8.3, 50]], [['1', 50, 8.3]]]);
      assert.deepEqual(await page.locator('#profit-rtl').evaluate(ends), ['4px 0 0 4px', '0 4px 4px 0']);
      assert.deepEqual(await page.locator('#profit-rtl').evaluate((el) =>
        [...el.querySelectorAll('.bar-chart-values span')].map((span) => getComputedStyle(span).textAlign)), ['right', 'left']);
      // RTL from CSS `direction` alone, without a dir attribute, flips the bars too.
      assert.deepEqual(await page.locator('#css-rtl').evaluate(bars), [[['1', 60, 0]]]);

      const spark = await page.locator('#spark').evaluate((el) => [
        el.querySelector('.bar-chart-plot').hasAttribute('tabindex'),
        getComputedStyle(el.querySelector('.bar-chart-labels')).display,
        getComputedStyle(el.querySelector('.bar-chart-plot')).height,
      ]);
      assert.deepEqual(spark, [false, 'none', '48px'], 'two 24px rows');
      assert.equal(await page.locator('#column .column-chart-plot').getAttribute('aria-roledescription'), 'column chart');

      await page.emulateMedia({ forcedColors: 'active' });
      assert.equal(await page.locator('#stacked .bar-chart-plot').evaluate((plot) => getComputedStyle(plot).backgroundImage), 'none',
        'forced colors clear the grid');
      await page.emulateMedia({ forcedColors: 'none' });

      await page.evaluate(() => Expressive.BarChart.getInstance(document.querySelector('#plans')).destroy());
      assert.deepEqual(await page.locator('#plans').evaluate((el) => [
        el.querySelectorAll('.bar-chart-plot, .bar-chart-labels, .bar-chart-legend').length,
        getComputedStyle(el.querySelector('table')).clipPath,
        el.Expressive_BarChart,
      ]), [0, 'none', undefined]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: bar chart tooltip and band follow the pointer and the up and down arrows`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      const plot = page.locator('#plans .bar-chart-plot');
      const tooltip = page.locator('#plans .bar-chart-tooltip');
      const cursor = page.locator('#plans .bar-chart-cursor');
      const box = await plot.boundingBox();
      const text = () => tooltip.innerText().then((value) => value.replace(/\s+/g, ' ').trim());

      await page.mouse.move(box.x + 10, box.y + box.height * 0.6);
      assert.equal(await text(), 'Mar Basic $5 Premium $8');
      const band = await cursor.boundingBox();
      assert.ok(Math.abs(band.height - box.height / 4) < 1 && Math.abs(band.y - (box.y + box.height / 2)) < 1, JSON.stringify(band));
      assert.equal(await tooltip.evaluate((el) => el.classList.contains('end')), true, 'the tooltip sits above a row in the lower half');

      await page.mouse.move(box.x + 10, box.y + box.height * 0.3);
      assert.equal(await text(), 'Feb Basic $6', 'an empty cell is left out of the tooltip');
      assert.equal(await tooltip.evaluate((el) => el.classList.contains('end')), false);

      await page.mouse.move(box.x + box.width / 2, box.y + box.height + 200);
      assert.equal(await tooltip.isVisible(), false);
      await plot.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      assert.match(await text(), /^Jan/);
      await page.keyboard.press('ArrowDown');
      assert.match(await text(), /^Feb/);
      await page.keyboard.press('ArrowUp');
      assert.match(await text(), /^Jan/);
      await page.keyboard.press('End');
      assert.match(await text(), /^Apr/);
      await page.keyboard.press('Escape');
      assert.equal(await tooltip.isVisible(), false);

      // Rows keep their order in RTL: the first is still at the top.
      await page.evaluate(() => {
        const wrap = document.createElement('div');
        wrap.dir = 'rtl';
        wrap.style.width = '400px';
        wrap.append(document.querySelector('#plans').cloneNode(true));
        document.body.append(wrap);
        const el = wrap.firstElementChild;
        el.id = 'plans-rtl';
        el.querySelectorAll('.bar-chart-plot, .bar-chart-labels, .bar-chart-legend').forEach((node) => node.remove());
        Expressive.BarChart.init(el);
      });
      await page.locator('#plans-rtl .bar-chart-plot').scrollIntoViewIfNeeded();
      const rtlBox = await page.locator('#plans-rtl .bar-chart-plot').boundingBox();
      await page.mouse.move(rtlBox.x + rtlBox.width - 10, rtlBox.y + 10);
      assert.match(await page.locator('#plans-rtl .bar-chart-tooltip').innerText(), /^Jan/);

      // A tap picks the row under the finger in both chart types, and the row
      // stays when the finger lifts. A scroll taking the touch hides it.
      const tapPage = await (await browser.newContext({ hasTouch: true })).newPage();
      await tapPage.setContent(html);
      await tapPage.evaluate(() => Expressive.AutoInit());
      for (const [type, x, y, row] of [['bar-chart', 0.5, 0.9, /^Apr/], ['column-chart', 0.9, 0.5, /^Feb/]]) {
        const figure = type === 'bar-chart' ? '#plans' : '#column';
        const tapPlot = tapPage.locator(`${figure} .${type}-plot`);
        const tapTooltip = tapPage.locator(`${figure} .${type}-tooltip`);
        await tapPlot.scrollIntoViewIfNeeded();
        const tapBox = await tapPlot.boundingBox();
        await tapPage.touchscreen.tap(tapBox.x + tapBox.width * x, tapBox.y + tapBox.height * y);
        assert.match(await tapTooltip.innerText(), row, `${type} shows the tapped row`);
        await tapPlot.dispatchEvent('pointerleave', { pointerType: 'touch' });
        assert.equal(await tapTooltip.isVisible(), true, `${type} keeps the row after the finger lifts`);
        await tapPlot.dispatchEvent('pointercancel', { pointerType: 'touch' });
        assert.equal(await tapTooltip.isVisible(), false, `${type} hides the row when the page scrolls`);
      }
    } finally {
      await browser.close();
    }
  });
}
