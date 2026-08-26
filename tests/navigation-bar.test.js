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
    // The bar host is now :is(nav:not(...), .bar) - a bar with no destinations
    // is a .bar div rather than an empty <nav> landmark. What must not change
    // is that neither selector reaches nav.navigation-bar or nav.tabs.
    assert.match(css, /header:has\(>\s*:is\(nav:not\(\.navigation-bar,\s*\.navigation-rail\),\s*\.bar\)\)/);
    assert.match(css, /:is\(nav:not\(\.tabs,\s*\.navigation-bar,\s*\.navigation-rail\),\s*\.bar\)/);
    // .bar must never escape its compound and become a top-level selector.
    assert.doesNotMatch(css, /^\.bar\s*[,{]/m);
  });

  // The bottom app bar came back in 1.x as `.bottom-app-bar` (#35). What was
  // retired is the *element-driven* host: keying it on `footer:has(> nav)`
  // made a row of commands a navigation landmark and left it one markup slip
  // from this component. `tests/bottom-app-bar.test.js` owns the rest.
  test('the bottom app bar is a class, and never this one', () => {
    assert.doesNotMatch(css, /footer:has\(>\s*nav:only-child/);
    assert.match(css, /\.bottom-app-bar\s*\{/);
    assert.doesNotMatch(css, /\.bottom-app-bar[^{,]*\.navigation-bar/);
  });
});
