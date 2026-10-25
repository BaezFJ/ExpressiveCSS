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
  <button type="button">Before</button>
  <div style="width: 600px" lang="en">
    ${funnel('class="funnel-chart" id="ltr"', steps)}
    ${funnel('class="funnel-chart" id="gap"', set({ Trial: 'n/a' }))}
    ${funnel('class="funnel-chart" id="nonpositive"', set({ Trial: '0', Paid: '-5' }))}
    ${funnel('class="funnel-chart" id="empty"', steps.map(([step]) => [step, 'n/a', 'n/a']))}
    ${funnel('class="funnel-chart" id="watched" data-watch', steps)}
  </div>
  <div style="width: 600px" dir="rtl" lang="en">
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

/** Runs in the page: a tooltip's parts, a space between each. */
const words = (tooltip) => [...tooltip.children].map((part) => part.textContent).join(' ');

/** The tooltip's text, or null while it is hidden. */
const tip = (page, id) => page.locator(`${id} .funnel-chart-tooltip`).evaluate((el, source) =>
  (el.hidden ? null : new Function(`return ${source}`)()(el)), words.toString());

/** Gives a chart's plot keyboard focus, through Tab, so it matches :focus-visible. */
async function tabTo(page, id) {
  await page.locator(`${id} .funnel-chart-plot`).focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
}

/**
 * Runs in the page: sets a row's visitors in chart `id` to `value`, calls
 * update(), and reads the row's stage width as a share of the plot: where
 * its transition starts, or null without one, and where it ends.
 */
function change(id, row, value) {
  const el = document.querySelector(id);
  el.querySelector(`tbody tr:nth-child(${row + 1}) td`).textContent = value;
  Expressive.FunnelChart.getInstance(el).update();
  const stage = el.querySelectorAll('.funnel-chart-stages > div')[row].querySelector('span');
  const share = () => stage.getBoundingClientRect().width / el.querySelector('.funnel-chart-plot').clientWidth;
  const [transition] = stage.getAnimations();
  if (!transition) return { from: null, to: share() };
  transition.pause();
  transition.currentTime = 0;
  const from = share();
  transition.finish();
  return { from, to: share() };
}

