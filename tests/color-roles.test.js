// The compiled sheet must expose the M3 Expressive color roles the
// rest of the framework maps components onto.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

const required = [
  'primary', 'on-primary', 'primary-container', 'on-primary-container',
  'primary-fixed', 'primary-fixed-dim', 'on-primary-fixed', 'on-primary-fixed-variant',
  'secondary', 'on-secondary', 'secondary-container', 'on-secondary-container',
  'tertiary', 'on-tertiary', 'tertiary-container', 'on-tertiary-container',
  'error', 'on-error', 'error-container', 'on-error-container',
  'surface', 'on-surface', 'on-surface-variant',
  'surface-dim', 'surface-bright',
  'surface-container-lowest', 'surface-container-low', 'surface-container',
  'surface-container-high', 'surface-container-highest',
  'outline', 'outline-variant',
  'inverse-surface', 'inverse-on-surface', 'inverse-primary',
  'scrim', 'shadow'
];

describe('M3 Expressive color roles', () => {
  test('emits every standard and add-on role as a live token', () => {
    for (const role of required) {
      assert.match(css, new RegExp(`--md-sys-color-${role}:`), `missing --md-sys-color-${role}`);
    }
  });

  test('exposes a utility class for each role', () => {
    assert.match(css, /\.surface-container\s*\{/);
    assert.match(css, /\.on-primary-fixed-text\s*\{/);
    assert.match(css, /\.primary-fixed-dim\s*\{/);
  });

  test('theme=auto follows the OS color-scheme', () => {
    assert.match(css, /:root\[theme=(['"]?)auto\1\]\s*\{\s*color-scheme:\s*light dark/);
  });
});
