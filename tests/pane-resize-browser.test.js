import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const layout = (id, classes, dir = 'ltr') => `<div style="width:1000px;height:200px" dir="${dir}">
  <div id="${id}" class="panes ${classes}">
    ${classes.includes('supporting') && !classes.includes('start') ? '<div class="primary-pane">Primary</div>' : '<div class="list-pane">List</div>'}
    <button type="button" class="drag-handle" aria-label="Resize pane"></button>
    ${classes.includes('supporting') && !classes.includes('start') ? '<div class="supporting-pane">Supporting</div>' : '<div class="detail-pane">Detail</div>'}
  </div></div>`;

const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body style="margin:0">
${layout('ld', 'list-detail')}
${layout('sp', 'supporting')}
${layout('rtl', 'list-detail', 'rtl')}
${layout('sep', 'list-detail separated')}
<script>${js}</script>
</body></html>`;

for (const [name, engine, test] of engines) {
  test(`${name}: a drag handle between panes resizes by pointer, keyboard and click`, { timeout: 30000 }, async (t) => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, hasTouch: true });
      await page.setContent(markup);
      const width = (selector) => page.locator(selector).evaluate((el) => Math.round(el.getBoundingClientRect().width));
      const handle = (id) => page.locator(`#${id} > .drag-handle`);

      assert.equal(await width('#ld > .list-pane'), 360, 'the list starts at its token width');
      const box = await handle('ld').boundingBox();
      const list = await page.locator('#ld > .list-pane').boundingBox();
      assert.ok(Math.abs(box.x - (list.x + list.width)) < 1, 'the handle takes the spacer column beside the list');

      // Pointer drag.
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2, { steps: 5 });
      await page.mouse.up();
      assert.equal(await width('#ld > .list-pane'), 460, 'dragging right widens the list');
      assert.equal(await page.locator('#ld').evaluate((el) => el.style.getPropertyValue('--md-comp-pane-list-width')), '460px');

      // Keyboard.
      await handle('ld').focus();
      await page.keyboard.press('ArrowLeft');
      assert.equal(await width('#ld > .list-pane'), 444);
      await page.keyboard.press('Shift+ArrowRight');
      assert.equal(await width('#ld > .list-pane'), 508);
      await page.keyboard.press('Home');
      assert.equal(await width('#ld > .list-pane'), 240, 'Home goes to the narrowest');
      await page.keyboard.press('End');
      const widest = await width('#ld > .list-pane');
      assert.equal(widest, 1000 - 48 - 24 - 360, 'End leaves the other pane its minimum width');

      // Click cycles: from widest back to narrowest, then the middle.
      await handle('ld').click();
      assert.equal(await width('#ld > .list-pane'), 240, 'a click from the widest steps to the narrowest');
      await handle('ld').click();
      assert.equal(await width('#ld > .list-pane'), Math.round((240 + widest) / 2), 'then to the middle');
      await page.keyboard.press('Enter');
      assert.equal(await width('#ld > .list-pane'), widest, 'Enter steps too');

      // Supporting pane trails the handle: moving right narrows it.
      await handle('sp').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await width('#sp > .supporting-pane'), 344, 'the supporting pane is the one resized');
      assert.equal(await page.locator('#sp').evaluate((el) => el.style.getPropertyValue('--md-comp-pane-supporting-width')), '344px');

      // RTL mirrors the layout, and Right moves the boundary toward the list's outer edge.
      await handle('rtl').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await width('#rtl > .list-pane'), 344, 'in RTL the list sits to the right, so Right narrows it');

      // The separated appearance pads the layout; End still leaves the other pane its minimum.
      await handle('sep').focus();
      await page.keyboard.press('End');
      assert.equal(await width('#sep > .detail-pane'), 360, 'padding is not counted as room');

      // A touch drag ends without a click; the next Enter must still step.
      if (name === 'chromium') {
        const touch = await page.context().newCDPSession(page);
        const b = await handle('ld').boundingBox();
        const [x, y] = [b.x + b.width / 2, b.y + b.height / 2];
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let i = 1; i <= 5; i++) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - i * 10, y }] });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        const dragged = await width('#ld > .list-pane');
        assert.ok(dragged < widest, 'the touch drag moved the boundary');
        await handle('ld').focus();
        await page.keyboard.press('Enter');
        const stepped = await width('#ld > .list-pane');
        assert.notEqual(stepped, dragged, 'Enter after a touch drag still steps');
      }

      // Compact widths show one pane and no handle.
      await page.locator('#ld').evaluate((el) => { el.parentElement.style.width = '700px'; el.parentElement.style.containerType = 'inline-size'; });
      assert.equal(await handle('ld').isVisible(), false, 'the handle hides below 840px');
      assert.equal(await page.getByRole('button', { name: 'Resize pane', includeHidden: true }).count(), 4, 'every handle is a named button');
    } finally {
      await browser.close();
    }
  });
}
