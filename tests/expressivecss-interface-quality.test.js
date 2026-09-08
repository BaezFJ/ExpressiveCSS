import assert from 'node:assert/strict';
import { access, appendFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { chromium } from '@playwright/test';
import { captureInterfaceQuality, gradeInterfaceQuality, retainedInterfaceEvidence, INTERFACE_SCENARIOS } from '../scripts/expressivecss-interface-quality.mjs';
import { materializeProjectFixture } from '../scripts/eval-expressivecss-skill.mjs';

const failed = (evidence) => gradeInterfaceQuality(evidence).filter((check) => !check.passed).map((check) => check.text);

test('whole-interface grading fails closed without complete independently collected evidence', () => {
  assert.equal(retainedInterfaceEvidence(null), null);
  assert.deepEqual(retainedInterfaceEvidence({ scenes: [null], interactions: [null] }).scenes, [null]);
  const missing = gradeInterfaceQuality(null);
  assert.ok(missing.length > 20);
  assert.ok(missing.every((check) => check.passed === false));
  const fake = { source: 'candidate', scenes: INTERFACE_SCENARIOS.map((settings) => ({ id: settings.id, settings, status: 'success', observation: {} })), interactions: [] };
  assert.equal(gradeInterfaceQuality(fake)[0].passed, false);
  assert.ok(gradeInterfaceQuality(fake, { reviewOnly: true }).some((check) => !check.passed && check.text.includes('evidence available')));
});

test('whole-interface browser distinguishes completed tasks, baseline defects, hidden controls, and failed scenes', { timeout: 180000 }, async (t) => {
  try { await access(chromium.executablePath()); } catch { t.skip('Chromium is not installed'); return; }
  const root = await materializeProjectFixture('consumer-current');
  const artifacts = await mkdtemp(path.join(os.tmpdir(), 'expressivecss-interface-quality-test-'));
  try {
    const baseline = await captureInterfaceQuality(root, path.join(artifacts, 'baseline'));
    assert.ok(failed(baseline).includes('Whole-interface Save visible and usable: default-840'), JSON.stringify(failed(baseline)));
    assert.equal(baseline.scenes.length, INTERFACE_SCENARIOS.length);
    assert.ok(gradeInterfaceQuality(baseline, { reviewOnly: true }).every((check) => check.passed), JSON.stringify(gradeInterfaceQuality(baseline, { reviewOnly: true }).filter((check) => !check.passed)));
    await appendFile(path.join(root, 'src/app.css'), '\nspan { color: red !important; }\nheader { flex-wrap: wrap; }\nnav.navigation-rail { min-height: 0; }\nsection, header, form { min-width: 0; overflow-wrap: anywhere; }\nheader button, form button { max-width: 100%; height: auto; white-space: normal; }\n');
    const htmlPath = path.join(root, 'src/index.html');
    await writeFile(htmlPath, (await readFile(htmlPath, 'utf8')).replace('<details open>', '<details>'));
    const repaired = await captureInterfaceQuality(root, path.join(artifacts, 'repaired'));
    assert.deepEqual(failed(repaired), []);
    assert.ok(repaired.scenes.every((scene) => scene.auxiliary.openedPreview), 'collapsed native preview remains reachable');
    assert.equal(repaired.qualitativeReview.status, 'pending');
    assert.match(repaired.limitations.join(' '), /not browser zoom/);
    const saved = JSON.parse(await readFile(path.join(artifacts, 'repaired/interface-quality.json'), 'utf8'));
    assert.equal(saved.scenes[0].screenshot.sha256, repaired.scenes[0].screenshot.sha256);
    assert.equal(saved.scenes[0].screenshot.path, 'default-320.png');
    assert.ok((await readFile(repaired.scenes[0].screenshot.path)).byteLength > 0);
    for (const mutate of [
      (copy) => copy.scenes.pop(),
      (copy) => { copy.scenes[0] = copy.scenes[1]; },
      (copy) => { copy.scenes[0].status = 'error'; },
      (copy) => { copy.scenes[0].settings.width = 123; },
      (copy) => { copy.scenes[0].observation.document.scrollWidth = '320'; },
      (copy) => { copy.scenes[0].observation.regions = {}; },
      (copy) => { copy.scenes[0].observation.navigation = {}; },
      (copy) => { copy.interactions[0].trace.focus = {}; },
      (copy) => { copy.scenes[0].screenshot.sha256 = 'candidate-claim'; },
      (copy) => { copy.interactions[0].trace.checkedAfter = 'true'; },
    ]) {
      const copy = structuredClone(repaired); mutate(copy);
      assert.ok(failed(copy).length > 0);
    }
    await appendFile(path.join(root, 'src/app.css'), '\n@media (width: 320px) { #preferences button[type="submit"] { visibility: hidden; } }\n@media (width: 599px) { #preferences { height: 1px; overflow: hidden; } }\n@media (width: 600px) { body { min-height: 13000px; } }\n@media (width: 839px) { #account-help, #remount-help, #preview-state { display: none; } }\n/* :root { --md-source: #006a79; } */\n:root { --md-source: red; }\n');
    await appendFile(path.join(root, 'src/app.js'), '\nif (location.search.includes("state=empty")) console.error("API_KEY=fixture-secret");\n');
    await writeFile(htmlPath, (await readFile(htmlPath, 'utf8')).replace('<button type="submit">', '<button type="submit" disabled>'));
    await appendFile(path.join(root, 'src/app.js'), '\nif (innerWidth === 1280) { const node = document.querySelector("#account-help"); const field = document.createElement("fieldset"); field.disabled = true; node.before(field); field.append(node); }\n');
    const broken = await captureInterfaceQuality(root, path.join(artifacts, 'broken'));
    assert.ok(failed(broken).includes('Whole-interface brand seed preserved: default-320'));
    assert.ok(failed(broken).includes('Whole-interface task outcome: save-pointer'));
    assert.ok(broken.interactions.find((record) => record.id === 'save-pointer').interactionError);
    assert.equal(broken.interactions.find((record) => record.id === 'save-pointer').status, 'success', 'failed task action still retains the readable interface for no-edit review');
    assert.ok(gradeInterfaceQuality(broken, { reviewOnly: true }).find((check) => check.text === 'Whole-interface interaction evidence: save-pointer').passed);
    assert.ok(failed(broken).includes('Whole-interface auxiliary controls reachable: default-839'));
    const gradingJson = JSON.stringify(gradeInterfaceQuality(broken));
    assert.doesNotMatch(gradingJson, /fixture-secret/);
    assert.match(gradingJson, /REDACTED/);
    assert.equal(broken.scenes.find((scene) => scene.id === 'default-1280').auxiliary.controls.find((node) => node.id === 'account-help').disabled, true, 'fieldset disabled state is inherited');
    assert.ok(broken.errors.some((error) => error.includes('API_KEY=fixture-secret')), 'in-memory observations stay intact');
    const retained = await readFile(path.join(artifacts, 'broken/empty-375.json'), 'utf8');
    assert.match(retained, /API_KEY=\[REDACTED\]/);
    assert.doesNotMatch(retained, /fixture-secret/);
    assert.ok(failed(broken).includes('Whole-interface Save visible and usable: default-320'));
    assert.ok(failed(broken).includes('Whole-interface Save visible and usable: default-599'));
    assert.equal(broken.scenes.find((record) => record.id === 'default-600').status, 'error');
    assert.match(broken.scenes.find((record) => record.id === 'default-600').error, /document height/);
    assert.equal(broken.scenes.find((record) => record.id === 'default-839').status, 'success', 'one failed scene must not discard subsequent captures');
    assert.ok(gradeInterfaceQuality(broken, { reviewOnly: true }).some((check) => !check.passed && check.text.endsWith('default-600')));
  } finally { await rm(root, { recursive: true, force: true }); await rm(artifacts, { recursive: true, force: true }); }
});
