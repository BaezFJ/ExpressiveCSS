import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { JSDOM } from 'jsdom';
import { MATERIAL_REVIEW_CRITERIA, gradeMaterialReviewReferences, benchmarkResponseInstructions, gradeAssetReferences, gradeAuditResponse, gradeInterfaceReviewReferences, gradeMatchedInterfaceScenes, gradeProjectChanges, gradeVersionResponse, INTERFACE_REVIEW_CRITERIA, onlyViewportRepair, preservedControlLabel, prepareReviewOutputs, runBenchmark, statistics } from '../scripts/benchmark-expressivecss-skill.mjs';

import { INTERFACE_SCENARIOS } from '../scripts/expressivecss-interface-quality.mjs';

const auditHtml = '<!doctype html><html><body><main>\n<button id="unnamed-action" type="button"><span aria-hidden="true">delete</span></button>\n<nav aria-label="Save commands"><button type="button">Save account</button></nav>\n</main></body></html>';
const auditResponse = () => ({ audit: { conclusion: 'defects-found', findings: [
  { category: 'accessible-name', source: { path: 'src/index.html', line: 2, selector: '#unnamed-action' }, defect: true, observed: { accessibleName: '' }, fixHtml: '<button type="button" aria-label="Delete account"><span aria-hidden="true">delete</span></button>' },
  { category: 'navigation-semantics', source: { path: 'src/index.html', line: 3, selector: 'nav[aria-label="Save commands"]' }, defect: true, observed: { tagName: 'nav', containsCommand: true }, fixHtml: '<div><button type="button">Save account</button></div>' },
] } });

test('audit grading requires true source observations, conclusions and effective proposed fixes', () => {
  assert.ok(gradeAuditResponse(auditResponse(), auditHtml).every(({ passed }) => passed));
  const alternative = auditResponse();
  alternative.audit.findings[0].fixHtml = '<button type="button">Delete account</button>';
  alternative.audit.findings[1].fixHtml = '<section aria-label="Account actions"><button type="button">Save account</button></section>';
  alternative.audit.findings.push({ category: 'other', note: 'Additional context is allowed.' });
  assert.ok(gradeAuditResponse(alternative, auditHtml).every(({ passed }) => passed));
  for (const mutate of [
    (response) => { response.audit.conclusion = 'no-defects'; },
    (response) => { response.audit.findings[0].defect = false; },
    (response) => { response.audit.findings[0].observed.accessibleName = 'delete'; },
    (response) => { response.audit.findings[0].source.line = 3; },
    (response) => { response.audit.findings[0].source.path = '../outside.html'; },
    (response) => { response.audit.findings[0].source.selector = 'button'; },
    (response) => { response.audit.findings[0].fixHtml = '<button type="button"><span aria-hidden="true">accessible name aria-label</span></button>'; },
    (response) => { response.audit.findings[1].observed.containsCommand = false; },
    (response) => { response.audit.findings[1].fixHtml = '<nav><button type="button">Save account</button></nav>'; },
    (response) => { response.audit.findings[1].fixHtml = '<div>Remove nav landmark and Save account command</div>'; },
  ]) {
    const response = auditResponse();
    response.summary = 'unnamed-action accessible name aria-label src/index.html replace nav landmark div Save account command';
    mutate(response);
    assert.ok(gradeAuditResponse(response, auditHtml).some(({ passed }) => !passed));
  }
  assert.ok(gradeAuditResponse({ summary: 'unnamed-action accessible name aria-label src/index.html replace nav landmark div Save account command' }, auditHtml).every(({ passed }) => !passed));
});

test('version grading uses direct metadata and rejects reassuring conclusions containing all old keywords', () => {
  const installedPath = 'node_modules/@expressivecss/expressive/package.json';
  const contractPath = '.agents/skills/expressivecss/references/contract.json';
  const sources = { [installedPath]: '{"version":"0.7.0"}', [contractPath]: '{\n"frameworkVersion":"0.8.0"\n}' };
  const assessment = { installedVersion: '0.7.0', bundledVersion: '0.8.0', relationship: 'mismatch', bundledContractSafe: false, currentDocsSafe: false, matchingEvidence: 'unavailable', unsupportedClaims: 'blocked', sources: [{ path: installedPath, line: 1 }, { path: contractPath, line: 2 }] };
  assert.ok(gradeVersionResponse({ versionAssessment: assessment }, sources).every(({ passed }) => passed));
  for (const replacement of [
    { installedVersion: '0.8.0' }, { bundledVersion: '0.7.0' }, { relationship: 'match' },
    { bundledContractSafe: true }, { currentDocsSafe: true }, { matchingEvidence: 'available' },
    { unsupportedClaims: 'allowed' }, { sources: [{ path: installedPath, line: 1 }, { path: contractPath, line: 1 }] },
  ]) {
    const response = { summary: '0.7.0 older bundled mismatch unavailable missing blocked cannot', versionAssessment: { ...assessment, ...replacement } };
    assert.ok(gradeVersionResponse(response, sources).some(({ passed }) => !passed));
  }
});

test('audit rejects conflicting duplicate assessments while accepting findings for other sources', () => {
  for (const replacement of [{ defect: false }, { observed: { accessibleName: 'delete' } }, { fixHtml: '<button type="button"></button>' }]) {
    const response = auditResponse();
    response.audit.findings.push({ ...response.audit.findings[0], ...replacement, source: { path: 'src/index.html', line: 2, selector: 'main > button' } });
    assert.equal(gradeAuditResponse(response, auditHtml).find(({ text }) => text.includes('accessible-name')).passed, false);
  }
  const response = auditResponse();
  response.audit.findings.push({ category: 'accessible-name', source: { path: 'src/index.html', line: 3, selector: 'nav button' }, defect: false, observed: { accessibleName: 'Save account' } });
  assert.ok(gradeAuditResponse(response, auditHtml).every(({ passed }) => passed));
});

