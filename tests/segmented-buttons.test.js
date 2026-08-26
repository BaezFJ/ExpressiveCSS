// Segmented buttons: the M3 token block, and the native markup it rests on.
//
// The component is CSS over a <fieldset> of radios or checkboxes, so the
// browser owns both the checked state and the arrow-key model. Every selector
// asserted here reads a state only the control has - swap the input for a
// button or a class and the whole keyboard contract leaves with it, silently,
// because the rules would simply stop matching.
//
// The height test earns its place twice over: a segment is a <label> next to a
// radio, and the first draft wrapped the input instead. That made it a radio
// control to forms/_radio-buttons and a checkbox control to
// forms/_checkboxes - a 48dp row inside a 40dp pill, plus a checkmark mask on
// the label's ::before.

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

describe('Segmented button tokens', () => {
  // md.comp.outlined-segmented-button.*, DSP 34.0.21, plus the two layout
  // constants the token file omits (Compose SegmentedButton.kt: 12dp content
  // padding, 8dp icon spacing).
  const TOKENS = {
    'container-height': '40px',
    'container-shape': '9999px',
    'outline-width': '1px',
    'outline-color': 'var(--md-sys-color-outline)',
    'leading-space': '12px',
    'trailing-space': '12px',
    'icon-size': '18px',
    'icon-label-space': '8px',
    'label-text-color': 'var(--md-sys-color-on-surface)',
    'selected-container-color': 'var(--md-sys-color-secondary-container)',
    'selected-label-text-color': 'var(--md-sys-color-on-secondary-container)'
  };

  const group = ruleFor('.segmented-button');

  for (const [name, value] of Object.entries(TOKENS)) {
    test(`--md-comp-outlined-segmented-button-${name} is ${value}`, () => {
      assert.ok(group, 'no .segmented-button rule in the sheet');
      assert.ok(
        group.includes(`--md-comp-outlined-segmented-button-${name}: ${value};`),
        `expected ${name}: ${value}`
      );
    });
  }

  test('the label carries the label-large type role', () => {
    assert.match(
      ruleFor('.segmented-button > .segment'),
      /font-size:\s*var\(--md-sys-typescale-label-large-font-size\)/
    );
  });
});

describe('Segmented button markup contract', () => {
  test('selection is read off the input, never off a class', () => {
    // The selected fill exists only behind `input:checked + .segment`. A
    // `.selected` rule appearing here would mean the page had been handed a
    // second copy of a state the input already holds.
    const selected = ruleFor('.segmented-button > input:checked + .segment');
    assert.ok(selected, 'no input:checked rule - selection is not reading the control');
    assert.match(selected, /--_container-color:\s*var\(--md-comp-outlined-segmented-button-selected-container-color\)/);
    assert.equal(
      rules.filter((r) => /\.segment[.:]?[^ ]*\.(selected|active)\b/.test(r.selector)).length,
      0,
      'a segment must not be selected by class'
    );
  });

  test('the input stays focusable, so the arrow keys still work', () => {
    // Hidden with a clip, not `display: none` or `visibility: hidden`: either
    // of those takes the radio out of the tab order, and a radio group nobody
    // can focus has no keyboard model left.
    const input = ruleFor('.segmented-button > input');
    assert.ok(input, 'no rule hiding the segment input');
    assert.match(input, /clip-path:\s*inset\(50%\)/);
    assert.doesNotMatch(input, /display:\s*none/);
    assert.doesNotMatch(input, /visibility:\s*hidden/);
  });

  test('focus is drawn inside the segment, where the pill cannot clip it', () => {
    const focus = ruleFor('.segmented-button > input:focus-visible + .segment');
    assert.ok(focus, 'no focus-visible rule on the segment');
    assert.match(focus, /outline-offset:\s*-3px/);
  });

  test('the group is equal columns across the width it is given', () => {
    // material-web's own set is `grid-auto-columns: 1fr` on a full-width grid.
    // A shrink-wrapped `inline-flex` row sizes each segment to its label, which
    // is not what M3 specifies.
    const group = ruleFor('.segmented-button');
    assert.match(group, /display:\s*grid/);
    assert.match(group, /grid-auto-flow:\s*column/);
    assert.match(group, /grid-auto-columns:\s*1fr/);
  });

  test('a segment is 40dp, not the 48dp row of a selection control', () => {
    const seg = ruleFor('.segmented-button > .segment');
    assert.match(seg, /min-block-size:\s*calc\(\s*var\(--md-comp-outlined-segmented-button-container-height\)/);
  });

  test('a disabled segment takes no state layer', () => {
    // The hover and press rules exclude it by selector rather than by
    // repainting after the fact, so a disabled segment never lights up.
    assert.ok(ruleFor('.segmented-button > input:not(:disabled) + .segment:hover'));
    assert.ok(ruleFor('.segmented-button > input:not(:disabled) + .segment:active'));
  });
});
