// Timepicker `minTime` and `maxTime`: the bounds, clamping, the fields, the
// AM/PM buttons and the dial. The roadmap check in real engines is in
// timepicker-time-range-browser.test.js.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Expressive, resetBody, fire, window } from './setup.js';

const RANGE = { minTime: '09:00', maxTime: '17:30' };

/** A picker on a fresh input, opened as a click would open it. */
function open(value, options, inputType = 'text') {
  document.body.innerHTML = `<input type="${inputType}">`;
  const input = document.querySelector('input');
  input.value = value;
  const picker = Expressive.Timepicker.init(input, { duration: 0, vibrate: false, ...options });
  fire(input, 'click');
  return { input, picker };
}

/** The fields as the picker shows them, with the period on a 12-hour clock. */
const shown = (picker) => {
  const time = [picker.inputHours, picker.inputMinutes, picker.inputSeconds].filter(Boolean).map((f) => f.value).join(':');
  return picker.options.twelveHour ? `${time} ${picker.amOrPm}` : time;
};

/** Run `body` with `console.warn` recorded, and return the warnings. */
function warnings(body) {
  const seen = [];
  const original = console.warn;
  console.warn = (...args) => seen.push(args);
  try {
    body();
  } finally {
    console.warn = original;
  }
  return seen;
}

describe('Timepicker time range options', () => {
  beforeEach(resetBody);

  test('both bounds default to null and leave every time open', () => {
    assert.equal(Expressive.Timepicker.defaults.minTime, null);
    assert.equal(Expressive.Timepicker.defaults.maxTime, null);
    for (const value of ['00:00', '23:59']) {
      const { picker } = open(value, { twelveHour: false });
      try {
        assert.equal(shown(picker), value);
      } finally {
        picker.destroy();
      }
    }
  });

  test('a single bound limits its own side of the day only', () => {
    const cases = [
      [{ minTime: '09:00' }, '08:00', '09:00'],
      [{ minTime: '09:00' }, '23:59', '23:59'],
      [{ maxTime: '17:30' }, '18:00', '17:30'],
      [{ maxTime: '17:30' }, '00:00', '00:00']
    ];
    for (const [bounds, value, expected] of cases) {
      const { picker } = open(value, { twelveHour: false, ...bounds });
      try {
        assert.equal(shown(picker), expected, `${JSON.stringify(bounds)} at ${value}`);
      } finally {
        picker.destroy();
      }
    }
  });

  test('a minTime after maxTime warns once and is ignored with maxTime', () => {
    let picker;
    const seen = warnings(() => {
      picker = open('08:00', { twelveHour: false, minTime: '18:00', maxTime: '09:00' }).picker;
    });
    try {
      assert.equal(seen.length, 1);
      assert.match(seen[0][0], /Timepicker ignored minTime and maxTime/);
      assert.equal(shown(picker), '08:00');
    } finally {
      picker.destroy();
    }
  });

  test('without seconds and bounds, the hidden seconds stay as read', () => {
    const { picker } = open('23:59:30', { twelveHour: false });
    try {
      assert.equal(shown(picker), '23:59');
      assert.equal(picker.seconds, 30);
    } finally {
      picker.destroy();
    }
  });

  test('without seconds the bounds round inward to whole minutes', () => {
    const bounds = { twelveHour: false, minTime: '09:00:30', maxTime: '17:29:45' };
    const cases = [
      [{}, '09:00', '09:01'],
      [{}, '17:45', '17:29'],
      [{ showSeconds: true }, '09:00', '09:00:30'],
      [{ showSeconds: true }, '17:45', '17:29:45']
    ];
    for (const [options, value, expected] of cases) {
      const { picker } = open(value, { ...bounds, ...options });
      try {
        assert.equal(shown(picker), expected, `${JSON.stringify(options)} at ${value}`);
      } finally {
        picker.destroy();
      }
    }
  });
});

describe('Timepicker time range on open', () => {
  beforeEach(resetBody);

  test('a value outside the range opens at the nearest bound and leaves the input alone', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 9, 21, 20, 0, 0) });
    const cases = [
      ['08:00', {}, '09:00'],
      ['', { defaultTime: 'now' }, '17:30'],
      ['12:15', {}, '12:15'],
      ['08:00 AM', { twelveHour: true }, '09:00 AM'],
      ['06:00 PM', { twelveHour: true }, '05:30 PM']
    ];
    for (const [value, options, expected] of cases) {
      const { input, picker } = open(value, { twelveHour: false, ...RANGE, ...options });
      try {
        assert.equal(shown(picker), expected, `${value || 'now'}`);
        assert.equal(input.value, value);
      } finally {
        picker.destroy();
      }
    }
  });

  test('done() writes the last allowed time in every format', () => {
    const cases = [
      [{ twelveHour: false }, 'text', '17:30'],
      [{ twelveHour: true }, 'text', '05:30 PM'],
      [{ twelveHour: true }, 'time', '17:30']
    ];
    for (const [options, inputType, expected] of cases) {
      const { input, picker } = open('', { ...RANGE, ...options, defaultTime: '17:30' }, inputType);
      try {
        picker.done();
        assert.equal(input.value, expected, `${JSON.stringify(options)} ${inputType}`);
      } finally {
        picker.destroy();
      }
    }
  });
});

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
const ariaRange = (field) => [field.getAttribute('aria-valuemin'), field.getAttribute('aria-valuemax')].map(Number);

