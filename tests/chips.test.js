// The DOM Chips generates, asserted against the rules semantics.json states.
//
// tests/semantics.test.js checks documented *markup*; nothing checked the
// markup the plugin *builds*, so _renderChip could have gone back to a
// <div tabindex="0"> without a single test noticing. The rules are read out of
// semantics.json rather than restated, so the two cannot disagree.
//
// Every case tears down in a finally: an assertion that skips destroy() leaves
// listeners behind, and per docs/development-notes.md a wedged run prints
// nothing at all.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Expressive, resetBody, fire, window } from './setup.js';

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

  test('a nested input can add its initial autocomplete value before being moved', () => {
    document.body.innerHTML = '<div class="chips"><span><input value="apple"></span></div>';
    const el = document.querySelector('.chips');
    const input = el.querySelector('input');
    const wrapper = input.parentElement;
    const added = [];
    let chips;
    try {
      chips = Expressive.Chips.init(el, {
        allowUserInput: true,
        autocompleteOptions: { data: [{ id: 'apple', text: 'Apple' }] },
        onChipAdd: (element, chip) => added.push([element, chip]),
      });
      const rendered = [...el.querySelectorAll('.chip')];
      assert.deepEqual(chips.getData().map(chip => chip.id), ['apple']);
      assert.equal(rendered.length, 1);
      assert.deepEqual(chips._chips, rendered);
      assert.deepEqual(added, [[el, rendered[0]]]);
      assert.equal(rendered[0].firstChild.textContent, 'Apple');
      assert.equal(wrapper.parentElement, el);
      assert.equal(input.parentElement, el);
      assert.equal(input.value, '');
    } finally {
      (chips ?? Expressive.Chips.getInstance(el))?.destroy();
      // A failed constructor can leave the nested Autocomplete's Menu initialized.
      Expressive.Menu.getInstance(input)?.destroy();
    }
  });

  for (const editable of [false, true]) {
    test(`addChip preserves data, author nodes, and callbacks with ${editable ? 'an editable input' : 'default noneditable options'}`, () => {
      document.body.innerHTML = '<div class="chips"><label>Tags</label><small>Choose a tag.</small></div>';
      const el = document.querySelector('.chips');
      const authorNodes = [...el.children];
      const added = [];
      const chips = Expressive.Chips.init(el, {
        ...(editable ? { allowUserInput: true } : {}),
        data: [{ id: 'Apple' }],
        limit: 2,
        placeholder: 'First tag',
        secondaryPlaceholder: 'Another tag',
        onChipAdd: (element, chip) => added.push([element, chip]),
      });
      try {
        chips.addChip({ id: 'Pear' });
        const rendered = [...el.querySelectorAll('.chip')];
        assert.equal(rendered.length, 2);
        assert.deepEqual(chips._chips, rendered);
        assert.deepEqual(chips.getData().map(chip => chip.id), ['Apple', 'Pear']);
        assert.deepEqual(added, [[el, rendered[1]]]);
        assert.equal(authorNodes.every(node => node.parentElement === el), true);
        const input = el.querySelector('input');
        if (editable) {
          assert.equal(rendered[1].nextElementSibling, input);
          assert.equal(input.placeholder, 'Another tag');
        } else {
          assert.equal(input, null);
          assert.equal(el.lastElementChild, rendered[1]);
          assert.equal(el.querySelector('.close'), null);
        }
        chips.addChip({ id: 'Pear' });
        chips.addChip({ id: 'Orange' });
        assert.deepEqual(chips.getData().map(chip => chip.id), ['Apple', 'Pear']);
        assert.equal(added.length, 1, 'duplicates and the limit do not emit add callbacks');
        chips.deleteChip(1);
        chips.deleteChip(0);
        assert.deepEqual(chips.getData(), []);
        assert.deepEqual(chips._chips, []);
        assert.equal(el.querySelector('.chip'), null);
        if (input) assert.equal(input.placeholder, 'First tag');
      } finally {
        chips.destroy();
      }
    });

    test(`numeric zero initializes a chip with allowUserInput=${editable}`, () => {
      let chips;
      try {
        const [el, instance] = mount({ allowUserInput: editable, data: [{ id: 0 }] });
        chips = instance;
        assert.deepEqual(chips.getData(), [{ id: 0 }]);
        assert.equal(el.querySelector('.chip').firstChild.textContent, '0');
        assert.equal(chips._chips.length, 1);
        if (editable) assert.equal(el.querySelector('.close').getAttribute('aria-label'), 'Remove 0');
      } finally {
        chips?.destroy();
      }
    });

    test(`addChip accepts zero once and still rejects invalid IDs with allowUserInput=${editable}`, () => {
      const added = [];
      const [el, chips] = mount({ allowUserInput: editable, onChipAdd: (element, chip) => added.push([element, chip]) });
      try {
        for (const id of ['', NaN, null, undefined, false]) chips.addChip({ id });
        assert.deepEqual(chips.getData(), []);
        chips.addChip({ id: 0, text: 'Zero' });
        assert.deepEqual(chips.getData(), [{ id: 0, text: 'Zero' }]);
        chips.addChip({ id: 0 });
        chips.addChip({ id: '0' });
        assert.equal(chips.getData().length, 1, 'numeric and string duplicates retain their existing equality rules');
        assert.equal(el.querySelectorAll('.chip').length, 1);
        assert.deepEqual(added, [[el, chips._chips[0]]]);
        assert.equal(chips._chips[0].firstChild.textContent, 'Zero');
        chips.deleteChip(0);
        assert.deepEqual(chips.getData(), []);
        assert.equal(el.querySelector('.chip'), null);
      } finally {
        chips.destroy();
      }
    });
  }

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

