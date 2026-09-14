import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('container report checks reject missing or failed browser profiles', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'container-reports-'));
  const run = () => spawnSync(process.execPath, ['scripts/check-container-reports.mjs', root]);
  try {
    assert.notEqual(run().status, 0);
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      for (const name of ['keyboard', 'arabic-touch-reflow']) {
        const directory = path.join(root, `${engine}-${name}`);
        mkdirSync(directory);
        writeFileSync(path.join(directory, 'result.json'), JSON.stringify({ engine, profile: { name }, status: 'passed' }));
      }
    }
    assert.equal(run().status, 0);
    writeFileSync(path.join(root, 'webkit-keyboard/result.json'), JSON.stringify({ engine: 'webkit', profile: { name: 'keyboard' }, status: 'failed' }));
    assert.notEqual(run().status, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('build measurements require matching revisions and three samples per mode', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'container-timings-'));
  const run = () => spawnSync(process.execPath, ['scripts/measure-container-build.mjs', '--summary', root], { env: { ...process.env, GITHUB_STEP_SUMMARY: '' } });
  try {
    for (const mode of ['cold', 'cached']) {
      for (const sample of ['1', '2', '3']) {
        const directory = path.join(root, `${mode}-${sample}`);
        mkdirSync(directory);
        writeFileSync(path.join(directory, 'build-timing.json'), JSON.stringify({ mode, sample, revision: 'same', seconds: mode === 'cold' ? 120 : 80, dependencySeconds: 70 }));
      }
    }
    let result = run();
    assert.equal(result.status, 0, result.stderr.toString());
    assert.match(result.stdout.toString(), /Threshold met/);
    for (const sample of ['1', '2', '3']) {
      const file = path.join(root, `cached-${sample}/build-timing.json`);
      const data = JSON.parse(readFileSync(file));
      writeFileSync(file, JSON.stringify({ ...data, seconds: 100 }));
    }
    assert.match(run().stdout.toString(), /Threshold not met/);
    const file = path.join(root, 'cached-1/build-timing.json');
    const data = JSON.parse(readFileSync(file));
    writeFileSync(file, JSON.stringify({ ...data, revision: 'different' }));
    assert.notEqual(run().status, 0);
    rmSync(file);
    assert.notEqual(run().status, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
