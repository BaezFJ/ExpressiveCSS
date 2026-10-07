import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { compile, compileString } from 'sass';
import { JSDOM } from 'jsdom';
import { fixtures, consumerBuild, sizes, root } from './fixtures/selective-builds.mjs';

test('modular imports are inert and share the legacy ESM constructors', async () => {
  const dom = new JSDOM('<input type="range"><div class="chips"><span class="chip">Chip<button class="close">Close</button></span></div>');
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const prototype = dom.window.EventTarget.prototype;
  const add = prototype.addEventListener;
  let listeners = 0;
  try {
    await new Promise(resolve => dom.window.addEventListener('load', resolve, { once: true }));
    globalThis.document = dom.window.document;
    prototype.addEventListener = function (...args) { listeners++; return add.apply(this, args); };
    const before = document.body.innerHTML;
    const modular = await import('../dist/js/modular.mjs');
    assert.equal(listeners, 0);
    assert.equal(document.body.innerHTML, before);
    assert.equal(document.querySelector('input').Expressive_Slider, undefined);
    delete globalThis.document;
    const legacy = await import('../dist/js/expressive.mjs');
    assert.deepEqual(Object.keys(modular), Object.keys(legacy));
    for (const key of Object.keys(modular)) assert.equal(modular[key], legacy[key], key);
  } finally {
    prototype.addEventListener = add;
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
    dom.window.close();
  }
});

test('selective consumer builds remove unused components and reduce transfers', async t => {
  const report = {};
  for (const name of Object.keys(fixtures)) {
    const full = await consumerBuild(name, false);
    const selective = await consumerBuild(name, true);
    for (const asset of ['js', 'css']) {
      for (const encoding of ['raw', 'gzip', 'brotli']) {
        assert.ok(selective.sizes[asset][encoding] < full.sizes[asset][encoding], `${name} ${asset} ${encoding}`);
      }
    }
    assert.doesNotMatch(selective.js, /Expressive_Timepicker|Expressive_NavigationDrawer/);
    if (name === 'tabs') assert.doesNotMatch(selective.js, /Expressive_Datepicker|Expressive_FormSelect/);
    assert.match(selective.js, name === 'tabs' ? /Expressive_Carousel/ : /Expressive_Menu/);
    report[name] = { full: full.sizes, selective: selective.sizes };
  }
  mkdirSync(`${root}/.cache/selective-builds`, { recursive: true });
  writeFileSync(`${root}/.cache/selective-builds/sizes.json`, JSON.stringify(report, null, 2));
  t.diagnostic(JSON.stringify(report));
});

test('default custom Sass matches the complete stylesheet and preserves configuration', () => {
  const options = { style: 'compressed', loadPaths: [`${root}/src/sass`], logger: { warn() {} } };
  const full = compile(`${root}/src/sass/expressive.scss`, options).css;
  assert.equal(compile(`${root}/src/sass/custom.scss`, options).css, full);
  const empty = compileString('@use "custom" with ($components: (), $utilities: (), $expressive-include-fonts: false);', options).css;
  assert.match(empty, /@layer tokens,\s*base,\s*components,\s*utilities/);
  assert.match(empty, /:host/);
  assert.match(empty, /--md-sys-color-primary:/);
  assert.doesNotMatch(empty, /@font-face|\.datepicker|\.tabs/);
  assert.doesNotMatch(empty, /\.scroll-area/);
  const scrollArea = compileString('@use "custom" with ($components: (), $utilities: ("scroll-area"), $expressive-include-fonts: false);', options).css;
  assert.match(scrollArea, /\.scroll-area\{overflow:auto;scrollbar-width:thin/);
  assert.doesNotMatch(scrollArea, /\.datepicker|\.tabs|\.overflow-x-auto/);
  const fonts = compileString('@use "custom" with ($components: (), $utilities: (), $expressive-font-path: "/assets/fonts");', options).css;
  assert.match(fonts, /url\("?\/assets\/fonts\/material-symbols-outlined.woff2/);
  assert.throws(() => compileString('@use "custom" with ($components: ("missing-component",));', options), /Can't find stylesheet/);
  assert.match(full, /@container style\(--expressive-glass: ?true\)/);
  assert.doesNotMatch(full, /not style\(--expressive-glass/);
  const glass = compileString('@use "custom" with ($components: ("menu"), $utilities: (), $expressive-include-fonts: false, $expressive-glass: true, $expressive-glass-blur: 24px);', options).css;
  assert.match(glass, /@container not style\(--expressive-glass: ?false\)/);
  assert.match(glass, /backdrop-filter:blur\(var\(--expressive-glass-blur, ?24px\)\)/);
  assert.match(glass, /color-mix\(in oklab, ?var\(--md-comp-menu-container-color\) var\(--expressive-glass-opacity, ?72%\), ?transparent\)/);
  assert.match(glass, /@media ?\(prefers-reduced-transparency: ?reduce\), ?\(prefers-contrast: ?more\)/);
  assert.throws(() => compileString('@use "custom" with ($components: ("menu"), $utilities: (), $expressive-glass: true, $expressive-glass-opacity: 0.7);', options), /must be a percentage/);
});

test('complete minified artifacts stay within the reviewed gzip budgets', () => {
  const js = readFileSync(`${root}/dist/js/expressive.min.js`, 'utf8').replace(/^\/\/# sourceMappingURL=.*\n?/m, '');
  const css = readFileSync(`${root}/dist/css/expressive.min.css`, 'utf8').replace(/\/\*# sourceMappingURL=.*?\*\//, '').trimEnd();
  // Reviewed TypeScript roadmap and cross-browser fixes: 45,117 gzip bytes (+475).
  assert.ok(sizes(js).gzip <= 45119, `JavaScript gzip: ${sizes(js).gzip}`);
  // Reviewed accordion, data table, avatar, skeleton and empty state: 50,062 gzip bytes (+387).
  assert.ok(sizes(css).gzip <= 50062, `CSS gzip: ${sizes(css).gzip}`);
});
