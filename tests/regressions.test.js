// Bugs that were live in the vendored source.
//
// Each of these reproduces a specific defect: a crash, a wrong dimension, an
// index computed against the wrong list, a flag read before it was set. They
// are grouped by component rather than by kind, because that is how you come
// back to them.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Expressive, resetBody, fire, window } from './setup.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Give an element a fixed rect, since jsdom does no layout. */
function fixRect(el, width, height, left = 0, top = 0) {
  el.getBoundingClientRect = () => ({
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top
  });
}

/** Split a selector list on its top-level commas — `:not(a, b)` has its own. */
function splitSelectors(list) {
  const out = [];
  let depth = 0;
  let current = '';
  for (const ch of list) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.filter((s) => s.trim());
}

describe('Timepicker host input', () => {
  beforeEach(resetBody);

  for (const opener of ['click', 'Enter']) {
    for (const twelveHour of [true, false]) {
      test(`${opener} refreshes an edited ${twelveHour ? '12' : '24'}-hour time before confirmation`, () => {
        document.body.innerHTML = '<input type="text">';
        const input = document.querySelector('input');
        input.value = twelveHour ? '09:30 AM' : '09:30';
        const picker = Expressive.Timepicker.init(input, {
          twelveHour,
          displayPlugin: 'docked',
          autoSubmit: false,
          duration: 0,
          vibrate: false
        });
        try {
          const edited = twelveHour ? '11:45 PM' : '23:45';
          input.value = edited;
          if (opener === 'click') fire(input, 'click');
          else input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          assert.equal(picker.inputHours.value, twelveHour ? '11' : '23');
          assert.equal(picker.inputMinutes.value, '45');
          if (twelveHour) assert.equal(picker.amOrPm, 'PM');
          picker.confirm();
          assert.equal(input.value, edited);
        } finally {
          picker.destroy();
        }
      });
    }
  }

  // The CSS plate used to be 260px while the dial centred on dialRadius 135,
  // so the hand sat 5px off the face's centre.
  for (const dialRadius of [undefined, 100]) {
    test(`the clock face matches dialRadius ${dialRadius ?? '(default)'}`, () => {
      document.body.innerHTML = '<input type="text">';
      const picker = Expressive.Timepicker.init(document.querySelector('input'), dialRadius ? { dialRadius } : {});
      try {
        const diameter = `${picker.options.dialRadius * 2}px`;
        assert.equal(picker.plate.style.width, diameter);
        assert.equal(picker.plate.style.height, diameter);
      } finally {
        picker.destroy();
      }
    });
  }

  // A time input empties itself on "02:15 PM"; it only takes 24-hour HH:mm.
  for (const twelveHour of [true, false]) {
    test(`a type="time" input gets a 24-hour value from a ${twelveHour ? '12' : '24'}-hour picker`, () => {
      document.body.innerHTML = '<input type="time" value="09:05">';
      const input = document.querySelector('input');
      const picker = Expressive.Timepicker.init(input, { twelveHour, duration: 0, vibrate: false });
      try {
        fire(input, 'click');
        assert.equal(picker.inputHours.value, '09');
        picker.confirm();
        assert.equal(input.value, '09:05');
        input.value = '14:30';
        fire(input, 'click');
        picker.confirm();
        assert.equal(input.value, '14:30');
        input.value = '00:10';
        fire(input, 'click');
        picker.confirm();
        assert.equal(input.value, '00:10');
      } finally {
        picker.destroy();
      }
    });
  }

  test('opening an empty input still uses the configured default time', () => {
    document.body.innerHTML = '<input type="text">';
    const input = document.querySelector('input');
    const picker = Expressive.Timepicker.init(input, {
      defaultTime: '14:15',
      duration: 0,
      vibrate: false
    });
    try {
      fire(input, 'click');
      assert.equal(picker.inputHours.value, '02');
      assert.equal(picker.inputMinutes.value, '15');
      assert.equal(picker.amOrPm, 'PM');
      picker.confirm();
      assert.equal(input.value, '02:15 PM');
    } finally {
      picker.destroy();
    }
  });
});

describe('Timepicker delayed clock reset', () => {
  beforeEach(resetBody);

  for (const edit of ['hours', 'minutes']) {
    test(`a delayed minute reset does not overwrite a newer ${edit} edit`, t => {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      document.body.innerHTML = '<input value="09:30 AM">';
      const picker = Expressive.Timepicker.init(document.querySelector('input'), {
        duration: 100,
        vibrate: false
      });
      try {
        picker.inputMinutes.focus();
        picker.showView('minutes', 50);
        const field = edit === 'hours' ? picker.inputHours : picker.inputMinutes;
        field.focus();
        field.value = edit === 'hours' ? '04' : '25';
        fire(field, 'input', window.Event);
        t.mock.timers.tick(100);
        picker.confirm();
        assert.equal(picker.el.value, edit === 'hours' ? '04:30 AM' : '09:25 AM');
        assert.equal(picker._canvas.classList.contains('timepicker-canvas-out'), false);
      } finally {
        picker.destroy();
        t.mock.timers.reset();
      }
    });
  }
});

describe('Lightbox dimensions', () => {
  beforeEach(resetBody);

  test('closing restores the height from the height, not the width', () => {
    document.body.innerHTML = `<img class="lightboxed" src="http://localhost/1.jpg">`;
    const img = document.querySelector('img');
    fixRect(img, 100, 50);
    const instance = Expressive.Lightbox.init(img);

    instance.open();
    instance.close();

    assert.equal(img.style.height, '50px', 'height was restored from originalWidth');
    assert.equal(img.style.width, '100px');
    instance.destroy();
  });

  test('an image with no size yet does not open into NaN', () => {
    document.body.innerHTML = `<img class="lightboxed" src="http://localhost/1.jpg">`;
    const img = document.querySelector('img');
    const instance = Expressive.Lightbox.init(img);
    try {
      instance.open();
      assert.equal(document.getElementById('lightbox-overlay'), null);
      assert.equal(img.classList.contains('active'), false);
      assert.equal(img.style.maxWidth, '');
    } finally {
      instance.destroy();
    }
  });

  test('closing puts focus dropped on the body back on the image', () => {
    document.body.innerHTML = `<img class="lightboxed" src="http://localhost/1.jpg">`;
    const img = document.querySelector('img');
    fixRect(img, 100, 50);
    const instance = Expressive.Lightbox.init(img);
    try {
      img.focus();
      instance.open();
      // A click on the overlay, which cannot take focus, leaves it on the body.
      img.blur();
      document.getElementById('lightbox-overlay').click();
      assert.equal(document.activeElement, img);
    } finally {
      instance.destroy();
    }
  });
});

describe('Carousel', () => {
  beforeEach(resetBody);

  test('exactly one item is active when the active item is not the first', () => {
    // The stale "active" used to be cleared off the first .carousel-item
    // rather than off whichever one actually had it.
    document.body.innerHTML = `
      <div class="carousel">
        <a class="carousel-item" href="#one">one</a>
        <a class="carousel-item active" href="#two">two</a>
        <a class="carousel-item" href="#three">three</a>
      </div>`;

    const instance = Expressive.Carousel.init(document.querySelector('.carousel'));

    assert.equal(
      document.querySelectorAll('.carousel-item.active').length,
      1,
      'more than one carousel item is marked active'
    );
    instance.destroy();
  });

  test('an empty carousel does not throw', () => {
    document.body.innerHTML = `<div class="carousel"></div>`;

    const instance = Expressive.Carousel.init(document.querySelector('.carousel'));

    assert.ok(instance);
    instance.destroy();
  });

  test('indicators stay outside the scroll track', () => {
    document.body.innerHTML = `
      <div class="carousel uncontained">
        <div class="carousel-item">one</div>
        <div class="carousel-item">two</div>
      </div>`;
    const el = document.querySelector('.carousel');
    const instance = Expressive.Carousel.init(el, { indicators: true });
    try {
      const track = el.querySelector('.carousel-track');
      const dots = el.querySelector('.indicators');
      assert.ok(track, 'slides were not wrapped in a track');
      assert.equal(dots.parentElement, el, 'indicators were placed inside a slide');
      assert.equal(track.querySelector('.indicators'), null);
      assert.ok(track.querySelector('.carousel-item'));
    } finally {
      instance.destroy();
    }
    assert.equal(el.querySelector('.carousel-track'), null, 'destroy left the track wrapper');
  });

  test('destroy removes generated indicators', () => {
    document.body.innerHTML = `
      <div class="carousel">
        <a class="carousel-item" href="#one">one</a>
        <a class="carousel-item" href="#two">two</a>
      </div>`;
    const el = document.querySelector('.carousel');
    const instance = Expressive.Carousel.init(el, { indicators: true });
    assert.ok(el.querySelector('.indicators'), 'indicators were not created');
    instance.destroy();
    assert.equal(el.querySelector('.indicators'), null, 'generated indicators were left behind');
  });
});

describe('Chips indices line up with the data', () => {
  beforeEach(resetBody);

  test('deleting a chip removes that chip, not the one at the same child index', () => {
    // The container also holds a label and the input, so counting children
    // gave an index shifted off the chipsData index.
    document.body.innerHTML = `<div class="chips"><label>Tags</label></div>`;
    const instance = Expressive.Chips.init(document.querySelector('.chips'), {
      allowUserInput: true,
      data: [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    });

    const chipB = instance._chips[1];
    chipB.querySelector('.close').dispatchEvent(
      new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window })
    );

    assert.deepEqual(
      instance.getData().map((chip) => chip.id),
      ['a', 'c'],
      'the wrong chip was deleted'
    );
    assert.equal(instance._chips.length, 2);
    instance.destroy();
  });
});

describe('Datepicker month arrows', () => {
  beforeEach(resetBody);

  test('the previous arrow is disabled at the start of the allowed range', () => {
    const now = new Date();
    document.body.innerHTML = `<input type="text" class="date-picker">`;

    const instance = Expressive.Datepicker.init(document.querySelector('.date-picker'), {
      minYear: now.getFullYear(),
      minMonth: now.getMonth()
    });

    try {
      // `prev` used to be computed below the button that reads it, so the
      // previous arrow was never marked disabled.
      const prevButton = instance.calendarEl.querySelector('.month-prev');
      assert.ok(prevButton, 'no previous-month button was rendered');
      assert.ok(
        prevButton.classList.contains('is-disabled'),
        'the previous arrow should be disabled at the minimum month'
      );
    } finally {
      instance.destroy();
    }
  });

  test('a cloned range input does not duplicate the id', () => {
    document.body.innerHTML = `<div><input type="text" id="range-start" class="date-picker"></div>`;

    const instance = Expressive.Datepicker.init(document.querySelector('.date-picker'), {
      isDateRange: true
    });

    try {
      assert.equal(
        document.querySelectorAll('#range-start').length,
        1,
        'the cloned end-date input carries the same id as the start input'
      );
    } finally {
      instance.destroy();
    }
  });
});

describe('Datepicker custom parsing', () => {
  beforeEach(resetBody);

  for (const value of ['', '   ']) {
    test(`does not parse or format blank initialization ${JSON.stringify(value)}`, () => {
      document.body.innerHTML = '<div><input></div>';
      const input = document.querySelector('input');
      input.value = value;
      try {
        const picker = Expressive.Datepicker.init(input, {
          format: date => date.toISOString(),
          parse: () => assert.fail('blank input must not reach the custom parser')
        });
        assert.ok(!picker.date);
        picker._confirm();
        assert.equal(input.value, '');
      } finally {
        Expressive.Datepicker.getInstance(input)?.destroy();
      }
    });
  }

  test('parses custom text before using a functional output formatter', () => {
    document.body.innerHTML = '<div><input value="25/10/2026"></div>';
    const input = document.querySelector('input');
    const calls = [];
    try {
      const picker = Expressive.Datepicker.init(input, {
        setDefaultDate: true,
        format: date => date.toISOString(),
        parse(value, format) {
          calls.push({ context: this, value, format });
          const [day, month, year] = value.split('/').map(Number);
          return new Date(year, month - 1, day);
        }
      });
      assert.equal(picker.date.getTime(), new Date(2026, 9, 25).getTime());
      assert.equal(calls.length, 1);
      assert.equal(calls[0].context, picker.options);
      assert.equal(calls[0].value, '25/10/2026');
      assert.equal(calls[0].format, '', 'a formatter function has no format-string pattern');
      assert.equal(input.value, picker.date.toISOString());
    } finally {
      Expressive.Datepicker.getInstance(input)?.destroy();
    }
  });

  test('parses an end date with a functional formatter while the start is empty', () => {
    document.body.innerHTML = '<div><input id="start"><input id="end"></div>';
    const start = document.getElementById('start');
    const end = document.getElementById('end');
    const calls = [];
    const picker = Expressive.Datepicker.init(start, {
      isDateRange: true, dateRangeEndEl: '#end', defaultDate: new Date(2026, 9, 1),
      format: date => date.toISOString(),
      parse(value, format) {
        calls.push({ context: this, value, format });
        const [day, month, year] = value.split('/').map(Number);
        return new Date(year, month - 1, day);
      }
    });
    const errors = [];
    const onError = event => { errors.push(event.error); event.preventDefault(); };
    window.addEventListener('error', onError);
    try {
      end.value = '25/10/2026';
      end.dispatchEvent(new window.Event('change', { bubbles: true }));
      assert.deepEqual(errors, []);
      assert.equal(picker.endDate.getTime(), new Date(2026, 9, 25).getTime());
      assert.equal(calls.length, 1);
      assert.equal(calls[0].context, picker.options);
      assert.equal(calls[0].value, '25/10/2026');
      assert.equal(calls[0].format, '');
      picker._confirm();
      assert.equal(start.value, '');
      assert.equal(end.value, picker.endDate.toISOString());
    } finally {
      picker.destroy();
      window.removeEventListener('error', onError);
    }
  });

  for (const interaction of ['initialization', 'change', 'click', 'Enter']) {
    test(`honors the custom parser on ${interaction}`, () => {
      document.body.innerHTML = '<div><input value="05/10/2026"></div>';
      const input = document.querySelector('input');
      const calls = [];
      const picker = Expressive.Datepicker.init(input, {
        format: 'dd/mm/yyyy',
        setDefaultDate: interaction === 'initialization',
        defaultDate: interaction === 'initialization' ? null : new Date(2026, 0, 1),
        autoSubmit: false,
        parse(value, format) {
          calls.push({ context: this, value, format });
          const [day, month, year] = value.split('/').map(Number);
          return new Date(year, month - 1, day);
        }
      });
      try {
        if (interaction === 'Enter') {
          input.dispatchEvent(new window.KeyboardEvent('keydown', {
            key: 'Enter', bubbles: true, cancelable: true
          }));
        } else if (interaction !== 'initialization') {
          fire(input, interaction);
        }
        assert.equal(picker.date?.getTime(), new Date(2026, 9, 5).getTime());
        assert.equal(calls.length, 1);
        assert.equal(calls[0].context, picker.options);
        assert.equal(calls[0].value, '05/10/2026');
        assert.equal(calls[0].format, 'dd/mm/yyyy');
        picker._confirm();
        assert.equal(input.value, '05/10/2026');
      } finally {
        picker.destroy();
      }
    });
  }
});

