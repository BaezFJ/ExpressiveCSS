// Timepicker `minTime` and `maxTime`: the bounds, clamping, the fields, the
// AM/PM buttons and the dial. The roadmap check in real engines is in
// timepicker-time-range-browser.test.js.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

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
