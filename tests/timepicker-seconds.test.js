// Timepicker `showSeconds`: the seconds field, the HH:MM:SS value it writes
// and the values it reads back. Layout and the roadmap check by keyboard are
// in timepicker-seconds-browser.test.js.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Expressive, resetBody, fire, window } from './setup.js';

const key = (el, k) => {
  const event = new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
};
const type = (el, value) => {
  el.value = value;
  el.dispatchEvent(new window.InputEvent('input', { bubbles: true }));
};
const leave = (el) => el.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true }));

/** A picker on a fresh input, opened as a click would open it. */
function open(value, options, inputType = 'text') {
  document.body.innerHTML = `<input type="${inputType}">`;
  const input = document.querySelector('input');
  input.value = value;
  const picker = Expressive.Timepicker.init(input, { duration: 0, vibrate: false, ...options });
  fire(input, 'click');
  return { input, picker };
}

const fields = (picker) => [...picker.containerEl.querySelectorAll('.timepicker-display-digital-clock input')];

describe('Timepicker seconds field', () => {
  beforeEach(resetBody);

  test('showSeconds adds a named seconds spin button after the minutes', () => {
    for (const [i18n, name] of [[undefined, 'Seconds'], [{ seconds: 'Segundos' }, 'Segundos']]) {
      const { picker } = open('14:30:45', { showSeconds: true, i18n });
      try {
        const seconds = picker.containerEl.querySelector('.timepicker-input-seconds');
        assert.deepEqual(fields(picker), [picker.inputHours, picker.inputMinutes, seconds]);
        assert.deepEqual(
          ['role', 'aria-valuemin', 'aria-valuemax', 'aria-label'].map((a) => seconds.getAttribute(a)),
          ['spinbutton', '0', '59', name]
        );
        assert.equal(picker.containerEl.querySelectorAll('.timepicker-input-divider').length, 2);
        const amPm = picker.containerEl.querySelector('.timepicker-display-am-pm');
        assert.ok(seconds.compareDocumentPosition(amPm) & window.Node.DOCUMENT_POSITION_FOLLOWING, 'AM/PM comes after seconds');
      } finally {
        picker.destroy();
      }
    }
  });

  test('without showSeconds there is no seconds field', () => {
    const { picker } = open('14:30:45', {});
    try {
      assert.equal(picker.containerEl.querySelector('.timepicker-input-seconds'), null);
      assert.equal(picker.containerEl.querySelectorAll('.timepicker-input-divider').length, 1);
      assert.equal(fields(picker).length, 2);
    } finally {
      picker.destroy();
    }
  });

  test('the seconds field steps and wraps without touching the rest of the clock', () => {
    const { picker } = open('11:20:58 PM', { showSeconds: true });
    try {
      const seconds = picker.containerEl.querySelector('.timepicker-input-seconds');
      picker.inputMinutes.focus();
      const before = () => [picker.hours, picker.minutes, picker.amOrPm, picker.currentView, picker.hand.getAttribute('x2'), picker.hand.getAttribute('y2')];
      const state = before();
      const seen = [];
      for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown']) {
        assert.equal(key(seconds, k).defaultPrevented, true);
        seen.push(seconds.value);
      }
      assert.deepEqual(seen, ['59', '00', '59', '04', '59']);
      assert.equal(picker.seconds, 59);
      assert.deepEqual(before(), state);
    } finally {
      picker.destroy();
    }
  });

  test('typed seconds take whole numbers from 0 to 59, and an emptied field takes the current second', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 9, 21, 15, 37, 12) });
    const { picker } = open('14:30:45', { showSeconds: true, twelveHour: false });
    try {
      const seconds = picker.containerEl.querySelector('.timepicker-input-seconds');
      type(seconds, '7');
      assert.equal(picker.seconds, 7);
      leave(seconds);
      assert.equal(seconds.value, '07');
      for (const bad of ['75', '4x', '-1', '1.5']) {
        type(seconds, bad);
        assert.equal(picker.seconds, 7, bad);
        leave(seconds);
        assert.equal(seconds.value, '07', bad);
      }
      type(seconds, '');
      leave(seconds);
      assert.equal(seconds.value, '12');
      type(seconds, '30');
      leave(seconds);
      type(seconds, '');
      key(seconds, 'Enter');
      assert.equal(seconds.value, '12', 'Enter formats the emptied field first');
      assert.equal(picker.el.value, '14:30:12');
    } finally {
      picker.destroy();
      t.mock.timers.reset();
    }
  });
});

test('editing seconds leaves a pending hand move to finish', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  document.body.innerHTML = '<input value="09:30:00">';
  const picker = Expressive.Timepicker.init(document.querySelector('input'), { showSeconds: true, twelveHour: false, duration: 100, vibrate: false });
  try {
    picker.inputMinutes.focus();
    picker.showView('minutes', 50);
    type(picker.inputSeconds, '45');
    for (const k of ['ArrowUp', 'PageDown']) key(picker.inputSeconds, k);
    assert.equal(picker._canvas.classList.contains('timepicker-canvas-out'), true, 'the hand move is still pending');
    t.mock.timers.tick(100);
    assert.equal(picker._canvas.classList.contains('timepicker-canvas-out'), false);
    // The hand points at 30 minutes, straight down.
    assert.equal(Math.round(Number(picker.bg.getAttribute('cy'))), picker.options.outerRadius);
    assert.equal(picker.seconds, 41);
  } finally {
    picker.destroy();
    t.mock.timers.reset();
  }
});

