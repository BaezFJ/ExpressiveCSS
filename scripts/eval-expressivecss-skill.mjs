import { constants as fsConstants } from 'node:fs';
import { lstat, mkdir, mkdtemp, open, realpath, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const THIS_FILE = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(path.dirname(THIS_FILE), '..');
const ROOT_SKILL_PATH = 'skills/expressivecss/SKILL.md';
export const PROJECT_FIXTURES = Object.freeze({
  'consumer-current': Object.freeze({
    'package.json': '{"name":"eval-consumer-current","private":true,"dependencies":{"@expressivecss/expressive":"0.8.0"}}\n',
    'src/index.html': '<!doctype html><html lang="en"><body><main id="app"></main></body></html>\n',
    'src/app.css': '@import "@expressivecss/expressive";\n',
  }),
  'consumer-older-version': Object.freeze({
    'package.json': '{"name":"eval-consumer-older","private":true,"dependencies":{"@expressivecss/expressive":"0.7.0"}}\n',
    'node_modules/@expressivecss/expressive/package.json': '{"name":"@expressivecss/expressive","version":"0.7.0"}\n',
    'package-lock.json': '{"lockfileVersion":3,"packages":{"":{"dependencies":{"@expressivecss/expressive":"0.7.0"}},"node_modules/@expressivecss/expressive":{"version":"0.7.0"}}}\n',
    'src/index.html': '<!doctype html><html lang="en"><body><main id="app"></main></body></html>\n',
    'src/app.css': '@import "@expressivecss/expressive";\n',
  }),
});
const SUPPORT_GUIDES = new Map([
  ['skills/expressivecss/expressivecss-design/SKILL.md', 'expressivecss-design'],
  ['skills/expressivecss/expressivecss-install/SKILL.md', 'expressivecss-install'],
  ['skills/expressivecss/expressivecss-usage/SKILL.md', 'expressivecss-usage'],
  ['skills/expressivecss/expressivecss-theming/SKILL.md', 'expressivecss-theming'],
  ['skills/expressivecss/expressivecss-runtime/SKILL.md', 'expressivecss-runtime'],
  ['skills/expressivecss/expressivecss-accessibility/SKILL.md', 'expressivecss-accessibility'],
]);
const ASSERTION_OPERATORS = new Set(['equals', 'includes', 'notIncludes', 'truthy', 'falsy', 'caseContract']);
const TRUSTED_TRACE_OPERATIONS = new Set(['read', 'write', 'patch', 'create', 'delete']);
const REVIEW_STATUSES = new Set(['Pass', 'Intentional adaptation', 'Fail', 'Not applicable', 'Blocked']);
export const DEFAULT_ADAPTER_TIMEOUT_MS = 120_000;
export const EVALUATOR_LIMITS = Object.freeze({
  replayFileBytes: 1_048_576,
  rootSkillBytes: 1_048_576,
  caseCount: 22,
  responseCount: 22,
  traceCount: 256,
  artifactCount: 256,
  rowCount: 256,
  stringCount: 4096,
  keyCount: 20_000,
  stringBytes: 65_536,
  objectDepth: 32,
  traversalCount: 20_000,
});
const KNOWN_CRITICAL_INVARIANT_IDS = new Set([
  'setup-only-routing/contract',
  'css-only-markup-routing/contract',
  'token-only-theming-routing/contract',
  'critique-no-edit/contract',
  'css-only-audit/contract',
  'interactive-audit/contract',
  'combined-review-order/contract',
  'refine-preserves-product/contract',
  'redesign-preserves-requirements/contract',
  'feedback-component-choice/contract',
  'feedback-banner-choice/contract',
  'feedback-dialog-choice/contract',
  'switch-versus-checkbox/contract',
  'deferred-checkbox/contract',
  'adaptive-navigation/contract',
  'brand-through-tokens/contract',
  'runtime-owned-aria/contract',
  'manual-init-teardown/contract',
  'older-version-contract/contract',
  'reachable-state-ledger/contract',
  'matched-before-after/contract',
  'mcp-pass-is-scoped/contract',
]);
const CAPTURE_DIMENSIONS = [
  'route', 'taskPoint', 'dataFixtureId', 'state', 'viewportWidth', 'viewportHeight',
  'deviceScaleFactor', 'colorScheme', 'motionPreference', 'locale', 'direction',
];
const CASE_CONTRACT_ARRAY_FIELDS = [
  'requiredDecisionFields',
  'requiredReportFields',
  'forbiddenEdits',
  'forbiddenMarkup',
  'forbiddenClasses',
  'forbiddenAuthoredRuntimeAria',
  'forbiddenUnsupportedClaims',
];

function rootPath(value) {
  if (value instanceof URL) return fileURLToPath(value);
  return path.resolve(value ?? DEFAULT_ROOT);
}

function isPathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function readBoundedRegularFile(filePath, byteLimit, label, expectedRoot = null) {
  const target = path.resolve(filePath);
  let resolvedRoot = null;
  if (expectedRoot) {
    resolvedRoot = await realpath(expectedRoot);
    const relative = path.relative(path.resolve(expectedRoot), target);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error(`${label} file is outside the repository`);
    }
    let current = resolvedRoot;
    for (const segment of relative.split(path.sep)) {
      current = path.join(current, segment);
      const entry = await lstat(current, { bigint: true });
      if (entry.isSymbolicLink()) throw new Error(`${label} file path contains a symbolic link`);
    }
  }

  const noFollow = Number.isInteger(fsConstants.O_NOFOLLOW) ? fsConstants.O_NOFOLLOW : 0;
  const handle = await open(target, fsConstants.O_RDONLY | noFollow);
  try {
    const before = await handle.stat({ bigint: true });
    const pathBefore = await lstat(target, { bigint: true });
    if (pathBefore.isSymbolicLink()) throw new Error(`${label} file is a symbolic link`);
    if (!before.isFile() || !pathBefore.isFile()) throw new Error(`${label} file is not a regular file`);
    if (before.dev !== pathBefore.dev || before.ino !== pathBefore.ino) {
      throw new Error(`${label} file identity changed before reading`);
    }
    if (resolvedRoot) {
      const openedPath = await realpath(`/proc/self/fd/${handle.fd}`).catch(() => realpath(target));
      if (!isPathInside(resolvedRoot, openedPath)) throw new Error(`${label} file is outside the repository`);
    }
    if (before.size > BigInt(byteLimit)) throw new Error(`${label} file exceeds ${byteLimit} bytes`);

    const bytes = Buffer.allocUnsafe(byteLimit + 1);
    let total = 0;
    while (total <= byteLimit) {
      const chunk = await handle.read(bytes, total, byteLimit + 1 - total, total);
      if (chunk.bytesRead === 0) break;
      total += chunk.bytesRead;
    }
    if (total > byteLimit) throw new Error(`${label} file exceeds ${byteLimit} bytes`);

    const after = await handle.stat({ bigint: true });
    const pathAfter = await lstat(target, { bigint: true });
    const handleChanged = before.dev !== after.dev || before.ino !== after.ino
      || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs;
    const pathChanged = pathAfter.isSymbolicLink() || !pathAfter.isFile()
      || after.dev !== pathAfter.dev || after.ino !== pathAfter.ino;
    if (handleChanged || pathChanged) throw new Error(`${label} file changed while reading`);
    return bytes.subarray(0, total).toString('utf8');
  } finally {
    await handle.close();
  }
}

async function readBoundedJson(filePath, byteLimit, label) {
  return JSON.parse(await readBoundedRegularFile(filePath, byteLimit, label));
}

export async function assembleSkillBundle(_testCase, repositoryRoot = DEFAULT_ROOT) {
  const root = rootPath(repositoryRoot);
  const skill = await readBoundedRegularFile(
    path.join(root, ROOT_SKILL_PATH),
    EVALUATOR_LIMITS.rootSkillBytes,
    'root skill',
    root,
  );
  return `<!-- ${ROOT_SKILL_PATH} -->\n${skill}`;
}

