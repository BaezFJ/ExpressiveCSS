#!/usr/bin/env node
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { JSDOM } from 'jsdom';
import { EVALUATOR_LIMITS, materializeProjectFixture, readCompletionFiles, readBoundedRegularFile, redactValue } from './eval-expressivecss-skill.mjs';
import { hashProject, runCodex } from './expressivecss-codex-adapter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFINITIONS = JSON.parse(await readFile(path.join(ROOT, 'tests/fixtures/expressivecss-skill-evals/benchmark.json'), 'utf8'));
const save = async (filename, value) => { await mkdir(path.dirname(filename), { recursive: true }); await writeFile(filename, `${JSON.stringify(value, null, 2)}\n`); };
const check = (text, passed, evidence) => ({ text, passed: Boolean(passed), evidence: String(evidence) });

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
        for (const phase of ['before', 'after']) {
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
  await mkdir(outputDirectory, { recursive: true });
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  const server = createServer(async (request, response) => {
    try {
      const urlPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const relative = ['/', '/dashboard', '/home', '/search', '/profile'].includes(urlPath) ? 'src/index.html' : urlPath.replace(/^\//, '');
      const file = path.resolve(root, relative);
      const data = await readBoundedRegularFile(file, 32 * 1024 * 1024, 'browser asset', root, null);
      response.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
      response.end(data);
    } catch { response.writeHead(404); response.end('Not found'); }
  });
  let browser;
  const captures = [];
  const errors = [];
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ colorScheme: 'light', reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.__perf = { lcp: null, cls: 0 };
      new PerformanceObserver((list) => { window.__perf.lcp = list.getEntries().at(-1)?.startTime ?? null; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__perf.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    for (const width of name === 'navigation-media' ? [375, 839, 840, 1024] : [375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`http://127.0.0.1:${server.address().port}/dashboard`, { waitUntil: 'networkidle' });
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
  } finally { await browser?.close(); await new Promise((resolve) => server.close(resolve)); }
}

async function grade(testCase, root, before, envelope, browser) {
  const after = await readCompletionFiles(root);
  const html = after['src/index.html'] ?? '';
  const dom = new JSDOM(html);
  const findings = [];
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
      const response = JSON.stringify(envelope.candidateResponse);
      findings.push(check('Audit does not edit the project', envelope.executionEvidence.filesystem.before === envelope.executionEvidence.filesystem.after, 'Independent project digests'));
      findings.push(check('Audit identifies the unnamed action', /unnamed-action|icon.only|accessible name|unlabel/i.test(response), response));
      findings.push(check('Audit identifies commands in navigation', /nav|landmark/i.test(response) && /command|save account/i.test(response), response));
      findings.push(check('Audit supplies source locations and concrete fixes', /src\/index\.html|unnamed-action/.test(response) && /aria-label|accessible name/i.test(response) && /replace|div|remove.*nav/i.test(response), response));
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
    } else {
      const response = JSON.stringify(envelope.candidateResponse);
      findings.push(check('Pinned version is preserved', before['package.json'] === after['package.json'], after['package.json']));
      findings.push(check('Mismatch and unavailable matching evidence are reported', /0\.7\.0/.test(response) && /mismatch|older|bundled/i.test(response) && /block|unavailable|cannot|missing/i.test(response), response));
    }
    if (browser) findings.push(check('No page JavaScript errors', !browser.errors.length, JSON.stringify(browser.errors)));
    findings.push(check('Codex execution completed', !envelope.runMetadata.infrastructureError, envelope.runMetadata.infrastructureError ?? 'Completed turn with usage and final response'));
    return findings;
  } finally { dom.window.close(); }
}

export async function runBenchmark({ baseline, candidate = path.join(ROOT, 'skills/expressivecss'), output, repetitions = 3, caseName = null, resume = false }) {
  if (!baseline || !output) throw new Error('--baseline and --output are required');
  if (!Number.isSafeInteger(repetitions) || repetitions < 1 || repetitions > 3) throw new Error('repetitions must be 1–3');
  const versions = { with_skill: path.resolve(candidate), old_skill: path.resolve(baseline) };
  const hashes = Object.fromEntries(await Promise.all(Object.entries(versions).map(async ([name, directory]) => [name, await hashProject(directory)])));
  const previous = resume ? JSON.parse(await readBoundedRegularFile(path.join(output, 'results.json'), 16 * 1024 * 1024, 'operator comparison results')) : [];
  const definitions = caseName ? DEFINITIONS.cases.filter((item) => item.name === caseName) : DEFINITIONS.cases;
  if (!definitions.length) throw new Error('Unknown case');
  const results = [];
  for (let repetition = 1; repetition <= repetitions; repetition++) {
    for (const [caseIndex, testCase] of definitions.entries()) {
      const configurations = (repetition + caseIndex) % 2 ? ['with_skill', 'old_skill'] : ['old_skill', 'with_skill'];
      const pair = await Promise.all(configurations.map(async (configuration) => {
        const runDirectory = path.join(output, `eval-${testCase.name}`, configuration, `run-${repetition}`);
        const outputDirectory = path.join(runDirectory, 'outputs');
        const retained = previous.find((row) => row.eval_name === testCase.name && row.configuration === configuration && row.run_number === repetition);
        if (retained) {
          const metadata = JSON.parse(await readFile(path.join(output, `eval-${testCase.name}`, 'eval_metadata.json'), 'utf8'));
          if (retained.runMetadata?.skillHash !== hashes[configuration] || metadata.prompt !== testCase.request) throw new Error('Cannot resume results from different skill contents or prompts');
          console.log(`${testCase.name} ${configuration} ${repetition}: retained completed result`);
          return retained;
        }
        await mkdir(outputDirectory, { recursive: true });
        await save(path.join(output, `eval-${testCase.name}`, 'eval_metadata.json'), { eval_id: caseIndex + 1, eval_name: testCase.name, prompt: testCase.request, assertions: [] });
        let root;
        let record;
        try {
          root = await prepareCase(testCase);
          const skillRoot = path.join(root, '.agents/skills/expressivecss');
          await cp(versions[configuration], skillRoot, { recursive: true });
          const before = await readCompletionFiles(root);
          const baselineCapture = testCase.name === 'navigation-media' ? await browserEvidence(root, path.join(outputDirectory, 'before'), testCase.name) : null;
          const envelope = await runCodex({ task: testCase, projectRoot: root, skillRoot, rootSkill: await readFile(path.join(skillRoot, 'SKILL.md'), 'utf8'), artifactDirectory: outputDirectory, readOnly: testCase.readOnly });
          let browser = null;
          let browserError = null;
          if (testCase.name !== 'version-mismatch') try { browser = await browserEvidence(root, path.join(outputDirectory, 'after'), testCase.name); } catch (error) { browserError = error.message; }
          const expectations = await grade(testCase, root, before, envelope, browser);
          if (browserError) expectations.push(check('Browser verification available', false, browserError));
          await save(path.join(outputDirectory, 'browser.json'), { before: baselineCapture, after: browser, error: browserError });
          const passed = expectations.filter((item) => item.passed).length;
          const usage = envelope.runMetadata.usage;
          const result = { pass_rate: passed / expectations.length, passed, failed: expectations.length - passed, total: expectations.length,
            time_seconds: envelope.runMetadata.wallTimeMs / 1000, tokens: Number.isFinite(usage?.input_tokens) && Number.isFinite(usage?.output_tokens) ? usage.input_tokens + usage.output_tokens : null, tool_calls: envelope.runMetadata.toolCalls, errors: envelope.runMetadata.infrastructureError ? 1 : 0 };
          await save(path.join(runDirectory, 'grading.json'), { expectations, summary: result });
          await save(path.join(runDirectory, 'timing.json'), { total_tokens: result.tokens, duration_ms: envelope.runMetadata.wallTimeMs, total_duration_seconds: result.time_seconds });
          record = { eval_id: caseIndex + 1, eval_name: testCase.name, configuration, run_number: repetition, result, expectations, runMetadata: envelope.runMetadata };
          console.log(`${testCase.name} ${configuration} ${repetition}: ${passed}/${expectations.length}, ${result.time_seconds.toFixed(1)}s`);
          return record;
        } catch (error) {
          const expectations = [check('Benchmark infrastructure completed', false, redactValue(error.message))];
          const result = { pass_rate: 0, passed: 0, failed: 1, total: 1, time_seconds: null, tokens: null, tool_calls: null, errors: 1 };
          await save(path.join(runDirectory, 'grading.json'), { expectations, summary: result });
          await save(path.join(outputDirectory, 'infrastructure-error.json'), { error: redactValue(error.message) });
          console.log(`${testCase.name} ${configuration} ${repetition}: infrastructure failure: ${redactValue(error.message)}`);
          record = { eval_id: caseIndex + 1, eval_name: testCase.name, configuration, run_number: repetition, result, expectations };
          return record;
        } finally {
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
      results.push(...pair);
      await save(path.join(output, 'results.json'), results);
    }
  }
  const run_summary = {};
  for (const configuration of ['with_skill', 'old_skill']) run_summary[configuration] = Object.fromEntries(['pass_rate', 'time_seconds', 'tokens'].map((metric) => [metric, statistics(results.filter((row) => row.configuration === configuration).map((row) => row.result[metric]))]));
  run_summary.delta = Object.fromEntries(['pass_rate', 'time_seconds', 'tokens'].map((metric) => [metric, Number.isFinite(run_summary.with_skill[metric].mean) && Number.isFinite(run_summary.old_skill[metric].mean) ? run_summary.with_skill[metric].mean - run_summary.old_skill[metric].mean : null]));
  const benchmark = { metadata: { skill_name: 'expressivecss', timestamp: new Date().toISOString(), executor_model: 'configured Codex default', runs_per_configuration: repetitions, evals_run: definitions.map((item) => item.name), baselineHash: await hashProject(versions.old_skill), candidateHash: await hashProject(versions.with_skill) }, runs: results.sort((a, b) => a.configuration === b.configuration ? 0 : a.configuration === 'with_skill' ? -1 : 1), run_summary,
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
        return { query: test.query, should_trigger: test.should_trigger, actual: actual ?? null, rootRead, configuration, passed, runMetadata: envelope.runMetadata };
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
