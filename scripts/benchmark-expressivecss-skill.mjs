#!/usr/bin/env node
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { JSDOM } from 'jsdom';
import { EVALUATOR_LIMITS, materializeProjectFixture, readCompletionFiles, readBoundedRegularFile, redactValue } from './eval-expressivecss-skill.mjs';
import { configuredDefaults, hashProject, retainedBrowserEvidence, runCodex, validateVerificationClaims } from './expressivecss-codex-adapter.mjs';
import { assertSameProvenance, collectEvaluationProvenance, validateRetainedResults } from './expressivecss-eval-provenance.mjs';
import { startEvaluationBrowser, startFixtureServer, createRestrictedFixturePage } from './expressivecss-eval-browser.mjs';
import { captureInterfaceQuality, gradeInterfaceQuality, INTERFACE_SCENARIOS, retainedInterfaceEvidence } from './expressivecss-interface-quality.mjs';

import { captureMaterialQuality, gradeMaterialQuality, isMaterialCase, retainedMaterialEvidence } from './expressivecss-material-quality.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFINITIONS = JSON.parse(await readFile(path.join(ROOT, 'tests/fixtures/expressivecss-skill-evals/benchmark.json'), 'utf8'));
const save = async (filename, value) => { await mkdir(path.dirname(filename), { recursive: true }); await writeFile(filename, `${JSON.stringify(value, null, 2)}\n`); };
const check = (text, passed, evidence) => ({ text, passed: Boolean(passed), evidence: redactValue(String(evidence)) });
const isInterfaceCase = (name) => ['interface-refine', 'interface-review'].includes(name);
export const INTERFACE_REVIEW_CRITERIA = ['C-TASK-PRIMARY', 'C-EMPHASIS-ONE', 'C-CONTAINER-PURPOSE', 'C-TYPE-ROLE', 'C-IDENTITY-CHANNELS', 'C-ADAPTIVE-COMPOSITION', 'C-THEME-HIERARCHY', 'C-LONG-CONTENT-FIT', 'C-STATE-NONCOLOR', 'A-FOCUS-VISIBLE'];

// Report completeness and provenance only. Independent review judges interpretations.
export function gradeInterfaceReviewReferences(response, records) {
  const rows = response?.interfaceReview;
  const successful = new Set((records ?? []).filter((row) => row.status === 'success' && row.action !== 'preflight').map((row) => row.id));
  const validRows = Array.isArray(rows) && rows.length > 0 && rows.length <= 100 && rows.every((row) =>
    row && typeof row.criterionId === 'string' && ['Pass', 'Fail', 'Intentional adaptation', 'Blocked'].includes(row.status)
    && !(row.criterionId.startsWith('A-') && row.status === 'Intentional adaptation')
    && typeof row.observation === 'string' && row.observation.trim().length > 0 && row.observation.length <= 4000
    && Array.isArray(row.evidenceIds) && row.evidenceIds.length <= 100
    && row.evidenceIds.every((id) => successful.has(id)) && (row.status === 'Blocked' || row.evidenceIds.length > 0));
  return check('Visual review covers requested criteria with recorded references or explicit blockers', validRows && INTERFACE_REVIEW_CRITERIA.every((id) => rows.some((row) => row.criterionId === id)), 'Checks report coverage and browser proof references only; interpretation requires independent review');
}

export const MATERIAL_REVIEW_CRITERIA = Object.freeze({
  'material-component-review': ['component-choice', 'hierarchy'],
  'material-expression-repair': ['hierarchy', 'typography', 'shape'],
  'material-motion-repair': ['motion'],
});

// Coverage and authentic references only: a plausible but wrong design judgment can pass
// this check and must still be assessed in the separate human review.
export function gradeMaterialReviewReferences(name, response, records) {
  const rows = response?.materialReview;
  // The skill's review matrix names these same decisions with stable criterion IDs.
  const equivalent = { 'C-TASK-PRIMARY': 'hierarchy', 'C-TYPE-ROLE': 'typography', 'C-SHAPE-CONTRACT': 'shape', 'C-MOTION-REDUCED-OUTCOME': 'motion' };
  const successful = new Set((records ?? []).filter((row) => row.status === 'success' && row.action !== 'preflight').map((row) => row.id));
  const valid = Array.isArray(rows) && rows.length > 0 && rows.length <= 100 && rows.every((row) =>
    row && typeof row.criterionId === 'string' && ['Pass', 'Fail', 'Intentional adaptation', 'Blocked'].includes(row.status)
    && typeof row.observation === 'string' && row.observation.trim().length > 0 && row.observation.length <= 4000
    && Array.isArray(row.evidenceIds) && row.evidenceIds.length <= 100 && row.evidenceIds.every((id) => successful.has(id))
    && (row.status === 'Blocked' || row.evidenceIds.length > 0));
  return check('Material report covers requested decisions with recorded references or explicit blockers', valid && Boolean(MATERIAL_REVIEW_CRITERIA[name]) && MATERIAL_REVIEW_CRITERIA[name].every((id) => rows.some((row) => equivalent[row.criterionId] === id || row.criterionId === id || row.criterionId.startsWith(`${id}-`) || row.criterionId.startsWith(`${id}.`))), 'Coverage only; recommendation quality and interpretation remain pending human review');
}

export function gradeMatchedInterfaceScenes(before, after) {
  const complete = [before, after].every((evidence) => evidence?.source === 'operator-browser'
    && Array.isArray(evidence.scenes) && evidence.scenes.length === INTERFACE_SCENARIOS.length);
  const matched = complete && INTERFACE_SCENARIOS.every(({ id }) => {
    const previous = before.scenes.filter((scene) => scene.id === id);
    const next = after.scenes.filter((scene) => scene.id === id);
    return previous.length === 1 && next.length === 1 && previous[0].status === 'success' && next[0].status === 'success'
      && JSON.stringify(previous[0].settings) === JSON.stringify(next[0].settings)
      && [previous[0], next[0]].every((scene) => /^[a-f0-9]{64}$/.test(scene.screenshot?.sha256 ?? ''));
  });
  return check('Whole-interface before and after scenes have matching settings and retained captures', matched, 'Compared operator scene IDs, settings and capture digests; visual interpretation remains separate');
}

