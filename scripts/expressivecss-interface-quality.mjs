import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { redactValue } from './eval-expressivecss-skill.mjs';
import { createRestrictedFixturePage, startFixtureServer } from './expressivecss-eval-browser.mjs';

const LIMITS = Object.freeze({ timeout: 8000, nodes: 2000, text: 32000, height: 12000, screenshot: 4 * 1024 * 1024, tabs: 60 });
const base = { route: '/dashboard', state: 'default', width: 375, height: 900, colorScheme: 'light', reducedMotion: 'reduce', deviceScaleFactor: 1, locale: 'en-US', textScale: 1 };
export const INTERFACE_SCENARIOS = Object.freeze([
  ...[320, 599, 600, 839, 840, 1280].map((width) => ({ ...base, id: `default-${width}`, width })),
  { ...base, id: 'dark-375', colorScheme: 'dark' },
  ...['long-content', 'loading', 'empty', 'error', 'offline'].map((state) => ({ ...base, id: `${state}-375`, state })),
  { ...base, id: 'text200-375', textScale: 2 },
].map(Object.freeze));
const REGIONS = ['header', 'main#app', '#account-title', '#account-summary', '#preferences-title', 'form#preferences', '#state-title', '#activity'];
const PRIMARY = '#preferences button[type="submit"]';
const AUXILIARY = ['account-help', 'remount-help', 'preview-state'];
const CHECKBOX = '#preferences input[type="checkbox"][name="alerts"]';
const errorText = (error) => String(error?.message ?? error).slice(0, 4096);
const digest = (data) => createHash('sha256').update(data).digest('hex');

function retainedRecord(record) {
  const retained = redactValue(record);
  if (typeof record?.screenshot?.path === 'string') retained.screenshot.path = path.basename(record.screenshot.path);
  if (typeof record?.trace?.focusedScreenshot?.path === 'string') retained.trace.focusedScreenshot.path = path.basename(record.trace.focusedScreenshot.path);
  return retained;
}

export function retainedInterfaceEvidence(evidence) {
  if (!evidence || typeof evidence !== 'object') return redactValue(evidence);
  return { ...redactValue(evidence), scenes: Array.isArray(evidence.scenes) ? evidence.scenes.map(retainedRecord) : [], interactions: Array.isArray(evidence.interactions) ? evidence.interactions.map(retainedRecord) : [] };
}

async function tabTo(page, selector, focus) {
  for (let index = 0; index < LIMITS.tabs; index++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate((selector) => ({ target: document.activeElement.matches(selector), tag: document.activeElement.tagName.toLowerCase(), id: document.activeElement.id, text: document.activeElement.textContent.trim().slice(0, 200) }), selector);
    focus.push(focused);
    if (focused.target) return;
  }
  throw new Error(`Keyboard path did not reach ${selector} within ${LIMITS.tabs} Tab presses`);
}

async function screenshot(page, directory, id) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  if (height > LIMITS.height) throw new Error(`Capture exceeds ${LIMITS.height}px document height`);
  const buffer = await page.screenshot({ fullPage: true, timeout: 3000 });
  if (buffer.byteLength > LIMITS.screenshot) throw new Error('Capture exceeds screenshot byte limit');
  const file = path.resolve(directory, `${id}.png`);
  await writeFile(file, buffer, { flag: 'wx' });
  return { path: file, sha256: digest(buffer), bytes: buffer.byteLength };
}

