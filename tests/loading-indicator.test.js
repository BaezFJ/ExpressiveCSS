// Loading indicator. The morph is `clip-path` keyframes, and clip-path only
// interpolates between polygons with the same vertex count - so the one thing
// worth asserting is that every shape `_petal-shape()` generates has 24 points.
// Get that wrong and the animation silently snaps between shapes instead of
// morphing, which no colour or size assertion would catch.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

const morph = css.slice(css.indexOf('@keyframes loading-indicator-morph'));
const shapes = [...morph.matchAll(/clip-path: polygon\(([^)]*)\);/g)]
  .map((m) => m[1].split(',').map((p) => p.trim().split(/\s+/).map(parseFloat)))
  .slice(0, 5);

describe('Loading indicator', () => {
  test('every morph shape is 24 points, so clip-path interpolates', () => {
    assert.equal(shapes.length, 5, 'five keyframes: circle plus four cookies');
    for (const s of shapes) assert.equal(s.length, 24);
  });

  test('each shape is a closed curve inside its box', () => {
    for (const s of shapes) {
      for (const [x, y] of s) {
        assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100, `${x} ${y} escapes the box`);
      }
      // Every cookie touches the box on at least one axis, or `depth` has run
      // away and the shape no longer fills the 38dp it reserves.
      assert.ok(s.some(([x]) => x >= 99.9), 'no vertex reaches the edge');
    }
  });

  test('38dp indicator in a 48dp container, primary on nothing', () => {
    assert.match(css, /--md-comp-loading-indicator-active-indicator-size:\s*38px/);
    assert.match(css, /--md-comp-loading-indicator-container-size:\s*48px/);
    assert.match(css, /--md-comp-loading-indicator-active-indicator-color:\s*var\(--md-sys-color-primary\)/);
    assert.match(css, /--md-comp-loading-indicator-container-color:\s*transparent/);
  });

  test('contained is the secondary-container pair', () => {
    const block = css.slice(css.indexOf('.loading-indicator.contained'));
    assert.match(block, /^[^}]*--md-comp-loading-indicator-container-color:\s*var\(--md-sys-color-secondary-container\)/);
    assert.match(block, /^[^}]*--md-comp-loading-indicator-active-indicator-color:\s*var\(--md-sys-color-on-secondary-container\)/);
  });

  test('reduced motion stops both animations', () => {
    const q = css.indexOf('@media (prefers-reduced-motion: reduce)', css.indexOf('.loading-indicator'));
    const rm = css.slice(css.indexOf('.loading-indicator::before', q));
    assert.match(rm, /^[^}]*animation:\s*none/);
  });
});
