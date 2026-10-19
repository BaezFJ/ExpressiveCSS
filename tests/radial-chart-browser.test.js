import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { leaseBrowser } from './browser.js';

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
    const browser = await leaseBrowser(browserType);
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
    const browser = await leaseBrowser(browserType);
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

  browserTest(`${engine}: radial chart .labels names each ring at its start`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(`<style>${css}</style>
        <div style="width: 400px">
          ${chart('class="radial-chart labels" id="named"', 'Named', '<th>V</th>', [['Sales', '100'], ['Marketing', '64'], ['Support', '38']])}
          ${chart('class="radial-chart labels" id="crowd"', 'Crowd', '<th>V</th>', Array.from({ length: 8 }, (_, i) => [`Team ${i + 1}`, '50']))}
          ${chart('class="radial-chart labels gauge" id="half"', 'Half', '<th>V</th>', [['Filled', '50'], ['Offered', '40'], ['Waitlisted', '30']])}
          ${chart('class="radial-chart labels sparkline" id="tiny"', 'Tiny', '<th>V</th>', [['A', '50']])}
          <div dir="rtl">${chart('class="radial-chart labels gauge" id="rtl-half"', 'RTL', '<th>V</th>', [['Filled', '50'], ['Offered', '40'], ['Waitlisted', '30']])}</div>
        </div>
        <script>${js}</script>`);
      await page.evaluate(() => Expressive.AutoInit());

      const measure = (el) => {
        const plot = el.querySelector('.radial-chart-plot').getBoundingClientRect();
        const [cx, cy] = [plot.left + plot.width / 2, plot.top + plot.width / 2];
        const rings = [...el.querySelectorAll('.radial-chart-ring')];
        const names = [...el.querySelectorAll('.radial-chart-names > span')].map((span, i) => {
          const box = span.getBoundingClientRect();
          // The ring's top, in pixels from the plot's top.
          const top = cy - (parseFloat(rings[i].getAttribute('r')) / 100) * plot.width;
          return {
            text: span.textContent,
            box,
            onRing: Math.abs((box.top + box.bottom) / 2 - top) <= 1,
            quarter: box.right <= cx && box.left >= plot.left - 1 && box.bottom <= cy,
            size: parseFloat(getComputedStyle(span).fontSize),
            color: getComputedStyle(span).color,
          };
        });
        const track = el.querySelector('.radial-chart-track');
        const width = parseFloat(track.getAttribute('stroke-width'));
        const length = 2 * Math.PI * parseFloat(track.getAttribute('r'));
        const dash = parseFloat(track.style.getPropertyValue('--radial-chart-dash'));
        const round = getComputedStyle(track).strokeLinecap;
        return {
          names: names.map(({ text }) => text),
          color: names.every(({ color }) => color === getComputedStyle(el.querySelector('figcaption')).color),
          onRing: names.every((name) => name.onRing),
          quarter: names.every((name) => name.quarter),
          overlaps: names.filter((a, i) => names.slice(i + 1).some((b) => a.box.bottom > b.box.top && b.box.bottom > a.box.top)).length,
          sizes: names.map((name) => name.size),
          // A round-capped dash is one width shorter than its share.
          span: Math.round(((dash + (round === 'round' ? width : 0)) / length) * 100) / 100,
          round,
          hidden: names.length ? el.querySelector('.radial-chart-names').closest('[aria-hidden="true"]') !== null : null,
        };
      };

      const named = await page.locator('#named').evaluate(measure);
      assert.deepEqual(named.names, ['Sales', 'Marketing', 'Support'], 'each ring is named, outermost first');
      assert.ok(named.color, 'the names are in the caption\'s on-surface-variant, readable whatever the ring colors');
      assert.ok(named.onRing, 'each name is centred on its ring at the top');
      assert.ok(named.quarter, 'the names sit in the top left quarter, ending at the middle line');
      assert.equal(named.overlaps, 0, 'the names do not overlap');
      assert.equal(named.span, 0.75, 'the track runs three quarters of the circle');
      assert.equal(named.round, 'round', 'the track has round ends');
      assert.ok(named.hidden, 'the names are aria-hidden with the rings');

      const crowd = await page.locator('#crowd').evaluate(measure);
      assert.equal(crowd.names.length, 8);
      assert.equal(crowd.overlaps, 0, 'names shrink to fit crowded rings');
      assert.ok(Math.max(...crowd.sizes) < Math.max(...named.sizes), `crowded names are smaller: ${crowd.sizes[0]} vs ${named.sizes[0]}`);

      const gauge = (el) => {
        const plot = el.querySelector('.radial-chart-plot').getBoundingClientRect();
        const rings = [...el.querySelectorAll('.radial-chart-ring')];
        const names = [...el.querySelectorAll('.radial-chart-names > span')].map((span, i) => {
          const range = document.createRange();
          range.selectNodeContents(span);
          const text = range.getBoundingClientRect();
          // The ring's start on the base line, in pixels.
          const start = plot.left + plot.width / 2 - (parseFloat(rings[i].getAttribute('r')) / 100) * plot.width;
          return { name: span.textContent, text, box: span.getBoundingClientRect(), start };
        });
        const track = el.querySelector('.radial-chart-track');
        const dash = parseFloat(track.style.getPropertyValue('--radial-chart-dash'));
        const width = parseFloat(track.getAttribute('stroke-width'));
        return {
          names: names.map(({ name }) => name),
          atStart: names.every(({ box, start }) => Math.abs(box.left - start) <= 1),
          below: names.every(({ box }) => box.top >= plot.bottom),
          lines: names.every(({ box }) => box.top - plot.bottom <= 8 && box.bottom >= box.top + 1),
          rows: names.map(({ text }) => Math.round(text.top - plot.bottom)),
          // The text starts past the 1px line and its 4px padding.
          afterLine: names.every(({ text, start }) => Math.abs(text.left - start - 5) <= 1),
          legend: el.querySelector('.radial-chart-legend').getBoundingClientRect().top >= Math.max(...names.map(({ box }) => box.bottom)),
          span: Math.round(((dash + width) / (2 * Math.PI * parseFloat(track.getAttribute('r')))) * 100) / 100,
        };
      };
      const half = await page.locator('#half').evaluate(gauge);
      assert.deepEqual(half.names, ['Filled', 'Offered', 'Waitlisted'], 'a gauge names each ring too');
      assert.equal(half.span, 0.5, 'a gauge keeps its half circle');
      assert.ok(half.atStart, 'each name\'s line drops from its ring\'s start');
      assert.ok(half.below && half.lines, 'the names hang just under the base line');
      assert.ok(half.rows[2] < half.rows[1] && half.rows[1] < half.rows[0], `the innermost name is the top row: ${half.rows}`);
      assert.ok(half.afterLine, 'each name starts after its line');
      assert.ok(half.legend, 'the plot leaves room for the names above the legend');
      const rtl = await page.locator('#rtl-half').evaluate(gauge);
      assert.ok(rtl.atStart && rtl.afterLine, 'in RTL each name still starts beside its line');
      const tiny = await page.locator('#tiny').evaluate(measure);
      assert.deepEqual([tiny.names, tiny.span, tiny.round], [[], 1, 'butt'], 'a sparkline has no names and whole tracks');

      // A full ring's tooltip sits at nine o'clock, where the fill ends.
      const tip = await page.locator('#named').evaluate((el) => {
        Expressive.RadialChart.getInstance(el).show(0);
        const tooltip = el.querySelector('.radial-chart-tooltip');
        const r = parseFloat(el.querySelector('.radial-chart-ring').getAttribute('r'));
        return [Math.abs(parseFloat(tooltip.style.left) - (50 - r)) < 0.01, Math.abs(parseFloat(tooltip.style.top) - 50) < 0.01];
      });
      assert.deepEqual(tip, [true, true], 'the tooltip follows the three-quarter fill');

      // Across the whole of a name, the pointer picks that name's ring.
      await page.evaluate(() => Expressive.RadialChart.getInstance(document.querySelector('#named')).show(-1));
      const name = await page.locator('#named .radial-chart-names > span').nth(1).boundingBox();
      for (const share of [0.05, 0.5, 0.95]) {
        await page.mouse.move(name.x + name.width * share, name.y + name.height / 2);
        const hovered = await page.locator('#named').evaluate((el) => [
          el.querySelector('.radial-chart-tooltip strong')?.textContent,
          [...el.querySelectorAll('.radial-chart-ring')].findIndex((ring) => ring.classList.contains('active')),
        ]);
        assert.deepEqual(hovered, ['Marketing', 1], `hovering ${share * 100}% across Marketing shows its ring`);
      }

      // Under a gauge, the pointer on a name's text picks that name's ring.
      await page.locator('#half').scrollIntoViewIfNeeded();
      for (const [i, row] of ['Filled', 'Offered', 'Waitlisted'].entries()) {
        const text = await page.locator('#half').evaluate((el, i) => {
          const range = document.createRange();
          range.selectNodeContents(el.querySelectorAll('.radial-chart-names > span')[i]);
          const { x, y, width, height } = range.getBoundingClientRect();
          return { x: x + width / 2, y: y + height / 2 };
        }, i);
        await page.mouse.move(text.x, text.y);
        const hovered = await page.locator('#half').evaluate((el) => [
          el.querySelector('.radial-chart-tooltip strong')?.textContent,
          [...el.querySelectorAll('.radial-chart-ring')].findIndex((ring) => ring.classList.contains('active')),
        ]);
        assert.deepEqual(hovered, [row, i], `hovering ${row} under the gauge shows its ring`);
      }
      // A gauge's top left is ring, not names, so the pointer goes by distance there.
      const ring = await page.locator('#half').evaluate((el) => {
        const plot = el.querySelector('.radial-chart-plot').getBoundingClientRect();
        const r = (parseFloat(el.querySelector('.radial-chart-ring').getAttribute('r')) / 100) * plot.width;
        return { x: plot.left + plot.width / 2 - r * Math.SQRT1_2, y: plot.bottom - r * Math.SQRT1_2 };
      });
      await page.mouse.move(ring.x, ring.y);
      assert.equal(await page.locator('#half .radial-chart-tooltip strong').textContent(), 'Filled', 'the outer ring is under the pointer at half past ten');
    } finally {
      await browser.close();
    }
  });
}
