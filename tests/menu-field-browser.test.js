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
      for (const direction of ['ltr', 'rtl']) {
        await page.evaluate(dir => { document.documentElement.dir = dir; menu.open(); }, direction);
        await page.clock.runFor(60);
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
        assert.equal(await page.evaluate(() => activations), direction === 'ltr' ? 0 : 1);
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
        assert.equal(await page.evaluate(() => activations), direction === 'ltr' ? 1 : 2);
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
}
