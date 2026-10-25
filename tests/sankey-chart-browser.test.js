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

const [defaultFlows, defaultNodes] = [flows, nodes];

const html = `<style>${css}</style>
  <div style="width: 600px">
    ${chart('class="sankey-chart" id="ltr"', flows)}
    ${chart('class="sankey-chart" id="skips"', [...flows, ...skipped])}
    ${chart('class="sankey-chart" id="keys"', [...flows.slice(0, 3), ...skipped, ...flows.slice(3)])}
  </div>
  <div style="width: 600px">
    ${chart('class="sankey-chart" id="update"', flows)}
    ${chart('class="sankey-chart" id="watched" data-watch', flows)}
  </div>
  <div style="width: 600px" dir="rtl">
    ${chart('class="sankey-chart" id="rtl"', flows)}
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

// Wind to Grid raised from 50 to 70: Grid takes 100 in, and Wind sends 80.
const raised = flows.map((flow, i) => (i === 1 ? ['Wind', 'Grid', '70'] : flow));
const raisedNodes = nodes.map(([name, column, total]) => [name, column, { Grid: 100, Wind: 80 }[name] ?? total]);

/** Asserts V1's rules: one scale for links and nodes, columns, stacking, no overlap, and the tallest column filling the plot. */
function laidOut({ plot, nodes: boxes, links }, message, rtl = false, [flows, nodes] = [defaultFlows, defaultNodes]) {
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
  const order = rtl ? [2, 1, 0] : [0, 1, 2];
  assert.ok(lefts[order[0]][0] < lefts[order[1]][0] && lefts[order[1]][0] < lefts[order[2]][0], `${message}: the columns run from the inline start`);
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

/** Runs in the page. Each node's name, color, box and label box, and each link's color, in drawn order. */
function named(el) {
  const box = (node) => {
    const { left, right, top, height } = node.getBoundingClientRect();
    return { left, right, middle: top + height / 2 };
  };
  const labels = [...el.querySelectorAll('.sankey-chart-name')];
  return {
    hidden: el.querySelector('.sankey-chart-names').getAttribute('aria-hidden'),
    nodes: [...el.querySelectorAll('.sankey-chart-node')].map((node, i) => ({
      color: node.dataset.series, box: box(node), name: labels[i].textContent, label: box(labels[i]),
    })),
    links: [...el.querySelectorAll('.sankey-chart-link')].map((link) => link.dataset.series),
  };
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

  browserTest(`${engine}: sankey chart names and colors each node, and mirrors in a right-to-left page`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      const read = (id) => page.locator(id).evaluate((el, source) => new Function(`return ${source}`)()(el), named.toString());
      const [ltr, rtl] = [await read('#ltr'), await read('#rtl')];
      assert.equal(ltr.hidden, 'true', 'the names are hidden; the table carries them');
      for (const [chart, id, rtlPage] of [[ltr, 'ltr', false], [rtl, 'rtl', true]]) {
        assert.deepEqual(chart.nodes.map((node) => node.name), nodes.map(([name]) => name), `${id}: one name per node`);
        assert.deepEqual(chart.nodes.map((node) => node.color), ['1', '2', '3', '4', '5', '6'], `${id}: nodes take colors in order`);
        // Each link has its source node's color.
        const color = (name) => chart.nodes[nodes.findIndex(([each]) => each === name)].color;
        assert.deepEqual(chart.links, flows.map(([source]) => color(source)), `${id}: links take their source's color`);
        chart.nodes.forEach(({ name, box, label }, i) => {
          // Toward the plot's middle: after the node, or before it in the last column.
          const after = (nodes[i][1] < 2) !== rtlPage;
          const side = after ? label.left - box.right : box.left - label.right;
          assert.ok(side >= -1 && side < 16, `${id}, ${name}: its name is ${side}px ${after ? 'after' : 'before'} the node`);
          assert.ok(Math.abs(label.middle - box.middle) <= 1, `${id}, ${name}: its name is level with the node`);
        });
      }
      const left = (chart, name) => chart.nodes[nodes.findIndex(([each]) => each === name)].box.left;
      assert.ok(left(rtl, 'Solar') > left(rtl, 'Grid') && left(rtl, 'Grid') > left(rtl, 'Homes'), 'the columns run from the right');
      laidOut(await drawn(page, '#rtl'), '#rtl', true);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: sankey chart arrow keys step through the drawn links in table order`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      const plot = page.locator('#keys .sankey-chart-plot');
      const tooltip = page.locator('#keys .sankey-chart-tooltip');
      const text = async () => (await tooltip.isVisible()) ? (await tooltip.innerText()).replace(/\s+/g, ' ').trim() : null;
      const active = () => page.locator('#keys').evaluate((el) =>
        [...el.querySelectorAll('.sankey-chart-link')].flatMap((link, i) => (link.classList.contains('active') ? [i] : [])));

      assert.equal(await plot.getAttribute('aria-roledescription'), 'sankey chart');
      assert.equal(await plot.getAttribute('aria-label'), 'Energy flow');
      // Keyboard focus, as Tab gives it, shows the first link.
      await plot.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await text(), 'Source Solar Target Grid Value 30');
      assert.deepEqual(await active(), [0], 'the shown link is marked');
      await page.keyboard.press('ArrowRight');
      assert.equal(await text(), 'Source Wind Target Grid Value 50');
      await page.keyboard.press('ArrowDown');
      assert.equal(await text(), 'Source Grid Target Homes Value 60');
      await page.keyboard.press('ArrowRight');
      assert.equal(await text(), 'Source Grid Target Industry Value 20', 'the rows that draw nothing are skipped');
      assert.deepEqual(await active(), [3]);
      await page.keyboard.press('End');
      assert.equal(await text(), 'Source Wind Target Storage Value 10');
      await page.keyboard.press('ArrowUp');
      assert.equal(await text(), 'Source Grid Target Industry Value 20');
      await page.keyboard.press('Home');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await text(), 'Source Solar Target Grid Value 30', 'the first link stays');
      assert.equal(await tooltip.getAttribute('aria-live'), 'polite');
      await page.keyboard.press('Escape');
      assert.equal(await text(), null);
      assert.deepEqual(await active(), [], 'Escape unmarks the link');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: sankey chart pointer highlights the link under it`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      // A point just inside a link's source end, halfway down it, in page pixels.
      const onLink = (id, index) => page.locator(id).evaluate((el, index) => {
        const path = el.querySelectorAll('.sankey-chart-link')[index];
        const [, x, top, bottom] = path.getAttribute('d').match(/^M([-\d.e]+),([-\d.e]+)C.* [-\d.e]+,([-\d.e]+)Z$/);
        const at = (y) => new DOMPoint(Number(x), Number(y)).matrixTransform(path.getScreenCTM());
        const rtl = getComputedStyle(el).direction === 'rtl';
        return [at(top).x + (rtl ? -4 : 4), (at(top).y + at(bottom).y) / 2];
      }, index);

      for (const id of ['#ltr', '#rtl']) {
        await page.locator(id).scrollIntoViewIfNeeded();
        const tooltip = page.locator(`${id} .sankey-chart-tooltip`);
        await page.mouse.move(...await onLink(id, 1));
        assert.equal((await tooltip.innerText()).replace(/\s+/g, ' ').trim(), 'Source Wind Target Grid Value 50', id);
        assert.equal(await page.locator(`${id} .sankey-chart-link.active`).count(), 1, `${id}: one link is marked`);
        // In the gap between Solar and Wind, just past their edge, on no link.
        const gap = await page.locator(id).evaluate((el) => {
          const [solar, , wind] = [...el.querySelectorAll('.sankey-chart-node')].map((node) => node.getBoundingClientRect());
          const rtl = getComputedStyle(el).direction === 'rtl';
          return [rtl ? solar.left - 4 : solar.right + 4, (solar.bottom + wind.top) / 2];
        });
        await page.mouse.move(...gap);
        assert.equal(await tooltip.isVisible(), false, `${id}: off every link hides the tooltip`);
        await page.mouse.move(0, 0);
      }

      // A tap shows the link, and lifting the finger, which leaves the plot, keeps it.
      await page.locator('#ltr').scrollIntoViewIfNeeded();
      const [x, y] = await onLink('#ltr', 2);
      const tapped = await page.locator('#ltr .sankey-chart-plot').evaluate((plot, [x, y]) => {
        plot.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: x, clientY: y }));
        plot.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'touch' }));
        return [Expressive.SankeyChart.getInstance(plot.parentElement).activeIndex, plot.querySelector('.sankey-chart-tooltip').hidden];
      }, [x, y]);
      assert.deepEqual(tapped, [2, false]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: sankey chart update() moves links and nodes to the changed values and keeps the shown link`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());
      const plot = page.locator('#update .sankey-chart-plot');
      await plot.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('ArrowRight');

      const moved = await page.locator('#update').evaluate((el) => {
        const shapes = () => [...el.querySelectorAll('.sankey-chart-link, .sankey-chart-node')];
        const before = shapes().map((path) => path.getAttribute('d'));
        el.querySelector('tbody').rows[1].cells[2].textContent = '70';
        Expressive.SankeyChart.getInstance(el).update();
        return {
          focused: el.querySelector('.sankey-chart-plot') === document.activeElement,
          active: Expressive.SankeyChart.getInstance(el).activeIndex,
          tooltip: el.querySelector('.sankey-chart-tooltip').innerText.replace(/\s+/g, ' ').trim(),
          animations: shapes().map((path, i) => {
            const animate = path.querySelector('animate');
            return animate && [animate.getAttribute('from') === before[i], animate.getAttribute('to') === path.getAttribute('d')];
          }),
        };
      });
      assert.equal(moved.focused, true, 'focus stays on the plot');
      assert.equal(moved.active, 1, 'the second link stays shown');
      assert.equal(moved.tooltip, 'Source Wind Target Grid Value 70');
      // The scale changes, so every link and node moves from its old shape to its new one.
      moved.animations.forEach((animation, i) => assert.deepEqual(animation, [true, true], `shape ${i} moves from its old shape`));
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: sankey chart redraws without motion under reduced motion, and on its own with data-watch`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      const animations = await page.locator('#update').evaluate((el) => {
        el.querySelector('tbody').rows[1].cells[2].textContent = '70';
        Expressive.SankeyChart.getInstance(el).update();
        return el.querySelectorAll('animate').length;
      });
      assert.equal(animations, 0, 'nothing moves under reduced motion');
      laidOut(await drawn(page, '#update'), '#update', false, [raised, raisedNodes]);

      const before = await page.locator('#watched .sankey-chart-link').nth(1).getAttribute('d');
      await page.locator('#watched tbody tr').nth(1).locator('td').nth(1).evaluate((cell) => { cell.textContent = '70'; });
      await page.waitForFunction((before) =>
        document.querySelectorAll('#watched .sankey-chart-link')[1]?.getAttribute('d') !== before, before);
      laidOut(await drawn(page, '#watched'), '#watched', false, [raised, raisedNodes]);
    } finally {
      await browser.close();
    }
  });
}
