import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
