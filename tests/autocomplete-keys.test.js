// Autocomplete's arrow keys: a plain arrow works the list, and one held with
// Alt, Ctrl or Meta stays the browser's.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

beforeEach(resetBody);

function start() {
  document.body.innerHTML = '<div class="field"><input id="query"></div>';
  const input = document.getElementById('query');
  const picker = Expressive.Autocomplete.init(input, { minLength: 0, data: [{ id: 1, text: 'one' }, { id: 2, text: 'two' }] });
  return { input, picker };
}

const press = (input, init) => {
  const event = new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  input.dispatchEvent(event);
  return event.defaultPrevented;
};

test('an arrow with Alt, Ctrl or Meta neither opens the list nor moves through it', async () => {
  const { input, picker } = start();
  try {
    for (const key of ['ArrowDown', 'ArrowUp']) {
      for (const modifier of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }]) {
        assert.equal(press(input, { key, ...modifier }), false, key);
      }
    }
    await new Promise((resolve) => setTimeout(resolve));
    assert.equal(picker.menu.isOpen, false, 'the list did not open');
    assert.equal(picker.activeIndex, -1);

    picker.open();
    assert.equal(press(input, { key: 'ArrowDown' }), true, 'a plain arrow works the list');
    assert.equal(picker.activeIndex, 0);
    assert.equal(press(input, { key: 'ArrowDown', altKey: true }), false);
    assert.equal(picker.activeIndex, 0, 'and a held one does not move it');
  } finally {
    picker.destroy();
  }
});

test('selectOption matches an id as written, so 01 is not 1', () => {
  const { picker } = start();
  try {
    picker.selectOption('01');
    assert.deepEqual(picker.selectedValues, [], '01 is not an entry');
    picker.selectOption('1');
    assert.equal(picker.selectedValues[0]?.id, 1, 'the row attribute is a string, so 1 and "1" stay equal');
  } finally {
    picker.destroy();
  }
});
