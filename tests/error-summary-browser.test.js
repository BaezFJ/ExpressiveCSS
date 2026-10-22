import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<form id="form" novalidate>
  <div id="summary" class="alert critical error-summary" hidden aria-labelledby="summary-title">
    <span class="material-symbols" aria-hidden="true">error</span>
    <h2 id="summary-title">There is a problem</h2>
    <ul></ul>
  </div>
  <label for="email">Email address</label>
  <input id="email" type="email" required>
  <label>Nickname <input name="nickname" required></label>
  <label>Size <select name="size" required><option value="">Choose</option><option>Small</option><option>Large</option></select></label>
  <fieldset><legend>Delivery</legend>
    <label><input type="radio" name="delivery" value="post" required> Post</label>
    <label><input type="radio" name="delivery" value="pickup"> Pickup</label>
  </fieldset>
  <input aria-label="Coupon" pattern="[A-Z]{4}" value="abc">
  <div class="field">
    <select id="fruit" required><option value="" selected></option><option value="apple">Apple</option></select>
    <label for="fruit">Fruit</label>
  </div>
  <button id="submit" type="submit">Send</button>
  <button id="draft" type="submit" formnovalidate>Save draft</button>
</form>
<script>
  window.__submits = [];
  document.getElementById('form').addEventListener('submit', (e) => { e.preventDefault(); window.__submits.push(e.submitter.id); });
</script>
<script>${js}</script>
<script>Expressive.FormSelect.init(document.getElementById('fruit'));</script>
</body></html>`;

for (const [name, engine, test] of engines) {
  test(`${name}: error summary lists invalid fields, takes focus and links to each field`, { timeout: 30000 }, async (t) => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(markup);
      const links = page.locator('#summary li > a');

      await page.click('#submit');
      assert.equal(await page.locator('#summary').isVisible(), true, 'the summary shows');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'summary', 'the summary takes focus');
      assert.deepEqual(await page.evaluate(() => window.__submits), [], 'an invalid form does not reach page submit handlers');
      const texts = await links.allTextContents();
      assert.equal(texts.length, 6, 'one link per invalid field, one per radio group');
      assert.match(texts[0], /^Email address: \S/);
      assert.match(texts[1], /^Nickname: \S/);
      assert.match(texts[2], /^Size: \S/, 'a wrapped select leaves its options out of the name');
      assert.match(texts[3], /^Delivery: \S/);
      assert.match(texts[4], /^Coupon: \S/);
      assert.match(texts[5], /^Fruit: \S/, 'an enhanced select is named by the label in its field');
      await links.nth(5).click();
      assert.equal(await page.evaluate(() => document.activeElement.closest('.field')?.querySelector('select')?.id), 'fruit', 'its link focuses the generated input');
      assert.equal(await page.evaluate(() => document.activeElement.tagName), 'INPUT');
      assert.equal(await page.getByRole('heading', { name: 'There is a problem' }).count(), 1);

      await links.nth(1).click();
      const focused = await page.evaluate(() => [document.activeElement.name, document.activeElement.id]);
      assert.equal(focused[0], 'nickname', 'a link focuses its field');
      assert.match(focused[1], /^field-/, 'a field without an id gets one to link to');

      await page.click('#draft');
      assert.deepEqual(await page.evaluate(() => window.__submits), ['draft'], 'formnovalidate skips the check');

      await page.fill('#email', 'ada@example.com');
      await page.fill('input[name=nickname]', 'Ada');
      await page.check('input[value=pickup]');
      await page.selectOption('select[name=size]', 'Small');
      await page.fill('input[aria-label=Coupon]', 'SAVE');
      await page.locator('#fruit').evaluate((el) => { el.value = 'apple'; });
      await page.click('#submit');
      assert.deepEqual(await page.evaluate(() => window.__submits), ['draft', 'submit'], 'a valid form submits');
      assert.equal(await page.locator('#summary').isHidden(), true, 'a valid submit hides the summary');
      assert.equal(await links.count(), 0, 'and empties it');
    } finally {
      await browser.close();
    }
  });
}
