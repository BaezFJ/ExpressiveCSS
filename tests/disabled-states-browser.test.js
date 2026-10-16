// Disabled controls inside hosts that style their own states. The shared
// disabled rule in _buttons.scss is (0,1,0) to (0,3,0); a host's :hover or
// :focus arm can outrank it, and once the reset lost its !important the FAB
// menu and the toolbar's companion FAB lifted a disabled control on focus.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: disabled controls stay flat when a host styles focus and hover`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>
        <button id="reference" class="button" disabled>Reference</button>
        <div class="fab-menu active"><button class="button extra circle" aria-label="Menu">+</button>
          <ul><li><button id="menu-item" class="disabled">Compose</button></li>
            <li><button id="menu-aria" aria-disabled="true">Share</button></li></ul></div>
        <div class="toolbar-group"><div class="toolbar"><button>A</button></div>
          <a id="group-fab" href="#" class="button extra circle disabled" aria-label="Reply">R</a>
          <button id="group-aria" class="button extra circle" aria-disabled="true" aria-label="Edit">E</button></div>
        <article id="card" class="filled hoverable"><a class="primary-action" aria-disabled="true">Open</a><p>Body</p></article>
      </body></html>`);
      const shadow = (id) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).boxShadow);

      const fill = (id) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).backgroundColor);

      // A disabled menu item paints like any disabled button, at rest and on focus.
      assert.equal(await fill('menu-item'), await fill('reference'), 'the disabled menu item looks enabled at rest');

      for (const id of ['menu-item', 'menu-aria', 'group-fab', 'group-aria']) {
        const rest = await fill(id);
        await page.locator(`#${id}`).focus();
        await page.waitForTimeout(350);
        assert.equal(await shadow(id), 'none', `${id} lifts on focus`);
        assert.equal(await fill(id), rest, `${id} takes a state tint on focus`);
        await page.locator(`#${id}`).blur();
      }

      await page.locator('#card p').hover();
      await page.waitForTimeout(350);
      assert.equal(await shadow('card'), 'none', 'a disabled .hoverable card lifts on hover');
    } finally {
      await browser.close();
    }
  });
}
