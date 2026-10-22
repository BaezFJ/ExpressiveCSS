// Chips in a form, the parts jsdom can run: pasting a list adds a chip per
// value. Form values, reset and validity come from a form-associated custom
// element, which jsdom lacks; chips-form-browser.test.js covers them.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody, window } from './setup.js';

const FORM = '<form><div class="chips"><input name="tags"></div></form>';
const paste = (input, text) => {
  const event = new window.Event('paste', { bubbles: true, cancelable: true });
  event.clipboardData = { getData: () => text };
  input.dispatchEvent(event);
  return event.defaultPrevented;
};

beforeEach(resetBody);

test('pasting a list adds a chip for each value, and one value pastes as text', () => {
  document.body.innerHTML = FORM;
  const chips = Expressive.Chips.init(document.querySelector('.chips'), { allowUserInput: true, limit: 3 });
  try {
    assert.equal(paste(chips._input, 'red, green\nblue\tcyan'), true);
    assert.deepEqual(chips.getData().map((chip) => chip.id), ['red', 'green', 'blue'], 'the limit still holds');
    assert.equal(paste(chips._input, 'yellow'), false);
  } finally {
    chips.destroy();
  }
});

test('an autocomplete-only field does not split a paste into chips', () => {
  document.body.innerHTML = FORM;
  const chips = Expressive.Chips.init(document.querySelector('.chips'), {
    allowUserInput: true,
    autocompleteOnly: true,
    autocompleteOptions: { data: [{ id: 'red' }] }
  });
  try {
    assert.equal(paste(chips._input, 'red, green'), false);
    assert.equal(chips.getData().length, 0);
  } finally {
    chips.destroy();
  }
});

test('a paste stops once an add callback destroys the field', () => {
  document.body.innerHTML = FORM;
  const el = document.querySelector('.chips');
  let chips;
  chips = Expressive.Chips.init(el, { allowUserInput: true, onChipAdd: () => chips.destroy() });
  paste(chips._input, 'red, blue');
  assert.equal(el.querySelectorAll('.chip').length, 0, 'no chip is left behind by the destroyed instance');
});

test('without form-associated custom elements a named input keeps its name and required', () => {
  document.body.innerHTML = '<form><div class="chips"><input name="tags" required></div></form>';
  const chips = Expressive.Chips.init(document.querySelector('.chips'), { allowUserInput: true, data: [{ id: 'red' }] });
  const input = chips._input;
  try {
    assert.equal(document.querySelector('expressive-chips-control'), null);
    assert.deepEqual([input.getAttribute('name'), input.required], ['tags', true]);
    chips.addChip({ id: 'blue' });
    document.querySelector('form').reset();
    assert.deepEqual(chips.getData().map((chip) => chip.id), ['red', 'blue'], 'no reset without the control');
  } finally {
    chips.destroy();
  }
  assert.deepEqual([input.getAttribute('name'), input.required], ['tags', true]);
});

test('AutoInit leaves named filter-chip checkboxes to submit natively', () => {
  document.body.innerHTML = '<form><div class="chips"><input type="checkbox" class="chip-input" id="c1" name="size" value="s" checked><label class="chip" for="c1">S</label></div></form>';
  Expressive.AutoInit();
  const el = document.querySelector('.chips');
  try {
    assert.equal(document.getElementById('c1').getAttribute('name'), 'size');
    assert.deepEqual(new window.FormData(document.querySelector('form')).getAll('size'), ['s']);
  } finally {
    Expressive.Chips.getInstance(el)?.destroy();
  }
});
