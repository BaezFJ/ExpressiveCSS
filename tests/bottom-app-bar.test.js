// Bottom app bar. CSS only: a container, the actions it hosts, and the FAB
// slot. What is worth asserting is the token block, the fact that the host is
// a class rather than an element - the retired version was
// `footer:has(> nav:only-child)`, which claimed a navigation landmark for a
// row of commands - and that nothing here reaches the navigation bar.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseRules, sheet } from './css.js';

const css = sheet();
const rules = parseRules(css);

const ruleFor = (selector) => rules.find((r) => r.selector === selector)?.body;

describe('Bottom app bar tokens', () => {
  // md.comp.bottom-app-bar.*, DSP 34.0.21. The container is the whole token
  // family Material publishes for this component - the actions are icon
  // buttons and the FAB is a FAB, so their values come from those specs.
  // `with-fab.container.height` (72dp) is deprecated: one height, content
  // vertically centred, whether a FAB is there or not.
  const TOKENS = {
    'container-color': 'var(--md-sys-color-surface-container)',
    'container-height': '80px',
    'container-shape': '0',
    'icon-color': 'var(--md-sys-color-on-surface-variant)',
    'icon-size': '24px',
    'action-size': '48px',
    // 16dp from the edge to the glyph, less the 12dp the 48dp action already
    // insets. Compose spells it exactly this way: 16.dp - 12.dp.
    'leading-space': '4px',
    'trailing-space': '4px',
    // BottomAppBarDefaults.bottomAppBarFabColor is the secondary-container
    // FAB, not the primary-container one a free-standing FAB uses.
    'fab-container-color': 'var(--md-sys-color-secondary-container)',
    'fab-trailing-space': '16px'
  };

  const body = ruleFor('.bottom-app-bar');

  for (const [name, value] of Object.entries(TOKENS)) {
    test(`--md-comp-bottom-app-bar-${name} is ${value}`, () => {
      assert.ok(body, 'no .bottom-app-bar rule in the sheet');
      assert.ok(
        body.includes(`--md-comp-bottom-app-bar-${name}: ${value};`),
        `expected ${name}: ${value}`
      );
    });
  }

  test('the container carries the level 2 elevation the spec gives it', () => {
    assert.match(body ?? '', /box-shadow:/);
  });
});

describe('Bottom app bar layout', () => {
  test('the host is a class, never an element', () => {
    // The retired bar was keyed on `footer:has(> nav:only-child)`, which made
    // a row of commands a navigation landmark and put it one markup slip away
    // from the navigation bar.
    assert.doesNotMatch(css, /footer:has\(>\s*nav:only-child/);

    for (const rule of rules.filter((r) => r.selector.includes('bottom-app-bar'))) {
      assert.doesNotMatch(
        rule.selector,
        /(^|[\s,>])(?:nav|footer)\.bottom-app-bar/,
        `${rule.selector} ties the bar to an element`
      );
    }
  });

  test('actions are 48dp targets and let a self-styling control opt out', () => {
    const action = rules.find(
      (r) =>
        r.selector.startsWith('.bottom-app-bar >') &&
        r.selector.includes(':is(a, button)') &&
        /width: var\(--md-comp-bottom-app-bar-action-size\)/.test(r.body)
    );
    assert.ok(action, 'no action rule in the sheet');
    assert.match(action.selector, /:not\([^)]*\.icon-button/);
  });

  test('the FAB slot is pushed to the end and flattened', () => {
    const fab = rules.find(
      (r) => r.selector.startsWith('.bottom-app-bar >') && /margin-inline-start:\s*auto/.test(r.body)
    );
    assert.ok(fab, 'nothing pushes the FAB to the end of the bar');
    assert.match(fab.selector, /\.extra|\.circle/);
    assert.match(
      fab.body,
      /background-color: var\(--md-comp-bottom-app-bar-fab-container-color\)/
    );
    // Elevation level 0: the bar is already lifted, so the FAB inside it is not.
    assert.match(fab.body, /box-shadow:\s*(?:none|0)/);
    // 16dp from the container edge, not 16dp on top of the bar's own inset.
    assert.match(
      fab.body,
      /margin-inline-end: calc\(var\(--md-comp-bottom-app-bar-fab-trailing-space\) - var\(--md-comp-bottom-app-bar-trailing-space\)\)/
    );
  });

  test('.fixed pins the bar to the bottom edge, clear of the safe area', () => {
    const body = ruleFor('.bottom-app-bar.fixed');
    assert.ok(body, 'no .bottom-app-bar.fixed rule in the sheet');
    assert.match(body, /position:\s*fixed/);
    assert.match(body, /inset:\s*auto 0 0/);
    assert.match(body, /env\(safe-area-inset-bottom/);
  });

  // The inset is added to the container, not taken out of it. Under
  // `box-sizing: border-box` a bare `padding-bottom` would spend the bar's own
  // 80dp on the notch and leave the actions in what was left.
  test('the safe area grows the bar instead of compressing it', () => {
    assert.match(
      ruleFor('.bottom-app-bar.fixed') ?? '',
      /min-height: calc\(var\(--md-comp-bottom-app-bar-container-height\) \+ env\(safe-area-inset-bottom[^)]*\)\)/
    );
  });

  // Focus and pressed are separate M3 states. `:focus` rather than
  // `:focus-visible` because the FAB's own `_buttons.scss` block paints a
  // primary-container tint on plain `:focus`, which this has to cover.
  test('the in-bar FAB keeps focus and pressed apart', () => {
    const forFab = (pseudo) =>
      rules.find(
        (r) =>
          r.selector.startsWith('.bottom-app-bar >') &&
          r.selector.includes('.extra') &&
          r.selector.endsWith(pseudo)
      );
    const focus = forFab(':focus');
    const pressed = forFab(':active');
    assert.ok(focus, 'the in-bar FAB has no focus state');
    assert.ok(pressed, 'the in-bar FAB has no pressed state');
    assert.match(focus.body, /--md-sys-state-focus-state-layer-opacity/);
    assert.match(pressed.body, /--md-sys-state-pressed-state-layer-opacity/);
  });
});

describe('Bottom app bar and navigation bar stay apart', () => {
  // Acceptance criterion from #35. They are different components - commands
  // against destinations - and M3 says never show both. Two pages will anyway,
  // so no selector on either side may reach the other.
  test('no rule styles both', () => {
    for (const rule of rules) {
      if (!rule.selector.includes('bottom-app-bar')) continue;
      assert.doesNotMatch(
        rule.selector,
        /\.navigation-bar|\.navigation-rail/,
        `${rule.selector} styles the navigation bar too`
      );
    }
  });

  test('the app bar host does not reach it either', () => {
    // `$_bar` is `:is(nav:not(...), .bar)`. `.bar` is a whole class token and
    // cannot match `class="bottom-app-bar"`, but a `nav.bottom-app-bar` would
    // walk straight into the top app bar's geometry - which is the other half
    // of why the host forbids `nav`.
    for (const rule of rules.filter((r) => r.selector.includes('bottom-app-bar'))) {
      assert.doesNotMatch(rule.selector, /^header/, `${rule.selector} nests it in the app bar`);
    }
  });
});
