import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('container runner matches the lockfile, forwards arguments and preserves failures', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'expressivecss-docker-'));
  const runtime = path.join(directory, 'runtime');
  const log = path.join(directory, 'calls.jsonl');
  const version = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url))).packages['node_modules/playwright'].version;
  try {
    writeFileSync(runtime, `#!${process.execPath}
const fs = require('node:fs');
fs.appendFileSync(process.env.CALL_LOG, JSON.stringify(process.argv.slice(2)) + '\\n');
process.exit(process.argv[2] === process.env.FAIL_STEP ? 7 : 0);
`, { mode: 0o755 });
    for (const step of ['', 'build', 'create', 'start', 'cp']) {
      writeFileSync(log, '');
      const result = spawnSync(process.execPath, [
        new URL('../scripts/run-docker.mjs', import.meta.url).pathname,
        'node', '-e', 'console.log("argument with spaces")',
      ], { cwd: directory, env: { ...process.env, CONTAINER_RUNTIME: runtime, CALL_LOG: log, FAIL_STEP: step } });
      assert.equal(result.status, step ? 7 : 0, result.stderr.toString());
      const calls = readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line));
      assert.ok(calls[0].includes(`PLAYWRIGHT_VERSION=${version}`));
      if (step === 'build') assert.equal(calls.length, 1);
      else {
        assert.deepEqual(calls[1].slice(-4), ['expressivecss-playwright', 'node', '-e', 'console.log("argument with spaces")']);
        const name = calls[1][2];
        if (step === 'create') assert.equal(calls.length, 2);
        else {
          assert.deepEqual(calls[2], ['start', '--attach', name]);
          assert.equal(calls.filter(call => call[0] === 'cp').length, 3);
          assert.deepEqual(calls.at(-1), ['rm', '--force', name]);
        }
        const root = new URL('../.cache/container-tests/', import.meta.url);
        rmSync(new URL(`${name}/`, root), { recursive: true, force: true });
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
