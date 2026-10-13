import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from '@playwright/test';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(type.executablePath()) ? test : test.skip;
  browserTest(`Datepicker dims disabled and outside-month days (${engine})`, async () => {
    const browser = await type.launch();
    try {
      const page = await browser.newPage();
      // Same cell markup as Datepicker.renderDay().
      await page.setContent(`<!doctype html><style>${css}</style>
        <table class="datepicker-table"><tbody><tr>
          <td class="datepicker-day"><button class="datepicker-day-button" type="button">1</button></td>
          <td class="datepicker-day is-disabled"><button class="datepicker-day-button" type="button">2</button></td>
          <td class="datepicker-day is-outside-current-month is-selection-disabled"><button class="datepicker-day-button" type="button">3</button></td>
        </tr></tbody></table>`);
      const [enabled, disabled, outside] = await page.$$eval('.datepicker-day-button', buttons =>
        buttons.map(button => ({ color: getComputedStyle(button).color, pointerEvents: getComputedStyle(button).pointerEvents })));
      assert.equal(enabled.pointerEvents, 'auto');
      for (const day of [disabled, outside]) {
        assert.equal(day.pointerEvents, 'none');
        assert.notEqual(day.color, enabled.color);
      }
    } finally {
      await browser.close();
    }
  });
}
