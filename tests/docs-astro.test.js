// The Astro documentation pages, checked against the catalogue they are built
// from and against the Jinja chrome they were converted out of.
//
// Both generators are present until the cutover (ADR 0003), so the chrome
// exists twice and the two copies can drift; and a page can disagree with the
// catalogue about where it publishes without anything failing, because Astro
// derives a route from a filename and never consults the catalogue for it.
//
// Source-level on purpose: `astro build` is the wrong seam for these, and a
// build inside `node --test` would cost more than everything else here
// together.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

// Node strips the types; nothing compiles these files for the test run.
const { PAGES } = await import('../docs/src/data/nav.ts');

const pages = readdirSync(new URL('docs/src/pages/', root))
  .filter((f) => f.endsWith('.astro'))
  .map((file) => ({ file, src: read(`docs/src/pages/${file}`) }));

/** The route Astro publishes a page file at, given `build.format: 'file'`. */
const publishedAt = (file) =>
  file === 'index.astro' ? '/' : `/${file.replace(/\.astro$/, '')}.html`;

/** The catalogue id the page hands its layout. */
const pageId = (src) => src.match(/<DocsLayout\s+page="([^"]+)"/)?.[1];

/** The section ids a page declares, in declaration order. */
function declaredSections(src) {
  const list = src.match(/defineSections\(\[([\s\S]*?)\]\)/);
  if (!list) return [];
  return [...list[1].matchAll(/\bid:\s*"([^"]+)"/g)].map((m) => m[1]);
}

/** The section ids a page renders, in render order. */
const renderedSections = (src) =>
  [...src.matchAll(/<Section\s+\{\.\.\.S(?:\.(\w+)|\["([^"]+)"\])\}/g)].map((m) => m[1] ?? m[2]);

describe('the Astro documentation pages', () => {
  test('there are pages to check', () => {
    // A directory read that quietly returned nothing would pass every test below.
    assert.ok(pages.length > 0, 'no pages found under docs/src/pages/');
  });

  test('each one publishes at the route the catalogue gives it', () => {
    for (const { file, src } of pages) {
      const id = pageId(src);
      assert.ok(id, `${file}: does not name a catalogue page`);
      const entry = PAGES.find((p) => p.id === id);
      assert.ok(entry, `${file}: "${id}" is not in the catalogue`);
      // The landing page is the one page whose published route Astro changes:
      // the site root is canonical and the catalogue route becomes an alias.
      const expected = id === 'index' ? '/' : entry.route;
      assert.equal(publishedAt(file), expected, `${file}: publishes at the wrong route`);
    }
  });

  test('every section it declares is rendered, and every section it renders is declared', () => {
    // The table of contents is generated from the declarations, so a section
    // declared and never rendered is an entry linking to no anchor, and one
    // rendered from a key that is not declared spreads nothing at all.
    for (const { file, src } of pages) {
      const declared = declaredSections(src);
      assert.ok(declared.length, `${file}: declares no sections`);
      assert.deepEqual(renderedSections(src), declared, `${file}: sections and table of contents disagree`);
    }
  });
});

describe('the Astro chrome, while the Jinja chrome is still beside it', () => {
  const section = read('docs/src/components/Section.astro');
  const banner = read('docs/src/components/Banner.astro');
  const base = read('docs/src/layouts/BaseLayout.astro');
  const pageMacro = read('docs/templates/macros/page.html');

  test('gives a section the same hooks and heading roles as the macro', () => {
    assert.match(section, /class="section scrollspy docs-section"/);
    assert.match(section, /docs-section-title \$\{role\}/);
    assert.match(read('docs/src/components/PageBody.astro'), /docs-page-content/);

    const roles = (src, re) => Object.fromEntries([...src.matchAll(re)].map((m) => [m[1], m[2]]));
    const astro = roles(section, /(h[234]):\s*"([\w-]+)"/g);
    assert.equal(Object.keys(astro).length, 3, 'the heading-role map was not parsed');
    assert.deepEqual(astro, roles(pageMacro, /'(h[234])':\s*'([\w-]+)'/g));
  });

  test('gives the banner the same display and headline roles as the macro', () => {
    assert.match(banner, /docs-page-title display-large on-primary-container-text/);
    assert.match(banner, /docs-page-description headline-small on-primary-container-text/);
  });

  test('versions the docs stylesheet so typography updates are not served stale', () => {
    assert.match(base, /\/static\/docs\.css\?v=\$\{version\}/);
  });
});
