import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { EXAMPLE_NAMES, materializeProjectFixture } from '../scripts/eval-expressivecss-skill.mjs';
import { startFixtureServer } from '../scripts/expressivecss-eval-browser.mjs';

const browserTest = existsSync(chromium.executablePath()) ? test : test.skip;
const screenshots = process.env.EXPRESSIVECSS_EXAMPLE_SCREENSHOTS;

for (const name of EXAMPLE_NAMES) browserTest(`complete ${name} example preserves both treatments and its task path`, async () => {
  const project = await materializeProjectFixture(`example-${name}`);
  let browser, server;
  try {
    for (const [source, target] of [[`${name}.html`, 'index.html'], ['app.css', 'app.css'], ['app.js', 'app.js']]) {
      assert.equal(await readFile(path.join(project, 'src', target), 'utf8'), await readFile(new URL(`../skills/expressivecss/assets/examples/${source}`, import.meta.url), 'utf8'));
    }
    server = await startFixtureServer(project);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    page.setDefaultTimeout(8000);
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    page.on('request', request => requests.push(request.url()));
    for (const treatment of ['restrained', 'expressive']) {
      for (const scheme of ['light', 'dark']) {
        for (const width of [320, 839, 840, 1280]) {
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ colorScheme: scheme });
          await page.goto(`${server.origin}/dashboard?treatment=${treatment}`, { waitUntil: 'networkidle' });
          await page.evaluate(() => document.fonts.ready);
          assert.equal(await page.locator('body').getAttribute('data-treatment'), treatment);
          const text = await page.locator('#app').innerText();
          await page.locator('#treatment').selectOption(treatment === 'restrained' ? 'expressive' : 'restrained');
          assert.equal(await page.locator('#app').innerText(), text, 'treatment changes the product content');
          await page.locator('#treatment').selectOption(treatment);
          if (name === 'list-detail') await page.locator('[data-story="seeds"]').click();
          const layout = await page.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            targets: [...document.querySelectorAll('button, select, .choice-row, summary')].filter(el => el.getClientRects().length).map(el => ({ label: el.textContent.trim(), width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
            headline: getComputedStyle(document.querySelector('.focal h1, .focal h2')).fontSize,
          }));
          assert.equal(layout.overflow, false, `${name}/${treatment}/${scheme}/${width} overflows`);
          for (const target of layout.targets) assert.ok(target.height >= 47.9 && target.width >= 47.9, `${name}: ${target.label} target ${target.width}x${target.height}`);
          assert.equal(layout.headline, treatment === 'expressive' ? '32px' : '28px');
          if (screenshots && [320, 840, 1280].includes(width) && scheme === 'light') {
            await mkdir(screenshots, { recursive: true });
            await page.screenshot({ path: path.join(screenshots, `${name}-${treatment}-${width}.png`), fullPage: true });
          }
        }
      }
      await page.setViewportSize({ width: 320, height: 900 });
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${name} overflows with doubled text`);
      await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
      await page.setViewportSize({ width: 1280, height: 900 });
      // Explicit theme overrides must work even when the operating system disagrees.
      await page.locator('#theme').selectOption('dark');
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'dark');
      await page.locator('#theme').selectOption('light');
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'light');
      if (name === 'settings') {
        await page.locator('[value="digest"]').focus();
        assert.equal(await page.locator('[value="digest"]').evaluate(el => el === document.activeElement), true);
        await page.keyboard.press('Space');
        await page.locator('label').filter({ has: page.locator('[name="quiet"]') }).click();
        await page.locator('#settings-form button[type="submit"]').focus();
        await page.keyboard.press('Enter');
        assert.match(await page.locator('#status').innerText(), /3 email update types; quiet hours off/);
        await page.locator('#treatment').selectOption(treatment === 'restrained' ? 'expressive' : 'restrained');
        assert.equal(await page.locator('[value="digest"]').isChecked(), true);
      } else if (name === 'editor') {
        await page.locator('#subject').fill('Neighbors <img src=x onerror=alert(1)>');
        await page.locator('#message').fill('Bring seeds and a story.');
        await page.locator('#bold').focus();
        await page.keyboard.press('Space');
        assert.equal(await page.locator('#bold').getAttribute('aria-pressed'), 'true');
        await page.locator('#preview-button').click();
        assert.equal(await page.locator('#preview-title').evaluate(el => el === document.activeElement), true);
        assert.equal(await page.locator('#preview-subject').innerText(), 'Neighbors <img src=x onerror=alert(1)>');
        assert.equal(await page.locator('#preview-subject img').count(), 0);
        assert.equal(await page.locator('#preview-message').evaluate(el => getComputedStyle(el).fontWeight), '700');
        await page.locator('#edit-button').click();
        assert.equal(await page.locator('#message').evaluate(el => el === document.activeElement), true);
        await page.locator('#editor-form button[type="submit"]').click();
        assert.match(await page.locator('#status').innerText(), /Nothing was sent/);
        // A bfcache-style dispose/remount must retain state and avoid duplicate listeners.
        await page.evaluate(() => { dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })); dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });
        assert.equal(await page.locator('#bold').getAttribute('aria-pressed'), 'true');
        await page.locator('#bold').click();
        assert.equal(await page.locator('#bold').getAttribute('aria-pressed'), 'false');
      } else {
        await page.setViewportSize({ width: 375, height: 900 });
        await page.locator('#back-button').click();
        await page.locator('[data-story="water"]').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#detail-title').evaluate(el => el === document.activeElement), true);
        await page.locator('#read-button').click();
        assert.match(await page.locator('#status').innerText(), /marked read/);
        await page.setViewportSize({ width: 840, height: 900 });
        await page.locator('[data-story="seeds"]').click();
        await page.locator('[data-story="water"]').click();
        assert.equal(await page.locator('#read-button').innerText(), 'Mark as unread');
        await page.locator('#read-button').click();
        assert.equal(await page.locator('[data-story="water"] .read-state').innerText(), 'Unread');
        await page.setViewportSize({ width: 839, height: 900 });
        assert.equal(await page.locator('#reading-detail').isVisible(), true);
        await page.locator('#back-button').click();
        assert.equal(await page.locator('[data-story="water"]').evaluate(el => el === document.activeElement), true);
      }
    }
    assert.deepEqual(errors, []);
    assert.ok(requests.every(url => url.startsWith(server.origin)), 'example loads external resources');
    assert.equal(requests.some(url => url.endsWith('/dist/js/expressive.js')), name === 'editor');
  } finally {
    await browser?.close();
    await server?.close();
    await rm(project, { recursive: true, force: true });
  }
});
