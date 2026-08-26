// Common buttons: the two modifier axes, and the promise that they compose.
//
// M3 Expressive re-tokenised buttons as five sizes by five styles. That is
// nine classes, not twenty-five - the size rules set tokens, the style rules
// set colours, and the cascade does the combining. These tests are what stops
// the twenty-fifth per-combination rule from creeping back in.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const css = readFileSync(new URL('dist/css/expressive.css', root), 'utf8');

const rules = [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)].map((m) => ({
  selector: m[1].trim(),
  body: m[2]
}));

/** The declarations of the first rule whose selector matches `pred`. */
const ruleFor = (pred) => rules.find((r) => pred(r.selector))?.body;

// The common-button selector list, read out of the sheet rather than spelled
// out here - it carries the whole `:not()` opt-out list and would rot.
const BASE = rules.find((r) => r.selector.includes('a.button') && /gap:/.test(r.body)).selector;

/** The rule for `.class` on that list, wherever it sits in a selector list. */
const buttonRule = (...classes) =>
  ruleFor((s) => s.includes(`${BASE}.${classes.join('.')}`));

describe('Button size axis', () => {
  // md.comp.button.{xsmall…xlarge}, DSP 34.0.21. Small is M3's default, so
  // its values are also what a button with no size class gets.
  const SIZES = {
    xsmall: { height: 32, icon: 20, space: 12, gap: 8, outline: 1, label: 'label-large' },
    small: { height: 40, icon: 20, space: 16, gap: 8, outline: 1, label: 'label-large' },
    medium: { height: 56, icon: 24, space: 24, gap: 8, outline: 1, label: 'title-medium' },
    large: { height: 96, icon: 32, space: 48, gap: 12, outline: 2, label: 'headline-small' },
    xlarge: { height: 136, icon: 40, space: 64, gap: 16, outline: 3, label: 'headline-large' }
  };

  for (const [size, spec] of Object.entries(SIZES)) {
    test(`${size} is ${spec.height}dp with a ${spec.icon}dp icon`, () => {
      const rule = buttonRule(size);
      assert.ok(rule, `no .${size} rule on the common-button selector`);
      assert.match(rule, new RegExp(`--md-comp-filled-button-container-height:\\s*${spec.height}px`));
      assert.match(rule, new RegExp(`--md-comp-filled-button-icon-size:\\s*${spec.icon}px`));
      assert.match(rule, new RegExp(`--md-comp-filled-button-leading-space:\\s*${spec.space}px`));
      assert.match(rule, new RegExp(`--md-comp-filled-button-trailing-space:\\s*${spec.space}px`));
      assert.match(rule, new RegExp(`--md-comp-filled-button-icon-label-space:\\s*${spec.gap}px`));
      assert.match(rule, new RegExp(`--md-comp-filled-button-outline-width:\\s*${spec.outline}px`));
    });

    test(`${size} carries the ${spec.label} type role`, () => {
      assert.match(
        buttonRule(size),
        new RegExp(`font-size:\\s*var\\(--md-sys-typescale-${spec.label}-font-size\\)`)
      );
    });
  }

  test('a button with no size class is the small one', () => {
    // The default has to be a size on the ladder, or the axis is a lie: the
    // sheet would have five named sizes and a sixth unnamed one.
    const root = ruleFor((s) => s === ':root');
    for (const [prop, value] of [
      ['container-height', '40px'],
      ['icon-size', '20px'],
      ['leading-space', '16px'],
      ['trailing-space', '16px'],
      ['icon-label-space', '8px']
    ]) {
      assert.match(root, new RegExp(`--md-comp-filled-button-${prop}:\\s*${value}`));
    }
  });

  test('every size sets tokens and nothing else', () => {
    // A size that declared geometry directly would stop composing: the style
    // rules would have to restate it, which is the per-combination rule this
    // whole shape exists to avoid.
    for (const size of Object.keys(SIZES)) {
      assert.doesNotMatch(buttonRule(size), /(?:^|;)\s*(?:height|padding|border-radius|width):/);
    }
  });
});

describe('Button style axis', () => {
  for (const style of ['filled', 'tonal', 'outlined', 'elevated', 'text']) {
    test(`.${style} exists as a class on .button`, () => {
      const rule = buttonRule(style);
      assert.ok(rule, `no .${style} rule on the common-button selector`);
      assert.match(rule, /background-color|border/);
    });
  }

  test('the outline width comes from the size', () => {
    // The one place the two axes meet: M3 widens the outline with the size
    // (1dp up to medium, 2dp large, 3dp xlarge), so outlined has to read the
    // token rather than hard-coding 1px.
    assert.match(
      buttonRule('outlined'),
      /border:\s*var\(--md-comp-filled-button-outline-width[,)]/
    );
  });
});

describe('The axes compose without per-combination rules', () => {
  const SIZES = ['xsmall', 'small', 'medium', 'large', 'xlarge'];
  const STYLES = ['filled', 'tonal', 'outlined', 'elevated', 'text'];

  test('no rule chains a size onto a style', () => {
    const offenders = rules
      .filter((r) =>
        SIZES.some((z) =>
          STYLES.some(
            (y) =>
              r.selector.includes(`${BASE}.${z}.${y}`) || r.selector.includes(`${BASE}.${y}.${z}`)
          )
        )
      )
      .map((r) => r.selector);
    assert.deepEqual(offenders, [], `25 combinations were enumerated:\n  ${offenders.join('\n  ')}`);
  });

  test('every button token a rule reads is one the sheet declares', () => {
    // A var() naming a property nothing declares invalidates the whole
    // declaration, silently - the failure mode that made .display-large a
    // no-op for three releases.
    const declared = new Set(
      [...css.matchAll(/(--md-comp-filled-button-[\w-]+)\s*:/g)].map((m) => m[1])
    );
    const read = new Set(
      [...css.matchAll(/var\(\s*(--md-comp-filled-button-[\w-]+)/g)].map((m) => m[1])
    );
    const missing = [...read].filter((p) => !declared.has(p));
    assert.deepEqual(missing, [], `read but never declared: ${missing.join(', ')}`);
  });
});
