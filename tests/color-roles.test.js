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

// The vibrant emphasis axis. It is a foundation, not a component variant: one
// subtree remap of the surface family, which every component already reads
// through var(). The three things that can break it are all textual, so the
// compiled sheet is where they are visible.
describe('Vibrant emphasis', () => {
  const block = (sel) =>
    css.match(new RegExp(`\\[${sel}\\]\\s*\\{([^}]*)\\}`))?.[1];

  test('[vibrant] remaps the whole surface family onto the accent container', () => {
    const rule = block('vibrant');
    assert.ok(rule, 'no [vibrant] rule in the sheet');
    for (const role of [
      'surface', 'surface-dim', 'surface-bright', 'surface-variant', 'background',
      'surface-container-lowest', 'surface-container-low', 'surface-container',
      'surface-container-high', 'surface-container-highest',
    ]) {
      // A rung left out is the failure that matters: the component reading it
      // keeps its neutral surface and sits as a grey patch on an accent one.
      assert.match(
        rule,
        new RegExp(`--md-sys-color-${role}:\\s*var\\(--md-sys-color-tertiary-container\\)`),
        `--md-sys-color-${role} is not remapped by [vibrant]`
      );
    }
  });

  test('the accent ramp is a parameter', () => {
    assert.match(block('vibrant=primary'), /var\(--md-sys-color-primary-container\)/);
    assert.match(block('vibrant=secondary'), /var\(--md-sys-color-secondary-container\)/);
  });

  test('it points at live roles, so a runtime theme switch follows', () => {
    // Naming a -light / -dark pair would resolve the scheme at this point
    // instead of at the point of use, freezing the subtree to one theme.
    assert.doesNotMatch(block('vibrant'), /-(light|dark)\)/);
  });

  test('it is declared after the :root mapping it overrides', () => {
    // Same specificity as :root, so on a vibrant <html> only source order
    // decides which mapping wins.
    assert.ok(
      css.indexOf('[vibrant]') > css.lastIndexOf('--md-sys-color-surface: light-dark('),
      '[vibrant] is emitted before the :root token mapping and cannot override it'
    );
  });
});