async function inspect(page) {
  const observation = await page.evaluate(({ regions, primary, nodeLimit }) => {
    if (document.querySelectorAll('*').length > nodeLimit) throw new Error('Fixture exceeds DOM node limit');
    const rect = (node) => { const { x, y, width, height, top, right, bottom, left } = node.getBoundingClientRect(); return { x, y, width, height, top, right, bottom, left }; };
    const geometry = (node) => {
      const bounds = rect(node);
      const visible = node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && bounds.width > 0 && bounds.height > 0;
      let clipped = false;
      for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor), box = rect(ancestor);
        if (style.overflowX !== 'visible' && (bounds.left < box.left - 1 || bounds.right > box.right + 1)) clipped = true;
        if (style.overflowY !== 'visible' && (bounds.top < box.top - 1 || bounds.bottom > box.bottom + 1)) clipped = true;
      }
      const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
      const unobscured = Boolean(hit && (hit === node || node.contains(hit)));
      return { ...bounds, visible, clipped, unobscured, fullyInViewport: bounds.top >= 0 && bounds.bottom <= innerHeight && bounds.left >= 0 && bounds.right <= innerWidth, intersectsViewport: bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth };
    };
    const probe = document.createElement('span');
    let brandColor;
    try {
      probe.style.setProperty('color', 'var(--md-source)', 'important'); probe.style.display = 'none'; document.body.append(probe);
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d'); context.fillStyle = getComputedStyle(probe).color; context.fillRect(0, 0, 1, 1);
      brandColor = [...context.getImageData(0, 0, 1, 1).data];
    } finally { probe.remove(); }
    return {
      brandColor,
      viewport: { width: innerWidth, height: innerHeight }, document: { width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      direction: getComputedStyle(document.documentElement).direction, colorScheme: getComputedStyle(document.documentElement).colorScheme,
      regions: regions.map((selector) => ({ selector, elements: [...document.querySelectorAll(selector)].map(geometry) })),
      primary: [...document.querySelectorAll(primary)].map((node) => ({ ...geometry(node), text: node.textContent.trim(), disabled: node.matches(':disabled') || Boolean(node.closest('[aria-disabled="true"]')) || Boolean(node.closest('[inert]')) })),
      navigation: [...document.querySelectorAll('nav.navigation-bar,nav.navigation-rail')].map((node) => ({ ...geometry(node), kind: node.classList.contains('navigation-rail') ? 'rail' : 'bar', destinations: [...node.querySelectorAll('a')].map((link) => link.getAttribute('href')) })),
      state: { selected: document.querySelector('#preview-state')?.value ?? null, reached: document.querySelector('#activity')?.dataset.state ?? null, text: document.querySelector('#activity')?.textContent ?? null },
      controls: [...document.querySelectorAll('button,input,select,a[href]')].slice(0, 100).map((node) => ({ tag: node.tagName.toLowerCase(), id: node.id, text: node.textContent.trim().slice(0, 200), disabled: Boolean(node.matches(':disabled') || Boolean(node.closest('[aria-disabled="true"]')) || node.closest('[inert]')), ...geometry(node) })),
    };
  }, { regions: REGIONS, primary: PRIMARY, nodeLimit: LIMITS.nodes });
  const accessibility = await page.locator('body').ariaSnapshot();
  if (Buffer.byteLength(accessibility) > LIMITS.text || Buffer.byteLength(JSON.stringify(observation)) > LIMITS.text * 2) throw new Error('Inspection exceeds evidence byte limit');
  return { ...observation, accessibility };
}

