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
