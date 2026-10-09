import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

// The legacy anatomy: the span after the input is the label text and draws the box.
const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<main style="width:600px">
  <label id="links"><input type="checkbox"><span>I agree to the <a href="#">Terms</a> and <a href="#">Privacy Policy</a></span></label>
  <label id="plain"><input type="checkbox"><span>Remember me</span></label>
  <div style="width:180px"><label id="narrow"><input type="checkbox"><span>I agree to the <a href="#">Terms</a> and <a href="#">Privacy Policy</a></span></label></div>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: legacy checkbox span keeps inline links in the text flow`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.setContent(markup);
      await page.evaluate(() => document.fonts.ready);

      const links = await page.locator('#links > span').evaluate(span => {
        const text = span.firstChild;
        const range = document.createRange();
        range.setStart(text, 0);
        range.setEnd(text, text.length - 1); // "I agree to the", without its trailing space
        const words = range.getBoundingClientRect();
        const [terms, privacy] = [...span.querySelectorAll('a')].map(a => a.getBoundingClientRect());
        return { space: terms.left - words.right, sameLine: Math.abs(terms.top - words.top) < 1 && Math.abs(privacy.top - words.top) < 1 };
      });
      assert.ok(links.sameLine, 'the text and both links share one line');
      assert.ok(links.space > 1, `the space before a link survives (gap ${links.space}px)`);

      const narrow = await page.locator('#narrow > span').evaluate(span => {
        const start = span.getBoundingClientRect().left + parseFloat(getComputedStyle(span).paddingLeft);
        const terms = span.querySelector('a').getClientRects()[0];
        return { start, terms: terms.left, wrapped: terms.top > span.getClientRects()[0].top + parseFloat(getComputedStyle(span).paddingTop) + 1 };
      });
      assert.ok(narrow.wrapped, 'the narrow label wraps before the first link');
      assert.ok(Math.abs(narrow.terms - narrow.start) < 1, 'a wrapped link starts the next line at the text edge');

      const plain = await page.locator('#plain > span').evaluate(span => {
        const box = span.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(span);
        const text = range.getBoundingClientRect();
        const before = getComputedStyle(span, '::before');
        return {
          height: box.height,
          textCenter: text.top + text.height / 2 - box.top,
          indent: text.left - box.left,
          boxTop: parseFloat(before.top) + parseFloat(before.marginTop),
        };
      });
      assert.equal(plain.height, 48, 'a one-line label keeps the 48px target');
      assert.ok(Math.abs(plain.textCenter - 24) < 1, `the text stays vertically centered (${plain.textCenter})`);
      assert.equal(plain.indent, 30, 'the text clears the drawn box');
      assert.equal(plain.boxTop, 15, 'the 18px box stays centered on the line');
    } finally {
      await browser.close();
    }
  });
}
