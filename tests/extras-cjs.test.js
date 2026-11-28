// extras.cjs requires core's CommonJS bundle and builds on its `core` export.
// Kept apart from setup.js, which loads the ESM core: one core per process.
import './extras.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version } = JSON.parse(readFileSync(new URL('../extras/package.json', import.meta.url), 'utf8'));

test('extras.cjs shares the CommonJS core instead of bundling a copy', () => {
  const core = require('../dist/js/expressive.cjs').core;
  const extras = require('../extras/dist/js/extras.cjs');
  assert.equal(extras.version, version);
  assert.ok(extras.LineChart.prototype instanceof core.Component);
  assert.throws(() => core.AutoInit.register('LineChart', { component: extras.LineChart, selector: '.line-chart' }), /already has/);
  assert.doesNotMatch(readFileSync(new URL('../extras/dist/js/extras.cjs', import.meta.url), 'utf8'), /class Component\b|function AutoInit\b/);
});