export function benchmarkResponseInstructions(name) {
  const scope = {
    'form-action': 'Only src/index.html may change.',
    'brand-token': 'Only src/app.css may change.',
    'tooltip-remount': 'Only src/index.html and src/app.js may change.',
    'navigation-media': 'Only src/index.html and src/app.css may change.',
    'no-edit-audit': 'Do not change any project files.',
    'interface-refine': 'Only src/index.html and src/app.css may change. Preserve application behavior, packages and assets.',
    'interface-review': 'Do not change any project files.',
    'material-component-review': 'Do not change any project files.',
    'material-expression-repair': 'Only src/app.css may change.',
    'material-motion-repair': 'Only src/app.css may change.',
    'version-mismatch': 'Preserve dependency and lock files, installed packages, assets and application code. Safe setup repairs may only add or correct standard viewport metadata in src/index.html.',
  }[name] ?? '';
  const contract = name === 'no-edit-audit' ? `Include audit: {conclusion: "defects-found"|"no-defects"|"unavailable", findings: [{category: "accessible-name"|"navigation-semantics" or another category, source: {path: project-relative file path, line: one-based element start line, selector: CSS selector}, defect: boolean, observed: {accessibleName: string when relevant, tagName: lowercase string when relevant, containsCommand: boolean when relevant}, fixHtml: proposed replacement HTML for this element}]}. Report source observations and your actual conclusion, with proposed fixes rather than edits. Separate browser verification from source findings.`
    : name === 'version-mismatch' ? `Include versionAssessment: {installedVersion: string|null, bundledVersion: string|null, relationship: "match"|"mismatch"|"unknown", bundledContractSafe: boolean, currentDocsSafe: boolean, matchingEvidence: "available"|"unavailable"|"unknown", unsupportedClaims: "blocked"|"allowed", sources: [{path: project-relative direct metadata source, line: one-based line containing the version field}]}. Cite direct installed-package and bundled-contract metadata. Distinguish version metadata from available implementation documentation and verified public-site provenance.` : '';
  const review = isInterfaceCase(name) ? `Include interfaceReview as an array of {criterionId, status: "Pass"|"Fail"|"Intentional adaptation"|"Blocked", observation, evidenceIds: browser proof IDs, recommendation?}. Cover ${INTERFACE_REVIEW_CRITERIA.join(', ')}. Use separate rows when scenes or results differ. Each observed judgment cites a successful browser proof ID; blocked rows explain unavailable evidence. These references establish provenance, not the truth of your interpretation. Do not provide an aggregate design score. Use the browser emulate action for colorScheme and reducedMotion. The preview selector can be changed via evaluate with a change event. For text-size stress, reload first, then double each element's computed font-size; this is not browser zoom. Use fullPage:true for whole-page captures and open the returned absolute screenshot path with the image viewer before making visual judgments. Budget the 100 browser calls by scene, combine related evaluate observations, and reuse captures across criteria. The operator performs the independent review after this run; do not spawn another agent.` : '';
  const material = isMaterialCase(name) ? `Include materialReview as an array of {criterionId, status: "Pass"|"Fail"|"Intentional adaptation"|"Blocked", observation, evidenceIds: browser proof IDs, recommendation?}. Cover ${MATERIAL_REVIEW_CRITERIA[name].join(', ')}. Cite successful browser records for observations; explain blockers. Extra relevant criteria and different wording are welcome. Separate measured behavior from Material interpretation; do not give an aggregate design score. Capture full-page views and view the returned screenshots before making visual judgments. Use browser emulate for reducedMotion, and evaluate with a change event to switch #treatment. Operator captures before/after independently; human review remains pending. Do not spawn another agent.` : '';
  return `${scope}\n${contract}\n${review}\n${material}`.trim();
}

export function gradeProjectChanges(name, filesystem) {
  const before = filesystem?.beforeManifest;
  const after = filesystem?.afterManifest;
  const validHash = (value) => typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value);
  if (filesystem?.source !== 'adapter' || filesystem?.algorithm !== 'sha256' || filesystem?.independentlyComputed !== true
      || !validHash(filesystem.before) || !validHash(filesystem.after) || !before || !after) return [check('Independent per-path project evidence is available', false, 'Missing operator manifests or valid SHA-256 provenance')];
  const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((file) => JSON.stringify(before[file]) !== JSON.stringify(after[file]));
  const allowed = {
    'form-action': ['src/index.html'], 'brand-token': ['src/app.css'],
    'tooltip-remount': ['src/index.html', 'src/app.js'], 'navigation-media': ['src/index.html', 'src/app.css'],
    'no-edit-audit': [], 'version-mismatch': ['src/index.html'],
    'interface-refine': ['src/index.html', 'src/app.css'], 'interface-review': [],
    'material-component-review': [], 'material-expression-repair': ['src/app.css'], 'material-motion-repair': ['src/app.css'],
  }[name] ?? [];
  const outside = changed.filter((file) => !allowed.includes(file));
  const consistentDigests = changed.length ? filesystem.before !== filesystem.after : filesystem.before === filesystem.after;
  return [check('Changes stay within the requested files, preserving dependencies and assets', !outside.length && consistentDigests, JSON.stringify({ changed, unauthorized: outside, consistentDigests }))];
}

