import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const chart = (attrs, caption, header, rows) => `<figure ${attrs}>
  <figcaption>${caption}</figcaption>
  <table>
    <thead><tr><th>Rep</th>${header}</tr></thead>
    <tbody>${rows.map(([label, ...cells]) => `<tr>${label}${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</figure>`;

const weeks = Array.from({ length: 40 }, (_, i) => `<th data-label="${i % 4 ? '' : `M${i / 4 + 1}`}">Week ${i + 1}</th>`).join('');
const html = `<style>${css}</style>
  <div style="width: 600px">
    ${chart('class="heatmap-chart" id="sales"', 'Sales', '<th>Jan</th><th>Feb</th><th>Mar</th>', [
      ['<th>Priya</th>', '$10', '$20', '$30'], ['<th>Leo</th>', '$40', 'n/a', '$50']])}
    ${chart('class="heatmap-chart values" id="values" data-min="0" data-max="100"', 'Values', '<th>A</th><th>B</th>', [
      ['<th>Paid</th>', '0', '100'], ['<th>Organic</th>', '50', '150']])}
    ${chart('class="heatmap-chart" id="weeks"', 'Weeks', weeks, [
      ['<th>Mon</th>', ...Array(40).fill('1')], ['<th data-label="">Tue</th>', ...Array(40).fill('2')]])}
    ${chart('class="heatmap-chart" id="fixed" data-min="0" data-max="100"', 'Fixed', '<th>A</th><th>B</th>', [['<th>Row</th>', '20', '80']])}
    ${chart('class="heatmap-chart" id="empty"', 'Empty', '<th>A</th>', [['<th>Row</th>', 'none']])}
  </div>
  <script>${js}</script>`;

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  browserTest(`${engine}: heatmap chart draws a shaded grid and a scale from its table`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      const sales = await page.locator('#sales').evaluate((el) => {
        const plot = el.querySelector('.heatmap-chart-plot');
        const cells = [...el.querySelectorAll('.heatmap-chart-cell')];
        return {
          table: getComputedStyle(el.querySelector('table')).position,
          plot: [plot.tabIndex, plot.getAttribute('aria-label'), plot.getAttribute('aria-roledescription')],
          hidden: [el.querySelector('.heatmap-chart-grid').getAttribute('aria-hidden'), el.querySelector('.heatmap-chart-legend').getAttribute('aria-hidden')],
          levels: cells.map((cell) => cell.style.getPropertyValue('--level')),
          gaps: cells.map((cell) => cell.classList.contains('gap')),
          text: cells.map((cell) => cell.textContent),
          fills: [getComputedStyle(cells[0]).backgroundColor, getComputedStyle(cells[5]).backgroundColor,
            getComputedStyle(cells[4]).backgroundColor],
          tokens: [getComputedStyle(el).getPropertyValue('--md-comp-heatmap-chart-empty-color'), getComputedStyle(el).getPropertyValue('--md-comp-heatmap-chart-color')]
            .map((value) => value.trim()),
          rows: [...el.querySelectorAll('.heatmap-chart-row')].map((row) => row.textContent),
          columns: [...el.querySelectorAll('.heatmap-chart-column')].map((column) => column.textContent),
          height: cells[0].getBoundingClientRect().height,
          legend: [...el.querySelector('.heatmap-chart-legend').children].map((span) => span.textContent),
          instance: [!!Expressive.HeatmapChart.getInstance(el), !!Expressive.LineChart.getInstance(el)],
          overflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        };
      });
      assert.equal(sales.table, 'absolute', 'the table is visually hidden');
      assert.deepEqual(sales.plot, [0, 'Sales', 'heatmap chart']);
      assert.deepEqual(sales.hidden, ['true', 'true'], 'the grid and scale are hidden; the table carries the data');
      // From the lowest value to the highest; the non-numeric cell is a gap.
      assert.deepEqual(sales.levels, ['0', '0.25', '0.5', '0.75', '', '1']);
      assert.deepEqual(sales.gaps, [false, false, false, false, true, false]);
      assert.deepEqual(sales.text, ['', '', '', '', '', ''], 'no values without .values');
      assert.notEqual(sales.fills[0], sales.fills[1], 'the lowest and highest cells differ');
      assert.equal(sales.fills[2], 'rgba(0, 0, 0, 0)', 'a gap has no fill');
      assert.deepEqual(sales.rows, ['Priya', 'Leo']);
      assert.deepEqual(sales.columns, ['Jan', 'Feb', 'Mar']);
      assert.equal(sales.height, 32, 'rows take the row height token');
      assert.deepEqual(sales.legend, ['$10', '', '$50'], 'the scale runs from the lowest cell to the highest');
      assert.deepEqual(sales.instance, [true, false]);
      assert.equal(await page.getByRole('table').first().getByRole('cell', { name: '$40' }).count(), 1,
        'the hidden table stays in the accessibility tree');

      const values = await page.locator('#values').evaluate((el) => {
        const cells = [...el.querySelectorAll('.heatmap-chart-cell')];
        // The text color's lightness, near 0 or 1.
        const light = (cell) => {
          const canvas = document.createElement('canvas').getContext('2d');
          canvas.fillStyle = getComputedStyle(cell).color;
          canvas.fillRect(0, 0, 1, 1);
          return canvas.getImageData(0, 0, 1, 1).data[0] > 128;
        };
        return {
          levels: cells.map((cell) => cell.style.getPropertyValue('--level')),
          text: cells.map((cell) => cell.textContent),
          light: [light(cells[0]), light(cells[1])],
        };
      });
      // data-min and data-max set the scale; a value past them is clamped.
      assert.deepEqual(values.levels, ['0', '1', '0.5', '1']);
      assert.deepEqual(values.text, ['0', '100', '50', '150']);
      assert.deepEqual(values.light, [false, true], 'dark text on the empty color, light text on the full color');

      // The text is black or white, whichever contrasts more, including a
      // saturated green and greys either side of the switch.
      const contrast = await page.locator('#values').evaluate((el) => {
        const rgb = (color) => {
          const canvas = document.createElement('canvas').getContext('2d');
          canvas.fillStyle = color;
          canvas.fillRect(0, 0, 1, 1);
          return [...canvas.getImageData(0, 0, 1, 1).data].slice(0, 3);
        };
        const luminance = (channels) => channels.map((value) => {
          value /= 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
        const ratio = (a, b) => {
          const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
          return (high + 0.05) / (low + 0.05);
        };
        return ['#009100', '#767676', '#757575', '#0000ff', '#ffff00'].map((color) => {
          const cell = document.createElement('span');
          cell.className = 'heatmap-chart-cell';
          cell.style.cssText = `--md-comp-heatmap-chart-color: ${color}; --level: 1`;
          el.append(cell);
          const [background, text] = [rgb(getComputedStyle(cell).backgroundColor), rgb(getComputedStyle(cell).color)];
          cell.remove();
          const best = Math.max(ratio(background, [0, 0, 0]), ratio(background, [255, 255, 255]));
          return [color, text.join(), ratio(background, text) >= best - 0.01];
        });
      });
      assert.deepEqual(contrast, [
        ['#009100', '0,0,0', true], ['#767676', '0,0,0', true], ['#757575', '255,255,255', true],
        ['#0000ff', '255,255,255', true], ['#ffff00', '0,0,0', true]]);

      // A fixed scale wider than the data: the legend runs only over the
      // shades the data uses, so its labels match its colors.
      const fixed = await page.locator('#fixed').evaluate((el) => {
        const scale = el.querySelector('.heatmap-chart-scale');
        return [[...el.querySelector('.heatmap-chart-legend').children].map((span) => span.textContent),
          scale.style.getPropertyValue('--low'), scale.style.getPropertyValue('--high'),
          [...el.querySelectorAll('.heatmap-chart-cell')].map((cell) => cell.style.getPropertyValue('--level'))];
      });
      assert.deepEqual(fixed, [['20', '', '80'], '0.2', '0.8', ['0.2', '0.8']]);

      const weeksLabels = await page.locator('#weeks').evaluate((el) => ({
        rows: [...el.querySelectorAll('.heatmap-chart-row')].map((row) => row.textContent),
        columns: [...el.querySelectorAll('.heatmap-chart-column')].map((column) => [column.textContent, column.style.gridColumn, column.classList.contains('run')]),
      }));
      assert.deepEqual(weeksLabels.rows, ['Mon', ''], 'an empty data-label hides a row label');
      assert.equal(weeksLabels.columns.length, 10, 'empty data-labels draw no column label');
      assert.deepEqual(weeksLabels.columns[0], ['M1', '2 / 6', true], 'a label runs on over the empty ones after it');
      assert.equal(sales.overflow, true, 'a wide hidden table does not widen the page');

      assert.equal(await page.locator('#empty .heatmap-chart-plot').count(), 0, 'a table with no numbers stays a table');

      await page.evaluate(() => Expressive.HeatmapChart.getInstance(document.querySelector('#sales')).destroy());
      assert.deepEqual(await page.locator('#sales').evaluate((el) => [
        el.querySelectorAll('.heatmap-chart-plot, .heatmap-chart-legend').length,
        getComputedStyle(el.querySelector('table')).clipPath,
        el.Expressive_HeatmapChart,
      ]), [0, 'none', undefined]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: heatmap chart tooltip follows the pointer and the arrow keys round the grid`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      const plot = page.locator('#sales .heatmap-chart-plot');
      const tooltip = page.locator('#sales .heatmap-chart-tooltip');
      const cells = page.locator('#sales .heatmap-chart-cell');
      const text = () => tooltip.innerText().then((value) => value.replace(/\s+/g, ' ').trim());
      const active = () => cells.evaluateAll((spans) => spans.findIndex((span) => span.classList.contains('active')));

      await cells.nth(0).hover();
      assert.equal(await text(), 'Priya Jan $10');
      assert.equal(await tooltip.evaluate((el) => el.classList.contains('end')), false, 'left of the middle it opens rightwards');
      await cells.nth(1).hover();
      assert.equal(await text(), 'Priya Feb $20');
      assert.equal(await active(), 1);
      const swatch = await tooltip.evaluate((el) => el.children[1].style.getPropertyValue('--level'));
      assert.equal(swatch, '0.25', 'the swatch takes the cell shade');
      await cells.nth(5).hover();
      assert.equal(await text(), 'Leo Mar $50');
      assert.equal(await tooltip.evaluate((el) => el.classList.contains('end')), true);
      await cells.nth(4).hover();
      assert.equal(await text(), 'Leo Feb n/a', 'a gap still shows its cell');

      await page.locator('#sales .heatmap-chart-row').first().hover();
      assert.equal(await tooltip.isVisible(), false, 'off the cells hides the tooltip');
      assert.equal(await active(), -1);

      await plot.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await text(), 'Priya Jan $10');
      await page.keyboard.press('ArrowRight');
      assert.equal(await text(), 'Priya Feb $20');
      await page.keyboard.press('ArrowDown');
      assert.equal(await text(), 'Leo Feb n/a');
      await page.keyboard.press('ArrowDown');
      assert.equal(await text(), 'Leo Feb n/a', 'the last row stops the arrow');
      await page.keyboard.press('End');
      assert.equal(await text(), 'Leo Mar $50');
      await page.keyboard.press('ArrowRight');
      assert.equal(await text(), 'Leo Mar $50', 'the row end stops the arrow');
      await page.keyboard.press('Home');
      await page.keyboard.press('ArrowUp');
      assert.equal(await text(), 'Priya Jan $10');
      await page.keyboard.press('Escape');
      assert.equal(await tooltip.isVisible(), false);
      await page.keyboard.press('ArrowDown');
      assert.equal(await text(), 'Priya Jan $10', 'the first key after Escape shows the first cell');

      // In RTL the columns run right to left, and left moves to the next one.
      const rtl = await page.evaluate(() => {
        const wrap = document.createElement('div');
        wrap.dir = 'rtl';
        wrap.style.width = '600px';
        wrap.append(document.querySelector('#sales').cloneNode(true));
        document.body.append(wrap);
        const el = wrap.firstElementChild;
        el.querySelectorAll('.heatmap-chart-plot, .heatmap-chart-legend').forEach((node) => node.remove());
        const chart = Expressive.HeatmapChart.init(el);
        chart.show(0);
        el.querySelector('.heatmap-chart-plot').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        const cells = el.querySelectorAll('.heatmap-chart-cell');
        return [cells[0].getBoundingClientRect().left > cells[1].getBoundingClientRect().left, chart.activeIndex,
          el.querySelector('.heatmap-chart-scale').style.getPropertyValue('--heatmap-chart-to')];
      });
      assert.deepEqual(rtl, [true, 1, 'left']);
    } finally {
      await browser.close();
    }
  });
}
