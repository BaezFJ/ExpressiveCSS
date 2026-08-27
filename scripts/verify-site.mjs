/**
 * Verifies the built documentation site before it is published.
 *
 * The completed artifact is the seam (ADR 0003): a page can be authored
 * correctly and still publish at the wrong URL, link at a file the build never
 * wrote, or ship with a missing stylesheet, and none of that is visible from
 * the source. This enumerates what the site owes from the shared catalogue and
 * checks the directory against it.
 *
 *     node scripts/verify-site.mjs [dir]     default: _site
 */

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = new URL('../', import.meta.url);
const site = resolve(process.argv[2] ?? join(root.pathname, '_site'));

// Node strips the types; nothing compiles these files for this run.
const { PAGES } = await import('../docs/src/data/nav.ts');
const { route, aliases } = await import('../docs/src/lib/catalogue.ts');
const { renderLlmsTxt } = await import('../docs/src/lib/llms.ts');
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const home = pkg.homepage.replace(/\/$/, '');

const problems = [];
const fail = (message) => problems.push(message);

/** The file a root-absolute site path resolves to. `/` is the root document. */
const fileFor = (path) => join(site, path === '/' ? '/index.html' : path);

function nonempty(path, why) {
  let stat;
  try {
    stat = statSync(fileFor(path));
  } catch {
    return fail(`${why}: ${path} is not published`);
  }
  if (!stat.size) fail(`${why}: ${path} is empty`);
}

const read = (path) => readFileSync(fileFor(path), 'utf8');

// --- Canonical pages -------------------------------------------------------

for (const page of PAGES) nonempty(route(page.id), 'canonical page');

// --- Compatibility routes --------------------------------------------------
//
// A redirect that does not declare its target makes the alias a second indexed
// copy of the page it points at, which is the whole reason these are checked
// beyond mere existence.

for (const { from, to } of aliases()) {
  nonempty(from, 'alias');
  let html;
  try {
    html = read(from);
  } catch {
    continue;
  }
  const canonical = new URL(to, `${home}/`).href;
  if (!html.includes(`<link rel="canonical" href="${canonical}">`)) {
    fail(`alias ${from}: does not declare ${canonical} canonical`);
  }
  if (!html.includes(`content="0; url=${to}"`)) {
    fail(`alias ${from}: has no native refresh fallback to ${to}`);
  }
  if (!html.includes('location.search + location.hash')) {
    fail(`alias ${from}: drops the query string and fragment`);
  }
}

// --- Compatibility assets --------------------------------------------------
//
// The framework build and the docs' own chrome, at the URLs consumers and
// cached pages already hold. CNAME is what keeps the site on its own domain.

for (const asset of [
  '/dist/css/expressive.css',
  '/dist/css/expressive.min.css',
  '/dist/js/expressive.js',
  '/dist/js/expressive.min.js',
  '/static/docs.css',
  '/static/docs.js',
  '/CNAME',
]) {
  nonempty(asset, 'asset');
}

// --- Documents for language models -----------------------------------------

for (const doc of ['/llms.txt', '/llms-full.txt', '/llm.md', '/m3-guidelines.md']) {
  nonempty(doc, 'LLM document');
}

try {
  const llms = read('/llms.txt');
  if (llms !== renderLlmsTxt(pkg)) {
    fail('/llms.txt: not what the catalogue and package.json generate');
  }
  // Absolute links, so the page-link walk below never sees them -- and llms.txt
  // is fetched by machines that cannot ask what happened when a URL 404s.
  for (const [, text, url] of llms.matchAll(/^- \[([^\]]+)\]\(([^)]+)\)/gm)) {
    if (!url.startsWith(`${home}/`) && url !== home) continue;
    nonempty(url.slice(home.length) || '/', `llms.txt link "${text}"`);
  }
} catch {
  // Already reported as missing above.
}

// --- Local links -----------------------------------------------------------
//
// <code> blocks are cut out whole first. The docs quote example markup like
// href="/library" and src="images/sample-1.jpg", which describe a reader's own
// project rather than files in this site. Filtering by the escaped angle
// brackets instead is not equivalent: a sample pretty-printed one attribute
// per line leaves href="portrait.html" on a line carrying neither entity. An
// href inside <code> is escaped text by construction, so nothing live is lost.

const pages = readdirSync(site).filter((f) => f.endsWith('.html'));
if (pages.length < PAGES.length) fail(`only ${pages.length} pages in ${site}`);

for (const page of pages) {
  const html = readFileSync(join(site, page), 'utf8').replace(/<code\b[\s\S]*?<\/code>/g, '');
  const refs = new Set(
    [...html.matchAll(/(?:href|src)="(\/[^":]*)"/g)].map((m) => m[1]),
  );
  for (const ref of refs) {
    // Trimmed at the first ? or #: docs.css and docs.js carry a ?v= cache
    // buster, and matching that literally is a filename no site has ever had.
    nonempty(ref.split(/[?#]/)[0] || '/', `${page} references`);
  }
}

// --- Result ----------------------------------------------------------------

if (problems.length) {
  for (const problem of problems) console.error(`::error::${problem}`);
  console.error(`\n${problems.length} problem(s) in ${site}`);
  process.exit(1);
}
console.log(`${pages.length} pages, ${aliases().length} aliases, assets and LLM documents all present`);
