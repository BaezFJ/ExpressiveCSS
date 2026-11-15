import { test as nodeTest } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect } from '@playwright/test';
import { engines } from './browser.js';

const LAYOUTS = ['compact', 'rail', 'expanded', 'dashboard', 'list-detail'];
const RAIL_FROM = { rail: 600, dashboard: 600, expanded: 840 };
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

nodeTest('the app templates are scaffolds without shell CSS or shell helpers', async () => {
  for (const layout of LAYOUTS) {
    const html = await read(`docs/public/layout-${layout}.html`);
    assert.equal(await read(`skills/expressivecss/assets/templates/layout-${layout}.html`), html, `${layout}: the bundled copy matches`);
    assert.doesNotMatch(html, /<style|app-shell|app-content/, `${layout}: no shell CSS`);
    assert.doesNotMatch(html, /<(nav|footer)\b[^>]*hide-on-/, `${layout}: no helper on a shell region`);
    assert.match(html, /<body>\s*<div class="scaffold[ "]/, `${layout}: the scaffold is the body's child`);
    assert.match(html, /name="viewport" content="[^"]*viewport-fit=cover/, `${layout}: viewport-fit=cover`);
    assert.match(html, /<header>\s*<a class="visually-hidden-focusable" href="#main">/, `${layout}: a skip link in the header`);
    assert.match(html, /<main id="main" tabindex="-1"[ >]/, `${layout}: a focusable main`);
    assert.equal(/class="scaffold tall-rail"/.test(html), layout in RAIL_FROM, `${layout}: tall-rail on rail templates`);
  }
});

for (const [name, engine, test] of engines) {
  test(`${name}: copied layout templates adapt and preserve list-detail focus`, async t => {
    const directory = await mkdtemp(join(tmpdir(), 'expressivecss-layouts-'));
    let browser, page;
    try {
      await cp(new URL('../dist', import.meta.url), join(directory, 'dist'), { recursive: true });
      browser = await engine.launch();
      page = await browser.newPage({ reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('requestfailed', request => errors.push(request.url()));
      for (const layout of LAYOUTS) {
        await cp(new URL(`../docs/public/layout-${layout}.html`, import.meta.url), join(directory, 'index.html'));
        await page.setViewportSize({ width: 390, height: 812 });
        await page.goto(pathToFileURL(join(directory, 'index.html')).href);
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.evaluate(() => typeof Expressive.AutoInit), 'function');
        for (const width of [390, 700, 1280]) {
          await page.setViewportSize({ width, height: 812 });
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${layout} overflows at ${width}px`);
          if (width >= 600) {
            const pane = await page.locator('main').evaluate((el) => [getComputedStyle(el).marginInlineEnd, getComputedStyle(el).borderTopLeftRadius]);
            assert.equal(pane[0], '16px', `${layout}: main floats with its gap at ${width}px`);
            assert.notEqual(pane[1], '0px', `${layout}: and rounded corners at ${width}px`);
          }
          if (layout === 'list-detail') {
            await expect(page.locator('#items')).toBeVisible();
            await expect(page.locator('#detail'))[width >= 840 ? 'toBeVisible' : 'toBeHidden']();
            continue;
          }
          const railShown = width >= (RAIL_FROM[layout] ?? Infinity);
          await expect(page.locator('.navigation-bar'))[railShown ? 'toBeHidden' : 'toBeVisible']();
          if (layout !== 'compact') await expect(page.locator('.navigation-rail'))[railShown ? 'toBeVisible' : 'toBeHidden']();
          if (layout === 'expanded') await expect(page.locator('#menu'))[railShown ? 'toBeVisible' : 'toBeHidden']();
          // The content keeps its container width inside the floating pane.
          const fit = await page.evaluate(() => {
            const main = document.querySelector('main');
            const container = main.querySelector(':scope > .container');
            const style = getComputedStyle(container);
            const share = parseFloat(style.getPropertyValue('--md-comp-container-width')) / 100;
            const expected = Math.min(parseFloat(style.maxWidth), share * main.clientWidth);
            return Math.abs(container.getBoundingClientRect().width - expected) <= 1;
          });
          assert.ok(fit, `${layout}: the container fills the pane at ${width}px`);
        }
        if (layout === 'list-detail') {
          await page.setViewportSize({ width: 375, height: 812 });
          const selected = page.locator('#items a').nth(1);
          await selected.focus();
          await selected.press('Enter');
          await expect(page.locator('#detail-title')).toHaveText('Choose your components');
          await expect(page.locator('#detail-title')).toBeFocused();
          await expect(page.locator('#items')).toBeHidden();
          await expect(selected).toHaveAttribute('aria-current', 'true');
          await page.locator('#back').click();
          await expect(selected).toBeFocused();
          await expect(page.locator('#detail')).toBeHidden();
          await selected.press('Enter');
          // Just past 840px the pane region is narrower than the window, but
          // the panes and the Back helper follow the same window breakpoint.
          await page.setViewportSize({ width: 850, height: 812 });
          await expect(page.locator('#items')).toBeVisible();
          await expect(page.locator('#detail')).toBeVisible();
          await expect(page.locator('#back')).toBeHidden();
          await page.setViewportSize({ width: 1440, height: 812 });
          await expect(page.locator('#items')).toBeVisible();
          await expect(page.locator('#detail')).toBeVisible();
          await expect(page.locator('#back')).toBeHidden();
          await expect(page.locator('#detail-title')).toHaveText('Choose your components');
        } else if (layout !== 'compact') {
          const rail = page.locator('.navigation-rail');
          const menu = page.locator('#menu');
          const expanded = layout === 'expanded';
          await page.setViewportSize({ width: 1280, height: 812 });
          await expect(rail).toHaveAttribute('aria-expanded', String(expanded));
          await expect(menu).toHaveAttribute('aria-expanded', String(expanded));
          await menu.click();
          await expect(rail).toHaveAttribute('aria-expanded', String(!expanded));
          await expect(menu).toHaveAttribute('aria-expanded', String(!expanded));
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          if (!expanded) {
            await menu.click();
            await page.setViewportSize({ width: 390, height: 812 });
            await expect(rail).toBeHidden();
            await menu.click();
            await expect(rail).toBeVisible();
            await expect(menu).toHaveAttribute('aria-expanded', 'true');
            await page.keyboard.press('Escape');
            await expect(rail).toBeHidden();
          }
        }
        await page.evaluate(() => {
          document.querySelectorAll('.navigation-rail').forEach(rail => Expressive.NavigationRail.getInstance(rail)?.destroy());
        });
      }
      assert.deepEqual(errors, [], 'templates must load local assets without errors');
    } finally {
      try {
        await page?.evaluate(() => {
          document.querySelectorAll('.navigation-rail').forEach(rail => Expressive.NavigationRail.getInstance(rail)?.destroy());
        });
      } finally {
        await browser?.close();
        await rm(directory, { recursive: true, force: true });
      }
    }
  });
}
