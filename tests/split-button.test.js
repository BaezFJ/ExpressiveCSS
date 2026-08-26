// Split button: the M3 token block, and the two things activation does to the
// trailing half - it reshapes its inner corner and spins its icon.
//
// Five token families (md.comp.split-button.{xsmall … xlarge}, DSP 34.0.21)
// collapse to one here the way the button's own ladder does: the size class
// rewrites the tokens and the two halves map them onto the button tokens once.
//
// The corner morph is asserted through the `--_inner` variable rather than
// through `border-radius` on each state, for the reason button groups learned:
// writing the shorthand under `:hover` would clobber the outer corners each
// half sets as longhands.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Expressive, window } from './setup.js';

const { document } = window;

const root = new URL('../', import.meta.url);
const css = readFileSync(new URL('dist/css/expressive.css', root), 'utf8');

const rules = [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)].map((m) => ({
  selector: m[1].trim(),
  body: m[2]
}));

const ruleFor = (selector) => rules.find((r) => r.selector === selector)?.body;

// The halves are matched by role, and the compound that names them carries
// exclusions (`.icon-button`) that may grow. Find them by shape rather than by
// retyping the selector in five places.
const HALF = '.split-button > :where(button:not(.icon-button), a.button)';
const TRAIL = '.split-button > .menu-trigger:not(.icon-button)';

// SplitButton<Size>Tokens, verbatim. `height` is the button ladder's own and
// is asserted here because the split families restate it - if the two ever
// disagree, this catches it.
const SIZES = {
  xsmall: { height: '32px', leadEnd: '10px', trailSpace: '13px', trailIcon: '22px', inner: '4px', pressed: '8px' },
  small: { height: '40px', leadEnd: '12px', trailSpace: '13px', trailIcon: '22px', inner: '4px', pressed: '12px' },
  medium: { height: '56px', leadEnd: '24px', trailSpace: '15px', trailIcon: '26px', inner: '4px', pressed: '12px' },
  large: { height: '96px', leadEnd: '48px', trailSpace: '29px', trailIcon: '38px', inner: '8px', pressed: '20px' },
  xlarge: { height: '136px', leadEnd: '64px', trailSpace: '43px', trailIcon: '50px', inner: '12px', pressed: '20px' }
};

describe('Split button tokens', () => {
  test('the default split button is the small family', () => {
    const rule = ruleFor('.split-button');
    assert.ok(rule, 'no .split-button rule in the sheet');
    assert.match(rule, /--md-comp-split-button-between-space:\s*2px/);
    assert.match(rule, /gap:\s*var\(--md-comp-split-button-between-space\)/);
    assert.match(rule, /--md-comp-filled-button-container-height:\s*40px/);
    for (const [token, value] of Object.entries({
      'leading-button-trailing-space': SIZES.small.leadEnd,
      'trailing-button-space': SIZES.small.trailSpace,
      'trailing-icon-size': SIZES.small.trailIcon,
      'inner-corner-corner-size': SIZES.small.inner,
      'inner-pressed-corner-corner-size': SIZES.small.pressed
    })) {
      assert.match(rule, new RegExp(`--md-comp-split-button-${token}:\\s*${value}`));
    }
  });

  for (const [size, s] of Object.entries(SIZES)) {
    test(`${size} is ${s.height} tall with a ${s.trailIcon} trailing icon`, () => {
      const rule = ruleFor(`.split-button.${size}`);
      assert.ok(rule, `no .split-button.${size} rule`);
      assert.match(rule, new RegExp(`--md-comp-filled-button-container-height:\\s*${s.height}`));
      assert.match(rule, new RegExp(`--md-comp-split-button-leading-button-trailing-space:\\s*${s.leadEnd}`));
      assert.match(rule, new RegExp(`--md-comp-split-button-trailing-button-space:\\s*${s.trailSpace}`));
      assert.match(rule, new RegExp(`--md-comp-split-button-trailing-icon-size:\\s*${s.trailIcon}`));
      assert.match(rule, new RegExp(`--md-comp-split-button-inner-corner-corner-size:\\s*${s.inner}`));
      assert.match(rule, new RegExp(`--md-comp-split-button-inner-pressed-corner-corner-size:\\s*${s.pressed}`));
    });
  }

  test('every size is 2dp between the halves', () => {
    // M3 states between-space per family and it is 2dp in all five, so it is
    // written once. A size rule restating it would be the first place the
    // number could drift.
    for (const size of Object.keys(SIZES)) {
      const rule = ruleFor(`.split-button.${size}`);
      assert.doesNotMatch(rule, /--md-comp-split-button-between-space/);
    }
  });
});

