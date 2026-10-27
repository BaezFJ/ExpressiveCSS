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

test('size rejection snapshots deduplicate native pairs and track effective constraint changes', () => {
  sizeLimit('4');
  const selected = choose(sizedFile('small.pdf', 4), sizedFile('large.pdf', 8));
  const seen = [];
  document.querySelector('.drop-zone').addEventListener('expressive:reject', event => {
    seen.push({ reason: event.detail.reason, files: event.detail.files.slice(), rejected: event.detail.rejected.slice() });
    assert.equal(event.bubbles && event.composed, true);
    assert.equal(event.cancelable, false);
    assert.equal(event.detail.input, input());
    event.detail.files.length = 0;
    event.detail.rejected.length = 0;
  });
  const emit = () => input().dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  emit();
  input().dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(seen.length, 1);
  assert.deepEqual(seen[0], { reason: 'size', files: selected, rejected: [selected[1]] });
  input().setAttribute('data-max-size', '3');
  emit();
  assert.equal(seen.length, 2);
  assert.deepEqual(seen[1].rejected, selected);
  input().setAttribute('data-max-size', ' 003 ');
  emit();
  assert.equal(seen.length, 2);
  input().setAttribute('data-validate-types', '');
  emit();
  assert.equal(seen.length, 3);
  input().accept = '.png';
  emit();
  assert.equal(seen.length, 4);
  assert.equal(seen[3].reason, 'type');
  validate();
  assert.equal(seen.length, 4);
  assert.equal(input().files, selected);
});

test('a size rejection listener can replace the selection without stale validity or feedback', () => {
  sizeLimit('4');
  let calls = 0;
  document.querySelector('.drop-zone').addEventListener('expressive:reject', event => {
    assert.equal(event.detail.reason, 'size');
    calls++;
    choose(sizedFile('new.pdf', 4));
    input().dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  });
  choose(sizedFile('old.pdf', 8));
  input().dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  assert.equal(calls, 1);
  assert.equal(input().validity.valid, true);
  assert.equal(document.querySelector('[data-error]').hidden, true);
  assert.match(document.querySelector('.drop-zone-files').textContent, /^new.pdf/);
});

test('size reset honors cancellation, external form ownership and newer selections', async () => {
  sizeLimit('4');
  const form = document.getElementById('upload');
  const zone = document.querySelector('.drop-zone');
  form.after(zone);
  input().setAttribute('form', form.id);
  let events = 0;
  zone.addEventListener('expressive:reject', () => events++);
  const emit = () => input().dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  choose(sizedFile('large.pdf', 8));
  emit();
  zone.classList.add('dragover');
  form.addEventListener('reset', event => event.preventDefault(), { once: true });
  form.reset();
  await settleReset(0);
  assert.equal(input().validity.customError, true);
  assert.equal(zone.classList.contains('dragover'), true);
  assert.equal(document.querySelector('[data-error]').hidden, false);
  form.reset();
  choose(sizedFile('new.pdf', 8));
  emit();
  await settleReset(0);
  assert.equal(input().validity.customError, true);
  assert.match(zone.querySelector('.drop-zone-files').textContent, /^new.pdf/);
  choose();
  form.reset();
  await settleReset(0);
  assert.equal(input().validity.valid, true);
  assert.equal(zone.classList.contains('dragover'), false);
  assert.equal(document.querySelector('[data-error]').hidden, true);
  assert.equal(events, 2);
  input().setCustomValidity('Application policy');
  form.reset();
  await settleReset(0);
  assert.equal(input().validationMessage, 'Application policy');
});

test('size validation skips disabled controls and refresh preserves unreadable application validity', async () => {
  sizeLimit('4');
  choose(sizedFile('large.pdf', 8));
  const fieldset = document.createElement('fieldset');
  const label = input().parentElement;
  label.before(fieldset);
  fieldset.append(label);
  fieldset.disabled = true;
  validate();
  assert.equal(input().validity.customError, false);
  fieldset.disabled = false;
  validate();
  assert.equal(input().validity.customError, true);
  input().disabled = true;
  input().setCustomValidity('Application while disabled');
  choose();
  document.getElementById('upload').reset();
  await settleReset(0);
  input().disabled = false;
  validate();
  assert.equal(input().validationMessage, 'Application while disabled');
});

const countLimit = (value = '2') => {
  input().removeAttribute('data-validate-types');
  input().removeAttribute('data-max-size');
  input().setAttribute('data-max-files', value);
};

test('count-only validation accepts the exact count without requiring a list or changing multiple', () => {
  countLimit();
  input().multiple = false;
  document.querySelector('.drop-zone-files').remove();
  const files = Array.from({ length: 3 }, () => sizedFile('same.exe', 4));
  for (const count of [0, 1, 2, 3]) {
    choose(...files.slice(0, count));
    validate();
    assert.equal(input().validity.valid, count <= 2, `${count} file entries`);
    assert.equal(input().multiple, false);
  }
  assert.match(input().validationMessage, /2/);
});

