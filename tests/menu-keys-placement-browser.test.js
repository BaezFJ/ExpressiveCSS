// Menu Home and End, and placement 'top': a menu opens above its trigger
// when there is room and flips below when there is not.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const menu = (id, top) => `<button type="button" class="menu-trigger no-autoinit" id="${id}-trigger" data-target="${id}" style="position: absolute; top: ${top}px; left: 40px">Open</button>
  <menu id="${id}"><li><a href="#">One</a></li><li class="disabled" aria-disabled="true"><a href="#">Two</a></li><li><a href="#">Three</a></li><li><a href="#">Four</a></li></menu>`;

for (const [engine, browserType, browserTest] of engines) {

  browserTest(`${engine}: Home and End jump to the first and last rows`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
      await page.setContent(`<style>${css}</style>${menu('m', 40)}<script>${js}</script>`);
      await page.evaluate(() => Expressive.Menu.init(document.getElementById('m-trigger')));
      await page.locator('#m-trigger').focus();
      await page.keyboard.press('ArrowDown');
      await page.waitForFunction(() => document.activeElement?.closest('menu'));
      const focused = () => page.evaluate(() => document.activeElement.textContent.trim());
      await page.keyboard.press('End');
      assert.equal(await focused(), 'Four');
      await page.keyboard.press('Home');
      assert.equal(await focused(), 'One');
      await page.keyboard.press('ArrowDown');
      assert.equal(await focused(), 'Two', 'a disabled row is focusable, as the APG allows in menus');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: an anchored menu opened upward moves below once scrolling gives it the room`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
      await page.setContent(`<style>${css}</style><div style="height: 3000px">${menu('m', 520)}</div><script>${js}</script>`);
      const side = () => page.evaluate(() => {
        const [t, m] = [document.getElementById('m-trigger').getBoundingClientRect(), document.getElementById('m').getBoundingClientRect()];
        return m.bottom <= t.top + 1 ? 'above' : m.top >= t.top - 1 ? 'below' : 'overlaps';
      });
      await page.evaluate(() => Expressive.Menu.init(document.getElementById('m-trigger'), { inDuration: 0 }).open());
      await page.waitForFunction(() => document.getElementById('m').getBoundingClientRect().height > 0);
      assert.equal(await side(), 'above');
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForFunction(() => {
        const [t, m] = [document.getElementById('m-trigger').getBoundingClientRect(), document.getElementById('m').getBoundingClientRect()];
        return m.top >= t.top - 1;
      });
      assert.equal(await side(), 'below');
    } finally {
      await browser.close();
    }
  });

  for (const transform of ['transform: translateZ(0)', 'translate: 0px']) browserTest(`${engine}: a long menu in a container with ${transform} measures room in the container, not the viewport`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
      const rows = Array.from({ length: 30 }, (_, i) => `<li><a href="#">Row ${i}</a></li>`).join('');
      await page.setContent(`<style>${css}</style>
        <div style="position: absolute; top: 300px; left: 0; width: 400px; height: 290px; ${transform}">
          <button type="button" class="menu-trigger no-autoinit" id="t" data-target="m" style="margin: 10px 40px">Open</button>
          <menu id="m">${rows}</menu>
        </div><script>${js}</script>`);
      const placed = await page.evaluate(async () => {
        Expressive.Menu.init(document.getElementById('t'), { inDuration: 0 }).open();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const [t, m] = [document.getElementById('t').getBoundingClientRect(), document.getElementById('m').getBoundingClientRect()];
        return { below: m.top >= t.top - 1, height: Math.round(m.height) };
      });
      assert.equal(placed.below, true, 'the viewport has more room above, the container below');
      assert.ok(placed.height > 150, `the menu keeps the room below: ${placed.height}px`);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a long menu in a transformed shadow host measures room in the host`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
      await page.setContent(`<style>${css}</style>
        <div id="host" style="position: absolute; top: 300px; left: 0; width: 400px; height: 290px; transform: translateZ(0)"></div>
        <script>${js}</script>`);
      const placed = await page.evaluate(async (css) => {
        const root = document.getElementById('host').attachShadow({ mode: 'open' });
        const rows = Array.from({ length: 30 }, (_, i) => `<li><a href="#">Row ${i}</a></li>`).join('');
        root.innerHTML = `<style>${css}</style><div><button type="button" class="menu-trigger no-autoinit" id="t" data-target="m" style="margin: 10px 40px">Open</button><menu id="m">${rows}</menu></div>`;
        Expressive.Menu.init(root.getElementById('t'), { inDuration: 0 }).open();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const [t, m] = [root.getElementById('t').getBoundingClientRect(), root.getElementById('m').getBoundingClientRect()];
        return { below: m.top >= t.top - 1, height: Math.round(m.height) };
      }, css);
      assert.equal(placed.below, true);
      assert.ok(placed.height > 150, `the menu keeps the room below: ${placed.height}px`);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: an anchored menu in a shadow root moves below as a scroller there gives it the room`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
      await page.setContent(`<style>${css}</style><div id="host"></div><script>${js}</script>`);
      const below = await page.evaluate(async (css) => {
        const root = document.getElementById('host').attachShadow({ mode: 'open' });
        root.innerHTML = `<style>${css}</style><div id="scroller" style="height: 600px; overflow: auto"><div style="height: 3000px; position: relative">
          <button type="button" class="menu-trigger no-autoinit" id="t" data-target="m" style="position: absolute; top: 520px; left: 40px">Open</button>
          <menu id="m"><li><a href="#">One</a></li><li><a href="#">Two</a></li><li><a href="#">Three</a></li></menu></div></div>`;
        const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const side = () => {
          const [t, m] = [root.getElementById('t').getBoundingClientRect(), root.getElementById('m').getBoundingClientRect()];
          return m.top >= t.top - 1 ? 'below' : 'above';
        };
        Expressive.Menu.init(root.getElementById('t'), { inDuration: 0 }).open();
        await frame();
        const before = side();
        root.getElementById('scroller').scrollTop = 500;
        await frame();
        return [before, side()];
      }, css);
      assert.deepEqual(below, ['above', 'below']);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: without anchor positioning, placement top in a clipped container opens below when there is no room above`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
      await page.setContent(`<style>${css}</style>
        <div style="position: relative; height: 560px; overflow: hidden">
          <button type="button" class="menu-trigger no-autoinit" id="t" data-target="m" style="position: absolute; top: 50px; left: 40px; height: 40px">Open</button>
          <menu id="m"><li><a href="#">One</a></li><li><a href="#">Two</a></li><li><a href="#">Three</a></li></menu>
        </div>`);
      // The bundle reads anchor support as it loads, so turn it off first.
      await page.evaluate(() => {
        const supports = CSS.supports.bind(CSS);
        CSS.supports = (...args) => (String(args[0]).includes('anchor') ? false : supports(...args));
      });
      await page.addScriptTag({ content: js });
      const placed = await page.evaluate(async () => {
        Expressive.Menu.init(document.getElementById('t'), { placement: 'top', inDuration: 0 }).open();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const menu = document.getElementById('m');
        const [t, m] = [document.getElementById('t').getBoundingClientRect(), menu.getBoundingClientRect()];
        return { measured: !menu.style.getPropertyValue('position-anchor'), below: m.top >= t.top - 1, top: Math.round(m.top) };
      });
      assert.equal(placed.measured, true, 'the measured path placed it');
      assert.equal(placed.below, true, `menu top at ${placed.top}`);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a menu in a short query container measures room in the viewport`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
      const rows = Array.from({ length: 4 }, (_, i) => `<li><a href="#">Row ${i}</a></li>`).join('');
      await page.setContent(`<style>${css}</style>
        <div style="margin-top: 200px; height: 60px; container-type: inline-size">
          <button type="button" class="menu-trigger no-autoinit" id="t" data-target="m" style="margin: 10px 40px">Open</button>
          <menu id="m">${rows}</menu>
        </div><script>${js}</script>`);
      const placed = await page.evaluate(async () => {
        Expressive.Menu.init(document.getElementById('t'), { inDuration: 0 }).open();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const [t, m, menu] = [document.getElementById('t').getBoundingClientRect(), document.getElementById('m').getBoundingClientRect(), document.getElementById('m')];
        return { below: m.top >= t.top - 1, whole: menu.scrollHeight <= menu.clientHeight + 1 };
      });
      assert.deepEqual(placed, { below: true, whole: true });
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: placement top opens above the trigger, and below when there is no room above`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
      await page.setContent(`<style>${css}</style>${menu('low', 500)}${menu('high', 10)}<script>${js}</script>`);
      const side = (id, placement = 'top') => page.evaluate(async ([id, placement]) => {
        const trigger = document.getElementById(`${id}-trigger`);
        const instance = Expressive.Menu.init(trigger, { placement, inDuration: 0 });
        instance.open();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const [t, m] = [trigger.getBoundingClientRect(), document.getElementById(id).getBoundingClientRect()];
        instance.close();
        return m.bottom <= t.top + 1 ? 'above' : m.top >= t.top - 1 ? 'below' : `overlaps ${m.top}-${m.bottom} vs ${t.top}`;
      }, [id, placement]);
      assert.equal(await side('low'), 'above');
      assert.equal(await side('high'), 'below');
      assert.equal(await side('low', 'bottom'), 'above', 'a default menu with no room below opens above');
      assert.equal(await side('high', 'bottom'), 'below');
    } finally {
      await browser.close();
    }
  });
}
