import { createHash } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { hashProject } from './expressivecss-codex-adapter.mjs';
import { readBoundedRegularFile } from './eval-expressivecss-skill.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const EVALUATION_SOURCE_FILES = Object.freeze([
  'scripts/eval-expressivecss-skill.mjs', 'scripts/benchmark-expressivecss-skill.mjs',
  'scripts/expressivecss-codex-adapter.mjs', 'scripts/expressivecss-eval-browser.mjs',
  'scripts/expressivecss-material-quality.mjs',
  'scripts/lib/bounded-file.mjs', 'scripts/lib/consumer-browser.mjs',
  'scripts/expressivecss-interface-quality.mjs', 'scripts/expressivecss-eval-provenance.mjs',
  'scripts/report-expressivecss-assistance-cost.mjs',
  'skills/expressivecss/references/contract.json', 'package.json', 'package-lock.json',
  'mcp/expressivecss/package.json', 'mcp/expressivecss/package-lock.json',
  'mcp/expressivecss/server.js', 'mcp/expressivecss/scripts/resolve-version.mjs',
  'mcp/expressivecss/component-guides.json', 'mcp/expressivecss/component-decisions.json',
  'mcp/expressivecss/capability-roadmap.json', 'mcp/expressivecss/contract.json', 'mcp/expressivecss/semantics-data.json',
]);
const INSTALLED_FILES = [
  'node_modules/@playwright/test/package.json', 'node_modules/playwright-core/package.json',
  'node_modules/playwright-core/browsers.json', 'node_modules/jsdom/package.json',
  'node_modules/smol-toml/package.json', 'mcp/expressivecss/node_modules/@modelcontextprotocol/sdk/package.json',
];
const digest = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const fingerprint = (value) => digest(JSON.stringify(value));
const validHash = (value) => typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value);
const safeName = (value) => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,127}$/.test(value);

/** Hash inputs, never credentials or unrelated configuration. Missing optional packages stay unavailable. */
export async function collectEvaluationProvenance({ repositoryRoot = ROOT, protocol, plan, modelSettings = null, extraFiles = [] }) {
  if (!safeName(protocol) || !plan || typeof plan !== 'object' || extraFiles.length > 32) throw new Error('Invalid evaluation provenance plan');
  const files = [...new Set([...EVALUATION_SOURCE_FILES, ...extraFiles])].sort();
  const fileHashes = {};
  for (const relative of [...files, ...INSTALLED_FILES]) {
    if (typeof relative !== 'string' || path.isAbsolute(relative) || relative.split(/[\\/]/).some((segment) => segment === '..')) throw new Error('Invalid provenance source path');
    try { fileHashes[relative] = digest(await readBoundedRegularFile(path.join(repositoryRoot, relative), 16 * 1024 * 1024, 'evaluation provenance source', repositoryRoot, null)); }
    catch (error) { if (error.code === 'ENOENT' && INSTALLED_FILES.includes(relative)) fileHashes[relative] = null; else throw error; }
  }
  const fixtureInputs = {
    sourceTree: await hashProject(path.join(repositoryRoot, 'tests/fixtures/expressivecss-skill-evals')),
    examples: await hashProject(path.join(repositoryRoot, 'skills/expressivecss/assets/examples')),
    builtDistribution: await hashProject(path.join(repositoryRoot, 'dist')),
    package: fileHashes['package.json'],
  };
  const value = { schemaVersion: 1, protocol, fixtureHash: fingerprint(fixtureInputs), graderHash: fingerprint(fileHashes),
    fixtureInputs, graderInputs: fileHashes,
    runtime: { node: process.version, platform: process.platform, architecture: process.arch, modelSettings },
    plan: structuredClone(plan),
    limits: 'Installed package manifests and expected browser revision are hashed; external service state and the actual Codex/browser binaries are not fingerprinted.',
  };
  return { ...value, hash: fingerprint(value) };
}

export function assertSameProvenance(expected, actual) {
  const { hash, ...fields } = actual && typeof actual === 'object' && !Array.isArray(actual) ? actual : {};
  if (!validHash(hash) || fingerprint(fields) !== hash || !isDeepStrictEqual(expected, actual)) throw new Error('Evaluation provenance is missing or changed; use a new output directory');
}

