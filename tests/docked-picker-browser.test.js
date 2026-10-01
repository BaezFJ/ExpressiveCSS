import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit, expect } from '@playwright/test';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(type.executablePath()) ? test : test.skip;
  browserTest(`Docked Timepicker preserves edits during the clock transition (${engine})`, async () => {
    const browser = await type.launch();
    let page;
    try {
      page = await browser.newPage();
      await page.clock.pauseAt(new Date('2026-09-30T12:00:00Z'));
      await page.setContent(`<!doctype html><style>${css}</style>
        <style>*, *::before, *::after { transition: none !important; }</style>
        <div class="field"><input id="time" value="09:30 AM"></div>`);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => {
        window.picker = Expressive.Timepicker.init(document.querySelector('#time'), {
          displayPlugin: 'docked', autoSubmit: false, duration: 200, vibrate: false,
          displayPluginOptions: { duration: 0 }
        });
      });
      await page.locator('#time').click();
      await page.locator('.timepicker-hours .timepicker-tick').getByText('9', { exact: true }).click();
      assert.equal(await page.evaluate(() => picker.currentView), 'minutes');
      await page.getByRole('textbox', { name: 'Hours', exact: true }).fill('04');
      await page.clock.runFor(200);
      await expect(page.getByRole('textbox', { name: 'Hours', exact: true })).toHaveValue('04');
      await page.getByRole('button', { name: 'Ok', exact: true }).click();
      await expect(page.locator('#time')).toHaveValue('04:30 AM');
    } finally {
      try {
        await page?.evaluate(() => window.picker?.destroy());
      } finally {
        await browser.close();
      }
    }
  });
  for (const component of ['Datepicker', 'Timepicker']) {
    browserTest(`Docked ${component} follows its input across containing blocks (${engine})`, async () => {
      const browser = await type.launch();
      let page;
      try {
        page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
        for (const scenario of ['field', 'scrolled-parent', 'page-scroll', 'body', 'positioned-body', 'dialog', 'shadow', 'viewport-edge']) {
          await page.setContent(`<!doctype html>
            <style id="framework">${css}</style>
            <style>
              body { margin: 0; min-height: 2000px; }
              #parent { margin: 140px 0 0 120px; }
              .field { width: 240px; }
            </style>
            <div id="parent"><div id="content"><div class="field">
              <input id="picker-input" type="text"><label for="picker-input">Value</label>
            </div></div></div>`);
          await page.addScriptTag({ content: js });
          await page.evaluate(({ component, scenario }) => {
            scrollTo({ top: 0, left: 0, behavior: 'instant' });
            const parent = document.querySelector('#parent');
            const field = document.querySelector('.field');
            if (scenario === 'scrolled-parent') {
              parent.style.cssText += 'position:relative;width:800px;height:800px;overflow:auto;border:6px solid;padding:30px';
              document.querySelector('#content').style.cssText = 'width:1200px;height:1200px;padding:100px';
              field.style.position = 'static';
              parent.scrollLeft = 70;
              parent.scrollTop = 40;
            } else if (['page-scroll', 'body', 'positioned-body'].includes(scenario)) {
              parent.style.marginTop = '560px';
              if (scenario !== 'page-scroll') field.style.position = 'static';
              if (scenario === 'positioned-body') document.body.style.cssText = 'position:relative;margin:32px;border:7px solid;padding:20px';
              scrollTo({ top: 400, behavior: 'instant' });
            } else if (scenario === 'dialog') {
              const dialog = document.createElement('dialog');
              dialog.style.cssText = 'position:fixed;inset:100px auto auto 120px;margin:0;width:800px;height:800px';
              parent.before(dialog);
              dialog.append(parent);
              parent.style.margin = '20px';
              dialog.showModal();
            } else if (scenario === 'shadow') {
              const root = parent.attachShadow({ mode: 'open' });
              root.append(document.querySelector('#framework').cloneNode(true), field);
              field.style.width = '240px';
            } else if (scenario === 'viewport-edge') {
              parent.style.cssText = 'position:absolute;top:950px;left:1060px;margin:0';
            }
            window.picker = Expressive[component].init(field.querySelector('input'), {
              displayPlugin: 'docked', autoSubmit: false, openByDefault: component === 'Datepicker',
              displayPluginOptions: { duration: 0, margin: 7, transition: scenario === 'viewport-edge' ? 0 : 11 }
            });
          }, { component, scenario });
          try {
            await page.locator('#picker-input').click();
            await expect(page.locator('.display-docked')).toHaveCSS('opacity', '1');
            const geometry = await page.evaluate(() => {
              const input = picker.el;
              const popup = input.parentElement.querySelector('.display-docked');
              return {
                input: input.getBoundingClientRect().toJSON(),
                popup: popup.getBoundingClientRect().toJSON(),
                sameParent: input.parentElement === popup.parentElement,
                sameRoot: input.getRootNode() === popup.getRootNode()
              };
            });
            assert.ok(geometry.popup.width > 0 && geometry.popup.height > 0, `${scenario}: popup has dimensions`);
            assert.equal(geometry.sameParent && geometry.sameRoot, true, scenario);
            const expectedLeft = scenario === 'viewport-edge' ? 1280 - geometry.popup.width : geometry.input.left;
            const expectedTop = scenario === 'viewport-edge' ? 1200 - geometry.popup.height : geometry.input.bottom + 18;
            assert.ok(Math.abs(geometry.popup.left - expectedLeft) < 1, `${scenario}: left ${geometry.popup.left}, expected ${expectedLeft}`);
            assert.ok(Math.abs(geometry.popup.top - expectedTop) < 1, `${scenario}: top ${geometry.popup.top}, expected ${expectedTop}`);
          } finally {
            await page.evaluate(() => picker.destroy());
          }
        }
      } finally {
        try {
          await page?.evaluate(component => window.picker && Expressive[component].getInstance(picker.el)?.destroy(), component);
        } finally {
          await browser.close();
        }
      }
    });
  }
}
