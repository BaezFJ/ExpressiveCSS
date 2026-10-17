import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { annotation } from '../scripts/lib/github-annotations.mjs';

const failure = (cause) => ({ error: { failureType: 'testCodeFailure', cause } });

test('a failing test becomes one escaped error annotation at its file and line', () => {
  const file = path.join(process.cwd(), 'tests/example.test.js');
  const expected = '::error file=tests/example.test.js,line=7,title=opens%2C then%3A closes::one is not%0Atwo 100%25\n';
  assert.equal(annotation({ name: 'opens, then: closes', file, line: 7, details: failure(new Error('one is not\ntwo 100%')) }), expected);
  assert.equal(annotation({ name: 'opens, then: closes', file: pathToFileURL(file).href, line: 7, details: failure(new Error('one is not\ntwo 100%')) }), expected);
});

test('a suite failing only because a child failed adds no annotation', () => {
  assert.equal(annotation({ name: 'suite', file: 'tests/a.test.js', line: 1, details: { error: { failureType: 'subtestsFailed' } } }), '');
});

test('a failure without a file or Error still names the test', () => {
  assert.equal(annotation({ name: 'hook', details: failure('timed out') }), '::error title=hook::timed out\n');
});
