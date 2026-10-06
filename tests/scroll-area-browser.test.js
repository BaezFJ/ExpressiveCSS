import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  browserTest(`scroll area keeps both axes and keyboard scrolling native (${engine})`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css}</style>
        <div class="scroll-area p-2" style="width: 200px; height: 100px"
          tabindex="0" role="region" aria-label="Release tags">
          <div style="width: 600px; height: 600px">Tags</div>
          <button type="button">Last tag</button>
        </div>`);
      const area = page.getByRole('region', { name: 'Release tags' });
      assert.deepEqual(await area.evaluate(el => {
        const style = getComputedStyle(el);
        return [style.overflowX, style.overflowY, style.touchAction,
          el.scrollWidth > el.clientWidth, el.scrollHeight > el.clientHeight];
      }), ['auto', 'auto', 'auto', true, true]);
      await area.focus();
      await page.keyboard.press('ArrowDown');
      await page.waitForFunction(() => document.querySelector('.scroll-area').scrollTop > 0);
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.querySelector('.scroll-area').scrollLeft > 0);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Last tag');
      assert.ok(await area.evaluate(el => {
        const button = el.querySelector('button').getBoundingClientRect();
        const box = el.getBoundingClientRect();
        return button.top >= box.top && button.bottom <= box.bottom;
      }), 'Tab must reveal a child below the viewport');
    } finally {
      await browser.close();
    }
  });

  browserTest(`scroll area follows themes, custom colors, and forced colors (${engine})`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css}</style>
        <div id="area" class="scroll-area" style="width: 200px; height: 100px"><div style="height: 500px">Tags</div></div>
        <div style="--scroll-area-thumb-color: rgb(12, 34, 56); --scroll-area-track-color: rgb(240, 241, 242)">
          <div id="custom" class="scroll-area" style="width: 200px; height: 100px"><div style="height: 500px">Custom</div></div>
        </div>`);
      const standard = await page.evaluate(() => CSS.supports('scrollbar-color', 'red blue'));
      const colors = id => page.locator(id).evaluate((el, standard) => standard
        ? getComputedStyle(el).scrollbarColor
        : [getComputedStyle(el, '::-webkit-scrollbar-thumb').backgroundColor,
          getComputedStyle(el, '::-webkit-scrollbar-track').backgroundColor].join(' '), standard);
      await page.evaluate(() => document.documentElement.setAttribute('theme', 'light'));
      const light = await colors('#area');
      await page.evaluate(() => document.documentElement.setAttribute('theme', 'dark'));
      assert.notEqual(await colors('#area'), light, 'default thumb must follow the theme');
      assert.equal(await colors('#custom'), 'rgb(12, 34, 56) rgb(240, 241, 242)');
      // Headless Firefox reports "none" for every scrollbar-width value.
      // Its colors and scrolling are testable; sizing is checked in Chromium.
      if (standard && engine !== 'firefox') {
        assert.equal(await page.locator('#area').evaluate(el => getComputedStyle(el).scrollbarWidth), 'thin');
      } else if (!standard) {
        assert.equal(await page.locator('#area').evaluate(el => getComputedStyle(el, '::-webkit-scrollbar').width), '8px');
      }
      // WebKit does not emulate forced-colors. Verify it in engines that do.
      if (engine !== 'webkit') {
        await page.emulateMedia({ forcedColors: 'active' });
        assert.equal(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), true);
        for (const id of ['#area', '#custom']) {
          assert.deepEqual(await page.locator(id).evaluate(el => {
            const style = getComputedStyle(el);
            return [style.scrollbarColor, style.overflow];
          }), ['auto', 'auto']);
          if (engine !== 'firefox') {
            assert.equal(await page.locator(id).evaluate(el => getComputedStyle(el).scrollbarWidth), 'auto');
          }
        }
      }
    } finally {
      await browser.close();
    }
  });
}
