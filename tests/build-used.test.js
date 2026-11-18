import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import postcss from 'postcss';
import { selectedStyles } from '../cli/usage.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
function cli(cwd, ...args) {
  const result = spawnSync(process.execPath, [join(root, 'cli/expressive-build.mjs'), ...args], { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  return result;
}
function succeeds(result) { assert.equal(result.status, 0, result.stderr); }

function consumer(t) {
  const app = mkdtempSync(join(tmpdir(), 'expressive-used-'));
  t.after(() => rmSync(app, { recursive: true, force: true }));
  mkdirSync(join(app, 'node_modules/@expressivecss'), { recursive: true });
  symlinkSync(root, join(app, 'node_modules/@expressivecss/expressive'), 'junction');
  writeFileSync(join(app, 'package.json'), '{"type":"module"}');
  return app;
}

test('a consumer bundles its actual entry and retains matching component and utility styles', async () => {
  const app = mkdtempSync(join(tmpdir(), 'expressive-used-'));
  try {
    mkdirSync(join(app, 'node_modules/@expressivecss'), { recursive: true });
    symlinkSync(root, join(app, 'node_modules/@expressivecss/expressive'), 'junction');
    writeFileSync(join(app, 'package.json'), '{"type":"module"}');
    writeFileSync(join(app, 'index.html'), '<nav class="tabs primary"><a href="#first">First</a></nav>');
    writeFileSync(join(app, 'view.tsx'), 'export const View = () => <article className={dense ? "medium:gap-3" : "p-2"} />;');
    writeFileSync(join(app, 'ui.ts'), `import '@expressivecss/expressive/css/min';
      import { Tabs as Navigation, Datepicker } from '@expressivecss/expressive/modular';
      export const selected = Navigation;`);
    mkdirSync(join(app, 'dist'));
    writeFileSync(join(app, 'dist/old.html'), '<figure class="sankey-chart">Old output</figure>');
    const args = ['--entry', 'ui.ts', '--out-dir', 'assets/expressive'];
    const output = join(app, 'assets/expressive');
    succeeds(cli(app, ...args));
    const cssPath = join(output, 'css/expressive.css');
    const css = readFileSync(cssPath, 'utf8');
    assert.doesNotThrow(() => postcss.parse(css));
    for (const rule of ['@layer tokens', '.tabs{', '.medium\\:gap-3{', '.p-2{', '.primary{', ':where(article)']) {
      assert.ok(css.includes(rule), rule);
    }
    for (const rule of ['.sankey-chart-nodes{', '.medium\\:gap-4{', '.p-3{', '.accordion{', '.datepicker-container{']) {
      assert.ok(!css.includes(rule), rule);
    }
    for (const [, font] of css.matchAll(/url\(["']?(\.\.\/fonts\/[^"')]+)/g)) {
      assert.ok(existsSync(join(output, 'css', font)), font);
    }
    assert.ok(existsSync(join(output, 'fonts/LICENSE-material-symbols')));
    const jsPath = join(output, 'js/app.js');
    assert.equal((await import(pathToFileURL(jsPath))).selected.key, 'Expressive_Tabs');
    assert.doesNotMatch(readFileSync(jsPath, 'utf8'), /Expressive_Datepicker|Expressive_SankeyChart/);

    succeeds(cli(app, ...args, '--check'));
    writeFileSync(join(app, 'view.tsx'), 'export const View = () => <button className="medium:gap-4" />;');
    const stale = cli(app, ...args, '--check');
    assert.equal(stale.status, 1);
    assert.ok(stale.stderr.includes(join('css', 'expressive.css')), stale.stderr);
    assert.equal(readFileSync(cssPath, 'utf8'), css);
    succeeds(cli(app, ...args));
    const next = readFileSync(cssPath, 'utf8');
    assert.ok(next.includes('.medium\\:gap-4{'));
    assert.ok(!next.includes('.medium\\:gap-3{'));
    succeeds(cli(app, ...args, '--check'));
    writeFileSync(join(app, 'ui.ts'), 'invalid entry {');
    assert.equal(cli(app, ...args).status, 1);
    assert.equal(readFileSync(cssPath, 'utf8'), next);

    writeFileSync(join(output, 'keep.txt'), 'owned by the app');
    const cssOnly = ['index.html', '--out-dir', 'assets/expressive'];
    assert.ok(cli(app, ...cssOnly, '--check').stderr.includes(join('js', 'app.js')));
    assert.ok(existsSync(jsPath));
    succeeds(cli(app, ...cssOnly));
    assert.ok(!existsSync(jsPath));
    assert.equal(readFileSync(join(output, 'keep.txt'), 'utf8'), 'owned by the app');
  } finally { rmSync(app, { recursive: true, force: true }); }
});

test('CSS-only builds retain runtime-created picker UI and accept explicit dynamic classes and partials', () => {
  const app = mkdtempSync(join(tmpdir(), 'expressive-used-'));
  try {
    writeFileSync(join(app, 'page.html'), '<label>Date <input class="date-picker"></label>');
    const args = ['page.html', '--include', 'large:hide', '--include', 'components/accordion'];
    const output = join(app, 'public/expressive');
    assert.equal(cli(app, ...args, '--check').status, 1);
    assert.ok(!existsSync(output));
    succeeds(cli(app, ...args));
    const css = readFileSync(join(output, 'css/expressive.css'), 'utf8');
    for (const rule of ['.datepicker-container{', '.select-search-popup', '.month-prev', '.accordion{', '.large\\:hide{']) {
      assert.ok(css.includes(rule), rule);
    }
    assert.ok(!css.includes('.timepicker-container{'));
    assert.ok(!existsSync(join(output, 'js/app.js')));
    succeeds(cli(app, ...args, '--check'));
    assert.equal(cli(app, 'missing.html').status, 1);
    assert.equal(cli(app, 'page.html', '--include', 'components/typo').status, 1);
  } finally { rmSync(app, { recursive: true, force: true }); }
});

test('selecting every rule reproduces the shipped layers in order, including nested media queries', () => {
  const sheet = readFileSync(join(root, 'dist/css/expressive.min.css'), 'utf8').replace(/^\uFEFF/, '');
  const index = JSON.parse(readFileSync(join(root, 'dist/cli/styles.json'), 'utf8'));
  const tokens = new Set();
  function keep(rule) {
    if (rule.rules) rule.rules.forEach(keep);
    else rule.when.flat().forEach(token => tokens.add(token));
  }
  index.components.forEach(keep);
  index.utilities.forEach(keep);
  const { css } = selectedStyles(index, sheet, tokens, []);
  assert.equal(css.trimEnd(), sheet.split('/*# sourceMappingURL=')[0].trimEnd());
});

for (const [label, filename, source, rules, includes = []] of [
  ['Vue class bindings', 'view.vue', '<div :class="{accordion: open, \'medium:gap-3\': wide}"></div>', ['.accordion{', '.medium\\:gap-3{']],
  ['Astro class lists', 'view.astro', '<div class:list={[{accordion: count > 0, active: ready({count})}]} />', ['.accordion{']],
  ['class helper object keys', 'view.js', 'const classes = clsx({ active: ready(), accordion: open });', ['.accordion{']],
  ['JSX template literals', 'view.tsx', 'const view = <button className={`p-2${expanded ? " p-4" : ""}`} />', ['.p-2{', '.p-4{']],
  ['HTML character references', 'view.html', '<div class="p-2&#32;p-3&Tab;medium&colon;gap-2"></div><div class="p-5&nbsp;p-6 p-5&#44;p-6"></div>', ['.p-2{', '.p-3{', '.medium\\:gap-2{']],
  ['browser-global APIs', 'ui.js', 'new window.Expressive.Snackbar({ text: "Saved" });', ['.snackbar{']],
  ['CommonJS API references', 'ui.cjs', 'const { BottomSheets: Sheets } = require("@expressivecss/expressive"); Sheets.Init();', ['dialog.bottom-sheet']],
  ['explicit compound utilities', 'view.html', '<main id="cms"></main>', ['img.responsive-img'], ['--include', 'responsive-img']],
]) {
  test(`CSS-only builds retain styles for ${label}`, t => {
    const app = consumer(t);
    writeFileSync(join(app, filename), source);
    succeeds(cli(app, filename, ...includes));
    const css = readFileSync(join(app, 'public/expressive/css/expressive.css'), 'utf8');
    for (const rule of rules) assert.ok(css.includes(rule), `Missing ${rule}`);
    assert.ok(!css.includes('.p-5{'));
  });
}

test('a bundled transitive API retains its styles while unused imports are dropped', t => {
  const app = consumer(t);
  writeFileSync(join(app, 'page.html'), '<script>new window.Expressive.Snackbar({ text: "Saved" });</script>');
  writeFileSync(join(app, 'ui.ts'), 'export { start } from "./sheets";');
  writeFileSync(join(app, 'sheets.ts'), `import { BottomSheets as Sheets, SideSheets } from '@expressivecss/expressive/modular';
    export function start() { Sheets.Init(); }`);
  mkdirSync(join(app, 'views'));
  writeFileSync(join(app, 'views/unused.ts'), 'export { SideSheets } from "@expressivecss/expressive/modular";');
  succeeds(cli(app, 'page.html', 'views', '--entry', 'ui.ts'));
  const css = readFileSync(join(app, 'public/expressive/css/expressive.css'), 'utf8');
  assert.ok(css.includes('dialog.bottom-sheet'), 'Missing BottomSheets styles');
  assert.ok(!css.includes('dialog.side-sheet'), 'Unused SideSheets styles');
  assert.ok(css.includes('.snackbar{'), 'Missing styles for the inline script');
});

test('only --entry requires a usable esbuild from the consumer', t => {
  const app = consumer(t);
  const tool = join(app, 'node_modules/esbuild');
  mkdirSync(tool);
  writeFileSync(join(tool, 'package.json'), '{"name":"esbuild","version":"0.0.0","main":"index.cjs"}');
  writeFileSync(join(tool, 'index.cjs'), 'module.exports = {};');
  writeFileSync(join(app, 'page.html'), '<main></main>');
  writeFileSync(join(app, 'ui.js'), 'export const loaded = true;');
  succeeds(cli(app, 'page.html'));
  const result = cli(app, 'page.html', '--entry', 'ui.js');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /esbuild.*build\(\)/);
  assert.ok(!existsSync(join(app, 'public/expressive/js/app.js')));
});

test('the bundled CommonJS root retains styles for its document behaviors', t => {
  const app = consumer(t);
  writeFileSync(join(app, 'ui.cjs'), 'require("@expressivecss/expressive").BottomSheets.Init();');
  succeeds(cli(app, '--entry', 'ui.cjs'));
  const css = readFileSync(join(app, 'public/expressive/css/expressive.css'), 'utf8');
  assert.ok(css.includes('dialog.bottom-sheet'));
});

test('bundled application styles follow imports and participate in --check and cleanup', async t => {
  const app = consumer(t);
  const output = join(app, 'public/expressive');
  mkdirSync(join(app, 'styles'));
  writeFileSync(join(app, 'ui.js'), 'import "./styles/app.css"; export const loaded = true;');
  writeFileSync(join(app, 'styles/app.css'), '@import "@expressivecss/expressive/css"; @import "./brand.css"; .consumer { display: grid }');
  writeFileSync(join(app, 'styles/brand.css'), '.brand { background: url("./mark.svg") } .header { background: url("/static/header.png") }');
  writeFileSync(join(app, 'styles/mark.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  const args = ['ui.js', '--entry', 'ui.js'];
  succeeds(cli(app, ...args));
  assert.equal((await import(pathToFileURL(join(output, 'js/app.js')))).loaded, true);
  const appCSS = join(output, 'css/app.css');
  const css = readFileSync(appCSS, 'utf8');
  for (const expected of ['.consumer{', '.brand{', 'data:image/svg+xml', '/static/header.png']) assert.ok(css.includes(expected), expected);
  assert.ok(!css.includes('@layer tokens'), 'App CSS duplicated the framework');
  succeeds(cli(app, ...args, '--check'));
  writeFileSync(join(app, 'ui.js'), 'export const loaded = true;');
  const stale = cli(app, ...args, '--check');
  assert.equal(stale.status, 1);
  assert.ok(stale.stderr.includes(join('css', 'app.css')), stale.stderr);
  assert.equal(readFileSync(appCSS, 'utf8'), css);
  succeeds(cli(app, ...args));
  assert.ok(!existsSync(appCSS));
  writeFileSync(appCSS, '/* authored stylesheet */');
  succeeds(cli(app, ...args, '--check'));
  succeeds(cli(app, ...args));
  assert.equal(readFileSync(appCSS, 'utf8'), '/* authored stylesheet */');
});

for (const [name, contents] of [
  ['js/app.js', 'export const message = "authored source";'],
  ['css/expressive.css', '.authored { display: grid }'],
]) {
  test(`an imported ${name} is protected before any outputs are written`, t => {
    const app = consumer(t);
    mkdirSync(join(app, 'public', name.split('/')[0]), { recursive: true });
    const source = join(app, 'public', name);
    writeFileSync(source, contents);
    writeFileSync(join(app, 'helper.js'), `import "./public/${name}";`);
    writeFileSync(join(app, 'ui.js'), 'import "./helper.js";');
    for (const flags of [['--check'], []]) {
      const result = cli(app, 'ui.js', '--entry', 'ui.js', '--out-dir', 'public', ...flags);
      assert.equal(result.status, 1, result.stdout);
      assert.match(result.stderr, /overwrite.*input|input.*output/i);
      assert.equal(readFileSync(source, 'utf8'), contents);
      assert.ok(!existsSync(join(app, 'public/fonts')));
    }
  });
}
