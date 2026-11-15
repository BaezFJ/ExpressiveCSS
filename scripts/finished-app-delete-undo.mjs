// Drives delete and Undo in a finished-app `destructive-list` build, in Chromium.
// Usage: node scripts/finished-app-delete-undo.mjs <app-dir>...
// Each app dir holds the build's index.html next to a built dist/. Controls are found
// by role and name, so the script works on any build. Prints one JSON line per app.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const DELETE = /^(delete|remove)\b/i;
const UNDO = /^undo$/i;
const ROW = 'li, [role=listitem], tr';
const wait = (ms) => new Promise((done) => setTimeout(done, ms));

// A row's key is its text without tooltips (which appear on focus), or the delete
// button's own name when no row element holds it.
const rowTexts = (page) => page.getByRole('button', { name: DELETE }).evaluateAll((buttons, row) => buttons.map((button) => {
  const holder = button.closest(row);
  if (!holder) return button.getAttribute('aria-label') || button.innerText.trim();
  const copy = holder.cloneNode(true);
  copy.querySelectorAll('.tooltip, [role="tooltip"]').forEach((tip) => tip.remove());
  return copy.textContent.replace(/\s+/g, ' ').trim();
}), ROW);

async function until(check, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await check()) return true;
    await wait(50);
  }
  return check();
}

async function deleteAndUndo(page) {
  const before = await rowTexts(page);
  if (before.length < 2) return { pass: false, reason: `found ${before.length} delete buttons` };
  const started = Date.now();
  await page.getByRole('button', { name: DELETE }).nth(1).click();
  const dialogOpen = async () => (await page.locator('dialog[open], [role=dialog], [role=alertdialog]').filter({ visible: true }).count()) > 0;
  const gone = async () => !(await rowTexts(page)).includes(before[1]);
  const settled = await until(async () => (await dialogOpen()) || gone(), 500);
  const removedMs = Date.now() - started;
  if (await dialogOpen()) return { pass: false, reason: 'a confirmation dialog opened' };
  if (!settled) return { pass: false, reason: 'the row was still there 500ms after the press' };
  const undo = page.getByRole('button', { name: UNDO }).first();
  if (!(await until(() => undo.isVisible(), 2000))) return { pass: false, reason: 'no Undo action', removedMs };
  await undo.click();
  const same = async () => JSON.stringify(await rowTexts(page)) === JSON.stringify(before);
  const restored = await until(same, 3000);
  await wait(2000);
  const stillRestored = await same();
  const focus = await page.evaluate((row) => {
    const holder = document.activeElement?.closest(row);
    if (!holder) return null;
    const copy = holder.cloneNode(true);
    copy.querySelectorAll('.tooltip, [role="tooltip"]').forEach((tip) => tip.remove());
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }, ROW);
  const reason = restored && stillRestored ? '' : 'the rows did not come back in their old order';
  return { pass: !reason, reason, removedMs, focusInRow: focus !== null, focusOnRestoredRow: focus === before[1] };
}

async function twoDeletes(page) {
  const before = await rowTexts(page);
  const button = page.getByRole('button', { name: DELETE });
  const undo = page.getByRole('button', { name: UNDO });
  await button.first().click();
  await wait(300);
  // Marks the first delete's Undo, so one still on screen doesn't count for the second.
  await undo.evaluateAll((buttons) => buttons.forEach((first) => first.setAttribute('data-first-undo', '')));
  await button.first().click();
  const undoShown = await until(() => undo.and(page.locator(':not([data-first-undo])')).first().isVisible(), 500);
  return { undoShownForSecond: undoShown, rowsBefore: before.length, rowsAfter: (await rowTexts(page)).length };
}

const firstLine = (error) => error.message.split('\n')[0];

async function check(browser, dir) {
  const url = pathToFileURL(resolve(dir, 'index.html')).href;
  const page = await browser.newPage();
  try {
    return await checkPage(page, url, dir);
  } catch (error) {
    return { app: dir, pass: false, reason: firstLine(error) };
  } finally {
    await page.close();
  }
}

async function checkPage(page, url, dir) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await wait(800);
  const gate = await deleteAndUndo(page).catch((error) => ({ pass: false, reason: firstLine(error) }));
  // Only the gating sequence's page errors fail the check; the second one is recorded.
  const gateErrors = errors.length;
  // The second sequence only means something once delete and Undo work at all.
  const second = gate.pass
    ? await page.goto(url).then(() => wait(800)).then(() => twoDeletes(page)).catch((error) => ({ error: firstLine(error) }))
    : null;
  const pass = gate.pass && !gateErrors;
  // gate goes first, so its own pass can't overwrite the one that counts page errors.
  return { app: dir, ...gate, pass, reason: gate.reason || (gateErrors ? 'page error' : ''), errors, twoDeletes: second };
}

if (process.argv.length < 3) {
  console.error('usage: node scripts/finished-app-delete-undo.mjs <app-dir>...');
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
