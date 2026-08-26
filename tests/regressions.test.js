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
      <div class="carousel coverflow">
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

    const small = size('small');
    assert.match(small, /--md-comp-fab-container-height:\s*40px/);
    assert.match(small, /--md-comp-fab-container-width:\s*40px/);
    assert.match(small, /--md-comp-fab-container-shape:\s*12px/);

    const medium = size('medium');
    assert.match(medium, /--md-comp-fab-container-height:\s*80px/);
    assert.match(medium, /--md-comp-fab-container-width:\s*80px/);
    assert.match(medium, /--md-comp-fab-container-shape:\s*20px/);
    assert.match(medium, /--md-comp-fab-icon-size:\s*26px/);

    const large = size('large');
    assert.match(large, /--md-comp-fab-container-height:\s*96px/);
    assert.match(large, /--md-comp-fab-container-width:\s*96px/);
    assert.match(large, /--md-comp-fab-container-shape:\s*28px/);
    assert.match(large, /--md-comp-fab-icon-size:\s*36px/);
  });

  test('the large size does not resize a FAB written as `circle large`', () => {
    // `.large` is the alias for the default FAB, so `&.large` nested in the
    // FAB block would also compile `.large.circle.large` and grow every
    // aliased 56dp FAB to 96dp. The size has to name `.extra`.
    const rules = css
      .split('}')
      .filter((rule) => /--md-comp-fab-container-height:\s*96px/.test(rule));
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
    // The size classes are the same one class this rule is, so an
    // `extend small` loses label-large unless the extended FAB restates it.
    assert.match(rule, /font-size:\s*var\(--md-sys-typescale-label-large-font-size\)/);
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
    assert.match(small, /--md-comp-extended-fab-container-height:\s*56px/);
    assert.match(small, /--md-comp-extended-fab-container-shape:\s*16px/);
    assert.match(small, /--md-comp-extended-fab-icon-size:\s*24px/);
    assert.match(small, /--md-comp-extended-fab-leading-space:\s*16px/);
    assert.match(small, /--md-comp-extended-fab-icon-label-space:\s*8px/);
    assert.match(small, /--md-comp-extended-fab-trailing-space:\s*16px/);
  });

  // md.comp.extended-fab.{small,medium,large}.*, DSP 34.0.21. Leading and
  // trailing space are equal at every named size; only the sizeless base
  // family keeps M3's older 16/20 asymmetry.
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
        assert.match(rule, new RegExp(`--md-comp-extended-fab-${token}:\\s*${value}px`));
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
    assert.match(css, /--md-comp-fab-container-height:\s*56px/);
    assert.match(css, /--md-comp-fab-container-width:\s*56px/);
    assert.match(css, /--md-comp-fab-container-shape:\s*16px/);
    assert.match(css, /--md-comp-fab-icon-size:\s*24px/);
    assert.match(css, /border-radius:\s*var\(--md-comp-fab-container-shape\)/);
    assert.match(css, /width:\s*var\(--md-comp-fab-container-width\)/);
    assert.match(css, /height:\s*var\(--md-comp-fab-container-height\)/);
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
  test('a sidenav-trigger inside a top app bar is not hidden on wider screens', () => {
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

    // Scoped by DOM order: leading is before the headline, trailing after.
    assert.match(uses[0].sel, /:is\(h1, h2, h3, h4, h5, h6\)\s*~/);
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
      /border-radius:\s*20px/
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
      /font-size:\s*24px/
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
    const base = css.search(/\.material-symbols[^{]*\{[^}]*font-size:\s*24px/);
    const btn = css.search(/font-size:\s*var\(--md-comp-filled-button-icon-size\)/);
    assert.ok(base > -1 && btn > -1, 'probe is stale - one of the rules is gone');
    assert.ok(
      base < btn,
      'the base .material-symbols rule must come first, or component icon sizes lose the tie'
    );
  });

  test('the FAB toolbar hides the icons of its collapsed actions', () => {
    assertIconIsAClass('fab toolbar', /toolbar/, /opacity:\s*0/);
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
      /\.slider\b|\.range\b/,
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
    ['FAB toolbar action', /\.toolbar\b[^{]*:is\(a, button\):active\s*\{[^}]*state-layer-opacity/],
    ['navigation drawer row', /\.navigation-drawer\)[^{]*:active\s*\{[^}]*state-layer-opacity/],
    ['pagination item', /\.pagination :is\(a, button\):active\s*\{[^}]*state-layer-opacity/]
  ];

  for (const [name, pattern] of PRESSED) {
    test(`${name} paints a pressed layer`, () => {
      assert.match(css, pattern, `${name} has no :active state layer`);
    });
  }
});

// Two ordering/specificity traps in the state layers that replaced Waves.
describe('State layers that replaced the ripple', () => {
  const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

  test('the selected drawer row keeps its pill while hovered and pressed', () => {
    // The row's own layer mixes into `transparent`; letting it reach a
    // selected row erases the secondary-container fill instead of tinting it.
    for (const state of ['hover', 'active']) {
      const rule = css.match(
        new RegExp(`li\\.active > :is\\(a, button\\)[^{]*:${state}\\s*\\{[^}]*\\}`, 's')
      );
      assert.ok(rule, `no selected-drawer-row rule for :${state}`);
      assert.match(rule[0], /var\(--md-sys-color-secondary-container\)\s*\)/);
      assert.doesNotMatch(rule[0], /,\s*transparent\s*\)/);
    }
  });

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