function hasPath(value, dottedPath) {
  if (!dottedPath) return true;
  let current = value;
  for (const key of dottedPath.split('.')) {
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, key)) return false;
    current = current[key];
  }
  return true;
}

function valueAtPath(value, dottedPath) {
  return dottedPath ? dottedPath.split('.').reduce((current, key) => current?.[key], value) : value;
}

function validTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function sameMembers(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && new Set(actual).size === actual.length
    && expected.every((item) => actual.includes(item));
}

function guideNameFromPath(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '');
  if (SUPPORT_GUIDES.has(normalized)) return SUPPORT_GUIDES.get(normalized);
  const component = normalized.match(/^skills\/expressivecss\/components\/([a-z-]+)\.md$/);
  return component ? `component:${component[1]}` : null;
}

function actualGuideReads(executionEvidence) {
  const reads = (Array.isArray(executionEvidence?.toolTrace) ? executionEvidence.toolTrace : [])
    .filter((event) => event?.operation === 'read')
    .map((event) => guideNameFromPath(event.path))
    .filter(Boolean);
  return [...new Set(reads)];
}

function trustedExecutionIsValid(executionEvidence) {
  if (!executionEvidence || executionEvidence.source !== 'adapter'
    || !Array.isArray(executionEvidence.toolTrace)) return false;
  if (!Array.isArray(executionEvidence.artifacts)
    || !executionEvidence.artifacts.every(artifactIsRecord)) return false;
  const artifactIds = new Set();
  let previousArtifactSequence = -1;
  let previousArtifactTimestamp = -Infinity;
  for (const artifact of executionEvidence.artifacts) {
    const timestamp = Date.parse(artifact.timestamp);
    if (artifactIds.has(artifact.id)
      || !Number.isSafeInteger(artifact.sequence) || artifact.sequence <= previousArtifactSequence
      || !Number.isFinite(timestamp) || timestamp <= previousArtifactTimestamp) return false;
    artifactIds.add(artifact.id);
    previousArtifactSequence = artifact.sequence;
    previousArtifactTimestamp = timestamp;
  }
  let previousSequence = -1;
  let previousTimestamp = -Infinity;
  for (const event of executionEvidence.toolTrace) {
    const timestamp = Date.parse(event?.timestamp);
    if (event?.status !== 'success'
      || !TRUSTED_TRACE_OPERATIONS.has(event?.operation)
      || typeof event?.path !== 'string' || event.path.length === 0
      || !Number.isSafeInteger(event?.sequence) || event.sequence <= previousSequence
      || !validTimestamp(event.timestamp) || timestamp <= previousTimestamp) return false;
    previousSequence = event.sequence;
    previousTimestamp = timestamp;
  }
  const filesystem = executionEvidence.filesystem;
  const digestPattern = /^sha256:[0-9a-f]{64}$/u;
  return filesystem?.source === 'adapter' && filesystem.independentlyComputed === true
    && filesystem.algorithm === 'sha256'
    && digestPattern.test(filesystem.before)
    && digestPattern.test(filesystem.after);
}

function collectStrings(value) {
  const strings = [];
  const stack = [{ value, path: '' }];
  const seen = new WeakSet();
  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current.value === 'string') {
      strings.push(current);
      continue;
    }
    if (!current.value || typeof current.value !== 'object' || seen.has(current.value)) continue;
    seen.add(current.value);
    for (const [key, child] of Object.entries(current.value)) {
      stack.push({ value: child, path: current.path ? `${current.path}.${key}` : key });
    }
  }
  return strings;
}

function nestedLimitErrors(...roots) {
  const errors = [];
  const stack = roots.map((value) => ({ value, depth: 0 }));
  const seen = new WeakSet();
  let traversed = 0;
  let strings = 0;
  let keys = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    traversed += 1;
    if (traversed > EVALUATOR_LIMITS.traversalCount) {
      errors.push(`nested traversal exceeds ${EVALUATOR_LIMITS.traversalCount} values`);
      break;
    }
    if (typeof current.value === 'string') {
      strings += 1;
      if (strings > EVALUATOR_LIMITS.stringCount) {
        errors.push(`string count exceeds ${EVALUATOR_LIMITS.stringCount}`);
        break;
      }
      if (Buffer.byteLength(current.value, 'utf8') > EVALUATOR_LIMITS.stringBytes) {
        errors.push(`string exceeds ${EVALUATOR_LIMITS.stringBytes} bytes`);
        break;
      }
      continue;
    }
    if (!current.value || typeof current.value !== 'object') continue;
    if (current.depth > EVALUATOR_LIMITS.objectDepth) {
      errors.push(`object depth exceeds ${EVALUATOR_LIMITS.objectDepth}`);
      break;
    }
    if (seen.has(current.value)) continue;
    seen.add(current.value);
    if (Array.isArray(current.value) && current.value.length > EVALUATOR_LIMITS.traversalCount) {
      errors.push(`nested traversal exceeds ${EVALUATOR_LIMITS.traversalCount} values`);
      break;
    }
    const entries = Object.entries(current.value);
    const remaining = EVALUATOR_LIMITS.traversalCount - traversed;
    if (entries.length > remaining) {
      errors.push(`nested traversal exceeds ${EVALUATOR_LIMITS.traversalCount} values`);
      break;
    }
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      keys += 1;
      if (keys > EVALUATOR_LIMITS.keyCount) {
        errors.push(`object key count exceeds ${EVALUATOR_LIMITS.keyCount}`);
        break;
      }
      if (Buffer.byteLength(entries[index][0], 'utf8') > EVALUATOR_LIMITS.stringBytes) {
        errors.push(`object key exceeds ${EVALUATOR_LIMITS.stringBytes} bytes`);
        break;
      }
      stack.push({ value: entries[index][1], depth: current.depth + 1 });
    }
    if (errors.length > 0) break;
  }
  return errors;
}

function collectionLimitErrors(response, executionEvidence) {
  const errors = nestedLimitErrors(response, executionEvidence);
  const traceCount = Array.isArray(executionEvidence?.toolTrace) ? executionEvidence.toolTrace.length : 0;
  const artifactCount = Array.isArray(executionEvidence?.artifacts) ? executionEvidence.artifacts.length : 0;
  const rowCount = ['reviewRows', 'coverageRecords', 'requirements', 'accessibilityAssertions']
    .reduce((total, field) => total + (Array.isArray(response?.[field]) ? response[field].length : 0), 0);
  if (traceCount > EVALUATOR_LIMITS.traceCount) errors.push(`trace count ${traceCount}`);
  if (artifactCount > EVALUATOR_LIMITS.artifactCount) errors.push(`artifact count ${artifactCount}`);
  if (rowCount > EVALUATOR_LIMITS.rowCount) errors.push(`row count ${rowCount}`);
  return errors;
}

function result(id, status, evidence, { expected, actual } = {}) {
  return { id, critical: true, status, evidence, expected, actual };
}

function evaluateBasicAssertion(assertion, response) {
  if (!ASSERTION_OPERATORS.has(assertion.operator) || assertion.operator === 'caseContract') {
    return { status: 'unevaluated', actual: undefined };
  }
  if (!hasPath(response, assertion.path)) return { status: 'unevaluated', actual: undefined };
  const actual = valueAtPath(response, assertion.path);
  let passed = false;
  switch (assertion.operator) {
    case 'equals': passed = actual === assertion.value; break;
    case 'includes': passed = Array.isArray(actual)
      ? actual.includes(assertion.value)
      : typeof actual === 'string' && actual.includes(assertion.value); break;
    case 'notIncludes': passed = Array.isArray(actual)
      ? !actual.includes(assertion.value)
      : typeof actual === 'string' && !actual.includes(assertion.value); break;

    case 'truthy': passed = Boolean(actual); break;
    case 'falsy': passed = actual === false; break;
    default: return { status: 'unevaluated', actual };
  }
  return { status: passed ? 'pass' : 'fail', actual };
}

function artifactsById(response) {
  return new Map((response.evidenceArtifacts ?? []).map((artifact) => [artifact.id, artifact]));
}

