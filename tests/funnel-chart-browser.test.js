import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

/** A funnel figure: its caption, a header row, and body rows that each start with a label. */
const funnel = (attrs, rows) => `<figure ${attrs}>
  <figcaption>Signup funnel</figcaption>
  <table>
    <thead><tr><th>Step</th><th>Visitors</th><th>Revenue</th></tr></thead>
    <tbody>${rows.map(([label, ...cells]) => `<tr><th>${label}</th>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</figure>`;

// Step, visitors, then revenue, which only the tooltip shows.
const steps = [['Visited', '1000', '$0'], ['Signed up', '600', '$0'], ['Trial', '250', '$500'], ['Paid', '45', '$4,500']];
/** The steps with some visitor cells replaced, by step name. */
const set = (changes) => steps.map((row) => (row[0] in changes ? [row[0], changes[row[0]], row[2]] : row));

const html = `<style>${css}</style>
  <div style="width: 600px">
    ${funnel('class="funnel-chart" id="ltr"', steps)}
    ${funnel('class="funnel-chart" id="gap"', set({ Trial: 'n/a' }))}
    ${funnel('class="funnel-chart" id="nonpositive"', set({ Trial: '0', Paid: '-5' }))}
    ${funnel('class="funnel-chart" id="empty"', steps.map(([step]) => [step, 'n/a', 'n/a']))}
  </div>
  <div style="width: 600px" dir="rtl">
    ${funnel('class="funnel-chart" id="rtl"', steps)}
  </div>
  <script>${js}</script>`;

/** Runs in the page: the plot's box, each row's stage box or null, the labels and the table's position. */
function measure(el) {
  const table = getComputedStyle(el.querySelector('table')).position;
  const plot = el.querySelector('.funnel-chart-plot');
  if (!plot) return { plot: null, stages: [], labels: [], table };
  const box = plot.getBoundingClientRect();
  return {
    plot: { left: box.left + plot.clientLeft, width: plot.clientWidth, top: box.top, bottom: box.bottom },
    stages: [...el.querySelectorAll('.funnel-chart-stages > div')].map((row) => {
      const stage = row.querySelector('span')?.getBoundingClientRect();
      return stage ? { left: stage.left, width: stage.width, top: stage.top, bottom: stage.bottom } : null;
    }),
    labels: [...el.querySelectorAll('.funnel-chart-labels > li')].map((li) => {
      const label = li.getBoundingClientRect();
      return { text: li.textContent, left: label.left, right: label.right, middle: (label.top + label.bottom) / 2 };
    }),
    table,
  };
}

const read = (page, id) => page.locator(id).evaluate((el, source) => new Function(`return ${source}`)()(el), measure.toString());

/** Asserts each stage's width is its share of the plot, centered on the plot's middle, top to bottom. */
function proportional({ plot, stages }, shares, message) {
  assert.equal(stages.length, shares.length, `${message}: one row per table row`);
  let above = plot.top;
  stages.forEach((stage, i) => {
    if (shares[i] === null) return assert.equal(stage, null, `${message}, row ${i}: no stage`);
    const width = plot.width * shares[i];
    assert.ok(Math.abs(stage.width - width) <= 1, `${message}, row ${i}: ${stage.width}px wide, expected ${width}`);
    const middle = plot.left + plot.width / 2;
    assert.ok(Math.abs(stage.left + stage.width / 2 - middle) <= 1, `${message}, row ${i}: centered`);
    assert.ok(stage.top >= above - 0.5 && stage.bottom <= plot.bottom + 0.5, `${message}, row ${i}: below the one before`);
    above = stage.bottom;
  });
}

/** A page with the fixture started, and any page errors it throws. */
async function open(browser) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setContent(html);
  await page.evaluate(() => Expressive.AutoInit());
  return [page, errors];
}

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: funnel chart sizes each stage by its value, in table order`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const [page] = await open(browser);
      const instance = await page.locator('#ltr').evaluate((el) =>
        [!!Expressive.FunnelChart.getInstance(el), !!Expressive.LineChart.getInstance(el)]);
      assert.deepEqual(instance, [true, false]);
      for (const id of ['#ltr', '#rtl']) {
        const drawn = await read(page, id);
        assert.equal(drawn.table, 'absolute', `${id}: the table is visually hidden`);
        proportional(drawn, [1, 0.6, 0.25, 0.045], id);
      }
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: funnel chart leaves out a row without a positive value, keeping its place`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const [page, errors] = await open(browser);
      const gap = await read(page, '#gap');
      proportional(gap, [1, 0.6, null, 0.045], '#gap');
      assert.deepEqual(gap.labels.map(({ text }) => text), ['Visited', 'Signed up', 'Trial', 'Paid']);
      proportional(await read(page, '#nonpositive'), [1, 0.6, null, null], '#nonpositive');

      // With no number at all there is nothing to draw, so the table shows, as for every chart.
      const empty = await read(page, '#empty');
      assert.equal(empty.plot, null);
      assert.notEqual(empty.table, 'absolute', 'the table stays visible');
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
}
