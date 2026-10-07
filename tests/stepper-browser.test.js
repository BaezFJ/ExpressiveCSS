import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = (dir) => `<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head><body>
<main style="width:720px">
  <ol id="h" class="stepper">
    <li id="s1" class="complete"><a href="#cart">Cart</a></li>
    <li id="s2" aria-current="step">Shipping<small id="hint">Address and speed</small></li>
    <li id="s3" class="invalid">Payment</li>
    <li id="s4">Review</li>
  </ol>
  <ol id="v" class="stepper vertical" style="--md-comp-stepper-complete-label: 'Terminado'">
    <li id="v1" class="complete">Cuenta</li>
    <li id="v2" aria-current="step">Perfil<small id="vhint">Opcional</small><div id="vc" class="stepper-content">Add a photo.</div></li>
    <li id="v3">Listo</li>
  </ol>
  <span id="primary" style="color:var(--md-sys-color-primary)"></span>
  <span id="error" style="color:var(--md-sys-color-error)"></span>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: stepper lays out its steps, marks their state and speaks it`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      for (const dir of ['ltr', 'rtl']) {
        await page.setContent(markup(dir));
        const box = (id) => page.locator(`#${id}`).evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        });
        const indicator = (id) => page.locator(`#${id}`).evaluate((el) => {
          const s = getComputedStyle(el, '::before');
          return { fill: s.backgroundColor, mask: s.maskImage, content: s.content };
        });
        const color = (id) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).color);

        const tops = await Promise.all(['s1', 's2', 's3', 's4'].map(async (id) => (await box(id)).top));
        assert.ok(tops.every((top) => Math.abs(top - tops[0]) < 1), `${dir}: horizontal steps share a row`);
        const [first, last] = [await box('s1'), await box('s4')];
        assert.ok(dir === 'ltr' ? first.left < last.left : first.left > last.left, `${dir}: steps follow the reading direction`);
        assert.ok((await box('hint')).top > (await box('s2')).top + 10, `${dir}: supporting text sits under the label`);

        assert.equal((await indicator('s2')).fill, await color('primary'), `${dir}: the current step fills with primary`);
        const complete = await indicator('s1');
        assert.equal(complete.fill, await color('primary'));
        assert.match(complete.mask, /url\(/, `${dir}: a complete step knocks out a check`);
        const invalid = await indicator('s3');
        assert.equal(invalid.fill, await color('error'), `${dir}: an invalid step fills with error`);
        assert.match(invalid.mask, /url\(/);
        assert.equal((await indicator('s4')).mask, 'none', `${dir}: an upcoming step shows its number`);
        assert.equal(await page.locator('#s4').evaluate((el) => getComputedStyle(el, '::after').content), 'none', `${dir}: the last step has no connector`);

        const vertical = await Promise.all(['v1', 'v2', 'v3'].map(box));
        assert.ok(vertical[1].top >= vertical[0].bottom - 0.5 && vertical[2].top >= vertical[1].bottom - 0.5, `${dir}: vertical steps stack`);
        const content = await box('vc');
        assert.ok(content.top >= (await box('vhint')).bottom - 0.5, `${dir}: content sits under the supporting text`);
        assert.ok(Math.abs((dir === 'ltr' ? content.left - vertical[1].left : vertical[1].right - content.right) - 32) < 1, `${dir}: content lines up with the label column`);
      }

      const horizontal = await page.locator('#h').ariaSnapshot();
      assert.match(horizontal, /Completed/, 'a complete step is announced');
      assert.match(horizontal, /Error/, 'an invalid step is announced');
      assert.doesNotMatch(horizontal, /listitem: [0-9]/, 'step numbers are not read twice');
      assert.match(await page.locator('#v').ariaSnapshot(), /Terminado Cuenta/, 'the completed label is a translatable token');
    } finally {
      await browser.close();
    }
  });
}
