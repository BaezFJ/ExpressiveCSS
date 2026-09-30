import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

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
