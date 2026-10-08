import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const counter = (id, value, extra = '') =>
  `<span id="${id}" class="countdown" style="--md-comp-countdown-value: ${value}; ${extra}">${value}</span>`;

const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<p id="line" style="font-size:40px">T ${counter('one', 7)} ${counter('two', 42)} ${counter('three', 365)}
  ${counter('padded', 5, '--md-comp-countdown-digits: 2')} ${counter('high', 1500)} ${counter('low', -3)} <span id="ref" style="display:inline-block;line-height:1em">x</span></p>
</body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: countdown shows 0 to 999 as rolling digits and keeps the text for assistive technology`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 900, height: 300 } });
      await page.setContent(markup);
      // Each strip line is 1em (40px); the visible digit is the line the strip is moved up to.
      const state = (id) => page.locator(`#${id}`).evaluate((el) => {
        const line = (pseudo) => Math.abs(parseFloat(getComputedStyle(el, pseudo).translate.split(' ')[1] ?? 0) / 40);
        return { width: el.getBoundingClientRect().width, lead: line('::before'), ones: line('::after') };
      });
      const ch = await page.evaluate(() => {
        const probe = document.createElement('span');
        probe.style.cssText = 'position:absolute;width:1ch;font-size:40px';
        document.body.append(probe);
        return probe.getBoundingClientRect().width;
      });

      const expected = { one: [1, 0, 7], two: [2, 4, 2], three: [3, 36, 5], padded: [2, 0, 5], high: [3, 99, 9], low: [1, 0, 0] };
      for (const [id, [digits, lead, ones]] of Object.entries(expected)) {
        const s = await state(id);
        assert.ok(Math.abs(s.width - digits * ch) < 0.5, `${id} is ${digits}ch wide, got ${s.width / ch}ch`);
        assert.equal(s.lead, lead, `${id} leading digits strip sits on ${lead}`);
        assert.equal(s.ones, ones, `${id} ones strip sits on ${ones}`);
      }

      // A 1em inline-block of plain text is where the digits' box belongs on the line.
      const bottom = (id) => page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().bottom);
      const offset = Math.abs((await bottom('two')) - (await bottom('ref')));
      assert.ok(offset < 1, `digits sit on the baseline of the surrounding text, off by ${offset}px`);

      assert.equal(await page.locator('#two').evaluate((el) => getComputedStyle(el).transitionProperty), 'width');
      assert.match(await page.locator('#two').evaluate((el) => getComputedStyle(el, '::after').transitionProperty), /translate/);

      const rolling = await page.locator('#two').evaluate((el) => {
        el.style.setProperty('--md-comp-countdown-value', 43);
        el.textContent = '43';
        const animations = el.getAnimations({ subtree: true });
        animations.forEach((a) => a.finish());
        return animations.map((a) => a.transitionProperty).sort();
      });
      assert.deepEqual(rolling, ['translate'], 'a new value rolls the ones strip and nothing else');
      assert.equal((await state('two')).ones, 3, 'the ones strip lands on the new digit');

      assert.equal(
        (await page.locator('#line').ariaSnapshot()).trim(),
        '- paragraph: T 7 43 365 5 1500 -3 x',
        'screen readers get the text, not the digit strips',
      );

      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.match(await page.locator('#two').evaluate((el) => getComputedStyle(el, '::after').transitionDuration), /^0s/);
    } finally {
      await browser.close();
    }
  });
}
