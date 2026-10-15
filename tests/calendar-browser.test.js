import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;
const engines = Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name);
const week = (days) => `<tr>${days.map(([d, extra = '', events = '']) => `<td${extra}><time datetime="2026-10-${String(d).padStart(2, '0')}">${d}</time>${events}</td>`).join('')}</tr>`;
const markup = `<!doctype html><html lang="en" theme="light"><head><style>${css}</style></head><body>
<table id="cal" class="calendar"><caption>October 2026</caption>
<thead><tr>${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => `<th scope="col"><abbr title="${d}day">${d}</abbr></th>`).join('')}</tr></thead>
<tbody>
${week([[27, ' class="outside"'], [28, ' class="outside"'], [29, ' class="outside"'], [30, ' class="outside"'], [1], [2], [3]])}
${week([[4], [5, '', '<ul class="calendar-events"><li><a id="ev" href="#standup">Standup with the whole design and engineering team</a></li><li>Lunch</li></ul>'], [6], [7], [8], [9], [10]])}
${week([[11], [12], [13], [14], [15, ' id="today" aria-current="date"'], [16], [17]])}
</tbody></table></body></html>`;

for (const [name, engine] of engines) {
  test(`${name}: calendar lays out a month grid with today, outside days and event chips`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
      await page.setContent(markup);
      const style = (sel, p) => page.locator(sel).evaluate((el, p) => getComputedStyle(el)[p], p);
      const widths = await page.locator('#cal tbody tr:first-child td').evaluateAll((tds) => tds.map((td) => Math.round(td.getBoundingClientRect().width)));
      assert.ok(Math.max(...widths) - Math.min(...widths) <= 1, `seven equal columns: ${widths}`);
      assert.ok((await page.locator('#cal td').first().boundingBox()).height >= 96, 'days have room for events');
      assert.notEqual(await style('#today > time', 'backgroundColor'), 'rgba(0, 0, 0, 0)', 'today is marked');
      assert.notEqual(await page.locator('#cal td.outside > time').first().evaluate((el) => getComputedStyle(el).opacity), '1', 'outside days are muted');
      const chip = await page.locator('#ev').evaluate((el) => {
        const li = el.parentElement; const r = li.getBoundingClientRect(); const td = li.closest('td').getBoundingClientRect();
        return { inside: r.right <= td.right + 0.5, ellipsis: getComputedStyle(li).textOverflow, bg: getComputedStyle(li).backgroundColor };
      });
      assert.ok(chip.inside, 'a long event stays inside its day');
      assert.equal(chip.ellipsis, 'ellipsis');
      assert.notEqual(chip.bg, 'rgba(0, 0, 0, 0)');
      assert.equal(await page.getByRole('link', { name: /Standup/ }).count(), 1, 'events stay links');
      assert.equal(await page.getByRole('columnheader').count(), 7);

      await page.setViewportSize({ width: 360, height: 800 });
      const compact = await page.locator('#ev').evaluate((el) => el.parentElement.getBoundingClientRect().width);
      assert.ok(compact > 0, 'compact chips stay visible');
      assert.ok((await page.locator('#cal').boundingBox()).width <= 360, 'the month fits a phone');
    } finally {
      await browser.close();
    }
  });
}
