// M3 Expressive vertical menu: 16dp surface, 4dp items, tertiary selected.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('Menu', () => {
  test('standard mapping is surface-container with tertiary selected', () => {
    assert.match(css, /--md-comp-menu-container-color:\s*var\(--md-sys-color-surface-container\)/);
    assert.match(
      css,
      /--md-comp-menu-item-selected-container-color:\s*var\(--md-sys-color-tertiary-container\)/
    );
    assert.match(
      css,
      /--md-comp-menu-item-selected-label-text-color:\s*var\(--md-sys-color-on-tertiary-container\)/
    );
  });

  test('vertical menu is 16dp with extra-small items and medium selected', () => {
    assert.match(css, /--md-comp-menu-container-shape:\s*16px/);
    assert.match(css, /--md-comp-menu-item-container-shape:\s*4px/);
    assert.match(css, /--md-comp-menu-item-selected-container-shape:\s*12px/);
    assert.match(css, /--md-comp-menu-item-container-height:\s*48px/);
  });

  test('icons are 20dp', () => {
    assert.match(css, /--md-comp-menu-item-icon-size:\s*20px/);
  });

  test('vibrant uses tertiary-container', () => {
    assert.match(
      css,
      /\.vibrant\s*\{[^}]*--md-comp-menu-container-color:\s*var\(--md-sys-color-tertiary-container\)/s
    );
  });

  test('dividers do not span the container', () => {
    assert.match(css, /menu\[id\][^}]*li\.divider[\s\S]*?width:\s*calc\(100% - 8px\)/);
  });
});
