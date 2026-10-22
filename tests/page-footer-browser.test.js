import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

for (const [engine, type, browserTest] of engines) {
  browserTest(`Only a lone navigation bar opts a footer out of the page footer (${engine})`, async () => {
    const browser = await type.launch();
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><style>${css}</style>
        <footer id="one-column" class="filled"><nav aria-label="Links"><a href="#">Docs</a></nav></footer>
        <footer id="bar"><nav class="navigation-bar" aria-label="Main"><a href="#">Home</a></nav></footer>
        <div class="pane"><footer id="pane"><button class="button" type="button">Save</button></footer></div>`);
      const styles = await page.evaluate(() => {
        const style = selector => getComputedStyle(document.querySelector(selector));
        return {
          column: { display: style('#one-column').display, background: style('#one-column').backgroundColor, link: style('#one-column a').minHeight },
          bar: { marginTop: style('#bar').marginTop },
          pane: { display: style('#pane').display }
        };
      });
      assert.equal(styles.column.display, 'grid');
      assert.notEqual(styles.column.background, 'rgba(0, 0, 0, 0)');
      assert.equal(styles.column.link, '48px');
      assert.equal(styles.bar.marginTop, '0px');
      assert.equal(styles.pane.display, 'flex');
    } finally {
      await browser.close();
    }
  });
}
