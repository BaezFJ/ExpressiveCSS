import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as settleReset } from 'node:timers/promises';
import { Expressive, resetBody, window } from './setup.js';

const markup = `<form id="upload"><div class="drop-zone"><label>Choose documents
  <input id="files" type="file" multiple data-validate-types accept=".pdf,.png" aria-describedby="hint">
  </label><p data-error="Choose PDF or PNG files." role="status" aria-live="polite" hidden></p>
  <ul class="drop-zone-files" aria-live="polite"></ul>
  </div><p id="hint">Keep the originals.</p></form>`;
const input = () => document.getElementById('files');
const validate = () => Expressive.Forms.validateField(input());
const file = (name, type = '') => new window.File(['contents'], name, { type });
const choose = (...files) => {
  Object.defineProperty(input(), 'files', { configurable: true, value: files });
  Object.defineProperty(input(), 'value', { configurable: true, get: () => files.length ? `C:\\fakepath\\${files[0].name}` : '' });
  return files;
};

beforeEach(() => { resetBody(); document.body.innerHTML = markup; });

test('an unsupported file invalidates the whole selection without replacing its files', () => {
  const selected = choose(file('report.pdf', 'application/pdf'), file('<img src=x onerror=alert(1)>.exe', 'application/octet-stream'));
  validate();
  assert.equal(input().validity.customError, true);
  assert.equal(input().validationMessage, 'Choose PDF or PNG files.');
  assert.equal(document.getElementById('upload').checkValidity(), false);
  assert.equal(input().files, selected);
  Expressive.Forms.listDropZoneFiles(document.querySelector('.drop-zone'), input());
  assert.equal(document.querySelectorAll('.drop-zone-files > li').length, 2);
  assert.equal(document.querySelector('.drop-zone-files img'), null);
  assert.match(document.querySelector('.drop-zone-files').textContent, /<img src=x onerror=alert\(1\)>\.exe/);
});

test('extension, exact MIME and standard media wildcard alternatives match case-insensitively', () => {
  const cases = [
    ['.PDF', 'REPORT.PdF', '', true],
    ['.tar.gz', 'archive.TAR.GZ', '', true],
    ['.pdf', 'report.pdf.exe', 'application/pdf', false],
    ['application/pdf', 'unknown', 'application/pdf', true],
    ['APPLICATION/PDF', 'unknown', 'application/pdf', true],
    ['application/x.foo*bar', 'unknown', 'application/x.foo*bar', true],
    ['application/x.foo*bar', 'unknown', 'text/plain', false],
    ['text/*', 'anything.exe', '', true],
    ['application/pdf', 'report.pdf', '', false],
    ['image/*', 'picture', 'image/png', true],
    ['audio/*', 'sound', 'audio/ogg', true],
    ['video/*', 'clip', 'video/mp4', true],
    ['image/*', 'photo.png', '', false],
    ['image/*', 'report', 'application/pdf', false],
    [' .pdf, IMAGE/*,application/json ', 'data', 'application/json', true],
    ['garbage, .png', 'picture.PNG', '', true],
    ['garbage, .png', 'report.pdf', 'application/pdf', false],
    ['', 'anything.exe', '', true],
    ['garbage,application/pdf;charset=utf-8', 'anything.exe', '', true],
  ];
  for (const [accept, name, type, valid] of cases) {
    input().accept = accept;
    choose(file(name, type));
    validate();
    assert.equal(input().validity.valid, valid, `${accept}: ${name}/${type}`);
  }
});

test('type checks are opt-in and work without a file list', () => {
  choose(file('program.exe', 'application/octet-stream'));
  input().removeAttribute('data-validate-types');
  validate();
  assert.equal(input().validity.valid, true);
  input().setAttribute('data-validate-types', '');
  document.querySelector('.drop-zone-files').remove();
  validate();
  assert.equal(input().validity.customError, true);
});

test('valid replacement, clearing and opt-out release only the owned type error', () => {
  choose(file('bad.exe'));
  validate();
  assert.equal(input().validity.customError, true);
  choose(file('valid.PDF'));
  validate();
  assert.equal(input().validity.valid, true);
  choose(file('bad.exe'));
  validate();
  choose();
  validate();
  assert.equal(input().validity.valid, true);
  choose(file('bad.exe'));
  validate();
  input().removeAttribute('data-validate-types');
  validate();
  assert.equal(input().validity.valid, true);
});

