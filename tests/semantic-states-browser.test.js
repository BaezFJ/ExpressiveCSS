// States the markup declares and the sheet has to honor: keyboard focus on
// selection controls, the documented selected list row, the hidden attribute
// against a component's own display, the documented pane body, and
// aria-disabled on common buttons. Computed styles need a real engine.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

const long = '<p>Scrolling content.</p>'.repeat(40);

const html = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<button type="button" id="start">Start</button>
<label><input type="checkbox" id="checkbox"> Checkbox</label>
<label><input type="radio" name="r" id="radio"> Radio</label>
<label class="switch"><input type="checkbox" role="switch" id="switch"> Switch</label>
<label><input type="checkbox" id="legacy"><span id="legacy-label">Legacy</span></label>
<ul class="list">
  <li class="active" id="active-row">Active</li>
  <li class="selected" id="selected-row">Selected</li>
  <li id="plain-row">Plain</li>
</ul>
<div class="loading-indicator" role="status" aria-label="Loading" id="indicator" hidden></div>
<div class="progress" id="bar" hidden></div>
<div class="progress circular" id="spinner" hidden></div>
<div class="skeleton text" id="skeleton" hidden></div>
<div class="empty-state" id="empty" hidden><h2>Nothing here</h2></div>
<div class="panes" style="height: 300px">
  <div class="pane" id="pane">
    <header><h2>Title</h2></header>
    <section id="pane-body">${long}</section>
    <footer><button class="button">Save</button></footer>
  </div>
</div>
<button class="tonal" id="disabled" disabled>Disabled</button>
<button class="tonal" id="aria-disabled" aria-disabled="true">ARIA disabled</button>
<a class="button" id="link" aria-disabled="true">Link</a>
</body></html>`;

for (const [name, browserType, browserTest] of engines) {
  browserTest(`${name}: focus rings, selected rows, hidden components, pane bodies and aria-disabled buttons`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(browserType);
    try {
      const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
      await page.setContent(html);
      const style = (selector, property, pseudo = null) =>
        page.$eval(selector, (el, [property, pseudo]) => getComputedStyle(el, pseudo)[property], [property, pseudo]);

      // The 10% focus tint alone is about 1.2:1, so each control also takes the ring.
      await page.focus('#start');
      for (const id of ['checkbox', 'radio', 'switch']) {
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), id);
        assert.equal(await style(`#${id}`, 'outlineStyle'), 'solid', `the focused ${id} shows no ring`);
      }
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'legacy');
      assert.equal(await style('#legacy-label', 'outlineStyle', '::before'), 'solid', 'the focused legacy checkbox shows no ring');

      // The docs mark the current row with active or selected.
      const selected = await style('#active-row', 'backgroundColor');
      assert.notEqual(selected, await style('#plain-row', 'backgroundColor'));
      assert.equal(await style('#selected-row', 'backgroundColor'), selected, 'li.selected is not painted as selected');

      // A component's display rule beat the browser's [hidden] rule.
      for (const id of ['indicator', 'bar', 'spinner', 'skeleton', 'empty']) {
        assert.equal(await style(`#${id}`, 'display'), 'none', `#${id} still renders while hidden`);
      }

      // A <section> is the documented pane body, so it scrolls.
      assert.equal(await style('#pane-body', 'overflowY'), 'auto', 'the section body does not scroll');
      const body = await page.$eval('#pane-body', (el) => [el.scrollHeight, el.clientHeight]);
      assert.ok(body[0] > body[1], 'the section body is not clipped to the pane');

      // aria-disabled paints like disabled, on a button and on a link button.
      for (const property of ['backgroundColor', 'color', 'pointerEvents']) {
        const expected = await style('#disabled', property);
        assert.equal(await style('#aria-disabled', property), expected, `aria-disabled button ${property}`);
      }
      assert.equal(await style('#link', 'pointerEvents'), 'none', 'the aria-disabled link button is not disabled');
      assert.equal(await style('#link', 'backgroundColor'), await style('#disabled', 'backgroundColor'));
    } finally {
      await browser.close();
    }
  });
}
