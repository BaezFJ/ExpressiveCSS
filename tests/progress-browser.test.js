import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

const html = `<style>${css}</style><body style="margin: 0; padding: 8px; width: 300px">
  <progress id="plain" class="progress" value="60" max="100"></progress>
  <progress id="stop" class="progress stop" value="60" max="100"></progress>
  <progress id="wavy" class="progress wavy" value="60" max="100"></progress>
  <div id="div-wavy" class="progress wavy stop"><div class="determinate" style="width: 40%"></div></div>
  <div id="bare-wavy" class="progress wavy" style="--md-comp-progress-value: 70%"></div>
  <div dir="rtl"><div id="rtl" class="progress stop"><div class="determinate" style="width: 30%"></div></div></div>
  <div id="indeterminate-wavy" class="progress wavy"><div class="indeterminate"></div></div>
  <span id="circle" class="progress circular determinate" style="--md-comp-progress-value: 65%"></span>
  <span id="circle-wavy" class="progress circular wavy determinate" style="--md-comp-progress-value: 65%"></span>
  <span id="spinner-wavy" class="progress circular wavy" role="status"></span>
</body>`;

for (const [engine, browserType, browserTest] of engines) {

  if (engine === 'chromium') browserTest('chromium: linear indeterminate progress avoids steady-state layout', async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
      const bars = ['', 'wavy'].map(variant => `
        <progress class="progress ${variant}"></progress>
        <div class="progress ${variant}"></div>
        <div class="progress ${variant}"><span class="indeterminate"></span></div>`).join('');
      await page.setContent(`<style>${css}</style><main style="display:grid;grid-template-columns:repeat(5,180px);gap:8px">${bars.repeat(10)}</main>`);
      await page.waitForTimeout(350);
      assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length), 100);
      const cdp = await page.context().newCDPSession(page);
      const events = [];
      cdp.on('Tracing.dataCollected', event => events.push(...event.value));
      const done = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve));
      await cdp.send('Tracing.start', { categories: 'devtools.timeline', transferMode: 'ReportEvents' });
      await page.waitForTimeout(500);
      await cdp.send('Tracing.end');
      await done;
      assert.equal(events.filter(event => event.name === 'Layout' && event.ph === 'X').length, 0);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: linear progress .stop marks the track's end and .wavy draws a wave`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      const shot = async (id) => (await page.locator(`#${id}`).screenshot()).toString('base64');

      const styles = await page.evaluate(() => {
        const style = (id, pseudo) => getComputedStyle(document.getElementById(id), pseudo);
        return {
          stop: style('stop').backgroundImage,
          rtl: style('rtl').backgroundImage,
          wavyHeight: style('wavy').height,
          plainHeight: style('plain').height,
          divMask: getComputedStyle(document.querySelector('#div-wavy > .determinate')).maskImage,
          bareMask: style('bare-wavy', '::after').maskImage,
          track: style('div-wavy').backgroundImage,
          wrapper: getComputedStyle(document.querySelector('#indeterminate-wavy > .indeterminate')).maskImage,
          moving: getComputedStyle(document.querySelector('#indeterminate-wavy > .indeterminate'), '::before').maskImage,
        };
      });
      assert.match(styles.stop, /radial-gradient/, 'the stop is a dot on the track');
      assert.match(styles.stop, /calc\(100% - 2px\)|98%|calc\(-2px \+ 100%\)/, `the dot sits at the inline end: ${styles.stop}`);
      assert.match(styles.rtl, /radial-gradient\(circle at 2px/, `in RTL the dot sits at the left: ${styles.rtl}`);
      assert.deepEqual([styles.plainHeight, styles.wavyHeight], ['4px', '14px'], 'a wavy bar is tall enough for its wave');
      assert.match(styles.divMask, /^url\(/, 'a determinate child is masked to the wave');
      assert.match(styles.bareMask, /^url\(/, 'a bare bar is masked to the wave');
      assert.match(styles.track, /radial-gradient.*linear-gradient/s, 'a wavy track keeps the stop over its stripe');
      assert.deepEqual([styles.wrapper, /^url\(/.test(styles.moving)], ['none', true], 'an indeterminate bar masks its moving bars, not its empty wrapper');

      // A wavy circle draws its indicator as a wave round the ring and its
      // track as a thin plain ring; the element itself draws nothing.
      const circle = await page.evaluate(() => {
        const style = (id, pseudo) => getComputedStyle(document.getElementById(id), pseudo);
        return {
          own: [style('circle-wavy').backgroundImage, style('circle-wavy').maskImage, style('circle-wavy').overflow],
          wave: /^url\(/.test(style('circle-wavy', '::before').maskImage),
          track: style('circle-wavy', '::after').maskImage.startsWith('radial-gradient'),
          spinner: [/^url\(/.test(style('spinner-wavy', '::before').maskImage), style('spinner-wavy', '::after').backgroundImage],
        };
      });
      assert.deepEqual(circle, { own: ['none', 'none', 'visible'], wave: true, track: true, spinner: [true, 'none'] },
        'the wave and the track are the pseudo-elements; a spinner has no track');
      assert.notEqual(await shot('circle-wavy'), await shot('circle'), 'the wavy ring is drawn');
      await page.emulateMedia({ forcedColors: 'active' });
      assert.equal(await page.locator('#circle-wavy').evaluate((el) => getComputedStyle(el).backgroundImage), 'none',
        'in forced colors a wavy ring still draws only on its pseudo-elements, with no disk behind');
      await page.emulateMedia({ forcedColors: 'none' });

      // Drawn: the stop and the wave change the bar.
      const [plain, stop, wavy] = [await shot('plain'), await shot('stop'), await shot('wavy')];
      assert.notEqual(stop, plain, 'the stop dot is drawn');
      assert.notEqual(wavy, plain, 'the wave is drawn');
    } finally {
      await browser.close();
    }
  });
}
