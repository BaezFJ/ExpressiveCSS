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
// The same with nothing for the first row, which then draws no rectangle.
const noDesign = teams.map(([team, value]) => [team, team === 'Design' ? '0' : value]);

const html = `<style>${css}</style>
  <div style="width: 600px">
    ${figure('class="treemap-chart" id="ltr"', teams)}
    ${figure('class="treemap-chart" id="gaps"', teams.map(([team, value]) => [team, { Research: '0', Sales: '-5', Legal: 'n/a' }[team] ?? value]))}
    ${figure('class="treemap-chart" id="keys"', noDesign)}
    ${figure('class="treemap-chart" id="watched" data-watch', teams)}
  </div>
  <div style="width: 600px" dir="rtl">
    ${figure('class="treemap-chart" id="rtl"', teams)}
    ${figure('class="treemap-chart" id="rtl-keys"', noDesign)}
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
  // Percent edges round to the engine's layout units, so neighbours may share a sliver.
  drawn.forEach(({ name, box: a }, i) => drawn.slice(i + 1).forEach(({ name: other, box: b }) => {
    const overlap = [0, 1].map((axis) => Math.min(a[axis] + a[axis + 2], b[axis] + b[axis + 2]) - Math.max(a[axis], b[axis]));
    assert.ok(Math.min(...overlap) <= 0.5, `${message}: ${name} and ${other} overlap by ${overlap}`);
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

/** Runs in the page: the tooltip's text, or null while it is hidden, and the outlined rectangle's name. */
const highlight = (page, id) => page.locator(id).evaluate((el) => {
  const tooltip = el.querySelector('.treemap-chart-tooltip');
  return {
    tooltip: tooltip.hidden ? null : tooltip.innerText.replace(/\s+/g, ' ').trim(),
    active: [...el.querySelectorAll('.treemap-chart-box.active')].map((box) => box.firstElementChild.textContent),
  };
});

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

  browserTest(`${engine}: treemap chart colors rectangles in table order, parts them by a gap and writes in those with room for it`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      const drawn = await page.locator('#ltr').evaluate((el) => {
        const gap = parseFloat(getComputedStyle(el).getPropertyValue('--md-comp-treemap-chart-gap'));
        return [...el.querySelectorAll('.treemap-chart-box')].map((box) => {
          const fill = getComputedStyle(box, '::before');
          const outer = box.getBoundingClientRect();
          return {
            name: box.firstElementChild.textContent,
            series: box.dataset.series,
            inset: [fill.top, fill.right, fill.bottom, fill.left].map(parseFloat),
            gap,
            colored: fill.backgroundColor !== 'rgba(0, 0, 0, 0)',
            text: [...box.children].map((span) => {
              const inner = span.getBoundingClientRect();
              return {
                text: span.textContent,
                visible: span.checkVisibility(),
                inside: inner.left >= outer.left && inner.right <= outer.right && inner.top >= outer.top && inner.bottom <= outer.bottom,
              };
            }),
          };
        });
      });

      assert.deepEqual(drawn.map(({ name, series }) => [name, series]),
        teams.map(([team], i) => [team, String(i + 1)]), 'six colors in table order');
      for (const { name, inset, gap, colored } of drawn) {
        assert.ok(gap > 0, 'the gap token is set');
        assert.deepEqual(inset, [gap / 2, gap / 2, gap / 2, gap / 2], `${name}: the fill stops half the gap inside each edge`);
        assert.ok(colored, `${name} is filled`);
      }
      const text = Object.fromEntries(drawn.map(({ name, text }) => [name, text]));
      assert.deepEqual(text.Engineering, [
        { text: 'Engineering', visible: true, inside: true },
        { text: '600', visible: true, inside: true },
      ], 'a large rectangle shows its name and cell');
      assert.deepEqual(text.Legal.map(({ visible }) => visible), [false, false], 'a thin rectangle shows neither');
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

  browserTest(`${engine}: treemap chart steps through its rectangles by key in table order, in either direction`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      // 300 of 1,080 is 28%, and 20 is 1.9%.
      const research = { tooltip: 'Research Budget 300 (28%)', active: ['Research'] };
      const sales = { tooltip: 'Sales Budget 80 (7.4%)', active: ['Sales'] };
      const legal = { tooltip: 'Legal Budget 20 (1.9%)', active: ['Legal'] };
      for (const id of ['#keys', '#rtl-keys']) {
        // Keyboard focus, as Tab gives it, shows the first row with a rectangle.
        await page.locator(`${id} .treemap-chart-plot`).focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        assert.deepEqual(await highlight(page, id), research, `${id}: focus skips the empty first row`);
        await page.keyboard.press('ArrowRight');
        assert.deepEqual(await highlight(page, id), sales, `${id}: ArrowRight`);
        await page.keyboard.press('ArrowUp');
        assert.deepEqual(await highlight(page, id), research, `${id}: ArrowUp`);
        await page.keyboard.press('ArrowDown');
        assert.deepEqual(await highlight(page, id), sales, `${id}: ArrowDown`);
        await page.keyboard.press('End');
        assert.deepEqual(await highlight(page, id), legal, `${id}: End`);
        await page.keyboard.press('ArrowRight');
        assert.deepEqual(await highlight(page, id), legal, `${id}: the last row stays put`);
        await page.keyboard.press('Home');
        assert.deepEqual(await highlight(page, id), research, `${id}: Home`);
        await page.keyboard.press('ArrowLeft');
        assert.deepEqual(await highlight(page, id), research, `${id}: the first row stays put`);
        await page.keyboard.press('Escape');
        assert.deepEqual(await highlight(page, id), { tooltip: null, active: [] }, `${id}: Escape`);
      }
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: treemap chart highlights the rectangle under the pointer, with the tooltip inside the plot`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      for (const id of ['#ltr', '#rtl']) {
        await page.locator(id).scrollIntoViewIfNeeded();
        const box = await page.locator(`${id} .treemap-chart-box`).nth(2).boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        assert.deepEqual(await highlight(page, id), { tooltip: 'Sales Budget 80 (6.7%)', active: ['Sales'] }, id);
        const inside = await page.locator(id).evaluate((el) => {
          const [plot, tip] = [el.querySelector('.treemap-chart-plot'), el.querySelector('.treemap-chart-tooltip')].map((part) => part.getBoundingClientRect());
          return tip.left >= plot.left && tip.right <= plot.right && tip.top >= plot.top && tip.bottom <= plot.bottom;
        });
        assert.ok(inside, `${id}: the tooltip stays inside the plot`);
        await page.mouse.move(0, 0);
        assert.deepEqual(await highlight(page, id), { tooltip: null, active: [] }, `${id}: leaving the plot hides it`);
      }
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: treemap chart update() lays the rectangles out again in place, and data-watch redraws`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      // Focus on the second row, then double its value.
      await page.locator('#ltr .treemap-chart-plot').focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('ArrowRight');
      const after = await page.locator('#ltr').evaluate((el) => {
        el.querySelectorAll('tbody td')[1].textContent = '600';
        Expressive.TreemapChart.getInstance(el).update();
        return {
          focused: document.activeElement === el.querySelector('.treemap-chart-plot'),
          animations: el.getAnimations({ subtree: true }).length,
        };
      });
      assert.deepEqual(after, { focused: true, animations: 0 }, 'focus stays on the plot, and nothing animates');
      assert.deepEqual(await highlight(page, '#ltr'), { tooltip: 'Research Budget 600 (40%)', active: ['Research'] });
      const doubled = Object.fromEntries(teams.map(([team, value]) => [team, team === 'Research' ? 600 : Number(value)]));
      proportional(await boxes(page, '#ltr'), doubled, 'after update()');

      // data-watch redraws once the table changes, with no update() call: Engineering grows from half the width.
      await page.locator('#watched').evaluate((el) => { el.querySelectorAll('tbody td')[4].textContent = '1200'; });
      await page.waitForFunction(() => document.querySelector('#watched .treemap-chart-box:nth-child(5)').style.width !== '50%');
      proportional(await boxes(page, '#watched'), Object.fromEntries(teams.map(([team, value]) => [team, team === 'Engineering' ? 1200 : Number(value)])), 'data-watch');
    } finally {
      await browser.close();
    }
  });
}