const readJson = async (output, relative, limit = 16 * 1024 * 1024) => JSON.parse(await readBoundedRegularFile(path.join(output, relative), limit, 'retained evaluation evidence', output));
const rowKey = (row) => `${row.eval_name}/${row.configuration}/${row.run_number}`;
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Validate the entire archive before callers write metadata or start any resumed work. */
export async function validateRetainedResults({ output, provenance, expectedRows }) {
  if (!Array.isArray(expectedRows) || !expectedRows.length || expectedRows.length > 2000) throw new Error('Invalid expected evaluation rows');
  const expected = new Map();
  for (const row of expectedRows) {
    if (!safeName(row.eval_name) || !safeName(row.configuration) || !Number.isSafeInteger(row.run_number) || row.run_number < 1 || !(validHash(row.skillHash) || (row.configuration === 'mcp_only' && row.skillHash === null)) || typeof row.prompt !== 'string' || expected.has(rowKey(row))) throw new Error('Invalid or duplicate expected evaluation row');
    expected.set(rowKey(row), row);
  }
  assertSameProvenance(provenance, await readJson(output, 'provenance.json', 1024 * 1024));
  let previous;
  try { previous = await readJson(output, 'results.json'); }
  catch (error) { if (error.code === 'ENOENT') previous = []; else throw error; }
  if (!Array.isArray(previous) || previous.length > expected.size) throw new Error('Invalid retained evaluation results');
  const seen = new Set();
  for (const row of previous) {
    const key = row && rowKey(row), target = expected.get(key);
    if (!target || row.run_number !== target.run_number || seen.has(key)) throw new Error('Duplicate or unexpected retained evaluation row');
    seen.add(key);
    assertSameProvenance(provenance, row.provenance);
    const skillHash = row.runMetadata?.skillHash ?? row.skillHash;
    if (skillHash !== target.skillHash || (row.skillHash !== undefined && row.skillHash !== target.skillHash)
        || (target.eval_id !== undefined && row.eval_id !== target.eval_id)
        || (row.prompt !== undefined && row.prompt !== target.prompt)) throw new Error('Retained evaluation skill or prompt does not match');
    const directory = `eval-${row.eval_name}/${row.configuration}/run-${row.run_number}`;
    const grading = await readJson(output, `${directory}/grading.json`);
    if (!object(grading) || !object(row.result) || !Array.isArray(row.expectations)
        || !isDeepStrictEqual(grading.summary, row.result) || !isDeepStrictEqual(grading.expectations, row.expectations)) throw new Error('Retained grading does not match the result row');
    assertSameProvenance(provenance, grading.provenance);
    if (row.runMetadata !== undefined) {
      const response = await readJson(output, `${directory}/outputs/response.json`);
      const transcript = await readJson(output, `${directory}/outputs/transcript.json`);
      if (!object(row.runMetadata) || !object(response) || !object(response.candidateResponse) || !object(response.runMetadata)
          || response.runMetadata.skillHash !== target.skillHash || !Array.isArray(transcript) || !transcript.every(object)) throw new Error('Retained adapter evidence is invalid or does not match the skill');
      const completedTurns = row.runMetadata.completedTurns;
      if (!Number.isSafeInteger(completedTurns) || completedTurns < 0 || response.runMetadata.completedTurns !== completedTurns
          || transcript.filter((event) => event.type === 'turn.completed').length !== completedTurns
          || response.runMetadata.infrastructureError !== row.runMetadata.infrastructureError
          || (completedTurns === 0 && !row.runMetadata.infrastructureError)) throw new Error('Retained transcript completion evidence does not match the result row');
    } else {
      const failure = await readJson(output, `${directory}/outputs/infrastructure-error.json`, 1024 * 1024);
      if (!object(failure) || typeof failure.error !== 'string' || !failure.error.trim() || row.result.pass_rate !== 0
          || (row.infrastructureError !== undefined && row.infrastructureError !== failure.error)) throw new Error('Retained infrastructure failure evidence is invalid');
    }
  }
  const cases = new Map(expectedRows.map((row) => [row.eval_name, row]));
  for (const [name, row] of cases) {
    const metadata = await readJson(output, `eval-${name}/eval_metadata.json`, 1024 * 1024);
    assertSameProvenance(provenance, metadata.provenance);
    if (metadata.eval_name !== name || metadata.prompt !== row.prompt || (row.eval_id !== undefined && metadata.eval_id !== row.eval_id)) throw new Error('Retained evaluation metadata does not match');
  }
  // Incomplete attempt directories cannot be silently overwritten during resume.
  const archived = new Set();
  for (const directory of await readdir(output, { withFileTypes: true })) {
    if (!directory.name.startsWith('eval-')) continue;
    const name = directory.name.slice(5);
    if (!directory.isDirectory() || !cases.has(name)) throw new Error('Unexpected retained evaluation directory');
    for (const configuration of await readdir(path.join(output, directory.name), { withFileTypes: true })) {
      if (configuration.name === 'eval_metadata.json') continue;
      if (!configuration.isDirectory() || !expectedRows.some((row) => row.eval_name === name && row.configuration === configuration.name)) throw new Error('Unexpected retained evaluation configuration');
      for (const run of await readdir(path.join(output, directory.name, configuration.name), { withFileTypes: true })) {
        const key = `${name}/${configuration.name}/${Number(run.name.slice(4))}`;
        if (!run.isDirectory() || !/^run-[1-9]\d*$/.test(run.name) || !seen.has(key)) throw new Error('Incomplete or unexpected attempt artifacts; use a new output directory');
        archived.add(key);
      }
    }
  }
  if (archived.size !== seen.size) throw new Error('Retained evaluation attempt artifacts are missing');
  return previous;
}
