import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const chromiumRun = !process.env.EXPRESSIVECSS_TEST_BROWSER || process.env.EXPRESSIVECSS_TEST_BROWSER === 'chromium';
const browserTest = chromiumRun && existsSync(chromium.executablePath()) ? test : test.skip;

browserTest('table-of-contents links keep a 48dp target and follow the height token', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <style>${css}</style>
      <nav aria-label="On this page">
        <ul class="table-of-contents">
          <li><a href="#one">One</a></li>
          <li><a href="#two" class="active">Two</a></li>
        </ul>
      </nav>
      <nav aria-label="Dense contents">
        <ul class="table-of-contents" style="--md-comp-toc-item-height: 40px">
          <li><a href="#three">Three</a></li>
        </ul>
      </nav>
    `);
    const heights = await page.$$eval('.table-of-contents a', (links) =>
      links.map((link) => link.getBoundingClientRect().height));
    assert.deepEqual(heights, [48, 48, 40]);
  } finally {
    await browser.close();
  }
});
