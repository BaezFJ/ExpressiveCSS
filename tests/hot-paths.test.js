// How much work a component does per event.
//
// These are not micro-benchmarks - they assert the shape of the work: how many
// times layout is read per scroll tick, how many timers a toast arms, whether
// a scroll handler coalesces onto a frame. Those are the properties that
// regress silently, because doing them the expensive way still looks correct.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { LibrePOS, resetBody, window } from './setup.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const nextFrames = (n) =>
  new Promise((resolve) => {
    const step = (left) => (left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
    step(n);
  });

/** jsdom has no layout, so give the element a rect and count who asks for it. */
function stubRect(el, counter, rect = { top: 0, left: 0, width: 100, height: 100 }) {
  el.getBoundingClientRect = () => {
    counter.reads++;
    return { ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height };
  };
}

describe('layout reads per scroll tick', () => {
  beforeEach(resetBody);

  test('ScrollSpy reads one rect per spied element', () => {
    document.body.innerHTML = `
      <div id="s1" class="scrollspy">one</div>
      <div id="s2" class="scrollspy">two</div>
      <a href="#s1">to one</a>
      <a href="#s2">to two</a>`;
    const sections = [...document.querySelectorAll('.scrollspy')];
    const counter = { reads: 0 };
    sections.forEach((el) => stubRect(el, counter));

    const spies = sections.map((el) => LibrePOS.ScrollSpy.init(el));
    counter.reads = 0; // ignore construction

    window.dispatchEvent(new window.Event('scroll'));

    // Previously five per element: a height check, two _offset() calls that
    // each built their own rect, then width and height again.
    assert.ok(
      counter.reads <= sections.length,
      `expected at most ${sections.length} rect reads, got ${counter.reads}`
    );

    spies.forEach((spy) => spy.destroy());
  });

  test('Parallax coalesces a burst of scroll events onto one frame', async () => {
    document.body.innerHTML = `<div class="parallax-container"><div class="parallax"><img src="http://localhost/1.jpg"></div></div>`;
    const instance = LibrePOS.Parallax.init(document.querySelector('.parallax'));

    const original = LibrePOS.Parallax._handleScroll;
    let runs = 0;
    LibrePOS.Parallax._handleScroll = () => {
      runs++;
    };
    try {
      for (let i = 0; i < 5; i++) window.dispatchEvent(new window.Event('scroll'));
      await nextFrames(2);
      assert.equal(runs, 1, `5 scroll events produced ${runs} updates, expected 1`);
    } finally {
      LibrePOS.Parallax._handleScroll = original;
      instance.destroy();
    }
  });
});

describe('Toast countdown', () => {
  beforeEach(resetBody);

  test('dismisses on schedule without a ticking interval', async () => {
    const toast = new LibrePOS.Toast({ text: 'Saved', displayLength: 40, outDuration: 10 });
    assert.ok(document.querySelector('.toast'));

    await sleep(200);

    assert.equal(document.querySelector('.toast'), null, 'toast outlived its displayLength');
  });

  test('pausing banks the remaining time instead of dismissing', async () => {
    const toast = new LibrePOS.Toast({ text: 'Saved', displayLength: 60, outDuration: 10 });

    // finally: a toast owns a live timer, so a failed assertion that skipped
    // the dismiss would keep the test process alive.
    try {
      toast._pauseTimer(); // what _onDragStart does
      await sleep(200);

      assert.ok(document.querySelector('.toast'), 'a paused toast dismissed anyway');
      assert.ok(toast.timeRemaining > 0, 'paused toast banked no time');
      assert.equal(toast.counterTimeout, null, 'the timer was left armed while paused');

      toast._resumeTimer(); // what _onDragEnd does
      assert.notEqual(toast.counterTimeout, null, 'resuming did not re-arm the timer');

      await sleep(200);
      assert.equal(document.querySelector('.toast'), null, 'resumed toast never dismissed');
    } finally {
      toast.dismiss();
    }
  });
});

describe('Datepicker redraws', () => {
  beforeEach(resetBody);

  /**
   * Count real draws via the public onDraw callback, which fires once at the
   * end of each one. Counting FormSelect.init instead would break the moment
   * draw() stopped rebuilding the selects every time - which is exactly what
   * the controls cache now does.
   */
  function withDrawCounter(html, options, fn) {
    document.body.innerHTML = html;
    const input = document.querySelector('.datepicker');
    const counter = { draws: 0 };
    const instance = LibrePOS.Datepicker.init(input, {
      ...options,
      onDraw: () => counter.draws++
    });
    counter.draws = 0; // ignore construction
    try {
      fn(input, instance, counter);
    } finally {
      instance.destroy();
    }
  }

  test('clicking the input draws once, not three times', () => {
    withDrawCounter(
      `<input type="text" class="datepicker" value="Jan 15, 2024">`,
      {},
      (input, instance, counter) => {
        input.dispatchEvent(
          new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window })
        );

        // setDateFromInput -> setDate -> gotoDate, then the direct draw(),
        // then the trailing gotoDate: three draws for one click.
        assert.equal(counter.draws, 1, `one click produced ${counter.draws} draws`);
      }
    );
  });

  test('the calendar is rendered synchronously, before init() returns', () => {
    document.body.innerHTML = `<input type="text" class="datepicker">`;

    const instance = LibrePOS.Datepicker.init(document.querySelector('.datepicker'));

    try {
      // Batching must not defer: callers read calendarEl straight after init.
      assert.ok(
        instance.calendarEl.querySelector('.datepicker-table'),
        'the calendar was empty immediately after init()'
      );
    } finally {
      instance.destroy();
    }
  });

  test('a draw still happens when the input holds no parseable date', () => {
    withDrawCounter(
      `<input type="text" class="datepicker" value="not a date">`,
      {},
      (input, instance, counter) => {
        input.dispatchEvent(
          new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window })
        );

        // setDate bails before drawing here, so the direct draw() in the
        // handler is the only one - batching must not collapse it to zero.
        assert.equal(counter.draws, 1, `expected exactly one draw, got ${counter.draws}`);
      }
    );
  });

  test('paging within a year keeps the month and year selects alive', () => {
    withDrawCounter(`<input type="text" class="datepicker">`, {}, (input, instance) => {
      const before = instance.calendarEl.querySelector('.orig-select-month');
      const yearBefore = instance.calendarEl.querySelector('.orig-select-year');
      const startMonth = instance.calendars[0].month;
      // Page to a month in the same year, whichever direction stays inside it.
      if (startMonth === 11) instance.prevMonth();
      else instance.nextMonth();

      assert.equal(
        instance.calendarEl.querySelector('.orig-select-month'),
        before,
        'the month select was rebuilt for a same-year page'
      );
      assert.equal(instance.calendarEl.querySelector('.orig-select-year'), yearBefore);
      assert.equal(
        instance.calendarEl.querySelector('.orig-select-month').value,
        instance.calendars[0].month.toString(),
        'the reused month select was not updated to the new month'
      );
    });
  });

  test('crossing a year boundary rebuilds them, since the year list re-centres', () => {
    withDrawCounter(`<input type="text" class="datepicker">`, {}, (input, instance) => {
      instance.gotoDate(new Date(2024, 11, 1)); // December
      const before = instance.calendarEl.querySelector('.orig-select-year');

      instance.nextMonth(); // -> January 2025

      assert.notEqual(
        instance.calendarEl.querySelector('.orig-select-year'),
        before,
        'the year select was reused across a year change, so its options are stale'
      );
      assert.equal(instance.calendars[0].year, 2025);
    });
  });

  test('rebuilding the selects does not leak Dropdown instances', () => {
    withDrawCounter(`<input type="text" class="datepicker">`, {}, (input, instance) => {
      const before = LibrePOS.Dropdown._dropdowns.length;

      for (let i = 0; i < 14; i++) instance.nextMonth(); // crosses a year boundary

      // FormSelect.destroy() has to destroy its Dropdown: the instance holds
      // itself in the static registry until it does, so every rebuild used to
      // strand two of them permanently.
      assert.equal(
        LibrePOS.Dropdown._dropdowns.length,
        before,
        'paging leaked Dropdown instances into the static registry'
      );
    });
  });
});

