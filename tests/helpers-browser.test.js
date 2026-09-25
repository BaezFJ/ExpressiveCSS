import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const browserTest = existsSync(chromium.executablePath()) ? test : test.skip;

browserTest('visually-hidden text is off screen but still names its link', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    // An unlayered consumer rule beats every layered declaration unless it is
    // important, which is why the utility is.
    await page.setContent(`<style>${css} .note { position: relative; padding: 8px; }</style>
      <a href="#orders-42">View<span id="hidden" class="visually-hidden note"> order 42</span></a>`);
    const hidden = await page.locator('#hidden').evaluate((el) => {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return { width: box.width, height: box.height, position: style.position, clipPath: style.clipPath, overflow: style.overflow };
    });
    assert.deepEqual(hidden, { width: 1, height: 1, position: 'absolute', clipPath: 'inset(50%)', overflow: 'hidden' });
    assert.equal(await page.getByRole('link', { name: 'View order 42' }).count(), 1);
  } finally {
    await browser.close();
  }
});