function artifactIsRecord(artifact) {
  return Boolean(artifact?.id && artifact.category && artifact.observation
    && artifact.criterionId && artifact.componentId
    && Number.isInteger(artifact.sequence) && validTimestamp(artifact.timestamp));
}

function artifactMatchesExpectedObservation(artifact, expectedObservation) {
  return artifactIsRecord(artifact)
    && typeof expectedObservation === 'string'
    && expectedObservation.trim().length > 0
    && artifact.observation.includes(expectedObservation);
}

function artifactExpectationsMatch(testCase, executionEvidence) {
  const expected = testCase.artifactExpectations ?? [];
  const artifacts = executionEvidence?.artifacts ?? [];
  if (!Array.isArray(expected) || !Array.isArray(artifacts)
    || artifacts.length !== expected.length
    || new Set(artifacts.map((artifact) => artifact.id)).size !== artifacts.length) return false;
  const byId = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  return expected.every((contract) => {
    const artifact = byId.get(contract.id);
    const { expectedObservation, ...ownedFields } = contract;
    return artifactMatchesExpectedObservation(artifact, expectedObservation)
      && Object.entries(ownedFields).every(([key, value]) => Object.is(artifact[key], value));
  });
}

function rowEvidenceMatches(row, artifacts) {
  if (!row.criterionId || !row.componentId || !Array.isArray(row.evidenceIds)
    || row.evidenceIds.length === 0 || new Set(row.evidenceIds).size !== row.evidenceIds.length) return false;
  return row.evidenceIds.every((id) => {
    const artifact = artifacts.get(id);
    return artifactIsRecord(artifact)
      && artifact.criterionId === row.criterionId
      && artifact.componentId === row.componentId;
  });
}

function plainRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function candidateStructureIsValid(response) {
  if (!plainRecord(response)) return false;
  const collectionFields = ['reviewRows', 'coverageRecords', 'requirements', 'accessibilityAssertions', 'capturePairs', 'selectedComponents'];
  if (collectionFields.some((field) => Object.hasOwn(response, field) && !Array.isArray(response[field]))) return false;
  return (response.reviewRows ?? []).every((row) => plainRecord(row)
    && typeof row.criterionId === 'string' && row.criterionId.length > 0
    && typeof row.componentId === 'string' && row.componentId.length > 0);
}

function reviewStatusContractIsValid(row, artifactsById) {
  if (!REVIEW_STATUSES.has(row?.status)) return false;
  if (row.status === 'Pass') return true;
  if (row.status === 'Intentional adaptation') {
    return Boolean(row.rationale?.trim()) && row.accessibilityPreserved === true
      && rowEvidenceMatches(row, artifactsById);
  }
  if (row.status === 'Blocked') {
    return Boolean(row.blockerReason?.trim()) && Array.isArray(row.evidenceIds)
      && row.evidenceIds.length === 0;
  }
  if (row.status === 'Not applicable') {
    return Boolean(row.applicabilityReason?.trim()) && Array.isArray(row.evidenceIds)
      && row.evidenceIds.length === 0;
  }
  return Boolean(row.observedDeviation?.trim()) && Boolean(row.correction?.trim())
    && rowEvidenceMatches(row, artifactsById);
}

function reviewRowsUseEvidence(response, requiredByCriterion = {}, allowedPrefix = null) {
  if (!Array.isArray(response.reviewRows) || response.reviewRows.length === 0) return false;
  const artifacts = artifactsById(response);
  return response.reviewRows.every((row) => {
    if (!reviewStatusContractIsValid(row, artifacts)) return false;
    if (allowedPrefix && row.status === 'Pass' && !row.criterionId?.startsWith(allowedPrefix)) return false;
    if (row.status !== 'Pass') return true;
    if (!row.criterionId || !row.componentId || !Array.isArray(row.evidenceIds)
      || row.evidenceIds.length === 0 || new Set(row.evidenceIds).size !== row.evidenceIds.length) return false;
    const referenced = row.evidenceIds.map((id) => artifacts.get(id));
    if (!referenced.every((artifact) => artifactIsRecord(artifact)
      && artifact.criterionId === row.criterionId
      && artifact.componentId === row.componentId)) return false;
    return (requiredByCriterion[row.criterionId] ?? [])
      .every((kind) => referenced.some((artifact) => artifact.category === kind));
  });
}

function pairDimensionsAreValid(pair, dimensions = CAPTURE_DIMENSIONS) {
  if (!pair || !pair.before || !pair.after || !Array.isArray(dimensions)) return false;
  if (!dimensions.every((key) => Object.hasOwn(pair.before, key)
    && Object.hasOwn(pair.after, key)
    && Object.is(pair.before[key], pair.after[key]))) return false;
  if (!Number.isInteger(pair.baselineSequence) || !Number.isInteger(pair.firstEditSequence)
    || pair.baselineSequence >= pair.firstEditSequence) return false;
  if (!validTimestamp(pair.baselineTimestamp) || !validTimestamp(pair.firstEditTimestamp)
    || Date.parse(pair.baselineTimestamp) >= Date.parse(pair.firstEditTimestamp)) return false;
  return Boolean(pair.beforeArtifact && pair.afterArtifact);
}

function pairArtifactsAreValid(pair, artifacts, executionEvidence) {
  const before = artifacts.get(pair?.beforeArtifact);
  const after = artifacts.get(pair?.afterArtifact);
  const firstEdit = (executionEvidence?.toolTrace ?? [])
    .find((event) => ['write', 'patch', 'create', 'delete'].includes(event.operation));
  return artifactIsRecord(before) && artifactIsRecord(after)
    && before.category === 'rendered-capture' && after.category === 'rendered-capture'
    && before.pairId === pair.pairId && after.pairId === pair.pairId
    && before.captureRole === 'before' && after.captureRole === 'after'
    && CAPTURE_DIMENSIONS.every((key) => Object.is(before[key], pair.before?.[key])
      && Object.is(after[key], pair.after?.[key]))
    && Number.isInteger(before.sequence) && Number.isInteger(after.sequence)
    && validTimestamp(before.timestamp) && validTimestamp(after.timestamp)
    && before.sequence === pair.baselineSequence && before.timestamp === pair.baselineTimestamp
    && firstEdit?.sequence === pair.firstEditSequence && firstEdit.timestamp === pair.firstEditTimestamp
    && before.sequence < firstEdit.sequence && after.sequence > firstEdit.sequence
    && Date.parse(before.timestamp) < Date.parse(firstEdit.timestamp)
    && Date.parse(after.timestamp) > Date.parse(firstEdit.timestamp);
}

function pairDifferencesAreValid(pair) {
  return Array.isArray(pair?.visibleDifferences) && pair.visibleDifferences.length > 0
    && pair.visibleDifferences.every((difference) => ['intended', 'framework-required', 'regression'].includes(difference.classification)
    && difference.id && difference.before && difference.after && difference.rationale);
}

function feedbackContract(testCase, response) {
  const rejected = testCase.rejectedComponents ?? [];
  return response.selectedComponent === testCase.expectedComponent
    && response.rejectionReasons && typeof response.rejectionReasons === 'object'
    && sameMembers(Object.keys(response.rejectionReasons), rejected)
    && rejected.every((name) => typeof response.rejectionReasons[name] === 'string'
      && response.rejectionReasons[name].trim().length >= 12);
}

function controlContract(response, kind) {
  const markup = response.markup ?? '';
  const labeledCheckbox = /<label(?:\s[^>]*)?>[\s\S]*<input[^>]+type="checkbox"[\s\S]*<span>[^<]+<\/span>[\s\S]*<\/label>/u.test(markup);
  const hasSwitchClass = /<label[^>]+class="[^"]*\bswitch\b/u.test(markup);
  return labeledCheckbox && response.addsJavaScript === false
    && (kind === 'switch'
      ? response.selectedComponent === 'switches' && response.commitBehavior === 'immediate' && hasSwitchClass
      : response.selectedComponent === 'checkboxes' && response.commitBehavior === 'deferred-save' && !hasSwitchClass);
}

