// CSS-only Navigation bar. Assert the compiled sheet emits both layouts
// and that the app bar selectors skip this class.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('Navigation bar', () => {
  test('emits .navigation-bar and the horizontal variant', () => {
    assert.match(css, /\.navigation-bar\s*\{/);
    assert.match(css, /\.navigation-bar\.horizontal\s*\{/);
  });

  test('selected destinations use a secondary-container pill', () => {
    assert.match(
      css,
      /--md-comp-nav-bar-active-indicator-color:\s*var\(--md-sys-color-secondary-container\)/
    );
    assert.match(css, /\.navigation-bar\s*>\s*:is\(a,\s*button\)\.active/);
  });

  test('the top app bar does not claim nav.navigation-bar', () => {
    assert.match(css, /header:has\(>\s*nav:not\(\.navigation-bar/);
    assert.match(css, /nav:not\(\.tabs,\s*\.navigation-bar/);
  });

  test('the retired bottom app bar is not in the sheet', () => {
    assert.doesNotMatch(css, /--md-comp-bottom-app-bar/);
    assert.doesNotMatch(css, /footer:has\(>\s*nav:only-child/);
  });
});
