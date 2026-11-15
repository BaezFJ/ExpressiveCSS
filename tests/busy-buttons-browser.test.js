import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

// A form with one submit button that counts its clicks and the form's submits.
const body = `<form id="form" action="#sent">
  <label>Name <input id="name" name="name" value="Sam"></label>
  <button id="save" type="submit" aria-busy="true"><span>Saving…</span></button>
  <button id="round" class="circle" type="button" aria-busy="true" aria-label="Refresh"><span class="material-symbols" aria-hidden="true">refresh</span></button>
  <button id="off" type="button" aria-busy="true" disabled><span>Off</span></button>
</form>
<table class="data-table"><thead><tr><th><button id="sort" type="button" aria-busy="true">Name</button></th></tr></thead></table>
<script>
  window.counts = { click: 0, submit: 0 };
  document.getElementById('save').addEventListener('click', () => counts.click++);
  document.getElementById('form').addEventListener('submit', (event) => { event.preventDefault(); counts.submit++; });
</script>`;
const page = (script) => `<!doctype html><html lang="en"><head><style>${css}</style></head><body>${body}${script}</body></html>`;

for (const [engine, browserType, browserTest] of engines) {
  browserTest(`${engine}: a busy button keeps its name, shows progress and ignores every press`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const tab = await browser.newPage();
      await tab.setContent(page(`<script>${js}</script>`));
      const save = tab.locator('#save');
      assert.equal(Number(await save.evaluate((el) => getComputedStyle(el, '::after').opacity)), 0, 'the indicator waits for its delay');
      await tab.waitForFunction(() => getComputedStyle(document.getElementById('save'), '::after').opacity === '1');
      assert.equal(await tab.getByRole('button', { name: 'Saving…' }).count(), 1, 'the indicator adds nothing to the name');
      assert.equal(await save.evaluate((el) => getComputedStyle(el, '::after').content), '""');
      assert.equal(Number(await save.evaluate((el) => getComputedStyle(el, '::after').opacity)), 1, 'the indicator shows after the delay');
      assert.equal(await save.evaluate((el) => getComputedStyle(el).cursor), 'progress');
      assert.equal(await tab.locator('#round').evaluate((el) => getComputedStyle(el, '::after').content), 'none', 'a circle button has no indicator');
      assert.equal(await tab.locator('#off').evaluate((el) => getComputedStyle(el, '::after').content), 'none', 'a disabled button has no indicator');
      assert.doesNotMatch(await tab.locator('#sort').evaluate((el) => getComputedStyle(el, '::after').animationName), /button-busy/, 'a sort button keeps its own arrow');
      if (engine === 'chromium') {
        const cdp = await tab.context().newCDPSession(tab);
        const { nodes } = await cdp.send('Accessibility.getFullAXTree');
        const node = nodes.find((each) => each.role?.value === 'button' && each.name?.value === 'Saving…');
        // Chromium reports busy as 1.
        assert.ok(node?.properties?.find((property) => property.name === 'busy')?.value.value, 'Chromium reports the button busy');
      }
      await save.click();
      await save.focus();
      await tab.keyboard.press('Enter');
      await tab.keyboard.press('Space');
      await tab.locator('#name').focus();
      await tab.keyboard.press('Enter');
      assert.deepEqual(await tab.evaluate(() => window.counts), { click: 0, submit: 0 }, 'no press reaches the handler or submits');
      await save.evaluate((el) => el.removeAttribute('aria-busy'));
      await save.click();
      assert.deepEqual(await tab.evaluate(() => window.counts), { click: 1, submit: 1 }, 'the press goes through once the button is idle');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: under reduced motion the busy indicator holds still`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const tab = await browser.newPage();
      await tab.emulateMedia({ reducedMotion: 'reduce' });
      await tab.setContent(page(`<script>${js}</script>`));
      const name = await tab.locator('#save').evaluate((el) => getComputedStyle(el, '::after').animationName);
      assert.doesNotMatch(name, /button-busy-spin/);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: without the runtime a busy button still takes presses`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const tab = await browser.newPage();
      await tab.setContent(page(''));
      await tab.locator('#save').click();
      assert.deepEqual(await tab.evaluate(() => window.counts), { click: 1, submit: 1 });
    } finally {
      await browser.close();
    }
  });

  if (engine === 'chromium') {
    browserTest('chromium: forced colors keep the busy indicator visible', async () => {
      const browser = await leaseBrowser(browserType);
      try {
        const tab = await browser.newPage();
        await tab.emulateMedia({ forcedColors: 'active' });
        await tab.setContent(page(`<script>${js}</script>`));
        await tab.waitForFunction(() => getComputedStyle(document.getElementById('save'), '::after').opacity === '1');
        const style = await tab.locator('#save').evaluate((el) => ({
          content: getComputedStyle(el, '::after').content,
          fill: getComputedStyle(el, '::after').borderBlockStartColor,
          canvas: getComputedStyle(document.body).backgroundColor,
        }));
        assert.equal(style.content, '""');
        assert.notEqual(style.fill, style.canvas, 'the indicator is not painted in the canvas color');
      } finally {
        await browser.close();
      }
    });
  }
}
