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
    // Paired with :host per adr/0002 - see tests/shadow-dom.test.js.
    assert.match(
      css,
      /:root\[theme=(['"]?)auto\1\],\s*:host\(\[theme=(['"]?)auto\2\]\)\s*\{\s*color-scheme:\s*light dark/
    );
  });
});

// The vibrant emphasis axis. It is a foundation, not a component variant: one
// subtree remap of the surface family, which every component already reads
// through var(). The three things that can break it are all textual, so the
// compiled sheet is where they are visible.
describe('Vibrant emphasis', () => {
  // The rule opens a selector LIST - [vibrant] and :host([vibrant]) - so match
  // past the rest of it. Anchored to the line start so `menu[id][vibrant]`
  // further down the sheet cannot stand in for the token rule.
  const block = (sel) =>
    css.match(new RegExp(`^\\s*\\[${sel}\\][^{]*\\{([^}]*)\\}`, 'm'))?.[1];

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

  test('it leaves every accent and outline role alone', () => {
    // The remap is a surface change and nothing else. Pointing an accent role
    // at the container erases every component whose own fill is that container
    // - a tonal button, a FAB, .toolbar.vibrant - and deriving outline from
    // the text color turns 40 borders, checkboxes and switches among them,
    // translucent.
    const rule = block('vibrant');
    for (const role of [
      'primary', 'secondary', 'tertiary', 'error',
      'primary-container', 'secondary-container', 'tertiary-container',
      'outline', 'outline-variant', 'surface-tint',
      'inverse-surface', 'inverse-on-surface', 'scrim',
    ]) {
      assert.doesNotMatch(
        rule,
        new RegExp(`--md-sys-color-${role}:`),
        `[vibrant] remaps --md-sys-color-${role}, which is not a surface role`
      );
    }
  });

  test('it points at live roles, so a runtime theme switch follows', () => {
    // Naming a -light / -dark pair would resolve the scheme at this point
    // instead of at the point of use, freezing the subtree to one theme.
    assert.doesNotMatch(block('vibrant'), /-(light|dark)\)/);
  });

  test('a shadow-DOM host can carry it', () => {
    // A sheet loaded inside a shadow root cannot reach its own host with a
    // descendant selector, so <my-panel vibrant> would leave the shadow tree
    // neutral. Same reason tokens/_theme.scss carries :host.
    assert.match(css, /:host\(\[vibrant\]\)\s*\{/);
  });

  test('a menu on a vibrant surface keeps a visible selected item', () => {
    // The collision this exists to catch: menu-surface fills a selected item
    // with tertiary-container, which is the very colour [vibrant] paints the
    // menu itself, so selection vanished into its own menu. M3's menus-vibrant
    // moves selection to solid tertiary.
    const rule = css.match(
      /menu\[id\]\.vibrant[^{]*\{([^}]*)\}/
    )?.[1];
    assert.ok(rule, 'no vibrant menu rule in the sheet');
    assert.match(
      rule,
      /--md-comp-menu-item-selected-container-color:\s*var\(--md-sys-color-tertiary\)/,
      'a vibrant menu still fills its selected item with the container colour'
    );
    assert.match(
      css,
      /menu\[id\]\.vibrant,\s*menu\[id\]\[vibrant\],\s*\[vibrant\] menu\[id\]/,
      'the vibrant menu mapping does not reach a menu inside a [vibrant] subtree'
    );
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
