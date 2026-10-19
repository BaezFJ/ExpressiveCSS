// Guards the custom properties in the compiled sheet against the two ways a
// token can be silently wrong. Neither is a syntax error, so nothing - not
// sass, not tsc, not a browser console - says a word about either one.
//
// 1. A `var()` naming a token nothing declares makes its whole declaration
//    INVALID AT COMPUTED-VALUE TIME. That is not the same as the declaration
//    being ignored: it still wins the cascade, and *then* resolves to unset,
//    so the property falls to its inherited or initial value rather than to
//    the rule underneath. `.am-btn` in the time picker referenced the
//    retired --btn-padding and rendered with padding 0 while a base button
//    rule sat right there offering 24px. The typescale classes did nothing at
//    all for the same reason.
//
// 2. A token declared and read by nobody is a promise the sheet does not keep.
//    --md-comp-top-app-bar-trailing-icon-color was documented as the way to
//    mute the app bar's trailing icons and was consumed by no rule, so setting
//    it did nothing; the docs had just been corrected to point readers at it.
//
// Scope note: only --md-comp-* is checked for being read. --md-sys-* and
// --md-ref-* are the design system's public surface - a tonal ramp exists so
// consumers can reach for tone 60 whether or not the framework happens to use
// it, and 111 of them currently go unread on purpose.

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

/** Tokens the sheet defines: assigned in a rule, or registered with @property. */
const declared = new Set([
  ...[...css.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map((m) => m[1]),
  ...[...css.matchAll(/@property\s+(--[A-Za-z0-9_-]+)/g)].map((m) => m[1]),
]);

/** Every var() reference, and separately those that carry a fallback. */
const referenced = new Set(
  [...css.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)].map((m) => m[1])
);
const withoutFallback = new Set(
  [...css.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*\)/g)].map((m) => m[1])
);

// A --md-comp-* token the sheet declares and never reads. Exempt is the
// backlog and only ever shrinks - the test below fails on a stale entry too,
// so a token that gets wired up cannot be left listed here.
const UNREAD_ALLOWED = new Map([
  [
    '--md-comp-tabs-indicator-duration',
    'read by Tabs, which writes the sliding indicator transition inline with ' +
      'var() so the spring follows motion="expressive" and reduced motion.',
  ],
  [
    '--md-comp-tabs-indicator-easing',
    'read by Tabs alongside --md-comp-tabs-indicator-duration, in the same ' +
      'inline transition.',
  ],
  [
    '--md-comp-button-group-pressed-item-width-multiplier',
    'read at runtime by ButtonGroup because CSS cannot multiply a measured ' +
      'item width or redistribute it to adjacent items. It remains a public ' +
      'component token in the sheet so authors can tune the scripted geometry.',
  ],
  [
    '--md-comp-pane-primary-min-width',
    'declared and documented in _panes.scss but applied nowhere. Which pane it ' +
      'should constrain and at which breakpoint is an open design question - ' +
      'the primary column is 1fr in every canonical variant - so this is a ' +
      'missing feature rather than a wiring slip. Wire it or drop it, but do ' +
      'not leave it documented and inert.',
  ],
  [
    '--md-comp-radial-chart-thickness',
    'read at runtime by RadialChart, which lays the rings out in SVG units ' +
      'and hit-tests the pointer against the same radii.',
  ],
  [
    '--md-comp-radial-chart-gap',
    'read at runtime by RadialChart with the thickness token, for the same reason.',
  ],
  ...['route', 'arc', 'cluster', 'cluster-label'].map((name) => [
    `--md-comp-map-${name}-color`,
    'read at runtime by MapView, which resolves it to an sRGB color for a ' +
      'MapLibre layer. The canvas cannot read CSS.',
  ]),
]);

describe('Custom properties', () => {
  test('every var() without a fallback names a token the sheet declares', () => {
    // With a fallback the reference is legitimate even when nothing declares
    // the token - that is how an author hook (--carousel-height) and a
    // JS-written value (--md-comp-progress-value) are meant to look. Without
    // one, an undeclared token takes the whole declaration down with it.
    const dangling = [...withoutFallback].filter((t) => !declared.has(t)).sort();
    assert.deepEqual(
      dangling,
      [],
      `var() references nothing declares, so every declaration using one is ` +
        `invalid at computed-value time: ${dangling.join(', ')}`
    );
  });

  test('every --md-comp-* token the sheet declares is read by the sheet', () => {
    const unread = [...declared]
      .filter((t) => t.startsWith('--md-comp-') && !referenced.has(t))
      .sort();
    const allowed = [...UNREAD_ALLOWED.keys()].sort();

    // Exact, not a subset: an exemption that stops being true has to fail, or
    // the list rots into a permanent excuse.
    assert.deepEqual(
      unread,
      allowed,
      unread.length > allowed.length
        ? `component tokens declared and read by nothing - either wire them up ` +
            `or add them to UNREAD_ALLOWED with a reason: ` +
            `${unread.filter((t) => !UNREAD_ALLOWED.has(t)).join(', ')}`
        : `UNREAD_ALLOWED lists a token that is now read (or no longer ` +
            `declared) - drop the entry: ` +
            `${allowed.filter((t) => !unread.includes(t)).join(', ')}`
    );
  });
});

