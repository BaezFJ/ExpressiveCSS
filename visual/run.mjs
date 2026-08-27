/**
 * Visual regression: photograph the base revision, then this working tree, and
 * report every page that moved.
 *
 * No baselines are committed. 59 pages x 4 variants of full-page PNG is 100+
 * MB per revision, and a repository that declines to commit 570 KB of
 * duplicated prose is not the place for it. Capturing the base instead buys
 * three things: nothing binary enters git, there is no "update the snapshots"
 * ritual to forget, and the comparison is always this branch against its own
 * merge base rather than against whatever was blessed months ago. The cost is
 * one extra build per run.
 *
 * The head is served by Astro and the base by whichever generator that
 * revision still ships (ADR 0003). While the migration is in flight that is
 * Flask, so the suite is what accepts a converted page: it is migrated when
 * its picture did not move. The base choice is read off the base worktree
 * rather than configured, so the day docs/app.py is deleted the base pass
 * becomes Astro too and this file needs no edit -- which is the point: a flag
 * would be one more thing to remember at the cutover.
 *
 *   npm run test:visual                  compare against origin/master
 *   VISUAL_BASE=<ref> npm run test:visual   compare against <ref>
 *   npm run test:visual -- --keep        leave .visual-base/ in place
 *   npm run test:visual -- --grep buttons   one page (passed through)
 *
 * The report is visual/report/; `npm run test:visual:report` opens it.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, symlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const VISUAL = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(VISUAL, '..');
const WORKTREE = join(ROOT, '.visual-base');
const CONFIG = join(VISUAL, 'playwright.config.js');

const argv = process.argv.slice(2);
const keep = argv.includes('--keep');
const passthrough = argv.filter((a) => a !== '--keep');

const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT, ...opts });

const capture = (cmd, args) =>
  spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' }).stdout?.trim() ?? '';

const die = (msg) => { console.error(`\n${msg}\n`); process.exit(1); };

/**
 * The merge base, not the branch tip: comparing against the tip of master
 * would attribute every change made on master since branching to this branch.
 */
function baseRevision() {
  if (process.env.VISUAL_BASE) {
    const sha = capture('git', ['rev-parse', '--verify', `${process.env.VISUAL_BASE}^{commit}`]);
    if (!sha) die(`VISUAL_BASE=${process.env.VISUAL_BASE} is not a commit.`);
    return sha;
  }
  for (const ref of ['origin/master', 'master']) {
    const sha = capture('git', ['merge-base', ref, 'HEAD']);
    if (sha) return sha;
  }
  die('No origin/master or master to compare against. Pass VISUAL_BASE=<ref>.');
}

function addWorktree(sha) {
  rmSync(WORKTREE, { recursive: true, force: true });
  run('git', ['worktree', 'prune']);
  if (run('git', ['worktree', 'add', '--detach', WORKTREE, sha]).status !== 0) {
    die('Could not create the base worktree.');
  }
  // The base revision's sources, this checkout's tools: the worktree gets no
  // npm install of its own. Only sass, esbuild, tsc and astro run there, and a
  // version skew between the two passes would show up as a diff on every page.
  symlinkSync(join(ROOT, 'node_modules'), join(WORKTREE, 'node_modules'), 'dir');
}

/**
 * Which generator renders the *base* revision: the one it still ships as
 * production.
 *
 * Flask while docs/app.py is there, Astro once it is not. That is the whole of
 * the migration switch and it retires itself with the file -- no flag to
 * remember at the cutover, and no Flask-specific configuration left behind
 * afterwards.
 *
 * The head is not asked. It is the candidate, so it is always Astro: both
 * revisions carry both generators for the whole life of the migration, and a
 * predicate that reads the working tree would answer "flask" there too and
 * quietly compare Flask against itself -- 236 shots of a no-op, reported as a
 * clean run.
 */
const baseGeneratorFor = (checkout) =>
  existsSync(join(checkout, 'docs/app.py')) ? 'flask' : 'astro';

/**
 * Build what the pass will serve, through the revision's own npm scripts.
 *
 * `docs:build` is the framework build, the Astro build and `docs:verify` in
 * that order, and the order is load-bearing: docs/public/dist symlinks at the
 * compiled CSS and JS and Vite *copies* through them, so an Astro build that
 * runs first publishes a site with no stylesheet. Spelling the astro command
 * out here would restate that ordering in a second place and skip the verify
 * step docs:build chains on purpose.
 */
function build(checkout, generator, what) {
  const script = generator === 'astro' ? 'docs:build' : 'build';
  if (run('npm', ['run', script], { cwd: checkout }).status !== 0) {
    die(`${what} does not build.`);
  }
}

function playwright({ mode, generator, checkout, port, update }) {
  return run('npx', [
    'playwright', 'test',
    '--config', CONFIG,
    ...(update ? ['--update-snapshots'] : []),
    ...passthrough,
  ], {
    env: {
      ...process.env,
      VISUAL_MODE: mode,
      VISUAL_GEN: generator,
      VISUAL_ROOT: checkout,
      VISUAL_PORT: String(port),
    },
  }).status;
}

if (!existsSync(join(ROOT, 'node_modules', '@playwright', 'test'))) {
  die('@playwright/test is not installed. Run: npm install');
}

const sha = baseRevision();
if (sha === capture('git', ['rev-parse', 'HEAD'])) {
  console.log('\nThe working tree is at the base revision: only uncommitted changes will show.\n');
}

console.log(`\nBase: ${sha.slice(0, 10)} ${capture('git', ['log', '-1', '--format=%s', sha])}\n`);

addWorktree(sha);

const baseGenerator = baseGeneratorFor(WORKTREE);
console.log(`Generators: base ${baseGenerator}, head astro\n`);

build(WORKTREE, baseGenerator, 'The base revision');

// Stale shots would silently become baselines for pages the base pass skips.
rmSync(join(VISUAL, '__shots__'), { recursive: true, force: true });

console.log('\n--- Photographing the base revision ---\n');
if (playwright({
  mode: 'base', generator: baseGenerator, checkout: WORKTREE, port: 5111, update: true,
}) !== 0) {
  die('The base revision could not be photographed; there is nothing to compare against.');
}

// The head pass serves this working tree, so it needs this working tree built.
build(ROOT, 'astro', 'This revision');

console.log('\n--- Comparing this revision ---\n');
const status = playwright({
  mode: 'head', generator: 'astro', checkout: ROOT, port: 5112, update: false,
});

if (!keep) {
  rmSync(WORKTREE, { recursive: true, force: true });
  run('git', ['worktree', 'prune']);
}

console.log(
  status === 0
    ? '\nNo page moved.\n'
    : '\nPages moved. Open the diffs: npm run test:visual:report\n'
);
process.exit(status);