function fixtureInventoryPass(rows, inventory, artifacts) {
  if (!Array.isArray(rows) || !Array.isArray(inventory) || inventory.length === 0) return false;
  if (!sameMembers(rows.map((row) => row.id), inventory.map((item) => item.id))) return false;
  return inventory.every((item) => {
    const row = rows.find((candidate) => candidate.id === item.id);
    if (row?.status !== 'Pass' || !Array.isArray(row.evidenceIds) || row.evidenceIds.length === 0) return false;
    return row.evidenceIds.every((id) => {
      const artifact = artifacts.get(id);
      return artifactIsRecord(artifact)
        && artifact.criterionId === item.criterionId
        && artifact.componentId === item.componentId
        && artifact.category === item.category
        && artifact.expectedObservation === item.expectedObservation;
    });
  });
}

function caseContract(testCase, response, executionEvidence) {
  if (!hasPath(response, 'mode')) return { status: 'unevaluated', actual: undefined };
  let passed = false;
  switch (testCase.id) {
    case 'setup-only-routing':
    case 'css-only-markup-routing':
    case 'token-only-theming-routing':
      passed = response.mode === 'Implement';
      break;
    case 'critique-no-edit': {
      const artifacts = artifactsById(response);
      passed = response.mode === 'Critique'
        && executionEvidence?.filesystem?.before === executionEvidence?.filesystem?.after
        && reviewRowsUseEvidence(response, testCase.requiredEvidenceByCriterion, 'C-')
        && response.reviewRows.filter((row) => row.status === 'Pass')
          .every((row) => row.evidenceIds.some((id) => artifacts.get(id)?.category === 'rendered-capture'))
        && response.reviewRows.filter((row) => row.criterionId.startsWith('A-'))
          .every((row) => row.status !== 'Pass');
      break;
    }
    case 'css-only-audit':
      passed = response.mode === 'Audit' && reviewRowsUseEvidence(response, testCase.requiredEvidenceByCriterion)
        && response.reviewRows.some((row) => row.criterionId === 'A-HOST-ELEMENT')
        && response.reviewRows.some((row) => row.criterionId === 'A-LABEL');
      break;
    case 'interactive-audit':
      passed = response.mode === 'Audit' && reviewRowsUseEvidence(response, testCase.requiredEvidenceByCriterion)
        && ['A-HOST-ELEMENT', 'A-RUNTIME-ARIA-UPDATE', 'A-LABEL']
          .every((id) => response.reviewRows.some((row) => row.criterionId === id && row.status === 'Pass'));
      break;
    case 'combined-review-order':
      passed = response.mode === 'Critique+Audit';
      break;
    case 'refine-preserves-product': {
      const expected = testCase.protectedProduct ?? {};
      const fields = Object.keys(expected);
      passed = fields.length > 0 && fields.every((field) => expected[field] === response.protectedBefore?.[field]
        && response.protectedBefore[field] === response.protectedAfter?.[field]);
      break;
    }
    case 'redesign-preserves-requirements': {
      const artifacts = artifactsById(response);
      passed = response.structuralChange === true
        && fixtureInventoryPass(response.requirements, testCase.requirementInventory, artifacts)
        && fixtureInventoryPass(response.accessibilityAssertions, testCase.accessibilityInventory, artifacts);
      break;
    }
    case 'feedback-component-choice':
    case 'feedback-banner-choice':
    case 'feedback-dialog-choice':
      passed = feedbackContract(testCase, response);
      break;
    case 'switch-versus-checkbox':
      passed = controlContract(response, 'switch');
      break;
    case 'deferred-checkbox':
      passed = controlContract(response, 'checkbox');
      break;
    case 'adaptive-navigation': {
      const expected = testCase.navigationContract ?? [];
      const widths = response.navigationByWidth;
      passed = Array.isArray(widths) && expected.length > 0 && widths.length === expected.length
        && expected.every((contract, index) => {
          const entry = widths[index];
          return entry
            && entry.width === contract.width
            && JSON.stringify(entry.visiblePatterns) === JSON.stringify([contract.visiblePattern])
            && JSON.stringify(entry.accessibilityExposedPatterns) === JSON.stringify([contract.visiblePattern])
            && JSON.stringify(entry.destinations) === JSON.stringify(contract.destinations)
            && entry.currentDestination === contract.currentDestination
            && new Set(entry.destinations).size === entry.destinations.length
            && entry.destinations.filter((item) => item === entry.currentDestination).length === 1;
        })
        && widths.slice(1).every((entry) => JSON.stringify(entry.destinations) === JSON.stringify(widths[0].destinations)
          && entry.currentDestination === widths[0].currentDestination);
      break;
    }
    case 'brand-through-tokens':
      passed = response.rawColorUses?.every((item) => item.target === '--md-source' && item.purpose === 'seed')
        && response.componentColorUses?.length > 0
        && response.componentColorUses.every((item) => item.background.startsWith('--md-sys-color-')
          && item.foreground.startsWith('--md-sys-color-on-'))
        && response.hostStructureBefore === response.hostStructureAfter
        && response.interactionBehaviorBefore === response.interactionBehaviorAfter;
      break;
    case 'runtime-owned-aria':
      passed = !/aria-(?:expanded|selected|controls)=/u.test(response.sourceMarkup ?? '')
        && response.initializedDom?.['aria-expanded'] === 'false'
        && response.initializedDom?.['aria-controls']
        && response.interactionUpdates?.some((item) => item.field === 'aria-expanded' && item.before !== item.after)
        && response.teardown?.staleAria === false && response.teardown?.generatedIds === 0;
      break;
    case 'manual-init-teardown': {
      const events = response.lifecycle ?? [];
      const destroy = events.find((item) => item.event === 'destroy');
      const remove = events.find((item) => item.event === 'remove');
      passed = response.registryElementId
        && response.markup?.includes(`id="${response.registryElementId}"`)
        && /\bno-autoinit\b/u.test(response.markup)
        && response.initialization?.length === 1
        && response.initialization[0].elementId === response.registryElementId
        && response.initialization[0].count === 1
        && response.instanceRetainedOrRecovered === true
        && destroy?.elementId === response.registryElementId && remove?.elementId === response.registryElementId
        && destroy.sequence < remove.sequence
        && response.postTeardown?.instance === false
        && ['listeners', 'timers', 'overlays', 'generatedNodes'].every((key) => response.postTeardown?.[key] === 0);
      break;
    }
    case 'older-version-contract':
      passed = response.resolvedVersion === '0.7.0' && response.contractVersion === '0.8.0'
        && response.skillVersion === '0.4.0' && response.contractStatus === 'mismatch'
        && response.documentationMode === 'matching-tag' && response.decoyApiRejected === true
        && response.unavailableDocsBehavior === 'Blocked';
      break;
    case 'reachable-state-ledger':
      passed = true;
      break;
    case 'matched-before-after':
      passed = true;
      break;
    case 'mcp-pass-is-scoped':
      passed = response.mcpStatus === 'static_contract_pass'
        && response.fullReviewStatus === 'Blocked'
        && sameMembers(response.uncheckedAreas, ['visual hierarchy', 'interaction', 'responsive', 'focus', 'announcement', 'assistive technology'])
        && response.checksPerformed?.length > 0 && response.blockedChecks?.length > 0;
      break;
    default:
      return { status: 'unevaluated', actual: testCase.id };
  }
  return { status: passed ? 'pass' : 'fail', actual: passed };
}

