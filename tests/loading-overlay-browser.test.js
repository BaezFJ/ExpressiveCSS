// Loading overlay. Every case runs in real engines: jsdom has no `inert`, so
// it cannot show whether a busy region takes input or gets its state back.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const indicator = '<span class="loading-indicator contained" role="status" aria-label="Loading"></span>';
const html = `<style>${css}</style>
  <button id="before">Before</button>
  <div class="loading-overlay" id="region" style="width:300px;height:200px">
    ${indicator}
    <button id="save" onclick="window.clicks++">Save</button>
    <input id="field" aria-label="Name">
  </div>
  <button id="after">After</button>
  <div class="loading-overlay" id="early" aria-busy="true"
       data-loading-overlay-options='{"i18n":{"loading":"Cargando","loaded":"Listo"}}'>
    ${indicator}<button>Early</button>
  </div>
  <div class="loading-overlay" id="held" inert>${indicator}<button>Held</button></div>
  <script>${js}</script>
  <script>window.clicks = 0;</script>`;

async function open(browser) {
  const page = await browser.newPage({ viewport: { width: 600, height: 700 } });
  await page.setContent(html);
  await page.evaluate(() => Expressive.AutoInit());
  return page;
}

/** Sets or removes `aria-busy` on `#id`, then lets the observer run. */
const busy = (page, id, value) => page.evaluate(async ([id, value]) => {
  const el = document.getElementById(id);
  if (value === null) el.removeAttribute('aria-busy');
  else el.setAttribute('aria-busy', value);
  await new Promise(requestAnimationFrame);
}, [id, value]);

/** Waits until the region's scrim has finished fading out. */
const scrimHidden = (page, id) => page.waitForFunction((id) =>
  getComputedStyle(document.getElementById(id), '::after').visibility === 'hidden', id);

/** Clicks the middle of `selector` with the mouse, as a person would, past any scrim. */
async function clickAt(page, selector) {
  const box = await page.locator(selector).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: a busy region takes no click or Tab, and clearing it gives both back`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await open(browser);
      for (const clear of ['false', null]) {
        await busy(page, 'region', 'true');
        await clickAt(page, '#save');
        assert.equal(await page.evaluate(() => window.clicks), 0, 'a click inside the busy region does nothing');
        await page.focus('#before');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'after', 'Tab skips the busy region');

        await busy(page, 'region', clear);
        await scrimHidden(page, 'region');
        await clickAt(page, '#save');
        assert.equal(await page.evaluate(() => window.clicks), 1, `a click counts after aria-busy is ${clear ?? 'removed'}`);
        await page.focus('#before');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'save', 'Tab reaches the region again');
        await page.evaluate(() => { window.clicks = 0; });
      }
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a region busy at start is inert at once, and one inert before stays inert`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await open(browser);
      assert.equal(await page.evaluate(() => document.getElementById('early').inert), true, 'busy from the start');
      await busy(page, 'early', null);
      assert.equal(await page.evaluate(() => document.getElementById('early').inert), false);

      await busy(page, 'held', 'true');
      await busy(page, 'held', null);
      assert.equal(await page.evaluate(() => document.getElementById('held').inert), true, 'the author\'s inert is kept');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a status region after the region announces the start and the finish`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await open(browser);
      const status = (id) => page.evaluate((id) => {
        const region = document.getElementById(id);
        const next = region.nextElementSibling;
        return {
          isStatus: next.classList.contains('loading-overlay-status'),
          role: next.getAttribute('role'),
          inside: region.contains(next),
          inert: next.closest('[inert]') !== null,
          text: next.textContent
        };
      }, id);
      let now = await status('region');
      assert.deepEqual(now, { isStatus: true, role: 'status', inside: false, inert: false, text: '' });
      await busy(page, 'region', 'true');
      assert.equal((await status('region')).text, 'Loading');
      assert.equal((await status('region')).inert, false, 'the status stays outside the inert region');
      await busy(page, 'region', null);
      assert.equal((await status('region')).text, 'Loaded');

      // Words from the markup's options.
      assert.equal((await status('early')).text, 'Cargando');
      await busy(page, 'early', null);
      assert.equal((await status('early')).text, 'Listo');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: focus goes back to where it was when the region clears`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await open(browser);
      const active = () => page.evaluate(() => document.activeElement.id || document.activeElement.tagName);

      await page.focus('#field');
      await busy(page, 'region', 'true');
      assert.equal(await active(), 'BODY', 'inert drops focus');
      await busy(page, 'region', null);
      assert.equal(await active(), 'field', 'focus comes back');

      // A move the person made while it loaded stands.
      await busy(page, 'region', 'true');
      await page.focus('#after');
      await busy(page, 'region', null);
      assert.equal(await active(), 'after');

      // An element the page removed while it loaded is not refocused.
      await page.focus('#field');
      await busy(page, 'region', 'true');
      await page.evaluate(() => document.getElementById('field').remove());
      await busy(page, 'region', null);
      assert.equal(await active(), 'BODY');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: the scrim covers the busy region with the indicator in its centre`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await open(browser);
      const look = () => page.evaluate(() => {
        const region = document.getElementById('region');
        const spinner = region.querySelector('.loading-indicator');
        const scrim = getComputedStyle(region, '::after');
        const r = region.getBoundingClientRect();
        const s = spinner.getBoundingClientRect();
        return {
          scrim: { visibility: scrim.visibility, width: parseFloat(scrim.width), height: parseFloat(scrim.height) },
          spinner: getComputedStyle(spinner).visibility,
          offset: [Math.abs(s.x + s.width / 2 - (r.x + r.width / 2)), Math.abs(s.y + s.height / 2 - (r.y + r.height / 2))],
          size: [r.width, r.height]
        };
      });
      let now = await look();
      assert.equal(now.scrim.visibility, 'hidden', 'no scrim at rest');
      assert.equal(now.spinner, 'hidden', 'no indicator at rest');

      await busy(page, 'region', 'true');
      await page.waitForFunction(() => getComputedStyle(document.getElementById('region'), '::after').opacity === '1');
      now = await look();
      assert.equal(now.scrim.visibility, 'visible');
      assert.deepEqual([now.scrim.width, now.scrim.height], now.size, 'the scrim covers the region');
      assert.equal(now.spinner, 'visible');
      assert.ok(now.offset.every((d) => d < 1), `the indicator is centred: ${now.offset}`);

      await busy(page, 'region', null);
      await scrimHidden(page, 'region');
      assert.equal((await look()).spinner, 'hidden');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: destroy() removes the status region, gives inert back and stops following aria-busy`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await open(browser);
      const after = (id) => page.evaluate(async (id) => {
        const el = document.getElementById(id);
        Expressive.LoadingOverlay.getInstance(el).destroy();
        const result = { inert: el.inert, status: el.nextElementSibling?.classList.contains('loading-overlay-status') ?? false };
        el.setAttribute('aria-busy', 'true');
        await new Promise(requestAnimationFrame);
        result.inertAfterToggle = el.inert;
        return result;
      }, id);
      await busy(page, 'region', 'true');
      assert.deepEqual(await after('region'), { inert: false, status: false, inertAfterToggle: false }, 'destroyed while busy');
      assert.deepEqual(await after('held'), { inert: true, status: false, inertAfterToggle: true }, 'destroyed at rest keeps the author\'s inert');
    } finally {
      await browser.close();
    }
  });
}
