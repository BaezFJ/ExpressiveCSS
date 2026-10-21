// With a lang on or around the input, Datepicker takes that language's month
// and weekday names and first day of the week from Intl, and Timepicker its
// 12- or 24-hour clock. Options the page passes still win.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Expressive, resetBody } from './setup.js';

const field = (lang) => {
  document.body.innerHTML = `<div${lang ? ` lang="${lang}"` : ''}><input id="field"></div>`;
  return document.getElementById('field');
};
const headers = (picker) => [...picker.calendarEl.querySelectorAll('thead abbr')].map((abbr) => abbr.title);

beforeEach(resetBody);

test('a German page gets German names and weeks that start on Monday', () => {
  const picker = Expressive.Datepicker.init(field('de'));
  try {
    assert.equal(picker.options.i18n.months[2], 'März');
    const short = new Intl.DateTimeFormat('de', { month: 'short', timeZone: 'UTC' }).format(Date.UTC(2023, 2, 1));
    assert.equal(picker.options.i18n.monthsShort[2], short);
    assert.equal(picker.options.firstDay, 1);
    assert.deepEqual(headers(picker).slice(0, 2), ['Montag', 'Dienstag']);
    assert.equal(picker.options.i18n.done, 'Ok', 'the button words are not dates, so they stay');
  } finally {
    picker.destroy();
  }
});

test('names and a first day the page passes win over the language', () => {
  const picker = Expressive.Datepicker.init(field('de'), { firstDay: 0, i18n: { months: Array(12).fill('M') } });
  try {
    assert.equal(picker.options.i18n.months[2], 'M');
    assert.equal(picker.options.i18n.weekdays[1], 'Montag', 'names the page left out still follow the language');
    assert.equal(picker.options.firstDay, 0);
  } finally {
    picker.destroy();
  }
});

test('without a lang, or with one the browser does not know, the English defaults stay', () => {
  for (const lang of [null, 'not a language']) {
    document.documentElement.removeAttribute('lang');
    const picker = Expressive.Datepicker.init(field(lang));
    try {
      assert.equal(picker.options.i18n.months[2], 'March');
      assert.equal(picker.options.firstDay, 0);
    } finally {
      picker.destroy();
    }
  }
});

test('Timepicker follows the language clock unless the page sets one', () => {
  const clock = (lang, options) => {
    const picker = Expressive.Timepicker.init(field(lang), options);
    try {
      return picker.options.twelveHour;
    } finally {
      picker.destroy();
    }
  };
  assert.equal(clock('de'), false);
  assert.equal(clock('en-US'), true);
  assert.equal(clock('de', { twelveHour: true }), true);
});

test('a language with another calendar still gets Gregorian month names', () => {
  const picker = Expressive.Datepicker.init(field('fa'));
  try {
    const january = new Intl.DateTimeFormat('fa', { month: 'long', calendar: 'gregory', timeZone: 'UTC' }).format(Date.UTC(2023, 0, 1));
    assert.equal(picker.options.i18n.months[0], january);
  } finally {
    picker.destroy();
  }
});

test('a date written with German names reads back, when set up again and when edited', () => {
  const input = field('de');
  let picker = Expressive.Datepicker.init(input);
  picker.setDate(new Date(2026, 2, 15));
  picker.setInputValues();
  const written = input.value;
  assert.match(written, /^M.r 15, 2026$/u);
  picker.destroy();

  picker = Expressive.Datepicker.init(input);
  try {
    assert.equal(picker.date?.toDateString(), new Date(2026, 2, 15).toDateString(), 'set up again from the written value');
    input.value = picker.toString(new Date(2026, 9, 2));
    picker.setDateFromInput(input);
    assert.equal(picker.date?.toDateString(), new Date(2026, 9, 2).toDateString(), 'an edit in the same format');
  } finally {
    picker.destroy();
  }
});

test('a day/month format reads the day first, and a day the month lacks is refused', () => {
  const input = field();
  const picker = Expressive.Datepicker.init(input, { format: 'dd/mm/yyyy' });
  try {
    input.value = '05/10/2026';
    picker.setDateFromInput(input);
    assert.equal(picker.date?.toDateString(), new Date(2026, 9, 5).toDateString());
    input.value = '31/02/2026';
    picker.setDateFromInput(input);
    assert.equal(picker.date?.toDateString(), new Date(2026, 9, 5).toDateString(), 'an impossible date leaves the selection');
  } finally {
    picker.destroy();
  }
});

test('inside a shadow root the pickers take the host page language, and a nearer lang wins', () => {
  document.body.innerHTML = '<div lang="de"><div id="host"></div></div>';
  const root = document.getElementById('host').attachShadow({ mode: 'open' });
  root.innerHTML = '<div><input id="date"></div><div><input id="time"></div><div lang="en-US"><div><input id="near"></div></div>';
  const date = Expressive.Datepicker.init(root.getElementById('date'));
  const time = Expressive.Timepicker.init(root.getElementById('time'));
  const near = Expressive.Timepicker.init(root.getElementById('near'));
  try {
    assert.equal(date.options.i18n.months[2], 'März');
    assert.equal(date.options.firstDay, 1);
    assert.equal(time.options.twelveHour, false);
    assert.equal(near.options.twelveHour, true);
  } finally {
    [date, time, near].forEach((picker) => picker.destroy());
  }
});

test('on a 24-hour clock a written AM or PM still sets the hour', () => {
  for (const [written, expected] of [['03:30 PM', '15:30'], ['12:30 AM', '00:30'], ['12:15 PM', '12:15']]) {
    const input = field('de');
    input.value = written;
    const picker = Expressive.Timepicker.init(input);
    try {
      picker.done();
      assert.equal(input.value, expected, written);
    } finally {
      picker.destroy();
    }
  }
});

test('two-digit years read as Date.parse reads them, on setup and after writing', () => {
  const input = field();
  input.value = '01/15/99';
  let picker = Expressive.Datepicker.init(input, { format: 'mm/dd/yy' });
  assert.equal(picker.date?.getFullYear(), 1999);
  picker.setInputValues();
  picker.destroy();
  picker = Expressive.Datepicker.init(input, { format: 'mm/dd/yy' });
  try {
    assert.equal(picker.date?.getFullYear(), 1999, 'set up again from the value it wrote');
    input.value = '01/15/26';
    picker.setDateFromInput(input);
    assert.equal(picker.date?.getFullYear(), 2026);
  } finally {
    picker.destroy();
  }
});

test('a four-digit year below 100 keeps its century', () => {
  const input = field();
  input.value = '0099-01-02';
  const picker = Expressive.Datepicker.init(input, { format: 'yyyy-mm-dd', yearRange: [1, 3000] });
  try {
    assert.equal(picker.date?.getFullYear(), 99);
  } finally {
    picker.destroy();
  }
});

test('a native date input reads its ISO value whatever the display format', () => {
  document.body.innerHTML = '<div><input type="date" id="native" value="2026-05-10"></div>';
  const picker = Expressive.Datepicker.init(document.getElementById('native'), { format: 'yyyy-dd-mm' });
  try {
    assert.equal(picker.date?.toDateString(), new Date(2026, 4, 10).toDateString());
  } finally {
    picker.destroy();
  }
});
