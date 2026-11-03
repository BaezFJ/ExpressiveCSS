import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

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
  const keypad = Expressive.Keypad.init(pad);
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
  Expressive.Keypad.init(pad).destroy();
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
  const keypad = Expressive.Keypad.init(pad, { i18n: { tooShort: undefined } });
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
