// Chips in a form, the parts jsdom can run: pasting a list adds a chip per
// value, and a required field is valid once it has a chip. Form values come
// from the formdata event, which jsdom lacks; chips-form-browser.test.js
// covers them.

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

test('a required field is valid with chips, not with half-typed text, and gets required back', () => {
  document.body.innerHTML = '<form><div class="chips"><input name="tags" required></div></form>';
  const form = document.querySelector('form');
  const chips = Expressive.Chips.init(document.querySelector('.chips'), { allowUserInput: true });
  const input = chips._input;
  try {
    assert.deepEqual([input.required, input.getAttribute('aria-required')], [false, 'true'], 'still announced as required');
    input.value = 'gre';
    assert.equal(form.checkValidity(), false, 'uncommitted text is not a value');
    assert.equal(input.validationMessage, 'Add at least one item.');
    chips.addChip({ id: 'red' });
    input.value = '';
    assert.equal(form.checkValidity(), true, 'a chip is, with the text empty');
    chips.deleteChip(0);
    assert.equal(form.checkValidity(), false);
  } finally {
    chips.destroy();
  }
  assert.deepEqual([input.required, input.getAttribute('name'), input.validity.customError, input.hasAttribute('aria-required')], [true, 'tags', false, false], 'destroy gives the input back as it was');
});

test('a form reset puts back the starting chips and their validity', async () => {
  document.body.innerHTML = '<form><div class="chips"><input name="tags" required></div></form>';
  const form = document.querySelector('form');
  const chips = Expressive.Chips.init(document.querySelector('.chips'), { allowUserInput: true, data: [{ id: 'red' }] });
  try {
    chips.deleteChip(0);
    chips.addChip({ id: 'blue' });
    chips.deleteChip(0);
    assert.equal(form.checkValidity(), false);
    form.reset();
    assert.deepEqual(chips.getData().map((chip) => chip.id), ['red'], 'reading the chips applies the reset');
    assert.deepEqual([...document.querySelectorAll('.chip')].map((chip) => chip.firstChild.textContent), ['red']);
    assert.equal(form.checkValidity(), true);
    chips.addChip({ id: 'new' });
    await Promise.resolve();
    assert.deepEqual(chips.getData().map((chip) => chip.id), ['red', 'new'], 'a chip added after reset() stays');

    form.addEventListener('reset', (e) => e.preventDefault(), { once: true });
    form.reset();
    assert.deepEqual(chips.getData().map((chip) => chip.id), ['red', 'new'], 'a canceled reset changes nothing');
  } finally {
    chips.destroy();
  }
});

test('an optional field keeps a validity error the page set', () => {
  document.body.innerHTML = FORM;
  const input = document.querySelector('input');
  input.setCustomValidity('Pick from the list.');
  const chips = Expressive.Chips.init(document.querySelector('.chips'), { allowUserInput: true, data: [{ id: 'red' }] });
  chips.destroy();
  assert.equal(input.validationMessage, 'Pick from the list.');
});

test('a reset puts back a chip the input value started as', () => {
  document.body.innerHTML = '<form><div class="chips"><input name="tags" value="apple"></div></form>';
  const chips = Expressive.Chips.init(document.querySelector('.chips'), {
    allowUserInput: true,
    autocompleteOptions: { data: [{ id: 'apple', text: 'Apple' }] }
  });
  try {
    const start = chips.getData().map((chip) => chip.id);
    chips.deleteChip(0);
    document.querySelector('form').reset();
    assert.deepEqual(chips.getData().map((chip) => chip.id), start);
  } finally {
    chips.destroy();
  }
});

for (const where of ['document', 'window']) {
  test(`a reset canceled by a ${where} listener added later leaves the chips`, async () => {
    document.body.innerHTML = FORM;
    const chips = Expressive.Chips.init(document.querySelector('.chips'), { allowUserInput: true, data: [{ id: 'red' }] });
    const target = where === 'window' ? window : document;
    const cancel = (e) => e.preventDefault();
    target.addEventListener('reset', cancel);
    try {
      chips.addChip({ id: 'blue' });
      document.querySelector('form').reset();
      assert.deepEqual(chips.getData().map((chip) => chip.id), ['red', 'blue']);
      await Promise.resolve();
      assert.equal(document.querySelectorAll('.chip').length, 2);
    } finally {
      target.removeEventListener('reset', cancel);
      chips.destroy();
    }
  });
}