describe('Datepicker cleared input', () => {
  beforeEach(resetBody);

  for (const interaction of ['change', 'click', 'Enter']) {
    test(`clears a single selection on ${interaction} and keeps it empty after confirmation`, () => {
      document.body.innerHTML = '<div><input></div>';
      const input = document.querySelector('input');
      const selected = new Date(2026, 8, 20);
      const picker = Expressive.Datepicker.init(input, {
        defaultDate: selected, setDefaultDate: true, autoSubmit: false
      });
      const apply = () => input.dispatchEvent(interaction === 'Enter'
        ? new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
        : new window.Event(interaction, { bubbles: true }));
      try {
        input.value = 'not a date';
        apply();
        assert.equal(picker.date.getTime(), selected.getTime(), 'malformed nonempty input preserves selection');
        input.value = '';
        apply();
        assert.equal(picker.date, null);
        assert.equal(picker.calendarEl.querySelectorAll('.is-selected').length, 0);
        fire(input, 'click');
        picker._confirm();
        assert.equal(input.value, '');
        assert.equal(picker.date, null);
      } finally {
        picker.destroy();
      }
    });
  }
});

describe('optional markup does not crash a component', () => {
  beforeEach(resetBody);

  test('a card reveal with no title', () => {
    document.body.innerHTML = `
      <article>
        <button type="button" class="card-reveal-trigger" aria-label="Toggle details" aria-controls="untitled-card-details">T</button>
        <aside id="untitled-card-details"><p>body</p></aside>
      </article>`;
    const instance = Expressive.Cards.init(document.querySelector('article'));

    instance.open();
    instance.close();

    assert.ok(instance);
    instance.destroy();
  });

  test('a hover menu when the pointer leaves the window', () => {
    document.body.innerHTML = `
      <a class="button menu-trigger" data-target="dd">Drop</a>
      <menu id="dd"><li><a href="#!">one</a></li></menu>`;
    const instance = Expressive.Menu.init(document.querySelector('.menu-trigger'), {
      hover: true
    });

    // relatedTarget is null when the pointer leaves the document entirely.
    instance.el.dispatchEvent(
      new window.MouseEvent('mouseleave', { bubbles: false, view: window, relatedTarget: null })
    );

    assert.equal(instance.isOpen, false);
    instance.destroy();
  });

  test('a file field with no path input', () => {
    document.body.innerHTML = `<div class="file-field"><input type="file"></div>`;
    const input = document.querySelector('input');
    Expressive.Forms.InitFileInputPath(input);
    const errors = [];
    const record = (e) => errors.push(e.error);
    window.addEventListener('error', record);
    try {
      input.dispatchEvent(new window.Event('change', { bubbles: true }));
    } finally {
      window.removeEventListener('error', record);
    }
    assert.deepEqual(errors, []);
  });
});

describe('Menu width against a narrow trigger', () => {
  // `constrainWidth` wrote the trigger's width onto the surface, and the
  // surface's own `min-width: 112px` then overrode it - so any trigger under
  // 112dp left the menu at the floor with every item wrapped. An icon button
  // is 40dp and a split button's chevron is 48dp, so both were always in that
  // state. The constraint now applies only to a trigger wide enough to mean
  // something.
  //
  // The assertion reads style.width at the moment `_getMenuPosition` is
  // called, which is the constrained width itself: the line after that
  // overwrites it with a position-adjusted value, and jsdom does no layout to
  // adjust against.
  const widthAtPositioning = (instance, menuEl) => {
    const original = instance._getMenuPosition.bind(instance);
    let seen;
    instance._getMenuPosition = (parent) => {
      seen = menuEl.style.width;
      return original(parent);
    };
    instance.open();
    return seen;
  };

  test('a 48dp trigger gets a menu sized to its own content', () => {
    document.body.innerHTML = `
      <div class="split-button">
        <button class="button">Save</button>
        <button class="button menu-trigger" data-target="narrow" aria-label="More">
          <span class="material-symbols" aria-hidden="true">arrow_drop_down</span>
        </button>
      </div>
      <menu id="narrow"><li><a href="#!">Save as template</a></li></menu>`;
    const trigger = document.querySelector('.menu-trigger');
    const menuEl = document.getElementById('narrow');
    fixRect(trigger, 48, 40);
    fixRect(menuEl, 200, 100);

    const instance = Expressive.Menu.init(trigger);
    try {
      assert.equal(widthAtPositioning(instance, menuEl), '200px');
    } finally {
      instance.destroy();
    }
  });

  test('a trigger wider than the floor still constrains the menu to it', () => {
    document.body.innerHTML = `
      <a class="button menu-trigger" data-target="wide">Actions</a>
      <menu id="wide"><li><a href="#!">One</a></li></menu>`;
    const trigger = document.querySelector('.menu-trigger');
    const menuEl = document.getElementById('wide');
    fixRect(trigger, 200, 40);
    fixRect(menuEl, 150, 100);

    const instance = Expressive.Menu.init(trigger);
    try {
      assert.equal(widthAtPositioning(instance, menuEl), '200px');
    } finally {
      instance.destroy();
    }
  });
});

describe('Menu positioning', () => {
  beforeEach(resetBody);

  for (const [alignment, expectedLeft] of [
    ['left', '700px'],
    ['right', '720px']
  ]) {
    test(`a ${alignment}-aligned menu opens beneath the trigger`, () => {
      document.body.innerHTML = `
        <button class="menu-trigger" data-target="actions">Actions</button>
        <menu id="actions"><li><a href="#!">One</a></li></menu>`;
      const trigger = document.querySelector('.menu-trigger');
      const menuEl = document.getElementById('actions');
      document.body.style.overflow = 'visible';
      fixRect(document.body, 1024, 768);
      fixRect(trigger, 160, 40, 700, 80);
      fixRect(menuEl, 140, 100);

      const instance = Expressive.Menu.init(trigger, {
        alignment,
        constrainWidth: false,
        coverTrigger: false
      });
      try {
        instance.open();
        assert.equal(menuEl.style.left, expectedLeft);
        assert.equal(menuEl.style.top, '120px');
        assert.equal(menuEl.style.width, '140px');
      } finally {
        instance.destroy();
        document.body.style.removeProperty('overflow');
        delete document.body.getBoundingClientRect;
      }
    });
  }
});

describe('Tabs disabled-selector interpolation', () => {
  test('disabled styles do not match every nav.tabs > a', () => {
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    // `#{$_tab}.disabled` compiles to `.tabs > a, .tabs > .tab > a.disabled`
    // — every direct tab link then gets pointer-events:none.
    assert.doesNotMatch(
      css,
      /\.tabs\s*>\s*a\s*,\s*\.tabs\s*>\s*\.tab\s*>\s*a\.disabled/
    );
    assert.match(css, /\.tabs\s*>\s*a\.disabled/);
  });
});

