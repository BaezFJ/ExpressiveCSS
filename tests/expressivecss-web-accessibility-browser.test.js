import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import { chromium, firefox, webkit, expect } from '@playwright/test';
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

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !process.env.EXPRESSIVECSS_TEST_BROWSER || process.env.EXPRESSIVECSS_TEST_BROWSER === name)) {
  test(`${name}: tooltip hover, dismissal, reduced motion and native form behavior`, { timeout: 45000 }, async t => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is unavailable`); return; }
    const project = await materializeProjectFixture('consumer-current');
    let browser, server, page;
    try {
      await writeFile(path.join(project, 'src/index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Accessible controls</title><link rel="stylesheet" href="/node_modules/@expressivecss/expressive/dist/css/expressive.css"><style>main{padding:8rem 2rem;max-width:45rem;margin:auto}.tooltip-hosts{display:flex;gap:5rem;margin:3rem}header{position:sticky;top:0;background:var(--md-sys-color-surface)}input{max-width:100%}</style></head><body><header><h1>Preferences</h1></header><main><p id="instructions">Choose when to receive workspace updates. Save your delivery preference below.</p><form id="preferences"><button id="before" type="button">Before group</button><fieldset class="segmented-button"><legend>Delivery</legend><input id="daily" type="radio" name="delivery" value="daily" checked><label class="segment" for="daily">Daily</label><input id="weekly" type="radio" name="delivery" value="weekly"><label class="segment" for="weekly">Weekly</label></fieldset><button id="save">Save</button><output id="status" role="status" aria-live="polite" aria-atomic="true"></output></form><div class="tooltip-hosts"><button id="runtime" class="tooltipped" data-tooltip="Changes stay in this workspace" type="button">Runtime</button><button id="child" aria-describedby="child-tip" type="button">CSS child<span id="child-tip" class="tooltip bottom">Persistent help</span></button></div></main><script src="/node_modules/@expressivecss/expressive/dist/js/expressive.js"></script><script>window.tip=Expressive.Tooltip.init(document.querySelector('#runtime'),{enterDelay:0,exitDelay:0,inDuration:160,outDuration:80,position:'bottom'});let count=0;document.querySelector('form').onsubmit=e=>{e.preventDefault();document.querySelector('#status').textContent=new FormData(e.target).get('delivery')+' saved '+ ++count;};</script></body></html>`);
      server = await startFixtureServer(project);
      browser = await engine.launch({ headless: true });
      ({ page } = await createRestrictedFixturePage(browser, server.origin, { reducedMotion: 'no-preference', viewport: { width: 1000, height: 900 } }));
      page.setDefaultTimeout(5000);
      await page.goto(`${server.origin}/dashboard`);
      await page.locator('#before').focus();
      await page.keyboard.press('Tab');
      await expect(page.locator('#daily')).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('#weekly')).toBeChecked();
      await page.keyboard.press('Tab');
      await expect(page.locator('#save')).toBeFocused();
      await expect(page.locator('#status')).toHaveAttribute('role', 'status');
      for (let count = 1; count <= 2; count++) {
        await page.keyboard.press('Enter');
        await expect(page.locator('#status')).toHaveText(`weekly saved ${count}`);
        await expect(page.locator('#save')).toBeFocused();
      }
      const runtime = page.locator('body > .tooltip');
      for (const position of ['top', 'bottom', 'left', 'right']) {
        await page.evaluate(position => { window.tip.close(); window.tip.options.position = position; }, position);
        await page.mouse.move(1, 1);
        await page.locator('#runtime').hover();
        await expect(runtime).toHaveCSS('opacity', '1');
        await runtime.hover({ steps: 20 });
        await page.waitForTimeout(220);
        await expect(runtime).toHaveCSS('opacity', '1');
        await page.keyboard.press('Escape');
        await expect(runtime).toBeHidden();
      }
      await page.mouse.move(1, 1);
      await page.locator('#child').hover();
      await expect(page.locator('#child-tip')).toHaveCSS('opacity', '1');
      await page.locator('#child-tip').hover({ steps: 20 });
      await page.waitForTimeout(220);
      await expect(page.locator('#child-tip')).toHaveCSS('opacity', '1');
      await page.mouse.move(1, 1);
      await page.locator('#save').focus();
      await page.keyboard.press('Tab');
      await expect(page.locator('#runtime')).toBeFocused();
      await expect(runtime).toHaveCSS('opacity', '1');
      const animated = await runtime.evaluate(el => getComputedStyle(el).transitionDuration);
      await page.keyboard.press('Escape');
      await expect(page.locator('#runtime')).toBeFocused();
      await expect(runtime).toBeHidden();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(runtime).toHaveCSS('opacity', '1');
      assert.ok(animated.split(',').some(value => parseFloat(value) > 0));
      assert.ok((await runtime.evaluate(el => getComputedStyle(el).transitionDuration)).split(',').every(value => parseFloat(value) === 0));
      await expect(runtime).toHaveCSS('transform', 'none');
      await page.keyboard.press('Escape');
      await expect(runtime).toBeHidden();
      await page.addStyleTag({ content: 'main,main *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}main p{margin-block-end:2em!important}' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      for (const selector of ['#instructions', 'label[for=daily]', 'label[for=weekly]', '#save']) {
        assert.equal(await page.locator(selector).evaluate(el => {
          const style = getComputedStyle(el), rect = el.getBoundingClientRect();
          if (Math.abs(parseFloat(style.lineHeight) - parseFloat(style.fontSize) * 1.5) > 1) return false;
          const range = document.createRange(); range.selectNodeContents(el);
          return [...range.getClientRects()].every(text => text.left >= rect.left - 1 && text.right <= rect.right + 1 && text.top >= rect.top - 1 && text.bottom <= rect.bottom + 1);
        }), true, `${selector} text remains inside its container with spacing overrides`);
      }
      assert.equal(await page.locator('#instructions').evaluate(el => parseFloat(getComputedStyle(el).marginBottom) === parseFloat(getComputedStyle(el).fontSize) * 2), true);
      await page.locator('#save').focus();
      assert.equal(await page.locator('#save').evaluate(el => { const r=el.getBoundingClientRect(); return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el; }), true);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => window.tip.open());
      await expect(runtime).toHaveCSS('opacity', '1');
      await page.evaluate(() => window.tip.close());
      await page.waitForTimeout(20);
      await page.evaluate(() => window.tip.open());
      await page.waitForTimeout(220);
      await expect(runtime).toBeVisible();
      await expect(runtime).toHaveCSS('opacity', '1');
      await page.evaluate(() => { window.tip.close(); window.tip.destroy(); });
      await page.waitForTimeout(220);
      assert.equal(await runtime.count(), 0);
    } finally {
      try { if (page && !page.isClosed()) await page.evaluate(() => window.tip?.el?.Expressive_Tooltip?.destroy()); }
      finally { try { await browser?.close(); } finally { try { await server?.close(); } finally { await rm(project, { recursive: true, force: true }); } } }
    }
  });
}

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;
const engines = { chromium, firefox, webkit };
if (requested && !Object.hasOwn(engines, requested)) throw new Error('Unknown EXPRESSIVECSS_TEST_BROWSER');

