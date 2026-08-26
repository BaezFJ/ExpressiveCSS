// The DOM Chips generates, asserted against the rules semantics.json states.
//
// tests/semantics.test.js checks documented *markup*; nothing checked the
// markup the plugin *builds*, so _renderChip could have gone back to a
// <div tabindex="0"> without a single test noticing. The rules are read out of
// semantics.json rather than restated, so the two cannot disagree.
//
// Every case tears down in a finally: an assertion that skips destroy() leaves
// listeners behind, and per CLAUDE.md a wedged run prints nothing at all.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Expressive, resetBody, fire } from './setup.js';

const CHIP_RULES = JSON.parse(
  readFileSync(new URL('../semantics.json', import.meta.url), 'utf8')
).rows.chips.rules;

/** Applies the enforced chips rules to whatever the plugin just rendered. */
function assertConforms(root) {
  for (const rule of CHIP_RULES) {
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

const mount = (opts = {}) => {
  document.body.innerHTML = `<div class="chips"></div>`;
  const el = document.querySelector('.chips');
  return [el, Expressive.Chips.init(el, { allowUserInput: true, ...opts })];
};

describe('Chips rendered markup', () => {
  beforeEach(resetBody);

  test('a rendered chip satisfies every enforced chips rule', () => {
    const [el, chips] = mount({ data: [{ id: 'Apple' }, { id: 'Pear', image: '/p.jpg' }] });
    try {
      assertConforms(el);
    } finally {
      chips.destroy();
    }
  });

  test('the chip is a span and is not itself in the tab order', () => {
    const [el, chips] = mount({ data: [{ id: 'Apple' }] });
    try {
      const chip = el.querySelector('.chip');
      assert.equal(chip.tagName, 'SPAN');
      assert.equal(chip.hasAttribute('tabindex'), false, 'the chip is not a control');
    } finally {
      chips.destroy();
    }
  });

  test('the delete affordance is a labelled type=button with a hidden icon', () => {
    const [el, chips] = mount({ data: [{ id: 'Apple' }] });
    try {
      const close = el.querySelector('.chip .close');
      assert.equal(close.tagName, 'BUTTON');
      assert.equal(close.type, 'button', 'a bare button inside a form submits it');
      assert.equal(close.getAttribute('aria-label'), 'Remove Apple');
      assert.equal(close.querySelector('.material-symbols').getAttribute('aria-hidden'), 'true');
    } finally {
      chips.destroy();
    }
  });

  test('the accessible name uses chip.text when it differs from the id', () => {
    const [el, chips] = mount({ data: [{ id: 42, text: 'Answer' }] });
    try {
      assert.equal(el.querySelector('.close').getAttribute('aria-label'), 'Remove Answer');
    } finally {
      chips.destroy();
    }
  });

  test('i18n.remove is honoured', () => {
    const [el, chips] = mount({ data: [{ id: 'Pomme' }], i18n: { remove: 'Supprimer' } });
    try {
      assert.equal(el.querySelector('.close').getAttribute('aria-label'), 'Supprimer Pomme');
    } finally {
      chips.destroy();
    }
  });

  test('without allowUserInput there is no delete button', () => {
    document.body.innerHTML = `<div class="chips"></div>`;
    const el = document.querySelector('.chips');
    const chips = Expressive.Chips.init(el, { data: [{ id: 'Apple' }] });
    try {
      assert.equal(el.querySelector('.close'), null);
      assertConforms(el);
    } finally {
      chips.destroy();
    }
  });

  test('a click on the icon inside the delete button still deletes', () => {
    // The old handler tested `target.classList.contains('close')`, which the
    // nested icon span defeats.
    const [el, chips] = mount({ data: [{ id: 'Apple' }, { id: 'Pear' }] });
    try {
      fire(el.querySelector('.chip .close .material-symbols'), 'click');
      assert.deepEqual(
        chips.getData().map((c) => c.id),
        ['Pear']
      );
    } finally {
      chips.destroy();
    }
  });
});

describe('Chips selection', () => {
  beforeEach(resetBody);

  test('selectChip marks the chip and focuses its delete button', () => {
    const [el, chips] = mount({ data: [{ id: 'Apple' }, { id: 'Pear' }] });
    try {
      chips.selectChip(1);
      const chip = el.querySelectorAll('.chip')[1];
      assert.equal(chip.classList.contains('selected'), true);
      assert.equal(document.activeElement, chip.querySelector('.close'));
    } finally {
      chips.destroy();
    }
  });

  test('only one chip is selected at a time', () => {
    const [el, chips] = mount({ data: [{ id: 'Apple' }, { id: 'Pear' }] });
    try {
      chips.selectChip(0);
      chips.selectChip(1);
      assert.equal(el.querySelectorAll('.chip.selected').length, 1);
    } finally {
      chips.destroy();
    }
  });

  test('deleting the selected chip clears the selection', () => {
    // `.selected` is a class now, so unlike `:focus` it does not clear itself.
    const [el, chips] = mount({ data: [{ id: 'Apple' }] });
    try {
      chips.selectChip(0);
      chips.deleteChip(0);
      assert.equal(el.querySelector('.chip.selected'), null);
    } finally {
      chips.destroy();
    }
  });
});