export function validateCaseDefinitions(caseData) {
  const errors = [];
  const cases = caseData?.cases;
  const stable = caseData?.stableInvariantIds;
  if (!Array.isArray(cases) || !Array.isArray(stable)) {
    return { status: 'fail', errors: ['cases and stableInvariantIds must be arrays'] };
  }
  if (cases.length > EVALUATOR_LIMITS.caseCount) {
    errors.push(`case definitions may contain at most ${EVALUATOR_LIMITS.caseCount} cases`);
  }
  if (new Set(stable).size !== stable.length) errors.push('stableInvariantIds contains duplicates');
  for (const id of stable) if (!KNOWN_CRITICAL_INVARIANT_IDS.has(id)) errors.push(`unknown stable invariant ${id}`);
  for (const id of KNOWN_CRITICAL_INVARIANT_IDS) if (!stable.includes(id)) errors.push(`missing stable invariant ${id}`);
  const caseIds = cases.map((item) => item.id);
  if (new Set(caseIds).size !== caseIds.length) errors.push('case IDs contain duplicates');
  const defined = [];
  for (const item of cases) {
    for (const field of CASE_CONTRACT_ARRAY_FIELDS) {
      if (!Object.hasOwn(item, field) || !Array.isArray(item[field])) {
        errors.push(`${item.id} ${field} must be explicitly declared as an array`);
      } else if (item[field].some((value) => typeof value !== 'string' || value.length === 0)
        || new Set(item[field]).size !== item[field].length) {
        errors.push(`${item.id} ${field} must contain unique non-empty strings`);
      }
    }
    if (!Array.isArray(item.expectedCriticalInvariantIds) || !Array.isArray(item.criticalInvariants)) {
      errors.push(`${item.id} has no critical invariant arrays`);
      continue;
    }
    const ids = item.criticalInvariants.map((entry) => entry.id);
    if (new Set(ids).size !== ids.length) errors.push(`${item.id} has duplicate critical invariants`);
    if (!sameMembers(ids, item.expectedCriticalInvariantIds) || ids.some((id, index) => id !== item.expectedCriticalInvariantIds[index])) {
      errors.push(`${item.id} critical invariant inventory differs from definitions`);
    }
    for (const invariant of item.criticalInvariants) {
      defined.push(invariant.id);
      if (!KNOWN_CRITICAL_INVARIANT_IDS.has(invariant.id)) errors.push(`${item.id} has unknown invariant ${invariant.id}`);
      if (!ASSERTION_OPERATORS.has(invariant.operator)) errors.push(`${invariant.id} has unknown operator ${invariant.operator}`);
    }
    const requiredCategories = item.requiredEvidenceCategories ?? [];
    const requiredByCriterion = item.requiredEvidenceByCriterion ?? {};
    if (requiredCategories.length > 0) {
      if (!requiredByCriterion || typeof requiredByCriterion !== 'object' || Array.isArray(requiredByCriterion)) {
        errors.push(`${item.id} has no criterion-owned required evidence map`);
      } else {
        const mappedCategories = [];
        for (const [criterionId, categories] of Object.entries(requiredByCriterion)) {
          if (!criterionId || !Array.isArray(categories) || categories.length === 0) {
            errors.push(`${item.id} has an invalid criterion-owned required evidence entry`);
            continue;
          }
          mappedCategories.push(...categories);
        }
        if (!sameMembers([...new Set(mappedCategories)], requiredCategories)) {
          errors.push(`${item.id} criterion-owned evidence kinds differ from required categories`);
        }
      }
    } else if (Object.keys(requiredByCriterion).length > 0) {
      errors.push(`${item.id} maps criterion evidence without required categories`);
    }
  }
  if (!sameMembers(defined, stable)) errors.push('defined critical invariants do not equal the stable catalog');
  return { status: errors.length === 0 ? 'pass' : 'fail', errors };
}

function definitionInvariants(testCase) {
  const invariants = testCase.criticalInvariants ?? [];
  const expected = testCase.expectedCriticalInvariantIds ?? [];
  const ids = invariants.map((item) => item.id);
  const output = [];
  if (new Set(ids).size !== ids.length) {
    output.push(result('schema/duplicate-critical-invariant', 'fail', 'stable invariant catalog contains a duplicate', { actual: ids }));
  }
  for (const id of expected) {
    if (!ids.includes(id)) output.push(result(`schema/missing/${id}`, 'fail', 'stable invariant catalog is missing a required critical invariant', { expected: id }));
  }
  for (const invariant of invariants) {
    if (!KNOWN_CRITICAL_INVARIANT_IDS.has(invariant.id)) {
      output.push(result(`schema/unknown/${invariant.id}`, 'fail', 'stable invariant catalog contains an unknown critical invariant', { actual: invariant.id }));
    }
  }
  return output;
}

