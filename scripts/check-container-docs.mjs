import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

const runtime = process.env.CONTAINER_RUNTIME || 'docker';
const probe = 'docs/src/pages/container-hmr-probe.astro';
let created = false;
try {
  const start = spawnSync(runtime, ['compose', 'up', '-d', 'docs'], { stdio: 'inherit' });
  if (start.error) throw start.error;
  assert.equal(start.status, 0);
  const deadline = Date.now() + 120_000;
  let ready = false;
  while (Date.now() < deadline) {
    try { ready = (await fetch('http://127.0.0.1:4321/', { signal: AbortSignal.timeout(2000) })).ok; } catch {}
    if (ready) break;
    await setTimeout(500);
  }
  assert.ok(ready, 'Docs did not become ready within 120 seconds');
  writeFileSync(probe, '<html><body>container-before</body></html>', { flag: 'wx' });
  created = true;
  const code = `import { chromium } from 'playwright';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4321/container-hmr-probe');
  await page.getByText('container-before').waitFor();
  console.log('READY');
  await page.getByText('container-after').waitFor({timeout:20000});
} finally { await browser.close(); }`;
  const child = spawn(runtime, ['compose', 'exec', '-T', 'docs', 'node', '--input-type=module', '-e', code], { stdio: ['ignore', 'pipe', 'inherit'] });
  let output = '', changed = false;
  child.stdout.on('data', bytes => {
    output += bytes;
    if (!changed && output.includes('READY')) {
      changed = true;
      writeFileSync(probe, '<html><body>container-after</body></html>');
    }
  });
  const status = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  assert.equal(status, 0, 'Docs live reload failed');
  assert.ok(changed, 'Browser did not observe the initial page');
  console.log('Docs HTTP readiness and live reload passed.');
} finally {
  if (created) unlinkSync(probe);
  const stop = spawnSync(runtime, ['compose', 'down'], { stdio: 'inherit' });
  if (stop.error) throw stop.error;
  assert.equal(stop.status, 0, 'Docs cleanup failed');
}
