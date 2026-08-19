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
function fixRect(el, width, height) {
  el.getBoundingClientRect = () => ({
    top: 0,
    left: 0,
    width,
    height,
    right: width,
    bottom: height,
    x: 0,
    y: 0
  });
}

describe('FloatingActionButton toolbar mode', () => {
  beforeEach(resetBody);

  test('opens without throwing and does not inject a backdrop', () => {
    document.body.innerHTML = `
      <div class="fixed-action-btn">
        <a class="button extra circle"><i class="material-symbols">add</i></a>
        <ul><li><a class="button extra circle small"><i class="material-symbols">edit</i></a></li></ul>
      </div>`;
    const el = document.querySelector('.fixed-action-btn');
    const instance = Expressive.FloatingActionButton.init(el, { toolbarEnabled: true });

    instance.open();

    assert.ok(el.classList.contains('active'));
    assert.equal(el.querySelectorAll('.fab-backdrop').length, 0, 'toolbar mode should not inject a backdrop');
    instance.destroy();
  });

  test('closing clears .active and does not leave a backdrop', () => {
    document.body.innerHTML = `
      <div class="fixed-action-btn">
        <a class="button extra circle"><i class="material-symbols">add</i></a>
        <ul><li><a class="button extra circle small"><i class="material-symbols">edit</i></a></li></ul>
      </div>`;
    const el = document.querySelector('.fixed-action-btn');
    const instance = Expressive.FloatingActionButton.init(el, { toolbarEnabled: true });

    try {
      instance.open();
      instance.close();
      assert.equal(el.classList.contains('active'), false);
      assert.equal(el.querySelectorAll('.fab-backdrop').length, 0, 'a backdrop was injected');
      assert.equal(el.style.width, '', 'toolbar mode wrote leftover inline styles');

      instance.open();
      instance.close();
      assert.equal(el.classList.contains('active'), false);
      assert.equal(el.querySelectorAll('.fab-backdrop').length, 0, 'backdrops accumulated');
    } finally {
      instance.destroy();
    }
  });

  test('a FAB with no menu list does not throw', () => {
    document.body.innerHTML = `<div class="fixed-action-btn"><a class="button extra circle">+</a></div>`;

    const instance = Expressive.FloatingActionButton.init(
      document.querySelector('.fixed-action-btn')
    );

    assert.ok(instance);
    instance.destroy();
  });
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

  test('item transforms are written to the standard transform property', () => {
    document.body.innerHTML = `
      <div class="carousel">
        <a class="carousel-item active" href="#one">one</a>
        <a class="carousel-item" href="#two">two</a>
      </div>`;

    const instance = Expressive.Carousel.init(document.querySelector('.carousel'));

    // Guards the removal of the webkit/Moz/O/ms probe that used to pick the
    // property name. (jsdom exposes no prefixed aliases, so this cannot catch
    // the old code - it is here to catch a regression of the rename.)
    assert.ok(
      document.querySelector('.carousel-item.active').style.transform,
      'no transform was applied to the active item'
    );
    instance.destroy();
  });

  test('an empty carousel does not throw', () => {
    document.body.innerHTML = `<div class="carousel"></div>`;

    const instance = Expressive.Carousel.init(document.querySelector('.carousel'));

    assert.ok(instance);
    instance.destroy();
  });

  test('flat mode keeps indicators outside the scroll track', () => {
    document.body.innerHTML = `
      <div class="carousel flat">
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
    document.body.innerHTML = `<input type="text" class="datepicker">`;

    const instance = Expressive.Datepicker.init(document.querySelector('.datepicker'), {
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
    document.body.innerHTML = `<div><input type="text" id="range-start" class="datepicker"></div>`;

    const instance = Expressive.Datepicker.init(document.querySelector('.datepicker'), {
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

describe('optional markup does not crash a component', () => {
  beforeEach(resetBody);

  test('a card reveal with no title', () => {
    document.body.innerHTML = `
      <article>
        <span class="activator">T</span>
        <aside><p>body</p></aside>
      </article>`;
    const instance = Expressive.Cards.init(document.querySelector('article'));

    instance.open();
    instance.close();

    assert.ok(instance);
    instance.destroy();
  });

  test('a slide with no caption', () => {
    document.body.innerHTML = `
      <div class="slider"><ul class="slides">
        <li class="active"><img src="http://localhost/1.jpg"></li>
        <li><img src="http://localhost/2.jpg"></li>
      </ul></div>`;
    const instance = Expressive.Slider.init(document.querySelector('.slider'));

    try {
      instance.set(1);
      assert.equal(instance.activeIndex, 1);
    } finally {
      instance.destroy();
    }
  });

  test('a parallax container with no image', () => {
    document.body.innerHTML = `<div class="parallax"></div>`;

    const instance = Expressive.Parallax.init(document.querySelector('.parallax'));

    assert.ok(instance);
    instance.destroy();
  });

  test('a hover dropdown when the pointer leaves the window', () => {
    document.body.innerHTML = `
      <a class="button dropdown-trigger" data-target="dd">Drop</a>
      <menu id="dd"><li><a href="#!">one</a></li></menu>`;
    const instance = Expressive.Dropdown.init(document.querySelector('.dropdown-trigger'), {
      hover: true
    });

    // relatedTarget is null when the pointer leaves the document entirely.
    instance.el.dispatchEvent(
      new window.MouseEvent('mouseleave', { bubbles: false, view: window, relatedTarget: null })
    );

    assert.equal(instance.isOpen, false);
    instance.destroy();
  });
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

describe('Text field icon selectors', () => {
  test('trailing icons are selected by .suffix, not only :last-child', () => {
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    // Documented markup puts both icons before the input, so
    // `> i:last-child` never matches the trailing icon and it
    // sits in flow above the well.
    assert.match(css, /\.field\s*>\s*i\.suffix/);
    assert.match(css, /\.field\s*>\s*i\.prefix/);
  });
});

describe('Select caret position', () => {
  test('the floating-label span rule excludes .caret', () => {
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    // `.field > span:not(...)` is the floating label. The caret is a
    // <span class="caret">, so omitting it from the :not() list set
    // left:16px. Combined with width:24px that ignored inset-inline-end
    // and pinned the chevron over the value.
    assert.match(
      css,
      /\.field\s*>\s*span:not\([^)]*\.caret[^)]*\)/
    );
    assert.match(css, /\.caret\s*\{[^}]*left:\s*auto/s);
  });
});

describe('App bar sidenav trigger', () => {
  test('a sidenav-trigger inside a top app bar is not hidden on large screens', () => {
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    // Materialize hid header > nav > .sidenav-trigger at the large
    // breakpoint. An M3 app bar keeps the leading page-navigation
    // control visible at every size.
    assert.doesNotMatch(
      css,
      /header:has\(>\s*nav\)\s*>\s*nav:not\(\.tabs\)\s*>\s*\.sidenav-trigger\s*\{[^}]*display:\s*none/
    );
  });
});

describe('App bar scroll fill', () => {
  test('a fixed bar fills with surface-container on scroll, not a shadow', () => {
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    assert.match(css, /--md-comp-top-app-bar-scrolled-container-color:\s*var\(--md-sys-color-surface-container\)/);
    assert.match(css, /@keyframes\s+top-app-bar-scroll/);
    assert.match(
      css,
      /top-app-bar-scroll[^{]*\{[^}]*--md-comp-top-app-bar-container-color:\s*var\(--md-comp-top-app-bar-scrolled-container-color\)/s
    );
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
    assert.match(
      css,
      /header\.medium:has\(>\s*nav\)\s*>\s*nav:not\(\.tabs(?:,\s*\.[\w-]+)*\)\s*,\s*header\.large:has\(>\s*nav\)\s*>\s*nav:not\(\.tabs(?:,\s*\.[\w-]+)*\)\s*\{[^}]*align-content:\s*space-between/s
    );
    assert.match(
      css,
      /header\.(?:medium|large):has\(>\s*nav\)\s*>\s*nav:not\(\.tabs(?:,\s*\.[\w-]+)*\)\s*>\s*:is\([^)]+\)\s*\+\s*\*\s*\{[^}]*margin-inline-start:\s*auto/
    );
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
