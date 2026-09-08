import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;
  browserTest(`expanding-card completion follows CSS and survives interruption (${engine})`, async () => {
    const browser = await browserType.launch({ headless: true });
    let page;
    try {
      page = await browser.newPage({ reducedMotion: 'no-preference' });
      await page.setContent(`<style>${css}</style>
        <button id="outside">Outside</button>
        <article class="expanding-card" style="width:300px;height:180px;margin:40px">
          <button class="expanding-card-trigger" type="button">Open detail</button>
          <dialog class="expanding-card-dialog" aria-label="Detail">
            <button class="expanding-card-close" type="button">Back</button>
            <div class="expanding-card-content">Detail content</div>
          </dialog>
        </article>`);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => {
        window.card = document.querySelector('article');
        window.dialog = card.querySelector('dialog');
        window.instance = Expressive.ExpandingCard.getInstance(card);
        window.trigger = card.querySelector('.expanding-card-trigger');
      });
      const open = duration => page.evaluate(async duration => {
        card.style.setProperty('--md-comp-expanding-card-motion-duration', duration);
        instance.open();
        dialog.getAnimations().forEach(animation => animation.finish());
        await Promise.resolve();
      }, duration);
      await open('0ms');
      assert.deepEqual(await page.evaluate(() => {
        instance.close();
        return [dialog.open, instance.isOpen, document.activeElement === trigger];
      }), [false, false, true], 'zero duration closes immediately and restores focus');
      // Drain the native close event before starting a separate scenario.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));

      await open('1.2s');
      await page.evaluate(() => instance.close());
      await page.waitForTimeout(650);
      assert.equal(await page.evaluate(() => dialog.open), true, 'long CSS transition must outlive 500ms');
      await page.evaluate(async () => {
        const transitions = dialog.getAnimations();
        if (!transitions.some(animation => animation.transitionProperty === 'clip-path')) throw new Error('No container transition');
        transitions.forEach(animation => animation.finish());
        await Promise.allSettled(transitions.map(animation => animation.finished));
      });
      await page.waitForFunction(() => !dialog.open);
      assert.equal(await page.evaluate(() => document.activeElement === trigger), true);

      await open('1.2s');
      await page.evaluate(() => { instance.close(); instance.open(); });
      await page.waitForTimeout(650);
      assert.deepEqual(await page.evaluate(() => [dialog.open, instance.isOpen, trigger.ariaExpanded]), [true, true, 'true'], 'reopening invalidates old completion');

      await page.evaluate(() => {
        instance.close();
        dialog.style.transition = 'none';
        void dialog.offsetWidth;
      });
      await page.waitForFunction(() => !dialog.open);
      await page.evaluate(() => { dialog.style.removeProperty('transition'); });
      await open('1.2s');
      await page.evaluate(() => {
        instance.close();
        dialog.close();
        instance.open();
      });
      await page.waitForTimeout(100);
      assert.deepEqual(await page.evaluate(() => [dialog.open, instance.isOpen]), [true, true], 'queued native close cannot reset a reopened card');

      await page.evaluate(() => {
        instance.close();
        card.remove();
        document.querySelector('#outside').focus();
      });
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'outside', 'removed card cannot steal focus');
      await page.evaluate(() => {
        instance.destroy();
        document.body.append(card);
        window.instance = Expressive.ExpandingCard.init(card);
        instance.open();
        instance.close();
        instance.destroy();
        document.querySelector('#outside').focus();
      });
      await page.waitForTimeout(100);
      assert.deepEqual(await page.evaluate(() => [dialog.open, instance.isOpen, trigger.ariaExpanded, document.activeElement.id]), [false, false, 'false', 'outside']);
    } finally {
      await page?.evaluate(() => window.instance?.destroy()).catch(() => {});
      await browser.close();
    }
  });

  browserTest(`scale and expanding cards respect changing motion preferences (${engine})`, async () => {
    const browser = await browserType.launch({ headless: true });
    let page;
    try {
      page = await browser.newPage({ reducedMotion: 'no-preference' });
      await page.setContent(`<style>${css}</style>
        <button id="toggle">Toggle</button><div id="scaled" class="scale-transition scale-out">Content</div>
        <article class="expanding-card" style="width:300px;height:180px;margin:40px">
          <button class="expanding-card-trigger">Open</button>
          <dialog class="expanding-card-dialog" aria-label="Detail"><button class="expanding-card-close">Back</button></dialog>
        </article>`);
      await page.addScriptTag({ content: js });
      const started = await page.evaluate(() => {
        window.instance = Expressive.ExpandingCard.getInstance(document.querySelector('article'));
        document.querySelector('#toggle').focus();
        const el = document.querySelector('#scaled');
        void el.offsetWidth;
        el.classList.add('scale-in');
        const animations = el.getAnimations();
        // Keep the transition active until the next protocol call changes the preference.
        animations.forEach(animation => animation.pause());
        return animations.length > 0;
      });
      assert.equal(started, true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.deepEqual(await page.locator('#scaled').evaluate(el => [getComputedStyle(el).transitionProperty, getComputedStyle(el).transform, el.getAnimations().length, document.activeElement.id]), ['none', 'matrix(1, 0, 0, 1, 0, 0)', 0, 'toggle']);
      await page.locator('#scaled').evaluate(el => el.classList.remove('scale-in'));
      assert.deepEqual(await page.locator('#scaled').evaluate(el => [getComputedStyle(el).transform, el.getAnimations().length]), ['matrix(0, 0, 0, 0, 0, 0)', 0]);
      assert.deepEqual(await page.evaluate(() => {
        instance.open(); instance.close();
        return [document.querySelector('dialog').open, document.activeElement.className];
      }), [false, 'expanding-card-trigger']);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(async () => {
        instance.open();
        const dialog = document.querySelector('dialog');
        dialog.getAnimations().forEach(animation => animation.finish());
        await Promise.resolve();
        instance.close();
      });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => !document.querySelector('dialog').open);
    } finally {
      await page?.evaluate(() => window.instance?.destroy()).catch(() => {});
      await browser.close();
    }
  });
}
