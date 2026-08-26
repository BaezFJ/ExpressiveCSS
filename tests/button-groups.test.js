// Button groups: the M3 token block, and the shape morph that is the whole
// point of the connected variant.
//
// Ten token families (md.comp.button-group.{standard,connected}.{xsmall …
// xlarge}, DSP 34.0.21) collapse to one family here, the way the button's own
// size ladder does: the size class rewrites the tokens and no rule names both
// a variant and a size except where M3's numbers actually differ.
//
// The connected morph is asserted through the `--_corner` variable rather than
// through `border-radius` on each state. Writing `border-radius` under
// `:active` would clobber the outer corners the first and last items set as
// longhands, which is the bug this indirection exists to prevent.

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

// md.comp.button-group.standard.<size>.{between-space, container.height}
const STANDARD = {
  xsmall: { space: '18px', height: '32px' },
  small: { space: '12px', height: '40px' },
  medium: { space: '8px', height: '56px' },
  large: { space: '8px', height: '96px' },
  xlarge: { space: '8px', height: '136px' }
};

// md.comp.button-group.connected.<size>.{inner-corner, pressed.inner-corner}
const CONNECTED_CORNERS = {
  xsmall: { inner: '8px', pressed: '4px' },
  small: { inner: '8px', pressed: '4px' },
  medium: { inner: '8px', pressed: '4px' },
  large: { inner: '16px', pressed: '12px' },
  xlarge: { inner: '20px', pressed: '16px' }
};

describe('Button group tokens', () => {
  test('the default group is the small standard family', () => {
    const group = ruleFor('.button-group');
    assert.ok(group, 'no .button-group rule in the sheet');
    assert.match(group, /--md-comp-button-group-between-space:\s*12px/);
    assert.match(group, /gap:\s*var\(--md-comp-button-group-between-space\)/);
  });

  for (const [size, { space, height }] of Object.entries(STANDARD)) {
    test(`${size} is ${height} tall with ${space} between items`, () => {
      const rule = ruleFor(`.button-group.${size}`);
      assert.ok(rule, `no .button-group.${size} rule`);
      assert.match(rule, new RegExp(`--md-comp-button-group-between-space:\\s*${space}`));
      // The group sizes its buttons by rewriting their own tokens, so a size
      // is stated once and the items inherit it.
      assert.match(rule, new RegExp(`--md-comp-filled-button-container-height:\\s*${height}`));
    });
  }

  test('every connected group is 2dp between items, at every size', () => {
    const rule = ruleFor('.button-group.connected');
    assert.ok(rule, 'no .button-group.connected rule');
    assert.match(rule, /--md-comp-button-group-between-space:\s*2px/);
    assert.match(rule, /--md-comp-button-group-container-shape:\s*9999px/);
  });

  test('the connected rule wins the between-space over the size rule', () => {
    // Both are two classes, so source order is the whole difference: emit the
    // sizes first and a `.button-group.connected.medium` keeps M3's 8dp gap.
    const sizeAt = rules.findIndex((r) => r.selector === '.button-group.xlarge');
    const connectedAt = rules.findIndex((r) => r.selector === '.button-group.connected');
    assert.ok(sizeAt > -1 && connectedAt > -1);
    assert.ok(connectedAt > sizeAt, 'the connected rule must be emitted after the size rules');
  });

  for (const [size, { inner, pressed }] of Object.entries(CONNECTED_CORNERS)) {
    test(`connected ${size} joins at ${inner} and squares to ${pressed} on press`, () => {
      const rule = ruleFor(size === 'large' || size === 'xlarge'
        ? `.button-group.connected.${size}`
        : '.button-group.connected');
      assert.ok(rule, `no rule carrying the ${size} connected corners`);
      assert.match(rule, new RegExp(`--md-comp-button-group-inner-corner-corner-size:\\s*${inner}`));
      assert.match(rule, new RegExp(`--md-comp-button-group-pressed-inner-corner-corner-size:\\s*${pressed}`));
    });
  }
});

