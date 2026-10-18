import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;
const engines = Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name);
const markup = (dir) => `<!doctype html><html lang="en" dir="${dir}" theme="light"><head><style>${css}</style></head><body style="margin:0">
<nav class="navigation-rail" aria-label="Main" style="position:fixed;inset-block:0;inset-inline-start:0">
  <button type="button" aria-label="Menu"><span class="material-symbols" aria-hidden="true">menu</span></button>
  <a id="home" href="#home" aria-current="page"><span class="material-symbols" aria-hidden="true">home</span>Home</a>
  <button id="components" type="button" popovertarget="components-panel"><span class="material-symbols" aria-hidden="true">widgets</span>Components</button>
  <div id="components-panel" class="navigation-rail-panel" popover>
    <a id="overview" href="#overview">Components overview</a>
    <button id="more" type="button" popovertarget="more-popover">More</button>
    <div id="more-popover" popover>Extra</div>
    <details>
      <summary id="pickers">Date &amp; time pickers</summary>
      <a id="date" href="#date">Date pickers</a>
      <a href="#time">Time pickers</a>
    </details>
  </div>
  <button id="styles" type="button" popovertarget="styles-panel"><span class="material-symbols" aria-hidden="true">palette</span>Styles</button>
  <div id="styles-panel" class="navigation-rail-panel" popover><a href="#color">Color</a></div>
  <button id="archive" type="button" popovertarget="archive-panel" disabled><span class="material-symbols" aria-hidden="true">inventory</span>Archive</button>
  <div id="archive-panel" class="navigation-rail-panel" popover><a href="#old">Old</a></div>
</nav><main><p id="content" style="margin:0;margin-inline-start:400px">Content</p></main>
<script>${js}</script><script>Expressive.NavigationRail.init(document.querySelector('nav'))</script></body></html>`;

