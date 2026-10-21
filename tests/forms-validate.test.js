// A .validate field tells assistive technology what its class shows: it gets
// aria-invalid with .invalid, and is described by its [data-error] text.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody, window } from './setup.js';

const change = (input) => input.dispatchEvent(new window.Event('change', { bubbles: true }));
const state = (input) => [input.classList.contains('invalid'), input.getAttribute('aria-invalid')];

beforeEach(resetBody);

test('an invalid .validate field gets aria-invalid, and loses it once valid', () => {
  document.body.innerHTML = `<div class="field">
    <input id="email" type="email" class="validate" aria-describedby="hint">
    <label for="email">Email</label>
    <small data-error="Enter a valid email">Supporting text</small>
  </div><p id="hint">We never share it.</p>`;
  const input = document.getElementById('email');
  input.value = 'nope';
  Expressive.Forms.validateField(input);
  assert.deepEqual(state(input), [true, 'true']);
  const error = document.querySelector('[data-error]');
  assert.ok(error.id, 'the error text gets an id');
  assert.equal(input.getAttribute('aria-describedby'), `hint ${error.id}`, "the page's own id stays first");

  input.value = 'me@example.com';
  Expressive.Forms.validateField(input);
  assert.deepEqual(state(input), [false, null]);
  Expressive.Forms.validateField(input);
  assert.equal(input.getAttribute('aria-describedby'), `hint ${error.id}`, 'the id is added once');
});

test('data-length and an empty optional field follow the same rules', () => {
  document.body.innerHTML = '<div class="field"><input id="code" class="validate" data-length="3"><label for="code">Code</label></div>';
  const input = document.getElementById('code');
  input.value = 'abcd';
  change(input);
  assert.deepEqual(state(input), [true, 'true']);
  input.value = '';
  change(input);
  assert.deepEqual(state(input), [false, null], 'empty and optional is not an error');
  assert.equal(input.hasAttribute('aria-describedby'), false, 'no error text, so nothing to describe it');
});

test('a field without .validate is left alone, author aria-invalid included', () => {
  document.body.innerHTML = '<div class="field"><input id="name" required aria-invalid="true"><label for="name">Name</label><small data-error="Required">Hint</small></div>';
  const input = document.getElementById('name');
  change(input);
  assert.deepEqual([input.getAttribute('aria-invalid'), input.hasAttribute('aria-describedby')], ['true', false]);
});