describe('Button group shape morph', () => {
  const item = ':is(button:not(.icon-button), a.button)';

  test('an item reads its corner off one variable', () => {
    const rule = ruleFor(`.button-group.connected > ${item}`);
    assert.ok(rule, 'no connected item rule');
    assert.match(rule, /--_corner:\s*var\(--md-comp-button-group-inner-corner-corner-size\)/);
    assert.match(rule, /border-radius:\s*var\(--_corner\)/);
  });

  test('pressing an item moves the variable, not the border-radius', () => {
    const active = ruleFor(`.button-group.connected > ${item}:active`);
    assert.ok(active, 'no press rule on a connected item');
    assert.match(active, /--_corner:\s*var\(--md-comp-button-group-pressed-inner-corner-corner-size\)/);
    assert.doesNotMatch(active, /border-radius/,
      'a border-radius here would clobber the outer corners of the end items');
  });

  test('the outer corners of the end items stay round', () => {
    const first = ruleFor(`.button-group.connected > ${item}:first-child`);
    const last = ruleFor(`.button-group.connected > ${item}:last-child`);
    assert.match(first, /border-start-start-radius:\s*var\(--md-comp-button-group-container-shape\)/);
    assert.match(first, /border-end-start-radius:\s*var\(--md-comp-button-group-container-shape\)/);
    assert.match(last, /border-start-end-radius:\s*var\(--md-comp-button-group-container-shape\)/);
    assert.match(last, /border-end-end-radius:\s*var\(--md-comp-button-group-container-shape\)/);
  });

  test('a standard group grows the pressed item instead of reshaping it', () => {
    const active = ruleFor(`.button-group:not(.connected) > ${item}:active`);
    assert.ok(active, 'no press rule on a standard group item');
    assert.match(active, /--md-comp-button-group-pressed-item-width-multiplier/);
    assert.doesNotMatch(active, /border-radius/);
  });

  test('a label item grows by its insets and a .circle by its width', () => {
    // A `.circle` states a width of its own, so padding would squeeze the icon
    // inside the same box instead of widening the button.
    const label = ruleFor(`.button-group:not(.connected) > ${item}:not(.circle):active`);
    assert.match(label, /padding-inline:\s*calc\(var\(--md-comp-filled-button-leading-space\) \+ var\(--_grow\)\)/);
    const circle = ruleFor(`.button-group:not(.connected) > ${item}.circle:active`);
    assert.ok(circle, 'no press rule for an icon-only item');
    assert.match(circle, /width:\s*calc\(var\(--md-comp-filled-button-container-height\) \+ 2 \* var\(--_grow\)\)/);
    assert.doesNotMatch(circle, /padding/);
  });

  test('an item with its own size class keeps its own type role', () => {
    // The item's geometry tokens beat the group's by inheritance, but a type
    // role has no such mechanism - so the group's rule has to step aside by
    // selector, or an `xlarge` item in a `medium` group ends up xlarge-tall
    // with medium type.
    const sized = ':not(.xsmall, .small, .medium, .large, .xlarge)';
    assert.ok(ruleFor(`.button-group.medium > ${item}${sized}`),
      'the group sets the type role on every item, sized or not');
    // The glyph size travels the other way - by inheritance, off the group -
    // and that is the whole mechanism now for an icon-only `.circle` item.
    // `_buttons.scss` used to pin a `.circle` glyph to 24px and this component
    // overrode it back; #72 removed the pin, so nothing stands between the
    // group's token and the item any more.
    assert.match(ruleFor('.button-group.medium'),
      /--md-comp-filled-button-icon-size:\s*24px/);
    assert.equal(rules.filter((r) => r.selector === `.button-group.medium > ${item}`).length, 0);
  });

  test('the motion is dropped when the user asked for no motion', () => {
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.button-group > [^{]*\{\s*transition:\s*none/);
  });
});
