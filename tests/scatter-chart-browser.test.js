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
  <div style="width: 600px">
    ${chart(`class="scatter-chart" id="watched" data-watch ${fixed}`, cars)}
    ${chart('class="scatter-chart axis toggle" id="toggled"', [...cars, ['Hummer', '4000', '', '14']])}
    ${chart('class="scatter-chart axis" id="xonly"', [...cars, ['Trailer', '5000', '', '']])}
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

// Country, GDP per person, two y series, then the population that sizes each
// bubble: the largest is four times the smallest.
const countries = [['Chile', '30000', '80', '70', '20'], ['Peru', '15000', '77', '68', '35'], ['Mexico', '22000', '75', '66', '80'], ['Spain', '45000', '83', '72', '48']];
const bubbles = (attrs, rows) => `<figure ${attrs}>
  <figcaption>Health and wealth</figcaption>
  <table>
    <thead><tr><th>Country</th><th>GDP per person</th><th>Life expectancy</th><th>Healthy years</th><th>Population</th></tr></thead>
    <tbody>${rows.map(([label, ...cells]) => `<tr><th>${label}</th>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</figure>`;
const bubbleEnds = 'data-x-min="0" data-x-max="60000" data-min="50" data-max="100"';
const bubbleHtml = `<style>${css}</style>
  <div style="width: 600px">
    ${bubbles(`class="scatter-chart bubble" id="bubbles" ${bubbleEnds}`, countries)}
  </div>
  <div style="width: 600px" dir="rtl">
    ${bubbles(`class="scatter-chart bubble" id="rtl-bubbles" ${bubbleEnds}`, countries)}
  </div>
  <div style="width: 600px">
    ${bubbles(`class="scatter-chart bubble" id="bubble-gaps" ${bubbleEnds}`,
      countries.map((row, i) => (i < 2 ? [...row.slice(0, 4), ['n/a', '0'][i]] : row)))}
    ${bubbles(`class="scatter-chart bubble toggle" id="bubble-toggle" ${bubbleEnds}`, [...countries, ['Japan', '40000', '', '74', '160']])}
    ${bubbles(`class="scatter-chart bubble" id="bubble-watched" data-watch ${bubbleEnds}`, countries)}
  </div>
  <div style="width: 600px">
    ${bubbles('class="scatter-chart bubble axis toggle" id="bubble-edges" data-x-min="15000" data-x-max="45000" data-min="66" data-max="83"', countries)}
  </div>
  <script>${js}</script>`;

/**
 * Each series' bubbles as drawn: centre in page pixels and diameter, with the
 * plot box and direction to place a value pair on the fixed scales.
 */
const drawnBubbles = (page, id) => page.locator(id).evaluate((el) => {
  const plot = el.querySelector('.scatter-chart-plot');
  const box = plot.getBoundingClientRect();
  return {
    plot: [box.left + plot.clientLeft, box.top + plot.clientTop, plot.clientWidth, plot.clientHeight],
    rtl: getComputedStyle(el).direction === 'rtl',
    legend: [...el.querySelectorAll('.scatter-chart-legend li')].map((li) => li.textContent),
    series: [...el.querySelectorAll('.scatter-chart-series')].map((group) => [...group.querySelectorAll('.scatter-chart-points')].map((path) => {
      const [, x, y] = path.getAttribute('d').match(/M([-\d.e]+),([-\d.e]+)/);
      const point = new DOMPoint(Number(x), Number(y)).matrixTransform(path.getScreenCTM());
      return { at: [point.x, point.y], size: parseFloat(getComputedStyle(path).strokeWidth) };
    })),
  };
});

/** Where a country's bubble belongs in series `s`, and the diameter its population gives against the largest, 80. */
function bubblePlace({ plot: [left, top, width, height], rtl }, s, [, gdp, ...rest]) {
  const share = Number(gdp) / 60000;
  const x = left + (rtl ? 1 - share : share) * width;
  return { at: [x, top + (1 - (Number(rest[s]) - 50) / 50) * height], size: 48 * Math.sqrt(Number(rest[2]) / 80) };
}

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

      // The xMin and xMax options fix the x ends as the data attributes do.
      const options = await page.locator('#auto').evaluate((el) => {
        // A fresh figure from the caption and table, without the drawn parts.
        const figure = document.createElement('figure');
        figure.className = 'scatter-chart axis';
        figure.append(...['figcaption', 'table'].map((tag) => el.querySelector(`:scope > ${tag}`).cloneNode(true)));
        el.after(figure);
        Expressive.ScatterChart.init(figure, { xMin: 0, xMax: 2500 });
        return [...figure.querySelectorAll('.scatter-chart-axis.x > li')].map((li) => li.textContent);
      });
      assert.deepEqual(options, ['0', '1K', '2K']);
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
        // Camry sits 40% across from the left, or 60% in the mirrored chart, where the tooltip opens back over the plot.
        assert.equal(await tooltip.evaluate((el) => el.classList.contains('end')), id === '#rtl', `${id}: the tooltip opens away from the near edge`);
        await page.mouse.move(0, 0);
        assert.equal(await tooltip.isVisible(), false, `${id}: leaving the plot hides the tooltip`);
      }
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: scatter chart update() moves the points and keeps focus, and data-watch redraws`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      const plot = page.locator('#ltr .scatter-chart-plot');
      await plot.focus();
      await page.evaluate(() => Expressive.ScatterChart.getInstance(document.querySelector('#ltr')).show(1));

      // Civic's highway value goes from 40 to 45.
      const moved = await page.locator('#ltr').evaluate((el) => {
        el.querySelector('tbody tr td:nth-of-type(3)').textContent = '45';
        const chart = Expressive.ScatterChart.getInstance(el);
        chart.update();
        const animate = el.querySelectorAll('.scatter-chart-points')[1].querySelector('animate');
        return {
          focused: document.activeElement === el.querySelector('.scatter-chart-plot'),
          active: chart.activeIndex,
          tooltip: el.querySelector('.scatter-chart-tooltip').innerText.replace(/\s+/g, ' ').trim(),
          from: animate?.getAttribute('from'),
          animated: el.querySelectorAll('animate').length,
        };
      });
      assert.equal(moved.focused, true, 'focus stays on the plot');
      assert.equal(moved.active, 1, 'the highlighted point stays');
      assert.equal(moved.tooltip, 'Civic Weight (kg) 1300 Highway 45');
      assert.match(moved.from, /^M32\.5,20h0/, 'the moved point starts from its old place');
      assert.equal(moved.animated, 1, 'only the series that changed moves');
      // The end of the motion: the drawn path data holds the new place.
      near(await placed(page, '#ltr', [values(2), values(3).map(([x, y], i) => [x, i ? y : 45])]), 'after update()');

      await page.emulateMedia({ reducedMotion: 'reduce' });
      const still = await page.locator('#ltr').evaluate((el) => {
        el.querySelector('tbody tr td:nth-of-type(3)').textContent = '30';
        Expressive.ScatterChart.getInstance(el).update();
        return el.querySelectorAll('animate').length;
      });
      assert.equal(still, 0, 'no motion when the reader prefers less');

      // data-watch redraws once the table changes, with no update() call.
      await page.locator('#watched').evaluate((el) => { el.querySelector('tbody tr td').textContent = '2000'; });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      near(await placed(page, '#watched', [values(2), values(3)].map((series) => series.map(([x, y], i) => [i ? x : 2000, y]))), 'data-watch');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: scatter chart toggle legend hides a series and refits the scales`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      const chart = page.locator('#toggled');
      const state = () => chart.evaluate((el) => ({
        series: [...el.querySelectorAll('.scatter-chart-series')].map((group) => group.dataset.series),
        buttons: [...el.querySelectorAll('.chart-toggle')].map((button) => [button.textContent, button.getAttribute('aria-pressed'), button.getAttribute('aria-disabled')]),
        y: [...el.querySelectorAll('.scatter-chart-axis:not(.x) > li')].map((li) => li.textContent),
        x: [...el.querySelectorAll('.scatter-chart-axis.x > li')].map((li) => li.textContent),
      }));

      // The Hummer, at 4,000 kg, has only a highway value.
      const shown = await state();
      assert.deepEqual(shown.y, ['10', '20', '30', '40', '50']);
      assert.deepEqual(shown.x, ['1K', '2K', '3K', '4K', '5K']);
      await chart.getByRole('button', { name: 'Highway' }).click();
      const hidden = await state();
      assert.deepEqual(hidden.series, ['1'], 'the highway points are gone');
      assert.deepEqual(hidden.buttons, [['City', 'true', 'true'], ['Highway', 'false', null]]);
      assert.deepEqual(hidden.y, ['10', '20', '30', '40'], 'the y scale refits to the city values');
      assert.deepEqual(hidden.x, ['1K', '1.5K', '2K', '2.5K', '3K'], 'the x scale refits to the rows with a city value');

      await chart.getByRole('button', { name: 'City' }).click({ force: true });
      assert.deepEqual((await state()).series, ['1'], 'the last series shown stays');
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
      // A row with an x value but no y values draws nothing, so it does not stretch the x scale.
      assert.deepEqual(await page.locator('#xonly .scatter-chart-axis.x > li').allTextContents(), ['1K', '1.5K', '2K', '2.5K', '3K']);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: bubble chart sizes each point so its area follows the last column`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(bubbleHtml);
      await page.evaluate(() => Expressive.AutoInit());

      for (const id of ['#bubbles', '#rtl-bubbles']) {
        const chart = await drawnBubbles(page, id);
        assert.deepEqual(chart.legend, ['Life expectancy', 'Healthy years'], `${id}: the population column is no series`);
        assert.equal(chart.series.length, 2, `${id}: two series`);
        chart.series.forEach((drawn, s) => {
          assert.equal(drawn.length, countries.length, `${id}, series ${s + 1}: one bubble per row`);
          const sizes = drawn.map(({ size }) => size);
          assert.deepEqual(sizes, [...sizes].sort((a, b) => b - a), `${id}, series ${s + 1}: largest first, so smaller bubbles draw on top`);
          for (const row of countries) {
            const want = bubblePlace(chart, s, row);
            const bubble = drawn.find(({ at }) => Math.abs(at[0] - want.at[0]) <= 1 && Math.abs(at[1] - want.at[1]) <= 1);
            assert.ok(bubble, `${id}, series ${s + 1}: a bubble at ${row[0]}'s values, ${want.at}`);
            // Area within 2%: the diameter squared over the population matches the largest bubble's.
            assert.ok(Math.abs((bubble.size / want.size) ** 2 - 1) < 0.02,
              `${id}, series ${s + 1}, ${row[0]}: ${bubble.size}px across, expected ${want.size}px`);
          }
        });
      }
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: bubble chart leaves out rows without a positive size`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error));
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(bubbleHtml);
      await page.evaluate(() => Expressive.AutoInit());

      const chart = await drawnBubbles(page, '#bubble-gaps');
      assert.deepEqual(chart.series.map((drawn) => drawn.length), [2, 2], 'Chile ("n/a") and Peru ("0") draw nothing');
      const seen = await page.locator('#bubble-gaps').evaluate((el) => {
        const instance = Expressive.ScatterChart.getInstance(el);
        return [0, 1, 2, 3, 4].map((i) => {
          instance.show(i);
          return el.querySelector('.scatter-chart-tooltip').hidden ? null : el.querySelector('.scatter-chart-tooltip strong').textContent;
        });
      });
      assert.deepEqual(seen, ['Mexico', 'Mexico', 'Spain', 'Spain', null]);
      await page.evaluate(() => Expressive.ScatterChart.getInstance(document.querySelector('#bubble-gaps')).show(-1));
      await page.locator('#bubble-gaps .scatter-chart-plot').focus();
      await page.keyboard.press('End');
      assert.equal(await page.locator('#bubble-gaps .scatter-chart-tooltip strong').textContent(), 'Spain', 'End reaches the last drawn point');
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: bubble chart tooltip names the size, and the marker outlines the bubble`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(bubbleHtml);
      await page.evaluate(() => Expressive.AutoInit());
      await page.locator('#bubbles .scatter-chart-plot').focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      const tooltip = (await page.locator('#bubbles .scatter-chart-tooltip').innerText()).replace(/\s+/g, ' ').trim();
      assert.equal(tooltip, 'Chile GDP per person 30000 Life expectancy 80 Population 20');
      const swatches = await page.locator('#bubbles .scatter-chart-tooltip > span').evaluateAll((spans) =>
        spans.map((span) => [span.textContent, getComputedStyle(span, '::before').content !== 'none']));
      assert.deepEqual(swatches.filter(([, swatch]) => swatch).map(([text]) => text), ['Life expectancy'], 'only the series has a swatch');
      // Chile's bubble is 24px across; the marker adds its 2px border each side.
      const marker = await page.locator('#bubbles .scatter-chart-cursor').evaluate((el) => el.getBoundingClientRect().width);
      assert.ok(Math.abs(marker - 28) <= 0.5, `marker ${marker}px across`);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: bubble chart toggle legend refits the sizes to the points still shown`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(bubbleHtml);
      await page.evaluate(() => Expressive.AutoInit());

      // Japan, only in "Healthy years", has the largest population, 160, so Mexico's 80 is half its area.
      const before = await drawnBubbles(page, '#bubble-toggle');
      const mexico = (chart) => chart.series[0].find(({ at }) => Math.abs(at[0] - bubblePlace(chart, 0, countries[2]).at[0]) <= 1);
      assert.ok(Math.abs(mexico(before).size - 48 * Math.SQRT1_2) < 0.5, `Mexico ${mexico(before).size}px across beside Japan`);

      await page.locator('#bubble-toggle .scatter-chart-legend button', { hasText: 'Healthy years' }).click();
      const after = await drawnBubbles(page, '#bubble-toggle');
      assert.equal(after.series.length, 1);
      assert.equal(after.series[0].length, countries.length, 'Japan has no life expectancy, so it leaves');
      for (const row of countries) {
        const want = bubblePlace(after, 0, row);
        const bubble = after.series[0].find(({ at }) => Math.abs(at[0] - want.at[0]) <= 1 && Math.abs(at[1] - want.at[1]) <= 1);
        assert.ok(bubble && Math.abs((bubble.size / want.size) ** 2 - 1) < 0.02, `${row[0]}: ${bubble?.size}px across, expected ${want.size}px`);
      }
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: bubble chart update() grows a bubble from its old size, and data-watch redraws`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(bubbleHtml);
      await page.evaluate(() => Expressive.AutoInit());
      await page.locator('#bubbles .scatter-chart-plot').focus();

      // Chile's population goes from 20 to 80, so its bubbles go from half the largest diameter to all of it.
      const grown = await page.locator('#bubbles').evaluate((el) => {
        el.querySelector('tbody tr td:nth-of-type(4)').textContent = '80';
        Expressive.ScatterChart.getInstance(el).update();
        const moving = [...el.querySelectorAll('.scatter-chart-points')].filter((path) => path.getAnimations().length);
        return {
          focused: document.activeElement === el.querySelector('.scatter-chart-plot'),
          frames: moving.map((path) => path.getAnimations()[0].effect.getKeyframes().map((frame) => Number(frame['--scatter-chart-size']))),
          durations: moving.map((path) => path.getAnimations()[0].effect.getTiming().duration),
          sizes: moving.map((path) => path.style.getPropertyValue('--scatter-chart-size')),
        };
      });
      assert.equal(grown.focused, true, 'focus stays on the plot');
      assert.deepEqual(grown.frames, [[0.5, 1], [0.5, 1]], 'only Chile\'s two bubbles grow, from their old size');
      assert.deepEqual(grown.sizes, ['1', '1']);
      assert.deepEqual(grown.durations, [400, 400], 'the medium4 motion token, as the points move');

      await page.emulateMedia({ reducedMotion: 'reduce' });
      const still = await page.locator('#bubbles').evaluate((el) => {
        el.querySelector('tbody tr td:nth-of-type(4)').textContent = '20';
        Expressive.ScatterChart.getInstance(el).update();
        return [...el.querySelectorAll('.scatter-chart-points')].filter((path) => path.getAnimations().length).length;
      });
      assert.equal(still, 0, 'no motion when the reader prefers less');

      // data-watch redraws once Peru's population changes from 35 to 80, with no update() call.
      await page.locator('#bubble-watched').evaluate((el) => { el.querySelectorAll('tbody tr')[1].cells[4].textContent = '80'; });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      const watched = await drawnBubbles(page, '#bubble-watched');
      const peru = watched.series[0].find(({ at }) => Math.abs(at[0] - bubblePlace(watched, 0, countries[1]).at[0]) <= 1);
      assert.ok(Math.abs(peru.size - 48) < 0.5, `Peru ${peru.size}px across after the edit`);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: bubble chart leaves room for bubbles at the ends of its scales`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(bubbleHtml);
      await page.evaluate(() => Expressive.AutoInit());

      // The scales end at the data's extremes: Peru sits on the left edge,
      // Spain on the top and right, and Mexico, 48px across, on the bottom.
      const room = await page.locator('#bubble-edges').evaluate((el) => {
        const rect = (node) => node.getBoundingClientRect();
        const bubbles = [...el.querySelectorAll('.scatter-chart-points')].map((path) => {
          const { left, top, width, height } = rect(path);
          const r = parseFloat(getComputedStyle(path).strokeWidth) / 2;
          // A zero-length path's box is its centre.
          return { left: left + width / 2 - r, right: left + width / 2 + r, top: top + height / 2 - r, bottom: top + height / 2 + r };
        });
        const edge = (side, pick) => pick(...bubbles.map((box) => box[side]));
        return {
          bubbles: { left: edge('left', Math.min), right: edge('right', Math.max), top: edge('top', Math.min), bottom: edge('bottom', Math.max) },
          figure: rect(el),
          caption: rect(el.querySelector('figcaption')).bottom,
          yLabels: Math.max(...[...el.querySelectorAll('.scatter-chart-axis:not(.x) > li > span')].map((span) => rect(span).right)),
          xLabels: Math.min(...[...el.querySelectorAll('.scatter-chart-axis.x > li > span')].map((span) => rect(span).top)),
          legend: rect(el.querySelector('.scatter-chart-legend')).top,
        };
      });
      const { bubbles } = room;
      assert.ok(room.yLabels <= bubbles.left + 0.5, `y labels end at ${room.yLabels}, a bubble starts at ${bubbles.left}`);
      assert.ok(room.xLabels >= bubbles.bottom - 0.5, `x labels start at ${room.xLabels}, a bubble ends at ${bubbles.bottom}`);
      assert.ok(room.legend >= bubbles.bottom - 0.5, `the legend starts at ${room.legend}, a bubble ends at ${bubbles.bottom}`);
      assert.ok(room.caption <= bubbles.top + 0.5, `the caption ends at ${room.caption}, a bubble starts at ${bubbles.top}`);
      assert.ok(bubbles.right <= room.figure.right + 0.5, `a bubble ends at ${bubbles.right}, past the figure at ${room.figure.right}`);
    } finally {
      await browser.close();
    }
  });
}
