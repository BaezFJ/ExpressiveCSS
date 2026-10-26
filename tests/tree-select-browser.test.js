// Tree select in real engines: the keyboard, the pointer and the form value.
// The tree's structure from data-parent runs in jsdom in tree-select.test.js.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

// Asia carries no disabled attribute, so TreeSelect has to disable it itself.
const options = `<option value="" disabled selected>Choose a place</option>
      <option value="europe" disabled>Europe</option>
      <option value="france" data-parent="europe" disabled>France</option>
      <option value="paris" data-parent="france">Paris</option>
      <option value="lyon" data-parent="france">Lyon</option>
      <option value="spain" data-parent="europe">Spain</option>
      <option value="asia">Asia</option>
      <option value="tokyo" data-parent="asia">Tokyo</option>
      <option value="kyoto" data-parent="asia" disabled>Kyoto</option>`;

const html = `<style>${css}</style>
  <form id="form">
    <div class="field">
      <select id="place" name="place" data-tree>${options}</select>
      <label for="place">Place</label>
    </div>
    <button type="submit">Send</button>
  </form>
  <form id="required-form">
    <div class="field">
      <select id="needed" name="needed" data-tree required>${options}</select>
      <label for="needed">Needed</label>
    </div>
  </form>
  <script>${js}</script>
  <script>
    window.submitted = null;
    document.getElementById('form').addEventListener('submit', (event) => {
      event.preventDefault();
      window.submitted = Object.fromEntries(new FormData(event.target));
    });
    window.changes = 0;
    document.getElementById('place').addEventListener('change', () => window.changes++);
  </script>`;

/** Opens the fixture and returns the page and a reader for the tree's state. */
async function open(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent(html);
  await page.evaluate(() => Expressive.AutoInit());
  const state = () =>
    page.evaluate(() => {
      const instance = Expressive.TreeSelect.getInstance(document.getElementById('place'));
      const row = (text) => Array.from(instance.tree.querySelectorAll('li')).find((li) => li.firstChild.textContent === text);
      const focused = document.activeElement.closest('li[role="treeitem"]');
      return {
        open: instance.menu.isOpen,
        role: instance.tree.getAttribute('role'),
        focused: focused ? focused.firstChild.textContent : null,
        field: instance.input.value,
        expanded: Object.fromEntries(['Europe', 'France', 'Asia'].map((text) => [text, row(text).ariaExpanded])),
        selected: row('Paris')?.ariaSelected
      };
    });
  return { page, state };
}

/** Runs `body` with a fresh page in each engine, then closes the browser. */
function each(name, body) {
  for (const [engine, browserType, browserTest] of engines) {
    browserTest(`${engine}: ${name}`, async () => {
      const browser = await leaseBrowser(browserType);
      try {
        await body(await open(browser), engine);
      } finally {
        await browser.close();
      }
    });
  }
}

/** Waits until focus is on the row with `text`. */
const focusOn = (page, text) =>
  page.waitForFunction((text) => document.activeElement.closest('li[role="treeitem"]')?.firstChild.textContent === text, text);

each('ArrowRight expands a branch, Enter chooses a leaf, and the form submits its value', async ({ page, state }) => {
  await page.focus('#form .field > input');
  await page.keyboard.press('Enter');
  await focusOn(page, 'Europe');
  assert.equal((await state()).role, 'tree');

  await page.keyboard.press('ArrowRight');
  assert.equal((await state()).expanded.Europe, 'true');
  await page.keyboard.press('ArrowDown');
  await focusOn(page, 'France');
  await page.keyboard.press('ArrowRight');
  assert.equal((await state()).expanded.France, 'true');
  await page.keyboard.press('ArrowDown');
  await focusOn(page, 'Paris');
  await page.keyboard.press('Enter');

  await page.waitForFunction(() => !Expressive.TreeSelect.getInstance(document.getElementById('place')).menu.isOpen);
  const after = await state();
  assert.equal(after.field, 'Paris');
  assert.equal(after.selected, 'true');

  const read = await page.evaluate(() => {
    const form = document.getElementById('form');
    form.requestSubmit();
    return { formData: new FormData(form).get('place'), submitted: window.submitted.place, changes: window.changes };
  });
  assert.deepEqual(read, { formData: 'paris', submitted: 'paris', changes: 1 });
});

