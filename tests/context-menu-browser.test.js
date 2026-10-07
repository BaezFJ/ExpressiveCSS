import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = `<!doctype html><html lang="en"><head><style>${css} body { margin: 0 }</style></head><body>
<main>
  <div id="region" class="menu-trigger" data-context-menu data-target="ctx" tabindex="0"
       style="position:absolute; left:20px; top:20px; width:700px; height:500px">Project files</div>
  <menu id="ctx">
    <li><button type="button">Rename</button></li>
    <li><button type="button">Delete</button></li>
  </menu>
  <button id="outside" style="position:absolute; left:740px; top:560px">Outside</button>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: context menu opens at the pointer, flips at the viewport edge and closes from outside`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.setContent(markup);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => window.Expressive.AutoInit());
      const menuBox = () => page.locator('#ctx').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, shown: getComputedStyle(el).display !== 'none' };
      });
      const settle = () => page.waitForTimeout(400);

      const region = page.locator('#region');
      for (const attribute of ['aria-expanded', 'aria-haspopup', 'aria-controls']) {
        assert.equal(await region.getAttribute(attribute), null, `a context region carries no ${attribute}`);
      }
      assert.equal(await region.evaluate((el) => getComputedStyle(el).cursor), 'auto');

      await region.focus();
      await page.keyboard.press('Enter');
      await settle();
      assert.equal((await menuBox()).shown, false, 'Enter on the region does not open its context menu');

      await page.mouse.click(120, 140, { button: 'right' });
      await settle();
      let box = await menuBox();
      assert.ok(box.shown, 'right-click opens the menu');
      assert.ok(Math.abs(box.left - 120) < 1 && Math.abs(box.top - 140) < 1, `menu starts at the pointer, got ${box.left},${box.top}`);
      assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Rename', 'the first item takes focus');

      await page.keyboard.press('Escape');
      await settle();
      assert.equal((await menuBox()).shown, false, 'Escape closes the menu');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'region', 'focus returns to the region');

      await page.mouse.click(700, 515, { button: 'right' });
      await settle();
      box = await menuBox();
      assert.ok(Math.abs(box.right - 700) < 1, `menu flips to end at the pointer, got right ${box.right}`);
      assert.ok(Math.abs(box.bottom - 515) < 1, `menu flips to end above the pointer, got bottom ${box.bottom}`);

      await page.mouse.click(760, 570, { button: 'right' });
      await settle();
      assert.equal((await menuBox()).shown, false, 'a right-click outside the region closes the menu');

      // The menu key and Shift+F10 arrive as a contextmenu event whose point is
      // not inside the region; the menu then opens at the region's start corner.
      await region.evaluate((el) => el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 0, clientY: 0 })));
      await settle();
      box = await menuBox();
      assert.ok(Math.abs(box.left - 20) < 1, `keyboard menu starts at the region edge, got ${box.left}`);
      assert.ok(box.top <= 520 && box.bottom >= 400, 'keyboard menu sits at the region bottom, flipped up to stay on screen');

      await page.mouse.click(760, 570);
      await settle();
      assert.equal((await menuBox()).shown, false, 'a click outside closes the menu');

      await page.evaluate(() => window.Expressive.Menu.getInstance(document.getElementById('region')).destroy());
      const prevented = await region.evaluate((el) => !el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })));
      assert.equal(prevented, false, 'destroy restores the native context menu');
    } finally {
      await browser.close();
    }
  });
}

const regions = `<!doctype html><html lang="en"><head><style>${css} body { margin: 0 }</style></head><body>
<main>
  <div id="outer" class="menu-trigger" data-context-menu data-target="outer-menu"
       style="position:absolute; left:20px; top:20px; width:700px; height:500px">
    <button id="row" type="button">A row with its own focus</button>
    <div id="inner" class="menu-trigger" data-context-menu data-target="inner-menu"
         style="position:absolute; left:100px; top:100px; width:300px; height:200px">Inner</div>
    <menu id="inner-menu"><li><button type="button" id="inner-item">Inner action</button></li></menu>
  </div>
  <menu id="outer-menu"><li><button type="button" id="outer-item">Outer action</button></li></menu>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: context menus return focus to its owner, keep nested regions apart and stay open for their own right-click`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.setContent(regions);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => window.Expressive.AutoInit());
      const shown = (id) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).display !== 'none');
      const settle = () => page.waitForTimeout(400);
      const keyboardMenu = (id) => page.locator(`#${id}`).evaluate((el) => el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 0, clientY: 0 })));

      await page.locator('#row').focus();
      await keyboardMenu('row');
      await settle();
      assert.equal(await page.evaluate(() => document.activeElement.closest('menu')?.id), 'outer-menu', 'the menu takes focus');
      await page.keyboard.press('Escape');
      await settle();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'row', 'focus returns to what had it, not to an unfocusable region');

      await page.mouse.click(250, 250, { button: 'right' });
      await settle();
      assert.deepEqual([await shown('inner-menu'), await shown('outer-menu')], [true, false], 'a nested region opens only its own menu');

      const prevented = await page.locator('#inner-item').evaluate((el) => !el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 260, clientY: 260 })));
      await settle();
      assert.equal(prevented, true, 'a right-click on the open menu keeps the browser menu shut');
      assert.deepEqual([await shown('inner-menu'), await shown('outer-menu')], [true, false], 'and keeps the menu open without opening the outer one');

      await page.mouse.click(60, 450, { button: 'right' });
      await settle();
      assert.deepEqual([await shown('inner-menu'), await shown('outer-menu')], [false, true], 'a right-click in the outer region swaps menus');
    } finally {
      await browser.close();
    }
  });
}
