// Generated from scripts/lib/verify-consumer.mjs. Do not edit.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { readBoundedRegularFile } from './bounded-file.mjs';
import { createBrowserSession } from './consumer-browser.mjs';

const hash = (data) => createHash('sha256').update(data).digest('hex');
const LIMITS = { cases: 12, steps: 40, fileBytes: 2 * 1024 * 1024, totalBytes: 8 * 1024 * 1024, caseMs: 30_000 };
const string = (value, max = 1024) => typeof value === 'string' && value.length > 0 && value.length <= max;
const object = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every((key) => keys.includes(key));
const relative = (value) => string(value, 4096) && !path.isAbsolute(value) && !value.split(/[\\/]/u).some((part) => part === '..' || part === '.');
const routePath = (value) => string(value) && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');
const errorText = (error) => String(error.message ?? error).replace(/https?:\/\/[^\s"'<>]+/gu, '[URL]').replace(/(?:token|password|secret|authorization)\s*[:=]\s*[^\s,]+/giu, '[REDACTED]').slice(0, 2048);

export function validateScenario(value) {
  assert.ok(object(value, ['name', 'sources', 'cases']) && string(value.name), 'Expected a named scenario');
  assert.ok(Array.isArray(value.sources) && value.sources.length > 0 && value.sources.length <= 50 && value.sources.every(relative), 'Declare 1–50 relative source files');
  assert.ok(Array.isArray(value.cases) && value.cases.length > 0 && value.cases.length <= LIMITS.cases, 'Expected 1–12 cases');
  const names = new Set();
  for (const entry of value.cases) {
    assert.ok(object(entry, ['name', 'path', 'width', 'height', 'colorScheme', 'reducedMotion', 'steps']), 'Unknown case field');
    assert.ok(string(entry.name) && !names.has(entry.name), 'Case names must be unique'); names.add(entry.name);
    assert.ok(routePath(entry.path), 'Case path must be local and absolute');
    for (const [key, min, max] of [['width', 320, 1920], ['height', 320, 1200]]) assert.ok(Number.isInteger(entry[key]) && entry[key] >= min && entry[key] <= max, `Invalid ${key}`);
    assert.ok(['light', 'dark'].includes(entry.colorScheme) && ['reduce', 'no-preference'].includes(entry.reducedMotion), 'Declare theme and motion preference');
    assert.ok(Array.isArray(entry.steps) && entry.steps.length > 0 && entry.steps.length <= LIMITS.steps, 'Expected 1–40 steps');
    let assertions = 0;
    for (const step of entry.steps) {
      const fields = { click: ['selector'], fill: ['selector', 'value'], press: ['key'], check: ['selector', 'checked'], select: ['selector', 'value'], expect: ['selector', 'property', 'value'] }[step?.action];
      assert.ok(fields && object(step, ['action', ...fields]) && fields.every((field) => Object.hasOwn(step, field)), 'Invalid step fields');
      if ('selector' in step) assert.ok(string(step.selector), 'Invalid selector');
      if (step.action === 'press') assert.ok(string(step.key, 100), 'Invalid key');
      if (['fill', 'select'].includes(step.action)) assert.ok(typeof step.value === 'string' && step.value.length <= 4096, 'Invalid input value');
      if (step.action === 'check') assert.equal(typeof step.checked, 'boolean');
      if (step.action === 'expect') {
        assertions++;
        assert.ok(['visible', 'focused', 'checked', 'text', 'value', 'count'].includes(step.property), 'Unknown assertion');
        if (['visible', 'focused', 'checked'].includes(step.property)) assert.equal(typeof step.value, 'boolean');
        else if (step.property === 'count') assert.ok(Number.isInteger(step.value) && step.value >= 0 && step.value <= 1000, 'Invalid expected count');
        else assert.ok(typeof step.value === 'string' && step.value.length <= 4096, 'Invalid expected text');
      }
    }
    assert.ok(assertions > 0, 'Every case needs a completion assertion');
  }
  return value;
}

export function validateOrigin(value) {
  const url = new URL(value);
  assert.ok(url.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(url.hostname) && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash, 'Use an HTTP loopback origin, for example http://127.0.0.1:4321');
  return url.origin;
}

async function sourceHashes(root, sources) {
  let bytes = 0;
  const result = [];
  for (const name of [...new Set(sources)]) {
    const data = await readBoundedRegularFile(path.join(root, name), Math.min(LIMITS.fileBytes, LIMITS.totalBytes - bytes), 'consumer source', root, null);
    bytes += data.length;
    result.push([name, hash(data)]);
  }
  return Object.fromEntries(result);
}

async function capture(page, directory, name) {
  const size = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
  const fullPage = size.width <= 1920 && size.height <= 12000 && size.width * size.height <= 16_000_000;
  const bytes = await page.screenshot({ fullPage, timeout: 3000 });
  assert.ok(bytes.length <= 4 * 1024 * 1024, 'Capture exceeds 4 MiB');
  await writeFile(path.join(directory, name), bytes, { flag: 'wx', mode: 0o600 });
  return { file: name, sha256: hash(bytes), fullPage, ...(fullPage ? {} : { clippedToViewport: true }) };
}

async function perform(page, step, expect) {
  const locator = step.selector ? page.locator(step.selector) : null;
  if (step.action === 'click') await locator.click();
  if (step.action === 'fill') await locator.fill(step.value);
  if (step.action === 'press') await page.keyboard.press(step.key);
  if (step.action === 'check') await locator.setChecked(step.checked);
  if (step.action === 'select') await locator.selectOption(step.value);
  if (step.action === 'expect') {
    const check = expect(locator, `Expected ${step.property}`);
    if (step.property === 'text') await check.toHaveText(step.value);
    if (step.property === 'value') await check.toHaveValue(step.value);
    if (step.property === 'count') await check.toHaveCount(step.value);
    if (step.property === 'checked') await check.toBeChecked({ checked: step.value });
    if (step.property === 'visible') await (step.value ? check : check.not).toBeVisible();
    if (step.property === 'focused') await (step.value ? check : check.not).toBeFocused();
  }
}

/** Operator-run checks, not candidate-written verification claims. Never starts an application server. */
export async function verifyConsumer({ projectRoot, scenarioFile, origin, outputDirectory, allowMutations = false }) {
  const root = await realpath(projectRoot);
  origin = validateOrigin(origin);
  const scenarioPath = path.resolve(root, scenarioFile);
  const raw = await readBoundedRegularFile(scenarioPath, 128 * 1024, 'consumer scenario', root);
  const scenario = validateScenario(JSON.parse(raw));
  const sources = await sourceHashes(root, scenario.sources);
  await mkdir(outputDirectory, { recursive: true });
  const directory = await mkdtemp(path.join(await realpath(outputDirectory), 'run-'));
  const report = { schemaVersion: 1, name: scenario.name, status: 'blocked', startedAt: new Date().toISOString(),
    provenance: { scenarioSha256: hash(raw), sourceHashes: sources, allowMutations, runnerHashes: {}, browser: null },
    cases: [], uncheckedAreas: ['Material design quality', 'screen-reader speech', 'native zoom and physical input', 'undeclared states and source files', 'field performance', 'framework version compatibility'] };
  for (const name of ['verify-consumer.mjs', 'consumer-browser.mjs', 'bounded-file.mjs']) report.provenance.runnerHashes[name] = hash(await readFile(new URL(name, import.meta.url)));
  let browser;
  try {
    const require = createRequire(path.join(root, 'package.json'));
    // Use the consumer's installed runner and browser; never download tooling implicitly.
    const { chromium, expect: baseExpect } = require('@playwright/test');
    const expect = baseExpect.configure({ timeout: 3000 });
    browser = await chromium.launch({ headless: true, timeout: 8000 });
    report.provenance.browser = { engine: 'chromium', version: browser.version(), playwright: require('@playwright/test/package.json').version };
    for (const entry of scenario.cases) {
      const result = { name: entry.name, status: 'blocked', settings: { path: entry.path.split('?')[0], width: entry.width, height: entry.height, colorScheme: entry.colorScheme, reducedMotion: entry.reducedMotion }, steps: [], captures: [] };
      report.cases.push(result);
      const started = Date.now();
      let session, timer;
      try {
        session = await createBrowserSession(browser, origin, { viewport: { width: entry.width, height: entry.height }, colorScheme: entry.colorScheme, reducedMotion: entry.reducedMotion }, { allowMutations });
        const { page } = session;
        await Promise.race([(async () => {
          const response = await page.goto(origin + entry.path, { waitUntil: 'load', timeout: 8000 });
          assert.ok(response?.ok(), `Route returned HTTP ${response?.status() ?? 'unavailable'}`);
          result.captures.push(await capture(page, directory, `${report.cases.length}-before.png`));
          result.status = 'failed';
          for (const step of entry.steps) {
            const observation = { action: step.action, ...(step.property ? { property: step.property } : {}), status: 'failed' };
            result.steps.push(observation);
            await perform(page, step, expect);
            observation.status = 'passed';
          }
          result.layout = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
          assert.ok(result.layout.scrollWidth <= result.layout.viewport, 'Horizontal overflow');
          result.captures.push(await capture(page, directory, `${report.cases.length}-after.png`));
          assert.equal(session.errors.length, 0, 'Browser console or page errors');
          assert.equal(session.blockedRequests.length, 0, 'Blocked network requests; scenario coverage is incomplete');
          result.status = 'passed';
        })(), new Promise((_, reject) => { timer = setTimeout(() => { void session.context.close().catch(() => {}); reject(new Error('Case exceeded 30 second limit')); }, LIMITS.caseMs); })]);
      } catch (error) {
        result.error = errorText(error);
        if (session && !session.page.isClosed()) {
          try { result.captures.push(await capture(session.page, directory, `${report.cases.length}-failure.png`)); } catch { result.captureUnavailable = true; }
        }
      } finally {
        clearTimeout(timer);
        result.durationMs = Date.now() - started;
        result.consoleErrors = (session?.errors ?? []).map(errorText);
        result.blockedRequestCount = session?.blockedRequests.length ?? 0;
        await session?.context.close();
        await writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
      }
    }
    const afterRaw = await readBoundedRegularFile(scenarioPath, 128 * 1024, 'consumer scenario', root);
    report.provenance.inputsUnchanged = hash(afterRaw) === report.provenance.scenarioSha256 && JSON.stringify(await sourceHashes(root, scenario.sources)) === JSON.stringify(sources);
    report.status = !report.provenance.inputsUnchanged || report.cases.some((entry) => entry.status === 'blocked') ? 'blocked' : report.cases.every((entry) => entry.status === 'passed') ? 'passed' : 'failed';
  } catch (error) { report.status = 'blocked'; report.error = errorText(error); }
  finally {
    await browser?.close();
    report.finishedAt = new Date().toISOString();
    await writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
  }
  return { directory, report };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { 'project-root': { type: 'string', default: '.' }, scenario: { type: 'string' }, origin: { type: 'string' }, 'allow-mutations': { type: 'boolean', default: false }, output: { type: 'string', default: '.cache/expressivecss-consumer' } } });
    assert.ok(values.scenario && values.origin, 'Required: --scenario <file.json> --origin http://127.0.0.1:<port>');
    const result = await verifyConsumer({ projectRoot: values['project-root'], scenarioFile: values.scenario, origin: values.origin, allowMutations: values['allow-mutations'], outputDirectory: path.resolve(values['project-root'], values.output) });
    console.log(JSON.stringify({ status: result.report.status, report: path.join(result.directory, 'report.json') }));
    process.exitCode = result.report.status === 'passed' ? 0 : result.report.status === 'failed' ? 1 : 2;
  } catch (error) { console.error(errorText(error)); process.exitCode = 2; }
}
