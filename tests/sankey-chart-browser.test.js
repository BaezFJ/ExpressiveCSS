import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

/** A sankey chart figure: its caption, and one body row per flow. */
const chart = (attrs, rows) => `<figure ${attrs}>
  <figcaption>Energy flow</figcaption>
  <table>
    <thead><tr><th>Source</th><th>Target</th><th>Value</th></tr></thead>
    <tbody>${rows.map(([source, target, value]) => `<tr><th>${source}</th><td>${target}</td><td>${value}</td></tr>`).join('')}</tbody>
  </table>
</figure>`;

// Source, target, value. Grid takes 80 in and sends 80 out; Wind sends 60.
const flows = [['Solar', 'Grid', '30'], ['Wind', 'Grid', '50'], ['Grid', 'Homes', '60'], ['Grid', 'Industry', '20'], ['Wind', 'Storage', '10']];
// Rows that draw nothing: a cycle back to Grid, a self link, a negative and a missing value, and no target.
const skipped = [['Homes', 'Grid', '5'], ['Grid', 'Grid', '5'], ['Solar', 'Homes', '-4'], ['Solar', 'Homes', 'n/a'], ['Wind', '', '5']];
// The nodes in the order they first appear, each with its column and the larger of its in and out totals.
const nodes = [['Solar', 0, 30], ['Grid', 1, 80], ['Wind', 0, 60], ['Homes', 2, 60], ['Industry', 2, 20], ['Storage', 1, 10]];

const html = `<style>${css}</style>
  <div style="width: 600px">
    ${chart('class="sankey-chart" id="ltr"', flows)}
    ${chart('class="sankey-chart" id="skips"', [...flows, ...skipped])}
  </div>
  <script>${js}</script>`;

/**
 * Runs in the page. The plot's box, each node's box, and each link's top and
 * bottom at its source end and at its target end, in page pixels, read from
 * the drawn path data through the SVG's own transform.
 */
function drawing(el) {
  const plot = el.querySelector('.sankey-chart-plot').getBoundingClientRect();
  const box = (path) => {
    const { left, top, width, height } = path.getBoundingClientRect();
    return { left, top, width, height };
  };
  const at = (matrix, y) => new DOMPoint(0, Number(y)).matrixTransform(matrix).y;
  const links = [...el.querySelectorAll('.sankey-chart-link')].map((path) => {
    const matrix = path.getScreenCTM();
    // M x0,top0 C … x1,top1 V bottom1 C … x0,bottom0 Z
    const [, top0, top1, bottom1, bottom0] = path.getAttribute('d')
      .match(/^M[-\d.e]+,([-\d.e]+)C.* [-\d.e]+,([-\d.e]+)V([-\d.e]+)C.* [-\d.e]+,([-\d.e]+)Z$/);
    return { source: [at(matrix, top0), at(matrix, bottom0)], target: [at(matrix, top1), at(matrix, bottom1)] };
  });
  return { plot: { top: plot.top, height: plot.height }, nodes: [...el.querySelectorAll('.sankey-chart-node')].map(box), links };
}

const drawn = (page, id) => page.locator(id).evaluate((el, source) => new Function(`return ${source}`)()(el), drawing.toString());

/** Asserts V1's rules: one scale for links and nodes, columns, stacking, no overlap, and the tallest column filling the plot. */
function laidOut({ plot, nodes: boxes, links }, message) {
  assert.equal(links.length, flows.length, `${message}: one link per flow`);
  assert.equal(boxes.length, nodes.length, `${message}: one node per name`);
  const unit = (links[0].source[1] - links[0].source[0]) / Number(flows[0][2]);
  assert.ok(unit > 0, `${message}: links have a height`);
  links.forEach(({ source, target }, i) => {
    const size = Number(flows[i][2]) * unit;
    assert.ok(Math.abs(source[1] - source[0] - size) <= 1, `${message}, link ${i}: ${source[1] - source[0]}px at its source, expected ${size}`);
    assert.ok(Math.abs(target[1] - target[0] - size) <= 1, `${message}, link ${i}: ${target[1] - target[0]}px at its target, expected ${size}`);
  });
  nodes.forEach(([name, , total], i) => {
    assert.ok(Math.abs(boxes[i].height - total * unit) <= 1, `${message}, ${name}: ${boxes[i].height}px tall, expected ${total * unit}`);
  });

  // Columns from the inline start, in order of first appearance down each one.
  const lefts = [0, 1, 2].map((column) => nodes.flatMap(([, c], i) => (c === column ? [boxes[i].left] : [])));
  lefts.forEach((column, c) => assert.ok(Math.max(...column) - Math.min(...column) <= 1, `${message}: column ${c} lines up`));
  assert.ok(lefts[0][0] < lefts[1][0] && lefts[1][0] < lefts[2][0], `${message}: the columns run from the inline start`);
  assert.ok(boxes[0].top < boxes[2].top, `${message}: Solar above Wind`);
  assert.ok(boxes[3].top < boxes[4].top, `${message}: Homes above Industry`);
  assert.ok(boxes[1].top < boxes[5].top, `${message}: Grid above Storage`);

  // Links on one node edge stack without overlapping: Grid's two in, its two out, and Wind's two out.
  const apart = ([a, b], label) => assert.ok(a[1] <= b[0] + 0.5, `${message}: ${label} do not overlap`);
  apart([links[0].target, links[1].target], "Grid's incoming links");
  apart([links[2].source, links[3].source], "Grid's outgoing links");
  apart([links[1].source, links[4].source], "Wind's outgoing links");

  const tallest = Math.max(...lefts.map((_, column) => {
    const inColumn = boxes.filter((_, i) => nodes[i][1] === column);
    return Math.max(...inColumn.map((b) => b.top + b.height)) - Math.min(...inColumn.map((b) => b.top));
  }));
  assert.ok(Math.abs(tallest - plot.height) <= 1, `${message}: the tallest column is ${tallest}px in a ${plot.height}px plot`);
}

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: sankey chart sizes links and nodes on one scale`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      const ltr = await page.locator('#ltr').evaluate((el) => {
        const plot = el.querySelector('.sankey-chart-plot');
        return {
          table: getComputedStyle(el.querySelector('table')).position,
          plot: [plot.tabIndex, plot.getAttribute('aria-label'), plot.getAttribute('aria-roledescription')],
          svg: el.querySelector('.sankey-chart-plot > svg').getAttribute('aria-hidden'),
          instance: [!!Expressive.SankeyChart.getInstance(el), !!Expressive.LineChart.getInstance(el)],
        };
      });
      assert.equal(ltr.table, 'absolute', 'the table is visually hidden');
      assert.deepEqual(ltr.plot, [0, 'Energy flow', 'sankey chart']);
      assert.equal(ltr.svg, 'true', 'the drawing is hidden; the table carries the data');
      assert.deepEqual(ltr.instance, [true, false]);

      laidOut(await drawn(page, '#ltr'), '#ltr');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: sankey chart draws nothing for a cycle, a self link, a value that is not positive or a missing name`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      assert.deepEqual(errors, []);
      const [ltr, skips] = [await drawn(page, '#ltr'), await drawn(page, '#skips')];
      laidOut(skips, '#skips');
      // The charts sit at different heights in the page, so their pixel edges round differently.
      skips.nodes.forEach((node, i) => assert.ok(Math.abs(node.height - ltr.nodes[i].height) <= 0.5,
        `node ${i}: ${node.height}px tall, ${ltr.nodes[i].height}px without the rows`));
    } finally {
      await browser.close();
    }
  });
}