describe('FAB container shape', () => {
  const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

  test('the .circle utility does not round the FAB off into a disc', () => {
    // Utilities are emitted after components and win by layer order, so a
    // bare `.circle` beat the FAB's own corner: every FAB documented as
    // `circle extra` rendered at 50% while `.fab-backdrop` stayed at 16dp.
    assert.doesNotMatch(css, /\.circle\s*\{\s*border-radius:\s*50%/);
    assert.match(css, /\.circle:not\(\.extra, \.large\)\s*\{\s*border-radius:\s*50%/);
  });

  test('the sizes reset the container tokens as one block', () => {
    // Each size is only these four tokens - a size that re-declared
    // `width`/`height` instead would have to re-state the corner too, which
    // is how the small FAB kept a 16dp corner at 40dp before.
    const size = (cls) =>
      new RegExp(`\\.extra\\.circle\\.${cls}[^{]*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';

    assert.equal(size('small'), '');

    const medium = size('medium');
    assert.match(medium, /--md-comp-fab-container-height:\s*5rem/);
    assert.match(medium, /--md-comp-fab-container-width:\s*5rem/);
    assert.match(medium, /--md-comp-fab-container-shape:\s*var\(--md-sys-shape-corner-large-increased\)/);
    assert.match(medium, /--md-comp-fab-icon-size:\s*1\.625rem/);

    const large = size('large');
    assert.match(large, /--md-comp-fab-container-height:\s*6rem/);
    assert.match(large, /--md-comp-fab-container-width:\s*6rem/);
    assert.match(large, /--md-comp-fab-container-shape:\s*var\(--md-sys-shape-corner-extra-large\)/);
    assert.match(large, /--md-comp-fab-icon-size:\s*2\.25rem/);
  });

  test('the large size does not resize a FAB written as `circle large`', () => {
    // `.large` is the alias for the default FAB, so `&.large` nested in the
    // FAB block would also compile `.large.circle.large` and grow every
    // aliased 56dp FAB to 96dp. The size has to name `.extra`.
    const rules = css
      .split('}')
      .filter((rule) => /--md-comp-fab-container-height:\s*6rem/.test(rule));
    assert.ok(rules.length > 0, 'no rule sizes the large FAB');
    for (const rule of rules) {
      // Everything between the enclosing layer's brace and this rule's own.
      const head = rule.slice(0, rule.lastIndexOf('{'));
      for (const selector of splitSelectors(head.slice(head.lastIndexOf('{') + 1))) {
        assert.match(
          selector,
          /\.extra\b/,
          `large-FAB rule matches without .extra:\n  ${selector.trim()}`
        );
      }
    }
  });

  test('the extended FAB sizes itself from its own token family', () => {
    const rule = /\.extend\b[^{]*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    assert.match(rule, /height:\s*var\(--md-comp-extended-fab-container-height\)/);
    assert.match(rule, /gap:\s*var\(--md-comp-extended-fab-icon-label-space\)/);
    assert.match(
      rule,
      /padding-inline:\s*var\(--md-comp-extended-fab-leading-space\) var\(--md-comp-extended-fab-trailing-space\)/
    );
    assert.match(rule, /border-radius:\s*var\(--md-comp-extended-fab-container-shape\)/);
    assert.match(css, /:where\(\.small, \.medium, \.large\)\.extend\s*\{/);
    assert.doesNotMatch(rule, /--md-comp-extended-fab-(?:container-height|trailing-space):/);
    assert.doesNotMatch(rule, /font-size:/);
    // The original bug: `:has(> icon + label)` was two classes, so it won the
    // leading edge and pulled `extend small` to a 32dp common button's 12dp
    // inset. M3 Expressive's spacing is symmetric at every size, so that rule
    // is gone - and nothing may bring back a padding rule that outranks the
    // extended FAB's own one-class `padding-inline`.
    assert.doesNotMatch(
      css,
      /:has\([^)]*\)[^{}]*\{[^}]*padding-inline-(?:start|end):\s*var\(--md-comp-filled-button/
    );

    const small = /\.extend\.small[^{]*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    assert.match(small, /--md-comp-extended-fab-container-height:\s*3\.5rem/);
    assert.match(small, /--md-comp-extended-fab-container-shape:\s*16px/);
    assert.match(small, /--md-comp-extended-fab-icon-size:\s*1\.5rem/);
    assert.match(small, /--md-comp-extended-fab-leading-space:\s*16px/);
    assert.match(small, /--md-comp-extended-fab-icon-label-space:\s*8px/);
    assert.match(small, /--md-comp-extended-fab-trailing-space:\s*16px/);
  });

  // md.comp.extended-fab.{small,medium,large}.*, DSP 34.0.21.
  const EXTENDED_SIZES = {
    small: { height: 56, shape: 16, icon: 24, space: 16, gap: 8, label: 'title-medium' },
    medium: { height: 80, shape: 20, icon: 28, space: 26, gap: 12, label: 'title-large' },
    large: { height: 96, shape: 28, icon: 36, space: 28, gap: 16, label: 'headline-small' }
  };

  for (const [size, spec] of Object.entries(EXTENDED_SIZES)) {
    test(`the ${size} extended FAB is ${spec.height}dp with a ${spec.icon}dp icon`, () => {
      const rule = new RegExp(`\\.extend\\.${size}[^{]*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
      assert.ok(rule, `no .extend.${size} rule in the sheet`);
      for (const [token, value] of [
        ['container-height', spec.height],
        ['container-shape', spec.shape],
        ['icon-size', spec.icon],
        ['leading-space', spec.space],
        ['icon-label-space', spec.gap],
        ['trailing-space', spec.space]
      ]) {
        const written = ['container-height', 'icon-size'].includes(token) ? `${value / 16}rem` : `${value}px`;
        assert.match(rule, new RegExp(`--md-comp-extended-fab-${token}:\\s*${written}`));
      }
      // The label grows with the size, and the size class is the same one
      // class the extended FAB's own rule is - so it has to restate the role
      // or the base rule's label-large decides it.
      assert.match(
        rule,
        new RegExp(`font-size:\\s*var\\(--md-sys-typescale-${spec.label}-font-size\\)`)
      );
    });
  }

  test('the colour roles set tokens, so the state layers follow the role', () => {
    // The hover and focus layers mix the label colour into the container
    // colour. A role that painted `background-color` directly would keep the
    // primary-container state layers underneath it.
    for (const role of ['primary', 'secondary', 'tertiary']) {
      const rule =
        new RegExp(`\\.extend\\.${role}-container[^{]*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
      assert.ok(rule, `no .extend.${role}-container rule in the sheet`);
      assert.match(
        rule,
        new RegExp(
          `--md-comp-extended-fab-container-color:\\s*var\\(\\s*--md-sys-color-${role}-container`
        )
      );
      assert.match(
        rule,
        new RegExp(
          `--md-comp-extended-fab-label-text-color:\\s*var\\(\\s*--md-sys-color-on-${role}-container`
        )
      );
    }

    for (const state of ['hover', 'focus']) {
      const rule = new RegExp(`\\.extend:${state}[^{]*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
      assert.ok(rule, `no .extend:${state} rule in the sheet`);
      assert.match(
        rule,
        new RegExp(
          `color-mix\\(in oklab, var\\(--md-comp-extended-fab-label-text-color\\) .*` +
            `var\\(--md-comp-extended-fab-container-color\\)\\)`
        ),
        `the ${state} layer does not mix the extended FAB's own colour tokens`
      );
    }
  });

  test('a colour utility does not repaint a component that names the same role', () => {
    // Utilities are emitted after components and win by layer order, not by
    // weight: a bare `.secondary-container` would replace the container
    // colour and leave the label colour and both state layers behind. On the
    // FAB menu the class sits on the host, a bare box behind a round FAB, so
    // the fill lands as a square - every host that names these three roles as
    // its own colour axis has to be carved out, not just the first one.
    for (const role of ['primary-container', 'secondary-container', 'tertiary-container']) {
      assert.doesNotMatch(css, new RegExp(`\\.${role}\\s*\\{\\s*background-color:`));
      assert.match(
        css,
        new RegExp(`\\.${role}:not\\(\\.extend\\):not\\(\\.fab-menu\\)\\s*\\{\\s*background-color:`)
      );
    }
  });

  test('every extended FAB token a rule reads is one the sheet declares', () => {
    // The whole component was a comment block and a token family that no
    // rule ever read; a var() naming an undeclared property is the same
    // failure with the rule present.
    const declared = new Set(
      [...css.matchAll(/(--md-comp-extended-fab-[\w-]+)\s*:/g)].map((m) => m[1])
    );
    const read = new Set(
      [...css.matchAll(/var\(\s*(--md-comp-extended-fab-[\w-]+)/g)].map((m) => m[1])
    );
    assert.deepEqual([...read].filter((p) => !declared.has(p)), []);
    assert.deepEqual([...declared].filter((p) => !read.has(p)), []);
  });
  test('the FAB states its container and icon size as tokens', () => {
    assert.match(css, /--md-comp-fab-container-height:\s*3\.5rem/);
    assert.match(css, /--md-comp-fab-container-width:\s*3\.5rem/);
    assert.match(css, /--md-comp-fab-container-shape:\s*var\(--md-sys-shape-corner-large\)/);
    assert.match(css, /--md-comp-fab-icon-size:\s*1\.5rem/);
    assert.match(css, /border-radius:\s*var\(--md-comp-fab-container-shape\)/);
    assert.match(css, /width:\s*var\(--md-comp-fab-container-width\)/);
    assert.match(css, /height:\s*var\(--md-comp-fab-container-height\)/);
  });
});

describe('Text field icon selectors', () => {
  test('trailing icons are selected by .suffix, not only :last-child', () => {
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    // Documented markup puts both icons before the input, so a
    // `:last-child` rule never matches the trailing icon and it
    // sits in flow above the well. 1.0 drops the positional <i> path.
    assert.match(css, /\.field\s*>\s*\.suffix/);
    assert.match(css, /\.field\s*>\s*\.prefix/);
    assert.doesNotMatch(css, /\.field\s*>\s*i:(first|last)-of-type/);
  });
});

describe('Select caret position', () => {
  test('the floating-label span rule excludes .caret', () => {
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    // `.field > span:not(...)` is the floating label. The caret is a
    // <span class="caret">, so omitting it from the :not() list set a 16px
    // start inset. Combined with width:24px that ignored inset-inline-end
    // and pinned the chevron over the value.
    assert.match(
      css,
      /\.field\s*>\s*span:not\([^)]*\.caret[^)]*\)/
    );
    assert.match(css, /\.caret\s*\{[^}]*inset-inline-start:\s*auto/s);
  });
});


describe('App bar scroll fill', () => {
  test('a fixed bar fills with surface-container on scroll, not a shadow', () => {
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    assert.match(css, /--md-comp-top-app-bar-scrolled-container-color:\s*var\(--md-sys-color-surface-container\)/);
    assert.match(css, /@keyframes\s+top-app-bar-scroll/);
    // Mix progress is a number. Typing the fill as <color> made
    // light-dark() IACVT and the lerp used transparent-black.
    assert.match(css, /@property\s+--md-comp-top-app-bar-scroll/);
    assert.match(css, /syntax:\s*"<number>"/);
    assert.match(
      css,
      /color-mix\(\s*in oklab,\s*var\(--md-comp-top-app-bar-scrolled-container-color\)/
    );
    assert.match(
      css,
      /top-app-bar-scroll[^{]*\{[^}]*--md-comp-top-app-bar-scroll:\s*1/s
    );
    assert.doesNotMatch(css, /@property\s+--md-comp-top-app-bar-container-color/);
    assert.doesNotMatch(
      css,
      /@keyframes\s+top-app-bar-scroll\s*\{[^}]*box-shadow/s
    );
  });
});

describe('App bar medium and large', () => {
  test('trailing actions are pushed to the end and the title sits on the bottom row', () => {
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    // Without these, order+100% basis leaves every icon packed at the
    // start and align-content:flex-start pins the title under them, so
    // the 112/152dp bar reads as a small toolbar.
    //
    // Asserted on what the rule must *say* rather than on its exact selector
    // text: the host became :is(nav:not(...), .bar) when a bar with no
    // destinations stopped being a <nav>, and a literal-text regex broke on
    // the parentheses that :is() introduced.
    /** Every rule in the sheet whose body declares `prop: value`. */
    const rulesDeclaring = (prop, value) =>
      [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)]
        .filter((m) => new RegExp(`${prop}:\\s*${value}`).test(m[2]))
        .map((m) => m[1]);

    const spaceBetween = rulesDeclaring('align-content', 'space-between').filter((sel) =>
      /header\.(?:medium|large)\b/.test(sel)
    );
    assert.equal(spaceBetween.length, 1, 'exactly one app bar rule sets align-content: space-between');
    assert.match(spaceBetween[0], /header\.medium\b/);
    assert.match(spaceBetween[0], /header\.large\b/);
    assert.match(spaceBetween[0], /nav:not\(\.tabs\b/, 'must not reach a tab bar');

    const pushedToEnd = rulesDeclaring('margin-inline-start', 'auto').filter((sel) =>
      /header\.(?:medium|large)\b/.test(sel)
    );
    assert.ok(pushedToEnd.length > 0, 'no app bar rule pushes the trailing actions to the end');
  });
});

describe('App bar icon actions', () => {
  test('an icon-only action is found by the icon class list, not by <i>', () => {
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    // The canonical icon is <span class="material-symbols">. Keying the
    // 48dp circular target on `i` meant every bar written the documented
    // way lost it: the leading action fell through to the generic button
    // pill (72x40, tonal fill) and the trailing ones were swept up by the
    // text-destination rule and rendered at label-large with 12dp padding.
    const iconAction = [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)]
      .map((m) => ({ sel: m[1], body: m[2] }))
      .filter(
        (r) =>
          /header:has\(>/.test(r.sel) &&
          /:is\(a, button\)/.test(r.sel) &&
          /only-child/.test(r.sel) &&
          /border-radius:\s*50%/.test(r.body)
      );
    assert.equal(iconAction.length, 1, 'exactly one app bar icon-action rule');
    assert.match(iconAction[0].sel, /\.material-symbols/);
    assert.match(iconAction[0].body, /width:\s*3rem/);
    assert.match(iconAction[0].body, /height:\s*3rem/);

    // ...and the destination rule has to exclude the same set, or an
    // icon-only link matches both.
    const destination = [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)]
      .map((m) => ({ sel: m[1], body: m[2] }))
      .filter((r) => /header:has\(>/.test(r.sel) && /a:not\(:has\(>/.test(r.sel));
    assert.ok(destination.length > 0, 'no app bar text-destination rule');
    for (const rule of destination) {
      assert.match(rule.sel, /a:not\(:has\(>\s*:is\(\.material-symbols/);
    }
  });
});

describe('App bar trailing icon token', () => {
  test('the trailing token colours the actions after the headline, and nothing else', () => {
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    const rules = [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)].map((m) => ({ sel: m[1], body: m[2] }));

    // The token was declared and consumed by nothing, so the documented way
    // to opt into the spec's muted trailing icons did nothing at all - and
    // the docs had just been corrected to point at it.
    const uses = rules.filter((r) =>
      /color:\s*var\(--md-comp-top-app-bar-trailing-icon-color\)/.test(r.body)
    );
    assert.equal(uses.length, 1, 'the trailing icon token must be consumed by exactly one rule');

    // Scoped by DOM order: leading is before the title slot, trailing after.
    // The title slot is the heading, an hgroup, or a search-bar.
    assert.match(uses[0].sel, /hgroup/);
    assert.match(uses[0].sel, /search-bar/);
    assert.match(uses[0].sel, /~/);
    assert.match(uses[0].sel, /\.material-symbols/);

    const declared = rules.filter((r) =>
      /--md-comp-top-app-bar-trailing-icon-color:/.test(r.body)
    );
    assert.ok(declared.length > 0, 'the trailing icon token must still be declared');

    // The leading token keeps its own rule - one token per side.
    const leading = rules.filter((r) =>
      /color:\s*var\(--md-comp-top-app-bar-leading-icon-color\)/.test(r.body)
    );
    assert.equal(leading.length, 1);
  });
});

describe('App bar medium and large geometry', () => {
  test('the top row is 64dp and the headline sits on the spec insets', () => {
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    const bodyOf = (test) =>
      [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)].filter((m) => test(m[1])).map((m) => m[2]);

    // 8dp centres the 48dp targets in the 64dp row the bar collapses to;
    // 4dp put them 4dp high and left the title 4dp short of its inset.
    const shared = bodyOf(
      (sel) => /header\.medium\b/.test(sel) && /header\.large\b/.test(sel) && !/::before/.test(sel)
    );
    assert.ok(shared.some((b) => /padding-top:\s*8px/.test(b)));

    // A title-only bar has one flex line, and space-between pins one line
    // to the *top* - the headline landed where the icons belong. The
    // spacer gives the icon row a height of its own; the headline's basis
    // has to exceed the line or it fits beside that zero-width spacer.
    const spacer = bodyOf((sel) => /header\.medium\b/.test(sel) && /::before/.test(sel));
    assert.ok(spacer.some((b) => /height:\s*3rem/.test(b)), 'no 48dp top-row spacer');
    const headline = bodyOf(
      (sel) => /header\.medium\b/.test(sel) && /h1, h2/.test(sel) && !/\+ \*/.test(sel)
    );
    assert.ok(headline.some((b) => /flex:\s*1 1 calc\(100% \+ 1px\)/.test(b)));

    // Expanded headline: 16dp from the inline edges (4dp of it paid by the
    // bar), 20dp above the bottom on medium and on large without a subtitle.
    // Large with a subtitle keeps 28dp so 8+48+44+24+28 = 152.
    const medium = bodyOf((sel) => /header\.medium\b/.test(sel) && !/header\.large\b/.test(sel));
    assert.ok(medium.some((b) => /padding-bottom:\s*20px/.test(b)));
    assert.ok(medium.some((b) => /padding:\s*0 12px/.test(b)));
    const large = bodyOf((sel) => /header\.large\b/.test(sel) && !/header\.medium\b/.test(sel));
    assert.ok(large.some((b) => /padding-bottom:\s*20px/.test(b)));
    assert.ok(large.some((b) => /padding-bottom:\s*28px/.test(b)));
    assert.ok(large.some((b) => /padding:\s*0 12px/.test(b)));
  });
});

describe('retired Feature Discovery', () => {
  test('does not emit tap-target styles or export TapTarget', () => {
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    assert.doesNotMatch(css, /\.tap-target/);
    assert.doesNotMatch(css, /--md-comp-tap-target/);
    assert.equal(Expressive.TapTarget, undefined);
  });
});

describe('retired Pushpin', () => {
  test('does not emit .pushpin or the pin classes', () => {
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    assert.doesNotMatch(css, /\.pushpin\s*\{/);
    assert.doesNotMatch(css, /\.pin-top/);
    assert.doesNotMatch(css, /\.pin-bottom/);
    assert.doesNotMatch(css, /\.pinned\s*\{/);
  });
});

describe('retired app bar tabs', () => {
  test('does not style .tabs as a header secondary row', () => {
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    assert.doesNotMatch(css, /header[^{]*\s>\s*\.tabs\s*\{/);
    assert.doesNotMatch(css, /\.tabs\.transparent\s*\{/);
  });
});

describe('Autocomplete menuOptions.onItemClick', () => {
  beforeEach(resetBody);

  test('forwards the clicked li on the Menu instance, and still selects', () => {
    // The wrapper Autocomplete installs used to call the user handler with
    // the input element, so a handler written against the documented Menu
    // contract - onItemClick(li) - got the wrong node.
    document.body.innerHTML = `<div class="field"><input class="autocomplete" type="text" id="ac"></div>`;
    const el = document.getElementById('ac');
    const seen = [];
    const instance = Expressive.Autocomplete.init(el, {
      data: [{ id: 'apple', text: 'Apple' }],
      menuOptions: {
        onItemClick(li) {
          seen.push({ li, self: this });
        }
      }
    });
    try {
      const li = instance.container.querySelector('li[data-id="apple"]');
      fire(li, 'click');
      assert.equal(seen.length, 1);
      assert.equal(seen[0].li, li);
      assert.equal(seen[0].self, instance.menu);
      // The unconditional half of the wrapper: the entry is still selected.
      assert.equal(el.value, 'Apple');
    } finally {
      instance.destroy();
    }
  });

  test('selects without a user handler', () => {
    document.body.innerHTML = `<div class="field"><input class="autocomplete" type="text" id="ac"></div>`;
    const el = document.getElementById('ac');
    const instance = Expressive.Autocomplete.init(el, { data: [{ id: 'pear', text: 'Pear' }] });
    try {
      fire(instance.container.querySelector('li[data-id="pear"]'), 'click');
      assert.equal(el.value, 'Pear');
    } finally {
      instance.destroy();
    }
  });
});

describe('Autocomplete typing', () => {
  for (const isMultiSelect of [false, true]) {
    test(`renders each result once per keystroke in an open menu (isMultiSelect: ${isMultiSelect})`, async () => {
      document.body.innerHTML = `<div class="field"><input class="autocomplete" type="text" id="ac"></div>`;
      const el = document.getElementById('ac');
      const data = [{ id: 'apple', text: 'Apple' }, { id: 'apricot', text: 'Apricot' }, { id: 'pear', text: 'Pear' }];
      const instance = Expressive.Autocomplete.init(el, { data, isMultiSelect, menuOptions: { inDuration: 0, outDuration: 0 } });
      try {
        el.focus();
        el.value = 'a';
        fire(el, 'input');
        await new Promise((resolve) => setTimeout(resolve, 10));
        assert.equal(instance.menu.isOpen, true);
        let rendered = 0;
        const create = instance._createMenuItem.bind(instance);
        instance._createMenuItem = (entry) => (rendered++, create(entry));
        el.value = 'ap';
        fire(el, 'input');
        assert.deepEqual([...instance.container.querySelectorAll('li')].map((li) => li.dataset.id), ['apple', 'apricot']);
        // One pass over the two matches. The old results used to be rendered
        // first, and isMultiSelect rendered the new ones twice.
        assert.equal(rendered, 2);
      } finally {
        instance.destroy();
      }
    });
  }
});

describe('Autocomplete keys while the list is closed', () => {
  test('Space and Enter reach the field, and ArrowDown opens the rendered list', async () => {
    document.body.innerHTML = `<div class="field"><input class="autocomplete" type="text" id="ac"></div>`;
    const el = document.getElementById('ac');
    const instance = Expressive.Autocomplete.init(el, {
      data: [{ id: 'apple' }, { id: 'apricot' }], menuOptions: { inDuration: 0, outDuration: 0 }
    });
    const key = (name) => {
      const event = new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
      el.dispatchEvent(event);
      return event.defaultPrevented;
    };
    try {
      el.focus();
      el.value = 'ap';
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(instance.menu.isOpen, false);
      assert.equal(key(' '), false, 'Space types a space');
      assert.equal(key('Enter'), false, 'Enter can submit the form');
      assert.equal(instance.menu.isOpen, false);
      assert.equal(key('ArrowDown'), true);
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(instance.menu.isOpen, true);
      assert.deepEqual([...instance.container.querySelectorAll('li')].map((li) => li.dataset.id), ['apple', 'apricot']);
    } finally {
      instance.destroy();
    }
  });
});

describe('Autocomplete searches', () => {
  test('keep the full data set and fire change only when the selection changes', async () => {
    document.body.innerHTML = `<div class="field"><input class="autocomplete" type="text" id="ac"></div>`;
    const el = document.getElementById('ac');
    const data = [{ id: 'go', text: 'Google' }, { id: 'gh', text: 'GitHub' }];
    const instance = Expressive.Autocomplete.init(el, {
      data,
      // The documented custom filter, which does not restore options.data.
      onSearch: (text, ac) => ac.setMenuItems(ac.options.data.filter((d) => d.text.toLowerCase().includes(text.toLowerCase()))),
      menuOptions: { inDuration: 0, outDuration: 0 }
    });
    let changes = 0;
    el.addEventListener('change', () => changes++);
    const search = (value) => { el.value = value; fire(el, 'input'); };
    try {
      el.focus();
      search('goo');
      search('g');
      assert.equal(instance.options.data, data);
      assert.deepEqual(instance.menuItems.map((d) => d.id), ['go', 'gh']);
      assert.equal(changes, 0, 'searching is not selecting');
      instance.selectOption('go');
      assert.equal(changes, 1);
      search('Googl');
      assert.equal(changes, 2, 'editing the text deselects');
      search('');
      assert.equal(changes, 2, 'nothing left to deselect');
    } finally {
      instance.destroy();
    }
  });
});

describe('Autocomplete search cancellation', () => {
  test('aborts the running search when a newer one starts, and on destroy', () => {
    document.body.innerHTML = `<div class="field"><input class="autocomplete" type="text" id="ac"></div>`;
    const el = document.getElementById('ac');
    const signals = [];
    const instance = Expressive.Autocomplete.init(el, {
      data: [{ id: 'go', text: 'Google' }],
      onSearch: (text, ac, signal) => signals.push([text, signal]),
      menuOptions: { inDuration: 0, outDuration: 0 }
    });
    const search = (value) => { el.value = value; fire(el, 'input'); };
    el.focus();
    search('g');
    search('go');
    assert.deepEqual(signals.map(([text, signal]) => [text, signal.aborted]), [['g', true], ['go', false]],
      'a newer search aborts the stale one, so a page passing the signal to fetch() drops its response');
    instance.destroy();
    assert.equal(signals[1][1].aborted, true, 'destroy aborts the last search');
  });
});

describe('Autocomplete searchDelay', () => {
  beforeEach(() => resetBody());

  /** An autocomplete whose onSearch records each text and signal. */
  const setup = (options = {}, id = 'ac') => {
    document.body.insertAdjacentHTML('beforeend', `<div class="field"><input class="autocomplete" type="text" id="${id}"></div>`);
    const el = document.getElementById(id);
    const calls = [];
    const instance = Expressive.Autocomplete.init(el, {
      searchDelay: 300,
      menuOptions: { inDuration: 0, outDuration: 0 },
      onSearch: (text, ac, signal) => calls.push({ text, signal }),
      ...options
    });
    const type = (value) => { el.value = value; fire(el, 'input'); };
    return { el, calls, instance, type };
  };
  const timers = (t) => t.mock.timers.enable({ apis: ['setTimeout'] });

  test('waits for typing to pause and searches once with the full text', (t) => {
    timers(t);
    const { el, calls, instance, type } = setup();
    try {
      el.focus();
      for (const value of ['a', 'ap', 'app', 'appl', 'apple']) {
        type(value);
        t.mock.timers.tick(50);
      }
      t.mock.timers.tick(249);
      assert.equal(calls.length, 0, 'searched before the delay passed');
      t.mock.timers.tick(1);
      assert.deepEqual(calls.map((c) => [c.text, c.signal.aborted]), [['apple', false]]);
    } finally {
      instance.destroy();
      t.mock.timers.reset();
    }
  });

  test('a pause gives a second search and aborts the first one when the text changes', (t) => {
    timers(t);
    const { el, calls, instance, type } = setup();
    try {
      el.focus();
      type('apple');
      t.mock.timers.tick(300);
      type('apple p');
      assert.equal(calls[0].signal.aborted, true, 'the first signal outlived the text it searched');
      type('apple pi');
      t.mock.timers.tick(300);
      assert.deepEqual(calls.map((c) => [c.text, c.signal.aborted]), [['apple', true], ['apple pi', false]]);
    } finally {
      instance.destroy();
      t.mock.timers.reset();
    }
  });

  test('shows the loading status before the delayed search runs', (t) => {
    timers(t);
    const { el, calls, instance, type } = setup();
    try {
      el.focus();
      type('a');
      assert.equal(calls.length, 0);
      assert.ok(el.parentElement.querySelector('.status-info svg'), 'no loading indicator');
      assert.equal(el.parentElement.querySelector('.autocomplete-status').textContent, 'Loading results.');
    } finally {
      instance.destroy();
      t.mock.timers.reset();
    }
  });

  test('focus searches at once and drops the pending search', (t) => {
    timers(t);
    const { el, calls, instance, type } = setup();
    try {
      el.focus();
      type('ap');
      el.blur();
      el.value = 'apple';
      el.focus();
      assert.deepEqual(calls.map((c) => c.text), ['apple'], 'focus did not search at once');
      t.mock.timers.tick(300);
      assert.deepEqual(calls.map((c) => c.text), ['apple'], 'the pending search still ran');
    } finally {
      instance.destroy();
      t.mock.timers.reset();
    }
  });

  test('blur and destroy cancel the pending search', (t) => {
    timers(t);
    const blurred = setup({}, 'ac-blur');
    const destroyed = setup({}, 'ac-destroy');
    try {
      blurred.el.focus();
      blurred.type('a');
      blurred.el.blur();
      destroyed.el.focus();
      destroyed.type('a');
      t.mock.timers.tick(300);
      destroyed.type('ab');
      destroyed.instance.destroy();
      t.mock.timers.tick(300);
      assert.equal(blurred.calls.length, 0, 'searched after blur');
      assert.deepEqual(destroyed.calls.map((c) => [c.text, c.signal.aborted]), [['a', true]], 'searched after destroy');
    } finally {
      blurred.instance.destroy();
      if (Expressive.Autocomplete.getInstance(destroyed.el)) destroyed.instance.destroy();
      t.mock.timers.reset();
    }
  });

  test('Escape lets the pending search run without opening the list', (t) => {
    timers(t);
    const item = { id: 'apple', text: 'Apple' };
    const { el, calls, instance, type } = setup({
      onSearch: (text, ac, signal) => { calls.push({ text, signal }); ac.setMenuItems([item]); }
    });
    try {
      el.focus();
      type('a');
      el.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      t.mock.timers.tick(300);
      assert.deepEqual(calls.map((c) => c.text), ['a']);
      assert.deepEqual(instance.menuItems, [item]);
      assert.equal(instance.menu.isOpen, false, 'late results opened a dismissed list');
    } finally {
      instance.destroy();
      t.mock.timers.reset();
    }
  });

  test('choosing a result drops the pending search, so the list stays closed', (t) => {
    timers(t);
    const item = { id: 'apple', text: 'Apple' };
    const { el, calls, instance, type } = setup({
      onSearch: (text, ac, signal) => { calls.push({ text, signal }); ac.setMenuItems([item]); }
    });
    try {
      el.focus();
      type('a');
      t.mock.timers.tick(300);
      type('ap');
      instance.selectOption('apple');
      t.mock.timers.tick(300);
      assert.deepEqual(calls.map((c) => c.text), ['a'], 'the pending search ran on the chosen label');
      assert.equal(el.value, 'Apple');
      assert.equal(instance.menu.isOpen, false, 'the pending search reopened the list');
    } finally {
      instance.destroy();
      t.mock.timers.reset();
    }
  });

  for (const searchDelay of [undefined, 0, -1, NaN]) {
    test(`searchDelay ${searchDelay} searches on every input, synchronously`, (t) => {
      timers(t);
      const { el, calls, instance, type } = setup({ searchDelay });
      try {
        el.focus();
        type('a');
        type('ap');
        assert.deepEqual(calls.map((c) => [c.text, c.signal.aborted]), [['a', true], ['ap', false]]);
      } finally {
        instance.destroy();
        t.mock.timers.reset();
      }
    });
  }
});

describe('Autocomplete allowCreate', () => {
  beforeEach(() => resetBody());

  const data = [{ id: 'apple', text: 'Apple' }, { id: 'banana', text: 'Banana' }];
  /** An autocomplete with a create row, logging its callback and event in order. */
  const setup = (options = {}, id = 'ac') => {
    document.body.insertAdjacentHTML('beforeend', `<div class="field"><input class="autocomplete" type="text" id="${id}"></div>`);
    const el = document.getElementById(id);
    const log = [];
    const instance = Expressive.Autocomplete.init(el, {
      data,
      allowCreate: true,
      menuOptions: { inDuration: 0, outDuration: 0 },
      onCreate: (text, ac) => log.push(['callback', text, ac]),
      ...options
    });
    el.addEventListener('expressive:create', (e) => log.push(['event', e.detail]));
    const type = (value) => { el.value = value; fire(el, 'input'); };
    const key = (name) => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
    const rows = () => [...instance.container.querySelectorAll('li')];
    const createRow = () => instance.container.querySelector('li[data-create]');
    /** Arrows down to the last row, the create row when there is one. */
    const toLast = async () => {
      await sleep(10);
      for (let i = 0; i < rows().length; i++) key('ArrowDown');
    };
    return { el, instance, log, type, key, rows, createRow, toLast };
  };

  test('Enter on the create row reports the typed text and closes the list', async () => {
    const { el, instance, log, type, key, rows, createRow, toLast } = setup();
    try {
      el.focus();
      type('kiwi');
      assert.equal(rows().at(-1), createRow());
      assert.equal(createRow().textContent, 'Add "kiwi"');
      await toLast();
      assert.equal(el.getAttribute('aria-activedescendant'), createRow().id);
      key('Enter');
      assert.deepEqual(log, [['callback', 'kiwi', instance], ['event', { text: 'kiwi' }]]);
      assert.equal(instance.isOpen, false);
    } finally {
      instance.destroy();
    }
  });

  test('an exact match offers no row and a partial match offers it last', () => {
    const { el, instance, type, rows, createRow } = setup();
    // The default search keeps whitespace, so " Apple " needs one that trims.
    const trimmed = setup({
      onSearch: (text, ac) => ac.setMenuItems(data.filter((d) => d.text.toLowerCase().includes(text.trim().toLowerCase())))
    }, 'trimmed');
    try {
      el.focus();
      type('apple');
      assert.equal(createRow(), null);
      type('app');
      assert.deepEqual(rows().map((li) => li.dataset.id ?? li.textContent), ['apple', 'Add "app"']);
      trimmed.el.focus();
      trimmed.type(' Apple ');
      assert.deepEqual(trimmed.rows().map((li) => li.dataset.id), ['apple']);
    } finally {
      instance.destroy();
      trimmed.instance.destroy();
    }
  });

  test('no row while the option is off or the text is blank or too short', () => {
    const off = setup({ allowCreate: false }, 'off');
    const short = setup({ minLength: 3 }, 'short');
    try {
      off.el.focus();
      off.type('kiwi');
      assert.equal(off.createRow(), null);
      short.el.focus();
      short.type('   ');
      assert.equal(short.createRow(), null, 'blank text');
      short.type('ki');
      assert.equal(short.createRow(), null, 'below minLength');
      short.type('  ki  ');
      assert.equal(short.createRow(), null, 'below minLength once trimmed');
    } finally {
      off.instance.destroy();
      short.instance.destroy();
    }
  });

  for (const allowUnsafeHTML of [false, true]) {
    test(`the row is an option whose label is plain text (allowUnsafeHTML: ${allowUnsafeHTML})`, () => {
      const { el, instance, type, createRow } = setup({ allowUnsafeHTML });
      try {
        el.focus();
        type('<b>kiwi</b>');
        const row = createRow();
        assert.equal(row.getAttribute('role'), 'option');
        assert.equal(row.getAttribute('aria-selected'), 'false');
        assert.ok(row.classList.contains('autocomplete-create'));
        assert.equal(row.hasAttribute('data-id'), false);
        assert.equal(row.textContent, 'Add "<b>kiwi</b>"');
        assert.equal(row.querySelector('b'), null);
      } finally {
        instance.destroy();
      }
    });
  }

  test('a click on the row reports it without selecting anything', () => {
    const { el, instance, log, type, createRow } = setup();
    let selected = 0;
    instance.selectOption = () => selected++;
    try {
      el.focus();
      type('kiwi');
      fire(createRow(), 'click');
      assert.deepEqual(log, [['callback', 'kiwi', instance], ['event', { text: 'kiwi' }]]);
      assert.equal(selected, 0);
    } finally {
      instance.destroy();
    }
  });

  for (const isMultiSelect of [false, true]) {
    test(`choosing the row keeps the selection and the text (isMultiSelect: ${isMultiSelect})`, async () => {
      let searches = 0;
      const { el, instance, type, key, toLast } = setup({
        isMultiSelect,
        onSearch: (text, ac) => (searches++, Expressive.Autocomplete.defaults.onSearch(text, ac))
      });
      const fired = [];
      el.addEventListener('change', () => fired.push('change'));
      el.addEventListener('expressive:autocomplete', () => fired.push('autocomplete'));
      try {
        el.focus();
        type('kiwi');
        await toLast();
        key('Enter');
        assert.deepEqual(instance.selectedValues, []);
        assert.deepEqual(fired, []);
        assert.equal(el.value, 'kiwi');
        const before = searches;
        fire(el, 'focus');
        assert.equal(searches, before, 'returning to the field is not a new search');
      } finally {
        instance.destroy();
      }
    });
  }

  test('the results announcement does not count the row', () => {
    const { el, instance, type } = setup();
    const announcer = el.parentElement.querySelector('.autocomplete-status');
    try {
      el.focus();
      type('kiwi');
      assert.equal(announcer.textContent, instance.options.i18n.noResults);
      type('ban');
      assert.equal(announcer.textContent, '1 result available.');
    } finally {
      instance.destroy();
    }
  });

  test('the row follows late results and the text', () => {
    const { el, instance, type, createRow } = setup({ onSearch: () => {} });
    const results = () => instance.setMenuItems([{ id: 'pear' }]);
    try {
      el.focus();
      type('pe');
      results();
      assert.deepEqual([...instance.container.querySelectorAll('li')].map((li) => li.dataset.id ?? li.textContent), ['pear', 'Add "pe"']);
      type('pea');
      results();
      assert.equal(createRow().textContent, 'Add "pea"');
      type('pear');
      results();
      assert.equal(createRow(), null);
    } finally {
      instance.destroy();
    }
  });

  test('a row left from older results creates the text it shows', async () => {
    const { el, instance, log, type, key, createRow } = setup({ onSearch: () => {} });
    try {
      el.focus();
      type('kiwi');
      instance.setMenuItems([]);
      await sleep(10);
      type('kiwis'); // its results have not arrived
      assert.equal(createRow().textContent, 'Add "kiwi"');
      key('ArrowDown');
      key('Enter');
      assert.deepEqual(log[0].slice(0, 2), ['callback', 'kiwi']);
    } finally {
      instance.destroy();
    }
  });

  test('after late results, returning to the field is not a new search', async () => {
    let searches = 0;
    const { el, instance, type, key } = setup({ onSearch: () => searches++ });
    try {
      el.focus();
      type('kiwi');
      instance.setMenuItems([]); // late results reset the search text
      await sleep(10);
      key('ArrowDown');
      key('Enter');
      const before = searches;
      fire(el, 'focus');
      assert.equal(searches, before);
    } finally {
      instance.destroy();
    }
  });

  test('choosing the row cancels a search waiting for typing to pause', async () => {
    let searches = 0;
    const { el, instance, type, key } = setup({
      searchDelay: 20,
      onSearch: (text, ac) => (searches++, ac.setMenuItems([]))
    });
    try {
      el.focus();
      type('kiwi');
      await sleep(40);
      assert.equal(instance.menu.isOpen, true);
      type('kiwi '); // a search is now waiting
      key('ArrowDown');
      key('Enter');
      await sleep(60);
      assert.equal(searches, 1, 'the waiting search never ran');
      assert.equal(instance.menu.isOpen, false, 'the list stays closed');
    } finally {
      instance.destroy();
    }
  });

  test('a click from the focused row returns focus to the field', () => {
    const { el, instance, type, createRow } = setup();
    try {
      el.focus();
      type('kiwi');
      const row = createRow();
      // A mouse press keeps the list through the blur that focusing the row causes.
      row.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, isPrimary: true, pointerType: 'mouse', button: 0 }));
      row.focus();
      fire(row, 'click');
      row.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, isPrimary: true, pointerType: 'mouse' }));
      assert.equal(document.activeElement, el);
    } finally {
      instance.destroy();
    }
  });
});

describe('Autocomplete no-results row', () => {
  beforeEach(() => resetBody());

  const data = [{ id: 'apple' }, { id: 'apricot' }];
  const setup = (options = {}) => {
    document.body.innerHTML = `<div class="field"><input class="autocomplete" type="text" id="ac"></div>`;
    const el = document.getElementById('ac');
    const instance = Expressive.Autocomplete.init(el, { data, menuOptions: { inDuration: 0, outDuration: 0 }, ...options });
    const type = (value) => { el.value = value; fire(el, 'input'); };
    const key = (key) => el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    const row = () => instance.container.querySelector('li.autocomplete-no-results');
    const optionRows = () => instance.container.querySelectorAll('li[role="option"]');
    el.focus();
    return { el, instance, type, key, row, optionRows };
  };

  test('a search with no match shows a row that is not an option, until a match appears', () => {
    const { el, instance, type, key, row, optionRows } = setup();
    try {
      type('z');
      assert.ok(row(), 'no row for a search with no match');
      assert.equal(row().textContent, 'No results.');
      assert.equal(row().getAttribute('role'), 'none');
      assert.equal(row().getAttribute('aria-hidden'), 'true');
      for (const name of ['id', 'data-id', 'tabindex']) assert.equal(row().hasAttribute(name), false, name);
      assert.equal(optionRows().length, 0);
      key('ArrowDown');
      key('Enter');
      assert.equal(instance.activeIndex, -1);
      assert.equal(el.hasAttribute('aria-activedescendant'), false);
      assert.deepEqual(instance.selectedValues, []);
      type('a');
      assert.equal(row(), null);
      assert.equal(optionRows().length, 2);
    } finally {
      instance.destroy();
    }
  });

  test('the row reads a custom i18n.noResults as text, also with allowUnsafeHTML', () => {
    const { instance, type, row } = setup({ allowUnsafeHTML: true, i18n: { noResults: '<b>none</b>' } });
    try {
      type('z');
      assert.equal(row().textContent, '<b>none</b>');
      assert.equal(row().querySelector('b'), null);
    } finally {
      instance.destroy();
    }
  });

  test('a press on the row keeps focus in the field and selects nothing', () => {
    const { el, instance, type, row } = setup();
    const events = [];
    for (const name of ['change', 'expressive:autocomplete', 'expressive:select']) el.addEventListener(name, () => events.push(name));
    try {
      type('z');
      const press = (name) => row().dispatchEvent(new window.MouseEvent(name, { bubbles: true, cancelable: true }));
      assert.equal(press('mousedown'), false, 'mousedown was not cancelled');
      press('click');
      assert.deepEqual(events, []);
      assert.ok(row(), 'the row left the list');
    } finally {
      instance.destroy();
    }
  });

  test('no row below minLength or while a changed search is pending', () => {
    const short = setup({ minLength: 3 });
    try {
      short.type('zz');
      assert.equal(short.row(), null);
    } finally {
      short.instance.destroy();
    }
    let pending = null;
    const slow = setup({ onSearch: (text, ac) => { pending = () => ac.setMenuItems([]); } });
    try {
      slow.type('z');
      pending();
      assert.ok(slow.row(), 'no row once the empty result arrived');
      slow.key('Escape');
      slow.type('zx');
      assert.equal(slow.row(), null, 'the row showed before the new search returned');
    } finally {
      slow.instance.destroy();
    }
  });

  test('with allowCreate, the row comes before the "Add" row, which arrow keys reach', () => {
    const { el, instance, type, key, row } = setup({ allowCreate: true });
    try {
      type('kiwi');
      const [first, second] = instance.container.children;
      assert.equal(first, row());
      assert.ok(second.classList.contains('autocomplete-create'));
      key('ArrowDown');
      assert.equal(el.getAttribute('aria-activedescendant'), second.id);
    } finally {
      instance.destroy();
    }
  });

  test('a multi-select shows the row above its chosen entries, which stay reachable', () => {
    const { el, instance, type, key, row, optionRows } = setup({ isMultiSelect: true, selected: ['apple'] });
    try {
      type('z');
      assert.equal(instance.container.firstElementChild, row());
      assert.deepEqual([...optionRows()].map((li) => li.dataset.id), ['apple']);
      key('ArrowDown');
      assert.equal(el.getAttribute('aria-activedescendant'), optionRows()[0].id);
      key('Enter');
      assert.deepEqual(instance.selectedValues, []);
    } finally {
      instance.destroy();
    }
  });
});

describe('Autocomplete disabled entries', () => {
  beforeEach(() => resetBody());

  const data = [
    { id: 'banana', text: 'Banana pie', disabled: true },
    { id: 'apple', text: 'Apple pie' },
    { id: 'cherry', text: 'Cherry pie', disabled: true }
  ];
  /** An open autocomplete over `data`, logging every selection report. */
  const setup = async (options = {}) => {
    document.body.innerHTML = `<div class="field"><input class="autocomplete" type="text" id="ac"></div>`;
    const el = document.getElementById('ac');
    const log = [];
    const instance = Expressive.Autocomplete.init(el, {
      data,
      menuOptions: { inDuration: 0, outDuration: 0 },
      onAutocomplete: () => log.push('callback'),
      ...options
    });
    el.addEventListener('change', () => log.push('change'));
    el.addEventListener('expressive:autocomplete', () => log.push('event'));
    const key = (name) => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
    const row = (id) => instance.container.querySelector(`li[data-id="${id}"]`);
    const ids = () => instance.selectedValues.map((entry) => entry.id);
    el.focus();
    el.value = 'pie';
    fire(el, 'input');
    await sleep(10);
    return { el, instance, log, key, row, ids };
  };

  test('no click, Enter or selectOption() selects a disabled entry in a single select', async () => {
    const { el, instance, log, key, row, ids } = await setup();
    try {
      fire(row('banana'), 'click');
      instance.selectOption('banana');
      key('ArrowDown');
      assert.notEqual(el.getAttribute('aria-activedescendant'), row('banana').id);
      assert.deepEqual(log, []);
      assert.deepEqual(ids(), []);
      assert.equal(el.value, 'pie');
      assert.equal(instance.isOpen, true);
      assert.equal(document.activeElement, el);
      key('Enter');
      assert.deepEqual(ids(), ['apple']);
      assert.deepEqual(log, ['change', 'callback', 'event']);
    } finally {
      instance.destroy();
    }
  });

  test('a multi select neither adds a disabled entry nor removes a preselected one', async () => {
    const { instance, log, row, ids } = await setup({ isMultiSelect: true, selected: ['cherry'] });
    try {
      for (const id of ['banana', 'cherry']) {
        fire(row(id), 'click');
        instance.selectOption(id);
      }
      assert.deepEqual(log, []);
      assert.deepEqual(ids(), ['cherry']);
      assert.equal(instance.isOpen, true);
      instance.selectOption('apple');
      assert.deepEqual(ids(), ['cherry', 'apple']);
      assert.deepEqual(log, ['change', 'callback', 'event']);
    } finally {
      instance.destroy();
    }
  });

  test('disabled rows stay options, report their real selection and disable their checkbox', async () => {
    const { instance, row } = await setup({ isMultiSelect: true, selected: ['cherry'] });
    try {
      const states = ['banana', 'apple', 'cherry'].map((id) => [
        id,
        row(id).getAttribute('role'),
        row(id).getAttribute('aria-disabled'),
        row(id).getAttribute('aria-selected'),
        row(id).querySelector('input').disabled,
        row(id).querySelector('input').checked
      ]);
      assert.deepEqual(states, [
        ['banana', 'option', 'true', 'false', true, false],
        ['apple', 'option', null, 'false', false, false],
        ['cherry', 'option', 'true', 'true', true, true]
      ]);
    } finally {
      instance.destroy();
    }
  });
});

describe('Autocomplete with delayed results', () => {
  for (const isMultiSelect of [false, true]) {
    test(`a new query clears the active result before its results arrive (isMultiSelect: ${isMultiSelect})`, async () => {
      document.body.innerHTML = `<div class="field"><input class="autocomplete" type="text" id="ac"></div>`;
      const el = document.getElementById('ac');
      const data = [{ id: 'apple', text: 'Apple' }, { id: 'pear', text: 'Pear' }];
      let pending = null;
      const instance = Expressive.Autocomplete.init(el, {
        data, isMultiSelect, menuOptions: { inDuration: 0, outDuration: 0 },
        onSearch: (text, ac) => { pending = () => ac.setMenuItems(data.filter((d) => d.text.toLowerCase().includes(text.toLowerCase()))); }
      });
      const key = (key) => el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      try {
        el.focus();
        el.value = 'a';
        fire(el, 'input');
        pending();
        await new Promise((resolve) => setTimeout(resolve, 10));
        key('ArrowDown');
        assert.equal(instance.activeIndex, 0, 'Apple is active');
        el.value = 'pear';
        fire(el, 'input');
        key('Enter'); // before the results for "pear" arrive
        assert.deepEqual(instance.selectedValues, []);
        assert.equal(el.value, 'pear');
      } finally {
        instance.destroy();
      }
    });
  }
});

describe('Chips', () => {
  test('a chip is excluded from the generic button rules', () => {
    // Assist and suggestion chips are real <button>s, which put them inside
    // `:where(button:not(...), a.button)`. The base rules were a harmless tie
    // that chips won on source order, but the *state* rules carry an extra
    // pseudo-class - `:where(...):not(...):hover` is two components against
    // `.chip`'s one - so hovering, focusing or pressing a chip repainted it
    // with the filled-button background while it kept the chip's own text
    // colour. Excluding `.chip` in $_not-btn is what stops that.
    //
    // Only the *generic* rule is at stake, so only a compound that begins its
    // selector is checked. A component that scopes the same shape to itself
    // (`.split-button > :where(button:not(.icon-button), a.button)`) is behind
    // an ancestor class, so it can never tie with a bare `.chip` and has no
    // business restating this list.
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    const buttonSelectors = (css.match(/(?:^|[,{}\n])\s*:where\(button:not\([^)]*\)/gm) ?? []).map(
      (m) => m.slice(m.indexOf(':where('))
    );
    assert.ok(buttonSelectors.length > 0, 'the generic button selector should exist');
    for (const sel of new Set(buttonSelectors)) {
      assert.match(sel, /\.chip\b/, `\`${sel}\` must exclude .chip`);
    }
  });

  test('excluding a chip does not widen the button selector specificity', () => {
    // Every entry in $_not-btn has to stay a single class. A descendant
    // selector such as `.chip .close` would make the `:not()` two classes and
    // silently shift the specificity of every button rule in the sheet.
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    const args = css.match(/:where\(button:not\(([^)]*)\)/)[1];
    for (const entry of args.split(',').map((s) => s.trim())) {
      assert.match(entry, /^\.[\w-]+$/, `\`${entry}\` must be a bare class`);
    }
  });
});

describe('Autocomplete', () => {
  beforeEach(resetBody);

  test('destroying right after open() does not fire a timer at a dead menu', async () => {
    // open() defers menu.open() to setTimeout(0) and destroy() did not cancel
    // it, so tearing down in the same tick let the callback run against a menu
    // whose element had been removed. It surfaced as an uncaught
    // "The provided value is not of type 'Element'" *after* the test had
    // passed, which is why nothing caught it for so long.
    document.body.innerHTML = `<div class="field"><input class="autocomplete" type="text" id="ac2"><label for="ac2">A</label></div>`;
    const el = document.getElementById('ac2');
    const instance = Expressive.Autocomplete.init(el, { data: [{ id: 'a', text: 'Apple' }] });
    instance.open();
    instance.destroy();
    // If the timer survived teardown it fires in here and fails the file.
    await sleep(10);
    assert.equal(Expressive.Autocomplete.getInstance(el), undefined);
  });

  const mountSearching = (options = {}) => {
    document.body.innerHTML = `<div class="field"><input class="autocomplete" type="text" id="ac"></div>`;
    const el = document.getElementById('ac');
    const searches = [];
    const instance = Expressive.Autocomplete.init(el, {
      data: [{ id: 'apple', text: 'Apple' }, { id: 'apricot', text: 'Apricot' }],
      menuOptions: { inDuration: 0, outDuration: 0 },
      onSearch: (text, ac) => { searches.push(text); Expressive.Autocomplete.defaults.onSearch(text, ac); },
      ...options
    });
    const key = (name) => {
      const event = new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
      el.dispatchEvent(event);
      return event.defaultPrevented;
    };
    // A real click focuses the tabindex=-1 row before the click lands.
    const clickRow = (id) => {
      const li = instance.container.querySelector(`li[data-id="${id}"]`);
      li.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, isPrimary: true, pointerType: 'mouse', button: 0 }));
      li.focus();
      li.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, isPrimary: true, pointerType: 'mouse' }));
      fire(li, 'click');
    };
    return { el, instance, searches, key, clickRow };
  };

  test('toggling a multi-select option keeps the active row and does not search again', async () => {
    const { el, instance, searches, key, clickRow } = mountSearching({ isMultiSelect: true });
    try {
      el.focus();
      el.value = 'ap';
      fire(el, 'input');
      await sleep(10);
      key('ArrowDown');
      key('ArrowDown');
      key('Enter');
      const rows = instance.container.querySelectorAll('li');
      assert.equal(instance.activeIndex, 1, 'Enter keeps the keyboard on the toggled row');
      assert.equal(el.getAttribute('aria-activedescendant'), rows[1].id);
      const before = searches.length;
      clickRow('apple');
      assert.equal(document.activeElement, el);
      assert.equal(searches.length, before, 'refocusing the field is not a new query');
      assert.equal(el.getAttribute('aria-activedescendant'), rows[1].id);
      assert.deepEqual(instance.selectedValues.map((entry) => entry.id), ['apricot', 'apple']);
      assert.equal(rows[0].getAttribute('aria-selected'), 'true');
      assert.equal(rows[0].querySelector('input').checked, true);
    } finally {
      instance.destroy();
    }
  });

  test('clicking a single-select option returns focus to the field', async () => {
    const { el, instance, searches, clickRow } = mountSearching();
    try {
      el.focus();
      el.value = 'ap';
      fire(el, 'input');
      await sleep(10);
      const before = searches.length;
      clickRow('apricot');
      await sleep(10);
      assert.equal(el.value, 'Apricot');
      assert.equal(document.activeElement, el);
      assert.equal(searches.length, before);
      assert.equal(instance.menu.isOpen, false);
    } finally {
      instance.destroy();
    }
  });

  test('Escape takes the key only when it closes the list, and late results stay closed', async () => {
    const pending = [];
    const { el, instance, key } = mountSearching({
      onSearch: (text, ac) => pending.push(() => ac.setMenuItems([{ id: 'apple', text: 'Apple' }]))
    });
    try {
      el.focus();
      el.value = 'ap';
      fire(el, 'input');
      assert.equal(key('Escape'), true, 'a pending open is cancelled, so a surrounding dialog stays open');
      assert.equal(key('Escape'), false, 'nothing left to close, so the dialog gets the key');
      pending.shift()();
      await sleep(10);
      assert.equal(instance.menu.isOpen, false, 'results for a dismissed list do not reopen it');
    } finally {
      instance.destroy();
    }
  });

  test('results set before the field is ever focused do not open the list', async () => {
    const { instance } = mountSearching();
    try {
      instance.setMenuItems([{ id: 'apple', text: 'Apple' }]);
      await sleep(10);
      assert.equal(instance.menu.isOpen, false);
    } finally {
      instance.destroy();
    }
  });

  test('destroy removes the combobox attributes it added', () => {
    const { el, instance } = mountSearching();
    instance.open();
    instance.destroy();
    for (const name of ['role', 'aria-autocomplete', 'aria-controls', 'data-target', 'aria-haspopup', 'aria-expanded', 'aria-activedescendant']) {
      assert.equal(el.hasAttribute(name), false, name);
    }
  });
});

describe('Tabs', () => {
  beforeEach(resetBody);

  for (const id of ['123', 'panel.dot', 'panel:details', 'panel[x]']) {
    test(`Tabs resolves the exact panel ID: ${id}`, () => {
      document.body.innerHTML = `<nav class="tabs"><a href="#base">Base</a><a href="#${id}">Special</a></nav>
        <section id="base" style="display:block">Base</section>
        <section id="${id}" class="authored" style="display:inline-block !important">Special</section>
        <aside id="panel" class="dot" x>Decoy</aside>`;
      const nav = document.querySelector('nav');
      const panel = document.getElementById(id);
      const decoy = document.getElementById('panel');
      const decoyMarkup = decoy.outerHTML;
      const shown = [];
      for (const hash of ['#' + id, '']) {
        let instance;
        window.location.hash = hash;
        try {
          instance = Expressive.Tabs.init(nav, { onShow: content => shown.push(content) });
          assert.equal(instance._content, hash ? panel : document.getElementById('base'));
          if (!hash) assert.equal(panel.style.display, 'none');
          instance.select('base');
          shown.length = 0;
          nav.querySelectorAll('a')[1].click();
          assert.equal(instance._content, panel);
          assert.deepEqual(shown, [panel]);
          assert.equal(panel.style.display, '');
          assert.equal(nav.querySelector('[aria-current="page"]').hash, '#' + id);
          assert.equal(decoy.outerHTML, decoyMarkup);
        } finally {
          instance?.destroy();
          window.location.hash = '';
        }
        assert.equal(panel.style.display, 'inline-block');
        assert.equal(panel.style.getPropertyPriority('display'), 'important');
        assert.equal(panel.className, 'authored');
        assert.equal(document.querySelector('.indicator'), null);
      }
    });
  }

  test('aria-current follows the active tab instead of staying where it was written', () => {
    // The markup names the initially current tab. Its *value* then changes as
    // the user clicks, which makes it the component's to maintain - the class
    // used to move on its own and leave aria-current behind, so a screen
    // reader kept announcing the first tab as current after switching.
    document.body.innerHTML = `
      <nav class="tabs" aria-label="Demo">
        <a class="active" aria-current="page" href="#t1">One</a>
        <a href="#t2">Two</a>
      </nav>
      <div id="t1">one</div><div id="t2">two</div>`;
    const el = document.querySelector('.tabs');
    const instance = Expressive.Tabs.init(el);
    try {
      const [first, second] = el.querySelectorAll('a');
      assert.equal(first.getAttribute('aria-current'), 'page');

      instance.select('t2');
      assert.equal(second.classList.contains('active'), true);
      assert.equal(second.getAttribute('aria-current'), 'page', 'the new tab must be current');
      assert.equal(first.getAttribute('aria-current'), null, 'the old tab must not still be current');

      // Exactly one, always.
      assert.equal(el.querySelectorAll('[aria-current]').length, 1);
    } finally {
      instance.destroy();
    }
  });

  test('Tabs without links, or swipeable tabs without panels, log instead of throwing', t => {
    const error = t.mock.method(console, 'error', () => {});
    document.body.innerHTML = `
      <nav class="tabs" id="empty"><button>One</button></nav>
      <nav class="tabs" id="orphan"><a href="#missing">One</a></nav>`;
    for (const id of ['empty', 'orphan']) {
      const instance = Expressive.Tabs.init(document.getElementById(id), { swipeable: true });
      instance.destroy();
      assert.equal(document.querySelector('.carousel'), null, `${id}: no swipe wrapper`);
    }
    assert.equal(error.mock.callCount(), 1, 'only the linkless bar is an error');
  });

  test('a hash-selected tab is marked current on init', () => {
    document.body.innerHTML = `
      <nav class="tabs" aria-label="Demo">
        <a class="active" aria-current="page" href="#t1">One</a>
        <a href="#t2">Two</a>
      </nav>
      <div id="t1">one</div><div id="t2">two</div>`;
    const el = document.querySelector('.tabs');
    window.location.hash = '#t2';
    const instance = Expressive.Tabs.init(el);
    try {
      const [first, second] = el.querySelectorAll('a');
      assert.equal(second.getAttribute('aria-current'), 'page');
      assert.equal(first.getAttribute('aria-current'), null);
    } finally {
      instance.destroy();
      window.location.hash = '';
    }
  });
});

describe('Footer', () => {
  test('the legal bar is found through a .container wrapper', () => {
    // `.container` is a supported columns wrapper for the footer - the column
    // rules already reach through it - but the copyright-bar selector only
    // matched a direct `footer > small`, so a footer written the documented
    // way got an unstyled legal row. The docs' own chrome had it for months.
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    const bar = [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)].find(
      (m) => /min-height:\s*var\(--md-comp-footer-legal-height\)/.test(m[2])
    );
    assert.ok(bar, 'no rule sets the footer legal-bar height');
    // Split on the selector list: `[^,]*` happily spans "> .container >", so a
    // looser pattern passes with the direct-child form deleted.
    const parts = bar[1].split(',').map((x) => x.trim());
    assert.ok(
      parts.some((p) => p.endsWith('> small:last-child') && !p.includes('.container')),
      `no direct-child form in: ${parts.join(' | ')}`
    );
    assert.ok(
      parts.some((p) => p.endsWith('.container > small:last-child')),
      `no .container form in: ${parts.join(' | ')}`
    );
  });
});

describe('Icon selectors keyed on the <i> element', () => {
  // The canonical icon is `<span class="material-symbols">`, so any selector
  // that says `i` stops matching documented markup - silently, because CSS
  // has no way to complain. `$icon` / `$icon-label` in abstracts/_variables
  // are the single place that distinction is made; these components each
  // made it themselves, and every one of them was dead on its own docs page.
  //
  // Asserted on the *rule that carries the declaration* rather than on
  // literal selector text: `$icon` interpolates to a six-arm `:is()` whose
  // spelling is not the point, and nesting it inside another `:is()` (as
  // _list.scss does) changes the text again.
  const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
  const rules = [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)].map((m) => ({
    selector: m[1].trim(),
    body: m[2]
  }));

  /** The rules whose selector matches `where` and whose body matches `what`. */
  const find = (where, what) =>
    rules.filter((r) => where.test(r.selector) && what.test(r.body));

  /**
   * Every rule that applies `what` under `where` must name the icon by class,
   * not only by element - otherwise it is dead against `<span>` markup.
   */
  function assertIconIsAClass(label, where, what) {
    const hits = find(where, what);
    assert.ok(hits.length > 0, `${label}: no rule matched - the probe is stale`);
    for (const hit of hits) {
      assert.match(
        hit.selector,
        /\.material-symbols/,
        `${label}: rule is keyed on the bare <i> element:\n  ${hit.selector}`
      );
    }
  }

  test('app bar icon-only actions are a 48dp circle', () => {
    assertIconIsAClass(
      'navbar',
      /^header.*:is\(a, button\)/,
      /border-radius:\s*50%/
    );
  });

  test('navigation bar draws the active indicator pill', () => {
    // The pill is drawn on the icon itself, so the box and the fill are
    // two rules. `.horizontal` fills the *host* instead, hence `>` here.
    assertIconIsAClass(
      'navigation-bar indicator box',
      /^\.navigation-bar\b/,
      /width:\s*var\(--md-comp-nav-bar-indicator-width\)/
    );
    assertIconIsAClass(
      'navigation-bar indicator fill',
      /\.navigation-bar\b[\s\S]*(\.active|\[aria-current\])\s*>/,
      /background-color:\s*var\(--md-comp-nav-bar-active-indicator-color\)/
    );
  });

  test('dialog header close button is an icon button, not a text button', () => {
    assertIconIsAClass(
      'dialog close',
      /^dialog\b.*header.*:has\(/,
      /flex:\s*0 0 48px/
    );
    // The other half of the same test: a header button that is *not*
    // icon-only takes the text-button branch. Keyed on `i`, the icon-only
    // close fell into it and rendered as an auto-width 40dp pill.
    assertIconIsAClass(
      'dialog header text button',
      /^dialog\b.*header.*:not\(:has\(/,
      /border-radius:\s*var\(--md-sys-shape-corner-large-increased\)/
    );
    assertIconIsAClass(
      'dialog leading icon',
      /^dialog\s*>/,
      /color:\s*var\(--md-sys-color-secondary\)/
    );
  });

  test('pane header icon-only actions are a 48dp circle', () => {
    assertIconIsAClass('panes', /^\.pane\b.*header/, /flex:\s*0 0 48px/);
  });

  test('list leading and trailing icons land in the icon columns', () => {
    // The label rule is `> span`, so an icon span was pulled into
    // grid-column 2 - the leading icon rendered inside the text column.
    assertIconIsAClass('list leading', /^\.list\s*>\s*li\b/, /grid-column:\s*1/);
    assertIconIsAClass('list trailing', /^\.list\s*>\s*li\b/, /grid-column:\s*3/);
    const label = find(/^\.list\s*>\s*li\b[^{]*\bspan\b/, /grid-column:\s*2/);
    assert.ok(label.length > 0, 'no rule puts the list label in column 2');
    for (const hit of label) {
      assert.match(
        hit.selector,
        /span:not\([^)]*\.material-symbols/,
        `list label rule swallows the icon span:\n  ${hit.selector}`
      );
    }
  });

  test('list leading avatar keeps its circle treatment', () => {
    assertIconIsAClass(
      'list circle',
      /^\.list\s*>\s*li\b/,
      /background-color:\s*var\(--md-sys-color-primary-container\)/
    );
  });

  test('a tab with an icon gets the taller stacked container', () => {
    assertIconIsAClass(
      'tabs',
      /^\.tabs\b/,
      /min-height:\s*var\(--md-comp-primary-tab-with-icon-container-height\)/
    );
    assertIconIsAClass(
      'tabs icon',
      /^\.tabs\b/,
      /font-size:\s*var\(--md-comp-primary-tab-icon-size\)/
    );
  });

  test('pagination icons take the pagination icon size', () => {
    assertIconIsAClass(
      'pagination',
      /^\.pagination\b/,
      /font-size:\s*var\(--md-comp-pagination-icon-size\)/
    );
  });

  test('side sheet header icons are sized to 24dp', () => {
    assertIconIsAClass(
      'side-sheet',
      /\.side-sheet\b.*header/,
      /font-size:\s*1\.5rem/
    );
  });

  test('toolbar icons do not shrink', () => {
    assertIconIsAClass(
      'toolbar',
      /\.toolbar\b/,
      /font-size:\s*var\(--md-comp-toolbar-icon-size\)/
    );
  });

  test('menu item icons take the 20dp menu icon size', () => {
    assertIconIsAClass(
      'menu',
      /^menu\[id\]/,
      /font-size:\s*var\(--md-comp-menu-item-icon-size\)/
    );
    // The menu item host is `> a, > button, > span`; a bare icon child would
    // otherwise be stretched to a full-width 48dp row.
    const host = find(/^menu\[id\]\s*>\s*li\b/, /min-height:\s*var\(--md-comp-menu-item-container-height\)/);
    assert.ok(host.length > 0, 'no rule sets the menu item height');
    for (const hit of host) {
      assert.doesNotMatch(
        hit.selector,
        /(^|[\s,>(])span(?![-\w])(?!:not)/,
        `menu item host rule swallows a bare icon span:\n  ${hit.selector}`
      );
    }
  });

  test('a trailing menu icon is named, not inferred from :only-child', () => {
    // `<a>Label<span icon/></a>` and `<a><span icon/>Label</a>` are the same
    // to a selector: the label is a text node, so the icon is :first-child,
    // :last-child AND :only-child either way. The old guard was a bare
    // :not(:only-child), which therefore only ever fired on rows carrying two
    // icons - every text-plus-trailing-icon row kept its icon butted against
    // the label instead of flush right.
    const trailing = find(
      /^menu\[id\][^,]*>\s*:is\(a, button\)\s*>/,
      /margin-inline-start:\s*auto/
    ).filter((hit) => /material-symbols/.test(hit.selector));
    assert.ok(trailing.length > 0, 'no trailing menu icon rule found');
    for (const hit of trailing) {
      assert.match(
        hit.selector,
        /\.suffix/,
        `trailing menu icon rule still infers the side positionally:\n  ${hit.selector}`
      );
    }
  });

  test('a legend icon is 18dp with its trailing gap', () => {
    assertIconIsAClass('fieldset', /^fieldset\b/, /margin-inline-end:\s*8px/);
  });
});

describe('Icon-only header actions and the indicator width', () => {
  const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
  const rules = [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)].map((m) => ({
    selector: m[1].trim(),
    body: m[2]
  }));

  test('a header action can opt out of the icon-button treatment', () => {
    // `:only-child` counts elements, not text nodes, so
    // `<button><span icon/> Save</button>` reads as icon-only and gets squeezed
    // into the 48dp circle with its label overflowing. CSS cannot see the text
    // node, so there is no selector that gets this right on its own - `.button`
    // is the author's opt-out, and before this there was none at all.
    // Positive form only. The complementary text-button branch spells it
    // `:not(:has(...))` and is right to carry no opt-out.
    const ICON_ONLY =
      /(?<!:not\():has\(>\s*:is\([^)]*\.material-symbols[^)]*\):only-child\)/;
    const iconOnly = rules.filter((r) => ICON_ONLY.test(r.selector));
    assert.ok(iconOnly.length > 0, 'no icon-only branch found - the probe is stale');
    for (const hit of iconOnly) {
      // Split on top-level commas only - `:is(a, label)` carries its own, and
      // a naive split lands mid-selector. Same trap as the Footer test above.
      const arms = [];
      let depth = 0;
      let cur = '';
      for (const ch of hit.selector) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        if (ch === ',' && depth === 0) { arms.push(cur); cur = ''; continue; }
        cur += ch;
      }
      arms.push(cur);
      for (const arm of arms.map((s) => s.trim())) {
        // Test for the icon-only `:has()` specifically - the app bar host also
        // uses `:has()`, and a bare check matches arms that carry only that.
        if (!ICON_ONLY.test(arm)) continue;
        assert.match(
          arm,
          /:not\([^)]*\.button[^)]*\)|button:not\(\.button\)/,
          `icon-only branch has no .button opt-out:\n  ${arm}`
        );
      }
    }
  });

  test('the navigation bar active indicator is 64dp wide, not the rail 56dp', () => {
    // md.comp.navigation-bar.active-indicator.width is 64;
    // md.comp.navigation-rail.active-indicator.width is 56. Both were 56 here.
    assert.match(css, /--md-comp-nav-bar-indicator-width:\s*64px/);
    assert.match(css, /--md-comp-nav-bar-indicator-height:\s*32px/);
    assert.match(css, /--md-comp-nav-rail-indicator-width:\s*56px/);
  });
});

describe('Icon selectors keyed on <i>, second sweep', () => {
  // The four components left over from the first sweep. Same defect, but two
  // of them fail in ways the first eleven did not:
  //
  //  - the navigation rail hides its FAB *label* with `> :not(i)`, so once the
  //    icon became a <span> that rule hid the icon and showed nothing;
  //  - `_buttons` sizes its glyph from a token, and lost the declaration to
  //    the base `.material-symbols` rule on source order alone.
  const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
  const rules = [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)].map((m) => ({
    selector: m[1].trim(),
    body: m[2]
  }));
  const find = (where, what) =>
    rules.filter((r) => where.test(r.selector) && what.test(r.body));

  function assertIconIsAClass(label, where, what) {
    const hits = find(where, what);
    assert.ok(hits.length > 0, `${label}: no rule matched - the probe is stale`);
    for (const hit of hits) {
      assert.match(
        hit.selector,
        /\.material-symbols/,
        `${label}: rule is keyed on the bare <i> element:\n  ${hit.selector}`
      );
    }
  }

  test('button glyphs are sized from the button icon token', () => {
    assertIconIsAClass(
      'buttons',
      /button/,
      /font-size:\s*var\(--md-comp-filled-button-icon-size\)/
    );
  });

  test('the base icon rule loads before the components that override it', () => {
    // Both selectors carry a class, so they tie on specificity and source
    // order alone decides. With icons forwarded 4th, `buttons` lost the tie
    // and a button rendered an 18px box around a 24px glyph.
    const base = css.search(/\.material-symbols[^{]*\{[^}]*font-size:\s*1\.5rem/);
    const btn = css.search(/font-size:\s*var\(--md-comp-filled-button-icon-size\)/);
    assert.ok(base > -1 && btn > -1, 'probe is stale - one of the rules is gone');
    assert.ok(
      base < btn,
      'the base .material-symbols rule must come first, or component icon sizes lose the tie'
    );
  });


  test('navigation rail draws the active indicator pill', () => {
    assertIconIsAClass(
      'nav-rail indicator box',
      /\.navigation-rail\b/,
      // The rail's own hamburger button is sized to the indicator too, and is
      // right to carry no icon class - so pair the width with the transition
      // that only the glyph rule declares.
      /width:\s*var\(--md-comp-nav-rail-indicator-width\)[\s\S]*transition:\s*background-color/
    );
    assertIconIsAClass(
      'nav-rail indicator fill',
      /\.navigation-rail\b[\s\S]*(\.active|\[aria-current\])\s*>/,
      /background-color:\s*var\(--md-comp-nav-rail-active-indicator-color\)/
    );
  });

  test('the rail FAB hides its label and not its icon', () => {
    // `> :not(i)` is "everything that is not the glyph". The icon is a <span>,
    // so this visually hid the icon itself - the FAB rendered as an empty box.
    const hidden = find(/\.navigation-rail\b/, /clip-path:\s*inset\(50%\)/);
    assert.ok(hidden.length > 0, 'no rule visually hides the rail FAB label');
    for (const hit of hidden) {
      assert.match(
        hit.selector,
        /:not\([^)]*\.material-symbols/,
        `rail label-hiding rule swallows the icon:\n  ${hit.selector}`
      );
    }
  });

  test('snackbar leading icon and icon button are sized', () => {
    assertIconIsAClass(
      'snackbar leading',
      /\.snackbar\b/,
      // Pair with `font-size`, or this also catches the icon *button*: it
      // sets the same colour and the same `flex` on itself, and correctly
      // names no icon. Only the glyph rule sizes type.
      /font-size:[\s\S]*color:\s*var\(--md-comp-snackbar-icon-color\)/
    );
  });

  test('the slider inset icon sits in the active track', () => {
    assertIconIsAClass(
      'slider inset icon',
      /\.slider\b/,
      /font-size:\s*var\(--md-comp-slider-icon-size\)/
    );
  });
});

// Waves supplied the press feedback for every element the docs marked
// `.waves-effect`. Deleting it left five of those surfaces with a hover layer
// and nothing at all under a finger: hover never fires on touch, and both the
// pagination item and the drawer row suppress the tap highlight.
describe('Surfaces that lost the ripple keep a pressed state layer', () => {
  const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

  const PRESSED = [
    ['card reveal trigger', /\.card-reveal-trigger:active\s*\{[^}]*state-layer-opacity/],
    ['expanding card trigger', /\.expanding-card-trigger:active\s*\{[^}]*state-layer-opacity/],
    ['pagination item', /\.pagination :is\(a, button\):active\s*\{[^}]*state-layer-opacity/]
  ];

  for (const [name, pattern] of PRESSED) {
    test(`${name} paints a pressed layer`, () => {
      assert.match(css, pattern, `${name} has no :active state layer`);
    });
  }
});

// An ordering trap in the state layers that replaced Waves.
describe('State layers that replaced the ripple', () => {
  const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

  test('a pressed media trigger outranks its own focus layer', () => {
    // Keyboard activation is :focus-visible *and* :active at equal
    // specificity, so the pressed rule has to come last to be the one read.
    for (const trigger of ['card-reveal-trigger', 'expanding-card-trigger']) {
      const focus = css.indexOf(`.${trigger}:focus-visible`);
      const active = css.indexOf(`.${trigger}:active`);
      assert.ok(focus > -1 && active > -1, `${trigger} is missing a focus or active rule`);
      assert.ok(active > focus, `${trigger}: :active must follow :focus-visible`);
    }
  });
});

// Converting a drag from touch events to Pointer Events moved the cancellation
// path. `touchend` fired only when the user let go, so wiring `pointercancel`
// to the same handler looked equivalent and is not: the browser fires it when
// it takes the gesture over, and running the completion path then commits
// something the user never finished. Both were live in PR #81.
describe('A cancelled pointer drag is not a completed one', () => {
  beforeEach(resetBody);

  function drag(el, endWith, { from, to, axis = 'x' }) {
    const at = (v) => (axis === 'x' ? { clientX: v, clientY: 0 } : { clientX: 0, clientY: v });
    for (const [type, v] of [
      ['pointerdown', from],
      ['pointermove', to],
      [endWith, to]
    ]) {
      el.dispatchEvent(
        new window.PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          ...at(v),
          button: 0,
          buttons: type === 'pointerdown' ? 1 : 0,
          pointerId: 1,
          pointerType: 'touch',
          isPrimary: true
        })
      );
    }
  }

  // jsdom has no layout, so offsetWidth - and the activation distance derived
  // from it - is 0. Any movement at all is therefore past the threshold, which
  // is what makes the control case dismiss, and what made the cancelled case
  // dismiss too.
  function swipeSnackbar(endWith) {
    const snackbar = new Expressive.Snackbar({
      text: 'Saved',
      displayLength: Infinity,
      outDuration: 0
    });
    try {
      drag(snackbar.el, endWith, { from: 0, to: 120 });
      return { wasSwiped: snackbar.wasSwiped === true, opacity: snackbar.el.style.opacity };
    } finally {
      snackbar.dismiss();
    }
  }

  test('a snackbar swipe that ends in pointerup dismisses', () => {
    const { wasSwiped, opacity } = swipeSnackbar('pointerup');
    assert.equal(wasSwiped, true, 'the control swipe did not dismiss');
    assert.equal(opacity, '0', 'a dismissed snackbar is faded out');
  });

  for (const [label, to, offset] of [['left', -120, '-300px'], ['right', 120, '300px']]) {
    test(`a snackbar swiped ${label} animates off that side`, () => {
      const snackbar = new Expressive.Snackbar({ text: 'Saved', displayLength: Infinity, outDuration: 0 });
      try {
        Object.defineProperty(snackbar.el, 'offsetWidth', { value: 300 });
        drag(snackbar.el, 'pointerup', { from: 0, to });
        assert.equal(snackbar.el.style.transform, `translateX(${offset})`);
        assert.match(snackbar.el.style.transition, /transform 0ms ease/, 'the slide-out is not animated');
      } finally {
        snackbar.dismiss();
      }
    });
  }

  test('the same distance ending in pointercancel snaps back instead', () => {
    const { wasSwiped, opacity } = swipeSnackbar('pointercancel');
    assert.equal(wasSwiped, false, 'a cancelled swipe dismissed the snackbar');
    assert.equal(opacity, '', 'a cancelled swipe left the snackbar faded');
  });

  function dragClock(endWith) {
    document.body.innerHTML = '<input type="text" class="time-picker">';
    const picker = Expressive.Timepicker.init(document.querySelector('input'));
    const selected = [];
    picker.options.onSelect = (h, m) => selected.push([h, m]);
    try {
      fixRect(picker.plate, 260, 260);
      drag(picker.plate, endWith, { from: 130, to: 200 });
      return { view: picker.currentView, selected: selected.length };
    } finally {
      picker.destroy();
    }
  }

  test('a clock drag that ends in pointerup advances to minutes', () => {
    const { view, selected } = dragClock('pointerup');
    assert.equal(view, 'minutes', 'the control drag did not advance the view');
    assert.equal(selected, 1, 'the control drag did not report a selection');
  });

  test('the same drag ending in pointercancel commits nothing', () => {
    const { view, selected } = dragClock('pointercancel');
    assert.equal(view, 'hours', 'a cancelled drag advanced hours to minutes');
    assert.equal(selected, 0, 'a cancelled drag reported a selection');
  });
});

