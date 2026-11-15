// A button outside a navigation rail that names it in aria-controls, as an app
// bar menu button in a scaffold does, in Chromium, Firefox and WebKit.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines, leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const icon = (name) => `<span class="material-symbols" aria-hidden="true">${name}</span>`;
const page = `<!doctype html><html lang="en"><head><style>${css}</style>
<style>.material-symbols{overflow:hidden}</style></head><body>
<div class="scaffold">
  <header><div class="bar"><button type="button" id="menu" aria-label="Main menu" aria-controls="rail" aria-expanded="false">${icon('menu')}</button><h1>Mail</h1></div></header>
  <nav class="navigation-rail" id="rail" aria-label="Primary">
    <a href="#inbox" id="inbox" aria-current="page">${icon('inbox')}Inbox</a>
    <a href="#sent">${icon('send')}Sent</a>
  </nav>
  <main id="main" tabindex="-1"><p>Inbox</p></main>
</div>
<script>${js}</script>
<script>window.rail = Expressive.NavigationRail.init(document.querySelector('#rail'));</script>
</body></html>`;

for (const [name, type, run] of engines) {
  run(`${name}: an app bar button expands the modal rail, and Escape returns focus to it`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(type);
    const tab = await browser.newPage({ viewport: { width: 390, height: 800 }, reducedMotion: 'reduce' });
    try {
      await tab.setContent(page);
      const menu = tab.locator('#menu');
      await menu.focus();
      await tab.keyboard.press('Enter');
      assert.equal(await tab.locator('#rail').evaluate((el) => el.classList.contains('expanded')), true, 'Enter on the app bar button expands the rail');
      assert.equal(await tab.locator('#rail').evaluate((el) => getComputedStyle(el).position), 'fixed', 'the compact rail is modal');
      assert.equal(await menu.getAttribute('aria-expanded'), 'true');

      await tab.locator('#inbox').focus();
      await tab.keyboard.press('Escape');
      assert.equal(await tab.locator('#rail').evaluate((el) => el.classList.contains('expanded')), false, 'Escape collapses the rail');
      assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      assert.equal(await tab.evaluate(() => document.activeElement?.id), 'menu', 'focus returns to the app bar button');
    } finally {
      await tab.evaluate(() => window.rail?.destroy()).catch(() => {});
      await browser.close();
    }
  });

  run(`${name}: Escape skips an opener hidden by a stylesheet`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(type);
    const tab = await browser.newPage({ viewport: { width: 390, height: 800 }, reducedMotion: 'reduce' });
    try {
      await tab.setContent(page.replace('</header>', '<button type="button" id="spare" aria-controls="rail">Spare</button></header>'));
      await tab.locator('#menu').click();
      await tab.addStyleTag({ content: '#menu { display: none; }' });
      await tab.locator('#inbox').focus();
      await tab.keyboard.press('Escape');
      assert.equal(await tab.evaluate(() => document.activeElement?.id), 'spare', 'focus goes to the next shown toggle');
    } finally {
      await tab.evaluate(() => window.rail?.destroy()).catch(() => {});
      await browser.close();
    }
  });
}
