import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Expressive, resetBody, window } from './setup.js';

const days = dates => dates.map(date => date.getDate());

test('year ranges cannot stall rendering and keep valid bounds and ordering', () => {
  // A subprocess makes a stalled synchronous loop fail without hanging the suite.
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { Expressive, resetBody } from ${JSON.stringify(new URL('./setup.js', import.meta.url).href)};
    document.body.innerHTML = '<input>';
    const picker = Expressive.Datepicker.init(document.querySelector('input'), {
      minDate: new Date(2010, 0, 1), maxDate: new Date(2040, 11, 31)
    });
    const sequence = (first, last) => Array.from({ length: last - first + 1 }, (_, i) => first + i);
    const fallback = sequence(2016, 2036);
    try {
      for (const [range, expected] of [
        [1e20, fallback], [Infinity, fallback], [-Infinity, fallback], [NaN, fallback],
        [-1, fallback], [1.5, fallback], [[], fallback], [[2020], fallback],
        [[2020, Infinity], fallback], [[-1e20, 1e20], fallback],
        [['2020', '2030'], fallback], [[2020, 2025, 2030], fallback],
        [0, [2026]], [2, sequence(2024, 2028)], [[2024, 2028], sequence(2024, 2028)],
        [[2028, 2024], []], [1e8, sequence(2010, 2040)],
        [[-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER], sequence(2010, 2040)]
      ]) {
        picker.options.yearRange = range;
        for (const reverse of [false, true]) {
          picker.options.yearRangeReverse = reverse;
          const host = document.createElement('div');
          host.innerHTML = picker.renderTitle(picker, 0, 2026, 0, 2026, 'title');
          assert.deepEqual([...host.querySelectorAll('.orig-select-year option')].map(el => Number(el.value)),
            reverse ? [...expected].reverse() : expected, String(range));
        }
      }
    } finally { picker.destroy(); resetBody(); }
    for (const range of ['1e20', '1e309', '-1e309']) {
      document.body.innerHTML = '<input class="date-picker" value="2026-01-01">';
      const input = document.querySelector('input');
      input.setAttribute('data-datepicker-options', '{"yearRange":' + range + '}');
      try {
        Expressive.AutoInit();
        assert.equal(Expressive.Datepicker.getInstance(input).calendarEl.querySelectorAll('.orig-select-year option').length, 21);
      } finally { Expressive.Datepicker.getInstance(input)?.destroy(); resetBody(); }
    }
  `], { encoding: 'utf8', timeout: 10000 });
  assert.equal(run.error, undefined, `year-range subprocess failed: ${run.error}\n${run.stderr}`);
  assert.equal(run.status, 0, run.stderr);
});

test('multiple dates sort in engines that only move on a positive comparison', () => {
  resetBody();
  document.body.innerHTML = '<div><input></div>';
  const picker = Expressive.Datepicker.init(document.querySelector('input'), { isMultipleSelection: true });
  const sort = Array.prototype.sort;
  // A bubble sort that swaps only on a positive result, as Firefox's merge
  // sort keeps the order of a pair the comparator calls equal.
  Array.prototype.sort = function (compare) {
    for (let i = 0; i < this.length; i++) {
      for (let j = 0; j < this.length - 1 - i; j++) {
        if (compare(this[j], this[j + 1]) > 0) [this[j], this[j + 1]] = [this[j + 1], this[j]];
      }
    }
    return this;
  };
  try {
    picker.setMultiDate(new Date(2026, 9, 20));
    picker.setMultiDate(new Date(2026, 9, 5));
  } finally {
    Array.prototype.sort = sort;
    picker.destroy();
  }
  assert.deepEqual(days(picker.dates), [5, 20]);
});

test('with nothing selected, today holds the calendar tab stop', () => {
  resetBody();
  document.body.innerHTML = '<div><input></div>';
  mock.timers.enable({ apis: ['Date'], now: new Date(2026, 9, 17, 15, 30) });
  let picker;
  try {
    picker = Expressive.Datepicker.init(document.querySelector('input'));
    const stop = picker.calendarEl.querySelector('.datepicker-day-button[tabindex="0"]');
    assert.equal(stop.dataset.day, '17');
  } finally {
    picker?.destroy();
    mock.timers.reset();
  }
});

for (const via of ['input', 'menu']) {
  test(`choosing a year from the ${via} keeps focus on the year select`, () => {
    resetBody();
    document.body.innerHTML = '<div><input></div>';
    // Open: a hidden calendar cannot hold focus.
    const picker = Expressive.Datepicker.init(document.querySelector('input'), { defaultDate: new Date(2026, 9, 17), openByDefault: true });
    const yearSelect = () => Expressive.FormSelect.getInstance(picker.calendarEl.querySelector('.orig-select-year'));
    try {
      const old = yearSelect();
      if (via === 'input') {
        old.input.focus();
        assert.equal(document.activeElement, old.input);
        old.el.value = '2027';
        old.el.dispatchEvent(new window.Event('change', { bubbles: true }));
      } else {
        const option = old._values.find(value => value.el.value === '2027').optionEl;
        old.menu.open();
        option.focus();
        assert.equal(document.activeElement, option);
        old._selectOptionElement(option);
      }
      assert.equal(picker.calendars[0].year, 2027);
      assert.notEqual(yearSelect(), old, 'the year controls were rebuilt');
      assert.equal(document.activeElement, yearSelect().input);
    } finally {
      picker.destroy();
      resetBody();
    }
  });
}

test('destroy removes the native date input overlay', () => {
  resetBody();
  document.body.innerHTML = '<div><input type="date"></div>';
  const input = document.querySelector('input');
  const picker = Expressive.Datepicker.init(input, { defaultDate: new Date(2026, 9, 17), setDefaultDate: true });
  assert.ok(input.classList.contains('datepicker-date-input'));
  assert.ok(input.getAttribute('data-date'));
  picker.destroy();
  assert.ok(!input.classList.contains('datepicker-date-input'));
  assert.ok(!input.hasAttribute('data-date'));
  assert.equal(input.value, '2026-10-17', 'the value stays');
});

test('minDate and maxDate options are not mutated', () => {
  resetBody();
  document.body.innerHTML = '<div><input></div>';
  const minDate = new Date(2026, 9, 5, 15);
  const maxDate = new Date(2026, 9, 25, 15);
  const picker = Expressive.Datepicker.init(document.querySelector('input'), { minDate, maxDate });
  try {
    assert.equal(minDate.getHours(), 15);
    assert.equal(maxDate.getHours(), 15);
    assert.equal(picker.options.minDate.getHours(), 0);
    assert.equal(picker.options.maxDate.getDate(), 25);
  } finally {
    picker.destroy();
  }
});

test('the calendar opens inside minDate and maxDate', () => {
  const opensOn = (options, value = '') => {
    resetBody();
    document.body.innerHTML = '<div><input></div>';
    const input = document.querySelector('input');
    input.value = value;
    const picker = Expressive.Datepicker.init(input, options);
    try {
      picker.draw();
      const years = picker.calendarEl.querySelectorAll('.orig-select-year option').length;
      assert.ok(years > 0, 'the year list has a year to pick');
      return [picker.calendars[0].year, picker.calendars[0].month];
    } finally {
      picker.destroy();
      resetBody();
    }
  };
  assert.deepEqual(opensOn({ maxDate: new Date(2008, 5, 1) }), [2008, 5], 'no starting date, maxDate in the past');
  assert.deepEqual(opensOn({ minDate: new Date(2099, 2, 10) }), [2099, 2], 'no starting date, minDate in the future');
  assert.deepEqual(opensOn({ maxDate: new Date(2008, 5, 1), defaultDate: new Date(2020, 0, 1) }), [2008, 5], 'a default date after maxDate');
  assert.deepEqual(opensOn({ minDate: new Date(2099, 2, 10), defaultDate: new Date(2020, 0, 1) }), [2099, 2], 'a default date before minDate');
  assert.deepEqual(opensOn({ maxDate: new Date(2008, 5, 1), defaultDate: new Date(2007, 3, 1) }), [2007, 3], 'a default date in range stays');
});

test('minDate and maxDate bound the month arrows and the year list', () => {
  resetBody();
  document.body.innerHTML = '<div><input></div>';
  const picker = Expressive.Datepicker.init(document.querySelector('input'), {
    minDate: new Date(2026, 9, 5), maxDate: new Date(2026, 9, 25), defaultDate: new Date(2026, 9, 10), setDefaultDate: true
  });
  try {
    picker.draw();
    const arrow = (name) => picker.calendarEl.querySelector(`.month-${name}`).classList.contains('is-disabled');
    assert.equal(arrow('prev'), true, 'no month before minDate');
    assert.equal(arrow('next'), true, 'no month after maxDate');
    const years = [...picker.calendarEl.querySelectorAll('.orig-select-year option')].map((option) => option.value);
    assert.deepEqual(years, ['2026']);
    // A click on a disabled arrow's icon does not page either.
    picker.calendarEl.querySelector('.month-prev svg').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(picker.calendars[0].month, 9);
  } finally {
    picker.destroy();
  }
});

test('re-reading the date an input already shows does not fire onSelect', () => {
  resetBody();
  document.body.innerHTML = '<div><input></div>';
  const input = document.querySelector('input');
  const selected = [];
  const picker = Expressive.Datepicker.init(input, {
    format: 'yyyy-mm-dd', defaultDate: new Date(2026, 9, 10), setDefaultDate: true, onSelect: (date) => selected.push(date.getDate())
  });
  try {
    input.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    assert.deepEqual(selected, [], 'a click and Enter on the shown date select nothing');
    input.value = '2026-10-12';
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.deepEqual(selected, [12], 'a typed new date still selects');
  } finally {
    picker.destroy();
  }
});

test('a date typed into a multiple selection stays selected', () => {
  resetBody();
  document.body.innerHTML = '<div><input></div>';
  const input = document.querySelector('input');
  const picker = Expressive.Datepicker.init(input, { isMultipleSelection: true, format: 'yyyy-mm-dd' });
  const day = value => picker.calendarEl.querySelector(`.datepicker-day-button[data-day="${value}"]`);
  try {
    input.value = '2026-10-14';
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.deepEqual(days(picker.dates), [14]);
    input.click();
    assert.deepEqual(days(picker.dates), [14], 'reading the input again keeps it once');
    day(20).click();
    assert.deepEqual(days(picker.dates), [14, 20]);
    picker.setInputValues();
    input.value = '2026-10-16';
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.deepEqual(days(picker.dates), [16, 20], 'the typed date replaces the one its input showed');
  } finally {
    picker.destroy();
    resetBody();
  }
});