/** Collects fixture-scoped facts; screenshots still require qualitative review. */
export async function captureInterfaceQuality(root, outputDirectory) {
  await mkdir(outputDirectory, { recursive: true });
  const evidence = { errors: [], schemaVersion: 1, source: 'operator-browser', collectedAt: new Date().toISOString(), browserVersion: null, limits: LIMITS, scenes: [], interactions: [],
    qualitativeReview: { status: 'pending', scope: 'Hierarchy, typography, containment, visual focus, contrast, identity and recovery quality require review of captures and traces. No aggregate design score.' },
    limitations: ['Text200 doubles computed text sizes; it is text-size stress, not browser zoom or proof of WCAG conformance.', 'English LTR fixture only; no localized or RTL claims.', 'No screen reader, touch input, contrast certification, or field performance measurement.'] };
  let server, browser;
  try {
    server = await startFixtureServer(root);
    browser = await chromium.launch({ headless: true, timeout: LIMITS.timeout });
    evidence.browserVersion = browser.version();
    async function collect(settings, action) {
      const record = { id: settings.id, settings, status: 'error', startedAt: new Date().toISOString() };
      let session, timer;
      try {
        session = await createRestrictedFixturePage(browser, server.origin, { viewport: { width: settings.width, height: settings.height }, deviceScaleFactor: settings.deviceScaleFactor, colorScheme: settings.colorScheme, reducedMotion: settings.reducedMotion, locale: settings.locale });
        const { page } = session;
        const work = async () => {
          const response = await page.goto(`${server.origin}${settings.route}?state=${encodeURIComponent(settings.state)}`, { waitUntil: 'load', timeout: LIMITS.timeout });
          if (!response?.ok()) throw new Error(`Fixture returned HTTP ${response?.status() ?? 'unavailable'}`);
          await page.evaluate(() => document.fonts.ready);
          if (settings.textScale === 2) await page.evaluate((nodeLimit) => {
            const nodes = [...document.querySelectorAll('body,body *')];
            if (nodes.length > nodeLimit) throw new Error('Text stress exceeds DOM node limit');
            const sizes = nodes.map((node) => Number.parseFloat(getComputedStyle(node).fontSize));
            if (sizes.some((size) => !Number.isFinite(size) || size < 0 || size > 256)) throw new Error('Text stress exceeds font-size limit');
            nodes.forEach((node, index) => node.style.setProperty('font-size', `${sizes[index] * 2}px`, 'important'));
          }, LIMITS.nodes);
          if (action) {
            try { record.trace = await action(page); }
            catch (error) { record.interactionError = errorText(error); record.trace = { failure: record.interactionError }; }
          }
          record.observation = await inspect(page);
          record.screenshot = await screenshot(page, outputDirectory, settings.id);
          const closedPreview = page.locator('details:not([open])').filter({ has: page.locator('#preview-state') });
          const openedPreview = await closedPreview.count() > 0;
          if (openedPreview) { try { await closedPreview.locator('summary').first().click(); } catch (error) { record.auxiliaryError = errorText(error); } }
          const auxiliary = await inspect(page);
          record.auxiliary = { openedPreview: openedPreview && !await closedPreview.count(), controls: auxiliary.controls.filter((node) => AUXILIARY.includes(node.id)), accessibility: auxiliary.accessibility };
          record.status = 'success';
        };
        await Promise.race([work(), new Promise((_, reject) => { timer = setTimeout(() => { void session.context.close().catch(() => {}); reject(new Error(`Scenario timed out after ${LIMITS.timeout}ms`)); }, LIMITS.timeout); })]);
      } catch (error) { record.status = 'error'; record.error = errorText(error); }
      finally {
        clearTimeout(timer);
        record.consoleErrors = [...session?.errors ?? []];
        evidence.errors.push(...record.consoleErrors.map((error) => `${settings.id}: ${error}`));
        record.blockedRequests = [...session?.blockedRequests ?? []];
        await session?.context.close().catch((error) => { record.status = 'error'; record.cleanupError = errorText(error); });
        record.finishedAt = new Date().toISOString();
        await writeFile(path.join(outputDirectory, `${settings.id}.json`), `${JSON.stringify(retainedRecord(record), null, 2)}\n`);
      }
      return record;
    }
    for (const settings of INTERFACE_SCENARIOS) evidence.scenes.push(await collect(settings));
    for (const method of ['keyboard', 'pointer']) evidence.interactions.push(await collect({ ...base, id: `save-${method}` }, async (page) => {
      const trace = { method, focus: [], checkedBefore: await page.locator(CHECKBOX).isChecked() };
      if (method === 'keyboard') { await tabTo(page, CHECKBOX, trace.focus); await page.keyboard.press('Space'); await tabTo(page, PRIMARY, trace.focus); trace.focusedScreenshot = await screenshot(page, outputDirectory, 'save-keyboard-focused'); await page.keyboard.press('Enter'); }
      else { await page.getByText('Email alerts', { exact: true }).click(); await page.locator(PRIMARY).click(); }
      trace.checkedAfter = await page.locator(CHECKBOX).isChecked();
      trace.message = await page.locator('#save-result').textContent();
      return trace;
    }));
    evidence.interactions.push(await collect({ ...base, id: 'drawer-keyboard' }, async (page) => {
      const trigger = page.locator('.navigation-drawer-trigger');
      const focus = [];
      await tabTo(page, '.navigation-drawer-trigger', focus);
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('#account-drawer').contains(document.activeElement));
      const focusEntered = await page.locator('#account-drawer').evaluate((node) => node.contains(document.activeElement));
      const open = await page.locator('#account-drawer').evaluate((node) => node.open);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#account-drawer').open);
      return { open, focus, focusEntered, closed: await page.locator('#account-drawer').evaluate((node) => !node.open), focusReturned: await trigger.evaluate((node) => node === document.activeElement) };
    }));
  } catch (error) { evidence.infrastructureError = errorText(error); }
  finally {
    const cleanup = await Promise.allSettled([browser?.close(), server?.close()]);
    const errors = cleanup.filter((result) => result.status === 'rejected').map((result) => errorText(result.reason));
    if (errors.length) evidence.cleanupErrors = errors;
    await writeFile(path.join(outputDirectory, 'interface-quality.json'), `${JSON.stringify(retainedInterfaceEvidence(evidence), null, 2)}\n`);
  }
  return evidence;
}

