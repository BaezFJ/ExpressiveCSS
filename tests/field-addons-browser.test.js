import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = (dir) => `<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head><body>
<main style="width:480px">
  <div id="field" class="field" style="width:320px">
    <input id="pw" type="password" placeholder=" " value="hunter22" autocomplete="current-password">
    <label for="pw">Password</label>
    <button id="toggle" type="button" class="icon-button suffix password-toggle" aria-label="Show password" aria-pressed="false">
      <span id="eye" class="material-symbols" aria-hidden="true">visibility</span>
      <span id="eye-off" class="material-symbols" aria-hidden="true">visibility_off</span>
    </button>
  </div>
  <label for="code">Verification code</label>
  <div id="row" style="display:flex">
    <input id="code" class="otp" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}">
    <span id="after">after</span>
  </div>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: field add-ons toggle the password from a trailing button and draw a one-time code as cells`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      for (const dir of ['ltr', 'rtl']) {
        await page.setContent(markup(dir));
        await page.addScriptTag({ content: js });
        const box = (id) => page.locator(`#${id}`).evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
        });
        const shown = (id) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).display !== 'none');

        const field = await box('field');
        const toggle = await box('toggle');
        assert.equal(toggle.width, 40, `${dir}: the trailing button keeps its 40px target`);
        assert.ok(Math.abs(field.right - toggle.right - 4) < 1, `${dir}: it sits 4px from the field edge`);
        assert.ok(Math.abs((toggle.top + toggle.bottom) / 2 - (field.top + 28)) < 1, `${dir}: it centres on the 56px field`);
        assert.equal(await page.locator('#pw').evaluate((el) => getComputedStyle(el).paddingRight), '52px');

        assert.deepEqual([await shown('eye'), await shown('eye-off')], [true, false]);
        await page.click('#toggle');
        assert.equal(await page.locator('#pw').getAttribute('type'), 'text', `${dir}: pressing shows the password`);
        assert.equal(await page.locator('#toggle').getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('#toggle').getAttribute('aria-label'), 'Show password', `${dir}: the name stays; aria-pressed carries the state`);
        assert.deepEqual([await shown('eye'), await shown('eye-off')], [false, true], `${dir}: the icons swap`);
        await page.click('#toggle');
        assert.equal(await page.locator('#pw').getAttribute('type'), 'password', `${dir}: pressing again hides it`);
        assert.equal(await page.locator('#toggle').getAttribute('aria-pressed'), 'false');

        await page.click('#code');
        await page.keyboard.type('123456');
        const code = page.locator('#code');
        assert.equal(await code.evaluate((el) => el.scrollLeft), 0, `${dir}: six digits fit without scrolling`);
        assert.equal(await code.evaluate((el) => getComputedStyle(el).direction), 'ltr', `${dir}: digits read left to right`);
        assert.match(await code.evaluate((el) => getComputedStyle(el).backgroundSize), /2px/, `${dir}: focus thickens the indicators`);
        const input = await box('code');
        const after = await box('after');
        // The input itself stays left to right, so its clipped overhang is on
        // the right in both directions; in RTL the next item sits on its left.
        const cells = 6 * 48 + 5 * 8;
        if (dir === 'ltr') assert.ok(Math.abs(after.left - input.left - cells) < 1, `ltr: the layout box ends at the last cell, got ${after.left - input.left}`);
        else {
          assert.ok(Math.abs(after.right - input.left) < 1, `rtl: the next item meets the first cell, got ${after.right - input.left}`);
          const row = await box('row');
          assert.ok(Math.abs(input.left + cells - row.right) < 1, `rtl: the cells end at the row's start edge, got ${input.left + cells - row.right}`);
        }
        assert.equal(input.height, 56);
      }
      assert.equal(await page.getByLabel('Verification code').count(), 1);
    } finally {
      await browser.close();
    }
  });
}
