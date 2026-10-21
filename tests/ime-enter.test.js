// The Enter that confirms an IME candidate is part of typing, not a command.
// Each field acts on a plain Enter, which the first assertion proves, and
// ignores the composing one: `isComposing` from most engines, and keyCode 229
// from Safari, which reports `isComposing` false for that Enter.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody, window } from './setup.js';

const enter = (target, init = {}) => {
  const e = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(e);
  return e.defaultPrevented;
};

const composing = [{ isComposing: true }, { keyCode: 229 }];

const fields = {
  'date picker input': () => {
    document.body.innerHTML = '<input type="text" id="f">';
    const field = document.getElementById('f');
    return { field, instance: Expressive.Datepicker.init(field) };
  },
  'time picker input': () => {
    document.body.innerHTML = '<input type="text" id="f">';
    const field = document.getElementById('f');
    return { field, instance: Expressive.Timepicker.init(field) };
  },
  'time picker digital fields': () => {
    document.body.innerHTML = '<input type="text" id="t">';
    const instance = Expressive.Timepicker.init(document.getElementById('t'));
    return { field: instance.digitalClock.querySelector('input'), instance };
  },
  'color picker hex field': () => {
    document.body.innerHTML = '<div class="color-picker" id="p"><input type="color" value="#ff0000" aria-label="Accent"></div>';
    const instance = Expressive.ColorPicker.init(document.getElementById('p'));
    return { field: document.querySelector('#p .color-picker-hex'), instance };
  },
  'autocomplete with an active option': () => {
    document.body.innerHTML = '<input type="text" id="f">';
    const field = document.getElementById('f');
    const instance = Expressive.Autocomplete.init(field, { minLength: 0, data: [{ id: 'Apple' }, { id: 'Avocado' }] });
    instance.open();
    instance.activeIndex = 0;
    return { field, instance };
  }
};

for (const [name, mount] of Object.entries(fields)) {
  for (const init of composing) {
    test(`${name}: an Enter with ${JSON.stringify(init)} confirms the composition and does nothing else`, () => {
      resetBody();
      const { field, instance } = mount();
      try {
        assert.ok(field, 'the field exists');
        assert.equal(enter(field, init), false, 'the composing Enter is left to the IME');
        assert.equal(enter(field), true, 'a plain Enter still acts');
      } finally {
        instance.destroy();
      }
    });
  }
}