test('audit fixes retain enabled native command semantics', () => {
  for (const attributes of ['aria-disabled="true"', 'inert', 'role="img"']) {
    for (const index of [0, 1]) {
      const response = auditResponse();
      response.audit.findings[index].fixHtml = response.audit.findings[index].fixHtml.replace('<button ', `<button ${attributes} `);
      assert.ok(gradeAuditResponse(response, auditHtml).some(({ passed }) => !passed));
    }
  }
});

test('per-path grading catches dependency, lockfile, arbitrary file and invented asset changes', () => {
  const file = (sha256) => ({ type: 'file', sha256 });
  const provenance = { source: 'adapter', algorithm: 'sha256', independentlyComputed: true, before: `sha256:${'a'.repeat(64)}`, after: `sha256:${'b'.repeat(64)}` };
  const beforeManifest = { 'src/index.html': file('html'), 'src/app.js': file('js'), 'src/app.css': file('css'), 'package.json': file('package'), 'package-lock.json': file('lock'), 'node_modules/@expressivecss/expressive/package.json': file('installed'), 'server.mjs': file('server') };
  for (const changed of ['package.json', 'package-lock.json', 'node_modules/@expressivecss/expressive/package.json', 'server.mjs', 'invented-font.woff2', 'src/unrequested.txt', '.cache']) {
    const afterManifest = { ...beforeManifest, [changed]: changed === '.cache' ? { type: 'directory', sha256: null } : file('changed') };
    assert.equal(gradeProjectChanges('version-mismatch', { ...provenance, beforeManifest, afterManifest })[0].passed, false, changed);
  }
  const afterManifest = { ...beforeManifest, 'src/index.html': file('new-html') };
  assert.equal(gradeProjectChanges('form-action', { ...provenance, beforeManifest, afterManifest })[0].passed, true);
  assert.equal(gradeProjectChanges('no-edit-audit', { ...provenance, beforeManifest, afterManifest })[0].passed, false);
  assert.equal(gradeProjectChanges('interface-review', { ...provenance, beforeManifest, afterManifest })[0].passed, false);
  assert.equal(gradeProjectChanges('interface-refine', { ...provenance, beforeManifest, afterManifest })[0].passed, true);
  assert.equal(gradeProjectChanges('interface-refine', { ...provenance, beforeManifest, afterManifest: { ...beforeManifest, 'src/app.js': file('changed') } })[0].passed, false);
  const deletion = { ...beforeManifest }; delete deletion['package-lock.json'];
  assert.equal(gradeProjectChanges('version-mismatch', { ...provenance, beforeManifest, afterManifest: deletion })[0].passed, false);
  assert.equal(gradeProjectChanges('form-action', {})[0].passed, false);
  const unchanged = { ...provenance, after: provenance.before, beforeManifest, afterManifest: beforeManifest };
  assert.equal(gradeProjectChanges('no-edit-audit', unchanged)[0].passed, true);
  for (const forged of [{ source: 'candidate' }, { algorithm: 'md5' }, { independentlyComputed: false }, { before: null }, { after: null }, { before: 'arbitrary' }, { after: provenance.after }]) {
    assert.equal(gradeProjectChanges('no-edit-audit', { ...unchanged, ...forged })[0].passed, false);
  }
});

test('safe setup repair permits viewport metadata while preserving body, assets and scripts', () => {
  const before = '<!doctype html><html lang="en"><body><main id="app"></main></body></html>\n';
  const after = before.replace('<body>', '<head>\n<meta name="viewport" content="width=device-width, initial-scale=1">\n</head><body>');
  assert.equal(onlyViewportRepair(before, before), true);
  assert.equal(onlyViewportRepair(before, after), true);
  for (const unsafe of [
    after.replace('</head>', '<script src="invented.js"></script></head>'),
    after.replace('<main id="app">', '<main id="app"><img src="fake.svg">'),
    after.replace('initial-scale=1', 'initial-scale=1,user-scalable=no'),
    after.replace('<body>', '<body onload="alert(1)">'),
    after.replace('</head>', '<link rel="stylesheet" href="missing.css"></head>'),
  ]) assert.equal(onlyViewportRepair(before, unsafe), false);
  assert.ok(!benchmarkResponseInstructions('no-edit-audit').includes('unnamed-action'));
  assert.ok(!benchmarkResponseInstructions('version-mismatch').includes('0.7.0'));
});

test('grading detects invented HTML and CSS asset URLs even without creating asset files', () => {
  const before = { 'src/index.html': '<img src="/hero.svg"><script src="/src/app.js"></script>', 'src/app.css': ':root { --md-source: #006a79; }' };
  assert.equal(gradeAssetReferences(before, before).passed, true);
  assert.equal(gradeAssetReferences(before, { ...before, 'src/index.html': `${before['src/index.html']}<link rel="preload" as="image" href="/hero.svg">` }).passed, true);
  for (const change of [
    { 'src/index.html': `${before['src/index.html']}<img src="/invented.svg">` },
    { 'src/index.html': `${before['src/index.html']}<script src="https://example.com/unrequested.js"></script>` },
    { 'src/app.css': '@font-face { src: url("/invented.woff2"); }' },
    { 'src/app.css': '@import "missing.css";' },
    { 'src/index.html': `${before['src/index.html']}<div style="background: url(missing.png)"></div>` },
  ]) assert.equal(gradeAssetReferences(before, { ...before, ...change }).passed, false);
});

