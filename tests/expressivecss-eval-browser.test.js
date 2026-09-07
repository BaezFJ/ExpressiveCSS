import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer, request } from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { chromium } from '@playwright/test';
import { createRestrictedFixturePage, startEvaluationBrowser, startFixtureServer } from '../scripts/expressivecss-eval-browser.mjs';

const require = createRequire(new URL('../mcp/expressivecss/package.json', import.meta.url));
async function clientFor(url) {
  const [{ Client }, { StreamableHTTPClientTransport }] = await Promise.all(['client/index.js', 'client/streamableHttp.js'].map((module) => import(pathToFileURL(require.resolve(`@modelcontextprotocol/sdk/${module}`)).href)));
  const client = new Client({ name: 'operator-test', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  return client;
}

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'expressivecss-browser-test-'));
  await mkdir(path.join(root, 'project/src'), { recursive: true });
  await writeFile(path.join(root, 'project/src/index.html'), '<!doctype html><title>Fixture</title><body><label>Name<input id="name"></label><button id="save" onclick="document.querySelector(\'#result\').textContent=document.querySelector(\'#name\').value">Save</button><p id="result"></p><script src="/src/app.js"></script>');
  await writeFile(path.join(root, 'project/src/app.js'), 'window.loaded = true;');
  await writeFile(path.join(root, 'project/package.json'), '{"private":"never serve this"}');
  return { root, projectRoot: path.join(root, 'project'), artifactDirectory: path.join(root, 'artifacts') };
}

async function requireBrowser(t) {
  try { await access(chromium.executablePath()); require.resolve('@modelcontextprotocol/sdk/client/index.js'); return true; }
  catch { t.skip('Optional evaluation SDK or Chromium is not installed'); return false; }
}
const call = async (client, input) => { const response = await client.callTool({ name: 'browser', arguments: input }); return { ...response, data: JSON.parse(response.content[0].text) }; };

test('evaluation browser serves a real SDK session with independent evidence and preserved state', async (t) => {
  if (!await requireBrowser(t)) return;
  const files = await fixture(); let bridge, client;
  try {
    bridge = await startEvaluationBrowser({ ...files, artifactDirectory: path.relative(process.cwd(), files.artifactDirectory) });
    assert.equal(bridge.capability.status, 'available', bridge.capability.error);
    client = await clientFor(bridge.url);
    assert.deepEqual((await client.listTools()).tools.map((tool) => tool.name), ['browser']);
    const inspection = await call(client, { action: 'inspect' });
    assert.match(inspection.data.accessibility, /Save/);
    assert.match(inspection.data.html, /id="name"/);
    assert.equal(path.isAbsolute(inspection.data.screenshot), true, 'captures must resolve from the candidate temporary working directory');
    assert.equal(inspection.data.remainingCalls, 99);
    const full = await call(client, { action: 'evaluate', expression: 'document.body.style.minHeight = "1500px"', fullPage: true });
    assert.equal(full.data.fullPage, true);
    assert.ok((await readFile(full.data.screenshot)).readUInt32BE(20) >= 1500, 'full-page PNG includes content beyond the viewport');
    const icon = await call(client, { action: 'evaluate', expression: '(async () => { const image = new Image(); image.src = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E"; document.body.append(image); await image.decode(); return image.naturalWidth; })()' });
    assert.equal(icon.data.observation, 1, 'framework inline images remain usable without external access');
    await call(client, { action: 'fill', selector: '#name', value: '' });
    await call(client, { action: 'fill', selector: '#name', value: 'Northstar' });
    await call(client, { action: 'click', selector: '#save' });
    const state = await call(client, { action: 'evaluate', expression: 'document.querySelector("#result").textContent' });
    assert.equal(state.data.observation, 'Northstar');
    const resized = await call(client, { action: 'resize', width: 840 });
    assert.equal(resized.data.viewport.width, 840);
    const dark = await call(client, { action: 'emulate', colorScheme: 'dark', reducedMotion: 'no-preference' });
    assert.deepEqual(dark.data.media, { colorScheme: 'dark', reducedMotion: 'no-preference' });
    assert.equal((await call(client, { action: 'emulate', reducedMotion: 'reduce' })).data.media.colorScheme, 'dark', 'unspecified media settings persist');
    await call(client, { action: 'press', selector: '#name', key: 'Tab' });
    await writeFile(path.join(files.projectRoot, 'src/app.js'), 'window.loaded = "updated";');
    await call(client, { action: 'reload' });
    assert.equal((await call(client, { action: 'evaluate', expression: 'window.loaded' })).data.observation, 'updated');
    assert.equal(bridge.records[0].action, 'preflight');
    assert.equal(bridge.records.every((record) => record.status === 'success'), true);
    assert.deepEqual(bridge.records.find((record) => record.id === state.data.evidenceId).result, state.data);
    assert.ok((await readFile(state.data.screenshot)).byteLength > 0);
    const url = bridge.url;
    await client.close(); client = null;
    await bridge.close();
    await assert.rejects(fetch(url));
  } finally { await client?.close(); await bridge?.close(); await rm(files.root, { recursive: true, force: true }); }
});