/** Waits until the place tree has closed. */
const closed = (page) => page.waitForFunction(() => !Expressive.TreeSelect.getInstance(document.getElementById('place')).menu.isOpen);

/** Which arrow opens and which closes in each direction. */
const ARROWS = { ltr: ['ArrowRight', 'ArrowLeft'], rtl: ['ArrowLeft', 'ArrowRight'] };

for (const dir of ['ltr', 'rtl']) {
  each(`${dir}: the arrows, Home, End and * follow the tree pattern over visible, enabled rows`, async ({ page, state }) => {
    const [openKey, closeKey] = ARROWS[dir];
    await page.evaluate((dir) => { document.documentElement.dir = dir; }, dir);
    await page.focus('#form .field > input');
    await page.keyboard.press('Enter');
    await focusOn(page, 'Europe');

    // The disabled placeholder above Europe is skipped, and nothing wraps.
    await page.keyboard.press('ArrowUp');
    await focusOn(page, 'Europe');
    await page.keyboard.press(openKey);
    assert.equal((await state()).expanded.Europe, 'true');
    await page.keyboard.press(openKey);
    await focusOn(page, 'France');
    await page.keyboard.press(openKey);
    await page.keyboard.press(openKey);
    await focusOn(page, 'Paris');
    // A leaf does not open.
    await page.keyboard.press(openKey);
    await focusOn(page, 'Paris');

    await page.keyboard.press(closeKey);
    await focusOn(page, 'France');
    await page.keyboard.press(closeKey);
    assert.equal((await state()).expanded.France, 'false');
    await focusOn(page, 'France');
    await page.keyboard.press(closeKey);
    await focusOn(page, 'Europe');
    await page.keyboard.press(closeKey);
    assert.equal((await state()).expanded.Europe, 'false');
    // A closed root does nothing.
    await page.keyboard.press(closeKey);
    await focusOn(page, 'Europe');

    await page.keyboard.press('End');
    await focusOn(page, 'Asia');
    await page.keyboard.press('Home');
    await focusOn(page, 'Europe');
    await page.keyboard.press('*');
    assert.deepEqual((await state()).expanded, { Europe: 'true', France: 'false', Asia: 'true' });
    // Kyoto is last but disabled, so End stops on Tokyo and Down stays there.
    await page.keyboard.press('End');
    await focusOn(page, 'Tokyo');
    await page.keyboard.press('ArrowDown');
    await focusOn(page, 'Tokyo');
    assert.equal((await state()).open, true);
  });
}

each('typeahead moves to the next visible row that starts with the typed text', async ({ page }) => {
  await page.focus('#form .field > input');
  await page.keyboard.press('Enter');
  await focusOn(page, 'Europe');
  await page.keyboard.press('*');
  await page.keyboard.press('t');
  await focusOn(page, 'Tokyo');
  // A pause clears what was typed.
  await page.waitForTimeout(1100);
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await focusOn(page, 'France');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type('ly');
  await focusOn(page, 'Lyon');
});

each('Escape closes the tree and returns focus to the field, and Tab closes it', async ({ page, state }) => {
  await page.focus('#form .field > input');
  await page.keyboard.press('Enter');
  await focusOn(page, 'Europe');
  await page.keyboard.press('Escape');
  await closed(page);
  assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('#form .field > input')), true);

  await page.keyboard.press('Enter');
  await focusOn(page, 'Europe');
  await page.keyboard.press('Tab');
  await closed(page);
  assert.equal((await state()).field, 'Choose a place');
});

