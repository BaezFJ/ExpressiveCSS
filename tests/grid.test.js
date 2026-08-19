// 12-column grid + container measure. Widescreen / 4K is xxlarge (1601px):
// a .xxl prefix, a 1920px cap, and .wide / .max modifiers. Twelve columns
// stay twelve — the container grows instead of the track count.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('Grid CSS', () => {
  test('container width and max-width are tokens', () => {
    assert.match(css, /\.container\s*\{[^}]*--md-comp-container-max-width:\s*1280px/s);
    assert.match(css, /\.container\s*\{[^}]*--md-comp-container-width:\s*90%/s);
    assert.match(css, /max-width:\s*var\(--md-comp-container-max-width\)/);
    assert.match(css, /width:\s*var\(--md-comp-container-width\)/);
  });

  test('extra-large lifts the cap to 1920 and the measure to 75%', () => {
    assert.match(css, /@media\s*\(width\s*>=\s*1601px\)/);
    assert.match(
      css,
      /@media\s*\(width\s*>=\s*1601px\)\s*\{[^}]*--md-comp-container-max-width:\s*1920px/s
    );
    assert.match(
      css,
      /@media\s*\(width\s*>=\s*1601px\)\s*\{[^}]*--md-comp-container-width:\s*75%/s
    );
  });

  test('wide and max modifiers', () => {
    assert.match(css, /\.container\.wide\s*\{[^}]*--md-comp-container-max-width:\s*2400px/s);
    assert.match(css, /\.container\.max\s*\{[^}]*--md-comp-container-max-width:\s*none/s);
  });

  test('twelve columns, s through xxl', () => {
    assert.match(css, /\.row\s*\{[^}]*grid-template-columns:\s*repeat\(12,\s*1fr\)/s);
    assert.match(css, /\.s12\s*\{[^}]*grid-column:\s*auto\s*\/\s*span\s*12/s);
    assert.match(css, /\.xxl1\s*\{[^}]*grid-column:\s*auto\s*\/\s*span\s*1/s);
    assert.match(css, /\.xxl12\s*\{[^}]*grid-column:\s*auto\s*\/\s*span\s*12/s);
    assert.match(css, /\.offset-xxl1\s*\{[^}]*grid-column-start:\s*2/s);
    assert.match(css, /\.offset-xxl11\s*\{[^}]*grid-column-start:\s*12/s);
  });

  test('offsets start one past the skipped count', () => {
    assert.match(css, /\.offset-s1\s*\{[^}]*grid-column-start:\s*2/s);
    assert.match(css, /\.offset-s2\s*\{[^}]*grid-column-start:\s*3/s);
    assert.match(css, /\.offset-m1\s*\{[^}]*grid-column-start:\s*2/s);
  });

  test('gap grows at extra-large', () => {
    assert.match(css, /--gap-size:\s*1\.5rem/);
    assert.match(
      css,
      /@media\s*\(width\s*>=\s*1601px\)\s*\{[^}]*--gap-size:\s*2rem/s
    );
  });

  test('visibility helpers for extra-large', () => {
    assert.match(css, /\.hide-on-xxl-only/);
    assert.match(css, /\.show-on-xxl/);
  });
});
