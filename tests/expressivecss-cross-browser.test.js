import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { materializeProjectFixture } from '../scripts/eval-expressivecss-skill.mjs';
import { startFixtureServer, createRestrictedFixturePage } from '../scripts/expressivecss-eval-browser.mjs';

const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;
const engines = { chromium, firefox, webkit };
if (requested && !Object.hasOwn(engines, requested)) throw new Error('Unknown EXPRESSIVECSS_TEST_BROWSER');
const inputHashes = async () => Object.fromEntries(await Promise.all(
  ['dist/js/expressive.js', 'dist/css/expressive.css', 'tests/expressivecss-cross-browser.test.js'].map(async file =>
    [file, createHash('sha256').update(await readFile(new URL(`../${file}`, import.meta.url))).digest('hex')]),
));
const profiles = [
  { name: 'keyboard', locale: 'en-US', direction: 'ltr', width: 1024, touch: false, textScale: 1 },
  { name: 'arabic-touch-reflow', locale: 'ar', direction: 'rtl', width: 375, touch: true, textScale: 2 },
];
const fixture = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Critical browser flows</title>
<link rel="stylesheet" href="/node_modules/@expressivecss/expressive/dist/css/expressive.css">
<style>main{max-width:48rem;margin-inline:auto;padding:1rem}.actions{display:flex;flex-wrap:wrap;gap:1rem}fieldset,.field,nav{margin-block:1rem}#help-popover{padding:1rem;max-width:calc(100vw - 2rem)}dialog input{max-width:100%}</style></head><body><main>
<h1 id="title">Workspace preferences</h1><p id="intro">Choose how often this workspace sends updates. You can review the details before saving your preferences.</p>
<nav class="tabs" aria-label="Preference sections"><a href="#general" class="active">General</a><a href="#history">History</a></nav>
<section id="general"><h2>General</h2><div class="actions">
<button id="dialog-trigger" type="button">Review changes</button>
<button id="help-trigger" type="button" popovertarget="help-popover">Help</button>
<button id="menu-trigger" class="menu-trigger" type="button" data-target="actions">Actions</button>
<menu id="actions"><li><button type="button" id="menu-command">Copy preferences</button></li><li><button type="button">Reset view</button></li></menu>
</div><div id="help-popover" popover><p>Changes affect this workspace only.</p><button type="button" popovertarget="help-popover" popovertargetaction="hide">Close help</button></div>
<form id="preferences"><fieldset class="segmented-button"><legend id="cadence-label">Delivery</legend><input id="daily" type="radio" name="cadence" value="daily" checked><label class="segment" for="daily">Daily</label><input id="weekly" type="radio" name="cadence" value="weekly"><label class="segment" for="weekly">Weekly</label></fieldset>
<div id="mounted"><div class="field"><select id="frequency" name="frequency"><option value="daily">Daily</option><option value="weekly">Weekly</option></select><label id="frequency-label" for="frequency">Summary frequency</label></div><button type="button" class="tooltipped" data-tooltip="Session-only preferences">Details</button></div>
<button type="submit" id="save">Save preferences</button><output id="result" aria-live="polite"></output></form></section>
<section id="history"><h2>History</h2><p>No changes saved today.</p></section>
<dialog id="review" aria-labelledby="review-title"><h2 id="review-title">Review preferences</h2><label for="note">Note</label><input id="note" autofocus><button id="close-dialog" type="button">Close</button></dialog>
</main><script src="/node_modules/@expressivecss/expressive/dist/js/expressive.js"></script><script>
const review=document.querySelector('#review');
document.querySelector('#dialog-trigger').onclick=()=>review.showModal();
document.querySelector('#close-dialog').onclick=()=>review.close();
window.commandCount=0;document.querySelector('#menu-command').onclick=()=>window.commandCount++;
document.querySelector('#preferences').onsubmit=e=>{e.preventDefault();const data=new FormData(e.target);document.querySelector('#result').textContent=data.get('cadence')+':'+data.get('frequency');};
window.routeMarkup=document.querySelector('#mounted').innerHTML;
window.disposeRoute=()=>{document.querySelectorAll('#mounted select').forEach(el=>Expressive.FormSelect.getInstance(el)?.destroy());document.querySelectorAll('#mounted .tooltipped').forEach(el=>Expressive.Tooltip.getInstance(el)?.destroy());};
window.mountRoute=()=>Expressive.AutoInit(document.querySelector('#mounted'));
window.tabs=Expressive.Tabs.init(document.querySelector('.tabs'));
window.menu=Expressive.Menu.init(document.querySelector('#menu-trigger'),{inDuration:0,outDuration:0});
window.baselineMenus=Expressive.Menu._menus.length;window.mountRoute();
window.dispose=()=>{window.disposeRoute();window.menu?.destroy();window.tabs?.destroy();review.close();window.dispose=()=>{};};
</script></body></html>`;

for (const [engineName, engine] of Object.entries(engines).filter(([name]) => !requested || requested === name)) {
  for (const profile of profiles) {
    test(`${engineName}: critical flows with ${profile.name}`, { timeout: 60000 }, async t => {
      if (!existsSync(engine.executablePath())) { t.skip(`${engineName} is not installed; explicit browser commands require it`); return; }
      const artifactRoot = process.env.EXPRESSIVECSS_BROWSER_ARTIFACTS || '.cache/cross-browser';
      await mkdir(artifactRoot, { recursive: true });
      const artifacts = await mkdtemp(path.join(path.resolve(artifactRoot), `${engineName}-${profile.name}-`));
      const report = { engine: engineName, profile, status: 'failed', checks: [], limits: 'Touch and text enlargement are emulated; native zoom, real devices and assistive technology remain untested.', hashes: {} };
      let project, browser, server, session;
      const abort = () => { void browser?.close().catch(()=>{}); };
      t.signal.addEventListener('abort',abort,{once:true});
      try {
        project = await materializeProjectFixture('consumer-current');
        report.hashes = await inputHashes();
        await writeFile(path.join(project, 'src/index.html'), fixture);
        server = await startFixtureServer(project);
        browser = await engine.launch({ headless: true });
        t.signal.throwIfAborted();
        report.version = browser.version();
        report.node = process.version;
        session = await createRestrictedFixturePage(browser, server.origin, { viewport: { width: profile.width, height: 900 }, locale: profile.locale, hasTouch: profile.touch, reducedMotion: 'reduce' });
        const { page, context } = session;
        await context.tracing.start({ screenshots: true, snapshots: true });
        await page.goto(`${server.origin}/dashboard`);
        await page.evaluate(profile => {
          window.touchStarts=0;
          document.addEventListener('touchstart',()=>window.touchStarts++,{passive:true});
          document.documentElement.lang=profile.locale;
          document.documentElement.dir=profile.direction;
          document.documentElement.style.fontSize=`${16*profile.textScale}px`;
          if(profile.direction==='rtl') {
            document.querySelector('#title').textContent='إعدادات مساحة العمل';
            document.querySelector('#intro').textContent='اختر عدد مرات إرسال التحديثات إلى أعضاء مساحة العمل. يمكنك مراجعة التفاصيل وتغيير تفضيلات التسليم قبل حفظ الإعدادات الجديدة.';
            document.querySelector('#dialog-trigger').textContent='مراجعة التغييرات';
            document.querySelector('#frequency-label').textContent='تكرار إرسال ملخص مساحة العمل';
            document.querySelector('#save').textContent='حفظ التفضيلات';
          }
        }, profile);
        const activate = async locator => { if (profile.touch) await locator.tap(); else { await locator.focus(); await page.keyboard.press('Enter'); } };

        // Native dialog focus containment, Escape return and pointer light-dismiss.
        await activate(page.locator('#dialog-trigger'));
        await expect(page.locator('#review')).toBeVisible();
        await expect(page.locator('#note')).toBeFocused();
        report.dialogFocus=[];
        for (let i=0;i<4;i++) {
          await page.keyboard.press('Tab');
          const focus=await page.evaluate(()=>({id:document.activeElement.id,tag:document.activeElement.tagName,inDialog:document.querySelector('#review').contains(document.activeElement),pageFocused:document.hasFocus()}));
          report.dialogFocus.push(focus);
          assert.ok(focus.inDialog || (!focus.pageFocused && focus.tag==='BODY'),JSON.stringify(focus));
        }
        await page.keyboard.press('Escape');
        await expect(page.locator('#review')).not.toBeVisible();
        await expect(page.locator('#dialog-trigger')).toBeFocused();
        await activate(page.locator('#dialog-trigger'));
        if(profile.touch) await page.touchscreen.tap(2,2); else await page.mouse.click(2,2);
        await expect(page.locator('#review')).not.toBeVisible();
        report.checks.push('dialog focus containment, Escape return and backdrop dismissal');

        // Exercise the browser's native popover separately from ExpressiveCSS Menu.
        await activate(page.locator('#help-trigger'));
        await expect(page.locator('#help-popover')).toBeVisible();
        assert.equal(await page.locator('#help-popover').evaluate(el=>el.matches(':popover-open')),true);
        await page.keyboard.press('Tab');
        await page.keyboard.press('Escape');
        await expect(page.locator('#help-popover')).not.toBeVisible();
        await expect(page.locator('#help-trigger')).toBeFocused();
        report.checks.push('native popover open, Escape and focus return');

        await activate(page.locator('#menu-trigger'));
        await expect(page.locator('#actions > li').first()).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(page.locator('#menu-trigger')).toBeFocused();
        await expect(page.locator('#actions')).not.toBeVisible();
        await activate(page.locator('#menu-trigger'));
        await expect(page.locator('#actions > li').first()).toBeFocused();
        if(profile.touch) await page.locator('#menu-command').tap(); else await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(()=>window.commandCount),1);
        await expect(page.locator('#menu-trigger')).toHaveAttribute('aria-expanded','false');
        report.checks.push('Menu keyboard opening, Escape return and one command activation');

        await activate(page.locator('.tabs a[href="#history"]'));
        await expect(page.locator('#history')).toBeVisible();
        await expect(page.locator('#general')).not.toBeVisible();
        await activate(page.locator('.tabs a[href="#general"]'));
        await expect(page.locator('#general')).toBeVisible();
        report.checks.push('tab navigation preserves reachable panels');

        if(profile.touch) await page.locator('label[for="weekly"]').tap(); else { await page.locator('#daily').focus(); await page.keyboard.press('ArrowRight'); }
        await expect(page.locator('#weekly')).toBeChecked();
        await activate(page.locator('#mounted [role="combobox"]'));
        if(profile.touch) await page.getByRole('listbox').getByRole('option',{name:'Weekly',exact:true}).tap(); else { await expect(page.getByRole('listbox').getByRole('option').first()).toBeFocused(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); }
        await expect(page.locator('#frequency')).toHaveValue('weekly');
        await expect(page.locator('#mounted [role="listbox"]')).not.toBeVisible();
        await activate(page.locator('#save'));
        await expect(page.locator('#result')).toHaveText('weekly:weekly');
        report.checks.push('native segmented inputs and enhanced select submit their form values');

        for(let cycle=0;cycle<3;cycle++) {
          const cleanup=await page.evaluate(()=>{window.disposeRoute();return {menus:Expressive.Menu._menus.length-window.baselineMenus,generated:document.querySelectorAll('#mounted [role="combobox"], #mounted [role="listbox"], [role="tooltip"]').length,native:document.querySelector('#frequency').tabIndex};});
          assert.deepEqual(cleanup,{menus:0,generated:0,native:0});
          await page.evaluate(()=>{document.querySelector('#mounted').innerHTML=window.routeMarkup;window.mountRoute();});
          assert.equal(await page.evaluate(()=>Expressive.Menu._menus.length-window.baselineMenus),1);
          await activate(page.locator('#mounted [role="combobox"]'));
          await expect(page.getByRole('listbox').getByRole('option').first()).toBeFocused();
          await page.keyboard.press('Escape');
          await expect(page.locator('#mounted [role="combobox"]')).toBeFocused();
          await expect(page.locator('#mounted [role="listbox"]')).not.toBeVisible();
        }
        report.checks.push('three teardown/remount cycles release generated controls and restore focus');
        report.layout=await page.evaluate(()=>({viewport:innerWidth,content:document.documentElement.scrollWidth,rootFont:getComputedStyle(document.documentElement).fontSize,direction:getComputedStyle(document.documentElement).direction,touchPoints:navigator.maxTouchPoints,touchStarts:window.touchStarts}));
        assert.ok(report.layout.content<=report.layout.viewport+1,JSON.stringify(report.layout));
        assert.equal(report.layout.direction,profile.direction);
        assert.equal(report.layout.rootFont,`${16*profile.textScale}px`);
        if(profile.touch) assert.ok(report.layout.touchStarts>0);
        report.checks.push('page reflow and configured direction, text size and touch capability');
        assert.deepEqual(session.errors,[]);
        assert.deepEqual(session.blockedRequests,[]);
        await page.screenshot({path:path.join(artifacts,'page.png'),fullPage:true});
        await page.evaluate(()=>window.dispose());
        assert.equal(await page.evaluate(()=>Expressive.Menu._menus.length),0);
        assert.deepEqual(await inputHashes(),report.hashes,'Browser inputs changed during the case');
        report.status='passed';
      } catch(error) {
        report.error=error.message;
        await session?.page.screenshot({path:path.join(artifacts,'failure.png'),fullPage:true}).catch(()=>{});
        throw error;
      } finally {
        try {
          await session?.context.tracing.stop(report.status==='passed'?{}:{path:path.join(artifacts,'trace.zip')}).catch(()=>{});
          await session?.page.evaluate(()=>window.dispose?.()).catch(()=>{});
        } finally {
          try { await browser?.close(); } finally {
            try { await server?.close(); } finally {
              t.signal.removeEventListener('abort',abort);
              try { await writeFile(path.join(artifacts,'result.json'),JSON.stringify(report,null,2)+'\n'); }
              finally { if(project) await rm(project,{recursive:true,force:true}); }
            }
          }
        }
        t.diagnostic(`${engineName} ${report.version ?? 'unavailable'}: ${report.status}; ${artifacts}`);
      }
    });
  }
}
