import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { compileString } from 'sass';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const glassOn = compileString('@use "expressive" with ($expressive-glass: true, $expressive-include-fonts: false);', {
  loadPaths: [new URL('../src/sass', import.meta.url).pathname],
  logger: { warn() {} },
}).css;

const markup = `
  <div id="off"><menu id="a"></menu></div>
  <div id="on" style="--expressive-glass: true; --expressive-glass-blur: 30px"><menu id="b"></menu></div>
  <div id="false" style="--expressive-glass: false"><menu id="c"></menu></div>
  <div style="--expressive-glass: true"><menu id="grouped" class="grouped"></menu></div>`;

const filters = page => page.evaluate(() =>
  Object.fromEntries(['a', 'b', 'c', 'grouped'].map(id => [id, getComputedStyle(document.getElementById(id)).backdropFilter])));

for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(type.executablePath()) ? test : test.skip;

  browserTest(`--expressive-glass switches frosted glass at runtime and yields to user preferences (${engine})`, async () => {
    const browser = await type.launch({ headless: true });
    try {
      const page = await browser.newPage();

      await page.setContent(`<style>${css}</style>${markup}`);
      assert.deepEqual(await filters(page), { a: 'none', b: 'blur(30px)', c: 'none', grouped: 'none' }, 'default build');
      const background = await page.locator('#b').evaluate(el => getComputedStyle(el).backgroundColor);
      assert.match(background, / \/ 0\.72\)$/, 'default opacity');

      // Playwright's Firefox does not restyle a loaded page when emulation
      // changes, so reload the content after switching.
      await page.emulateMedia({ contrast: 'more' });
      await page.setContent(`<style>${css}</style>${markup}`);
      assert.equal((await filters(page)).b, 'none', 'prefers-contrast: more');
      await page.emulateMedia({ contrast: null });
      await page.setContent(`<style>${css}</style>${markup}`);

      // Playwright has no reduced-transparency option; Chromium's CDP does.
      if (engine === 'chromium') {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
        assert.equal((await filters(page)).b, 'none', 'prefers-reduced-transparency: reduce');
        await cdp.send('Emulation.setEmulatedMedia', { features: [] });
      }

      await page.setContent(`<style>${glassOn}</style>${markup}`);
      assert.deepEqual(await filters(page), { a: 'blur(16px)', b: 'blur(30px)', c: 'none', grouped: 'none' }, '$expressive-glass: true');
    } finally {
      await browser.close();
    }
  });
}
