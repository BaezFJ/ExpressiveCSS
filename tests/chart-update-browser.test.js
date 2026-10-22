// update() redraws a chart from its changed table in place: keyboard focus
// and the highlighted row carry over, and a scrolled heatmap stays scrolled.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const row = ([label, ...cells]) => `<tr><th>${label}</th>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`;
const chart = (attrs, header, rows) => `<figure ${attrs}>
  <figcaption>Chart</figcaption>
  <table><thead><tr><th>Month</th>${header}</tr></thead><tbody>${rows.map(row).join('')}</tbody></table>
</figure>`;

const weeks = Array.from({ length: 40 }, (_, i) => `<th>Week ${i + 1}</th>`).join('');
const html = `<style>${css}</style>
  <div style="width: 600px">
    <button id="before">Before</button>
    ${chart('class="line-chart" id="line"', '<th>Sales</th>', [['Jan', '10'], ['Feb', '20'], ['Mar', '30']])}
    ${chart('class="pie-chart" id="pie"', '<th>Share</th>', [['A', '1'], ['B', '2']])}
    ${chart('class="column-chart" id="empty"', '<th>Sales</th>', [])}
  </div>
  <div style="width: 320px">${chart('class="heatmap-chart" id="heat"', weeks, [['Mon', ...Array(40).fill('1')]])}</div>
  <script>${js}</script>`;

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: update redraws the table and keeps keyboard focus and the highlighted row`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      await page.locator('#before').focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('ArrowRight');

      const after = await page.locator('#line').evaluate((el) => {
        const chart = Expressive.LineChart.getInstance(el);
        const old = el.querySelector('.line-chart-plot');
        el.querySelector('tbody tr:nth-child(2) td').textContent = '25';
        el.querySelector('tbody').insertAdjacentHTML('beforeend', '<tr><th>Apr</th><td>40</td></tr>');
        chart.update();
        const plot = el.querySelector('.line-chart-plot');
        return {
          plots: el.querySelectorAll('.line-chart-plot').length,
          replaced: plot !== old && !old.isConnected,
          focused: document.activeElement === plot,
          ring: plot.matches(':focus-visible'),
          index: chart.activeIndex,
          tooltip: plot.querySelector('.line-chart-tooltip').textContent,
          labels: [...el.querySelectorAll('.line-chart-labels li')].map((li) => li.textContent),
        };
      });
      assert.deepEqual(after, {
        plots: 1, replaced: true, focused: true, ring: true, index: 1, tooltip: 'FebSales25', labels: ['Jan', 'Feb', 'Mar', 'Apr'],
      });

      await page.keyboard.press('End');
      assert.equal(await page.locator('#line').evaluate((el) => Expressive.LineChart.getInstance(el).activeIndex), 3,
        'the new plot answers the keys');

      const shrunk = await page.locator('#line').evaluate((el) => {
        const chart = Expressive.LineChart.getInstance(el);
        el.querySelectorAll('tbody tr:nth-child(n+3)').forEach((tr) => tr.remove());
        chart.update();
        return [chart.activeIndex, el.querySelector('.line-chart-tooltip strong').textContent];
      });
      assert.deepEqual(shrunk, [1, 'Feb'], 'a removed row moves the highlight to the last row left');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: update draws a chart that had no data, and does nothing once destroyed`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      const result = await page.evaluate(() => {
        const empty = document.getElementById('empty');
        const before = empty.querySelector('.column-chart-plot');
        empty.querySelector('tbody').innerHTML = '<tr><th>Jan</th><td>5</td></tr>';
        Expressive.ColumnChart.getInstance(empty).update();
        const plot = empty.querySelector('.column-chart-plot');

        const pie = document.getElementById('pie');
        const instance = Expressive.PieChart.getInstance(pie);
        pie.querySelector('tbody').insertAdjacentHTML('beforeend', '<tr><th>C</th><td>3</td></tr>');
        instance.update();
        const slices = pie.querySelectorAll('.pie-chart-slice').length;
        instance.destroy();
        instance.update();
        return { before, drawn: plot?.tabIndex, slices, destroyed: pie.querySelectorAll('.pie-chart-plot').length };
      });
      assert.deepEqual(result, { before: null, drawn: 0, slices: 3, destroyed: 0 });
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: update keeps focus on a chart inside a shadow root`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      const kept = await page.evaluate((markup) => {
        const host = document.createElement('div');
        document.body.append(host);
        const root = host.attachShadow({ mode: 'open' });
        root.innerHTML = markup;
        const chart = Expressive.LineChart.init(root.querySelector('.line-chart'));
        root.querySelector('.line-chart-plot').focus();
        chart.update();
        return root.activeElement === root.querySelector('.line-chart-plot');
      }, chart('class="line-chart"', '<th>Sales</th>', [['Jan', '1'], ['Feb', '2']]));
      assert.equal(kept, true);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a scrolled heatmap stays scrolled through update`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      const [before, after] = await page.locator('#heat').evaluate((el) => {
        const scroll = () => el.querySelector('.heatmap-chart-scroll');
        scroll().scrollLeft = 200;
        const left = scroll().scrollLeft;
        el.querySelector('tbody td').textContent = '9';
        Expressive.HeatmapChart.getInstance(el).update();
        return [left, scroll().scrollLeft];
      });
      assert.ok(before > 0, 'the grid scrolls');
      assert.equal(after, before);
    } finally {
      await browser.close();
    }
  });
}
