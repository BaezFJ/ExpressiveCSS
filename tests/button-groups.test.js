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
  xsmall: { inner: '4px', pressed: '4px' },
  small: { inner: '8px', pressed: '4px' },
  medium: { inner: '8px', pressed: '4px' },
  large: { inner: '16px', pressed: '12px' },
  xlarge: { inner: '20px', pressed: '16px' }
};

const ICON_WIDTH_SPACES = {
  xsmall: { narrow: '4px', wide: '10px' },
  small: { narrow: '4px', wide: '14px' },
  medium: { narrow: '12px', wide: '24px' },
  large: { narrow: '16px', wide: '48px' },
  xlarge: { narrow: '32px', wide: '72px' }
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
    assert.match(rule, /width:\s*100%/);

    const items = rules.find((rule) =>
      rule.selector === '.button-group.connected > :is(button, a.button)' &&
      /flex:\s*1 1 0/.test(rule.body)
    )?.body;
    assert.match(items, /flex:\s*1 1 0/);
  });

  test('a selected connected item uses the fully round selected corner token', () => {
    const group = ruleFor('.button-group.connected');
    assert.match(group, /--md-comp-button-group-selected-inner-corner-corner-size:\s*50%/);

    const selected = ruleFor(
      '.button-group.connected > :is(button, a.button)[aria-pressed=true]'
    );
    assert.ok(selected, 'no selected connected-item rule');
    assert.match(
      selected,
      /--_corner:\s*var\(--md-comp-button-group-selected-inner-corner-corner-size\)/
    );
    assert.match(
      selected,
      /--_outer-corner:\s*var\(--md-comp-button-group-selected-inner-corner-corner-size\)/
    );
  });

  test('a square connected group uses the size-specific corner on every edge', () => {
    const square = ruleFor('.button-group.connected.square');
    assert.ok(square, 'no square connected-group shape');
    assert.match(
      square,
      /--md-comp-button-group-container-shape:\s*var\(--md-comp-button-group-inner-corner-corner-size\)/
    );
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
      const rule = ruleFor(size === 'small' || size === 'medium'
        ? '.button-group.connected'
        : `.button-group.connected.${size}`);
      assert.ok(rule, `no rule carrying the ${size} connected corners`);
      assert.match(rule, new RegExp(`--md-comp-button-group-inner-corner-corner-size:\\s*${inner}`));
      assert.match(rule, new RegExp(`--md-comp-button-group-pressed-inner-corner-corner-size:\\s*${pressed}`));
    });
  }
});

