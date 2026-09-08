import assert from 'node:assert/strict';
import { access, appendFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { enforcedRules, violationsIn } from '../scripts/semantics-rules.mjs';
import { startFixtureServer, createRestrictedFixturePage } from '../scripts/expressivecss-eval-browser.mjs';
import { chromium } from '@playwright/test';
import { materializeProjectFixture } from '../scripts/eval-expressivecss-skill.mjs';
import { captureMaterialQuality, gradeMaterialQuality, retainedMaterialEvidence, MATERIAL_SCENARIOS, isMaterialCase } from '../scripts/expressivecss-material-quality.mjs';

const failures = (evidence, options) => gradeMaterialQuality(evidence, options).filter(check => !check.passed);

test('Material grading rejects candidate evidence and missing or malformed operator observations', () => {
  assert.equal(isMaterialCase('material-motion-repair'), true);
  assert.equal(isMaterialCase('interface-refine'), false);
  assert.equal(retainedMaterialEvidence(null), null);
  assert.deepEqual(retainedMaterialEvidence({ scenes: [null] }).scenes, [null]);
  for (const name of ['material-component-review', 'material-expression-repair', 'material-motion-repair']) {
    assert.ok(failures(null, { name }).length > 1);
    const fake = { name, source: 'candidate', scenes: MATERIAL_SCENARIOS.map(settings => ({ id: settings.id, settings, status: 'success' })) };
    assert.equal(gradeMaterialQuality(fake, { name })[0].passed, false);
    assert.ok(failures(fake, { name }).some(check => check.text.startsWith('Material rendered evidence')));
  }
  const retained = retainedMaterialEvidence({ scenes: [{ captures: { preview: { path: '/private/path/preview.png', sha256: 'a'.repeat(64) } }, error: 'API_KEY=fixture-secret' }] });
  assert.equal(retained.scenes[0].captures.preview.path, 'preview.png');
  assert.doesNotMatch(JSON.stringify(retained), /fixture-secret/);
});

test('Material browser exposes wrong hierarchy contracts and motion while keeping design judgments pending', { timeout: 240000 }, async t => {
  try { await access(chromium.executablePath()); } catch { t.skip('Chromium is not installed'); return; }
  const root = await materializeProjectFixture('material-expression-repair');
  const artifacts = await mkdtemp(path.join(os.tmpdir(), 'expressivecss-material-quality-'));
  let motionRoot;
  try {
    const name = 'material-expression-repair';
    const baseline = await captureMaterialQuality(root, path.join(artifacts, 'baseline'), name);
    assert.ok(failures(baseline, { name, before: baseline }).some(check => check.text.startsWith('Material declared expression contracts')));
    assert.deepEqual(failures({ ...baseline, name: 'material-component-review' }, { name: 'material-component-review', before: { ...baseline, name: 'material-component-review' } }), []);
    await appendFile(path.join(root, 'src/app.css'), '\n[data-treatment="expressive"] #page-title { font-size: var(--md-sys-typescale-headline-large-font-size); line-height: var(--md-sys-typescale-headline-large-line-height); font-weight: 500; }\n[data-treatment="expressive"] #preview-button { --md-comp-filled-button-container-height: 96px; --md-comp-filled-button-container-shape: 16px; }\n');
    const repaired = await captureMaterialQuality(root, path.join(artifacts, 'repaired'), name);
    assert.deepEqual(failures(repaired, { name, before: baseline }), []);
    assert.ok(failures(repaired, { name, before: { ...baseline, source: 'candidate' } }).some(check => check.text.startsWith('Material matched')));
    const recomposed = structuredClone(repaired);
    for (const scene of recomposed.scenes.filter(scene => scene.settings.treatment === 'expressive')) for (const phase of ['initial', 'preview']) scene[phase].styles['#subject'].width += 32;
    assert.deepEqual(failures(recomposed, { name, before: baseline }), [], 'removing expressive field containment may alter geometry without changing its type or color');
    assert.equal(repaired.qualitativeReview.status, 'pending');
    assert.match(repaired.qualitativeReview.scope, /no aggregate design score/);
    const saved = JSON.parse(await readFile(path.join(artifacts, 'repaired/material-quality.json'), 'utf8'));
    assert.equal(saved.scenes[0].captures.preview.path, `${MATERIAL_SCENARIOS[0].id}-preview.png`);
    assert.ok((await readFile(repaired.scenes[0].captures.preview.path)).byteLength > 0);
    for (const mutate of [
      value => value.scenes.pop(),
      value => { value.scenes[0] = value.scenes[1]; },
      value => { value.scenes[0].settings.reducedMotion = 'unexpected'; },
      value => { value.scenes[0].initial.width = '375'; },
      value => { value.scenes[0].initial.styles = {}; },
      value => { value.scenes[0].captures.preview.sha256 = 'candidate-claim'; },
      value => { value.scenes[0].trace.completed = 'true'; },
      value => { value.scenes[0].preview.styles['#message'].fontSize = '99px'; },
      value => { value.scenes[0].initial.styles['#page-title'].fontSize = '99px'; },
      value => { value.scenes[0].errors = ['API_KEY=fixture-secret']; },
    ]) {
      const copy = structuredClone(repaired); mutate(copy);
      assert.ok(failures(copy, { name, before: baseline }).length > 0);
      assert.doesNotMatch(JSON.stringify(gradeMaterialQuality(copy, { name, before: baseline })), /fixture-secret/);
    }
    const motionName = 'material-motion-repair';
    motionRoot = await materializeProjectFixture(motionName);
    const excessiveMotion = await captureMaterialQuality(motionRoot, path.join(artifacts, 'excessive-motion'), motionName);
    const motionFailures = failures(excessiveMotion, { name: motionName, before: excessiveMotion });
    assert.equal(motionFailures.length, 4, JSON.stringify(motionFailures));
    assert.ok(motionFailures.every(check => check.text.startsWith('Material motion preference contract') && check.text.endsWith('-reduce')));
    await appendFile(path.join(motionRoot, 'src/app.css'), '\n@media (prefers-reduced-motion: reduce) { #preview:not([hidden]) { animation: none !important; } }\n');
    const reducedMotion = await captureMaterialQuality(motionRoot, path.join(artifacts, 'reduced-motion'), motionName);
    assert.deepEqual(failures(reducedMotion, { name: motionName, before: excessiveMotion }), []);
    const deletedMotion = structuredClone(reducedMotion);
    deletedMotion.scenes.find(scene => scene.settings.reducedMotion === 'no-preference').trace.animations = [];
    assert.ok(failures(deletedMotion, { name: motionName, before: excessiveMotion }).some(check => check.text.startsWith('Material motion preference contract')));
    const unrelatedMotionEdit = structuredClone(reducedMotion);
    unrelatedMotionEdit.scenes[0].initial.styles['#message'].fontSize = '32px';
    assert.ok(failures(unrelatedMotionEdit, { name: motionName, before: excessiveMotion }).some(check => check.text.startsWith('Material motion repair preserves unrelated styles')));
    const hiddenResult = structuredClone(reducedMotion);
    hiddenResult.scenes.find(scene => scene.settings.reducedMotion === 'reduce').trace.previewVisible = false;
    assert.ok(failures(hiddenResult, { name: motionName, before: excessiveMotion }).some(check => check.text.startsWith('Material editor task completes')));
  } finally { await rm(root, { recursive: true, force: true }); if (motionRoot) await rm(motionRoot, { recursive: true, force: true }); await rm(artifacts, { recursive: true, force: true }); }
});


test('Material review fixture is semantically valid despite intrusive feedback and mismatched selection intent', { timeout: 30000 }, async t => {
  const semantics = JSON.parse(await readFile(new URL('../semantics.json', import.meta.url), 'utf8'));
  const rules = enforcedRules(semantics);
  for (const name of ['material-component-review', 'material-expression-repair', 'material-motion-repair']) {
    const root = await materializeProjectFixture(name);
    let server, browser, session;
    try {
      const html = await readFile(path.join(root, 'src/index.html'), 'utf8');
      const dom = new JSDOM(html); // Static rules must not initialize framework components.
      try { assert.deepEqual(violationsIn(dom.window.document, rules, semantics.compositeRoles), [], name); }
      finally { dom.window.close(); }
      if (name !== 'material-component-review') continue;
      try { await access(chromium.executablePath()); } catch { t.diagnostic('Chromium unavailable; review behavior not verified'); continue; }
      server = await startFixtureServer(root);
      browser = await chromium.launch({ headless: true });
      session = await createRestrictedFixturePage(browser, server.origin, { reducedMotion: 'reduce' });
      const page = session.page;
      page.setDefaultTimeout(3000);
      await page.goto(`${server.origin}/dashboard`, { waitUntil: 'load' });
      assert.equal(await page.locator('#editor-form #delivery-choice').count(), 1);
      await page.locator('[data-delivery="weekly"]').click();
      assert.equal(await page.locator('#delivery-value').inputValue(), 'weekly');
      await page.locator('#editor-form button[type="submit"]').click();
      assert.equal(await page.locator('dialog').evaluate(node => node.open && node.matches(':modal')), true);
      assert.match(await page.locator('#status').innerText(), /Delivery: weekly/);
      await page.getByRole('button', { name: 'Continue editing', exact: true }).click();
      assert.equal(await page.locator('dialog').evaluate(node => node.open), false);
      assert.deepEqual(session.errors, []);
      assert.deepEqual(session.blockedRequests, []);
    } finally { await session?.context.close(); await browser?.close(); await server?.close(); await rm(root, { recursive: true, force: true }); }
  }
});
