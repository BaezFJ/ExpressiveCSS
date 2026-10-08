import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const chart = (attrs, caption, header, rows, foot = '') => `<figure ${attrs}>
  <figcaption>${caption}</figcaption>
  <table>
    <thead><tr><th>Goal</th>${header}</tr></thead>
    <tbody>${rows.map(([label, ...cells]) => `<tr><th>${label}</th>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
    ${foot}
  </table>
</figure>`;

const html = `<style>${css}</style>
  <div style="width: 400px">
    ${chart('class="radial-chart" id="goals"', 'Goals', '<th>Progress</th><th>Change</th>', [
      ['Sales', '80%', '+5%'], ['Signups', '50%', '−2%'], ['Churn', '', '0%']])}
    ${chart('class="radial-chart gauge" data-max="25" id="gauge"', 'Seats', '<th>Filled</th>', [['Filled', '18']],
      '<tfoot><tr><th>Seats filled</th><td>18 of 25</td></tr></tfoot>')}
    ${chart('class="radial-chart" id="crowded"', 'Crowded', '<th>V</th>', [['A', '1'], ['B', '1'], ['C', '1'], ['D', '1'], ['E', '150']])}
    ${chart('class="radial-chart" id="many"', 'Many', '<th>V</th>', Array.from({ length: 20 }, (_, i) => [`R${i}`, '50']))}
    ${chart('class="radial-chart" data-max="0" id="zero"', 'Zero max', '<th>V</th>', [['A', '50'], ['B', '-50']])}
  </div>
  <div style="display: flex">
    ${chart('class="radial-chart sparkline" id="spark"', 'Spark', '<th>V</th>', [['A', '75']])}
  </div>
  <script>${js}</script>`;

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  browserTest(`${engine}: radial chart draws rings, a legend and a total from its table`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      const goals = await page.locator('#goals').evaluate((el) => {
        const plot = el.querySelector('.radial-chart-plot');
        return {
          table: getComputedStyle(el.querySelector('table')).position,
          plot: [plot.tabIndex, plot.getAttribute('aria-label'), plot.getAttribute('aria-roledescription')],
          square: plot.offsetWidth === plot.offsetHeight && plot.offsetWidth === 240,
          hidden: el.querySelector('.radial-chart-rings').getAttribute('aria-hidden'),
          rings: [...el.querySelectorAll('.radial-chart-ring')].map((ring) =>
            [ring.dataset.series, ring.getAttribute('r'), ring.getAttribute('stroke-width'), ring.classList.contains('empty')]),
          tracks: el.querySelectorAll('.radial-chart-track').length,
          dash: el.querySelector('.radial-chart-ring').style.getPropertyValue('--radial-chart-dash'),
          offset: getComputedStyle(el.querySelector('.radial-chart-ring')).strokeDashoffset,
          track: el.querySelector('.radial-chart-track').style.getPropertyValue('--radial-chart-dash'),
          transform: el.querySelector('.radial-chart-ring').getAttribute('transform'),
          legend: [...el.querySelectorAll('.radial-chart-legend li')].map((li) =>
            [li.dataset.series, ...[...li.children].map((span) => span.textContent)]),
          labels: el.querySelectorAll('.radial-chart-labels, .radial-chart-total').length,
          instance: [!!Expressive.RadialChart.getInstance(el), !!Expressive.LineChart.getInstance(el)],
        };
      });
      assert.equal(goals.table, 'absolute', 'the table is visually hidden');
      assert.deepEqual(goals.plot, [0, 'Goals', 'radial chart']);
      assert.equal(goals.square, true, 'the plot is a square as wide as the height token');
      assert.equal(goals.hidden, 'true', 'the drawn rings are hidden; the table carries the data');
      // Rings run inwards from a radius of 46, 8 wide with gaps of 2; a gap is an empty ring.
      assert.deepEqual(goals.rings, [['1', '42.000', '8.000', false], ['2', '32.000', '8.000', false], ['3', '22.000', '8.000', true]]);
      assert.equal(goals.tracks, 3);
      // 80% of a circle of radius 42, from the top: the round caps add a width,
      // so the dash is a width shorter and starts half a width in.
      assert.equal(goals.dash, `${(0.8 * 2 * Math.PI * 42 - 8).toFixed(3)} ${(2 * Math.PI * 42).toFixed(3)}`);
      assert.match(goals.offset, /^-4(px)?$/);
      assert.equal(goals.track, `${(2 * Math.PI * 42).toFixed(3)} ${(2 * Math.PI * 42).toFixed(3)}`, 'a whole track has no caps to allow for');
      assert.equal(goals.transform, 'rotate(-90)');
      assert.deepEqual(goals.legend, [['1', 'Sales', '80%'], ['2', 'Signups', '50%'], ['3', 'Churn', '']]);
      assert.equal(goals.labels, 0, 'no row labels, and no total without a <tfoot>');
      assert.deepEqual(goals.instance, [true, false]);
      assert.equal(await page.getByRole('table').first().getByRole('cell', { name: '80%' }).count(), 1,
        'the hidden table stays in the accessibility tree');

      const gauge = await page.locator('#gauge').evaluate((el) => {
        const plot = el.querySelector('.radial-chart-plot');
        const ring = el.querySelector('.radial-chart-ring');
        return {
          viewBox: el.querySelector('svg').getAttribute('viewBox'),
          height: Math.round(plot.getBoundingClientRect().height * 10) / 10,
          transform: ring.getAttribute('transform'),
          dash: ring.style.getPropertyValue('--radial-chart-dash'),
          track: el.querySelector('.radial-chart-track').style.getPropertyValue('--radial-chart-dash'),
          caps: getComputedStyle(el.querySelector('.radial-chart-track')).strokeLinecap,
          total: [getComputedStyle(el.querySelector('.radial-chart-total')).display, el.querySelector('.radial-chart-total').textContent],
          legend: el.querySelectorAll('.radial-chart-legend').length,
        };
      });
      // Half a circle over the middle; the caps end on the base line, so nothing hangs below it.
      assert.equal(gauge.viewBox, '-50 -50 100 50');
      assert.equal(gauge.height, 120);
      assert.equal(gauge.transform, 'rotate(180)');
      assert.equal(gauge.dash, `${((18 / 25) * Math.PI * 42 - 8).toFixed(3)} ${(2 * Math.PI * 42).toFixed(3)}`, 'a share of data-max, over half a turn');
      assert.equal(gauge.track, `${(Math.PI * 42 - 8).toFixed(3)} ${(2 * Math.PI * 42).toFixed(3)}`, "a gauge's track rounds its ends too");
      assert.equal(gauge.caps, 'round');
      assert.deepEqual(gauge.total, ['flex', '18 of 25Seats filled'], 'the <tfoot> row is the total, not a ring');
      assert.equal(gauge.legend, 0, 'one ring needs no legend');

      // Five rings would leave no middle, so they and their gaps thin to fit;
      // a value past the maximum closes its ring, caps included.
      const scale = (46 * 0.8) / (5 * 8 + 4 * 2);
      const crowded = await page.locator('#crowded').evaluate((el) => [
        el.querySelector('.radial-chart-ring').getAttribute('stroke-width'),
        [...el.querySelectorAll('.radial-chart-ring')].map((ring) => ring.getAttribute('r')),
        el.querySelector('.radial-chart-ring:last-of-type').style.getPropertyValue('--radial-chart-dash').split(' ').map(Number),
      ]);
      assert.equal(crowded[0], (8 * scale).toFixed(3));
      assert.equal(crowded[1][1], (46 - 4 * scale - 10 * scale).toFixed(3), 'the gap thins with the rings');
      assert.ok(Math.abs(crowded[2][0] + 8 * scale - crowded[2][1]) < 0.01);

      // Twenty rings still fit inside the radius with a positive width.
      const many = await page.locator('#many').evaluate((el) => [...el.querySelectorAll('.radial-chart-ring')]
        .map((ring) => [Number(ring.getAttribute('stroke-width')), Number(ring.getAttribute('r'))]));
      assert.equal(many.length, 20);
      assert.ok(many.every(([width, r]) => width > 0 && r - width / 2 >= 46 * 0.2 - 0.001));

      // A maximum of zero falls back to 100, and a negative value stays empty.
      assert.deepEqual(await page.locator('#zero').evaluate((el) => [...el.querySelectorAll('.radial-chart-ring')]
        .map((ring) => ring.classList.contains('empty'))), [false, true]);
      assert.equal(await page.locator('#zero .radial-chart-ring').first().evaluate((ring) => ring.style.getPropertyValue('--radial-chart-dash').split(' ')[0]),
        (0.5 * 2 * Math.PI * 42 - 8).toFixed(3));

      assert.deepEqual(await page.locator('#spark').evaluate((el) => [
        el.querySelector('.radial-chart-plot').hasAttribute('tabindex'),
        el.querySelector('.radial-chart-plot').offsetWidth,
      ]), [false, 48], 'a sparkline keeps its size as a flex item');

      await page.evaluate(() => Expressive.RadialChart.getInstance(document.querySelector('#goals')).destroy());
      assert.deepEqual(await page.locator('#goals').evaluate((el) => [
        el.querySelectorAll('.radial-chart-plot, .radial-chart-legend').length,
        getComputedStyle(el.querySelector('table')).clipPath,
        el.Expressive_RadialChart,
      ]), [0, 'none', undefined]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: radial chart tooltip follows the pointer across the rings and the arrow keys`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      const plot = page.locator('#goals .radial-chart-plot');
      const tooltip = page.locator('#goals .radial-chart-tooltip');
      const text = () => tooltip.innerText().then((value) => value.replace(/\s+/g, ' ').trim());
      const active = () => page.locator('#goals .radial-chart-ring.active').evaluateAll((rings) => rings.map((ring) => ring.dataset.series));
      const box = await plot.boundingBox();
      const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
      // A radius in the SVG's units, up and to the left of the middle.
      const at = (r) => page.mouse.move(x - (r / 100) * box.width * Math.SQRT1_2, y - (r / 100) * box.width * Math.SQRT1_2);

      await at(42);
      assert.equal(await text(), 'Sales Progress 80% Change +5%');
      assert.deepEqual(await active(), ['1']);
      // Sales ends at 80%, on the left half, so the tooltip opens rightwards.
      assert.equal(await tooltip.evaluate((el) => el.classList.contains('end')), false);
      await at(32);
      assert.equal(await text(), 'Signups Progress 50% Change −2%');
      assert.deepEqual(await tooltip.locator('[data-series]').evaluateAll((spans) => spans.map((span) => span.dataset.series)), ['2', '2'],
        'the tooltip swatches take the ring color');
      // The gap between rings runs from 36 to 38; each half goes to the ring beside it.
      await at(37.5);
      assert.match(await text(), /^Sales/, 'the outer half of a gap belongs to the outer ring');
      await at(22);
      assert.match(await text(), /^Churn/, 'an empty ring still shows its row');

      await page.mouse.move(x, y);
      assert.equal(await tooltip.isVisible(), false, 'the middle is off the rings');
      assert.deepEqual(await active(), []);
      await page.mouse.move(box.x + 2, box.y + 2);
      assert.equal(await tooltip.isVisible(), false, 'the corners are off the rings');

      // A gauge has no rings below its middle.
      const gaugePlot = page.locator('#gauge .radial-chart-plot');
      await gaugePlot.scrollIntoViewIfNeeded();
      const gauge = await gaugePlot.boundingBox();
      const gaugeTooltip = page.locator('#gauge .radial-chart-tooltip');
      const middle = gauge.y + gauge.width / 2;
      await page.mouse.move(gauge.x + gauge.width * 0.08, middle - 4);
      assert.match(await gaugeTooltip.innerText(), /^Filled/);
      await page.mouse.move(gauge.x + gauge.width * 0.08, middle + 4);
      assert.equal(await gaugeTooltip.isVisible(), false, 'below the base line');

      await plot.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      assert.match(await text(), /^Sales/);
      await page.keyboard.press('ArrowDown');
      assert.match(await text(), /^Signups/);
      await page.keyboard.press('ArrowRight');
      assert.equal(await text(), 'Churn Change 0%', 'a missing value has no line, as in other charts');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowLeft');
      assert.match(await text(), /^Sales/);
      await page.keyboard.press('End');
      assert.match(await text(), /^Churn/);
      await page.keyboard.press('Escape');
      assert.equal(await tooltip.isVisible(), false);

      // In RTL the rings and arrows still run clockwise, so left from the outer ring wraps to the inner one.
      const rtl = await page.evaluate(() => {
        const wrap = document.createElement('div');
        wrap.dir = 'rtl';
        wrap.append(document.querySelector('#goals').cloneNode(true));
        document.body.append(wrap);
        const el = wrap.firstElementChild;
        el.querySelectorAll('.radial-chart-plot, .radial-chart-legend').forEach((node) => node.remove());
        const chart = Expressive.RadialChart.init(el);
        chart.show(0);
        el.querySelector('.radial-chart-plot').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        return [el.querySelector('.radial-chart-ring').getAttribute('transform'), chart.activeIndex];
      });
      assert.deepEqual(rtl, ['rotate(-90)', 2]);
    } finally {
      await browser.close();
    }
  });
}
