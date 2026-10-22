// AutoInit watch mode in real engines: a menu added after load opens without
// init and is destroyed when removed, and components that insert and start
// their own markup keep the instances they built.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const menu = (id) => `<button type="button" class="menu-trigger" id="${id}" data-target="${id}-menu">Open</button>
  <menu id="${id}-menu"><li><button type="button">One</button></li></menu>`;

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  /** A page that watches its body, with page errors and console errors collected. */
  const setup = async (browser) => {
    const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
    await page.setContent(`<style>${css}</style><style>*, *::before, *::after { transition: none !important; }</style><main id="app"></main><script>${js}</script>`);
    await page.evaluate(() => {
      window.stopWatching = Expressive.AutoInit(document.body, { Menu: { inDuration: 0, outDuration: 0 } }, { watch: true });
    });
    return { page, errors };
  };

  browserTest(`${engine}: a menu added after load opens without init and is destroyed when removed`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, errors } = await setup(browser);
      await page.evaluate((html) => document.getElementById('app').insertAdjacentHTML('beforeend', html), menu('t'));
      await page.waitForFunction(() => Expressive.Menu.getInstance(document.getElementById('t')));
      await page.locator('#t').click();
      await page.waitForFunction(() => document.getElementById('t').getAttribute('aria-expanded') === 'true');
      await page.keyboard.press('Escape');
      await page.evaluate(() => {
        window.trigger = document.getElementById('t');
        window.trigger.remove();
        document.getElementById('t-menu').remove();
      });
      await page.waitForFunction(() => Expressive.Menu.getInstance(window.trigger) === undefined);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: components that insert their own markup keep their instances while watched`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const { page, errors } = await setup(browser);
      await page.evaluate((html) => document.getElementById('app').insertAdjacentHTML('beforeend', html), `
        <div class="field"><input type="text" class="date-picker" id="d"><label for="d">Date</label></div>
        <div class="field"><input type="text" class="time-picker" id="tp"><label for="tp">Time</label></div>
        <div class="field"><select id="s"><option value="1">One</option><option value="2">Two</option></select><label for="s">Pick</label></div>
        ${menu('m')}
        <a class="button tooltipped" id="tt" data-tooltip="Hi">Tip</a>`);
      await page.waitForFunction(() => ['Datepicker', 'Timepicker', 'FormSelect', 'Menu', 'Tooltip'].every((name, i) =>
        Expressive[name].getInstance(document.getElementById(['d', 'tp', 's', 'm', 'tt'][i]))));
      const settle = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve))));
      // Every live instance in the page, from the Expressive_<Name> property each component sets on its element.
      const instances = () => page.evaluate(() => [...document.querySelectorAll('*')]
        .flatMap((el) => Object.keys(el).filter((key) => key.startsWith('Expressive_') && el[key]))
        .sort());
      const datepickerSelects = () => page.evaluate(() => [...document.querySelectorAll('.orig-select-month, .orig-select-year')]
        .map((select) => Expressive.FormSelect.getInstance(select)?.options.classes ?? 'none').sort());
      await settle();
      const before = await instances();
      assert.deepEqual(await datepickerSelects(), ['select-month', 'select-year']);

      await page.locator('#d').click();
      await page.evaluate(() => {
        const picker = Expressive.Datepicker.getInstance(document.getElementById('d'));
        picker.nextMonth();
        picker.gotoDate(new Date(2030, 4, 1));
      });
      await settle();
      assert.deepEqual(await datepickerSelects(), ['select-month', 'select-year'], 'a Datepicker FormSelect was replaced');
      await page.keyboard.press('Escape');

      await page.locator('#tp').click();
      await settle();
      await page.keyboard.press('Escape');
      await page.evaluate(() => Expressive.FormSelect.getInstance(document.getElementById('s')).input.click());
      await settle();
      await page.keyboard.press('Escape');
      await page.locator('#m').click();
      await settle();
      await page.keyboard.press('Escape');
      await page.locator('#tt').hover();
      await settle();
      await page.mouse.move(0, 0);
      await settle();

      assert.deepEqual(await instances(), before);
      assert.deepEqual(await datepickerSelects(), ['select-month', 'select-year']);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
}
