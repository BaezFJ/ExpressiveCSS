/**
 * Visual regression: photograph the base revision, then this working tree, and
 * report every page that moved.
 *
 * No baselines are committed. 57 pages x 4 variants of full-page PNG is 100+
 * MB per revision, and a repository that declines to commit 570 KB of
 * duplicated prose is not the place for it. Capturing the base instead buys
 * three things: nothing binary enters git, there is no "update the snapshots"
 * ritual to forget, and the comparison is always this branch against its own
 * merge base rather than against whatever was blessed months ago. The cost is
 * one extra build per run.
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

function buildWorktree(sha) {
  rmSync(WORKTREE, { recursive: true, force: true });
  run('git', ['worktree', 'prune']);
  if (run('git', ['worktree', 'add', '--detach', WORKTREE, sha]).status !== 0) {
    die('Could not create the base worktree.');
  }
  // The base revision's sources, this checkout's tools: the worktree gets no
  // npm install of its own. Only sass, esbuild and tsc run there, and a
  // version skew between the two passes would show up as a diff on every page.
  symlinkSync(join(ROOT, 'node_modules'), join(WORKTREE, 'node_modules'), 'dir');
  if (run('npm', ['run', 'build'], { cwd: WORKTREE }).status !== 0) {
    die('The base revision does not build.');
  }
}

function playwright({ mode, app, port, update }) {
  return run('npx', [
    'playwright', 'test',
    '--config', CONFIG,
    ...(update ? ['--update-snapshots'] : []),
    ...passthrough,
  ], {
    env: { ...process.env, VISUAL_MODE: mode, VISUAL_APP: app, VISUAL_PORT: String(port) },
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

buildWorktree(sha);

// Stale shots would silently become baselines for pages the base pass skips.
rmSync(join(VISUAL, '__shots__'), { recursive: true, force: true });

console.log('\n--- Photographing the base revision ---\n');
if (playwright({ mode: 'base', app: join(WORKTREE, 'docs/app.py'), port: 5111, update: true }) !== 0) {
  die('The base revision could not be photographed; there is nothing to compare against.');
}

// The head pass serves this working tree, so it needs this working tree built.
if (run('npm', ['run', 'build']).status !== 0) die('This revision does not build.');

console.log('\n--- Comparing this revision ---\n');
const status = playwright({ mode: 'head', app: join(ROOT, 'docs/app.py'), port: 5112, update: false });

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
