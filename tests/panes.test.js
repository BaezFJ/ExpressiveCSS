// Panes (Material 3 Canonical Adaptive Layouts) CSS test.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('Panes CSS', () => {
  test('emits canonical layout tokens', () => {
    assert.match(css, /--md-comp-pane-gap:\s*24px/);
    assert.match(css, /--md-comp-pane-list-width:\s*360px/);
    assert.match(css, /--md-comp-pane-supporting-width:\s*360px/);
    assert.match(css, /container-type:\s*inline-size/);
  });

  test('single-pane on compact, dual-pane on >= 840px', () => {
    assert.match(css, /@media\s*\(width\s*>=\s*840px\)/);
    assert.match(css, /@container\s*\(min-width:\s*840px\)/);
  });

  test('uses 16dp compact margins and 24dp wider margins', () => {
    assert.match(css, /--md-comp-pane-margin:\s*16px/);
    assert.match(
      css,
      /width:\s*calc\(100%\s*-\s*2\s*\*\s*var\(--md-comp-pane-margin\)\)/
    );
    assert.match(css, /margin:\s*0 var\(--md-comp-pane-margin\)/);
    assert.match(css, /@media\s*\(width\s*>=\s*600px\)[\s\S]*?--md-comp-pane-margin:\s*24px/);
    assert.match(css, /@container\s*\(width\s*>=\s*600px\)[\s\S]*?gap:\s*var\(--md-comp-pane-gap\)/);
  });

  test('container decisions follow viewport fallbacks and are inherited by pane children', () => {
    const start = css.indexOf('--md-comp-pane-gap: 24px');
    assert.ok(css.indexOf('@container (width < 840px)', start) > css.indexOf('@media (width >= 1200px)', start));
    assert.match(css, /display:\s*var\(--_pane-display\)/);
    assert.match(css, /border-inline-end:\s*var\(--_pane-divider\) solid/);
  });

  test('supporting pane and equal layout variants', () => {
    assert.match(css, /\.supporting-pane-layout/);
    assert.match(css, /\.panes\.supporting/);
    assert.match(css, /\.panes\.equal/);
  });

  test('separated / floating appearance with rounded shapes and gap', () => {
    assert.match(css, /\.panes\.separated/);
    assert.match(css, /--md-comp-pane-container-shape:\s*16px/);
  });
});
