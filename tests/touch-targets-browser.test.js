// WCAG 2.5.8: a target is at least 24 by 24 CSS pixels, or has room around
// it. A dot map marker is 16dp and sits on the map, itself a target, so its
// tap area has to be larger than the dot.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const browserTest = existsSync(chromium.executablePath()) ? test : test.skip;

browserTest('a dot map marker takes taps 20px from its centre', async () => {
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 400, height: 400 }, hasTouch: true });
    await page.setContent(`<style>${css}</style>
      <div class="map" style="position: relative; width: 300px; height: 300px">
        <button id="marker" type="button" class="map-marker" aria-label="Loop" style="left: 140px; top: 140px">
          <span class="map-marker-label">Loop</span>
        </button>
      </div>`);
    const hits = await page.evaluate(() => {
      const marker = document.getElementById('marker');
      const box = marker.getBoundingClientRect();
      const [x, y] = [box.left + box.width / 2, box.top + box.height / 2];
      const at = (dx, dy) => marker.contains(document.elementFromPoint(x + dx, y + dy));
      return { size: box.width, near: [at(20, 0), at(-20, 0), at(0, 20), at(0, -20)], far: at(30, 0) };
    });
    assert.ok(hits.size < 24, `the dot itself stays small: ${hits.size}`);
    assert.deepEqual(hits.near, [true, true, true, true], 'a tap 20px from the centre still lands on the marker');
    assert.equal(hits.far, false, 'past the 48px area the map takes the tap');
  } finally {
    await browser.close();
  }
});
