import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<main style="width:480px">
  <div id="zone" class="drop-zone">
    <label id="target">
      <span class="material-symbols" aria-hidden="true">upload_file</span>
      Drop files here or browse
      <small>PDF or PNG, up to 10 MB</small>
      <input id="files" type="file" multiple>
    </label>
    <ul id="list" class="drop-zone-files" aria-live="polite"></ul>
  </div>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: drop zone covers its label with the file input, marks a drag and lists chosen files`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 }, reducedMotion: 'reduce', locale: 'en-US' });
      await page.setContent(markup);
      await page.addScriptTag({ content: js });
      const box = (id) => page.locator(`#${id}`).evaluate((el) => {
        const r = el.getBoundingClientRect();
        return [r.left, r.top, r.right, r.bottom].map(Math.round);
      });

      const [l, t, r, b] = await box('target');
      assert.deepEqual(await box('files'), [l + 1, t + 1, r - 1, b - 1], 'the file input covers the label inside its 1px border');
      assert.equal(await page.getByLabel(/Drop files here/).count(), 1, 'the label names the input');

      const marked = () => page.locator('#zone').evaluate((el) => el.classList.contains('dragover'));
      const drag = (type) => page.locator('#files').evaluate((el, type) => el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true })), type);
      await drag('dragenter');
      assert.equal(await marked(), true, 'dragging over the zone marks it');
      assert.equal(await page.locator('#target').evaluate((el) => getComputedStyle(el).borderTopStyle), 'solid');
      await drag('dragleave');
      assert.equal(await marked(), false, 'leaving the zone clears it');
      await drag('dragover');
      await drag('drop');
      assert.equal(await marked(), false, 'a drop clears it');

      await page.setInputFiles('#files', [
        { name: 'report.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(2500) },
        { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.alloc(1200000) },
      ]);
      const items = await page.locator('#list > li').evaluateAll((els) => els.map((el) => el.textContent));
      assert.equal(items.length, 2, 'each chosen file is listed');
      assert.match(items[0], /^report\.pdf2\.5\s?kB$/);
      assert.match(items[1], /^photo\.png1\.2\s?MB$/);

      await page.setInputFiles('#files', []);
      assert.equal(await page.locator('#list > li').count(), 0, 'clearing the input empties the list');

      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'files', 'the input takes keyboard focus');
      assert.notEqual(await page.locator('#target').evaluate((el) => getComputedStyle(el).outlineStyle), 'none', 'the label shows the focus ring');
    } finally {
      await browser.close();
    }
  });
}
