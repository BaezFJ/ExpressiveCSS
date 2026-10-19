import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([n]) => !requested || requested === n)) {
  test(`${name}: a bottom sheet opens on the spatial spring without uncovering a gap below it`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
      await page.setContent(`<!doctype html><html lang="en" motion="expressive"><head><style>${css}</style></head><body>
        <dialog class="bottom-sheet" id="sheet" aria-label="Filters"><h2>Filters</h2><p id="last">Last line</p></dialog></body></html>`);
      // Track the sheet's bottom edge every frame while it opens.
      const frames = await page.evaluate(() => new Promise((resolve) => {
        const sheet = document.getElementById('sheet');
        const bottoms = [];
        const start = performance.now();
        sheet.showModal();
        const tick = () => {
          bottoms.push(sheet.getBoundingClientRect().bottom);
          if (performance.now() - start < 700) requestAnimationFrame(tick); else resolve(bottoms);
        };
        requestAnimationFrame(tick);
      }));
      const viewport = 800;
      assert.ok(Math.min(...frames) >= viewport, `a gap opened under the sheet: bottom reached ${Math.min(...frames)}`);
      assert.ok(Math.max(...frames) > viewport + 100, 'the sheet did not animate in from below');

      const settled = await page.evaluate(() => {
        const sheet = document.getElementById('sheet');
        const style = getComputedStyle(sheet);
        return {
          timing: style.transitionTimingFunction.startsWith('linear('),
          duration: style.transitionDuration,
          lastBottom: Math.round(document.getElementById('last').getBoundingClientRect().bottom),
          sheetBottom: Math.round(sheet.getBoundingClientRect().bottom),
        };
      });
      assert.equal(settled.timing, true);
      assert.notEqual(settled.duration, '0s');
      assert.equal(settled.sheetBottom, viewport + 24, 'the bleed sits below the viewport');
      assert.ok(settled.lastBottom <= viewport, 'content stays above the viewport edge');
    } finally {
      await browser.close();
    }
  });

  // A side sheet slides in from its docked edge. Its outer edge, the physical
  // right for an end sheet in LTR, must never come inside the viewport.
  for (const [label, dir, cls, outer] of [
    ['end, ltr', 'ltr', '', 'right'],
    ['start, ltr', 'ltr', 'start', 'left'],
    ['end, rtl', 'rtl', '', 'left'],
  ]) {
    test(`${name}: a side sheet (${label}) opens on the spatial spring without uncovering its edge`, { timeout: 30000 }, async (t) => {
      if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
      const browser = await engine.launch({ headless: true });
      try {
        const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
        await page.setContent(`<!doctype html><html lang="en" dir="${dir}" motion="expressive"><head><style>${css}</style></head><body>
          <dialog class="side-sheet ${cls}" id="sheet" aria-label="Details"><header><h2>Details</h2></header><p id="body">Body</p></dialog></body></html>`);
        const edges = await page.evaluate((outer) => new Promise((resolve) => {
          const sheet = document.getElementById('sheet');
          const seen = [];
          const start = performance.now();
          sheet.showModal();
          const tick = () => {
            seen.push(sheet.getBoundingClientRect()[outer]);
            if (performance.now() - start < 700) requestAnimationFrame(tick); else resolve(seen);
          };
          requestAnimationFrame(tick);
        }, outer));
        const inside = outer === 'right' ? Math.min(...edges) < 1000 : Math.max(...edges) > 0;
        assert.equal(inside, false, `the ${outer} edge came into view: ${outer === 'right' ? Math.min(...edges) : Math.max(...edges)}`);
        const settled = await page.evaluate((outer) => {
          const body = document.getElementById('body').getBoundingClientRect();
          const sheet = document.getElementById('sheet').getBoundingClientRect();
          return { body: Math.round(body[outer]), sheet: Math.round(sheet[outer]) };
        }, outer);
        assert.equal(settled.sheet, outer === 'right' ? 1024 : -24, 'the bleed sits past the viewport edge');
        assert.equal(settled.body, outer === 'right' ? 1000 : 0, 'content ends at the viewport edge');
      } finally {
        await browser.close();
      }
    });
  }

  test(`${name}: a navigation rail expands on the spatial spring and settles at its expanded width`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 700 } });
      await page.setContent(`<!doctype html><html lang="en" motion="expressive"><head><style>${css}</style></head><body>
        <nav class="navigation-rail" id="rail" aria-label="Main"><a href="#" aria-current="page">Home</a></nav></body></html>`);
      const widths = await page.evaluate(() => new Promise((resolve) => {
        const rail = document.getElementById('rail');
        const seen = [];
        const start = performance.now();
        rail.classList.add('expanded');
        const tick = () => {
          seen.push(rail.getBoundingClientRect().width);
          if (performance.now() - start < 700) requestAnimationFrame(tick); else resolve(seen);
        };
        requestAnimationFrame(tick);
      }));
      const final = widths.at(-1);
      assert.equal(Math.round(final), 280);
      assert.ok(Math.max(...widths) > final + 1, `the expressive spring did not overshoot: ${Math.max(...widths)}`);
      assert.ok(Math.max(...widths) < final * 1.03, `the overshoot is larger than the spring allows: ${Math.max(...widths)}`);
      assert.match(await page.locator('#rail').evaluate((el) => getComputedStyle(el).transitionTimingFunction), /^linear\(/);
    } finally {
      await browser.close();
    }
  });

  test(`${name}: FAB menu items move on the fast spatial spring and fade on the effects spring`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>
        <div class="fab-menu" id="menu"><button type="button" class="button extra circle" aria-label="Create">+</button>
        <ul><li><button type="button" id="item">Compose</button></li></ul></div></body></html>`);
      const read = () => page.locator('#item').evaluate((el) => {
        const s = getComputedStyle(el);
        const pick = (property) => {
          const at = s.transitionProperty.split(', ').indexOf(property);
          return [s.transitionDuration.split(', ')[at], s.transitionTimingFunction.split(/,\s*(?![^()]*\))/)[at]];
        };
        return { transform: pick('transform'), opacity: pick('opacity') };
      });
      const motion = await read();
      assert.match(motion.transform[1], /^linear\(/, 'transform easing');
      assert.match(motion.opacity[1], /^linear\(/, 'opacity easing');
      assert.ok(parseFloat(motion.transform[0]) > parseFloat(motion.opacity[0]), 'the fade settles before the move');
      await page.locator('#menu').evaluate((el) => el.classList.add('active'));
      await page.locator('#item').evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
      assert.deepEqual(await page.locator('#item').evaluate((el) => [getComputedStyle(el).opacity, getComputedStyle(el).transform]), ['1', 'none']);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const reduced = await read();
      assert.deepEqual([reduced.transform[0], reduced.opacity[0]], ['0s', '0s'], 'reduced motion drops both springs');
    } finally {
      await browser.close();
    }
  });

  test(`${name}: a basic dialog fades and grows in on springs, and other dialogs keep their own motion`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>
        <dialog id="basic" aria-label="Basic"><h2>Discard draft?</h2></dialog>
        <dialog id="max" class="max" aria-label="Full"><h2>Full</h2></dialog>
        <dialog id="sheet" class="bottom-sheet" aria-label="Sheet"><h2>Sheet</h2></dialog></body></html>`);
      const open = (id) => page.evaluate((id) => {
        const dialog = document.getElementById(id);
        dialog.showModal();
        const animations = dialog.getAnimations().map((a) => a.transitionProperty).sort();
        const style = getComputedStyle(dialog);
        dialog.close();
        return { animations, easing: style.transitionTimingFunction };
      }, id);
      const basic = await open('basic');
      assert.deepEqual(basic.animations, ['opacity', 'scale']);
      assert.match(basic.easing, /^linear\(/);
      assert.deepEqual((await open('max')).animations, []);
      assert.deepEqual((await open('sheet')).animations, ['translate']);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.deepEqual((await open('basic')).animations, [], 'reduced motion opens without moving');
    } finally {
      await browser.close();
    }
  });

  test(`${name}: the tabs indicator and switch handle move on springs`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const tabs = (id) => `<nav class="tabs" id="${id}" aria-label="${id}"><a class="active" aria-current="page" href="#a-${id}">A</a><a href="#b-${id}">B</a></nav>
        <div id="a-${id}">a</div><div id="b-${id}">b</div>`;
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>
        ${tabs('spring')}${tabs('fixed')}
        <label class="switch"><input type="checkbox" id="toggle"> Wi-Fi</label>
        <script>${js}</script>
        <script>Expressive.Tabs.init(document.getElementById('spring')); Expressive.Tabs.init(document.getElementById('fixed'), { duration: 200 });</script></body></html>`);
      const indicator = async (id) => {
        await page.click(`#${id} a[href="#b-${id}"]`);
        return page.locator(`#${id} > .indicator`).evaluate((el) => {
          const s = getComputedStyle(el);
          return { easing: s.transitionTimingFunction, duration: s.transitionDuration, delay: s.transitionDelay };
        });
      };
      const spring = await indicator('spring');
      assert.match(spring.easing, /^linear\(/, 'the default follows the spring tokens');
      assert.notEqual(spring.duration.split(', ')[0], '0s');
      const fixed = await indicator('fixed');
      assert.equal(fixed.duration, '0.2s, 0.2s', 'an explicit duration keeps its own timing');
      assert.match(fixed.easing, /ease-out/);
      const handle = await page.locator('#toggle').evaluate((el) => {
        const s = getComputedStyle(el);
        const at = s.transitionProperty.split(', ').indexOf('background-position');
        return s.transitionTimingFunction.split(/,\s*(?![^()]*\))/)[at];
      });
      assert.match(handle, /^linear\(/, 'the switch handle slides on the spring');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.click('#spring a[href="#a-spring"]');
      const reduced = await page.locator('#spring > .indicator').evaluate((el) => getComputedStyle(el).transitionDuration);
      assert.deepEqual([...new Set(reduced.split(', '))], ['0s'], 'reduced motion stops the indicator');
    } finally {
      await browser.close();
    }
  });
}
