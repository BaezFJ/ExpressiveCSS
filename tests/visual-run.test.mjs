// The visual-regression orchestrator, exercised through its CLI. The commands
// are fakes, but the process, worktree path and failure boundary are the same
// ones a developer and CI use.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chmodSync,
  copyFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const source = new URL('../visual/run.mjs', import.meta.url);

function executable(path, body) {
  writeFileSync(path, `#!/usr/bin/env node\n${body}`);
  chmodSync(path, 0o755);
}

function harness({ failBaseInstall = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'expressive-visual-run-'));
  const visual = join(root, 'visual');
  const bin = join(root, 'bin');
  const log = join(root, 'commands.jsonl');
  const worktree = join(root, '.visual-base');

  mkdirSync(visual, { recursive: true });
  mkdirSync(bin, { recursive: true });
  mkdirSync(join(root, 'node_modules', '@playwright', 'test'), { recursive: true });
  copyFileSync(source, join(visual, 'run.mjs'));

  const record = `const { appendFileSync } = require('node:fs');\n` +
    `appendFileSync(${JSON.stringify(log)}, JSON.stringify({ command: require('node:path').basename(process.argv[1]), args: process.argv.slice(2), cwd: process.cwd() }) + '\\n');\n`;

  executable(join(bin, 'git'), `${record}
const { mkdirSync } = require('node:fs');
const args = process.argv.slice(2);
if (args[0] === 'rev-parse') {
  console.log(args.at(-1) === 'HEAD' ? '2222222222222222222222222222222222222222' : '1111111111111111111111111111111111111111');
} else if (args[0] === 'log') {
  console.log('base revision');
} else if (args[0] === 'worktree' && args[1] === 'add') {
  mkdirSync(args.at(-2), { recursive: true });
}
`);

  executable(join(bin, 'npm'), `${record}
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const args = process.argv.slice(2);
if (args[0] === 'ci') {
  if (${failBaseInstall}) {
    console.error('simulated npm ci failure');
    process.exit(42);
  }
  mkdirSync(join(process.cwd(), 'node_modules'), { recursive: true });
  writeFileSync(join(process.cwd(), 'node_modules', 'installed-from-this-lockfile'), '');
}
`);

  executable(join(bin, 'npx'), record);

  const result = spawnSync(process.execPath, [join(visual, 'run.mjs'), '--keep'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      VISUAL_BASE: 'base',
    },
  });

  const commands = readFileSync(log, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  return {
    root,
    worktree,
    result,
    commands,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

test('the base pass installs the base revision lockfile before it builds', () => {
  const run = harness();
  try {
    assert.equal(run.result.status, 0, run.result.stderr);
    const npm = run.commands.filter(({ command }) => command === 'npm');
    assert.deepEqual(
      npm.map(({ args, cwd }) => ({ args, checkout: cwd === run.worktree ? 'base' : 'head' })),
      [
        { args: ['ci'], checkout: 'base' },
        { args: ['run', 'docs:build'], checkout: 'base' },
        { args: ['run', 'docs:build'], checkout: 'head' },
      ],
    );
    assert.equal(lstatSync(join(run.worktree, 'node_modules')).isSymbolicLink(), false);
  } finally {
    run.cleanup();
  }
});

test('a base dependency install failure names the failed installation', () => {
  const run = harness({ failBaseInstall: true });
  try {
    assert.notEqual(run.result.status, 0);
    assert.match(run.result.stderr, /base revision.*dependencies.*npm ci/is);
    assert.equal(
      run.commands.some(({ command, args }) => command === 'npm' && args[0] === 'run'),
      false,
      'neither revision should build after the base install fails',
    );
  } finally {
    run.cleanup();
  }
});
