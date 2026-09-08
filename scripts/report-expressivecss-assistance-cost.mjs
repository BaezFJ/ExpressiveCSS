#!/usr/bin/env node
// Operator evidence only. Candidate verification claims never establish acceptance.
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { snapshotProject } from './expressivecss-codex-adapter.mjs';
import { assertSameProvenance, validateRetainedResults } from './expressivecss-eval-provenance.mjs';
import { readBoundedRegularFile } from './eval-expressivecss-skill.mjs';
import { statistics } from './benchmark-expressivecss-skill.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const save = (filename, value) => writeFile(filename, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const readJson = async filename => JSON.parse(await readBoundedRegularFile(filename, 16 * 1024 * 1024, 'operator cost evidence'));
const runId = row => `eval-${row.eval_name}-${row.configuration}-run-${row.run_number}`;
const attemptHash = row => sha256(JSON.stringify(row));
const number = value => Number.isFinite(value) && value >= 0;
const sum = values => values.length && values.every(number) ? values.reduce((a, b) => a + b, 0) : null;
const eligible = row => row.result?.failed === 0 && row.result?.total > 0 && row.expectations?.length === row.result.total
  && row.expectations.every(check => check.passed === true) && !row.runMetadata?.infrastructureError
  && !row.retentionErrors?.length && !row.browserRetentionError && !row.browserCleanupError;

export function reviewTemplate(rows) {
  return { instructions: 'Operator only. Review the exact retained output in Skill Creator. Set decision, reviewer, reviewedAt, correctionRequests, reviewSeconds and notes. Accepted means this unchanged output needs zero corrections and passes automated checks. Missing review time stays null. Corrected outputs require a new measured attempt; this report does not infer their cost.',
    reviews: rows.map(row => ({ run_id: runId(row), attemptHash: attemptHash(row), decision: 'pending', reviewer: null,
      reviewedAt: null, correctionRequests: null, reviewSeconds: null, notes: '' })) };
}

export function costReport(rows, reviews = []) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 2000 || !Array.isArray(reviews) || reviews.length > rows.length) throw new Error('Invalid cost records');
  const ids = new Set(rows.map(runId));
  if (ids.size !== rows.length) throw new Error('Duplicate attempts');
  const seen = new Set();
  for (const review of reviews) {
    const row = rows.find(item => runId(item) === review?.run_id);
    if (!row || seen.has(review.run_id) || review.attemptHash !== attemptHash(row)) throw new Error('Unknown, duplicate or stale review');
    seen.add(review.run_id);
    if (!['pending', 'accepted', 'needs-correction', 'rejected'].includes(review.decision)) throw new Error('Invalid review decision');
    if (review.decision === 'pending') {
      if (['reviewer', 'reviewedAt', 'correctionRequests', 'reviewSeconds'].some(key => review[key] !== null)) throw new Error('Pending review cannot claim observed effort');
    } else {
      if (typeof review.reviewer !== 'string' || !review.reviewer.trim() || review.reviewer.length > 200
        || typeof review.reviewedAt !== 'string' || !Number.isFinite(Date.parse(review.reviewedAt))
        || !Number.isSafeInteger(review.correctionRequests) || review.correctionRequests < 0 || review.correctionRequests > 1000
        || !(review.reviewSeconds === null || number(review.reviewSeconds))) throw new Error('Review requires operator identity, date and valid effort');
      if (review.decision === 'accepted' && (!eligible(row) || review.correctionRequests !== 0)) throw new Error('Acceptance requires passing checks and an unchanged output needing no corrections');
      if (review.decision === 'needs-correction' && review.correctionRequests === 0) throw new Error('Correction decision requires a request count');
    }
    if (typeof review.notes !== 'string' || review.notes.length > 8000) throw new Error('Invalid review notes');
  }
  const attempts = rows.map(row => ({ run_id: runId(row), attemptHash: attemptHash(row), case: row.eval_name, mode: row.configuration,
    automatedComplete: eligible(row), acceptance: reviews.find(review => review.run_id === runId(row)) ?? reviewTemplate([row]).reviews[0],
    metrics: { agent_seconds: row.result.time_seconds ?? null, operator_elapsed_seconds: row.operator_elapsed_seconds ?? null,
      input_tokens: row.runMetadata?.usage?.input_tokens ?? null, cached_input_tokens: row.runMetadata?.usage?.cached_input_tokens ?? null,
      output_tokens: row.runMetadata?.usage?.output_tokens ?? null, tool_calls: row.runMetadata?.toolCalls ?? null,
      tool_failures: row.runMetadata?.toolFailures ?? null },
    mcp_calls: row.runMetadata?.mcpCalls ?? null, guide_reads: row.runMetadata?.observedGuideReads ?? null }));
  const groups = {};
  for (const key of new Set(attempts.map(row => `${row.case}/${row.mode}`))) {
    const group = attempts.filter(row => `${row.case}/${row.mode}` === key);
    const accepted = group.filter(row => row.acceptance.decision === 'accepted').length;
    const reviewed = group.every(row => row.acceptance.decision !== 'pending');
    const totals = Object.fromEntries(Object.keys(group[0].metrics).map(metric => [metric, sum(group.map(row => row.metrics[metric]))]));
    const reviewSeconds = sum(group.map(row => row.acceptance.reviewSeconds));
    groups[key] = { attempts: group.length, automated_complete: group.filter(row => row.automatedComplete).length, accepted,
      pending: group.filter(row => row.acceptance.decision === 'pending').length,
      correction_requests: sum(group.map(row => row.acceptance.correctionRequests)), review_seconds: reviewSeconds,
      metrics: Object.fromEntries(Object.keys(totals).map(metric => [metric, { ...statistics(group.map(row => row.metrics[metric])), available: group.filter(row => number(row.metrics[metric])).length }])),
      // Include failed/rejected attempts in the denominator's cost; do not reward survivorship.
      cost_per_accepted_output: Object.fromEntries(Object.entries({ ...totals, review_seconds: reviewSeconds }).map(([metric, total]) => [metric, reviewed && accepted > 0 && total !== null ? total / accepted : null])) };
  }
  return { schemaVersion: 1, status: attempts.every(row => row.acceptance.decision !== 'pending') ? 'reviewed' : 'pending-human-review',
    notes: ['Automated completion is limited to named checks; it does not establish human acceptance.', 'Input includes cached input; do not add cached tokens again. No currency cost is inferred.', 'Cost per accepted output includes all measured attempts in that case/mode and stays unavailable until all are reviewed.', 'Correction requests count operator-requested changes, not completed repair work. Repaired outputs need separately measured attempts.', 'Operator elapsed includes fixture preparation, independent browser checks and cleanup; agent seconds cover the CLI adapter only. Review time is separate.'],
    groups, attempts };
}

