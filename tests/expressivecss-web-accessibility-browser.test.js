import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { materializeProjectFixture } from '../scripts/eval-expressivecss-skill.mjs';
import { startFixtureServer, createRestrictedFixturePage } from '../scripts/expressivecss-eval-browser.mjs';

const browserTest = existsSync(chromium.executablePath()) ? test : test.skip;
browserTest('web accessibility fixture exposes target geometry, keyboard reorder, and forced-color defects', async () => {
  const project = await materializeProjectFixture('consumer-web-accessibility');
  let browser, server;
  try {
    server = await startFixtureServer(project);
    browser = await chromium.launch({ headless: true });
    const { page, errors } = await createRestrictedFixturePage(browser, server.origin);
    await page.goto(`${server.origin}/dashboard`);
    const geometry = await page.evaluate(() => [...document.querySelectorAll('.tiny, #medium-target')].map(el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height, x: r.x }; }));
    assert.deepEqual(geometry.map(({ width, height }) => [width, height]), [[20, 20], [20, 20], [20, 20], [20, 20], [32, 32]]);
    assert.equal(geometry[1].x - geometry[0].x, 28);
    assert.equal(geometry[3].x - geometry[2].x, 20);
    await page.locator('#tasks li').nth(1).focus();
    await page.keyboard.press('Alt+ArrowUp');
    assert.equal(await page.locator('#tasks li').first().innerText(), 'Plant seeds');
    assert.equal(await page.locator('#tasks button').count(), 0);
    for (const theme of ['light', 'dark']) {
      await page.locator('#theme').selectOption(theme);
      assert.equal(await page.locator('html').getAttribute('theme'), theme);
      assert.notEqual(await page.locator('#save').evaluate(el => getComputedStyle(el).boxShadow), 'none');
    }
    await page.emulateMedia({ forcedColors: 'active' });
    await page.locator('#save').focus();
    const forced = await page.locator('#save').evaluate(el => { const s = getComputedStyle(el); return { active: matchMedia('(forced-colors: active)').matches, shadow: s.boxShadow, outline: s.outlineStyle, border: s.borderTopWidth }; });
    assert.deepEqual(forced, { active: true, shadow: 'none', outline: 'none', border: '0px' });
    await page.keyboard.press('Enter');
    assert.match(await page.locator('#status').innerText(), /Nothing was sent/);
    assert.deepEqual(errors, []);
  } finally {
    try { await browser?.close(); } finally { try { await server?.close(); } finally { await rm(project, { recursive: true, force: true }); } }
  }
});
