import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

/** A chart figure: its caption, a header row, and body rows that each start with a label. */
const figure = (attrs, rows) => `<figure ${attrs}>
  <figcaption>Budget by team</figcaption>
  <table>
    <thead><tr><th>Team</th><th>Budget</th></tr></thead>
    <tbody>${rows.map(([label, ...cells]) => `<tr><th>${label}</th>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</figure>`;

// Six teams out of order, two of them equal, summing to 1,200.
const teams = [['Design', '120'], ['Research', '300'], ['Sales', '80'], ['Support', '80'], ['Engineering', '600'], ['Legal', '20']];

const html = `<style>${css}</style>
  <div style="width: 600px">
    ${figure('class="treemap-chart" id="ltr"', teams)}
    ${figure('class="treemap-chart" id="gaps"', teams.map(([team, value]) => [team, { Research: '0', Sales: '-5', Legal: 'n/a' }[team] ?? value]))}
  </div>
  <div style="width: 600px" dir="rtl">
    ${figure('class="treemap-chart" id="rtl"', teams)}
  </div>
  <script>${js}</script>`;

/** Runs in the page: each rectangle's name and its box in pixels from the plot's top left, and the plot's size. */
const boxes = (page, id) => page.locator(id).evaluate((el) => {
  const plot = el.querySelector('.treemap-chart-plot').getBoundingClientRect();
  return {
    plot: [plot.width, plot.height],
    boxes: [...el.querySelectorAll('.treemap-chart-box')].map((box) => {
      const { left, top, width, height } = box.getBoundingClientRect();
      return { name: box.firstElementChild.textContent, box: [left - plot.left, top - plot.top, width, height] };
    }),
  };
});

/**
 * Checks the roadmap's rule: each rectangle's area is its value's share of
 * the plot, within a pixel round its edges, and together they cover the plot
 * without overlapping or leaving it.
 */
function proportional({ plot: [width, height], boxes: drawn }, values, message) {
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  assert.deepEqual(drawn.map(({ name }) => name).sort(), Object.keys(values).sort(), `${message}: one rectangle per positive row`);
  let sum = 0;
  for (const { name, box: [x, y, w, h] } of drawn) {
    const expected = (width * height * values[name]) / total;
    assert.ok(Math.abs(w * h - expected) <= w + h, `${message}, ${name}: area ${w * h}, expected ${expected}`);
    assert.ok(x >= -0.5 && y >= -0.5 && x + w <= width + 0.5 && y + h <= height + 0.5, `${message}, ${name}: inside the plot`);
    sum += w * h;
  }
  assert.ok(Math.abs(sum - width * height) <= width * height * 0.01, `${message}: the areas sum to the plot's, ${sum}`);
  drawn.forEach(({ name, box: a }, i) => drawn.slice(i + 1).forEach(({ name: other, box: b }) => {
    const overlap = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]))
      * Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
    assert.ok(overlap <= 1, `${message}: ${name} and ${other} overlap by ${overlap}`);
  }));
}

// The squarified layout of the six teams in a 600 by 240 plot, worked by hand
// from the largest value down: [left, top, width, height] in pixels.
const layout = {
  Engineering: [0, 0, 300, 240],
  Research: [300, 0, 150, 240],
  Design: [450, 0, 150, 96],
  Sales: [450, 96, 400 / 3, 72],
  Support: [450, 168, 400 / 3, 72],
  Legal: [450 + 400 / 3, 96, 50 / 3, 144],
};

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: treemap chart draws each row as a rectangle whose area follows its value`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      const ltr = await page.locator('#ltr').evaluate((el) => {
        const plot = el.querySelector('.treemap-chart-plot');
        return {
          table: getComputedStyle(el.querySelector('table')).position,
          plot: [plot.tabIndex, plot.getAttribute('aria-label'), plot.getAttribute('aria-roledescription')],
          hidden: el.querySelector('.treemap-chart-boxes').getAttribute('aria-hidden'),
          instance: [!!Expressive.TreemapChart.getInstance(el), !!Expressive.LineChart.getInstance(el)],
        };
      });
      assert.equal(ltr.table, 'absolute', 'the table is visually hidden');
      assert.deepEqual(ltr.plot, [0, 'Budget by team', 'treemap chart']);
      assert.equal(ltr.hidden, 'true', 'the drawing is hidden; the table carries the data');
      assert.deepEqual(ltr.instance, [true, false]);

      const values = Object.fromEntries(teams.map(([team, value]) => [team, Number(value)]));
      for (const id of ['#ltr', '#rtl']) {
        const drawn = await boxes(page, id);
        assert.deepEqual(drawn.plot, [600, 240], `${id}: the plot`);
        proportional(drawn, values, id);
        // The largest first, at the top inline-start corner; equal values in table order.
        const mirror = id === '#rtl' ? ([x, y, w, h]) => [600 - x - w, y, w, h] : (box) => box;
        for (const { name, box } of drawn.boxes) {
          mirror(box).forEach((edge, i) => assert.ok(Math.abs(edge - layout[name][i]) <= 1,
            `${id}, ${name}: at ${mirror(box)}, expected ${layout[name]}`));
        }
      }
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: treemap chart draws nothing for a zero, negative or non-numeric row`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error));
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      proportional(await boxes(page, '#gaps'), { Design: 120, Support: 80, Engineering: 600 }, '#gaps');
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
}
