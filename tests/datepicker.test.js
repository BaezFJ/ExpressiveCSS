import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

const days = dates => dates.map(date => date.getDate());

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
