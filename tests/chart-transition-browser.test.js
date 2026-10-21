// update() moves a chart's marks from their old values to the new ones. The
// tests pause the motion and set its time, so no sample depends on the clock.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const row = ([label, ...cells]) => `<tr><th>${label}</th>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`;
const chart = (attrs, header, rows) => `<figure ${attrs} data-min="0" data-max="100">
  <figcaption>Chart</figcaption>
  <table><thead><tr><th>Month</th>${header}</tr></thead><tbody>${rows.map(row).join('')}</tbody></table>
</figure>`;

const html = `<style>${css}</style>
  <div style="width: 600px">
    ${chart('class="line-chart points" id="line"', '<th>Sales</th><th>Costs</th>', [['Jan', '20', '50'], ['Feb', '20', '50']])}
    ${chart('class="line-chart toggle" id="toggle"', '<th>Sales</th><th>Costs</th>', [['Jan', '20', '50'], ['Feb', '20', '50']])}
    ${chart('class="line-chart stacked" id="stacked"', '<th>Sales</th>', [['Jan', '20'], ['Feb', '20']])}
    ${chart('class="line-chart points" id="gap"', '<th>Sales</th>', [['Jan', '10'], ['Feb', ''], ['Mar', '30']])}
    ${chart('class="column-chart" id="column"', '<th>Sales</th>', [['Jan', '20']])}
    ${chart('class="bar-chart" id="bar"', '<th>Sales</th>', [['Jan', '20']])}
    ${chart('class="mixed-chart" id="mixed"', '<th class="column">Sales</th><th>Margin</th>', [['Jan', '20', '20'], ['Feb', '20', '20']])}
  </div>
  <script>${js}</script>`;

/** The y of each "x,y" pair in path data. */
const ys = (d) => [...d.matchAll(/-?[\d.]+,(-?[\d.]+)/g)].map((match) => Math.round(Number(match[1]) * 100) / 100);

async function open(browser, reducedMotion = 'no-preference') {
  const page = await browser.newPage();
  await page.emulateMedia({ reducedMotion });
  await page.setContent(html);
  await page.evaluate(() => Expressive.AutoInit());
  return page;
}

/**
 * Sets a column or bar chart's first cell to 80, updates it, and reads each
 * span's clip-path insets with its transition paused at each time, in ms.
 */
