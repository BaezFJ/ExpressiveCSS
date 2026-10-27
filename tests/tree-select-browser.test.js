// Tree select in real engines: the keyboard, the pointer and the form value.
// The tree's structure from data-parent runs in jsdom in tree-select.test.js.

import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
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
async function open(browser, settings) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent(html);
  await page.evaluate(settings => {
    const select = document.getElementById('place');
    if (settings) select.dataset.treeSelectOptions = JSON.stringify(settings);
    Expressive.AutoInit();
    if (settings) window.treeSelect = Expressive.TreeSelect.getInstance(select);
  }, settings);
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
function each(name, body, settings) {
  for (const [engine, browserType, browserTest] of engines) {
    browserTest(`${engine}: ${name}`, async () => {
      const browser = await leaseBrowser(browserType);
      let page;
      try {
        const fixture = await open(browser, settings);
        page = fixture.page;
        await body(fixture, engine);
      } finally {
        try {
          await page?.evaluate(() => {
            window.treeSelect?.destroy();
            document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
            document.querySelectorAll('select[data-tree]').forEach(select => Expressive.TreeSelect.getInstance(select)?.destroy());
          });
        } finally { await browser.close(); }
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


const treeSearch = (name, body) => each(`searchable tree ${name}`, body,
  { searchable: true, menuOptions: { inDuration: 0, outDuration: 0 } });
const treeLabel = (page, name) => page.locator('#form li[role="treeitem"] > span').filter({ hasText: new RegExp('^' + name + '$') });
// Read cleared state after closing too; real actions still require visibility.
const searchInput = page => page.getByRole('searchbox', { name: 'Search options', includeHidden: true });
const treeTrigger = page => page.locator('#form .field > input');

treeSearch('reveals matching paths, hides other painted rows and restores prior expansion', async ({ page, state }) => {
  await treeTrigger(page).click();
  const search = searchInput(page);
  await expect(search).toBeFocused();
  const popup = page.getByRole('dialog', { name: 'Place', exact: true });
  await expect(popup.getByRole('tree', { name: 'Place', exact: true })).toBeVisible();
  await expect(popup.getByRole('listbox')).toHaveCount(0);
  await treeLabel(page, 'Asia').click();
  const before = (await state()).expanded;
  await search.click();
  await page.keyboard.type('pAr');
  await expect(search).toBeFocused();
  await expect(treeLabel(page, 'Europe')).toBeVisible();
  await expect(treeLabel(page, 'France')).toBeVisible();
  await expect(treeLabel(page, 'Paris')).toBeVisible();
  await expect(treeLabel(page, 'Lyon')).toBeHidden();
  await expect(treeLabel(page, 'Asia')).toBeHidden();
  await search.fill('tok');
  await expect(treeLabel(page, 'Tokyo')).toBeVisible();
  await expect(treeLabel(page, 'Europe')).toBeHidden();
  await search.fill('');
  assert.deepEqual((await state()).expanded, before);
  assert.equal(await page.locator('#place').inputValue(), '');
  assert.equal(await page.evaluate(() => changes), 0);
  await page.keyboard.press('Escape');
  await expect(treeTrigger(page)).toBeFocused();
});

treeSearch('selects a filtered leaf once and submits its native value', async ({ page, state }) => {
  await treeTrigger(page).click();
  await expect(searchInput(page)).toBeFocused();
  await page.keyboard.type('par');
  await page.keyboard.press('ArrowDown');
  await focusOn(page, 'Europe');
  await page.keyboard.press('ArrowRight');
  await focusOn(page, 'France');
  await page.keyboard.press('ArrowRight');
  await focusOn(page, 'Paris');
  await page.keyboard.press('Enter');
  await expect(treeTrigger(page)).toBeFocused();
  assert.equal((await state()).field, 'Paris');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => ({ submitted, changes })), { submitted: { place: 'paris' }, changes: 1 });
  assert.deepEqual((await state()).expanded, { Europe: 'false', France: 'false', Asia: 'false' });
});


treeSearch('keeps editing and synthetic composition guards separate from tree keys and Tab exit', async ({ page }) => {
  await treeTrigger(page).focus();
  await page.keyboard.press('Enter');
  const search = searchInput(page);
  await expect(search).toBeFocused();
  await page.keyboard.type('pa ris');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  assert.equal(await search.evaluate(el => el.selectionStart), 1);
  await page.keyboard.press('Space');
  assert.equal(await search.inputValue(), 'p a ris');
  await page.keyboard.press('End');
  assert.equal(await search.evaluate(el => el.selectionStart), 7);
  await search.fill('par');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => submitted), null);
  // Synthetic events exercise guards only, not native OS IME composition.
  await search.dispatchEvent('keydown', { key: 'Escape', isComposing: true });
  await search.dispatchEvent('keydown', { key: 'Enter', keyCode: 229 });
  assert.equal(await page.evaluate(() => treeSelect.menu.isOpen), true);
  await page.keyboard.press('Tab');
  await focusOn(page, 'Europe');
  await page.keyboard.press('Shift+Tab');
  await expect(search).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await focusOn(page, 'Paris');
  await page.keyboard.press('Home');
  await focusOn(page, 'Europe');
  await page.keyboard.press('ArrowUp');
  await focusOn(page, 'Europe');
  await page.keyboard.press('End');
  await focusOn(page, 'Paris');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeFocused();
  await treeTrigger(page).click();
  await search.fill('missing');
  await expect(page.locator('#form [role="status"]')).toHaveText('No results');
  await page.keyboard.press('ArrowDown');
  await expect(search).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeFocused();
  await treeTrigger(page).click();
  await expect(search).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(treeTrigger(page)).toBeFocused();
  assert.equal(await page.evaluate(() => changes), 0);
});

treeSearch('preserves caret and expansion through live refresh, canceled reset and native reset', async ({ page, state }) => {
  await page.evaluate(() => { treeSelect.el.value = 'lyon'; treeSelect.refresh(); });
  await treeTrigger(page).click();
  const search = searchInput(page);
  await expect(search).toBeFocused();
  await treeLabel(page, 'Asia').click();
  const before = (await state()).expanded;
  await search.fill('par');
  await search.evaluate(el => el.setSelectionRange(1, 1));
  await page.evaluate(() => treeSelect.refresh());
  await expect(search).toBeFocused();
  assert.equal(await search.evaluate(el => el.selectionStart), 1);
  await page.evaluate(() => {
    treeSelect.el.querySelector('[value="paris"]').remove();
    treeSelect.refresh();
  });
  await expect(page.locator('#form [role="status"]')).toHaveText('No results');
  await page.evaluate(() => {
    treeSelect.el.form.addEventListener('reset', event => event.preventDefault(), { once: true });
    treeSelect.el.form.reset();
    return new Promise(resolve => setTimeout(resolve, 0));
  });
  assert.equal(await search.inputValue(), 'par');
  assert.equal(await page.locator('#place').inputValue(), 'lyon');
  await page.evaluate(() => {
    treeSelect.el.form.reset();
    return new Promise(resolve => setTimeout(resolve, 0));
  });
  assert.equal(await search.inputValue(), '');
  assert.equal(await page.locator('#place').inputValue(), '');
  assert.deepEqual((await state()).expanded, before);
  assert.equal(await page.evaluate(() => treeSelect.menu.isOpen), false);
  assert.equal(await page.evaluate(() => changes), 0);
});


treeSearch('restores the pre-query view when its select or fieldset is disabled and refreshed', async ({ page, state }) => {
  for (const boundary of ['select', 'fieldset']) {
    await treeTrigger(page).click();
    const search = searchInput(page);
    await expect(search).toBeFocused();
    await treeLabel(page, 'Asia').click();
    const before = (await state()).expanded;
    await search.fill('par');
    await page.evaluate(boundary => {
      let disabled = treeSelect.el;
      if (boundary === 'fieldset') {
        disabled = document.createElement('fieldset');
        treeSelect.wrapper.before(disabled);
        disabled.append(treeSelect.wrapper);
      }
      window.disabledTreeBoundary = disabled;
      disabled.disabled = true;
      treeSelect.refresh();
    }, boundary);
    await expect(treeTrigger(page)).toBeDisabled();
    assert.equal(await search.inputValue(), '');
    assert.equal(await page.evaluate(() => treeSelect.menu.isOpen), false);
    assert.deepEqual((await state()).expanded, before);
    await page.evaluate(() => { disabledTreeBoundary.disabled = false; treeSelect.refresh(); });
    await expect(treeTrigger(page)).toBeEnabled();
  }
});

treeSearch('keeps filtered RTL navigation, typeahead, disabled pointer attempts and leaf clicks consistent', async ({ page }) => {
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  await treeTrigger(page).click();
  const search = searchInput(page);
  await expect(search).toBeFocused();
  await search.fill('kyoto');
  const disabled = treeLabel(page, 'Kyoto');
  await expect(disabled).toBeVisible();
  const box = await disabled.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  assert.equal(await page.evaluate(() => changes), 0);
  await search.click();
  await page.keyboard.press('ArrowDown');
  await focusOn(page, 'Asia');
  await page.keyboard.press('ArrowDown');
  await focusOn(page, 'Asia');
  await search.fill('ly');
  await page.keyboard.press('ArrowDown');
  await focusOn(page, 'Europe');
  await page.keyboard.press('ArrowLeft');
  await focusOn(page, 'France');
  await page.keyboard.press('ArrowLeft');
  await focusOn(page, 'Lyon');
  await page.keyboard.press('ArrowRight');
  await focusOn(page, 'France');
  await page.keyboard.press('Home');
  await page.keyboard.press('l');
  await focusOn(page, 'Lyon');
  await page.keyboard.press('Escape');
  await expect(treeTrigger(page)).toBeFocused();
  assert.equal(await page.evaluate(() => changes), 0);
  await treeTrigger(page).click();
  await expect(search).toBeFocused();
  await search.fill('ly');
  await treeLabel(page, 'Lyon').click();
  await expect(treeTrigger(page)).toBeFocused();
  assert.equal(await page.locator('#place').inputValue(), 'lyon');
  assert.equal(await page.evaluate(() => changes), 1);
});


treeSearch('respects autoFocus false, callback context and outside focus', async ({ page }) => {
  await page.evaluate(() => {
    const select = treeSelect.el;
    treeSelect.destroy();
    window.calls = [];
    window.treeSelect = Expressive.TreeSelect.init(select, { searchable: true, menuOptions: {
      inDuration: 0, outDuration: 0, autoFocus: false,
      onOpenEnd(el) { calls.push(['open', el === select, this === treeSelect.menu]); },
      onCloseStart(el) { calls.push(['close', el === select, this === treeSelect.menu]); }
    } });
    const outside = document.createElement('button');
    outside.type = 'button';
    outside.textContent = 'Outside tree';
    document.body.prepend(outside);
    document.getElementById('form').style.marginBlockStart = '5rem';
    outside.focus();
    treeSelect.menu.open();
  });
  await expect.poll(() => page.evaluate(() => calls.length)).toBe(1);
  const outside = page.getByRole('button', { name: 'Outside tree', exact: true });
  await expect(outside).toBeFocused();
  await treeTrigger(page).focus();
  await page.keyboard.press('Tab');
  const search = searchInput(page);
  await expect(search).toBeFocused();
  await search.fill('par');
  await page.keyboard.press('Escape');
  await expect(treeTrigger(page)).toBeFocused();
  await treeTrigger(page).click();
  await expect.poll(() => page.evaluate(() => calls.length)).toBe(3);
  await search.click();
  await search.fill('ly');
  assert.equal(await outside.evaluate(el => {
    const box = el.getBoundingClientRect();
    return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === el;
  }), true, 'outside target is uncovered before the real click');
  await outside.click();
  await expect.poll(() => page.evaluate(() => treeSelect.menu.isOpen)).toBe(false);
  await expect(outside).toBeFocused();
  assert.equal(await search.inputValue(), '');
  assert.deepEqual(await page.evaluate(() => calls), [
    ['open', true, true], ['close', true, true], ['open', true, true], ['close', true, true]
  ]);
});

treeSearch('preserves result focus through delayed opening in native dialogs and shadow roots', async ({ page }) => {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  for (const kind of ['dialog', 'shadow']) {
    await page.evaluate(kind => {
      const form = treeSelect.el.form;
      treeSelect.destroy();
      const select = form.querySelector('select');
      select.value = '';
      window.changes = 0;
      window.submitted = null;
      const host = document.createElement(kind === 'dialog' ? 'dialog' : 'div');
      document.body.append(host);
      const root = kind === 'shadow' ? host.attachShadow({ mode: 'open' }) : host;
      root.append(document.querySelector('style').cloneNode(true), form);
      if (kind === 'dialog') host.showModal();
      window.treeSelect = Expressive.TreeSelect.init(select, { searchable: true,
        menuOptions: { inDuration: 100, outDuration: 0 } });
    }, kind);
    await treeTrigger(page).click();
    const search = searchInput(page);
    await search.fill('par');
    await page.keyboard.press('ArrowUp');
    const paris = treeLabel(page, 'Paris').locator('..');
    await expect(paris).toBeFocused();
    await page.clock.runFor(100);
    await expect(paris).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(treeTrigger(page)).toBeFocused();
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => ({ submitted, changes, value: treeSelect.el.value })),
      { submitted: { place: 'paris' }, changes: 1, value: 'paris' });
    await page.evaluate(() => document.querySelector('dialog')?.close());
  }
});


