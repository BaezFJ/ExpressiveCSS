// Chips in a form, in real browsers. A named field submits through an
// <expressive-chips-control> that wraps its input, so the browser handles the
// values, reset, validity and disabled state; jsdom has no form-associated
// custom elements, so these checks live here.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { leaseBrowser } from './browser.js';

const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  /** Opens a page with the bundle and runs fn in it. */
  const inPage = async (html, fn) => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`${html}<script>${js}</script>`);
      return await page.evaluate(fn);
    } finally {
      await browser.close();
    }
  };

  browserTest(`${engine}: chips submit one value each, under the form, disabled state and form the input has`, async () => {
    const result = await inPage('<form id="a"><fieldset><div class="chips" id="field"><input name="tags"></div></fieldset></form><form id="b"></form><div class="chips" id="plain"><input></div>', async () => {
      const tick = () => Promise.resolve();
      const tags = (id) => new FormData(document.getElementById(id)).getAll('tags');
      const el = document.getElementById('field');
      // Set up twice: the second init destroys the first, which unwraps the input before wrapping it again.
      Expressive.Chips.init(el, { allowUserInput: true, data: [{ id: 'red' }] });
      const chips = Expressive.Chips.init(el, { allowUserInput: true, data: [{ id: 'red' }] });
      const input = chips._input;
      const seen = {};
      seen.wrapped = [el.querySelectorAll('expressive-chips-control').length, input.parentElement.localName, input.hasAttribute('name'), input.parentElement.name];
      input.value = 'gre';
      chips.addChip({ id: 'blue' });
      seen.typed = tags('a');
      el.closest('fieldset').disabled = true;
      seen.fieldset = tags('a');
      el.closest('fieldset').disabled = false;
      input.disabled = true;
      await tick();
      seen.disabled = tags('a');
      input.disabled = false;
      await tick();
      chips.deleteChip(0);
      seen.deleted = tags('a');
      chips.destroy();
      seen.destroyed = [tags('a'), el.lastElementChild === input, el.querySelector('expressive-chips-control')];
      input.value = '';
      const again = Expressive.Chips.init(el, { allowUserInput: true, data: [{ id: 'red' }] });
      input.setAttribute('form', 'b');
      await tick();
      seen.moved = [tags('a'), tags('b')];
      again.destroy();
      const plain = Expressive.Chips.init(document.getElementById('plain'), { allowUserInput: true });
      seen.unnamed = document.querySelector('#plain expressive-chips-control');
      plain.destroy();
      return seen;
    });
    assert.deepEqual(result, {
      wrapped: [1, 'expressive-chips-control', false, 'tags'],
      typed: ['red', 'blue'],
      fieldset: [],
      disabled: [],
      deleted: ['blue'],
      destroyed: [['gre'], true, null],
      moved: [[], ['red']],
      unnamed: null,
    });
  });

  browserTest(`${engine}: a form reset puts back the starting chips and their validity in the same task`, async () => {
    const result = await inPage('<form id="a"><div class="chips" id="field"><input name="tags" required></div></form><form id="c"><div class="chips" id="apple"><input name="fruit" value="apple"></div></form>', async () => {
      const form = document.getElementById('a');
      const chips = Expressive.Chips.init(document.getElementById('field'), { allowUserInput: true, data: [{ id: 'red' }] });
      const ids = () => chips.getData().map((chip) => chip.id);
      const seen = {};
      chips.deleteChip(0);
      chips.addChip({ id: 'blue' });
      chips.deleteChip(0);
      seen.before = form.checkValidity();
      form.reset();
      seen.after = [form.checkValidity(), ids(), [...document.querySelectorAll('#field .chip')].map((chip) => chip.firstChild.textContent)];
      chips.addChip({ id: 'new' });
      await Promise.resolve();
      seen.added = ids();
      const cancel = (e) => e.preventDefault();
      document.addEventListener('reset', cancel);
      form.reset();
      seen.canceled = ids();
      chips.deleteChip(1);
      chips.deleteChip(0);
      form.reset();
      document.removeEventListener('reset', cancel);
      seen.canceledEmpty = [ids(), form.checkValidity()];
      chips.destroy();

      const fruit = Expressive.Chips.init(document.getElementById('apple'), { allowUserInput: true, autocompleteOptions: { data: [{ id: 'apple', text: 'Apple' }] } });
      const start = fruit.getData().map((chip) => chip.id);
      fruit.deleteChip(0);
      document.getElementById('c').reset();
      seen.fromValue = [start, fruit.getData().map((chip) => chip.id), new FormData(document.getElementById('c')).getAll('fruit')];
      fruit.destroy();

      const detached = Object.assign(document.createElement('form'), { innerHTML: '<div class="chips"><input name="tags" required></div>' });
      const off = Expressive.Chips.init(detached.querySelector('.chips'), { allowUserInput: true, data: [{ id: 'red' }] });
      off.deleteChip(0);
      seen.detached = [detached.checkValidity()];
      detached.reset();
      seen.detached.push(detached.checkValidity(), off.getData().map((chip) => chip.id));
      off.destroy();
      return seen;
    });
    assert.deepEqual(result, {
      before: false,
      after: [true, ['red'], ['red']],
      added: ['red', 'new'],
      canceled: ['red', 'new'],
      canceledEmpty: [[], false],
      fromValue: [['apple'], ['apple'], ['apple']],
      detached: [false, true, ['red']],
    });
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
      assert.deepEqual(await page.evaluate(() => [document.querySelectorAll('#field .chip').length, document.getElementById('a').checkValidity()]), [1, true]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a required field needs a chip, and its validity is apart from the input's`, async () => {
    const result = await inPage('<form id="a"><div class="chips" id="field"><input name="tags" required></div></form><form><div class="chips" id="quiet"><input name="quiet" required></div></form>', async () => {
      const tick = () => Promise.resolve();
      const form = document.getElementById('a');
      let submitted = 0;
      form.addEventListener('submit', (e) => { submitted++; e.preventDefault(); });
      const chips = Expressive.Chips.init(document.getElementById('field'), { allowUserInput: true });
      const input = chips._input;
      const control = input.parentElement;
      const seen = {};
      seen.required = [input.required, input.getAttribute('aria-required')];
      input.value = 'gre';
      form.requestSubmit();
      seen.submit = [submitted, document.activeElement === input, control.validity.valueMissing, control.validationMessage];
      input.value = '';
      chips.addChip({ id: 'red' });
      seen.withChip = form.checkValidity();

      // The chips' own message first, then a page error over it while disabled.
      chips.deleteChip(0);
      input.disabled = true;
      await tick();
      input.setCustomValidity('Rejected tag');
      chips.addChip({ id: 'blue' });
      input.disabled = false;
      await tick();
      seen.pageError = [input.validationMessage, form.checkValidity()];
      chips.deleteChip(0);
      input.setCustomValidity('');
      seen.cleared = [input.validity.valid, control.validationMessage];

      input.readOnly = true;
      await tick();
      seen.readOnly = form.checkValidity();
      input.readOnly = false;
      await tick();
      seen.editable = form.checkValidity();

      const quiet = Expressive.Chips.init(document.getElementById('quiet'), { allowUserInput: true, i18n: { required: '' } });
      seen.messages = [quiet._input.parentElement.validationMessage];
      quiet.destroy();
      const custom = Expressive.Chips.init(document.getElementById('quiet'), { allowUserInput: true, i18n: { required: 'Pick a tag.' } });
      seen.messages.push(custom._input.parentElement.validationMessage);
      // Page script that moves the input out of the control leaves the chips working, unanchored.
      custom.el.append(custom._input);
      custom.addChip({ id: 'red' });
      custom.deleteChip(0);
      seen.messages.push(form.nextElementSibling.checkValidity());
      custom.destroy();

      input.setCustomValidity('Rejected tag');
      chips.destroy();
      seen.destroyed = [input.required, input.getAttribute('name'), input.hasAttribute('aria-required'), input.validationMessage, input.parentElement.id];
      // The observer is gone with the control: a later attribute change throws nothing.
      const errors = [];
      window.addEventListener('error', (e) => errors.push(e.message));
      input.readOnly = true;
      input.disabled = true;
      await tick();
      seen.afterDestroy = errors;
      return seen;
    });
    assert.deepEqual(result, {
      required: [false, 'true'],
      submit: [0, true, true, 'Add at least one item.'],
      withChip: true,
      pageError: ['Rejected tag', false],
      cleared: [true, 'Add at least one item.'],
      readOnly: true,
      editable: false,
      messages: ['Add at least one item.', 'Pick a tag.', false],
      destroyed: [true, 'tags', false, 'Rejected tag', 'field'],
      afterDestroy: [],
    });
  });

  // The label sits outside the field, so the summary finds it through the control's labels.
  browserTest(`${engine}: the error summary lists an empty required chips field and its link focuses the input`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<form novalidate><div class="error-summary" hidden><ul></ul></div><label for="tags">Tags</label><div class="chips" id="field"><input id="tags" name="tags" required></div><button>Send</button></form><script>${js}</script>`);
      await page.evaluate(() => Expressive.Chips.init(document.getElementById('field'), { allowUserInput: true }));
      await page.getByRole('button', { name: 'Send' }).click();
      assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.error-summary li')].map((item) => item.textContent)), ['Tags: Add at least one item.']);
      await page.locator('.error-summary a').click();
      assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('#field input')), true);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a named field with autocomplete submits the option picked`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<form id="a"><div class="chips" id="field"><input name="tags" aria-label="Tags"></div></form><script>${js}</script>`);
      await page.evaluate(() => Expressive.Chips.init(document.getElementById('field'), { allowUserInput: true, autocompleteOptions: { data: [{ id: 'apple', text: 'Apple' }] } }));
      await page.getByRole('combobox', { name: 'Tags' }).fill('ap');
      await page.getByRole('option', { name: 'Apple' }).click();
      assert.deepEqual(await page.evaluate(() => new FormData(document.getElementById('a')).getAll('tags')), ['apple']);
      // An Autocomplete the page set up on the input itself is the page's: destroy() leaves its listbox in the field.
      const kept = await page.evaluate(() => {
        const el = document.getElementById('field');
        const own = Expressive.Autocomplete.init(el.querySelector('input'), { data: [{ id: 'pear' }] });
        Expressive.Chips.getInstance(el).destroy();
        const seen = [el.contains(own.container), !el.querySelector('expressive-chips-control')];
        own.destroy();
        return seen;
      });
      assert.deepEqual(kept, [true, true]);
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
        chips.addChip({ id: 'blue' });
        form.reset();
        mounted.push(chips.getData().map((chip) => chip.id));
        el.remove();
        chips.destroy();
        form.append(el);
        return [mounted, tags()];
      });
      assert.deepEqual(result, [['red', ['red']], ['']], 'after destroy only the input, its name given back, submits');

      const detached = await page.evaluate(() => {
        const form = Object.assign(document.createElement('form'), { innerHTML: '<div class="chips"><input name="tags"></div>' });
        const chips = Expressive.Chips.init(form.querySelector('.chips'), { allowUserInput: true, data: [{ id: 'red' }] });
        const tags = () => new FormData(form).getAll('tags');
        chips.addChip({ id: 'blue' });
        form.reset();
        const seen = [tags()];
        document.body.append(form);
        seen.push(tags());
        form.remove();
        seen.push(tags());
        chips.destroy();
        return seen;
      });
      assert.deepEqual(detached, [['red'], ['red'], ['red']], 'a form before mounting, mounted and detached again');

      const shadow = await page.evaluate(() => {
        const host = document.createElement('div');
        document.body.append(host);
        const root = host.attachShadow({ mode: 'open' });
        root.innerHTML = '<form></form>';
        const form = root.querySelector('form');
        const el = Object.assign(document.createElement('div'), { className: 'chips', innerHTML: '<input name="tags">' });
        const chips = Expressive.Chips.init(el, { allowUserInput: true, data: [{ id: 'red' }] });
        form.append(el);
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
