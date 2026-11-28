import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ExpressiveExtras, resetBody, window } from './setup.js';

const detachedPad = () => {
  const pad = document.createElement('div');
  pad.className = 'keypad';
  pad.setAttribute('aria-controls', 'pin');
  pad.innerHTML = '<button type="button" value="7">7</button>';
  return pad;
};

test('a keypad initialized before insertion types once it is in the document', () => {
  resetBody();
  const pad = detachedPad();
  const keypad = ExpressiveExtras.Keypad.init(pad);
  document.body.innerHTML = '<input id="pin">';
  document.body.append(pad);
  const input = document.getElementById('pin');
  const key = pad.querySelector('button');
  try {
    key.click();
    assert.equal(input.value, '7', 'one press types one character');
    key.click();
    assert.equal(input.value, '77');
  } finally {
    keypad.destroy();
  }
  key.click();
  assert.equal(input.value, '77', 'destroy removes the listeners it added');
  resetBody();
});

test('a keypad destroyed before insertion stays inert', () => {
  resetBody();
  const pad = detachedPad();
  ExpressiveExtras.Keypad.init(pad).destroy();
  document.body.innerHTML = '<input id="pin">';
  document.body.append(pad);
  pad.querySelector('button').click();
  assert.equal(document.getElementById('pin').value, '');
  resetBody();
});

test('an i18n message set to undefined keeps its default', () => {
  resetBody();
  document.body.innerHTML = '<input id="pin" minlength="3">';
  const pad = detachedPad();
  document.body.append(pad);
  const errors = [];
  const onError = (e) => errors.push(e.error);
  window.addEventListener('error', onError);
  // As when a translation table lacks the key.
  const keypad = ExpressiveExtras.Keypad.init(pad, { i18n: { tooShort: undefined } });
  try {
    pad.querySelector('button').click();
    assert.deepEqual(errors, []);
    assert.equal(document.getElementById('pin').validationMessage, 'Use at least 3 characters.');
  } finally {
    window.removeEventListener('error', onError);
    keypad.destroy();
    resetBody();
  }
});

test('Enter skips a form whose default button is busy and leaves the field alone', () => {
  resetBody();
  document.body.innerHTML = `<form id="form"><input id="pin" value="12"><button id="save" aria-busy="true">Save</button><button id="other" type="submit">Other</button></form>
    <div class="keypad" aria-controls="pin"><button type="button" data-key="Enter">Enter</button></div>`;
  const form = document.getElementById('form');
  const input = document.getElementById('pin');
  const save = document.getElementById('save');
  const counts = { submit: 0, input: 0 };
  form.addEventListener('submit', (event) => { event.preventDefault(); counts.submit++; });
  input.addEventListener('input', () => counts.input++);
  const keypad = ExpressiveExtras.Keypad.init(document.querySelector('.keypad'));
  const enter = () => document.querySelector('[data-key="Enter"]').click();
  try {
    input.focus();
    input.setSelectionRange(1, 1);
    enter();
    assert.deepEqual(counts, { submit: 0, input: 0 }, 'no submit and no edit');
    assert.equal(input.selectionStart, 1, 'the caret stays');
    save.removeAttribute('aria-busy');
    document.getElementById('other').setAttribute('aria-busy', 'true');
    enter();
    assert.equal(counts.submit, 1, 'a busy button that is not the default one does not block Enter');
  } finally {
    keypad.destroy();
    resetBody();
  }
});
