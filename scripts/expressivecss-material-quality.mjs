import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { redactValue } from './eval-expressivecss-skill.mjs';
import { captureFixtureScreenshot, createRestrictedFixturePage, startFixtureServer } from './expressivecss-eval-browser.mjs';

const NAMES = ['material-component-review', 'material-expression-repair', 'material-motion-repair'];
export const isMaterialCase = name => NAMES.includes(name);
const LIMITS = Object.freeze({ timeout: 12000, nodes: 2000, text: 64000, height: 12000, screenshot: 4 * 1024 * 1024 });
export const MATERIAL_SCENARIOS = Object.freeze([375, 1280].flatMap(width => ['restrained', 'expressive'].flatMap(treatment => ['no-preference', 'reduce'].map(reducedMotion => Object.freeze({ id: `${treatment}-${width}-${reducedMotion}`, width, height: 900, treatment, reducedMotion, colorScheme: 'light', deviceScaleFactor: 1, locale: 'en-US', route: '/dashboard' })))));
const SELECTORS = ['#page-title', '#preview-button', '#editor-form button[type="submit"]', '#subject', '#message', '#bold', '#preview-subject'];
const failText = error => String(error?.message ?? error).slice(0, 4096);
const check = (text, passed, evidence) => ({ text, passed: passed === true, evidence: JSON.stringify(redactValue(evidence ?? null)) });

export function retainedMaterialEvidence(evidence) {
  const value = redactValue(evidence);
  if (Array.isArray(evidence?.scenes)) evidence.scenes.forEach((scene, index) => {
    for (const [phase, capture] of Object.entries(scene?.captures ?? {})) if (typeof capture?.path === 'string') value.scenes[index].captures[phase].path = path.basename(capture.path);
  });
  return value;
}

async function settle(page) {
  await page.waitForFunction(() => {
    const animations = document.getAnimations();
    if (animations.length > 200) throw new Error('Material fixture exceeds animation limit');
    return animations.every(animation => ['finished', 'idle'].includes(animation.playState));
  });
}

async function inspect(page) {
  const data = await page.evaluate(selectors => {
    if (document.querySelectorAll('*').length > 2000) throw new Error('Material fixture exceeds DOM node limit');
    const styles = {};
    for (const selector of selectors) {
      const nodes = document.querySelectorAll(selector);
      if (nodes.length !== 1) throw new Error(`Expected one ${selector}`);
      const node = nodes[0], style = getComputedStyle(node), box = node.getBoundingClientRect();
      styles[selector] = { visible: node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }), width: box.width, height: box.height,
        fontSize: style.fontSize, lineHeight: style.lineHeight, fontWeight: style.fontWeight, fontFamily: style.fontFamily,
        color: style.color, backgroundColor: style.backgroundColor, borderRadius: style.borderRadius,
        containerHeight: style.getPropertyValue('--md-comp-filled-button-container-height').trim(), containerShape: style.getPropertyValue('--md-comp-filled-button-container-shape').trim() };
    }
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, treatment: document.body.dataset.treatment, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, styles };
  }, SELECTORS);
  data.accessibility = await page.locator('body').ariaSnapshot();
  if (Buffer.byteLength(JSON.stringify(data)) > LIMITS.text) throw new Error('Material observation exceeds byte limit');
  return data;
}

