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
  ['attributes after a JSX arrow function', 'view.tsx', 'const volume = <input onChange={() => save()} type="range" />;', ['input[type=range]']],
  ['class literals after a JS comment', 'view.tsx', "// don't retain 'p-5'\nconst view = <div className={wide ? 'p-2' : 'p-3'} />;", ['.p-2{', '.p-3{']],
  ['a dynamically imported API', 'ui.mjs', 'const { Snackbar: Notice } = await import("@expressivecss/expressive/modular"); new Notice({text: "Saved"});', ['.snackbar{']],
  ['a dynamic import in a template script', 'view.vue', '<script setup lang="ts">const ui = await import("@expressivecss/expressive/modular"); const notice = ui.Snackbar;</script>', ['.snackbar{']],
  ['template scripts with attributed end tags', 'page.html', [
    '<script type="module" data-label="a > b">',
    'const label = "</script-preview>";',
    'const { Snackbar } = await import("@expressivecss/expressive/modular");',
    'new Snackbar({ text: label });',
    '</ScRiPt\t\n bar><main class="p-2"></main>',
    '<script type="module">',
    'const { BottomSheets } = await import("@expressivecss/expressive/modular");',
    'BottomSheets.Init();',
    '</script/>',
  ].join('\n'), ['.snackbar{', '.p-2{', 'dialog.bottom-sheet']],
  ['an image constructed by JavaScript', 'image.js', 'const img = new Image(); img.className = "responsive-img"; document.body.append(img);', ['img.responsive-img', 'img.responsive-img:not(.circle)']],
  ['a utility passed to a JSX component', 'photo.tsx', 'const photo = <Photo className="responsive-img" />;', ['img.responsive-img:not(.circle)']],
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

test('explicit symlink inputs are scanned and protected from output collisions', t => {
  const app = consumer(t);
  mkdirSync(join(app, 'views'));
  writeFileSync(join(app, 'views/page.html'), '<article class="p-2"></article>');
  symlinkSync(join(app, 'views'), join(app, 'shared-views'), 'junction');
  symlinkSync(join(app, 'views/page.html'), join(app, 'shared.html'));
  succeeds(cli(app, 'shared-views'));
  assert.ok(readFileSync(join(app, 'public/expressive/css/expressive.css'), 'utf8').includes('.p-2{'));
  succeeds(cli(app, 'shared.html', '--check'));

  mkdirSync(join(app, 'public/js'));
  const authored = 'export const original = "hand-written";';
  writeFileSync(join(app, 'public/js/app.js'), authored);
  symlinkSync(join(app, 'public/js/app.js'), join(app, 'shared.js'));
  writeFileSync(join(app, 'boot.js'), 'export const ready = true;');
  for (const flags of [['--check'], []]) {
    const result = cli(app, 'shared.js', '--entry', 'boot.js', '--out-dir', 'public', ...flags);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /input.*output|overwrite.*input/i);
    assert.equal(readFileSync(join(app, 'shared.js'), 'utf8'), authored);
    assert.ok(!existsSync(join(app, 'public/fonts')));
  }
});

test('a bundled view keeps class-helper keys from its original source', async t => {
  const app = consumer(t);
  writeFileSync(join(app, 'page.html'), '<main></main>');
  writeFileSync(join(app, 'ui.js'), 'export { layout } from "./view.js";');
  writeFileSync(join(app, 'view.js'), `function clsx(classes) { return Object.keys(classes).filter(key => classes[key]).join(' '); }
    export const layout = expanded => clsx({accordion: expanded});`);
  succeeds(cli(app, 'page.html', '--entry', 'ui.js'));
  const output = join(app, 'public/expressive');
  assert.equal((await import(pathToFileURL(join(output, 'js/app.js')))).layout(true), 'accordion');
  assert.ok(readFileSync(join(output, 'css/expressive.css'), 'utf8').includes('.accordion{'));
});