describe('Timepicker seconds value', () => {
  beforeEach(resetBody);

  test('done() writes HH:MM:SS on each clock and into a time input', () => {
    for (const [options, inputType, value, time] of [
      [{ twelveHour: false }, 'text', '14:30:45', '14:30:45'],
      [{ twelveHour: true }, 'text', '02:30:45 PM', '02:30:45'],
      [{ twelveHour: true }, 'time', '14:30:45', '02:30:45']
    ]) {
      const { input, picker } = open('', { ...options, showSeconds: true, defaultTime: '14:30:45' }, inputType);
      try {
        picker.done();
        assert.equal(input.value, value, `${inputType} ${options.twelveHour}`);
        assert.equal(picker.time, time);
      } finally {
        picker.destroy();
      }
    }
  });

  test('choosing a minute on the dial under autoSubmit writes the seconds the field shows', async () => {
    const { input, picker } = open('09:10:45', { showSeconds: true, twelveHour: false });
    try {
      picker.showView('minutes');
      const r = picker.options.dialRadius;
      for (const type of ['pointerdown', 'pointerup']) {
        const target = type === 'pointerdown' ? picker.plate : document;
        target.dispatchEvent(new window.PointerEvent(type, {
          bubbles: true, cancelable: true, isPrimary: true, pointerId: 1, button: 0, clientX: r, clientY: r - picker.options.outerRadius
        }));
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(input.value, '09:00:45');
    } finally {
      picker.destroy();
    }
  });

  test('opening reads seconds from the value, defaultTime or now', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 9, 21, 15, 37, 12) });
    try {
      for (const [value, options, expected] of [
        ['02:30:45 PM', {}, ['02', '30', '45', 'PM']],
        ['14:30', { twelveHour: false }, ['14', '30', '00']],
        ['', { twelveHour: false, defaultTime: '14:30:45' }, ['14', '30', '45']],
        ['', { twelveHour: false, defaultTime: 'now' }, ['15', '37', '12']]
      ]) {
        const { picker } = open(value, { ...options, showSeconds: true });
        try {
          const shown = fields(picker).map((f) => f.value);
          if (picker.options.twelveHour) shown.push(picker.amOrPm);
          assert.deepEqual(shown, expected, value || options.defaultTime);
        } finally {
          picker.destroy();
        }
      }
    } finally {
      t.mock.timers.reset();
    }
  });

  for (const autoSubmit of [true, false]) {
    test(`Enter in the seconds field commits the time (autoSubmit ${autoSubmit})`, () => {
      const { input, picker } = open('14:30:00', { showSeconds: true, twelveHour: false, autoSubmit });
      const changes = [];
      input.addEventListener('change', () => changes.push(input.value));
      try {
        const seconds = picker.inputSeconds;
        type(seconds, '45');
        assert.equal(key(seconds, 'Enter').defaultPrevented, true);
        assert.deepEqual(changes, ['14:30:45']);
      } finally {
        picker.destroy();
      }
    });
  }

  test('without showSeconds the value stays HH:MM and select keeps (hour, minute)', () => {
    const selected = [];
    const { input, picker } = open('14:30:45', { twelveHour: false, onSelect: (...args) => selected.push(args) });
    try {
      assert.deepEqual(fields(picker).map((f) => f.value), ['14', '30']);
      picker.done();
      assert.equal(input.value, '14:30');
      assert.equal(picker.time, '14:30');
      picker.plate.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, cancelable: true, isPrimary: true, pointerId: 1, button: 0, clientX: 135, clientY: 30 }));
      document.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, cancelable: true, isPrimary: true, pointerId: 1, button: 0, clientX: 135, clientY: 30 }));
      assert.equal(selected.length, 1);
      assert.equal(selected[0].length, 2);
    } finally {
      picker.destroy();
    }
  });

  test('AM or PM after the seconds sets the period without showSeconds too', () => {
    const { picker } = open('02:30:45 PM', { twelveHour: true });
    try {
      assert.deepEqual([picker.inputHours.value, picker.inputMinutes.value, picker.amOrPm], ['02', '30', 'PM']);
    } finally {
      picker.destroy();
    }
  });
});

test('the seconds layout sizes its boxes and digits in rem', () => {
  const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
  const rules = [...css.matchAll(/\.timepicker-display-digital-clock:has\(\.timepicker-input-seconds\)[^{]*\{([^}]*)\}/g)].map((m) => m[1]);
  const sizes = rules.flatMap((body) => [...body.matchAll(/(width|font-size|padding-inline):\s*([^;]+);/g)].map((m) => `${m[1]}: ${m[2].trim()}`));
  assert.ok(sizes.length >= 4, sizes.join(', '));
  for (const size of sizes) assert.match(size, /: [\d.]+rem$/);
});
