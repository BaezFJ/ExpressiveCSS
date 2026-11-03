// Rendering that only a real engine shows: focus rings on controls whose
// focused element is invisible or faint, target sizes, RTL handle positions,
// a hidden control the component display rule kept showing, and the modal
// rail's scrim, which dimmed the rail itself.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

const html = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<input class="otp" id="otp" autocomplete="one-time-code" inputmode="numeric" aria-label="Code">
<div class="file-field"><label class="button" id="upload">Upload<input type="file" id="file"></label>
  <div class="file-path-wrapper"><input class="file-path" type="text" id="path" aria-label="File"></div></div>
<ul role="tree"><li role="treeitem" tabindex="0" id="row" aria-selected="false"><span>Row</span></li></ul>
<div class="carousel"><ul class="indicators">
  <li><button class="indicator-item" id="dot" aria-label="Slide 1"></button></li>
  <li><button class="indicator-item" id="dot2" aria-label="Slide 2"></button></li></ul></div>
<div dir="rtl">
  <label class="switch"><input type="checkbox" role="switch" id="off"> Off</label>
  <label class="switch"><input type="checkbox" role="switch" id="on" checked> On</label>
</div>
<div class="map"><div class="map-controls"><button class="icon-button" id="fullscreen" hidden aria-label="Fullscreen">x</button></div></div>
<nav class="navigation-rail expanded modal" id="rail" aria-label="Main"><a href="#">Home</a></nav>
</body></html>`;

for (const [name, browserType, browserTest] of engines) {
  browserTest(`${name}: focus rings, dot targets, RTL switches, hidden map controls and the modal rail surface`, { timeout: 30000 }, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
      await page.setContent(html);
      const style = (selector, property) => page.$eval(selector, (el, property) => getComputedStyle(el)[property], property);

      // The file input is invisible inside its label, so the label shows the ring.
      await page.focus('#otp');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'file');
      assert.equal(await style('#upload', 'outlineStyle'), 'solid', 'the file trigger shows no focus ring');

      // A tree select row's 10% focus layer alone is too faint, so it takes the ring.
      await page.focus('#path');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'row');
      assert.equal(await style('#row > span', 'outlineStyle'), 'solid', 'the focused tree row shows no ring');

      // Each paging dot is a 24px target, side by side.
      const dots = await page.$$eval('.indicator-item', (items) => items.map((item) => item.getBoundingClientRect().toJSON()));
      assert.deepEqual(dots.map(({ width, height }) => [width, height]), [[24, 24], [24, 24]]);
      assert.ok(dots[1].left - dots[0].left >= 24, 'the dot targets overlap');

      // Off sits at the start edge, which is the right in RTL, and on at the end.
      // Engines serialize the right-edge offset differently.
      assert.match(await style('#off', 'backgroundPositionX'), /^(calc\(100% - 6px\)|right 6px)$/, 'an RTL switch puts off on the left');
      assert.match(await style('#on', 'backgroundPositionX'), /^(calc\(100% - 22px\)|right 22px)$/, 'an RTL switch puts on on the left');

      // .icon-button's display beat [hidden].
      assert.equal(await style('#fullscreen', 'display'), 'none');

      // The scrim dims the page, not the modal rail's own surface.
      const sample = async () => (await page.screenshot({ clip: { x: 40, y: 400, width: 4, height: 4 } })).toString('base64');
      const withScrim = await sample();
      const noScrim = await page.addStyleTag({ content: '.navigation-rail::before { background: transparent !important; }' });
      const surface = await sample();
      await noScrim.evaluate((el) => el.remove());
      assert.equal(withScrim, surface, 'the scrim dims the modal rail');

      // Forced colors drop the gradients that draw the code's cells; only Chromium emulates it.
      if (name === 'chromium') {
        await page.emulateMedia({ forcedColors: 'active' });
        const otp = await page.$eval('#otp', (el) => [getComputedStyle(el).forcedColorAdjust, getComputedStyle(el).backgroundImage]);
        assert.equal(otp[0], 'none');
        assert.match(otp[1], /linear-gradient/, 'the one-time code cells vanish in forced colors');
      }
    } finally {
      await browser.close();
    }
  });
}
