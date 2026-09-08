import { run } from 'node:test';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { CAPABILITY_INPUT_DIRECTORIES, capabilityEntries, pinDirectory, sha256, validateCapabilities } from './lib/material-capabilities.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOGUE = path.join(ROOT, 'docs/src/data/component-decisions.json');
const FILES = ['package.json', 'package-lock.json', 'semantics.json'];

async function inputPins() {
  const pins = [];
  for (const directory of CAPABILITY_INPUT_DIRECTORIES) pins.push(...await pinDirectory(ROOT, directory));
  for (const name of FILES) pins.push({ path: name, sha256: sha256(await readFile(path.join(ROOT, name))) });
  return pins;
}

export function recordedTestEvent(event, root = ROOT) {
  if (!['test:pass', 'test:fail'].includes(event.type) || event.data.details?.type === 'suite') return null;
  const data = event.data;
  if (!data.file) return null;
  return { file: path.relative(root, data.file).split(path.sep).join('/'), name: data.name,
    status: data.skip ? 'skipped' : event.type === 'test:pass' ? 'passed' : 'failed',
    durationMs: data.details?.duration_ms ?? null,
    ...(data.details?.error ? { errorCode: data.details.error.code ?? 'unavailable', failureType: data.details.error.failureType ?? 'unavailable' } : {}) };
}

async function main() {
  const { values } = parseArgs({ options: { record: { type: 'boolean', default: false }, output: { type: 'string', default: '.cache/material-capabilities' } } });
  const original = await readFile(CATALOGUE, 'utf8');
  const data = JSON.parse(original);
  validateCapabilities(data);
  const files = [...new Set(capabilityEntries(data).flatMap((entry) => entry.capabilityReview.browserChecks.map((check) => check.file)))].sort();
  await mkdir(values.output, { recursive: true });
  const directory = await mkdtemp(path.join(path.resolve(values.output), 'run-'));
  const report = { collector: 'scripts/record-capability-evidence.mjs', recordedOn: new Date().toISOString().slice(0, 10),
    engine: 'chromium', engineVersion: null, nodeVersion: process.version, status: 'blocked', files, inputs: await inputPins(), results: [] };
  report.directories = CAPABILITY_INPUT_DIRECTORIES.map((directory) => ({ path: directory, sha256: sha256(JSON.stringify(report.inputs.filter((pin) => pin.path.startsWith(`${directory}/`)))) }));
  let browser, timer;
  try {
    browser = await chromium.launch({ headless: true, timeout: 8000 });
    report.engineVersion = browser.version();
    await browser.close(); browser = null;
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), 300_000);
    for await (const event of run({ files: files.map((name) => path.join(ROOT, name)), concurrency: 1, signal: controller.signal })) {
      const result = recordedTestEvent(event);
      if (result) report.results.push(result);
      if (report.results.length > 1000) throw new Error('Capability result limit exceeded');
    }
    const unchanged = JSON.stringify(report.inputs) === JSON.stringify(await inputPins()) && original === await readFile(CATALOGUE, 'utf8');
    const complete = capabilityEntries(data).every((entry) => entry.capabilityReview.browserChecks.every((check) => report.results.some((result) => result.file === check.file && result.name === check.name)));
    report.status = !complete || !unchanged || controller.signal.aborted || report.results.length === 0 ? 'blocked' : report.results.some((result) => result.status === 'failed') ? 'failed' : report.results.some((result) => result.status === 'skipped') ? 'blocked' : 'passed';
    report.inputsUnchanged = unchanged;
  } catch (error) { report.error = error.code ?? error.name; }
  finally { clearTimeout(timer); await browser?.close(); }
  const serialized = JSON.stringify(report, null, 2) + '\n';
  await writeFile(path.join(directory, 'report.json'), serialized, { flag: 'wx', mode: 0o600 });
  if (values.record) {
    if (original !== await readFile(CATALOGUE, 'utf8')) throw new Error('Catalogue changed during collection; report retained, record not replaced');
    data.capabilityBrowserEvidence = { ...report, reportSha256: sha256(serialized) };
    await writeFile(CATALOGUE, JSON.stringify(data, null, 2) + '\n');
  }
  console.log(JSON.stringify({ status: report.status, results: report.results.length, report: path.join(directory, 'report.json'), recorded: values.record }));
  process.exitCode = report.status === 'passed' ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
