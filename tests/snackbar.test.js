// M3 Expressive snackbar: inverse-surface bar at the bottom, not a modal.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('Snackbar', () => {
  test('uses the inverse-surface / inverse-primary mapping', () => {
    assert.match(css, /--md-comp-snackbar-container-color:\s*var\(--md-sys-color-inverse-surface\)/);
    assert.match(css, /--md-comp-snackbar-supporting-text-color:\s*var\(--md-sys-color-inverse-on-surface\)/);
    assert.match(css, /--md-comp-snackbar-action-label-text-color:\s*var\(--md-sys-color-inverse-primary\)/);
  });

  test('is a 48dp bar with extra-small corners', () => {
    assert.match(css, /--md-comp-snackbar-container-shape:\s*4px/);
    assert.match(css, /\.snackbar\s*\{[^}]*min-height:\s*48px/s);
  });

  test('the overlay does not capture page pointer events', () => {
    assert.match(css, /#snackbar-container\s*\{[^}]*pointer-events:\s*none/s);
  });
});
