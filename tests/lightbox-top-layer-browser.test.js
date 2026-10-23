// An open Lightbox puts its overlay, image and caption in the top layer as
// manual popovers. The image still zooms in place from its thumbnail and back,
// above a non-modal sheet, out of a clipping and transformed container, and
// Tab still closes it rather than being trapped.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="teal"/></svg>')}`;

for (const [engine, browserType, browserTest] of engines) {
  browserTest(`${engine}: a lightbox zooms in place out of a clipping, transformed container and above a sheet`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body style="margin: 0; height: 2000px">
        <dialog class="side-sheet" id="sheet" style="width: 300px">Sheet</dialog>
        <div id="clip" style="margin: 100px 0 0 400px; width: 130px; height: 90px; overflow: hidden; transform: translateX(10px)">
          <img id="photo" class="lightboxed" src="${image}" width="120" height="80" alt="Teal" data-caption="Teal" tabindex="0" role="button">
        </div><button id="after">After</button><script>${js}</script></body></html>`);
      await page.evaluate(() => {
        document.getElementById('sheet').show();
        window.box = Expressive.Lightbox.init(document.getElementById('photo'), { inDuration: 200, outDuration: 200 });
      });
      const thumb = await page.evaluate(() => document.getElementById('photo').getBoundingClientRect().toJSON());
      await page.waitForTimeout(500);
      // A point on the sheet, which must be covered once the lightbox is open.
      const onSheet = await page.evaluate(() => {
        const r = document.getElementById('sheet').getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2];
      });
      assert.equal(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('#sheet')?.id, onSheet), 'sheet');
      // Reads the image box, and what is drawn at the viewport's centre and corner.
      const read = () => page.evaluate(() => ({
        rect: document.getElementById('photo').getBoundingClientRect().toJSON(),
        centre: document.elementFromPoint(400, 300)?.id,
        corner: document.elementFromPoint(5, 5)?.id,
        sheet: document.elementFromPoint(...window.onSheet)?.id,
        clip: document.getElementById('clip').style.overflow
      }));

      await page.evaluate((point) => { window.onSheet = point; box.open(); }, onSheet);
      const start = await read();
      assert.ok(Math.abs(start.rect.left - thumb.left) < 1 && Math.abs(start.rect.top - thumb.top) < 1, 'it starts from the thumbnail');
      // doneAnimating follows a timer, which a loaded run can fire before the CSS transition ends.
      await page.waitForFunction(() => box.doneAnimating && !document.getElementById('photo').getAnimations().length);
      const open = await read();
      assert.ok(Math.abs(open.rect.left + open.rect.width / 2 - 400) < 1 && Math.abs(open.rect.top + open.rect.height / 2 - 300) < 1, 'and ends centred');
      assert.equal(open.centre, 'photo', 'over the sheet and out of its clipping container');
      assert.equal(open.corner, 'lightbox-overlay', 'over a viewport-wide overlay');
      assert.ok(['lightbox-overlay', 'photo'].includes(open.sheet), `the sheet is covered, hit ${open.sheet}`);
      assert.equal(open.clip, 'hidden', 'which keeps its overflow');

      await page.keyboard.press('Tab');
      await page.waitForTimeout(80);
      const closing = await read();
      assert.ok(closing.rect.width < open.rect.width, 'Tab closes it, zooming back');
      // doneAnimating follows a timer, which a loaded run can fire before the CSS transition ends.
      await page.waitForFunction(() => box.doneAnimating && !document.getElementById('photo').getAnimations().length);
      const closed = await page.evaluate(() => ({
        rect: document.getElementById('photo').getBoundingClientRect().toJSON(),
        popover: document.getElementById('photo').hasAttribute('popover'),
        layer: document.querySelectorAll('#lightbox-overlay, .lightbox-caption').length
      }));
      assert.deepEqual({ left: Math.round(closed.rect.left), top: Math.round(closed.rect.top) }, { left: Math.round(thumb.left), top: Math.round(thumb.top) }, 'to the thumbnail');
      assert.deepEqual({ popover: closed.popover, layer: closed.layer }, { popover: false, layer: 0 });
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a lightbox closed by scrolling zooms back to where its thumbnail has scrolled`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body style="margin: 0; height: 3000px">
        <div style="padding: 200px 0 0 300px"><img id="photo" class="lightboxed" src="${image}" width="120" height="80" alt="Teal"></div>
        <script>${js}</script></body></html>`);
      await page.evaluate(() => { window.box = Expressive.Lightbox.init(document.getElementById('photo'), { inDuration: 0, outDuration: 300 }); box.open(); });
      // doneAnimating follows a timer, which a loaded run can fire before the CSS transition ends.
      await page.waitForFunction(() => box.doneAnimating && !document.getElementById('photo').getAnimations().length);
      await page.evaluate(() => window.scrollTo(0, 150));
      await page.waitForTimeout(150);
      await page.evaluate(() => window.scrollTo(0, 250));
      await page.waitForFunction(() => box.doneAnimating && !document.getElementById('photo').hasAttribute('popover'));
      const top = await page.evaluate(() => document.getElementById('photo').getBoundingClientRect().top);
      assert.equal(Math.round(top), 200 - 250);
    } finally {
      await browser.close();
    }
  });
}