treeSearch('keeps search fixed while enlarged RTL results scroll with forced-color focus', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 600 });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.style.fontSize = '32px';
    for (let index = 0; index < 120; index++) {
      const option = new Option('Item ' + index, String(index));
      option.dataset.parent = 'asia';
      treeSelect.el.append(option);
    }
    treeSelect.refresh();
  });
  await treeTrigger(page).click();
  const search = searchInput(page);
  await expect(search).toBeFocused();
  assert.notEqual(await search.evaluate(el => getComputedStyle(el).outlineStyle), 'none');
  await search.fill('Item');
  await page.keyboard.press('ArrowUp');
  const last = treeLabel(page, 'Item 119');
  await expect(last.locator('..')).toBeFocused();
  await expect(last).toBeInViewport({ ratio: 1 });
  assert.notEqual(await last.evaluate(el => getComputedStyle(el).outlineStyle), 'none');
  const geometry = await page.evaluate(() => {
    const popup = treeSelect.menuEl.getBoundingClientRect();
    const search = treeSelect.menuEl.querySelector('input').getBoundingClientRect();
    return { top: popup.top, right: popup.right, bottom: popup.bottom,
      searchTop: search.top, searchBottom: search.bottom, scrolled: treeSelect.tree.scrollTop > 0 };
  });
  assert.equal(geometry.scrolled, true);
  assert.ok(geometry.searchTop >= geometry.top && geometry.searchBottom <= geometry.bottom, JSON.stringify(geometry));
  assert.ok(geometry.top >= 0 && geometry.right <= 361 && geometry.bottom <= 601, JSON.stringify(geometry));
});


