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
