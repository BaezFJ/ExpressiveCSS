// M3 Expressive toolbar: floating vs docked, standard vs vibrant.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('Toolbar CSS', () => {
  test('floating uses surface-container, 64dp, 32dp stadium', () => {
    assert.match(
      css,
      /--md-comp-toolbar-container-color:\s*var\(--md-sys-color-surface-container\)/
    );
    assert.match(css, /--md-comp-toolbar-container-height:\s*64px/);
    assert.match(css, /--md-comp-toolbar-container-shape:\s*32px/);
    assert.match(css, /--md-comp-toolbar-action-size:\s*48px/);
  });

  // The host stopped being an element when a toolbar stopped claiming to be a
  // <nav>: it is `:is(nav.toolbar, .toolbar:not(.fixed-action-btn))` now. These
  // assert what the selector has to reach and has to miss, not how it is
  // spelled - a literal-text regex broke the moment the host was widened.
  const hostFor = (variant) =>
    [...css.matchAll(/([^{}]*)\{([^}]*)\}/g)].find(
      (m) => m[1].includes(`.toolbar`) && m[1].includes(`.${variant}`)
    );

  test('vibrant maps to primary-container', () => {
    const rule = hostFor('vibrant');
    assert.ok(rule, 'no .toolbar.vibrant rule');
    assert.match(rule[2], /--md-sys-color-primary-container/);
    assert.doesNotMatch(rule[1], /\.fixed-action-btn(?!\))/, 'must miss the FAB transition');
  });

  test('docked is full width, square, no elevation', () => {
    const rule = hostFor('docked');
    assert.ok(rule, 'no .toolbar.docked rule');
    assert.match(rule[2], /--md-comp-toolbar-container-shape:\s*0/);
  });

  test('a group sits the bar next to a companion FAB', () => {
    assert.match(css, /\.toolbar-group\s*\{/);
  });
});
