// Tooltips and snackbars over a modal <dialog>. A modal sits in the top layer,
// where no z-index reaches, and makes everything outside it inert. Before,
// both painted under the dialog's backdrop, and a snackbar's action shown
// during showModal() could not be clicked.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: a tooltip and a snackbar action sit above an open modal dialog`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>
        <dialog id="dialog"><p>Edit item</p><button id="trigger">Save</button></dialog></body></html>`);
      await page.addScriptTag({ content: js });

      // Topmost element at the centre of `el`, and whether it is `el` or inside it.
      const onTop = (selector) => page.evaluate((selector) => {
        const el = document.querySelector(selector);
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { onTop: el === hit || el.contains(hit), hit: hit?.tagName };
      }, selector);

      await page.evaluate(() => {
        document.getElementById('dialog').showModal();
        window.tip = Expressive.Tooltip.init(document.getElementById('trigger'), { text: 'Saves the draft', enterDelay: 0, inDuration: 0, position: 'bottom' });
        window.tip.open();
      });
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.tooltip')).opacity === '1');
      // A tooltip outside the modal is inert, and hit testing skips inert
      // elements, so check what is painted: the pixel just inside the
      // tooltip's start edge has to be the tooltip's own fill.
      const box = await page.evaluate(() => {
        const el = document.querySelector('.tooltip');
        const r = el.getBoundingClientRect();
        const probe = document.createElement('canvas').getContext('2d');
        probe.fillStyle = getComputedStyle(el).backgroundColor;
        probe.fillRect(0, 0, 1, 1);
        return { x: r.left, y: r.top, width: r.width, height: r.height, fill: [...probe.getImageData(0, 0, 1, 1).data].slice(0, 3) };
      });
      const shot = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
      // Share of the tooltip's box painted in its own fill. Under the dialog it
      // is the dialog surface or the backdrop instead; the text is the rest.
      const share = await page.evaluate(async ({ png, fill }) => {
        const img = new Image();
        img.src = `data:image/png;base64,${png}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height).data;
        let match = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (Math.max(...[0, 1, 2].map((k) => Math.abs(data[i + k] - fill[k]))) < 12) match++;
        }
        return match / (data.length / 4);
      }, { png: shot.toString('base64'), fill: box.fill });
      assert.ok(share > 0.5, `the tooltip is painted under the dialog: ${Math.round(share * 100)}% of its box has its fill`);

      await page.evaluate(() => {
        window.undone = false;
        new Expressive.Snackbar({ text: 'Item saved', action: 'Undo', onAction: () => { window.undone = true; }, displayLength: Infinity, inDuration: 0 });
      });
      const action = await onTop('#snackbar-container button');
      assert.ok(action.onTop, `the snackbar action is covered by ${action.hit}`);
      await page.click('#snackbar-container button');
      assert.equal(await page.evaluate(() => window.undone), true, 'the action runs while the modal is open');

      // "Saved", then close: the bar moves back out instead of closing with it.
      await page.evaluate(() => {
        new Expressive.Snackbar({ text: 'Draft saved', displayLength: Infinity, inDuration: 0 });
        document.getElementById('dialog').close();
      });
      // The dialog's close event fires a task later, so wait for the move.
      await page.waitForFunction(() => document.getElementById('snackbar-container').parentElement.tagName === 'BODY', null, { timeout: 2000 }).catch(() => {});
      const after = await page.evaluate(() => {
        const bar = document.querySelector('#snackbar-container > :last-child');
        return { parent: bar.parentElement.parentElement.tagName, height: bar.getBoundingClientRect().height };
      });
      assert.equal(after.parent, 'BODY', 'the container returns to the page');
      assert.ok(after.height > 0, 'the bar is still shown after the dialog closes');
    } finally {
      await browser.close();
    }
  });
}
