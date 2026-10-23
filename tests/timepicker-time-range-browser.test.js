// Timepicker `minTime` and `maxTime` in real engines: the roadmap check that
// a 09:00 to 17:30 range refuses 08:00 and 18:00 by dial, field and typing,
// and accepts 17:30.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const html = `<!doctype html><style>${css}</style>
  <style>*, *::before, *::after { transition: none !important; }</style>
  <div class="field"><input id="time" type="text"><label for="time">Time</label></div>`;

/** Open a fresh 09:00 to 17:30 picker at `value` by keyboard, with focus on the hours. */
async function openAt(page, twelveHour, value) {
  await page.setContent(html);
  await page.addScriptTag({ content: js });
  await page.evaluate((twelveHour) => {
    window.selected = [];
    window.picker = Expressive.Timepicker.init(document.querySelector('#time'), {
      duration: 0, vibrate: false, autoSubmit: false, twelveHour, minTime: '09:00', maxTime: '17:30',
      onSelect: (hours, minutes) => window.selected.push([hours, minutes])
    });
  }, twelveHour);
  await page.locator('#time').fill(value);
  await page.locator('#time').press('Enter');
}

const field = (page, name) => page.getByRole('spinbutton', { name, exact: true });
const tick = (page, view, text) => page.locator(`.timepicker-${view} .timepicker-tick`).getByText(text, { exact: true });

/** Click the middle of a dial tick with the mouse, whether or not it takes pointer events. */
async function clickTick(page, view, text) {
  const box = await tick(page, view, text).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/** Type `digits` over the hours, then leave the field. */
async function typeHours(page, digits) {
  await field(page, 'Hours').focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(digits);
  await page.keyboard.press('Tab');
}

/** The dial refuses each tick in `texts`: the hours and view stay, and nothing is selected. */
async function refuseTicks(page, texts, hours) {
  await field(page, 'Hours').focus();
  for (const text of texts) {
    await expect(tick(page, 'hours', text)).toHaveClass(/is-disabled/);
    await clickTick(page, 'hours', text);
    await expect(field(page, 'Hours')).toHaveValue(hours);
    await expect(tick(page, 'hours', text)).toBeVisible();
  }
  assert.deepEqual(await page.evaluate(() => window.selected), []);
}

for (const [engine, type, browserTest] of engines) {

  browserTest(`Timepicker keeps 09:00 to 17:30 by dial, field and typing (${engine})`, async () => {
    const browser = await leaseBrowser(type);
    let page;
    try {
      page = await browser.newPage();
      const clocks = [
        { twelveHour: false, start: '12:00', refused: [['12', ['8', '18'], ['08', '18']]], last: '17', expected: '17:30' },
        { twelveHour: true, start: '10:00 AM', refused: [['10', ['8'], ['8']], ['05', ['6'], ['6']]], last: '5', expected: '05:30 PM' }
      ];
      for (const { twelveHour, start, refused, last, expected } of clocks) {
        await openAt(page, twelveHour, start);
        for (const [i, [hours, ticks, typed]] of refused.entries()) {
          // On the 12-hour clock, PM moves 10 PM to the last allowed time, 05:30 PM.
          if (i) await page.getByRole('button', { name: 'PM', exact: true }).click();
          await refuseTicks(page, ticks, hours);
          for (const digits of typed) {
            await typeHours(page, digits);
            await expect(field(page, 'Hours')).toHaveValue(hours);
          }
        }
        const [disabled, enabled] = await page.evaluate(() => [
          getComputedStyle(document.querySelector('.timepicker-hours .is-disabled')).color,
          getComputedStyle(document.querySelector('.timepicker-hours .timepicker-tick:not(.is-disabled)')).color
        ]);
        assert.notEqual(disabled, enabled, `${engine} ${twelveHour ? 12 : 24}-hour disabled tick colour`);

        await field(page, 'Hours').focus();
        await clickTick(page, 'hours', last);
        await clickTick(page, 'minutes', '30');
        await field(page, 'Hours').focus();
        await page.keyboard.press('ArrowUp');
        await expect(field(page, 'Hours')).toHaveValue(last.padStart(2, '0'));
        await page.getByRole('button', { name: 'Ok', exact: true }).click();
        await expect(page.locator('#time')).toHaveValue(expected);
        await page.evaluate(() => window.picker.destroy());
      }
    } finally {
      await page?.close();
      await browser.close();
    }
  });
}