const check = (text, passed, evidence) => ({ text, passed: passed === true, evidence: JSON.stringify(redactValue(evidence ?? null)) });
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const geometryValid = (node) => node && ['x', 'y', 'width', 'height', 'top', 'right', 'bottom', 'left'].every((key) => finite(node[key])) && ['visible', 'clipped', 'intersectsViewport', 'fullyInViewport', 'unobscured'].every((key) => typeof node[key] === 'boolean');
const strings = (value) => Array.isArray(value) && value.every((entry) => typeof entry === 'string');
const observationValid = (data) => data && typeof data.accessibility === 'string' && data.accessibility.length > 0
  && Array.isArray(data.brandColor) && data.brandColor.length === 4 && data.brandColor.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)
  && finite(data.viewport?.width) && finite(data.viewport?.height) && ['width', 'scrollWidth', 'height'].every((key) => finite(data.document?.[key]))
  && Array.isArray(data.regions) && data.regions.length === REGIONS.length && new Set(data.regions.map((region) => region.selector)).size === REGIONS.length
  && data.regions.every((region) => REGIONS.includes(region.selector) && Array.isArray(region.elements) && region.elements.every(geometryValid))
  && Array.isArray(data.primary) && data.primary.every((node) => geometryValid(node) && typeof node.disabled === 'boolean' && typeof node.text === 'string')
  && Array.isArray(data.navigation) && data.navigation.every((node) => geometryValid(node) && ['bar', 'rail'].includes(node.kind) && strings(node.destinations))
  && data.state && ['selected', 'reached', 'text'].every((key) => data.state[key] === null || typeof data.state[key] === 'string');
const recordValid = (record) => record?.status === 'success' && observationValid(record.observation)
  && record.observation.viewport.width === record.settings?.width && record.observation.viewport.height === record.settings?.height
  && typeof record.screenshot?.path === 'string' && /^[a-f0-9]{64}$/.test(record.screenshot?.sha256 ?? '') && Number.isSafeInteger(record.screenshot?.bytes) && record.screenshot.bytes > 0
  && strings(record.consoleErrors) && strings(record.blockedRequests)
  && typeof record.auxiliary?.openedPreview === 'boolean' && typeof record.auxiliary.accessibility === 'string'
  && Array.isArray(record.auxiliary.controls) && record.auxiliary.controls.every((node) => geometryValid(node) && typeof node.disabled === 'boolean');