each('a click toggles a branch, a disabled leaf does nothing, and a leaf fires one change', async ({ page, state }) => {
  const row = (text) => page.locator('#form [role="tree"] li > span', { hasText: new RegExp(`^${text}$`) });
  await page.click('#form .field > input');
  await focusOn(page, 'Europe');
  await row('Asia').click();
  assert.equal((await state()).expanded.Asia, 'true');
  await row('Asia').click();
  assert.equal((await state()).expanded.Asia, 'false');
  await row('Asia').click();
  // A disabled row takes no pointer events, so the click lands on its group,
  // which must leave the branch around it open.
  await row('Kyoto').click({ force: true });
  assert.equal((await state()).open, true);
  assert.equal((await state()).expanded.Asia, 'true');
  assert.equal(await page.evaluate(() => window.changes), 0);

  await row('Tokyo').click();
  await closed(page);
  assert.equal((await state()).field, 'Tokyo');
  await page.click('#form .field > input');
  await focusOn(page, 'Tokyo');
  await row('Tokyo').click();
  await closed(page);
  assert.equal(await page.evaluate(() => window.changes), 1);
});

each('refresh() keeps open branches open and focus on the same row', async ({ page, state }) => {
  await page.focus('#form .field > input');
  await page.keyboard.press('Enter');
  await focusOn(page, 'Europe');
  for (const key of ['ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowDown', 'ArrowDown']) await page.keyboard.press(key);
  await focusOn(page, 'Lyon');

  await page.evaluate(() => {
    const select = document.getElementById('place');
    select.querySelector('[value="paris"]').remove();
    const madrid = new Option('Madrid', 'madrid');
    madrid.dataset.parent = 'spain';
    select.add(madrid);
    Expressive.TreeSelect.getInstance(select).refresh();
  });
  await focusOn(page, 'Lyon');
  const after = await state();
  assert.deepEqual(after.expanded, { Europe: 'true', France: 'true', Asia: 'false' });
  assert.equal(after.open, true);
  const spain = await page.evaluate(() => {
    const li = Array.from(document.querySelectorAll('#form [role="tree"] li')).find((row) => row.firstChild.textContent === 'Spain');
    return { expanded: li.ariaExpanded, disabled: document.querySelector('#place [value="spain"]').disabled };
  });
  assert.deepEqual(spain, { expanded: 'false', disabled: true });

  // A focused branch keeps focus as well.
  await page.keyboard.press('ArrowLeft');
  await focusOn(page, 'France');
  await page.evaluate(() => Expressive.TreeSelect.getInstance(document.getElementById('place')).refresh());
  await focusOn(page, 'France');
});

each('a required tree select that fails validation moves focus to its field and shows the message', async ({ page }) => {
  const read = await page.evaluate(async () => {
    const select = document.getElementById('needed');
    const valid = select.form.reportValidity();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const instance = Expressive.TreeSelect.getInstance(select);
    return {
      valid,
      focused: document.activeElement === instance.input,
      invalid: instance.input.ariaInvalid,
      message: instance.wrapper.querySelector('.supporting-text')?.textContent.length > 0
    };
  });
  assert.deepEqual(read, { valid: false, focused: true, invalid: 'true', message: true });
});

each('a branch the page selects shows in the field but is left out of the form data', async ({ page, state }) => {
  const read = await page.evaluate(() => {
    const select = document.getElementById('place');
    select.value = 'asia';
    Expressive.TreeSelect.getInstance(select).refresh();
    return { selected: select.value, entries: Array.from(new FormData(select.form).keys()) };
  });
  assert.deepEqual(read, { selected: 'asia', entries: [] });
  assert.equal((await state()).field, 'Asia');
});

