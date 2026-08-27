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
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
// fileURLToPath, not `root.pathname`: a URL keeps the path percent-encoded, so
// a checkout under a directory with a space in it resolves to a `%20` nobody has.
const site = resolve(process.argv[2] ?? join(fileURLToPath(root), '_site'));

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

for (const page of PAGES) {
  const path = route(page.id);
  nonempty(path, 'canonical page');
  // Every page declares its own URL canonical. A formality for all but one of
  // them -- but a static host serves the root document at `/index.html` as
  // well as `/`, so without this the landing page has a second indexable URL
  // that no redirect covers, and `Astro.url.pathname` hands that second URL
  // out by default under `build.format: 'file'`.
  try {
    const declared = new URL(path, `${home}/`).href;
    if (!read(path).includes(`<link rel="canonical" href="${declared}">`)) {
      fail(`canonical page ${path}: does not declare ${declared} canonical`);
    }
  } catch {
    // Already reported as missing.
  }
}

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
  // Whichever fires first wins, and only the script carries the query and the
  // fragment -- so its position relative to the meta refresh is the guarantee.
  if (html.indexOf('location.replace(') > html.indexOf('http-equiv="refresh"')) {
    fail(`alias ${from}: the meta refresh precedes the script, so a deep link may lose its query`);
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

/** Whether a reference points somewhere this site is responsible for. */
const isLocal = (ref) =>
  ref !== '' && !ref.startsWith('#') && !/^[a-z][a-z0-9+.-]*:/i.test(ref) && !ref.startsWith('//');

for (const page of pages) {
  const html = readFileSync(join(site, page), 'utf8').replace(/<code\b[\s\S]*?<\/code>/g, '');
  // Every reference, not only the root-absolute ones. The site is flat, so a
  // relative ref resolves against the site root either way -- but a scan that
  // only matched `/…` would pass because nothing live happens to be relative
  // today, which is a different thing from being correct.
  const refs = new Set([...html.matchAll(/(?:href|src)="([^"]*)"/g)].map((m) => m[1]));
  for (const ref of refs) {
    if (!isLocal(ref)) continue;
    // Trimmed at the first ? or #: docs.css and docs.js carry a ?v= cache
    // buster, and matching that literally is a filename no site has ever had.
    const path = ref.split(/[?#]/)[0];
    if (!path) continue;
    nonempty(path.startsWith('/') ? path : `/${path}`, `${page} references`);
  }
}

// --- Result ----------------------------------------------------------------

if (problems.length) {
  for (const problem of problems) console.error(`::error::${problem}`);
  console.error(`\n${problems.length} problem(s) in ${site}`);
  process.exit(1);
}
console.log(`${pages.length} pages, ${aliases().length} aliases, assets and LLM documents all present`);
