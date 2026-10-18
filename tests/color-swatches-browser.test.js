import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

test('chromium: color swatches draw each radio as its color and keep native radio behavior', { timeout: 30000 }, async (t) => {
  if (!existsSync(chromium.executablePath())) { t.skip('chromium is not installed'); return; }
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html lang="en" theme="light"><head><style>${css}</style></head><body>
      <form id="f"><fieldset class="color-swatches">
        <legend>Accent</legend>
        <label><span class="visually-hidden">Purple</span><input type="radio" name="accent" value="#6750a4" style="--md-comp-color-swatch-color: #6750a4" checked></label>
        <label><span class="visually-hidden">Green</span><input type="radio" name="accent" value="#386a20" style="--md-comp-color-swatch-color: #386a20"></label>
        <label><span class="visually-hidden">Custom accent</span><input type="color" value="#ff8800"></label>
      </fieldset></form></body></html>`);
    const swatch = (name) => page.getByRole('radio', { name });
    const look = (name) => swatch(name).evaluate((el) => {
      const s = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return { bg: s.backgroundColor, radius: s.borderTopLeftRadius, size: [box.width, box.height], ring: s.boxShadow !== 'none' };
    });
    assert.deepEqual(await look('Purple'), { bg: 'rgb(103, 80, 164)', radius: '9999px', size: [40, 40], ring: true });
    assert.deepEqual(await look('Green'), { bg: 'rgb(56, 106, 32)', radius: '9999px', size: [40, 40], ring: false });
    assert.equal(await page.getByRole('group', { name: 'Accent' }).count(), 1);

    await swatch('Purple').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await swatch('Green').isChecked(), true, 'arrow keys move the choice');
    assert.equal(await page.evaluate(() => new FormData(document.getElementById('f')).get('accent')), '#386a20');
    assert.equal((await look('Green')).ring, true);
    assert.equal(await swatch('Green').evaluate((el) => getComputedStyle(el.parentElement).outlineStyle), 'solid', 'focus ring after arrow keys');
    const custom = await page.getByLabel('Custom accent').evaluate((el) => el.parentElement.getBoundingClientRect().height);
    assert.equal(custom, 48, 'the custom color input keeps a 48px target');

    await page.emulateMedia({ forcedColors: 'active' });
    assert.equal((await look('Green')).bg, 'rgb(56, 106, 32)', 'forced colors keep the swatch color');
  } finally {
    await browser.close();
  }
});
