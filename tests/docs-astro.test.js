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
//
// What that costs, stated rather than left to be discovered: the composed-page
// checks in semantics.test.js -- <main> nesting, and two landmarks on one page
// sharing a name -- read `website/`, which only the freeze writes. An Astro
// page is never in it and `_site/` is not committed, so those two questions go
// unasked for docs/src. They are the ones a fragment cannot answer, and the
// build-level verification issue #83 plans is the seam that answers them; until
// then the guard is that a converted page stays structurally identical to the
// frozen one, which is checked by hand.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

// Node strips the types; nothing compiles these files for the test run.
const { NAV, PAGES, ALIASES } = await import('../docs/src/data/nav.ts');
const { route, aliases } = await import('../docs/src/lib/catalogue.ts');
const { renderLlmsTxt } = await import('../docs/src/lib/llms.ts');
const pkg = JSON.parse(read('package.json'));

// The documentation pages. `[alias].astro` is the generated compatibility
// route and carries no content of its own; it is checked further down.
const pages = readdirSync(new URL('docs/src/pages/', root))
  .filter((f) => f.endsWith('.astro') && !f.startsWith('['))
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

/** The page with every `<Code code={`…`} />` sample cut out, so a sample's own markup is not read as the page's. */
const withoutSamples = (src) => src.replace(/code=\{`[\s\S]*?`\}/g, '');

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
  test("a page's own script stays where the page put it", () => {
    // Astro bundles a bare <script> and hoists it to <head> as a module, which
    // moves it out of <main> -- and <main> is what a converted page is compared
    // against, so the parity check this migration is verified by would be
    // comparing a page against one the script had left. Nothing fails at build
    // time; is:inline is the whole guard, and this is the guard on the guard.
    for (const { file, src } of pages) {
      for (const [tag] of withoutSamples(src).matchAll(/<script\b[^>]*>/g)) {
        assert.match(tag, /\bis:inline\b/, `${file}: ${tag} would be hoisted out of <main>`);
      }
    }
  });
});

describe('the Astro chrome, while the Jinja chrome is still beside it', () => {
  const section = read('docs/src/components/Section.astro');
  const banner = read('docs/src/components/Banner.astro');
  const base = read('docs/src/layouts/BaseLayout.astro');
  const pageMacro = read('docs/templates/macros/page.html');
  const navMacro = read('docs/templates/macros/nav.html');

  test('gives a section the same hooks and heading roles as the macro', () => {
    assert.match(section, /class="section scrollspy docs-section"/);
    assert.match(section, /docs-section-title \$\{role\}/);
    assert.match(read('docs/src/components/PageBody.astro'), /docs-page-content/);

    const roles = (src, re) => Object.fromEntries([...src.matchAll(re)].map((m) => [m[1], m[2]]));
    const astro = roles(section, /(h[234]):\s*"([\w-]+)"/g);
    assert.equal(Object.keys(astro).length, 3, 'the heading-role map was not parsed');
    assert.deepEqual(astro, roles(pageMacro, /'(h[234])':\s*'([\w-]+)'/g));
  });

  test('the one hand-rolled scaffold keeps the table-of-contents hooks PageBody states', () => {
    // floating-action-button.astro writes its own scaffold rather than going
    // through <PageBody>, because the Jinja page does and its content column
    // omits `docs-page-content` (see CLAUDE.md). That leaves a second copy of
    // the table-of-contents markup with nothing holding the two together:
    // renaming `toc-wrapper` or dropping the landmark name in PageBody would
    // leave this page silently the odd one out, and it looks like nothing.
    const pageBody = read('docs/src/components/PageBody.astro');
    const fab = read('docs/src/pages/floating-action-button.astro');
    for (const token of [
      'hide-on-small-only',
      'toc-wrapper mt-5',
      'aria-label="On this page"',
      'section table-of-contents',
    ]) {
      assert.ok(pageBody.includes(token), `PageBody.astro no longer states ${token}`);
      assert.ok(fab.includes(token), `floating-action-button.astro no longer states ${token}`);
    }
  });

  test('gives the banner the same display and headline roles as the macro', () => {
    assert.match(banner, /docs-page-title display-large on-primary-container-text/);
    assert.match(banner, /docs-page-description headline-small on-primary-container-text/);
  });

  test('versions the docs stylesheet so typography updates are not served stale', () => {
    assert.match(base, /\/static\/docs\.css\?v=\$\{version\}/);
  });

  test('the drawer and the footer keep the hooks and names the macro states', () => {
    // Both copies render from the same catalogue, which makes them the two most
    // able to drift and the least likely to look wrong while doing it: a
    // dropped `aria-current` or a renamed `#nav-mobile` changes nothing a
    // reader sees. The tokens below are the ones written verbatim on both
    // sides -- the drawer's own identity, the app bar trigger's target, the
    // exclusive-group name, the current-page state, and the footer's labelling
    // and version line.
    const shared = {
      'docs/src/components/NavigationDrawer.astro': [
        'aria-label="Main"',
        'navigation-drawer navigation-drawer-fixed',
        'id="nav-mobile"',
        'name="docs-nav"',
        'material-symbols',
        'aria-current',
        'active',
      ],
      'docs/src/components/Footer.astro': [
        'footer-',
        '&copy; 2026 ExpressiveCSS',
        '(prerelease)',
      ],
    };
    for (const [file, tokens] of Object.entries(shared)) {
      const astro = read(file);
      for (const token of tokens) {
        assert.ok(astro.includes(token), `${file} no longer states ${token}`);
        assert.ok(navMacro.includes(token), `macros/nav.html no longer states ${token}`);
      }
    }
  });
});

