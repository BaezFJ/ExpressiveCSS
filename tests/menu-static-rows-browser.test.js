// Rows that are not items: a click on a label, divider or gap neither closes
// the menu nor reports a selection.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const markup = `<button type="button" class="menu-trigger no-autoinit" id="t" data-target="m">View</button>
  <menu id="m">
    <li class="label" id="label">Group</li>
    <li><button type="button" id="one">One</button></li>
    <li class="divider" id="divider"></li>
    <li class="gap" id="gap"></li>
    <li class="optgroup" id="optgroup">Other group</li>
    <li><button type="button" id="two">Two</button></li>
  </menu>`;

for (const [engine, browserType, browserTest] of engines) {
  browserTest(`${engine}: a click on a menu row that is not an item keeps the menu open and selects nothing`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
      await page.setContent(`<style>${css}</style>${markup}<script>${js}</script>`);
      await page.evaluate(() => {
        window.picked = [];
        window.menu = Expressive.Menu.init(document.getElementById('t'), {
          inDuration: 0, outDuration: 0, onItemClick: (li) => window.picked.push(li.textContent.trim())
        });
      });
      await page.locator('#t').click();
      for (const id of ['label', 'divider', 'gap', 'optgroup']) {
        await page.evaluate((id) => document.getElementById(id).click(), id);
        await page.evaluate(() => new Promise((resolve) => setTimeout(resolve)));
        assert.equal(await page.evaluate(() => menu.isOpen), true, `${id} keeps it open`);
      }
      assert.deepEqual(await page.evaluate(() => window.picked), []);

      await page.locator('#one').click();
      assert.equal(await page.evaluate(() => menu.isOpen), false, 'an item still closes it');
      assert.deepEqual(await page.evaluate(() => window.picked), ['One']);
    } finally {
      await browser.close();
    }
  });
}
