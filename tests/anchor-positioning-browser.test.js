import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([n]) => !requested || requested === n)) {
  test(`${name}: an anchored tooltip sits on its side, centered, and follows its trigger through scrolling`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>
        <div id="scroller" style="height: 300px; overflow: auto; margin-top: 100px"><div style="height: 900px; padding-top: 150px">
          <button id="trigger" style="margin-left: 300px">Save</button></div></div>
        <script>${js}</script></body></html>`);
      const read = () => page.evaluate(() => {
        const tip = Expressive.Tooltip.getInstance(document.getElementById('trigger')).tooltipEl.getBoundingClientRect();
        const anchor = document.getElementById('trigger').getBoundingClientRect();
        return { gap: Math.round(tip.top - anchor.bottom), offCenter: Math.round((tip.left + tip.right) / 2 - (anchor.left + anchor.right) / 2) };
      });
      await page.evaluate(() => {
        const instance = Expressive.Tooltip.init(document.getElementById('trigger'), { text: 'Save draft', position: 'bottom', enterDelay: 0, inDuration: 0 });
        instance.open();
      });
      await page.waitForFunction(() => getComputedStyle(Expressive.Tooltip.getInstance(document.getElementById('trigger')).tooltipEl).visibility === 'visible');
      const before = await read();
      assert.ok(before.gap > 0, `the tooltip is below its trigger: gap ${before.gap}`);
      assert.ok(Math.abs(before.offCenter) <= 1, `the tooltip is centered on its trigger: ${before.offCenter}`);
      await page.evaluate(() => { document.getElementById('scroller').scrollTop = 60; });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      assert.deepEqual(await read(), before, 'the tooltip moved with its trigger');
    } finally {
      await browser.close();
    }
  });
}

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([n]) => !requested || requested === n)) {
  test(`${name}: an anchored menu opens under its trigger, flips above it near the bottom, and follows scrolling`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      const menu = (id, top) => `<button id="${id}" style="position: absolute; left: 100px; top: ${top}px">Open</button>
        <menu id="${id}-menu"><li><button>One</button></li><li><button>Two</button></li><li><button>Three</button></li></menu>`;
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body style="height: 2000px">
        ${menu('high', 100)}${menu('low', 560)}<script>${js}</script></body></html>`);
      // Each trigger names its menu before Menu.init reads it.
      const open = (id) => page.evaluate(async (id) => {
        const instance = Expressive.Menu.init(document.getElementById(id), { inDuration: 0, outDuration: 0 });
        instance.open();
        await new Promise((resolve) => setTimeout(resolve, 100));
        return instance;
      }, id);
      const read = (id) => page.evaluate((id) => {
        const m = document.getElementById(`${id}-menu`).getBoundingClientRect();
        const t = document.getElementById(id).getBoundingClientRect();
        return { below: Math.round(m.top) === Math.round(t.bottom), above: Math.round(m.bottom) === Math.round(t.top), left: Math.round(m.left - t.left) };
      }, id);
      await page.evaluate(() => {
        for (const id of ['high', 'low']) document.getElementById(id).dataset.target = `${id}-menu`;
      });
      await open('high');
      assert.deepEqual(await read('high'), { below: true, above: false, left: 0 }, 'opens under the trigger, start-aligned');
      await page.evaluate(() => window.scrollTo(0, 50));
      await page.evaluate(() => new Promise(requestAnimationFrame));
      assert.deepEqual(await read('high'), { below: true, above: false, left: 0 }, 'follows the trigger when the page scrolls');
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.evaluate(() => Expressive.Menu.getInstance(document.getElementById('high')).close());
      await open('low');
      assert.equal((await read('low')).above, true, 'flips above a trigger near the bottom edge');
    } finally {
      await browser.close();
    }
  });
}

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([n]) => !requested || requested === n)) {
  test(`${name}: a trigger with a tooltip and a menu keeps both anchor names until each is destroyed`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>
        <button id="trigger" data-target="trigger-menu" style="margin: 100px">Open</button>
        <menu id="trigger-menu"><li><button>One</button></li></menu>
        <script>${js}</script></body></html>`);
      if (!(await page.evaluate(() => CSS.supports('anchor-name: --a')))) { t.skip(`${name} has no anchor positioning`); return; }
      const names = () => page.evaluate(() => document.getElementById('trigger').style.getPropertyValue('anchor-name'));
      // Each used to write the whole property, so the second replaced the first.
      await page.evaluate(async () => {
        const trigger = document.getElementById('trigger');
        Expressive.Tooltip.init(trigger, { text: 'Save draft', enterDelay: 0, inDuration: 0 }).open();
        Expressive.Menu.init(trigger, { inDuration: 0, outDuration: 0 }).open();
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
      const both = (await names()).split(', ').sort();
      assert.equal(both.length, 2, `both anchors are listed: ${both}`);
      assert.equal(both[0], '--menu-trigger-menu');
      assert.match(both[1], /^--tooltip-/);
      await page.evaluate(() => Expressive.Tooltip.getInstance(document.getElementById('trigger')).destroy());
      assert.equal(await names(), '--menu-trigger-menu', 'destroying the tooltip keeps the menu anchor');
      await page.evaluate(() => Expressive.Menu.getInstance(document.getElementById('trigger')).destroy());
      assert.equal(await names(), '', 'destroying the menu clears the property');
    } finally {
      await browser.close();
    }
  });
}
