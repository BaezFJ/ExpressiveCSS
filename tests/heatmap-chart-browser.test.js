import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

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
  <div style="width: 320px">
    ${chart('class="heatmap-chart" id="long"', 'Long', '<th>A</th><th>B</th><th>C</th>', [
      ['<th>Organic search from partner sites and newsletters</th>', '1', '2', '3']])}
  </div>
  <script>${js}</script>`;

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: heatmap chart draws a shaded grid and a scale from its table`, async () => {
    const browser = await leaseBrowser(browserType);
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
      assert.deepEqual(weeksLabels.columns[0], ['M1', '1 / 5', true], 'a label runs on over the empty ones after it');
      assert.equal(sales.overflow, true, 'a wide hidden table does not widen the page');

      assert.equal(await page.locator('#empty .heatmap-chart-plot').count(), 0, 'a table with no numbers stays a table');

      // A long row label takes at most 40% of the width and is cut, so the cells keep the rest.
      const long = await page.locator('#long').evaluate((el) => {
        const [label, cell] = [el.querySelector('.heatmap-chart-row'), el.querySelector('.heatmap-chart-cell')];
        return [label.offsetWidth <= el.offsetWidth * 0.4, label.scrollWidth > label.clientWidth, cell.offsetWidth > 40];
      });
      assert.deepEqual(long, [true, true, true]);

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
    const browser = await leaseBrowser(browserType);
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
      assert.deepEqual(await tooltip.evaluate((el) => {
        const swatch = getComputedStyle(el.children[1], '::before');
        return [el.children[1].className, swatch.backgroundColor];
      }), ['gap', 'rgba(0, 0, 0, 0)'], 'a gap\'s swatch is outlined, not the lowest shade');

      // Between two cells the tooltip stays, on the nearer one.
      const [a, b] = [await cells.nth(0).boundingBox(), await cells.nth(1).boundingBox()];
      await page.mouse.move((a.x + a.width + b.x) / 2, a.y + a.height / 2);
      assert.equal(await tooltip.isVisible(), true, 'the gap between cells keeps the tooltip');
      assert.ok([0, 1].includes(await active()));

      // A touch keeps its first target as it drags, so the cell comes from the position.
      const dragged = await page.evaluate(() => {
        const el = document.querySelector('#sales');
        const cells = el.querySelectorAll('.heatmap-chart-cell');
        const to = cells[2].getBoundingClientRect();
        cells[0].dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true, pointerType: 'touch', clientX: to.x + to.width / 2, clientY: to.y + to.height / 2 }));
        return Expressive.HeatmapChart.getInstance(el).activeIndex;
      });
      assert.equal(dragged, 2);

      await page.locator('#sales .heatmap-chart-row').first().hover();
      assert.equal(await tooltip.isVisible(), false, 'off the cells hides the tooltip');
      assert.equal(await active(), -1);

      // A press on a label focuses the plot without showing the first cell.
      await page.mouse.move(0, 0);
      await page.locator('#sales .heatmap-chart-row').nth(1).click();
      assert.equal(await plot.evaluate((el) => el === document.activeElement), true);
      assert.equal(await tooltip.isVisible(), false, 'a press off the cells shows no cell');
      await page.keyboard.press('ArrowDown');
      assert.equal(await text(), 'Priya Jan $10');
      await page.keyboard.press('Escape');

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
      // With nothing shown, Escape is left for a dialog around the chart.
      assert.equal(await plot.evaluate((el) => {
        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        el.dispatchEvent(event);
        return event.defaultPrevented;
      }), false);
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

  browserTest(`${engine}: heatmap chart diverges, steps and scrolls a wide grid`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const rows = [['<th>North</th>', '-10', '-5', '0', '5', '20']];
      const header = '<th>A</th><th>B</th><th>C</th><th>D</th><th>E</th>';
      const many = Array.from({ length: 52 }, (_, i) => `<th>W${i + 1}</th>`).join('');
      await page.setContent(`<style>${css}</style>
        <div style="width: 600px">
          ${chart('class="heatmap-chart" data-mid="0" id="diverging" style="--md-comp-heatmap-chart-low-color: rgb(255, 0, 0); --md-comp-heatmap-chart-color: rgb(0, 0, 255); --md-comp-heatmap-chart-empty-color: rgb(255, 255, 255)"', 'Diverging', header, rows)}
          ${chart('class="heatmap-chart" data-steps="4" id="stepped"', 'Stepped', header, [['<th>North</th>', '0', '10', '20', '21', '30']])}
          ${chart('class="heatmap-chart" data-mid="0" data-steps="3" id="both"', 'Both', header, rows)}
          ${chart('class="heatmap-chart" data-mid="0" data-min="-10" data-max="20" id="bounded"', 'Bounded', header, [['<th>North</th>', '-20', '-10', '0', '10', '30']])}
          ${chart('class="heatmap-chart" data-mid="0" id="above"', 'Above', header, [['<th>North</th>', '10', '12', '14', '16', '20']])}
        </div>
        <div style="width: 320px">
          ${chart('class="heatmap-chart" id="wide"', 'Wide', many, [['<th>Monday</th>', ...Array.from({ length: 52 }, (_, i) => String(i))]])}
        </div>
        <script>${js}</script>`);
      await page.evaluate(() => Expressive.AutoInit());

      const read = (el) => ({
        levels: [...el.querySelectorAll('.heatmap-chart-cell')].map((cell) => cell.style.getPropertyValue('--level')),
        // Each fill as drawn, since engines write a mixed color in different spaces.
        fills: [...el.querySelectorAll('.heatmap-chart-cell')].map((cell) => {
          const context = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d');
          context.fillStyle = getComputedStyle(cell).backgroundColor;
          context.fillRect(0, 0, 1, 1);
          return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
        }),
        swatches: [...el.querySelectorAll('.heatmap-chart-scale > span')].map((span) => span.style.getPropertyValue('--level')),
        mid: el.querySelector('.heatmap-chart-scale').style.getPropertyValue('--mid'),
        diverging: el.querySelector('.heatmap-chart-scale').classList.contains('diverging'),
      });
      // Either side of data-mid, as far as the further end: -10 is half of 20.
      const diverging = await page.locator('#diverging').evaluate(read);
      assert.deepEqual(diverging.levels, ['-0.5', '-0.25', '0', '0.25', '1']);
      assert.ok(diverging.fills[2].every((channel) => channel >= 254), `the midpoint is the empty color: ${diverging.fills[2]}`);
      const [r, g, b] = diverging.fills[0];
      assert.ok(r > b + 40 && g < r, `below the midpoint mixes the low color: ${diverging.fills[0]}`);
      const [r2, g2, b2] = diverging.fills[4];
      assert.ok(b2 > r2 + 100 && g2 < b2, `the top is the color: ${diverging.fills[4]}`);
      assert.deepEqual(diverging.swatches, [], 'a smooth scale has a gradient legend');
      assert.ok(Math.abs(parseFloat(diverging.mid) - 100 / 3) < 1e-6, `the legend passes the midpoint a third of the way along: ${diverging.mid}`);

      // Four bands from the lowest to the highest, the lowest the empty color.
      const stepped = await page.locator('#stepped').evaluate(read);
      assert.deepEqual(stepped.levels.map(Number), [0, 1 / 3, 2 / 3, 2 / 3, 1]);
      assert.deepEqual(stepped.swatches.map(Number), [0, 1 / 3, 2 / 3, 1], 'the legend is a swatch per band');

      assert.ok(diverging.diverging, 'data either side of the midpoint shows it on the scale');
      // Values past a fixed end take that end's shade.
      const bounded = await page.locator('#bounded').evaluate(read);
      assert.deepEqual(bounded.levels, ['-0.5', '-0.5', '0', '0.5', '1']);
      const above = await page.locator('#above').evaluate(read);
      assert.equal(above.diverging, false, 'data all above the midpoint leaves it off the scale');

      const both = await page.locator('#both').evaluate(read);
      assert.deepEqual(both.levels.map(Number), [-0.5, 0, 0, 0, 1], 'near the midpoint is the empty band');
      assert.deepEqual(both.swatches.map(Number), [-0.5, 0, 0.5, 1], 'the legend covers the bands the data uses');

      // Fifty-two columns do not fit 320px, so the grid scrolls and keeps its row label.
      const wide = await page.locator('#wide').evaluate((el) => {
        const scroll = el.querySelector('.heatmap-chart-scroll');
        return {
          scrolls: scroll.scrollWidth > scroll.clientWidth,
          cell: el.querySelector('.heatmap-chart-cell').getBoundingClientRect().width,
          label: el.querySelector('.heatmap-chart-row').getBoundingClientRect().width,
          tab: scroll.tabIndex,
        };
      });
      assert.ok(wide.scrolls, 'a grid too wide for its figure scrolls');
      assert.ok(wide.cell >= 12, `cells keep the minimum width: ${wide.cell}`);
      assert.ok(wide.label > 30, `the row label keeps its width: ${wide.label}`);
      assert.equal(wide.tab, -1, 'the scroll box is not another Tab stop');

      // End scrolls the last cell into view, and the tooltip sits beside it.
      await page.locator('#wide .heatmap-chart-plot').focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('End');
      const end = await page.locator('#wide').evaluate((el) => {
        const [scroll, plot, tooltip] = ['scroll', 'plot', 'tooltip'].map((name) => el.querySelector(`.heatmap-chart-${name}`).getBoundingClientRect());
        const cell = el.querySelectorAll('.heatmap-chart-cell')[51].getBoundingClientRect();
        return {
          scrolled: el.querySelector('.heatmap-chart-scroll').scrollLeft > 0,
          visible: cell.left >= scroll.left - 1 && cell.right <= scroll.right + 1,
          beside: Math.abs(tooltip.right + 8 - cell.left) < 2 && tooltip.left >= plot.left - 1,
          text: el.querySelector('.heatmap-chart-tooltip span:last-child').textContent,
        };
      });
      assert.deepEqual(end, { scrolled: true, visible: true, beside: true, text: '51' });

      // Scrolling keeps the tooltip on its cell, and hides it once the cell scrolls out.
      const follow = await page.locator('#wide').evaluate(async (el) => {
        const scroll = el.querySelector('.heatmap-chart-scroll');
        const [tooltip, cell] = [el.querySelector('.heatmap-chart-tooltip'), el.querySelectorAll('.heatmap-chart-cell')[51]];
        const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        scroll.scrollLeft -= 5;
        await frame();
        const beside = Math.abs(tooltip.getBoundingClientRect().right + 8 - cell.getBoundingClientRect().left) < 2;
        scroll.scrollLeft = 0;
        await frame();
        return [beside, tooltip.hidden];
      });
      assert.deepEqual(follow, [true, true]);

      // The row label stays in view beside the scrolled cells, on the same row.
      await page.locator('#wide .heatmap-chart-scroll').evaluate((el) => { el.scrollLeft = 200; });
      const pinned = await page.locator('#wide').evaluate((el) => {
        const [label, scroll, cell] = ['row', 'scroll', 'cell'].map((name) => el.querySelector(`.heatmap-chart-${name}`).getBoundingClientRect());
        const plot = el.querySelector('.heatmap-chart-plot').getBoundingClientRect();
        return {
          inView: label.left >= plot.left - 1 && label.right <= scroll.left + 3,
          row: Math.abs((label.top + label.bottom) / 2 - (cell.top + cell.bottom) / 2) < 1,
        };
      });
      assert.deepEqual(pinned, { inView: true, row: true });
      // The pointer on the label, over cells scrolled out of view, picks no cell.
      await page.locator('#wide .heatmap-chart-scroll').evaluate((el) => { el.scrollLeft = el.scrollWidth; });
      const label = await page.locator('#wide .heatmap-chart-row').boundingBox();
      await page.mouse.move(label.x + label.width / 2, label.y + label.height / 2);
      assert.equal(await page.locator('#wide').evaluate((el) => Expressive.HeatmapChart.getInstance(el).activeIndex), -1);

      // Tab leaves the chart from the plot, and a press in the grid focuses the plot.
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => !!document.activeElement.closest('.heatmap-chart-scroll')), false, 'the scroll box is not a Tab stop');
      await page.locator('#wide .heatmap-chart-row').click();
      assert.equal(await page.evaluate(() => document.activeElement.className), 'heatmap-chart-plot', 'a press in the grid focuses the plot');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a narrow heatmap keeps every nth column label whole, and leaves spaced-out labels alone`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      const header = Array.from({ length: 12 }, (_, i) => `<th>Week ${i + 1}</th>`).join('');
      const rows = ['Mon', 'Tue'].map((day) => [`<th>${day}</th>`, ...Array.from({ length: 12 }, (_, i) => String(i))]);
      await page.setContent(`<style>${css}</style>
        <div id="box" style="width: 600px">
          ${chart('class="heatmap-chart" id="weeks"', 'Weeks', header, rows)}
          ${chart('class="heatmap-chart" id="months"', 'Months', weeks, [['<th>Mon</th>', ...Array.from({ length: 40 }, () => '1')]])}
        </div>
        <script>${js}</script>`);
      await page.evaluate(() => Expressive.AutoInit());
      const read = (id) => page.locator(`#${id}`).evaluate(async (figure) => {
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const labels = [...figure.querySelectorAll('.heatmap-chart-column')];
        const kept = labels.filter((label) => getComputedStyle(label).visibility === 'visible');
        const range = document.createRange();
        const boxes = kept.map((label) => {
          range.selectNodeContents(label);
          return range.getBoundingClientRect();
        }).sort((a, b) => a.left - b.left);
        const grid = figure.querySelector('.heatmap-chart-cells').getBoundingClientRect();
        return {
          kept: kept.map((label) => label.textContent),
          total: labels.length,
          overlap: boxes.some((box, i) => i > 0 && box.left < boxes[i - 1].right),
          outside: boxes.some((box) => box.left < grid.left - 0.5 || box.right > grid.right + 0.5),
          cut: kept.some((label) => getComputedStyle(label).overflow === 'hidden' && label.scrollWidth > label.clientWidth + 0.5),
        };
      });

      // From a phone's width to a wide card, in both directions: kept labels
      // never touch, stay on the grid, and are never cut.
      for (const dir of ['ltr', 'rtl']) {
        await page.evaluate((value) => {
          document.documentElement.dir = value;
          document.querySelectorAll('.heatmap-chart').forEach((figure) => Expressive.HeatmapChart.getInstance(figure).update());
        }, dir);
        for (let width = 200; width <= 700; width += 10) {
          await page.locator('#box').evaluate((box, px) => { box.style.width = `${px}px`; }, width);
          const labels = await read('weeks');
          if (labels.kept.length === labels.total && labels.cut) continue; // no step fits: all cut, as before
          assert.equal(labels.overlap, false, `${dir} ${width}px: kept labels do not touch (${labels.kept})`);
          assert.equal(labels.outside, false, `${dir} ${width}px: kept labels stay on the grid`);
          assert.equal(labels.cut, false, `${dir} ${width}px: no kept label is cut`);
        }
      }

      await page.locator('#box').evaluate((box) => { box.style.width = '300px'; });
      const narrow = await read('weeks');
      assert.ok(narrow.kept.length < 12 && narrow.kept[0] === 'Week 1', `a narrow grid keeps the first label and drops some: ${narrow.kept}`);
      const months = await read('months');
      assert.equal(months.kept.length, months.total, 'labels the author spaced out with empty ones are all kept');

      await page.locator('#box').evaluate((box) => { box.style.width = '1200px'; });
      assert.equal((await read('weeks')).kept.length, 12, 'a wide grid shows every label again');
    } finally {
      await browser.close();
    }
  });
}
