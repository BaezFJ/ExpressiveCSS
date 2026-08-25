// llms.txt, checked against the navigation it is generated from.
//
// The file is written by scripts/gen_llms.py out of `NAV` in docs/app.py, so
// nothing in it is authored by hand -- but it is committed, and a committed
// generated file goes stale the moment someone adds a page and forgets to
// regenerate. The generator is Python and this suite is Node, so rather than
// re-run it, these tests assert the property regenerating would restore: every
// page in NAV is linked exactly once, under its own group, at a URL the frozen
// site actually has.
//
// The link check is the one that matters. llms.txt is fetched by machines that
// cannot ask what happened when a URL 404s, and its links are absolute, so the
// deploy's own link verifier -- which only walks *.html -- never sees them.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

const llms = read('llms.txt');
const pkg = JSON.parse(read('package.json'));
const appPy = read('docs/app.py');
const home = pkg.homepage.replace(/\/$/, '');

/** `NAV` from docs/app.py: [{ label, pages: [{ endpoint, label }] }]. */
function nav() {
  const block = appPy.match(/^NAV = \[$(.*?)^\]$/ms);
  assert.ok(block, 'NAV not found in docs/app.py');
  const groups = [];
  for (const g of block[1].matchAll(/_group\(\s*'([^']+)',\s*(?:None|'[^']*'),\s*\[(.*?)\]/gs)) {
    groups.push({
      label: g[1],
      pages: [...g[2].matchAll(/\(\s*'([^']+)',\s*'([^']+)'/g)]
        .map((p) => ({ endpoint: p[1], label: p[2] })),
    });
  }
  return groups;
}

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

describe('llms.txt', () => {
  test('has the shape the llms.txt standard defines', () => {
    const lines = llms.split('\n');
    assert.equal(lines[0], '# ExpressiveCSS', 'must open with a single H1');
    assert.equal(lines.filter((l) => l.startsWith('# ')).length, 1);
    assert.ok(lines[2].startsWith('> '), 'the H1 is followed by a blockquote summary');
    assert.ok(lines[2].length > 40, 'the summary says what the project is');

    const sections = lines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
    assert.ok(sections.length > 1);
    // Optional means "skippable for a shorter context", which only reads that
    // way at the end.
    assert.equal(sections.at(-1), 'Optional');

    for (const { text, url, note } of links()) {
      assert.ok(note, `link "${text}" has no note`);
      assert.match(url, /^https:\/\//, `link "${text}" is not absolute`);
    }
  });

  test('links every page in NAV, once, under its own group', () => {
    const found = links();
    for (const group of nav()) {
      for (const page of group.pages) {
        const hits = found.filter((l) => l.text === page.label);
        assert.equal(hits.length, 1, `${page.label}: expected one link, found ${hits.length}`);
        assert.equal(hits[0].section, group.label,
          `${page.label} is under "${hits[0].section}", not "${group.label}"`);
      }
    }
  });

  test('every site link resolves to a page the freeze writes', () => {
    // Only the .html pages: llm.md, m3-guidelines.md and llms-full.txt are
    // frozen too, but gitignored under website/ (they duplicate repo files),
    // so they are absent on a fresh checkout. Their routes are checked below.
    for (const { text, url } of links()) {
      if (!url.startsWith(`${home}/`)) continue;
      const file = url.slice(home.length + 1);
      if (!file.endsWith('.html')) continue;
      assert.ok(existsSync(new URL(`website/${file}`, root)),
        `"${text}" links at ${file}, which the site does not have`);
    }
  });

  test('the three primary documents are linked and served', () => {
    const primary = links().filter((l) => l.section === 'Primary documentation');
    const urls = primary.map((l) => l.url);
    for (const name of ['m3-guidelines.md', 'llm.md', 'llms-full.txt']) {
      assert.ok(urls.includes(`${home}/${name}`), `${name} is not linked`);
      assert.ok(appPy.includes(`@app.route('/${name}')`),
        `${name} is linked but docs/app.py serves no such route`);
    }
    assert.equal(primary[0].url, `${home}/m3-guidelines.md`,
      'the design contract is listed first: it is the one to read first');
  });

  test('states the published version, prerelease and all', () => {
    const expected = pkg.version.includes('-')
      ? `${pkg.version} (prerelease)`
      : pkg.version;
    assert.ok(llms.includes(`version ${expected}.`),
      `llms.txt does not state version ${expected}`);
    assert.ok(llms.includes(`\`${pkg.name}\``), 'llms.txt does not name the package');
  });
});
