// Cascader in real engines: the popover in the top layer, clicks and keys
// through the columns, and the form-associated control that submits the
// path, which jsdom cannot run.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const places = `
  <li data-value="us">United States
    <ul>
      <li data-value="ca">California
        <ul>
          <li data-value="sf">San Francisco</li>
          <li data-value="la">Los Angeles</li>
        </ul>
      </li>
      <li data-value="wa">Washington</li>
    </ul>
  </li>
  <li data-value="cn">Canada</li>`;

const field = (id, extra = '', wrapper = '') => `<div class="field cascader" ${wrapper}>
      <input id="${id}" name="${id}" type="text" ${extra}>
      <label for="${id}">${id}</label>
      <ul class="cascader-options">${places}</ul>
    </div>`;

// The outside button comes first: the open popover covers what follows the field.
const html = `<style>${css}</style>
  <button type="button" id="outside">Outside</button>
  <form id="form">
    ${field('place')}
    <button type="submit">Send</button>
    <button type="reset" id="clear">Reset</button>
  </form>
  <script>${js}</script>
  <script>
    window.submitted = {};
    for (const form of document.forms) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        window.submitted[form.id] = new FormData(form).getAll('place');
      });
    }
    window.events = [];
    for (const type of ['input', 'change']) {
      document.getElementById('place').addEventListener(type, () => window.events.push(type));
    }
    Expressive.AutoInit();
  </script>`;

/** The open columns' option labels, the options on the open path, the focused element and the input. */
const state = (page) =>
  page.evaluate(() => {
    const input = document.getElementById('place');
    const popover = input.closest('.cascader').querySelector('.cascader-popover');
    const columns = [...popover.querySelectorAll('[role="listbox"]')];
    return {
      open: popover.matches(':popover-open'),
      columns: columns.map((column) => [...column.children].map((option) => option.textContent)),
      selected: [...popover.querySelectorAll('[aria-selected="true"]')].map((option) => option.textContent),
      focused: document.activeElement.id === 'place' ? 'input' : document.activeElement.textContent,
      value: input.value,
      events: window.events.join(','),
    };
  });

/** Runs `body` with the fixture in a fresh page in each engine, then closes the browser. */
function each(name, body) {
  for (const [engine, browserType, browserTest] of engines) {
    browserTest(`${engine}: ${name}`, async () => {
      const browser = await leaseBrowser(browserType);
      try {
        const page = await browser.newPage();
        await page.setContent(html);
        await body(page, engine);
      } finally {
        await browser.close();
      }
    });
  }
}

const option = (page, label) => page.getByRole('option', { name: label, exact: true });

each('clicks open a column per level, and a leaf commits the path once', async (page) => {
  await page.click('#place');
  assert.deepEqual((await state(page)).columns, [['United States', 'Canada']]);
  await option(page, 'United States').click();
  await option(page, 'California').click();
  let seen = await state(page);
  assert.deepEqual(seen.columns, [['United States', 'Canada'], ['California', 'Washington'], ['San Francisco', 'Los Angeles']]);
  assert.deepEqual(seen.selected, ['United States', 'California']);
  // A click on a branch keeps focus on it.
  assert.equal(seen.focused, 'California');

  await option(page, 'San Francisco').click();
  seen = await state(page);
  assert.equal(seen.open, false);
  assert.equal(seen.value, 'United States / California / San Francisco');
  assert.equal(seen.focused, 'input');
  assert.equal(seen.events, 'input,change');

  // Committing the same path again fires nothing.
  await page.click('#place');
  assert.deepEqual((await state(page)).selected, ['United States', 'California', 'San Francisco']);
  await option(page, 'San Francisco').click();
  assert.equal((await state(page)).events, 'input,change');

  await page.click('#place');
  await option(page, 'Los Angeles').click();
  seen = await state(page);
  assert.equal(seen.value, 'United States / California / Los Angeles');
  assert.equal(seen.events, 'input,change,input,change');
});

each('choosing another branch drops the columns after it, and a click outside closes without committing', async (page) => {
  await page.click('#place');
  await option(page, 'United States').click();
  await option(page, 'California').click();
  await option(page, 'United States').click();
  assert.deepEqual((await state(page)).columns, [['United States', 'Canada'], ['California', 'Washington']]);

  await page.click('#outside');
  const seen = await state(page);
  assert.equal(seen.open, false);
  assert.equal(seen.value, '');
  assert.equal(seen.events, '');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'outside');
});

each('a click on the open field closes it', async (page) => {
  await page.click('#place');
  await page.click('#place');
  assert.equal((await state(page)).open, false);
});

/** Presses each key in turn. */
const press = async (page, ...keys) => {
  for (const key of keys) await page.keyboard.press(key);
};

each('the keyboard opens the field, moves through the columns, commits a leaf and closes', async (page) => {
  for (const key of ['Enter', 'Space', 'ArrowDown', 'Alt+ArrowDown']) {
    await page.focus('#place');
    await press(page, key);
    const seen = await state(page);
    assert.deepEqual([seen.open, seen.focused], [true, 'United States'], key);
    await press(page, 'Escape');
    assert.deepEqual(await state(page).then((s) => [s.open, s.focused]), [false, 'input'], `${key} then Escape`);
  }

  await press(page, 'Enter', 'ArrowDown');
  assert.equal((await state(page)).focused, 'Canada');
  await press(page, 'ArrowDown');
  assert.equal((await state(page)).focused, 'Canada', 'no wrap past the last option');
  await press(page, 'ArrowUp');
  assert.equal((await state(page)).focused, 'United States');
  await press(page, 'End');
  assert.equal((await state(page)).focused, 'Canada');
  await press(page, 'Home', 'ArrowRight');
  let seen = await state(page);
  assert.deepEqual([seen.focused, seen.columns.length], ['California', 2]);
  await press(page, 'ArrowLeft');
  seen = await state(page);
  assert.deepEqual([seen.focused, seen.columns.length], ['United States', 2], 'ArrowLeft keeps the column');
  await press(page, 'ArrowLeft');
  assert.equal((await state(page)).focused, 'United States', 'nothing before the first column');
  await press(page, 'ArrowRight', 'ArrowRight', 'ArrowRight');
  seen = await state(page);
  assert.deepEqual([seen.focused, seen.columns.length], ['San Francisco', 3], 'ArrowRight on a leaf does nothing');

  await press(page, 'Escape');
  seen = await state(page);
  assert.deepEqual([seen.open, seen.focused, seen.value, seen.events], [false, 'input', '', '']);

  for (const key of ['Tab', 'Shift+Tab']) {
    await press(page, 'Enter', key);
    seen = await state(page);
    assert.deepEqual([seen.open, seen.focused, seen.value], [false, 'input', ''], key);
  }

  await press(page, 'Enter', 'ArrowRight', 'Enter', 'ArrowDown', 'Space');
  seen = await state(page);
  assert.deepEqual([seen.open, seen.focused, seen.value, seen.events], [false, 'input', 'United States / California / Los Angeles', 'input,change']);
  await press(page, 'Enter');
  seen = await state(page);
  assert.deepEqual([seen.focused, seen.selected], ['Los Angeles', ['United States', 'California', 'Los Angeles']], 'reopens at the committed leaf');
});

each('an Enter that confirms an IME candidate does not open the field', async (page) => {
  const opened = await page.evaluate(() => {
    const input = document.getElementById('place');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true }));
    return input.getAttribute('aria-expanded');
  });
  assert.equal(opened, 'false');
});

each('the input, popover, columns and options carry their roles, names and states', async (page) => {
  await page.focus('#place');
  await press(page, 'Enter', 'ArrowRight', 'ArrowRight');
  assert.equal(await page.getAttribute('#place', 'aria-expanded'), 'true');
  assert.equal(await page.getByRole('dialog', { name: 'place' }).count(), 1);
  for (const name of ['place', 'United States', 'California']) {
    assert.equal(await page.getByRole('listbox', { name, exact: true }).count(), 1, name);
  }
  const columns = await page.evaluate(() =>
    [...document.querySelectorAll('.cascader-popover [role="listbox"]')].map((column) => ({
      selected: [...column.querySelectorAll('[aria-selected="true"]')].map((o) => o.textContent),
      unselected: column.querySelectorAll('[aria-selected="false"]').length,
      stops: [...column.children].filter((o) => o.tabIndex === 0).length,
      chevrons: [...column.querySelectorAll('.cascader-chevron[aria-hidden="true"]')].map((c) => c.parentElement.textContent),
    })));
  assert.deepEqual(columns, [
    { selected: ['United States'], unselected: 1, stops: 1, chevrons: ['United States'] },
    { selected: ['California'], unselected: 1, stops: 1, chevrons: ['California'] },
    { selected: [], unselected: 2, stops: 1, chevrons: [] },
  ]);
  await press(page, 'Escape');
  assert.equal(await page.getAttribute('#place', 'aria-expanded'), 'false');
});

each('under dir="rtl" the columns run right to left and the arrow keys swap', async (page) => {
  await page.evaluate(() => (document.getElementById('form').dir = 'rtl'));
  await page.focus('#place');
  await press(page, 'Enter', 'ArrowLeft', 'ArrowLeft');
  let seen = await state(page);
  assert.deepEqual([seen.focused, seen.columns.length], ['San Francisco', 3]);
  const lefts = await page.evaluate(() =>
    [...document.querySelectorAll('.cascader-popover [role="listbox"]')].map((column) => column.getBoundingClientRect().left));
  assert.ok(lefts[0] > lefts[1] && lefts[1] > lefts[2], `column lefts ${lefts}`);
  await press(page, 'ArrowRight');
  seen = await state(page);
  assert.deepEqual([seen.focused, seen.columns.length], ['California', 3]);
});
