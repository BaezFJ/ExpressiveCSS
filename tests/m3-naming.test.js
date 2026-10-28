// The 0.8.0 renames, and their end in 0.16.0.
//
// Components took the names Material 3 uses for them in 0.8.0. Each rename was
// additive until 0.16.0: the old class stayed in the selector list and the old
// export stayed as an alias. 0.16.0 removes the old names, and this file holds
// that line so none of them quietly comes back.
//
// One rename was never additive: `Slider` used to be the image slideshow and
// is now the range control, because that is what M3 calls a slider. The
// slideshow is gone - Carousel covers the case - so `.slider` no longer has to
// be told apart from anything by its content.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Expressive, resetBody, window } from './setup.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('The pre-1.0 names are gone', () => {
  // [removed selector, the name that replaced it]. Asserted as booleans rather
  // than with doesNotMatch, which prints the whole sheet on failure.
  const REMOVED = [
    [/\.searchbar(?![\w-])/, '.search-bar'],
    [/(?<![\w-])\.handle(?![\w-])/, '.drag-handle'],
    [/\.preloader(?![\w-])/, '.progress.circular'],
    [/\.material-icons(?![\w-])/, '.material-symbols'],
    [/dialog\.bottom(?![\w-])/, 'dialog.bottom-sheet'],
    [/dialog\.(right|left)(-sheet)?(?![\w-])/, 'dialog.side-sheet, with .start'],
    [/\.tooltip\.max(?![\w-])/, '.tooltip.rich'],
    [/\.(date|time)-picker-/, 'the generated .datepicker-* / .timepicker-* parts'],
  ];

  for (const [pattern, replacement] of REMOVED) {
    test(`${pattern.source} is gone; ${replacement} replaces it`, () => {
      assert.equal(pattern.test(css), false);
    });
  }
});

describe('Slider is the range control, and nothing else', () => {
  test('.slider needs no content test to tell it apart', () => {
    // The slideshow used to hold `.slider` too, so each yielded it to the
    // other by what it contained. With the slideshow gone the class is
    // unambiguous and both halves of that test must be gone with it.
    // Asserted as booleans rather than with doesNotMatch, which prints the
    // whole half-megabyte sheet as its "actual" on failure.
    assert.match(css, /\.slider\b/, 'the range host must claim .slider');
    assert.equal(/\.slider:has\(/.test(css), false, 'the range host still tests its own content');
    assert.equal(/\.slider:not\(:has\(/.test(css), false, 'the slideshow half of the discrimination survives');
  });

  test('Slideshow is gone, with no alias standing in for it', () => {
    assert.equal(typeof Expressive.Slider, 'function');
    assert.equal(Expressive.Slideshow, undefined);
  });

  test('the pre-0.8.0 Range export is gone in 0.16.0', () => {
    assert.equal(Expressive.Range, undefined);
  });
});

describe('AutoInit takes the M3 spelling only', () => {
  beforeEach(resetBody);

  const CASES = [
    ['date-picker', 'datepicker', 'Datepicker'],
    ['time-picker', 'timepicker', 'Timepicker']
  ];

  for (const [m3, old, component] of CASES) {
    test(`.${m3} starts ${component} and .${old} does not`, () => {
      document.body.innerHTML = `<input type="text" class="${m3}"><input type="text" class="${old}">`;
      Expressive.AutoInit();
      const current = Expressive[component].getInstance(document.querySelector(`.${m3}`));
      const legacy = Expressive[component].getInstance(document.querySelector(`.${old}`));
      try {
        assert.ok(current, `.${m3} did not start ${component}`);
        assert.equal(legacy, undefined, `.${old} still starts ${component}`);
      } finally {
        current?.destroy();
        legacy?.destroy();
      }
    });
  }
});

describe('the renames reach behaviour, not just styling', () => {
  beforeEach(resetBody);

  test('a dual-handle slider finds a .slider host and clamps against it', () => {
    // _host() knew only the legacy classes, so the canonical host returned
    // null: handles never clamped and the shared fractions never tracked.
    document.body.innerHTML =
      `<div class="slider"><input type="range" min="0" max="100" value="25" aria-label="From">` +
      `<input type="range" min="0" max="100" value="75" aria-label="To"></div>`;
    const host = document.querySelector('.slider');
    const [start, end] = host.querySelectorAll('input[type=range]');
    const a = Expressive.Slider.init(start);
    const b = Expressive.Slider.init(end);
    try {
      assert.equal(a._host(), host, 'the .slider host was not found');
      start.value = '95';
      start.dispatchEvent(new window.Event('change', { bubbles: true }));
      assert.equal(start.value, '75', 'the start handle did not clamp to the end one');
      assert.equal(host.style.getPropertyValue('--md-comp-slider-end-fraction'), '75%');
    } finally {
      a.destroy();
      b.destroy();
    }
  });
});