test('count limits share strict positive decimal parsing and ignore inactive hints', () => {
  countLimit();
  choose(...Array.from({ length: 3 }, () => sizedFile('same.pdf', 4)));
  for (const value of ['', '0', '-1', '1.5', '2e0', '0x2', '+2', 'no limit', 'Infinity', '9007199254740992']) {
    input().setAttribute('data-max-files', value);
    validate();
    assert.equal(input().validity.valid, true, value);
  }
  input().setAttribute('data-max-files', ' 002 ');
  validate();
  assert.equal(input().validity.customError, true);
  input().setAttribute('data-max-files', '9007199254740991');
  validate();
  assert.equal(input().validity.valid, true);
  input().removeAttribute('data-max-files');
  validate();
  assert.equal(input().validity.valid, true);
});

test('count failure retains every file and safely lists it with separate accessible feedback', () => {
  countLimit();
  const selected = choose(sizedFile('same.pdf', 4), sizedFile('same.pdf', 4), sizedFile('<img src=x>.pdf', 4));
  const error = document.querySelector('[data-error]');
  validate();
  assert.equal(input().validity.customError, true);
  assert.match(input().validationMessage, /2/);
  assert.notEqual(input().validationMessage, error.getAttribute('data-error'));
  assert.equal(document.getElementById('upload').checkValidity(), false);
  assert.equal(input().files, selected);
  assert.equal(error.textContent, input().validationMessage);
  assert.equal(error.hidden, false);
  assert.equal(input().getAttribute('aria-invalid'), 'true');
  assert.equal(input().getAttribute('aria-describedby'), `hint ${error.id}`);
  error.setAttribute('data-error-count', 'Choisissez au plus deux fichiers.');
  validate();
  assert.equal(input().validationMessage, 'Choisissez au plus deux fichiers.');
  assert.equal(input().getAttribute('aria-describedby'), `hint ${error.id}`);
  Expressive.Forms.listDropZoneFiles(document.querySelector('.drop-zone'), input());
  assert.equal(document.querySelectorAll('.drop-zone-files > li').length, 3);
  assert.equal(document.querySelector('.drop-zone-files img'), null);
});

test('combined file rules preserve type then size then count precedence', () => {
  input().setAttribute('data-max-size', '4');
  input().setAttribute('data-max-files', '2');
  choose(sizedFile('bad.exe', 8), sizedFile('one.pdf', 8), sizedFile('two.pdf', 8));
  validate();
  assert.equal(input().validationMessage, 'Choose PDF or PNG files.');
  choose(...Array.from({ length: 3 }, () => sizedFile('same.pdf', 8)));
  validate();
  assert.match(input().validationMessage, /size.*4/);
  choose(...Array.from({ length: 3 }, () => sizedFile('same.pdf', 4)));
  validate();
  assert.match(input().validationMessage, /count.*2/);
  choose(sizedFile('one.pdf', 4), sizedFile('two.pdf', 4));
  validate();
  assert.equal(input().validity.valid, true);
});

test('count recovery releases only owned errors and preserves application and required constraints', () => {
  countLimit();
  const files = Array.from({ length: 3 }, () => sizedFile('same.pdf', 4));
  input().setCustomValidity('Application policy');
  for (const count of [3, 2, 0]) {
    choose(...files.slice(0, count));
    validate();
    assert.equal(input().validationMessage, 'Application policy');
  }
  input().setCustomValidity('');
  choose(...files);
  validate();
  assert.equal(input().validity.customError, true);
  input().setCustomValidity('A replacement application error');
  choose(...files.slice(0, 2));
  validate();
  assert.equal(input().validationMessage, 'A replacement application error');
  input().setCustomValidity('');
  choose(...files);
  validate();
  input().setAttribute('data-max-files', '0');
  validate();
  assert.equal(input().validity.valid, true);
  countLimit();
  validate();
  assert.equal(input().validity.customError, true);
  input().removeAttribute('data-max-files');
  validate();
  assert.equal(input().validity.valid, true);
  countLimit();
  choose();
  input().required = true;
  validate();
  assert.equal(input().validity.valueMissing, true);
  assert.equal(input().validity.customError, false);
});

