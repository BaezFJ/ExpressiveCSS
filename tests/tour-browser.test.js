import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body style="margin:0;padding:40px">
<button id="start" type="button" data-tour-start="tour">Take the tour</button>
<button id="search" type="button" style="margin-left:300px">Search</button>
<div style="height:1200px"></div>
<button id="create" type="button">Create</button>
<div id="tour" class="tour" popover="manual" role="dialog">
  <section data-tour-target="search"><h2>Search everything</h2><p>Find files and people.</p></section>
  <section data-tour-target="missing"><h2>Gone</h2><p>Skipped.</p></section>
  <section data-tour-target="create"><h2>Create</h2><p>Start a new file.</p></section>
  <p class="tour-progress"></p>
  <div class="tour-actions">
    <button type="button" class="button text" data-tour-back>Back</button>
    <button type="button" class="button filled" data-tour-next>Next</button>
    <button type="button" class="button filled" data-tour-done>Done</button>
  </div>
  <button type="button" class="icon-button" data-tour-close aria-label="Close tour"><span class="material-symbols" aria-hidden="true">close</span></button>
</div>
<script>${js}</script></body></html>`;

for (const [name, engine, test] of engines) {
  test(`${name}: a tour steps through its targets beside each one and returns focus`, { timeout: 30000 }, async (t) => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
      await page.setContent(markup);
      const tour = page.locator('#tour');
      const visible = (sel) => page.locator(sel).isVisible();
      await page.click('#start');
      assert.equal(await tour.evaluate((el) => el.matches(':popover-open')), true);
      assert.equal(await page.getByRole('dialog', { name: 'Search everything' }).count(), 1, 'the card is named by the step heading');
      assert.equal(await page.locator('.tour-progress').textContent(), 'Step 1 of 2', 'the missing target is skipped');
      assert.deepEqual([await visible('[data-tour-back]'), await visible('[data-tour-next]'), await visible('[data-tour-done]')], [false, true, false]);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'tour', 'focus moves to the card');
      const card = await tour.boundingBox();
      const search = await page.locator('#search').boundingBox();
      assert.ok(card.y >= search.y + search.height && card.y < search.y + search.height + 40, 'the card sits below its target');
      assert.equal(await page.locator('#search').evaluate((el) => el.classList.contains('tour-target')), true);

      await page.click('[data-tour-next]');
      assert.equal(await page.locator('.tour-progress').textContent(), 'Step 2 of 2');
      assert.deepEqual([await visible('[data-tour-back]'), await visible('[data-tour-next]'), await visible('[data-tour-done]')], [true, false, true]);
      await page.waitForFunction(() => {
        const r = document.getElementById('create').getBoundingClientRect();
        return r.top >= 0 && r.bottom <= innerHeight;
      });
      const created = await page.locator('#create').boundingBox();
      const moved = await tour.boundingBox();
      assert.ok(Math.abs(moved.y - (created.y + created.height)) < 40 || Math.abs(moved.y + moved.height - created.y) < 40, 'the card follows the new target');
      assert.equal(await page.locator('#search').evaluate((el) => el.classList.contains('tour-target') || el.style.getPropertyValue('anchor-name') !== ''), false, 'the previous target is released');

      await page.keyboard.press('Escape');
      assert.equal(await tour.evaluate((el) => el.matches(':popover-open')), false, 'Escape ends the tour');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'start', 'focus returns to the opener');
      assert.equal(await page.locator('.tour-target').count(), 0);

      await page.click('#start');
      await tour.evaluate((el) => el.hidePopover());
      // The toggle event is queued, so the release lands a task later.
      await page.waitForFunction(() => !document.querySelector('.tour-target'), null, { timeout: 2000 });
    } finally {
      await browser.close();
    }
  });
}