describe('Timepicker time range in the fields', () => {
  beforeEach(resetBody);

  test('stepping stops at the bounds and wraps only a fully allowed field', () => {
    const cases = [
      ['17:00', 'inputHours', 'ArrowUp', '17:00'],
      ['09:00', 'inputHours', 'ArrowDown', '09:00'],
      ['17:30', 'inputMinutes', 'ArrowUp', '17:30'],
      ['17:00', 'inputMinutes', 'ArrowDown', '17:00'],
      ['15:00', 'inputHours', 'PageUp', '17:00'],
      ['12:59', 'inputMinutes', 'ArrowUp', '12:00'],
      ['16:45', 'inputHours', 'ArrowUp', '17:30']
    ];
    for (const [value, field, k, expected] of cases) {
      const { picker } = open(value, { twelveHour: false, ...RANGE });
      try {
        assert.equal(key(picker[field], k).defaultPrevented, true);
        assert.equal(shown(picker), expected, `${k} in ${field} at ${value}`);
      } finally {
        picker.destroy();
      }
    }
  });

  test('on a 12-hour clock hours step through noon within the range', () => {
    const { picker } = open('11:00 AM', { twelveHour: true, ...RANGE });
    try {
      key(picker.inputHours, 'ArrowUp');
      assert.equal(shown(picker), '12:00 PM');
      key(picker.inputHours, 'PageUp');
      key(picker.inputHours, 'PageUp');
      assert.equal(shown(picker), '05:00 PM');
    } finally {
      picker.destroy();
    }
  });

  test('a typed time outside the range is refused', () => {
    const { picker } = open('16:45', { twelveHour: false, ...RANGE });
    try {
      for (const text of ['08', '18']) {
        type(picker.inputHours, text);
        assert.equal(picker.hours, 16, text);
        leave(picker.inputHours);
        assert.equal(picker.inputHours.value, '16');
      }
      type(picker.inputHours, '17');
      assert.equal(shown(picker), '17:30');
      type(picker.inputMinutes, '45');
      assert.equal(picker.minutes, 30);
      leave(picker.inputMinutes);
      assert.equal(picker.inputMinutes.value, '30');
    } finally {
      picker.destroy();
    }
  });

  test('a typed hour outside the range is refused on a 12-hour clock', () => {
    for (const [value, text] of [['10:00 AM', '8'], ['02:00 PM', '6']]) {
      const { picker } = open(value, { twelveHour: true, ...RANGE });
      try {
        type(picker.inputHours, text);
        leave(picker.inputHours);
        assert.equal(shown(picker), value, `${text} at ${value}`);
      } finally {
        picker.destroy();
      }
    }
  });

  test('each field announces its allowed range as the time changes', () => {
    const cases = [
      ['09:00', {}, [[9, 17], [0, 59]]],
      ['12:00', {}, [[9, 17], [0, 59]]],
      ['17:00', {}, [[9, 17], [0, 30]]],
      ['17:30:00', { showSeconds: true }, [[9, 17], [0, 30], [0, 0]]],
      ['17:29:00', { showSeconds: true }, [[9, 17], [0, 30], [0, 59]]],
      ['02:00 PM', { twelveHour: true }, [[1, 12], [0, 59]]],
      ['10:00 AM', { twelveHour: true }, [[9, 11], [0, 59]]]
    ];
    for (const [value, options, expected] of cases) {
      const { picker } = open(value, { twelveHour: false, ...RANGE, ...options });
      try {
        const fields = [picker.inputHours, picker.inputMinutes, picker.inputSeconds].filter(Boolean);
        assert.deepEqual(fields.map(ariaRange), expected, value);
      } finally {
        picker.destroy();
      }
    }
    const { picker } = open('16:00', { twelveHour: false, ...RANGE });
    try {
      key(picker.inputHours, 'ArrowUp');
      assert.deepEqual(ariaRange(picker.inputMinutes), [0, 30]);
    } finally {
      picker.destroy();
    }
  });

  test('a period with no allowed time has its button disabled', () => {
    const { picker } = open('', { twelveHour: true, minTime: '13:00', maxTime: '17:00', defaultTime: '14:00' });
    try {
      const [am, pm] = ['.am-btn', '.pm-btn'].map((s) => picker.containerEl.querySelector(s));
      assert.equal(am.disabled, true);
      assert.equal(pm.disabled, false);
      picker._handleAmPmInteraction(am);
      assert.equal(picker.amOrPm, 'PM');
    } finally {
      picker.destroy();
    }
  });

  test('switching the period clamps the time into the range', () => {
    const { picker } = open('05:00 PM', { twelveHour: true, ...RANGE });
    try {
      const am = picker.containerEl.querySelector('.am-btn');
      assert.equal(am.disabled, false);
      assert.equal(picker.containerEl.querySelector('.pm-btn').disabled, false);
      fire(am, 'click');
      assert.equal(shown(picker), '09:00 AM');
      assert.deepEqual(ariaRange(picker.inputHours), [9, 11]);
    } finally {
      picker.destroy();
    }
  });
});

