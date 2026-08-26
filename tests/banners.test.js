// Banners: the M3 token block, and the two layouts resting on it.
//
// The component is CSS over ordinary markup, so what is worth asserting is the
// token values and the handful of selectors that decide which variant a class
// list produces. Both variants scope their layout with `:not(.rich)` / `.rich`
// rather than leaving it to source order; a rule that lost its scope would let
// the basic row's flex layout reach into the rich grid, which the cascade would
// hide rather than break.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseRules, sheet } from './css.js';

const rules = parseRules(sheet());

const ruleFor = (selector) => rules.find((r) => r.selector === selector)?.body;

describe('Banner tokens', () => {
  // md.comp.banners.*, DSP 34.0.21. The colours are shared by both variants
  // and live on the root; the geometry belongs to one variant or the other.
  const SHARED = {
    color: 'var(--md-sys-color-surface-container)',
    'body-text-color': 'var(--md-sys-color-on-surface)',
    'title-text-color': 'var(--md-sys-color-on-surface)',
    'icon-color': 'var(--md-sys-color-on-surface)',
    'close-button-color': 'var(--md-sys-color-primary)'
  };

  const BASIC = {
    height: '56px',
    shape: '28px',
    'leading-space': '4px',
    'trailing-space': '4px',
    'top-space': '4px',
    'bottom-space': '4px',
    'icon-container-size': '48px',
    'icon-size': '24px',
    'body-text-top-space': '14px',
    'body-text-bottom-space': '14px',
    'no-icon-body-text-leading-space': '16px',
    'actions-between-space': '8px',
    'actions-leading-space': '8px',
    'actions-trailing-space': '8px'
  };

  const RICH = {
    shape: '28px',
    'leading-space': '12px',
    'trailing-space': '12px',
    'top-space': '12px',
    'bottom-space': '12px',
    'icon-size': '24px',
    'icon-text-space': '4px',
    'image-size': '80px',
    'image-text-space': '8px',
    'leading-element-leading-space': '4px',
    'with-image-leading-space': '20px',
    'title-text-top-space': '14px',
    'title-text-bottom-space': '14px',
    'actions-between-space': '8px',
    'actions-top-space': '12px'
  };

  const cases = [
    ['.banner', 'md-comp-banners', SHARED],
    ['.banner:not(.rich)', 'md-comp-banners-basic', BASIC],
    ['.banner.rich', 'md-comp-banners-rich', RICH]
  ];

  for (const [selector, prefix, tokens] of cases) {
    const body = ruleFor(selector);

    for (const [name, value] of Object.entries(tokens)) {
      test(`--${prefix}-${name} is ${value}`, () => {
        assert.ok(body, `no ${selector} rule in the sheet`);
        assert.ok(
          body.includes(`--${prefix}-${name}: ${value};`),
          `expected ${name}: ${value}`
        );
      });
    }
  }

  test('the message carries the body-medium type role', () => {
    assert.match(
      ruleFor('.banner') ?? '',
      /font-size: var\(--md-sys-typescale-body-medium-font-size\)/
    );
  });

  test('the rich title is body-medium at the emphasized weight', () => {
    const title = ruleFor('.banner.rich > :is(h1, h2, h3, h4, h5, h6)');
    assert.ok(title, 'no rich title rule in the sheet');
    assert.match(title, /font-size: var\(--md-sys-typescale-body-medium-font-size\)/);
    assert.match(title, /font-weight: 500/);
  });
});

describe('Banner variants', () => {
  test('vibrant repoints the container and every colour on it', () => {
    const body = ruleFor('.banner.vibrant');
    assert.ok(body, 'no .banner.vibrant rule in the sheet');
    assert.match(body, /--md-comp-banners-color: var\(--md-sys-color-primary-container\)/);

    for (const role of ['body-text', 'title-text', 'icon']) {
      assert.match(
        body,
        new RegExp(`--md-comp-banners-${role}-color: var\\(--md-sys-color-on-primary-container\\)`),
        `${role} still reads a standard colour on a vibrant banner`
      );
    }
  });

  test('square is the corner and the inset that clears it, nothing else', () => {
    const body = ruleFor('.banner:not(.rich).square');
    assert.ok(body, 'no .banner.square rule in the sheet');
    assert.match(body, /--md-comp-banners-basic-shape: 0;/);
    assert.match(body, /--md-comp-banners-basic-no-icon-body-text-leading-space: 12px;/);
  });

  test('the basic layout never reaches into a rich banner', () => {
    const basic = rules.filter((r) => /(^|,)\s*\.banner(?![\w-])/.test(r.selector));

    for (const rule of basic) {
      if (!/display:\s*flex/.test(rule.body)) continue;
      assert.ok(
        rule.selector.includes(':not(.rich)') || rule.selector.includes('.rich'),
        `${rule.selector} lays a banner out without saying which variant it means`
      );
    }
  });

  test('the rich grid names its four areas', () => {
    const body = ruleFor('.banner.rich') ?? '';
    assert.match(body, /grid-template-areas:/);

    for (const area of ['lead', 'title', 'body', 'actions', 'close']) {
      assert.ok(body.includes(area), `the rich grid has no ${area} area`);
    }
  });

  // Both halves of this matter. `_icon-buttons.scss` sets the same token for
  // the disabled state at the same specificity and is forwarded first, so an
  // unscoped override here would win the tie and paint a disabled close button
  // at full-strength primary.
  test('the close button takes its colour from the banner, not the icon button', () => {
    const enabled = '.banner > .icon-button:not(:disabled, [disabled], [aria-disabled=true], .disabled)';
    const body = ruleFor(enabled);
    assert.ok(body, 'no close button rule in the sheet');
    assert.match(
      body,
      /--md-comp-icon-button-color: var\(--md-comp-banners-close-button-color\)/
    );
  });

  test('and yields the colour back when the close button is disabled', () => {
    const overrides = rules.filter(
      (r) =>
        /\.banner\b/.test(r.selector) &&
        /--md-comp-icon-button-color:/.test(r.body)
    );

    assert.ok(overrides.length, 'nothing colours the close button');
    for (const rule of overrides) {
      assert.match(
        rule.selector,
        /:not\([^)]*disabled/,
        `${rule.selector} outranks the icon button's own disabled colour`
      );
    }
  });
});