describe('Split button halves', () => {
  const lead = rules.find((r) => /^\.split-button > .*:not\(\.menu-trigger\)$/.test(r.selector));
  const trail = rules.find((r) => r.selector === TRAIL);

  test('the leading half is round on the outside and morphs on the inside', () => {
    assert.ok(lead, 'no leading-half rule');
    assert.match(lead.body, /border-start-start-radius:\s*var\(--md-comp-split-button-container-shape\)/);
    assert.match(lead.body, /border-end-start-radius:\s*var\(--md-comp-split-button-container-shape\)/);
    assert.match(lead.body, /border-start-end-radius:\s*var\(--_inner\)/);
    assert.match(lead.body, /border-end-end-radius:\s*var\(--_inner\)/);
  });

  test('the leading half narrows its trailing inset toward the seam', () => {
    assert.match(
      lead.body,
      /--md-comp-filled-button-trailing-space:\s*var\(--md-comp-split-button-leading-button-trailing-space\)/
    );
  });

  test('the trailing half is round on the outside and morphs on the inside', () => {
    assert.ok(trail, 'no trailing-half rule');
    assert.match(trail.body, /border-start-end-radius:\s*var\(--md-comp-split-button-container-shape\)/);
    assert.match(trail.body, /border-end-end-radius:\s*var\(--md-comp-split-button-container-shape\)/);
    assert.match(trail.body, /border-start-start-radius:\s*var\(--_inner\)/);
    assert.match(trail.body, /border-end-start-radius:\s*var\(--_inner\)/);
  });

  test('the trailing half is symmetric and takes the larger split-button icon', () => {
    assert.match(
      trail.body,
      /--md-comp-filled-button-leading-space:\s*var\(--md-comp-split-button-trailing-button-space\)/
    );
    assert.match(
      trail.body,
      /--md-comp-filled-button-trailing-space:\s*var\(--md-comp-split-button-trailing-button-space\)/
    );
    // The button's own icon rule reads this token, so rewriting it on the half
    // is the whole of the override - no second font-size/width/height block.
    assert.match(
      trail.body,
      /--md-comp-filled-button-icon-size:\s*var\(--md-comp-split-button-trailing-icon-size\)/
    );
  });
});