/** Browser facts and retained captures; Material interpretation remains a human review. */
export async function captureMaterialQuality(root, outputDirectory, name) {
  if (!isMaterialCase(name)) throw new Error('Unknown Material case');
  await mkdir(outputDirectory, { recursive: true });
  const evidence = { source: 'operator-browser', schemaVersion: 1, name, scenes: [], errors: [], browserVersion: null, limits: LIMITS,
    qualitativeReview: { status: 'pending', scope: 'Review component choice and alternatives, expressive hierarchy, containment, typography and shape appropriateness, motion purpose and product identity. Automated checks establish the declared contract and task outcome only; no aggregate design score.' },
    limitations: ['Light English LTR editor at two widths only.', 'No assistive-technology speech, contrast certification, or field performance measurements.'] };
  let server, browser;
  try {
    server = await startFixtureServer(root);
    browser = await chromium.launch({ headless: true, timeout: LIMITS.timeout });
    evidence.browserVersion = browser.version();
    for (const settings of MATERIAL_SCENARIOS) {
      const record = { id: settings.id, settings, status: 'error', captures: {}, startedAt: new Date().toISOString() };
      let session, timer;
      try {
        session = await createRestrictedFixturePage(browser, server.origin, { viewport: { width: settings.width, height: settings.height }, reducedMotion: settings.reducedMotion, colorScheme: settings.colorScheme, deviceScaleFactor: settings.deviceScaleFactor, locale: settings.locale });
        const page = session.page;
        page.setDefaultTimeout(3000);
        const work = async () => {
          const response = await page.goto(`${server.origin}${settings.route}?treatment=${settings.treatment}`, { waitUntil: 'load', timeout: LIMITS.timeout });
          if (!response?.ok()) throw new Error(`Fixture returned HTTP ${response?.status()}`);
          await page.evaluate(() => document.fonts.ready);
          await settle(page);
          record.initial = await inspect(page);
          record.captures.initial = await captureFixtureScreenshot(page, outputDirectory, `${settings.id}-initial`, LIMITS);
          const subject = 'Garden meeting preview', message = 'Bring seeds and a story. <strong>Plain text remains text.</strong>';
          await page.locator('#subject').fill(subject);
          await page.locator('#message').fill(message);
          await page.locator('#bold').focus();
          await page.keyboard.press('Space');
          await page.locator('#preview-button').focus();
          await page.keyboard.press('Enter');
          record.trace = await page.evaluate(() => {
            const preview = document.querySelector('#preview');
            const animations = preview.getAnimations();
            if (animations.length > 20) throw new Error('Preview exceeds animation limit');
            return { previewVisible: preview.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }), focusEntered: document.activeElement.id === 'preview-title',
              subject: document.querySelector('#preview-subject').textContent, message: document.querySelector('#preview-message').textContent,
              markupChildren: document.querySelector('#preview-message').children.length,
              boldPressed: document.querySelector('#bold').getAttribute('aria-pressed'), boldWeight: getComputedStyle(document.querySelector('#preview-message')).fontWeight,
              animations: animations.map(animation => ({ duration: animation.effect.getTiming().duration, iterations: animation.effect.getTiming().iterations,
                transforms: animation.effect.getKeyframes().filter(frame => frame.transform !== undefined).map(frame => {
                  const matrix = new DOMMatrix(frame.transform === 'none' ? undefined : frame.transform);
                  return { x: matrix.m41, y: matrix.m42, identity: matrix.isIdentity };
                }) })),
              transform: getComputedStyle(preview).transform, transformIdentity: new DOMMatrix(getComputedStyle(preview).transform === 'none' ? undefined : getComputedStyle(preview).transform).isIdentity };
          });
          await settle(page);
          record.trace.previewVisible = await page.locator('#preview').evaluate(node => node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }));
          record.preview = await inspect(page);
          record.captures.preview = await captureFixtureScreenshot(page, outputDirectory, `${settings.id}-preview`, LIMITS);
          await page.locator('#edit-button').click();
          record.trace.focusReturned = await page.locator('#message').evaluate(node => node === document.activeElement);
          record.trace.previewClosed = await page.locator('#preview').isHidden();
          await page.locator('#editor-form button[type="submit"]').click();
          record.trace.savedMessage = await page.locator('#status').textContent();
          record.trace.completed = record.trace.subject === subject && record.trace.message === message && record.trace.markupChildren === 0 && record.trace.boldPressed === 'true' && record.trace.boldWeight === '700'
            && record.trace.focusEntered && record.trace.focusReturned && record.trace.previewClosed && record.trace.savedMessage.includes(subject) && record.trace.savedMessage.includes('Nothing was sent');
          record.captures.saved = await captureFixtureScreenshot(page, outputDirectory, `${settings.id}-saved`, LIMITS);
          record.status = 'success';
        };
        await Promise.race([work(), new Promise((_, reject) => { timer = setTimeout(() => { void session.context.close().catch(() => {}); reject(new Error('Material scenario timed out')); }, LIMITS.timeout); })]);
      } catch (error) { record.error = failText(error); }
      finally {
        clearTimeout(timer);
        record.errors = [...session?.errors ?? []];
        record.blockedRequests = [...session?.blockedRequests ?? []];
        evidence.errors.push(...record.errors);
        await session?.context.close().catch(error => { record.cleanupError = failText(error); record.status = 'error'; });
        record.finishedAt = new Date().toISOString();
        evidence.scenes.push(record);
        await writeFile(path.join(outputDirectory, `${settings.id}.json`), `${JSON.stringify(retainedMaterialEvidence({ scenes: [record] }).scenes[0], null, 2)}\n`);
      }
    }
  } catch (error) { evidence.infrastructureError = failText(error); }
  finally {
    const cleanup = await Promise.allSettled([browser?.close(), server?.close()]);
    const errors = cleanup.filter(result => result.status === 'rejected').map(result => failText(result.reason));
    if (errors.length) evidence.cleanupErrors = errors;
    await writeFile(path.join(outputDirectory, 'material-quality.json'), `${JSON.stringify(retainedMaterialEvidence(evidence), null, 2)}\n`);
  }
  return evidence;
}

