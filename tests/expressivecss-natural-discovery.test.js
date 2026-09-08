import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gradeNaturalDiscovery, runNaturalDiscovery, validateNaturalCatalogue } from '../scripts/eval-expressivecss-natural-discovery.mjs';

const catalogue = JSON.parse(await readFile(new URL('./fixtures/expressivecss-skill-evals/natural-discovery.json', import.meta.url), 'utf8'));

test('natural discovery separates completed invocation, task claims and infrastructure failures', () => {
  const row = { should_trigger: true, readOnly: true };
  const envelope = { candidateResponse: { should_use_expressivecss: true, summary: 'Read the skill and changed nothing' }, runMetadata: { completedTurns: 1, observedGuideReads: [] }, executionEvidence: { filesystem: { independentlyComputed: true, before: 'before', after: 'before' } } };
  assert.equal(gradeNaturalDiscovery(row, envelope).rootExposureMatch, false);
  envelope.runMetadata.observedGuideReads = ['skills/expressivecss/SKILL.md'];
  assert.equal(gradeNaturalDiscovery(row, envelope).rootExposureMatch, true);
  envelope.executionEvidence.filesystem.after = 'changed';
  assert.equal(gradeNaturalDiscovery(row, envelope).noEdit, false);
  envelope.runMetadata.infrastructureError = 'Timeout';
  assert.equal(gradeNaturalDiscovery(row, envelope).rootExposureMatch, null);
  assert.equal(gradeNaturalDiscovery(row, envelope).completed, false);
  delete envelope.runMetadata.infrastructureError;
  delete envelope.runMetadata.observedGuideReads;
  assert.equal(gradeNaturalDiscovery({ ...row, should_trigger: false }, envelope).rootExposureMatch, null);
  envelope.runMetadata.observedGuideReads = [];
  const proxy = gradeNaturalDiscovery({ ...row, should_trigger: false }, envelope);
  assert.equal(proxy.rootExposureMatch, true);
  assert.equal(proxy.invocationStatus, 'unverified');
});

test('reviewed natural cases have distinct balanced splits and safe fixture files', () => {
  assert.equal(validateNaturalCatalogue(catalogue), catalogue);
  assert.equal(new Set([...catalogue.development, ...catalogue.heldout].map((row) => row.request)).size, 12);
  for (const file of ['../rubric.json', '.agents/skills/x.md', '/tmp/escape.txt', 'node_modules/package.json']) {
    const copy = structuredClone(catalogue); copy.development[0].files = { [file]: 'unsafe' };
    assert.throws(() => validateNaturalCatalogue(copy), /fixture file/);
  }
  const duplicate = structuredClone(catalogue); duplicate.heldout[0].id = duplicate.development[0].id;
  assert.throws(() => validateNaturalCatalogue(duplicate), /Invalid natural/);
});

test('natural runs receive ordinary requests only and require a frozen protocol for resume', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'expressivecss-natural-test-'));
  try {
    const executable = path.join(root, 'fake-codex'), configPath = path.join(root, 'config.toml');
    await writeFile(configPath, 'model="test-default"\n');
    await writeFile(executable, `#!${process.execPath}\nlet prompt='';for await(const chunk of process.stdin)prompt+=chunk;console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:JSON.stringify({prompt})}}));console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:1,cached_input_tokens:0,output_tokens:1}}));\n`, { mode: 0o700 });
    const skill = path.resolve('skills/expressivecss'), output = path.join(root, 'runs');
    const options = { baseline: skill, candidate: skill, output, executable, configPath, timeoutMs: 3000 };
    await assert.rejects(runNaturalDiscovery(options), /Freeze/);
    await runNaturalDiscovery({ ...options, output: path.join(root, 'freeze'), freeze: true });
    const manifest = path.join(root, 'freeze/frozen-protocol.json');
    const report = await runNaturalDiscovery({ ...options, manifest });
    assert.equal(report.runs.length, 12);
    assert.ok(report.runs.every((row) => row.completed && !row.rootRead));
    assert.deepEqual(report.exposure_summary.with_skill, { positive: { cases: 3, matches: 0, mismatches: 3, unavailable: 0 }, negative: { cases: 3, matches: 3, mismatches: 0, unavailable: 0 } });
    for (const row of catalogue.development) {
      const response = JSON.parse(await readFile(path.join(output, `eval-${row.id}/with_skill/run-1/outputs/response.json`), 'utf8'));
      assert.equal(response.candidateResponse.prompt, row.request);
      assert.ok(!response.candidateResponse.prompt.includes('should_trigger'));
    }
    const before = await readFile(path.join(output, 'results.json'), 'utf8');
    await runNaturalDiscovery({ ...options, manifest, resume: true });
    assert.equal(await readFile(path.join(output, 'results.json'), 'utf8'), before);
    await assert.rejects(runNaturalDiscovery({ ...options, manifest, timeoutMs: 4000, resume: true }), /provenance|protocol/i);
    assert.equal(await readFile(path.join(output, 'results.json'), 'utf8'), before);
  } finally { await rm(root, { recursive: true, force: true }); }
});
