import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit, expect } from '@playwright/test';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  const browserTest = existsSync(type.executablePath()) ? test : test.skip;
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
