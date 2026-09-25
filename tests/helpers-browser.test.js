import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const browserTest = existsSync(chromium.executablePath()) ? test : test.skip;

browserTest('visually-hidden text is off screen but still names its link', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    // An unlayered consumer rule beats every layered declaration unless it is
    // important, which is why the utility is.
    await page.setContent(`<style>${css} .note { position: relative; padding: 8px; }</style>
      <a href="#orders-42">View<span id="hidden" class="visually-hidden note"> order 42</span></a>`);
    const hidden = await page.locator('#hidden').evaluate((el) => {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return { width: box.width, height: box.height, position: style.position, clipPath: style.clipPath, overflow: style.overflow };
    });
    assert.deepEqual(hidden, { width: 1, height: 1, position: 'absolute', clipPath: 'inset(50%)', overflow: 'hidden' });
    assert.equal(await page.getByRole('link', { name: 'View order 42' }).count(), 1);
  } finally {
    await browser.close();
  }
});

browserTest('a plain fieldset drops its container and puts the legend at the content start', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>${css}</style>
      <div id="surface" style="width: 320px">
        <fieldset id="outlined"><legend>Outlined</legend><label><input type="radio" name="a">One</label></fieldset>
        <fieldset id="plain" class="plain"><legend id="legend">Delivery</legend><label id="option"><input type="radio" name="b">Daily</label></fieldset>
      </div>`);
    const geometry = await page.evaluate(() => {
      const rect = (id) => document.getElementById(id).getBoundingClientRect();
      const style = getComputedStyle(document.getElementById('plain'));
      const legend = getComputedStyle(document.getElementById('legend'));
      return {
        border: style.borderTopWidth,
        padding: style.padding,
        margin: style.margin,
        background: style.backgroundColor,
        legendPadding: legend.paddingInlineStart,
        legendMargin: legend.marginInlineStart,
        fieldsetLeft: rect('plain').left,
        legendLeft: rect('legend').left,
        optionLeft: rect('option').left,
        width: rect('plain').width,
        surfaceWidth: rect('surface').width
      };
    });
    assert.equal(geometry.border, '0px');
    assert.equal(geometry.padding, '0px');
    assert.equal(geometry.margin, '0px');
    assert.equal(geometry.background, 'rgba(0, 0, 0, 0)');
    assert.equal(geometry.legendPadding, '0px');
    assert.equal(geometry.legendMargin, '0px');
    assert.equal(geometry.legendLeft, geometry.fieldsetLeft);
    assert.equal(geometry.optionLeft, geometry.fieldsetLeft);
    assert.equal(geometry.width, geometry.surfaceWidth);
  } finally {
    await browser.close();
  }
});
