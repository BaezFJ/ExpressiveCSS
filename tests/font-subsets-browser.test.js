import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { leaseBrowser } from './browser.js';

const dist = new URL('../dist/', import.meta.url);

test('chromium: the browser fetches only the font subsets and weights a page renders', { timeout: 30000 }, async (t) => {
  if (!existsSync(chromium.executablePath())) { t.skip('chromium is not installed'); return; }
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage();
    const fetched = [];
    // Serve dist/ over http so the sheet's ../fonts/ urls resolve.
    await page.route('http://fonts.test/**', (route) => {
      const path = new URL(route.request().url()).pathname.slice(1);
      if (path.endsWith('.woff2')) fetched.push(path.split('/').pop());
      const body = path === 'index.html'
        ? `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="css/expressive.css"></head><body>
            <p>Hello</p><p lang="ru">Привет</p><span class="label-large-emphasized">Selected</span></body></html>`
        : readFileSync(new URL(path, dist));
      route.fulfill({ body, contentType: path.endsWith('.css') ? 'text/css' : path.endsWith('.html') ? 'text/html' : 'font/woff2' });
    });
    await page.goto('http://fonts.test/index.html');
    await page.evaluate(() => document.fonts.ready);
    const text = fetched.filter((file) => file.startsWith('roboto-') || file.startsWith('noto-sans-')).sort();
    assert.ok(text.includes('roboto-latin-400.woff2'), `latin 400 not fetched: ${text}`);
    assert.ok(text.includes('roboto-cyrillic-400.woff2'), `cyrillic not fetched for Russian text: ${text}`);
    assert.ok(text.includes('roboto-latin-700.woff2'), `emphasized label did not fetch the 700 face: ${text}`);
    assert.ok(!text.some((file) => /greek|devanagari|vietnamese/.test(file)), `unused subsets fetched: ${text}`);
  } finally {
    await browser.close();
  }
});
