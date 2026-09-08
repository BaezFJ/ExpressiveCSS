#!/usr/bin/env node
import assert from 'node:assert/strict';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium, expect } from '@playwright/test';
import { materializeProjectFixture, redactValue } from './eval-expressivecss-skill.mjs';
import { configuredDefaults, hashProject, runCodex, snapshotProject, validateVerificationClaims } from './expressivecss-codex-adapter.mjs';
import { assertSameProvenance, collectEvaluationProvenance } from './expressivecss-eval-provenance.mjs';
import { startEvaluationBrowser, startFixtureServer, createRestrictedFixturePage } from './expressivecss-eval-browser.mjs';
import { retainSourceArtifacts, statistics } from './benchmark-expressivecss-skill.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFINITION = 'tests/fixtures/expressivecss-skill-evals/maintenance.json';
const SELF = 'scripts/eval-expressivecss-maintenance.mjs';
const allowed = ['src/index.html', 'src/app.js'];
const save = async (file, value) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2) + '\n');
};
const check = (text, passed, evidence) => ({ text, passed: Boolean(passed), evidence: redactValue(String(evidence)) });

// Only call with snapshots taken by the operator, never candidate-authored evidence.
export function gradeMaintenanceTransition(before, after, parentHash) {
  const changed = [...new Set([...Object.keys(before.manifest), ...Object.keys(after.manifest)])]
    .filter(file => JSON.stringify(before.manifest[file]) !== JSON.stringify(after.manifest[file]));
  return [
    check('Stage starts from the preceding result', before.hash === parentHash, `${parentHash} -> ${before.hash}`),
    check('Stage changes implementation within the authorized files', changed.length > 0 && changed.every(file => allowed.includes(file)), JSON.stringify(changed)),
  ];
}

