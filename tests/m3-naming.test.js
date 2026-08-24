// The 0.8.0 renames, and the promise that the old names still work.
//
// Components took the names Material 3 uses for them. Each rename is additive:
// the old class stays in the selector list and the old export stays as an
// alias, so markup and scripts written before 0.8.0 keep working. This file is
// what makes that a promise rather than an intention.
//
// One rename is NOT additive and is asserted as such below: `Slider` used to be
// the image slideshow and is now the range control, because that is what M3
// calls a slider. Aliasing it would defeat the rename.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Expressive, resetBody, window } from './setup.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('M3 names reach the same rules as the old ones', () => {
  // Each pair is [old class, new class] and must appear together wherever the
  // component is styled - the point of :is(.old, .new) in the Sass.
  const PAIRS = [
    ['sidenav', 'navigation-drawer'],
    ['sidenav-overlay', 'navigation-drawer-overlay'],
    ['sidenav-fixed', 'navigation-drawer-fixed'],
    ['fixed-action-btn', 'fab'],
    ['datepicker', 'date-picker'],
    ['timepicker', 'time-picker']
  ];

  for (const [old, m3] of PAIRS) {
    test(`.${m3} is styled wherever .${old} is`, () => {
      const oldRules = css.split('\n').filter((l) => l.includes(`.${old}`) && !l.trimStart().startsWith('//'));
      assert.ok(oldRules.length > 0, `no rules mention .${old}`);
      const unpaired = oldRules.filter((l) => !l.includes(`.${m3}`));
      assert.deepEqual(unpaired, [], `these reach .${old} but not .${m3}:\n  ${unpaired.join('\n  ')}`);
    });
  }
});

describe('Slider and Slideshow', () => {
  test('a .slider holding a range input is the slider, not the slideshow', () => {
    // The one name that changed meaning. Both keep working because they are
    // told apart by content, so no pre-0.8.0 markup of either kind breaks.
    assert.match(css, /\.slider:has\(\[type=range\]\)/, 'the range host must claim .slider');
    assert.match(css, /\.slider:not\(:has\(\[type=range\]\)\)/, 'the slideshow must yield it when a range is present');
  });

  test('Slider is the range control and Slideshow is the slideshow', () => {
    assert.equal(typeof Expressive.Slider, 'function');
    assert.equal(typeof Expressive.Slideshow, 'function');
    assert.notEqual(Expressive.Slider, Expressive.Slideshow);
  });

  test('Range still resolves, to the renamed Slider', () => {
    assert.equal(Expressive.Range, Expressive.Slider);
  });
});

describe('exports keep their old names', () => {
  test('Sidenav is NavigationDrawer', () => {
    assert.equal(typeof Expressive.NavigationDrawer, 'function');
    assert.equal(Expressive.Sidenav, Expressive.NavigationDrawer);
  });
});

describe('AutoInit accepts both spellings', () => {
  beforeEach(resetBody);

  const CASES = [
    ['navigation-drawer', 'sidenav', 'NavigationDrawer', (c) => `<ul class="${c}" id="d"><li><a href="#!">One</a></li></ul>`],
    ['fab', 'fixed-action-btn', 'FloatingActionButton', (c) => `<div class="${c}"><a class="button extra circle" aria-label="Add">+</a><ul><li><a class="button extra circle small" aria-label="Edit">e</a></li></ul></div>`],
    ['date-picker', 'datepicker', 'Datepicker', (c) => `<input type="text" class="${c}">`],
    ['time-picker', 'timepicker', 'Timepicker', (c) => `<input type="text" class="${c}">`]
  ];

  for (const [m3, old, component, markup] of CASES) {
    for (const cls of [m3, old]) {
      test(`.${cls} starts ${component}`, () => {
        document.body.innerHTML = markup(cls);
        Expressive.AutoInit();
        const el = document.querySelector(`.${cls}`);
        const instance = Expressive[component].getInstance(el);
        try {
          assert.ok(instance, `.${cls} did not start ${component}`);
        } finally {
          instance?.destroy();
        }
      });
    }
  }
});

describe('the renames reach behaviour, not just styling', () => {
  beforeEach(resetBody);

  test('a canonically-named fixed drawer is treated as fixed', () => {
    // The Sass alias made `.navigation-drawer-fixed` *look* docked while the
    // component still read only `sidenav-fixed`, so at the Expanded breakpoint it
    // kept the drag target live and open() could showModal() a docked drawer.
    for (const cls of ['navigation-drawer-fixed', 'sidenav-fixed']) {
      document.body.innerHTML = `<ul class="navigation-drawer ${cls}" id="d"><li><a href="#!">One</a></li></ul>`;
      const instance = Expressive.NavigationDrawer.init(document.getElementById('d'));
      try {
        assert.equal(instance.isFixed, true, `${cls} was not treated as fixed`);
      } finally {
        instance.destroy();
      }
    }
  });

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
