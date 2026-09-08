import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { EVALUATION_SOURCE_FILES, assertSameProvenance, collectEvaluationProvenance, validateRetainedResults } from '../scripts/expressivecss-eval-provenance.mjs';
import { hashProject } from '../scripts/expressivecss-codex-adapter.mjs';
import { runBenchmark } from '../scripts/benchmark-expressivecss-skill.mjs';

const save = async (root, relative, value) => {
  const filename = path.join(root, relative);
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, typeof value === 'string' ? value : JSON.stringify(value));
};
const fakeRepository = async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'expressivecss-provenance-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const relative of [...EVALUATION_SOURCE_FILES, 'tests/fixtures/expressivecss-skill-evals/consumer/src/index.html', 'skills/expressivecss/assets/examples/settings.html', 'dist/css/expressive.css']) await save(root, relative, relative);
  return root;
};
const collect = (repositoryRoot, options = {}) => collectEvaluationProvenance({ repositoryRoot, protocol: 'test-evaluation-v1', plan: { cases: ['form-action'], repetitions: 1 }, modelSettings: { model: 'test-model' }, ...options });

test('provenance fingerprints fixture sources, built assets, grader sources, locks and runtime settings separately', async (t) => {
  const root = await fakeRepository(t);
  const original = await collect(root);
  assertSameProvenance(original, await collect(root));
  assert.equal(original.graderInputs['mcp/expressivecss/node_modules/@modelcontextprotocol/sdk/package.json'], null);
  for (const relative of ['tests/fixtures/expressivecss-skill-evals/consumer/src/index.html', 'skills/expressivecss/assets/examples/settings.html', 'dist/css/expressive.css']) {
    await save(root, relative, 'changed');
    const changed = await collect(root);
    assert.notEqual(changed.fixtureHash, original.fixtureHash, relative);
    assert.equal(changed.graderHash, original.graderHash, relative);
    assert.throws(() => assertSameProvenance(original, changed), /provenance/);
    await save(root, relative, relative);
  }
  for (const relative of ['scripts/expressivecss-eval-browser.mjs', 'scripts/lib/bounded-file.mjs', 'scripts/lib/consumer-browser.mjs', 'scripts/expressivecss-codex-adapter.mjs', 'package-lock.json', 'mcp/expressivecss/package-lock.json']) {
    await save(root, relative, 'changed');
    const changed = await collect(root);
    assert.notEqual(changed.graderHash, original.graderHash, relative);
    assert.equal(changed.fixtureHash, original.fixtureHash, relative);
    await save(root, relative, relative);
  }
  assert.notEqual((await collect(root, { modelSettings: { model: 'another-model' } })).hash, original.hash);
  assert.notEqual((await collect(root, { plan: { cases: ['another-task'] } })).hash, original.hash);
  await save(root, 'scripts/natural-discovery.mjs', 'first');
  const extra = await collect(root, { extraFiles: ['scripts/natural-discovery.mjs'] });
  await save(root, 'scripts/natural-discovery.mjs', 'changed');
  assert.notEqual((await collect(root, { extraFiles: ['scripts/natural-discovery.mjs'] })).graderHash, extra.graderHash);
  await save(root, 'node_modules/playwright-core/browsers.json', '{"revision":"changed"}');
  assert.notEqual((await collect(root)).graderHash, original.graderHash);
});

test('provenance rejects unsafe source paths, source symlinks and fabricated fingerprints', async (t) => {
  const root = await fakeRepository(t);
  await assert.rejects(collect(root, { extraFiles: ['../outside'] }), /source path/);
  const original = await collect(root);
  assert.throws(() => assertSameProvenance(original, { ...original, fixtureHash: `sha256:${'0'.repeat(64)}` }), /provenance/);
  assert.throws(() => assertSameProvenance(original, null), /provenance/);
  const source = path.join(root, 'scripts/expressivecss-eval-browser.mjs');
  await rm(source);
  await symlink(path.join(root, 'package.json'), source);
  await assert.rejects(collect(root), /symbolic|symlink|link|ELOOP/i);
});