describe('the compatibility routes Astro publishes', () => {
  const alias = read('docs/src/pages/[alias].astro');
  const layout = read('docs/src/layouts/RedirectLayout.astro');
  const index = PAGES.find((p) => p.id === 'index');

  test('the landing page disowns the second URL a static host serves it at', () => {
    // `/` and `/index.html` are the same file on any static host, and no
    // redirect can separate them -- only a canonical link can. Astro hands out
    // the wrong one of the two by default: `Astro.url.pathname` is
    // `/index.html` for the index route under `build.format: 'file'`, so
    // BaseLayout normalises it, and that normalisation is the whole guard.
    const base = read('docs/src/layouts/BaseLayout.astro');
    assert.match(base, /<link rel="canonical" href=\{canonical\}>/);
    assert.match(base, /Astro\.url\.pathname\.replace\(\/\\\/index\\\.html\$\/, "\/"\)/);
  });

  test('the site root is canonical and the historic route redirects to it', () => {
    // The one page whose published route the generator changes. `/index.html`
    // stops being an alias in the same move -- `build.format: 'file'` writes
    // the root document there, so a redirect would point the root at itself.
    const found = aliases();
    assert.ok(
      found.some((a) => a.from === index.route && a.to === '/'),
      `${index.route} does not redirect to the site root`,
    );
    assert.ok(
      !found.some((a) => a.from === '/index.html'),
      '/index.html is the root document, not a redirect to it',
    );
  });

  test('every legacy route the Flask site redirects keeps redirecting', () => {
    // ALIASES is checked against docs/app.py by docs-nav-catalogue.test.js, so
    // this holds the Astro set to it rather than restating the six names.
    const published = new Map(aliases().map((a) => [a.from, a.to]));
    for (const { from, to } of ALIASES) {
      if (from === '/index.html') continue;
      assert.equal(published.get(from), to, `${from}: not published, or points elsewhere`);
    }
  });

  test('an alias is generated, not maintained', () => {
    // One layout and one dynamic route. Six hand-written redirect pages would
    // be six places for a canonical target to go stale.
    assert.match(alias, /getStaticPaths/);
    assert.match(alias, /aliases\(\)/);
    assert.equal(
      readdirSync(new URL('docs/src/pages/', root)).filter((f) => f.endsWith('.astro')).length,
      PAGES.length + 1,
      'a page file exists that is neither a catalogue page nor the alias route',
    );
  });

  test('a redirect declares its target and survives a reader with no scripting', () => {
    assert.match(layout, /<link rel="canonical" href=\{canonical\}>/);
    assert.match(layout, /http-equiv="refresh"/);
    // The query string and the fragment are the reader's, and the meta refresh
    // cannot carry either -- so the script has to come first in document order,
    // which is the whole of what decides which one moves the reader.
    assert.match(layout, /location\.search \+ location\.hash/);
    // The markup, not the frontmatter: the comment above it names both
    // mechanisms too, and would answer this question with prose.
    const markup = layout.slice(layout.indexOf('---', 3) + 3);
    assert.ok(
      markup.indexOf('location.replace(') < markup.indexOf('http-equiv="refresh"'),
      'the meta refresh is written above the script, so it may win and drop the query',
    );
    // An alias in history means Back from the target bounces forward again.
    assert.match(layout, /location\.replace\(/);
  });

  test('the custom domain is declared with the documentation source', () => {
    assert.equal(read('docs/public/CNAME').trim(), new URL(pkg.homepage).host);
    assert.match(read('docs/astro.config.mjs'), /site: 'https:\/\/www\.expressivecss\.com'/);
    // A repository subpath base would prefix every root-absolute URL on the
    // site with /ExpressiveCSS, which is not where any of them are.
    assert.ok(!/\bbase:/.test(read('docs/astro.config.mjs')), 'a base path is configured');
  });
});

describe('the LLM documents Astro publishes', () => {
  const llms = renderLlmsTxt(pkg);
  const home = pkg.homepage.replace(/\/$/, '');

  /** Every `- [text](url): note` line, tagged with the `##` section it sits in. */
  function links() {
    const out = [];
    let section = null;
    for (const line of llms.split('\n')) {
      const heading = line.match(/^## (.+)$/);
      if (heading) { section = heading[1]; continue; }
      const link = line.match(/^- \[([^\]]+)\]\(([^)]+)\)(?::\s*(.+))?$/);
      if (link) out.push({ section, text: link[1], url: link[2], note: link[3] });
    }
    return out;
  }

  test('has the shape the llms.txt standard defines', () => {
    const lines = llms.split('\n');
    assert.equal(lines[0], '# ExpressiveCSS', 'must open with a single H1');
    assert.equal(lines.filter((l) => l.startsWith('# ')).length, 1);
    assert.ok(lines[2].startsWith('> '), 'the H1 is followed by a blockquote summary');

    const sections = lines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
    // Optional means "skippable for a shorter context", which only reads that
    // way at the end.
    assert.equal(sections.at(-1), 'Optional');

    for (const { text, url, note } of links()) {
      assert.ok(note, `link "${text}" has no note`);
      assert.match(url, /^https:\/\//, `link "${text}" is not absolute`);
    }
  });

  test('links every catalogue page, once, under its own group, at its published route', () => {
    for (const group of NAV) {
      for (const page of group.pages) {
        const hits = links().filter((l) => l.text === page.label);
        assert.equal(hits.length, 1, `${page.label}: expected one link, found ${hits.length}`);
        assert.equal(hits[0].section, group.label,
          `${page.label} is under "${hits[0].section}", not "${group.label}"`);
        assert.equal(hits[0].url, home + route(page.id), `${page.label}: wrong URL`);
        assert.equal(hits[0].note, page.description, `${page.label}: wrong note`);
      }
    }
  });

  test('states the package and the published version, prerelease and all', () => {
    const expected = pkg.version.includes('-') ? `${pkg.version} (prerelease)` : pkg.version;
    assert.ok(llms.includes(`version ${expected}.`), `does not state version ${expected}`);
    assert.ok(llms.includes(`\`${pkg.name}\``), 'does not name the package');
  });

  test('is the Flask index but for the landing page moving to the site root', () => {
    // The migration must not quietly rewrite the index while changing the
    // generator, and only one line is allowed to differ: the landing page
    // becomes the site root (ADR 0003).
    const before = read('llms.txt').split('\n');
    const after = llms.split('\n');
    assert.equal(after.length, before.length, 'the index gained or lost a line');
    const moved = before.flatMap((line, i) => (line === after[i] ? [] : [i]));
    assert.deepEqual(
      moved.map((i) => after[i]),
      [`- [${PAGES[0].label}](${home}/): ${PAGES[0].description}`],
    );
  });

  test('publishes each primary document it links, from the repository copy', () => {
    const primary = links().filter((l) => l.section === 'Primary documentation');
    assert.equal(primary[0].url, `${home}/m3-guidelines.md`,
      'the design contract is listed first: it is the one to read first');
    for (const name of ['m3-guidelines.md', 'llm.md', 'llms-full.txt']) {
      assert.ok(primary.some((l) => l.url === `${home}/${name}`), `${name} is not linked`);
      assert.ok(existsSync(new URL(`docs/src/pages/${name}.ts`, root)),
        `${name} is linked but Astro publishes no such endpoint`);
    }
    // The whole corpus is the two documents joined at build time, not a third
    // maintained copy -- and joined in the order llms.txt lists them, because
    // m3-guidelines.md is the one to read first.
    const full = read('docs/src/pages/llms-full.txt.ts');
    assert.match(full, /import guidelines from "\.\.\/\.\.\/\.\.\/m3-guidelines\.md\?raw"/);
    assert.match(full, /import llm from "\.\.\/\.\.\/\.\.\/llm\.md\?raw"/);
    assert.match(full, /\[guidelines, llm\]\.join/);
  });
});