treeSearch('keeps an initially disabled search hidden and enables its hierarchy through refresh', async ({ page }) => {
  await page.evaluate(() => {
    const select = treeSelect.el;
    treeSelect.destroy();
    select.disabled = true;
    window.treeSelect = Expressive.TreeSelect.init(select, { searchable: true,
      menuOptions: { inDuration: 0, outDuration: 0 } });
  });
  const search = searchInput(page);
  await expect(search).toBeHidden();
  await expect(treeTrigger(page)).toBeDisabled();
  await page.evaluate(() => { treeSelect.el.disabled = false; treeSelect.refresh(); });
  await treeTrigger(page).click();
  await expect(search).toBeFocused();
  await search.fill('par');
  await page.keyboard.press('ArrowUp');
  await focusOn(page, 'Paris');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#place').inputValue(), 'paris');
  assert.equal(await page.evaluate(() => changes), 1);
});


treeSearch('fits translated no-results feedback in a transformed narrow container', async ({ page }) => {
  const message = 'Keine passenden Einträge gefunden. Bitte ändern Sie den Suchbegriff und versuchen Sie es erneut.';
  await page.evaluate(message => {
    const select = treeSelect.el;
    treeSelect.destroy();
    select.innerHTML = '<option value="group" disabled>Places</option><option value="paris" data-parent="group">Paris</option>';
    Object.assign(select.form.style, { width: '160px', transform: 'translateX(1px)' });
    window.treeSelect = Expressive.TreeSelect.init(select, { searchable: true,
      i18n: { noResults: message }, menuOptions: { inDuration: 0, outDuration: 0 } });
  }, message);
  await treeTrigger(page).click();
  const search = searchInput(page);
  await expect(search).toBeFocused();
  await search.fill('missing');
  await expect(page.locator('.select-search-popup > [role="status"]')).toHaveText(message);
  const geometry = await page.evaluate(() => {
    const popup = treeSelect.menuEl.getBoundingClientRect();
    const status = treeSelect.menuEl.querySelector('[role="status"]').getBoundingClientRect();
    return { popupBottom: popup.bottom, statusBottom: status.bottom };
  });
  assert.ok(geometry.statusBottom <= geometry.popupBottom, JSON.stringify(geometry));
  await expect(search).toBeFocused();
});

treeSearch('paints keyboard focus on filtered leaf labels in light and dark themes', async ({ page }) => {
  await treeTrigger(page).click();
  const search = searchInput(page);
  await search.fill('par');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.setAttribute('theme', theme), theme);
    await search.focus();
    await search.press('ArrowUp');
    const label = treeLabel(page, 'Paris');
    await expect(label.locator('..')).toBeFocused();
    const paint = await label.evaluate(el => ({
      focused: el.parentElement.matches(':focus-visible'),
      background: getComputedStyle(el).backgroundColor,
      height: el.offsetHeight
    }));
    assert.equal(paint.focused, true);
    assert.ok(!['transparent', 'rgba(0, 0, 0, 0)'].includes(paint.background), JSON.stringify(paint));
    assert.ok(paint.height >= 44, JSON.stringify(paint));
  }
});