describe('Motion tokens', () => {
  test('the standard curve is written once per token, and components read the token', () => {
    const literals = [...css.matchAll(/([^;{\s]+):[^;{}]*cubic-bezier\(0\.2, 0, 0, 1\)/g)].map((match) => match[1]);
    assert.deepEqual(literals, ['--md-sys-motion-easing-standard', '--md-sys-motion-easing-emphasized']);
    assert.match(css, /--md-sys-motion-duration-short4:\s*200ms/);
    assert.match(css, /--md-sys-motion-duration-extra-long4:\s*1000ms/);
  });
});

describe('Shape tokens', () => {
  test('the corner scale matches md.sys.shape.corner and components read it', () => {
    const scale = {
      none: '0px', 'extra-small': '4px', small: '8px', medium: '12px', large: '16px',
      'large-increased': '20px', 'extra-large': '28px', 'extra-large-increased': '32px',
      'extra-extra-large': '48px', full: '9999px',
    };
    for (const [step, value] of Object.entries(scale)) {
      assert.match(css, new RegExp(`--md-sys-shape-corner-${step}:\\s*${value};`));
    }
    assert.match(css, /--md-comp-card-container-shape:\s*var\(--md-sys-shape-corner-medium\)/);
  });
});

describe('Stacking tokens', () => {
  test('floating surfaces read the stacking scale, which rises in the documented order', () => {
    assert.doesNotMatch(css, /z-index:\s*\d{3,}/, 'a floating surface hard-codes its z-index');
    const order = ['toolbar', 'app-bar', 'modal-rail', 'sheet', 'lightbox', 'tooltip', 'menu', 'snackbar', 'confetti'];
    const values = order.map((name) => Number(css.match(new RegExp(`--expressive-z-${name}:\\s*(\\d+)`))?.[1]));
    assert.ok(values.every(Number.isFinite), `missing a stacking token: ${values}`);
    assert.deepEqual(values, [...values].sort((a, b) => a - b));
  });
});

describe('Spring tokens', () => {
  // The closed-form position of a mass-1 spring released at rest, and the time
  // its envelope stays within 0.5% of the target, as abstracts/_spring.scss solves them.
  const position = (t, z, k) => {
    const w = Math.sqrt(k);
    const wd = w * Math.sqrt(1 - z * z);
    return z < 1
      ? 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))
      : 1 - Math.exp(-w * t) * (1 + w * t);
  };
  const settle = (z, k) => Math.log(1 / (0.005 * Math.sqrt(1 - z * z))) / (z * Math.sqrt(k));
  const token = (name, scope) => css.slice(css.indexOf(scope)).match(new RegExp(`--md-sys-motion-spring-${name}:\\s*([^;]+);`))[1];

  test('each spring samples the solved position over its settle time', () => {
    const springs = [['fast-spatial', 0.9, 1400, ':root'], ['default-spatial', 0.8, 380, "[motion=expressive]"]];
    for (const [name, z, k, scope] of springs) {
      const end = settle(z, k);
      assert.equal(token(`${name}-duration`, scope), `${Math.round(end * 1000)}ms`, name);
      const at50 = Number(token(name, scope).match(/([\d.]+) 50%/)[1]);
      assert.ok(Math.abs(at50 - position(end / 2, z, k)) < 1e-4, `${name} at 50%: ${at50}`);
    }
  });

  test('effects springs never overshoot and expressive spatial springs do', () => {
    const values = (name, scope) => token(name, scope).match(/[\d.]+(?= [\d.]+%)/g).map(Number);
    assert.ok(Math.max(...values('default-effects', ':root')) <= 1, 'effects overshoot');
    assert.ok(Math.max(...values('fast-spatial', '[motion=expressive]')) > 1.05, 'expressive fast spatial does not overshoot');
    assert.match(css, /--md-sys-motion-spring-slow-effects-duration:\s*\d+ms/);
  });
});

describe('Reduced motion tokens', () => {
  test('every motion duration token, scale step and spring alike, is zeroed under reduced motion', () => {
    const declared = new Set([...css.matchAll(/(--md-sys-motion-(?:duration-[\w-]+|spring-[\w-]+-duration)):\s*(?!0s)/g)].map((m) => m[1]));
    const block = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)', css.indexOf('--md-sys-motion-duration-short1: 0s')));
    const zeroed = new Set([...block.matchAll(/(--md-sys-motion-[\w-]+):\s*0s/g)].map((m) => m[1]));
    assert.ok(declared.size >= 22, `found ${declared.size} duration tokens`);
    assert.deepEqual([...declared].filter((token) => !zeroed.has(token)), []);
  });
});
