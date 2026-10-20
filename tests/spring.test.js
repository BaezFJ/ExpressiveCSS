import { test } from 'node:test';
import assert from 'node:assert/strict';
import { springPath } from '../src/ts/core/spring.ts';

// M3's standard default spatial spring and its effects spring.
const spatial = { damping: 0.9, stiffness: 700 };
const effects = { damping: 1, stiffness: 1600 };

test('a runtime spring runs from where it is and settles on its target', () => {
  const path = springPath(120, 0, 0, spatial);
  assert.equal(path[0], 120);
  assert.equal(path.at(-1), 0);
  assert.ok(path.length > 5 && path.length < 60, `settles in under a second at 60fps: ${path.length} frames`);
  assert.ok(Math.min(...path) < 0, 'an underdamped spring overshoots a little');
  assert.ok(Math.min(...springPath(120, 0, 0, effects)) >= 0, 'a critically damped one does not');
});

test('a runtime spring carries the speed it was released with', () => {
  const rest = springPath(120, 0, 0, spatial);
  const toward = springPath(120, 0, -2, spatial);
  const away = springPath(120, 0, 2, spatial);
  assert.ok(toward[1] < rest[1], `released toward the target it gets there sooner: ${toward[1]} vs ${rest[1]}`);
  assert.ok(away[1] > 120, `released away it carries on outwards first: ${away[1]}`);
  assert.equal(away.at(-1), 0);
});