async function archive(t) {
  const root = await fakeRepository(t);
  const output = path.join(root, 'archive');
  const provenance = await collect(root);
  const expectedRows = ['old_skill', 'with_skill'].map((configuration) => ({ eval_name: 'form-action', eval_id: 1, configuration, run_number: 1, skillHash: `sha256:${'a'.repeat(64)}`, prompt: 'Add a button.' }));
  const rows = expectedRows.map(({ prompt, ...row }) => ({ ...row, provenance, runMetadata: { skillHash: row.skillHash, completedTurns: 1, infrastructureError: null }, result: { pass_rate: 1 }, expectations: [{ text: 'Task completed', passed: true, evidence: 'Observed output' }] }));
  await save(output, 'provenance.json', provenance);
  await save(output, 'eval-form-action/eval_metadata.json', { eval_id: 1, eval_name: 'form-action', prompt: 'Add a button.', provenance });
  for (const row of rows) {
    const directory = `eval-form-action/${row.configuration}/run-1`;
    await save(output, `${directory}/grading.json`, { summary: row.result, expectations: row.expectations, provenance });
    await save(output, `${directory}/outputs/response.json`, { candidateResponse: { summary: 'Completed task' }, runMetadata: row.runMetadata });
    await save(output, `${directory}/outputs/transcript.json`, [{ type: 'turn.completed' }]);
  }
  await save(output, 'results.json', rows);
  return { root, output, provenance, expectedRows, rows };
}

test('validated resume accepts matching complete and initially empty archives', async (t) => {
  const state = await archive(t);
  assert.deepEqual(await validateRetainedResults(state), state.rows);
  await rm(path.join(state.output, 'eval-form-action/with_skill'), { recursive: true });
  await save(state.output, 'results.json', [state.rows[0]]);
  assert.deepEqual(await validateRetainedResults(state), [state.rows[0]]);
  await rm(path.join(state.output, 'eval-form-action/old_skill'), { recursive: true });
  await rm(path.join(state.output, 'results.json'));
  assert.deepEqual(await validateRetainedResults(state), []);
});

test('resume refuses incompatible or incomplete archives without changing retained artifacts', async (t) => {
  const mutations = {
    'legacy manifest': async (s) => rm(path.join(s.output, 'provenance.json')),
    'legacy row': async (s) => { delete s.rows[1].provenance; },
    'wrong implementation': async (s) => { s.rows[1].provenance = await collect(s.root, { modelSettings: { model: 'different' } }); },
    'duplicate row': async (s) => { s.rows[1] = s.rows[0]; },
    'unexpected row': async (s) => { s.rows[1].eval_name = 'another-case'; },
    'wrong skill': async (s) => { s.rows[1].runMetadata.skillHash = `sha256:${'b'.repeat(64)}`; },
    'wrong row prompt': async (s) => { s.rows[1].prompt = 'Different task'; },
    'wrong row id': async (s) => { s.rows[1].eval_id = 2; },
    'wrong run type': async (s) => { s.rows[1].run_number = '1'; },
    'wrong metadata prompt': async (s) => save(s.output, 'eval-form-action/eval_metadata.json', { eval_name: 'form-action', eval_id: 1, prompt: 'Different task', provenance: s.provenance }),
    'missing metadata': async (s) => rm(path.join(s.output, 'eval-form-action/eval_metadata.json')),
    'unexpected metadata': async (s) => save(s.output, 'eval-unexpected/eval_metadata.json', {}),
    'orphan attempt': async (s) => save(s.output, 'eval-form-action/with_skill/run-2/outputs/evidence.json', 'keep this'),
    'missing attempt': async (s) => rm(path.join(s.output, 'eval-form-action/with_skill/run-1'), { recursive: true }),
    'empty attempt': async (s) => { const run = path.join(s.output, 'eval-form-action/with_skill/run-1'); await rm(run, { recursive: true }); await mkdir(run); },
    'missing grading': async (s) => rm(path.join(s.output, 'eval-form-action/with_skill/run-1/grading.json')),
    'malformed grading': async (s) => save(s.output, 'eval-form-action/with_skill/run-1/grading.json', '{'),
    'contradictory summary': async (s) => save(s.output, 'eval-form-action/with_skill/run-1/grading.json', { summary: { pass_rate: 0 }, expectations: s.rows[1].expectations, provenance: s.provenance }),
    'contradictory expectations': async (s) => save(s.output, 'eval-form-action/with_skill/run-1/grading.json', { summary: s.rows[1].result, expectations: [], provenance: s.provenance }),
    'missing grading provenance': async (s) => save(s.output, 'eval-form-action/with_skill/run-1/grading.json', { summary: s.rows[1].result, expectations: s.rows[1].expectations }),
    'missing response': async (s) => rm(path.join(s.output, 'eval-form-action/with_skill/run-1/outputs/response.json')),
    'malformed response': async (s) => save(s.output, 'eval-form-action/with_skill/run-1/outputs/response.json', 'null'),
    'wrong response skill': async (s) => save(s.output, 'eval-form-action/with_skill/run-1/outputs/response.json', { candidateResponse: {}, runMetadata: { skillHash: `sha256:${'b'.repeat(64)}` } }),
    'missing transcript': async (s) => rm(path.join(s.output, 'eval-form-action/with_skill/run-1/outputs/transcript.json')),
    'malformed transcript': async (s) => save(s.output, 'eval-form-action/with_skill/run-1/outputs/transcript.json', '{'),
    'wrong transcript shape': async (s) => save(s.output, 'eval-form-action/with_skill/run-1/outputs/transcript.json', {}),
    'empty completed transcript': async (s) => save(s.output, 'eval-form-action/with_skill/run-1/outputs/transcript.json', []),
    'wrong transcript completion count': async (s) => save(s.output, 'eval-form-action/with_skill/run-1/outputs/transcript.json', [{ type: 'turn.completed' }, { type: 'turn.completed' }]),
    'wrong response completion count': async (s) => save(s.output, 'eval-form-action/with_skill/run-1/outputs/response.json', { candidateResponse: {}, runMetadata: { ...s.rows[1].runMetadata, completedTurns: 0 } }),
    'wrong response infrastructure error': async (s) => save(s.output, 'eval-form-action/with_skill/run-1/outputs/response.json', { candidateResponse: {}, runMetadata: { ...s.rows[1].runMetadata, infrastructureError: 'A failure' } }),
  };
  for (const [name, mutate] of Object.entries(mutations)) await t.test(name, async (st) => {
    const state = await archive(st);
    await mutate(state);
    await save(state.output, 'results.json', state.rows);
    const before = await hashProject(state.output);
    await assert.rejects(validateRetainedResults(state));
    assert.equal(await hashProject(state.output), before);
  });
});

