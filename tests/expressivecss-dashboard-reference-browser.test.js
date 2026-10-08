import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const html = readFileSync(new URL('../skills/expressivecss/expressivecss-dashboard/assets/analytics-overview.html', import.meta.url), 'utf8');
const browserTest = existsSync(chromium.executablePath()) ? test : test.skip;

browserTest('dashboard reference sorts its table and moves aria-sort', { timeout: 30000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('http://dashboard.test/**', (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname.startsWith('/dist/')) return route.fulfill({ path: new URL(`..${pathname}`, import.meta.url).pathname });
      return route.fulfill({ body: html, contentType: 'text/html' });
    });
    await page.goto('http://dashboard.test/index.html', { waitUntil: 'load' });
    const table = page.getByRole('table', { name: 'Top events, last 28 days' });
    const firstRow = () => table.locator('tbody tr:first-child th').innerText();
    const sorted = () => table.locator('thead th[aria-sort]').evaluateAll((cells) => cells.map((cell) => [cell.innerText.trim(), cell.getAttribute('aria-sort')]));

    assert.deepEqual(await sorted(), [['RSVPs', 'descending']]);
    await table.getByRole('button', { name: 'RSVPs' }).click();
    assert.deepEqual(await sorted(), [['RSVPs', 'ascending']]);
    assert.equal(await firstRow(), 'Tool library open hours');

    await table.getByRole('button', { name: 'Show rate' }).click();
    assert.deepEqual(await sorted(), [['Show rate', 'descending']], 'a numeric column sorts largest first');
    assert.equal(await firstRow(), 'Saturday clean-up');

    await table.getByRole('button', { name: 'Event' }).click();
    assert.deepEqual(await sorted(), [['Event', 'ascending']], 'a text column sorts A to Z first');
    assert.equal(await firstRow(), 'Block party planning');
    assert.equal(await table.locator('tbody tr').count(), 5, 'sorting keeps every row');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
