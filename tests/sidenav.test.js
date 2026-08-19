// CSS for sidenav nested sections. Native <details>/<summary> is the
// dropdown; the retired Collapsible component must not leak back in.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('Sidenav nested sections', () => {
  test('styles summary as a destination row with an expand_more chevron', () => {
    assert.match(css, /\.sidenav[\s\S]*summary[\s\S]*expand_more/);
    assert.match(css, /details\[open\]\s*>\s*summary::after/);
  });

  test('does not emit the retired .collapsible component', () => {
    assert.doesNotMatch(css, /\.collapsible\s*\{/);
    assert.doesNotMatch(css, /\.collapsible-header/);
    assert.doesNotMatch(css, /--md-comp-collapsible-/);
  });
});