describe('Chips input and data', () => {
  beforeEach(resetBody);

  const key = (target, key, init = {}) =>
    target.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));

  test('the initial data is copied, not shared with the caller or other instances', () => {
    document.body.innerHTML = `<div class="chips"></div><div class="chips"></div>`;
    const data = [{ id: 'Apple' }];
    const [first, second] = Expressive.Chips.init(document.querySelectorAll('.chips'), { allowUserInput: true, data });
    try {
      first.addChip({ id: 'Pear' });
      assert.deepEqual(data, [{ id: 'Apple' }]);
      assert.deepEqual(second.getData().map((c) => c.id), ['Apple']);
    } finally {
      first.destroy();
      second.destroy();
    }
  });

  test('Enter that ends an IME composition does not add a chip', () => {
    const [el, chips] = mount();
    try {
      const input = el.querySelector('input');
      input.value = 'にほん';
      key(input, 'Enter', { isComposing: true });
      assert.deepEqual(chips.getData(), []);
      assert.equal(input.value, 'にほん');
    } finally {
      chips.destroy();
    }
  });

  test('arrow keys follow the reading direction in RTL', () => {
    const [el, chips] = mount({ data: [{ id: 'A' }, { id: 'B' }, { id: 'C' }] });
    el.style.direction = 'rtl';
    try {
      // Right points back towards the chips from the input in RTL.
      key(el.querySelector('input'), 'ArrowRight');
      assert.equal(el.querySelector('.chip.selected').textContent.startsWith('C'), true);
      key(document.activeElement, 'ArrowRight');
      assert.equal(el.querySelector('.chip.selected').textContent.startsWith('B'), true);
      key(document.activeElement, 'ArrowLeft');
      assert.equal(el.querySelector('.chip.selected').textContent.startsWith('C'), true);
    } finally {
      chips.destroy();
    }
  });
});