export function gradeAssetReferences(before, after) {
  const references = (files) => {
    const dom = new JSDOM(files['src/index.html'] ?? '');
    try {
      const values = [...dom.window.document.querySelectorAll('[src],[srcset],link[href],object[data],video[poster]')]
        .flatMap((node) => ['src', 'srcset', ...(node.localName === 'link' ? ['href'] : []), ...(node.localName === 'object' ? ['data'] : []), ...(node.localName === 'video' ? ['poster'] : [])]
          .filter((attribute) => node.hasAttribute(attribute)).map((attribute) => node.getAttribute(attribute)));
      const css = [files['src/app.css'] ?? '', ...[...dom.window.document.querySelectorAll('style')].map((node) => node.textContent), ...[...dom.window.document.querySelectorAll('[style]')].map((node) => node.getAttribute('style'))].join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const match of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)|@import\s+(['"])(.*?)\3/gi)) values.push(match[2] ?? match[4]);
      return new Set(values);
    } finally { dom.window.close(); }
  };
  const previous = references(before);
  const added = [...references(after)].filter((reference) => !previous.has(reference));
  return check('Scoped tasks introduce no invented declarative asset references', !added.length, JSON.stringify({ added }));
}

// Fixture-scoped source check; browser/assistive-technology results remain separate evidence.
function accessibleName(node) {
  if (!node) return '';
  if (node.hasAttribute('aria-labelledby')) return node.getAttribute('aria-labelledby').split(/\s+/).map((id) => node.ownerDocument.getElementById(id)?.textContent ?? '').join(' ').trim();
  if (node.hasAttribute('aria-label')) return node.getAttribute('aria-label').trim();
  const visible = node.cloneNode(true);
  visible.querySelectorAll('[aria-hidden="true"],[hidden]').forEach((child) => child.remove());
  visible.querySelectorAll('img[alt]').forEach((child) => child.replaceWith(child.getAttribute('alt')));
  return visible.textContent.trim() || node.getAttribute('title')?.trim() || '';
}

// The fixture permits the documented CSS tooltip as a description, not a renamed control.
export function preservedControlLabel(original, next) {
  if (!original || !next || original.localName !== next.localName) return false;
  if (original.localName === 'select') {
    const options = (node) => [...node.querySelectorAll('option')].map((option) => [option.value, option.textContent.trim()]);
    return JSON.stringify(options(original)) === JSON.stringify(options(next));
  }
  const labelled = next.cloneNode(true);
  const descriptions = new Set((next.getAttribute('aria-describedby') ?? '').split(/\s+/));
  labelled.querySelectorAll('.tooltip[id]').forEach((node) => { if (descriptions.has(node.id)) node.remove(); });
  return accessibleName(original) === accessibleName(labelled);
}

function enabledCommand(button) {
  return button?.getAttribute('type') === 'button' && !button.disabled
    && (!button.hasAttribute('role') || button.getAttribute('role') === 'button')
    && !button.closest('[hidden],[aria-hidden="true"],[aria-disabled="true"],[inert],fieldset[disabled]');
}

export function gradeAuditResponse(response, html) {
  const dom = new JSDOM(html, { includeNodeLocations: true });
  const findings = [];
  try {
    const report = response?.audit;
    findings.push(check('Audit concludes that the fixture has defects', report?.conclusion === 'defects-found', report?.conclusion ?? 'Missing structured conclusion'));
    for (const category of ['accessible-name', 'navigation-semantics']) {
      const target = category === 'accessible-name' ? dom.window.document.querySelector('#unnamed-action')
        : [...dom.window.document.querySelectorAll('nav')].find((node) => node.querySelector('button')?.textContent.trim() === 'Save account');
      const assessments = (Array.isArray(report?.findings) ? report.findings : []).filter((finding) => {
        if (finding?.category !== category || finding.source?.path !== 'src/index.html' || typeof finding.source.selector !== 'string') return false;
        try { return [...dom.window.document.querySelectorAll(finding.source.selector)].includes(target); } catch { return false; }
      });
      const valid = assessments.length > 0 && assessments.every((finding) => {
        if (finding?.category !== category || finding.defect !== true || finding.source?.path !== 'src/index.html' || typeof finding.source.selector !== 'string') return false;
        let node;
        try { const nodes = dom.window.document.querySelectorAll(finding.source.selector); if (nodes.length !== 1) return false; node = nodes[0]; } catch { return false; }
        if (dom.nodeLocation(node)?.startLine !== finding.source.line || typeof finding.fixHtml !== 'string' || finding.fixHtml.length > 16000) return false;
        const fix = new JSDOM(finding.fixHtml);
        try {
          if (fix.window.document.querySelector('script') || [...fix.window.document.querySelectorAll('*')].some((element) => [...element.attributes].some(({ name }) => /^on/i.test(name)))) return false;
          if (category === 'accessible-name') {
            const replacement = fix.window.document.querySelector('button');
            return node.id === 'unnamed-action' && accessibleName(node) === '' && finding.observed?.accessibleName === ''
              && enabledCommand(replacement) && Boolean(accessibleName(replacement));
          }
          const originalCommand = node.querySelector('button');
          const replacement = [...fix.window.document.querySelectorAll('button')].find((button) => accessibleName(button) === accessibleName(originalCommand));
          return node.localName === 'nav' && originalCommand?.textContent.trim() === 'Save account' && !node.querySelector('a[href]')
            && finding.observed?.tagName === 'nav' && finding.observed?.containsCommand === true
            && enabledCommand(replacement) && !replacement.closest('nav,[role="navigation"]');
        } finally { fix.window.close(); }
      });
      findings.push(check(`Audit grounds ${category} defect and fix in the cited source`, valid, JSON.stringify(report?.findings ?? 'Missing structured findings')));
    }
    return findings;
  } finally { dom.window.close(); }
}

export function gradeVersionResponse(response, sources) {
  const installedPath = 'node_modules/@expressivecss/expressive/package.json';
  const contractPath = '.agents/skills/expressivecss/references/contract.json';
  const installed = JSON.parse(sources[installedPath]).version;
  const bundled = JSON.parse(sources[contractPath]).frameworkVersion;
  const assessment = response?.versionAssessment;
  const cited = [[installedPath, 'version'], [contractPath, 'frameworkVersion']].every(([file, property]) =>
    (Array.isArray(assessment?.sources) ? assessment.sources : []).some((source) => source?.path === file && Number.isSafeInteger(source.line) && source.line > 0
      && sources[file].split('\n')[source.line - 1]?.includes(`"${property}"`)));
  return [
    check('Version assessment cites actual installed and bundled metadata', assessment?.installedVersion === installed && assessment?.bundledVersion === bundled && cited, JSON.stringify(assessment ?? 'Missing versionAssessment')),
    check('Version relationship agrees with package evidence', assessment?.relationship === (installed === bundled ? 'match' : 'mismatch'), `${installed} installed; ${bundled} bundled`),
    check('Unavailable target documentation blocks unsupported claims and public-site assurance', assessment?.matchingEvidence === 'unavailable' && assessment?.unsupportedClaims === 'blocked' && assessment?.currentDocsSafe === false && assessment?.bundledContractSafe === false, JSON.stringify(assessment ?? 'Missing versionAssessment')),
  ];
}

export function onlyViewportRepair(before, after) {
  if (before === after) return true;
  const old = new JSDOM(before, { includeNodeLocations: true });
  const next = new JSDOM(after, { includeNodeLocations: true });
  try {
    const viewport = next.window.document.querySelectorAll('head meta[name="viewport"]');
    const values = viewport[0]?.getAttribute('content')?.split(',').map((value) => value.trim().replace(/\s*=\s*/g, '=')) ?? [];
    if (viewport.length !== 1 || values.length !== 2 || !values.includes('width=device-width') || !values.some((value) => /^initial-scale=1(?:\.0+)?$/.test(value))
      || [...viewport[0].attributes].some(({ name }) => !['name', 'content'].includes(name))) return false;
    const withoutViewport = (dom) => {
      dom.window.document.querySelectorAll('head meta[name="viewport"]').forEach((node) => node.remove());
      for (const node of [...dom.window.document.head.childNodes]) if (node.nodeType === 3 && !node.textContent.trim()) node.remove();
      return dom.serialize();
    };
    return withoutViewport(old) === withoutViewport(next);
  } finally { old.window.close(); next.window.close(); }
}

async function retainSourceArtifacts(root, outputDirectory) {
  const errors = [];
  for (const source of ['index.html', 'app.css', 'app.js']) {
    try {
      const content = await readBoundedRegularFile(path.join(root, 'src', source), EVALUATOR_LIMITS.stringBytes, 'review source', root);
      await mkdir(path.join(outputDirectory, 'src'), { recursive: true });
      await writeFile(path.join(outputDirectory, 'src', source), redactValue(content));
    } catch (error) {
      if (error.code !== 'ENOENT') errors.push({ source: `src/${source}`, error: redactValue(error.message) });
    }
  }
  return errors;
}

export function statistics(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return { mean: null, median: null, stddev: null, min: null, max: null };
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const middle = Math.floor(sorted.length / 2);
  return { mean, median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    stddev: Math.sqrt(sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / sorted.length), min: sorted[0], max: sorted.at(-1) };
}

// Skill Creator's viewer reads metadata and files immediately inside each run.
export async function prepareReviewOutputs(output) {
  for (const directory of await readdir(output, { withFileTypes: true })) {
    if (!directory.isDirectory() || !directory.name.startsWith('eval-')) continue;
    const evalDirectory = path.join(output, directory.name);
    const metadata = JSON.parse(await readFile(path.join(evalDirectory, 'eval_metadata.json'), 'utf8'));
    for (const configuration of ['with_skill', 'old_skill']) {
      const configDirectory = path.join(evalDirectory, configuration);
      for (const run of await readdir(configDirectory, { withFileTypes: true })) {
        if (!run.isDirectory()) continue;
        const runDirectory = path.join(configDirectory, run.name);
        await save(path.join(runDirectory, 'eval_metadata.json'), metadata);
        const outputs = path.join(runDirectory, 'outputs');
        for (const phase of ['before', 'after', 'candidate-browser']) {
          const phaseDirectory = path.join(outputs, phase);
          for (const capture of await readdir(phaseDirectory).catch(() => [])) {
            if (capture.endsWith('.png')) await cp(path.join(phaseDirectory, capture), path.join(outputs, `${phase}-${capture}`));
          }
        }
        for (const source of ['index.html', 'app.css', 'app.js']) {
          const sourceFile = path.join(outputs, 'src', source);
          try { await cp(sourceFile, path.join(outputs, `source-${source}.txt`)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        }
      }
    }
  }
}

async function prepareCase(testCase) {
  const root = await materializeProjectFixture(testCase.fixture, ROOT);
  const htmlPath = path.join(root, 'src/index.html');
  let html = await readFile(htmlPath, 'utf8');
  if (isInterfaceCase(testCase.name)) {
    const inventoryPath = path.join(root, 'fixture.json');
    const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
    Object.assign(inventory, { locales: ['en-US'], directions: ['ltr'], widths: [320, 599, 600, 839, 840, 1280], input: ['keyboard', 'pointer'], primaryTask: 'Choose Email alerts and Save preferences; read confirmation', unavailableChecks: ['localized content', 'RTL translation', 'assistive-technology speech', 'browser zoom'], textStress: '200 percent computed font sizes', recovery: 'Activity retry is not implemented; report the limitation' });
    await save(inventoryPath, inventory);
  }
  if (testCase.name === 'no-edit-audit') html = html.replace('</main>', '<button id="unnamed-action" type="button"><span class="material-symbols" aria-hidden="true">delete</span></button><nav aria-label="Save commands"><button type="button">Save account</button></nav></main>');
  if (testCase.name === 'navigation-media') {
    html = html.replace('<main id="app">', '<main id="app"><img id="account-hero" src="/hero.svg" loading="lazy" alt="Account activity overview">');
    await writeFile(path.join(root, 'hero.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600"><rect width="1200" height="600" fill="#006a79"/><text x="70" y="300" fill="white" font-size="64">Account activity overview</text></svg>');
    // Remove unrelated baseline header overflow before introducing the two task defects.
    await writeFile(path.join(root, 'src/app.css'), `${await readFile(path.join(root, 'src/app.css'), 'utf8')}\nheader { flex-wrap: wrap; }\nnav.navigation-bar { display: flex; }\n#account-hero { max-width: 100%; height: auto; }\n`);
  }
  await writeFile(htmlPath, html);
  return root;
}

async function browserEvidence(root, outputDirectory, name) {
  if (isMaterialCase(name)) return captureMaterialQuality(root, outputDirectory, name);
  if (isInterfaceCase(name)) return captureInterfaceQuality(root, outputDirectory);
  await mkdir(outputDirectory, { recursive: true });
  const server = await startFixtureServer(root);
  let browser;
  const captures = [];
  const errors = [];
  try {
    browser = await chromium.launch({ headless: true });
    const { page } = await createRestrictedFixturePage(browser, server.origin, { colorScheme: 'light', reducedMotion: 'reduce' });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.__perf = { lcp: null, cls: 0 };
      new PerformanceObserver((list) => { window.__perf.lcp = list.getEntries().at(-1)?.startTime ?? null; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__perf.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    for (const width of name === 'navigation-media' ? [375, 839, 840, 1024] : [375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${server.origin}/dashboard`, { waitUntil: 'networkidle' });
      await page.screenshot({ path: path.join(outputDirectory, `${width}.png`), fullPage: true });
      captures.push(await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth,
        navigation: [...document.querySelectorAll('nav.navigation-bar,nav.navigation-rail')].filter((node) => node.checkVisibility()).map((node) => ({ kind: node.classList.contains('navigation-rail') ? 'rail' : 'bar', destinations: [...node.querySelectorAll('a')].map((a) => a.getAttribute('href')) })),
        metrics: { ...window.__perf, resources: performance.getEntriesByType('resource').map((entry) => ({ name: new URL(entry.name).pathname, transferSize: entry.transferSize, duration: entry.duration })) } })));
    }
    let lifecycle = null;
    let formBehavior = null;
    if (name === 'form-action' || name === 'navigation-media') {
      if (name === 'form-action') await page.getByRole('button', { name: 'Preview preferences', exact: true }).click({ timeout: 3000 });
      const beforeSave = await page.locator('#save-result').textContent();
      await page.getByRole('button', { name: 'Save preferences', exact: true }).click({ timeout: 3000 });
      formBehavior = { previewDoesNotSubmit: beforeSave === '', saved: (await page.locator('#save-result').textContent()) === 'Preferences saved.' };
    }
    if (name === 'tooltip-remount') {
      lifecycle = await page.evaluate(async () => {
        const original = document.querySelector('#account-help');
        const instance = window.Expressive.Tooltip.getInstance(original);
        let destroyedBeforeRemoval = false;
        if (instance) { const destroy = instance.destroy.bind(instance); instance.destroy = () => { destroyedBeforeRemoval = original.isConnected; return destroy(); }; }
        document.querySelector('#remount-help').click();
        const replacement = document.querySelector('#account-help');
        const next = window.Expressive.Tooltip.getInstance(replacement);
        const remounted = Boolean(next && next !== instance && replacement !== original);
        dispatchEvent(new Event('pagehide'));
        return { initialized: Boolean(instance), destroyedBeforeRemoval, remounted, cleaned: !window.Expressive.Tooltip.getInstance(replacement), manualOwner: replacement.classList.contains('no-autoinit') };
      });
    }
    return { captures, errors, lifecycle, formBehavior, collectedAt: new Date().toISOString() };
  } finally { await browser?.close(); await server.close(); }
}

export async function grade(testCase, root, before, envelope, browser, baselineCapture = null) {
  const after = await readCompletionFiles(root);
  const html = after['src/index.html'] ?? '';
  const dom = new JSDOM(html);
  const findings = [...gradeProjectChanges(testCase.name, envelope.executionEvidence?.filesystem), gradeAssetReferences(before, after)];
  try {
    if (testCase.name === 'form-action') {
      const button = [...dom.window.document.querySelectorAll('#preferences button')].find((node) => node.textContent.trim() === 'Preview preferences');
      findings.push(check('Preview is an enabled non-submitting button inside the form', button?.getAttribute('type') === 'button' && !button.disabled, button?.outerHTML ?? 'Missing button'));
      findings.push(check('Existing save behavior is preserved without new JavaScript', before['src/app.js'] === after['src/app.js'] && dom.window.document.querySelector('#preferences button[type="submit"]'), 'Compared app.js and submit control'));
      findings.push(check('Preview does not submit and Save still works in the browser', browser?.formBehavior?.previewDoesNotSubmit && browser?.formBehavior?.saved, JSON.stringify(browser?.formBehavior ?? 'Browser unavailable')));
      findings.push(check('Preview has no inline event handler', button && ![...button.attributes].some((attribute) => /^on/i.test(attribute.name)), button?.outerHTML ?? 'Missing button'));
    } else if (testCase.name === 'brand-token') {
      findings.push(check('Brand uses the requested seed token', /--md-source\s*:\s*#6750a4\b/i.test(after['src/app.css']), after['src/app.css']));
      findings.push(check('Token work preserves HTML and JavaScript', before['src/index.html'] === html && before['src/app.js'] === after['src/app.js'], 'Compared source files'));
      const withoutSeed = (css) => css.replace(/--md-source\s*:\s*[^;}]+/g, '--md-source: SEED').replace(/\s+/g, '');
      findings.push(check('Token work preserves other styles', withoutSeed(before['src/app.css']) === withoutSeed(after['src/app.css']), 'Compared CSS apart from seed declaration and whitespace'));
    } else if (testCase.name === 'tooltip-remount') {
      for (const key of ['initialized', 'destroyedBeforeRemoval', 'remounted', 'cleaned', 'manualOwner']) findings.push(check(`Tooltip lifecycle: ${key}`, browser?.lifecycle?.[key], JSON.stringify(browser?.lifecycle ?? 'Browser unavailable')));
    } else if (testCase.name === 'no-edit-audit') {
      findings.push(...gradeAuditResponse(envelope.candidateResponse, before['src/index.html']));
    } else if (testCase.name === 'navigation-media') {
      for (const capture of browser?.captures ?? []) findings.push(check(`One appropriate navigation and no overflow at ${capture.width}px`, capture.navigation.length === 1 && !capture.overflow && capture.navigation[0].kind === (capture.width < 840 ? 'bar' : 'rail') && ['/home', '/search', '/profile'].every((url) => capture.navigation[0].destinations.includes(url)), JSON.stringify(capture)));
      findings.push(check('Responsive browser evidence collected at four widths', browser?.captures.length === 4, `${browser?.captures.length ?? 0} captures`));
      const img = dom.window.document.querySelector('#account-hero');
      findings.push(check('Hero reserves its ratio and is not lazy-loaded', img?.getAttribute('width') === '1200' && img?.getAttribute('height') === '600' && img?.getAttribute('loading') !== 'lazy', img?.outerHTML ?? 'Missing hero'));
      const old = new JSDOM(before['src/index.html']);
      try { for (const selector of ['h1', '#account-title', '#account-summary', '#preferences']) findings.push(check(`Refine preserves ${selector}`, old.window.document.querySelector(selector)?.textContent === dom.window.document.querySelector(selector)?.textContent, 'Compared product content')); }
      finally { old.window.close(); }
      findings.push(check('Refine preserves profile destination and save behavior', dom.window.document.querySelector('main a[href="/profile"]') && browser?.formBehavior?.saved, JSON.stringify(browser?.formBehavior)));
      findings.push(check('Refine preserves the brand seed', /--md-source\s*:\s*#006a79\b/i.test(after['src/app.css']), after['src/app.css']));
    } else if (isMaterialCase(testCase.name)) {
      findings.push(...gradeMaterialQuality(browser, { name: testCase.name, before: baselineCapture }));
      if (!testCase.readOnly) findings.push(check('Material repair implements CSS changes', before['src/app.css'] !== after['src/app.css'], 'Compared source CSS; design quality remains separate'));
    } else if (isInterfaceCase(testCase.name)) {
      findings.push(...gradeInterfaceQuality(browser, { reviewOnly: testCase.name === 'interface-review' }));
      const old = new JSDOM(before['src/index.html']);
      try {
        for (const selector of ['h1', '#account-title', '#account-summary', '#preferences-title', '#state-title']) findings.push(check(`Whole-interface work preserves ${selector}`, Boolean(old.window.document.querySelector(selector)) && old.window.document.querySelector(selector)?.textContent === dom.window.document.querySelector(selector)?.textContent, 'Compared product content'));
        const links = [...dom.window.document.querySelectorAll('a[href]')];
        findings.push(check('Whole-interface work preserves link destinations and names', [...old.window.document.querySelectorAll('a[href]')].every((original) => links.some((node) => node.getAttribute('href') === original.getAttribute('href') && accessibleName(node) === accessibleName(original))), 'Compared every original named destination; repeated peer navigation may share a destination'));
        for (const selector of ['#account-help', '#remount-help', '#preview-state']) findings.push(check(`Whole-interface work preserves ${selector}`, preservedControlLabel(old.window.document.querySelector(selector), dom.window.document.querySelector(selector)), 'Compared control labels and preview options, allowing documented tooltip descriptions; rendered reachability is checked separately'));
      } finally { old.window.close(); }
      findings.push(check('Whole-interface work preserves application JavaScript', before['src/app.js'] === after['src/app.js'], 'Compared runtime source'));
      if (testCase.name === 'interface-refine') findings.push(check('Refinement implements source changes', before['src/index.html'] !== html || before['src/app.css'] !== after['src/app.css'], 'Compared HTML and CSS; visual quality is reviewed separately'));
    } else {
      findings.push(check('Pinned version is preserved', before['package.json'] === after['package.json'], after['package.json']));
      findings.push(check('Setup repair changes only standard viewport metadata', onlyViewportRepair(before['src/index.html'], html), 'Compared parsed documents apart from standard viewport metadata and head whitespace'));
      const contractPath = '.agents/skills/expressivecss/references/contract.json';
      const contract = await readBoundedRegularFile(path.join(root, contractPath), EVALUATOR_LIMITS.stringBytes, 'bundled contract', root);
      findings.push(...gradeVersionResponse(envelope.candidateResponse, { ...before, [contractPath]: contract }));
    }
    if (browser && testCase.name !== 'interface-review') findings.push(check('No page JavaScript errors', !browser.errors.length, JSON.stringify(browser.errors)));
    findings.push(check('Codex execution completed', !envelope.runMetadata.infrastructureError, envelope.runMetadata.infrastructureError ?? 'Completed turn with usage and final response'));
    return findings;
  } finally { dom.window.close(); }
}

export async function runBenchmark({ baseline, candidate = path.join(ROOT, 'skills/expressivecss'), output, repetitions = 3, caseName = null, resume = false }) {
  if (!baseline || !output) throw new Error('--baseline and --output are required');
  if (!Number.isSafeInteger(repetitions) || repetitions < 1 || repetitions > 3) throw new Error('repetitions must be 1–3');
  const versions = { with_skill: path.resolve(candidate), old_skill: path.resolve(baseline) };
  const hashes = Object.fromEntries(await Promise.all(Object.entries(versions).map(async ([name, directory]) => [name, await hashProject(directory)])));
  const selectedNames = caseName ? caseName.split(',') : null;
  if (selectedNames && (new Set(selectedNames).size !== selectedNames.length || selectedNames.some((name) => !DEFINITIONS.cases.some((item) => item.name === name)))) throw new Error('Unknown case or duplicate selection');
  const definitions = selectedNames ? DEFINITIONS.cases.filter((item) => selectedNames.includes(item.name)) : DEFINITIONS.cases;
  const collect = async () => collectEvaluationProvenance({ protocol: 'implementation-benchmark-v1',
    plan: { cases: definitions, repetitions, skillHashes: Object.fromEntries(await Promise.all(Object.entries(versions).map(async ([name, directory]) => [name, await hashProject(directory)]))), timeoutMs: 600000 },
    modelSettings: await configuredDefaults() });
  const provenance = await collect();
  if (Object.entries(hashes).some(([name, hash]) => provenance.plan.skillHashes[name] !== hash)) throw new Error('Skill inputs changed while preparing the benchmark');
  const expectedRows = definitions.flatMap((testCase) => Object.keys(versions).flatMap((configuration) => Array.from({ length: repetitions }, (_, index) => ({
    eval_name: testCase.name, eval_id: DEFINITIONS.cases.indexOf(testCase) + 1, configuration, run_number: index + 1, skillHash: hashes[configuration], prompt: testCase.request,
  }))));
  // Validate every retained row and metadata file before creating or replacing anything.
  const previous = resume ? await validateRetainedResults({ output, provenance, expectedRows }) : [];
  if (!resume) {
    try { if ((await readdir(output)).length) throw new Error('Output directory is not empty; use a new directory or validated resume'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await save(path.join(output, 'provenance.json'), provenance);
    for (const testCase of definitions) await save(path.join(output, `eval-${testCase.name}`, 'eval_metadata.json'), {
      eval_id: DEFINITIONS.cases.indexOf(testCase) + 1, eval_name: testCase.name, prompt: testCase.request, assertions: [], provenance,
    });
    await save(path.join(output, 'results.json'), []);
  }
  const results = [...previous];
  for (let repetition = 1; repetition <= repetitions; repetition++) {
    for (const testCase of definitions) {
      const caseIndex = DEFINITIONS.cases.indexOf(testCase);
      const configurations = (repetition + caseIndex) % 2 ? ['with_skill', 'old_skill'] : ['old_skill', 'with_skill'];
      assertSameProvenance(provenance, await collect());
      const pair = await Promise.all(configurations.map(async (configuration) => {
        const runDirectory = path.join(output, `eval-${testCase.name}`, configuration, `run-${repetition}`);
        const outputDirectory = path.join(runDirectory, 'outputs');
        const retained = previous.find((row) => row.eval_name === testCase.name && row.configuration === configuration && row.run_number === repetition);
        if (retained) {
          console.log(`${testCase.name} ${configuration} ${repetition}: retained completed result`);
          return retained;
        }
        await mkdir(outputDirectory, { recursive: true });
        let root;
        let record;
        let browserSession;
        let initialCapability;
        try {
          root = await prepareCase(testCase);
          const skillRoot = path.join(root, '.agents/skills/expressivecss');
          await cp(versions[configuration], skillRoot, { recursive: true });
          const before = await readCompletionFiles(root);
          browserSession = testCase.name === 'version-mismatch'
            ? { capability: { status: 'unavailable', reason: 'Only older package metadata is available; no target-version browser contract can be verified.' }, records: [], close: async () => {} }
            : await startEvaluationBrowser({ projectRoot: root, artifactDirectory: path.join(outputDirectory, 'candidate-browser') });
          initialCapability = structuredClone(browserSession.capability);
          const baselineCapture = testCase.name === 'navigation-media' || isInterfaceCase(testCase.name) || isMaterialCase(testCase.name) ? await browserEvidence(root, path.join(outputDirectory, 'before'), testCase.name) : null;
          const envelope = await runCodex({ task: testCase, projectRoot: root, skillRoot, rootSkill: await readFile(path.join(skillRoot, 'SKILL.md'), 'utf8'), artifactDirectory: outputDirectory, readOnly: testCase.readOnly,
            responseInstructions: benchmarkResponseInstructions(testCase.name) }, { browserSession });
          let browser = null;
          let browserError = null;
          if (testCase.name !== 'version-mismatch') try { browser = await browserEvidence(root, path.join(outputDirectory, 'after'), testCase.name); } catch (error) { browserError = error.message; }
          const expectations = await grade(testCase, root, before, envelope, browser, baselineCapture);
          if (isInterfaceCase(testCase.name)) {
            expectations.push(gradeMatchedInterfaceScenes(baselineCapture, browser));
            expectations.push(gradeInterfaceReviewReferences(envelope.candidateResponse, envelope.executionEvidence?.browser?.records));
            await save(path.join(outputDirectory, 'interface-review.json'), { status: 'pending-independent-review', criteria: INTERFACE_REVIEW_CRITERIA, instructions: 'Use the existing Design review matrix. Review whole-page hierarchy, typography, containment, identity, adaptive composition, state clarity and focus visibility against screenshots and source. Record individual statuses, impact and concrete evidence; no aggregate design score. Candidate judgments remain untrusted. Automated pass_rate describes named checks only.', candidateReview: redactValue(envelope.candidateResponse.interfaceReview ?? null), before: retainedInterfaceEvidence(baselineCapture), after: retainedInterfaceEvidence(browser) });
          }
          if (isMaterialCase(testCase.name)) {
            expectations.push(gradeMaterialReviewReferences(testCase.name, envelope.candidateResponse, envelope.executionEvidence?.browser?.records));
            await save(path.join(outputDirectory, 'material-review.json'), { status: 'pending-human-review', criteria: MATERIAL_REVIEW_CRITERIA[testCase.name], instructions: 'Judge component fit, expressive hierarchy and containment, supported typography and shape choices, or motion rationale for this task against retained source and captures. Record evidence, impact, alternatives and unresolved limitations. Candidate judgments are untrusted; automated pass_rate covers contracts, behavior and report coverage only, never design quality.', candidateReview: redactValue(envelope.candidateResponse.materialReview ?? null), before: retainedMaterialEvidence(baselineCapture), after: retainedMaterialEvidence(browser) });
          }
          const verificationFailures = validateVerificationClaims(envelope.candidateResponse, envelope.executionEvidence);
          expectations.push(check('Reported browser operations and tool errors match operator evidence', !verificationFailures.length, JSON.stringify(verificationFailures)));
          if (testCase.name !== 'version-mismatch') expectations.push(check('Candidate uses the working fixture browser',
            initialCapability.status === 'available' && browserSession.records.some((row) => row.action !== 'preflight' && row.status === 'success'), JSON.stringify(initialCapability)));
          if (browserError) expectations.push(check('Browser verification available', false, browserError));
          await save(path.join(outputDirectory, 'browser.json'), { before: isMaterialCase(testCase.name) ? retainedMaterialEvidence(baselineCapture) : isInterfaceCase(testCase.name) ? retainedInterfaceEvidence(baselineCapture) : baselineCapture, after: isMaterialCase(testCase.name) ? retainedMaterialEvidence(browser) : isInterfaceCase(testCase.name) ? retainedInterfaceEvidence(browser) : browser, error: redactValue(browserError) });
          const passed = expectations.filter((item) => item.passed).length;
          const usage = envelope.runMetadata.usage;
          const result = { pass_rate: passed / expectations.length, passed, failed: expectations.length - passed, total: expectations.length,
            time_seconds: envelope.runMetadata.wallTimeMs / 1000, tokens: Number.isFinite(usage?.input_tokens) && Number.isFinite(usage?.output_tokens) ? usage.input_tokens + usage.output_tokens : null, tool_calls: envelope.runMetadata.toolCalls, errors: envelope.runMetadata.infrastructureError ? 1 : 0 };
          await save(path.join(runDirectory, 'grading.json'), { expectations, summary: result, provenance });
          await save(path.join(runDirectory, 'timing.json'), { total_tokens: result.tokens, duration_ms: envelope.runMetadata.wallTimeMs, total_duration_seconds: result.time_seconds });
          record = { eval_id: caseIndex + 1, eval_name: testCase.name, configuration, run_number: repetition, skillHash: hashes[configuration], provenance, result, expectations, runMetadata: redactValue(envelope.runMetadata) };
          console.log(`${testCase.name} ${configuration} ${repetition}: ${passed}/${expectations.length}, ${result.time_seconds.toFixed(1)}s`);
          return record;
        } catch (error) {
          const expectations = [check('Benchmark infrastructure completed', false, redactValue(error.message))];
          const result = { pass_rate: 0, passed: 0, failed: 1, total: 1, time_seconds: null, tokens: null, tool_calls: null, errors: 1 };
          await save(path.join(runDirectory, 'grading.json'), { expectations, summary: result, provenance });
          await save(path.join(outputDirectory, 'infrastructure-error.json'), { error: redactValue(error.message) });
          console.log(`${testCase.name} ${configuration} ${repetition}: infrastructure failure: ${redactValue(error.message)}`);
          record = { eval_id: caseIndex + 1, eval_name: testCase.name, configuration, run_number: repetition, skillHash: hashes[configuration], provenance, result, expectations };
          return record;
        } finally {
          if (browserSession) {
            try { await save(path.join(outputDirectory, 'candidate-browser.json'), { initialCapability: redactValue(initialCapability), finalCapability: redactValue(browserSession.capability), records: retainedBrowserEvidence({ records: browserSession.records }).records }); }
            catch (error) { if (record) record.browserRetentionError = redactValue(error.message); }
            try { await browserSession.close(); }
            catch (error) { if (record) record.browserCleanupError = redactValue(error.message); }
          }
          if (root) {
            try {
              const errors = await retainSourceArtifacts(root, outputDirectory);
              if (errors.length) {
                if (record) record.retentionErrors = errors;
                try { await save(path.join(outputDirectory, 'source-retention-errors.json'), errors); }
                catch (error) { errors.push({ error: redactValue(error.message) }); }
              }
            } finally { await rm(root, { recursive: true, force: true }); }
          }
        }
      }));
      assertSameProvenance(provenance, await collect());
      results.push(...pair.filter((row) => !previous.includes(row)));
      await save(path.join(output, 'results.json'), results);
    }
  }
  const run_summary = {};
  for (const configuration of ['with_skill', 'old_skill']) run_summary[configuration] = Object.fromEntries(['pass_rate', 'time_seconds', 'tokens'].map((metric) => [metric, statistics(results.filter((row) => row.configuration === configuration).map((row) => row.result[metric]))]));
  run_summary.delta = Object.fromEntries(['pass_rate', 'time_seconds', 'tokens'].map((metric) => [metric, Number.isFinite(run_summary.with_skill[metric].mean) && Number.isFinite(run_summary.old_skill[metric].mean) ? run_summary.with_skill[metric].mean - run_summary.old_skill[metric].mean : null]));
  const benchmark = { metadata: { skill_name: 'expressivecss', timestamp: new Date().toISOString(), executor_model: 'configured Codex default', runs_per_configuration: repetitions, evals_run: definitions.map((item) => item.name), baselineHash: hashes.old_skill, candidateHash: hashes.with_skill, provenance }, runs: results.sort((a, b) => a.configuration === b.configuration ? 0 : a.configuration === 'with_skill' ? -1 : 1), run_summary,
    per_case: Object.fromEntries(definitions.map((item) => [item.name, Object.fromEntries(['with_skill', 'old_skill'].map((config) => [config, Object.fromEntries(['pass_rate', 'time_seconds', 'tokens'].map((metric) => [metric, statistics(results.filter((row) => row.eval_name === item.name && row.configuration === config).map((row) => row.result[metric]))]))]))])),
    notes: ['Local browser measurements are laboratory evidence, not field Core Web Vitals.', 'Human visual review remains required.', 'Guide read telemetry counts complete guide contents observed in successful tool output; partial reads are unavailable.'] };
  await save(path.join(output, 'benchmark.json'), benchmark);
  await prepareReviewOutputs(output);
  return benchmark;
}

export async function runTriggerEvaluations({ baseline, candidate = path.join(ROOT, 'skills/expressivecss'), output }) {
  if (!baseline || !output) throw new Error('--baseline and --output are required');
  const versions = { with_skill: path.resolve(candidate), old_skill: path.resolve(baseline) };
  const results = [];
  for (const [index, test] of DEFINITIONS.triggers.entries()) {
    const order = index % 2 ? ['old_skill', 'with_skill'] : ['with_skill', 'old_skill'];
    const pair = await Promise.all(order.map(async (configuration) => {
      const root = await materializeProjectFixture('consumer-empty', ROOT);
      const artifactDirectory = path.join(output, `trigger-${index + 1}`, configuration);
      try {
        const skillRoot = path.join(root, '.agents/skills/expressivecss');
        await cp(versions[configuration], skillRoot, { recursive: true });
        const request = `This is a skill-discovery probe, not an implementation request. For the following request, decide whether the ExpressiveCSS skill is applicable using the available skill descriptions. If applicable, read its root SKILL.md. Otherwise do not read it. Stop without editing files or doing the underlying task. Return JSON with should_use_expressivecss (boolean) and reason.\n\nRequest: ${test.query}`;
        const envelope = await runCodex({ task: { id: `trigger-${index + 1}`, request }, projectRoot: root, skillRoot, discovery: true, readOnly: true, artifactDirectory });
        const actual = envelope.candidateResponse.should_use_expressivecss;
        const rootRead = envelope.runMetadata.observedGuideReads.includes('skills/expressivecss/SKILL.md');
        const passed = !envelope.runMetadata.infrastructureError && actual === test.should_trigger && rootRead === test.should_trigger;
        console.log(`trigger-${index + 1} ${configuration}: ${passed ? 'pass' : 'fail'}`);
        return { query: test.query, should_trigger: test.should_trigger, actual: actual ?? null, rootRead, configuration, passed, runMetadata: redactValue(envelope.runMetadata) };
      } catch (error) { return { query: test.query, configuration, passed: false, infrastructureError: redactValue(error.message) }; }
      finally { await rm(root, { recursive: true, force: true }); }
    }));
    results.push(...pair);
    await save(path.join(output, 'trigger-results.json'), { probeType: 'constrained discovery; not natural-task invocation rates', results });
  }
  return results;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const args = Object.fromEntries(process.argv.slice(2).map((arg) => { const index = arg.indexOf('='); if (index < 0) throw new Error('Use --option=value'); return [arg.slice(2, index), arg.slice(index + 1)]; }));
  if (args.triggers === 'true') await runTriggerEvaluations({ baseline: args.baseline, candidate: args.candidate, output: args.output });
  else await runBenchmark({ baseline: args.baseline, candidate: args.candidate, output: args.output, repetitions: args.repetitions ? Number(args.repetitions) : 3, caseName: args.case, resume: args.resume === 'true' });
}
