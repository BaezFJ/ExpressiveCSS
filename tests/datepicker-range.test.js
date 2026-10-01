import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

for (const generatedEnd of [false, true]) {
  test(`range confirmation emits changes from each ${generatedEnd ? 'generated' : 'authored'} input`, () => {
    resetBody();
    document.body.innerHTML = `<form><input id="start">${generatedEnd ? '' : '<input id="end">'}</form>`;
    const form = document.querySelector('form');
    const start = document.getElementById('start');
    let selections = 0;
    const picker = Expressive.Datepicker.init(start, {
      isDateRange: true, dateRangeEndEl: generatedEnd ? null : '#end', format: 'yyyy-mm-dd',
      defaultDate: new Date(2026, 8, 20), setDefaultDate: true,
      defaultEndDate: new Date(2026, 8, 25), setDefaultEndDate: true,
      onSelect: () => selections++
    });
    const end = picker.endDateEl;
    const fieldEvents = [];
    const formEvents = [];
    const onFieldChange = event => fieldEvents.push(event);
    const onFormChange = event => formEvents.push(event);
    start.addEventListener('change', onFieldChange);
    end.addEventListener('change', onFieldChange);
    form.addEventListener('change', onFormChange);
    try {
      picker._confirm();
      assert.deepEqual(fieldEvents.map(event => [start, end].indexOf(event.target)), [0, 1]);
      assert.deepEqual(formEvents.map(event => [start, end].indexOf(event.target)), [0, 1]);
      for (const event of formEvents) {
        assert.equal(event.detail.firedBy, picker);
        assert.equal(event.bubbles, true);
        assert.equal(event.composed, true);
        assert.equal(event.cancelable, true);
      }
      assert.equal(selections, 0, 'generated changes must not re-enter selection');
    } finally {
      start.removeEventListener('change', onFieldChange);
      end.removeEventListener('change', onFieldChange);
      form.removeEventListener('change', onFormChange);
      picker.destroy();
      resetBody();
    }
  });
}

test('same-day ranges compare calendar dates without mutating a custom parser result', () => {
  resetBody();
  document.body.innerHTML = '<div><input id="start"><input id="end"></div>';
  const start = document.getElementById('start');
  const parsedDate = new Date(2026, 8, 25, 12);
  const picker = Expressive.Datepicker.init(start, {
    isDateRange: true, dateRangeEndEl: '#end', format: 'yyyy-mm-dd',
    defaultDate: new Date(2026, 8, 20), setDefaultDate: true,
    defaultEndDate: new Date(2026, 8, 25), setDefaultEndDate: true,
    parse: () => parsedDate
  });
  try {
    start.value = '2026-09-25';
    start.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(picker.date.getTime(), picker.endDate.getTime());
    assert.equal(picker.date.getHours(), 0);
    assert.equal(parsedDate.getHours(), 12, 'the parser owns its returned Date');
  } finally {
    picker.destroy();
    resetBody();
  }
});

for (const interaction of ['change', 'click', 'Enter']) {
  for (const endpoint of ['start', 'end']) {
    test(`date ranges reject a reversed ${endpoint} date on ${interaction}`, () => {
      resetBody();
      document.body.innerHTML = '<div><input id="start"><input id="end"></div>';
      const start = document.getElementById('start');
      const end = document.getElementById('end');
      const input = endpoint === 'start' ? start : end;
      const picker = Expressive.Datepicker.init(start, {
        isDateRange: true, dateRangeEndEl: '#end', format: 'yyyy-mm-dd',
        defaultDate: new Date(2026, 8, 20), setDefaultDate: true,
        defaultEndDate: new Date(2026, 8, 25), setDefaultEndDate: true,
        autoSubmit: false
      });
      const apply = () => input.dispatchEvent(interaction === 'Enter'
        ? new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
        : new window.Event(interaction, { bubbles: true }));
      try {
        input.focus();
        input.value = endpoint === 'start' ? '2026-09-30' : '2026-09-01';
        apply(); // Enter and click deliberately run before any change/blur event.
        assert.equal(picker.date.getTime(), new Date(2026, 8, 20).getTime());
        assert.equal(picker.endDate.getTime(), new Date(2026, 8, 25).getTime());
        picker._confirm();
        assert.equal(start.value, '2026-09-20');
        assert.equal(end.value, '2026-09-25');

        input.value = endpoint === 'start' ? '2026-09-18' : '2026-09-27';
        apply();
        picker._confirm();
        assert.equal(input.value, endpoint === 'start' ? '2026-09-18' : '2026-09-27');
        assert.ok(picker.date <= picker.endDate);

        input.value = endpoint === 'start' ? end.value : start.value;
        apply();
        assert.equal(picker.date.getTime(), picker.endDate.getTime(), 'same-day ranges remain valid');
      } finally {
        picker.destroy();
        resetBody();
      }
    });
  }
}

