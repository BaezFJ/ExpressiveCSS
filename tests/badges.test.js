// M3 Expressive Badge. Small is an empty 6dp dot; large is a 16dp
// stadium with error / on-error as the default mapping.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('Badge', () => {
  test('default mapping is error / on-error', () => {
    assert.match(css, /--md-comp-badge-color:\s*var\(--md-sys-color-error\)/);
    assert.match(css, /--md-comp-badge-label-text-color:\s*var\(--md-sys-color-on-error\)/);
  });

  test('large is 16dp; small empty is 6dp', () => {
    assert.match(css, /--md-comp-badge-large-size:\s*16px/);
    assert.match(css, /--md-comp-badge-small-size:\s*6px/);
    assert.match(css, /badge:empty\s*\{/);
  });

  test('mirrors anchored icon badge transform in RTL', () => {
    assert.match(css, /transform:\s*translate\(-50%,\s*-50%\)/);
  });

  test('does not emit the Materialize caption suffix', () => {
    assert.doesNotMatch(css, /content:\s*" new"/);
    assert.doesNotMatch(css, /data-badge-caption/);
  });
});
