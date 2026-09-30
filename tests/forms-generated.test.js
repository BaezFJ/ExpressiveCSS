// The DOM the form components build, against the rules semantics.json states.
//
// tests/semantics.test.js checks documented markup. FormSelect, Autocomplete
// and CharacterCounter each replace or augment their control with generated
// markup that no documented example contains, so without this file their
// output is unchecked - which is how Autocomplete shipped a suggestion list
// with no roles on it at all.
//
// Rules are read out of semantics.json rather than restated, so the generated
// DOM and the documented markup are held to one standard.
//
// Every case tears down in a finally: per CLAUDE.md a test that leaves a live
// timer wedges the whole run with no output.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Expressive, resetBody, window } from './setup.js';

/** Type into an autocomplete: the menu is only built while filtering. */
function type(el, value) {
  el.value = value;
  el.dispatchEvent(new window.InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  el.dispatchEvent(new window.KeyboardEvent('keyup', { bubbles: true, key: value.slice(-1) }));
}

const key = (el, k) =>
  el.dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: k }));

const DATA = JSON.parse(readFileSync(new URL('../semantics.json', import.meta.url), 'utf8'));

function assertConforms(root, componentKey) {
  for (const rule of DATA.rows[componentKey].rules) {
    const hits = [...root.querySelectorAll(rule.selector)];
    if (rule.kind === 'forbid') {
      assert.equal(hits.length, 0, `[${rule.id}] ${rule.message}\n  ${hits[0]?.outerHTML ?? ''}`);
    } else {
      for (const el of hits) {
        const v = el.getAttribute(rule.attr);
        const ok = rule.equals ? v === rule.equals : v !== null && v !== '';
        assert.ok(ok, `[${rule.id}] ${rule.message}\n  ${el.outerHTML}`);
      }
    }
  }
}

describe('FormSelect generated listbox', () => {
  beforeEach(resetBody);

  const mount = (extra = '') => {
    document.body.innerHTML =
      `<div class="field"><select id="s" ${extra}>` +
      `<option value="" disabled selected>Choose</option>` +
      `<option value="1">One</option><option value="2">Two</option>` +
      `</select><label for="s">Pick</label></div>`;
    return Expressive.FormSelect.init(document.getElementById('s'));
  };

  test('the trigger is a combobox pointing at a listbox', () => {
    const inst = mount();
    try {
      const input = document.querySelector('input.menu-trigger');
      const menu = document.querySelector('menu');
      assert.equal(input.getAttribute('role'), 'combobox');
      assert.equal(input.getAttribute('aria-haspopup'), 'listbox');
      assert.equal(menu.getAttribute('role'), 'listbox');
      assert.equal(input.getAttribute('aria-controls'), menu.id);
    } finally {
      inst.destroy();
    }
  });

  test('native validation is shown as text on the visible field and cleared on refresh', async () => {
    const inst = mount('required aria-describedby="help" aria-invalid="false"');
    const help = document.createElement('small');
    help.id = 'help';
    help.textContent = 'Choose a number.';
    inst.wrapper.append(help);
    try {
      assert.equal(inst.el.parentElement.ariaHidden, 'true');
      assert.equal(inst.el.willValidate, true);
      const focused = document.activeElement;
      assert.equal(inst.el.reportValidity(), false);
      assert.equal(inst.input.ariaInvalid, 'true');
      // JSDOM dispatches invalid but does not implement native reporting focus.
      assert.equal(document.activeElement, focused);
      inst.el.focus();
      await Promise.resolve();
      assert.equal(document.activeElement, inst.input);
      const ids = inst.input.getAttribute('aria-describedby').split(' ');
      assert.equal(ids[0], 'help');
      const error = document.getElementById(ids[1]);
      assert.equal(error.textContent, inst.el.validationMessage);
      inst.el.setCustomValidity('<img src=x onerror=alert(1)>');
      inst.refresh();
      assert.equal(error.textContent, inst.el.validationMessage);
      assert.equal(error.children.length, 0);
      inst.el.reportValidity();
      assert.equal(inst.input.getAttribute('aria-describedby'), ids.join(' '));
      inst.el.setCustomValidity('');
      inst.el.value = '1';
      inst.refresh();
      assert.equal(error.isConnected, false);
      assert.equal(inst.input.ariaInvalid, 'false');
      assert.equal(inst.input.getAttribute('aria-describedby'), 'help');
      assert.equal(inst.el.getAttribute('aria-describedby'), 'help');
      assert.equal(inst.el.ariaInvalid, 'false');
    } finally {
      inst.destroy();
    }
    assert.equal(document.getElementById('s').hidden, false);
    assert.equal(help.textContent, 'Choose a number.');
  });

  test('validation messages and listeners are removed on reinitialization and destroy', async () => {
    const first = mount('required');
    const select = first.el;
    try {
      select.reportValidity();
      const errorId = first.input.getAttribute('aria-describedby');
      assert.ok(errorId);
      const next = Expressive.FormSelect.init(select);
      assert.equal(document.getElementById(errorId), null);
      assert.equal(next.input.getAttribute('aria-describedby'), null);
      select.reportValidity();
      assert.equal(next.wrapper.querySelectorAll('.supporting-text').length, 1);
    } finally {
      select.focus();
      Expressive.FormSelect.getInstance(select)?.destroy();
      await Promise.resolve();
    }
    const event = new window.Event('invalid', { cancelable: true });
    select.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
    select.focus();
    assert.equal(document.activeElement, select, 'destroy removes the native focus forwarding listener');
    assert.equal(document.querySelector('.supporting-text'), null);
    assert.equal(select.labels[0].htmlFor, select.id);
  });

  test('every option carries a selection state, not just the chosen one', () => {
    const inst = mount();
    try {
      const opts = [...document.querySelectorAll('li[role="option"]')];
      assert.equal(opts.length, 3);
      for (const o of opts) {
        assert.ok(
          ['true', 'false'].includes(o.getAttribute('aria-selected')),
          `option "${o.textContent.trim()}" has aria-selected=${o.getAttribute('aria-selected')}`
        );
      }
      assertConforms(document.body, 'forms/select');
    } finally {
      inst.destroy();
    }
  });
});

