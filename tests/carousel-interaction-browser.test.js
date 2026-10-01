import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit, expect } from '@playwright/test';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(type.executablePath()) ? test : test.skip;

  browserTest(`Carousel keeps child clicks and mouse dragging distinct (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const layout of ['uncontained', 'flat']) {
        await page.setContent(`
          <style>${css}
            .carousel { width: 480px; margin: 40px 180px; }
            #action, #link { display: block; margin: 20px; width: 180px; }
            #media { display: block; width: 160px; height: 60px; }
          </style>
          <div class="carousel ${layout}" aria-label="Places">
            <div class="carousel-item">
              <button id="action" type="button"><span id="button-label">Save place</span></button>
              <a id="link" href="#destination"><span id="link-label">Details</span>
                <img id="media" alt="Place" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='60'%3E%3Crect width='160' height='60' fill='teal'/%3E%3C/svg%3E">
              </a>
            </div>
            <div class="carousel-item">Next place</div>
            <div class="carousel-item">Last place</div>
          </div>`);
        await page.addScriptTag({ content: js });
        await page.evaluate(() => {
          window.carousel = Expressive.Carousel.init(document.querySelector('.carousel'));
          window.clicks = [];
          for (const id of ['action', 'link']) {
            document.getElementById(id).addEventListener('click', () => clicks.push(id));
          }
        });
        try {
          await page.locator('#button-label').click();
          await page.locator('#link-label').click();
          assert.deepEqual(await page.evaluate(() => clicks), ['action', 'link'], layout);
          assert.equal(await page.evaluate(() => location.hash), '#destination');

          for (const selector of ['#link-label', '#media']) {
            await page.evaluate(() => carousel.set(0));
            await expect.poll(() => page.locator('.carousel-track').evaluate(el => el.scrollLeft)).toBe(0);
            const box = await page.locator(selector).boundingBox();
            const startX = box.x + box.width / 2;
            const startY = box.y + box.height / 2;
            await page.mouse.move(startX, startY);
            await page.mouse.down();
            await page.mouse.move(startX - 3, startY);
            assert.equal(await page.evaluate(() => carousel.dragged), false);
            await page.mouse.move(startX - 140, startY, { steps: 12 });
            assert.equal(await page.evaluate(() => carousel.dragged), true);
            const scrollLeft = await page.locator('.carousel-track').evaluate(el => el.scrollLeft);
            assert.ok(scrollLeft > 100, `${layout} ${selector}: scrollLeft=${scrollLeft}, pointer x=${startX - 140}`);
            // Finish the resize observer's delayed alignment while the pointer is still held.
            await page.locator('.carousel').evaluate((el, width) => {
              el.style.width = width;
            }, selector === '#link-label' ? '460px' : '480px');
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            await expect.poll(() => page.evaluate(() => carousel._resizeTimeout)).toBeNull();
            assert.equal(await page.locator('.carousel-track').evaluate(el => el.scrollLeft), scrollLeft,
              `${layout} ${selector}: resizing preserves the held drag`);
            await page.mouse.up();
            assert.equal(await page.evaluate(() => carousel.pressed), false);
            await expect(page.locator('.carousel')).not.toHaveClass(/dragging/);
            assert.deepEqual(await page.evaluate(() => clicks), ['action', 'link'], selector);
          }
        } finally {
          await page.evaluate(() => carousel.destroy());
        }
      }
    } finally {
      try {
        await page?.evaluate(() => window.carousel && Expressive.Carousel.getInstance(carousel.el)?.destroy());
      } finally {
        await browser.close();
      }
    }
  });
}
