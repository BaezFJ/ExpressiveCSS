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
    <thead><tr><th>Plan</th>${header}</tr></thead>
    <tbody>${rows.map(([label, ...cells]) => `<tr><th>${label}</th>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
    ${foot}
  </table>
</figure>`;

const html = `<style>${css}</style>
  <div style="width: 400px">
    ${chart('class="pie-chart" id="plans"', 'Plans', '<th>Revenue</th><th>Change</th>', [
      ['Basic', '$50', '+10%'], ['Premium', '$25', '−2%'], ['Free', '$0', '0%'], ['Enterprise', '$25', '+4%']])}
    ${chart('class="pie-chart donut values" id="donut"', 'Donut', '<th>Leads</th>', [
      ['Referrals', '96'], ['Search', '3'], ['Paid', '1']], '<tfoot><tr><th>Total leads</th><td>100</td></tr></tfoot>')}
    ${chart('class="pie-chart" id="seven"', 'Seven', '<th>V</th>', [['A', '1'], ['B', '1'], ['C', '1'], ['D', '1'], ['E', '1'], ['F', '1'], ['G', '1']])}
    ${chart('class="pie-chart" id="trailing"', 'Trailing', '<th>V</th>', [['A', '1'], ['B', '1'], ['C', '1'], ['D', '1'], ['E', '1'], ['F', '1'], ['G', '1'], ['H', '0']])}
    ${chart('class="pie-chart" id="whole"', 'Whole', '<th>V</th>', [['Only', '5'], ['None', '']])}
    ${chart('class="pie-chart sparkline" id="spark"', 'Spark', '<th>V</th>', [['A', '1'], ['B', '2']])}
  </div>
  <script>${js}</script>`;

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  browserTest(`${engine}: pie chart draws slices, a legend and a donut total from its table`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      const plans = await page.locator('#plans').evaluate((el) => {
        const plot = el.querySelector('.pie-chart-plot');
        return {
          table: getComputedStyle(el.querySelector('table')).position,
          plot: [plot.tabIndex, plot.getAttribute('aria-label'), plot.getAttribute('aria-roledescription')],
          square: plot.offsetWidth === plot.offsetHeight && plot.offsetWidth === 240,
          hidden: el.querySelector('.pie-chart-pie').getAttribute('aria-hidden'),
          slices: [...el.querySelectorAll('.pie-chart-slice')].map((path) => path.dataset.series),
          legend: [...el.querySelectorAll('.pie-chart-legend li')].map((li) =>
            [li.dataset.series, ...[...li.children].map((span) => span.textContent)]),
          labels: el.querySelectorAll('.pie-chart-labels, .pie-chart-values').length,
          instance: [!!Expressive.PieChart.getInstance(el), !!Expressive.LineChart.getInstance(el)],
          hole: getComputedStyle(el.querySelector('.pie-chart-hole')).transform,
          total: getComputedStyle(el.querySelector('.pie-chart-pie')).display,
        };
      });
      assert.equal(plans.table, 'absolute', 'the table is visually hidden');
      assert.deepEqual(plans.plot, [0, 'Plans', 'pie chart']);
      assert.equal(plans.square, true, 'the plot is a square as wide as the height token');
      assert.equal(plans.hidden, 'true', 'the drawn pie is hidden; the table carries the data');
      // A zero row draws nothing and takes no color, but keeps its legend row.
      assert.deepEqual(plans.slices, ['1', '2', '3']);
      assert.deepEqual(plans.legend, [
        ['1', 'Basic', '$50', '50%'], ['2', 'Premium', '$25', '25%'], [undefined, 'Free', '$0', ''], ['3', 'Enterprise', '$25', '25%']]);
      assert.equal(plans.labels, 0, 'a pie has no row labels, and no values without .values');
      assert.deepEqual(plans.instance, [true, false]);
      assert.match(plans.hole, /^matrix\(0, 0, 0, 0, 0, 0\)$/, 'a pie has no hole');
      assert.equal(await page.getByRole('table').first().getByRole('cell', { name: '$50' }).count(), 1,
        'the hidden table stays in the accessibility tree');

      // Basic is the right half, so its slice runs from the top to the bottom.
      const basic = await page.locator('#plans .pie-chart-slice').first().getAttribute('d');
      assert.equal(basic, 'M0,0L0.000,-46.000A46,46 0 0 1 0.000,46.000Z');

      const donut = await page.locator('#donut').evaluate((el) => ({
        hole: getComputedStyle(el.querySelector('.pie-chart-hole')).transform,
        total: [getComputedStyle(el.querySelector('.pie-chart-total')).display, el.querySelector('.pie-chart-total').textContent],
        values: [...el.querySelectorAll('.pie-chart-values span')].map((span) => [span.dataset.series, span.textContent]),
        legend: [...el.querySelectorAll('.pie-chart-legend li')].map((li) => li.lastElementChild.textContent),
        rows: el.querySelectorAll('.pie-chart-legend li').length,
      }));
      assert.match(donut.hole, /^matrix\(0\.6, 0, 0, 0\.6, 0, 0\)$/);
      assert.deepEqual(donut.total, ['flex', '100Total leads'], 'the <tfoot> row is the total, not a slice');
      assert.deepEqual(donut.values, [['1', '96%']], 'slices under 5% get no value label');
      assert.deepEqual(donut.legend, ['96%', '3%', '1%']);
      assert.equal(donut.rows, 3);

      // The seventh row would repeat the first row's color beside it.
      assert.deepEqual(await page.locator('#seven .pie-chart-slice').evaluateAll((paths) => paths.map((path) => path.dataset.series)),
        ['1', '2', '3', '4', '5', '6', '2']);
      assert.equal(await page.locator('#seven .pie-chart-gaps').getAttribute('d').then((d) => d.split('M').length - 1), 7);
      // So does the seventh slice when an empty row comes after it.
      assert.deepEqual(await page.locator('#trailing .pie-chart-slice').evaluateAll((paths) => paths.map((path) => path.dataset.series)),
        ['1', '2', '3', '4', '5', '6', '2']);

      const whole = await page.locator('#whole').evaluate((el) => [
        el.querySelectorAll('.pie-chart-slice').length,
        el.querySelector('.pie-chart-slice').getAttribute('d').split('A').length - 1,
        el.querySelector('.pie-chart-gaps').getAttribute('d'),
      ]);
      assert.deepEqual(whole, [1, 2, ''], 'one slice is a whole circle of two arcs with no gap');

      assert.deepEqual(await page.locator('#spark').evaluate((el) => [
        el.querySelector('.pie-chart-plot').hasAttribute('tabindex'),
        getComputedStyle(el.querySelector('.pie-chart-legend')).display,
        el.querySelector('.pie-chart-plot').offsetWidth,
      ]), [false, 'none', 48]);

      await page.evaluate(() => Expressive.PieChart.getInstance(document.querySelector('#plans')).destroy());
      assert.deepEqual(await page.locator('#plans').evaluate((el) => [
        el.querySelectorAll('.pie-chart-plot, .pie-chart-legend').length,
        getComputedStyle(el.querySelector('table')).clipPath,
        el.Expressive_PieChart,
      ]), [0, 'none', undefined]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: pie chart tooltip follows the pointer round the pie and the arrow keys`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      const plot = page.locator('#plans .pie-chart-plot');
      const tooltip = page.locator('#plans .pie-chart-tooltip');
      const text = () => tooltip.innerText().then((value) => value.replace(/\s+/g, ' ').trim());
      const active = () => page.locator('#plans .pie-chart-slice.active').evaluateAll((paths) => paths.map((path) => path.dataset.series));
      const box = await plot.boundingBox();
      const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];

      // Right of the middle is Basic, the first half turn; lower left is Premium.
      await page.mouse.move(x + 40, y);
      assert.equal(await text(), 'Basic Revenue $50 (50%) Change +10%');
      assert.deepEqual(await active(), ['1']);
      assert.equal(await tooltip.evaluate((el) => el.classList.contains('end')), true, 'on the right half it opens leftwards');
      await page.mouse.move(x - 40, y + 20);
      assert.equal(await text(), 'Premium Revenue $25 (25%) Change −2%');
      assert.deepEqual(await tooltip.locator('[data-series]').evaluateAll((spans) => spans.map((span) => span.dataset.series)), ['2', '2'],
        'the tooltip swatches take the slice color');
      await page.mouse.move(x - 40, y - 20);
      assert.match(await text(), /^Enterprise/);
      assert.equal(await tooltip.evaluate((el) => el.classList.contains('end')), false);

      // The plot's corners are off the pie.
      await page.mouse.move(box.x + 2, box.y + 2);
      assert.equal(await tooltip.isVisible(), false);
      assert.deepEqual(await active(), []);
      // The slices end at 46% of the width, so the ring past them is off the pie too,
      // except over the active slice, which grows by 6%.
      await page.mouse.move(x + box.width * 0.48, y);
      assert.equal(await tooltip.isVisible(), false, 'blank ring past the slices');
      await page.mouse.move(x + box.width * 0.4, y);
      await page.mouse.move(x + box.width * 0.48, y);
      assert.match(await text(), /^Basic/, 'the grown active slice keeps the pointer');

      // An index past the last row hides the tooltip, as in other charts.
      assert.equal(await page.evaluate(() => {
        const chart = Expressive.PieChart.getInstance(document.querySelector('#plans'));
        chart.show(99);
        return chart.el.querySelector('.pie-chart-tooltip').hidden;
      }), true);

      // A donut's hole, where the total is, is off the slices.
      const donut = await page.locator('#donut .pie-chart-plot');
      await donut.scrollIntoViewIfNeeded();
      const hole = await donut.boundingBox();
      const donutTooltip = page.locator('#donut .pie-chart-tooltip');
      await page.mouse.move(hole.x + hole.width * 0.5 + 10, hole.y + hole.height * 0.5);
      assert.equal(await donutTooltip.isVisible(), false, 'pointer over the total');
      await page.mouse.move(hole.x + hole.width * 0.85, hole.y + hole.height * 0.5);
      assert.match(await donutTooltip.innerText(), /^Referrals/);

      await plot.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      assert.match(await text(), /^Basic/);
      await page.keyboard.press('ArrowRight');
      assert.match(await text(), /^Premium/);
      await page.keyboard.press('ArrowDown');
      assert.equal(await text(), 'Free Revenue $0 Change 0%', 'a zero row is reachable but has no share');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowLeft');
      assert.match(await text(), /^Basic/);
      await page.keyboard.press('End');
      assert.match(await text(), /^Enterprise/);
      // Round the pie the ends meet.
      await page.keyboard.press('ArrowRight');
      assert.match(await text(), /^Basic/, 'the next row after the last is the first');
      await page.keyboard.press('ArrowUp');
      assert.match(await text(), /^Enterprise/, 'the row before the first is the last');
      await page.keyboard.press('Escape');
      assert.equal(await tooltip.isVisible(), false);
      await page.keyboard.press('ArrowLeft');
      assert.match(await text(), /^Enterprise/, 'back from no row starts at the last');

      // In RTL the slices still run clockwise, and so do the arrows: right moves to the next row.
      const rtl = await page.evaluate(() => {
        const wrap = document.createElement('div');
        wrap.dir = 'rtl';
        wrap.append(document.querySelector('#plans').cloneNode(true));
        document.body.append(wrap);
        const el = wrap.firstElementChild;
        el.querySelectorAll('.pie-chart-plot, .pie-chart-legend').forEach((node) => node.remove());
        const chart = Expressive.PieChart.init(el);
        chart.show(0);
        el.querySelector('.pie-chart-plot').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        return [el.querySelector('.pie-chart-slice').getAttribute('d'), chart.activeIndex];
      });
      assert.deepEqual(rtl, ['M0,0L0.000,-46.000A46,46 0 0 1 0.000,46.000Z', 1]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: pie chart .labels writes each slice's name outside it`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(`<style>${css}</style>
        <div style="width: 400px">
          ${chart('class="pie-chart labels" id="named"', 'Named', '<th>V</th>', [
            ['Big', '46'], ['B', '1'], ['C', '1'], ['D', '1'], ['E', '1'], ['None', '0'], ['Half', '50']])}
          ${chart('class="pie-chart labels" id="middle"', 'Middle', '<th>V</th>', [['A', '24'], ['B', '1'], ['C', '1'], ['D', '74']])}
          ${chart('class="pie-chart labels sparkline" id="small"', 'Small', '<th>V</th>', [['A', '1'], ['B', '2']])}
        </div>
        <div style="width: 160px">
          ${chart('class="pie-chart labels" id="narrow"', 'Narrow', '<th>V</th>', [['Alpha', '2'], ['Beta', '1']])}
        </div>
        <script>${js}</script>`);
      await page.evaluate(() => Expressive.AutoInit());

      const measure = (el) => {
        const pie = el.querySelector('.pie-chart-pie').getBoundingClientRect();
        const [cx, cy, radius] = [pie.left + pie.width / 2, pie.top + pie.height / 2, pie.width * 0.46 * 1.06];
        const names = [...el.querySelectorAll('.pie-chart-names > span')].map((span) => {
          const box = span.getBoundingClientRect();
          // The nearest point of the name's box to the pie's middle.
          const near = Math.hypot(
            Math.max(box.left - cx, 0, cx - box.right),
            Math.max(box.top - cy, 0, cy - box.bottom));
          // The leader line runs from 4px before the name to its slice's edge.
          const line = getComputedStyle(span, '::before');
          const angle = (parseFloat(line.rotate) * Math.PI) / 180;
          const [x, y] = [span.classList.contains('end') ? box.right + 4 : box.left - 4, (box.top + box.bottom) / 2];
          const [sx, sy] = [x + parseFloat(line.width) * Math.cos(angle) - cx, y + parseFloat(line.width) * Math.sin(angle) - cy];
          const turn = parseFloat(span.style.getPropertyValue('--turn'));
          const leader = Math.abs(Math.hypot(sx, sy) - pie.width * 0.46) < 1
            && Math.abs(((Math.atan2(sx, -sy) / (2 * Math.PI) + 1) % 1) - turn) < 0.005;
          return {
            text: span.textContent, series: span.dataset.series, end: span.classList.contains('end'), box, outside: near > radius,
            leader, length: parseFloat(line.width),
          };
        });
        const overlaps = names.flatMap((a, i) => names.slice(i + 1).filter((b) =>
          a.box.left < b.box.right && b.box.left < a.box.right && a.box.top < b.box.bottom && b.box.top < a.box.bottom)
          .map((b) => `${a.text}/${b.text}`));
        return {
          names: names.map(({ text, series, end }) => [text, series, end]),
          outside: names.filter((name) => !name.outside).map((name) => name.text),
          leaders: names.filter((name) => !name.leader).map((name) => name.text),
          lengths: Object.fromEntries(names.map((name) => [name.text, name.length])),
          sides: names.every(({ end, box }) => (end ? box.right <= cx : box.left >= cx)),
          overlaps,
          hidden: el.querySelector('.pie-chart-names').closest('[aria-hidden="true"]') !== null,
          plot: el.querySelector('.pie-chart-plot').offsetWidth,
          inside: names.every(({ box }) => box.left >= el.getBoundingClientRect().left - 1 && box.right <= el.getBoundingClientRect().right + 1),
        };
      };
      const named = await page.locator('#named').evaluate(measure);
      assert.deepEqual(named.names, [
        ['Big', '1', false], ['B', '2', false], ['C', '3', false], ['D', '4', false], ['E', '5', false], ['Half', '6', true]],
      'every drawn slice is named, in its color, and the zero row is not');
      assert.deepEqual(named.outside, [], 'the names sit outside the grown pie');
      assert.deepEqual(named.leaders, [], 'each leader line runs from its name to the middle of its slice\'s edge');
      assert.ok(named.lengths.E > 3 * named.lengths.Big, `a pushed name's line reaches back to its slice: ${JSON.stringify(named.lengths)}`);
      assert.ok(named.sides, 'names on the right run rightwards and those on the left run leftwards');
      assert.deepEqual(named.overlaps, [], 'the thin slices push their names apart');
      assert.ok(named.hidden, 'the names are aria-hidden with the pie');
      assert.equal(await page.locator('#small .pie-chart-names').count(), 0, 'a sparkline has no names');

      const middle = await page.locator('#middle').evaluate(measure);
      assert.deepEqual(middle.overlaps, [], 'names either side of the middle line keep apart');
      assert.deepEqual(middle.leaders, [], 'leader lines reach slices on both sides of the middle line');

      const narrow = await page.locator('#narrow').evaluate(measure);
      assert.ok(narrow.plot >= 80, `a 160px figure keeps half its width for the pie: ${narrow.plot}`);
      assert.ok(narrow.inside, 'the names stay inside a narrow figure');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: pie chart data-other groups the small rows into one slice`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const rows = [['Search', '$420', '+4%'], ['Email', '$12', '0%'], ['Referral', '$310', '+1%'], ['Print', '$6', '−1%'],
        ['Missing', '', ''], ['Social', '$262', '−2%'], ['Radio', '$0', '0%']];
      await page.setContent(`<style>${css}</style>
        <div style="width: 400px">
          ${chart('class="pie-chart labels" data-other="5" id="other"', 'Other', '<th>Leads</th><th>Change</th>', rows)}
          ${chart('class="pie-chart" data-other="5" data-other-label="Autres" id="autres"', 'Autres', '<th>Leads</th>', rows.map((row) => row.slice(0, 2)))}
          ${chart('class="pie-chart" data-other="1" id="one"', 'One', '<th>Leads</th>', rows.slice(0, 6).map((row) => row.slice(0, 2)))}
          ${chart('class="pie-chart" id="none"', 'None', '<th>Leads</th>', rows.map((row) => row.slice(0, 2)))}
          ${chart('class="pie-chart" data-other="5" id="spaced"', 'Spaced', '<th>V</th>', [['B', `1${'\t'.repeat(100000)}1`], ['A', '$900'], ['C', `1${'\t'.repeat(100000)}2`]])}
          ${chart('class="pie-chart" data-other="5" id="exact"', 'Exact', '<th>Cost</th>', [['A', '$0.54'], ['B', '$0.03'], ['C', '$0.03']])}
          ${chart('class="pie-chart" data-other="5" id="fine"', 'Fine', '<th>Dose</th>', [['A', '0.01'], ['B', '0.0001'], ['C', '0.0002']])}
          ${chart('class="pie-chart" data-other="5" id="exponent"', 'Exponent', '<th>Dose</th>', [['A', '0.01'], ['B', '1e-4'], ['C', '2e-4']])}
          ${chart('class="pie-chart" data-other="5" id="tiny"', 'Tiny', '<th>Dose</th>', [['A', '1'], ['B', `0.${'0'.repeat(104)}1`], ['C', `0.${'0'.repeat(104)}2`]])}
          <figure class="pie-chart" data-other="5" id="valued">
            <figcaption>Valued</figcaption>
            <table>
              <thead><tr><th>Client</th><th>Revenue</th></tr></thead>
              <tbody>
                <tr><th>A</th><td data-value="980000000">$980M</td></tr>
                <tr><th>B</th><td data-value="12000000">$12M</td></tr>
                <tr><th>C</th><td data-value="8000000">$8M</td></tr>
              </tbody>
            </table>
          </figure>
        </div>
        <script>${js}</script>`);
      await page.evaluate(() => Expressive.AutoInit());

      const measure = (el) => ({
        legend: [...el.querySelectorAll('.pie-chart-legend li')].map((li) => [...li.children].map((span) => span.textContent)),
        slices: el.querySelectorAll('.pie-chart-slice').length,
        names: [...el.querySelectorAll('.pie-chart-names > span')].map((span) => span.textContent),
        table: el.querySelectorAll('table tbody tr').length,
      });
      const other = await page.locator('#other').evaluate(measure);
      assert.deepEqual(other.legend, [
        ['Search', '$420', '42%'], ['Referral', '$310', '31%'], ['Missing', '', ''], ['Social', '$262', '26%'], ['Other', '$18', '1.8%']],
      'rows under 5% become one last row with their sum and share; a row with no value keeps its place');
      assert.equal(other.slices, 4);
      assert.deepEqual(other.names, ['Search', 'Referral', 'Social', 'Other'], 'the group is named like any slice');
      assert.equal(other.table, 7, 'the table keeps every row for screen readers');

      // The group's tooltip has its sum and share, and no line for the column that does not add up.
      const tip = await page.locator('#other').evaluate((el) => {
        Expressive.PieChart.getInstance(el).show(4);
        return [...el.querySelectorAll('.pie-chart-tooltip > *')].map((node) => node.textContent);
      });
      assert.deepEqual(tip, ['Other', 'Leads', '$18 (1.8%)']);

      assert.equal((await page.locator('#autres').evaluate(measure)).legend.at(-1)[0], 'Autres', 'data-other-label names the group');
      assert.deepEqual((await page.locator('#one').evaluate(measure)).legend.map(([name]) => name),
        ['Search', 'Email', 'Referral', 'Print', 'Missing', 'Social'], 'one small row keeps its own name');
      assert.equal((await page.locator('#none').evaluate(measure)).legend.length, 7, 'without data-other every row stays');
      assert.equal((await page.locator('#exact').evaluate(measure)).legend.length, 3, 'a row at exactly the percentage stays');
      // Reading a cell's signs stays linear on a long run of tabs; a backtracking pattern took seconds.
      const spaced = await page.locator('#spaced').evaluate((el) => {
        const start = performance.now();
        Expressive.PieChart.init(el);
        return [performance.now() - start, el.querySelectorAll('.pie-chart-legend li').length];
      });
      assert.ok(spaced[0] < 1000 && spaced[1] === 2, `a cell padded with tabs draws quickly: ${spaced}`);
      assert.deepEqual((await page.locator('#fine').evaluate(measure)).legend.at(-1), ['Other', '0.0003', '2.9%'], 'the sum keeps the cells\' decimals');
      assert.deepEqual((await page.locator('#exponent').evaluate(measure)).legend.at(-1), ['Other', '0.0003', '2.9%'], 'an exponent counts towards the decimals');
      const tiny = (await page.locator('#tiny').evaluate(measure)).legend.at(-1);
      assert.match(tiny[1], /^0\.0{104}3$/, `past 20 decimals the sum keeps its first digits: ${tiny}`);
      assert.deepEqual((await page.locator('#valued').evaluate(measure)).legend.at(-1), ['Other', '$20M', '2%'], 'behind data-value the sum is compact, with the cells\' currency');
    } finally {
      await browser.close();
    }
  });
}
