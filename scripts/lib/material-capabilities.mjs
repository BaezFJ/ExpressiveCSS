import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { readdir } from 'node:fs/promises';
import { readBoundedRegularFile } from './bounded-file.mjs';

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const CAPABILITY_INPUT_DIRECTORIES = ['src', 'tests', 'dist', 'skills/expressivecss/assets/examples', 'scripts'];
export const capabilityEntries = (data) => [...data.components, ...(data.foundations ?? [])];
const safePath = (value) => typeof value === 'string' && /^(src|tests|scripts|skills|dist)\/[\w./-]+$|^(?:package(?:-lock)?|semantics)\.json$/u.test(value) && !value.split('/').includes('..');
const hashValue = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);

export async function pinDirectory(root, directory) {
  const pins = [];
  let bytes = 0;
  async function visit(relative) {
    for (const entry of (await readdir(path.join(root, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = `${relative}/${entry.name}`;
      assert.ok(!entry.isSymbolicLink(), 'Capability inputs cannot contain links');
      if (entry.isDirectory()) await visit(name);
      else {
        assert.ok(entry.isFile() && pins.length < 2000);
        const content = await readBoundedRegularFile(path.join(root, name), 32 * 1024 * 1024, 'capability input', root, null);
        bytes += content.length;
        assert.ok(bytes <= 128 * 1024 * 1024, 'Capability directory exceeds 128 MiB');
        pins.push({ path: name, sha256: sha256(content) });
      }
    }
  }
  await visit(directory);
  return pins;
}

export function validateCapabilities(data) {
  assert.deepEqual(data.foundations?.map((entry) => entry.slug).sort(), ['motion', 'shape', 'typography']);
  const ids = new Set();
  for (const entry of capabilityEntries(data)) {
    assert.ok(!ids.has(entry.slug), 'Duplicate capability'); ids.add(entry.slug);
    const review = entry.capabilityReview;
    assert.ok(review && ['implemented', 'partial', 'unassessed'].includes(review.support), `${entry.slug}: missing scoped support`);
    assert.match(review.reviewedOn, /^\d{4}-\d{2}-\d{2}$/u);
    assert.ok(Array.isArray(review.sources) && review.sources.length > 0 && review.sources.length <= 20);
    for (const source of review.sources) assert.ok(safePath(source.path) && hashValue(source.sha256), 'Invalid reviewed source pin');
    if (review.inventorySha256) assert.ok(hashValue(review.inventorySha256));
    assert.ok(Array.isArray(review.gaps) && Array.isArray(review.browserChecks));
    for (const gap of review.gaps) assert.ok(gap.description && gap.nextStep && ['feature', 'verification', 'integration'].includes(gap.kind));
    for (const check of review.browserChecks) assert.ok(safePath(check.file) && /^tests\/.+\.test\.js$/u.test(check.file) && check.name && check.scope, 'Invalid browser check');
  }
  const evidence = data.capabilityBrowserEvidence;
  if (evidence) {
    assert.ok(evidence.collector === 'scripts/record-capability-evidence.mjs' && evidence.recordedOn && evidence.engine === 'chromium');
    assert.ok(['passed', 'failed', 'blocked'].includes(evidence.status) && hashValue(evidence.reportSha256));
    assert.ok(Array.isArray(evidence.inputs) && evidence.inputs.length > 0 && evidence.inputs.length <= 2000);
    assert.equal(new Set(evidence.inputs.map((input) => input.path)).size, evidence.inputs.length);
    assert.deepEqual(evidence.directories?.map((entry) => entry.path), CAPABILITY_INPUT_DIRECTORIES);
    for (const directory of evidence.directories) assert.ok(hashValue(directory.sha256));
    for (const input of evidence.inputs) assert.ok(safePath(input.path) && hashValue(input.sha256), 'Invalid browser input pin');
    assert.ok(Array.isArray(evidence.results) && evidence.results.length <= 1000);
    assert.equal(new Set(evidence.results.map((result) => `${result.file}:${result.name}`)).size, evidence.results.length);
    for (const result of evidence.results) assert.ok(safePath(result.file) && result.name && ['passed', 'failed', 'skipped'].includes(result.status));
  }
}

/** Pins attest a past review/run. Matching hashes are not a new test or proof of spec parity. */
export async function buildCapabilityRoadmap(data, root) {
  validateCapabilities(data);
  const hashes = new Map();
  const currentHash = async (name) => {
    if (!hashes.has(name)) hashes.set(name, readBoundedRegularFile(path.join(root, name), 32 * 1024 * 1024, 'capability evidence input', root, null).then(sha256).catch(() => null));
    return hashes.get(name);
  };
  const matches = async (pins) => (await Promise.all(pins.map(async (pin) => await currentHash(pin.path) === pin.sha256))).every(Boolean);
  const evidence = data.capabilityBrowserEvidence;
  const directoriesCurrent = evidence ? (await Promise.all(evidence.directories.map(async (directory) =>
    await pinDirectory(root, directory.path).then((pins) => sha256(JSON.stringify(pins))).catch(() => null) === directory.sha256))).every(Boolean) : false;
  const browserInputsCurrent = Boolean(evidence && directoriesCurrent && await matches(evidence.inputs));
  const inventory = await pinDirectory(root, 'src').then((pins) => sha256(JSON.stringify(pins))).catch(() => null);
  const entries = [];
  for (const entry of capabilityEntries(data)) {
    const review = entry.capabilityReview;
    const sourcesCurrent = await matches(review.sources) && (!review.inventorySha256 || review.inventorySha256 === inventory);
    const checks = review.browserChecks.map((check) => {
      const result = evidence?.results.find((result) => result.file === check.file && result.name === check.name);
      const state = !result ? 'not-recorded' : !browserInputsCurrent ? 'stale' : evidence.status === 'blocked' ? 'blocked' : result.status === 'skipped' ? 'skipped' : `recorded-${result.status}`;
      return { ...check, state };
    });
    entries.push({ slug: entry.slug, title: entry.title, kind: data.components.includes(entry) ? 'component' : 'foundation',
      support: sourcesCurrent ? review.support : 'unassessed', lastReviewedSupport: review.support,
      sourceReview: sourcesCurrent ? 'source-reviewed' : 'needs-review', reviewedOn: review.reviewedOn,
      scope: entry.materialGuidance.implementation.documentedSupport, adaptation: entry.materialGuidance.implementation.webAdaptation,
      upstream: entry.materialGuidance.upstreamReview, relationship: entry.materialGuidance.relationship,
      sources: review.sources, gaps: review.gaps, browserChecks: checks,
      browserEvidence: checks.length === 0 ? 'no-mapped-checks' : checks.every((check) => check.state === 'recorded-passed') ? 'recorded-scoped-pass' : checks.some((check) => check.state === 'stale') ? 'needs-rerun' : 'incomplete',
      recheckWhen: ['A reviewed source changes', 'A mapped test or its recorded inputs change', 'Google revises the linked guidance or before claiming a new release matches it'],
    });
  }
  return { schemaVersion: 1, frameworkVersion: data.frameworkVersion,
    basis: 'Reviewed checkout snapshot, not proof of published package contents or target-browser conformance. Implemented means only the named scope. Full Material parity remains unassessed.',
    browserRun: evidence ? { recordedOn: evidence.recordedOn, engine: evidence.engine, engineVersion: evidence.engineVersion, nodeVersion: evidence.nodeVersion, status: evidence.status, inputsCurrent: browserInputsCurrent, reportSha256: evidence.reportSha256, collector: evidence.collector } : null,
    entries };
}

export function renderCapabilityRoadmap(roadmap) {
  const link = (name) => `[${name}](../../../${name})`;
  const rows = roadmap.entries.map((entry) => `| [${entry.title}](#${entry.slug}) | ${entry.support} | ${entry.sourceReview} | ${entry.browserEvidence} | ${entry.gaps.filter((gap) => gap.kind !== 'verification').length} |`);
  const details = roadmap.entries.map((entry) => [
    `<a id="${entry.slug}"></a>\n\n## ${entry.title}`,
    `**${entry.support} within the stated scope.** ${entry.scope}`,
    `Source review: ${entry.sourceReview}, ${entry.reviewedOn}. ${entry.sources.map((source) => link(source.path)).join(', ')}.`,
    `Google relationship: ${entry.relationship}. Upstream review: ${entry.upstream.scope} (${entry.upstream.reviewedOn}); [reviewed source](${entry.upstream.source}).`,
    `Web adaptation: ${entry.adaptation}`,
    entry.gaps.length ? entry.gaps.map((gap) => `- ${gap.kind}: ${gap.description} Next: ${gap.nextStep}`).join('\n') : 'No gap identified within the stated scope; broader upstream parity remains unassessed.',
    entry.browserChecks.length ? entry.browserChecks.map((check) => `- ${check.state}: ${link(check.file)}: \`${check.name}\`. ${check.scope}`).join('\n') : 'No directly scoped browser check is mapped. This does not mean the component fails or has no unit tests.',
  ].join('\n\n'));
  return `<!-- Generated by scripts/gen-expressivecss-skill.mjs. Do not edit. -->\n\n# Material capability roadmap\n\n${roadmap.basis}\n\nSource pins preserve review provenance. A changed or unavailable source makes its review stale; generation never renews a review. Browser registrations are available checks, not passing evidence. Recorded results apply only to their named assertions and fingerprinted inputs, never the whole component.\n\nRe-review changed sources; rerun changed checks or inputs. Review upstream guidance when Google changes it and before new release-parity claims. Inventory/Android reviews do not establish full web specification coverage.\n\n${roadmap.browserRun ? `Last operator collection: ${roadmap.browserRun.recordedOn}, Chromium ${roadmap.browserRun.engineVersion}, ${roadmap.browserRun.status}; inputs ${roadmap.browserRun.inputsCurrent ? 'match' : 'changed or unavailable'}. Raw report SHA-256: \`${roadmap.browserRun.reportSha256}\`.` : 'No browser run has been recorded.'}\n\n| Capability | Scoped support | Source evidence | Browser evidence | Feature/integration gaps |\n| --- | --- | --- | --- | ---: |\n${rows.join('\n')}\n\n${details.join('\n\n')}\n`;
}