function evaluateCaseInternal(testCase, response, executionEvidence = null) {
  const limitErrors = collectionLimitErrors(response, executionEvidence);
  const limitInvariant = result('limits/structure', limitErrors.length === 0 ? 'pass' : 'fail',
    'trace, artifact, row, string, depth, and nested traversal values must remain within evaluator limits', {
      expected: EVALUATOR_LIMITS,
      actual: limitErrors,
    });
  if (limitErrors.length > 0) {
    return { caseId: testCase?.id, status: 'fail', actualGuideReads: [], invariants: [limitInvariant] };
  }
  const invariants = [limitInvariant, ...definitionInvariants(testCase)];
  const trustedExecution = trustedExecutionIsValid(executionEvidence)
    && !['toolTrace', 'preRunFilesystemHash', 'postRunFilesystemHash', 'executionEvidence', 'evidenceArtifacts']
      .some((key) => Object.hasOwn(response ?? {}, key));
  invariants.push(result('execution/trusted-evidence', trustedExecution ? 'pass' : 'fail',
    'guide reads, writes, filesystem hashes, and trusted artifacts require separate valid adapter evidence'));
  invariants.push(result('execution/artifact-expectations', artifactExpectationsMatch(testCase, executionEvidence) ? 'pass' : 'fail',
    'trusted artifacts must match fixture-owned artifact expectations exactly'));
  invariants.push(result('response/case-id', response?.caseId === testCase.id ? 'pass' : 'fail',
    'candidate caseId must exactly equal the selected fixture ID', {
      expected: testCase.id,
      actual: response?.caseId,
    }));
  const candidateStructurePass = candidateStructureIsValid(response);
  invariants.push(result('response/schema', candidateStructurePass ? 'pass' : 'fail',
    'candidate response collections and review-row identifiers must have the declared structure'));
  const requiredFields = [...new Set([
    ...(testCase.requiredDecisionFields ?? []),
    ...(testCase.requiredReportFields ?? []),
  ])];
  const missingFields = requiredFields.filter((field) => !hasPath(response, field));
  invariants.push(result('contract/required-fields', missingFields.length === 0 ? 'pass' : 'fail',
    'every declared decision and report field must be present', {
      expected: requiredFields,
      actual: missingFields,
    }));

  const editRules = testCase.forbiddenEdits ?? [];
  const forbiddenWrites = (executionEvidence?.toolTrace ?? []).filter((event) =>
    ['write', 'patch', 'create', 'delete'].includes(event.operation)
      && (editRules.includes('*') || editRules.includes(event.path)));
  invariants.push(result('contract/forbidden-edits', forbiddenWrites.length === 0 ? 'pass' : 'fail',
    'trusted execution must not contain a declared forbidden edit', {
      expected: editRules,
      actual: forbiddenWrites,
    }));

  const candidateStrings = collectStrings(response);
  const markupStrings = candidateStrings;
  const normalizedMarkup = markupStrings.map((entry) => entry.value.toLowerCase()).join('\n');
  const allText = normalizedMarkup;
  const forbiddenMarkup = (testCase.forbiddenMarkup ?? []).filter((token) => normalizedMarkup.includes(token.toLowerCase()));
  const authoredClasses = new Set();
  for (const entry of markupStrings) {
    for (const attribute of entry.value.matchAll(/\b(?:class|className)\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`|([^\s"'`=<>]+))/giu)) {
      const value = attribute[1] ?? attribute[2] ?? attribute[3] ?? attribute[4] ?? '';
      for (const className of value.split(/\s+/u).filter(Boolean)) authoredClasses.add(className);
    }
    for (const attribute of entry.value.matchAll(/\bclassName\s*=\s*\{\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)\s*\}/giu)) {
      const value = attribute[1] ?? attribute[2] ?? attribute[3] ?? '';
      for (const className of value.split(/\s+/u).filter(Boolean)) authoredClasses.add(className);
    }
  }
  const forbiddenClasses = (testCase.forbiddenClasses ?? []).filter((className) => authoredClasses.has(className));
  const authoredRuntimeAria = (testCase.forbiddenAuthoredRuntimeAria ?? []).filter((attribute) => {
    const lowered = attribute.toLowerCase();
    return markupStrings.some((entry) => [...entry.value.matchAll(/\b(aria-[a-z-]+)\s*=/giu)]
      .some((match) => match[1].toLowerCase() === lowered));
  });
  const unsupportedClaims = (testCase.forbiddenUnsupportedClaims ?? [])
    .filter((claim) => allText.includes(claim.toLowerCase()));
  const forbiddenContent = { forbiddenMarkup, forbiddenClasses, authoredRuntimeAria, unsupportedClaims };
  const hasForbiddenContent = Object.values(forbiddenContent).some((items) => items.length > 0);
  invariants.push(result('contract/forbidden-content', hasForbiddenContent ? 'fail' : 'pass',
    'candidate output must not contain declared forbidden markup, classes, authored runtime ARIA, or unsupported claims', {
      expected: 'none',
      actual: forbiddenContent,
    }));

  const modeStatus = hasPath(response, 'mode')
    ? (response.mode === testCase.expectedOperatingMode ? 'pass' : 'fail')
    : 'unevaluated';
  invariants.push(result('mode/exact', modeStatus, 'exact operating mode', {
    expected: testCase.expectedOperatingMode,
    actual: response?.mode,
  }));

  const reads = actualGuideReads(executionEvidence);
  invariants.push(result('routing/actual-guide-reads', trustedExecution && sameMembers(reads, testCase.mustLoad ?? []) ? 'pass' : 'fail',
    'actual guide read trace must equal the fixture route', { expected: testCase.mustLoad, actual: reads }));

  if (testCase.noEdits) {
    const writes = (executionEvidence?.toolTrace ?? []).filter((event) => ['write', 'patch', 'create', 'delete'].includes(event.operation));
    const hashesMatch = trustedExecution
      && executionEvidence.filesystem.before === executionEvidence.filesystem.after;
    invariants.push(result('mode/no-write', writes.length === 0 && hashesMatch ? 'pass' : 'fail',
      'write trace and filesystem hash must remain unchanged', { expected: [], actual: writes }));
  }

  const evidence = Array.isArray(executionEvidence?.artifacts) ? executionEvidence.artifacts : [];
  const scoredResponse = { ...(response ?? {}), evidenceArtifacts: evidence };
  const artifacts = artifactsById(scoredResponse);
  const reviewRows = Array.isArray(response?.reviewRows) ? response.reviewRows : [];
  if (reviewRows.length > 0) {
    const statusesValid = reviewRows.every((row) => REVIEW_STATUSES.has(row?.status));
    invariants.push(result('review/statuses', statusesValid ? 'pass' : 'fail',
      'review status must be Pass, Intentional adaptation, Fail, Not applicable, or Blocked', {
        actual: reviewRows.map((row) => row?.status),
      }));
    const statusContractsValid = reviewRows.every((row) => reviewStatusContractIsValid(row, artifacts));
    invariants.push(result('review/status-contracts', statusContractsValid ? 'pass' : 'fail',
      'every review row must satisfy its status-specific evidence, rationale, blocker, applicability, deviation, and correction contract', {
        actual: reviewRows,
      }));
    const passEvidenceMatches = reviewRows.filter((row) => row.status === 'Pass').every((row) => {
      if (!row.criterionId || !row.componentId || !Array.isArray(row.evidenceIds)
        || row.evidenceIds.length === 0 || new Set(row.evidenceIds).size !== row.evidenceIds.length) return false;
      return row.evidenceIds.every((id) => {
        const artifact = artifacts.get(id);
        return artifactIsRecord(artifact)
          && artifact.criterionId === row.criterionId
          && artifact.componentId === row.componentId;
      });
    });
    invariants.push(result('review/pass-evidence-links', passEvidenceMatches ? 'pass' : 'fail',
      'Pass evidence IDs must resolve to artifacts for the same criterion and component', { actual: reviewRows }));
    const criterionKindsMatch = reviewRows.filter((row) => row.status === 'Pass').every((row) => {
      const referenced = (row.evidenceIds ?? []).map((id) => artifacts.get(id)).filter(Boolean);
      return (testCase.requiredEvidenceByCriterion?.[row.criterionId] ?? [])
        .every((kind) => referenced.some((artifact) => artifact.category === kind
          && artifact.criterionId === row.criterionId && artifact.componentId === row.componentId));
    });
    invariants.push(result('review/criterion-evidence-kinds', criterionKindsMatch ? 'pass' : 'fail',
      'Pass rows must contain every criterion-owned required evidence kind; unrelated artifacts do not count', {
        expected: testCase.requiredEvidenceByCriterion,
        actual: reviewRows,
      }));
  }

  const requiredByCriterion = testCase.requiredEvidenceByCriterion ?? {};
  const evidenceValid = Object.entries(requiredByCriterion).every(([criterionId, categories]) => categories.every((category) => evidence.some((artifact) => artifactIsRecord(artifact)
    && artifact.criterionId === criterionId && artifact.category === category)));
  invariants.push(result('evidence/required-categories', evidenceValid ? 'pass' : 'fail',
    'criterion-owned required evidence artifacts must exist with a matching expected observation, sequence, and timestamp', {
      expected: requiredByCriterion,
      actual: evidence.map((item) => ({ category: item.category, criterionId: item.criterionId })),
    }));

  if (testCase.coverageInventory) {
    const records = response?.coverageRecords ?? [];
    const inventoryIds = testCase.coverageInventory.map((item) => item.id);
    const recordIds = records.map((item) => item.inventoryId);
    const exact = sameMembers(recordIds, inventoryIds);
    const recordContractsValid = exact && testCase.coverageInventory.every((item) => {
      const record = records.find((candidate) => candidate.inventoryId === item.id);
      if (!record || !record.criterionId || !record.componentId || !record.expectedObservation
        || !Number.isInteger(record.sequence) || !validTimestamp(record.timestamp)) return false;
      if (String(item.requiredValue) !== record.expectedObservation) return false;
      if (!item.evidenceAvailable) return record.result === 'Blocked' && record.evidenceIds?.length === 0 && Boolean(record.blockerReason?.trim());
      return ['Pass', 'Fail'].includes(record.result) && record.evidenceIds?.length > 0;
    });
    invariants.push(result('coverage/fixture-inventory', recordContractsValid ? 'pass' : 'fail', exact
      ? 'missing evidence must be Blocked with a blocker reason, never Not applicable'
      : 'fixture-owned coverage must contain every required inventory key exactly once', {
      expected: inventoryIds,
      actual: recordIds,
    }));
    const coveredEvidenceIds = records.filter((record) => ['Pass', 'Fail'].includes(record.result))
      .flatMap((record) => Array.isArray(record.evidenceIds) ? record.evidenceIds : []);
    const coverageEvidenceValid = new Set(coveredEvidenceIds).size === coveredEvidenceIds.length
      && records.filter((record) => ['Pass', 'Fail'].includes(record.result)).every((record) => Array.isArray(record.evidenceIds)
        && record.evidenceIds.length > 0
        && record.evidenceIds.every((id) => {
          const artifact = artifacts.get(id);
          return artifactIsRecord(artifact)
            && artifact.criterionId === record.criterionId
            && artifact.componentId === record.componentId
            && artifact.inventoryId === record.inventoryId
            && artifact.observation.includes(record.expectedObservation);
        }));
    invariants.push(result('coverage/evidence-links', coverageEvidenceValid ? 'pass' : 'fail',
      'coverage evidence IDs must resolve one-to-one to fixture-owned inventory observations for the record criterion and component', { actual: records }));
    const blockedCoverageValid = records.filter((record) => record.result === 'Blocked')
      .every((record) => Array.isArray(record.evidenceIds) && record.evidenceIds.length === 0 && Boolean(record.blockerReason?.trim()));
    invariants.push(result('coverage/blocked-contract', blockedCoverageValid ? 'pass' : 'fail',
      'Blocked coverage requires no evidence IDs and a blocker reason', { actual: records }));
  }

  if (testCase.captureDimensions) {
    const pairs = response?.capturePairs ?? [];
    const dimensionsExact = sameMembers(testCase.captureDimensions, CAPTURE_DIMENSIONS)
      && pairs.length > 0 && pairs.every((pair) => pairDimensionsAreValid(pair, testCase.captureDimensions));
    invariants.push(result('capture/exact-pair', dimensionsExact ? 'pass' : 'fail',
      'exact capture dimensions and a pre-edit baseline are required', {
        expected: testCase.captureDimensions,
        actual: pairs,
      }));
    const pairArtifactsValid = pairs.length > 0
      && pairs.every((pair) => pairArtifactsAreValid(pair, artifacts, executionEvidence));
    invariants.push(result('capture/rendered-artifacts', pairArtifactsValid ? 'pass' : 'fail',
      'matched capture IDs must resolve to rendered before and after artifacts, with roles and capture chronology bound to the trusted first edit', {
        actual: pairs,
      }));
    const differencesValid = pairs.length > 0 && pairs.every(pairDifferencesAreValid);
    invariants.push(result('capture/visible-differences', differencesValid ? 'pass' : 'fail',
      'matched captures require an explicit visible-difference classification', { actual: pairs }));
  }

  if (testCase.id === 'combined-review-order') {
    const critique = evidence.filter((artifact) => artifact.mode === 'Critique');
    const audit = evidence.filter((artifact) => artifact.mode === 'Audit');
    const ordered = critique.length > 0 && audit.length > 0
      && Math.max(...critique.map((item) => item.sequence)) < Math.min(...audit.map((item) => item.sequence))
      && Math.max(...critique.map((item) => Date.parse(item.timestamp))) < Math.min(...audit.map((item) => Date.parse(item.timestamp)));
    invariants.push(result('evidence/critique-before-audit', ordered ? 'pass' : 'fail',
      'Critique before Audit requires earlier collection sequence and timestamp', { actual: evidence }));
  }

  for (const assertion of testCase.criticalInvariants ?? []) {
    if (!KNOWN_CRITICAL_INVARIANT_IDS.has(assertion.id)) continue;
    const checked = assertion.operator === 'caseContract'
      ? caseContract(testCase, scoredResponse, executionEvidence)
      : evaluateBasicAssertion(assertion, response);
    invariants.push(result(assertion.id, checked.status, `critical invariant ${assertion.id}`, {
      expected: assertion.value,
      actual: checked.actual,
    }));
  }

  if (testCase.id === 'mcp-pass-is-scoped') {
    const scoped = response?.mcpStatus === 'static_contract_pass' && response?.fullReviewStatus === 'Blocked';
    invariants.push(result('mcp/scoped-pass', scoped ? 'pass' : 'fail',
      'scoped MCP pass cannot become a broad visual, interaction, responsive, focus, announcement, or assistive-technology pass', {
        expected: 'Blocked', actual: response?.fullReviewStatus,
      }));
  }

  return {
    caseId: testCase.id,
    status: invariants.every((item) => item.status === 'pass') ? 'pass' : 'fail',
    actualGuideReads: reads,
    invariants,
  };
}

