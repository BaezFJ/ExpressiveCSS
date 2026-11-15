import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
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

for (const [name, engine, test] of engines) {
  for (const dir of ['ltr', 'rtl']) {
    test(`${name} ${dir}: a rail destination opens a docked side panel on hover and click`, { timeout: 30000 }, async (t) => {
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

  for (const dir of ['ltr', 'rtl']) {
    test(`${name} ${dir}: nav-rail="compact hover" peeks over the page without moving it`, { timeout: 30000 }, async (t) => {
      const browser = await leaseBrowser(engine);
      try {
        const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
        await page.setContent(`<!doctype html><html lang="en" dir="${dir}" theme="light" nav-rail="compact hover"><head><style>${css}</style></head><body style="margin:0;display:flex">
<nav class="navigation-rail" aria-label="Main">
  <button id="menu" type="button" aria-label="Menu"><span class="material-symbols" aria-hidden="true">menu</span></button>
  <a id="home" href="#home" aria-current="page"><span class="material-symbols" aria-hidden="true">home</span>Home</a>
  <a id="starred" href="#starred"><span class="material-symbols" aria-hidden="true">star</span>Starred</a>
  <h3>Section</h3>
  <button id="labels" type="button" popovertarget="labels-panel"><span class="material-symbols" aria-hidden="true">label</span>Labels</button>
  <div id="labels-panel" class="navigation-rail-panel" popover>
    <button id="labels-more" type="button" popovertarget="labels-popover">More</button>
    <div id="labels-popover" popover>Extra</div>
  </div>
</nav><main id="content" style="width:100%"><button id="after" type="button">After</button></main>
<script>${js}</script><script>Expressive.NavigationRail.init(document.querySelector('nav'))</script></body></html>`);
        const away = () => page.mouse.move(500, 300);
        const width = async (selector) => (await page.locator(selector).boundingBox()).width;
        const zIndex = () => page.locator('nav').evaluate((el) => getComputedStyle(el).zIndex);
        const peeking = () => page.locator('nav').evaluate((el) => el.classList.contains('peek'));
        const isOpen = (id) => page.locator(id).evaluate((el) => el.matches(':popover-open'));
        const top = async () => Math.round((await page.locator('#labels').boundingBox()).y);
        // The page's inline-start edge, measured from the rail's side of the window.
        const edgeScript = (el) => {
          const box = el.getBoundingClientRect();
          return document.dir === 'rtl' ? innerWidth - box.right : box.left;
        };
        const edge = () => page.locator('#content').evaluate(edgeScript);

        assert.equal(await width('nav'), 72, 'the compact rail is 72px wide');
        assert.ok(await width('#home') <= 56, 'a compact destination is icon-only');
        assert.equal(await page.locator('#home').evaluate((el) => el.textContent.trim()), 'homeHome', 'the label stays in the DOM');
        assert.equal(await zIndex(), '0', 'a collapsed hover rail stays at the page layer');

        const before = await top();
        // Samples the page's edge every frame, so a jump mid-animation fails too.
        const edges = page.evaluate((script) => new Promise((resolve) => {
          const measure = new Function(`return (${script})`)();
          const xs = [];
          const end = performance.now() + 900;
          const sample = () => {
            xs.push(measure(document.querySelector('#content')));
            if (performance.now() < end) requestAnimationFrame(sample);
            else resolve(xs);
          };
          requestAnimationFrame(sample);
        }), edgeScript.toString());
        await page.hover('#starred');
        const xs = await edges;
        assert.ok(xs.every((x) => Math.abs(x - 72) < 1), `the page never moves while the peek opens: ${Math.min(...xs)}..${Math.max(...xs)}`);
        assert.equal(await width('nav'), 280, 'hover peeks at the expanded width');
        assert.equal(await top(), before, 'compact rows stay put under the pointer');
        assert.equal(await page.locator('nav').evaluate((el) => getComputedStyle(el).width), '280px', 'a full-width sibling does not shrink the peek');
        assert.equal(await zIndex(), '998', 'the peek is drawn over the page');

        await away();
        assert.equal(await zIndex(), '998', 'the closing peek stays over the page');
        await page.waitForTimeout(900);
        assert.equal(await width('nav'), 72, 'leaving the rail ends the peek');
        assert.equal(await zIndex(), '0', 'the rail drops back once the peek has closed');

        await page.hover('#labels');
        await page.waitForTimeout(900);
        await page.click('#labels-more');
        assert.equal(await isOpen('#labels-popover'), true);
        // Focus inside keeps the panel open; the pointer stays on the rail when the panel closes.
        await page.hover('#home');
        await page.waitForTimeout(400);
        await page.keyboard.press('Escape');
        assert.equal(await isOpen('#labels-popover'), false, 'Escape closes the nested popover');
        assert.equal(await isOpen('#labels-panel'), true, 'the panel stays open');
        assert.equal(await peeking(), true, 'the peek stays open while Escape closes an inner layer');
        await page.keyboard.press('Escape');
        assert.equal(await isOpen('#labels-panel'), false, 'the next Escape closes the panel');
        assert.equal(await peeking(), true, 'the peek still stays open');
        await page.keyboard.press('Escape');
        assert.equal(await peeking(), false, 'the third Escape ends the peek');
        await away();
        await page.waitForTimeout(900);

        await page.locator('#after').focus();
        await page.keyboard.press('Shift+Tab');
        assert.equal(await peeking(), true, 'keyboard focus in the rail peeks');
        await page.hover('#home');
        await away();
        assert.equal(await peeking(), true, 'keyboard focus inside holds the peek when the mouse leaves');
        await page.keyboard.press('Shift+Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'starred');
        assert.equal(await peeking(), true, 'tabbing between destinations keeps the peek');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'after');
        assert.equal(await peeking(), false, 'keyboard focus leaving the rail ends the peek');

        await page.hover('#starred');
        await page.waitForTimeout(900);
        await page.keyboard.press('Escape');
        await page.locator('#home').click();
        assert.equal(await peeking(), false, 'focus from a mouse click does not peek');
        await away();
        await page.waitForTimeout(900);

        await page.evaluate(() => document.querySelector('nav').setAttribute('nav-rail', ''));
        await page.waitForTimeout(900);
        assert.equal(await width('nav'), 96, 'nav-rail="" on the rail opts it out');

        await page.evaluate(() => document.querySelector('nav').setAttribute('nav-rail', 'hover'));
        const standard = await top();
        await page.hover('#starred');
        await page.waitForTimeout(900);
        assert.equal(await width('nav'), 280, 'a standard rail peeks too');
        assert.equal(await top(), standard, 'standard rows keep their collapsed height while peeking');

        await away();
        await page.waitForTimeout(900);
        await page.evaluate(() => document.querySelector('nav').style.setProperty('--md-comp-nav-rail-indicator-height', '40px'));
        const custom = await top();
        await page.hover('#starred');
        await page.waitForTimeout(900);
        assert.equal(await top(), custom, 'a page-set indicator height carries into the peek rows');
      } finally {
        await browser.close();
      }
    });
  }

  test(`${name}: a root nav-rail="hover" leaves modal rails on their own layer`, { timeout: 30000 }, async (t) => {
    const browser = await leaseBrowser(engine);
    try {
      const rail = (cls, width) => `<!doctype html><html lang="en" theme="light" nav-rail="hover"><head><style>${css}</style></head><body style="margin:0;width:${width}px">
<nav class="${cls}" aria-label="Main"><a href="#home"><span class="material-symbols" aria-hidden="true">home</span>Home</a></nav></body></html>`;
      const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
      const zIndex = () => page.locator('nav').evaluate((el) => getComputedStyle(el).zIndex);
      await page.setContent(rail('navigation-rail expanded modal', 1000));
      assert.equal(await zIndex(), '998', 'an explicit modal rail');
      await page.setViewportSize({ width: 500, height: 700 });
      await page.setContent(rail('navigation-rail expanded', 500));
      assert.equal(await zIndex(), '998', 'an expanded rail below 600px is modal');

      await page.setViewportSize({ width: 1000, height: 700 });
      await page.setContent(`<!doctype html><html lang="en" theme="light" nav-rail="hover"><head><style>${css}</style></head><body style="margin:0">
<nav class="navigation-rail modal" aria-label="Main"><button id="menu" type="button" aria-label="Menu"><span class="material-symbols" aria-hidden="true">menu</span></button>
<a id="dest" href="#dest"><span class="material-symbols" aria-hidden="true">home</span>Home</a></nav>
<script>${js}</script><script>Expressive.NavigationRail.init(document.querySelector('nav'))</script></body></html>`);
      assert.equal(await zIndex(), '0');
      // Clicked and read in one task, before the opening animation can end.
      const opening = await page.evaluate(() => {
        document.querySelector('#menu').click();
        return getComputedStyle(document.querySelector('nav')).zIndex;
      });
      assert.equal(opening, '998', 'a modal rail opened from the menu button is raised from the start');
      await page.waitForTimeout(900);
      const closing = await page.evaluate(() => {
        document.querySelector('#menu').click();
        return getComputedStyle(document.querySelector('nav')).zIndex;
      });
      assert.equal(closing, '998', 'a closing modal rail stays raised until it has closed');
      await page.waitForTimeout(900);

      await page.mouse.move(800, 300);
      await page.evaluate(() => Expressive.NavigationRail.getInstance(document.querySelector('nav')).expand());
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'dest');
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'menu', 'Escape returns focus to the menu button');
      assert.equal(await page.locator('nav').getAttribute('class'), 'navigation-rail modal', 'Escape leaves neither .expanded nor .peek');
    } finally {
      await browser.close();
    }
  });
}