const sampleColumns = async (el, times) => {
  el.querySelector('tbody td').textContent = '80';
  Expressive.ColumnChart.getInstance(el)?.update();
  Expressive.BarChart.getInstance(el)?.update();
  const span = el.querySelector(':is(.column-chart-columns, .bar-chart-bars) span');
  const motion = el.getAnimations({ subtree: true });
  const insets = () => getComputedStyle(span).clipPath.match(/-?[\d.]+(?=%|px)/g).slice(0, 4).map(Number);
  return {
    animations: motion.length,
    samples: times.map((time) => {
      motion.forEach((animation) => { animation.pause(); animation.currentTime = time; });
      return insets();
    }),
  };
};

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  browserTest(`${engine}: update moves a line, its area and its points from the old shape`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await open(browser);
      const result = await page.locator('#line').evaluate(async (el) => {
        el.querySelectorAll('tbody td:nth-child(2)').forEach((td) => { td.textContent = '80'; });
        Expressive.LineChart.getInstance(el).update();
        const svg = el.querySelector('.line-chart-plot svg');
        svg.pauseAnimations();
        const [first, second] = el.querySelectorAll('.line-chart-series');
        const line = first.querySelector('.line-chart-line');
        const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const at = async (time) => {
          svg.setCurrentTime(time);
          await frame();
          return Math.round(line.getBBox().y * 100) / 100;
        };
        const motion = [...first.querySelectorAll('animate')];
        return {
          paths: motion.map((animate) => animate.parentElement.getAttribute('class')),
          timing: motion.map((animate) => [animate.getAttribute('attributeName'), animate.getAttribute('dur'), animate.getAttribute('keySplines').replace(/\s+/g, '')]),
          unchanged: second.querySelectorAll('animate').length,
          samples: [await at(0), await at(0.2), await at(1)],
        };
      });
      assert.deepEqual(result.paths, ['line-chart-area', 'line-chart-line', 'line-chart-points']);
      assert.deepEqual(result.timing, Array(3).fill(['d', '400ms', '0.2,0,0,1']));
      assert.equal(result.unchanged, 0, 'a series that did not change does not move');
      const [start, middle, end] = result.samples;
      assert.equal(start, 80, 'the line starts at the old values');
      assert.ok(middle > 20 && middle < 80, `mid-transition the line is between the shapes, at ${middle}`);
      assert.equal(end, 20, 'the line ends at the new values');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: with reduced motion update draws the new line at once`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await open(browser, 'reduce');
      const result = await page.locator('#line').evaluate((el) => {
        el.querySelectorAll('tbody td:nth-child(2)').forEach((td) => { td.textContent = '80'; });
        Expressive.LineChart.getInstance(el).update();
        return [el.querySelectorAll('animate').length, Math.round(el.querySelector('.line-chart-line').getBBox().y)];
      });
      assert.deepEqual(result, [0, 20]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a series or value new to the drawing grows from its base`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await open(browser);
      const toggle = page.locator('#toggle .chart-toggle').nth(1);
      await toggle.click();
      const hidden = await page.locator('#toggle .line-chart-series').count();
      await toggle.click();
      const shown = await page.locator('#toggle .line-chart-series').nth(1).evaluate((group) =>
        group.querySelector('.line-chart-line animate').getAttribute('from'));
      assert.equal(hidden, 1, 'a hidden series goes at once');
      assert.deepEqual([...new Set(ys(shown))], [100], 'a series shown again rises from the plot bottom');

      const stacked = await page.locator('#stacked').evaluate((el) => {
        el.querySelector('thead tr').insertAdjacentHTML('beforeend', '<th>Costs</th>');
        el.querySelectorAll('tbody tr').forEach((tr) => tr.insertAdjacentHTML('beforeend', '<td>10</td>'));
        Expressive.LineChart.getInstance(el).update();
        const [below, added] = el.querySelectorAll('.line-chart-series');
        return {
          below: below.querySelectorAll('animate').length,
          from: added.querySelector('.line-chart-line animate').getAttribute('from'),
          to: added.querySelector('.line-chart-line').getAttribute('d'),
        };
      });
      assert.equal(stacked.below, 0);
      assert.deepEqual([...new Set(ys(stacked.from))], [80], 'a stacked series starts on the series below');
      assert.deepEqual([...new Set(ys(stacked.to))], [70]);

      const gap = await page.locator('#gap').evaluate((el) => {
        const chart = Expressive.LineChart.getInstance(el);
        el.querySelector('tbody tr:nth-child(2) td').textContent = '20';
        chart.update();
        const from = el.querySelector('.line-chart-points animate').getAttribute('from');
        el.querySelector('tbody tr:nth-child(3)').remove();
        chart.update();
        const points = el.querySelector('.line-chart-points');
        return { from, after: points.getAttribute('d'), afterFrom: points.querySelector('animate')?.getAttribute('from') ?? null };
      });
      assert.deepEqual(ys(gap.from), [90, 100, 70], 'a value that fills a gap rises from the plot bottom');
      assert.deepEqual(ys(gap.after), [90, 80], 'a removed row goes at once');
      assert.equal(gap.afterFrom, null, 'the rows left take their new places at once');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: update moves columns and bars from their old values`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await open(browser);
      const column = await page.locator('#column').evaluate(sampleColumns, [0, 200]);
      assert.equal(column.animations, 1);
      const [[startTop], [middleTop]] = column.samples;
      assert.equal(startTop, 80, 'the column starts at its old top');
      assert.ok(middleTop > 20 && middleTop < 80, `mid-transition the column top is between, at ${middleTop}`);

      const bar = await page.locator('#bar').evaluate(sampleColumns, [0, 200]);
      assert.equal(bar.animations, 1);
      const [[, startRight], [, middleRight]] = bar.samples;
      assert.equal(startRight, 80, 'the bar starts at its old end');
      assert.ok(middleRight > 20 && middleRight < 80, `mid-transition the bar end is between, at ${middleRight}`);

      const added = await page.locator('#column').evaluate((el) => {
        el.querySelector('tbody').insertAdjacentHTML('beforeend', '<tr><th>Feb</th><td>50</td></tr>');
        Expressive.ColumnChart.getInstance(el).update();
        const span = el.querySelectorAll('.column-chart-columns span')[1];
        return [span.style.getPropertyValue('--from-top'), span.style.getPropertyValue('--from-bottom')];
      });
      assert.deepEqual(added, ['100%', '0%'], 'a new row\'s column starts collapsed at the zero line');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a mixed chart moves its columns and lines together`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await open(browser);
      const result = await page.locator('#mixed').evaluate((el) => {
        el.querySelectorAll('tbody td').forEach((td) => { td.textContent = '80'; });
        Expressive.MixedChart.getInstance(el).update();
        const span = el.querySelector('.mixed-chart-columns span');
        const animate = el.querySelector('.mixed-chart-line animate');
        return {
          column: [span.style.getPropertyValue('--from-top'), span.getAnimations().length],
          line: [animate.getAttribute('from'), animate.getAttribute('to')],
        };
      });
      assert.deepEqual(result.column, ['80%', 1], 'the column moves from its old top');
      assert.deepEqual([...new Set(ys(result.line[0]))], [80], 'the line moves from its old values');
      assert.deepEqual([...new Set(ys(result.line[1]))], [20]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: with reduced motion update draws the new columns at once`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await open(browser, 'reduce');
      const column = await page.locator('#column').evaluate(sampleColumns, []);
      const top = await page.locator('#column .column-chart-columns span').evaluate((span) => parseFloat(getComputedStyle(span).clipPath.slice(6)));
      assert.deepEqual([column.animations, top], [0, 20]);
    } finally {
      await browser.close();
    }
  });
}
