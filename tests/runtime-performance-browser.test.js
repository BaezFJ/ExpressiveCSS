// Rendering costs that only show in a real engine: which modal backdrops
// blur the page, the carousel parallax transition, lightbox layers, and where
// the loading indicator's spin runs.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

const html = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<dialog id="basic"><h2>Title</h2><p>Body</p></dialog>
<dialog class="side-sheet" id="side"><p>Side</p></dialog>
<dialog class="bottom-sheet" id="bottom"><p>Bottom</p></dialog>
<div class="carousel"><div class="carousel-track">
  <a class="carousel-item" href="#"><img id="slide" alt="" width="40" height="40"></a>
</div></div>
<img class="lightboxed" id="thumb" alt="" width="40" height="40">
<span class="loading-indicator" role="status" aria-label="Loading" id="indicator"></span>
<div class="loading-overlay" id="overlay"><span class="loading-indicator contained" role="status" aria-label="Loading"></span></div>
</body></html>`;

// Each CSS animation on an element or its ::before: name, where, and play
// state. Transitions, such as the overlay's fade, are left out.
const animations = (page, selector) => page.$eval(selector, (el) =>
  el.getAnimations({ subtree: true })
    .filter((a) => a.effect.target === el && a.animationName)
    .map((a) => `${a.animationName}@${a.effect.pseudoElement || 'host'}:${a.playState}`)
    .sort());

for (const [name, browserType, browserTest] of engines) {
  browserTest(`${name}: backdrop blur, parallax, lightbox layers and the loading indicator spin`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
      await page.setContent(html);
      const style = (selector, property, pseudo = null) =>
        page.$eval(selector, (el, [property, pseudo]) => getComputedStyle(el, pseudo)[property], [property, pseudo]);

      // Only the basic dialog frosts the page; a modal sheet keeps the plain scrim.
      const backdrop = async (id) => {
        await page.$eval(`#${id}`, (dialog) => dialog.showModal());
        const filter = await style(`#${id}`, 'backdropFilter', '::backdrop');
        await page.$eval(`#${id}`, (dialog) => dialog.close());
        return filter;
      };
      assert.equal(await backdrop('basic'), 'blur(12px)');
      assert.equal(await backdrop('side'), 'none', 'a modal side sheet blurs the page');
      assert.equal(await backdrop('bottom'), 'none', 'a modal bottom sheet blurs the page');

      // The scroll handler writes the parallax every frame; a transition restarted on each write.
      assert.equal(await style('#slide', 'transitionDuration'), '0s', 'the parallax image transitions');

      // backface-visibility: hidden promoted every thumbnail to its own layer.
      assert.equal(await style('#thumb', 'backfaceVisibility'), 'visible');

      // The spin turns the host, apart from the clip-path morph on ::before.
      assert.deepEqual(await animations(page, '#indicator'), [
        'loading-indicator-morph@::before:running',
        'loading-indicator-spin@host:running',
      ]);

      // An idle overlay pauses both, and a busy one runs both.
      assert.deepEqual(await animations(page, '#overlay > .loading-indicator'), [
        'loading-indicator-morph@::before:paused',
        'loading-indicator-spin@host:paused',
      ]);
      await page.$eval('#overlay', (el) => el.setAttribute('aria-busy', 'true'));
      assert.deepEqual(await animations(page, '#overlay > .loading-indicator'), [
        'loading-indicator-morph@::before:running',
        'loading-indicator-spin@host:running',
      ]);

      // Reduced motion stops the spin on the host as well as the morph.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.deepEqual(await animations(page, '#indicator'), []);
    } finally {
      await browser.close();
    }
  });
}
