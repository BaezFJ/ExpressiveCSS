import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit, expect } from '@playwright/test';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
assert.ok(!process.env.EXPRESSIVECSS_TEST_BROWSER || ['chromium', 'firefox', 'webkit'].includes(process.env.EXPRESSIVECSS_TEST_BROWSER));
for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(type.executablePath()) ? test : test.skip;
  browserTest(`select and calendar treat external values as data (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      await page.setContent('<select><option value="one">One</option></select><input class="datepicker"><div id="result"></div>');
      await page.addScriptTag({ content: js });
      const result = await page.evaluate(() => {
        window.injected = false;
        const payload = '\"><img src=x onerror="window.injected=true">';
        document.querySelector('option').setAttribute('data-icon', 'java\nscript:window.injected=true');
        let select, date;
        try {
          select = Expressive.FormSelect.init(document.querySelector('select'));
          date = Expressive.Datepicker.init(document.querySelector('input.datepicker'));
          const host = document.querySelector('#result');
          host.innerHTML = date.renderTitle(date, 0, 2026, 8, 2026, payload) + date.renderTable(date.options, [], payload);
          let rejected = 0;
          for (const cell of ['<td onclick="window.injected=true">1</td>', '<td><img src=x onerror="window.injected=true"></td>']) {
            try { date.renderTable(date.options, [`<tr>${cell}</tr>`], 'title'); }
            catch (error) { if (error instanceof TypeError) rejected++; else throw error; }
          }
          return {
            icon: !!select.menuEl.querySelector('img'),
            value: select.input.value,
            id: host.querySelector('.datepicker-controls').id,
            labelledBy: host.querySelector('table').getAttribute('aria-labelledby'),
            images: host.querySelectorAll('img').length,
            rejected,
            payload
          };
        } finally { date?.destroy(); select?.destroy(); }
      });
      assert.equal(result.icon, false);
      assert.equal(result.value, 'One');
      assert.equal(result.id, result.payload);
      assert.equal(result.labelledBy, result.payload);
      assert.equal(result.images, 0);
      assert.equal(result.rejected, 2);
      assert.equal(await page.evaluate(() => window.injected), false);
    } finally { await browser.close(); }
  });

  browserTest(`Menu cancels superseded callbacks and teardown work (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      await page.setContent(`<style>${css}</style><button id="outside">Outside</button><button id="trigger" data-target="actions">Actions</button><menu id="actions"><li>Copy</li><li>Reset</li></menu>`);
      await page.addScriptTag({ content: js });
      await page.clock.install();
      await page.evaluate(() => {
        window.ends = [];
        window.menu = Expressive.Menu.init(document.querySelector('#trigger'), {
          inDuration: 40, outDuration: 60,
          onOpenEnd: () => ends.push('open'), onCloseEnd: () => ends.push('close')
        });
        menu.open(); menu.close(); menu.open();
      });
      await page.clock.runFor(100);
      await expect(page.locator('#actions')).toBeVisible();
      await expect(page.locator('#trigger')).toHaveAttribute('aria-expanded', 'true');
      assert.deepEqual(await page.evaluate(() => ends), ['open']);
      await page.evaluate(() => { menu.close(); menu.open(); menu.close(); });
      await page.clock.runFor(100);
      await expect(page.locator('#actions')).not.toBeVisible();
      assert.deepEqual(await page.evaluate(() => ends), ['open', 'close']);
      for (const phase of ['opening', 'closing']) {
        await page.evaluate(phase => {
          menu.open(); if (phase === 'closing') menu.close(); menu.destroy();
          document.querySelector('#outside').focus();
          window.afterDestroy = document.querySelector('#actions').getAttribute('style');
        }, phase);
        await page.clock.runFor(1100);
        assert.equal(await page.locator('#actions').getAttribute('style'), await page.evaluate(() => afterDestroy));
        await expect(page.locator('#outside')).toBeFocused();
        assert.deepEqual(await page.evaluate(() => ends), ['open', 'close']);
        assert.equal(await page.evaluate(() => Expressive.Menu._menus.length), 0);
        await page.evaluate(() => { window.menu = Expressive.Menu.init(document.querySelector('#trigger'), { inDuration: 40, outDuration: 60, onOpenEnd: () => ends.push('open'), onCloseEnd: () => ends.push('close') }); });
      }
      await page.evaluate(() => {
        document.querySelector('#actions > li').addEventListener('focus', () => menu.destroy(), { once: true });
        menu.open();
      });
      await page.clock.runFor(100);
      assert.deepEqual(await page.evaluate(() => ends), ['open', 'close']);
      await page.evaluate(() => {
        window.menu = Expressive.Menu.init(document.querySelector('#trigger'), { inDuration: 40, outDuration: 60 });
        menu.open();
      });
      await page.clock.runFor(100);
      await page.evaluate(() => {
        document.querySelector('#trigger').addEventListener('focus', () => menu.open(), { once: true });
        menu.close();
      });
      await page.clock.runFor(100);
      await expect(page.locator('#trigger')).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#actions')).toBeVisible();
      await page.evaluate(() => {
        menu.destroy();
        document.querySelector('#outside').focus();
        window.menu = Expressive.Menu.init(document.querySelector('#trigger'), { inDuration: 0, outDuration: 0 });
        document.querySelector('#actions > li').addEventListener('focus', event => {
          event.target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        }, { once: true });
        menu.open();
      });
      await page.clock.runFor(10);
      await expect(page.locator('#trigger')).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('#trigger')).toBeFocused();
      await expect(page.locator('#actions')).not.toBeVisible();
    } finally { try { await page?.evaluate(() => window.menu?.destroy()); } finally { await browser.close(); } }
  });

  browserTest(`Menu excludes closing content and preserves callback focus (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      await page.setContent(`<style>${css}</style><button id="before">Before</button><button id="trigger" data-target="actions">Actions</button><menu id="actions"><li><button>Copy</button></li></menu><button id="after">After</button>`);
      await page.addScriptTag({ content: js });
      await page.clock.install();
      await page.evaluate(() => window.menu = Expressive.Menu.init(document.querySelector('#trigger'), { inDuration: 40, outDuration: 1000 }));
      for (const reducedMotion of ['no-preference', 'reduce']) {
        await page.emulateMedia({ reducedMotion });
        await page.evaluate(() => menu.open());
        await page.clock.runFor(60);
        await page.keyboard.press('Escape');
        await expect(page.locator('#trigger')).toBeFocused();
        assert.equal(await page.locator('#actions').evaluate(el => getComputedStyle(el).display), 'block');
        await page.keyboard.press('Tab');
        await expect(page.locator('#after')).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await expect(page.locator('#trigger')).toBeFocused();
        await page.evaluate(() => menu.open());
        await page.clock.runFor(60);
        await expect(page.locator('#actions > li')).toBeFocused();
        await page.evaluate(() => {
          menu.options.onCloseStart = () => document.querySelector('#after').focus();
          menu.close();
        });
        await expect(page.locator('#after')).toBeFocused();
        await page.clock.runFor(1100);
        await expect(page.locator('#after')).toBeFocused();
        await page.evaluate(() => { menu.options.onCloseStart = null; menu.options.autoFocus = false; menu.open(); });
        await page.clock.runFor(60);
        await page.locator('#actions button').focus();
        await page.evaluate(() => menu.close());
        await page.keyboard.press('Tab');
        assert.equal(await page.locator('#actions').evaluate(el => el.contains(document.activeElement)), false);
        await page.evaluate(() => { menu.destroy(); window.menu = Expressive.Menu.init(document.querySelector('#trigger'), { inDuration: 40, outDuration: 1000 }); });
        assert.equal(await page.locator('#actions').getAttribute('inert'), null);
      }
      await page.evaluate(() => { menu.destroy(); document.querySelector('#actions').setAttribute('inert', ''); window.menu = Expressive.Menu.init(document.querySelector('#trigger')); menu.open(); menu.close(); menu.destroy(); });
      assert.equal(await page.locator('#actions').getAttribute('inert'), '');
    } finally { try { await page?.evaluate(() => window.menu?.destroy()); } finally { await browser.close(); } }
  });

  browserTest(`Menu scopes nested keys and mirrors flyouts in RTL (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage({ viewport: { width: 900, height: 700 }, reducedMotion: 'reduce' });
      await page.setContent(`<style>${css}</style><button id="trigger" style="position:absolute;top:20px;left:20px" data-target="actions">Actions</button><menu id="actions">
        <li id="root">Root</li><li id="parent"><button>More</button><menu>
          <li class="label">Heading</li><li id="alpha">Alpha</li><li id="disabled" class="disabled">Blocked</li><li id="beta">Beta</li>
          <li id="deep"><button>More again</button><menu><li id="leaf"><button>Leaf</button></li></menu></li>
        </menu></li><li id="last">Last</li></menu>`);
      await page.addScriptTag({ content: js });
      await page.clock.install();
      await page.evaluate(() => { window.activations = 0; window.menu = Expressive.Menu.init(document.querySelector('#trigger'), { inDuration: 40, outDuration: 60, onItemClick: () => activations++ }); });
      for (const autoFocus of [true, false]) for (const direction of ['ltr', 'rtl']) {
        await page.evaluate(({ direction, autoFocus }) => {
          activations = 0;
          document.documentElement.dir = direction;
          menu.options.autoFocus = autoFocus;
          document.querySelector('#trigger').focus();
          menu.open();
        }, { direction, autoFocus });
        await page.clock.runFor(60);
        await expect(page.locator(autoFocus ? '#root' : '#trigger')).toBeFocused();
        await page.locator('#parent').focus();
        const openKey = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
        const backKey = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
        await page.keyboard.press(openKey);
        await expect(page.locator('#alpha')).toBeFocused();
        const target = await page.locator('#alpha').boundingBox();
        assert.ok(target.width >= 44 && target.height >= 44);
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('#disabled')).toBeFocused();
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => activations), 0);
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('#beta')).toBeFocused();
        await page.keyboard.press('ArrowUp');
        await expect(page.locator('#disabled')).toBeFocused();
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('#beta')).toBeFocused();
        await page.keyboard.press('Shift');
        await page.keyboard.press('Control+a');
        assert.deepEqual(await page.evaluate(() => menu.filterQuery), []);
        await page.keyboard.press('a');
        await expect(page.locator('#alpha')).toBeFocused();
        await page.clock.runFor(1100);
        await page.keyboard.press('b');
        await expect(page.locator('#beta')).toBeFocused();
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('#deep')).toBeFocused();
        await page.keyboard.press(openKey);
        await expect(page.locator('#leaf')).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(page.locator('#deep')).toBeFocused();
        await page.clock.runFor(220);
        await expect(page.locator('#leaf')).toBeHidden();
        await expect(page.locator('#parent > button')).toHaveAttribute('aria-expanded', 'true');
        await page.keyboard.press(backKey);
        await expect(page.locator('#parent')).toBeFocused();
        await page.clock.runFor(220);
        await expect(page.locator('#alpha')).toBeHidden();
        for (const left of [20, 820]) {
          await page.evaluate(left => { menu.close(); document.querySelector('#trigger').style.left = `${left}px`; menu.open(); }, left);
          await page.clock.runFor(60);
          await page.locator('#parent').focus();
          await page.keyboard.press(openKey);
          await page.clock.runFor(220);
          const box = await page.locator('#parent > menu').boundingBox();
          assert.ok(box.x >= 7 && box.x + box.width <= 893, `${direction}: ${JSON.stringify(box)}`);
        }
        await page.locator('#beta').focus();
        await page.keyboard.press('Enter');
        await page.clock.runFor(100);
        assert.equal(await page.evaluate(() => activations), 1);
      }
    } finally { try { await page?.evaluate(() => window.menu?.destroy()); } finally { await browser.close(); } }
  });

  browserTest(`Menu consumers keep values and focus through closing (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      await page.setContent(`<style>${css}</style><form><div class="field"><label for="choice">Choice</label><select id="choice" name="choice"><option value="one">One</option><option value="two">Two</option></select></div><div class="field"><label for="query">Fruit</label><input id="query" name="fruit"></div><button id="after" type="button">After</button></form>`);
      await page.addScriptTag({ content: js });
      await page.clock.install();
      await page.evaluate(() => {
        window.changes = 0;
        document.querySelector('#choice').addEventListener('change', () => changes++);
        window.select = Expressive.FormSelect.init(document.querySelector('#choice'), { menuOptions: { inDuration: 40, outDuration: 1000 } });
        window.autocomplete = Expressive.Autocomplete.init(document.querySelector('#query'), { data: [{ id: 'apple' }, { id: 'apricot' }], menuOptions: { inDuration: 40, outDuration: 1000 } });
        select.menu.open();
      });
      await page.clock.runFor(60);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await expect(page.locator('#choice')).toHaveValue('two');
      assert.equal(await page.evaluate(() => changes), 1);
      assert.equal(await page.evaluate(() => new FormData(document.querySelector('form')).get('choice')), 'two');
      await expect(page.locator('input[role="combobox"]').first()).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.locator('#query')).toBeFocused();
      await page.keyboard.type('app');
      await page.clock.runFor(60);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await expect(page.locator('#query')).toHaveValue('apple');
      await expect(page.locator('#query')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.locator('#after')).toBeFocused();
      await page.clock.runFor(1100);
      await expect(page.locator('#after')).toBeFocused();
    } finally { try { await page?.evaluate(() => { window.autocomplete?.destroy(); window.select?.destroy(); }); } finally { await browser.close(); } }
  });

  browserTest(`enhanced select keeps enlarged multiline labels clear of values (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage({ viewport: { width: 375, height: 900 }, reducedMotion: 'reduce' });
      await page.setContent(`<style>${css}</style><main style="padding:16px"><div class="field"><select id="frequency"><option>Weekly</option></select><label for="frequency">Summary frequency</label></div></main>`);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => window.select = Expressive.FormSelect.init(document.querySelector('select')));
      for (const direction of ['ltr', 'rtl']) for (const size of [16, 32]) {
        await page.evaluate(({ direction, size }) => {
          document.documentElement.dir = direction;
          document.documentElement.style.fontSize = `${size}px`;
          document.querySelector('label').textContent = direction === 'rtl' ? 'تكرار إرسال ملخص مساحة العمل' : 'Summary frequency for workspace notifications';
        }, { direction, size });
        const geometry = await page.evaluate(() => {
          const label = document.querySelector('label'), input = document.querySelector('[role=combobox]');
          const range = document.createRange(); range.selectNodeContents(label);
          const text = range.getBoundingClientRect(), rect = input.getBoundingClientRect(), style = getComputedStyle(input);
          const valueTop = rect.top + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop) + (input.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - parseFloat(style.lineHeight)) / 2;
          return { labelBottom: text.bottom, valueTop, labelLeft: text.left, labelRight: text.right, width: innerWidth, scrollWidth: document.documentElement.scrollWidth };
        });
        assert.ok(geometry.labelBottom <= geometry.valueTop + 1, `${direction} ${size}: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.labelLeft >= 0 && geometry.labelRight <= geometry.width);
        assert.ok(geometry.scrollWidth <= geometry.width);
      }
      await page.evaluate(() => {
        document.documentElement.dir = 'ltr';
        document.documentElement.style.fontSize = '16px';
        document.querySelector('label').textContent = 'Frequency';
        const prefix = document.createElement('i'); prefix.className = 'prefix'; prefix.textContent = 'A';
        document.querySelector('.field').prepend(prefix);
        const small = document.createElement('small'); small.textContent = 'Supporting text'; document.querySelector('.field').append(small);
      });
      const prefixGeometry = await page.evaluate(() => {
        const range = document.createRange(); range.selectNodeContents(document.querySelector('label'));
        return { labelLeft: range.getBoundingClientRect().left, iconRight: document.querySelector('.prefix').getBoundingClientRect().right, fieldBackground: getComputedStyle(document.querySelector('.field')).backgroundColor };
      });
      assert.ok(prefixGeometry.labelLeft >= prefixGeometry.iconRight);
      assert.equal(prefixGeometry.fieldBackground, 'rgba(0, 0, 0, 0)');
    } finally { try { await page?.evaluate(() => window.select?.destroy()); } finally { await browser.close(); } }
  });

  browserTest(`Chips deletion targets and focus recovery (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      await page.setContent(`<style>${css}</style><form><div id="chips"><input name="tags" aria-label="Tags"></div><button id="outside" type="button">Outside</button></form>`);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => window.chips = null);
      await page.evaluate(() => document.querySelector('form').addEventListener('submit', e => { e.preventDefault(); window.submits++; }));
      for (const direction of ['ltr', 'rtl']) for (const reducedMotion of ['reduce', 'no-preference']) {
        await page.emulateMedia({ reducedMotion });
        await page.evaluate(direction => document.documentElement.dir = direction, direction);
        for (const action of ['Backspace', 'Delete', 'click', 'Enter', 'Space', 'programmatic']) for (const [count, index] of [[3, 0], [3, 1], [3, 2], [1, 0]]) {
          await page.evaluate(count => {
            window.chips?.destroy();
            window.deletions = 0; window.selections = 0; window.submits = 0;
            window.chips = Expressive.Chips.init(document.querySelector('#chips'), {
              allowUserInput: true, data: ['Apple', 'Pear', 'Plum'].slice(0, count).map(id => ({ id })),
              onChipDelete: () => deletions++, onChipSelect: () => selections++
            });
            chips.selectChip(count - 1);
            chips._input.value = 'Draft';
            selections = 0;
          }, count);
          const close = page.locator('#chips .close').nth(index);
          await close.focus();
          if (action === 'click') await close.locator('span').click();
          else if (action === 'programmatic') await page.evaluate(index => chips.deleteChip(index), index);
          else await page.keyboard.press(action);
          const expected = ['Apple', 'Pear', 'Plum'].slice(0, count).filter((_, i) => i !== index);
          assert.deepEqual(await page.evaluate(() => chips.getData().map(chip => chip.id)), expected);
          await expect(page.locator('#chips .chip')).toHaveCount(count - 1);
          assert.equal(await page.evaluate(() => deletions), 1);
          assert.equal(await page.evaluate(() => submits), 0);
          assert.equal(await page.evaluate(() => new FormData(document.querySelector('form')).get('tags')), 'Draft');
          const keyboardDelete = ['Backspace', 'Delete'].includes(action);
          if (keyboardDelete && count > 1) {
            const previous = Math.max(index - 1, 0);
            await expect(page.locator('#chips .close').nth(previous)).toBeFocused();
            await expect(page.locator('#chips .chip').nth(previous)).toHaveClass(/selected/);
            assert.equal(await page.evaluate(() => selections), 1);
          } else await expect(page.locator('#chips input')).toBeFocused();
        }
      }
    } finally { try { await page?.evaluate(() => window.chips?.destroy()); } finally { await browser.close(); } }
  });

  browserTest(`Chips callbacks and instance teardown preserve focus (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      await page.setContent(`<style>${css}</style><div id="one"></div><div id="two"></div><button id="outside">Outside</button>`);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => { window.one = null; window.two = null; });
      for (const action of ['Backspace', 'Delete', 'programmatic', 'click', 'Enter', 'Space']) {
        await page.evaluate(() => {
          window.one?.destroy(); window.two?.destroy(); window.deletions = 0;
          window.one = Expressive.Chips.init(document.querySelector('#one'), { allowUserInput: true, data: [{ id: 'One' }] });
          window.two = Expressive.Chips.init(document.querySelector('#two'), { allowUserInput: true, data: [{ id: 'Two' }, { id: 'Three' }], onChipDelete: () => { deletions++; document.querySelector('#outside').focus(); } });
          one.destroy();
        });
        await page.locator('#two .close').first().focus();
        if (action === 'programmatic') await page.evaluate(() => two.deleteChip(0));
        else if (action === 'click') await page.locator('#two .close').first().click();
        else await page.keyboard.press(action);
        await expect(page.locator('#outside')).toBeFocused();
        assert.equal(await page.evaluate(() => deletions), 1);
        assert.deepEqual(await page.evaluate(() => two.getData()), [{ id: 'Three' }]);
      }
      await page.evaluate(() => {
        two.options.onChipDelete = null;
        document.querySelector('#outside').focus();
        two.deleteChip(0);
      });
      await expect(page.locator('#outside')).toBeFocused();
      await page.evaluate(() => { two.addChip({ id: 'New' }); two.selectChip(0); two.deleteChip(0); });
      await expect(page.locator('#two input')).toBeFocused();
      await page.evaluate(() => {
        two.addChip({ id: 'First' }); two.addChip({ id: 'Last' }); two.selectChip(1);
        two.deleteChip(0);
      });
      await expect(page.locator('#two .close')).toBeFocused();
      await expect(page.locator('#two .chip')).toHaveClass(/selected/);
      await page.evaluate(() => { two.options.onChipDelete = () => two.destroy(); });
      await page.keyboard.press('Delete');
      await expect(page.locator('#two .chip')).toHaveCount(0);
      for (const mode of ['open', 'closed']) for (const destination of ['document', 'parent', 'local', 'none']) for (const action of ['Delete', 'Enter', 'programmatic']) {
        await page.evaluate(({ mode, destination }) => {
          window.shadowChips?.destroy(); window.shadowHost?.remove();
          window.shadowHost = document.createElement('div'); document.body.append(shadowHost);
          const parent = shadowHost.attachShadow({ mode });
          const parentButton = document.createElement('button'); parentButton.textContent = 'Parent'; parent.append(parentButton);
          const host = document.createElement('div'); parent.append(host);
          const root = host.attachShadow({ mode });
          const container = document.createElement('div'); root.append(container);
          const localButton = document.createElement('button'); localButton.textContent = 'Local'; root.append(localButton);
          window.focusTarget = destination === 'document' ? document.querySelector('#outside') : destination === 'parent' ? parentButton : localButton;
          window.shadowChips = Expressive.Chips.init(container, {
            allowUserInput: true, data: [{ id: 'First' }, { id: 'Last' }],
            onChipDelete: destination === 'none' ? null : () => focusTarget.focus()
          });
          shadowChips.selectChip(0);
        }, { mode, destination });
        if (action === 'programmatic') await page.evaluate(() => shadowChips.deleteChip(0));
        else await page.keyboard.press(action);
        assert.equal(await page.evaluate(({ action, destination }) => {
          const target = destination === 'none' ? (action === 'Delete' ? shadowChips._chips[0].querySelector('.close') : shadowChips._input) : focusTarget;
          return target.getRootNode().activeElement === target;
        }, { action, destination }), true, `${mode} ${destination} ${action}`);
        assert.deepEqual(await page.evaluate(() => shadowChips.getData()), [{ id: 'Last' }]);
      }
    } finally { try { await page?.evaluate(() => { window.one?.destroy(); window.two?.destroy(); window.shadowChips?.destroy(); window.shadowHost?.remove(); }); } finally { await browser.close(); } }
  });

  browserTest(`Chips wrapped labels keep separate actions reachable (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage({ viewport: { width: 320, height: 600 } });
      await page.setContent(`<style>${css}</style><div class="chips" style="width:280px"><span class="chip"><button type="button" id="action">A translated chip label with several words</button><button type="button" class="close" aria-label="Remove label">X</button></span></div><div id="editable" style="width:280px"></div>`);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => { window.chips = Expressive.Chips.init(document.querySelector('#editable'), { allowUserInput: true, data: [{ id: 'A translated label with several words and averylongunbrokentextvalue' }] }); });
      for (const direction of ['ltr', 'rtl']) for (const size of [14, 28]) {
        await page.evaluate(({ direction, size }) => {
          document.documentElement.dir = direction;
          document.querySelectorAll('.chip').forEach(chip => chip.style.setProperty('--font-size', `${size}px`));
        }, { direction, size });
        const geometry = await page.evaluate(() => Array.from(document.querySelectorAll('.chip')).map(chip => {
          const box = chip.getBoundingClientRect(), close = chip.querySelector('.close').getBoundingClientRect();
          const range = document.createRange(); range.selectNodeContents(chip.querySelector('#action') ?? chip.firstChild);
          const label = range.getBoundingClientRect();
          return { left: box.left, right: box.right, labelTop: label.top, labelBottom: label.bottom, top: box.top, bottom: box.bottom,
            separate: label.right <= close.left || close.right <= label.left, closeWidth: close.width, closeHeight: close.height, overflow: document.documentElement.scrollWidth > innerWidth };
        }));
        for (const box of geometry) {
          assert.ok(!box.overflow && box.left >= 0 && box.right <= 320, JSON.stringify(box));
          assert.ok(box.separate && box.labelTop >= box.top && box.labelBottom <= box.bottom, JSON.stringify(box));
          assert.ok(box.closeWidth >= 24 && box.closeHeight >= 24, JSON.stringify(box));
        }
      }
      await page.evaluate(() => {
        window.actions = 0;
        document.querySelector('#action').addEventListener('click', () => actions++);
      });
      await page.locator('#action').click();
      assert.equal(await page.evaluate(() => actions), 1);
      await expect(page.locator('#action')).toBeVisible();
      await page.evaluate(() => document.querySelector('#action').disabled = true);
      await expect(page.locator('#action')).toBeDisabled();
      await page.locator('.chips').first().locator('.close').click();
      await expect(page.locator('#action')).toHaveCount(0);
      assert.equal(await page.evaluate(() => actions), 1);
    } finally { try { await page?.evaluate(() => window.chips?.destroy()); } finally { await browser.close(); } }
  });
}
