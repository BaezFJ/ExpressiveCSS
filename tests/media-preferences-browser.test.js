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

// WCAG contrast ratio of two rendered pixels.
const ratio = (a, b) => {
  const lum = ([r, g, b]) => {
    const [R, G, B] = [r, g, b].map((c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

browserTest('contrast levels raise accent and outline contrast against the surface', async () => {
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    const swatches = ['surface', 'primary', 'error', 'on-surface-variant', 'outline-variant', 'primary-container', 'on-primary-container'];
    const boxes = (level, scheme) => `<div theme="${scheme}" ${level ? `contrast="${level}"` : ''} style="display:flex;color-scheme:${scheme}">${
      swatches.map((role) => `<i style="width:10px;height:10px;background:var(--md-sys-color-${role})"></i>`).join('')}</div>`;
    const rows = [];
    for (const scheme of ['light', 'dark']) for (const level of ['', 'medium', 'high']) rows.push([scheme, level]);
    await page.setContent(`<style>${css} body{margin:0}</style>${rows.map(([s, l]) => boxes(l, s)).join('')}`);
    // Paint each computed color on a canvas to read it back as sRGB.
    const grid = await page.evaluate(() => {
      const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      return [...document.body.children].map((row) => [...row.children].map((swatch) => {
        ctx.fillStyle = getComputedStyle(swatch).backgroundColor;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      }));
    });
    const pixel = (row, col) => grid[row][col];
    rows.forEach(([scheme, level], row) => {
      const vs = (col, other = 0) => ratio(pixel(row, col), pixel(row, other));
      const name = `${scheme} ${level || 'standard'}`;
      const accent = { '': 3, medium: 4.5, high: 7 }[level];
      assert.ok(vs(1) >= accent, `${name}: primary ${vs(1).toFixed(2)}:1`);
      assert.ok(vs(2) >= accent, `${name}: error ${vs(2).toFixed(2)}:1`);
      assert.ok(vs(3) >= { '': 4.5, medium: 7, high: 7 }[level], `${name}: on-surface-variant ${vs(3).toFixed(2)}:1`);
      if (level) assert.ok(vs(4) >= 3, `${name}: outline-variant ${vs(4).toFixed(2)}:1`);
      assert.ok(vs(6, 5) >= { '': 4.5, medium: 4.5, high: 7 }[level], `${name}: on-primary-container ${vs(6, 5).toFixed(2)}:1`);
    });
  } finally {
    await browser.close();
  }
});

browserTest('prefers-contrast: more applies the high scheme unless contrast says otherwise', async () => {
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>${css}</style><div id="page" class="bordered">x</div><div id="opt" contrast="standard" class="bordered">y</div>`);
    const colors = () => page.evaluate(() => ['page', 'opt'].map((id) => getComputedStyle(document.getElementById(id)).borderTopColor));
    const [standard] = await colors();
    await page.emulateMedia({ contrast: 'more' });
    const [more, optedOut] = await colors();
    assert.notEqual(more, standard);
    assert.equal(optedOut, standard);
  } finally {
    await browser.close();
  }
});

browserTest('reduced motion zeroes every motion token, which stops components without their own rule', async () => {
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>${css}</style>
      <label><input id="radio" type="radio" name="r"> Option</label>`);
    const read = () => page.evaluate(() => ({
      radio: getComputedStyle(document.getElementById('radio')).transitionDuration.split(', '),
      token: getComputedStyle(document.documentElement).getPropertyValue('--md-sys-motion-spring-default-spatial-duration').trim(),
    }));
    const before = await read();
    assert.ok(before.radio.some((d) => d !== '0s'), 'the radio animates by default');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const after = await read();
    assert.deepEqual([...new Set(after.radio)], ['0s'], 'the radio has no per-component rule; the tokens stop it');
    assert.equal(after.token, '0s');
  } finally {
    await browser.close();
  }
});
