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
  const fonts = compileString('@use "custom" with ($components: (), $utilities: (), $expressive-font-path: "/assets/fonts");', options).css;
  assert.match(fonts, /url\("?\/assets\/fonts\/material-symbols-outlined.woff2/);
  assert.throws(() => compileString('@use "custom" with ($components: ("missing-component",));', options), /Can't find stylesheet/);
});

test('complete minified artifacts stay within the reviewed gzip budgets', () => {
  const js = readFileSync(`${root}/dist/js/expressive.min.js`, 'utf8').replace(/^\/\/# sourceMappingURL=.*\n?/m, '');
  const css = readFileSync(`${root}/dist/css/expressive.min.css`, 'utf8').replace(/\/\*# sourceMappingURL=.*?\*\//, '').trimEnd();
  assert.ok(sizes(js).gzip <= 41863, `JavaScript gzip: ${sizes(js).gzip}`);
  assert.ok(sizes(css).gzip <= 49675, `CSS gzip: ${sizes(css).gzip}`);
});