describe('Autocomplete generated combobox', () => {
  beforeEach(resetBody);

  const mount = () => {
    document.body.innerHTML =
      '<div class="field"><input class="autocomplete" type="text" id="ac"><label for="ac">A</label></div>';
    return Expressive.Autocomplete.init(document.getElementById('ac'), {
      data: [
        { id: 'a', text: 'Apple' },
        { id: 'b', text: 'Banana' }
      ]
    });
  };

  test('the input is a combobox wired to the suggestion list', () => {
    const inst = mount();
    try {
      inst.open();
      const el = document.getElementById('ac');
      assert.equal(el.getAttribute('role'), 'combobox');
      assert.equal(el.getAttribute('aria-autocomplete'), 'list');
      assert.equal(el.getAttribute('aria-controls'), inst.container.id);
      assert.equal(inst.container.getAttribute('role'), 'listbox');
    } finally {
      inst.destroy();
    }
  });

  test('every suggestion is an option with a selection state', () => {
    const inst = mount();
    try {
      type(document.getElementById('ac'), 'a');
      const items = [...inst.container.querySelectorAll('li')];
      assert.ok(items.length > 0, 'expected suggestions');
      for (const li of items) {
        assert.equal(li.getAttribute('role'), 'option');
        assert.equal(li.getAttribute('aria-selected'), 'false');
        assert.ok(li.id, 'an option needs an id to be referenced as active');
      }
      assertConforms(inst.container.parentElement, 'autocomplete');
    } finally {
      inst.destroy();
    }
  });

  test('arrowing reports the active entry on the input, not just as a class', () => {
    const inst = mount();
    try {
      const el = document.getElementById('ac');
      type(el, 'a');
      assert.equal(el.getAttribute('aria-activedescendant'), null);
      key(el, 'ArrowDown');
      const active = inst.container.querySelector('li.active');
      assert.ok(active, 'expected an active entry');
      assert.equal(el.getAttribute('aria-activedescendant'), active.id);
      // Highlighting is NOT selecting. aria-activedescendant reports the move;
      // aria-selected stays whatever the entry's real selection state is.
      assert.equal(active.getAttribute('aria-selected'), 'false');
    } finally {
      inst.destroy();
    }
  });

  test('a committed multi-select choice reads as selected, highlighted or not', () => {
    document.body.innerHTML =
      '<div class="field"><input class="autocomplete" type="text" id="ms"><label for="ms">A</label></div>';
    const inst = Expressive.Autocomplete.init(document.getElementById('ms'), {
      isMultiSelect: true,
      selected: ['a'],
      data: [
        { id: 'a', text: 'Apple' },
        { id: 'b', text: 'Apricot' }
      ]
    });
    try {
      const el = document.getElementById('ms');
      type(el, 'ap');
      const byId = (id) => inst.container.querySelector(`li[data-id="${id}"]`);
      // 'a' was passed in as already chosen; its checkbox is ticked, so the
      // option has to say so too. Reporting it false because it is not the
      // highlighted row is the bug this guards.
      assert.equal(byId('a').querySelector('input[type="checkbox"]').checked, true);
      assert.equal(byId('a').getAttribute('aria-selected'), 'true');
      assert.equal(byId('b').getAttribute('aria-selected'), 'false');

      // Arrowing onto 'b' must not unselect 'a'.
      key(el, 'ArrowDown');
      assert.equal(byId('a').getAttribute('aria-selected'), 'true');
    } finally {
      inst.destroy();
    }
  });

  test('open() twice before the timer fires leaves nothing behind', async () => {
    const inst = mount();
    try {
      inst.open();
      inst.open();
    } finally {
      inst.destroy();
    }
    // A second open() used to overwrite the tracked timer, so destroy()
    // cancelled only the later one and the first fired at a dead menu.
    await new Promise((r) => setTimeout(r, 10));
  });

  test('input-only edits search once and clear stale selections', () => {
    const inst = mount();
    const queries = [];
    let changes = 0;
    inst.options.onSearch = (value, autocomplete) => {
      queries.push(value);
      Expressive.Autocomplete.defaults.onSearch(value, autocomplete);
    };
    inst.options.onAutocomplete = () => changes++;
    try {
      inst.selectOption('a');
      for (const [inputType, value, ids] of [
        ['insertFromPaste', 'ap', ['a']],
        ['insertReplacementText', 'ban', ['b']],
        ['deleteByCut', '', ['a', 'b']],
      ]) {
        inst.el.value = value;
        inst.el.dispatchEvent(new window.InputEvent('input', { bubbles: true, inputType }));
        assert.equal(queries.at(-1), value);
        assert.deepEqual(inst.menuItems.map(item => item.id), ids);
        assert.deepEqual(inst.selectedValues, []);
        const changesAfterInput = changes;
        inst.el.dispatchEvent(new window.KeyboardEvent('keyup', { bubbles: true, key: 'Backspace' }));
        assert.equal(changes, changesAfterInput, 'keyup must not repeat change callbacks');
      }
      assert.deepEqual(queries, ['ap', 'ban', '']);
    } finally {
      inst.destroy();
    }
  });

  test('input listeners are removed on destroy and reinitialization', () => {
    const first = mount();
    const el = first.el;
    const queries = [];
    first.options.onSearch = value => queries.push(`old:${value}`);
    try {
      type(el, 'ap');
      Expressive.Autocomplete.init(el, { onSearch: value => queries.push(`new:${value}`) });
      type(el, 'ban');
    } finally {
      Expressive.Autocomplete.getInstance(el)?.destroy();
    }
    type(el, 'pear');
    assert.deepEqual(queries, ['old:ap', 'new:ban']);
  });

  test('Chips autocomplete accepts input-only edits before keyboard selection', () => {
    document.body.innerHTML = '<div class="chips"></div>';
    const chips = Expressive.Chips.init(document.querySelector('.chips'), {
      allowUserInput: true,
      autocompleteOptions: { data: [{ id: 'apple', text: 'Apple' }, { id: 'banana', text: 'Banana' }] },
    });
    try {
      const el = chips.el.querySelector('input');
      el.focus();
      for (const value of ['a', 'ap', 'app']) {
        el.value = value;
        el.dispatchEvent(new window.InputEvent('input', { bubbles: true, inputType: 'insertText' }));
        assert.equal(el.value, value, 'search results must preserve the query');
        assert.deepEqual(chips.chipsData, []);
      }
      assert.deepEqual([...chips.autocomplete.container.querySelectorAll('[role="option"]')].map(item => item.textContent), ['Apple']);
      key(el, 'ArrowDown');
      key(el, 'Enter');
      assert.deepEqual(chips.chipsData.map(item => item.id), ['apple']);
      assert.equal(el.value, '');
      el.value = 'ban';
      el.dispatchEvent(new window.InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
      assert.equal(el.value, 'ban');
      assert.deepEqual(chips.chipsData.map(item => item.id), ['apple']);
      assert.deepEqual([...chips.autocomplete.container.querySelectorAll('[role="option"]')].map(item => item.textContent), ['Banana']);
      key(el, 'ArrowDown');
      key(el, 'Enter');
      assert.deepEqual(chips.chipsData.map(item => item.id), ['apple', 'banana']);
      assert.equal(el.value, '');
    } finally {
      chips.autocomplete.destroy();
      chips.destroy();
    }
  });
});

describe('CharacterCounter', () => {
  beforeEach(resetBody);

  test('the count is a polite, atomic live region', () => {
    document.body.innerHTML =
      '<div class="field"><input id="t" type="text" maxlength="20"><label for="t">T</label></div>';
    const inst = Expressive.CharacterCounter.init(document.getElementById('t'));
    try {
      const counter = document.querySelector('.character-counter');
      // Without this the user reaches the limit having never been told of one.
      assert.equal(counter.getAttribute('aria-live'), 'polite');
      // "18/20" has to be read as one figure, not as a changed digit.
      assert.equal(counter.getAttribute('aria-atomic'), 'true');
      assertConforms(document.body, 'character-counter');
    } finally {
      inst.destroy();
    }
  });
});
