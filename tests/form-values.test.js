// Form values that drifted from what the component showed: a typed date the
// calendar would refuse, an initial value never selected, a form reset that
// left the old state behind, and a skipped question still marked wrong.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Expressive, resetBody, window } from './setup.js';

const sleep = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));
const type = (input, value) => {
  input.value = value;
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
};
const sameDay = (date, y, m, d) =>
  date instanceof Date && date.getFullYear() === y && date.getMonth() === m && date.getDate() === d;

describe('Form values', () => {
  beforeEach(resetBody);

  test('a typed date the calendar would refuse puts the input back to the chosen date', () => {
    document.body.innerHTML = '<input type="text" class="datepicker-input">';
    const input = document.querySelector('input');
    const dp = Expressive.Datepicker.init(input, {
      minDate: new Date(2026, 9, 10),
      disableWeekends: true,
      disableDayFn: (day) => day.getDate() === 13
    });
    try {
      type(input, '2026-10-14');
      assert.ok(sameDay(dp.date, 2026, 9, 14), 'an allowed day is taken');
      for (const [typed, why] of [['2026-10-01', 'before minDate'], ['2026-10-17', 'a weekend'], ['2026-10-13', 'refused by disableDayFn']]) {
        type(input, typed);
        assert.ok(sameDay(dp.date, 2026, 9, 14), `${why}: the selection stays`);
        assert.equal(input.value, dp.toString(dp.date), `${why}: the input shows the selection again`);
      }
    } finally {
      dp.destroy();
    }
  });

  test('a refused date typed into one of several multiple-selection inputs restores that input', () => {
    document.body.innerHTML = '<input type="text" name="day">';
    const dp = Expressive.Datepicker.init(document.querySelector('input'), { isMultipleSelection: true, disableWeekends: true });
    try {
      for (const day of [5, 6]) dp.setDate(new Date(2026, 9, day));
      dp.setInputValues();
      const second = dp.dateEls[1];
      type(second, '2026-10-17');
      assert.equal(second.value, dp.toString(dp.dates[1]), 'the input shows its own selected date again');
      assert.deepEqual(dp.dates.map((d) => d.getDate()), [5, 6], 'the selection is unchanged');
    } finally {
      dp.destroy();
    }
  });

  test('an initial input value is the selection, and its text is kept', () => {
    document.body.innerHTML = '<input type="text" value="2026-03-10"><input type="text" value="2026-03-14"><input type="text" value="2026-03-11">';
    const [allowed, weekend, several] = document.querySelectorAll('input');
    const first = Expressive.Datepicker.init(allowed);
    const second = Expressive.Datepicker.init(weekend, { disableWeekends: true });
    const third = Expressive.Datepicker.init(several, { isMultipleSelection: true });
    try {
      assert.ok(sameDay(first.date, 2026, 2, 10));
      assert.equal(allowed.value, '2026-03-10');
      assert.equal(second.date, undefined, 'a disabled day is shown but not selected');
      assert.equal(third.dates.length, 1, 'a multiple selection starts from the value too');
      assert.ok(sameDay(third.dates[0], 2026, 2, 11));
      assert.equal(several.value, '2026-03-11');
    } finally {
      first.destroy();
      second.destroy();
      third.destroy();
    }
  });

  test('a form reset returns a Datepicker to the reset values', async () => {
    document.body.innerHTML = `<form>
      <input type="text" id="single" value="2026-10-14">
      <input type="text" id="multi" name="day">
    </form>`;
    const form = document.querySelector('form');
    const single = Expressive.Datepicker.init(document.getElementById('single'));
    const multi = Expressive.Datepicker.init(document.getElementById('multi'), { isMultipleSelection: true });
    try {
      type(document.getElementById('single'), '2026-10-20');
      assert.ok(sameDay(single.date, 2026, 9, 20));
      for (const day of [5, 6, 7]) multi.setDate(new Date(2026, 9, day));
      multi.setInputValues();
      assert.equal(form.querySelectorAll('input[name="day"]').length, 3);

      form.reset();
      await sleep();
      assert.ok(sameDay(single.date, 2026, 9, 14), 'the single picker reads the reset value back');
      assert.equal(form.querySelectorAll('input[name="day"]').length, 1, 'the inputs added for extra dates are gone');
      assert.deepEqual(multi.dates, []);
      assert.equal(multi.calendarEl.querySelectorAll('.is-selected').length, 0, 'no day is drawn selected');
    } finally {
      single.destroy();
      multi.destroy();
    }
  });

  test('a form reset keeps a multiple selection whose input resets to a date', async () => {
    document.body.innerHTML = '<form><input type="text" name="day" value="2026-10-14"></form>';
    const form = document.querySelector('form');
    const dp = Expressive.Datepicker.init(form.querySelector('input'), { isMultipleSelection: true, setDefaultDate: true });
    try {
      for (const day of [5, 6]) dp.setDate(new Date(2026, 9, day));
      dp.setInputValues();
      assert.equal(form.querySelectorAll('input').length, 3);
      form.reset();
      await sleep();
      assert.equal(form.querySelectorAll('input').length, 1);
      assert.equal(form.querySelector('input').value, '2026-10-14');
      assert.equal(dp.dates.length, 1, 'the reset value is the selection');
      assert.ok(sameDay(dp.dates[0], 2026, 9, 14));
      dp.setInputValues();
      assert.equal(form.querySelector('input').value, dp.toString(dp.dates[0]), 'confirming keeps the date');
    } finally {
      dp.destroy();
    }
  });

  test('a day-first multiple selection reads its reset value as the date it wrote', async () => {
    document.body.innerHTML = '<form><input type="text" name="day" value="05/10/2026"></form>';
    const form = document.querySelector('form');
    const dp = Expressive.Datepicker.init(form.querySelector('input'), {
      isMultipleSelection: true,
      format: 'dd/mm/yyyy',
      defaultDate: new Date(2026, 9, 5),
      setDefaultDate: true
    });
    try {
      for (const day of [6, 7]) dp.setDate(new Date(2026, 9, day));
      dp.setInputValues();
      form.reset();
      await sleep();
      assert.equal(dp.dates.length, 1);
      assert.ok(sameDay(dp.dates[0], 2026, 9, 5), '5 October, not 10 May');
      dp.setInputValues();
      assert.equal(form.querySelector('input').value, '05/10/2026');
    } finally {
      dp.destroy();
    }
  });

  for (const isMultipleSelection of [false, true]) {
    test(`a day-first reset default keeps its date after another date was confirmed (${isMultipleSelection ? 'multiple' : 'single'})`, async () => {
      document.body.innerHTML = '<form><input type="text" name="day" value="05/10/2026"></form>';
      const form = document.querySelector('form');
      const dp = Expressive.Datepicker.init(form.querySelector('input'), {
        isMultipleSelection,
        format: 'dd/mm/yyyy',
        defaultDate: new Date(2026, 9, 5),
        setDefaultDate: true
      });
      try {
        dp.setDate(new Date(2026, 9, 1));
        dp.setInputValues();
        assert.equal(form.querySelector('input').value, '01/10/2026', 'the confirmed date is written first');
        form.reset();
        await sleep();
        const selected = isMultipleSelection ? dp.dates : [dp.date];
        assert.equal(selected.length, 1);
        assert.ok(sameDay(selected[0], 2026, 9, 5), '5 October, not 10 May');
        dp.setInputValues();
        assert.equal(form.querySelector('input').value, '05/10/2026');
      } finally {
        dp.destroy();
      }
    });
  }

  test('a multiple-selection reset refreshes a native date input overlay', async () => {
    document.body.innerHTML = '<form><input type="date" id="set" value="2026-10-14"><input type="date" id="empty"></form>';
    const form = document.querySelector('form');
    const set = document.getElementById('set');
    const empty = document.getElementById('empty');
    const withDefault = Expressive.Datepicker.init(set, { isMultipleSelection: true, setDefaultDate: true });
    const withoutDefault = Expressive.Datepicker.init(empty, { isMultipleSelection: true });
    try {
      for (const dp of [withDefault, withoutDefault]) {
        dp.setDate(new Date(2026, 9, 5));
        dp.setInputValues();
      }
      assert.equal(set.getAttribute('data-date'), withDefault.toString(new Date(2026, 9, 5)));
      form.reset();
      await sleep();
      assert.equal(set.value, '2026-10-14');
      assert.equal(set.getAttribute('data-date'), withDefault.toString(new Date(2026, 9, 14)), 'the overlay shows the reset date');
      assert.equal(empty.getAttribute('data-date'), '', 'an empty reset clears the overlay');
    } finally {
      withDefault.destroy();
      withoutDefault.destroy();
    }
  });

  test('a form reset moves a Slider back to the reset value', async () => {
    document.body.innerHTML = '<form><p class="range-field"><input type="range" min="0" max="100" value="20"></p></form>';
    const input = document.querySelector('input');
    const slider = Expressive.Slider.getInstance(input) ?? Expressive.Slider.init(input);
    try {
      input.value = '80';
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
      assert.equal(slider.value.textContent, '80');
      document.querySelector('form').reset();
      await sleep();
      assert.equal(slider.value.textContent, '20');
      assert.equal(input.style.getPropertyValue('--md-comp-slider-active-fraction'), '20%');
    } finally {
      slider.destroy();
    }
  });

  test('data-save keeps passwords and hidden inputs out of storage', (t) => {
    t.after(() => { window.localStorage.clear(); delete globalThis.localStorage; });
    globalThis.localStorage = window.localStorage;
    const markup = (ref) => `<form class="questionnaire no-autoinit" data-save="signup">
      <fieldset><legend>Account</legend>
        <input type="email" name="email" aria-label="Email">
        <input type="password" name="password" aria-label="Password">
        <input type="hidden" name="ref" value="${ref}"></fieldset>
      <footer><button type="button" value="next">Next</button><button type="submit">Send</button></footer>
    </form>`;
    document.body.innerHTML = markup('user-a');
    let survey = Expressive.Questionnaire.init(document.querySelector('form'));
    const form = document.querySelector('form');
    form.elements.email.value = 'a@example.test';
    form.elements.password.value = 'dummy-secret';
    form.elements.password.dispatchEvent(new window.Event('change', { bubbles: true }));
    survey.destroy();
    assert.deepEqual(JSON.parse(localStorage.getItem('questionnaire:signup')).answers, ['a@example.test']);

    document.body.innerHTML = markup('user-b');
    survey = Expressive.Questionnaire.init(document.querySelector('form'));
    try {
      const restored = document.querySelector('form').elements;
      assert.equal(restored.email.value, 'a@example.test');
      assert.equal(restored.password.value, '');
      assert.equal(restored.ref.value, 'user-b');
    } finally {
      survey.destroy();
    }
  });

  test('skipping a question clears its error', () => {
    document.body.innerHTML = `<form class="questionnaire">
      <fieldset><legend>Email</legend><input type="email" name="email"></fieldset>
      <fieldset><legend>Notes</legend><input type="text" name="notes"></fieldset>
      <footer>
        <button type="button" value="previous">Back</button>
        <button type="button" value="skip">Skip</button>
        <button type="button" value="next">Next</button>
      </footer>
    </form>`;
    const form = document.querySelector('form');
    const survey = Expressive.Questionnaire.getInstance(form) ?? Expressive.Questionnaire.init(form);
    const [first] = form.querySelectorAll('fieldset');
    try {
      first.querySelector('input').value = 'abc';
      survey.next();
      assert.equal(first.classList.contains('invalid'), true, 'the bad answer is reported');
      survey.skip();
      survey.previous();
      assert.equal(first.querySelector('input').value, '');
      assert.equal(first.classList.contains('invalid'), false, 'the skipped question is not marked wrong');
      assert.equal(first.querySelector('input').hasAttribute('aria-invalid'), false);
      assert.equal(first.querySelector('.questionnaire-error'), null, 'the generated message is gone');
    } finally {
      survey.destroy();
    }
  });
});
