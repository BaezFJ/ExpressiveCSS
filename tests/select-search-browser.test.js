import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

async function open(browser, attributes = '', options = {}) {
  const page = await browser.newPage();
  await page.setContent(`<style>${css}</style><form style="padding:2rem;max-width:30rem">
    <button id="before" type="button">Before</button>
    <label for="choice">Destination</label><select id="choice" name="place" ${attributes}>
      <option value="paris" selected>Paris</option>
      <optgroup label="Europe"><option value="rome">Rome</option><option value="lyon" disabled>Lyon</option></optgroup>
      <optgroup label="Asia"><option value="tokyo">Tokyo</option></optgroup>
    </select><button id="after" type="submit">Submit</button></form><script>${js}</script>`);
  await page.evaluate(options => {
    window.instance = Expressive.FormSelect.init(document.querySelector('select'), {
      searchable: true, menuOptions: { inDuration: 0, outDuration: 0 }, ...options
    });
    window.changes = 0;
    instance.el.addEventListener('change', () => changes++);
    instance.el.form.onsubmit = event => {
      event.preventDefault();
      window.submitted = [...new FormData(event.target)];
    };
  }, options);
  return page;
}

function each(name, body) {
  for (const [engine, type, test] of engines) {
    test(`${engine}: searchable select ${name}`, async () => {
      const browser = await leaseBrowser(type);
      let page;
      try {
        page = await open(browser);
        await body(page, engine);
      } finally {
        await page?.evaluate(() => instance.destroy());
        await browser.close();
      }
    });
  }
}

each('filters grouped options and submits the chosen value by pointer', async page => {
  await page.locator('.field > input').click();
  await page.getByRole('searchbox').fill('rOm');
  assert.deepEqual(await page.getByRole('option').allTextContents(), ['Rome']);
  await page.getByRole('option', { name: 'Rome' }).click();
  await page.locator('#after').click();
  assert.deepEqual(await page.evaluate(() => submitted), [['place', 'rome']]);
  assert.equal(await page.evaluate(() => changes), 1);
});
