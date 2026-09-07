#!/usr/bin/env node
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { materializeProjectFixture, readBoundedRegularFile, redactValue } from './eval-expressivecss-skill.mjs';
import { configuredDefaults, hashProject, runCodex } from './expressivecss-codex-adapter.mjs';
import { collectEvaluationProvenance, assertSameProvenance, validateRetainedResults } from './expressivecss-eval-provenance.mjs';
import { prepareReviewOutputs, statistics } from './benchmark-expressivecss-skill.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOGUE = 'tests/fixtures/expressivecss-skill-evals/natural-discovery.json';
const save = async (file, value, flag = 'w') => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { flag }); };

export function validateNaturalCatalogue(catalogue) {
  const ids = new Set();
  for (const split of ['development', 'heldout']) {
    const rows = catalogue?.[split];
    if (!Array.isArray(rows) || rows.length < 2 || rows.length > 20) throw new Error('Each discovery split requires 2–20 cases');
    for (const row of rows) {
      if (!/^[a-z][a-z0-9-]{1,60}$/.test(row.id) || ids.has(row.id) || row.split !== split
          || !['consumer-current', 'consumer-empty'].includes(row.fixture) || typeof row.should_trigger !== 'boolean'
          || typeof row.readOnly !== 'boolean' || typeof row.request !== 'string' || !row.request.trim() || row.request.length > 4000) throw new Error('Invalid natural discovery case');
      ids.add(row.id);
      const files = Object.entries(row.files ?? {});
      if (files.length > 8 || files.some(([file, content]) => !/^(?:src\/)?[a-zA-Z0-9_-]+\.(?:txt|md|js|css|html)$/.test(file) || typeof content !== 'string' || content.length > 16000)) throw new Error('Invalid discovery fixture file');
    }
    if (!rows.some((row) => row.should_trigger) || !rows.some((row) => !row.should_trigger)) throw new Error('Each split requires positive and negative cases');
  }
  return catalogue;
}

export function gradeNaturalDiscovery(testCase, envelope) {
  const completed = !envelope.runMetadata?.infrastructureError && envelope.runMetadata?.completedTurns > 0;
  const reads = envelope.runMetadata?.observedGuideReads;
  const rootRead = Array.isArray(reads) ? reads.includes('skills/expressivecss/SKILL.md') : null;
  const files = envelope.executionEvidence?.filesystem;
  const noEdit = testCase.readOnly ? Boolean(files?.independentlyComputed && files.before && files.before === files.after) : null;
  return { rootRead, expectedRead: testCase.should_trigger, completed, noEdit,
    invocationStatus: rootRead === true ? 'observed-complete-read' : 'unverified',
    rootExposureMatch: completed && rootRead !== null ? rootRead === testCase.should_trigger : null,
    expectations: [
      { text: 'Candidate execution completed', passed: completed, evidence: envelope.runMetadata?.infrastructureError ?? 'Completed turn; task quality requires review.' },
      { text: 'Complete-root-output proxy matches the reviewed scope', passed: completed && rootRead !== null && rootRead === testCase.should_trigger, evidence: `Expected ${testCase.should_trigger}; observed complete root text ${rootRead}. This proxy is not actual invocation accuracy. Without complete text, invocation remains unverified; missing telemetry receives no credit.` },
      ...(testCase.readOnly ? [{ text: 'No-edit request preserves project files', passed: noEdit, evidence: 'Compared independent project digests.' }] : []),
    ] };
}