test('a separately loaded module keeps the APIs it uses alongside a bundled entry', t => {
  const app = consumer(t);
  writeFileSync(join(app, 'page.html'), '<script type="module" src="./notices.js"></script>');
  writeFileSync(join(app, 'notices.js'), 'import { Snackbar as Notice, SideSheets } from "@expressivecss/expressive/modular"; new Notice({text:"Saved"});');
  writeFileSync(join(app, 'boot.js'), 'export const ready = true;');
  succeeds(cli(app, 'page.html', 'notices.js', '--entry', 'boot.js'));
  const css = readFileSync(join(app, 'public/expressive/css/expressive.css'), 'utf8');
  assert.ok(css.includes('.snackbar{'));
  assert.ok(!css.includes('dialog.side-sheet'));
});

test('a programmatic confirmation dialog retains its generated action button styles', t => {
  const app = consumer(t);
  writeFileSync(join(app, 'ui.js'), 'import { Dialogs } from "@expressivecss/expressive/modular"; export const ask = () => Dialogs.confirm({text:"Continue?"});');
  for (const args of [['ui.js'], ['--entry', 'ui.js']]) {
    succeeds(cli(app, ...args));
    const css = readFileSync(join(app, 'public/expressive/css/expressive.css'), 'utf8');
    assert.ok(css.includes('--md-comp-filled-button-container-shape:'));
    assert.ok(!css.includes('.accordion{'));
  }
});

test('hashbang bundles report as stale and are removed on a CSS-only build', t => {
  const app = consumer(t);
  writeFileSync(join(app, 'page.html'), '<main></main>');
  writeFileSync(join(app, 'boot.js'), '#!/usr/bin/env node\nexport const ready = true;');
  const output = join(app, 'public/expressive/js/app.js');
  succeeds(cli(app, 'page.html', '--entry', 'boot.js'));
  assert.ok(readFileSync(output, 'utf8').startsWith('#!'));
  const check = cli(app, 'page.html', '--check');
  assert.equal(check.status, 1);
  assert.match(check.stderr, /app\.js/);
  assert.ok(existsSync(output));
  succeeds(cli(app, 'page.html'));
  assert.ok(!existsSync(output));
  writeFileSync(output, '#!/usr/bin/env node\nconsole.log("authored");');
  succeeds(cli(app, 'page.html', '--check'));
  assert.ok(existsSync(output));
});

test('static module-relative URLs resolve from the built entry and track asset changes', async t => {
  const app = consumer(t);
  mkdirSync(join(app, 'src'));
  writeFileSync(join(app, 'index.html'), '<main></main>');
  writeFileSync(join(app, 'boot.js'), 'export * from "./src/photo.ts";');
  const source = join(app, 'src/mark one.svg');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"/>';
  writeFileSync(source, svg);
  writeFileSync(join(app, 'src/photo.ts'), [
    '// new URL("./missing.svg", import.meta.url)',
    'export const logo: URL = new URL("./mark%20one.svg?v=2#icon", import.meta.url);',
    'export const server = new URL("/static.svg", import.meta.url);',
    'export const text = "new URL(\'./ignored.svg\', import.meta.url)";',
    'export const custom = (URL: any) => new URL("./custom", import.meta.url);',
  ].join('\n'));
  const args = ['index.html', '--entry', 'boot.js'];
  succeeds(cli(app, ...args));
  const output = join(app, 'public/expressive');
  const js = join(output, 'js/app.js');
  const { logo, server, custom } = await import(pathToFileURL(js));
  assert.equal(logo.search + logo.hash, '?v=2#icon');
  assert.equal(server.pathname, '/static.svg');
  assert.equal(custom(class { constructor(path) { this.path = path; } }).path, './custom');
  const copy = fileURLToPath(logo);
  assert.ok(copy.startsWith(output), copy);
  assert.equal(readFileSync(copy, 'utf8'), svg);
  succeeds(cli(app, ...args, '--check'));
  writeFileSync(source, '<svg/>');
  assert.equal(cli(app, ...args, '--check').status, 1);
  assert.equal(readFileSync(copy, 'utf8'), svg);
  succeeds(cli(app, ...args));
  succeeds(cli(app, ...args, '--check'));
  const updated = (await import(pathToFileURL(js).href + '?rebuilt')).logo;
  assert.equal(readFileSync(updated, 'utf8'), '<svg/>');
  if (updated.pathname !== logo.pathname) assert.ok(!existsSync(copy));
  writeFileSync(join(output, 'assets/keep.txt'), 'authored');
  succeeds(cli(app, 'index.html'));
  assert.ok(!existsSync(fileURLToPath(updated)));
  assert.equal(readFileSync(join(output, 'assets/keep.txt'), 'utf8'), 'authored');
});

