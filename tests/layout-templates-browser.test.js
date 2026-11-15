import { test as nodeTest } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect } from '@playwright/test';
import { engines } from './browser.js';

const LAYOUTS = ['compact', 'rail', 'expanded', 'dashboard', 'list-detail', 'toolbar', 'status', 'sheet', 'workspace'];
const RAIL_FROM = { rail: 600, dashboard: 600, expanded: 840, toolbar: 600, status: 600, sheet: 600, workspace: 600 };
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
    assert.doesNotMatch(html, /tall-rail/, `${layout}: the scaffold's default layout, with the app bar across the top`);
  }
});

const box = (page, selector) => page.locator(selector).evaluate((el) => el.getBoundingClientRect().toJSON());

// What each region template adds, checked at every width.
const regionChecks = {
  async toolbar(page, width) {
    const tools = await box(page, '.toolbar.vertical');
    if (width < 600) assert.ok(tools.width > tools.height, 'the toolbar floats as a row below 600px');
    else assert.ok(tools.left >= (await box(page, 'main')).right, `the toolbar sits after the pane at ${width}px`);
  },
  async status(page, width) {
    await expect(page.locator('.status-bar'))[width < 600 ? 'toBeHidden' : 'toBeVisible']();
    if (width >= 600) assert.ok(Math.round((await box(page, '.status-bar')).bottom) === 812, `the status bar runs along the bottom at ${width}px`);
  },
  async workspace(page, width) {
    await regionChecks.toolbar(page, width);
    await regionChecks.status(page, width);
    if (width >= 600) assert.ok((await box(page, '.toolbar.vertical')).bottom <= (await box(page, '.status-bar')).top + 1, `the toolbar ends above the status bar at ${width}px`);
  },
};

// The side sheet opens from a project, takes a column from 1200px, and returns focus.
async function sheetChecks(page) {
  const project = page.locator('#projects a').nth(1);
  for (const width of [1280, 700]) {
    await page.setViewportSize({ width, height: 812 });
    await project.click();
    await expect(page.locator('#details-title')).toHaveText('Mobile app');
    await expect(page.locator('#details-title')).toBeFocused();
    const sheet = await box(page, '#details');
    if (width >= 1200) assert.ok(sheet.left >= (await box(page, 'main')).right, 'from 1200px the sheet is a column after the pane');
    if (width >= 1200 && await page.locator('.toolbar.vertical').count()) assert.ok(sheet.right <= (await box(page, '.toolbar.vertical')).left, 'and before the trailing toolbar');
    else assert.ok(sheet.right > 0 && sheet.width > 0, 'below 1200px the sheet opens over the page');
    await page.locator('#details button[aria-label="Close details"]').click();
    await expect(page.locator('#details')).toBeHidden();
    await expect(project).toBeFocused();
  }
}

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
            // Beside a trailing toolbar, the toolbar's own margin is the gap.
            assert.equal(pane[0], ['toolbar', 'workspace'].includes(layout) ? '0px' : '16px', `${layout}: main floats with its gap at ${width}px`);
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
          await regionChecks[layout]?.(page, width);
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
        if (layout === 'sheet' || layout === 'workspace') await sheetChecks(page);
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