for (const [name, engine] of engines) {
  for (const dir of ['ltr', 'rtl']) {
    test(`${name} ${dir}: a rail destination opens a docked side panel on hover and click`, { timeout: 30000 }, async (t) => {
      if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
      const browser = await leaseBrowser(engine);
      try {
        const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
        await page.setContent(markup(dir));
        const panel = page.locator('#components-panel');
        const isOpen = () => panel.evaluate((el) => el.matches(':popover-open'));

        await page.hover('#components');
        await page.waitForTimeout(400);
        assert.equal(await isOpen(), true, 'hover opens the panel');
        const rail = await page.locator('nav').boundingBox();
        const p = await panel.boundingBox();
        const edge = dir === 'ltr' ? p.x - (rail.x + rail.width) : rail.x - (p.x + p.width);
        assert.ok(Math.abs(edge) < 1, `the panel meets the rail's edge: ${edge}`);
        assert.ok(p.y < 1 && Math.abs(p.height - 700) < 1, `the panel spans the window height: ${p.y}, ${p.height}`);
        const link = await page.locator('#overview').boundingBox();
        const inset = dir === 'ltr' ? link.x - p.x : p.x + p.width - (link.x + link.width);
        assert.ok(Math.abs(inset - 12) < 1, `links sit inside the panel's padding: ${inset}`);

        await page.hover('#overview');
        await page.waitForTimeout(400);
        assert.equal(await isOpen(), true, 'moving onto the panel keeps it open');
        await page.hover('#content');
        await page.waitForTimeout(400);
        assert.equal(await isOpen(), false, 'leaving the rail and panel closes it');

        await page.hover('#components');
        await page.waitForTimeout(400);
        await page.focus('#overview');
        await page.hover('#content');
        await page.waitForTimeout(400);
        assert.equal(await isOpen(), true, 'keyboard focus inside keeps a hover-opened panel open');
        await page.keyboard.press('Escape');
        assert.equal(await isOpen(), false);

        await page.hover('#components');
        await page.waitForTimeout(400);
        await page.hover('#styles');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        assert.equal(await isOpen(), false, 'Escape closes the open panel');
        assert.equal(await page.locator('#styles-panel').evaluate((el) => el.matches(':popover-open')), false, 'Escape cancels a pending hover switch');
        await page.hover('#content');
        await page.waitForTimeout(400);

        await page.hover('#components');
        await page.waitForTimeout(400);
        await page.click('#components');
        await page.hover('#content');
        await page.waitForTimeout(400);
        assert.equal(await isOpen(), true, 'clicking a hover-opened trigger pins the panel');

        assert.equal(await page.locator('#date').isVisible(), false, 'groups start closed');
        await page.click('#pickers');
        assert.equal(await page.locator('#date').isVisible(), true, 'a summary opens its group');

        await page.focus('#overview');
        await page.keyboard.press('Escape');
        assert.equal(await isOpen(), false, 'Escape closes the panel');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'components', 'focus returns to the trigger');

        await page.click('#components');
        assert.equal(await isOpen(), true, 'a click opens the panel without hover');
        const moreOpen = () => page.locator('#more-popover').evaluate((el) => el.matches(':popover-open'));
        await page.click('#more');
        assert.equal(await moreOpen(), true);
        await page.keyboard.press('Escape');
        assert.equal(await moreOpen(), false, 'the first Escape closes a nested popover');
        assert.equal(await isOpen(), true, 'the first Escape leaves the panel open');
        await page.keyboard.press('Escape');
        assert.equal(await isOpen(), false, 'the second Escape closes the panel');
        await page.click('#components');
        await page.click('#components');
        assert.equal(await isOpen(), false, 'a second click closes it');

        // Disabled styles drop pointer events, so dispatch one to reach the guard.
        await page.locator('#archive').dispatchEvent('pointerover', { pointerType: 'mouse', bubbles: true });
        await page.waitForTimeout(400);
        assert.equal(await page.locator('#archive-panel').evaluate((el) => el.matches(':popover-open')), false, 'hover skips a disabled destination');

        await page.setViewportSize({ width: 400, height: 700 });
        await page.locator('nav').evaluate((el) => el.classList.add('expanded'));
        await page.click('#components');
        // Expanding animates the rail's width; measure once it settles.
        await page.locator('nav').evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
        const compactRail = await page.locator('nav').boundingBox();
        const compact = await panel.boundingBox();
        const compactEdge = dir === 'ltr' ? compact.x - (compactRail.x + compactRail.width) : compactRail.x - (compact.x + compact.width);
        assert.ok(Math.abs(compactEdge) < 1, `beside a compact expanded rail the panel meets its edge: ${compactEdge}`);
        assert.ok(compact.x >= -1 && compact.x + compact.width <= 401, `the panel stays inside the window: ${compact.x}, ${compact.width}`);
      } finally {
        await browser.close();
      }
    });
  }

  test(`${name}: a rail that starts with a panel destination has no menu toggle`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
      await page.setContent(`<!doctype html><html lang="en" theme="light"><head><style>${css}</style></head><body style="margin:0">
<nav class="navigation-rail" aria-label="Main">
  <button id="start" type="button" popovertarget="start-panel"><span class="material-symbols" aria-hidden="true">home</span>Start</button>
  <div id="start-panel" class="navigation-rail-panel" popover><a href="#one">One</a></div>
  <a id="other" href="#other"><span class="material-symbols" aria-hidden="true">star</span>Other</a>
</nav></body></html>`);
      const box = (selector) => page.locator(selector).boundingBox();
      const [start, other] = [await box('#start'), await box('#other')];
      assert.equal(start.width, other.width, 'the panel destination is laid out like the other destinations');
      assert.equal(start.height, other.height, 'a button destination is as tall as a link destination');
      assert.equal(await page.locator('#start').evaluate((el) => getComputedStyle(el).flexDirection), 'column');
    } finally {
      await browser.close();
    }
  });
}