for (const dir of ['ltr', 'rtl']) {
  each(`${dir}: levels indent, siblings line up, disabled rows match at every depth, and a chevron turns open`, async ({ page }) => {
    await page.evaluate((dir) => { document.documentElement.dir = dir; }, dir);
    await page.focus('#form .field > input');
    await page.keyboard.press('Enter');
    await focusOn(page, 'Europe');
    const chevron = () => page.evaluate(() => {
      const span = document.querySelector('#form [role="tree"] > li[aria-expanded] > span');
      return getComputedStyle(span, '::before').transform;
    });
    const closedChevron = await chevron();
    await page.keyboard.press('*');
    for (const key of ['ArrowDown', dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight']) await page.keyboard.press(key);
    await page.waitForFunction(() => document.querySelector('#form [role="tree"] li[aria-expanded="true"] li[aria-expanded="true"]'));

    // Where each row's text starts, measured on the text itself, from the inline start edge.
    const rows = await page.evaluate((dir) => Object.fromEntries(Array.from(document.querySelectorAll('#form [role="tree"] li > span'), (span) => {
      const range = document.createRange();
      range.selectNodeContents(span.lastChild);
      const box = range.getBoundingClientRect();
      const style = getComputedStyle(span);
      return [span.textContent, { start: dir === 'rtl' ? -box.right : box.left, color: style.color, opacity: getComputedStyle(span.parentElement).opacity }];
    })), dir);
    assert.ok(rows.Europe.start < rows.France.start && rows.France.start < rows.Paris.start, `${dir} indents`);
    // A branch's text starts after its chevron, where a leaf beside it starts.
    // WebKit places RTL text at sub-pixel offsets that differ by a few hundredths.
    const lineUp = (a, b) => assert.ok(Math.abs(rows[a].start - rows[b].start) < 0.5, `${dir} ${a} and ${b}: ${rows[a].start}, ${rows[b].start}`);
    lineUp('France', 'Spain');
    lineUp('Europe', 'Choose a place');
    lineUp('Tokyo', 'Kyoto');
    // Disabled rows look the same at each depth, and unlike enabled ones.
    assert.equal(rows['Choose a place'].color, rows.Kyoto.color);
    assert.notEqual(rows.Kyoto.color, rows.Tokyo.color);
    assert.deepEqual([rows['Choose a place'].opacity, rows.Kyoto.opacity], ['1', '1']);

    // Closed, a chevron points to the end edge; open, it settles pointing down once its transition ends.
    assert.equal(closedChevron, dir === 'rtl' ? 'matrix(0, 1, -1, 0, 0, 0)' : 'matrix(0, -1, 1, 0, 0, 0)');
    await page.waitForFunction(() => {
      const span = document.querySelector('#form [role="tree"] > li[aria-expanded] > span');
      return getComputedStyle(span, '::before').transform === 'none';
    });
  });
}

each('refresh() moves focus off a row that became disabled', async ({ page }) => {
  await page.focus('#form .field > input');
  await page.keyboard.press('Enter');
  await focusOn(page, 'Europe');
  for (const key of ['ArrowRight', 'ArrowDown', 'ArrowDown']) await page.keyboard.press(key);
  await focusOn(page, 'Spain');
  await page.evaluate(() => {
    const select = document.getElementById('place');
    select.querySelector('[value="spain"]').disabled = true;
    Expressive.TreeSelect.getInstance(select).refresh();
  });
  await focusOn(page, 'Europe');
  await page.keyboard.press('End');
  await focusOn(page, 'Asia');
});

each('the chosen row shows focus when the popup opens on it', async ({ page }) => {
  const fill = () => page.evaluate(() => getComputedStyle(document.querySelector('#form [role="tree"] li[aria-selected="true"] > span')).backgroundColor);
  await page.focus('#form .field > input');
  await page.keyboard.press('Enter');
  await focusOn(page, 'Europe');
  await page.keyboard.press('*');
  await page.keyboard.press('t');
  await focusOn(page, 'Tokyo');
  await page.keyboard.press('Enter');
  await closed(page);
  await page.keyboard.press('Enter');
  await focusOn(page, 'Tokyo');
  const focused = await fill();
  await page.keyboard.press('ArrowUp');
  await focusOn(page, 'Asia');
  assert.notEqual(focused, await fill());
});
