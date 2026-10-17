import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;
const engines = Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name);
const row = (n) => `<li id="item-${n}"><span class="drag-handle" aria-hidden="true"></span><span>Song ${n}</span>
  <span class="sortable-actions">
    <button type="button" class="icon-button" data-move="up" aria-label="Move Song ${n} up"><span class="material-symbols" aria-hidden="true">arrow_upward</span></button>
    <button type="button" class="icon-button" data-move="down" aria-label="Move Song ${n} down"><span class="material-symbols" aria-hidden="true">arrow_downward</span></button>
  </span></li>`;
const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<ul id="list" class="list sortable" aria-label="Playlist">${[1, 2, 3, 4].map(row).join('')}</ul>
<script>window.__changes = []; document.getElementById('list').addEventListener('change', (e) => window.__changes.push([e.detail.item.id, e.detail.from, e.detail.to]));</script>
<script>${js}</script></body></html>`;

for (const [name, engine] of engines) {
  test(`${name}: a sortable list reorders by move buttons and by dragging its handles`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 700 } });
      await page.setContent(markup);
      const order = () => page.locator('#list > li').evaluateAll((items) => items.map((li) => li.id.slice(5)).join(''));
      const changes = () => page.evaluate(() => window.__changes);

      await page.getByRole('button', { name: 'Move Song 1 down' }).click();
      assert.equal(await order(), '2134');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Move Song 1 down', 'focus stays on the pressed button');
      await page.keyboard.press('Enter');
      assert.equal(await order(), '2314', 'the keyboard repeats the move');
      assert.equal(await page.locator('[aria-live="polite"]').textContent(), 'Moved to position 3 of 4');
      await page.getByRole('button', { name: 'Move Song 2 up' }).click();
      assert.equal(await order(), '2314', 'the first item does not move up');
      assert.deepEqual(await changes(), [['item-1', 0, 1], ['item-1', 1, 2]]);

      // Drag item 4 above item 2 by its handle.
      const handle = await page.locator('#item-4 .drag-handle').boundingBox();
      const top = await page.locator('#item-2').boundingBox();
      await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
      await page.mouse.down();
      assert.equal(await page.locator('#item-4').evaluate((el) => el.classList.contains('dragged')), true, 'the dragged row lifts');
      await page.mouse.move(handle.x + handle.width / 2, top.y + 4, { steps: 12 });
      await page.mouse.up();
      assert.equal(await order(), '4231');
      assert.equal(await page.locator('#item-4').evaluate((el) => el.classList.contains('dragged')), false);
      assert.deepEqual((await changes()).at(-1), ['item-4', 3, 0], 'one change for the whole drag');

      // Escape puts a dragged item back.
      const h3 = await page.locator('#item-3 .drag-handle').boundingBox();
      const first = await page.locator('#item-4').boundingBox();
      await page.mouse.move(h3.x + h3.width / 2, h3.y + h3.height / 2);
      await page.mouse.down();
      await page.mouse.move(h3.x + h3.width / 2, first.y + 4, { steps: 12 });
      assert.notEqual(await order(), '4231', 'the row moves during the drag');
      await page.keyboard.press('Escape');
      await page.mouse.up();
      assert.equal(await order(), '4231', 'Escape restores the order');
      assert.equal((await changes()).length, 3, 'a cancelled drag fires no change');
    } finally {
      await browser.close();
    }
  });

  test(`${name}: Escape that cancels a drag in a modal dialog leaves the dialog open`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 700 } });
      await page.setContent(markup);
      await page.evaluate(() => {
        const dialog = document.createElement('dialog');
        dialog.append(document.getElementById('list'));
        document.body.append(dialog);
        dialog.showModal();
      });
      const handle = await page.locator('#item-2 .drag-handle').boundingBox();
      await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
      await page.mouse.down();
      await page.keyboard.press('Escape');
      await page.mouse.up();
      assert.equal(await page.locator('#item-2').evaluate((el) => el.classList.contains('dragged')), false, 'Escape cancels the drag');
      assert.equal(await page.locator('dialog').evaluate((el) => el.open), true, 'Escape also closed the dialog');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('dialog').evaluate((el) => el.open), false, 'with no drag, Escape closes the dialog');
    } finally {
      await browser.close();
    }
  });
}
