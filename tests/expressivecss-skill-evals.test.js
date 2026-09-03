import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  PROJECT_FIXTURES,
  assembleSkillBundle,
  DEFAULT_ADAPTER_TIMEOUT_MS,
  EVALUATOR_LIMITS,
  evaluateCase,
  redactValue,
  runEvaluations,
  validateCaseDefinitions,
} from '../scripts/eval-expressivecss-skill.mjs';
import { resolveExpressiveVersion } from '../scripts/lib/resolve-expressivecss-version.mjs';

const caseData = JSON.parse(await readFile(new URL('./fixtures/expressivecss-skill-evals/cases.json', import.meta.url), 'utf8'));
const cases = caseData.cases;
const replayData = JSON.parse(await readFile(new URL('./fixtures/expressivecss-skill-evals/passing-responses.json', import.meta.url), 'utf8'));
const envelopes = replayData.responses;
const responses = Object.fromEntries(Object.entries(envelopes).map(([id, envelope]) => [id, envelope.candidateResponse]));
const executionEvidence = Object.fromEntries(Object.entries(envelopes).map(([id, envelope]) => [id, envelope.executionEvidence]));
const clone = (value) => structuredClone(value);
const TEST_LIMITS = Object.freeze({
  replayFileBytes: 1_048_576,
  caseCount: 22,
  responseCount: 22,
  traceCount: 256,
  artifactCount: 256,
  rowCount: 256,
  stringCount: 4096,
  stringBytes: 65_536,
  objectDepth: 32,
  traversalCount: 20_000,
});

function caseById(id) {
  const item = cases.find((entry) => entry.id === id);
  assert.ok(item, `missing case ${id}`);
  return item;
}

function expectMutationFailure(id, mutate, evidence) {
  const response = clone(responses[id]);
  const trusted = clone(executionEvidence[id]);
  mutate(response, trusted);
  const result = evaluateCase(caseById(id), response, trusted);
  assert.equal(result.status, 'fail', `${id} mutation passed`);
  assert.ok(result.invariants.some((item) => item.status !== 'pass' && item.evidence?.includes(evidence)), JSON.stringify(result, null, 2));
}

