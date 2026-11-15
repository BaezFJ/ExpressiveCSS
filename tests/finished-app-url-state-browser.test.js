import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const script = fileURLToPath(new URL('../scripts/finished-app-url-state.mjs', import.meta.url));
const dist = (path) => new URL(`../dist/${path}`, import.meta.url).href;

const table = (id, names) => `<div class="data-table" id="${id}" data-page-size="3">
  <label>Search ${id}<input type="search" data-table-filter></label>
  <table><caption>${id}</caption><thead><tr><th scope="col" data-filter>Customer</th></tr></thead>
  <tbody>${names.map((name) => `<tr><td>${name}</td></tr>`).join('')}</tbody></table>
  <nav class="pagination" aria-label="${id} pages"><ol>
    <li><button type="button" data-table-page="previous">Previous</button></li>
    <li><output data-table-page-status role="status" aria-live="polite" aria-label="${id} page"></output></li>
    <li><button type="button" data-table-page="next">Next</button></li>
  </ol></nav></div>`;

// The URL-keeping script follows the Tabs and Data table App behavior guidance.
const keepUrl = `const params = new URLSearchParams(location.search);
const tabs = document.querySelector('.tabs');
const saved = params.get('view');
const link = saved && tabs.querySelector('a[href="#' + CSS.escape(saved) + '"]');
if (link) { tabs.querySelector('a.active')?.classList.remove('active'); link.classList.add('active'); }
document.addEventListener('DOMContentLoaded', () => {
  Expressive.AutoInit();
  const write = (changes) => {
    const url = new URL(location.href);
    for (const [key, value] of Object.entries(changes)) { if (value) url.searchParams.set(key, value); else url.searchParams.delete(key); }
    history.replaceState(null, '', url);
  };
  tabs.addEventListener('expressive:change', (event) => write({ view: event.detail.panel.id, q: '', page: '' }));
  const panel = document.getElementById(saved || 'open');
  const wrapper = panel.querySelector('.data-table');
  wrapper.querySelector('[data-table-filter]').value = params.get('q') ?? '';
  Expressive.DataTables.sync(wrapper);
  Expressive.DataTables.showPage(wrapper, Number(params.get('page')) || 1);
  document.querySelectorAll('.data-table').forEach((each) => {
    each.addEventListener('expressive:filter', (event) => write({ q: event.detail.query, page: '' }));
    each.addEventListener('expressive:page', (event) => write({ page: event.detail.page }));
  });
});`;

const app = (script) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Orders</title>
<link rel="stylesheet" href="${dist('css/expressive.css')}"></head><body>
<nav class="tabs" aria-label="Order state"><a class="active" href="#open">Open</a><a href="#shipped">Shipped</a></nav>
<div id="open">${table('open-orders', ['Ana', 'Ben', 'Cy', 'Dee'])}</div>
<div id="shipped">${table('shipped-orders', ['Ada', 'Al', 'Amy', 'Ari', 'Asa', 'Ava', 'Abe'])}</div>
<script src="${dist('js/expressive.js')}"></script><script>${script}</script></body></html>`;

async function check(html) {
  const dir = await mkdtemp(join(tmpdir(), 'finished-app-url-'));
  try {
    await writeFile(join(dir, 'index.html'), html);
    const result = await run(process.execPath, [script, dir]).catch((error) => error);
    return { code: result.code ?? 0, line: JSON.parse(result.stdout.trim()) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('the URL state check passes a dashboard that follows the App behavior guidance', async () => {
  const { code, line } = await check(app(keepUrl));
  assert.equal(line.pass, true, `${line.reason} ${JSON.stringify(line.reloaded)}`);
  assert.equal(line.expected.tab, 'Shipped');
  assert.equal(line.expected.search, 'a');
  assert.deepEqual(line.expected.status, ['2 / 3']);
  assert.match(line.url, /view=shipped/);
  assert.equal(code, 0);
});

test('the URL state check fails a dashboard that keeps nothing in the URL', async () => {
  const { code, line } = await check(app("document.addEventListener('DOMContentLoaded', () => Expressive.AutoInit());"));
  assert.equal(line.pass, false);
  assert.equal(line.reason, 'the view after reload differs');
  assert.equal(code, 1);
});