describe('Split button activation', () => {
  test('hovering or pressing a half swells its inner corner', () => {
    // `:is(button, a.button)` carries a comma of its own, so the selector is
    // matched whole rather than split on one.
    const morph = rules.filter(
      (r) => r.selector.startsWith('.split-button >') && /:(hover|active)/.test(r.selector) && /--_inner:/.test(r.body)
    );
    assert.ok(morph.length >= 1, 'no hover/press corner morph');
    for (const r of morph) {
      assert.match(r.body, /--_inner:\s*var\(--md-comp-split-button-inner-pressed-corner-corner-size\)/);
    }
  });

  test('the halves are matched with :where, so expanded outranks hover', () => {
    // `:is(button, a.button)` takes `a.button`'s specificity - one class more
    // than `:where()` - which put the hover morph above the expanded rule and
    // collapsed the seam of an open split button the moment the pointer
    // touched it. The seam stays round for as long as the menu is up.
    // Only the half itself - `$icon` further down is an :is() whose arguments
    // all weigh the same, so it cannot shift anything.
    assert.doesNotMatch(css, /\.split-button > :is\(/);
    assert.ok(
      rules.some((r) => r.selector.includes('.split-button > :where(')),
      'the halves are not matched with :where() at all'
    );
  });

  test('an icon button is not a half, in the sheet as well as the rules', () => {
    // It sets its own height, insets, colours and icon sizing on the element,
    // so it reaches none of this geometry and fights the seam it is handed.
    // `split-button-half-is-not-an-icon-button` forbids the markup; this keeps
    // the sheet from styling it halfway if one appears anyway.
    const styled = rules.filter((r) => r.selector.startsWith('.split-button >'));
    assert.ok(styled.length >= 1);
    for (const r of styled) {
      assert.match(
        r.selector,
        /:not\(\.icon-button\)/,
        `${r.selector} would reach an .icon-button half`
      );
    }
  });

  test('an expanded trailing half goes fully round on the seam', () => {
    // md.comp.split-button.<size>.trailing.inner-selected-corner is 50%, which
    // on a pill is the container shape.
    const expanded = rules.find((r) => r.selector === `${TRAIL}[aria-expanded=true]`);
    assert.ok(expanded, 'no expanded trailing-half rule');
    assert.match(expanded.body, /--_inner:\s*var\(--md-comp-split-button-container-shape\)/);
  });

  test('the expanded trailing icon is turned over', () => {
    const spun = rules.find((r) => r.selector.startsWith(`${TRAIL}[aria-expanded=true] >`));
    assert.ok(spun, 'no icon rotation rule');
    assert.match(spun.body, /transform:\s*rotate\(180deg\)/);
  });

  test('a half still transitions its shadow, as every other button does', () => {
    // `btn` transitions background-color and box-shadow. Restating the
    // property list on the half replaces it wholesale, so an `.elevated`
    // split button snapped its shadow while every other elevated button eased.
    const half = rules.find((r) => r.selector === HALF);
    assert.ok(half, 'no half rule');
    assert.match(half.body, /transition:[^;]*box-shadow/);
  });

  test('the morph and the spin are both transitioned, and both stop under reduce', () => {
    const moving = rules.filter(
      (r) => r.selector.startsWith('.split-button >') && /transition:/.test(r.body)
    );
    assert.ok(moving.length >= 1, 'nothing in the split button transitions');

    const reduce = css.slice(css.indexOf('.split-button'));
    const block = reduce.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?\.split-button[\s\S]*?)\n\}/);
    assert.ok(block, 'no reduced-motion block naming .split-button');
    assert.match(block[1], /transition:\s*none/);
  });
});

// The one behaviour this component has, and it is not its own: the trailing
// half is a Menu trigger, so Menu stamps `aria-expanded` on it and rewrites it
// on every open and close. That attribute is what the expanded shape above is
// drawn from, so it is worth a test that it actually lands.
describe('Split button expanded state', () => {
  const markup = `
    <div class="split-button">
      <button class="button">Save</button>
      <button class="button menu-trigger" data-target="sb-menu" aria-label="More save options">
        <span class="material-symbols" aria-hidden="true">arrow_drop_down</span>
      </button>
    </div>
    <menu id="sb-menu"><li><a href="#!">Save a copy</a></li></menu>`;

  test('Menu writes aria-expanded on the trailing half, and clears it', () => {
    document.body.innerHTML = markup;
    const trigger = document.querySelector('.menu-trigger');
    const instance = Expressive.Menu.init(trigger);
    try {
      assert.equal(trigger.getAttribute('aria-expanded'), 'false');
      assert.equal(trigger.getAttribute('aria-haspopup'), 'menu');

      instance.open();
      assert.equal(trigger.getAttribute('aria-expanded'), 'true');

      instance.close();
      assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    } finally {
      // A live timer wedges the whole run with no output, and close() schedules
      // one - so teardown goes in a finally, always.
      instance.destroy();
    }
  });

  test('the author never has to write it', () => {
    // The markup above carries no aria-expanded at all; the constructor
    // supplies it. `split-button-expanded-is-not-authored` forbids the other
    // way round, and this is the half of that contract a selector cannot check.
    assert.doesNotMatch(markup, /aria-expanded/);
  });
});