/** Cumulative contracts; stage 3 explicitly replaces only the reset/feedback rule. */
export async function captureMaintenance(root, sequence, stage, output) {
  if (!['settings-maintenance', 'editor-maintenance'].includes(sequence) || !Number.isInteger(stage) || stage < 0 || stage > 3) throw new Error('Invalid maintenance scene');
  const expectations = [];
  let browser, server;
  const verify = async (text, action) => {
    try { await action(); expectations.push(check(text, true, 'Observed by operator browser')); }
    catch (error) { expectations.push(check(text, false, error.message)); }
  };
  try {
    server = await startFixtureServer(root);
    browser = await chromium.launch({ headless: true, timeout: 8000 });
    await mkdir(output, { recursive: true });
    for (const [treatment, width, colorScheme] of [['restrained', 320, 'light'], ['expressive', 840, 'dark']]) {
      const session = await createRestrictedFixturePage(browser, server.origin, { viewport: { width, height: 900 }, colorScheme, reducedMotion: 'reduce' });
      const { page } = session;
      try {
        await page.goto(`${server.origin}/?treatment=${treatment}`);
        await verify(`${treatment}: identity, scheme, primary action and reflow`, async () => {
          await expect(page.locator('.product-name')).toContainText('Common Ground');
          assert.equal(await page.locator('body').getAttribute('data-treatment'), treatment);
          await page.locator('#theme').selectOption(colorScheme);
          assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), colorScheme);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
          await expect(page.locator('.primary-action')).toHaveCount(1);
        });
        if (sequence === 'settings-maintenance') {
          await verify(`${treatment}: options, accessible checkbox and Save survive`, async () => {
            const values = stage ? ['mentions', 'schedule', 'digest', 'cancellations'] : ['mentions', 'schedule', 'digest'];
            assert.deepEqual(await page.locator('[name="updates"]').evaluateAll(nodes => nodes.map(node => node.value).sort()), [...values].sort());
            if (stage) {
              const added = page.getByRole('checkbox', { name: 'Event cancellations', exact: true });
              await expect(added).toHaveAttribute('name', 'updates');
              await expect(added).not.toBeChecked();
              await added.focus(); await page.keyboard.press('Space');
              await expect(added).toBeChecked();
            }
            await page.getByRole('checkbox', { name: 'A weekly garden digest', exact: true }).focus();
            await page.keyboard.press('Space');
            await page.locator('[name="quiet"]').focus(); await page.keyboard.press('Space');
            await page.getByRole('button', { name: 'Save preferences', exact: true }).focus();
            await page.keyboard.press('Enter');
            await expect(page.locator('#status')).toHaveText(`Saved for this page session: ${values.length} email update types; quiet hours off. No account settings changed.`);
          });
          if (stage >= 2) await verify(`${treatment}: reset obeys its current scope without saving`, async () => {
            const name = stage === 2 ? 'Reset preferences' : 'Reset email updates';
            const reset = page.getByRole('button', { name, exact: true });
            await expect(reset).toHaveCount(1);
            assert.equal(await reset.evaluate(node => node.classList.contains('primary-action')), false);
            await page.evaluate(() => { window.__submits = 0; document.querySelector('form').addEventListener('submit', () => window.__submits++); });
            await reset.focus(); await page.keyboard.press('Space');
            await expect(reset).toBeFocused();
            assert.deepEqual(await page.locator('[name="updates"]:checked').evaluateAll(nodes => nodes.map(node => node.value).sort()), ['mentions', 'schedule']);
            assert.equal(await page.locator('[name="quiet"]').isChecked(), stage === 2);
            await expect(page.locator('#status')).toHaveText(stage === 2 ? 'Defaults restored. Save preferences to apply them.' : 'Email defaults restored. Save preferences to apply them.');
            assert.equal(await page.evaluate(() => window.__submits), 0);
            await page.getByRole('checkbox', { name: 'Event cancellations', exact: true }).focus();
            await page.keyboard.press('Space');
            await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
            await expect(page.locator('#status')).toContainText('3 email update types');
          });
        } else {
          await verify(`${treatment}: live count remains described and handles empty input`, async () => {
            if (!stage) return;
            const described = (await page.locator('#message').getAttribute('aria-describedby')).split(/\s+/);
            assert.ok(described.includes('message-count') && described.includes('message-help'));
            await expect(page.locator('#message-count')).toBeVisible();
            await expect(page.locator('#message-count')).toHaveText(`${await page.locator('#message').inputValue().then(value => value.length)} characters`);
            await page.locator('#message').fill('');
            await expect(page.locator('#message-count')).toHaveText('0 characters');
            await page.locator('#message').fill('Hello 🌱');
            await expect(page.locator('#message-count')).toHaveText('8 characters');
          });
          await verify(`${treatment}: preview, formatting, focus and remount survive`, async () => {
            await page.locator('#subject').fill('Neighbors <img src=x>');
            await page.locator('#message').fill('Hello 🌱');
            await page.locator('#bold').focus(); await page.keyboard.press('Space');
            await expect(page.locator('#bold')).toHaveAttribute('aria-pressed', 'true');
            await page.locator('#preview-button').click();
            await expect(page.locator('#preview-title')).toBeFocused();
            await expect(page.locator('#preview-subject')).toHaveText('Neighbors <img src=x>');
            await expect(page.locator('#preview-subject img')).toHaveCount(0);
            await expect(page.locator('#preview-message')).toHaveText('Hello 🌱');
            await expect(page.locator('#preview-message')).toHaveCSS('font-weight', '700');
            await page.locator('#edit-button').click();
            await expect(page.locator('#message')).toBeFocused();
            for (let i = 0; i < 3; i++) await page.evaluate(() => {
              dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
              dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
            });
            await expect(page.locator('#bold')).toHaveAttribute('aria-pressed', 'true');
            await page.locator('#bold').click();
            await expect(page.locator('#bold')).toHaveAttribute('aria-pressed', 'false');
            await page.locator('#message').fill('Updated');
            if (stage) await expect(page.locator('#message-count')).toHaveText('7 characters');
          });
          await verify(`${treatment}: Save feedback follows the latest treatment rule`, async () => {
            for (const current of [treatment, treatment === 'expressive' ? 'restrained' : 'expressive']) {
              await page.locator('#treatment').selectOption(current);
              await page.locator('#editor-form button[type="submit"]').click();
              const count = stage === 2 || (stage === 3 && current === 'expressive');
              await expect(page.locator('#status')).toHaveText(`Saved “Neighbors <img src=x>” for this page session${count ? ': 7 characters' : ''}. Nothing was sent.`);
              await expect(page.locator('#message')).toHaveValue('Updated');
              if (stage) await expect(page.locator('#message-count')).toHaveText('7 characters');
            }
            await page.locator('#treatment').selectOption(treatment);
          });
        }
        await page.screenshot({ path: path.join(output, `${treatment}.png`), fullPage: true });
        expectations.push(check(`${treatment}: no browser errors or blocked requests`, !session.errors.length && !session.blockedRequests.length, JSON.stringify({ errors: session.errors, blocked: session.blockedRequests })));
      } finally { await session.context.close(); }
    }
  } finally { try { await browser?.close(); } finally { await server?.close(); } }
  return expectations;
}

