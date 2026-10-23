import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const chart = (attrs, caption, header, rows) => `<figure ${attrs}>
  <figcaption>${caption}</figcaption>
  <table>
    <thead><tr><th>Skill</th>${header}</tr></thead>
    <tbody>${rows.map(([label, ...cells]) => `<tr><th>${label}</th>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</figure>`;

const html = `<style>${css}</style>
  <div style="width: 480px">
    ${chart('class="radar-chart area points" id="skills" data-max="100"', 'Skills', '<th>Now</th><th class="dashed">Before</th>', [
      ['Design', '100', '80'], ['Code', '50', '60'], ['Support', '', '40'], ['Ops', '25', '150']])}
    ${chart('class="radar-chart" id="plain"', 'Plain', '<th>Score</th>', [['A', '10'], ['B', '20'], ['C', '30']])}
    ${chart('class="radar-chart area points" id="lone" data-max="100"', 'Lone', '<th>Score</th>', [['A', '100'], ['B', ''], ['C', '50'], ['D', '100'], ['E', '']])}
    ${chart('class="radar-chart sparkline" id="spark"', 'Spark', '<th>V</th>', [['A', '1'], ['B', '2'], ['C', '3']])}
  </div>
  <div style="width: 320px">
    ${chart('class="radar-chart" id="narrow"', 'Narrow', '<th>Now</th><th>Before</th>', [
      ['Customer satisfaction', '1', '2'], ['Average response time', '2', '1'], ['Resolution rate', '3', '2'], ['First contact resolution', '2', '3']])}
  </div>
  <script>${js}</script>`;

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: radar chart draws a grid, shapes, labels and a legend from its table`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      const skills = await page.locator('#skills').evaluate((el) => {
        const plot = el.querySelector('.radar-chart-plot');
        return {
          table: getComputedStyle(el.querySelector('table')).position,
          plot: [plot.tabIndex, plot.getAttribute('aria-label'), plot.getAttribute('aria-roledescription')],
          square: plot.offsetWidth === plot.offsetHeight && plot.offsetWidth === 240,
          hidden: [...el.querySelectorAll('.radar-chart-web > *')].map((node) => node.getAttribute('aria-hidden')),
          grid: el.querySelector('.radar-chart-grid').getAttribute('d').split('M').length - 1,
          series: [...el.querySelectorAll('.radar-chart-series')].map((g) => [g.dataset.series, g.getAttribute('class')]),
          shapes: [...el.querySelectorAll('.radar-chart-shape')].map((path) => path.getAttribute('d')),
          points: [...el.querySelectorAll('.radar-chart-points')].map((path) => path.getAttribute('d').split('M').length - 1),
          areas: [...el.querySelectorAll('.radar-chart-area')].map((path) => path.getAttribute('d')),
          fill: getComputedStyle(el.querySelector('.radar-chart-area')).fillOpacity,
          axes: [...el.querySelectorAll('.radar-chart-axes li')].map((li) => [li.textContent, li.style.getPropertyValue('--turn')]),
          legend: [...el.querySelectorAll('.radar-chart-legend li')].map((li) => [li.dataset.series, li.textContent]),
          instance: [!!Expressive.RadarChart.getInstance(el), !!Expressive.LineChart.getInstance(el)],
        };
      });
      assert.equal(skills.table, 'absolute', 'the table is visually hidden');
      assert.deepEqual(skills.plot, [0, 'Skills', 'radar chart']);
      assert.equal(skills.square, true, 'the plot is a square as wide as the height token');
      assert.deepEqual(skills.hidden, ['true', 'true'], 'the drawing and labels are hidden; the table carries the data');
      assert.equal(skills.grid, 8, 'four rings and four spokes');
      assert.deepEqual(skills.series, [['1', 'radar-chart-series'], ['2', 'radar-chart-series dashed']]);
      // The middle is zero and the rim is data-max, and a value past the rim
      // stops at it. The gap breaks the outline, which runs on round past
      // the top spoke, and the fill is a wedge from the middle.
      assert.equal(skills.shapes[0], 'M-12.500,0.000L0.000,-50.000L25.000,-0.000');
      assert.equal(skills.areas[0], 'M0,0L-12.500,0.000L0.000,-50.000L25.000,-0.000Z');
      assert.equal(skills.areas[1], skills.shapes[1], 'a whole shape fills its outline');
      const lone = await page.locator('#lone').evaluate((el) => ['shape', 'area', 'points'].map((name) => el.querySelector(`.radar-chart-${name}`).getAttribute('d')));
      assert.deepEqual(lone, [
        'M0.000,-50.000h0M14.695,20.225L-29.389,40.451',
        'M0,0L0.000,-50.000ZM0,0L14.695,20.225L-29.389,40.451Z',
        'M0.000,-50.000h0M14.695,20.225h0M-29.389,40.451h0',
      ], 'a value between gaps is a dot, and a gap on the last spoke does not join the first');
      assert.equal(skills.shapes[1], 'M0.000,-40.000L30.000,-0.000L0.000,20.000L-50.000,0.000Z');
      assert.deepEqual(skills.points, [3, 4]);
      assert.equal(skills.fill, '0.24', 'area fills the shapes');
      assert.deepEqual(skills.axes, [['Design', '0'], ['Code', '0.25'], ['Support', '0.5'], ['Ops', '0.75']]);
      assert.deepEqual(skills.legend, [['1', 'Now'], ['2', 'Before']]);
      assert.deepEqual(skills.instance, [true, false]);
      assert.equal(await page.getByRole('table').first().getByRole('cell', { name: '150' }).count(), 1,
        'the hidden table stays in the accessibility tree');

      const plain = await page.locator('#plain').evaluate((el) => ({
        fill: el.querySelectorAll('.radar-chart-area').length,
        points: el.querySelectorAll('.radar-chart-points').length,
        legend: el.querySelectorAll('.radar-chart-legend, .radar-chart-labels').length,
      }));
      assert.deepEqual(plain, { fill: 0, points: 0, legend: 0 }, 'one series has no legend; no fill or points without modifiers');

      // Wrapped labels stay inside the figure, below the caption and above the legend.
      const narrow = await page.locator('#narrow').evaluate((el) => {
        const box = (node) => node.getBoundingClientRect();
        const [figure, caption, legend] = [box(el), box(el.querySelector('figcaption')), box(el.querySelector('.radar-chart-legend'))];
        return [...el.querySelectorAll('.radar-chart-axes li')].map((li) => {
          const label = box(li);
          return [li.textContent, label.height > 20, label.left >= figure.left && label.right <= figure.right,
            label.top >= caption.bottom && label.bottom <= legend.top];
        });
      });
      assert.deepEqual(narrow, [
        ['Customer satisfaction', true, true, true],
        ['Average response time', true, true, true],
        ['Resolution rate', true, true, true],
        ['First contact resolution', true, true, true],
      ]);

      assert.deepEqual(await page.locator('#spark').evaluate((el) => [
        el.querySelector('.radar-chart-plot').hasAttribute('tabindex'),
        getComputedStyle(el.querySelector('.radar-chart-axes')).display,
        el.querySelector('.radar-chart-plot').offsetWidth,
      ]), [false, 'none', 48]);

      await page.evaluate(() => Expressive.RadarChart.getInstance(document.querySelector('#skills')).destroy());
      assert.deepEqual(await page.locator('#skills').evaluate((el) => [
        el.querySelectorAll('.radar-chart-plot, .radar-chart-legend').length,
        getComputedStyle(el.querySelector('table')).clipPath,
        el.Expressive_RadarChart,
      ]), [0, 'none', undefined]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: radar chart tooltip follows the pointer round the spokes and the arrow keys`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      const plot = page.locator('#skills .radar-chart-plot');
      const tooltip = page.locator('#skills .radar-chart-tooltip');
      const cursor = page.locator('#skills .radar-chart-cursor');
      const text = () => tooltip.innerText().then((value) => value.replace(/\s+/g, ' ').trim());
      const box = await plot.boundingBox();
      const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];

      // The nearest spoke by angle: right of the middle is Code, the second row.
      await page.mouse.move(x + 60, y + 10);
      assert.equal(await text(), 'Code Now 50 Before 60');
      assert.equal(await tooltip.evaluate((el) => el.classList.contains('end')), true, 'on the right half it opens leftwards');
      assert.deepEqual(await cursor.evaluate((el) => [
        el.hidden,
        el.style.getPropertyValue('--turn'),
        el.style.left,
        [...el.children].map((dot) => [dot.dataset.series, dot.style.top]),
      ]), [false, '0.25', '', [['1', '50%'], ['2', '40%']]], 'the cursor is the spoke, with a point per series');
      await page.mouse.move(x - 5, y - 60);
      assert.match(await text(), /^Design/);
      assert.equal(await tooltip.evaluate((el) => el.classList.contains('end')), false);
      // A gap leaves its series out of the tooltip.
      await page.mouse.move(x, y + 60);
      assert.equal(await text(), 'Support Before 40');

      // Past the rim still picks the nearest spoke. Before's 150 is past
      // data-max, so its point stops at the rim like its shape.
      await page.mouse.move(box.x + 2, y);
      assert.match(await text(), /^Ops/);
      assert.deepEqual(await cursor.evaluate((el) => [...el.children].map((dot) => dot.style.top)), ['75%', '0%']);

      assert.equal(await page.evaluate(() => {
        const chart = Expressive.RadarChart.getInstance(document.querySelector('#skills'));
        chart.show(99);
        return chart.el.querySelector('.radar-chart-tooltip').hidden;
      }), true, 'an index past the last row hides the tooltip');

      await plot.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      assert.match(await text(), /^Design/);
      await page.keyboard.press('ArrowRight');
      assert.match(await text(), /^Code/);
      await page.keyboard.press('ArrowDown');
      assert.match(await text(), /^Support/);
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowLeft');
      assert.match(await text(), /^Design/);
      await page.keyboard.press('End');
      assert.match(await text(), /^Ops/);
      // Round the spokes the ends meet.
      await page.keyboard.press('ArrowRight');
      assert.match(await text(), /^Design/, 'the next row after the last is the first');
      await page.keyboard.press('ArrowLeft');
      assert.match(await text(), /^Ops/, 'the row before the first is the last');
      await page.keyboard.press('Escape');
      assert.equal(await tooltip.isVisible(), false);
      await page.keyboard.press('ArrowUp');
      assert.match(await text(), /^Ops/, 'back from no row starts at the last');

      // In RTL the spokes still run clockwise, and so do the arrows: right moves to the next row.
      const rtl = await page.evaluate(() => {
        const wrap = document.createElement('div');
        wrap.dir = 'rtl';
        wrap.append(document.querySelector('#plain').cloneNode(true));
        document.body.append(wrap);
        const el = wrap.firstElementChild;
        el.querySelectorAll('.radar-chart-plot').forEach((node) => node.remove());
        const chart = Expressive.RadarChart.init(el);
        chart.show(0);
        el.querySelector('.radar-chart-plot').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        return [el.querySelector('.radar-chart-axes li:nth-child(2)').style.getPropertyValue('--turn'), chart.activeIndex];
      });
      assert.deepEqual(rtl, ['0.3333333333333333', 1]);
    } finally {
      await browser.close();
    }
  });
}
