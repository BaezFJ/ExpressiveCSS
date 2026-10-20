// A .toggle legend is a row of buttons that show or hide each series. A
// hidden series leaves the drawing, the tooltip and the scale, the others
// keep their colors, and the last series shown cannot be hidden.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const row = ([label, ...cells]) => `<tr><th>${label}</th>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`;
const chart = (attrs, rows) => `<figure ${attrs}>
  <figcaption>Chart</figcaption>
  <table><thead><tr><th>Month</th><th>Small</th><th>Large</th></tr></thead><tbody>${rows.map(row).join('')}</tbody></table>
</figure>`;
const data = [['Jan', '1', '100'], ['Feb', '2', '200']];

const html = `<style>${css}</style>
  <div style="width: 600px">
    ${chart('class="line-chart axis toggle" id="line"', data)}
    ${chart('class="column-chart toggle" id="column"', data)}
    ${chart('class="line-chart" id="plain"', data)}
  </div>
  <script>${js}</script>`;

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  browserTest(`${engine}: a .toggle legend hides a series, refits the scale and keeps the other colors`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      const read = () => page.locator('#line').evaluate((el) => ({
        legendHidden: el.querySelector('.line-chart-legend').getAttribute('aria-hidden'),
        buttons: [...el.querySelectorAll('.line-chart-legend button')].map((b) =>
          `${b.textContent}:${b.getAttribute('aria-pressed')}:${b.getAttribute('aria-disabled')}`),
        series: [...el.querySelectorAll('.line-chart-series')].map((g) => g.dataset.series),
        axis: [...el.querySelectorAll('.line-chart-axis li')].map((li) => li.textContent).join(' '),
      }));
      // Playwright waits for an aria-disabled button to enable, so force those presses.
      const press = (name, force = false) => page.locator('#line').getByRole('button', { name }).click({ force });

      const before = await read();
      assert.equal(before.legendHidden, null);
      assert.deepEqual(before.buttons, ['Small:true:null', 'Large:true:null']);
      assert.deepEqual(before.series, ['1', '2']);

      await press('Large');
      const hidden = await read();
      assert.deepEqual(hidden.buttons, ['Small:true:true', 'Large:false:null'], 'the last series shown cannot be hidden');
      assert.deepEqual(hidden.series, ['1']);
      assert.notEqual(hidden.axis, before.axis, 'the scale refits to the series shown');

      await press('Small', true);
      assert.deepEqual((await read()).series, ['1'], 'pressing the last series shown does nothing');

      await press('Large');
      await press('Small');
      const line = page.locator('#line');
      await line.evaluate((el) => Expressive.LineChart.getInstance(el).update());
      const kept = await read();
      assert.deepEqual(kept.buttons, ['Small:false:null', 'Large:true:true'], 'update keeps a hidden series hidden');
      assert.deepEqual(kept.series, ['2'], 'the series shown keeps its color');

      await line.locator('.line-chart-plot').hover();
      const tooltip = await line.locator('.line-chart-tooltip').textContent();
      assert.ok(!tooltip.includes('Small'), 'the tooltip leaves out a hidden series');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a legend button keeps keyboard focus as it toggles, and covers its swatch`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      await page.locator('#column .column-chart-plot').focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Space');
      const result = await page.locator('#column').evaluate((el) => {
        const buttons = [...el.querySelectorAll('.column-chart-legend button')];
        const item = buttons[0].parentElement;
        const box = item.getBoundingClientRect();
        return {
          focused: document.activeElement === buttons[1],
          ring: buttons[1].matches(':focus-visible'),
          pressed: buttons.map((b) => b.getAttribute('aria-pressed')),
          columns: [...el.querySelectorAll('.column-chart-columns > div:first-child [data-series]')].map((c) => c.dataset.series),
          swatch: document.elementFromPoint(box.left + 2, box.top + box.height / 2) === buttons[0],
          height: buttons[0].getBoundingClientRect().height,
        };
      });
      assert.deepEqual(result, { focused: true, ring: true, pressed: ['true', 'false'], columns: ['1'], swatch: true, height: 48 });
      assert.equal(await page.locator('#plain .line-chart-legend').getAttribute('aria-hidden'), 'true', 'without .toggle the legend stays decorative');
      assert.equal(await page.locator('#plain .line-chart-legend button').count(), 0);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: toggling keeps ranges, duplicate names and empty series straight`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css}</style><div style="width: 600px">
        <figure class="column-chart toggle" id="range"><figcaption>Range</figcaption><table>
          <thead><tr><th>Month</th><th>Mean</th><th class="range">Range</th></tr></thead>
          <tbody><tr><th>Jan</th><td>15</td><td>10–20</td></tr></tbody></table></figure>
        <figure class="line-chart toggle" id="twins"><figcaption>Twins</figcaption><table>
          <thead><tr><th>Month</th><th>Sales</th><th>Sales</th></tr></thead>
          <tbody><tr><th>Jan</th><td>1</td><td>2</td></tr><tr><th>Feb</th><td>3</td><td>4</td></tr></tbody></table></figure>
        <figure class="line-chart toggle" id="blank"><figcaption>Blank</figcaption><table>
          <thead><tr><th>Month</th><th>Data</th><th>Empty</th></tr></thead>
          <tbody><tr><th>Jan</th><td>1</td><td></td></tr><tr><th>Feb</th><td>2</td><td></td></tr></tbody></table></figure>
        <figure class="line-chart stacked toggle" id="disjoint"><figcaption>Disjoint</figcaption><table>
          <thead><tr><th>Month</th><th>A</th><th>B</th></tr></thead>
          <tbody><tr><th>Jan</th><td>1</td><td></td></tr><tr><th>Feb</th><td></td><td>2</td></tr></tbody></table></figure>
        </div><script>${js}</script>`);
      await page.evaluate(() => Expressive.AutoInit());
      const pressed = (id) => page.locator(`#${id} .chart-toggle`).evaluateAll((buttons) =>
        buttons.map((b) => `${b.getAttribute('aria-pressed')}:${b.getAttribute('aria-disabled')}`));

      await page.locator('#range .chart-toggle').first().click();
      const range = await page.locator('#range').evaluate((el) => {
        const column = el.querySelector('.column-chart-columns [data-series]');
        return [column.dataset.series, column.classList.contains('floating'), Expressive.ColumnChart.getInstance(el).series[0].base];
      });
      assert.deepEqual(range, ['2', true, [10]], 'the range keeps reading its own column');

      await page.locator('#twins .chart-toggle').first().click();
      assert.deepEqual(await pressed('twins'), ['false:null', 'true:true'], 'a series of the same name stays');
      assert.deepEqual(await page.locator('#twins .line-chart-series').evaluateAll((g) => g.map((each) => each.dataset.series)), ['2']);

      assert.deepEqual(await pressed('blank'), ['true:true', 'true:null'], 'only the last series with data is held');
      await page.locator('#blank .chart-toggle').nth(1).click();
      assert.deepEqual(await pressed('blank'), ['true:true', 'false:null']);
      await page.locator('#blank .chart-toggle').nth(1).click();
      assert.deepEqual(await pressed('blank'), ['true:true', 'true:null'], 'a hidden empty series comes back');

      assert.deepEqual(await pressed('disjoint'), ['true:null', 'true:null'], 'a stacked series over gaps still has data');
      await page.locator('#disjoint .chart-toggle').first().click();
      assert.deepEqual(await pressed('disjoint'), ['false:null', 'true:true']);
      assert.ok(await page.locator('#disjoint .line-chart-line').getAttribute('d'), 'B draws on its own');

      const back = await page.locator('#twins').evaluate((el) => {
        el.querySelectorAll('tbody td:nth-child(3)').forEach((td) => (td.textContent = ''));
        const chart = Expressive.LineChart.getInstance(el);
        chart.update();
        return [chart.series.map((series) => series.column), el.querySelectorAll('.chart-toggle[aria-pressed="false"]').length];
      });
      assert.deepEqual(back, [[1, 2], 0], 'when the series shown lose their data, the hidden ones come back');
    } finally {
      await browser.close();
    }
  });
}
