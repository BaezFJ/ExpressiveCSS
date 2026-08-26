// docs/src/data/nav.ts, checked against the Flask site it has to represent.
//
// The catalogue is the page inventory the Astro site will be built from (ADR
// 0003), but docs/app.py is still the running site. Two inventories in one
// repository drift the moment someone adds a page, and a drifted catalogue is
// worse than no catalogue: the migration it exists to de-risk would silently
// drop, misname or mis-route a page.
//
// So this file re-derives the whole contract from the Flask sources -- the
// navigation from `NAV`, the titles and descriptions from the templates the
// views render, the published routes from the frozen site -- and fails on any
// disagreement in either direction.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

// Node strips the types; nothing compiles this file for the test run.
const { NAV, PAGES, ALIASES } = await import('../docs/src/data/nav.ts');

const appPy = read('docs/app.py');

/**
 * Every view in docs/app.py: its URL rules, and what it does with them.
 *
 * Decorators apply bottom-up, so the *last* `@app.route` in the source is the
 * first rule registered, which is the one `url_for` builds and therefore the
 * one file Frozen-Flask writes. That is why `sliders` publishes as
 * `/slider.html` and not `/sliders.html`.
 */
function views() {
  const found = {};
  const pattern =
    /((?:@app\.route\('[^']+'\)\n)+)def (\w+)\(\):\n\s+return ([^\n]+)/g;
  for (const view of appPy.matchAll(pattern)) {
    const rules = [...view[1].matchAll(/@app\.route\('([^']+)'\)/g)].map((r) => r[1]);
    found[view[2]] = {
      rules,
      route: rules.at(-1),
      template: view[3].match(/render_template\('([^']+)'\)/)?.[1],
      redirectsTo: view[3].match(/redirect\(url_for\('(\w+)'\)/)?.[1],
    };
  }
  // The regex wants `def name():` and a one-line return, which every page view
  // has and none of the LLM or asset views do. A page view that grew a
  // docstring would silently vanish from `found` and take its rules with it,
  // so account for every `.html` rule in the file -- those are exactly the
  // page and alias rules, and nothing else in docs/app.py publishes one.
  assert.deepEqual(
    Object.values(found).flatMap((v) => v.rules).filter((r) => r.endsWith('.html')).sort(),
    [...appPy.matchAll(/@app\.route\('([^']+\.html)'\)/g)].map((m) => m[1]).sort(),
    'a page view in docs/app.py was not parsed',
  );
  return found;
}

/** `NAV` from docs/app.py, in source order. */
function flaskNav() {
  const block = appPy.match(/^NAV = \[$([\s\S]*?)^\]$/m);
  assert.ok(block, 'NAV not found in docs/app.py');
  const groupPattern =
    /_group\(\s*'([^']+)',\s*(None|'[^']*'),\s*\[([\s\S]*?)\n\s*\](?:,\s*blurb=((?:'[^']*'\s*)+))?\)/g;
  const groups = [...block[1].matchAll(groupPattern)].map((g) => ({
    label: g[1],
    icon: g[2] === 'None' ? null : g[2].slice(1, -1),
    blurb: g[4] ? g[4].match(/'[^']*'/g).map((s) => s.slice(1, -1)).join('') : undefined,
    pages: [...g[3].matchAll(/\(\s*'([^']+)',\s*'([^']+)'(?:,\s*'([^']+)')?\s*\)/g)].map(
      (p) => ({ id: p[1], label: p[2], icon: p[3] }),
    ),
  }));
  // A regex that silently matches nothing would pass every test below.
  assert.ok(groups.length > 1, 'no groups parsed out of NAV');
  assert.ok(groups.every((g) => g.pages.length), 'a parsed group has no pages');
  return groups;
}

/** A `{% set page_x = '...' %}` value, unescaped and whitespace-collapsed. */
function templateVar(template, name) {
  const set = read(`docs/templates/${template}`).match(
    new RegExp(`{%-?\\s*set\\s+${name}\\s*=\\s*(['"])([\\s\\S]*?)\\1\\s*-?%}`),
  );
  if (!set) return undefined;
  return set[2].replace(/\\"/g, '"').replace(/\\'/g, "'").split(/\s+/).join(' ');
}

const byFrom = (a, b) => a.from.localeCompare(b.from);

const flask = flaskNav();
const app = views();

// Published, but not by Frozen-Flask: GitHub Pages has no directory-index
// concept beyond index.html, so the assembly step in pages.yml copies the
// landing page to it. The catalogue has to carry it -- a site generated from a
// catalogue that does not would have no root document -- but the checks that
// read `website/` have to know it was never frozen there.
const ASSEMBLED = new Set(['/index.html']);

describe('the docs page catalogue', () => {
  test('has the same groups as NAV, in the same order', () => {
    assert.deepEqual(
      NAV.map((g) => ({ label: g.label, icon: g.icon, blurb: g.blurb })),
      flask.map((g) => ({ label: g.label, icon: g.icon, blurb: g.blurb })),
    );
  });

  test('has the same pages in the same groups, in the same order', () => {
    for (const [i, group] of NAV.entries()) {
      assert.deepEqual(
        group.pages.map((p) => ({ id: p.id, label: p.label, icon: p.icon })),
        flask[i].pages.map((p) => ({ id: p.id, label: p.label, icon: p.icon })),
        `group "${group.label}"`,
      );
    }
  });

  test('gives every page the title and description its template sets', () => {
    for (const page of PAGES) {
      const view = app[page.id];
      assert.ok(view?.template, `${page.id}: docs/app.py renders no template`);
      // `title` is only carried when the page calls itself something other
      // than its navigation label, so absent means "same as the label".
      assert.equal(
        page.title ?? page.label,
        templateVar(view.template, 'page_name'),
        `${page.id}: title`,
      );
      assert.equal(
        page.description,
        templateVar(view.template, 'page_blurb'),
        `${page.id}: description`,
      );
    }
  });

  test('gives every page the route the freeze publishes it at', () => {
    for (const page of PAGES) {
      const view = app[page.id];
      assert.equal(page.route, view.route, `${page.id}: route`);
      assert.match(page.route, /\.html$/, `${page.id}: not a published page`);
      assert.ok(
        existsSync(new URL(`website${page.route}`, root)),
        `${page.id}: the site has no ${page.route}`,
      );
    }
  });

  test('records every legacy redirect as an alias of its target', () => {
    const expected = Object.values(app)
      .filter((v) => v.redirectsTo)
      .flatMap((v) =>
        v.rules
          .filter((r) => r.endsWith('.html'))
          .map((from) => ({ from, to: app[v.redirectsTo].route })),
      );
    assert.ok(expected.length, 'no redirecting routes parsed out of docs/app.py');
    assert.deepEqual(
      ALIASES.filter((a) => !ASSEMBLED.has(a.from)).sort(byFrom),
      expected.sort(byFrom),
    );

    for (const { from } of ALIASES) {
      if (ASSEMBLED.has(from)) continue;
      assert.ok(
        existsSync(new URL(`website${from}`, root)),
        `the site has no ${from}`,
      );
    }
  });

  test('gives the deployed site a root document', () => {
    const index = PAGES.find((p) => p.id === 'index');
    assert.ok(
      index.aliases?.includes('/index.html'),
      'the landing page does not claim /index.html, so a generated site has no root',
    );
    // Proven against the workflow that creates it, since the freeze does not.
    assert.match(
      read('.github/workflows/pages.yml'),
      new RegExp(`cp _site${index.route} _site/index\\.html`),
      `pages.yml does not copy ${index.route} to the site root`,
    );
  });

  test('accounts for every page the site publishes', () => {
    const published = readdirSync(new URL('website/', root))
      .filter((f) => f.endsWith('.html'))
      .map((f) => `/${f}`);
    assert.deepEqual(
      published.sort(),
      [
        ...PAGES.map((p) => p.route),
        ...ALIASES.map((a) => a.from).filter((f) => !ASSEMBLED.has(f)),
      ].sort(),
    );
  });
});