test('application custom validity survives type validation and recovery', () => {
  input().setCustomValidity('Application policy');
  for (const files of [[file('bad.exe')], [file('valid.pdf')], []]) {
    choose(...files);
    validate();
    assert.equal(input().validationMessage, 'Application policy');
  }
  input().setCustomValidity('');
  choose(file('bad.exe'));
  validate();
  input().setCustomValidity('A newer application error');
  choose(file('valid.pdf'));
  validate();
  assert.equal(input().validationMessage, 'A newer application error');
});

test('disabled inputs remain inactive and required-empty native invalidity is preserved', () => {
  choose(file('bad.exe'));
  input().disabled = true;
  validate();
  assert.equal(input().validity.customError, false);
  input().disabled = false;
  const fieldset = document.createElement('fieldset');
  const control = input();
  control.parentElement.replaceWith(fieldset);
  fieldset.append(document.createElement('label'));
  fieldset.firstElementChild.append(control);
  fieldset.disabled = true;
  validate();
  assert.equal(input().validity.customError, false);
  fieldset.disabled = false;
  choose();
  input().required = true;
  validate();
  assert.equal(input().validity.valueMissing, true);
  assert.equal(input().validity.customError, false);
});

test('type feedback is real accessible text and recovery preserves authored descriptions', () => {
  choose(file('bad.exe'));
  validate();
  const error = document.querySelector('[data-error]');
  assert.equal(input().getAttribute('aria-invalid'), 'true');
  assert.equal(input().classList.contains('invalid'), true);
  assert.equal(error.hidden, false);
  assert.equal(error.textContent, 'Choose PDF or PNG files.');
  assert.ok(error.id);
  assert.equal(input().getAttribute('aria-describedby'), `hint ${error.id}`);
  validate();
  assert.equal(input().getAttribute('aria-describedby'), `hint ${error.id}`);
  choose(file('good.pdf'));
  validate();
  assert.equal(error.hidden, true);
  assert.equal(error.textContent, '');
  assert.equal(input().hasAttribute('aria-invalid'), false);
});

test('a native file event pair reports one noncancelable rejection with independent snapshots', () => {
  const selected = choose(file('good.pdf'), file('bad.exe'));
  const zone = document.querySelector('.drop-zone');
  const seen = [];
  zone.addEventListener('expressive:reject', (event) => {
    seen.push(event);
    assert.equal(event.target, zone);
    assert.equal(event.bubbles && event.composed, true);
    assert.equal(event.cancelable, false);
    assert.equal(event.detail.input, input());
    assert.deepEqual(event.detail.files, selected);
    assert.deepEqual(event.detail.rejected, [selected[1]]);
    assert.equal(event.detail.reason, 'type');
    event.detail.files.length = 0;
  });
  input().dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  input().dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(seen.length, 1);
  assert.equal(input().files, selected);
  assert.equal(document.querySelectorAll('.drop-zone-files > li').length, 2);
  validate();
  assert.equal(seen.length, 1);
});

test('a rejection listener can replace the selection without an older update overwriting it', () => {
  const zone = document.querySelector('.drop-zone');
  let calls = 0;
  zone.addEventListener('expressive:reject', () => {
    calls++;
    choose(file('new.pdf'));
    input().dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  });
  choose(file('bad.exe'));
  input().dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  assert.equal(calls, 1);
  assert.equal(input().validity.valid, true);
  assert.equal(document.querySelector('[data-error]').hidden, true);
  assert.match(document.querySelector('.drop-zone-files').textContent, /^new.pdf/);
});

test('canceled reset preserves rejection and successful reset clears only owned state', async () => {
  const selected = choose(file('bad.exe'));
  const form = document.getElementById('upload');
  const zone = document.querySelector('.drop-zone');
  const error = document.querySelector('[data-error]');
  let events = 0;
  zone.addEventListener('expressive:reject', () => events++);
  input().dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  zone.classList.add('dragover');
  form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
  form.reset();
  await settleReset(0);
  assert.equal(input().files, selected);
  assert.equal(input().validity.customError, true);
  assert.equal(error.hidden, false);
  assert.equal(zone.classList.contains('dragover'), true);
  assert.equal(document.querySelectorAll('.drop-zone-files > li').length, 1);
  choose();
  form.reset();
  await settleReset(0);
  assert.equal(input().validity.customError, false);
  assert.equal(error.hidden, true);
  assert.equal(zone.classList.contains('dragover'), false);
  assert.equal(document.querySelectorAll('.drop-zone-files > li').length, 0);
  assert.equal(events, 1);
});