export async function exportAssistanceEvidence({ source, output, reviews = null }) {
  source = path.resolve(source); output = path.resolve(output);
  if (output === source || output.startsWith(source + path.sep)) throw new Error('Archive must be outside source');
  const snapshot = await snapshotProject(source);
  const provenance = await readJson(path.join(source, 'provenance.json'));
  assertSameProvenance(provenance, provenance);
  if (provenance.protocol !== 'assistance-cost-v1') throw new Error('Expected an assistance cost comparison');
  const plan = provenance.plan;
  const expectedRows = plan.cases.flatMap(testCase => plan.modes.flatMap(configuration => Array.from({ length: plan.repetitions }, (_, index) => ({
    eval_name: testCase.name, configuration, run_number: index + 1, skillHash: plan.skillHashes[configuration], prompt: testCase.request,
  }))));
  const rows = await validateRetainedResults({ output: source, provenance, expectedRows });
  if (rows.length !== expectedRows.length) throw new Error('Retain incomplete runs in place; export requires every planned attempt');
  const reviewInput = reviews ? await readJson(reviews) : reviewTemplate(rows);
  const report = costReport(rows, reviewInput.reviews);
  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(output); // Never overwrite an evidence archive or earlier reviews.
  const staging = await mkdtemp(path.join(tmpdir(), 'expressivecss-evidence-export-'));
  try {
    for (const [relative, entry] of Object.entries(snapshot.manifest)) {
      if (entry.type === 'directory') { await mkdir(path.join(staging, relative), { recursive: true }); continue; }
      const content = await readBoundedRegularFile(path.join(source, relative), 32 * 1024 * 1024, 'evidence archive member', source, null);
      if (sha256(content) !== entry.sha256) throw new Error('Evidence changed during export');
      const target = path.join(staging, relative);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content, { flag: 'wx' });
    }
    if ((await snapshotProject(source)).hash !== snapshot.hash) throw new Error('Evidence changed during export');
    const archive = path.join(output, 'evidence.tar.gz');
    await promisify(execFile)('tar', ['-czf', archive, '-C', staging, '.'], { timeout: 60_000, maxBuffer: 65_536 });
    await save(path.join(output, 'manifest.json'), { schemaVersion: 1, provenanceHash: provenance.hash,
      archive: { path: 'evidence.tar.gz', sha256: sha256(await readFile(archive)) }, sourceHash: snapshot.hash, files: snapshot.manifest });
    await save(path.join(output, 'provenance.json'), provenance);
    await save(path.join(output, 'cost-report.json'), report);
    await save(path.join(output, 'reviews.json'), reviewInput);
  } finally { await rm(staging, { recursive: true, force: true }); }
  return report;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => { const index = arg.indexOf('='); if (index < 0) throw new Error('Use --option=value'); return [arg.slice(2, index), arg.slice(index + 1)]; }));
  if (!args.source || !args.output) throw new Error('--source and --output are required; --reviews is optional');
  const report = await exportAssistanceEvidence(args);
  console.log(JSON.stringify({ output: args.output, status: report.status, attempts: report.attempts.length }));
}
