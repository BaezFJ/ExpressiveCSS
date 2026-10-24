import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

// Car, weight, then two y series.
const cars = [['Civic', '1300', '31', '40'], ['Corolla', '1400', '32', '41'], ['Camry', '1600', '28', '39'], ['Tahoe', '2600', '15', '20']];
const chart = (attrs, rows) => `<figure ${attrs}>
  <figcaption>Fuel economy</figcaption>
  <table>
    <thead><tr><th>Car</th><th>Weight (kg)</th><th>City</th><th>Highway</th></tr></thead>
    <tbody>${rows.map(([label, ...cells]) => `<tr><th>${label}</th>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</figure>`;
const fixed = 'data-x-min="0" data-x-max="4000" data-min="0" data-max="50"';

const html = `<style>${css}</style>
  <div style="width: 600px">
    ${chart(`class="scatter-chart" id="ltr" ${fixed}`, cars)}
    ${chart(`class="scatter-chart" id="gaps" ${fixed}`, [cars[0], ['Corolla', 'n/a', '32', '41'], ['Camry', '1600', '28', ''], cars[3]])}
  </div>
  <div style="width: 600px" dir="rtl">
    ${chart(`class="scatter-chart" id="rtl" ${fixed}`, cars)}
  </div>
  <script>${js}</script>`;

/**
 * Runs in the page. Each series' points as page pixels, read from the drawn
 * path data through the SVG's own transform, with `where`, the page position
 * a value pair on the fixed 0-4000 by 0-50 scales gives in the chart's direction.
 */
function points(el) {
  const plot = el.querySelector('.scatter-chart-plot');
  const box = plot.getBoundingClientRect();
  const [left, top, width, height] = [box.left + plot.clientLeft, box.top + plot.clientTop, plot.clientWidth, plot.clientHeight];
  const rtl = getComputedStyle(el).direction === 'rtl';
  const where = (x, y) => [left + (rtl ? 1 - x / 4000 : x / 4000) * width, top + (1 - y / 50) * height];
  return [...el.querySelectorAll('.scatter-chart-points')].map((path) => {
    const matrix = path.getScreenCTM();
    const drawn = [...path.getAttribute('d').matchAll(/M([-\d.e]+),([-\d.e]+)/g)].map(([, x, y]) => {
      const point = new DOMPoint(Number(x), Number(y)).matrixTransform(matrix);
      return [point.x, point.y];
    });
    return { drawn, where };
  });
}

/** Each series' drawn points and where `values[s]`, [x, y] pairs, put them. */
const placed = (page, id, values) => page.locator(id).evaluate((el, [source, values]) => {
  const series = new Function(`return ${source}`)()(el);
  return series.map(({ drawn, where }, s) => ({ drawn, expected: values[s].map(([x, y]) => where(x, y)) }));
}, [points.toString(), values]);

function near(series, message) {
  series.forEach(({ drawn, expected }, s) => {
    assert.equal(drawn.length, expected.length, `${message}, series ${s + 1}: one point per row`);
    drawn.forEach(([x, y], i) => {
      assert.ok(Math.abs(x - expected[i][0]) <= 1 && Math.abs(y - expected[i][1]) <= 1,
        `${message}, series ${s + 1}, point ${i}: at ${x},${y}, expected ${expected[i]}`);
    });
  });
}

const values = (column) => cars.map((row) => [Number(row[1]), Number(row[column])]);

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: scatter chart places one point per row at its x and y values`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      const ltr = await page.locator('#ltr').evaluate((el) => {
        const plot = el.querySelector('.scatter-chart-plot');
        return {
          table: getComputedStyle(el.querySelector('table')).position,
          plot: [plot.tabIndex, plot.getAttribute('aria-label'), plot.getAttribute('aria-roledescription')],
          svg: el.querySelector('.scatter-chart-plot > svg').getAttribute('aria-hidden'),
          series: [...el.querySelectorAll('.scatter-chart-series')].map((group) => group.dataset.series),
          legend: [...el.querySelectorAll('.scatter-chart-legend li')].map((li) => li.textContent),
          instance: [!!Expressive.ScatterChart.getInstance(el), !!Expressive.LineChart.getInstance(el)],
        };
      });
      assert.equal(ltr.table, 'absolute', 'the table is visually hidden');
      assert.deepEqual(ltr.plot, [0, 'Fuel economy', 'scatter chart']);
      assert.equal(ltr.svg, 'true', 'the drawing is hidden; the table carries the data');
      assert.deepEqual(ltr.series, ['1', '2'], 'the weight column is the x axis, not a series');
      assert.deepEqual(ltr.legend, ['City', 'Highway']);
      assert.deepEqual(ltr.instance, [true, false]);

      for (const id of ['#ltr', '#rtl']) near(await placed(page, id, [values(2), values(3)]), id);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: scatter chart leaves out a row without x and a cell without y`, async () => {
    const browser = await leaseBrowser(browserType);
    const errors = [];
    try {
      const page = await browser.newPage();
      page.on('pageerror', (error) => errors.push(error));
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      // Corolla has no x, so neither series draws it; Camry has no highway value.
      near(await placed(page, '#gaps', [[[1300, 31], [1600, 28], [2600, 15]], [[1300, 40], [2600, 20]]]), '#gaps');
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
}