describe('Chips static markup', () => {
  beforeEach(resetBody);

  test('a hand-written close button works under an instance without allowUserInput', () => {
    // AutoInit gives every .chips an instance, and one without allowUserInput
    // has no click handler, so the static fallback must not stand down for it.
    document.body.innerHTML = `<div class="chips">
      <span class="chip">Tag<button type="button" class="close"><span class="material-symbols">close</span></button></span>
    </div>`;
    const el = document.querySelector('.chips');
    Expressive.Chips.Init();
    const chips = Expressive.Chips.init(el);
    try {
      fire(el.querySelector('.close .material-symbols'), 'click');
      assert.equal(el.querySelector('.chip'), null);
    } finally {
      chips.destroy();
    }
  });

  test('the fallback leaves chips the instance rendered to the instance', () => {
    document.body.innerHTML = `<div class="chips"></div>`;
    const el = document.querySelector('.chips');
    Expressive.Chips.Init();
    const chips = Expressive.Chips.init(el, { allowUserInput: true, data: [{ id: 'Apple' }, { id: 'Pear' }] });
    try {
      fire(el.querySelector('.chip .close'), 'click');
      assert.deepEqual(chips.getData().map((c) => c.id), ['Pear']);
      assert.equal(el.querySelectorAll('.chip').length, 1);
    } finally {
      chips.destroy();
    }
  });
});

describe('Chips create row', () => {
  beforeEach(resetBody);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const key = (target, name) =>
    target.dispatchEvent(new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  /** Chips whose Autocomplete offers a create row, recording the page's onCreate. */
  const setup = (opts = {}) => {
    const created = [];
    const [el, chips] = mount({
      autocompleteOptions: {
        data: [{ id: 'Apple' }],
        allowCreate: true,
        menuOptions: { inDuration: 0, outDuration: 0 },
        onCreate: (text) => created.push(text)
      },
      ...opts
    });
    const input = el.querySelector('input');
    const type = (value) => { input.value = value; fire(input, 'input'); };
    /** Types the value, arrows to the last row and presses Enter. */
    const choose = async (value) => {
      type(value);
      await sleep(10);
      for (let i = 0; i < chips.autocomplete.container.children.length; i++) key(input, 'ArrowDown');
      key(input, 'Enter');
    };
    const ids = () => chips.getData().map((chip) => chip.id);
    return { chips, input, created, type, choose, ids };
  };

  for (const autocompleteOnly of [false, true]) {
    test(`choosing the row adds a chip (autocompleteOnly: ${autocompleteOnly})`, async () => {
      const { chips, input, created, choose, ids } = setup({ autocompleteOnly });
      try {
        input.focus();
        await choose('kiwi');
        assert.deepEqual(ids(), ['kiwi']);
        assert.equal(input.value, '');
        assert.equal(document.activeElement, input);
        assert.deepEqual(created, ['kiwi'], "the page's onCreate still runs");
      } finally {
        chips.destroy();
      }
    });
  }

  test('the limit and duplicate checks still hold', async () => {
    const { chips, input, choose, ids } = setup({ limit: 2, data: [{ id: 'kiwi' }] });
    try {
      input.focus();
      await choose('kiwi');
      assert.deepEqual(ids(), ['kiwi'], 'a duplicate adds nothing');
      await choose('pear');
      await choose('plum');
      assert.deepEqual(ids(), ['kiwi', 'pear'], 'the limit holds');
    } finally {
      chips.destroy();
    }
  });

  test('an autocomplete-only field still adds nothing on Enter or paste', async () => {
    const { chips, input, type } = setup({ autocompleteOnly: true });
    try {
      input.focus();
      type('kiwi');
      await sleep(10);
      key(input, 'Enter');
      assert.deepEqual(chips.getData(), [], 'Enter without a chosen row');
      const paste = new window.Event('paste', { bubbles: true, cancelable: true });
      paste.clipboardData = { getData: () => 'a, b' };
      input.dispatchEvent(paste);
      assert.equal(paste.defaultPrevented, false, 'the paste stays text');
      assert.deepEqual(chips.getData(), []);
    } finally {
      chips.destroy();
    }
  });
});
