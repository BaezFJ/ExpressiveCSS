import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const html = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
  <div class="field"><input id="date" value="Mar 14, 2026"><label for="date">Start date</label></div>
  <div class="field"><input id="time" value="09:30 AM"><label for="time">Start time</label></div>
  <script>${js}</script>
  <script>
    window.calls = [];
    window.closes = 0;
    document.addEventListener('close', () => closes++, true);
    window.date = Expressive.Datepicker.init(document.getElementById('date'), {
      displayPlugin: 'modal', onConfirm: () => calls.push('confirm'), onCancel: () => calls.push('cancel')
    });
    window.time = Expressive.Timepicker.init(document.getElementById('time'), {
      displayPlugin: 'modal', vibrate: false, onDone: () => calls.push('done'), onCancel: () => calls.push('cancel')
    });
  </script></body></html>`;

// The dialog's close event, which tells the picker it was dismissed, is a
// task of its own, so wait for it rather than for the open attribute.
const settle = async (page) => {
  await page.waitForFunction(() => closes > 0);
  await page.evaluate(() => { closes = 0; });
};
const state = (page) => page.evaluate(() => ({
  open: [...document.querySelectorAll('dialog.display-modal')].map((dialog) => dialog.matches(':modal')),
  focus: document.activeElement.id || document.activeElement.className,
  date: document.getElementById('date').value,
  time: document.getElementById('time').value,
  calls: calls.splice(0)
}));

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  browserTest(`${engine}: a modal date picker writes the input on Ok and nothing on Cancel, Escape or the scrim`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 420, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);

      await page.click('#date');
      const opened = await page.evaluate(() => {
        const dialog = document.querySelector('#date ~ dialog.display-modal');
        return { modal: dialog.matches(':modal'), label: dialog.getAttribute('aria-label'),
          focus: document.activeElement.textContent, buttons: [...dialog.querySelectorAll('.confirmation-btns button')].map((b) => b.textContent) };
      });
      assert.deepEqual(opened, { modal: true, label: 'Start date', focus: '14', buttons: ['Cancel', 'Ok'] });

      // Picking a day writes nothing until Ok; Ok closes and returns focus.
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      assert.equal(await page.inputValue('#date'), 'Mar 14, 2026');
      await page.click('.display-modal .btn-confirm');
      await settle(page);
      assert.deepEqual(await state(page), { open: [false, false], focus: 'date', date: 'Mar 15, 2026', time: '09:30 AM', calls: ['confirm'] });

      // Cancel, Escape and a press on the scrim each leave the value and count as Cancel.
      for (const dismiss of [
        () => page.click('.display-modal .btn-cancel'),
        () => page.keyboard.press('Escape'),
        () => page.mouse.click(5, 5)
      ]) {
        await page.click('#date');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Enter');
        await dismiss();
        await settle(page);
        assert.deepEqual(await state(page), { open: [false, false], focus: 'date', date: 'Mar 15, 2026', time: '09:30 AM', calls: ['cancel'] });
      }

      await page.evaluate(() => date.destroy());
      assert.equal(await page.locator('#date ~ dialog').count(), 0, 'destroy removes the dialog');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a modal time picker steps its fields with the arrow keys and writes the time on Enter`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 420, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);

      await page.click('#time');
      const fields = await page.evaluate(() => [...document.querySelectorAll('.timepicker-display-digital-clock input')].map((input) => [
        input.getAttribute('role'), input.getAttribute('aria-valuemin'), input.getAttribute('aria-valuemax')]));
      assert.deepEqual(fields, [['spinbutton', '1', '12'], ['spinbutton', '0', '59']]);
      assert.equal(await page.evaluate(() => document.activeElement.className), 'timepicker-input-hours');

      // Hours wrap from 12 back to 1; minutes step by five and wrap past 59.
      for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp');
      assert.equal(await page.inputValue('.timepicker-input-hours'), '01');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Tab');
      for (let i = 0; i < 6; i++) await page.keyboard.press('PageUp');
      await page.keyboard.press('ArrowUp');
      assert.equal(await page.inputValue('.timepicker-input-minutes'), '01');
      // The hand points at the stepped minute.
      const hand = await page.evaluate(() => {
        const bg = document.querySelector('.timepicker-canvas-bg');
        return Math.round(Math.atan2(Number(bg.getAttribute('cx')), -Number(bg.getAttribute('cy'))) / (Math.PI / 30));
      });
      assert.equal(hand, 1);

      await page.keyboard.press('Enter');
      await settle(page);
      assert.deepEqual(await state(page), { open: [false, false], focus: 'time', date: 'Mar 14, 2026', time: '12:01 AM', calls: ['done'] });

      await page.click('#time');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('Escape');
      await settle(page);
      assert.deepEqual(await state(page), { open: [false, false], focus: 'time', date: 'Mar 14, 2026', time: '12:01 AM', calls: ['cancel'] });
    } finally {
      await browser.close();
    }
  });
}
