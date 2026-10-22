import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const html = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
  <dialog class="bottom-sheet expandable" id="sheet" aria-label="Filters">
    <button type="button" class="drag-handle" aria-label="Sheet height" aria-expanded="false"></button>
    <h2>Filters</h2><div>${'<p>Option</p>'.repeat(40)}</div>
  </dialog>
  <script>${js}</script></body></html>`;

const VIEWPORT = 800;
const state = (page) => page.evaluate(() => {
  const sheet = document.getElementById('sheet');
  return {
    open: sheet.open,
    expanded: sheet.classList.contains('expanded'),
    aria: sheet.querySelector('.drag-handle').getAttribute('aria-expanded'),
    // The visible height, without the bleed below the viewport.
    height: Math.round(innerHeight - sheet.getBoundingClientRect().top)
  };
});

// A pointer drag on the handle, in steps so the sheet sees the movement.
const drag = async (page, dy) => {
  const box = await page.locator('#sheet .drag-handle').boundingBox();
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x, y + (dy * i) / 10);
  // Rest past the flick window, so the distance decides.
  await page.waitForTimeout(150);
  await page.mouse.up();
};

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: an expandable bottom sheet switches between two heights by handle and by drag`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 400, height: VIEWPORT } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => document.getElementById('sheet').showModal());

      const partial = { open: true, expanded: false, aria: 'false', height: VIEWPORT / 2 };
      const full = { open: true, expanded: true, aria: 'true', height: VIEWPORT - 72 };
      assert.deepEqual(await state(page), partial);

      // The handle button switches heights rather than closing.
      await page.focus('#sheet .drag-handle');
      await page.keyboard.press('Enter');
      assert.deepEqual(await state(page), full);
      await page.keyboard.press('Space');
      assert.deepEqual(await state(page), partial);

      // A drag up expands, and the click that ends it does not switch back.
      await drag(page, -100);
      assert.deepEqual(await state(page), full);
      // A drag down from expanded collapses rather than closing.
      await drag(page, 150);
      assert.deepEqual(await state(page), partial);
      // A drag down from partial dismisses.
      await drag(page, 150);
      assert.equal((await state(page)).open, false);

      // Closing put it back to partial for the next opening.
      await page.evaluate(() => {
        const sheet = document.getElementById('sheet');
        sheet.showModal();
        sheet.querySelector('.drag-handle').click();
        sheet.close();
      });
      await page.waitForFunction(() => !document.getElementById('sheet').classList.contains('expanded'));
      await page.evaluate(() => document.getElementById('sheet').showModal());
      assert.deepEqual(await state(page), partial);
    } finally {
      await browser.close();
    }
  });
}
