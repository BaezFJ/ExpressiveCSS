import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const browserTest = existsSync(chromium.executablePath()) ? test : test.skip;

browserTest('print is light, hides screen-only surfaces and shows link targets', async () => {
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html theme="dark"><head><style>${css}</style></head><body>
      <nav id="rail" class="navigation-rail"></nav>
      <p>See <a id="ext" href="https://example.com/a">the source</a> and <a id="local" href="#x">below</a>.</p>
      <button id="screen" class="hide-on-print">Print</button>
      <p id="paper" class="print-only">Printed on paper</p>
    </body></html>`);
    const read = () => page.evaluate(() => {
      const style = (id) => getComputedStyle(document.getElementById(id));
      return {
        scheme: getComputedStyle(document.documentElement).colorScheme,
        rail: style('rail').display,
        ext: getComputedStyle(document.getElementById('ext'), '::after').content,
        local: getComputedStyle(document.getElementById('local'), '::after').content,
        screen: style('screen').display,
        paper: style('paper').display,
      };
    });
    const screen = await read();
    assert.equal(screen.scheme, 'dark');
    assert.notEqual(screen.rail, 'none');
    assert.equal(screen.paper, 'none');
    await page.emulateMedia({ media: 'print' });
    assert.deepEqual(await read(), {
      scheme: 'light',
      rail: 'none',
      ext: '" (https://example.com/a)"',
      local: 'none',
      screen: 'none',
      paper: 'block',
    });
  } finally {
    await browser.close();
  }
});

browserTest('more contrast draws outline-variant borders in the outline role', async () => {
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>${css}</style><div id="d" class="bordered">x</div><div id="o" style="border: 1px solid var(--md-sys-color-outline)">y</div>`);
    const colors = () => page.evaluate(() => ['d', 'o'].map((id) => getComputedStyle(document.getElementById(id)).borderTopColor));
    const [before, outline] = await colors();
    assert.notEqual(before, outline);
    await page.emulateMedia({ contrast: 'more' });
    const [after, outlineAfter] = await colors();
    assert.equal(after, outlineAfter);
  } finally {
    await browser.close();
  }
});