export function evaluateCase(testCase, response, executionEvidence = null) {
  try {
    return evaluateCaseInternal(testCase, response, executionEvidence);
  } catch (error) {
    return {
      caseId: testCase?.id ?? null,
      status: 'fail',
      actualGuideReads: actualGuideReads(executionEvidence),
      invariants: [result('response/schema', 'fail',
        'malformed candidate structures must fail closed without aborting the evaluation', {
          actual: error instanceof Error ? error.message : 'unknown evaluator error',
        })],
    };
  }
}

function keyIsSensitive(parentKey) {
  const normalizedKey = parentKey.replace(/([a-z0-9])([A-Z])/gu, '$1_$2').replaceAll('-', '_').toLowerCase();
  return /(?:^|_)(?:api_key|client_secret|access_token|refresh_token|id_token|token|secret|password|passwd|authorization|credential|credentials|private_key|access_key_id|secret_access_key|cookie|set_cookie|session_cookie)(?:_|$)/u.test(normalizedKey);
}

function redactString(value) {
  if (Buffer.byteLength(value, 'utf8') > EVALUATOR_LIMITS.stringBytes) return '[TRUNCATED]';
  return value
    .replace(/(Authorization\s*:\s*Bearer\s+)[^\s,;]+/giu, '$1[REDACTED]')
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+\/-]{16,}/giu, '$1[REDACTED]')
    .replace(/((?:Set-)?Cookie\s*:\s*)[^\r\n]+/giu, '$1[REDACTED]')
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/gu, '[REDACTED]')
    .replace(/\bglpat-[A-Za-z0-9_-]{20,}\b/gu, '[REDACTED]')
    .replace(/\bnpm_[A-Za-z0-9]{20,}\b/gu, '[REDACTED]')
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/gu, '[REDACTED]')
    .replace(/\bAIza[A-Za-z0-9_-]{30,}\b/gu, '[REDACTED]')
    .replace(/\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{16,}\b/gu, '[REDACTED]')
    .replace(/\bsk-[A-Za-z0-9_-]{20,}\b/gu, '[REDACTED]')
    .replace(/\bAKIA[0-9A-Z]{16}\b/gu, '[REDACTED]')
    .replace(/\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/gu, '[REDACTED]')
    .replace(/\b(TOKEN|API_KEY|SECRET|PASSWORD|PASSWD|ACCESS_TOKEN|REFRESH_TOKEN|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)=([^\s]+)/giu, '$1=[REDACTED]')
    .replace(/(["']?(?:api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|password|passwd)["']?\s*:\s*["']?)[^"'\s,}]+/giu, '$1[REDACTED]')
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/giu, '$1[REDACTED]@')
    .replace(/\/(?:home|Users)\/[^/\s]+(?:\/[^\s]*)?/gu, '[LOCAL_PATH]')
    .replace(/\/root(?:\/[^\s]*)?/gu, '[LOCAL_PATH]')
    .replace(/\/(?:private\/)?tmp\/[^\s]+/gu, '[LOCAL_PATH]')
    .replace(/\/private\/var\/folders\/[^\s]+/gu, '[LOCAL_PATH]')
    .replace(/[A-Z]:\\+Users\\+[^\\\s]+(?:\\+[^\s]*)?/giu, '[LOCAL_PATH]');
}

export function redactValue(value, parentKey = '') {
  if (keyIsSensitive(parentKey)) return '[REDACTED]';
  if (typeof value === 'string') return redactString(value);
  if (!value || typeof value !== 'object') return value;

  const output = Array.isArray(value) ? [] : {};
  const stack = [{ source: value, target: output, depth: 0, ancestors: [value] }];
  let traversed = 1;
  let stringCount = 0;
  let redactedKeyCount = 0;
  let exhausted = false;
  while (stack.length > 0 && !exhausted) {
    const current = stack.pop();
    const entries = Object.entries(current.source);
    for (const [key, child] of entries) {
      const redactedKey = redactString(key);
      let outputKey = key;
      if (redactedKey !== key) {
        redactedKeyCount += 1;
        outputKey = redactedKey === '[TRUNCATED]'
          ? `[TRUNCATED_KEY_${redactedKeyCount}]`
          : `[REDACTED_KEY_${redactedKeyCount}]`;
      }
      traversed += 1;
      if (traversed > EVALUATOR_LIMITS.traversalCount) {
        current.target[outputKey] = '[TRUNCATED]';
        exhausted = true;
        break;
      }
      if (keyIsSensitive(key)) {
        current.target[outputKey] = '[REDACTED]';
        continue;
      }
      if (typeof child === 'string') {
        stringCount += 1;
        if (stringCount > EVALUATOR_LIMITS.stringCount) {
          current.target[outputKey] = '[TRUNCATED]';
          exhausted = true;
          break;
        }
        current.target[outputKey] = redactString(child);
        continue;
      }
      if (!child || typeof child !== 'object') {
        current.target[outputKey] = child;
        continue;
      }
      if (current.depth + 1 > EVALUATOR_LIMITS.objectDepth || current.ancestors.includes(child)) {
        current.target[outputKey] = '[TRUNCATED]';
        continue;
      }
      const target = Array.isArray(child) ? [] : {};
      current.target[outputKey] = target;
      stack.push({
        source: child,
        target,
        depth: current.depth + 1,
        ancestors: [...current.ancestors, child],
      });
    }
  }
  return output;
}