describe('Particles', () => {
  beforeEach(resetBody);

  // jsdom has no canvas, IntersectionObserver or media queries to flip.
  function setup({ reduce = false } = {}) {
    document.body.innerHTML = '<canvas class="particles"></canvas>';
    const canvas = document.querySelector('canvas');
    const paints = { count: 0 };
    canvas.getContext = () => new Proxy({}, {
      get: (target, key) => (key === 'clearRect' ? () => paints.count++ : () => {}),
      set: () => true
    });
    const queries = {};
    const matchMedia = globalThis.matchMedia;
    globalThis.matchMedia = (query) => (queries[query] ??= {
      matches: query.includes('reduced-motion') && reduce,
      listeners: new Set(),
      addEventListener(type, fn, options) {
        this.listeners.add(fn);
        options?.signal?.addEventListener('abort', () => this.listeners.delete(fn));
      },
      removeEventListener(type, fn) { this.listeners.delete(fn); },
      change(matches = this.matches) { this.matches = matches; this.listeners.forEach((fn) => fn()); }
    });
    let visibility;
    globalThis.devicePixelRatio = 1;
    const { IntersectionObserver } = globalThis;
    globalThis.IntersectionObserver = class {
      constructor(callback) { visibility = callback; }
      observe() {}
      disconnect() {}
    };
    const restore = () => {
      globalThis.matchMedia = matchMedia;
      globalThis.IntersectionObserver = IntersectionObserver;
      delete globalThis.devicePixelRatio;
      document.documentElement.removeAttribute('theme');
    };
    try {
      const instance = Expressive.Particles.init(canvas, { quantity: 3 });
      return { instance, paints, visibility, restore, query: (part) => Object.entries(queries).find(([q]) => q.includes(part))[1] };
    } catch (error) {
      restore();
      throw error;
    }
  }

  test('visibility follows the newest IntersectionObserver entry', () => {
    const { instance, visibility, restore } = setup();
    try {
      visibility([{ isIntersecting: true }, { isIntersecting: false }]);
      assert.equal(instance._frame, 0, 'the oldest entry started an offscreen canvas');
      visibility([{ isIntersecting: false }, { isIntersecting: true }]);
      assert.notEqual(instance._frame, 0);
    } finally {
      instance.destroy();
      restore();
    }
  });

  test('still dots repaint on a theme change and follow the reduced-motion setting', async () => {
    const { instance, paints, visibility, restore, query } = setup({ reduce: true });
    try {
      visibility([{ isIntersecting: true }]);
      assert.equal(instance._frame, 0, 'reduced motion draws once');
      let before = paints.count;
      document.documentElement.setAttribute('theme', 'dark');
      await sleep(0);
      assert.ok(paints.count > before, 'a theme attribute change repaints');
      before = paints.count;
      query('color-scheme').change(true);
      assert.ok(paints.count > before, 'a color-scheme change repaints');

      query('reduced-motion').change(false);
      assert.notEqual(instance._frame, 0, 'turning reduced motion off animates');
      before = paints.count;
      query('reduced-motion').change(true);
      assert.equal(instance._frame, 0, 'turning it back on stops');
      assert.ok(paints.count > before, 'and paints the dots where they are');

      instance.destroy();
      assert.equal(query('reduced-motion').listeners.size + query('color-scheme').listeners.size, 0, 'destroy removes the media listeners');
      before = paints.count;
      document.documentElement.setAttribute('theme', 'light');
      await sleep(0);
      assert.equal(paints.count, before, 'destroy stops watching the theme');
    } finally {
      instance.destroy();
      restore();
    }
  });
});
