import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

const require = createRequire(resolve('package.json'));
const picomatch = require('picomatch');

test('development installs resolve every picomatch copy to the vendored patch', () => {
  const lock = JSON.parse(readFileSync(resolve('package-lock.json'), 'utf8'));
  const copies = Object.entries(lock.packages).filter(([name]) => name === 'vendor/picomatch' || name.endsWith('node_modules/picomatch'));
  assert.ok(copies.some(([name]) => name === 'vendor/picomatch'));
  for (const [name, pkg] of copies) {
    if (pkg.link === true) {
      assert.equal(pkg.resolved, 'vendor/picomatch', name);
      continue;
    }
    assert.equal(pkg.version, '4.0.8', name);
  }
  assert.deepEqual(
    Object.entries(lock.packages).filter(([, pkg]) => typeof pkg.resolved === 'string' && pkg.resolved.includes('/picomatch-')),
    [],
  );
  assert.equal(require('picomatch/package.json').version, '4.0.8');
});

test('backslash removal stays linear and keeps a finished character class', () => {
  const { removeBackslashes } = require('picomatch/lib/utils');
  const cases = [
    ['\\a', 'a'],
    ['\\\\', '\\'],
    ['a\\', 'a\\'],
    ['\\\n', '\\\n'],
    ['[a\\b]', '[a\\b]'],
    ['[\\\\]', '[]'],
    ['[a\\]', '[a]'],
    ['\\[abc]', '[abc]'],
    ['src/\\[id\\]/*.js', 'src/[id]/*.js'],
    ['[foo\\\n[a]', '[foo\\\n[a]'],
    ['a[\n]b\\c[d]', 'a[\n]bc[d]'],
  ];
  for (const [input, expected] of cases) {
    assert.equal(removeBackslashes(input), expected, JSON.stringify(input));
  }

  const brackets = '['.repeat(20000);
  const started = Date.now();
  assert.equal(removeBackslashes(brackets), brackets);
  assert.equal(removeBackslashes(`${brackets}a]`), `${brackets}a]`);
  assert.ok(Date.now() - started < 100, 'stripping a long run of [ stayed bounded');

  const scanned = picomatch.scan('src/\\[id\\]/*.js', { unescape: true });
  assert.equal(scanned.base, 'src/[id]');
  assert.equal(scanned.glob, '*.js');
});

test('repeated extglobs with a wildcard are literal and ordinary globs still match', () => {
  const started = Date.now();
  assert.equal(picomatch.isMatch('a'.repeat(28) + '!', '+(*a)'), false);
  assert.ok(Date.now() - started < 100, 'matching +(*a) stayed bounded');
  assert.equal(picomatch.makeRe('+(*a)').source, String.raw`^(?:\+\(\*a\))$`);
  assert.equal(picomatch.makeRe('+(*)').source, String.raw`^(?:\+\(\*\))$`);
  assert.equal(picomatch.isMatch('foo', '+(*)'), false);
  assert.equal(picomatch.isMatch('abcabc', '+(abc)'), true);
  assert.equal(picomatch.isMatch('ab', '+(abc)'), false);
  assert.equal(picomatch.isMatch('a.js', '*.js'), true);
  assert.equal(picomatch.isMatch('a.ts', '*.js'), false);
  assert.equal(picomatch.isMatch('src/a.js', '**/*.js'), true);
  assert.equal(picomatch.isMatch('file.ts', '!(*.d).ts'), true);
  assert.equal(picomatch.isMatch('file.d.ts', '!(*.d).ts'), false);
});
