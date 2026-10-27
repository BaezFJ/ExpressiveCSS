import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
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
