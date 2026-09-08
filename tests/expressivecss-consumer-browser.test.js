import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { chromium } from '@playwright/test';
import { verifyConsumer } from '../scripts/lib/verify-consumer.mjs';

const browserTest = existsSync(chromium.executablePath()) ? test : test.skip;
const caseFor = (name, route = '/') => ({ name, path: route, width: 375, height: 900, colorScheme: 'light', reducedMotion: 'reduce', steps: [
  { action: 'click', selector: '#save' },
  { action: 'expect', selector: '#status', property: 'text', value: 'Saved' },
  { action: 'expect', selector: '#save', property: 'focused', value: true },
] });

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'expressive-consumer-browser-'));
  await symlink(path.resolve('node_modules'), path.join(root, 'node_modules'), 'dir');
  await writeFile(path.join(root, 'package.json'), '{"private":true}');
  await writeFile(path.join(root, 'app.js'), 'source version 1');
  await writeFile(path.join(root, '__proto__'), 'source version 1');
  let mutations = 0;
  const server = createServer(async (request, response) => {
    if (request.method === 'POST') { mutations++; response.end('Saved'); return; }
    if (request.url === '/changed') await writeFile(path.join(root, '__proto__'), 'source version 2');
    const action = request.url === '/noop' ? '' : request.url === '/network' ? "fetch('/save', {method:'POST'}).then(r=>r.text()).then(v=>document.querySelector('#status').textContent=v).catch(()=>{})" : "document.querySelector('#status').textContent='Saved'";
    response.setHeader('Content-Type', 'text/html');
    response.end(`<!doctype html><meta name="viewport" content="width=device-width"><title>Save demo</title><main style="${request.url === '/wide' ? 'width:100000px' : ''}"><button id="save" onclick="${action}">Save</button><p id="status">Ready</p></main>`);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { root, origin: `http://127.0.0.1:${server.address().port}`, mutations: () => mutations, async close() { await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }); await rm(root, { recursive: true, force: true }); } };
}

async function run(files, cases, extra = {}) {
  await writeFile(path.join(files.root, 'scenario.json'), JSON.stringify({ name: 'Consumer save', sources: ['app.js', '__proto__'], cases }));
  return verifyConsumer({ projectRoot: files.root, scenarioFile: 'scenario.json', origin: files.origin, outputDirectory: path.join(files.root, 'reports'), ...extra });
}

browserTest('consumer runner retains real passing, no-op failure, and later results with hashed captures', async () => {
  const files = await fixture();
  try {
    const { directory, report } = await run(files, [caseFor('save'), caseFor('broken', '/noop'), caseFor('overflow', '/wide'), { ...caseFor('wide dark'), width: 1280, colorScheme: 'dark', reducedMotion: 'no-preference' }]);
    assert.equal(report.status, 'failed', JSON.stringify(report));
    assert.deepEqual(report.cases.map((entry) => entry.status), ['passed', 'failed', 'failed', 'passed']);
    assert.equal(report.provenance.inputsUnchanged, true);
    assert.ok(Object.hasOwn(report.provenance.sourceHashes, '__proto__'));
    assert.equal(report.cases[2].captures[0].clippedToViewport, true);
    assert.match(report.provenance.browser.version, /^\d/);
    for (const entry of report.cases) for (const capture of entry.captures) assert.equal(createHash('sha256').update(await readFile(path.join(directory, capture.file))).digest('hex'), capture.sha256);
    assert.ok(report.cases[1].captures.some((capture) => capture.file.endsWith('failure.png')));
    assert.deepEqual(JSON.parse(await readFile(path.join(directory, 'report.json'), 'utf8')), report);
  } finally { await files.close(); }
});

browserTest('consumer mutation access requires an explicit operator option and changed source blocks evidence', async () => {
  const files = await fixture();
  try {
    const denied = await run(files, [caseFor('save', '/network')]);
    assert.equal(denied.report.status, 'failed', JSON.stringify(denied.report));
    assert.equal(files.mutations(), 0);
    assert.ok(denied.report.cases[0].blockedRequestCount > 0);
    const allowed = await run(files, [caseFor('save', '/network')], { allowMutations: true });
    assert.equal(allowed.report.status, 'passed');
    assert.equal(files.mutations(), 1);
    assert.notEqual(allowed.directory, denied.directory);
    const changed = await run(files, [caseFor('changed', '/changed')]);
    assert.equal(changed.report.status, 'blocked');
    assert.equal(changed.report.provenance.inputsUnchanged, false);
  } finally { await files.close(); }
});
