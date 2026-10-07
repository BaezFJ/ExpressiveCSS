import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;
const stars = [1, 2, 3, 4, 5].map((n) => `<label id="l${n}"><span class="visually-hidden">${n} stars</span><input id="s${n}" type="radio" name="score" value="${n}"${n === 3 ? ' checked' : ''}></label>`).join('');

const markup = (dir) => `<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head><body>
<main style="width:480px">
  <button id="before" type="button">Before</button>
  <form id="form"><fieldset class="rating"><legend>Rate this recipe</legend>${stars}</fieldset></form>
  <span id="display" class="rating" role="img" aria-label="Rated 4.5 out of 5" style="--md-comp-rating-value: 4.5"></span>
  <span id="on" style="background-color:var(--md-sys-color-tertiary)"></span>
  <span id="off" style="background-color:var(--md-sys-color-outline-variant)"></span>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: rating fills stars up to the choice, previews on hover and keeps native radios`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 }, reducedMotion: 'reduce' });
      for (const dir of ['ltr', 'rtl']) {
        await page.setContent(markup(dir));
        const fill = (id) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).backgroundColor);
        const [on, off] = [await fill('on'), await fill('off')];
        const filled = async () => (await Promise.all([1, 2, 3, 4, 5].map((n) => fill(`s${n}`)))).map((c) => c === on);

        const star = await page.locator('#s1').evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { width: r.width, opacity: getComputedStyle(el).opacity, mask: getComputedStyle(el).maskImage };
        });
        assert.deepEqual([star.width, star.opacity], [24, '1'], `${dir}: each radio is a visible 24px star`);
        assert.match(star.mask, /url\(/);
        assert.deepEqual(await filled(), [true, true, true, false, false], `${dir}: the checked star and those before it fill`);
        assert.equal(await fill('s5'), off);

        await page.locator('#before').focus();
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), 's3', `${dir}: Tab enters the group at the checked star`);
        assert.notEqual(await page.locator('#l3').evaluate((el) => getComputedStyle(el).outlineStyle), 'none', `${dir}: the focused star shows a ring`);
        await page.keyboard.press('ArrowDown');
        assert.equal(await page.locator('#s4').isChecked(), true, `${dir}: arrow keys move the choice natively`);
        assert.deepEqual(await filled(), [true, true, true, true, false]);
        // Playwright's WebKit stops matching :focus-visible once an arrow key
        // moves the checked radio, so the ring follows the arrows elsewhere only.
        if (name !== 'webkit') {
          assert.notEqual(await page.locator('#l4').evaluate((el) => getComputedStyle(el).outlineStyle), 'none', `${dir}: the ring follows the arrows`);
        }

        await page.mouse.move(0, 0);
        await page.locator('#l2').hover();
        const preview = await Promise.all([1, 2, 3, 4, 5].map((n) => fill(`s${n}`)));
        assert.ok(preview[0] !== off && preview[1] !== off && preview[2] === off && preview[3] === off, `${dir}: hover previews up to the pointer`);

        assert.equal(await page.evaluate(() => new FormData(document.getElementById('form')).get('score')), '4', `${dir}: the choice submits with the form`);

        const display = await page.locator('#display').evaluate((el) => ({ width: el.getBoundingClientRect().width, image: getComputedStyle(el).backgroundImage }));
        assert.equal(display.width, 100, `${dir}: the display is five 20px stars`);
        assert.match(display.image, dir === 'ltr' ? /to right/ : /to left/, `${dir}: the display fills from the start edge`);
      }
      assert.equal(await page.getByRole('img', { name: 'Rated 4.5 out of 5' }).count(), 1);
      assert.equal(await page.getByRole('radio', { name: '3 stars' }).count(), 1, 'each radio is named');
      assert.equal(await page.getByRole('group', { name: 'Rate this recipe' }).count(), 1);
    } finally {
      await browser.close();
    }
  });
}