test('an edited asset inventory cannot remove an unrelated application file', t => {
  const app = consumer(t);
  writeFileSync(join(app, 'page.html'), '<main></main>');
  writeFileSync(join(app, 'ui.js'), 'export const icon = new URL("./mark.svg", import.meta.url);');
  writeFileSync(join(app, 'mark.svg'), '<svg/>');
  succeeds(cli(app, 'page.html', '--entry', 'ui.js'));
  const output = join(app, 'public/expressive');
  writeFileSync(join(output, 'keep.txt'), 'authored');
  const manifest = join(output, 'assets/expressive-build.json');
  writeFileSync(manifest, JSON.stringify({ generatedBy: 'expressive-build', assets: ['assets/../keep.txt'] }));
  assert.equal(cli(app, 'page.html').status, 1);
  assert.equal(readFileSync(join(output, 'keep.txt'), 'utf8'), 'authored');
  assert.ok(existsSync(join(output, 'js/app.js')));
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

function withExtras(app) {
  symlinkSync(join(root, 'extras'), join(app, 'node_modules/@expressivecss/extras'), 'junction');
  return app;
}

test('installed extras get their own selective stylesheet, chosen before core', t => {
  const app = withExtras(consumer(t));
  writeFileSync(join(app, 'index.html'), '<div class="kpi"></div><nav class="tabs"></nav>');
  writeFileSync(join(app, 'ui.ts'), `import '@expressivecss/extras/css';
    import { Menubar } from '@expressivecss/extras/modular';
    export const bar = Menubar;`);
  succeeds(cli(app, '--entry', 'ui.ts'));
  const extras = readFileSync(join(app, 'public/expressive/css/extras.css'), 'utf8');
  const core = readFileSync(join(app, 'public/expressive/css/expressive.css'), 'utf8');
  assert.doesNotThrow(() => postcss.parse(extras));
  for (const rule of ['@layer tokens', '.kpi{', '.menubar{']) assert.ok(extras.includes(rule), rule);
  for (const rule of ['.marquee', '.sankey-chart', '.countdown']) assert.ok(!extras.includes(rule), rule);
  // Menubar builds core menus, so core keeps the menu styles; extras classes stay out of core.
  assert.match(core, /\.menu\b/);
  assert.ok(!core.includes('.kpi'));
  assert.doesNotMatch(readFileSync(join(app, 'public/expressive/js/app.js'), 'utf8'), /\.kpi\{/);
});

test('extras APIs used through the global or a separate import keep their styles', t => {
  const app = withExtras(consumer(t));
  writeFileSync(join(app, 'page.js'), 'window.ExpressiveExtras.LineChart.init(document.querySelector("figure"));');
  writeFileSync(join(app, 'other.mjs'), 'import { Confetti } from "@expressivecss/extras"; Confetti.init(document.body);');
  succeeds(cli(app));
  const extras = readFileSync(join(app, 'public/expressive/css/extras.css'), 'utf8');
  assert.ok(extras.includes('.line-chart'), 'global API');
  assert.ok(extras.includes('.confetti'), 'imported API');
  assert.ok(!extras.includes('.sankey-chart'));
});

test('--include reaches extras partials, and css/extras.css goes when extras is not installed', t => {
  const app = consumer(t);
  writeFileSync(join(app, 'index.html'), '<nav class="tabs"></nav>');
  const unknown = cli(app, '--include', 'components/marquee');
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /Unknown component partial: components\/marquee/);
  withExtras(app);
  succeeds(cli(app, '--include', 'components/marquee'));
  const extrasPath = join(app, 'public/expressive/css/extras.css');
  assert.ok(readFileSync(extrasPath, 'utf8').includes('.marquee'));
  rmSync(join(app, 'node_modules/@expressivecss/extras'));
  succeeds(cli(app));
  assert.ok(!existsSync(extrasPath));
});
