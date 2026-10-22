// A chart with data-watch, or the watch option, redraws itself when its
// table changes: once per batch of edits, never for its own drawing, and
// not after destroy().

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const row = ([label, ...cells]) => `<tr><th>${label}</th>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`;
const table = (header, rows) =>
  `<table><thead><tr><th>Month</th>${header}</tr></thead><tbody>${rows.map(row).join('')}</tbody></table>`;
const chart = (attrs, header, rows) => `<figure ${attrs}>
  <figcaption>Chart</figcaption>
  ${table(header, rows)}
</figure>`;

const sales = [['Jan', '10'], ['Feb', '20'], ['Mar', '30']];
const weeks = Array.from({ length: 40 }, (_, i) => `<th>Week ${i + 1}</th>`).join('');
const days = Array.from({ length: 24 }, (_, i) => [String(i + 1), String(i)]);
const html = `<style>${css}</style>
  <div style="width: 600px">
    <button id="before">Before</button>
    ${chart('class="line-chart" id="watched" data-watch', '<th>Sales</th>', sales)}
    ${chart('class="line-chart" id="plain"', '<th>Sales</th>', sales)}
    ${chart('class="line-chart toggle" id="toggle" data-watch', '<th>Sales</th><th>Target</th>', [['Jan', '1', '2'], ['Feb', '3', '4']])}
    <figure class="line-chart" id="later" data-watch><figcaption>Later</figcaption></figure>
    ${chart('class="pie-chart" id="pie"', '<th>Share</th>', [['A', '1'], ['B', '2']])}
  </div>
  <div style="width: 120px">${chart('class="line-chart" id="narrow" data-watch', '<th>Sales</th>', days)}</div>
  <div style="width: 320px">${chart('class="heatmap-chart" id="heat" data-watch', weeks, [['Mon', ...Array(40).fill('1')]])}</div>
  <script>
    // Lets the frame's observers run, label thinning's ResizeObserver included.
    window.settle = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
    // Counts update() calls, the watch's included, since it calls this.update().
    window.count = (chart) => {
      const update = chart.update.bind(chart);
      chart.redraws = 0;
      chart.update = () => (chart.redraws++, update());
      return chart;
    };
  </script>
  <script>${js}</script>`;

