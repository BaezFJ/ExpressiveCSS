import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const chart = (attrs, header, rows) => `<figure ${attrs}>
  <figcaption>Sales</figcaption>
  <table>
    <thead><tr><th>Month</th>${header}</tr></thead>
    <tbody>${rows.map(([label, ...cells]) => `<tr><th>${label}</th>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</figure>`;

const money = [['Jan', '$1,200'], ['Feb', '$1,850'], ['Mar', '$1,400'], ['Apr', '$2,300']];
const html = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
  <div style="width: 480px">
    ${chart('class="line-chart axis" id="line"', '<th>Web</th>', money)}
    ${chart('class="line-chart" id="plain"', '<th>Web</th>', money)}
    ${chart('class="line-chart axis" id="fixed" data-min="1000" data-max="2400"', '<th>Web</th>', money)}
    ${chart('class="mixed-chart axis" id="mixed"', '<th class="column">Orders</th><th class="end">Rate</th>',
      [['Jan', '120', '2.1%'], ['Feb', '340', '3.4%'], ['Mar', '260', '2.9%'], ['Apr', '410', '4.8%']])}
    ${chart('class="bar-chart axis" id="bar"', '<th>Web</th>', money)}
    <div dir="rtl">${chart('class="bar-chart axis" id="bar-rtl"', '<th>Web</th>', money)}</div>
    ${chart('class="radar-chart axis" id="radar"', '<th>A</th>', [['Speed', '7'], ['Range', '5'], ['Cost', '9']])}
    ${chart('class="pie-chart axis" id="pie"', '<th>Share</th>', [['A', '3'], ['B', '5']])}
  </div>
  <script>${js}</script></body></html>`;

// Each label's text, and its middle against the plot, as a share of the plot's height or width.
const labels = (page, id, across = false) => page.locator(`#${id}`).evaluate((el, across) => {
  const plot = el.querySelector('[class$="-plot"]').getBoundingClientRect();
  return [...el.querySelectorAll('[class*="-axis"] > li > span')].map((span) => {
    const box = span.getBoundingClientRect();
    const at = across ? (box.left + box.width / 2 - plot.left) / plot.width : (box.top + box.height / 2 - plot.top) / plot.height;
    return { text: span.textContent, at: Math.round(at * 100), end: span.closest('ol').classList.contains('end'), right: box.right - plot.left };
  });
}, across);

// Positions in percent of the plot, within a point for the grid line's own pixel.
const near = (actual, expected) => assert.ok(
  actual.length === expected.length && actual.every((value, i) => Math.abs(value - expected[i]) <= 1),
  `${actual} is not near ${expected}`);

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  browserTest(`${engine}: .axis labels chart scales at round values on their grid lines`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => Expressive.AutoInit());

      // The scale widens to round values and the labels repeat the cells' currency.
      const line = await labels(page, 'line');
      assert.deepEqual(line.map((label) => label.text), ['$1K', '$1.5K', '$2K', '$2.5K']);
      near(line.map((label) => label.at), [100, 67, 33, 0]);
      assert.ok(line.every((label) => label.right <= 0), 'the labels sit beside the plot, not over it');
      const lines = await page.locator('#line .line-chart-axis > li').evaluateAll((items) =>
        items.map((li) => getComputedStyle(li).borderTopStyle));
      assert.deepEqual(new Set(lines), new Set(['solid']), 'each label has a grid line');
      assert.equal(await page.locator('#plain [class*="-axis"]').count(), 0, 'no axis without .axis');

      // Ends the author set stay put; the labels are the round values between them.
      assert.deepEqual((await labels(page, 'fixed')).map((label) => label.text), ['$1K', '$1.5K', '$2K']);

      // The end scale stretches to as many steps as the start, so the labels share the lines.
      const mixed = await labels(page, 'mixed');
      const [start, end] = [mixed.filter((label) => !label.end), mixed.filter((label) => label.end)];
      assert.deepEqual(start.map((label) => label.text), ['0', '200', '400', '600']);
      assert.deepEqual(end.map((label) => label.text), ['0%', '2%', '4%', '6%']);
      near(end.map((label) => label.at), start.map((label) => label.at));

      // A bar chart labels its value axis under the plot, from zero at the inline start.
      const bar = await labels(page, 'bar', true);
      assert.deepEqual(bar.map((label) => label.text), ['$0', '$1K', '$2K', '$3K']);
      near(bar.map((label) => label.at), [0, 33, 67, 100]);
      const rtl = await labels(page, 'bar-rtl', true);
      assert.deepEqual(rtl.map((label) => label.text), ['$0', '$1K', '$2K', '$3K']);
      near(rtl.map((label) => label.at), [100, 67, 33, 0]);
      const below = await page.locator('#bar').evaluate((el) =>
        el.querySelector('.bar-chart-axis span').getBoundingClientRect().top >= el.querySelector('.bar-chart-plot').getBoundingClientRect().bottom);
      assert.ok(below, 'the bar chart labels sit under the plot');

      // A radar chart rings its grid at each round value and labels the rings, not zero.
      const radar = await page.locator('#radar').evaluate((el) => ({
        rings: (el.querySelector('.radar-chart-grid').getAttribute('d').match(/Z/g) ?? []).length,
        shown: [...el.querySelectorAll('.radar-chart-axis span')].filter((span) => span.getClientRects().length).map((span) => span.textContent)
      }));
      assert.deepEqual(radar.shown, ['2.5', '5', '7.5', '10']);
      assert.equal(radar.rings, 4);

      assert.equal(await page.locator('#pie [class*="-axis"]').count(), 0, 'a pie has no value axis');
    } finally {
      await browser.close();
    }
  });
}
