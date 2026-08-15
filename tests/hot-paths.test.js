// How much work a component does per event.
//
// These are not micro-benchmarks - they assert the shape of the work: how many
// times layout is read per scroll tick, how many timers a toast arms, whether
// a scroll handler coalesces onto a frame. Those are the properties that
// regress silently, because doing them the expensive way still looks correct.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { RoutePlate, resetBody, window } from './setup.js';

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

    const spies = sections.map((el) => RoutePlate.ScrollSpy.init(el));
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
    const instance = RoutePlate.Parallax.init(document.querySelector('.parallax'));

    const original = RoutePlate.Parallax._handleScroll;
    let runs = 0;
    RoutePlate.Parallax._handleScroll = () => {
      runs++;
    };
    try {
      for (let i = 0; i < 5; i++) window.dispatchEvent(new window.Event('scroll'));
      await nextFrames(2);
      assert.equal(runs, 1, `5 scroll events produced ${runs} updates, expected 1`);
    } finally {
      RoutePlate.Parallax._handleScroll = original;
      instance.destroy();
    }
  });
});

describe('Toast countdown', () => {
  beforeEach(resetBody);

  test('dismisses on schedule without a ticking interval', async () => {
    const toast = new RoutePlate.Toast({ text: 'Saved', displayLength: 40, outDuration: 10 });
    assert.ok(document.querySelector('.toast'));

    await sleep(200);

    assert.equal(document.querySelector('.toast'), null, 'toast outlived its displayLength');
  });

  test('pausing banks the remaining time instead of dismissing', async () => {
    const toast = new RoutePlate.Toast({ text: 'Saved', displayLength: 60, outDuration: 10 });

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
   * Count real draws. Every draw destroys and rebuilds the month and year
   * FormSelects, so FormSelect.init runs exactly twice per draw - a more
   * honest signal than spying on draw() itself, which would also swallow the
   * batching being tested.
   */
  function countDraws(fn) {
    const original = RoutePlate.FormSelect.init;
    let initCalls = 0;
    RoutePlate.FormSelect.init = function (...args) {
      initCalls++;
      return original.apply(this, args);
    };
    try {
      fn();
    } finally {
      RoutePlate.FormSelect.init = original;
    }
    return initCalls / 2;
  }

  test('clicking the input draws once, not three times', () => {
    document.body.innerHTML = `<input type="text" class="datepicker" value="Jan 15, 2024">`;
    const input = document.querySelector('.datepicker');
    const instance = RoutePlate.Datepicker.init(input);

    try {
      const draws = countDraws(() => {
        input.dispatchEvent(
          new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window })
        );
      });

      // setDateFromInput -> setDate -> gotoDate, then the direct draw(), then
      // the trailing gotoDate: three draws for one click.
      assert.equal(draws, 1, `one click produced ${draws} draws`);
    } finally {
      instance.destroy();
    }
  });

  test('the calendar is rendered synchronously, before init() returns', () => {
    document.body.innerHTML = `<input type="text" class="datepicker">`;

    const instance = RoutePlate.Datepicker.init(document.querySelector('.datepicker'));

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
    document.body.innerHTML = `<input type="text" class="datepicker" value="not a date">`;
    const input = document.querySelector('.datepicker');
    const instance = RoutePlate.Datepicker.init(input);

    try {
      const draws = countDraws(() => {
        input.dispatchEvent(
          new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window })
        );
      });

      // setDate bails before drawing here, so the direct draw() in the handler
      // is the only one - batching must not collapse it to zero.
      assert.equal(draws, 1, `expected exactly one draw, got ${draws}`);
    } finally {
      instance.destroy();
    }
  });
});

describe('textarea auto-resize', () => {
  beforeEach(resetBody);

  test('measures the textarea itself, with no mirror div', () => {
    document.body.innerHTML = `<textarea class="routeplate-textarea"></textarea>`;
    const textarea = document.querySelector('textarea');

    RoutePlate.Forms.InitTextarea(textarea);
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