describe('Timepicker dial construction', () => {
  beforeEach(resetBody);

  const dialSize = (instance) => ({
    ticks: instance.containerEl.querySelectorAll('.timepicker-tick').length,
    svg: !!instance.containerEl.querySelector('svg'),
    amPm: !!instance.containerEl.querySelector('.am-btn')
  });

  test('a docked picker builds only its shell up front', () => {
    document.body.innerHTML = `<input type="text" class="timepicker" value="03:45 PM">`;
    const instance = LibrePOS.Timepicker.init(document.querySelector('.timepicker'), {
      displayPlugin: 'docked'
    });

    try {
      // .display-docked is visibility:hidden until show(), so nothing here is
      // on screen yet - roughly 40 of the ~49 elements can wait.
      assert.deepEqual(dialSize(instance), { ticks: 0, svg: false, amPm: false });
    } finally {
      instance.destroy();
    }
  });

  test('clicking the input builds the dial', () => {
    document.body.innerHTML = `<input type="text" class="timepicker" value="03:45 PM">`;
    const input = document.querySelector('.timepicker');
    const instance = LibrePOS.Timepicker.init(input, { displayPlugin: 'docked' });

    try {
      input.dispatchEvent(
        new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window })
      );

      const dial = dialSize(instance);
      assert.equal(dial.svg, true, 'the SVG hand was never built');
      assert.equal(dial.amPm, true, 'the AM/PM buttons were never built');
      assert.ok(dial.ticks > 0, 'no dial ticks were built');
    } finally {
      instance.destroy();
    }
  });

  test('the time read from the input survives the deferred build', () => {
    document.body.innerHTML = `<input type="text" class="timepicker" value="03:45 PM">`;
    const input = document.querySelector('.timepicker');
    const instance = LibrePOS.Timepicker.init(input, { displayPlugin: 'docked' });

    try {
      // _updateTimeFromInput runs eagerly, before the AM/PM buttons exist;
      // _ensureClockBuilt has to apply the state it settled on.
      assert.equal(instance.amOrPm, 'PM');
      input.dispatchEvent(
        new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window })
      );

      assert.equal(instance.inputHours.value, '03');
      assert.equal(instance.inputMinutes.value, '45');
      assert.ok(
        instance.containerEl.querySelector('.pm-btn').classList.contains('filled'),
        'the PM button did not pick up the state set before it existed'
      );
    } finally {
      instance.destroy();
    }
  });

  test('without a display plugin the dial is built at init', () => {
    document.body.innerHTML = `<input type="text" class="timepicker" value="03:45 PM">`;
    const instance = LibrePOS.Timepicker.init(document.querySelector('.timepicker'));

    try {
      // No plugin means the container is on screen from the start, so
      // deferring here would show an empty dial.
      const dial = dialSize(instance);
      assert.equal(dial.svg, true);
      assert.ok(dial.ticks > 0);
    } finally {
      instance.destroy();
    }
  });

  test('destroying before the dial is built does not throw', () => {
    document.body.innerHTML = `<input type="text" class="timepicker">`;
    const instance = LibrePOS.Timepicker.init(document.querySelector('.timepicker'), {
      displayPlugin: 'docked'
    });

    instance.destroy();

    assert.equal(LibrePOS.Timepicker.getInstance(document.querySelector('.timepicker')), undefined);
  });
});

describe('textarea auto-resize', () => {
  beforeEach(resetBody);

  test('measures the textarea itself, with no mirror div', () => {
    document.body.innerHTML = `<textarea class="librepos-textarea"></textarea>`;
    const textarea = document.querySelector('textarea');

    LibrePOS.Forms.InitTextarea(textarea);
    textarea.value = 'one\ntwo\nthree';
    textarea.dispatchEvent(new window.Event('input', { bubbles: true }));

    assert.equal(
      document.querySelector('.hiddendiv'),
      null,
      'the mirror div is back - the value is being serialized through innerHTML again'
    );
    assert.ok(textarea.style.height, 'input did not trigger a resize');
    assert.equal(
      textarea.getAttribute('previous-length'),
      null,
      'previous-length is obsolete; the height is clamped against original-height now'
    );
  });
});
