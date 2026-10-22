// The shadow-root cases jsdom cannot run (see shadow-delegation.test.js): a
// Menubar's document keydown listener, a card reveal whose trigger is named by
// aria-labelledby, and a tooltip under a positioned shadow host. Each runs in
// light DOM and in an open shadow root and must behave the same in both.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const markup = `
  <div class="menubar" aria-label="Editor">
    <button type="button" class="menu-trigger" data-target="file">File</button>
    <button type="button" class="menu-trigger" data-target="edit">Edit</button>
  </div>
  <menu id="file"><li><button type="button">New</button></li></menu>
  <menu id="edit"><li><button type="button">Undo</button></li></menu>
  <article>
    <span id="more-name">More</span>
    <button type="button" class="card-reveal-trigger" aria-labelledby="more-name"></button>
    <aside id="more">Details</aside>
  </article>
  <button type="button" class="tip" style="margin: 40px 0 0 120px">Tip</button>`;

for (const [name, engine, test] of engines) {
  test(`${name}: Menubar, Cards and Tooltip behave the same in light DOM and an open shadow root`, { timeout: 30000 }, async (t) => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
      // The shadow host is positioned and offset, so a tooltip placed in
      // document coordinates would land 150px low and 200px right of its trigger.
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>
        <div id="light">${markup}</div>
        <div id="host" style="position: relative; left: 200px; top: 150px"></div></body></html>`);
      await page.addScriptTag({ content: js });
      const results = await page.evaluate(async ({ sheet, markup }) => {
        const adopted = new CSSStyleSheet();
        await adopted.replace(sheet);
        const shadow = document.getElementById('host').attachShadow({ mode: 'open' });
        shadow.adoptedStyleSheets = [adopted];
        shadow.innerHTML = markup;
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        const run = async (root) => {
          const bar = Expressive.Menubar.init(root.querySelector('.menubar'), { inDuration: 0, outDuration: 0 });
          const [file, edit] = root.querySelectorAll('.menu-trigger');
          Expressive.Menu.getInstance(file).open();
          await wait(50);
          root.querySelector('#file button').dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true, cancelable: true })
          );
          await wait(50);
          const nextMenu = Expressive.Menu.getInstance(edit).isOpen;
          bar.destroy();

          const card = Expressive.Cards.init(root.querySelector('article'));
          const controls = root.querySelector('.card-reveal-trigger').getAttribute('aria-controls');
          card.destroy();

          const trigger = root.querySelector('.tip');
          const tip = Expressive.Tooltip.init(trigger, { text: 'Tip', position: 'bottom', enterDelay: 0, exitDelay: 0, inDuration: 0, outDuration: 0 });
          tip.open();
          await wait(50);
          const r = tip.tooltipEl.getBoundingClientRect();
          const b = trigger.getBoundingClientRect();
          const tooltip = {
            centered: Math.abs((r.left + r.right) / 2 - (b.left + b.right) / 2) < 2,
            below: r.top >= b.bottom - 1 && r.top - b.bottom < 40
          };
          tip.destroy();
          return { nextMenu, controls, tooltip };
        };
        const light = await run(document.getElementById('light'));
        // Same ids in both trees: drop the light copy so a document-wide lookup
        // cannot pass the shadow run by finding it.
        document.getElementById('light').remove();
        return { light, shadow: await run(shadow) };
      }, { sheet: css, markup });

      for (const tree of ['light', 'shadow']) {
        const result = results[tree];
        assert.equal(result.nextMenu, true, `${tree}: Right inside an open menu opens the next one`);
        assert.equal(result.controls, 'more', `${tree}: a trigger named by aria-labelledby starts the card reveal`);
        assert.deepEqual(result.tooltip, { centered: true, below: true }, `${tree}: the tooltip sits just below its trigger`);
      }
    } finally {
      await browser.close();
    }
  });
}
