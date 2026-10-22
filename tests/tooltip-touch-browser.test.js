// Tooltips on touch: a long press shows the tooltip and it lingers after
// the finger lifts; a tap, whose compatibility mouse events would read as a
// hover, shows nothing; a press that turns into a scroll shows nothing.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: a long press shows at once, a scroll closes it, and an old linger leaves a reopened tooltip alone`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css}</style><button id="t" style="margin: 100px">Save</button><script>${js}</script>`);
      const events = await page.evaluate(async () => {
        const trigger = document.getElementById('t');
        const seen = [];
        for (const type of ['open', 'close']) trigger.addEventListener(`expressive:${type}`, () => seen.push(type));
        const tooltip = Expressive.Tooltip.init(trigger, { text: 'Save draft', enterDelay: 200, inDuration: 0, outDuration: 0, exitDelay: 0 });
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const touch = (type) => trigger.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', bubbles: true }));

        touch('pointerdown');
        await wait(550);
        touch('pointerup');
        await wait(400);
        seen.push('released during the delay');

        tooltip.close();
        await wait(100);
        tooltip.open();
        await wait(1800);
        seen.push('reopened');
        tooltip.close();
        await wait(100);

        seen.push('scrolled just after the long press');
        touch('pointerdown');
        await wait(550);
        touch('pointercancel');
        await wait(400);

        seen.push('hold, release, then a scroll during the linger');
        touch('pointerdown');
        await wait(700);
        touch('pointerup');
        await wait(300);
        touch('pointerdown');
        await wait(100);
        touch('pointercancel');
        await wait(100);
        seen.push('closed at once');
        await wait(1600);

        seen.push('enterDelay longer than the linger');
        tooltip.options.enterDelay = 2000;
        touch('pointerdown');
        await wait(600);
        seen.push('held');
        touch('pointerup');
        await wait(1700);
        tooltip.options.enterDelay = 200;

        seen.push('mouseenter before pointerdown');
        touch('pointerenter');
        trigger.dispatchEvent(new MouseEvent('mouseenter'));
        await wait(300);
        touch('pointerdown');
        await wait(100);
        touch('pointerup');
        await wait(300);
        return seen;
      });
      assert.deepEqual(events, [
        'open', 'released during the delay', 'close', 'open', 'reopened', 'close',
        'scrolled just after the long press', 'open', 'close',
        'hold, release, then a scroll during the linger', 'open', 'close', 'closed at once',
        'enterDelay longer than the linger', 'open', 'held', 'close',
        'mouseenter before pointerdown',
      ]);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: the click a long press releases does not press the button, and a tap still does`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css}</style><button id="t" style="margin: 100px">Delete</button><script>${js}</script>`);
      const result = await page.evaluate(async () => {
        const trigger = document.getElementById('t');
        let clicks = 0;
        trigger.addEventListener('click', () => clicks++);
        Expressive.Tooltip.init(trigger, { text: 'Delete the draft', inDuration: 0, outDuration: 0, exitDelay: 0 });
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const touch = (type) => trigger.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', bubbles: true }));
        touch('pointerdown');
        await wait(700);
        touch('pointerup');
        const pressed = trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        const afterPress = clicks;
        await wait(2000);
        touch('pointerdown');
        await wait(100);
        touch('pointerup');
        trigger.click();
        return { pressed, afterPress, afterTap: clicks };
      });
      assert.deepEqual(result, { pressed: false, afterPress: 0, afterTap: 1 });
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a long press shows a tooltip that lingers, and a tap or a scroll shows none`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css}</style><button id="t" style="margin: 100px">Save</button><script>${js}</script>`);
      const events = await page.evaluate(async () => {
        const trigger = document.getElementById('t');
        const seen = [];
        for (const type of ['open', 'close']) trigger.addEventListener(`expressive:${type}`, () => seen.push(`${type}@${Math.round(performance.now() - start)}`));
        Expressive.Tooltip.init(trigger, { text: 'Save draft', inDuration: 0, outDuration: 0, exitDelay: 0 });
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const touch = (type) => trigger.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', bubbles: true }));
        const start = performance.now();
        const log = (label) => seen.push(label);

        log('tap');
        touch('pointerdown');
        await wait(100);
        touch('pointerup');
        trigger.dispatchEvent(new MouseEvent('mouseenter'));
        await wait(700);

        log('scroll');
        touch('pointerdown');
        await wait(100);
        touch('pointercancel');
        await wait(700);

        log('hold');
        touch('pointerdown');
        await wait(700);
        touch('pointerup');
        await wait(2000);
        log('hold, then tap during the linger');
        touch('pointerdown');
        await wait(700);
        touch('pointerup');
        await wait(500);
        touch('pointerdown');
        await wait(100);
        touch('pointerup');
        await wait(2000);

        log('hold, then a mouse hovers');
        touch('pointerdown');
        await wait(700);
        touch('pointerup');
        await wait(900);
        trigger.dispatchEvent(new MouseEvent('mouseenter'));
        await wait(1200);
        log('still hovered');
        trigger.dispatchEvent(new MouseEvent('mouseleave'));
        await wait(100);
        return seen.map((entry) => entry.replace(/@\d+/, ''));
      });
      assert.deepEqual(events, [
        'tap', 'scroll', 'hold', 'open', 'close',
        'hold, then tap during the linger', 'open', 'close',
        'hold, then a mouse hovers', 'open', 'still hovered', 'close',
      ]);
    } finally {
      await browser.close();
    }
  });
}