for (const interaction of ['change', 'click', 'Enter']) {
  test(`native range overlays follow accepted, rejected, and cleared dates on ${interaction}`, () => {
    resetBody();
    document.body.innerHTML = '<div><input id="start" type="date"><input id="end" type="date"></div>';
    const start = document.getElementById('start');
    const end = document.getElementById('end');
    const picker = Expressive.Datepicker.init(start, {
      isDateRange: true, dateRangeEndEl: '#end', autoSubmit: false,
      defaultDate: new Date(2026, 8, 20), setDefaultDate: true,
      defaultEndDate: new Date(2026, 8, 25), setDefaultEndDate: true
    });
    const edit = (input, value) => {
      input.value = value;
      input.dispatchEvent(interaction === 'Enter'
        ? new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
        : new window.Event(interaction, { bubbles: true, cancelable: true }));
    };
    try {
      edit(start, '2026-09-18');
      assert.equal(start.getAttribute('data-date'), 'Sep 18, 2026');
      assert.equal(picker.date.getDate(), 18);
      edit(end, '2026-09-27');
      assert.equal(end.getAttribute('data-date'), 'Sep 27, 2026');
      assert.equal(picker.endDate.getDate(), 27);

      edit(start, '2026-09-30');
      assert.equal(start.value, '2026-09-18');
      assert.equal(start.getAttribute('data-date'), 'Sep 18, 2026');
      edit(end, '2026-09-01');
      assert.equal(end.value, '2026-09-27');
      assert.equal(end.getAttribute('data-date'), 'Sep 27, 2026');

      edit(start, '');
      assert.equal(start.getAttribute('data-date'), '');
      assert.equal(picker.date, null);
      edit(end, '2026-09-28');
      assert.equal(end.getAttribute('data-date'), 'Sep 28, 2026');
      assert.equal(picker.endDate.getDate(), 28, 'an end-first range remains supported');
      edit(end, '');
      assert.equal(end.getAttribute('data-date'), '');
      assert.equal(picker.endDate, null);
      picker._confirm();
      assert.equal(start.value, '');
      assert.equal(end.value, '');
    } finally {
      picker.destroy();
      resetBody();
    }
  });
}

for (const opening of ['click', 'Enter']) {
  test(`date ranges can start with the end date and reopen by ${opening}`, () => {
    resetBody();
    document.body.innerHTML = '<div><input id="start" type="date"><input id="end" type="date"></div>';
    const start = document.getElementById('start');
    const end = document.getElementById('end');
    const picker = Expressive.Datepicker.init(start, {
      isDateRange: true, dateRangeEndEl: '#end', openByDefault: true,
      defaultDate: new Date(2026, 8, 1), format: 'yyyy-mm-dd',
    });
    const errors = [];
    const onError = event => { errors.push(event.error); event.preventDefault(); };
    window.addEventListener('error', onError);
    const edit = (input, value) => {
      input.value = value;
      input.dispatchEvent(new window.Event('change', { bubbles: true }));
    };
    const open = input => input.dispatchEvent(opening === 'click'
      ? new window.MouseEvent('click', { bubbles: true })
      : new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }));
    const shadedDays = () => [...picker.calendarEl.querySelectorAll('.is-daterange')]
      .map(day => Number(day.dataset.day));
    try {
      edit(end, '2026-09-20');
      open(end);
      assert.deepEqual(errors, [], 'an incomplete range must not throw when reopened');
      assert.ok(!picker.date);
      assert.equal(picker.endDate.getDate(), 20);
      assert.equal(start.value, '');
      assert.equal(end.value, '2026-09-20');
      assert.deepEqual(shadedDays(), []);

      edit(start, '2026-09-10');
      assert.deepEqual(shadedDays(), [11, 12, 13, 14, 15, 16, 17, 18, 19]);
      picker.setInputValues();
      edit(start, '');
      assert.ok(!picker.date, 'clearing the start input must clear the selected start');
      assert.equal(start.getAttribute('data-date'), '');
      open(end);
      assert.deepEqual(errors, []);
      assert.deepEqual(shadedDays(), []);
      assert.equal(picker.endDate.getDate(), 20);
      assert.equal(end.value, '2026-09-20');

      edit(start, '2026-09-12');
      assert.deepEqual(shadedDays(), [13, 14, 15, 16, 17, 18, 19]);
      edit(end, '');
      assert.ok(!picker.endDate, 'clearing the end input must clear the selected end');
      assert.equal(end.getAttribute('data-date'), '');
      open(start);
      assert.deepEqual(errors, []);
      assert.deepEqual(shadedDays(), []);
      assert.equal(picker.date.getDate(), 12);
      assert.equal(start.value, '2026-09-12');

      edit(end, '2026-09-15');
      assert.deepEqual(shadedDays(), [13, 14]);
      assert.equal(picker.calendarEl.querySelectorAll('.is-selected').length, 2);
    } finally {
      picker.destroy();
      window.removeEventListener('error', onError);
      resetBody();
    }
  });
}
