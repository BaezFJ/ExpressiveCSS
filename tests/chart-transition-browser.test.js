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
}