test('successful reset preserves application custom validity', async () => {
  input().setCustomValidity('Application policy');
  choose(file('bad.exe'));
  input().dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  choose();
  document.getElementById('upload').reset();
  await settleReset(0);
  assert.equal(input().validationMessage, 'Application policy');
  assert.equal(input().getAttribute('aria-invalid'), 'true');
  assert.equal(document.querySelector('[data-error]').textContent, 'Application policy');
});

test('a handled shadow-root file input recovers on its native form reset', async () => {
  document.body.innerHTML = '<div id="host"></div>';
  const root = document.getElementById('host').attachShadow({ mode: 'open' });
  root.innerHTML = markup;
  const control = root.getElementById('files');
  Object.defineProperty(control, 'files', { configurable: true, value: [file('bad.exe')] });
  control.dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  assert.equal(control.validity.customError, true);
  assert.equal(root.querySelector('[data-error]').hidden, false);
  Object.defineProperty(control, 'files', { value: [] });
  root.querySelector('form').reset();
  await settleReset(0);
  assert.equal(control.validity.customError, false);
  assert.equal(root.querySelector('[data-error]').hidden, true);
});

test('unmarked drop-zone files keep existing generic validate behavior', () => {
  input().removeAttribute('data-validate-types');
  input().classList.add('validate');
  input().setCustomValidity('Application policy');
  choose(file('anything.exe'));
  input().dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(input().getAttribute('aria-invalid'), 'true');
  assert.equal(input().classList.contains('invalid'), true);
  assert.equal(document.querySelector('[data-error]').hidden, true);
});

test('independent zones, fallback messages and changed selections keep their own rejection state', () => {
  const original = input();
  const other = document.querySelector('.drop-zone').cloneNode(true);
  other.querySelector('input').id = 'other-files';
  document.getElementById('upload').append(other);
  choose(file('bad.exe'));
  let events = 0;
  document.querySelector('.drop-zone').addEventListener('expressive:reject', () => events++);
  const dispatch = () => original.dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  dispatch();
  assert.equal(other.querySelector('input').validity.valid, true);
  assert.equal(other.querySelector('[data-error]').hidden, true);
  choose(file('good.pdf'));
  dispatch();
  choose(file('another.exe'));
  dispatch();
  assert.equal(events, 2);
  document.querySelector('.drop-zone > [data-error]').setAttribute('data-error', '');
  validate();
  assert.equal(input().validationMessage, 'Choose files matching: .pdf,.png.');
});

test('disabled owned validity stays inactive until an explicit validation after enabling', async () => {
  choose(file('bad.exe'));
  validate();
  input().disabled = true;
  input().setCustomValidity('Application changed this while disabled');
  document.getElementById('upload').reset();
  await settleReset(0);
  assert.equal(input().validity.customError, true);
  choose();
  input().disabled = false;
  validate();
  assert.equal(input().validationMessage, 'Application changed this while disabled');
});

test('an outer zone without its own list leaves a nested zone untouched', () => {
  const outer = document.querySelector('.drop-zone');
  const inner = outer.cloneNode(true);
  inner.querySelector('input').id = 'inner-files';
  outer.querySelector('.drop-zone-files').remove();
  outer.append(inner);
  choose(file('bad.exe'));
  input().dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  assert.equal(inner.querySelectorAll('.drop-zone-files > li').length, 0);
  assert.equal(inner.querySelector('[data-error]').hidden, true);
  assert.equal(inner.querySelector('input').validity.valid, true);
});

test('older deferred reset cleanup leaves a newer file selection intact', async () => {
  choose(file('old.exe'));
  input().dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  document.getElementById('upload').reset();
  const newer = choose(file('new-after-reset.exe'));
  input().dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  await settleReset(0);
  assert.equal(input().files, newer);
  assert.equal(input().validity.customError, true);
  assert.equal(document.querySelector('[data-error]').hidden, false);
  assert.match(document.querySelector('.drop-zone-files').textContent, /^new-after-reset.exe/);
});

test('native form-associated controls outside the form recover their owned state on reset', async () => {
  const form = document.getElementById('upload');
  const zone = document.querySelector('.drop-zone');
  input().setAttribute('form', form.id);
  form.after(zone);
  assert.equal(input().form, form);
  choose(file('bad.exe'));
  input().dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  choose();
  form.reset();
  await settleReset(0);
  assert.equal(input().validity.customError, false);
  assert.equal(document.querySelector('[data-error]').hidden, true);
  assert.equal(document.querySelectorAll('.drop-zone-files > li').length, 0);
  input().setCustomValidity('Application policy');
  form.reset();
  await settleReset(0);
  assert.equal(input().validationMessage, 'Application policy');
});