function scenario(name, markup, check) {
  for (const [engine, type] of Object.entries(engines).filter(([name]) => !requested || requested === name)) {
    test(`${engine}: ${name}`, { timeout: 30000 }, async t => {
      if (!existsSync(type.executablePath())) { t.skip(`${engine} is not installed`); return; }
      const browser = await type.launch();
      const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.setDefaultTimeout(4000);
      try {
        await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${css}</style><style>main{padding:16px;background:var(--md-sys-color-surface);color:var(--md-sys-color-on-surface)}main>section{margin-block:24px}</style></head><body><main>${markup}</main></body></html>`);
        await page.addScriptTag({ content: js });
        await check(page);
        assert.deepEqual(errors, []);
      } finally {
        try { await page.evaluate(() => { for (const instance of window.instances || []) instance.destroy?.(); }); }
        finally { await browser.close(); }
      }
    });
  }
}

scenario('remaining native controls preserve names, keyboard state and form values', `
<form id="choices"><fieldset><legend>Delivery preferences</legend>
<label id="check-label"><input id="check" type="checkbox" name="email">Email notifications</label>
<label><input id="mixed" type="checkbox" name="mixed">Mixed selection</label>
<label class="switch"><input id="wifi" type="checkbox" name="wifi">Wireless connection</label>
<fieldset><legend>Delivery interval</legend><label><input id="daily" type="radio" name="interval" value="daily" checked>Daily</label><label><input id="weekly" type="radio" name="interval" value="weekly">Weekly</label></fieldset>
<label>Volume<input id="volume" type="range" min="0" max="100" step="10" value="40" name="volume"></label>
<input id="filter" name="filter" type="checkbox" class="chip-input"><label class="chip" for="filter">Available items</label>
<fieldset disabled><legend>Unavailable preferences</legend><label><input id="disabled" type="checkbox" name="disabled">Disabled choice</label></fieldset>
</fieldset><button id="submit">Save preferences</button><output id="values"></output></form>`, async page => {
  await page.evaluate(() => { document.querySelector('#mixed').indeterminate = true; window.instances = [Expressive.Slider.init(document.querySelector('#volume'))]; document.querySelector('form').onsubmit = event => { event.preventDefault(); window.values = Object.fromEntries(new FormData(event.target)); document.querySelector('#values').textContent = 'Preferences saved'; }; });
  await expect(page.getByRole('group', { name: 'Delivery preferences', exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Email notifications' })).toHaveCount(1);
  await page.locator('#check').focus(); await page.keyboard.press('Space'); await expect(page.locator('#check')).toBeChecked();
  assert.equal(await page.locator('#mixed').evaluate(el => el.indeterminate), true);
  await page.locator('#mixed').focus(); await page.keyboard.press('Space');
  assert.equal(await page.locator('#mixed').evaluate(el => el.indeterminate), false);
  await page.locator('#wifi').focus(); await page.keyboard.press('Space'); await expect(page.locator('#wifi')).toBeChecked();
  await page.locator('#daily').focus(); await page.keyboard.press('ArrowRight'); await expect(page.locator('#weekly')).toBeChecked();
  await page.keyboard.press('Tab'); await expect(page.locator('#volume')).toBeFocused();
  await page.keyboard.press('ArrowRight'); await expect(page.locator('#volume')).toHaveValue('50');
  await page.keyboard.press('End'); await expect(page.locator('#volume')).toHaveValue('100');
  await page.keyboard.press('Home'); await expect(page.locator('#volume')).toHaveValue('0');
  await page.locator('label[for=filter]').click(); await expect(page.locator('#filter')).toBeChecked();
  await expect(page.locator('#disabled')).toBeDisabled();
  await page.locator('#submit').click();
  assert.deepEqual(await page.evaluate(()=>window.values), {email:'on',mixed:'on',wifi:'on',interval:'weekly',volume:'0',filter:'on'});
  const range = await page.locator('#volume').boundingBox();
  await page.mouse.click(range.x + range.width * .7, range.y + range.height / 2);
  assert.ok(Number(await page.locator('#volume').inputValue()) > 0, 'native range accepts a non-drag pointer action');
  await page.setViewportSize({ width: 375, height: 900 });
  await page.addStyleTag({ content: 'main{font-size:200%}main,main *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}' });
  for (const direction of ['ltr','rtl']) {
    await page.locator('html').evaluate((el,dir) => el.dir = dir, direction);
    await expect.poll(()=>page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('#submit').focus();
    assert.equal(await page.locator('#submit').evaluate(el => { const r=el.getBoundingClientRect(); return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el; }), true);
  }
  for (const theme of ['light','dark']) {
    await page.locator('html').evaluate((el,theme) => el.setAttribute('theme',theme), theme);
    const ratio = await page.locator('#check-label').evaluate(el => {
      const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const context=canvas.getContext('2d');
      const luminance=color=>{context.clearRect(0,0,1,1);context.fillStyle=color;context.fillRect(0,0,1,1);const rgb=[...context.getImageData(0,0,1,1).data].slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
      const a=luminance(getComputedStyle(el).color),b=luminance(getComputedStyle(el.closest('main')).backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    });
    assert.ok(ratio>=4.5, `${theme} native label contrast ${ratio}`);
  }
});

scenario('remaining suggestions and section links preserve selection and dismissal', `
<nav class="tabs" aria-label="Sections"><a href="#first" class="active">First</a><a href="#second">Second</a></nav><section id="first">First content</section><section id="second">Second content</section>
<search class="search-bar" aria-label="Workspace"><input id="query" type="search" aria-label="Find a workspace" placeholder="Find"></search>
<div class="field"><input id="suggest" class="autocomplete" placeholder=" "><label for="suggest">Destination</label></div>
<button id="after" type="button">After suggestions</button>`, async page => {
  await page.evaluate(() => { window.instances = [Expressive.Tabs.init(document.querySelector('.tabs')), Expressive.Autocomplete.init(document.querySelector('#suggest'), { minLength:0, data:[{id:'alpha',text:'Alpha'},{id:'beta',text:'Beta'}],menuOptions:{inDuration:0,outDuration:80,autoFocus:false,closeOnClick:false,coverTrigger:false}})]; });
  await page.getByRole('link',{name:'Second',exact:true}).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('link',{name:'Second',exact:true})).toHaveAttribute('aria-current','page');
  await expect(page.locator('#second')).toBeVisible(); await expect(page.locator('#first')).toBeHidden();
  await page.locator('#query').fill('Saved workspace'); await expect(page.getByRole('searchbox',{name:'Find a workspace'})).toHaveValue('Saved workspace');
  await page.locator('#suggest').focus(); await page.keyboard.type('al');
  await expect(page.getByRole('option',{name:'Alpha',exact:true})).toBeVisible();
  await page.keyboard.press('ArrowDown');
  const active=await page.locator('#suggest').getAttribute('aria-activedescendant'); assert.ok(active);
  await expect(page.locator(`[id="${active}"]`)).toHaveText('Alpha');
  await page.keyboard.press('Enter'); await expect(page.locator('#suggest')).toHaveValue('Alpha');
  await page.locator('#suggest').fill(''); await page.keyboard.press('b');
  await expect(page.getByRole('option',{name:'Beta',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#suggest')).toBeFocused();
  await expect(page.locator('#suggest')).toHaveAttribute('aria-expanded','false');
  await page.keyboard.press('Tab'); await expect(page.locator('#after')).toBeFocused();
  await page.evaluate(() => window.instances.pop().destroy());
});

scenario('remaining fixed drawer releases modal state at the expanded boundary', `
<button id="drawer-trigger" class="navigation-drawer-trigger" data-target="drawer" type="button">Navigation</button>
<ul id="drawer" class="navigation-drawer navigation-drawer-fixed" aria-label="Main"><li><a href="#content">Home</a></li><li><button class="navigation-drawer-close" type="button">Close navigation</button></li></ul>
<button id="content" type="button">Page action</button>`, async page => {
  await page.setViewportSize({width:375,height:900});
  await page.evaluate(() => window.instances=[Expressive.NavigationDrawer.init(document.querySelector('#drawer'))]);
  await page.locator('#drawer-trigger').click();
  await expect(page.locator('#drawer-trigger')).toHaveAttribute('aria-expanded','true');
  assert.equal(await page.locator('#drawer').evaluate(el=>el.closest('dialog').matches(':modal')),true);
  await page.setViewportSize({width:1000,height:900});
  await expect(page.locator('#drawer-trigger')).toHaveAttribute('aria-expanded','false');
  await expect.poll(()=>page.locator('#drawer').evaluate(el=>el.closest('dialog').matches(':modal'))).toBe(false);
  await page.locator('#content').focus();await expect(page.locator('#content')).toBeFocused();
  await page.setViewportSize({width:375,height:900});await page.locator('#drawer-trigger').click();
  await page.getByRole('button',{name:'Close navigation'}).click();
  await expect(page.locator('#drawer-trigger')).toHaveAttribute('aria-expanded','false');
});

scenario('remaining progress and loading variants stop spatial motion', `
<label for="upload">Upload</label><progress id="upload" class="progress" value="40" max="100"></progress>
<div id="custom-progress" class="progress" role="progressbar" aria-label="Preparing"></div>
<div id="legacy-progress" class="progress" role="progressbar" aria-label="Loading"><div class="indeterminate"></div></div>
<div id="circular" class="progress circular" role="progressbar" aria-label="Connecting"></div>
<div class="loading-indicator" aria-hidden="true"></div><p role="status">Loading records</p>`, async page => {
  await expect(page.getByRole('progressbar',{name:'Upload'})).toHaveAttribute('value','40');
  await expect(page.getByRole('progressbar',{name:'Preparing'})).not.toHaveAttribute('aria-valuenow',/./);
  await page.emulateMedia({reducedMotion:'no-preference'});
  assert.ok(await page.locator('#circular').evaluate(el=>getComputedStyle(el).animationName!=='none'));
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const selector of ['#custom-progress','#legacy-progress .indeterminate','#circular','.loading-indicator']) {
    const animations=await page.locator(selector).evaluate(el=>[getComputedStyle(el),getComputedStyle(el,'::before'),getComputedStyle(el,'::after')].map(s=>s.animationName));
    assert.ok(animations.every(name=>name==='none'),`${selector}: ${animations.join(',')}`);
  }
  for(const selector of ['#custom-progress','#legacy-progress .indeterminate']) {
    const width=await page.locator(selector).evaluate(el=>parseFloat(getComputedStyle(el,'::after').width));
    assert.ok(width>0,`${selector} retains a visible static indicator`);
  }
  await page.locator('#upload').evaluate(el=>el.value=100); await expect(page.locator('#upload')).toHaveAttribute('value','100');
});

scenario('remaining snackbar retains a focused action until focus leaves', '<button id="outside">Continue</button>', async page => {
  await page.evaluate(()=>{window.actions=0;window.snack=new Expressive.Snackbar({text:'Record archived',action:'Undo',displayLength:350,inDuration:0,outDuration:0,onAction:()=>window.actions++});});
  try {
    await page.getByRole('button',{name:'Undo'}).focus();await page.waitForTimeout(500);
    await expect(page.getByRole('button',{name:'Undo'})).toBeFocused();
    await page.keyboard.press('Enter');await expect.poll(()=>page.evaluate(()=>window.actions)).toBe(1);
    await expect(page.getByRole('status')).toHaveCount(0);
    await page.evaluate(()=>new Expressive.Snackbar({text:'Saved',action:'Review',displayLength:200,inDuration:0,outDuration:0}));
    await page.getByRole('button',{name:'Review'}).focus();await page.waitForTimeout(300);
    await expect(page.getByRole('button',{name:'Review'})).toBeFocused();
    await page.locator('#outside').focus();await expect(page.getByRole('status')).toHaveCount(0);
  } finally { await page.evaluate(()=>Expressive.Snackbar.dismissAll()); }
});

scenario('remaining lightbox supports Space and preserves its image on teardown', `
<img id="photo" class="lightboxed" width="120" height="80" style="border-radius:4px" tabindex="0" role="button" alt="Mountain lake">
<button id="after-photo">Next action</button>`, async page => {
  await page.evaluate(()=>window.instances=[Expressive.Lightbox.init(document.querySelector('#photo'),{inDuration:0,outDuration:0})]);
  await page.locator('#photo').focus();await page.keyboard.press('Space');
  await expect.poll(()=>page.evaluate(()=>window.instances[0].overlayActive)).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.instances[0].doneAnimating)).toBe(true);
  await page.keyboard.press('Escape');await expect.poll(()=>page.evaluate(()=>window.instances[0].overlayActive)).toBe(false);
  await page.evaluate(()=>window.instances.pop().destroy());
  await expect(page.locator('#photo')).toBeVisible();
  await expect(page.locator('#photo')).toHaveAttribute('style','border-radius:4px');
  await expect(page.locator('.material-placeholder')).toHaveCount(0);
});

scenario('remaining sheet variants retain native modal focus and explicit close actions', '<button id="open-sheet">Open details</button><button id="outside-sheet">Outside</button><dialog id="sheet" aria-labelledby="sheet-title"><h2 id="sheet-title">Details</h2><p>Review the current selection.</p><button id="close-sheet" type="button">Close details</button></dialog>', async page => {
  await page.evaluate(()=>{document.querySelector('#open-sheet').onclick=()=>document.querySelector('dialog').showModal();document.querySelector('#close-sheet').onclick=()=>document.querySelector('dialog').close();});
  for (const variant of ['bottom-sheet','side-sheet','floating-sheet']) {
    await page.locator('dialog').evaluate((el,name)=>el.className=name,variant);
    await page.locator('#open-sheet').focus();await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog',{name:'Details'})).toBeVisible();
    await page.locator('#outside-sheet').focus();await expect(page.locator('#outside-sheet')).not.toBeFocused();
    await page.locator('#close-sheet').focus();await page.keyboard.press('Enter');
    await expect(page.locator('dialog')).toBeHidden();await expect(page.locator('#open-sheet')).toBeFocused();
    await page.locator('#open-sheet').click();await page.keyboard.press('Escape');await expect(page.locator('dialog')).toBeHidden();
    await page.evaluate(()=>document.querySelector('dialog').show());
    await page.locator('#outside-sheet').focus();await expect(page.locator('#outside-sheet')).toBeFocused();
    await page.locator('#close-sheet').click();await expect(page.locator('dialog')).toBeHidden();
  }
});

scenario('remaining web navigation, badges and list controls expose their meaning', `
<nav aria-label="Breadcrumb"><ol class="breadcrumbs"><li><a href="#home">Home</a></li><li><a href="#results" aria-current="page">Results</a></li></ol></nav>
<nav aria-label="Pagination"><ul class="pagination"><li><span aria-disabled="true">Previous</span></li><li><a href="#results" aria-current="page">1</a></li><li><a href="#next-results">2</a></li></ul></nav>
<nav aria-label="Contents"><a href="#home">Overview</a><a href="#next-results">Following results</a></nav>
<button id="inbox" type="button" aria-label="Inbox, 12 unread"><span aria-hidden="true">Inbox<span class="badge">12</span></span></button>
<ul class="list"><li><label><input id="row-choice" type="checkbox">Include this record</label></li><li><a href="#results">Open record</a></li></ul>
<section id="home" class="scrollspy" style="min-height:100vh"><h2>Overview</h2></section><section id="results" style="min-height:100vh"><h2>Results</h2></section><section id="next-results" class="scrollspy" style="min-height:100vh"><h2>Following results</h2></section>
<footer><nav aria-label="Legal"><a href="#home">Privacy</a></nav></footer>`, async page => {
  await page.evaluate(()=>{document.body.append(document.querySelector('footer'));window.instances=Expressive.ScrollSpy.init(document.querySelectorAll('.scrollspy'),{getActiveElement:id=>`nav[aria-label="Contents"] a[href="#${id}"]`});});
  await expect(page.getByRole('navigation')).toHaveCount(4);
  await expect(page.getByRole('contentinfo')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Inbox, 12 unread'})).toHaveCount(1);
  await expect(page.getByRole('navigation',{name:'Pagination'}).getByRole('link',{name:'Previous'})).toHaveCount(0);
  await page.locator('#row-choice').focus();await page.keyboard.press('Space');await expect(page.locator('#row-choice')).toBeChecked();
  const next=page.getByRole('navigation',{name:'Contents'}).getByRole('link',{name:'Following results'});
  await next.click();await expect(next).toHaveAttribute('aria-current','true');
  await page.getByRole('navigation',{name:'Legal'}).getByRole('link',{name:'Privacy'}).focus();
  await expect(page.getByRole('link',{name:'Privacy'})).toBeFocused();
});

scenario('remaining lightbox teardown cancels pending work and preserves native button focus', `
<button id="photo-button" type="button" aria-label="Enlarge mountain lake"><img id="wrapped-photo" class="lightboxed" width="120" height="80" alt="Mountain lake"></button><button id="next-photo">Next</button>`, async page => {
  await page.evaluate(()=>{window.completed=0;window.instances=[Expressive.Lightbox.init(document.querySelector('img'),{inDuration:150,outDuration:150,onOpenEnd:()=>window.completed++})];});
  await page.locator('#photo-button').focus();await page.keyboard.press('Space');
  await expect.poll(()=>page.evaluate(()=>window.instances[0].overlayActive)).toBe(true);
  await page.evaluate(()=>window.instances.pop().destroy());await page.waitForTimeout(200);
  await expect(page.locator('#wrapped-photo')).toBeVisible();await expect(page.locator('#wrapped-photo')).toHaveAttribute('width','120');
  await expect(page.locator('.material-placeholder, #lightbox-overlay, .lightbox-caption')).toHaveCount(0);
  assert.equal(await page.evaluate(()=>window.completed),0);
  await page.locator('#photo-button').focus();await page.keyboard.press('Tab');await expect(page.locator('#next-photo')).toBeFocused();
});

scenario('remaining slider accepts zero maximum and keeps value labels aligned after resize', '<label class="slider stops">Temperature<input id="temperature" type="range" min="-100" max="0" step="10" value="-50"></label>', async page => {
  await page.evaluate(()=>window.instances=[Expressive.Slider.init(document.querySelector('input'))]);
  await expect(page.locator('#temperature')).toHaveCSS('--md-comp-slider-active-fraction','50%');
  await expect(page.locator('label')).toHaveCSS('--md-comp-slider-stop-count','11');
  await page.setViewportSize({width:375,height:900});
  await expect.poll(()=>page.locator('#temperature').evaluate(el=>{const input=el.getBoundingClientRect(),thumb=el.nextElementSibling.getBoundingClientRect();return Math.abs((thumb.left+thumb.width/2)-(input.left+input.width/2))<2;})).toBe(true);
  await page.evaluate(()=>{document.documentElement.dir='rtl';const el=document.querySelector('#temperature');el.value='-80';el.dispatchEvent(new Event('change'));});
  await expect.poll(()=>page.locator('#temperature').evaluate(el=>{const input=el.getBoundingClientRect(),thumb=el.nextElementSibling.getBoundingClientRect();return(thumb.left+thumb.width/2-input.left)/input.width;})).toBeGreaterThan(.7);
  await page.locator('#temperature').focus();await page.keyboard.press('End');await expect(page.locator('#temperature')).toHaveValue('0');
});

scenario('remaining autocomplete preserves a preselected display label on focus', '<label for="preset">Destination</label><input id="preset"><button id="leave">Continue</button>', async page => {
  await page.evaluate(()=>window.instances=[Expressive.Autocomplete.init(document.querySelector('#preset'),{data:[{id:'alpha',text:'Alpha'}],selected:['alpha'],minLength:0,menuOptions:{autoFocus:false,inDuration:0,outDuration:0}})]);
  await page.locator('#preset').focus();await expect(page.locator('#preset')).toHaveValue('Alpha');
  assert.equal(await page.evaluate(()=>window.instances[0].selectedValues[0]?.id),'alpha');
  await page.keyboard.press('Tab');await expect(page.locator('#leave')).toBeFocused();
});
