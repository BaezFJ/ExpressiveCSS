// Keyboard and focus contracts that a pointer passing by, or a key meant for
// something else, used to break: a hover tooltip swallowing Escape, a hover
// menu pulling focus out of a text field, an Autocomplete list closing when
// its own input is clicked, a Timepicker that a keyboard could not commit, and
// Chips keys acting on two different chips.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

const sleep = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));
const key = (el, k) => {
  const event = new window.KeyboardEvent('keydown', { key: k, bubbles: true, composed: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
};
const fire = (el, type) => el.dispatchEvent(new window.MouseEvent(type, { bubbles: true, composed: true, cancelable: true }));

describe('Keyboard and focus', () => {
  beforeEach(resetBody);

  test('a hover-opened Tooltip closes on Escape without taking the key from the focused field', () => {
    document.body.innerHTML = '<button id="trigger" data-tooltip="Tip">Info</button><input id="field">';
    const trigger = document.getElementById('trigger');
    const field = document.getElementById('field');
    const tip = Expressive.Tooltip.init(trigger, { enterDelay: 0, exitDelay: 0, inDuration: 0, outDuration: 0 });
    try {
      field.focus();
      fire(trigger, 'mouseenter');
      assert.equal(tip.isOpen, true);
      let reached = false;
      field.addEventListener('keydown', () => (reached = true));
      const escape = key(field, 'Escape');
      assert.equal(tip.isOpen, false, 'Escape still dismisses the tooltip');
      assert.equal(reached, true, 'the field still receives Escape');
      assert.equal(escape.defaultPrevented, false, 'the field keeps its Escape');

      trigger.focus();
      tip.open();
      assert.equal(key(trigger, 'Escape').defaultPrevented, true, 'on its trigger, Escape is the tooltip key');
      assert.equal(tip.isOpen, false);
    } finally {
      tip.destroy();
    }
  });

  test('Escape on a Tooltip trigger in a closed shadow root stays with the tooltip', () => {
    document.body.innerHTML = '<dialog id="d"><div id="host"></div></dialog>';
    const dialog = document.getElementById('d');
    dialog.showModal();
    const root = document.getElementById('host').attachShadow({ mode: 'closed' });
    root.innerHTML = '<button data-tooltip="Tip">Info</button>';
    const trigger = root.querySelector('button');
    const tip = Expressive.Tooltip.init(trigger, { enterDelay: 0, exitDelay: 0, inDuration: 0, outDuration: 0 });
    let reached = false;
    dialog.addEventListener('keydown', () => (reached = true));
    try {
      trigger.focus();
      tip.open();
      const escape = key(trigger, 'Escape');
      assert.equal(tip.isOpen, false);
      assert.equal(escape.defaultPrevented, true, 'Escape is cancelled');
      assert.equal(reached, false, 'Escape does not reach the enclosing dialog');
    } finally {
      tip.destroy();
    }
  });

  test('Escape on a hover Menu trigger in a closed shadow root is cancelled', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = '<button class="menu-trigger" data-target="m">Open</button><menu id="m"><li><span>Alpha</span></li></menu>';
    const trigger = root.querySelector('button');
    const menu = Expressive.Menu.init(trigger, { hover: true, inDuration: 0, outDuration: 0 });
    try {
      trigger.focus();
      fire(trigger, 'mouseenter');
      await sleep();
      assert.equal(key(trigger, 'Escape').defaultPrevented, true);
      assert.equal(menu.isOpen, false);
    } finally {
      menu.destroy();
    }
  });

  test('a hover Menu leaves focus where it was until the keyboard asks for the menu', async () => {
    document.body.innerHTML = `<input id="field"><button class="menu-trigger" data-target="m">Open</button>
      <menu id="m"><li><span>Alpha</span></li><li><span>Beta</span></li></menu>`;
    const field = document.getElementById('field');
    const trigger = document.querySelector('.menu-trigger');
    const menu = Expressive.Menu.init(trigger, { hover: true, inDuration: 0, outDuration: 0 });
    try {
      field.focus();
      fire(trigger, 'mouseenter');
      await sleep();
      assert.equal(menu.isOpen, true);
      assert.equal(document.activeElement, field, 'hovering does not move focus into the menu');
      const fromField = key(field, 'Escape');
      assert.equal(menu.isOpen, false, 'Escape closes the hover menu while focus is outside it');
      assert.equal(document.activeElement, field, 'closing leaves focus in the field');
      assert.equal(fromField.defaultPrevented, false, 'the field keeps its Escape');

      fire(trigger, 'mouseleave');
      fire(trigger, 'mouseenter');
      await sleep();
      trigger.focus();
      assert.equal(key(trigger, 'Escape').defaultPrevented, true, 'on the trigger, Escape is the menu key');
      assert.equal(menu.isOpen, false);

      fire(trigger, 'mouseenter');
      await sleep();
      key(trigger, 'ArrowDown');
      assert.equal(document.activeElement.textContent, 'Alpha', 'ArrowDown on the trigger enters the open menu');
    } finally {
      menu.destroy();
    }
  });

  test('keyboard takeover during a hover Menu opening animation keeps its place', async () => {
    document.body.innerHTML = `<button class="menu-trigger" data-target="m">Open</button>
      <menu id="m"><li><span>Alpha</span></li><li><span>Beta</span></li></menu>`;
    const trigger = document.querySelector('.menu-trigger');
    const menu = Expressive.Menu.init(trigger, { hover: true, inDuration: 150, outDuration: 0 });
    try {
      trigger.focus();
      fire(trigger, 'mouseenter');
      key(trigger, 'ArrowDown');
      assert.equal(document.activeElement.textContent, 'Alpha');
      // The menu's key handling attaches a tick after opening; still well
      // inside the 150ms animation.
      await sleep(10);
      key(document.activeElement, 'ArrowDown');
      assert.equal(document.activeElement.textContent, 'Beta');
      // Past the opening animation, whose end used to refocus the first item.
      await sleep(200);
      assert.equal(document.activeElement.textContent, 'Beta', 'the animation end does not pull focus back');
    } finally {
      menu.destroy();
    }
  });

  test('clicking inside an open Autocomplete input keeps its list open', async () => {
    document.body.innerHTML = '<div class="field"><input id="ac" type="text"></div>';
    const el = document.getElementById('ac');
    const ac = Expressive.Autocomplete.init(el, { data: [{ id: 'a', text: 'Apple' }, { id: 'b', text: 'Apricot' }] });
    try {
      el.focus();
      el.value = 'ap';
      el.dispatchEvent(new window.InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      await sleep();
      assert.equal(ac.menu.isOpen, true, 'typing opens the list');
      fire(el, 'click');
      await sleep();
      assert.equal(ac.menu.isOpen, true, 'moving the caret does not close the list');
      fire(document.body, 'click');
      await sleep();
      assert.equal(ac.menu.isOpen, false, 'a click outside still closes it');
    } finally {
      ac.destroy();
    }
  });

  test('Enter in a Timepicker field commits the typed time under autoSubmit', () => {
    document.body.innerHTML = '<input type="text" class="time-picker" value="03:00">';
    const input = document.querySelector('.time-picker');
    const tp = Expressive.Timepicker.init(input, { twelveHour: false });
    const changes = [];
    input.addEventListener('change', () => changes.push(input.value));
    try {
      fire(input, 'click');
      for (const [field, value] of [[tp.inputHours, '7'], [tp.inputMinutes, '45']]) {
        field.value = value;
        field.dispatchEvent(new window.InputEvent('input', { bubbles: true }));
      }
      const enter = key(tp.inputMinutes, 'Enter');
      assert.equal(input.value, '07:45');
      assert.deepEqual(changes, ['07:45']);
      assert.equal(enter.defaultPrevented, true, 'Enter does not also submit a surrounding form');
    } finally {
      tp.destroy();
    }
  });

  for (const autoSubmit of [true, false]) {
    test(`Enter commits what an emptied Timepicker field will show (autoSubmit ${autoSubmit})`, (t) => {
      t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 9, 15, 15, 37) });
      document.body.innerHTML = '<input type="text" class="time-picker" value="03:45">';
      const input = document.querySelector('.time-picker');
      const tp = Expressive.Timepicker.init(input, { twelveHour: false, autoSubmit });
      try {
        fire(input, 'click');
        tp.inputMinutes.value = '';
        tp.inputMinutes.dispatchEvent(new window.InputEvent('input', { bubbles: true }));
        key(tp.inputMinutes, 'Enter');
        assert.equal(`${tp.inputHours.value}:${tp.inputMinutes.value}`, '03:37', 'the field takes its default');
        assert.equal(input.value, '03:37', 'the input gets the time the fields show');
      } finally {
        tp.destroy();
        t.mock.timers.reset();
      }
    });
  }

  test('Chips keys act on the focused chip, and leaving the field clears the selection', () => {
    document.body.innerHTML = '<div class="chips"></div><button id="after">After</button>';
    const el = document.querySelector('.chips');
    const chips = Expressive.Chips.init(el, { allowUserInput: true, data: [{ id: 'A' }, { id: 'B' }, { id: 'C' }] });
    const chip = (i) => el.querySelectorAll('.chip')[i];
    const selected = () => [...el.querySelectorAll('.chip.selected')].map((c) => c.firstChild.textContent.trim());
    try {
      chips.selectChip(0);
      chip(2).querySelector('.close').focus();
      assert.deepEqual(selected(), ['C'], 'focusing a chip selects it');
      key(chip(2).querySelector('.close'), 'ArrowLeft');
      assert.deepEqual(selected(), ['B'], 'ArrowLeft moves from the focused chip');
      chips.selectChip(0);
      chip(1).querySelector('.close').focus();
      key(chip(1).querySelector('.close'), 'Backspace');
      assert.deepEqual(chips.getData().map((d) => d.id), ['A', 'C'], 'Backspace deletes the focused chip');
      assert.deepEqual(selected(), ['A'], 'only the chip that took focus is selected');
      document.getElementById('after').focus();
      assert.deepEqual(selected(), [], 'leaving the field clears the selection');
    } finally {
      chips.destroy();
    }
  });
});