export async function runMaintenance({ output, skill = path.join(ROOT, 'skills/expressivecss'), caseName, execute = runCodex }) {
  if (!output) throw new Error('--output is required');
  output = path.resolve(output); skill = path.resolve(skill);
  // Fresh archives only: resuming a chain requires restoring and validating every parent.
  try { if ((await readdir(output)).length) throw new Error('Use an empty output directory; maintenance resume is not supported'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const definition = JSON.parse(await readFile(path.join(ROOT, DEFINITION), 'utf8'));
  const sequences = definition.sequences.filter(sequence => !caseName || sequence.id === caseName);
  if (!sequences.length) throw new Error('Unknown maintenance sequence');
  const skillHash = await hashProject(skill);
  const collect = async () => collectEvaluationProvenance({ protocol: 'maintenance-v1', extraFiles: [SELF],
    plan: { sequences, skillHash, freshAgentPerStage: true, timeoutMs: 600000 }, modelSettings: await configuredDefaults() });
  const configured = await configuredDefaults();
  const provenance = await collect();
  await save(path.join(output, 'provenance.json'), provenance);
  const results = [];
  for (const sequence of sequences) {
    let root, parentHash, blockedBy;
    try {
      root = await materializeProjectFixture(sequence.fixture, ROOT);
      const skillRoot = path.join(root, '.agents/skills/expressivecss');
      await cp(skill, skillRoot, { recursive: true });
      parentHash = (await snapshotProject(root)).hash;
      for (const [index, stage] of sequence.stages.entries()) {
        const dir = path.join(output, `eval-${sequence.id}-${index + 1}`, 'with_skill', 'run-1');
        const artifacts = path.join(dir, 'outputs');
        await mkdir(artifacts, { recursive: true });
        const request = [index ? `Earlier requests, supplied as requirements rather than proof of completion:\n${sequence.stages.slice(0, index).map(item => item.request).join('\n\n')}` : '', `Current request (explicit replacements supersede earlier requirements):\n${stage.request}`].filter(Boolean).join('\n\n');
        await save(path.join(dir, 'eval_metadata.json'), { eval_id: results.length + 1, eval_name: `${sequence.id}/${stage.id}`, prompt: request, assertions: [], provenance });
        if (blockedBy) {
          const row = { sequence: sequence.id, stage: stage.id, status: 'blocked', blockedBy };
          results.push(row); await save(path.join(artifacts, 'blocked.json'), row);
          await save(path.join(output, 'results.json'), results); continue;
        }
        let session, before, after, envelope, row;
        const expectations = [];
        try {
          assertSameProvenance(provenance, await collect());
          assert.equal(await hashProject(skill), skillHash, 'Skill input changed');
          before = await snapshotProject(root);
          assert.equal(before.hash, parentHash, 'Parent state changed between stages');
          const beforeDir = path.join(artifacts, 'before');
          const retained = await retainSourceArtifacts(root, beforeDir);
          if (retained.length) throw new Error(JSON.stringify(retained));
          const baseline = await captureMaintenance(root, sequence.id, index, beforeDir);
          await save(path.join(beforeDir, 'checks.json'), baseline);
          if (baseline.some(item => !item.passed)) throw new Error('Stage baseline failed cumulative checks');
          session = await startEvaluationBrowser({ projectRoot: root, artifactDirectory: path.join(artifacts, 'candidate-browser') });
          envelope = await execute({ projectRoot: root, skillRoot, rootSkill: await readFile(path.join(skillRoot, 'SKILL.md'), 'utf8'),
            task: { id: stage.id, request }, artifactDirectory: artifacts,
            responseInstructions: 'Do not spawn agents. Use the available browser and report limitations honestly. Earlier requests remain requirements except where the current request explicitly replaces them.' }, { browserSession: session });
          after = await snapshotProject(root);
          expectations.push(...gradeMaintenanceTransition(before, after, parentHash));
          expectations.push(check('Agent completed without infrastructure failure', !envelope.runMetadata.infrastructureError, envelope.runMetadata.infrastructureError));
          expectations.push(check('Candidate used the available fixture browser', session.capability.status === 'available' && session.records.some(record => record.action !== 'preflight' && record.status === 'success'), session.capability.status));
          const claims = validateVerificationClaims(envelope.candidateResponse, envelope.executionEvidence);
          expectations.push(check('Reported verification matches operator records', !claims.length, JSON.stringify(claims)));
          await session.close(); session = null;
          expectations.push(...await captureMaintenance(root, sequence.id, index + 1, artifacts));
          assert.equal((await snapshotProject(root)).hash, after.hash, 'Post-run checks changed source');
          assertSameProvenance(provenance, await collect());
          await writeFile(path.join(artifacts, 'response.md'), redactValue(envelope.runMetadata.finalMessage));
        } catch (error) { expectations.push(check('Stage infrastructure completed', false, error.message)); }
        finally {
          try { await session?.close(); } catch (error) { expectations.push(check('Browser cleanup completed', false, error.message)); }
          try {
            const errors = await retainSourceArtifacts(root, artifacts);
            expectations.push(check('Review sources retained', !errors.length, JSON.stringify(errors)));
            for (const file of ['index.html', 'app.css', 'app.js']) await cp(path.join(artifacts, 'src', file), path.join(artifacts, `source-${file}.txt`));
          } catch (error) { expectations.push(check('Review sources retained', false, error.message)); }
          const passed = expectations.filter(item => item.passed).length;
          row = { sequence: sequence.id, stage: stage.id, status: passed === expectations.length ? 'passed' : 'failed', parentHash, beforeHash: before?.hash ?? null, afterHash: after?.hash ?? null,
            result: { passed, failed: expectations.length - passed, total: expectations.length, pass_rate: passed / expectations.length,
              time_seconds: envelope ? envelope.runMetadata.wallTimeMs / 1000 : null,
              tokens: envelope?.runMetadata.usage ? envelope.runMetadata.usage.input_tokens + envelope.runMetadata.usage.output_tokens : null }, runMetadata: envelope ? redactValue(envelope.runMetadata) : null };
          await save(path.join(dir, 'grading.json'), { expectations, summary: row.result, provenance });
          await save(path.join(artifacts, 'transition.json'), row);
          if (envelope) {
            const usage = envelope.runMetadata.usage;
            await save(path.join(dir, 'timing.json'), { total_tokens: usage ? usage.input_tokens + usage.output_tokens : null, total_duration_seconds: envelope.runMetadata.wallTimeMs / 1000, duration_ms: envelope.runMetadata.wallTimeMs });
          }
        }
        results.push(row);
        if (row.status !== 'passed') blockedBy = stage.id;
        else parentHash = after.hash;
        await save(path.join(output, 'results.json'), results);
        console.log(`${sequence.id}/${stage.id}: ${row.status} (${row.result.passed}/${row.result.total})`);
      }
    } catch (error) {
      results.push({ sequence: sequence.id, status: 'infrastructure-error', error: redactValue(error.message) });
      await save(path.join(output, 'results.json'), results);
    } finally { if (root) await rm(root, { recursive: true, force: true }); }
  }
  const measured = results.filter(row => row.result);
  await save(path.join(output, 'benchmark.json'), {
    metadata: { skill_name: 'expressivecss', executor_model: configured.model, runs_per_configuration: 1, evals_run: measured.map(row => `${row.sequence}/${row.stage}`), provenance },
    runs: measured.map((row, index) => ({ ...row, eval_id: index + 1, configuration: 'with_skill', run_number: 1 })),
    run_summary: { with_skill: Object.fromEntries(['pass_rate', 'time_seconds', 'tokens'].map(metric => [metric, statistics(measured.map(row => row.result[metric]))])) },
    chains: sequences.map(sequence => {
      const rows = results.filter(row => row.sequence === sequence.id);
      const complete = rows.length === sequence.stages.length && rows.every(row => row.status === 'passed');
      return { sequence: sequence.id, complete, ...Object.fromEntries(['time_seconds', 'tokens'].map(metric => [metric,
        rows.length === sequence.stages.length && rows.every(row => Number.isFinite(row.result?.[metric])) ? rows.reduce((sum, row) => sum + row.result[metric], 0) : null])) };
    }),
    notes: ['Fresh agent per stage; prior requests and files carry forward. Explicit replacements supersede older requirements.', 'One run per stage. Aggregate variability spans different tasks, not repeated trials; no speed comparison.', 'Automated contract checks are not human design acceptance. Screenshots await human review.'],
  });
  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { output: { type: 'string' }, skill: { type: 'string' }, case: { type: 'string' } } });
  const rows = await runMaintenance({ output: values.output, skill: values.skill, caseName: values.case });
  process.exitCode = rows.every(row => row.status === 'passed') ? 0 : 1;
}
