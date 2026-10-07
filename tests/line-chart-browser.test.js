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
    <tbody>${rows.map(([label, ...cells]) => `<tr><th>${label}</th>${cells.map((cell) => cell.startsWith('<td') ? cell : `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</figure>`;

const html = `<style>${css}</style>
  <div style="width: 600px">
    ${chart('class="line-chart" id="plans"', 'Plans', '<th>This year</th><th class="dashed">Target</th>', [
      ['Jan', '$4,400', '$5,200'], ['Feb', '$3,400', '$5,400'], ['Mar', '$3,700', '$5,100'], ['Apr', '$4,900', '$5,000']])}
    ${chart('class="line-chart area" id="gaps" data-min="0" data-max="100"', 'Gaps', '<th>Value</th>', [
      ['Jan', '10'], ['Feb', '90'], ['Mar', ''], ['Apr', '<td data-value="50">half</td>'], ['May', '−10']])}
    ${chart('class="line-chart sparkline" id="spark"', 'Spark', '<th>Value</th>', [['Jan', '1'], ['Feb', '2']])}
  </div>
  <script>${js}</script>`;

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  browserTest(`${engine}: line chart draws its table, keeps it readable and restores it on destroy`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      const plans = await page.locator('#plans').evaluate((el) => {
        const table = getComputedStyle(el.querySelector('table'));
        return {
          table: [table.position, table.clipPath],
          svgHidden: el.querySelector('svg').getAttribute('aria-hidden'),
          series: [...el.querySelectorAll('.line-chart-series')].map((g) => [g.getAttribute('class'), g.dataset.series]),
          labels: [...el.querySelectorAll('.line-chart-labels li')].map((li) => li.textContent),
          legend: [...el.querySelectorAll('.line-chart-legend li')].map((li) => li.textContent),
          dash: getComputedStyle(el.querySelector('.dashed .line-chart-line')).strokeDasharray,
          area: getComputedStyle(el.querySelector('.line-chart-area')).display,
          plot: [el.querySelector('.line-chart-plot').tabIndex, el.querySelector('.line-chart-plot').getAttribute('aria-label')],
        };
      });
      assert.deepEqual(plans.table, ['absolute', 'inset(50%)'], 'the table is visually hidden');
      assert.equal(plans.svgHidden, 'true');
      assert.deepEqual(plans.series, [['line-chart-series', '1'], ['line-chart-series dashed', '2']]);
      assert.deepEqual(plans.labels, ['Jan', 'Feb', 'Mar', 'Apr']);
      assert.deepEqual(plans.legend, ['This year', 'Target']);
      assert.notEqual(plans.dash, 'none');
      assert.equal(plans.area, 'none');
      assert.deepEqual(plans.plot, [0, 'Plans']);
      assert.equal(await page.getByRole('table').first().getByRole('cell', { name: '$4,400' }).count(), 1,
        'the hidden table stays in the accessibility tree');

      // The curve never overshoots its highest or lowest point.
      const overshoot = await page.locator('#plans .line-chart-series').first().evaluate((g) => {
        const box = g.querySelector('.line-chart-line').getBBox();
        return [box.y, box.y + box.height];
      });
      // Both series set the scale: 3400 to 5400, padded by 200 each way.
      const y = (value) => 100 - ((value - 3200) / 2400) * 100;
      assert.ok(Math.abs(overshoot[0] - y(4900)) < 0.01 && Math.abs(overshoot[1] - y(3400)) < 0.01, `${overshoot}`);

      const gaps = await page.locator('#gaps').evaluate((el) => ({
        line: el.querySelector('.line-chart-line').getAttribute('d'),
        area: getComputedStyle(el.querySelector('.line-chart-area')).display,
        legend: el.querySelector('.line-chart-legend'),
      }));
      assert.equal(gaps.line.match(/M/g).length, 2, 'an empty cell breaks the line');
      assert.match(gaps.line, /^M10,90C.*,10M70,50C.*,110$/, 'data-min, data-max, data-value and a typographic minus set the points');
      assert.equal(gaps.area, 'inline');
      assert.equal(gaps.legend, null, 'one series has no legend');

      const spark = await page.locator('#spark').evaluate((el) => [
        el.querySelector('.line-chart-plot').hasAttribute('tabindex'),
        getComputedStyle(el.querySelector('.line-chart-labels')).display,
        getComputedStyle(el.querySelector('.line-chart-plot')).height,
      ]);
      assert.deepEqual(spark, [false, 'none', '48px']);

      await page.evaluate(() => Expressive.LineChart.getInstance(document.querySelector('#plans')).destroy());
      assert.deepEqual(await page.locator('#plans').evaluate((el) => [
        el.querySelectorAll('.line-chart-plot, .line-chart-labels, .line-chart-legend').length,
        getComputedStyle(el.querySelector('table')).clipPath,
      ]), [0, 'none']);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: line chart tooltip follows the pointer and the arrow keys`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      const plot = page.locator('#plans .line-chart-plot');
      const tooltip = page.locator('#plans .line-chart-tooltip');
      const box = await plot.boundingBox();

      await page.mouse.move(box.x + box.width * 0.6, box.y + 10);
      assert.equal(await tooltip.isVisible(), true);
      assert.equal(await tooltip.innerText().then((text) => text.replace(/\s+/g, ' ').trim()), 'Mar This year $3,700 Target $5,100');
      assert.equal(await tooltip.getAttribute('aria-live'), 'polite');
      assert.equal(await page.locator('#plans .line-chart-cursor > span').count(), 2);
      assert.equal(await tooltip.evaluate((el) => el.classList.contains('end')), true, 'right of centre flips the tooltip');

      await page.mouse.move(box.x + box.width / 2, box.y + box.height + 200);
      assert.equal(await tooltip.isVisible(), false);

      await plot.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      assert.match(await tooltip.innerText(), /^Jan/);
      await page.keyboard.press('ArrowRight');
      assert.match(await tooltip.innerText(), /^Feb/);
      await page.keyboard.press('End');
      assert.match(await tooltip.innerText(), /^Apr/);
      await page.keyboard.press('ArrowRight');
      assert.match(await tooltip.innerText(), /^Apr/);
      await page.keyboard.press('Home');
      assert.match(await tooltip.innerText(), /^Jan/);
      await page.keyboard.press('Escape');
      assert.equal(await tooltip.isVisible(), false);
      await page.keyboard.press('ArrowRight');
      assert.match(await tooltip.innerText(), /^Jan/);
    } finally {
      await browser.close();
    }
  });
  browserTest(`${engine}: line chart handles cards, headerless tables, RTL, strict values and forced colors`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const rows = [['Jan', '1'], ['Feb', '5'], ['Mar', '3']];
      await page.setContent(`<style>${css}</style>
        <div style="width: 500px">
          <article class="medium" id="card">${chart('class="line-chart"', 'Card', '<th>V</th>', rows)}</article>
          <article id="action"><div class="primary-action">${chart('class="line-chart"', 'Action', '<th>V</th>', rows)}</div></article>
          <figure class="line-chart" id="headless"><figcaption>Headless</figcaption><table>
            <tr><th>Month</th><th>V</th></tr><tr><th>Jan</th><td>1</td></tr><tr><th>Feb</th><td>2</td></tr></table></figure>
          <div dir="rtl">${chart('class="line-chart" id="rtl"', 'RTL', '<th>V</th>', rows)}</div>
          ${chart('class="line-chart" id="strict"', 'Strict', '<th>V</th>', [
            ['A', '(1,200)'], ['B', '3–5'], ['C', '5 of 10'], ['D', '4.4k'], ['E', '−$1,200.5'], ['F', '12%'], ['G', '1,2,3']])}
          ${chart('class="line-chart" id="empty"', 'Empty', '<th>V</th>', [['A', 'n/a']])}
          ${chart('class="line-chart" id="pair"', 'Pair', '<th>A</th><th>B</th>', [['Jan', '1', '2'], ['Feb', '3', '4']])}
          ${chart('class="line-chart stacked" id="stacked" data-max="10"', 'Stacked', '<th>A</th><th>B</th>', [['Jan', '1', '2'], ['Feb', '3', '4']])}
          ${chart('class="line-chart stacked" id="stacked-min" data-min="50"', 'Stacked min', '<th>A</th>', [['Jan', '60'], ['Feb', '100']])}
          ${chart('class="line-chart stacked" id="stacked-gap"', 'Stacked gap', '<th>A</th><th>B</th>', [['Jan', '1', '2'], ['Feb', '', '2'], ['Mar', '3', '2']])}
        </div>
        <script>${js}</script>`);
      await page.evaluate(() => Expressive.AutoInit());

      // A chart in a card is not card media, whatever the card's size.
      assert.deepEqual(await page.locator('#card figure').evaluate((el) => {
        const style = getComputedStyle(el);
        return [style.overflow, style.flexBasis, el.querySelector('.line-chart-plot').getBoundingClientRect().height];
      }), ['visible', 'auto', 240]);
      assert.equal(await page.locator('#action figcaption').evaluate((el) => getComputedStyle(el).position), 'static');

      assert.equal(await page.locator('#headless .line-chart-labels').innerText().then((text) => text.split(/\s+/).join(' ')), 'Jan Feb',
        'a header row without <thead> is not data');

      // RTL: Jan sits at the right under its label, and ArrowLeft moves forward in time.
      const rtl = await page.locator('#rtl').evaluate((el) => {
        const box = el.querySelector('.line-chart-plot').getBoundingClientRect();
        const label = el.querySelector('.line-chart-labels li').getBoundingClientRect();
        return [Math.round(((label.left + label.width / 2 - box.left) / box.width) * 100),
          Math.round(Number(el.querySelector('.line-chart-line').getAttribute('d').match(/^M([\d.]+)/)[1]))];
      });
      assert.deepEqual(rtl, [83, 83]);
      const rtlPlot = page.locator('#rtl .line-chart-plot');
      await rtlPlot.scrollIntoViewIfNeeded();
      const rtlBox = await rtlPlot.boundingBox();
      await page.mouse.move(rtlBox.x + rtlBox.width * 0.9, rtlBox.y + 10);
      assert.match(await page.locator('#rtl .line-chart-tooltip').innerText(), /^Jan/);
      await page.mouse.move(0, 0);
      await rtlPlot.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('ArrowLeft');
      assert.match(await page.locator('#rtl .line-chart-tooltip').innerText(), /^Feb/);

      // Only a single number counts; anything else is a gap.
      assert.deepEqual(await page.evaluate(() => Expressive.LineChart.getInstance(document.querySelector('#strict')).series[0].values),
        [null, null, null, null, -1200.5, 12, null]);

      assert.equal(await page.evaluate(() => {
        const chart = Expressive.LineChart.getInstance(document.querySelector('#empty'));
        chart.show(0);
        return [chart.activeIndex, document.querySelectorAll('#empty .line-chart-plot').length].join();
      }), '-1,0', 'show() on a chart without data does nothing');

      // Showing the same row again leaves the live tooltip alone.
      assert.equal(await page.evaluate(() => {
        const chart = Expressive.LineChart.getInstance(document.querySelector('#pair'));
        chart.show(1);
        let mutations = 0;
        new MutationObserver((records) => { mutations += records.length; })
          .observe(document.querySelector('#pair .line-chart-tooltip'), { childList: true, subtree: true, attributes: true });
        chart.show(1);
        return new Promise((resolve) => setTimeout(() => resolve(mutations)));
      }), 0);

      // Each stacked series sits on the total below it and fills down to it.
      const stacked = await page.locator('#stacked').evaluate((el) => {
        const chart = Expressive.LineChart.getInstance(el);
        chart.show(1);
        return {
          areas: [...el.querySelectorAll('.line-chart-area')].map((area) => [getComputedStyle(area).display, area.getAttribute('d')]),
          line: el.querySelectorAll('.line-chart-line')[1].getAttribute('d'),
          dots: [...el.querySelectorAll('.line-chart-cursor > span')].map((dot) => dot.style.top),
          tooltip: el.querySelector('.line-chart-tooltip').textContent,
        };
      });
      assert.deepEqual(stacked.areas.map(([display]) => display), ['inline', 'inline']);
      assert.match(stacked.areas[0][1], /^M25,90C.*,70L75,100C.*25,100Z$/, 'the bottom series fills to zero');
      assert.match(stacked.areas[1][1], /^M25,70C.*,30L75,70C.*25,90Z$/, 'the next series fills to the one below');
      assert.match(stacked.line, /^M25,70C.*75,30$/);
      assert.deepEqual(stacked.dots, ['70%', '30%']);
      assert.equal(stacked.tooltip, 'FebA3B4', 'the tooltip keeps each cell, not the total');

      const gap = await page.locator('#stacked-gap').evaluate((el) => {
        const chart = Expressive.LineChart.getInstance(el);
        chart.show(1);
        const atGap = [el.querySelectorAll('.line-chart-cursor > span').length, el.querySelector('.line-chart-tooltip').textContent];
        chart.show(2);
        const dots = [...el.querySelectorAll('.line-chart-cursor > span')].map((dot) => parseFloat(dot.style.top));
        const runs = el.querySelectorAll('.line-chart-line')[1].getAttribute('d').match(/M/g).length;
        // A y axis above zero clips the bottom band's base to the plot.
        const ys = [...Expressive.LineChart.init(el, { min: 1 }).el.querySelectorAll('.line-chart-area')]
          .flatMap((area) => [...area.getAttribute('d').matchAll(/,(-?[\d.]+)/g)].map((match) => Number(match[1])));
        return { atGap, dots, runs, lowest: Math.max(...ys) };
      });
      assert.deepEqual(gap.atGap, [0, 'FebB2'], 'a gap leaves the total above it unknown');
      assert.equal(gap.runs, 2, 'the series above a gap breaks there too');
      // Totals run 0 to 5, with 10% of that span above.
      assert.ok(Math.abs(gap.dots[0] - (100 - 300 / 5.5)) < 0.01 && Math.abs(gap.dots[1] - (100 - 500 / 5.5)) < 0.01, `${gap.dots}`);
      assert.ok(gap.lowest <= 100, `area below the plot: ${gap.lowest}`);
      // With data-min, the headroom is 10% of the span from it: 50 to 105.
      assert.match(await page.locator('#stacked-min .line-chart-line').getAttribute('d'), /,9\.09\d*$/);

      // WebKit does not emulate forced colors.
      if (engine !== 'webkit') {
        await page.emulateMedia({ forcedColors: 'active' });
        const swatches = await page.locator('#pair').evaluate((el) => [
          ...el.querySelectorAll('.line-chart-legend li'),
          el.querySelector('.line-chart-tooltip > span'),
        ].map((node) => getComputedStyle(node, '::before').backgroundColor)
          .concat(getComputedStyle(el.querySelector('.line-chart-cursor > span')).backgroundColor)
          .concat([...el.querySelectorAll('.line-chart-line')].map((line) => getComputedStyle(line).stroke)));
        assert.equal(new Set(swatches.slice(0, 2)).size, 2, `series swatches stay distinct: ${swatches}`);
        assert.equal(swatches[0], swatches[4], 'the legend swatch matches its line');
        assert.equal(swatches[2], swatches[4], 'the tooltip swatch matches its line');
        assert.equal(swatches[3], swatches[4], 'the cursor point matches its line');
      }
    } finally {
      await browser.close();
    }
  });
}
