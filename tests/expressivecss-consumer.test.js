import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateOrigin, validateScenario, verifyConsumer } from '../scripts/lib/verify-consumer.mjs';

const scenario = () => ({ name: 'Save', sources: ['index.html'], cases: [{ name: 'Save at narrow width', path: '/', width: 375, height: 900, colorScheme: 'light', reducedMotion: 'reduce', steps: [{ action: 'expect', selector: '#status', property: 'text', value: 'Saved' }] }] });

test('consumer scenarios require completion checks and cannot request arbitrary evaluation or external navigation', () => {
  assert.equal(validateScenario(scenario()).cases.length, 1);
  for (const invalid of [
    { ...scenario(), sources: ['../secret'] }, { ...scenario(), sources: ['/etc/passwd'] },
    { ...scenario(), sources: [] }, { ...scenario(), command: 'npm install' },
    ...[{ action: 'evaluate', expression: '1' }, { action: 'click', selector: '#save' }, { action: 'expect', selector: '#x', property: 'count', value: -1 }].map((step) => ({ ...scenario(), cases: [{ ...scenario().cases[0], steps: [step] }] })),
    ...['//outside.test', 'https://outside.test', '/\\outside.test'].map((route) => ({ ...scenario(), cases: [{ ...scenario().cases[0], path: route }] })),
  ]) assert.throws(() => validateScenario(invalid));
  assert.equal(validateOrigin('http://127.0.0.1:4321'), 'http://127.0.0.1:4321');
  for (const value of ['http://localhost:4321', 'https://example.com', 'http://127.0.0.1/private', 'http://user:secret@127.0.0.1', 'http://127.0.0.1/?token=secret']) assert.throws(() => validateOrigin(value));
});

test('missing consumer tooling leaves an unavailable report instead of a pass', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'expressive-consumer-missing-'));
  try {
    await writeFile(path.join(root, 'index.html'), '<main>Example</main>');
    await writeFile(path.join(root, 'scenario.json'), JSON.stringify(scenario()));
    const { directory, report } = await verifyConsumer({ projectRoot: root, scenarioFile: 'scenario.json', origin: 'http://127.0.0.1:1', outputDirectory: path.join(root, 'results') });
    assert.equal(report.status, 'blocked');
    assert.equal(report.provenance.browser, null);
    assert.equal(report.cases.length, 0);
    assert.match(report.error, /Cannot find module/);
    assert.deepEqual(JSON.parse(await readFile(path.join(directory, 'report.json'), 'utf8')), report);
  } finally { await rm(root, { recursive: true, force: true }); }
});