test('review outputs expose metadata, captures, and source content without moving originals', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'expressivecss-review-'));
  const metadata = { eval_id: 1, eval_name: 'form-action', prompt: 'Add Preview', assertions: [] };
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64');
  try {
    const evalDirectory = path.join(root, 'eval-form-action');
    await mkdir(evalDirectory);
    const metadataText = JSON.stringify(metadata);
    await writeFile(path.join(evalDirectory, 'eval_metadata.json'), metadataText);
    const copies = [];
    for (const configuration of ['with_skill', 'old_skill']) {
      const run = path.join(evalDirectory, configuration, 'run-1');
      const outputs = path.join(run, 'outputs');
      for (const [source, destination, content] of [
        ['after/375.png', 'after-375.png', png],
        ['candidate-browser/browser-2.png', 'candidate-browser-browser-2.png', png],
        ['src/index.html', 'source-index.html.txt', Buffer.from(`<button>${configuration}</button>\n`)],
        ['src/app.css', 'source-app.css.txt', Buffer.from(':root { --md-source: #6750a4; }\n')],
        ['src/app.js', 'source-app.js.txt', Buffer.from('Expressive.AutoInit();\n')],
        ...(configuration === 'with_skill' ? [['before/375.png', 'before-375.png', png]] : []),
      ]) {
        const original = path.join(outputs, source);
        await mkdir(path.dirname(original), { recursive: true });
        await writeFile(original, content);
        copies.push({ original, destination: path.join(outputs, destination), content });
      }
    }
    await prepareReviewOutputs(root);
    for (const configuration of ['with_skill', 'old_skill']) {
      const run = path.join(evalDirectory, configuration, 'run-1');
      assert.deepEqual(JSON.parse(await readFile(path.join(run, 'eval_metadata.json'), 'utf8')), metadata);
    }
    for (const { original, destination, content } of copies) {
      assert.deepEqual(await readFile(destination), content, `viewer copy changed ${destination}`);
      assert.deepEqual(await readFile(original), content, `original changed ${original}`);
    }
    assert.equal(await readFile(path.join(evalDirectory, 'eval_metadata.json'), 'utf8'), metadataText);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('benchmark statistics preserve missing telemetry and do not alter samples', () => {
  const unavailable = { mean: null, median: null, stddev: null, min: null, max: null };
  assert.deepEqual(statistics([]), unavailable);
  assert.deepEqual(statistics([null, undefined, NaN, Infinity, -Infinity, '30']), unavailable);
  const values = [9, null, 1, undefined, 5];
  assert.deepEqual(statistics(values), { mean: 5, median: 5, stddev: Math.sqrt(32 / 3), min: 1, max: 9 });
  assert.deepEqual(values, [9, null, 1, undefined, 5]);
});

test('benchmark statistics cover paired medians, population variability, and real zero samples', () => {
  assert.deepEqual(statistics([8, 2, 6, 4]), { mean: 5, median: 5, stddev: Math.sqrt(5), min: 2, max: 8 });
  assert.deepEqual(statistics([0]), { mean: 0, median: 0, stddev: 0, min: 0, max: 0 });
  assert.deepEqual(statistics([3, 3, 3]), { mean: 3, median: 3, stddev: 0, min: 3, max: 3 });
});

test('benchmark definitions retain distinct scoped and whole-interface tasks with balanced discovery coverage', async () => {
  const definitions = JSON.parse(await readFile(new URL('./fixtures/expressivecss-skill-evals/benchmark.json', import.meta.url), 'utf8'));
  assert.equal(definitions.cases.length, 13);
  assert.equal(new Set(definitions.cases.map(({ name }) => name)).size, 13);
  assert.equal(new Set(definitions.cases.map(({ id }) => id)).size, 13);
  assert.ok(definitions.cases.find(({ name }) => name === 'no-edit-audit')?.readOnly);
  assert.ok(definitions.cases.find(({ name }) => name === 'interface-review')?.readOnly);
  assert.ok(definitions.cases.find(({ name }) => name === 'interface-refine').request.includes('primary user task'));
  assert.equal(definitions.triggers.length, 20);
  assert.equal(new Set(definitions.triggers.map(({ query }) => query)).size, 20);
  assert.equal(definitions.triggers.filter(({ should_trigger }) => should_trigger === true).length, 10);
  assert.equal(definitions.triggers.filter(({ should_trigger }) => should_trigger === false).length, 10);
  const skill = path.resolve('skills/expressivecss');
  await assert.rejects(runBenchmark({ baseline: skill, output: path.join(tmpdir(), 'expressivecss-invalid-case'), caseName: 'no-edit-audit,unknown' }), /Unknown case/);
});

test('failed live cases retain bounded redacted source without symlinks and still remove temporary projects', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'expressivecss-benchmark-failure-'));
  try {
    const bin = path.join(directory, 'bin');
    const skill = path.join(directory, 'skill');
    const output = path.join(directory, 'outputs');
    const roots = path.join(directory, 'project-roots.jsonl');
    const outside = path.join(directory, 'outside.txt');
    const secret = `ghp_${'z'.repeat(36)}`;
    await Promise.all([mkdir(bin), mkdir(skill)]);
    await writeFile(path.join(skill, 'SKILL.md'), '# ExpressiveCSS test skill\n');
    await writeFile(outside, 'Private external content must not enter review outputs.');
    // A local transport stub, never a model: force grading to fail on an unsafe source link.
    await writeFile(path.join(bin, 'codex'), `#!${process.execPath}\n
      const { appendFileSync, writeFileSync, symlinkSync } = require('node:fs');
      process.stdin.resume();
      process.stdin.on('end', () => {
        const root = process.argv[process.argv.indexOf('-C') + 1];
        appendFileSync(process.env.EXPRESSIVECSS_TEST_ROOTS, JSON.stringify(root) + '\\n');
        writeFileSync(root + '/src/index.html', '<main>Partial edit ${secret}</main>');
        writeFileSync(root + '/src/unrequested.txt', 'Do not copy arbitrary extra files.');
        symlinkSync(process.env.EXPRESSIVECSS_TEST_OUTSIDE, root + '/src/app.js');
        const emit = (event) => process.stdout.write(JSON.stringify(event) + '\\n');
        emit({type:'item.completed',item:{type:'agent_message',text:'{"summary":"Controlled failure fixture"}'}});
        emit({type:'turn.completed',usage:{input_tokens:1,cached_input_tokens:0,output_tokens:1}});
      });
    `, { mode: 0o700 });
    const moduleUrl = new URL('../scripts/benchmark-expressivecss-skill.mjs', import.meta.url).href;
    const checked = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import { runBenchmark } from ${JSON.stringify(moduleUrl)};
      await runBenchmark({ baseline: process.argv[1], candidate: process.argv[1], output: process.argv[2], repetitions: 1, caseName: 'version-mismatch' });
    `, skill, output], {
      encoding: 'utf8', timeout: 15000,
      env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, EXPRESSIVECSS_TEST_ROOTS: roots, EXPRESSIVECSS_TEST_OUTSIDE: outside },
    });
    assert.equal(checked.status, 0, checked.error?.message ?? checked.stderr);
    const results = JSON.parse(await readFile(path.join(output, 'results.json'), 'utf8'));
    assert.equal(results.length, 2);
    for (const result of results) {
      assert.equal(result.eval_id, 6, 'selected case retains its catalogue identity');
      assert.equal(result.result.errors, 1);
      assert.match(result.expectations[0].evidence, /symbolic link/u);
      assert.equal(result.retentionErrors[0].source, 'src/app.js');
      const artifacts = path.join(output, 'eval-version-mismatch', result.configuration, 'run-1', 'outputs');
      const html = await readFile(path.join(artifacts, 'src/index.html'), 'utf8');
      assert.match(html, /Partial edit/u);
      assert.match(html, /\[REDACTED\]/u);
      assert.ok(!html.includes(secret));
      assert.match(await readFile(path.join(artifacts, 'infrastructure-error.json'), 'utf8'), /completion source.*symbolic link/u);
      assert.match(await readFile(path.join(artifacts, 'source-retention-errors.json'), 'utf8'), /review source.*symbolic link/u);
      const browser = JSON.parse(await readFile(path.join(artifacts, 'candidate-browser.json'), 'utf8'));
      assert.equal(browser.initialCapability.status, 'unavailable');
      assert.deepEqual(browser.records, []);
      await assert.rejects(readFile(path.join(artifacts, 'src/app.js')), { code: 'ENOENT' });
      await assert.rejects(readFile(path.join(artifacts, 'src/unrequested.txt')), { code: 'ENOENT' });
    }
    const projects = (await readFile(roots, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(projects.length, 2);
    for (const project of projects) await assert.rejects(readFile(path.join(project, 'src/index.html')), { code: 'ENOENT' });
    assert.equal(await readFile(outside, 'utf8'), 'Private external content must not enter review outputs.');
  } finally { await rm(directory, { recursive: true, force: true }); }
});


test('whole-interface review references cannot substitute preflight or invented evidence for observations', () => {
  const records = [{ id: 'probe', action: 'preflight', status: 'success' }, { id: 'view', action: 'inspect', status: 'success' }, { id: 'failed', action: 'inspect', status: 'error' }];
  const report = () => ({ interfaceReview: INTERFACE_REVIEW_CRITERIA.map((criterionId) => ({ criterionId, status: 'Fail', observation: 'Concrete observation for independent review.', evidenceIds: ['view'] })) });
  assert.equal(gradeInterfaceReviewReferences(report(), records).passed, true);
  for (const id of ['probe', 'failed', 'invented']) {
    const response = report(); response.interfaceReview[0].evidenceIds = [id];
    assert.equal(gradeInterfaceReviewReferences(response, records).passed, false);
  }
  const missing = report(); missing.interfaceReview.pop();
  assert.equal(gradeInterfaceReviewReferences(missing, records).passed, false);
  const blocked = report(); blocked.interfaceReview[0] = { ...blocked.interfaceReview[0], status: 'Blocked', evidenceIds: [] };
  assert.equal(gradeInterfaceReviewReferences(blocked, records).passed, true, 'an explicit blocker is valid reporting, not an interface pass');
  blocked.interfaceReview[0].status = 'Pass';
  assert.equal(gradeInterfaceReviewReferences(blocked, records).passed, false);
  const inappropriate = report(); inappropriate.interfaceReview.at(-1).status = 'Intentional adaptation';
  assert.equal(gradeInterfaceReviewReferences(inappropriate, records).passed, false, 'accessibility checks cannot be waived as design adaptations');
  assert.equal(gradeInterfaceReviewReferences({}, records).passed, false);
});


test('matched whole-interface captures reject missing scenes, failed captures and changed settings', () => {
  const before = { source: 'operator-browser', scenes: INTERFACE_SCENARIOS.map((settings) => ({ id: settings.id, settings, status: 'success', screenshot: { sha256: 'a'.repeat(64) } })) };
  assert.equal(gradeMatchedInterfaceScenes(before, structuredClone(before)).passed, true);
  for (const mutate of [
    (value) => value.scenes.pop(),
    (value) => { value.scenes[0].status = 'error'; },
    (value) => { value.scenes[0].settings.colorScheme = 'dark'; },
    (value) => { value.scenes[0].screenshot.sha256 = ''; },
    (value) => { value.scenes[0] = value.scenes[1]; },
  ]) {
    const after = structuredClone(before); mutate(after);
    assert.equal(gradeMatchedInterfaceScenes(before, after).passed, false);
  }
  assert.equal(gradeMatchedInterfaceScenes(null, before).passed, false);
});


test('whole-interface aggregate reports redact browser observations and final response metadata', { timeout: 120000 }, async (t) => {
  try { await access(chromium.executablePath()); } catch { t.skip('Chromium is not installed'); return; }
  const directory = await mkdtemp(path.join(tmpdir(), 'expressivecss-interface-redaction-'));
  try {
    const bin = path.join(directory, 'bin'), skill = path.join(directory, 'skill'), output = path.join(directory, 'outputs');
    await mkdir(bin); await mkdir(skill);
    await writeFile(path.join(skill, 'SKILL.md'), '# ExpressiveCSS test skill');
    // A transport stub tests artifact boundaries; it is not a live model evaluation.
    await writeFile(path.join(bin, 'codex'), `#!${process.execPath}
      const {appendFileSync} = require('node:fs');
      process.stdin.resume(); process.stdin.on('end', () => {
        const root = process.argv[process.argv.indexOf('-C') + 1];
        appendFileSync(root + '/src/index.html', '<script>console.error("API_KEY=fixture-secret")</script>');
        const emit = event => process.stdout.write(JSON.stringify(event) + '\\n');
        emit({type:'item.completed',item:{type:'agent_message',text:JSON.stringify({summary:'API_KEY=fixture-secret',verificationChecks:[],verificationErrors:[]})}});
        emit({type:'turn.completed',usage:{input_tokens:1,cached_input_tokens:0,output_tokens:1}});
      });
    `, { mode: 0o700 });
    const checked = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import {runBenchmark} from ${JSON.stringify(new URL('../scripts/benchmark-expressivecss-skill.mjs', import.meta.url).href)};
      await runBenchmark({baseline:process.argv[1],candidate:process.argv[1],output:process.argv[2],repetitions:1,caseName:'interface-refine'});
    `, skill, output], { encoding: 'utf8', timeout: 100000, env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` } });
    assert.equal(checked.status, 0, checked.error?.message ?? checked.stderr);
    for (const file of ['benchmark.json', 'results.json', ...['old_skill', 'with_skill'].flatMap((configuration) => ['grading.json', 'outputs/browser.json', 'outputs/interface-review.json', 'outputs/response.json'].map((name) => `eval-interface-refine/${configuration}/run-1/${name}`))]) {
      const content = await readFile(path.join(output, file), 'utf8');
      assert.doesNotMatch(content, /fixture-secret/, file);
      assert.match(content, /REDACTED/, file);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});


test('whole-interface preservation accepts described tooltips without allowing renamed controls', () => {
  const dom = new JSDOM('<button id="original" data-tooltip="Private">Privacy help</button><button id="described" aria-describedby="tip">Privacy help<span class="tooltip" id="tip">Private</span></button><button id="renamed" aria-label="Delete account">Privacy help</button><select id="first"><option value="empty">Empty</option></select><select id="spaced">\n<option value="empty">Empty</option>\n</select>');
  try {
    const get = (id) => dom.window.document.getElementById(id);
    assert.equal(preservedControlLabel(get('original'), get('described')), true);
    assert.equal(preservedControlLabel(get('original'), get('renamed')), false);
    get('described').removeAttribute('aria-describedby');
    assert.equal(preservedControlLabel(get('original'), get('described')), false);
    assert.equal(preservedControlLabel(get('first'), get('spaced')), true);
    get('spaced').querySelector('option').value = 'error';
    assert.equal(preservedControlLabel(get('first'), get('spaced')), false);
    assert.equal(preservedControlLabel(get('original'), null), false);
  } finally { dom.window.close(); }
});

test('Material report coverage accepts different judgments but requires authentic references', () => {
  const records = [{ id: 'view', action: 'screenshot', status: 'success' }, { id: 'preflight', action: 'preflight', status: 'success' }, { id: 'failed', action: 'evaluate', status: 'error' }];
  for (const [name, criteria] of Object.entries(MATERIAL_REVIEW_CRITERIA)) {
    const report = () => ({ materialReview: criteria.map(criterionId => ({ criterionId, status: 'Pass', observation: 'Every save should interrupt with a dialog. This deliberately poor judgment needs human review.', evidenceIds: ['view'] })) });
    assert.equal(gradeMaterialReviewReferences(name, report(), records).passed, true);
    assert.match(benchmarkResponseInstructions(name), /materialReview/);
    for (const id of ['invented', 'preflight', 'failed']) {
      const value = report(); value.materialReview[0].evidenceIds = [id];
      assert.equal(gradeMaterialReviewReferences(name, value, records).passed, false);
    }
    const missing = report(); missing.materialReview.pop();
    assert.equal(gradeMaterialReviewReferences(name, missing, records).passed, false);
    const blocked = report(); blocked.materialReview[0] = { ...blocked.materialReview[0], status: 'Blocked', observation: 'Image viewer unavailable; no visual judgment.', evidenceIds: [] };
    assert.equal(gradeMaterialReviewReferences(name, blocked, records).passed, true);
    blocked.materialReview[0].status = 'Pass';
    assert.equal(gradeMaterialReviewReferences(name, blocked, records).passed, false);
    const extra = report(); extra.materialReview.push({ criterionId: 'additional-context', status: 'Fail', observation: 'Alternative terminology and extra relevant evidence are accepted.', evidenceIds: ['view'] });
    assert.equal(gradeMaterialReviewReferences(name, extra, records).passed, true);
  }
});

test('Material review forbids edits and repairs permit only CSS', () => {
  const hash = value => `sha256:${value.repeat(64)}`;
  const base = { source: 'adapter', algorithm: 'sha256', independentlyComputed: true, before: hash('a'), after: hash('b'), beforeManifest: { 'src/app.css': { type: 'file', sha256: hash('c') } } };
  for (const name of Object.keys(MATERIAL_REVIEW_CRITERIA)) {
    assert.equal(gradeProjectChanges(name, { ...base, after: base.before, afterManifest: base.beforeManifest })[0].passed, true);
    for (const file of ['src/app.css', 'src/app.js', 'src/index.html', 'package.json']) {
      const evidence = { ...base, afterManifest: { ...base.beforeManifest, [file]: { type: 'file', sha256: hash('d') } } };
      assert.equal(gradeProjectChanges(name, evidence)[0].passed, name !== 'material-component-review' && file === 'src/app.css');
    }
  }
});


test('Material coverage accepts equivalent skill matrix IDs without accepting invented evidence', () => {
  const records = [{ id: 'capture', action: 'screenshot', status: 'success' }];
  const report = { materialReview: ['C-TASK-PRIMARY', 'C-TYPE-ROLE', 'C-SHAPE-CONTRACT'].map(criterionId => ({ criterionId, status: 'Pass', observation: 'A concrete judgment with an authentic reference.', evidenceIds: ['capture'] })) };
  assert.equal(gradeMaterialReviewReferences('material-expression-repair', report, records).passed, true);
  report.materialReview[0].evidenceIds = ['invented'];
  assert.equal(gradeMaterialReviewReferences('material-expression-repair', report, records).passed, false);
  const motion = { materialReview: [{ criterionId: 'C-MOTION-REDUCED-OUTCOME', status: 'Blocked', observation: 'Interaction evidence unavailable.', evidenceIds: [] }] };
  assert.equal(gradeMaterialReviewReferences('material-motion-repair', motion, records).passed, true);
  for (const criterionId of ['motion-preference', 'motion.respects-reduced-preference']) {
    motion.materialReview[0].criterionId = criterionId;
    assert.equal(gradeMaterialReviewReferences('material-motion-repair', motion, records).passed, true);
  }
  motion.materialReview[0].criterionId = 'C-TYPE-ROLE';
  assert.equal(gradeMaterialReviewReferences('material-motion-repair', motion, records).passed, false);
});

// Maintenance uses the same consumer/adapter boundary, but stages inherit prior files.
test('maintenance rejects lost parent state, no-op work and edits outside scope', async () => {
  const { gradeMaintenanceTransition, runMaintenance } = await import('../scripts/eval-expressivecss-maintenance.mjs');
  const before = { hash: 'parent', manifest: { 'src/app.js': { sha256: 'a' }, 'package.json': { sha256: 'p' } } };
  const after = { hash: 'child', manifest: { ...before.manifest, 'src/app.js': { sha256: 'b' } } };
  assert.ok(gradeMaintenanceTransition(before, after, 'parent').every(row => row.passed));
  assert.equal(gradeMaintenanceTransition(before, after, 'different-parent')[0].passed, false);
  assert.equal(gradeMaintenanceTransition(before, before, 'parent')[1].passed, false);
  assert.equal(gradeMaintenanceTransition(before, { ...after, manifest: { ...after.manifest, 'package.json': { sha256: 'changed' } } }, 'parent')[1].passed, false);
  const archive = await mkdtemp(path.join(tmpdir(), 'maintenance-archive-'));
  try {
    await writeFile(path.join(archive, 'results.json'), 'retained');
    await assert.rejects(runMaintenance({ output: archive }), /empty output directory/);
    assert.equal(await readFile(path.join(archive, 'results.json'), 'utf8'), 'retained');
  } finally { await rm(archive, { recursive: true, force: true }); }
});

test('maintenance browser checks reject lost earlier behavior and superseded scope', { timeout: 120000 }, async t => {
  try { await access(chromium.executablePath()); } catch { t.skip('Chromium is unavailable'); return; }
  const { captureMaintenance } = await import('../scripts/eval-expressivecss-maintenance.mjs');
  const { materializeProjectFixture } = await import('../scripts/eval-expressivecss-skill.mjs');
  const output = await mkdtemp(path.join(tmpdir(), 'maintenance-checks-'));
  try {
    for (const name of ['settings', 'editor']) {
      const root = await materializeProjectFixture(`example-${name}`);
      try {
        const htmlPath = path.join(root, 'src/index.html'), jsPath = path.join(root, 'src/app.js');
        const originalHtml = await readFile(htmlPath, 'utf8'), originalJs = await readFile(jsPath, 'utf8');
        for (const stage of [1, 2, 3]) {
          let html = originalHtml, js = originalJs;
          if (name === 'settings') {
            html = html.replace('</fieldset>', '<label class="choice-row"><input type="checkbox" name="updates" value="cancellations" aria-describedby="email-help"><span>Event cancellations</span></label></fieldset>');
            if (stage >= 2) {
              html = html.replace('<p id="status"', `<button type="button" class="outlined" id="restore-settings">${stage === 2 ? 'Reset preferences' : 'Reset email updates'}</button><p id="status"`);
              js = js.replace("if (document.body.dataset.example === 'settings') {", `if (document.body.dataset.example === 'settings') {
                listen(document.querySelector('#restore-settings'), 'click', () => {
                  ${stage === 2 ? "document.querySelector('#settings-form').reset();" : "document.querySelectorAll('[name=updates]').forEach(node => node.checked = node.defaultChecked);"}
                  status.textContent = '${stage === 2 ? 'Defaults restored.' : 'Email defaults restored.'} Save preferences to apply them.';
                });`);
            }
          } else {
            html = html.replace('aria-describedby="message-help"', 'aria-describedby="message-help message-count"').replace('</textarea>', '</textarea><small id="message-count"></small>');
            js = js.replace("const group = document.querySelector('#formatting');", `const counter = document.querySelector('#message-count');
              const count = () => counter.textContent = message.value.length + ' characters'; count(); listen(message, 'input', count);
              const group = document.querySelector('#formatting');`);
            if (stage >= 2) js = js.replace('for this page session. Nothing was sent.', 'for this page session${' + (stage === 2 ? 'true' : "treatment.value === 'expressive'") + " ? ': ' + message.value.length + ' characters' : ''}. Nothing was sent.");
          }
          await writeFile(htmlPath, html); await writeFile(jsPath, js);
          const rows = await captureMaintenance(root, `${name}-maintenance`, stage, path.join(output, name, String(stage)));
          assert.deepEqual(rows.filter(row => !row.passed), [], `${name} stage ${stage}`);
          if (stage === 3) {
            // A plausible final edit can pass its new task while deleting an older feature.
            const broken = name === 'settings' ? js.replace("document.querySelectorAll('[name=updates]').forEach(node => node.checked = node.defaultChecked);", "document.querySelector('#settings-form').reset();") : js.replace("listen(message, 'input', count);", '');
            await writeFile(jsPath, broken);
            const failed = await captureMaintenance(root, `${name}-maintenance`, stage, path.join(output, name, 'regression'));
            assert.ok(failed.some(row => !row.passed && row.text.includes(name === 'settings' ? 'reset obeys' : 'live count')), `missed ${name} regression`);
          }
        }
      } finally { await rm(root, { recursive: true, force: true }); }
    }
  } finally { await rm(output, { recursive: true, force: true }); }
});

test('maintenance retains an interrupted stage and blocks its successors', { timeout: 30000 }, async t => {
  try { await access(chromium.executablePath()); } catch { t.skip('Chromium is unavailable'); return; }
  const { runMaintenance } = await import('../scripts/eval-expressivecss-maintenance.mjs');
  const output = await mkdtemp(path.join(tmpdir(), 'maintenance-interrupted-'));
  let calls = 0;
  try {
    const rows = await runMaintenance({ output, caseName: 'settings-maintenance', execute: async () => { calls++; throw new Error('synthetic adapter interruption'); } });
    assert.equal(calls, 1);
    assert.deepEqual(rows.map(row => row.status), ['failed', 'blocked', 'blocked']);
    assert.ok(rows.slice(1).every(row => row.blockedBy === 'cancellations'));
    const stage = path.join(output, 'eval-settings-maintenance-1/with_skill/run-1');
    await access(path.join(stage, 'outputs/before/src/index.html'));
    await access(path.join(stage, 'outputs/src/index.html'));
    const grading = JSON.parse(await readFile(path.join(stage, 'grading.json'), 'utf8'));
    assert.ok(grading.expectations.some(row => !row.passed && row.evidence.includes('synthetic adapter interruption')));
    const benchmark = JSON.parse(await readFile(path.join(output, 'benchmark.json'), 'utf8'));
    assert.deepEqual(benchmark.chains, [{ sequence: 'settings-maintenance', complete: false, time_seconds: null, tokens: null }]);
  } finally { await rm(output, { recursive: true, force: true }); }
});


test('autonomy cases preserve user edits and distinguish a blocked repair from completion', async () => {
  const { prepareCase, grade } = await import('../scripts/benchmark-expressivecss-skill.mjs');
  const { readCompletionFiles } = await import('../scripts/eval-expressivecss-skill.mjs');
  const { snapshotProject } = await import('../scripts/expressivecss-codex-adapter.mjs');
  for (const name of ['autonomy-scoped-repair', 'autonomy-blocked-recovery']) {
    const testCase = { name, fixture: 'consumer-current' };
    const root = await prepareCase(testCase);
    try {
      const before = await readCompletionFiles(root), initial = await snapshotProject(root);
      const html = path.join(root, 'src/index.html');
      if (name === 'autonomy-scoped-repair') await writeFile(html, before['src/index.html'].replace('<button type="submit">Preview preferences', '<button type="button">Preview preferences'));
      else {
        const failed = spawnSync(process.execPath, ['check-save.mjs'], { cwd: root, encoding: 'utf8' });
        assert.equal(failed.status, 1);
        assert.match(failed.stderr, /Save handler does not produce the required confirmation/);
      }
      const after = await snapshotProject(root);
      const filesystem = { source: 'adapter', independentlyComputed: true, algorithm: 'sha256', before: initial.hash, beforeManifest: initial.manifest, after: after.hash, afterManifest: after.manifest };
      const envelope = { executionEvidence: { filesystem, commandErrors: [{ output: 'Save handler does not produce the required confirmation' }] }, runMetadata: {} };
      // Synthetic operator observations exercise grading; live browser runs are separate.
      const browser = { errors: [], formBehavior: { previewDoesNotSubmit: true, saved: true, resultText: 'Save confirmation unavailable.' } };
      assert.ok((await grade(testCase, root, before, envelope, browser)).every(row => row.passed));
      if (name === 'autonomy-scoped-repair') {
        await writeFile(html, (await readFile(html, 'utf8')).replace('User draft:', 'Overwritten draft:'));
        assert.ok((await grade(testCase, root, before, envelope, browser)).some(row => !row.passed));
      } else {
        envelope.executionEvidence.commandErrors = [];
        assert.ok((await grade(testCase, root, before, envelope, browser)).some(row => !row.passed));
      }
      filesystem.afterManifest['user-notes.txt'] = { type: 'file', sha256: 'changed' };
      assert.equal(gradeProjectChanges(name, filesystem)[0].passed, false);
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});

test('cost reports bind human decisions to attempts and include rejected work without inventing telemetry', async () => {
  const { costReport, reviewTemplate } = await import('../scripts/report-expressivecss-assistance-cost.mjs');
  const row = { eval_name: 'form-action', configuration: 'skill_only', run_number: 1,
    result: { time_seconds: 10, failed: 0, total: 1 }, expectations: [{ passed: true }],
    runMetadata: { usage: { input_tokens: 100, cached_input_tokens: 60, output_tokens: 10 }, toolCalls: 2, toolFailures: 0 } };
  const rows = [row, { ...row, run_number: 2 }];
  const pending = costReport(rows);
  assert.equal(pending.groups['form-action/skill_only'].pending, 2);
  assert.equal(pending.groups['form-action/skill_only'].correction_requests, null);
  assert.equal(pending.groups['form-action/skill_only'].cost_per_accepted_output.input_tokens, null);
  const reviews = reviewTemplate(rows).reviews.map((review, index) => ({ ...review, decision: index ? 'needs-correction' : 'accepted', reviewer: 'human-test', reviewedAt: '2026-09-07T12:00:00Z', correctionRequests: index, reviewSeconds: 5 }));
  const group = costReport(rows, reviews).groups['form-action/skill_only'];
  assert.equal(group.accepted, 1);
  assert.equal(group.correction_requests, 1);
  assert.equal(group.cost_per_accepted_output.input_tokens, 200);
  assert.equal(group.cost_per_accepted_output.cached_input_tokens, 120);
  assert.equal(group.cost_per_accepted_output.agent_seconds, 20);
  assert.equal(group.cost_per_accepted_output.review_seconds, 10);
  assert.equal(group.cost_per_accepted_output.operator_elapsed_seconds, null);
  assert.throws(() => costReport(rows, [reviews[0], reviews[0]]), /duplicate/);
  assert.throws(() => costReport(rows, [{ ...reviews[0], attemptHash: 'forged' }]), /stale/);
  assert.throws(() => costReport(rows, [{ ...reviews[0], correctionRequests: 1 }]), /Acceptance/);
  const failed = [{ ...row, result: { ...row.result, failed: 1 } }];
  const forged = { ...reviews[0], attemptHash: reviewTemplate(failed).reviews[0].attemptHash };
  assert.throws(() => costReport(failed, [forged]), /Acceptance/);
  assert.throws(() => costReport(rows, [{ ...reviewTemplate(rows).reviews[0], reviewSeconds: 0 }]), /Pending/);
});

test('three-mode runner preserves absent-skill provenance, resume and durable evidence', { timeout: 180000 }, async () => {
  const { exportAssistanceEvidence } = await import('../scripts/report-expressivecss-assistance-cost.mjs');
  const directory = await mkdtemp(path.join(tmpdir(), 'expressivecss-cost-test-'));
  try {
    const bin = path.join(directory, 'bin'), skill = path.join(directory, 'skill'), output = path.join(directory, 'runs');
    await mkdir(bin); await mkdir(skill);
    await writeFile(path.join(skill, 'SKILL.md'), '# Test skill');
    await writeFile(path.join(bin, 'codex'), `#!${process.execPath}\nprocess.stdin.resume();process.stdin.on('end',()=>{
      console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'{"summary":"Transport stub, no implementation","verificationChecks":[],"verificationErrors":[]}'}}));
      console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:1,cached_input_tokens:0,output_tokens:1}}));
    });`, { mode: 0o700 });
    const script = `import {runBenchmark} from ${JSON.stringify(new URL('../scripts/benchmark-expressivecss-skill.mjs', import.meta.url).href)};
      await runBenchmark({assistance:true,candidate:process.argv[1],output:process.argv[2],caseName:'form-action',repetitions:1,resume:process.argv[3]==='true'});`;
    for (const resume of ['false', 'true']) {
      const run = spawnSync(process.execPath, ['--input-type=module', '-e', script, skill, output, resume], { encoding: 'utf8', timeout: 60000, env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` } });
      assert.equal(run.status, 0, [run.error?.message, run.stderr, run.stdout].filter(Boolean).join('\n'));
    }
    const rows = JSON.parse(await readFile(path.join(output, 'results.json'), 'utf8'));
    assert.deepEqual(rows.map(row => row.configuration), ['skill_only', 'mcp_only', 'combined']);
    assert.equal(rows[1].skillHash, null);
    assert.ok(rows.every(row => row.result.failed > 0 && row.operator_elapsed_seconds > 0));
    const archive = path.join(directory, 'durable');
    await mkdir(path.join(output, 'empty-evidence-directory'));
    const report = await exportAssistanceEvidence({ source: output, output: archive });
    assert.equal(report.status, 'pending-human-review');
    const manifest = JSON.parse(await readFile(path.join(archive, 'manifest.json'), 'utf8'));
    assert.match(manifest.archive.sha256, /^[a-f0-9]{64}$/);
    assert.ok(manifest.files['eval-form-action/mcp_only/run-1/outputs/src/index.html']);
    const extracted = path.join(directory, 'extracted'); await mkdir(extracted);
    const untar = spawnSync('tar', ['-xzf', path.join(archive, 'evidence.tar.gz'), '-C', extracted]);
    assert.equal(untar.status, 0);
    const { snapshotProject } = await import('../scripts/expressivecss-codex-adapter.mjs');
    assert.equal((await snapshotProject(extracted)).hash, manifest.sourceHash);
    assert.equal(await readFile(path.join(extracted, 'results.json'), 'utf8'), await readFile(path.join(output, 'results.json'), 'utf8'));
    await assert.rejects(exportAssistanceEvidence({ source: output, output: archive }), /EEXIST/);
    const { symlink } = await import('node:fs/promises');
    await symlink('/etc/hosts', path.join(output, 'outside'));
    await assert.rejects(exportAssistanceEvidence({ source: output, output: path.join(directory, 'unsafe') }), /symbolic link/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('assistance tool checks distinguish native MCP inventory from extra servers', async () => {
  const { gradeAssistanceToolAccess: grade } = await import('../scripts/benchmark-expressivecss-skill.mjs');
  const inventory = ['list_mcp_resources', 'list_mcp_resource_templates'].map(tool => ({ server: 'codex', tool }));
  for (const mode of ['skill_only', 'mcp_only', 'combined']) {
    assert.equal(grade(mode, inventory).passed, true);
    assert.equal(grade(mode, [{ server: 'external', tool: 'browser' }]).passed, false);
    assert.equal(grade(mode, [{ server: 'codex', tool: 'arbitrary_tool' }]).passed, false);
  }
  assert.equal(grade('skill_only', [{ server: 'expressivecss', tool: 'quality_inspector' }]).passed, false);
  assert.equal(grade('combined', [{ server: 'expressivecss', tool: 'quality_inspector' }]).passed, true);
  assert.equal(grade('unknown', []).passed, false);
});