const sizedFile = (name, bytes) => new window.File([new Uint8Array(bytes)], name);

const sizeLimit = (value = '1024') => {
  input().removeAttribute('data-validate-types');
  input().setAttribute('data-max-size', value);
};

test('size-only validation accepts exact-limit files and leaves accept as a picker hint', () => {
  sizeLimit();
  document.querySelector('.drop-zone-files').remove();
  for (const bytes of [0, 1023, 1024, 1025]) {
    choose(sizedFile('program.exe', bytes));
    validate();
    assert.equal(input().validity.valid, bytes <= 1024, `${bytes} bytes`);
  }
  assert.match(input().validationMessage, /1024/);
});

test('size limits use trimmed positive decimal safe-integer bytes and ignore malformed hints', () => {
  sizeLimit();
  choose(sizedFile('large.pdf', 1025));
  for (const value of ['', '0', '-1', '1.5', '1e3', '0x400', '+1024', 'no limit', 'Infinity', '9007199254740992']) {
    input().setAttribute('data-max-size', value);
    validate();
    assert.equal(input().validity.valid, true, value);
  }
  input().setAttribute('data-max-size', ' 001024 ');
  validate();
  assert.equal(input().validity.customError, true);
  input().setAttribute('data-max-size', '9007199254740991');
  validate();
  assert.equal(input().validity.valid, true);
});

test('one oversized file invalidates the complete retained list with separate accessible size feedback', () => {
  sizeLimit();
  const selected = choose(sizedFile('exact.pdf', 1024), sizedFile('<img src=x>.pdf', 1025));
  const error = document.querySelector('[data-error]');
  validate();
  assert.equal(input().validity.customError, true);
  assert.match(input().validationMessage, /1024/);
  assert.notEqual(input().validationMessage, error.getAttribute('data-error'));
  assert.equal(document.getElementById('upload').checkValidity(), false);
  assert.equal(input().files, selected);
  assert.equal(error.textContent, input().validationMessage);
  assert.equal(error.hidden, false);
  assert.equal(input().getAttribute('aria-invalid'), 'true');
  assert.equal(input().getAttribute('aria-describedby'), `hint ${error.id}`);
  error.setAttribute('data-error-size', 'Chaque fichier doit faire 1 Ko au maximum.');
  validate();
  assert.equal(input().validationMessage, 'Chaque fichier doit faire 1 Ko au maximum.');
  assert.equal(input().getAttribute('aria-describedby'), `hint ${error.id}`);
  Expressive.Forms.listDropZoneFiles(document.querySelector('.drop-zone'), input());
  assert.equal(document.querySelectorAll('.drop-zone-files > li').length, 2);
  assert.equal(document.querySelector('.drop-zone-files img'), null);
});

test('type errors take precedence over size errors without enabling type checks for size-only zones', () => {
  input().setAttribute('data-max-size', '4');
  choose(sizedFile('bad.exe', 8));
  validate();
  assert.equal(input().validationMessage, 'Choose PDF or PNG files.');
  choose(sizedFile('large.pdf', 8));
  validate();
  assert.match(input().validationMessage, /4/);
  sizeLimit('4');
  choose(sizedFile('small.exe', 4));
  validate();
  assert.equal(input().validity.valid, true);
});

test('size recovery clears only owned validity and keeps required and application errors effective', () => {
  sizeLimit('4');
  choose(sizedFile('large.pdf', 8));
  validate();
  assert.equal(input().validity.customError, true);
  for (const files of [[sizedFile('exact.pdf', 4)], []]) {
    choose(...files);
    validate();
    assert.equal(input().validity.valid, true);
  }
  choose(sizedFile('large.pdf', 8));
  validate();
  input().removeAttribute('data-max-size');
  validate();
  assert.equal(input().validity.valid, true);
  sizeLimit('4');
  input().setCustomValidity('Application policy');
  for (const files of [[sizedFile('large.pdf', 8)], [sizedFile('small.pdf', 4)], []]) {
    choose(...files);
    validate();
    assert.equal(input().validationMessage, 'Application policy');
  }
  input().setCustomValidity('');
  input().required = true;
  validate();
  assert.equal(input().validity.valueMissing, true);
  assert.equal(input().validity.customError, false);
});
