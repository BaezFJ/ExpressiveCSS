// A JS tooltip portals into the root its trigger lives in: <body> in the
// document, the shadow root itself in a shadow tree. A top-level element of a
// shadow tree has no parent element, so `body > .tooltip` and
// `:not(body) > .tooltip` both miss it there. `:host > .tooltip` has to give it
// the same hidden, absolutely positioned start as the <body> case.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

for (const [name, engine, test] of engines) {
  test(`${name}: a JS tooltip in a shadow-only load starts hidden and positioned like one in <body>`, { timeout: 30000 }, async (t) => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>
        <button id="light" style="margin:200px">Light</button><div id="host"></div></body></html>`);
      await page.addScriptTag({ content: js });
      const states = await page.evaluate(async (sheet) => {
        const adopted = new CSSStyleSheet();
        await adopted.replace(sheet);
        const host = document.getElementById('host');
        const root = host.attachShadow({ mode: 'open' });
        root.adoptedStyleSheets = [adopted];
        root.innerHTML = '<button style="margin:200px">Shadow</button>';
        const read = async (trigger) => {
          const instance = Expressive.Tooltip.init(trigger, { text: 'Tip', enterDelay: 0, exitDelay: 0, inDuration: 0, outDuration: 0 });
          const s = getComputedStyle(instance.tooltipEl);
          const closed = { parent: instance.tooltipEl.parentNode === root, position: s.position, visibility: s.visibility };
          instance.open();
          // Showing waits on the enter delay and a one-tick animation timer.
          await new Promise((resolve) => setTimeout(resolve, 50));
          const r = instance.tooltipEl.getBoundingClientRect();
          const b = trigger.getBoundingClientRect();
          const open = { visibility: getComputedStyle(instance.tooltipEl).visibility, beside: r.bottom <= b.top + 1 || r.top >= b.bottom - 1 };
          instance.destroy();
          return { closed, open };
        };
        return { light: await read(document.getElementById('light')), shadow: await read(root.querySelector('button')) };
      }, css);

      assert.equal(states.shadow.closed.parent, true, 'the tooltip portals into the shadow root');
      assert.deepEqual(
        { position: states.shadow.closed.position, visibility: states.shadow.closed.visibility },
        { position: states.light.closed.position, visibility: states.light.closed.visibility },
        'closed: the shadow tooltip starts like the <body> one'
      );
      assert.equal(states.shadow.closed.position, 'absolute');
      assert.equal(states.shadow.closed.visibility, 'hidden');
      assert.equal(states.shadow.open.visibility, 'visible', 'open: the tooltip shows');
      assert.equal(states.shadow.open.beside, true, 'open: the tooltip sits beside its trigger, not over it');
    } finally {
      await browser.close();
    }
  });
}
