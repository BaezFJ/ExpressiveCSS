// Tooltips with openOnClick: real mouse and keyboard input opens and closes
// them, hover does not, and on touch a tap is the click, so the long press
// is off and its release click goes through.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
// Long delays, so a tooltip shown or hidden at once is told apart from one that waited.
const options = { text: 'Details', enterDelay: 1000, exitDelay: 1000, inDuration: 0, outDuration: 0 };

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const browserTest = existsSync(browserType.executablePath()) ? test : test.skip;

  browserTest(`${engine}: a click tooltip opens and closes by mouse and keyboard, and hover does not open it`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css}</style><button id="t" style="margin: 100px">Info</button><button id="other">Other</button><script>${js}</script>`);
      await page.evaluate((options) => {
        const trigger = document.getElementById('t');
        window.seen = [];
        for (const type of ['open', 'close']) trigger.addEventListener(`expressive:${type}`, () => window.seen.push(type));
        Expressive.Tooltip.init(trigger, { ...options, openOnClick: true });
      }, options);
      const steps = [];
      // The outside-click listener arrives a task after opening.
      const step = async (label) => {
        await page.waitForTimeout(50);
        steps.push([label, await page.evaluate(() => window.seen.splice(0))]);
      };
      const trigger = page.locator('#t');

      await trigger.hover();
      await page.waitForTimeout(1100);
      await step('hover');
      await trigger.click();
      await step('click');
      await trigger.click();
      await step('second click');
      // WebKit does not focus a clicked button, so keyboard steps focus it first.
      await trigger.focus();
      await page.keyboard.press('Enter');
      await step('Enter');
      await page.keyboard.press('Space');
      await step('Space');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Escape');
      await step('Enter, Escape');
      await trigger.click();
      await step('click to open');
      await page.mouse.click(5, 5);
      await step('click the page');
      await trigger.click();
      await step('click to open');
      await page.locator('#other').click();
      await step('click another button');
      await trigger.focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Tab');
      await step('Enter, Tab');

      assert.deepEqual(steps, [
        ['hover', []],
        ['click', ['open']],
        ['second click', ['close']],
        ['Enter', ['open']],
        ['Space', ['close']],
        ['Enter, Escape', ['open', 'close']],
        ['click to open', ['open']],
        ['click the page', ['close']],
        ['click to open', ['open']],
        ['click another button', ['close']],
        ['Enter, Tab', ['open', 'close']],
      ]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a held touch on a click tooltip neither long-presses nor swallows the click`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css}</style><button id="c" style="margin: 100px">Click</button><button id="h" style="margin: 100px">Hover</button><script>${js}</script>`);
      const result = await page.evaluate(async (options) => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const hold = async (trigger) => {
          const seen = [];
          for (const type of ['open', 'close']) trigger.addEventListener(`expressive:${type}`, () => seen.push(type));
          const touch = (type) => trigger.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', bubbles: true }));
          touch('pointerdown');
          await wait(700);
          touch('pointerup');
          seen.push('released');
          const clicked = trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return { seen, clicked };
        };
        const click = document.getElementById('c');
        const hover = document.getElementById('h');
        Expressive.Tooltip.init(click, { ...options, openOnClick: true });
        Expressive.Tooltip.init(hover, options);
        return { click: await hold(click), hover: await hold(hover) };
      }, options);
      assert.deepEqual(result, {
        click: { seen: ['released', 'open'], clicked: true },
        hover: { seen: ['open', 'released'], clicked: false },
      });
    } finally {
      await browser.close();
    }
  });
}