/** A page with the charts started and page errors collected. */
async function open(browser, start = true) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setContent(html);
  if (start) await page.evaluate(() => Expressive.AutoInit());
  return { page, errors };
}

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  browserTest(`${engine}: a watching chart redraws once per batch of table edits`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page } = await open(browser);
      const result = await page.evaluate(async () => {
        const el = document.getElementById('watched');
        const chart = count(Expressive.LineChart.getInstance(el));
        const old = el.querySelector('.line-chart-plot');
        el.querySelector('tbody tr:nth-child(2) td').textContent = '25';
        el.querySelector('tbody').insertAdjacentHTML('beforeend', '<tr><th>Apr</th><td>40</td></tr>');
        await settle();
        const batch = chart.redraws;
        chart.show(1);
        const drawn = {
          replaced: !old.isConnected && el.querySelectorAll('.line-chart-plot').length === 1,
          labels: [...el.querySelectorAll('.line-chart-labels li')].map((li) => li.textContent),
          tooltip: el.querySelector('.line-chart-tooltip').textContent,
        };

        el.querySelector('tbody td').textContent = '11';
        await settle();
        el.querySelector('tbody').insertAdjacentHTML('beforeend', '<tr><th>May</th><td>50</td></tr>');
        await settle();
        return { batch, drawn, batches: chart.redraws - batch };
      });
      assert.deepEqual(result, {
        batch: 1,
        drawn: { replaced: true, labels: ['Jan', 'Feb', 'Mar', 'Apr'], tooltip: 'FebSales25' },
        batches: 2,
      });
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a chart without the watch does not redraw by itself`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page } = await open(browser);
      const result = await page.evaluate(async () => {
        const el = document.getElementById('plain');
        const chart = count(Expressive.LineChart.getInstance(el));
        const plot = el.querySelector('.line-chart-plot');
        el.querySelector('tbody td').textContent = '99';
        el.querySelector('tbody').insertAdjacentHTML('beforeend', '<tr><th>Apr</th><td>40</td></tr>');
        await settle();
        return { redraws: chart.redraws, same: plot.isConnected, labels: el.querySelectorAll('.line-chart-labels li').length };
      });
      assert.deepEqual(result, { redraws: 0, same: true, labels: 3 });
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: data-value, header classes, text nodes and heatmap labels redraw`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page } = await open(browser);
      const result = await page.evaluate(async () => {
        const el = document.getElementById('watched');
        const chart = count(Expressive.LineChart.getInstance(el));
        el.querySelector('tbody td').dataset.value = '99';
        await settle();
        el.querySelector('thead th:nth-child(2)').classList.add('dashed');
        await settle();
        el.querySelector('tbody tr:nth-child(2) td').firstChild.data = '77';
        await settle();

        const heat = count(Expressive.HeatmapChart.getInstance(document.getElementById('heat')));
        heat.el.querySelector('thead th:nth-child(2)').dataset.label = 'W1';
        await settle();
        return {
          redraws: chart.redraws,
          values: chart.series[0].values,
          dashed: !!el.querySelector('.line-chart-series.dashed'),
          heat: heat.redraws,
        };
      });
      assert.deepEqual(result, { redraws: 3, values: [99, 77, 30], dashed: true, heat: 1 });
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a watching chart follows a replaced or added table`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page } = await open(browser);
      const result = await page.evaluate(async (fresh) => {
        const el = document.getElementById('watched');
        const chart = count(Expressive.LineChart.getInstance(el));
        const old = el.querySelector('table');
        old.insertAdjacentHTML('afterend', fresh);
        old.remove();
        await settle();
        el.querySelector('tbody td').textContent = '6';
        await settle();
        const values = chart.series[0].values;
        old.querySelector('tbody td').textContent = '1000';
        await settle();

        const later = document.getElementById('later');
        const empty = later.querySelector('.line-chart-plot');
        later.insertAdjacentHTML('beforeend', fresh);
        await settle();
        return { redraws: chart.redraws, values, empty, drawn: !!later.querySelector('.line-chart-plot') };
      }, table('<th>Sales</th>', [['Q1', '5'], ['Q2', '7']]));
      assert.deepEqual(result, { redraws: 2, values: [6, 7], empty: null, drawn: true });
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: destroy stops the watch`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, errors } = await open(browser);
      const result = await page.evaluate(async () => {
        const el = document.getElementById('watched');
        const chart = count(Expressive.LineChart.getInstance(el));
        chart.destroy();
        el.querySelector('tbody td').textContent = '5';
        el.querySelector('tbody').insertAdjacentHTML('beforeend', '<tr><th>Apr</th><td>40</td></tr>');
        await settle();
        return { redraws: chart.redraws, plots: el.querySelectorAll('.line-chart-plot').length };
      });
      assert.deepEqual(result, { redraws: 0, plots: 0 });
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a watching chart ignores its own drawing and a manual update`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page } = await open(browser);
      await page.evaluate(() => count(Expressive.LineChart.getInstance(document.getElementById('toggle'))));
      const redraws = () => page.evaluate(async () => {
        await settle();
        return Expressive.LineChart.getInstance(document.getElementById('toggle')).redraws;
      });

      await page.locator('#toggle .line-chart-plot').focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      assert.equal(await redraws(), 0, 'moving the highlight');
      assert.equal(await page.locator('#toggle').evaluate((el) => Expressive.LineChart.getInstance(el).activeIndex), 1,
        'the arrows reached the watched chart');

      const focused = await page.locator('#toggle').evaluate(async (el) => {
        el.querySelector('tbody td').textContent = '5';
        await settle();
        const chart = Expressive.LineChart.getInstance(el);
        return { redraws: chart.redraws, focused: document.activeElement === el.querySelector('.line-chart-plot'), index: chart.activeIndex };
      });
      assert.deepEqual(focused, { redraws: 1, focused: true, index: 1 }, 'a watched redraw keeps focus and the row');

      await page.locator('#toggle .chart-toggle').first().click();
      assert.equal(await redraws(), 2, 'a legend toggle redraws through its own update()');

      await page.locator('#toggle figcaption').evaluate((caption) => caption.replaceWith(caption.cloneNode(true)));
      assert.equal(await redraws(), 2, 'a replaced caption');

      await page.locator('#toggle').evaluate((el) => {
        el.querySelector('tbody td').textContent = '9';
        Expressive.LineChart.getInstance(el).update();
      });
      assert.equal(await redraws(), 3, 'an edit and a manual update() in one run');

      const narrow = await page.evaluate(async () => {
        // Started again here, so the count covers its first label thinning.
        const el = document.getElementById('narrow');
        const chart = count(Expressive.LineChart.init(el));
        await settle();
        await settle();
        const start = chart.redraws;
        el.querySelector('tbody td').textContent = '3';
        await settle();
        await settle();
        return { thinned: el.querySelector('.line-chart-labels').hasAttribute('data-thinned'), start, edit: chart.redraws - start };
      });
      assert.deepEqual(narrow, { thinned: true, start: 0, edit: 1 });
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: the watch option works without the attribute, through subclass updates`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page } = await open(browser, false);
      const result = await page.evaluate(async () => {
        const pie = count(Expressive.PieChart.init(document.getElementById('pie'), { watch: true }));
        pie.el.querySelector('tbody').insertAdjacentHTML('beforeend', '<tr><th>C</th><td>3</td></tr>');

        const el = document.getElementById('heat');
        el.removeAttribute('data-watch');
        const heat = count(Expressive.HeatmapChart.init(el, { watch: true }));
        const scroll = () => el.querySelector('.heatmap-chart-scroll');
        scroll().scrollLeft = 200;
        const left = scroll().scrollLeft;
        el.querySelector('tbody td').textContent = '9';
        await settle();
        return {
          pie: pie.redraws,
          slices: pie.el.querySelectorAll('.pie-chart-slice').length,
          heat: heat.redraws,
          scrolled: left > 0 && scroll().scrollLeft === left,
        };
      });
      assert.deepEqual(result, { pie: 1, slices: 3, heat: 1, scrolled: true });
    } finally {
      await browser.close();
    }
  });
}