const finite = value => typeof value === 'number' && Number.isFinite(value);
const strings = value => Array.isArray(value) && value.every(item => typeof item === 'string');
const rendered = capture => typeof capture?.path === 'string' && /^[a-f0-9]{64}$/.test(capture.sha256 ?? '') && Number.isSafeInteger(capture.bytes) && capture.bytes > 0;
const styleValid = style => style && typeof style.visible === 'boolean' && finite(style.width) && finite(style.height) && ['fontSize', 'lineHeight', 'fontWeight', 'fontFamily', 'color', 'backgroundColor', 'borderRadius', 'containerHeight', 'containerShape'].every(key => typeof style[key] === 'string');
const observationValid = value => value && finite(value.width) && finite(value.scrollWidth) && ['restrained', 'expressive'].includes(value.treatment) && typeof value.reducedMotion === 'boolean' && typeof value.accessibility === 'string' && value.accessibility.length > 0 && SELECTORS.every(selector => styleValid(value.styles?.[selector]));
const validScene = (record, settings) => record?.status === 'success' && Object.entries(settings).every(([key, value]) => record.settings?.[key] === value)
  && ['initial', 'preview'].every(phase => observationValid(record[phase]) && record[phase].width === settings.width && record[phase].treatment === settings.treatment && record[phase].reducedMotion === (settings.reducedMotion === 'reduce'))
  && ['initial', 'preview', 'saved'].every(phase => rendered(record.captures?.[phase])) && strings(record.errors) && strings(record.blockedRequests);
const styleDifferences = (previous, next, geometry = true) => !styleValid(previous) || !styleValid(next) ? { invalidRecord: true }
  : Object.fromEntries(Object.keys(previous).filter(key => (geometry || !['width', 'height'].includes(key)) && previous[key] !== next[key]).map(key => [key, { before: previous[key], after: next[key] }]));

