import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const html = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
  <dialog class="bottom-sheet" id="sheet" aria-label="Share">
    <button type="button" class="drag-handle" aria-label="Close sheet"></button>
    <h2>Share</h2><p>Copy link</p>
  </dialog>
  <script>${js}</script></body></html>`;

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  browserTest(`${engine}: a released sheet springs back from where the finger left it, and can be caught`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
      // A slow spring, so it is still moving when the press lands on a
      // loaded machine. The default one settles in about a third of a second.
      await page.setContent(html.replace('<body>', '<body style="--md-sys-motion-spring-default-spatial-stiffness: 40">'));
      await page.evaluate(() => document.getElementById('sheet').showModal());
      await page.waitForTimeout(700);
      const box = await page.locator('#sheet .drag-handle').boundingBox();
      const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];

      // Drag 60px down, slower than a dismissing flick, and let go moving.
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let i = 1; i <= 6; i++) {
        await page.mouse.move(x, y + i * 10);
        await page.waitForTimeout(30);
      }
      await page.mouse.up();
      const released = await page.evaluate(() => {
        const sheet = document.getElementById('sheet');
        const [spring] = sheet.getAnimations().filter((animation) => animation.effect.getKeyframes()[0].translate);
        const frames = spring?.effect.getKeyframes() ?? [];
        return {
          open: sheet.open,
          from: frames[0]?.translate,
          to: frames.at(-1)?.translate,
          transition: sheet.style.transition,
          animations: sheet.getAnimations().length,
          token: getComputedStyle(sheet).getPropertyValue('--md-sys-motion-spring-default-spatial-damping').trim(),
        };
      });
      assert.equal(released.open, true);
      assert.match(released.from, /^0(px)? 60px$/, `the spring starts where the finger left the sheet: ${released.from}`);
      assert.match(released.to, /^0(px)?( 0px)?$/, `it ends on the sheet's edge: ${released.to}`);
      assert.equal(released.transition, 'none', 'the CSS transition waits, or it would outrank the spring');
      assert.equal(released.animations, 1, 'no CSS transition starts beside the spring');
      assert.equal(released.token, '0.9', 'the spring comes from the motion tokens');

      // Caught mid-spring, the sheet stays where it is instead of jumping to the end.
      await page.waitForTimeout(40);
      // Press on the handle where the spring has moved it to. The spring keeps
      // carrying it up while the press is on its way, so aim near its top
      // edge: from the centre, a loaded machine missed it by the time it landed.
      // The spring is still moving while the press travels, so where the sheet
      // was is read at the press itself, before the component sees it.
      const handleY = await page.evaluate(() => {
        const sheet = document.getElementById('sheet');
        window.addEventListener('pointerdown', () => { window.pressedAt = sheet.getBoundingClientRect().top; }, { capture: true, once: true });
        return sheet.querySelector('.drag-handle').getBoundingClientRect().top + 4;
      });
      await page.mouse.move(x, handleY);
      await page.mouse.down();
      const caught = await page.evaluate(() => {
        const sheet = document.getElementById('sheet');
        return {
          before: window.pressedAt,
          top: sheet.getBoundingClientRect().top,
          springs: sheet.getAnimations().filter((animation) => animation.effect.getKeyframes()[0].translate).length,
          shift: parseFloat(sheet.style.getPropertyValue('--md-comp-bottom-sheet-shift')),
        };
      });
      await page.mouse.up();
      assert.equal(caught.springs, 0, 'catching it stops the spring');
      assert.ok(caught.shift > 0, `the drag carries on from the caught offset: ${caught.shift}`);
      assert.ok(Math.abs(caught.top - caught.before) < 2, `no jump: ${caught.before} then ${caught.top}`);

      // Once settled, the transition is back for the next open or close.
      await page.waitForFunction(() => document.getElementById('sheet').getAnimations().length === 0, null, { timeout: 10000 });
      assert.equal(await page.evaluate(() => document.getElementById('sheet').style.transition), '');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: under reduced motion a released sheet snaps back without a spring`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(html);
      await page.evaluate(() => document.getElementById('sheet').showModal());
      const box = await page.locator('#sheet .drag-handle').boundingBox();
      const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let i = 1; i <= 6; i++) await page.mouse.move(x, y + i * 10);
      await page.mouse.up();
      const springs = await page.evaluate(() => document.getElementById('sheet').getAnimations().filter((animation) => animation.effect.getKeyframes()[0]?.translate).length);
      assert.equal(springs, 0);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a sheet's spring ends when it closes, when motion is reduced, and gives way to overridden tokens`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
      await page.setContent(html);
      const open = async () => {
        await page.evaluate(() => document.getElementById('sheet').showModal());
        await page.waitForTimeout(700);
      };
      const release = async () => {
        const box = await page.locator('#sheet .drag-handle').boundingBox();
        const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
        await page.mouse.move(x, y);
        await page.mouse.down();
        for (let i = 1; i <= 6; i++) {
          await page.mouse.move(x, y + i * 10);
          await page.waitForTimeout(30);
        }
        await page.mouse.up();
      };
      const state = () => page.evaluate(() => {
        const sheet = document.getElementById('sheet');
        return [sheet.getAnimations().filter((animation) => animation.effect.getKeyframes()[0]?.translate).length, sheet.style.transition];
      });

      // Closed mid-spring, the spring stops and the transition comes back, so the close animates.
      await open();
      await release();
      assert.equal((await state())[0], 1);
      await page.evaluate(() => document.getElementById('sheet').close());
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve)));
      assert.deepEqual(await state(), [0, ''], 'closing ends the spring');

      // Reduced motion asked for mid-spring stops it there.
      await open();
      await release();
      assert.equal((await state())[0], 1);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
      assert.deepEqual(await state(), [0, ''], 'reduced motion ends the spring');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => document.getElementById('sheet').close());

      // A page that sets the sheet's motion duration keeps its CSS transition.
      await page.evaluate(() => document.getElementById('sheet').style.setProperty('--md-comp-bottom-sheet-motion-duration', '0s'));
      await open();
      await release();
      assert.equal((await state())[0], 0, 'an overridden duration keeps the CSS snap');
    } finally {
      await browser.close();
    }
  });
}
