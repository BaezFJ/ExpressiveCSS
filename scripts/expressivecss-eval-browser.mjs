import { createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { readBoundedRegularFile } from './eval-expressivecss-skill.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIMITS = { requests: 1000, calls: 100, input: 16_384, output: 65_536, image: 4 * 1024 * 1024, timeout: 8000 };
const ROUTES = new Set(['/', '/dashboard', '/home', '/search', '/profile']);
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const listen = (server) => new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const stop = (server) => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
const originOf = (server) => `http://127.0.0.1:${server.address().port}`;
const trustedRequest = (request, origin) => request.headers.host === new URL(origin).host && (!request.headers.origin || request.headers.origin === origin);

function fixturePath(raw) {
  const value = decodeURIComponent(raw.split('?')[0]);
  if (!value.startsWith('/') || value.includes('\\') || value.includes('\0') || value.split('/').some((part) => part === '.' || part === '..')) throw new Error('Unsafe asset path');
  if (ROUTES.has(value)) return 'src/index.html';
  if (/^\/src\/(index\.html|app\.css|app\.js)$/.test(value) || value === '/hero.svg') return value.slice(1);
  if (/^\/node_modules\/@expressivecss\/expressive\/dist\/[\w./-]+\.(css|js|mjs|svg|woff2?|ttf)$/.test(value)) return value.slice(1);
  throw new Error('Asset is outside the fixture public surface');
}

/** Only public fixture assets are served; project metadata and arbitrary paths are never exposed. */
export async function startFixtureServer(projectRoot) {
  let requests = 0;
  const server = createServer(async (request, response) => {
    try {
      if (++requests > LIMITS.requests || !trustedRequest(request, originOf(server)) || !['GET', 'HEAD'].includes(request.method)) { response.writeHead(403).end('Forbidden'); return; }
      const relative = fixturePath(request.url);
      const data = await readBoundedRegularFile(path.join(projectRoot, relative), 16 * 1024 * 1024, 'fixture browser asset', projectRoot, null);
      response.writeHead(200, { 'Content-Type': MIME[path.extname(relative)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'none'; worker-src 'none'; frame-src 'none'; object-src 'none'; form-action 'self'; base-uri 'none'" });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch { response.writeHead(404).end('Not found'); }
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  await listen(server);
  return { origin: originOf(server), close: () => stop(server) };
}

const TOOL = { name: 'browser', description: 'Inspect and exercise the running local consumer fixture. State persists between calls. Reload after source edits. Each successful call returns an operator proof ID and screenshot. This browser cannot access external URLs or arbitrary project files.', inputSchema: {
  type: 'object', required: ['action'], additionalProperties: false,
  properties: { action: { type: 'string', enum: ['inspect', 'reload', 'click', 'fill', 'press', 'resize', 'evaluate'] }, selector: { type: 'string', maxLength: 1024 }, value: { type: 'string', maxLength: 4096 }, key: { type: 'string', maxLength: 100 }, width: { type: 'integer', minimum: 320, maximum: 1920 }, expression: { type: 'string', maxLength: 8192 } }
} };

function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some((key) => !Object.hasOwn(TOOL.inputSchema.properties, key))) throw new Error('Invalid browser input');
  if (!TOOL.inputSchema.properties.action.enum.includes(input.action)) throw new Error('Invalid browser action');
  for (const key of ['selector', 'value', 'key', 'expression']) if (input[key] !== undefined && (typeof input[key] !== 'string' || input[key].length > TOOL.inputSchema.properties[key].maxLength)) throw new Error(`Invalid ${key}`);
  if (input.width !== undefined && (!Number.isInteger(input.width) || input.width < 320 || input.width > 1920)) throw new Error('Invalid viewport width');
  for (const required of ({ click: ['selector'], fill: ['selector', 'value'], press: ['key'], resize: ['width'], evaluate: ['expression'] }[input.action] ?? [])) if (input[required] === undefined || (required !== 'value' && input[required] === '')) throw new Error(`Missing ${required}`);
}

/** Shared network boundary for both candidate tools and independent post-run checks. */
export async function createRestrictedFixturePage(browser, origin, options = {}) {
  const context = await browser.newContext({ ...options, serviceWorkers: 'block', acceptDownloads: false });
  const errors = [], blockedRequests = [];
  await context.route('**/*', (route) => {
    try {
      const target = new URL(route.request().url());
      if (target.origin !== origin || !['GET', 'HEAD'].includes(route.request().method())) throw new Error('External or mutating request');
      fixturePath(target.pathname);
      return route.continue();
    } catch { if (blockedRequests.length < 50) blockedRequests.push(route.request().url().slice(0, 512)); return route.abort('blockedbyclient'); }
  });
  await context.routeWebSocket('**/*', (socket) => { if (blockedRequests.length < 50) blockedRequests.push(socket.url().slice(0, 512)); socket.close(); });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);
  page.on('pageerror', (error) => { if (errors.length < 50) errors.push(error.message.slice(0, 2048)); });
  page.on('console', (message) => { if (message.type() === 'error' && errors.length < 50) errors.push(message.text().slice(0, 2048)); });
  context.on('page', (popup) => { if (popup !== page) void popup.close().catch(() => {}); });
  return { context, page, errors, blockedRequests };
}

/** The evaluator owns the browser and records. Candidate responses are never verification evidence. */
export async function startEvaluationBrowser({ projectRoot, artifactDirectory }) {
  const capability = { status: 'unavailable', error: null };
  const records = [];
  let fixture, browser, page, httpServer, url = null, closed = false, queued = Promise.resolve(), calls = 0;
  const connections = new Set();
  const close = async () => {
    if (closed) return;
    closed = true;
    await Promise.allSettled([...connections].map((connection) => connection.close()));
    await Promise.allSettled([browser?.close(), fixture?.close(), httpServer ? stop(httpServer) : undefined]);
  };
  try {
    const require = createRequire(path.join(ROOT, 'mcp/expressivecss/package.json'));
    const sdk = async (module) => import(pathToFileURL(require.resolve(`@modelcontextprotocol/sdk/${module}`)).href);
    const [{ Server }, { StreamableHTTPServerTransport }, { CallToolRequestSchema, ListToolsRequestSchema }] = await Promise.all([sdk('server/index.js'), sdk('server/streamableHttp.js'), sdk('types.js')]);
    fixture = await startFixtureServer(projectRoot);
    browser = await chromium.launch({ headless: true, timeout: LIMITS.timeout });
    const session = await createRestrictedFixturePage(browser, fixture.origin, { viewport: { width: 375, height: 900 }, reducedMotion: 'reduce', colorScheme: 'light' });
    page = session.page;
    const { errors, blockedRequests } = session;
    const loaded = await page.goto(`${fixture.origin}/dashboard`, { waitUntil: 'load', timeout: LIMITS.timeout });
    if (!loaded?.ok()) throw new Error(`Fixture preflight returned HTTP ${loaded?.status() ?? 'unavailable'}`);
    await page.locator('body').waitFor({ state: 'visible' });
    await mkdir(artifactDirectory, { recursive: true });
    records.push({ id: 'browser-preflight', action: 'preflight', status: 'success', result: { evidenceId: 'browser-preflight', title: await page.title(), viewport: page.viewportSize() } });

    const operate = async (input) => {
      const id = `browser-${records.length + 1}`;
      const record = { id, action: input?.action ?? null, status: 'error', input, startedAt: new Date().toISOString() };
      records.push(record);
      let timer;
      try {
        if (closed || capability.status !== 'available') throw new Error(capability.error ?? 'Evaluation browser is closed');
        validateInput(input);
        const result = await Promise.race([(async () => {
          let observation = null;
          if (input.action === 'reload') await page.goto(`${fixture.origin}/dashboard`, { waitUntil: 'load' });
          if (input.action === 'click') await page.locator(input.selector).click();
          if (input.action === 'fill') await page.locator(input.selector).fill(input.value);
          if (input.action === 'press') await (input.selector ? page.locator(input.selector) : page.keyboard).press(input.key);
          if (input.action === 'resize') await page.setViewportSize({ width: input.width, height: 900 });
          if (input.action === 'evaluate') observation = await page.evaluate(async (expression) => {
            const value = await (0, eval)(expression);
            const serialized = JSON.stringify(value);
            if (serialized && new TextEncoder().encode(serialized).byteLength > 32_768) throw new Error('Browser evaluation exceeds output limit');
            return serialized === undefined ? null : JSON.parse(serialized);
          }, input.expression);
          const snapshot = await page.locator('body').ariaSnapshot();
          const dom = await page.locator('body').evaluate((body) => ({ html: body.outerHTML.slice(0, 24_000), controls: [...body.querySelectorAll('button,input,select,textarea,a[href]')].filter((node) => node.checkVisibility()).slice(0, 100).map((node) => ({ tag: node.tagName, id: node.id, text: node.textContent?.trim().slice(0, 200), label: node.getAttribute('aria-label'), type: node.getAttribute('type'), disabled: Boolean(node.disabled) })) }));
          const data = { evidenceId: id, observation, accessibility: snapshot.slice(0, 16_000), ...dom, viewport: page.viewportSize(), consoleErrors: [...errors], blockedRequests: [...blockedRequests] };
          if (Buffer.byteLength(JSON.stringify(data)) > LIMITS.output) throw new Error('Browser result exceeds output limit');
          const screenshot = await page.screenshot({ fullPage: false, timeout: 3000 });
          if (screenshot.byteLength > LIMITS.image) throw new Error('Browser screenshot exceeds output limit');
          const screenshotFile = path.join(artifactDirectory, `${id}.png`);
          await writeFile(screenshotFile, screenshot, { flag: 'wx' });
          return { ...data, screenshot: screenshotFile, screenshotSha256: createHash('sha256').update(screenshot).digest('hex') };
        })(), new Promise((_, reject) => { timer = setTimeout(() => { capability.status = 'unavailable'; capability.error = `Browser action timed out after ${LIMITS.timeout} ms; browser closed`; void browser.close().catch(() => {}); reject(new Error(capability.error)); }, LIMITS.timeout); })]);
        record.status = 'success'; record.result = result;
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error) { record.error = error.message.length > 4096 ? `${error.message.slice(0, 4096)} [error truncated]` : error.message; return { isError: true, content: [{ type: 'text', text: JSON.stringify({ evidenceId: id, error: record.error }) }] }; }
      finally { clearTimeout(timer); record.finishedAt = new Date().toISOString(); }
    };
    const endpoint = `/${randomBytes(24).toString('hex')}/mcp`;
    let requests = 0;
    httpServer = createServer(async (request, response) => {
      let server, transport;
      try {
        if (++requests > 200 || !trustedRequest(request, originOf(httpServer)) || request.url !== endpoint) { response.writeHead(403).end('Forbidden'); return; }
        if (request.method !== 'POST') { response.writeHead(405).end('POST required'); return; }
        if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] ?? '')) { response.writeHead(415).end('JSON required'); return; }
        let bytes = 0; const chunks = [];
        for await (const chunk of request) { bytes += chunk.length; if (bytes > LIMITS.input) { response.writeHead(413).end('Request too large'); return; } chunks.push(chunk); }
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        server = new Server({ name: 'expressivecss-evaluation-browser', version: '1.0.0' }, { capabilities: { tools: {} } });
        server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [TOOL] }));
        server.setRequestHandler(CallToolRequestSchema, async (call) => {
          if (call.params.name !== 'browser') throw new Error('Unknown tool');
          if (++calls > LIMITS.calls) throw new Error('Browser tool call limit exceeded');
          const next = queued.then(() => operate(call.params.arguments));
          queued = next.catch(() => {});
          return next;
        });
        transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
        connections.add(server);
        await server.connect(transport);
        await transport.handleRequest(request, response, body);
      } catch (error) { if (!response.headersSent) response.writeHead(400).end(JSON.stringify({ error: error.message })); }
      finally { if (server) { connections.delete(server); await server.close(); } }
    });
    httpServer.requestTimeout = 10_000;
    httpServer.headersTimeout = 10_000;
    await listen(httpServer);
    url = `${originOf(httpServer)}${endpoint}`;
    capability.status = 'available';
    capability.error = null;
  } catch (error) { capability.error = error.message; records.push({ id: 'browser-preflight', action: 'preflight', status: 'error', error: error.message }); await close(); }
  return { url, capability, records, close };
}
