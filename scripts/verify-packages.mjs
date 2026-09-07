// Pack real artifacts and exercise them outside this checkout.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { compile } from 'sass';

const root = fileURLToPath(new URL('..', import.meta.url));
const packages = { framework: '.', mcp: 'mcp/expressivecss' };
const selected = process.argv.slice(2);
assert.ok(selected.every((name) => Object.hasOwn(packages, name)), 'Use framework and/or mcp');
const temporary = mkdtempSync(join(tmpdir(), 'expressivecss-packages-'));
function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: 'inherit', timeout: 300_000 });
}
try {
  for (const name of selected.length ? selected : Object.keys(packages)) {
    const cwd = resolve(root, packages[name]);
    const target = join(temporary, name);
    mkdirSync(target);
    run('npm', ['pack', '--pack-destination', target], cwd);
    const tarballs = readdirSync(target).filter((file) => file.endsWith('.tgz'));
    assert.equal(tarballs.length, 1);
    // No symlink back to the checkout, and no consumer lifecycle scripts.
    run('npm', ['init', '-y'], target);
    run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', join(target, tarballs[0])], target);
    const manifest = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
    const installed = join(target, 'node_modules', manifest.name);
    assert.ok(readFileSync(join(installed, 'LICENSE'), 'utf8').includes('Permission is hereby granted'));
    if (name === 'mcp') {
      for (const file of ['component-guides.json', 'semantics-data.json', 'component-decisions.json', 'contract.json']) {
        assert.ok(existsSync(join(installed, file)), `Missing ${file}`);
      }
      run('node', [join(installed, 'smoke.mjs')], target);
    } else {
      const consumerRequire = createRequire(join(target, 'package.json'));
      assert.ok(consumerRequire.resolve(manifest.name).startsWith(installed));
      for (const file of ['dist/types/index.d.ts', 'dist/js/expressive.mjs', 'dist/js/expressive.cjs',
        'dist/js/expressive.js', 'dist/js/expressive.min.js', 'dist/css/expressive.css',
        'dist/css/expressive.min.css', 'src/sass/expressive.scss', 'README.md', 'CHANGELOG.md']) {
        assert.ok(readFileSync(join(installed, file)).length, `Missing or empty ${file}`);
      }
      const css = readFileSync(join(installed, 'dist/css/expressive.css'), 'utf8');
      for (const [, font] of css.matchAll(/url\(["']?(\.\.\/fonts\/[^"')]+)["']?\)/g)) {
        assert.ok(existsSync(resolve(installed, 'dist/css', font)), `Missing font ${font}`);
      }
      for (const font of ['material-symbols', 'roboto', 'noto-sans']) {
        assert.ok(readFileSync(join(installed, 'dist/fonts', `LICENSE-${font}`)).length);
      }
      const license = readFileSync(join(installed, 'LICENSE'), 'utf8');
      assert.match(license, /Materialize/);
      assert.match(license, /normalize.css/);
      assert.match(license, /Polymer/);
      assert.ok(compile(join(installed, 'src/sass/expressive.scss')).css.length);
      const dom = new JSDOM('<!doctype html><html><body></body></html>', {
        url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true,
      });
      try {
        dom.window.eval(readFileSync(join(installed, 'dist/js/expressive.min.js'), 'utf8'));
        assert.equal(dom.window.Expressive.version, manifest.version);
        assert.equal(typeof dom.window.Expressive.AutoInit, 'function');
        dom.window.Expressive.AutoInit();
      } finally { dom.window.close(); }
    }
    console.log(`Verified isolated ${manifest.name}@${manifest.version}`);
  }
} finally { rmSync(temporary, { recursive: true, force: true }); }
