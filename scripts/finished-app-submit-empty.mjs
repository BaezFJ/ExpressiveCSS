// Submits a finished-app `settings-form` build empty, in Chromium, and checks that the
// submit stays enabled and focus lands on the first invalid field.
// Usage: node scripts/finished-app-submit-empty.mjs <app-dir>...
// Each app dir holds the build's index.html next to a built dist/. Prints one JSON line per app.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

// Marks the first visible form whose elements hold a submit, its submit, and the
// text fields a person would clear; returns how many fields there are to clear.
const markForm = (page) => page.evaluate(() => {
  const submitOf = (form) => [...form.elements].find((el) => el.type === 'submit' && el.checkVisibility());
  const form = [...document.forms].find((each) => each.checkVisibility() && submitOf(each));
  if (!form) return -1;
  form.setAttribute('data-check-form', '');
  submitOf(form).setAttribute('data-check-submit', '');
  const text = (el) => (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(checkbox|radio|file|range|color|submit|button|reset|hidden|image)$/.test(el.type)));
  const fields = [...form.elements].filter((el) => text(el) && el.checkVisibility() && !el.disabled && !el.readOnly);
  fields.forEach((el) => el.setAttribute('data-check-field', ''));
  return fields.length;
});

const submitState = (page) => page.locator('[data-check-submit]').evaluate((button) => ({
  disabled: button.disabled || button.getAttribute('aria-disabled') === 'true',
}));

// The first invalid field in form order, and whether focus is on it or in its `.field`.
const focusState = (page) => page.evaluate(() => {
  const form = document.querySelector('[data-check-form]');
  // A fieldset is in form.elements too and matches :invalid around an invalid field.
  const first = [...form.elements].find((el) => el.matches('input, select, textarea') && el.matches(':invalid, [aria-invalid="true"]'));
  if (!first) return { firstInvalid: null, onFirst: false };
  const active = document.activeElement;
  const onFirst = active === first || Boolean(first.closest('.field')?.contains(active));
  return { firstInvalid: first.id || first.name || first.tagName, focused: active?.id || active?.tagName, onFirst };
});

async function checkPage(page, url, dir) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await wait(800);
  const fields = await markForm(page);
  if (fields < 0) return { app: dir, pass: false, reason: 'no visible form with a submit button', errors };
  for (const field of await page.locator('[data-check-field]').all()) await field.fill('');
  if ((await submitState(page)).disabled) return { app: dir, pass: false, reason: 'submit is disabled before submission', errors };
  await page.locator('[data-check-submit]').click();
  await wait(300);
  if (page.url() !== url) return { app: dir, pass: false, reason: 'the page navigated on an empty submit', errors };
  const focus = await focusState(page);
  const stillEnabled = !(await submitState(page)).disabled;
  const reason = !focus.firstInvalid ? 'no field became invalid'
    : !focus.onFirst ? 'focus is not on the first invalid field'
      : !stillEnabled ? 'submit is disabled after the empty submit'
        : errors.length ? 'page error' : '';
  return { app: dir, pass: !reason, reason, fields, ...focus, errors };
}

async function check(browser, dir) {
  const page = await browser.newPage();
  try {
    return await checkPage(page, pathToFileURL(resolve(dir, 'index.html')).href, dir);
  } catch (error) {
    return { app: dir, pass: false, reason: error.message.split('\n')[0] };
  } finally {
    await page.close();
  }
}

if (process.argv.length < 3) {
  console.error('usage: node scripts/finished-app-submit-empty.mjs <app-dir>...');
  process.exit(2);
}
const browser = await chromium.launch();
try {
  for (const dir of process.argv.slice(2)) {
    const result = await check(browser, dir);
    console.log(JSON.stringify(result));
    if (!result.pass) process.exitCode = 1;
  }
} finally {
  await browser.close();
}
