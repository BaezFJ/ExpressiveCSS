// Tooltips and snackbars over a modal <dialog>. A modal sits in the top layer,
// where no z-index reaches, so both used to paint under its backdrop. They now
// show as manual popovers. A snackbar's action under a modal stays inert, as
// everything outside a modal is; the bar is not moved into the dialog, which
// broke the dialog's :last-child action row.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: a tooltip and a snackbar paint above an open modal dialog`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>
        <dialog id="dialog"><h2>Edit item</h2><p>Body</p><form method="dialog"><button id="trigger">Save</button></form></dialog></body></html>`);
      await page.addScriptTag({ content: js });

      // Share of `selector`'s box painted in its own fill. Hit testing cannot
      // answer this: everything outside a modal is inert and is skipped.
      const painted = async (selector) => {
        const box = await page.evaluate((selector) => {
          const el = document.querySelector(selector);
          const r = el.getBoundingClientRect();
          const probe = document.createElement('canvas').getContext('2d');
          probe.fillStyle = getComputedStyle(el).backgroundColor;
          probe.fillRect(0, 0, 1, 1);
          return { x: r.left, y: r.top, width: r.width, height: r.height, fill: [...probe.getImageData(0, 0, 1, 1).data].slice(0, 3) };
        }, selector);
        const shot = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
        return page.evaluate(async ({ png, fill }) => {
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
      };

      await page.evaluate(() => {
        document.getElementById('dialog').showModal();
        window.tip = Expressive.Tooltip.init(document.getElementById('trigger'), { text: 'Saves the draft', enterDelay: 0, inDuration: 0, position: 'bottom' });
        window.tip.open();
      });
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.tooltip')).opacity === '1');
      const tooltip = await painted('.tooltip');
      assert.ok(tooltip > 0.5, `the tooltip is painted under the dialog: ${Math.round(tooltip * 100)}% of its box has its fill`);

      await page.evaluate(() => new Expressive.Snackbar({ text: 'Item saved', displayLength: Infinity, inDuration: 0 }));
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#snackbar-container > *')).opacity === '1');
      const bar = await painted('#snackbar-container > *');
      assert.ok(bar > 0.5, `the snackbar is painted under the dialog: ${Math.round(bar * 100)}% of its box has its fill`);

      const layout = await page.evaluate(() => ({
        parent: document.getElementById('snackbar-container').parentElement.tagName,
        actionRow: getComputedStyle(document.querySelector('#dialog > form')).display,
      }));
      assert.equal(layout.parent, 'BODY', 'the container stays in its portal root');
      assert.equal(layout.actionRow, 'flex', "the dialog's action row keeps its layout");
    } finally {
      await browser.close();
    }
  });
}