test('fixture server blocks private paths, traversal, symlinks and foreign origins', async () => {
  const files = await fixture(); let server;
  try {
    await writeFile(path.join(files.root, 'private.js'), 'secret');
    await symlink(path.join(files.root, 'private.js'), path.join(files.projectRoot, 'src/app.css'));
    server = await startFixtureServer(files.projectRoot);
    assert.equal((await fetch(`${server.origin}/dashboard`)).status, 200);
    for (const asset of ['/package.json', '/.git/config', '/src/..%2fpackage.json', '/src/app.css', '/node_modules/@expressivecss/expressive/package.json']) assert.equal((await fetch(server.origin + asset)).status, 404, asset);
    assert.equal((await fetch(server.origin, { headers: { origin: 'https://outside.test' } })).status, 403);
    assert.equal(await new Promise((resolve, reject) => { const req = request(server.origin, { headers: { host: 'outside.test' } }, (res) => { res.resume(); resolve(res.statusCode); }); req.on('error', reject); req.end(); }), 403);
    assert.equal((await fetch(server.origin, { method: 'POST' })).status, 403);
  } finally { await server?.close(); await rm(files.root, { recursive: true, force: true }); }
});

test('shared post-run browser blocks external navigation, WebSockets and popup traffic', async (t) => {
  try { await access(chromium.executablePath()); } catch { t.skip('Chromium is not installed'); return; }
  const files = await fixture(); let browser, fixtureServer;
  let externalRequests = 0;
  const external = createServer((_request, response) => { externalRequests++; response.end('External content'); });
  external.on('upgrade', (_request, socket) => { externalRequests++; socket.destroy(); });
  try {
    await new Promise((resolve) => external.listen(0, '127.0.0.1', resolve));
    const externalOrigin = `http://127.0.0.1:${external.address().port}`;
    fixtureServer = await startFixtureServer(files.projectRoot);
    browser = await chromium.launch({ headless: true });
    const { page, context, blockedRequests } = await createRestrictedFixturePage(browser, fixtureServer.origin);
    // Start on about:blank so CSP cannot mask a missing network restriction.
    const socketState = await page.evaluate((url) => new Promise((resolve) => {
      const socket = new WebSocket(url);
      socket.onclose = () => resolve('closed');
      socket.onerror = () => resolve('error');
    }), externalOrigin.replace('http:', 'ws:') + '/socket');
    assert.equal(socketState, 'closed');
    const failedNavigation = page.waitForEvent('framenavigated', { predicate: (frame) => frame === page.mainFrame() });
    await assert.rejects(page.goto(externalOrigin), /ERR_BLOCKED_BY_CLIENT/);
    await failedNavigation;
    assert.ok(blockedRequests.some((url) => url === externalOrigin + '/'));
    await page.goto(`${fixtureServer.origin}/dashboard`);
    const [popup] = await Promise.all([context.waitForEvent('page'), page.evaluate((url) => { window.open(url); }, externalOrigin)]);
    if (!popup.isClosed()) await popup.waitForEvent('close');
    assert.equal(popup.isClosed(), true);
    assert.equal(externalRequests, 0);
  } finally {
    await browser?.close(); await fixtureServer?.close();
    await new Promise((resolve) => { external.close(resolve); external.closeAllConnections(); });
    await rm(files.root, { recursive: true, force: true });
  }
});