/** A page with the fixture started, and any page errors it throws. */
async function open(browser, reducedMotion = 'reduce') {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.emulateMedia({ reducedMotion });
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

  browserTest(`${engine}: funnel chart names its plot and puts each label beside its stage`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const [page] = await open(browser);
      for (const [id, rtl] of [['#ltr', false], ['#rtl', true]]) {
        const plot = await page.locator(`${id} .funnel-chart-plot`).evaluate((el) =>
          [el.tabIndex, el.getAttribute('role'), el.getAttribute('aria-roledescription'), el.getAttribute('aria-label')]);
        assert.deepEqual(plot, [0, 'group', 'funnel chart', 'Signup funnel'], id);
        const drawn = await read(page, id);
        const end = drawn.plot.left + drawn.plot.width;
        drawn.labels.forEach((label, i) => {
          assert.ok(rtl ? label.left >= end : label.right <= drawn.plot.left, `${id}: label ${i} at the inline start`);
          const stage = drawn.stages[i];
          assert.ok(Math.abs(label.middle - (stage.top + stage.bottom) / 2) <= 1, `${id}: label ${i} level with its stage`);
        });
      }
      // Two value columns, but one series of stages, so no legend, and every stage in the first color.
      const look = await page.locator('#ltr').evaluate((el) => {
        const probe = document.createElement('span');
        probe.style.backgroundColor = 'var(--md-sys-color-primary)';
        el.append(probe);
        const primary = getComputedStyle(probe).backgroundColor;
        probe.remove();
        const stages = [...el.querySelectorAll('.funnel-chart-stages span')].map((span) => getComputedStyle(span).backgroundColor);
        return { legend: !!el.querySelector('.funnel-chart-legend'), primary, stages };
      });
      assert.equal(look.legend, false);
      assert.deepEqual(look.stages, Array(4).fill(look.primary));
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: funnel chart moves between rows with the up and down arrows`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const [page] = await open(browser);
      for (const id of ['#ltr', '#rtl']) {
        await tabTo(page, id);
        assert.match(await tip(page, id), /^Visited/, `${id}: focus shows the first row`);
        await page.keyboard.press('ArrowDown');
        assert.match(await tip(page, id), /^Signed up/, id);
        await page.keyboard.press('End');
        assert.match(await tip(page, id), /^Paid/, id);
        await page.keyboard.press('Home');
        assert.match(await tip(page, id), /^Visited/, id);
        await page.keyboard.press('ArrowUp');
        assert.match(await tip(page, id), /^Visited/, `${id}: the first row is the top`);
        await page.keyboard.press('Escape');
        assert.equal(await tip(page, id), null, id);
      }
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: funnel chart highlights the row under the pointer`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const [page] = await open(browser);
      const box = await page.locator('#ltr .funnel-chart-plot').boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * (2.5 / 4));
      assert.match(await tip(page, '#ltr'), /^Trial/);
      // A band behind the row, and the tooltip above it in the lower half.
      const band = await page.locator('#ltr .funnel-chart-cursor').boundingBox();
      assert.ok(Math.abs(band.height - box.height / 4) < 1 && Math.abs(band.y - (box.y + box.height / 2)) < 1, JSON.stringify(band));
      const tooltip = await page.locator('#ltr .funnel-chart-tooltip').boundingBox();
      assert.ok(tooltip.y + tooltip.height <= band.y + 1, 'the tooltip sits above the row');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height + 200);
      assert.equal(await tip(page, '#ltr'), null);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: funnel chart tooltip gives each stage's share of the first`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const [page] = await open(browser);
      const tips = (id) => page.locator(id).evaluate((el, source) => {
        const chart = Expressive.FunnelChart.getInstance(el);
        return chart.labels.map((_, i) => {
          chart.show(i);
          return new Function(`return ${source}`)()(el.querySelector('.funnel-chart-tooltip'));
        });
      }, words.toString());
      assert.deepEqual(await tips('#ltr'), [
        'Visited Visitors 1000 (100%) Revenue $0',
        'Signed up Visitors 600 (60%) Revenue $0',
        'Trial Visitors 250 (25%) Revenue $500',
        'Paid Visitors 45 (4.5%) Revenue $4,500',
      ]);
      // A gap is left out, as in every chart; zero and below have no share.
      assert.equal((await tips('#gap'))[2], 'Trial Revenue $500');
      assert.deepEqual((await tips('#nonpositive')).slice(2), ['Trial Visitors 0 Revenue $500', 'Paid Visitors -5 Revenue $4,500']);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: funnel chart update() moves each stage from its old width`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      for (const motion of ['no-preference', 'reduce']) {
        const [page] = await open(browser, motion);
        await tabTo(page, '#ltr');
        await page.keyboard.press('ArrowDown');
        // In one evaluate, so neither transition ends before it is read.
        const [ltr, gap] = await page.evaluate((source) => {
          const changed = new Function(`return ${source}`)();
          return [changed('#ltr', 1, '800'), changed('#gap', 2, '300')];
        }, change.toString());
        assert.ok(Math.abs(ltr.to - 0.8) < 0.01, `${motion}: ends at 800 of 1000, at ${ltr.to}`);
        if (motion === 'reduce') {
          assert.deepEqual([ltr.from, gap.from], [null, null], 'no transition under reduced motion');
        } else {
          assert.ok(Math.abs(ltr.from - 0.6) < 0.01, `starts at its old 600 of 1000, at ${ltr.from}`);
          assert.ok(gap.from < 0.01, `a stage new to the chart grows from nothing, at ${gap.from}`);
        }
        // update() keeps focus on the plot and the highlighted row.
        const kept = await page.locator('#ltr').evaluate((el) =>
          [el.querySelector('.funnel-chart-plot') === document.activeElement, Expressive.FunnelChart.getInstance(el).activeIndex]);
        assert.deepEqual(kept, [true, 1], motion);
        assert.match(await tip(page, '#ltr'), /^Signed up Visitors 800 \(80%\)/, motion);
        await page.close();
      }
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: funnel chart with data-watch redraws when its table changes`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const [page] = await open(browser);
      await page.locator('#watched tbody tr:nth-child(3) td:first-of-type').evaluate((cell) => { cell.textContent = '500'; });
      await page.waitForFunction(() => {
        const el = document.querySelector('#watched');
        const stage = el.querySelectorAll('.funnel-chart-stages > div')[2].querySelector('span');
        return Math.abs(stage.getBoundingClientRect().width / el.querySelector('.funnel-chart-plot').clientWidth - 0.5) < 0.01;
      });
    } finally {
      await browser.close();
    }
  });
}