/** Objective fixture checks only; these results do not grade visual design. */
export function gradeInterfaceQuality(evidence, { reviewOnly = false } = {}) {
  const results = [check('Whole-interface operator collection completed', evidence?.source === 'operator-browser' && !evidence.infrastructureError && !evidence.cleanupErrors?.length, evidence?.infrastructureError ?? evidence?.cleanupErrors ?? evidence?.source)];
  const scenes = Array.isArray(evidence?.scenes) ? evidence.scenes : [];
  results.push(check('Whole-interface scene inventory is exact', scenes.length === INTERFACE_SCENARIOS.length && new Set(scenes.map((record) => record.id)).size === INTERFACE_SCENARIOS.length, scenes.map((record) => record.id)));
  for (const settings of INTERFACE_SCENARIOS) {
    const record = scenes.find((record) => record.id === settings.id);
    const available = recordValid(record) && Object.entries(settings).every(([key, value]) => record.settings?.[key] === value);
    results.push(check(`Whole-interface evidence available: ${settings.id}`, available, record?.error ?? record?.screenshot));
    if (reviewOnly) continue;
    const data = record?.observation;
    results.push(check(`Whole-interface required regions visible: ${settings.id}`, available && REGIONS.every((selector) => {
      const region = data?.regions?.find((entry) => entry.selector === selector);
      return region?.elements?.length === 1 && geometryValid(region.elements[0]) && region.elements[0].visible && !region.elements[0].clipped;
    }), data?.regions));
    const navigation = Array.isArray(data?.navigation) ? data.navigation.filter((node) => node.visible) : null;
    results.push(check(`Whole-interface peer navigation: ${settings.id}`, available && navigation?.length === 1 && geometryValid(navigation[0]) && !navigation[0].clipped && navigation[0].kind === (settings.width < 840 ? 'bar' : 'rail') && navigation[0].destinations?.length === 3 && ['/home', '/search', '/profile'].every((destination) => navigation[0].destinations.includes(destination)), navigation));
    results.push(check(`Whole-interface brand seed preserved: ${settings.id}`, available && [0, 106, 121, 255].every((value, index) => data.brandColor[index] === value), data?.brandColor));
    results.push(check(`Whole-interface reflow: ${settings.id}`, available && finite(data?.document?.width) && finite(data?.document?.scrollWidth) && data.document.width === settings.width && data.document.scrollWidth <= data.document.width, data?.document));
    const primary = data?.primary?.[0];
    results.push(check(`Whole-interface Save visible and usable: ${settings.id}`, available && data?.primary?.length === 1 && geometryValid(primary) && primary.visible && !primary.clipped && primary.disabled === false && primary.text === 'Save preferences' && (!settings.id.startsWith('default-') || primary.fullyInViewport && primary.unobscured), data?.primary));
    results.push(check(`Whole-interface auxiliary controls reachable: ${settings.id}`, available && !record.auxiliaryError && AUXILIARY.every((id) => {
      const controls = record.auxiliary.controls.filter((node) => node.id === id);
      return controls.length === 1 && controls[0].visible && !controls[0].clipped && controls[0].disabled === false;
    }), record?.auxiliary));
    results.push(check(`Whole-interface activity state reached: ${settings.id}`, available && data?.state?.selected === settings.state && data?.state?.reached === settings.state && typeof data?.state?.text === 'string' && data.state.text.trim().length > 0, data?.state));
    results.push(check(`Whole-interface browser errors absent: ${settings.id}`, available && record.consoleErrors.length === 0 && record.blockedRequests.length === 0, { errors: record?.consoleErrors, blocked: record?.blockedRequests }));
  }
  const interactions = Array.isArray(evidence?.interactions) ? evidence.interactions : [];
  results.push(check('Whole-interface interaction inventory is exact', interactions.length === 3 && new Set(interactions.map((record) => record.id)).size === 3 && ['save-keyboard', 'save-pointer', 'drawer-keyboard'].every((id) => interactions.some((record) => record.id === id)), interactions.map((record) => record.id)));
  for (const id of ['save-keyboard', 'save-pointer', 'drawer-keyboard']) {
    const record = interactions.find((entry) => entry.id === id), trace = record?.trace;
    results.push(check(`Whole-interface interaction evidence: ${id}`, recordValid(record) && trace && typeof trace === 'object', record?.error ?? trace));
    if (reviewOnly) continue;
    const completed = id === 'drawer-keyboard' ? trace?.open === true && trace.focusEntered === true && trace.closed === true && trace.focusReturned === true
      : trace?.checkedBefore === false && trace.checkedAfter === true && trace.message === 'Preferences saved.' && trace.method === id.slice(5) && (id !== 'save-keyboard' || Array.isArray(trace.focus) && trace.focus.some((entry) => entry.target === true && entry.tag === 'input') && trace.focus.some((entry) => entry.target === true && entry.tag === 'button') && /^[a-f0-9]{64}$/.test(trace.focusedScreenshot?.sha256 ?? ''));
    results.push(check(`Whole-interface task outcome: ${id}`, recordValid(record) && !record.interactionError && completed && record.consoleErrors.length === 0 && record.blockedRequests.length === 0, trace));
  }
  return results;
}
