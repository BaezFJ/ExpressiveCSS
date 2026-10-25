// Hover card: hovering a link shows its card after enterDelay, against the
// link, and the card stays while the pointer is on it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const markup = `<style>${css} body { margin: 0 }</style>
<main>
  <button id="before" type="button">Before</button>
  <p style="margin: 100px"><a id="link" class="hover-card-trigger" href="#ada" aria-details="card">Ada Lovelace</a></p>
  <div id="card" class="popover" popover="hint">
    <h3>Ada Lovelace</h3>
    <p>Wrote the first published program.</p>
    <a id="inner" href="#profile">Profile</a>
  </div>
  <a id="after" href="#next">Next</a>
</main>
<script>${js}</script>`;

async function setUp(browserType) {
  const browser = await leaseBrowser(browserType);
  const page = await browser.newPage({ viewport: { width: 800, height: 600 }, reducedMotion: 'reduce' });
  await page.setContent(markup);
  await page.evaluate(() => Expressive.HoverCard.init(document.getElementById('link'), { enterDelay: 500, exitDelay: 300 }));
  const open = () => page.evaluate(() => document.getElementById('card').matches(':popover-open'));
  return { browser, page, open };
}

async function center(page, selector) {
  const box = await page.locator(selector).boundingBox();
  return [box.x + box.width / 2, box.y + box.height / 2];
}

for (const [name, browserType, browserTest] of engines) {
  browserTest(`${name}: hovering the link shows the card after the delay, and it stays while the pointer is on the card`, { timeout: 30000 }, async () => {
    const { browser, page, open } = await setUp(browserType);
    try {
      await page.mouse.move(...await center(page, '#link'));
      await page.waitForTimeout(200);
      assert.equal(await open(), false, 'nothing shows before enterDelay');
      await page.waitForFunction(() => document.getElementById('card').matches(':popover-open'), null, { timeout: 2000 });

      const place = await page.evaluate(() => {
        const card = document.getElementById('card');
        return {
          top: card.getBoundingClientRect().top,
          linkBottom: document.getElementById('link').getBoundingClientRect().bottom,
          gap: parseFloat(getComputedStyle(card).getPropertyValue('--md-comp-popover-gap'))
        };
      });
      assert.ok(Math.abs(place.top - (place.linkBottom + place.gap)) <= 2, `card top ${place.top}, link bottom ${place.linkBottom}, gap ${place.gap}`);

      await page.mouse.move(...await center(page, '#card'), { steps: 5 });
      await page.waitForTimeout(600);
      assert.equal(await open(), true, 'the card stays while the pointer is on it');

      await page.mouse.move(5, 590, { steps: 5 });
      await page.waitForTimeout(600);
      assert.equal(await open(), false, 'the card hides once the pointer has left both for exitDelay');
    } finally {
      await browser.close();
    }
  });
}
