import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { materializeProjectFixture } from '../scripts/eval-expressivecss-skill.mjs';
import { startFixtureServer, createRestrictedFixturePage } from '../scripts/expressivecss-eval-browser.mjs';

const browserTest = existsSync(chromium.executablePath()) ? test : test.skip;
const routeMarkup = `<div class="field"><select id="frequency"><option value="daily">Daily</option><option value="weekly">Weekly</option></select><label for="frequency">Frequency</label></div><button class="tooltipped" data-tooltip="Local preferences">Help</button>`;

async function withConsumer(run) {
  const project = await materializeProjectFixture('consumer-current');
  let browser, server, page;
  try {
    await writeFile(path.join(project, 'src/index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Lifecycle integration</title><link rel="stylesheet" href="/node_modules/@expressivecss/expressive/dist/css/expressive.css"></head><body><nav class="navigation-rail" aria-label="Main"><button type="button" aria-label="Toggle navigation">Menu</button><a href="/dashboard">Dashboard</a><a href="/profile">Profile</a></nav><main id="route">${routeMarkup}</main><script src="/node_modules/@expressivecss/expressive/dist/js/expressive.js"></script></body></html>`);
    server = await startFixtureServer(project);
    browser = await chromium.launch({ headless: true });
    const fixture = await createRestrictedFixturePage(browser, server.origin, { reducedMotion: 'reduce' });
    page = fixture.page;
    await page.goto(`${server.origin}/dashboard`);
    await page.evaluate(() => {
      window.disposeRoute = () => {
        const root = document.querySelector('#route');
        root.querySelectorAll('.tooltipped').forEach(el => Expressive.Tooltip.getInstance(el)?.destroy());
        root.querySelectorAll('select').forEach(el => Expressive.FormSelect.getInstance(el)?.destroy());
      };
    });
    await run(page);
    assert.deepEqual(fixture.errors, []);
    assert.deepEqual(fixture.blockedRequests, []);
  } finally {
    try {
      if (page && !page.isClosed()) await page.evaluate(() => {
        window.disposeRoute?.();
        Expressive.NavigationRail.getInstance(document.querySelector('.navigation-rail'))?.destroy();
      });
    } finally {
      try { await browser?.close(); } finally {
        try { await server?.close(); } finally { await rm(project, { recursive: true, force: true }); }
      }
    }
  }
}

browserTest('partial replacement and client navigation preserve shell ownership across repeated mounts', async () => {
  await withConsumer(async page => {
    await page.evaluate(() => {
      window.shell = Expressive.NavigationRail.init(document.querySelector('.navigation-rail'));
      window.menuBaseline = Expressive.Menu._menus.length;
      Expressive.AutoInit(document.querySelector('#route'));
    });
    for (let cycle = 0; cycle < 6; cycle++) {
      const state = await page.evaluate(() => ({
        shell: Expressive.NavigationRail.getInstance(document.querySelector('.navigation-rail')) === window.shell,
        menus: Expressive.Menu._menus.length - window.menuBaseline,
        inputs: document.querySelectorAll('#route [role="combobox"]').length,
        tooltips: document.querySelectorAll('[role="tooltip"]').length,
      }));
      assert.deepEqual(state, { shell: true, menus: 1, inputs: 1, tooltips: 1 });
      await page.getByRole('combobox', { name: 'Frequency' }).click();
      await page.locator('[role="listbox"]').getByRole('option', { name: 'Weekly', exact: true }).click();
      assert.equal(await page.locator('#frequency').inputValue(), 'weekly');
      const cleanup = await page.evaluate(() => {
        const select = document.querySelector('#frequency');
        const trigger = document.querySelector('.tooltipped');
        window.disposeRoute();
        return {
          selectReleased: !Expressive.FormSelect.getInstance(select),
          tooltipReleased: !Expressive.Tooltip.getInstance(trigger),
          menus: Expressive.Menu._menus.length - window.menuBaseline,
          generated: document.querySelectorAll('#route .hide-select, #route [role="combobox"], #route [role="listbox"], [role="tooltip"]').length,
          nativeLabel: select.labels[0]?.htmlFor,
          tabIndex: select.tabIndex,
        };
      });
      assert.deepEqual(cleanup, { selectReleased: true, tooltipReleased: true, menus: 0, generated: 0, nativeLabel: 'frequency', tabIndex: 0 });
      await page.evaluate(({ markup, cycle }) => {
        history.pushState({}, '', cycle % 2 ? '/dashboard' : '/profile');
        document.querySelector('#route').innerHTML = markup;
        Expressive.AutoInit(document.querySelector('#route'));
      }, { markup: routeMarkup, cycle });
    }
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    assert.equal(await page.locator('.navigation-rail').getAttribute('aria-expanded'), 'true');
    // Broad initialization reconstructs existing instances; scoped initialization above preserves them.
    assert.equal(await page.evaluate(() => {
      Expressive.AutoInit(document.body);
      return Expressive.NavigationRail.getInstance(document.querySelector('.navigation-rail')) !== window.shell;
    }), true);
    assert.equal(await page.evaluate(() => Expressive.Menu._menus.length - window.menuBaseline), 1);
    assert.equal(await page.evaluate(() => {
      window.disposeRoute();
      return Expressive.Menu._menus.length - window.menuBaseline;
    }), 0);
  });
});

browserTest('resource observations detect omitted teardown after a partial replacement', async () => {
  await withConsumer(async page => {
    const observation = await page.evaluate(() => {
      const root = document.querySelector('#route');
      const baseline = Expressive.Menu._menus.length;
      const select = Expressive.FormSelect.init(root.querySelector('select'));
      const tooltip = Expressive.Tooltip.init(root.querySelector('.tooltipped'));
      try {
        root.replaceChildren();
        return { menus: Expressive.Menu._menus.length - baseline, tooltips: document.querySelectorAll('[role="tooltip"]').length, detachedTrigger: !tooltip.el.isConnected };
      } finally { tooltip.destroy(); select.destroy(); }
    });
    assert.deepEqual(observation, { menus: 1, tooltips: 1, detachedTrigger: true });
    assert.equal(await page.locator('[role="tooltip"]').count(), 0);
    assert.equal(await page.evaluate(() => Expressive.Menu._menus.length), 0);
  });
});

browserTest('Tooltip destroy cancels pending delay and animation callbacks', async () => {
  await withConsumer(async page => {
    for (const phase of ['enter', 'exit', 'animation-in', 'animation-out']) {
      const observed = await page.evaluate(async phase => {
        const nativeSetTimeout = window.setTimeout, nativeClearTimeout = window.clearTimeout;
        const pending = new Set();
        let scheduledAnimation;
        const animation = new Promise(resolve => { scheduledAnimation = resolve; });
        window.setTimeout = (callback, delay, ...args) => {
          const id = nativeSetTimeout(() => { pending.delete(id); callback(...args); }, delay);
          pending.add(id);
          if (delay === 1) scheduledAnimation();
          return id;
        };
        window.clearTimeout = id => { pending.delete(id); nativeClearTimeout(id); };
        let instance, deadline;
        try {
          instance = Expressive.Tooltip.init(document.querySelector('.tooltipped'), {
            enterDelay: phase === 'enter' || phase === 'exit' || phase === 'animation-out' ? 5000 : 0,
            exitDelay: phase === 'exit' ? 5000 : 0,
          });
          instance.open();
          if (phase === 'exit' || phase === 'animation-out') instance.close();
          if (phase.startsWith('animation-')) await Promise.race([
            animation, new Promise((_, reject) => { deadline = nativeSetTimeout(() => reject(new Error('Animation was not scheduled')), 2000); }),
          ]);
          const before = pending.size;
          instance.destroy();
          return { before, after: pending.size, connected: instance.tooltipEl.isConnected, open: instance.isOpen };
        } finally {
          instance?.destroy();
          nativeClearTimeout(deadline);
          for (const id of pending) nativeClearTimeout(id);
          window.setTimeout = nativeSetTimeout;
          window.clearTimeout = nativeClearTimeout;
        }
      }, phase);
      assert.ok(observed.before > 0, `${phase} negative control did not schedule work`);
      assert.deepEqual({ ...observed, before: 0 }, { before: 0, after: 0, connected: false, open: false }, phase);
    }
  });
});

test('Node can import the ESM bundle but runtime initialization requires a document', t => {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    const expressive = await import(${JSON.stringify(new URL('../dist/js/expressive.mjs', import.meta.url).href)});
    let initialization;
    try { expressive.AutoInit(); initialization = { status: 'initialized' }; }
    catch (error) { initialization = { status: 'dom-required', name: error.name, message: error.message }; }
    console.log(JSON.stringify({ imported: typeof expressive.AutoInit === 'function', initialization }));
  `], { encoding: 'utf8', timeout: 10000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  const observed = JSON.parse(result.stdout.trim());
  assert.equal(observed.imported, true);
  assert.equal(observed.initialization.status, 'dom-required');
  assert.equal(observed.initialization.name, 'ReferenceError');
  assert.match(observed.initialization.message, /document is not defined/);
  t.diagnostic(JSON.stringify(observed));
});
