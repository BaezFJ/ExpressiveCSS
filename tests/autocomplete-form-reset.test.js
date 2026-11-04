// Autocomplete after a form reset: the selection goes back to where it started,
// matching the text the browser restores.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

beforeEach(resetBody);

const data = [{ id: 1, text: 'one' }, { id: 2, text: 'two' }];

function start(options, value = '') {
  document.body.innerHTML = `<form><div class="field"><input id="query" value="${value}"></div></form>`;
  const input = document.getElementById('query');
  return { input, form: input.form, picker: Expressive.Autocomplete.init(input, { data, ...options }) };
}

const reset = async (form) => {
  form.reset();
  await new Promise((resolve) => setTimeout(resolve));
};
const ids = (picker) => picker.selectedValues.map((entry) => entry.id);

test('a reset clears a selection made after the start', async () => {
  const { input, form, picker } = start();
  try {
    picker.selectOption(1);
    assert.equal(input.value, 'one');
    await reset(form);
    assert.equal(input.value, '');
    assert.deepEqual(ids(picker), []);
  } finally {
    picker.destroy();
  }
});

test('a reset restores the selection the field started with, and its text', async () => {
  const { input, form, picker } = start({ selected: [2] });
  try {
    assert.equal(input.value, 'two');
    picker.selectOption(1);
    await reset(form);
    assert.deepEqual(ids(picker), [2]);
    assert.equal(input.value, 'two');
  } finally {
    picker.destroy();
  }
});

test('a reset restores a selection the input\'s value made', async () => {
  const { input, form, picker } = start({}, '2');
  try {
    assert.equal(input.value, 'two');
    picker.selectOption(1);
    await reset(form);
    assert.deepEqual(ids(picker), [2]);
    assert.equal(input.value, 'two');
  } finally {
    picker.destroy();
  }
});

test('a reset restores a multiple selection and its count', async () => {
  const { form, picker, input } = start({ isMultiSelect: true, selected: [1] });
  try {
    picker.selectOption(2);
    assert.deepEqual(ids(picker), [1, 2]);
    await reset(form);
    assert.deepEqual(ids(picker), [1]);
    assert.equal(input.parentElement.querySelector('.status-info').textContent, '1');
    picker.selectOption(2);
    assert.deepEqual(ids(picker), [1, 2]);
    await reset(form);
    assert.deepEqual(ids(picker), [1], 'selecting again did not change the starting selection');
  } finally {
    picker.destroy();
  }
});

test('a reset fires no change and cancels a search that is waiting', async () => {
  const searches = [];
  const { input, form, picker } = start({ minLength: 1, searchDelay: 10, onSearch: (text) => searches.push(text) });
  try {
    const changes = [];
    input.addEventListener('change', () => changes.push('change'));
    picker.selectOption(1);
    input.value = 'tw';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    // Selecting and then editing the text each fired their own change.
    changes.length = 0;
    await reset(form);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.deepEqual(changes, []);
    assert.deepEqual(searches, []);
    assert.equal(picker.isOpen, false);
  } finally {
    picker.destroy();
  }
});

test('a reset the page cancels keeps the selection', async () => {
  const { input, form, picker } = start();
  try {
    picker.selectOption(1);
    form.addEventListener('reset', (e) => e.preventDefault());
    await reset(form);
    assert.equal(input.value, 'one');
    assert.deepEqual(ids(picker), [1]);
  } finally {
    picker.destroy();
  }
});
