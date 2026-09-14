import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

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
      const image = calls[0][calls[0].indexOf('-t') + 1];
      if (step === 'build') assert.equal(calls.length, 1);
      else {
        assert.ok(calls[1].includes(image));
        assert.deepEqual(calls[1].slice(-3), ['node', '-e', 'console.log("argument with spaces")']);
        const name = calls[1][2];
        assert.deepEqual(calls.at(-1), ['image', 'rm', image]);
        if (step === 'create') assert.equal(calls.length, 3);
        else {
          if (step !== 'cp') assert.deepEqual(calls.find(call => call[0] === 'start'), ['start', '--attach', name]);
          assert.equal(calls.filter(call => call[0] === 'cp').length, 4);
          assert.deepEqual(calls.at(-2), ['rm', '--force', name]);
        }
        const root = new URL('../.cache/container-tests/', import.meta.url);
        rmSync(new URL(`${name}/`, root), { recursive: true, force: true });
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('SIGINT and SIGTERM stop builds, export test reports and remove docs services', { timeout: 30000 }, async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'expressivecss-signals-'));
  const runtime = path.join(directory, 'podman');
  const log = path.join(directory, 'calls');
  let child;
  try {
    writeFileSync(runtime, `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALL_LOG, JSON.stringify(args) + '\\n');
if (args[0] === 'ps') console.log('interrupted-build-container');
if (args[0] === process.env.HOLD_STEP && args[1] !== 'down') {
  console.log('WAITING');
  setInterval(() => {}, 1000);
}
`, { mode: 0o755 });
    for (const signal of ['SIGINT', 'SIGTERM']) {
      for (const step of ['build', 'create', 'start', 'compose']) {
        writeFileSync(log, '');
        child = spawn(process.execPath, ['scripts/run-docker.mjs', ...(step === 'compose' ? ['--docs'] : [])], {
          env: { ...process.env, CONTAINER_RUNTIME: runtime, CALL_LOG: log, HOLD_STEP: step },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let output = '';
        child.stdout.on('data', bytes => { output += bytes; });
        const exited = new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
        const deadline = Date.now() + 3000;
        while (!output.includes('WAITING') && Date.now() < deadline) await setTimeout(20);
        assert.match(output, /WAITING/);
        child.kill(signal);
        assert.equal(await exited, signal === 'SIGINT' ? 130 : 143);
        const calls = readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line));
        if (step === 'build') {
          assert.equal(calls.length, 3);
          const label = calls[0][calls[0].indexOf('--label') + 1];
          assert.deepEqual(calls[1], ['ps', '--all', '--external', '--quiet', '--filter', `label=${label}`]);
          assert.deepEqual(calls[2], ['rm', '--force', 'interrupted-build-container']);
        }
        else if (step === 'compose') assert.deepEqual(calls.at(-2), ['compose', 'down']);
        else {
          const name = calls.find(call => call[0] === 'create')[2];
          assert.ok(calls.some(call => call[0] === 'stop' && call.at(-1) === name));
          assert.equal(calls.filter(call => call[0] === 'cp').length, step === 'create' ? 3 : 4);
          assert.deepEqual(calls.at(-2), ['rm', '--force', name]);
          rmSync(new URL(`../.cache/container-tests/${name}/`, import.meta.url), { recursive: true, force: true });
        }
      }
    }
  } finally {
    if (child && child.exitCode === null) { child.kill('SIGTERM'); await new Promise(resolve => child.once('exit', resolve)); }
    rmSync(directory, { recursive: true, force: true });
  }
});

test('concurrent test and docs invocations keep their own image through cleanup', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'expressivecss-images-'));
  const runtime = path.join(directory, 'runtime');
  const children = [];
  try {
    writeFileSync(runtime, `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALL_LOG, JSON.stringify({args, image: process.env.EXPRESSIVECSS_IMAGE}) + '\\n');
if (args[0] === 'build') setTimeout(() => {}, 100);
`, { mode: 0o755 });
    const runs = ['', '--docs'].map((mode, index) => {
      const log = path.join(directory, `${index}.jsonl`);
      const child = spawn(process.execPath, ['scripts/run-docker.mjs', ...(mode ? [mode] : [])], {
        env: { ...process.env, CONTAINER_RUNTIME: runtime, CALL_LOG: log }, stdio: 'ignore',
      });
      children.push(child);
      return new Promise((resolve, reject) => {
        child.on('error', reject);
        child.on('exit', status => status === 0 ? resolve({ mode, log }) : reject(new Error(`Runner exited ${status}`)));
      });
    });
    const images = [];
    for (const {mode, log} of await Promise.all(runs)) {
      const calls = readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line));
      const build = calls[0].args;
      const image = build[build.indexOf('-t') + 1];
      assert.match(image, /^expressivecss-playwright:[0-9a-f-]{36}$/);
      images.push(image);
      if (mode) {
        const compose = calls.filter(call => call.args[0] === 'compose');
        assert.equal(compose.length, 2);
        for (const call of compose) assert.equal(call.image, image);
      } else {
        const create = calls.find(call => call.args[0] === 'create').args;
        assert.ok(create.includes(image));
        rmSync(new URL(`../.cache/container-tests/${create[2]}/`, import.meta.url), { recursive: true, force: true });
      }
      assert.deepEqual(calls.at(-1).args, ['image', 'rm', image]);
    }
    assert.notEqual(images[0], images[1]);
  } finally {
    for (const child of children) if (child.exitCode === null) {
      child.kill('SIGTERM'); await new Promise(resolve => child.once('exit', resolve));
    }
    rmSync(directory, { recursive: true, force: true });
  }
});