/**
 * Press and release a pointer on the dial at `value` on the current view:
 * an hour on the 24-hour clock (`inner` for the 1 to 12 ring), or a minute.
 * jsdom lays the plate out at 0,0, so its centre is at the dial radius.
 */
function pick(picker, value, inner = false) {
  const { dialRadius, outerRadius, innerRadius } = picker.options;
  const hours = picker.currentView === 'hours';
  const radian = (value / (hours ? 6 : 30)) * Math.PI;
  const radius = inner ? innerRadius : outerRadius;
  const at = { clientX: dialRadius + Math.sin(radian) * radius, clientY: dialRadius - Math.cos(radian) * radius };
  const init = { bubbles: true, cancelable: true, isPrimary: true, pointerId: 1, button: 0, ...at };
  picker.plate.dispatchEvent(new window.PointerEvent('pointerdown', init));
  document.dispatchEvent(new window.PointerEvent('pointerup', init));
}

const disabledTicks = (view) => [...view.querySelectorAll('.timepicker-tick.is-disabled')].map((tick) => Number(tick.textContent));
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('Timepicker time range on the dial', () => {
  beforeEach(resetBody);

  test('ticks outside the range are disabled and follow the hour and period', () => {
    const cases = [
      ['17:00', {}, range(0, 8).concat(range(18, 23)), [35, 40, 45, 50, 55]],
      ['12:00', {}, range(0, 8).concat(range(18, 23)), []],
      ['02:00 PM', { twelveHour: true }, range(6, 11), []],
      ['10:00 AM', { twelveHour: true }, range(1, 8).concat(12), []]
    ];
    for (const [value, options, hours, minutes] of cases) {
      const { picker } = open(value, { twelveHour: false, ...RANGE, ...options });
      try {
        assert.deepEqual(disabledTicks(picker.hoursView).sort((a, b) => a - b), hours, `hours at ${value}`);
        assert.deepEqual(disabledTicks(picker.minutesView), minutes, `minutes at ${value}`);
      } finally {
        picker.destroy();
      }
    }
    const { picker } = open('12:00', { twelveHour: false, ...RANGE });
    try {
      key(picker.inputHours, 'PageUp');
      assert.deepEqual(disabledTicks(picker.minutesView), [35, 40, 45, 50, 55]);
    } finally {
      picker.destroy();
    }
  });

  test('a pick on a disabled tick changes nothing', async () => {
    const selected = [];
    const { input, picker } = open('17:00', { twelveHour: false, ...RANGE, autoSubmit: true, onSelect: (h, m) => selected.push([h, m]) });
    try {
      pick(picker, 18);
      pick(picker, 8, true);
      assert.equal(picker.currentView, 'hours');
      picker.showView('minutes');
      pick(picker, 45);
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(shown(picker), '17:00');
      assert.equal(picker.currentView, 'minutes');
      assert.deepEqual(selected, []);
      assert.equal(input.value, '17:00');
    } finally {
      picker.destroy();
    }
  });

  test('an allowed pick still selects, and an hour pick clamps the minutes', () => {
    const selected = [];
    const { picker } = open('16:45', { twelveHour: false, ...RANGE, autoSubmit: false, onSelect: (h, m) => selected.push([h, m]) });
    try {
      pick(picker, 17);
      assert.equal(shown(picker), '17:30');
      assert.equal(picker.currentView, 'minutes');
      assert.deepEqual(selected, [[17, 30]]);
    } finally {
      picker.destroy();
    }
  });

  test('disabled ticks are dimmed, skip hover and use GrayText in forced colors', () => {
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    const rule = /\.timepicker-tick\.is-disabled\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    assert.match(rule, /color:\s*color-mix\(in oklab, var\(--md-sys-color-on-surface\) 38%, transparent\)/);
    assert.match(rule, /pointer-events:\s*none/);
    assert.match(css, /@media \(forced-colors: active\)\s*\{\s*\.timepicker-tick\.is-disabled\s*\{\s*color:\s*GrayText/);
  });
});
