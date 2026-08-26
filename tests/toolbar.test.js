// M3 Expressive toolbar: two shapes (floating, docked) x two color styles
// (standard, vibrant), plus the companion FAB. Values come from the 34.0.21
// token sets md.comp.toolbar.{standard,vibrant,docked,floating,floating.fab}.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

const rules = [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)];

// The host stopped being an element when a toolbar stopped claiming to be a
// <nav>: it is `:is(nav.toolbar, .toolbar:not(.fixed-action-btn))` now. These
// assert what the selector has to reach and has to miss, not how it is
// spelled - a literal-text regex broke the moment the host was widened.
const ruleWith = (...needles) =>
  rules.find((m) => needles.every((n) => m[1].includes(n)));

describe('Toolbar CSS', () => {
  test('the bar is 64dp with 48dp actions and a 24dp icon', () => {
    assert.match(css, /--md-comp-toolbar-container-height:\s*64px/);
    assert.match(css, /--md-comp-toolbar-action-size:\s*48px/);
    assert.match(css, /--md-comp-toolbar-icon-size:\s*24px/);
  });

  test('standard is surface-container with on-surface-variant content', () => {
    assert.match(
      css,
      /--md-comp-toolbar-container-color:\s*var\(--md-sys-color-surface-container\)/
    );
    assert.match(css, /--md-comp-toolbar-color:\s*var\(--md-sys-color-on-surface-variant\)/);
    assert.match(
      css,
      /--md-comp-toolbar-selected-container-color:\s*var\(--md-sys-color-secondary-container\)/
    );
  });

  // Each default arm is its own class OR the absence of the other side, so a
  // bar that names nothing still lands on it and a bar that spells it out is a
  // class a grep of the sheet finds - the rule docs/ is held to.
  test('floating is the default shape, and .floating is in the sheet', () => {
    const rule = ruleWith('.toolbar', ':not(.docked');
    assert.ok(rule, 'no floating-scoped rule');
    assert.match(rule[1], /\.floating/, '.floating must be a spelling of it');
    assert.match(rule[2], /--md-comp-toolbar-container-shape:\s*32px/);
    assert.match(rule[2], /--md-comp-toolbar-leading-space:\s*8px/);
    // md.comp.toolbar.floating.container.elevation is level3, not level2.
    assert.match(rule[2], /box-shadow:\s*0 8px 17px 2px/);
  });

  test('docked is full width, square, no lift, 16dp insets', () => {
    const rule = ruleWith('.toolbar', ':is(.docked');
    assert.ok(rule, 'no .toolbar.docked rule');
    assert.match(rule[2], /--md-comp-toolbar-container-shape:\s*0/);
    assert.match(rule[2], /--md-comp-toolbar-leading-space:\s*16px/);
    assert.match(rule[2], /box-shadow:\s*none/);
    assert.match(rule[1], /\.max/, '.max stays the alias');
  });

  test('.standard is in the sheet too', () => {
    const rule = ruleWith('.toolbar', ':not(.vibrant');
    assert.ok(rule, 'no standard-scoped rule');
    assert.match(rule[1], /\.standard/, '.standard must be a spelling of it');
  });

  test('vibrant is primary-container, and leaves [vibrant] to the foundation', () => {
    const rule = ruleWith('.toolbar', ':is(.vibrant');
    assert.ok(rule, 'no .toolbar.vibrant rule');
    assert.match(rule[2], /--md-comp-toolbar-container-color:\s*var\(--md-sys-color-primary-container\)/);
    assert.match(rule[2], /--md-comp-toolbar-color:\s*var\(--md-sys-color-on-primary-container\)/);
    // md.comp.toolbar.vibrant.selected.button.container.color is
    // surface-container - not `surface`, which this once used.
    assert.match(
      rule[2],
      /--md-comp-toolbar-selected-container-color:\s*var\(--md-sys-color-surface-container\)/
    );
    // Not [vibrant]: that attribute is the emphasis foundation, whose ramp is
    // tertiary. Matching it here would render one variant two ways.
    assert.doesNotMatch(rule[1], /\[vibrant\]/, 'the attribute belongs to the foundation');
    assert.doesNotMatch(rule[1], /\.fixed-action-btn(?!\))/, 'must miss the FAB transition');
  });

  test('the companion FAB takes md.comp.toolbar.floating.fab colors', () => {
    const standard = rules.find((m) => m[1].trim() === '.toolbar-group');
    assert.ok(standard, 'no .toolbar-group rule');
    assert.match(
      standard[2],
      /--md-comp-toolbar-floating-fab-container-color:\s*var\(--md-sys-color-secondary-container\)/
    );

    const fab = ruleWith('.toolbar-group > .extra');
    assert.ok(fab, 'no companion FAB rule');
    assert.match(fab[2], /var\(--md-comp-toolbar-floating-fab-container-color\)/);
    // The bar beside it is level 3; md.comp.toolbar.floating.fab is level 1.
    assert.match(fab[2], /box-shadow:\s*0 2px 2px 0/);

    const vibrant = ruleWith('.toolbar-group:has(', '.extra');
    assert.ok(vibrant, 'no vibrant companion FAB rule');
    assert.match(vibrant[2], /var\(--md-sys-color-tertiary-container\)/);
  });
});