/** This grades requested browser contracts, never whether the interface looks good. */
export function gradeMaterialQuality(evidence, { name, before } = {}) {
  const trusted = isMaterialCase(name) && evidence?.name === name && evidence?.source === 'operator-browser' && !evidence.infrastructureError && !evidence.cleanupErrors?.length;
  const results = [check('Material operator collection completed', trusted, evidence?.infrastructureError ?? evidence?.source)];
  const scenes = Array.isArray(evidence?.scenes) ? evidence.scenes : [];
  const previousScenes = Array.isArray(before?.scenes) ? before.scenes : [];
  const previousAvailable = before?.name === name && before?.source === 'operator-browser' && !before.infrastructureError && !before.cleanupErrors?.length && previousScenes.length === MATERIAL_SCENARIOS.length && new Set(previousScenes.map(scene => scene?.id)).size === MATERIAL_SCENARIOS.length;
  results.push(check('Material scene inventory is exact', scenes.length === MATERIAL_SCENARIOS.length && new Set(scenes.map(scene => scene?.id)).size === MATERIAL_SCENARIOS.length, scenes.map(scene => scene?.id)));
  for (const settings of MATERIAL_SCENARIOS) {
    const record = scenes.find(scene => scene?.id === settings.id), available = trusted && validScene(record, settings);
    results.push(check(`Material rendered evidence: ${settings.id}`, available, record?.error ?? record?.captures));
    const baseline = previousScenes.find(scene => scene?.id === settings.id);
    const matched = available && previousAvailable && validScene(baseline, settings);
    results.push(check(`Material matched before and after evidence: ${settings.id}`, matched, baseline?.error ?? { before: baseline?.captures, after: record?.captures }));
    if (name === 'material-component-review') continue;
    results.push(check(`Material editor task completes: ${settings.id}`, available && record.trace?.completed === true && record.trace.previewVisible === true && record.trace.focusEntered === true && record.trace.focusReturned === true && record.trace.previewClosed === true, record?.trace));
    results.push(check(`Material reflow and browser errors: ${settings.id}`, available && ['initial', 'preview'].every(phase => record[phase].scrollWidth <= settings.width) && record.errors.length === 0 && record.blockedRequests.length === 0, { errors: record?.errors, blockedRequests: record?.blockedRequests }));
    if (name === 'material-expression-repair') {
      const styles = record?.initial?.styles, headline = styles?.['#page-title'], primary = styles?.['#preview-button'], secondary = styles?.['#editor-form button[type="submit"]'];
      if (settings.treatment === 'expressive') results.push(check(`Material declared expression contracts: ${settings.id}`, available && headline.fontSize === '32px' && headline.lineHeight === '40px' && headline.fontWeight === '500'
        && primary.containerHeight === '96px' && primary.height >= 96 && primary.borderRadius === '16px' && primary.containerShape === '16px' && secondary.containerHeight === '56px' && secondary.height >= 56, { headline, primary, secondary }));
      const protectedSelectors = settings.treatment === 'restrained' ? SELECTORS : ['#subject', '#message', '#bold', '#preview-subject'];
      const differences = ['initial', 'preview'].flatMap(phase => protectedSelectors.map(selector => ({ phase, selector, fields: styleDifferences(baseline?.[phase]?.styles?.[selector], record?.[phase]?.styles?.[selector], settings.treatment === 'restrained') }))).filter(row => Object.keys(row.fields).length);
      results.push(check(`Material unrelated roles remain stable: ${settings.id}`, matched && differences.length === 0, differences));
    }
    if (name === 'material-motion-repair') {
      const differences = SELECTORS.map(selector => ({ selector, fields: styleDifferences(baseline?.initial?.styles?.[selector], record?.initial?.styles?.[selector]) })).filter(row => Object.keys(row.fields).length);
      results.push(check(`Material motion repair preserves unrelated styles: ${settings.id}`, matched && differences.length === 0, differences));
      const animations = record?.trace?.animations;
      const valid = Array.isArray(animations) && animations.every(animation => finite(animation.duration) && finite(animation.iterations) && Array.isArray(animation.transforms) && animation.transforms.every(frame => finite(frame.x) && finite(frame.y) && typeof frame.identity === 'boolean'));
      const transforms = valid ? animations.filter(animation => animation.duration > 0 && animation.transforms.some(frame => !frame.identity)) : [];
      const expected = settings.reducedMotion === 'reduce' ? valid && transforms.length === 0 && record?.trace?.transformIdentity === true
        : valid && transforms.length === 1 && transforms[0].duration === 600 && transforms[0].iterations === 1 && transforms[0].transforms.some(frame => frame.y === 24 && frame.x === 0) && transforms[0].transforms.some(frame => frame.identity);
      results.push(check(`Material motion preference contract: ${settings.id}`, available && expected, animations));
    }
  }
  return results;
}
