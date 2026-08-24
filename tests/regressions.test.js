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
    const instance = Expressive.Slideshow.init(document.querySelector('.slider'));

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
    assert.match(iconAction[0].body, /width:\s*48px/);
    assert.match(iconAction[0].body, /height:\s*48px/);

    // ...and the destination rule has to exclude the same set, or an
    // icon-only link matches both.
    const destination = [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)]
      .map((m) => ({ sel: m[1], body: m[2] }))
      .filter((r) => /header:has\(>/.test(r.sel) && /a:not\(:has\(>/.test(r.sel));
    assert.ok(destination.length > 0, 'no app bar text-destination rule');
    for (const rule of destination) {
      assert.match(rule.sel, /a:not\(:has\(>\s*:is\(i, \.material-symbols/);
    }
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
    assert.ok(spacer.some((b) => /height:\s*48px/.test(b)), 'no 48dp top-row spacer');
    const headline = bodyOf(
      (sel) => /header\.medium\b/.test(sel) && /h1, h2/.test(sel) && !/\+ \*/.test(sel)
    );
    assert.ok(headline.some((b) => /flex:\s*1 1 calc\(100% \+ 1px\)/.test(b)));

    // Expanded headline: 16dp from the inline edges (4dp of it paid by the
    // bar), 20dp above the bottom on medium and 28dp on large.
    const medium = bodyOf((sel) => /header\.medium\b/.test(sel) && !/header\.large\b/.test(sel));
    assert.ok(medium.some((b) => /padding-bottom:\s*20px/.test(b)));
    assert.ok(medium.some((b) => /padding:\s*0 12px/.test(b)));
    const large = bodyOf((sel) => /header\.large\b/.test(sel) && !/header\.medium\b/.test(sel));
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

describe('Chips', () => {
  test('a chip is excluded from the generic button rules', () => {
    // Assist and suggestion chips are real <button>s, which put them inside
    // `:where(button:not(...), a.button)`. The base rules were a harmless tie
    // that chips won on source order, but the *state* rules carry an extra
    // pseudo-class - `:where(...):not(...):hover` is two components against
    // `.chip`'s one - so hovering, focusing or pressing a chip repainted it
    // with the filled-button background while it kept the chip's own text
    // colour. Excluding `.chip` in $_not-btn is what stops that.
    const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
    const buttonSelectors = css.match(/:where\(button:not\([^)]*\)/g) ?? [];
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
});

describe('Tabs', () => {
  beforeEach(resetBody);

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