test('count rejection snapshots contain all chosen files independently and track effective count changes', () => {
  countLimit();
  const selected = choose(...Array.from({ length: 3 }, () => sizedFile('same.pdf', 4)));
  const seen = [];
  document.querySelector('.drop-zone').addEventListener('expressive:reject', event => {
    assert.equal(event.detail.reason, 'count');
    assert.equal(event.detail.input, input());
    assert.equal(event.bubbles && event.composed, true);
    assert.equal(event.cancelable, false);
    assert.notEqual(event.detail.files, event.detail.rejected);
    assert.notEqual(event.detail.files, selected);
    assert.deepEqual(event.detail.files, selected);
    assert.deepEqual(event.detail.rejected, selected);
    event.detail.files.pop();
    assert.equal(event.detail.rejected.length, 3);
    event.detail.rejected.shift();
    assert.equal(input().files.length, 3);
    seen.push(event);
  });
  const emit = () => input().dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  emit();
  input().dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(seen.length, 1);
  input().setAttribute('data-max-files', '1');
  emit();
  assert.equal(seen.length, 2);
  input().setAttribute('data-max-files', ' 001 ');
  emit();
  assert.equal(seen.length, 2);
  input().setAttribute('data-max-files', '3');
  emit();
  assert.equal(input().validity.valid, true);
  input().setAttribute('data-max-files', '2');
  emit();
  assert.equal(seen.length, 3);
  validate();
  assert.equal(seen.length, 3);
});

test('a count rejection listener can replace the selection without stale list or validity writes', () => {
  countLimit();
  let calls = 0;
  document.querySelector('.drop-zone').addEventListener('expressive:reject', event => {
    assert.equal(event.detail.reason, 'count');
    calls++;
    choose(sizedFile('new-one.pdf', 4), sizedFile('new-two.pdf', 4));
    input().dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  });
  choose(...Array.from({ length: 3 }, () => sizedFile('old.pdf', 4)));
  input().dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  assert.equal(calls, 1);
  assert.equal(input().validity.valid, true);
  assert.equal(document.querySelector('[data-error]').hidden, true);
  assert.equal(document.querySelectorAll('.drop-zone-files > li').length, 2);
  assert.match(document.querySelector('.drop-zone-files').textContent, /^new-one.pdf/);
});

test('count reset honors cancellation, external form ownership and newer selections', async () => {
  countLimit();
  const form = document.getElementById('upload');
  const zone = document.querySelector('.drop-zone');
  form.after(zone);
  input().setAttribute('form', form.id);
  let events = 0;
  zone.addEventListener('expressive:reject', () => events++);
  const emit = () => input().dispatchEvent(new window.Event('input', { bubbles: true, composed: true }));
  choose(...Array.from({ length: 3 }, () => sizedFile('old.pdf', 4)));
  emit();
  zone.classList.add('dragover');
  form.addEventListener('reset', event => event.preventDefault(), { once: true });
  form.reset();
  await settleReset(0);
  assert.equal(input().validity.customError, true);
  assert.equal(document.querySelector('[data-error]').hidden, false);
  assert.equal(zone.classList.contains('dragover'), true);
  form.reset();
  choose(...Array.from({ length: 3 }, () => sizedFile('new.pdf', 4)));
  emit();
  await settleReset(0);
  assert.equal(input().validity.customError, true);
  assert.match(zone.querySelector('.drop-zone-files').textContent, /^new.pdf/);
  choose();
  form.reset();
  await settleReset(0);
  assert.equal(input().validity.valid, true);
  assert.equal(document.querySelector('[data-error]').hidden, true);
  assert.equal(zone.classList.contains('dragover'), false);
  assert.equal(events, 2);
  input().setCustomValidity('Application policy');
  form.reset();
  await settleReset(0);
  assert.equal(input().validationMessage, 'Application policy');
});

test('count rules stay isolated and skip disabled controls without clearing application validity', async () => {
  countLimit();
  const zone = document.querySelector('.drop-zone');
  const otherZone = zone.cloneNode(true);
  const other = otherZone.querySelector('input');
  other.id = 'other-files';
  other.setAttribute('data-max-files', '1');
  zone.after(otherZone);
  Object.defineProperty(other, 'files', { configurable: true, value: [sizedFile('one.pdf', 4), sizedFile('two.pdf', 4)] });
  choose(...Array.from({ length: 3 }, () => sizedFile('same.pdf', 4)));
  const fieldset = document.createElement('fieldset');
  const label = input().parentElement;
  label.before(fieldset);
  fieldset.append(label);
  fieldset.disabled = true;
  validate();
  assert.equal(input().validity.customError, false);
  fieldset.disabled = false;
  validate();
  Expressive.Forms.validateField(other);
  assert.match(input().validationMessage, /2/);
  assert.match(other.validationMessage, /1/);
  assert.match(zone.querySelector('[data-error]').textContent, /2/);
  assert.match(otherZone.querySelector('[data-error]').textContent, /1/);
  input().disabled = true;
  input().setCustomValidity('Application while disabled');
  choose();
  document.getElementById('upload').reset();
  await settleReset(0);
  input().disabled = false;
  validate();
  assert.equal(input().validationMessage, 'Application while disabled');
});
