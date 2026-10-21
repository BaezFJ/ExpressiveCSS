// Timepicker `showSeconds` in real engines: the roadmap check by keyboard,
// and the three fields fitting the picker in every display.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const html = `<!doctype html><style>${css}</style>
  <style>*, *::before, *::after { transition: none !important; }</style>
  <div class="field"><input id="time" type="text"><label for="time">Time</label></div>`;

/** Open a fresh picker on #time with `options`. */
async function setUp(page, options) {
  await page.setContent(html);
  await page.addScriptTag({ content: js });
  await page.evaluate((options) => {
    window.picker = Expressive.Timepicker.init(document.querySelector('#time'), {
      duration: 0, vibrate: false, displayPluginOptions: { duration: 0 }, ...options
    });
  }, options);
}

const field = (page, name) => page.getByRole('spinbutton', { name, exact: true });

/** Open a seconds picker at 9 AM by keyboard, on PM for the 12-hour clock, with focus on the hours. */
async function openAtNine(page, twelveHour) {
  await setUp(page, { showSeconds: true, twelveHour, autoSubmit: false });
  await page.locator('#time').fill(twelveHour ? '09:00:00 AM' : '09:00:00');
  await page.locator('#time').press('Enter');
  if (twelveHour) {
    await page.getByRole('button', { name: 'PM', exact: true }).click();
    await field(page, 'Hours').focus();
  }
}

/** Type each field's digits, pressing Tab between the fields. */
async function typeFields(page, entries) {
  for (const [i, [name, digits]] of entries.entries()) {
    if (i) await page.keyboard.press('Tab');
    await expect(field(page, name)).toBeFocused();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type(digits);
  }
}

/** Tab leaves the seconds for the AM/PM buttons, and Shift+Tab comes back. */
async function tabPastSeconds(page) {
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'AM', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(field(page, 'Seconds')).toBeFocused();
}

for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(type.executablePath()) ? test : test.skip;

  browserTest(`Timepicker sets 14:30:45 through its fields on both clocks (${engine})`, async () => {
    const browser = await leaseBrowser(type);
    let page;
    try {
      page = await browser.newPage();
      for (const [twelveHour, hours, expected] of [[true, '02', '02:30:45 PM'], [false, '14', '14:30:45']]) {
        await openAtNine(page, twelveHour);
        await typeFields(page, [['Hours', hours], ['Minutes', '30'], ['Seconds', '45']]);
        if (twelveHour) await tabPastSeconds(page);
        await page.keyboard.press('Enter');
        await expect(page.locator('#time')).toHaveValue(expected);
        await page.evaluate(() => window.picker.destroy());
      }
    } finally {
      await page?.close();
      await browser.close();
    }
  });

  browserTest(`Timepicker fits three fields in every display (${engine})`, async () => {
    const browser = await leaseBrowser(type);
    let page;
    try {
      page = await browser.newPage();
      for (const width of [360, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        for (const displayPlugin of [null, 'docked', 'modal']) for (const twelveHour of [true, false]) {
          const label = `${width}px ${displayPlugin ?? 'inline'} ${twelveHour ? 12 : 24}-hour`;
          await setUp(page, { showSeconds: true, twelveHour, displayPlugin });
          await page.locator('#time').click();
          await expect(page.getByRole('spinbutton', { name: 'Seconds', exact: true })).toBeVisible();
          const fit = await page.evaluate(() => {
            const box = document.querySelector('.timepicker-container').getBoundingClientRect();
            const inputs = [...document.querySelectorAll('.timepicker-display-digital-clock input')];
            const parts = [...document.querySelectorAll('.timepicker-display-digital-clock > div, .timepicker-display-am-pm')];
            return {
              scrolled: inputs.filter((input) => input.scrollWidth > input.clientWidth).map((input) => input.className),
              outside: parts.filter((part) => {
                const r = part.getBoundingClientRect();
                return r.left < box.left - 0.5 || r.right > box.right + 0.5;
              }).map((part) => part.className)
            };
          });
          assert.deepEqual(fit, { scrolled: [], outside: [] }, label);
          await page.evaluate(() => window.picker.destroy());
        }
        await setUp(page, { twelveHour: true });
        // The seconds layout leaves a two-field picker alone.
        const sizes = await page.evaluate(() => ['hours', 'minutes'].map((unit) => {
          const style = getComputedStyle(document.querySelector(`.timepicker-input-${unit}`));
          return [style.fontSize, style.paddingLeft];
        }));
        assert.deepEqual(sizes, [['64px', '12.8px'], ['64px', '12.8px']], `${width}px without seconds`);
        await page.evaluate(() => window.picker.destroy());
      }
    } finally {
      await page?.close();
      await browser.close();
    }
  });
}
