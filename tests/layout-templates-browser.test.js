import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, firefox, webkit, expect } from '@playwright/test';

for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  test(`${name}: copied layout templates adapt and preserve list-detail focus`, async t => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const directory = await mkdtemp(join(tmpdir(), 'expressivecss-layouts-'));
    let browser, page;
    try {
      await cp(new URL('../dist', import.meta.url), join(directory, 'dist'), { recursive: true });
      browser = await engine.launch();
      page = await browser.newPage({ reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('requestfailed', request => errors.push(request.url()));
      for (const layout of ['compact', 'rail', 'expanded', 'dashboard', 'list-detail']) {
        await cp(new URL(`../docs/public/layout-${layout}.html`, import.meta.url), join(directory, 'index.html'));
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto(pathToFileURL(join(directory, 'index.html')).href);
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.evaluate(() => typeof Expressive.AutoInit), 'function');
        for (const width of [375, 800, 1440]) {
          await page.setViewportSize({ width, height: 812 });
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${layout} overflows at ${width}px`);
          if (layout === 'list-detail') {
            await expect(page.locator('#items')).toBeVisible();
            await expect(page.locator('#detail'))[width >= 840 ? 'toBeVisible' : 'toBeHidden']();
          } else {
            const railVisible = layout !== 'compact' && width >= (layout === 'expanded' ? 840 : 600);
            await expect(page.locator('.app-navigation'))[railVisible ? 'toBeHidden' : 'toBeVisible']();
            if (layout !== 'compact') await expect(page.locator('.navigation-rail'))[railVisible ? 'toBeVisible' : 'toBeHidden']();
          }
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
          await page.setViewportSize({ width: 1440, height: 812 });
          await expect(page.locator('#items')).toBeVisible();
          await expect(page.locator('#detail')).toBeVisible();
          await expect(page.locator('#back')).toBeHidden();
          await expect(page.locator('#detail-title')).toHaveText('Choose your components');
        } else if (layout !== 'compact') {
          const rail = page.locator('.navigation-rail');
          const expanded = layout === 'expanded';
          await expect(rail).toHaveAttribute('aria-expanded', String(expanded));
          await rail.locator('button').click();
          await expect(rail).toHaveAttribute('aria-expanded', String(!expanded));
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
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
