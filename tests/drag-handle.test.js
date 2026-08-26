// Drag handles: the M3 token block, and the two things about this component
// that are easy to get wrong and invisible when you do.
//
// First, `md.comp.drag-handle` is the *vertical* handle - a 4x48dp bar - while
// the bottom sheet's grabber is a different component entirely
// (`md.comp.sheet-bottom.docked.drag-handle`, a horizontal 32x4dp bar). One
// class serves both hosts, so the sheet has to suppress the vertical bar this
// partial draws in ::before or it prints across the sheet's own.
//
// Second, the interactive states key off `button`, and that is only correct
// because semantics.json holds every other element to aria-hidden. If the
// states ever widened to `.drag-handle`, a decorative handle would light up
// under a pointer merely crossing it.

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

describe('Drag handle tokens', () => {
  // md.comp.drag-handle.*, DSP 34.0.21. corner.full is 9999px and
  // corner.medium is 12px, the same spellings the rest of the sheet uses.
  const TOKENS = {
    'container-width': '24px',
    width: '4px',
    height: '48px',
    shape: '9999px',
    color: 'var(--md-sys-color-outline)',
    'pressed-width': '12px',
    'pressed-height': '52px',
    'pressed-shape': '12px',
    'pressed-color': 'var(--md-sys-color-on-surface)',
    'state-layer-color': 'var(--md-sys-color-inverse-on-surface)'
  };

  const handle = ruleFor('.drag-handle');

  for (const [name, value] of Object.entries(TOKENS)) {
    test(`--md-comp-drag-handle-${name} is ${value}`, () => {
      assert.ok(handle, 'no .drag-handle rule in the sheet');
      assert.ok(
        handle.includes(`--md-comp-drag-handle-${name}: ${value};`),
        `expected ${name}: ${value}`
      );
    });
  }

  test('the container is sized to the pressed bar, so swelling it moves nothing', () => {
    assert.ok(handle, 'no .drag-handle rule in the sheet');
    assert.match(handle, /inline-size: var\(--md-comp-drag-handle-container-width\)/);
    assert.match(handle, /block-size: var\(--md-comp-drag-handle-pressed-height\)/);
  });

  test('the bar is the pseudo-element, not the box', () => {
    const bar = ruleFor('.drag-handle::before');
    assert.ok(bar, 'no .drag-handle::before rule in the sheet');
    assert.match(bar, /inline-size: var\(--md-comp-drag-handle-width\)/);
    assert.match(bar, /block-size: var\(--md-comp-drag-handle-height\)/);
    assert.match(bar, /background-color: var\(--md-comp-drag-handle-color\)/);
  });

  test('the transition is dropped under reduced motion', () => {
    assert.match(css, /prefers-reduced-motion: reduce\)\s*\{\s*\.drag-handle::before/);
  });
});

describe('Decorative and interactive are told apart by the element', () => {
  // The states must be reachable only through `button`. A decorative <span>
  // that lit up on hover would claim to be a control it is not.
  const stateSelectors = rules
    .filter((r) => /\.drag-handle/.test(r.selector))
    .filter((r) => /:hover|:focus-visible|:active/.test(r.selector))
    .map((r) => r.selector);

  test('there are interactive states at all', () => {
    assert.ok(stateSelectors.length, 'nothing gives the handle a hover, focus or pressed state');
  });

  test('every one of them is scoped to the button spelling', () => {
    for (const selector of stateSelectors) {
      assert.match(
        selector,
        /button\.drag-handle/,
        `${selector} would light up a decorative handle`
      );
    }
  });

  test('pressing swells the bar to the pressed geometry', () => {
    const pressed = ruleFor('button.drag-handle:active::before');
    assert.ok(pressed, 'no pressed rule in the sheet');
    assert.match(pressed, /inline-size: var\(--md-comp-drag-handle-pressed-width\)/);
    assert.match(pressed, /border-radius: var\(--md-comp-drag-handle-pressed-shape\)/);
    assert.match(pressed, /background-color: var\(--md-comp-drag-handle-pressed-color\)/);
  });
});

describe('It composes with the bottom sheet', () => {
  const sheetRules = rules.filter((r) => /dialog\.bottom-sheet/.test(r.selector));

  test('the sheet styles .drag-handle wherever it styles .handle', () => {
    const mentions = sheetRules.filter((r) => /\.handle(?![\w-])/.test(r.selector));
    assert.ok(mentions.length, 'the sheet no longer has a handle slot');

    for (const rule of mentions) {
      assert.match(
        rule.selector,
        /\.drag-handle/,
        `${rule.selector} reaches .handle but not the M3 name`
      );
    }
  });

  test('the sheet suppresses the vertical bar it would otherwise print across', () => {
    const suppressed = sheetRules.find((r) => /\.drag-handle::before/.test(r.selector));
    assert.ok(suppressed, 'the vertical bar is not suppressed inside a sheet');
    assert.match(suppressed.body, /content: none/);
  });

  test('an author-supplied handle still hides the sheet own ::before', () => {
    const guard = sheetRules.find((r) => /:has\(> :is\(\.handle, \.drag-handle\)\)/.test(r.selector));
    assert.ok(guard, 'the sheet would draw its grabber under the author own handle');
    assert.match(guard.body, /content: none/);
  });
});
