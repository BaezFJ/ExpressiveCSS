// CSS-only List. Assert the compiled sheet actually emits the two
// variants and the selected fill — a missing @forward or a token typo
// would otherwise ship a silent no-op.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('List', () => {
  test('emits .list and the segmented variant', () => {
    assert.match(css, /\.list\s*\{/);
    assert.match(css, /\.list\.segmented\s*\{/);
  });

  test('selected rows use secondary-container', () => {
    assert.match(css, /--md-comp-list-selected-container-color:\s*var\(--md-sys-color-secondary-container\)/);
    assert.match(css, /\.list\s*>\s*li\.active/);
    assert.match(css, /\[aria-selected=?["']?true["']?\]/);
  });

  test('standard items are pills; segmented items are 20px tiles with a gap', () => {
    assert.match(css, /--md-comp-list-item-shape:\s*100px/);
    assert.match(
      css,
      /\.list\.segmented\s*\{[^}]*--md-comp-list-item-shape:\s*20px/s
    );
    assert.match(css, /--md-comp-list-segmented-gap:\s*2px/);
  });

  test('does not emit the retired .collection component', () => {
    assert.doesNotMatch(css, /\.collection\s*\{/);
    assert.doesNotMatch(css, /\.collection-item/);
  });
});
