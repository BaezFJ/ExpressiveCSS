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
  const fields = [...form.elements].filter((el) => text(el) && el.checkVisibility() && !el.matches(':disabled') && !el.readOnly);
  fields.forEach((el) => el.setAttribute('data-check-field', ''));
  return fields.length;
});

const submitState = (page) => page.evaluate(() => {
  const button = document.querySelector('[data-check-submit]');
  return { disabled: !button || button.disabled || button.getAttribute('aria-disabled') === 'true' };
});

// The first invalid field in form order, and whether focus is on it or in its `.field`.
const focusState = (page) => page.evaluate(() => {
  const form = document.querySelector('[data-check-form]');
  if (!form) return { firstInvalid: null, onFirst: false, replaced: true };
  // A fieldset is in form.elements too and matches :invalid around an invalid field.
  const first = [...form.elements].find((el) => el.matches('input, select, textarea') && el.matches(':invalid, [aria-invalid="true"]'));
  if (!first) return { firstInvalid: null, onFirst: false };
  const active = document.activeElement;
  const onFirst = active === first || Boolean(first.closest('.field')?.contains(active));
  return { firstInvalid: first.id || first.name || first.tagName, focused: active?.id || active?.tagName, onFirst };
});

// The first reason the empty submit fails, or '' when it passes.
const REASONS = [
  [(state) => state.replaced, 'the form was replaced on submit'],
  [(state) => !state.firstInvalid, 'no field became invalid'],
  [(state) => !state.onFirst, 'focus is not on the first invalid field'],
  [(state) => state.disabledAfter, 'submit is disabled after the empty submit'],
  [(state) => state.errors.length, 'page error'],
];
const reasonFor = (state) => REASONS.find(([failed]) => failed(state))?.[1] ?? '';

// Empties the form and submits it; returns a reason it can't, or the state afterwards.
async function emptySubmit(page) {
  const fields = await markForm(page);
  if (fields < 0) return { reason: 'no visible form with a submit button' };
  for (const field of await page.locator('[data-check-field]').all()) await field.fill('');
  if ((await submitState(page)).disabled) return { reason: 'submit is disabled before submission' };
  const before = page.url();
  await page.locator('[data-check-submit]').click();
  await wait(300);
  if (page.url() !== before) return { reason: 'the page navigated on an empty submit' };
  return { fields, ...(await focusState(page)), disabledAfter: (await submitState(page)).disabled };
}

async function checkPage(page, url, dir) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await wait(800);
  const state = await emptySubmit(page);
  const reason = state.reason ?? reasonFor({ ...state, errors });
  return { app: dir, pass: !reason, ...state, reason, errors };
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
