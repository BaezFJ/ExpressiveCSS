// Pack real artifacts and exercise them outside this checkout.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, writeFileSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { compile, NodePackageImporter } from 'sass';

const root = fileURLToPath(new URL('..', import.meta.url));
const packages = { framework: '.', mcp: 'mcp/expressivecss', extras: 'extras' };
const selected = process.argv.slice(2);
assert.ok(selected.every((name) => Object.hasOwn(packages, name)), 'Use framework, mcp and/or extras');
const temporary = mkdtempSync(join(tmpdir(), 'expressivecss-packages-'));
function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: 'inherit', timeout: 300_000 });
}
/** Packs the package in `cwd` into `destination` and returns the tarball's path. */
function pack(cwd, destination) {
  const before = new Set(readdirSync(destination));
  run('npm', ['pack', '--pack-destination', destination], cwd);
  const created = readdirSync(destination).filter((file) => file.endsWith('.tgz') && !before.has(file));
  assert.equal(created.length, 1);
  return join(destination, created[0]);
}
const tarballs = {};
try {
  for (const name of selected.length ? selected : Object.keys(packages)) {
    const cwd = resolve(root, packages[name]);
    const target = join(temporary, name);
    mkdirSync(target);
    // The framework's prepack builds extras too, and extras installs beside its peer.
    if (name === 'extras') tarballs.framework ??= pack(root, target);
    tarballs[name] = pack(cwd, target);
    // No symlink back to the checkout, and no consumer lifecycle scripts.
    run('npm', ['init', '-y'], target);
    const peer = name === 'extras' ? ['--strict-peer-deps', tarballs.framework] : [];
    run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarballs[name], ...peer], target);
    const manifest = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
    const installed = join(target, 'node_modules', manifest.name);
    assert.ok(readFileSync(join(installed, 'LICENSE'), 'utf8').includes('Permission is hereby granted'));
    if (name === 'mcp') {
      // With several bins, `npx <package>` runs only the one named after the unscoped package.
      assert.equal(manifest.bin[manifest.name.split('/').pop()], 'server.js', 'npx cannot pick the server bin');
      for (const file of ['component-guides.json', 'semantics-data.json', 'component-decisions.json', 'contract.json']) {
        assert.ok(existsSync(join(installed, file)), `Missing ${file}`);
      }
      run('node', [join(installed, 'smoke.mjs')], target);
    } else if (name === 'extras') {
      // Versioned on its own: the strict peer install above fails unless this range includes the checkout's core.
      assert.ok(manifest.peerDependencies?.['@expressivecss/expressive'], 'Extras must declare its core peer');
      for (const file of ['dist/types/index.d.ts', 'dist/types/modular.d.ts', 'dist/js/extras.mjs', 'dist/js/modular.mjs',
        'dist/js/extras.js', 'dist/js/extras.min.js', 'dist/css/extras.css', 'dist/css/extras.min.css',
        'src/sass/extras.scss', 'README.md', 'CHANGELOG.md']) {
        assert.ok(readFileSync(join(installed, file)).length, `Missing or empty ${file}`);
      }
      // Extras reuses the installed core and never ships a copy of it.
      for (const file of readdirSync(join(installed, 'dist/js'), { recursive: true }).filter((file) => /\.m?js$/.test(file))) {
        assert.doesNotMatch(readFileSync(join(installed, 'dist/js', file), 'utf8'), /class Component\b|function AutoInit\b/, file);
      }
      writeFileSync(join(target, 'consumer.mjs'), `import * as extras from '${manifest.name}';\nimport * as modular from '${manifest.name}/modular';\nimport assert from 'node:assert/strict';\nassert.equal(extras.version, '${manifest.version}');\nassert.equal(modular.version, extras.version);\n`);
      run('node', ['consumer.mjs'], target);
      const coreSass = join(target, 'node_modules/@expressivecss/expressive/src/sass');
      assert.doesNotMatch(compile(join(installed, 'src/sass/extras.scss'), { loadPaths: [coreSass] }).css, /--md-sys-[\w-]+\s*:/);
      const dom = new JSDOM('<!doctype html><html><body></body></html>', {
        url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true,
      });
      try {
        dom.window.eval(readFileSync(join(target, 'node_modules/@expressivecss/expressive/dist/js/expressive.min.js'), 'utf8'));
        dom.window.eval(readFileSync(join(installed, 'dist/js/extras.min.js'), 'utf8'));
        assert.equal(dom.window.ExpressiveExtras.version, manifest.version);
      } finally {
        dom.window.close();
      }
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
      for (const file of ['index.html', 'app.mts', 'app.scss']) {
        copyFileSync(join(root, 'tests/fixtures/migration-consumer', file), join(target, file));
      }
      const usedArgs = ['exec', '--offline', '--', 'expressive-build', 'index.html'];
      run('npm', usedArgs, target);
      run('npm', [...usedArgs, '--check'], target);
      const usedCSS = readFileSync(join(target, 'public/expressive/css/expressive.css'), 'utf8');
      assert.match(usedCSS, /\.button-group/);
      assert.ok(!usedCSS.includes('.datepicker-container{'));
      // Exercise a consumer pinned to a different esbuild minor than the framework.
      run('npm', ['install', '--save-dev', '--save-exact', '--strict-peer-deps', '--ignore-scripts', '--no-audit', '--no-fund', 'esbuild@0.27.4'], target);
      writeFileSync(join(target, 'ui.mjs'), `export { Tabs } from '${manifest.name}/modular';\n`);
      const entryArgs = [...usedArgs, '--entry', 'ui.mjs'];
      run('npm', entryArgs, target);
      run('npm', [...entryArgs, '--check'], target);
      const usedJS = readFileSync(join(target, 'public/expressive/js/app.js'), 'utf8');
      assert.match(usedJS, /Expressive_Tabs/);
      assert.doesNotMatch(usedJS, /Expressive_Datepicker/);
      const custom = compile(join(target, 'app.scss'), {
        importers: [new NodePackageImporter(target)],
      }).css;
      for (const selector of ['.button-group', '.navigation-rail', '.toolbar', '.snackbar', '.fab-menu']) {
        assert.ok(custom.includes(selector), `Missing ${selector}`);
      }
      for (const selector of ['.banner', '.bottom-app-bar', '.navigation-drawer', '.segmented-button', '.fixed-action-btn']) {
        assert.ok(!custom.includes(selector), `Unexpected ${selector}`);
      }
      writeFileSync(join(target, 'consumer.mjs'), `import * as modular from '${manifest.name}/modular';\nimport * as framework from '${manifest.name}';\nimport assert from 'node:assert/strict';\nfor (const name of ['ButtonGroup', 'FloatingActionButton', 'NavigationRail', 'Snackbar']) assert.equal(modular[name], framework[name]);\nfor (const name of ['Banner', 'NavigationDrawer', 'Sidenav']) assert.equal(name in modular, false);\nassert.equal(modular.version, '${manifest.version}');\n`);
      run('node', ['consumer.mjs'], target);
      run(join(root, 'node_modules/.bin/tsc'), ['--noEmit', '--module', 'esnext', '--moduleResolution', 'bundler', '--target', 'es2020', 'app.mts'], target);
      const dom = new JSDOM(readFileSync(join(target, 'index.html'), 'utf8'), {
        url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true,
      });
      const instances = [];
      try {
        dom.window.matchMedia = (query) => ({
          matches: false, media: query, onchange: null, addListener() {}, removeListener() {},
          addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
        });
        dom.window.eval(readFileSync(join(installed, 'dist/js/expressive.min.js'), 'utf8'));
        assert.equal(dom.window.Expressive.version, manifest.version);
        dom.window.Expressive.AutoInit();
        const { ButtonGroup, FloatingActionButton, NavigationRail } = dom.window.Expressive;
        const group = dom.window.document.querySelector('.button-group');
        const rail = dom.window.document.querySelector('.navigation-rail');
        const fab = dom.window.document.querySelector('.fab-menu');
        instances.push(ButtonGroup.getInstance(group), NavigationRail.getInstance(rail), FloatingActionButton.getInstance(fab));
        instances.forEach((instance) => assert.ok(instance));
        group.querySelectorAll('button')[1].click();
        assert.equal(group.querySelectorAll('button')[1].getAttribute('aria-pressed'), 'true');
        rail.querySelector('button').click();
        assert.equal(rail.classList.contains('expanded'), true);
        fab.querySelector(':scope > button').click();
        assert.equal(fab.classList.contains('active'), true);
      } finally {
        instances.forEach((instance) => instance?.destroy());
        dom.window.close();
      }
    }
    console.log(`Verified isolated ${manifest.name}@${manifest.version}`);
  }
} finally { rmSync(temporary, { recursive: true, force: true }); }
