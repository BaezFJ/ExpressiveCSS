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

const root = new URL('../', import.meta.url);
const css = readFileSync(new URL('dist/css/expressive.css', root), 'utf8');

const rules = [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)].map((m) => ({
  selector: m[1].trim(),
  body: m[2]
}));

const ruleFor = (selector) => rules.find((r) => r.selector === selector)?.body;

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
  const trail = rules.find((r) => r.selector === '.split-button > .menu-trigger');

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

  test('an expanded trailing half goes fully round on the seam', () => {
    // md.comp.split-button.<size>.trailing.inner-selected-corner is 50%, which
    // on a pill is the container shape.
    const expanded = rules.find(
      (r) => r.selector === '.split-button > .menu-trigger[aria-expanded=true]'
    );
    assert.ok(expanded, 'no expanded trailing-half rule');
    assert.match(expanded.body, /--_inner:\s*var\(--md-comp-split-button-container-shape\)/);
  });

  test('the expanded trailing icon is turned over', () => {
    const spun = rules.find((r) => /\.menu-trigger\[aria-expanded=true\] >/.test(r.selector));
    assert.ok(spun, 'no icon rotation rule');
    assert.match(spun.body, /transform:\s*rotate\(180deg\)/);
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