function parseArguments(argv) {
  const parsed = { adapterArgs: [] };
  for (const argument of argv) {
    if (argument.startsWith('--adapter-arg=')) parsed.adapterArgs.push(argument.slice('--adapter-arg='.length));
    else if (argument.startsWith('--')) {
      const [key, ...rest] = argument.slice(2).split('=');
      parsed[key] = rest.join('=') || true;
    }
  }
  return parsed;
}

async function materializeProjectFixture(fixtureId) {
  const fixture = PROJECT_FIXTURES[fixtureId];
  if (!fixture) throw new Error(`Unknown project fixture ${fixtureId}`);
  const sandbox = await mkdtemp(path.join(tmpdir(), 'expressivecss-eval-project-'));
  for (const [relativePath, content] of Object.entries(fixture)) {
    const target = path.join(sandbox, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, { flag: 'wx' });
  }
  return sandbox;
}

function terminateProcessTree(child, signal) {
  if (!child.pid) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    killer.unref();
    return;
  }
  try {
    process.kill(-child.pid, signal);
  } catch {
    try { child.kill(signal); } catch {}
  }
}

async function responseFromAdapter(adapter, adapterArgs, task, projectRoot, rootSkill, timeout) {
  const input = JSON.stringify({ task, projectRoot, rootSkill });
  return new Promise((resolve, reject) => {
    const child = spawn(adapter, adapterArgs, {
      detached: process.platform !== 'win32',
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const chunks = { stdout: [], stderr: [] };
    const sizes = { stdout: 0, stderr: 0 };
    const maxBuffer = 10 * 1024 * 1024;
    let settled = false;

    const settle = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };
    const failBuffer = () => {
      terminateProcessTree(child, 'SIGKILL');
      child.stdin.destroy();
      child.stdout.destroy();
      child.stderr.destroy();
      const error = new Error('Adapter output exceeded the 10 MiB limit');
      error.code = 'ENOBUFS';
      settle(() => reject(error));
    };
    for (const streamName of ['stdout', 'stderr']) {
      child[streamName].on('data', (chunk) => {
        if (settled) return;
        sizes[streamName] += chunk.length;
        if (sizes[streamName] > maxBuffer) {
          failBuffer();
          return;
        }
        chunks[streamName].push(chunk);
      });
    }
    child.once('error', (executionError) => {
      settle(() => {
        const error = new Error(redactValue(executionError.message));
        error.code = executionError.code;
        reject(error);
      });
    });
    child.once('close', (status) => {
      settle(() => {
        const stderr = Buffer.concat(chunks.stderr).toString('utf8');
        if (status !== 0) {
          reject(new Error(redactValue(`Adapter exited ${status}: ${stderr}`)));
          return;
        }
        try {
          resolve(JSON.parse(Buffer.concat(chunks.stdout).toString('utf8')));
        } catch (error) {
          reject(new Error(redactValue(`Adapter returned invalid JSON: ${error.message}`)));
        }
      });
    });
    const timer = setTimeout(() => {
      if (settled) return;
      terminateProcessTree(child, 'SIGTERM');
      child.stdin.destroy();
      child.stdout.destroy();
      child.stderr.destroy();
      const forceKill = setTimeout(() => terminateProcessTree(child, 'SIGKILL'), 50);
      forceKill.unref();
      const error = new Error(`Adapter exceeded the ${timeout}ms timeout`);
      error.code = 'ETIMEDOUT';
      settle(() => reject(error));
    }, timeout);
    timer.unref();
    child.stdin.end(input);
  });
}

export async function runEvaluations({
  casesPath,
  responsesPath = null,
  adapter = null,
  adapterArgs = [],
  adapterTimeoutMs = DEFAULT_ADAPTER_TIMEOUT_MS,
  caseId = null,
  repositoryRoot = DEFAULT_ROOT,
} = {}) {
  if (!casesPath) throw new Error('casesPath is required');
  if (!responsesPath && !adapter) throw new Error('Provide responsesPath for replay or adapter for a live run');
  if (!Number.isSafeInteger(adapterTimeoutMs) || adapterTimeoutMs <= 0) throw new Error('adapterTimeoutMs must be a positive integer');
  const casesData = await readBoundedJson(casesPath, EVALUATOR_LIMITS.replayFileBytes, 'Case definition');
  const definitionValidation = validateCaseDefinitions(casesData);
  if (definitionValidation.status !== 'pass') {
    return { schemaVersion: 3, status: 'fail', definitionErrors: definitionValidation.errors, results: [] };
  }
  const replayData = responsesPath
    ? await readBoundedJson(responsesPath, EVALUATOR_LIMITS.replayFileBytes, 'Replay')
    : null;
  if (replayData && (replayData.schemaVersion !== 3 || !replayData.responses
    || typeof replayData.responses !== 'object' || Array.isArray(replayData.responses))) {
    throw new Error('Replay must use the schemaVersion 3 response envelope');
  }
  if (replayData && Object.keys(replayData.responses).length > EVALUATOR_LIMITS.responseCount) {
    throw new Error(`Replay may contain at most ${EVALUATOR_LIMITS.responseCount} responses`);
  }
  const replay = replayData?.responses ?? null;
  const selected = caseId ? casesData.cases.filter((item) => item.id === caseId) : casesData.cases;
  if (caseId && selected.length !== 1) throw new Error(`Unknown case ${caseId}`);
  const results = [];
  for (const testCase of selected) {
    const rootSkill = await assembleSkillBundle(testCase, repositoryRoot);
    const task = {
      id: testCase.id,
      request: testCase.request,
      projectFixture: testCase.projectFixture,
    };
    if (!PROJECT_FIXTURES[task.projectFixture]) throw new Error(`Unknown project fixture ${task.projectFixture}`);
    let envelope;
    if (replay) {
      envelope = replay[testCase.id];
    } else {
      const sandbox = await materializeProjectFixture(task.projectFixture);
      try {
        envelope = await responseFromAdapter(adapter, adapterArgs, task, sandbox, rootSkill, adapterTimeoutMs);
      } finally {
        await rm(sandbox, { recursive: true, force: true });
      }
    }
    if (!envelope) throw new Error(`No response for ${testCase.id}`);
    const response = envelope.candidateResponse;
    const executionEvidence = envelope.executionEvidence;
    const evaluated = evaluateCase(testCase, response, executionEvidence);
    results.push({
      ...evaluated,
      prompt: testCase.request,
      rootContext: ROOT_SKILL_PATH,
      selectedGuides: evaluated.actualGuideReads,
      response,
      executionEvidence,
    });
  }
  return redactValue({
    schemaVersion: 3,
    runType: replay ? 'replay' : 'live-adapter',
    status: results.every((item) => item.status === 'pass') ? 'pass' : 'fail',
    results,
  });
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const casesPath = path.resolve(args.cases || path.join(DEFAULT_ROOT, 'tests/fixtures/expressivecss-skill-evals/cases.json'));
  const report = await runEvaluations({
    casesPath,
    responsesPath: typeof args.responses === 'string' ? path.resolve(args.responses) : null,
    adapter: typeof args.adapter === 'string' ? args.adapter : null,
    adapterArgs: args.adapterArgs,
    adapterTimeoutMs: typeof args['adapter-timeout-ms'] === 'string'
      ? Number(args['adapter-timeout-ms'])
      : DEFAULT_ADAPTER_TIMEOUT_MS,
    caseId: typeof args.case === 'string' ? args.case : null,
    repositoryRoot: DEFAULT_ROOT,
  });
  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (typeof args.output === 'string') await writeFile(path.resolve(args.output), output);
  else process.stdout.write(output);
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(redactValue(error.message));
    process.exitCode = 1;
  });
}