describe('ExpressiveCSS behavioral evaluation runner', () => {
  test('owns stable critical invariants and covers every routing boundary', () => {
    const validation = validateCaseDefinitions(caseData);
    assert.equal(validation.status, 'pass', JSON.stringify(validation, null, 2));

    for (const id of [
      'setup-only-routing',
      'css-only-markup-routing',
      'token-only-theming-routing',
      'critique-no-edit',
      'css-only-audit',
      'interactive-audit',
      'manual-init-teardown',
      'feedback-component-choice',
      'feedback-banner-choice',
      'feedback-dialog-choice',
      'switch-versus-checkbox',
      'deferred-checkbox',
      'combined-review-order',
    ]) caseById(id);

    const exactRoutes = {
      'setup-only-routing': ['expressivecss-install'],
      'css-only-markup-routing': ['expressivecss-usage', 'expressivecss-accessibility', 'component:buttons'],
      'token-only-theming-routing': ['expressivecss-theming'],
      'critique-no-edit': ['expressivecss-design', 'expressivecss-usage', 'expressivecss-theming', 'expressivecss-accessibility'],
      'css-only-audit': ['expressivecss-design', 'expressivecss-usage', 'expressivecss-accessibility', 'component:checkboxes'],
      'interactive-audit': ['expressivecss-design', 'expressivecss-usage', 'expressivecss-runtime', 'expressivecss-accessibility', 'component:navigation-drawer'],
      'feedback-component-choice': ['expressivecss-design', 'expressivecss-usage', 'expressivecss-runtime', 'expressivecss-accessibility', 'component:snackbar', 'component:banners', 'component:dialogs'],
      'feedback-banner-choice': ['expressivecss-design', 'expressivecss-usage', 'expressivecss-accessibility', 'component:snackbar', 'component:banners', 'component:dialogs'],
      'feedback-dialog-choice': ['expressivecss-design', 'expressivecss-usage', 'expressivecss-accessibility', 'component:snackbar', 'component:banners', 'component:dialogs'],
      'switch-versus-checkbox': ['expressivecss-usage', 'expressivecss-accessibility', 'component:switches', 'component:checkboxes'],
      'deferred-checkbox': ['expressivecss-usage', 'expressivecss-accessibility', 'component:switches', 'component:checkboxes'],
      'brand-through-tokens': ['expressivecss-design', 'expressivecss-usage', 'expressivecss-theming', 'expressivecss-accessibility'],
      'older-version-contract': ['expressivecss-install', 'expressivecss-design', 'expressivecss-usage', 'expressivecss-accessibility'],
    };
    for (const [id, expected] of Object.entries(exactRoutes)) {
      assert.deepEqual([...caseById(id).mustLoad].sort(), [...expected].sort(), `${id} route drifted`);
    }

    for (const item of cases) {
      assert.ok(item.expectedCriticalInvariantIds.length, `${item.id} has no stable invariant inventory`);
      assert.deepEqual(
        item.criticalInvariants.map(({ id }) => id),
        item.expectedCriticalInvariantIds,
        `${item.id} invariant inventory differs from its definitions`,
      );
      assert.ok(responses[item.id], `${item.id} has no replay response`);
      const result = evaluateCase(item, responses[item.id], executionEvidence[item.id]);
      assert.equal(result.status, 'pass', JSON.stringify(result, null, 2));
      assert.ok(result.invariants.every((invariant) => invariant.status === 'pass'));
    }
  });

  test('assembles root-only context and treats only traced file reads as loaded guides', async () => {
    const item = caseById('interactive-audit');
    const bundle = await assembleSkillBundle(item, new URL('..', import.meta.url));
    assert.match(bundle, /# ExpressiveCSS/);
    assert.doesNotMatch(bundle, /# ExpressiveCSS design and review/);
    assert.doesNotMatch(bundle, /## ExpressiveCSS JavaScript runtime/);
    assert.doesNotMatch(bundle, /\/home\/|[A-Z]:\\Users\\/);

    const result = evaluateCase(item, responses[item.id], executionEvidence[item.id]);
    assert.deepEqual(result.actualGuideReads.sort(), [...item.mustLoad].sort());
    assert.ok(executionEvidence[item.id].toolTrace.every((event) => event.operation !== 'load-guide'));
    assert.ok(executionEvidence[item.id].toolTrace.some((event) => event.operation === 'read'
      && event.path.endsWith('/expressivecss-runtime/SKILL.md')));
  });

  test('rejects symlinked and oversized root skills before adapter execution', async () => {
    const symlinkRoot = await mkdtemp(path.join(tmpdir(), 'expressivecss-eval-root-symlink-'));
    const outsideRoot = await mkdtemp(path.join(tmpdir(), 'expressivecss-eval-root-outside-'));
    const oversizedRoot = await mkdtemp(path.join(tmpdir(), 'expressivecss-eval-root-oversized-'));
    try {
      await mkdir(path.join(symlinkRoot, 'skills', 'expressivecss'), { recursive: true });
      const outsideSkill = path.join(outsideRoot, 'SKILL.md');
      await writeFile(outsideSkill, '# outside');
      await symlink(outsideSkill, path.join(symlinkRoot, 'skills', 'expressivecss', 'SKILL.md'));
      await assert.rejects(
        assembleSkillBundle(caseById('interactive-audit'), symlinkRoot),
        /symbolic link|outside the repository/u,
      );

      await mkdir(path.join(oversizedRoot, 'skills', 'expressivecss'), { recursive: true });
      await writeFile(
        path.join(oversizedRoot, 'skills', 'expressivecss', 'SKILL.md'),
        'x'.repeat(EVALUATOR_LIMITS.rootSkillBytes + 1),
      );
      await assert.rejects(
        assembleSkillBundle(caseById('interactive-audit'), oversizedRoot),
        /exceeds/u,
      );
    } finally {
      await Promise.all([
        rm(symlinkRoot, { recursive: true, force: true }),
        rm(outsideRoot, { recursive: true, force: true }),
        rm(oversizedRoot, { recursive: true, force: true }),
      ]);
    }
  });

  test('requires every case to declare the generic response contract fields', () => {
    for (const field of [
      'requiredDecisionFields',
      'requiredReportFields',
      'forbiddenEdits',
      'forbiddenMarkup',
      'forbiddenClasses',
      'forbiddenAuthoredRuntimeAria',
      'forbiddenUnsupportedClaims',
    ]) {
      const mutated = clone(caseData);
      delete mutated.cases[0][field];
      const validation = validateCaseDefinitions(mutated);
      assert.equal(validation.status, 'fail', `${field} omission passed`);
      assert.ok(validation.errors.some((error) => error.includes(field)), JSON.stringify(validation));
    }
  });

  test('rejects malformed entries in generic case contract arrays', () => {
    const mutated = clone(caseData);
    mutated.cases[0].requiredReportFields.push(42);
    mutated.cases[0].forbiddenClasses.push('');
    const validation = validateCaseDefinitions(mutated);
    assert.equal(validation.status, 'fail');
    assert.ok(validation.errors.some((error) => error.includes('requiredReportFields')));
    assert.ok(validation.errors.some((error) => error.includes('forbiddenClasses')));
  });

  test('rejects an omitted required decision or report deliverable generically', () => {
    const response = clone(responses['feedback-component-choice']);
    delete response.selectedComponent;
    const result = evaluateCase(caseById('feedback-component-choice'), response, executionEvidence['feedback-component-choice']);
    assert.equal(result.status, 'fail');
    assert.ok(result.invariants.some((item) => item.id === 'contract/required-fields' && item.status === 'fail'));
  });

  test('enforces every forbidden-content category generically', () => {
    const mutations = [
      ['critique-no-edit', (response, trusted) => {
        trusted.toolTrace.push({
          sequence: 99,
          timestamp: '2026-09-03T00:09:00.000Z',
          operation: 'write',
          path: 'src/forbidden.css',
          status: 'success',
          authenticated: true,
        });
      }, 'contract/forbidden-edits'],
      ['setup-only-routing', (response) => { response.markup = '<script src="untrusted.js"></script>'; }, 'contract/forbidden-content'],
      ['css-only-markup-routing', (response) => {
        response.markup = '<button class="btn" aria-expanded="true">Open</button>';
        response.claim = 'Full visual audit passed';
      }, 'contract/forbidden-content'],
      ['runtime-owned-aria', (response) => { response.sourceMarkup += ' aria-expanded="true"'; }, 'contract/forbidden-content'],
      ['mcp-pass-is-scoped', (response) => { response.claim = 'Full visual review passed'; }, 'contract/forbidden-content'],
    ];
    for (const [id, mutate, invariantId] of mutations) {
      const response = clone(responses[id]);
      const trusted = clone(executionEvidence[id]);
      mutate(response, trusted);
      const result = evaluateCase(caseById(id), response, trusted);
      assert.equal(result.status, 'fail', `${id} forbidden mutation passed`);
      assert.ok(result.invariants.some((item) => item.id === invariantId && item.status === 'fail'), JSON.stringify(result));
    }
  });

  test('rejects forbidden classes in unquoted HTML and JSX class attributes', () => {
    for (const markup of [
      '<button class=btn>Open</button>',
      '<button className="btn">Open</button>',
    ]) {
      const response = clone(responses['css-only-markup-routing']);
      response.markup = markup;
      const result = evaluateCase(
        caseById('css-only-markup-routing'),
        response,
        executionEvidence['css-only-markup-routing'],
      );
      assert.equal(result.status, 'fail', `${markup} passed`);
      assert.ok(result.invariants.some((item) => item.id === 'contract/forbidden-content' && item.status === 'fail'));
    }
  });

  test('scans alternate code fields and literal JSX expressions for forbidden content', () => {
    for (const [field, value] of [
      ['html', '<script src="evil.js"></script>'],
      ['code', '<button class=btn>Legacy</button>'],
      ['snippet', '<button className={"btn"}>Legacy</button>'],
      ['source', "<button className={'btn'}>Legacy</button>"],
      ['content', '<button className={`btn`}>Legacy</button>'],
    ]) {
      expectMutationFailure('css-only-markup-routing', (response) => { response[field] = value; }, 'forbidden');
    }
  });

  test('accepts the 22-case boundary and rejects one case over the limit', () => {
    assert.equal(caseData.cases.length, TEST_LIMITS.caseCount);
    assert.equal(validateCaseDefinitions(caseData).status, 'pass');
    const overLimit = clone(caseData);
    overLimit.cases.push({ ...clone(overLimit.cases[0]), id: 'case-over-limit' });
    const validation = validateCaseDefinitions(overLimit);
    assert.equal(validation.status, 'fail');
    assert.ok(validation.errors.some((error) => error.includes(`at most ${TEST_LIMITS.caseCount} cases`)), JSON.stringify(validation));
  });

  test('accepts 22 replay responses and rejects one extra response', async () => {
    assert.equal(Object.keys(envelopes).length, TEST_LIMITS.responseCount);
    const directory = await mkdtemp(path.join(tmpdir(), 'expressivecss-eval-response-limit-'));
    try {
      const replayPath = path.join(directory, 'replay.json');
      const overLimit = clone(replayData);
      overLimit.responses.extra = clone(envelopes['setup-only-routing']);
      await writeFile(replayPath, JSON.stringify(overLimit));
      await assert.rejects(
        runEvaluations({
          casesPath: new URL('./fixtures/expressivecss-skill-evals/cases.json', import.meta.url).pathname,
          responsesPath: replayPath,
          caseId: 'setup-only-routing',
          repositoryRoot: new URL('..', import.meta.url),
        }),
        new RegExp(`at most ${TEST_LIMITS.responseCount} responses`),
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('accepts a replay at the byte limit and rejects one byte over', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'expressivecss-eval-byte-limit-'));
    try {
      const replayPath = path.join(directory, 'replay.json');
      const serialized = JSON.stringify(replayData);
      assert.ok(Buffer.byteLength(serialized) < TEST_LIMITS.replayFileBytes);
      const atLimit = serialized + ' '.repeat(TEST_LIMITS.replayFileBytes - Buffer.byteLength(serialized));
      await writeFile(replayPath, atLimit);
      const report = await runEvaluations({
        casesPath: new URL('./fixtures/expressivecss-skill-evals/cases.json', import.meta.url).pathname,
        responsesPath: replayPath,
        caseId: 'setup-only-routing',
        repositoryRoot: new URL('..', import.meta.url),
      });
      assert.equal(report.status, 'pass');
      await writeFile(replayPath, `${atLimit} `);
      await assert.rejects(
        runEvaluations({
          casesPath: new URL('./fixtures/expressivecss-skill-evals/cases.json', import.meta.url).pathname,
          responsesPath: replayPath,
          caseId: 'setup-only-routing',
          repositoryRoot: new URL('..', import.meta.url),
        }),
        /replay file exceeds 1048576 bytes/i,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('accepts trace, artifact, and row boundaries and rejects one item over each limit', () => {
    const response = clone(responses['setup-only-routing']);
    const trusted = clone(executionEvidence['setup-only-routing']);
    trusted.artifacts = Array.from({ length: TEST_LIMITS.artifactCount }, (_, index) => ({
      id: `artifact-${index}`,
      category: 'source',
      criterionId: 'limit-test',
      componentId: 'limit-test',
      observation: 'Observed at the artifact-count boundary.',
      expectedObservation: 'Observed at the artifact-count boundary.',
      sequence: index + 1,
      timestamp: new Date(Date.UTC(2026, 0, 2, 0, 0, index + 1)).toISOString(),
    }));
    response.reviewRows = Array.from({ length: TEST_LIMITS.rowCount }, (_, index) => ({
      criterionId: `limit-criterion-${index}`,
      componentId: 'limit-test',
      status: 'Blocked',
      blockerReason: 'Boundary fixture intentionally blocks this synthetic row.',
      evidenceIds: [],
    }));
    trusted.toolTrace = Array.from({ length: TEST_LIMITS.traceCount }, (_, index) => ({
      sequence: index + 1,
      timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, index + 1)).toISOString(),
      operation: index === 0 ? 'read' : 'write',
      path: index === 0 ? 'skills/expressivecss/expressivecss-install/SKILL.md' : `src/generated-${index}.css`,
      status: 'success',
    }));
    const limitCase = clone(caseById('setup-only-routing'));
    limitCase.artifactExpectations = trusted.artifacts.map(({
      id, category, criterionId, componentId, expectedObservation,
    }) => ({ id, category, criterionId, componentId, expectedObservation }));
    assert.equal(evaluateCase(limitCase, response, trusted).status, 'pass');

    for (const mutate of [
      (_candidate, evidence) => evidence.toolTrace.push({
        sequence: TEST_LIMITS.traceCount + 1,
        timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, TEST_LIMITS.traceCount + 1)).toISOString(),
        operation: 'write',
        path: 'src/one-too-many.css',
        status: 'success',
      }),
      (_candidate, evidence) => evidence.artifacts.push({
        id: 'one-too-many',
        category: 'source',
        criterionId: 'limit-test',
        componentId: 'limit-test',
        observation: 'One over the artifact boundary.',
        expectedObservation: 'One over the artifact boundary.',
        sequence: TEST_LIMITS.artifactCount + 1,
        timestamp: new Date(Date.UTC(2026, 0, 2, 0, 0, TEST_LIMITS.artifactCount + 1)).toISOString(),
      }),
      (candidate) => candidate.reviewRows.push({
        criterionId: 'one-too-many',
        componentId: 'limit-test',
        status: 'Blocked',
        blockerReason: 'One over the review-row boundary.',
        evidenceIds: [],
      }),
    ]) {
      const overResponse = clone(response);
      const overTrusted = clone(trusted);
      mutate(overResponse, overTrusted);
      const result = evaluateCase(limitCase, overResponse, overTrusted);
      assert.equal(result.status, 'fail');
      assert.ok(result.invariants.some((item) => item.id === 'limits/structure' && item.status === 'fail'), JSON.stringify(result));
    }
  });

  test('rejects oversized strings in candidate output and trusted trace fields', () => {
    const oversized = 'x'.repeat(TEST_LIMITS.stringBytes + 1);
    const mutations = [
      [(candidate) => { candidate.details = oversized; }],
      [(_candidate, trusted) => { trusted.toolTrace[1].path = oversized; }],
      [(_candidate, trusted) => { trusted.toolTrace[1].message = oversized; }],
    ];
    for (const [mutate] of mutations) {
      const response = clone(responses['setup-only-routing']);
      const trusted = clone(executionEvidence['setup-only-routing']);
      mutate(response, trusted);
      const result = evaluateCase(caseById('setup-only-routing'), response, trusted);
      assert.equal(result.status, 'fail');
      assert.ok(result.invariants.some((item) => item.id === 'limits/structure' && item.status === 'fail'), JSON.stringify(result));
    }
  });

  test('rejects oversized object keys and redacts credential-shaped keys', () => {
    const response = clone(responses['setup-only-routing']);
    response['x'.repeat(TEST_LIMITS.stringBytes + 1)] = 'value';
    const result = evaluateCase(
      caseById('setup-only-routing'),
      response,
      executionEvidence['setup-only-routing'],
    );
    assert.equal(result.status, 'fail');
    assert.ok(result.invariants.some((item) => item.id === 'limits/structure' && item.status === 'fail'));

    const secretKey = `sk-${'q'.repeat(30)}`;
    const serialized = JSON.stringify(redactValue({ [secretKey]: 'value' }));
    assert.ok(!serialized.includes(secretKey));
    assert.match(serialized, /\[REDACTED_KEY/u);
  });

  test('accepts the maximum object depth and rejects one nested object beyond it', () => {
    const buildAtDepth = (depth) => {
      const response = clone(responses['setup-only-routing']);
      response.nested = {};
      let current = response.nested;
      for (let index = 1; index < depth; index += 1) {
        current.next = {};
        current = current.next;
      }
      current.flag = true;
      return response;
    };
    const trusted = executionEvidence['setup-only-routing'];
    assert.equal(evaluateCase(caseById('setup-only-routing'), buildAtDepth(TEST_LIMITS.objectDepth), trusted).status, 'pass');
    const overLimit = buildAtDepth(TEST_LIMITS.objectDepth + 1);
    const result = evaluateCase(caseById('setup-only-routing'), overLimit, trusted);
    assert.equal(result.status, 'fail');
    assert.ok(result.invariants.some((item) => item.id === 'limits/structure' && item.status === 'fail'));
  });

  test('accepts string and traversal count boundaries and rejects one value over', () => {
    const countValues = (roots, stringsOnly = false) => {
      const stack = [...roots];
      const seen = new WeakSet();
      let count = 0;
      while (stack.length > 0) {
        const value = stack.pop();
        if (!stringsOnly || typeof value === 'string') count += 1;
        if (!value || typeof value !== 'object' || seen.has(value)) continue;
        seen.add(value);
        stack.push(...Object.values(value));
      }
      return count;
    };

    const stringResponse = clone(responses['setup-only-routing']);
    const trusted = clone(executionEvidence['setup-only-routing']);
    const baseStrings = countValues([stringResponse, trusted], true);
    stringResponse.paddingStrings = Array(TEST_LIMITS.stringCount - baseStrings).fill('ok');
    assert.equal(evaluateCase(caseById('setup-only-routing'), stringResponse, trusted).status, 'pass');
    stringResponse.paddingStrings.push('one-too-many');
    assert.equal(evaluateCase(caseById('setup-only-routing'), stringResponse, trusted).status, 'fail');

    const traversalResponse = clone(responses['setup-only-routing']);
    traversalResponse.paddingValues = [];
    const baseValues = countValues([traversalResponse, trusted]);
    traversalResponse.paddingValues = Array(TEST_LIMITS.traversalCount - baseValues).fill(null);
    assert.equal(evaluateCase(caseById('setup-only-routing'), traversalResponse, trusted).status, 'pass');
    traversalResponse.paddingValues.push(null);
    assert.equal(evaluateCase(caseById('setup-only-routing'), traversalResponse, trusted).status, 'fail');
  });

  test('uses schema version 3 even when case-definition validation fails', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'expressivecss-eval-schema-version-'));
    try {
      const casesPath = path.join(directory, 'cases.json');
      const invalid = clone(caseData);
      delete invalid.cases[0].requiredReportFields;
      await writeFile(casesPath, JSON.stringify(invalid));
      const report = await runEvaluations({
        casesPath,
        responsesPath: new URL('./fixtures/expressivecss-skill-evals/passing-responses.json', import.meta.url).pathname,
        caseId: 'setup-only-routing',
        repositoryRoot: new URL('..', import.meta.url),
      });
      assert.equal(report.status, 'fail');
      assert.equal(report.schemaVersion, 3);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('rejects executable regular-expression assertions', () => {
    const mutated = clone(caseData);
    mutated.cases[0].criticalInvariants[0].operator = 'matches';
    mutated.cases[0].criticalInvariants[0].value = '(a+)+$';
    const validation = validateCaseDefinitions(mutated);
    assert.equal(validation.status, 'fail');
    assert.ok(validation.errors.some((error) => error.includes('unknown operator matches')));
  });

  test('fails closed for missing, duplicate, unknown, and unevaluated critical invariants', () => {
    const original = caseById('critique-no-edit');

    const missing = clone(original);
    missing.criticalInvariants.pop();
    assert.equal(evaluateCase(missing, responses[original.id], executionEvidence[original.id]).status, 'fail');

    const duplicate = clone(original);
    duplicate.criticalInvariants.push(clone(duplicate.criticalInvariants[0]));
    assert.equal(evaluateCase(duplicate, responses[original.id], executionEvidence[original.id]).status, 'fail');

    const unknown = clone(original);
    unknown.criticalInvariants[0].id = 'UNKNOWN-CRITICAL-INVARIANT';
    unknown.expectedCriticalInvariantIds[0] = 'UNKNOWN-CRITICAL-INVARIANT';
    assert.equal(evaluateCase(unknown, responses[original.id], executionEvidence[original.id]).status, 'fail');

    const unevaluated = clone(responses[original.id]);
    delete unevaluated.mode;
    const result = evaluateCase(original, unevaluated, executionEvidence[original.id]);
    assert.equal(result.status, 'fail');
    assert.ok(result.invariants.some((item) => item.status === 'unevaluated'));
  });

  test('rejects candidate-authored guide reads and filesystem hashes without trusted execution evidence', () => {
    const candidate = {
      ...clone(responses['critique-no-edit']),
      toolTrace: clone(executionEvidence['critique-no-edit'].toolTrace),
      preRunFilesystemHash: 'sha256:candidate-before',
      postRunFilesystemHash: 'sha256:candidate-before',
    };
    const result = evaluateCase(caseById('critique-no-edit'), candidate);
    assert.equal(result.status, 'fail');
    assert.ok(result.invariants.some((item) => item.id === 'execution/trusted-evidence' && item.status === 'fail'));
  });

  test('accepts the separated replay envelope and keeps candidate content separate in reports', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'expressivecss-eval-envelope-'));
    try {
      const replayPath = path.join(directory, 'replay.json');
      await writeFile(replayPath, JSON.stringify({
        schemaVersion: 3,
        responses: {
          'setup-only-routing': clone(envelopes['setup-only-routing']),
        },
      }));
      const report = await runEvaluations({
        casesPath: new URL('./fixtures/expressivecss-skill-evals/cases.json', import.meta.url).pathname,
        responsesPath: replayPath,
        caseId: 'setup-only-routing',
        repositoryRoot: new URL('..', import.meta.url),
      });
      assert.equal(report.status, 'pass', JSON.stringify(report, null, 2));
      assert.ok(!Object.hasOwn(report.results[0].response, 'toolTrace'));
      assert.equal(report.results[0].executionEvidence.source, 'adapter');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('rejects malformed or unsuccessful trusted execution events', () => {
    const trusted = clone(executionEvidence['setup-only-routing']);
    trusted.toolTrace[1].operation = 'candidate-claim';
    const result = evaluateCase(caseById('setup-only-routing'), responses['setup-only-routing'], trusted);
    assert.equal(result.status, 'fail');
    assert.ok(result.invariants.some((item) => item.id === 'execution/trusted-evidence' && item.status === 'fail'));
  });

  test('rejects unsuccessful, duplicate, backward, or invalid trusted events and malformed hashes', () => {
    const mutations = [
      (trusted) => { trusted.toolTrace[0].status = 'failure'; },
      (trusted) => { trusted.toolTrace[1].sequence = trusted.toolTrace[0].sequence; },
      (trusted) => { trusted.toolTrace[1].timestamp = trusted.toolTrace[0].timestamp; },
      (trusted) => { trusted.toolTrace[0].timestamp = 'not-a-timestamp'; },
      (trusted) => { trusted.toolTrace[0].timestamp = '0'; },
      (trusted) => { trusted.filesystem.before = 'sha256:short'; },
      (trusted) => { trusted.filesystem.after = `sha256:${'A'.repeat(64)}`; },
      (trusted) => { trusted.filesystem.independentlyComputed = false; },
      (trusted) => { trusted.filesystem.source = 'candidate'; },
    ];
    for (const mutate of mutations) {
      const trusted = clone(executionEvidence['setup-only-routing']);
      mutate(trusted);
      const result = evaluateCase(caseById('setup-only-routing'), responses['setup-only-routing'], trusted);
      assert.equal(result.status, 'fail');
      assert.ok(result.invariants.some((item) => item.id === 'execution/trusted-evidence' && item.status === 'fail'));
    }
  });

  test('rejects a missing required guide-read event', () => {
    expectMutationFailure('interactive-audit', (_response, trusted) => {
      trusted.toolTrace = trusted.toolTrace.filter((event) => !event.path?.endsWith('/expressivecss-runtime/SKILL.md'));
    }, 'actual guide read');
  });

  test('rejects a write during a no-edit mode', () => {
    expectMutationFailure('critique-no-edit', (_response, trusted) => {
      trusted.toolTrace.push({
        sequence: 99,
        timestamp: '2026-09-03T00:09:00.000Z',
        operation: 'write',
        path: 'src/app.css',
        status: 'success',
        authenticated: true,
      });
      trusted.filesystem.after = 'sha256:mutated';
    }, 'write trace');
  });

  test('accepts only operator-controlled evidence artifacts', () => {
    const testCase = cases.find((item) => item.id === 'interactive-audit');
    const envelope = clone(envelopes['interactive-audit']);
    assert.equal(evaluateCase(testCase, envelope.candidateResponse, envelope.executionEvidence).status, 'pass');

    const forged = clone(envelope);
    forged.candidateResponse.evidenceArtifacts = forged.executionEvidence.artifacts.map((artifact) => ({
      ...artifact,
      observation: 'fabricated',
      expectedObservation: 'fabricated',
    }));
    delete forged.executionEvidence.artifacts;
    assert.equal(evaluateCase(testCase, forged.candidateResponse, forged.executionEvidence).status, 'fail');
  });

  test('rejects a missing required evidence artifact', () => {
    expectMutationFailure('interactive-audit', (_response, trusted) => {
      trusted.artifacts = trusted.artifacts.filter((artifact) => artifact.category !== 'accessibility-tree');
    }, 'required evidence');
  });

  test('uses fixture-owned expected observations instead of trusted-producer expectations', () => {
    const producerClaim = clone(executionEvidence['interactive-audit']);
    producerClaim.artifacts[0].expectedObservation = 'Contradictory observation';
    assert.equal(evaluateCase(caseById('interactive-audit'), responses['interactive-audit'], producerClaim).status, 'pass');
    expectMutationFailure('interactive-audit', (_response, trusted) => {
      trusted.artifacts[0].expectedObservation = 'Fabricated replacement observation';
      trusted.artifacts[0].observation = 'Fabricated replacement observation';
    }, 'fixture-owned artifact expectations');
  });

  test('rejects unknown review statuses', () => {
    expectMutationFailure('critique-no-edit', (response) => {
      response.reviewRows[0].status = 'Looks good';
    }, 'review status');
  });

  test('fails closed on malformed candidate rows and collection types', () => {
    for (const mutate of [
      (response) => { response.reviewRows[0] = { status: 'Blocked', blockerReason: 'Unavailable.', evidenceIds: [] }; },
      (response) => { response.coverageRecords = {}; },
    ]) {
      const response = clone(responses['interactive-audit']);
      mutate(response);
      assert.doesNotThrow(() => evaluateCase(caseById('interactive-audit'), response, executionEvidence['interactive-audit']));
      assert.equal(evaluateCase(caseById('interactive-audit'), response, executionEvidence['interactive-audit']).status, 'fail');
    }
  });

  test('binds candidate case IDs to the selected fixture', () => {
    for (const caseId of [null, 'wrong-case', 'css-only-audit']) {
      expectMutationFailure('interactive-audit', (response) => { response.caseId = caseId; }, 'selected fixture ID');
    }
  });

  test('requires trusted artifact IDs and chronology to be unique and increasing', () => {
    expectMutationFailure('interactive-audit', (_response, trusted) => {
      trusted.artifacts.push(clone(trusted.artifacts[0]));
    }, 'trusted artifact');
    expectMutationFailure('interactive-audit', (_response, trusted) => {
      trusted.artifacts[1].sequence = trusted.artifacts[0].sequence;
    }, 'trusted artifact');
    expectMutationFailure('interactive-audit', (_response, trusted) => {
      trusted.artifacts[1].timestamp = '2026-09-02T23:59:59.000Z';
    }, 'trusted artifact');
  });

  test('requires status-specific fields for every non-Pass review row', () => {
    const mutations = [
      ['Intentional adaptation', { rationale: '', accessibilityPreserved: false, evidenceIds: [] }],
      ['Blocked', { blockerReason: '', evidenceIds: ['artifact-source'] }],
      ['Not applicable', { applicabilityReason: '', evidenceIds: [] }],
      ['Fail', { observedDeviation: '', correction: '', evidenceIds: [] }],
    ];
    for (const [status, fields] of mutations) {
      expectMutationFailure('interactive-audit', (response) => {
        Object.assign(response.reviewRows[0], { status }, fields);
      }, 'status-specific');
    }
  });

  test('rejects Pass evidence for another criterion or component', () => {
    expectMutationFailure('interactive-audit', (_response, trusted) => {
      trusted.artifacts.find((artifact) => artifact.id === 'artifact-source').criterionId = 'A-LABEL';
    }, 'criterion and component');

    expectMutationFailure('interactive-audit', (_response, trusted) => {
      trusted.artifacts.find((artifact) => artifact.id === 'artifact-source').componentId = 'other-drawer';
    }, 'criterion and component');
  });

  test('does not let unrelated artifacts satisfy criterion-owned evidence kinds', () => {
    expectMutationFailure('interactive-audit', (_response, trusted) => {
      const artifact = trusted.artifacts.find((item) => item.id === 'artifact-accessibility-tree');
      artifact.category = 'source';
      trusted.artifacts.push({
        id: 'unrelated-accessibility-tree',
        category: 'accessibility-tree',
        observation: 'An unrelated accessibility tree',
        sequence: 99,
        timestamp: '2026-09-03T00:01:39.000Z',
        criterionId: 'A-OTHER',
        componentId: 'other-component',
      });
    }, 'criterion-owned required evidence');
  });

  test('rejects Not applicable as a substitute for blocked evidence', () => {
    expectMutationFailure('reachable-state-ledger', (response) => {
      response.coverageRecords.find((record) => record.inventoryId === 'state-permission').result = 'Not applicable';
    }, 'missing evidence');
  });

  test('rejects Audit evidence collected before Critique evidence', () => {
    expectMutationFailure('combined-review-order', (_response, trusted) => {
      trusted.artifacts.find((artifact) => artifact.mode === 'Audit').sequence = 1;
    }, 'Critique before Audit');
  });

  test('rejects a state omitted from fixture-owned coverage', () => {
    expectMutationFailure('reachable-state-ledger', (response) => {
      response.coverageRecords = response.coverageRecords.filter((record) => record.inventoryId !== 'state-offline');
    }, 'fixture-owned coverage');
  });

  test('rejects coverage Pass records with missing or mismatched artifacts', () => {
    expectMutationFailure('reachable-state-ledger', (_response, trusted) => {
      trusted.artifacts = trusted.artifacts.filter((artifact) => artifact.id !== 'coverage-state-loading');
    }, 'coverage evidence');

    expectMutationFailure('reachable-state-ledger', (_response, trusted) => {
      trusted.artifacts.find((artifact) => artifact.id === 'coverage-state-loading').componentId = 'other-surface';
    }, 'coverage evidence');

    expectMutationFailure('reachable-state-ledger', (response) => {
      response.coverageRecords.find((record) => record.inventoryId === 'state-empty').evidenceIds = ['coverage-state-loading'];
    }, 'coverage evidence');
  });

  test('requires Blocked coverage to have no evidence and a reason', () => {
    expectMutationFailure('reachable-state-ledger', (response) => {
      const blocked = response.coverageRecords.find((record) => record.result === 'Blocked');
      blocked.evidenceIds = ['coverage-state-loading'];
      blocked.blockerReason = '';
    }, 'Blocked coverage');
  });

  test('rejects one altered matched-capture dimension', () => {
    expectMutationFailure('matched-before-after', (response) => {
      response.capturePairs[0].after.viewportWidth = 1025;
    }, 'exact capture dimensions');
  });

  test('binds matched dimensions to trusted rendered artifacts', () => {
    expectMutationFailure('matched-before-after', (response) => {
      response.capturePairs[0].before.viewportWidth = 777;
      response.capturePairs[0].after.viewportWidth = 777;
    }, 'matched capture');
  });

  test('requires matched capture IDs to resolve to rendered before and after artifacts', () => {
    expectMutationFailure('matched-before-after', (_response, trusted) => {
      trusted.artifacts.find((artifact) => artifact.captureRole === 'after').captureRole = 'before';
    }, 'rendered before and after artifacts');

    expectMutationFailure('matched-before-after', (_response, trusted) => {
      trusted.artifacts.find((artifact) => artifact.captureRole === 'after').category = 'source';
    }, 'rendered before and after artifacts');
  });

  test('binds matched capture chronology to artifact metadata and the trusted first edit', () => {
    expectMutationFailure('matched-before-after', (_response, trusted) => {
      trusted.artifacts.find((artifact) => artifact.captureRole === 'before').sequence = 25;
    }, 'capture chronology');

    expectMutationFailure('matched-before-after', (_response, trusted) => {
      trusted.artifacts.find((artifact) => artifact.captureRole === 'after').timestamp = '2026-09-03T00:00:15.000Z';
    }, 'capture chronology');

    expectMutationFailure('matched-before-after', (response) => {
      response.capturePairs[0].firstEditSequence = 21;
    }, 'capture chronology');
  });

  test('rejects candidate-invented Refine preservation claims', () => {
    expectMutationFailure('refine-preserves-product', (response) => {
      for (const field of Object.keys(response.protectedBefore)) {
        response.protectedBefore[field] = 'invented';
        response.protectedAfter[field] = 'invented';
      }
    }, 'refine-preserves-product/contract');
  });

  test('rejects candidate-invented adaptive navigation claims', () => {
    expectMutationFailure('adaptive-navigation', (response) => {
      for (const entry of response.navigationByWidth) {
        entry.width = 1;
        entry.visiblePatterns = ['bogus'];
        entry.accessibilityExposedPatterns = ['bogus'];
        entry.destinations = ['x'];
        entry.currentDestination = 'x';
      }
    }, 'adaptive-navigation/contract');
  });

  test('materializes a concrete 0.7.0 install for the older-version fixture', async () => {
    const files = PROJECT_FIXTURES['consumer-older-version'];
    const root = await mkdtemp(path.join(tmpdir(), 'expressivecss-older-fixture-'));
    try {
      for (const [relative, content] of Object.entries(files)) {
        const target = path.join(root, relative);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, content);
      }
      const result = await resolveExpressiveVersion({
        projectRoot: root,
        contractVersion: '0.8.0',
        contractManifestPath: path.join(process.cwd(), 'skills/expressivecss/references/contract.json'),
      });
      assert.equal(result.resolvedVersion, '0.7.0');
      assert.equal(result.resolutionSource, 'installed-package');
      assert.equal(result.status, 'mismatch');
      assert.equal(result.documentationMode, 'matching-tag');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('requires fixture-owned requirement and accessibility evidence for Redesign', () => {
    expectMutationFailure('redesign-preserves-requirements', (response) => {
      response.requirements[0].evidenceIds = [];
    }, 'critical invariant');
    expectMutationFailure('redesign-preserves-requirements', (response, trusted) => {
      trusted.artifacts.find((artifact) => artifact.id === 'redesign-requirement-account').observation = 'Different result';
    }, 'fixture-owned artifact expectations');
    expectMutationFailure('redesign-preserves-requirements', (response) => {
      response.accessibilityAssertions[0].id = 'candidate-invented';
    }, 'critical invariant');
  });

  test('requires an explicit classification for matched visible differences', () => {
    expectMutationFailure('matched-before-after', (response) => {
      response.capturePairs[0].visibleDifferences = [];
    }, 'visible-difference classification');
  });

  test('rejects a broad review pass synthesized from scoped MCP output', () => {
    expectMutationFailure('mcp-pass-is-scoped', (response) => {
      response.fullReviewStatus = 'Pass';
    }, 'scoped MCP pass');
  });

  test('redacts secrets and local paths in stored reports', () => {
    const redacted = redactValue({
      apiKey: 'private-value',
      cookie: 'session=secret-cookie-value',
      setCookie: 'auth=secret-set-cookie-value',
      output: [
        'TOKEN=test-secret-value',
        'Authorization: Bearer bearer-secret-value',
        'Cookie: session=header-cookie-value',
        'Set-Cookie: auth=header-set-cookie-value; Secure',
        `ghp_${'x'.repeat(30)}`,
        `sk-${'y'.repeat(30)}`,
        `AWS_ACCESS_KEY_ID=AKIA${'Z'.repeat(16)}`,
        '{"client_secret":"json-secret-value"}',
        '/home/alice/project',
        'C:\\\\Users\\\\alice\\\\project',
        'https://name:password@example.com',
      ].join('\n'),
    });
    const serialized = JSON.stringify(redacted);
    for (const secret of [
      'private-value',
      'secret-cookie-value',
      'secret-set-cookie-value',
      'test-secret-value',
      'bearer-secret-value',
      'header-cookie-value',
      'header-set-cookie-value',
      `ghp_${'x'.repeat(30)}`,
      `sk-${'y'.repeat(30)}`,
      `AKIA${'Z'.repeat(16)}`,
      'json-secret-value',
      '/home/alice',
      'C:\\\\Users\\\\alice',
      'name:password',
    ]) {
      assert.ok(!serialized.includes(secret), `report leaked ${secret}`);
    }
    assert.match(serialized, /\[REDACTED\]/);
    assert.match(serialized, /\[LOCAL_PATH\]/);
  });

  test('redacts credential-shaped keys, provider tokens, bearer/JWT forms, and local paths', () => {
    const values = {
      service_api_key_backup: 'key-shaped-value',
      primaryCredential: 'credential-shaped-value',
      npm: `npm_${'n'.repeat(36)}`,
      provider: `xoxb-${'1'.repeat(12)}-${'a'.repeat(24)}`,
      jwt: `${'e'.repeat(20)}.${'f'.repeat(20)}.${'g'.repeat(20)}`,
      bearer: `Bearer ${'b'.repeat(32)}`,
      paths: [
        '/Users/alice/project',
        '/root/project',
        '/tmp/worktree-123/project',
        '/private/var/folders/ab/worktree/project',
        'C:\\Users\\alice\\project',
      ],
    };
    const serialized = JSON.stringify(redactValue(values));
    for (const value of [
      values.service_api_key_backup,
      values.primaryCredential,
      values.npm,
      values.provider,
      values.jwt,
      values.bearer.slice('Bearer '.length),
      ...values.paths,
    ]) assert.ok(!serialized.includes(value));
    assert.match(serialized, /\[REDACTED\]/);
    assert.match(serialized, /\[LOCAL_PATH\]/);
  });

  test('redaction is iterative and truncates only after depth and string-size boundaries', () => {
    const nested = (depth) => {
      const root = {};
      let current = root;
      for (let index = 0; index < depth; index += 1) {
        current.next = {};
        current = current.next;
      }
      current.apiKey = 'deep-secret-value';
      return root;
    };
    const atDepthLimit = redactValue(nested(TEST_LIMITS.objectDepth));
    assert.ok(!JSON.stringify(atDepthLimit).includes('deep-secret-value'));
    assert.doesNotThrow(() => redactValue(nested(10_000)));
    assert.match(JSON.stringify(redactValue(nested(TEST_LIMITS.objectDepth + 1))), /\[TRUNCATED\]/);
    assert.equal(redactValue('x'.repeat(TEST_LIMITS.stringBytes)).length, TEST_LIMITS.stringBytes);
    assert.equal(redactValue('x'.repeat(TEST_LIMITS.stringBytes + 1)), '[TRUNCATED]');
  });

  test('redaction preserves repeated safe references while truncating cycles', () => {
    const shared = ['safe'];
    const value = { first: shared, second: shared };
    value.self = value;
    assert.deepEqual(redactValue(value), {
      first: ['safe'],
      second: ['safe'],
      self: '[TRUNCATED]',
    });
  });

  test('redaction stops work after traversal and string-count limits', () => {
    const tooManyValues = Array(TEST_LIMITS.traversalCount * 2).fill(null);
    assert.ok(redactValue(tooManyValues).length <= TEST_LIMITS.traversalCount);
    const tooManyStrings = Array(TEST_LIMITS.stringCount * 2).fill('safe');
    assert.ok(redactValue(tooManyStrings).length <= TEST_LIMITS.stringCount + 1);
  });

  test('keeps the scoring oracle private and gives a live adapter a materialized sandbox', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'expressivecss-eval-adapter-'));
    try {
      const adapterPath = path.join(directory, 'adapter.mjs');
      const responsePath = new URL('./fixtures/expressivecss-skill-evals/passing-responses.json', import.meta.url).pathname;
      await writeFile(adapterPath, `
        import { readFileSync } from 'node:fs';
        let input = '';
        process.stdin.setEncoding('utf8');
        for await (const chunk of process.stdin) input += chunk;
        const payload = JSON.parse(input);
        if (typeof payload.rootSkill !== 'string' || !payload.rootSkill.includes('# ExpressiveCSS')) process.exit(21);
        if (Object.hasOwn(payload, 'skillBundle')) process.exit(22);
        if (process.argv[2] !== 'argument with spaces;$HOME') process.exit(23);
        if (Object.hasOwn(payload, 'testCase') || Object.hasOwn(payload.task, 'expectedOperatingMode') || Object.hasOwn(payload.task, 'criticalInvariants')) process.exit(24);
        if (payload.task.id !== 'setup-only-routing' || typeof payload.task.request !== 'string') process.exit(25);
        if (payload.task.projectFixture !== 'consumer-current') process.exit(26);
        if (!readFileSync(new URL('package.json', 'file://' + payload.projectRoot + '/'), 'utf8').includes('@expressivecss/expressive')) process.exit(27);
        const responses = JSON.parse(readFileSync(process.argv[3], 'utf8')).responses;
        process.stdout.write(JSON.stringify(responses[payload.task.id]));
      `);
      const report = await runEvaluations({
        casesPath: new URL('./fixtures/expressivecss-skill-evals/cases.json', import.meta.url).pathname,
        adapter: process.execPath,
        adapterArgs: [adapterPath, 'argument with spaces;$HOME', responsePath],
        caseId: 'setup-only-routing',
        repositoryRoot: new URL('..', import.meta.url),
      });
      assert.equal(report.status, 'pass', JSON.stringify(report, null, 2));
      assert.equal(report.runType, 'live-adapter');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('redacts a failing live adapter stderr before throwing', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'expressivecss-eval-adapter-error-'));
    try {
      const adapterPath = path.join(directory, 'adapter.mjs');
      const secret = `ghp_${'q'.repeat(30)}`;
      await writeFile(adapterPath, `process.stderr.write('Authorization: Bearer ${secret}'); process.exit(1);`);
      await assert.rejects(
        runEvaluations({
          casesPath: new URL('./fixtures/expressivecss-skill-evals/cases.json', import.meta.url).pathname,
          adapter: process.execPath,
          adapterArgs: [adapterPath],
          caseId: 'setup-only-routing',
          repositoryRoot: new URL('..', import.meta.url),
        }),
        (error) => !error.message.includes(secret) && error.message.includes('[REDACTED]'),
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('terminates a live adapter at a hard outer timeout after SIGTERM is trapped', async () => {
    assert.equal(DEFAULT_ADAPTER_TIMEOUT_MS, 120_000);
    const directory = await mkdtemp(path.join(tmpdir(), 'expressivecss-eval-timeout-'));
    try {
      const adapterPath = path.join(directory, 'adapter.mjs');
      await writeFile(adapterPath, `
        process.on('SIGTERM', () => setTimeout(() => process.exit(0), 300));
        setInterval(() => {}, 1000);
      `);
      const started = Date.now();
      await assert.rejects(
        runEvaluations({
          casesPath: new URL('./fixtures/expressivecss-skill-evals/cases.json', import.meta.url).pathname,
          adapter: process.execPath,
          adapterArgs: [adapterPath],
          adapterTimeoutMs: 25,
          caseId: 'setup-only-routing',
          repositoryRoot: new URL('..', import.meta.url),
        }),
        (error) => error?.code === 'ETIMEDOUT',
      );
      assert.ok(Date.now() - started < 200, 'timeout waited for a signal-trapping adapter');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('documents the live adapter input field and bounded timeout', async () => {
    const docs = await readFile(new URL('../docs/agents/expressivecss-skill-evals.md', import.meta.url), 'utf8');
    assert.match(docs, /input contains `task`, `projectRoot`, and `rootSkill`/i);
    assert.doesNotMatch(docs, /input contains `testCase`/i);
    assert.match(docs, /adapter timeout/i);
  });
});