test('a detached form resets its chips and their validity', async () => {
  const form = document.createElement('form');
  form.innerHTML = '<div class="chips"><input name="tags" required></div>';
  const chips = Expressive.Chips.init(form.querySelector('.chips'), { allowUserInput: true, data: [{ id: 'red' }] });
  try {
    chips.deleteChip(0);
    assert.equal(form.checkValidity(), false);
    form.reset();
    await Promise.resolve();
    assert.equal(form.checkValidity(), true, 'once the reset is final');
    assert.deepEqual(chips.getData().map((chip) => chip.id), ['red']);
  } finally {
    chips.destroy();
  }
});

test('a reset listener that reads the chips and then cancels keeps them', () => {
  document.body.innerHTML = FORM;
  const form = document.querySelector('form');
  const chips = Expressive.Chips.init(document.querySelector('.chips'), { allowUserInput: true, data: [{ id: 'red' }] });
  try {
    chips.addChip({ id: 'blue' });
    let read;
    form.addEventListener('reset', (e) => {
      read = chips.getData().map((chip) => chip.id);
      e.preventDefault();
    }, { once: true });
    form.reset();
    assert.deepEqual(read, ['red', 'blue'], 'still dispatching, so nothing applied yet');
    assert.deepEqual(chips.getData().map((chip) => chip.id), ['red', 'blue']);
  } finally {
    chips.destroy();
  }
});

test('a required field keeps a validity error the page set, through changes and destroy', () => {
  document.body.innerHTML = '<form><div class="chips"><input name="tags" required></div></form>';
  const input = document.querySelector('input');
  input.setCustomValidity('Rejected tag');
  const chips = Expressive.Chips.init(document.querySelector('.chips'), { allowUserInput: true, data: [{ id: 'red' }] });
  try {
    assert.equal(input.validationMessage, 'Rejected tag');
    chips.deleteChip(0);
    assert.equal(input.validationMessage, 'Rejected tag', 'not replaced by the chips message');
    chips.addChip({ id: 'blue' });
    assert.equal(input.validationMessage, 'Rejected tag');
  } finally {
    chips.destroy();
  }
  assert.equal(input.validationMessage, 'Rejected tag');
});

test('a canceled reset never makes an empty required field valid, not even at once', () => {
  document.body.innerHTML = '<form><div class="chips"><input name="tags" required></div></form>';
  const form = document.querySelector('form');
  const chips = Expressive.Chips.init(document.querySelector('.chips'), { allowUserInput: true, data: [{ id: 'red' }] });
  let submitted = 0;
  form.addEventListener('submit', (e) => { submitted++; e.preventDefault(); });
  const cancel = (e) => e.preventDefault();
  document.addEventListener('reset', cancel);
  try {
    chips.deleteChip(0);
    form.reset();
    assert.equal(form.checkValidity(), false);
    form.requestSubmit();
    assert.equal(submitted, 0);
  } finally {
    document.removeEventListener('reset', cancel);
    chips.destroy();
  }
});

test('chips added while the input is disabled leave it valid once enabled', () => {
  document.body.innerHTML = '<form><div class="chips"><input name="tags" required></div></form>';
  const form = document.querySelector('form');
  const chips = Expressive.Chips.init(document.querySelector('.chips'), { allowUserInput: true });
  try {
    chips._input.disabled = true;
    chips.addChip({ id: 'red' });
    chips._input.disabled = false;
    assert.equal(form.checkValidity(), true);
  } finally {
    chips.destroy();
  }
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

test('an error the page sets after setup survives an added chip, a reset and destroy', async () => {
  document.body.innerHTML = '<form><div class="chips"><input name="tags" required></div></form>';
  const form = document.querySelector('form');
  const input = document.querySelector('input');
  const chips = Expressive.Chips.init(document.querySelector('.chips'), { allowUserInput: true });
  try {
    input.setCustomValidity('Rejected tag');
    chips.addChip({ id: 'red' });
    assert.equal(input.validationMessage, 'Rejected tag');
    form.reset();
    await Promise.resolve();
    assert.equal(input.validationMessage, 'Rejected tag');
  } finally {
    chips.destroy();
  }
  assert.equal(input.validationMessage, 'Rejected tag');
});

test('an empty required field stays invalid when the page clears its own error on input', () => {
  document.body.innerHTML = '<form><div class="chips"><input name="tags" required></div></form>';
  const form = document.querySelector('form');
  const input = document.querySelector('input');
  input.setCustomValidity('Rejected tag');
  input.addEventListener('input', () => input.setCustomValidity(''));
  let submitted = 0;
  form.addEventListener('submit', (e) => { submitted++; e.preventDefault(); });
  const chips = Expressive.Chips.init(document.querySelector('.chips'), { allowUserInput: true });
  try {
    input.value = 'gre';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal(form.checkValidity(), false);
    form.requestSubmit();
    assert.equal(submitted, 0);
  } finally {
    chips.destroy();
  }
});
