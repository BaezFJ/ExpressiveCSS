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
  <div style="width: 600px">
    ${chart('class="scatter-chart axis" id="auto"', cars)}
    ${chart('class="scatter-chart axis" id="ends" data-x-min="0" data-x-max="2500" data-min="0" data-max="60"',
      cars.map(([car, weight, city, highway]) => [car, `$${weight}`, `${city}%`, `${highway}%`]))}
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

  browserTest(`${engine}: scatter chart labels both axes at round values, or at the ends the chart sets`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      // Each label's text, and its line's offset from the plot's left and top as a share of the plot.
      const axes = (id) => page.locator(id).evaluate((el) => {
        const plot = el.querySelector('.scatter-chart-plot').getBoundingClientRect();
        const read = (selector, across) => [...el.querySelectorAll(selector)].map((li) => {
          const [box, label] = [li.getBoundingClientRect(), li.firstElementChild.getBoundingClientRect()];
          return {
            text: li.textContent,
            at: across ? (box.left - plot.left) / plot.width : (box.top - plot.top) / plot.height,
            below: label.top >= plot.bottom - 1,
          };
        });
        return { x: read('.scatter-chart-axis.x > li', true), y: read('.scatter-chart-axis:not(.x) > li', false) };
      });
      // Within a pixel of the share, as the plot's border and pixel snapping allow.
      const lines = (labels, expected, message) => {
        assert.equal(labels.length, expected.length, message);
        labels.forEach(({ at }, i) => assert.ok(Math.abs(at - expected[i]) < 0.01, `${message}: line ${i} at ${at}, expected ${expected[i]}`));
      };

      // Data from 1,300 to 2,600 kg and 15 to 41 mpg, padded by 10% and widened to round steps.
      const auto = await axes('#auto');
      assert.deepEqual(auto.x.map(({ text }) => text), ['1K', '1.5K', '2K', '2.5K', '3K']);
      lines(auto.x, [0, 0.25, 0.5, 0.75, 1], 'x lines');
      assert.ok(auto.x.every(({ below }) => below), 'the x labels sit below the plot');
      assert.deepEqual(auto.y.map(({ text }) => text), ['10', '20', '30', '40', '50']);
      lines(auto.y, [1, 0.75, 0.5, 0.25, 0], 'y lines');

      // The data attributes fix the ends, and the cells' signs repeat on the labels.
      const ends = await axes('#ends');
      assert.deepEqual(ends.x.map(({ text }) => text), ['$0', '$1K', '$2K']);
      lines(ends.x, [0, 0.4, 0.8], 'the x scale runs from 0 to 2,500');
      assert.deepEqual(ends.y.map(({ text }) => text), ['0%', '20%', '40%', '60%']);
      lines(ends.y, [1, 2 / 3, 1 / 3, 0], 'the y scale runs from 0 to 60');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: scatter chart arrow keys step through the points in table order`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      const plot = page.locator('#ltr .scatter-chart-plot');
      const tooltip = page.locator('#ltr .scatter-chart-tooltip');
      const text = async () => (await tooltip.isVisible()) ? (await tooltip.innerText()).replace(/\s+/g, ' ').trim() : null;

      // Keyboard focus, as Tab gives it, shows the first point.
      await plot.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await text(), 'Civic Weight (kg) 1300 City 31');
      await page.keyboard.press('ArrowRight');
      assert.equal(await text(), 'Civic Weight (kg) 1300 Highway 40', 'a row\'s next series comes before the next row');
      await page.keyboard.press('ArrowDown');
      assert.equal(await text(), 'Corolla Weight (kg) 1400 City 32');
      await page.keyboard.press('End');
      assert.equal(await text(), 'Tahoe Weight (kg) 2600 Highway 20');
      await page.keyboard.press('ArrowRight');
      assert.equal(await text(), 'Tahoe Weight (kg) 2600 Highway 20', 'the last point stays');
      await page.keyboard.press('Home');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await text(), 'Civic Weight (kg) 1300 City 31', 'the first point stays');
      assert.equal(await tooltip.getAttribute('aria-live'), 'polite');
      await page.keyboard.press('Escape');
      assert.equal(await text(), null);
      assert.equal(await page.locator('#ltr .scatter-chart-cursor').isVisible(), false, 'Escape hides the marker too');

      // In the chart with gaps, the keys skip the points it leaves out.
      const gaps = await page.locator('#gaps').evaluate((el) => {
        const chart = Expressive.ScatterChart.getInstance(el);
        const seen = [];
        for (let i = 0; i < 6; i++) {
          chart.show(i);
          seen.push(el.querySelector('.scatter-chart-tooltip').hidden ? null : el.querySelector('.scatter-chart-tooltip strong').textContent);
        }
        return seen;
      });
      assert.deepEqual(gaps, ['Civic', 'Civic', 'Camry', 'Tahoe', 'Tahoe', null]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: scatter chart pointer highlights the nearest point`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      for (const id of ['#ltr', '#rtl']) {
        await page.locator(id).scrollIntoViewIfNeeded();
        const [, highway] = await placed(page, id, [values(2), values(3)]);
        const [x, y] = highway.drawn[2];
        await page.mouse.move(x + 2, y);
        const tooltip = page.locator(`${id} .scatter-chart-tooltip`);
        assert.equal((await tooltip.innerText()).replace(/\s+/g, ' ').trim(), 'Camry Weight (kg) 1600 Highway 39', id);
        const marker = await page.locator(`${id} .scatter-chart-cursor`).evaluate((el) => {
          const box = el.getBoundingClientRect();
          return [box.left + box.width / 2, box.top + box.height / 2, el.dataset.series, el.hidden];
        });
        assert.ok(Math.abs(marker[0] - x) <= 1 && Math.abs(marker[1] - y) <= 1, `${id}: the marker sits on the point`);
        assert.deepEqual(marker.slice(2), ['2', false], `${id}: the marker takes the series color`);
        await page.mouse.move(0, 0);
        assert.equal(await tooltip.isVisible(), false, `${id}: leaving the plot hides the tooltip`);
      }
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