test('adapter launch failures may retain an empty transcript with explicit failure metadata', async (t) => {
  const state = await archive(t);
  for (const row of state.rows) {
    row.runMetadata.completedTurns = 0;
    row.runMetadata.infrastructureError = 'CLI launch failed';
    row.result = { pass_rate: 0 };
    row.expectations = [{ text: 'Execution completed', passed: false, evidence: 'CLI launch failed' }];
    const directory = `eval-form-action/${row.configuration}/run-1`;
    await save(state.output, `${directory}/grading.json`, { summary: row.result, expectations: row.expectations, provenance: state.provenance });
    await save(state.output, `${directory}/outputs/response.json`, { candidateResponse: { summary: '' }, runMetadata: row.runMetadata });
    await save(state.output, `${directory}/outputs/transcript.json`, []);
  }
  await save(state.output, 'results.json', state.rows);
  assert.deepEqual(await validateRetainedResults(state), state.rows);
});

test('infrastructure-only archives require recorded failure evidence and matching grading', async (t) => {
  const state = await archive(t);
  for (const row of state.rows) {
    delete row.runMetadata;
    row.result = { pass_rate: 0 };
    row.infrastructureError = 'Fixture failed';
    row.expectations = [{ text: 'Infrastructure completed', passed: false, evidence: 'Fixture failed' }];
    const directory = `eval-form-action/${row.configuration}/run-1`;
    await rm(path.join(state.output, directory, 'outputs'), { recursive: true });
    await save(state.output, `${directory}/grading.json`, { summary: row.result, expectations: row.expectations, provenance: state.provenance });
    await save(state.output, `${directory}/outputs/infrastructure-error.json`, { error: 'Fixture failed' });
  }
  await save(state.output, 'results.json', state.rows);
  assert.deepEqual(await validateRetainedResults(state), state.rows);
  for (const invalid of ['{}', '{', '{"error":"Different failure"}']) {
    await save(state.output, 'eval-form-action/with_skill/run-1/outputs/infrastructure-error.json', invalid);
    const before = await hashProject(state.output);
    await assert.rejects(validateRetainedResults(state));
    assert.equal(await hashProject(state.output), before);
  }
  await rm(path.join(state.output, 'eval-form-action/with_skill/run-1/outputs/infrastructure-error.json'));
  const before = await hashProject(state.output);
  await assert.rejects(validateRetainedResults(state));
  assert.equal(await hashProject(state.output), before);
});

test('benchmark rejects a legacy resume before writing metadata or starting a run', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'expressivecss-legacy-resume-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await save(root, 'results.json', [{ eval_name: 'form-action', configuration: 'old_skill', run_number: 1 }]);
  await save(root, 'eval-form-action/eval_metadata.json', { prompt: 'Original retained prompt' });
  const before = await hashProject(root);
  const skill = path.resolve('skills/expressivecss');
  await assert.rejects(runBenchmark({ baseline: skill, candidate: skill, output: root, repetitions: 1, caseName: 'form-action', resume: true }), /ENOENT|provenance/);
  assert.equal(await hashProject(root), before);
  assert.equal(JSON.parse(await readFile(path.join(root, 'eval-form-action/eval_metadata.json'), 'utf8')).prompt, 'Original retained prompt');
});
