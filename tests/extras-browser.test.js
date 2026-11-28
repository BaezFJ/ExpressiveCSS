// Leased test pages load the extras bundle right after an inline core script,
// so tests of extras components need only the core script and sheet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const { version } = JSON.parse(readFileSync(new URL('../extras/package.json', import.meta.url), 'utf8'));
const loaded = (page) => page.evaluate(() => [window.ExpressiveExtras?.version, Expressive.core.AutoInit === Expressive.AutoInit]);

for (const [engine, browserType, browserTest] of engines) {
  browserTest(`${engine}: extras loads after an inline core script and after an injected one`, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html><body><script>${js}</script><script>window.early = typeof ExpressiveExtras;</script></body></html>`);
      assert.deepEqual(await loaded(page), [version, true]);
      assert.equal(await page.evaluate(() => window.early), 'object', 'extras was not ready for the next script');

      const context = await browser.newContext();
      const other = await context.newPage();
      await other.addScriptTag({ content: js });
      assert.deepEqual(await loaded(other), [version, true]);
    } finally {
      await browser.close();
    }
  });
}
