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

  test('vibrant maps to primary-container', () => {
    assert.match(css, /nav\.toolbar\.vibrant/);
    assert.match(
      css,
      /nav\.toolbar\.vibrant[\s\S]*?--md-sys-color-primary-container/
    );
  });

  test('docked is full width, square, no elevation', () => {
    assert.match(css, /nav\.toolbar\.docked/);
    assert.match(
      css,
      /nav\.toolbar\.docked[\s\S]*?--md-comp-toolbar-container-shape:\s*0/
    );
  });

  test('a group sits the bar next to a companion FAB', () => {
    assert.match(css, /\.toolbar-group\s*\{/);
  });
});
