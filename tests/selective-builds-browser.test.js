import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, writeFile, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import utilsBundle from 'playwright-core/lib/utilsBundle';
import { startFixtureServer } from '../scripts/expressivecss-eval-browser.mjs';
import { consumerBuild, fixtures, root } from './fixtures/selective-builds.mjs';

for (const [engineName, engine] of Object.entries({ chromium, firefox, webkit })) {
  test(`${engineName}: selective builds preserve rendering and interaction`, { timeout: 120000 }, async t => {
    if (!existsSync(engine.executablePath())) { t.skip(`${engineName} is not installed`); return; }
    const directory = await mkdtemp(join(tmpdir(), 'expressive-selective-'));
    let browser, server;
    const report = {};
    const artifacts = `${root}/.cache/selective-builds/${engineName}`;
    try {
      await mkdir(join(directory, 'src'));
      await mkdir(artifacts, { recursive: true });
      await cp(`${root}/dist/fonts`, join(directory, 'node_modules/@expressivecss/expressive/dist/fonts'), { recursive: true });
      server = await startFixtureServer(directory);
      browser = await engine.launch({ headless: true });
      for (const [name, fixture] of Object.entries(fixtures)) {
        for (const theme of ['light', 'dark']) {
          const reference = {};
          for (const selective of [false, true]) {
            const build = await consumerBuild(name, selective);
            const css = build.css.replaceAll('../fonts/', '/node_modules/@expressivecss/expressive/dist/fonts/');
            await writeFile(join(directory, 'src/app.css'), css);
            await writeFile(join(directory, 'src/app.js'), build.js);
            await writeFile(join(directory, 'src/index.html'), `<!doctype html><html lang="en" theme="${theme}"><head><meta charset="utf-8"><title>Selective ${name}</title><link rel="stylesheet" href="/src/app.css"></head><body>${fixture.markup}<script src="/src/app.js"></script></body></html>`);
            const page = await browser.newPage({ viewport: { width: 960, height: 720 }, reducedMotion: 'reduce' });
            const errors = [], fonts = [];
            page.on('pageerror', error => errors.push(error.message));
            page.on('response', response => { if (response.url().endsWith('.woff2')) fonts.push({ url: new URL(response.url()).pathname, status: response.status() }); });
            const capture = async state => {
              await page.evaluate(() => document.fonts.ready);
              let png;
              await expect.poll(async () => {
                const next = await page.screenshot({ animations: 'disabled', caret: 'hide', path: `${artifacts}/${name}-${theme}-${selective ? 'selective' : 'full'}-${state}.png` });
                const stable = png?.equals(next) ?? false;
                png = next;
                return stable;
              }, { intervals: [100], timeout: 5000 }).toBe(true);
              const pixels = utilsBundle.PNG.sync.read(png);
              if (selective) {
                assert.equal(pixels.width, reference[state].width);
                assert.equal(pixels.height, reference[state].height);
                assert.ok(pixels.data.every((value, index) => Math.abs(value - reference[state].data[index]) <= 1), `${name} ${theme} ${state}: selective screenshot differs beyond one color level of rasterization rounding`);
              } else reference[state] = pixels;
            };
            try {
              await page.goto(server.origin);
              await page.waitForFunction(() => window.instances?.length);
              await capture('initial');
              if (name === 'tabs') {
                await page.locator('.tabs a').nth(1).focus();
                await page.keyboard.press('Enter');
                await expect(page.locator('#second')).toBeVisible();
                await expect(page.locator('.tabs a').nth(1)).toHaveAttribute('aria-current', 'page');
                await expect(page.locator('#first')).toBeHidden();
                await capture('selected');
              } else {
                const input = page.locator('.field > input.menu-trigger').first();
                await input.focus();
                await page.keyboard.press('ArrowDown');
                await capture('menu');
                await page.locator('li[role=option]').filter({ hasText: 'Two' }).focus();
                await page.keyboard.press('Enter');
                await expect(page.locator('#choice')).toHaveValue('two');
                await page.locator('#date').focus();
                await page.keyboard.press('Enter');
                await expect(page.locator('.datepicker-container')).toBeVisible();
                const day = page.locator('.datepicker-day-button[data-day="13"]').first();
                await day.focus();
                await capture('calendar');
                await page.keyboard.press('Enter');
                await expect(page.locator('#date')).toHaveValue(/13/);
              }
              await page.evaluate(() => window.dispose());
              assert.equal(await page.locator('.indicator, .datepicker-container, .select-wrapper').count(), 0);
              await page.evaluate(({ markup, css }) => {
                document.querySelector('link').remove();
                document.body.innerHTML = '<div id="host"></div>';
                const host = document.querySelector('#host');
                host.setAttribute('theme', document.documentElement.getAttribute('theme'));
                const shadow = host.attachShadow({ mode: 'open' });
                shadow.innerHTML = markup;
                const sheet = new CSSStyleSheet();
                sheet.replaceSync(css);
                shadow.adoptedStyleSheets = [sheet];
              }, { markup: fixture.markup, css });
              await capture('shadow-styles');
              assert.deepEqual(errors, []);
              assert.ok(fonts.length > 0, 'text font requests were recorded');
              assert.ok(fonts.every(font => font.status === 200), `font URLs resolve: ${JSON.stringify(fonts)}`);
              assert.ok(fonts.every(font => !font.url.includes('material-symbols')), 'these fixtures need no icon font');
              report[`${name}-${theme}-${selective ? 'selective' : 'full'}`] = { sizes: build.sizes, fonts, fontTransfers: await page.evaluate(() => performance.getEntriesByType('resource').filter(entry => entry.name.endsWith('.woff2')).map(entry => ({ url: new URL(entry.name).pathname, encodedBodySize: entry.encodedBodySize, transferSize: entry.transferSize }))) };
            } finally {
              await page.evaluate(() => window.dispose?.()).catch(() => {});
              await page.close();
            }
          }
        }
      }
      await writeFile(`${artifacts}/report.json`, JSON.stringify(report, null, 2));
    } finally {
      await browser?.close();
      await server?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
}