test('browser rejects unsupported commands and cannot fetch external or private content', async (t) => {
  if (!await requireBrowser(t)) return;
  const files = await fixture(); let bridge, client;
  try {
    bridge = await startEvaluationBrowser(files);
    assert.equal(bridge.capability.status, 'available', bridge.capability.error);
    client = await clientFor(bridge.url);
    for (const input of [{ action: 'navigate', value: 'https://example.com' }, { action: 'evaluate', expression: '1', path: '/etc/passwd' }, { action: 'resize', width: 5000 }, { action: 'click' }, { action: 'emulate' }, { action: 'emulate', colorScheme: 'unknown' }, { action: 'emulate', reducedMotion: true }, { action: 'inspect', fullPage: 'true' }]) {
      const result = await call(client, input);
      assert.equal(result.isError, true);
      assert.equal(bridge.records.at(-1).error, result.data.error);
    }
    const oversized = await call(client, { action: 'evaluate', expression: '"x".repeat(40_000)' });
    assert.equal(oversized.isError, true);
    assert.match(oversized.data.error, /output limit/);
    const tall = await call(client, { action: 'evaluate', expression: 'document.body.style.minHeight = "13000px"', fullPage: true });
    assert.equal(tall.isError, true);
    assert.match(tall.data.error, /height limit/);
    for (const target of ['https://example.com/', '/package.json', bridge.url]) {
      const result = await call(client, { action: 'evaluate', expression: `fetch(${JSON.stringify(target)}).then(r => r.text()).catch(error => error.message)` });
      assert.equal(result.isError, undefined);
      assert.match(result.data.observation, /fetch/i);
    }
    assert.equal((await fetch(bridge.url, { method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'https://outside.test' }, body: '{}' })).status, 403);
    assert.equal((await fetch(bridge.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(20_000) })).status, 413);
  } finally { await client?.close(); await bridge?.close(); await rm(files.root, { recursive: true, force: true }); }
});

test('missing fixture yields unavailable capability with its exact preflight failure', async () => {
  const files = await fixture(); let bridge;
  try {
    await rm(path.join(files.projectRoot, 'src/index.html'));
    bridge = await startEvaluationBrowser(files);
    assert.equal(bridge.capability.status, 'unavailable');
    assert.equal(typeof bridge.capability.error, 'string');
    assert.ok(bridge.capability.error.length > 0);
    try { await access(chromium.executablePath()); require.resolve('@modelcontextprotocol/sdk/client/index.js'); assert.equal(bridge.capability.error, 'Fixture preflight returned HTTP 404'); } catch (error) { if (error.code !== 'ENOENT' && error.code !== 'MODULE_NOT_FOUND') throw error; }
    assert.equal(bridge.records[0].error, bridge.capability.error);
    assert.equal(bridge.url, null);
  } finally { await bridge?.close(); await rm(files.root, { recursive: true, force: true }); }
});

test('non-resolving evaluation closes the browser and stops further work', async (t) => {
  if (!await requireBrowser(t)) return;
  const files = await fixture(); let bridge, client;
  try {
    bridge = await startEvaluationBrowser(files);
    assert.equal(bridge.capability.status, 'available', bridge.capability.error);
    client = await clientFor(bridge.url);
    const result = await call(client, { action: 'evaluate', expression: 'new Promise(() => {})' });
    assert.equal(result.isError, true);
    assert.match(result.data.error, /timed out.*closed/);
    assert.equal(bridge.capability.status, 'unavailable');
    assert.equal((await call(client, { action: 'inspect' })).data.error, bridge.capability.error);
  } finally { await client?.close(); await bridge?.close(); await rm(files.root, { recursive: true, force: true }); }
});
