// Chips form values in real browsers: each chip joins the data its field's
// form gathers, read at that moment, so the input's form, disabled state and
// form attribute count as they are then.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { leaseBrowser } from './browser.js';

const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  browserTest(`${engine}: chips submit one value each, under the form, disabled state and form the input has now`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<form id="a"><fieldset><div class="chips" id="field"><input name="tags"></div></fieldset></form><form id="b"></form><script>${js}</script>`);
      const result = await page.evaluate(() => {
        const tags = (id) => new FormData(document.getElementById(id)).getAll('tags');
        const el = document.getElementById('field');
        Expressive.Chips.init(el, { allowUserInput: true, data: [{ id: 'red' }] });
        const chips = Expressive.Chips.init(el, { allowUserInput: true, data: [{ id: 'red' }] });
        const input = chips._input;
        const seen = {};
        input.value = 'gre';
        chips.addChip({ id: 'blue' });
        seen.typed = tags('a');
        input.disabled = true;
        seen.disabled = tags('a');
        input.disabled = false;
        el.closest('fieldset').disabled = true;
        seen.fieldset = tags('a');
        el.closest('fieldset').disabled = false;
        chips.deleteChip(0);
        seen.deleted = tags('a');
        chips.destroy();
        seen.destroyed = tags('a');
        // Last, on a new instance: Firefox does not give an input back to its
        // ancestor form once form="" is removed.
        input.value = '';
        const again = Expressive.Chips.init(el, { allowUserInput: true, data: [{ id: 'red' }] });
        input.setAttribute('form', 'b');
        seen.moved = [tags('a'), tags('b')];
        input.setAttribute('form', '');
        seen.formless = [tags('a'), tags('b')];
        again.destroy();
        return seen;
      });
      assert.deepEqual(result, {
        typed: ['red', 'blue'],
        disabled: [],
        fieldset: [],
        deleted: ['blue'],
        destroyed: ['gre'],
        moved: [[], ['red']],
        formless: [[], []],
      });
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a reset button puts back the starting chips and their validity`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<form id="a"><div class="chips" id="field"><input name="tags" required></div><button type="reset">Reset</button></form><script>${js}</script>`);
      await page.evaluate(() => {
        const chips = Expressive.Chips.init(document.getElementById('field'), { allowUserInput: true, data: [{ id: 'red' }] });
        chips.deleteChip(0);
        // A listener of the page's, so the dispatch has more than one callback to run.
        document.addEventListener('reset', () => {});
      });
      assert.equal(await page.evaluate(() => document.getElementById('a').checkValidity()), false);
      await page.getByRole('button', { name: 'Reset' }).click();
      await page.waitForFunction(() => document.querySelectorAll('#field .chip').length === 1);
      assert.equal(await page.evaluate(() => document.getElementById('a').checkValidity()), true);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: chips set up before they join a form submit, and a field removed before destroy leaves nothing behind`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<form id="a"></form><script>${js}</script>`);
      const result = await page.evaluate(() => {
        const form = document.getElementById('a');
        const tags = () => new FormData(form).getAll('tags');
        const el = Object.assign(document.createElement('div'), { className: 'chips', innerHTML: '<input name="tags">' });
        const chips = Expressive.Chips.init(el, { allowUserInput: true, data: [{ id: 'red' }] });
        form.append(el);
        const mounted = tags();
        el.remove();
        chips.destroy();
        form.append(el);
        return [mounted, tags()];
      });
      assert.deepEqual(result, [['red'], ['']], 'after destroy only the input, its name given back, submits');

      const detached = await page.evaluate(() => {
        const form = Object.assign(document.createElement('form'), { innerHTML: '<div class="chips"><input name="tags"></div>' });
        const chips = Expressive.Chips.init(form.querySelector('.chips'), { allowUserInput: true, data: [{ id: 'red' }] });
        const tags = () => new FormData(form).getAll('tags');
        const seen = [tags()];
        document.body.append(form);
        seen.push(tags());
        form.remove();
        seen.push(tags());
        chips.destroy();
        return seen;
      });
      assert.deepEqual(detached, [['red'], ['red'], ['red']], 'a form before mounting, mounted and detached again');

      const shadow = await page.evaluate(async () => {
        const host = document.createElement('div');
        document.body.append(host);
        const root = host.attachShadow({ mode: 'open' });
        root.innerHTML = '<form></form>';
        const form = root.querySelector('form');
        const el = Object.assign(document.createElement('div'), { className: 'chips', innerHTML: '<input name="tags">' });
        const chips = Expressive.Chips.init(el, { allowUserInput: true, data: [{ id: 'red' }] });
        form.append(el);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const seen = [new FormData(form).getAll('tags')];
        chips.addChip({ id: 'blue' });
        form.reset();
        seen.push(chips.getData().map((chip) => chip.id));
        chips.destroy();
        return seen;
      });
      assert.deepEqual(shadow, [['red'], ['red']], 'set up detached, then mounted in a shadow-root form: submits and resets');
    } finally {
      await browser.close();
    }
  });
}
