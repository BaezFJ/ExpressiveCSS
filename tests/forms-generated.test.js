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
  el.dispatchEvent(new window.KeyboardEvent('keyup', { bubbles: true, key: value.slice(-1) }));
}

const key = (el, k) =>
  el.dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: k }));

const DATA = JSON.parse(readFileSync(new URL('../semantics.json', import.meta.url), 'utf8'));

function assertConforms(root, componentKey) {
  for (const rule of DATA.components[componentKey].rules) {
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