describe('Button group shape morph', () => {
  const item = ':is(button, a.button)';

  test('an item reads its corner off one variable', () => {
    const rule = rules.find((candidate) =>
      candidate.selector === `.button-group.connected > ${item}` &&
      /--_corner:/.test(candidate.body)
    )?.body;
    assert.ok(rule, 'no connected item rule');
    assert.match(rule, /--_corner:\s*var\(--md-comp-button-group-inner-corner-corner-size\)/);
    assert.match(rule, /border-radius:\s*var\(--_corner\)/);
  });

  test('connected shape morphing does not exclude icon-button items', () => {
    const rule = rules.find((r) =>
      r.selector.startsWith('.button-group.connected >') &&
      /--_corner:\s*var\(--md-comp-button-group-inner-corner-corner-size\)/.test(r.body)
    );
    assert.ok(rule, 'no connected item shape rule');
    assert.match(rule.selector, /:is\(button, a\.button\)/);
    assert.doesNotMatch(rule.selector, /not\(\.icon-button\)/);
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
    assert.match(first, /border-start-start-radius:\s*var\(--_outer-corner\)/);
    assert.match(first, /border-end-start-radius:\s*var\(--_outer-corner\)/);
    assert.match(last, /border-start-end-radius:\s*var\(--_outer-corner\)/);
    assert.match(last, /border-end-end-radius:\s*var\(--_outer-corner\)/);
  });

  test('a standard group reshapes the pressed item while ButtonGroup owns width', () => {
    const active = rules.find((rule) =>
      rule.selector.includes(`.button-group:not(.connected) > ${item}:active`)
    )?.body;
    assert.ok(active, 'no press rule on a standard group item');
    assert.match(active, /--_corner:\s*var\(--md-comp-button-group-pressed-item-shape\)/);
    assert.doesNotMatch(active, /(?:border-radius|padding|width):/);
  });

  test('standard selection swaps round and square shapes', () => {
    const selected = ruleFor(
      `.button-group:not(.connected) > ${item}[aria-pressed=true]`
    );
    const squareSelected = ruleFor(
      `.button-group.square:not(.connected) > ${item}[aria-pressed=true]`
    );
    assert.match(selected, /--_corner:\s*var\(--md-comp-button-group-item-shape-square\)/);
    assert.match(squareSelected, /--_corner:\s*var\(--md-comp-button-group-item-shape-round\)/);

    const selectedPressed = rules.find((rule) =>
      rule.selector.includes(`.button-group.square:not(.connected) > ${item}[aria-pressed=true]:active`)
    )?.body;
    assert.match(selectedPressed, /--_corner:\s*var\(--md-comp-button-group-pressed-item-shape\)/);
  });

  test('toggle buttons expose selection with shape, color, and icon fill', () => {
    const bodyFor = (selector) =>
      rules.find((rule) => rule.selector.includes(selector))?.body;
    const unselected = bodyFor(
      '.button-group > :is(button:not(.icon-button), a.button):where(.filled, :not(.elevated, .filled, .tonal, .outlined, .text))[aria-pressed=false]'
    );
    const selected = bodyFor(
      '.button-group > :is(button:not(.icon-button), a.button):where(.filled, :not(.elevated, .filled, .tonal, .outlined, .text))[aria-pressed=true]'
    );
    const icon = ruleFor(
      '.button-group > :is(button, a.button)[aria-pressed=true] > :is(i, .material-symbols, .material-symbols-outlined, .material-symbols-rounded, .material-symbols-sharp, .material-icons)'
    );
    assert.match(unselected, /--_toggle-container-color:\s*var\(--md-sys-color-surface-container\)/);
    assert.match(unselected, /color:\s*var\(--md-sys-color-on-surface-variant\)/);
    assert.match(selected, /--_toggle-container-color:\s*var\(--md-sys-color-primary\)/);
    assert.match(selected, /color:\s*var\(--md-sys-color-on-primary\)/);
    assert.match(icon, /--md-icon-fill:\s*1/);
  });

  test('toggle selection keeps hover, focus, pressed, and token-specific disabled feedback', () => {
    const bodyFor = (selector) =>
      rules.find((rule) => rule.selector.includes(selector))?.body;
    const toggleItem = ':is(button:not(.icon-button):not(.text), a.button:not(.text), .icon-button:is(.filled, .tonal, .outlined))';
    const hover = ruleFor(`.button-group > ${toggleItem}[aria-pressed]:hover`);
    const focus = ruleFor(`.button-group > ${toggleItem}[aria-pressed]:focus`);
    const pressed = ruleFor(`.button-group > ${toggleItem}[aria-pressed]:active`);
    const filledDisabled = bodyFor(
      '.button-group > :is(button:not(.icon-button), a.button):where(.filled, :not(.elevated, .filled, .tonal, .outlined, .text))[aria-pressed]:is(:disabled, [disabled], .disabled)'
    );
    const outlinedDisabled = bodyFor(
      '.button-group > :is(button:not(.icon-button), a.button).outlined[aria-pressed=false]:is(:disabled, [disabled], .disabled)'
    );
    assert.match(hover, /var\(--_toggle-state-color\) calc\(var\(--md-sys-state-hover-state-layer-opacity\) \* 100%\)/);
    assert.match(hover, /var\(--_toggle-container-color\)/);
    assert.match(focus, /var\(--_toggle-state-color\) calc\(var\(--md-sys-state-focus-state-layer-opacity\) \* 100%\)/);
    assert.match(pressed, /var\(--_toggle-state-color\) calc\(var\(--md-sys-state-pressed-state-layer-opacity\) \* 100%\)/);
    assert.match(filledDisabled, /background-color:\s*color-mix\([^}]*10%/s);
    assert.match(outlinedDisabled, /background-color:\s*transparent/);
    assert.match(outlinedDisabled, /border-color:\s*var\(--md-sys-color-outline-variant\)/);
  });

  test('CSS does not duplicate the scripted standard-width redistribution', () => {
    const labelItem = ':is(button:not(.icon-button), a.button)';
    assert.equal(ruleFor(`.button-group:not(.connected) > ${labelItem}:not(.circle):active`), undefined);
    assert.equal(ruleFor(`.button-group:not(.connected) > ${labelItem}.circle:active`), undefined);
    assert.equal(ruleFor('.button-group:not(.connected) > .icon-button:active'), undefined);
  });

  test('an item with its own size class keeps its own type role', () => {
    // The item's geometry tokens beat the group's by inheritance, but a type
    // role has no such mechanism - so the group's rule has to step aside by
    // selector, or an `xlarge` item in a `medium` group ends up xlarge geometry
    // and medium type.
    const sized = ':not(.xsmall, .small, .medium, .large, .xlarge)';
    const labelItem = ':is(button:not(.icon-button), a.button)';
    assert.ok(ruleFor(`.button-group.medium > ${labelItem}${sized}`),
      'the group sets the type role on every label item without its own size');
    // The glyph size travels the other way - by inheritance, off the group -
    // and that is the whole mechanism now for an icon-only `.circle` item.
    // `_buttons.scss` used to pin a `.circle` glyph to 24px and this component
    // overrode it back; #72 removed the pin, so nothing stands between the
    // group's token and the item any more.
    assert.match(ruleFor('.button-group.medium'),
      /--md-comp-filled-button-icon-size:\s*24px/);
    assert.equal(rules.filter((r) => r.selector === `.button-group.medium > ${item}`).length, 0);
  });

  test('a group size reaches icon-button geometry', () => {
    const sized = ':not(.xsmall, .small, .medium, .large, .xlarge)';
    const icon = ruleFor(`.button-group.medium > .icon-button${sized}`);
    assert.ok(icon, 'the group does not size icon-button items');
    assert.match(icon, /--md-comp-icon-button-container-height:\s*56px/);
    assert.match(icon, /--md-comp-icon-button-icon-size:\s*24px/);

    for (const [size, spaces] of Object.entries(ICON_WIDTH_SPACES)) {
      for (const [width, space] of Object.entries(spaces)) {
        const modifier = ruleFor(`.button-group.${size} > .icon-button.${width}${sized}`);
        assert.match(modifier, new RegExp(`--md-comp-icon-button-leading-space:\\s*${space}`));
        assert.match(modifier, new RegExp(`--md-comp-icon-button-trailing-space:\\s*${space}`));
      }
    }
  });

  test('default, explicit, and mixed-size items keep a 48dp target', () => {
    const target = ruleFor(`.button-group > ${item}::before`);
    assert.ok(target, 'no centered minimum target on group items');
    assert.match(target, /min-width:\s*48px/);
    assert.match(target, /min-height:\s*48px/);

    const connected = ruleFor(`.button-group.connected > ${item}`);
    assert.ok(connected, 'connected small items have no 48dp minimum width');
    assert.match(connected, /min-width:\s*48px/);
  });

  test('width and corner motion uses the fast-spatial spring approximation', () => {
    const group = ruleFor('.button-group');
    const itemRule = ruleFor(`.button-group > ${item}`);
    assert.match(group, /--md-comp-button-group-motion:\s*linear\(/);
    assert.match(itemRule, /width 200ms var\(--md-comp-button-group-motion\)/);
    assert.match(itemRule, /border-radius 200ms var\(--md-comp-button-group-motion\)/);
  });

  test('the motion is dropped when the user asked for no motion', () => {
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.button-group > [^{]*\{\s*transition:\s*none/);
  });
});
