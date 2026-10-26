import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const canvas = '.timepicker-canvas';
const content = '.expanding-card-content';

async function setUp(page) {
  await page.setContent(`<!doctype html><html lang="en"><style>${css}</style>
    <div class="field"><input id="time" type="text"><label for="time">Time</label></div>
    <article class="expanding-card" style="width:300px;height:180px;margin:40px">
      <button class="expanding-card-trigger" type="button">Open detail</button>
      <dialog class="expanding-card-dialog" aria-label="Detail">
        <button class="expanding-card-close" type="button">Back</button>
        <div class="expanding-card-content">Detail content</div>
      </dialog>
    </article></html>`);
  await page.addScriptTag({ content: js });
  await page.evaluate(() => {
    window.picker = Expressive.Timepicker.init(document.querySelector('#time'), { vibrate: false });
    window.card = document.querySelector('article');
    window.instance = Expressive.ExpandingCard.getInstance(card);
    instance.open();
  });
}

const setToken = (page, [name, value]) => page.evaluate(([name, value]) => {
  document.documentElement.style.setProperty(name, value);
}, [name, value]);

const timing = (page, selector) => page.locator(selector).evaluate(el => {
  const style = getComputedStyle(el);
  const durations = style.transitionDuration.split(',').map(parseFloat);
  const delays = style.transitionDelay.split(',').map(parseFloat);
  return style.transitionProperty.split(',').map((property, i) => ({
    property: property.trim(), duration: durations[i % durations.length] * 1000,
    delay: delays[i % delays.length] * 1000,
  }));
});

for (const [engine, type, browserTest] of engines) {
  for (const preference of ['reduce', 'no-preference']) {
    browserTest(`timing overrides respect reduced motion from ${preference} (${engine})`, async () => {
      const browser = await leaseBrowser(type);
      let page;
      try {
        page = await browser.newPage({ reducedMotion: preference });
        await setUp(page);
        await setToken(page, ['--md-sys-motion-duration-short3', '430ms']);
        await setToken(page, ['--md-sys-motion-duration-short4', '470ms']);
        const started = await page.evaluate(() => {
          card.style.setProperty('--md-comp-expanding-card-content-delay', '900ms');
          const canvas = document.querySelector('.timepicker-canvas');
          const content = document.querySelector('.expanding-card-content');
          const dialog = card.querySelector('dialog');
          dialog.classList.remove('expanded');
          for (const target of [canvas, content]) target.getAnimations().forEach(a => a.finish());
          void dialog.offsetWidth;
          canvas.classList.add('timepicker-canvas-out');
          dialog.classList.add('expanded');
          return [canvas, content].map(target => {
            const animations = target.getAnimations();
            animations.forEach(a => a.pause());
            return animations.length;
          });
        });
        if (preference === 'no-preference') assert.ok(started.every(count => count > 0), 'both effects started');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        for (const [selector, opacity] of [[canvas, '0.25'], [content, '1']]) {
          assert.deepEqual(await page.locator(selector).evaluate(el => [
            getComputedStyle(el).transitionProperty, getComputedStyle(el).opacity, el.getAnimations().length,
          ]), ['none', opacity, 0]);
        }
        assert.equal(await page.locator(content).evaluate(el => getComputedStyle(el).transform), 'matrix(1, 0, 0, 1, 0, 0)');
      } finally {
        await page?.evaluate(() => { window.picker?.destroy(); window.instance?.destroy(); }).catch(() => {});
        await browser.close();
      }
    });
  }

  browserTest(`motion timing tokens update live (${engine})`, async t => {
    const browser = await leaseBrowser(type);
    let page;
    try {
      page = await browser.newPage({ reducedMotion: 'no-preference' });
      await setUp(page);
      await t.test('canvas reads short3', async () => {
        assert.equal((await timing(page, canvas))[0].duration, 150);
        await setToken(page, ['--md-sys-motion-duration-short3', '430ms']);
        assert.equal((await timing(page, canvas))[0].duration, 430);
      });
      await t.test('content reads short4', async () => {
        const before = await timing(page, content);
        assert.deepEqual(before.map(t => t.property), ['opacity', 'transform']);
        assert.deepEqual(before.map(t => t.delay), [200, 200]);
        await setToken(page, ['--md-sys-motion-duration-short4', '470ms']);
        const after = await timing(page, content);
        assert.deepEqual(after.map(t => t.delay), [470, 470]);
        assert.deepEqual(after.map(t => t.duration), before.map(t => t.duration));
      });
      await t.test('component delay overrides and restores the system value', async () => {
        await setToken(page, ['--md-sys-motion-duration-short4', '470ms']);
        for (const [value, expected] of [['90ms', 90], ['0ms', 0], ['', 470]]) {
          await page.locator('article').evaluate((el, value) => {
            el.style.setProperty('--md-comp-expanding-card-content-delay', value);
          }, value);
          assert.deepEqual((await timing(page, content)).map(t => t.delay), [expected, expected]);
        }
      });
    } finally {
      await page?.evaluate(() => { window.picker?.destroy(); window.instance?.destroy(); }).catch(() => {});
      await browser.close();
    }
  });
}