export async function runNaturalDiscovery({ baseline, candidate = path.join(ROOT, 'skills/expressivecss'), output, split = 'development', manifest, freeze = false, resume = false, timeoutMs = 180000, executable = 'codex', configPath } = {}) {
  if (!baseline || !output || !['development', 'heldout'].includes(split)) throw new Error('Supply baseline, output and a valid split');
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 600000) throw new Error('Invalid discovery timeout');
  const catalogue = validateNaturalCatalogue(JSON.parse(await readBoundedRegularFile(path.join(ROOT, CATALOGUE), 131072, 'discovery catalogue')));
  const versions = { with_skill: path.resolve(candidate), old_skill: path.resolve(baseline) };
  const hashes = Object.fromEntries(await Promise.all(Object.entries(versions).map(async ([key, directory]) => [key, await hashProject(directory)])));
  const collect = async () => collectEvaluationProvenance({ repositoryRoot: ROOT, protocol: 'natural-discovery-v1', plan: { catalogue, hashes, timeoutMs, executable }, modelSettings: await configuredDefaults(configPath), extraFiles: ['scripts/eval-expressivecss-natural-discovery.mjs'] });
  const provenance = await collect();
  if (freeze) { await save(path.join(output, 'frozen-protocol.json'), provenance, 'wx'); return provenance; }
  if (!manifest) throw new Error('Freeze the complete protocol before running either split; supply --manifest');
  assertSameProvenance(JSON.parse(await readBoundedRegularFile(manifest, 1048576, 'frozen discovery protocol')), provenance);
  const definitions = catalogue[split];
  const expectedRows = definitions.flatMap((row, index) => Object.keys(versions).map((configuration) => ({ eval_name: row.id, configuration, run_number: 1, skillHash: hashes[configuration], prompt: row.request, eval_id: index + 1 })));
  const previous = resume ? await validateRetainedResults({ output, provenance, expectedRows }) : [];
  if (!resume) {
    if ((await readdir(output).catch((error) => { if (error.code === 'ENOENT') return []; throw error; })).length) throw new Error('Use a fresh output directory or resume');
    await save(path.join(output, 'provenance.json'), provenance, 'wx');
    for (const [index, row] of definitions.entries()) await save(path.join(output, `eval-${row.id}`, 'eval_metadata.json'), { eval_id: index + 1, eval_name: row.id, prompt: row.request, split, provenance, assertions: [] });
  }
  const results = [...previous];
  for (const [index, row] of definitions.entries()) {
    assertSameProvenance(provenance, await collect());
    for (const [configuration, directory] of Object.entries(versions)) if (await hashProject(directory) !== hashes[configuration]) throw new Error('Skill changed after protocol freeze');
    const configurations = index % 2 ? ['old_skill', 'with_skill'] : ['with_skill', 'old_skill'];
    const pair = await Promise.all(configurations.filter((configuration) => !results.some((result) => result.eval_name === row.id && result.configuration === configuration)).map(async (configuration) => {
      const runDirectory = path.join(output, `eval-${row.id}`, configuration, 'run-1'), artifacts = path.join(runDirectory, 'outputs');
      let root, record;
      try {
        root = await materializeProjectFixture(row.fixture, ROOT);
        for (const [file, content] of Object.entries(row.files ?? {})) await writeFile(path.join(root, file), content, { flag: 'wx' });
        const skillRoot = path.join(root, '.agents/skills/expressivecss');
        await cp(versions[configuration], skillRoot, { recursive: true });
        // discovery:true supplies exactly the ordinary request, without root content,
        // applicability questions, expected labels, or an evaluation response schema.
        const envelope = await runCodex({ task: { id: row.id, request: row.request }, projectRoot: root, skillRoot, discovery: true, readOnly: row.readOnly, artifactDirectory: artifacts }, { executable, timeoutMs, configPath });
        const assessment = gradeNaturalDiscovery(row, envelope), usage = envelope.runMetadata.usage;
        const passed = assessment.expectations.filter((item) => item.passed).length;
        record = { eval_id: index + 1, eval_name: row.id, configuration, run_number: 1, split, provenance, ...assessment,
          result: { passed, failed: assessment.expectations.length - passed, total: assessment.expectations.length, pass_rate: passed / assessment.expectations.length, time_seconds: envelope.runMetadata.wallTimeMs / 1000, tokens: usage?.input_tokens != null && usage?.output_tokens != null ? usage.input_tokens + usage.output_tokens : null }, runMetadata: redactValue(envelope.runMetadata) };
      } catch (error) {
        record = { eval_id: index + 1, eval_name: row.id, configuration, run_number: 1, split, provenance, skillHash: hashes[configuration], completed: false, rootExposureMatch: null, infrastructureError: redactValue(error.message), expectations: [{ text: 'Discovery infrastructure completed', passed: false, evidence: redactValue(error.message) }], result: { passed: 0, failed: 1, total: 1, pass_rate: 0, time_seconds: null, tokens: null } };
        await save(path.join(artifacts, 'infrastructure-error.json'), { error: redactValue(error.message) });
      } finally {
        if (root) {
          try {
            for (const file of new Set(['src/index.html', 'src/app.css', 'src/app.js', ...Object.keys(row.files ?? {})])) {
              try { const content = await readBoundedRegularFile(path.join(root, file), 1048576, 'discovery review source', root); await mkdir(artifacts, { recursive: true }); await writeFile(path.join(artifacts, `source-${file.replaceAll('/', '-')}.txt`), redactValue(content)); }
              catch (error) { if (error.code !== 'ENOENT') (record.retentionErrors ??= []).push(redactValue(error.message)); }
            }
          } finally { await rm(root, { recursive: true, force: true }); }
        }
      }
      await save(path.join(runDirectory, 'grading.json'), { expectations: record.expectations, summary: record.result, provenance });
      await save(path.join(runDirectory, 'timing.json'), { total_tokens: record.result.tokens, total_duration_seconds: record.result.time_seconds });
      console.log(`${split} ${row.id} ${configuration}: ${record.completed ? record.rootExposureMatch ? 'match' : 'mismatch' : 'infrastructure failure'}`);
      return record;
    }));
    results.push(...pair); await save(path.join(output, 'results.json'), results);
  }
  assertSameProvenance(provenance, await collect());
  for (const [configuration, directory] of Object.entries(versions)) if (await hashProject(directory) !== hashes[configuration]) throw new Error('Skill changed after protocol freeze');
  const run_summary = Object.fromEntries(Object.keys(versions).map((configuration) => [configuration, Object.fromEntries(['pass_rate', 'time_seconds', 'tokens'].map((metric) => [metric, statistics(results.filter((row) => row.configuration === configuration).map((row) => row.result[metric]))]))]));
  const exposure_summary = Object.fromEntries(Object.keys(versions).map((configuration) => [configuration, Object.fromEntries([true, false].map((expected) => {
    const selected = results.filter((row) => row.configuration === configuration && definitions.find((item) => item.id === row.eval_name).should_trigger === expected);
    return [expected ? 'positive' : 'negative', { cases: selected.length, matches: selected.filter((row) => row.rootExposureMatch === true).length, mismatches: selected.filter((row) => row.rootExposureMatch === false).length, unavailable: selected.filter((row) => row.rootExposureMatch == null).length }];
  }))]));
  const benchmark = { metadata: { skill_name: 'expressivecss', protocol: 'natural-discovery-v1', split, provenance, baselineHash: hashes.old_skill, candidateHash: hashes.with_skill, runs_per_configuration: 1 }, runs: results, run_summary, exposure_summary, notes: ['Complete-root-output proxy only, not actual invocation accuracy. Unobserved invocation remains unverified; missing telemetry receives no credit.', 'Task correctness requires independent output review. Invocation is not task completion.', 'Held-out cases were reserved until the protocol and both skills were frozen. Do not tune on held-out outcomes and still call them unseen.'] };
  await save(path.join(output, 'benchmark.json'), benchmark); await prepareReviewOutputs(output); return benchmark;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const args = Object.fromEntries(process.argv.slice(2).map((argument) => { const index = argument.indexOf('='); if (!argument.startsWith('--') || index < 0) throw new Error('Use --option=value'); return [argument.slice(2, index), argument.slice(index + 1)]; }));
  await runNaturalDiscovery({ ...args, freeze: args.freeze === 'true', resume: args.resume === 'true', timeoutMs: args['timeout-ms'] ? Number(args['timeout-ms']) : 180000 });
}
