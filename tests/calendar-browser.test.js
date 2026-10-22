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

const hourRow = (hour, cells) => `<tr><th scope="row"><time datetime="${hour}:00">${hour}</time></th>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
const viewsMarkup = `<!doctype html><html lang="en" theme="light"><head><style>${css}</style></head><body>
<table id="week" class="calendar week"><caption>October 11 to 17, 2026</caption>
<thead><tr><td></td>${[11, 12, 13, 14, 15, 16, 17].map((d) => `<th scope="col"${d === 15 ? ' id="today-head" aria-current="date"' : ''}><abbr title="Day">D</abbr> <time datetime="2026-10-${d}">${d}</time></th>`).join('')}</tr></thead>
<tbody>
${hourRow('09', ['', '<ul class="calendar-events"><li id="short" style="--md-comp-calendar-event-duration: 0.5">Standup</li></ul>', '', '', '', '', ''])}
${hourRow('10', ['', '', '<ul class="calendar-events"><li id="long" style="--md-comp-calendar-event-start: 0.5; --md-comp-calendar-event-duration: 2"><a href="#review">Design review</a></li></ul>', '', '', '', ''])}
${hourRow('11', ['', '', '', '', '', '', ''])}
${hourRow('12', ['', '', '', '', '', '', ''])}
</tbody></table>
<table id="day" class="calendar day"><caption>Thursday</caption>
<thead><tr><td></td><th scope="col">Thu <time datetime="2026-10-15">15</time></th></tr></thead>
<tbody>${hourRow('09', ['<ul class="calendar-events"><li id="day-ev">Standup</li></ul>'])}</tbody></table>
<div id="year" class="calendar-year">${Array.from({ length: 12 }, (_, m) => `<table class="calendar"><caption>Month ${m + 1}</caption><thead><tr>${'SMTWTFS'.split('').map((d) => `<th scope="col">${d}</th>`).join('')}</tr></thead><tbody>${week([[1], [2], [3], [4], [5], [6], [7]])}</tbody></table>`).join('')}</div>
</body></html>`;

for (const [name, engine] of engines) {
  test(`${name}: calendar week and day views place events on an hourly grid, and the year view tiles months`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
      await page.setContent(viewsMarkup);
      const box = (sel) => page.locator(sel).evaluate((el) => el.getBoundingClientRect().toJSON());
      const hour = (await box('#week tbody tr:nth-child(1) td:nth-of-type(1)')).height;
      assert.ok(Math.abs(hour - 48) <= 1, `an hour row is 48px: ${hour}`);

      const short = await box('#short');
      const shortCell = await box('#week tbody tr:nth-child(1) td:nth-of-type(2)');
      assert.ok(Math.abs(short.top - shortCell.top) <= 2, 'an event starts at the top of its hour');
      assert.ok(Math.abs(short.height - hour / 2) <= 3, `a half-hour event is half a row: ${short.height}`);
      assert.ok(short.left >= shortCell.left && short.right <= shortCell.right + 0.5, 'an event stays in its day column');

      const long = await box('#long');
      const longCell = await box('#week tbody tr:nth-child(2) td:nth-of-type(3)');
      assert.ok(Math.abs(long.top - (longCell.top + hour / 2)) <= 2, 'start: 0.5 begins at half past');
      assert.ok(Math.abs(long.height - 2 * hour) <= 3, `a two-hour event runs into the rows below: ${long.height}`);
      assert.equal(await page.getByRole('link', { name: 'Design review' }).count(), 1, 'events stay links');
      assert.notEqual(await page.locator('#today-head > time').evaluate((el) => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)', 'today is marked in the header');
      assert.equal(await page.locator('#week').getByRole('rowheader').count(), 4, 'hours are row headers');

      const dayEvent = await box('#day-ev');
      const dayCell = await box('#day tbody td');
      assert.ok(dayEvent.width > dayCell.width - 8, 'a day view event spans its column');

      const tops = await page.locator('#year > table').evaluateAll((ts) => ts.map((el) => Math.round(el.getBoundingClientRect().top)));
      assert.ok(new Set(tops).size < 12, `months share rows: ${tops}`);
      assert.ok(tops[0] === tops[1], 'the first two months sit side by side');
      assert.equal(await page.locator('#year tbody tr').first().evaluate((el) => getComputedStyle(el).borderBottomWidth), '0px', 'small months drop the table row rules');

      await page.setViewportSize({ width: 360, height: 800 });
      assert.ok((await box('#week')).width <= 360, 'the week fits a phone');
      assert.ok((await box('#short')).width > 0, 'compact events stay visible');
      const phoneTops = await page.locator('#year > table').evaluateAll((ts) => ts.map((el) => Math.round(el.getBoundingClientRect().top)));
      assert.ok((await box('#year')).width <= 360, 'the year fits a phone');
      assert.ok(phoneTops.every((top, i) => i === 0 || top > phoneTops[i - 1]), 'months stack on a phone');
    } finally {
      await browser.close();
    }
  });
}
