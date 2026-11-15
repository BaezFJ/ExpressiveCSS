// Checks that a finished-app `filtered-dashboard` build keeps its tab, filter and page
// in the URL, in Chromium. Usage: node scripts/finished-app-url-state.mjs <app-dir>...
// Each app dir holds the build's index.html next to a built dist/. It picks a tab other
// than the first, a one-letter filter that leaves a second page, and that page, then
// compares the view after a reload and in a fresh page. Prints one JSON line per app.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const TABS = '.tabs > a, .tabs > li > a';
const LETTERS = ['a', 'e', 'o', 'i', 'r', 'n', 's', 't', 'l', 'u'];
const wait = (ms) => new Promise((done) => setTimeout(done, ms));

// The selected tab, the visible search value, the visible rows and any page status.
const snapshot = (page) => page.evaluate((tabs) => {
  const shown = (element) => element.checkVisibility();
  const visible = (selector) => [...document.querySelectorAll(selector)].filter(shown);
  return {
    tab: [...document.querySelectorAll(tabs)].find((link) => link.classList.contains('active'))?.textContent.trim() ?? null,
    search: (visible('[data-table-filter]')[0] ?? visible('input[type="search"]')[0])?.value ?? null,
    rows: visible('tbody tr').map((row) => row.innerText.trim()),
    status: visible('[data-table-page-status]').map((output) => output.textContent.trim()),
  };
}, TABS);

async function enabledNext(page) {
  // A table's own Next control first, then any visible button named Next.
  const own = page.locator('[data-table-page="next"]').filter({ visible: true }).first();
  const next = (await own.count()) ? own : page.getByRole('button', { name: /^next\b/i }).filter({ visible: true }).first();
  if (!(await next.count())) return null;
  const enabled = await next.evaluate((button) => !button.disabled && button.getAttribute('aria-disabled') !== 'true');
  return enabled ? next : null;
}

// Types one-letter filters until a second page exists, then goes to it.
async function reachSecondPage(page) {
  const own = page.locator('[data-table-filter]').filter({ visible: true }).first();
  const search = (await own.count()) ? own : page.locator('input[type="search"]').filter({ visible: true }).first();
  if (!(await search.count())) return { reason: 'no visible search field' };
  for (const letter of LETTERS) {
    await search.fill(letter);
    await wait(400);
    const next = await enabledNext(page);
    if (!next) continue;
    const before = await snapshot(page);
    await next.click();
    await wait(300);
    const after = await snapshot(page);
    if (JSON.stringify(after.rows) !== JSON.stringify(before.rows)) return { filter: letter };
  }
  return { reason: 'no one-letter filter left a second page' };
}

async function chooseView(page) {
  const tabs = page.locator(TABS).filter({ visible: true });
  const count = await tabs.count();
  if (count < 2) return { reason: `found ${count} tabs` };
  let last = { reason: 'no tab' };
  for (let index = 1; index < count; index++) {
    await tabs.nth(index).click();
    await wait(300);
    last = await reachSecondPage(page);
    if (last.filter) return { tabIndex: index, ...last };
  }
  return last;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function checkPage(browser, page, url, dir) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await wait(800);
  const choice = await chooseView(page);
  if (choice.reason) return { app: dir, pass: false, reason: choice.reason, errors };
  const expected = await snapshot(page);
  const saved = page.url();
  await page.reload();
  await wait(800);
  const reloaded = await snapshot(page);
  const fresh = await browser.newPage();
  fresh.on('pageerror', (error) => errors.push(error.message));
  try {
    await fresh.goto(saved);
    await wait(800);
    const opened = await snapshot(fresh);
    const scrollY = await fresh.evaluate(() => scrollY);
    const restored = same(reloaded, expected) && same(opened, expected);
    const reason = restored ? (errors.length ? 'page error' : '') : 'the view after reload differs';
    return { app: dir, pass: !reason, reason, ...choice, url: saved.split('/').pop(), expected, reloaded, opened, scrollY, errors };
  } finally {
    await fresh.close();
  }
}

async function check(browser, dir) {
  const page = await browser.newPage();
  try {
    return await checkPage(browser, page, pathToFileURL(resolve(dir, 'index.html')).href, dir);
  } catch (error) {
    return { app: dir, pass: false, reason: error.message.split('\n')[0] };
  } finally {
    await page.close();
  }
}

if (process.argv.length < 3) {
  console.error('usage: node scripts/finished-app-url-state.mjs <app-dir>...');
  process.exit(2);
}
const browser = await chromium.launch();
try {
  for (const dir of process.argv.slice(2)) {
    const result = await check(browser, dir);
    console.log(JSON.stringify(result));
    if (!result.pass) process.exitCode = 1;
  }
} finally {
  await browser.close();
}
