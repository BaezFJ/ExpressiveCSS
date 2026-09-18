import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import utilsBundle from 'playwright-core/lib/utilsBundle';
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
      await writeFile(path.join(project, 'src/index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Accessible controls</title><link rel="stylesheet" href="/node_modules/@expressivecss/expressive/dist/css/expressive.css"><style>main{padding:8rem 2rem;max-width:45rem;margin:auto}.tooltip-hosts{display:flex;gap:5rem;margin:3rem}header{position:sticky;top:0;background:var(--md-sys-color-surface)}input{max-width:100%}</style></head><body><header><h1>Preferences</h1></header><main><p id="instructions">Choose when to receive workspace updates. Save your delivery preference below.</p><form id="preferences"><button id="before" type="button">Before group</button><fieldset><legend>Delivery</legend><label><input id="daily" type="radio" name="delivery" value="daily" checked>Daily</label><label><input id="weekly" type="radio" name="delivery" value="weekly">Weekly</label></fieldset><button id="save">Save</button><output id="status" role="status" aria-live="polite" aria-atomic="true"></output></form><div class="tooltip-hosts"><button id="runtime" class="tooltipped" data-tooltip="Changes stay in this workspace" type="button">Runtime</button><button id="child" aria-describedby="child-tip" type="button">CSS child<span id="child-tip" class="tooltip bottom">Persistent help</span></button></div></main><script src="/node_modules/@expressivecss/expressive/dist/js/expressive.js"></script><script>window.tip=Expressive.Tooltip.init(document.querySelector('#runtime'),{enterDelay:0,exitDelay:0,inDuration:160,outDuration:80,position:'bottom'});let count=0;document.querySelector('form').onsubmit=e=>{e.preventDefault();document.querySelector('#status').textContent=new FormData(e.target).get('delivery')+' saved '+ ++count;};</script></body></html>`);
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
      for (const selector of ['#instructions', 'label:has(#daily)', 'label:has(#weekly)', '#save']) {
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


scenario('linear progress follows inherited and overridden RTL direction', `
<section id="direction" style="width:400px">
<div id="fill" class="progress" role="progressbar" aria-label="Upload" aria-valuenow="25" style="--md-comp-progress-value:25%"><span class="determinate"></span></div>
<div id="token" class="progress" role="progressbar" aria-label="Download" aria-valuenow="25" style="--md-comp-progress-value:25%"></div>
<div id="motion" class="progress" role="progressbar" aria-label="Loading"><span class="indeterminate"></span></div>
<div id="bare" class="progress" role="progressbar" aria-label="Preparing"></div>
<progress id="native" class="progress" aria-label="Native upload" value="25" max="100"></progress>
<div id="circle" class="progress circular" role="progressbar" aria-label="Connecting"></div>
</section>`, async page => {
  await page.addStyleTag({ content: '#fill .determinate, #token::after { transition:none; }' });
  for (const writingMode of ['horizontal-tb', 'vertical-rl', 'vertical-lr']) {
    await page.locator('#direction').evaluate((el, mode) => {
      el.style.writingMode = mode;
      el.style.removeProperty('direction');
    }, writingMode);
    for (const direction of ['ltr', 'rtl']) {
      await page.locator('#direction').evaluate((el, dir) => el.dir = dir, direction);
      for (const value of [0, 25, 100]) {
        const positions = await page.evaluate(value => {
          return ['#fill', '#token'].map(selector => {
            const host = document.querySelector(selector);
            host.style.setProperty('--md-comp-progress-value', `${value}%`);
            const child = host.querySelector('.determinate');
            const style = getComputedStyle(child || host, child ? null : '::after');
            return { left: parseFloat(style.left), right: parseFloat(style.right), width: parseFloat(style.width), height: parseFloat(style.height) };
          });
        }, value);
        for (const position of positions) {
          assert.equal(position.width, value * 4);
          assert.equal(position.height, 4);
          assert.equal(direction === 'rtl' ? position.right : position.left, 0);
        }
      }
    }
    await page.locator('#fill').evaluate(el => { el.dir = 'ltr'; el.style.setProperty('--md-comp-progress-value', '25%'); });
    assert.equal(await page.locator('#fill .determinate').evaluate(el => getComputedStyle(el).left), '0px');
    assert.equal(await page.locator('#fill .determinate').evaluate(el => getComputedStyle(el).right), '300px');
    await page.locator('#fill').evaluate(el => el.removeAttribute('dir'));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const sample = async (direction, time) => page.evaluate(({ direction, time }) => {
      document.querySelector('#direction').style.direction = direction;
      for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = time + Number(animation.effect.getTiming().delay);
      }
      return [['#motion .indeterminate', '::before'], ['#motion .indeterminate', '::after'], ['#bare', '::after']].map(([selector, pseudo]) => {
        const style = getComputedStyle(document.querySelector(selector), pseudo);
        return { left: parseFloat(style.left), right: parseFloat(style.right), width: parseFloat(style.width), height: parseFloat(style.height), top: parseFloat(style.top) };
      });
    }, { direction, time });
    for (const time of [300, 900]) {
      const ltr = await sample('ltr', time);
      const rtl = await sample('rtl', time);
      for (let index = 0; index < ltr.length; index++) {
        assert.ok(Math.abs(ltr[index].left - rtl[index].right) < 0.1);
        assert.ok(Math.abs(ltr[index].right - rtl[index].left) < 0.1);
        assert.ok(Math.abs(ltr[index].width - rtl[index].width) < 0.1);
        for (const segment of [ltr[index], rtl[index]]) {
          assert.equal(segment.height, 4);
          assert.equal(segment.top, 0);
          assert.ok(segment.width > 0);
        }
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const selector of ['#motion .indeterminate', '#bare']) {
      const state = await page.locator(selector).evaluate(el => {
        const style = getComputedStyle(el, '::after');
        return { animation: style.animationName, width: style.width, right: style.right };
      });
      assert.deepEqual(state, { animation: 'none', width: '160px', right: '0px' });
    }
    await expect(page.locator('#native')).toHaveAttribute('value', '25');
    assert.equal(await page.locator('#circle').evaluate(el => getComputedStyle(el, '::after').content), 'none');
    assert.equal(await page.locator('#circle').evaluate(el => getComputedStyle(el).writingMode), writingMode);
  }
});

scenario('progress remains visible in forced colors', `
<section id="contrast" style="width:400px">
<progress id="native-fill" class="progress" aria-label="Native upload" value="25" max="100"></progress>
<progress id="native-motion" class="progress" aria-label="Native loading"></progress>
<div id="custom-fill" class="progress" role="progressbar" aria-label="Upload" aria-valuenow="25" style="--md-comp-progress-value:25%;--md-comp-progress-indicator:red"><span class="determinate"></span></div>
<div id="token-fill" class="progress" role="progressbar" aria-label="Download" aria-valuenow="25" style="--md-comp-progress-value:25%"></div>
<div id="custom-motion" class="progress" role="progressbar" aria-label="Loading"><span class="indeterminate"></span></div>
<div id="bare-motion" class="progress" role="progressbar" aria-label="Preparing"></div>
<span id="circle-fill" class="progress circular determinate" role="progressbar" aria-label="Circular upload" aria-valuenow="25" style="--md-comp-progress-value:25%"></span>
<span id="circle-motion" class="progress circular" role="status" aria-label="Connecting"></span>
<span id="legacy-motion" class="preloader" role="status" aria-label="Waiting"></span>
</section>`, async page => {
  await page.addStyleTag({ content: '#contrast *, #contrast ::after { transition:none; }' });
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ forcedColors: 'active', colorScheme, reducedMotion: 'reduce' });
    assert.equal(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), true);
    const palette = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.cssText = 'forced-color-adjust:none;color:CanvasText;background:Canvas';
      document.body.append(probe);
      const style = getComputedStyle(probe);
      const colors = [style.color, style.backgroundColor].map(value => value.match(/\d+/g).slice(0, 3).map(Number));
      probe.remove();
      return colors;
    });
    for (const direction of ['ltr', 'rtl']) {
      await page.locator('#contrast').evaluate((el, dir) => el.dir = dir, direction);
      for (const value of [0, 25, 100]) {
        for (const id of ['native-fill', 'custom-fill', 'token-fill', 'circle-fill']) {
          const indicator = page.locator(`#${id}`);
          await indicator.evaluate((el, value) => {
            if (el instanceof HTMLProgressElement) el.value = value;
            else { el.style.setProperty('--md-comp-progress-value', `${value}%`); el.setAttribute('aria-valuenow', `${value}`); }
          }, value);
          const png = utilsBundle.PNG.sync.read(await indicator.screenshot());
          const pixel = (x, y) => [...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 3)];
          if (id === 'circle-fill') {
            const start = pixel(png.width - 4, Math.floor(png.height / 2) - 6);
            const end = pixel(2, Math.floor(png.height / 2));
            if (value > 0) assert.deepEqual(start, palette[0]);
            if (value === 100) assert.deepEqual(end, palette[0]);
            for (const track of value === 0 ? [start, end] : value === 25 ? [end] : []) {
              assert.notDeepEqual(track, palette[0]);
              assert.notDeepEqual(track, palette[1]);
            }
          } else {
            const start = direction === 'rtl' ? png.width - 20 : 20;
            const end = direction === 'rtl' ? 20 : png.width - 20;
            assert.deepEqual(pixel(start, 2), palette[value === 0 ? 1 : 0], `${id} ${direction} ${value} start`);
            assert.deepEqual(pixel(end, 2), palette[value === 100 ? 0 : 1], `${id} ${direction} ${value} end`);
          }
        }
      }
      for (const reducedMotion of ['no-preference', 'reduce']) {
        await page.emulateMedia({ reducedMotion });
        const animations = await page.evaluate(() => {
          const animations = document.getAnimations();
          for (const animation of animations) {
            animation.pause();
            animation.currentTime = 700 + Number(animation.effect.getTiming().delay);
          }
          return animations.length;
        });
        assert.equal(animations > 0, reducedMotion === 'no-preference');
        for (const id of ['native-motion', 'custom-motion', 'bare-motion', 'circle-motion', 'legacy-motion']) {
          const indicator = page.locator(`#${id}`);
          const png = utilsBundle.PNG.sync.read(await indicator.screenshot());
          let ink = 0;
          for (let offset = 0; offset < png.data.length; offset += 4) {
            if (palette[0].every((value, channel) => png.data[offset + channel] === value)) ink++;
          }
          assert.ok(ink > 20, `${id} retains visible feedback with ${reducedMotion}`);
          assert.equal(await indicator.getAttribute('aria-valuenow'), null);
        }
      }
    }
  }
  await page.emulateMedia({ forcedColors: 'none' });
  assert.equal(await page.locator('#custom-fill .determinate').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 0, 0)');
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

scenario('autocomplete announces results and selection without moving focus', '<div class="field"><label for="query">Fruit</label><input id="query"></div><button id="after">After</button>', async page => {
  try {
    await page.evaluate(() => {
      window.instances = [Expressive.Autocomplete.init(document.querySelector('#query'), {
        data: [{ id: 'apple' }, { id: 'apricot' }],
        menuOptions: { inDuration: 0, outDuration: 0 }
      })];
    });
    const status = page.locator('.autocomplete-status');
    await expect(status).toHaveAttribute('role', 'status');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).toHaveAttribute('aria-atomic', 'true');
    await page.locator('#query').focus();
    await page.keyboard.type('a');
    await expect(status).toHaveText('2 results available.');
    await expect(page.locator('#query')).toBeFocused();
    await page.keyboard.type('pp');
    await expect(status).toHaveText('1 result available.');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('#query')).toHaveValue('apple');
    await expect(status).toBeEmpty();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('z');
    await expect(status).toHaveText('No results.');
    await page.keyboard.press('Backspace');
    await expect(status).toBeEmpty();
    await page.evaluate(() => {
      window.instances[0].destroy();
      window.instances = [Expressive.Autocomplete.init(document.querySelector('#query'), {
        isMultiSelect: true, i18n: { loading: 'Buscando', results: count => `${count} coincidencias` },
        onSearch: (_query, instance) => { window.pending = instance; },
        menuOptions: { inDuration: 0, outDuration: 0 }
      })];
    });
    await page.keyboard.type('a');
    await expect(status).toHaveText('Buscando');
    await page.evaluate(() => window.pending.setMenuItems([{ id: 'apple' }, { id: 'apricot' }]));
    await expect(status).toHaveText('2 coincidencias');
    await expect(page.locator('#query')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(status).toHaveText('1 item selected.');
    await expect(page.locator('.status-info')).toHaveText('1');
    await expect(page.locator('.status-info')).toHaveAttribute('aria-hidden', 'true');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(status).toHaveText('0 items selected.');
    await page.keyboard.press('Escape');
    await expect(status).toBeEmpty();
    await page.locator('#after').focus();
    await page.evaluate(() => window.pending.setMenuItems([]));
    await expect(status).toBeEmpty();
    await expect(page.locator('#after')).toBeFocused();
    await page.evaluate(() => { window.instances[0].destroy(); window.instances = []; window.pending.setMenuItems([{ id: 'late' }]); });
    await expect(page.locator('.autocomplete-status, .status-info, .autocomplete-content')).toHaveCount(0);
    await page.evaluate(() => {
      document.querySelector('#query').value = '';
      window.instances = [Expressive.Autocomplete.init(document.querySelector('#query'), {
        minLength: 0, data: [{ id: 'apple' }], menuOptions: { inDuration: 0, outDuration: 0 }
      })];
    });
    await page.locator('#query').focus();
    await page.evaluate(() => window.instances[0].open());
    await expect(status).toHaveText('1 result available.');
    await page.evaluate(() => window.instances[0].setMenuItems([{ id: 'pear' }], null, false));
    await expect(status).toBeEmpty();
  } finally {
    await page.evaluate(() => { window.instances?.forEach(instance => instance.destroy()); window.instances = []; });
  }
});

scenario('date picker supports calendar keyboard navigation and redraw focus', '<label for="date">Appointment date</label><input id="date"><button id="after">After</button>', async page => {
  const day = (year, month, date) => page.locator(`.datepicker-day-button[data-year="${year}"][data-month="${month}"][data-day="${date}"]`);
  for (const docked of [false, true]) {
    try {
      await page.evaluate(docked => {
        window.selections = 0;
        window.instances = [Expressive.Datepicker.init(document.querySelector('#date'), {
          defaultDate: new Date(2023, 11, 31), setDefaultDate: true, autoSubmit: false,
          openByDefault: true,
          firstDay: 1, disableWeekends: true, disableDayFn: date => date.getDate() === 2,
          minDate: new Date(2023, 0, 1), maxDate: new Date(2025, 11, 31),
          displayPlugin: docked ? 'docked' : null, onSelect: () => window.selections++
        })];
      }, docked);
      await page.locator('#date').focus();
      await page.keyboard.press('Enter');
      await expect(day(2023, 11, 31)).toBeFocused();
      await page.evaluate(() => { window.selections = 0; });
      await expect(page.locator('.datepicker-day-button[tabindex="0"]')).toHaveCount(1);
      await page.keyboard.press('ArrowRight');
      await expect(day(2024, 0, 1)).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect(day(2024, 0, 2)).toBeFocused();
      await expect(day(2024, 0, 2)).toHaveAttribute('aria-disabled', 'true');
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => window.selections), 0);
      await page.keyboard.press('Home');
      await expect(day(2024, 0, 1)).toBeFocused();
      await page.keyboard.press('End');
      await expect(day(2024, 0, 7)).toBeFocused();
      await page.keyboard.press('Space');
      assert.equal(await page.evaluate(() => window.selections), 0);
      await page.keyboard.press('ArrowDown');
      await expect(day(2024, 0, 14)).toBeFocused();
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('PageUp');
      await expect(day(2023, 11, 7)).toBeFocused();
      await page.keyboard.press('PageDown');
      await expect(day(2024, 0, 7)).toBeFocused();
      await page.evaluate(() => window.instances[0].gotoDate(new Date(2024, 0, 31)));
      await day(2024, 0, 31).focus();
      await page.keyboard.press('PageDown');
      await expect(day(2024, 1, 29)).toBeFocused();
      await page.keyboard.press('Shift+PageDown');
      await expect(day(2025, 1, 28)).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(day(2025, 1, 28)).toBeFocused();
      assert.equal(await page.evaluate(() => window.selections), 1);
      await page.evaluate(() => { window.instances[0].options.isRTL = true; window.instances[0].draw(); });
      await page.keyboard.press('ArrowLeft');
      await expect(day(2025, 2, 1)).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect(day(2025, 1, 28)).toBeFocused();
      await page.evaluate(() => window.instances[0].gotoDate(new Date(2025, 11, 31)));
      await day(2025, 11, 31).focus();
      await page.keyboard.press('ArrowLeft');
      await expect(day(2025, 11, 31)).toBeFocused();
      await page.evaluate(() => window.instances[0].gotoDate(new Date(2023, 0, 1)));
      await day(2023, 0, 1).focus();
      await page.keyboard.press('ArrowRight');
      await expect(day(2023, 0, 1)).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(day(2023, 0, 1)).not.toBeFocused();
      await page.locator('#after').focus();
      await page.evaluate(() => window.instances[0].draw());
      await expect(page.locator('#after')).toBeFocused();
      await page.evaluate(() => Object.assign(window.instances[0].options, {
        isRTL: false, firstDay: 0, minYear: 2023, maxYear: 2023, minMonth: 0, maxMonth: 0
      }));
      await day(2023, 0, 3).focus();
      await page.keyboard.press('Home');
      await expect(day(2023, 0, 1)).toBeFocused();
      await page.keyboard.press('End');
      await expect(day(2023, 0, 7)).toBeFocused();
      await page.keyboard.press('PageDown');
      await expect(day(2023, 0, 7)).toBeFocused();
      if (docked) {
        await page.mouse.click(950, 850);
        await expect(page.locator('.display-docked')).toBeHidden();
      }
    } finally {
      await page.evaluate(() => { window.instances?.forEach(instance => instance.destroy()); window.instances = []; });
    }
  }
});

for (const action of ['input', 'empty', 'boundaries']) scenario(`time picker digital values: ${action}`, '<form><label for="time">Time</label><input id="time" name="time"></form><button id="after">After</button>', async page => {
  await page.clock.setFixedTime(new Date(2024, 0, 1, 0, 37));
  for (const twelveHour of [true, false]) for (const docked of [false, true]) {
    try {
      await page.emulateMedia({ reducedMotion: docked ? 'no-preference' : 'reduce' });
      await page.evaluate(({ twelveHour, docked }) => {
        document.documentElement.dir = docked ? 'rtl' : 'ltr';
        document.querySelector('#time').value = twelveHour ? '03:45 PM' : '23:45';
        window.changes = 0;
        document.querySelector('#time').onchange = () => window.changes++;
        window.instances = [Expressive.Timepicker.init(document.querySelector('#time'), {
          twelveHour, autoSubmit: false, duration: 0, vibrate: false,
          displayPlugin: docked ? 'docked' : null, displayPluginOptions: { duration: 0 }
        })];
      }, { twelveHour, docked });
      await page.locator('#time').focus();
      await page.keyboard.press('Enter');
      const hours = page.getByRole('textbox', { name: 'Hours', exact: true });
      const minutes = page.getByRole('textbox', { name: 'Minutes', exact: true });
      if (action === 'input') {
        await hours.fill(twelveHour ? '02' : '00');
        await minutes.fill('19');
        await page.getByRole('button', { name: 'Ok', exact: true }).click();
        await expect(page.locator('#time')).toHaveValue(twelveHour ? '02:19 PM' : '00:19');
        assert.equal(await page.evaluate(() => window.changes), 1);
        await hours.fill('4x');
        await minutes.fill('99');
        await page.getByRole('button', { name: 'Ok', exact: true }).click();
        await expect(page.locator('#time')).toHaveValue(twelveHour ? '02:19 PM' : '00:19');
        assert.equal(await page.evaluate(() => window.changes), 1);
        assert.equal(await page.evaluate(() => new FormData(document.querySelector('form')).get('time')), twelveHour ? '02:19 PM' : '00:19');
      } else if (action === 'empty') {
        await hours.fill('');
        await minutes.fill('');
        await page.getByRole('button', { name: 'Ok', exact: true }).click();
        await expect(hours).toHaveValue(twelveHour ? '12' : '00');
        await expect(minutes).toHaveValue('37');
        await expect(page.locator('#time')).toHaveValue(twelveHour ? '12:37 PM' : '00:37');
      } else {
        for (const [value, expected] of [['00:15', '12:15 AM'], ['12:30', '12:30 PM'], ['23:45', '11:45 PM'], ['03:45 am', '03:45 AM']]) {
          if (!twelveHour && value.includes('am')) continue;
          await page.evaluate(value => {
            const { el, options } = window.instances[0];
            window.instances.pop().destroy();
            el.value = value;
            window.instances = [Expressive.Timepicker.init(el, options)];
            window.instances[0].done();
          }, value);
          await expect(page.locator('#time')).toHaveValue(twelveHour ? expected : value);
          await page.locator('#time').focus();
          await page.keyboard.press('Enter');
          if (twelveHour) await expect(page.getByRole('button', { name: expected.slice(-2), exact: true })).toHaveAttribute('aria-pressed', 'true');
        }
      }
    } finally {
      await page.evaluate(() => { window.instances?.forEach(instance => instance.destroy()); window.instances = []; });
    }
  }
});

scenario('time picker exposes named keyboard controls in inline and docked modes', '<form><label for="appointment">Appointment</label><input id="appointment" value="03:45 PM"></form>', async page => {
  for (const docked of [false, true]) {
    for (const twelveHour of [true, false]) {
      try {
        await page.evaluate(({ docked, twelveHour }) => {
          window.submits = 0;
          document.querySelector('form').onsubmit = event => { event.preventDefault(); window.submits++; };
          const input = document.querySelector('#appointment');
          input.value = twelveHour ? '03:45 PM' : '23:45';
          window.instances = [Expressive.Timepicker.init(input, {
            twelveHour, autoSubmit: false, duration: 0, vibrate: false,
            displayPlugin: docked ? 'docked' : null,
            displayPluginOptions: { duration: 0 }, i18n: { hours: 'Horas' }
          })];
        }, { docked, twelveHour });
        await page.locator('#appointment').focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('textbox', { name: 'Horas', exact: true })).toBeFocused();
        await page.keyboard.press('ControlOrMeta+A');
        await page.keyboard.type(twelveHour ? '11' : '00');
        await page.keyboard.press('Tab');
        await expect(page.getByRole('textbox', { name: 'Minutes', exact: true })).toBeFocused();
        await page.keyboard.press('ControlOrMeta+A');
        await page.keyboard.type('25');
        await page.keyboard.press('Tab');
        if (twelveHour) {
          const am = page.getByRole('button', { name: 'AM', exact: true });
          const pm = page.getByRole('button', { name: 'PM', exact: true });
          await expect(am).toBeFocused();
          await expect(pm).toHaveAttribute('aria-pressed', 'true');
          await page.keyboard.press('Space');
          await expect(am).toHaveAttribute('aria-pressed', 'true');
          await expect(pm).toHaveAttribute('aria-pressed', 'false');
          await page.keyboard.press('Tab');
          await page.keyboard.press('Enter');
          await expect(pm).toHaveAttribute('aria-pressed', 'true');
          await expect(am).toHaveAttribute('aria-pressed', 'false');
        } else {
          await expect(page.locator('.am-btn, .pm-btn')).toHaveCount(0);
        }
        await page.getByRole('button', { name: 'Ok', exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('#appointment')).toHaveValue(twelveHour ? '11:25 PM' : '00:25');
        assert.equal(await page.evaluate(() => window.submits), 0);
      } finally {
        await page.evaluate(() => { window.instances?.forEach(instance => instance.destroy()); window.instances = []; });
      }
    }
  }
});

scenario('actionable snackbar persists and restores focus on keyboard dismissal', '<button id="outside">Continue</button><button id="next">Next</button>', async page => {
  await page.locator('#outside').focus();
  try {
    await page.evaluate(() => {
      window.actions = 0;
      window.snack = new Expressive.Snackbar({ text: 'Archived', action: 'Undo', inDuration: 0, outDuration: 200, onAction: () => window.actions++ });
    });
    await expect(page.locator('#outside')).toBeFocused();
    assert.equal(await page.evaluate(() => window.snack.options.displayLength === Infinity && window.snack.counterTimeout == null), true);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
    await page.locator('#next').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Dismiss', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#next')).toBeFocused();
    assert.equal(await page.evaluate(() => window.snack.el.inert), true);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Dismiss', exact: true })).not.toBeFocused();
    await expect(page.getByRole('status')).toHaveCount(0);

    await page.locator('#outside').focus();
    await page.evaluate(() => { window.snack = new Expressive.Snackbar({ text: 'Archived', action: 'Undo', inDuration: 0, outDuration: 0, onAction: () => { window.actions++; document.querySelector('#next').focus(); } }); });
    await page.getByRole('button', { name: 'Undo', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#next')).toBeFocused();
    assert.equal(await page.evaluate(() => window.actions), 1);
    await expect(page.getByRole('status')).toHaveCount(0);

    await page.evaluate(() => { window.snack = new Expressive.Snackbar({ text: 'Archived', action: 'Undo', inDuration: 0, outDuration: 0 }); });
    await page.getByRole('button', { name: 'Undo', exact: true }).focus();
    await page.evaluate(() => new Expressive.Snackbar({ text: 'Replacement', action: 'Review', inDuration: 0, outDuration: 0 }));
    await expect(page.locator('#next')).toBeFocused();
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
    await expect(page.locator('#next')).toBeFocused();
    await expect(page.getByRole('status')).toHaveCount(0);

    await page.evaluate(() => {
      window.snack = new Expressive.Snackbar({ text: 'Before reentry', action: 'Undo', inDuration: 0, outDuration: 0 });
      window.snack.el.querySelector('button').focus();
      document.querySelector('#next').addEventListener('focus', () => {
        window.nestedSnack = new Expressive.Snackbar({ text: 'Nested', action: 'Undo', inDuration: 0, outDuration: 0 });
      }, { once: true });
      window.snack = new Expressive.Snackbar({ text: 'After reentry', action: 'Review', inDuration: 0, outDuration: 0 });
    });
    await expect(page.locator('.snackbar')).toHaveCount(1);
    await expect(page.getByRole('status')).toContainText('After reentry');
    assert.equal(await page.evaluate(() => !window.nestedSnack.el.isConnected && Expressive.Snackbar._snackbars.length === 1), true);
    await page.evaluate(() => Expressive.Snackbar.dismissAll());
    await expect(page.locator('.snackbar')).toHaveCount(0);

    await page.evaluate(() => {
      const host = document.createElement('div');
      host.id = 'shadow-snackbar';
      document.body.append(host);
      const root = host.attachShadow({ mode: 'open' });
      const trigger = document.createElement('button');
      trigger.id = 'shadow-trigger';
      trigger.textContent = 'Shadow action';
      root.append(trigger);
      trigger.focus();
      window.snack = new Expressive.Snackbar({ text: 'Shadow update', action: 'Undo', root: trigger, inDuration: 0, outDuration: 0 });
    });
    await page.getByRole('button', { name: 'Undo', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('#shadow-trigger')).toBeFocused();
    await expect(page.getByRole('status')).toHaveCount(0);

    await page.evaluate(() => {
      const dialog = document.createElement('dialog');
      dialog.id = 'snackbar-dialog';
      dialog.innerHTML = '<button id="dialog-trigger">Save</button>';
      document.body.append(dialog);
      dialog.showModal();
      window.snack = new Expressive.Snackbar({ text: 'Saved', action: 'Undo', inDuration: 0, outDuration: 0 });
      dialog.append(window.snack.el);
    });
    await page.getByRole('button', { name: 'Undo', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('#snackbar-dialog')).toHaveAttribute('open', '');
    await expect(page.locator('#dialog-trigger')).toBeFocused();
    await expect(page.getByRole('status')).toHaveCount(0);
    await page.evaluate(() => document.querySelector('#snackbar-dialog').close());
  } finally {
    await page.evaluate(() => Expressive.Snackbar.dismissAll());
  }
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

for (const action of ['interrupt', 'reopen', 'motion', 'focus', 'isolation', 'triggers', 'callbacks', 'destroy']) scenario(`Lightbox transition reliability: ${action}`, `
<div id="clip" style="overflow:hidden"><img id="photo" class="lightboxed" width="120" height="80" style="border-radius:4px" tabindex="0" role="button" alt="Lake" data-caption="Lake"><button id="wrapped" type="button"><img id="second" class="lightboxed" width="100" height="60" alt="Forest" data-caption="Forest"></button></div><button id="outside">Outside</button>`, async page => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => {
    window.events = [];
    window.instances = [...document.querySelectorAll('img')].map(el => Expressive.Lightbox.init(el, {
      inDuration: 120, outDuration: 120,
      onOpenStart: () => window.events.push('open-start'), onOpenEnd: () => window.events.push('open-end'),
      onCloseStart: () => window.events.push('close-start'), onCloseEnd: () => window.events.push('close-end')
    }));
  });
  if (action === 'interrupt') {
    await page.evaluate(() => { const box = window.instances[0]; box.open(); box.open(); box.close(); box.close(); });
    await page.waitForTimeout(180);
    assert.deepEqual(await page.evaluate(() => window.events), ['open-start', 'close-start', 'close-end']);
    await expect(page.locator('#lightbox-overlay, .lightbox-caption')).toHaveCount(0);
    await expect(page.locator('#photo')).toHaveAttribute('style', 'border-radius:4px');
    await expect(page.locator('#clip')).toHaveCSS('overflow', 'hidden');
  } else if (action === 'reopen') {
    await page.evaluate(() => window.instances[0].open());
    await page.waitForTimeout(150);
    await page.evaluate(() => { window.events = []; const box = window.instances[0]; box.close(); box.open(); });
    await page.waitForTimeout(180);
    await expect(page.locator('#lightbox-overlay')).toHaveCount(1);
    await expect(page.locator('.lightbox-caption')).toHaveText('Lake');
    assert.deepEqual(await page.evaluate(() => window.events), ['close-start', 'open-start', 'open-end']);
    await page.evaluate(() => window.instances[0].close());
    await page.waitForTimeout(150);
    await expect(page.locator('#photo')).toHaveAttribute('width', '120');
    await expect(page.locator('#clip')).toHaveCSS('overflow', 'hidden');
  } else if (action === 'motion') {
    await page.evaluate(() => { window.instances[0].options.inDuration = 2000; window.instances[0].open(); });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => page.evaluate(() => window.instances[0].doneAnimating), { timeout: 500 }).toBe(true);
    await page.evaluate(() => { window.instances[0].options.outDuration = 2000; window.instances[0].close(); });
    await expect(page.locator('#lightbox-overlay')).toHaveCount(0, { timeout: 500 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => { window.instances[0].options.inDuration = 0; window.instances[0].open(); });
    await page.waitForTimeout(20);
    await page.evaluate(() => window.instances[0].close());
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('#lightbox-overlay')).toHaveCount(0, { timeout: 500 });
    await expect(page.locator('#photo')).toHaveAttribute('style', 'border-radius:4px');
  } else if (action === 'focus') {
    await page.locator('#photo').focus();
    await page.keyboard.press('Enter');
    await page.evaluate(() => window.instances.shift().destroy());
    await expect(page.locator('#photo')).toBeFocused();
    await page.waitForTimeout(180);
    assert.deepEqual(await page.evaluate(() => window.events), ['open-start']);
    for (const moveFocus of [false, true]) {
      await page.evaluate(moveFocus => {
        const host = document.createElement('div');
        document.body.append(host);
        const root = host.attachShadow({ mode: 'open' });
        const photo = document.querySelector('#photo').cloneNode(true);
        root.append(photo);
        const box = Expressive.Lightbox.init(photo);
        window.instances.push(box);
        photo.focus();
        if (moveFocus) {
          photo.addEventListener('blur', () => document.querySelector('#outside').focus(), { once: true });
          const placeholder = photo.parentElement;
          const replace = placeholder.replaceWith;
          placeholder.replaceWith = function (...nodes) { photo.blur(); replace.apply(this, nodes); };
        }
        box.destroy();
        window.focusPreserved = moveFocus ? document.activeElement.id === 'outside' : root.activeElement === photo;
        host.remove();
      }, moveFocus);
      assert.equal(await page.evaluate(() => window.focusPreserved), true, `shadow teardown, moved focus: ${moveFocus}`);
    }
  } else if (action === 'isolation') {
    await page.evaluate(() => { window.instances[0].open(); window.instances[1].open(); });
    await page.waitForTimeout(150);
    await page.evaluate(() => window.instances[0].close());
    await page.waitForTimeout(150);
    await expect(page.locator('#clip')).toHaveCSS('overflow', 'visible');
    await expect(page.locator('.lightbox-caption')).toHaveText('Forest');
    await page.evaluate(() => window.instances[1].close());
    await page.waitForTimeout(150);
    await expect(page.locator('#clip')).toHaveCSS('overflow', 'hidden');
  } else if (action === 'triggers') {
    for (const direction of ['ltr', 'rtl']) for (const motion of ['reduce', 'no-preference']) {
      await page.evaluate(direction => { document.documentElement.dir = direction; }, direction);
      await page.emulateMedia({ reducedMotion: motion });
      for (const trigger of ['#photo', '#wrapped']) for (const activation of ['Enter', 'Space', 'click']) {
        await page.locator(trigger).focus();
        if (activation === 'click') await page.locator(trigger).click();
        else await page.keyboard.press(activation);
        await expect(page.locator('#lightbox-overlay')).toHaveCount(1);
        await page.keyboard.press('Escape');
        await expect(page.locator('#lightbox-overlay')).toHaveCount(0);
        if (activation !== 'click') await expect(page.locator(trigger)).toBeFocused();
      }
    }
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => window.instances[1].open());
    await page.waitForTimeout(150);
    await page.locator('#lightbox-overlay').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('#lightbox-overlay')).toHaveCount(0);
    for (const dismissal of ['overlay', 'scroll', 'resize']) {
      await page.evaluate(() => { window.instances[0].options.inDuration = 2000; window.instances[0].open(); });
      if (dismissal === 'overlay') await page.locator('#lightbox-overlay').dispatchEvent('click');
      else if (dismissal === 'resize') await page.setViewportSize({ width: 900, height: 800 });
      else await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
      await expect(page.locator('#lightbox-overlay')).toHaveCount(0);
    }
  } else if (action === 'callbacks') {
    await page.evaluate(() => {
      const box = window.instances[0];
      box.options.onOpenStart = () => box.close();
      box.open();
    });
    await page.waitForTimeout(180);
    await expect(page.locator('#lightbox-overlay, .lightbox-caption')).toHaveCount(0);
    await page.evaluate(() => {
      const box = window.instances[0];
      box.options.onOpenStart = null;
      box.open();
      box.options.onCloseStart = () => { box.options.onCloseStart = null; box.open(); document.querySelector('#outside').focus(); };
      box.close();
    });
    await page.waitForTimeout(180);
    await expect(page.locator('#lightbox-overlay')).toHaveCount(1);
    await expect(page.locator('#outside')).toBeFocused();
    await page.evaluate(() => {
      const box = window.instances[0];
      box.options.onCloseStart = () => box.destroy();
      box.close();
    });
    await page.waitForTimeout(180);
    await expect(page.locator('#lightbox-overlay, .lightbox-caption')).toHaveCount(0);
    await expect(page.locator('#outside')).toBeFocused();
  } else {
    for (const phase of ['opening', 'closing']) {
      await page.evaluate(phase => {
        let box = window.instances[0];
        if (phase === 'closing') {
          box = Expressive.Lightbox.init(document.querySelector('#photo'), { inDuration: 120, outDuration: 120, onCloseEnd: () => window.events.push('close-end') });
          window.instances[0] = box;
        }
        box.open();
        if (phase === 'closing') box.close();
        document.querySelector('#outside').focus();
        box.destroy(); box.destroy(); box.open(); box.close();
      }, phase);
      await page.waitForTimeout(180);
      await expect(page.locator('#outside')).toBeFocused();
      await expect(page.locator('#photo')).toHaveAttribute('width', '120');
      await expect(page.locator('#photo')).toHaveAttribute('height', '80');
      await expect(page.locator('#photo')).toHaveAttribute('style', 'border-radius:4px');
      await expect(page.locator('#lightbox-overlay, .lightbox-caption')).toHaveCount(0);
      await expect(page.locator('#clip')).toHaveCSS('overflow', 'hidden');
    }
    assert.deepEqual(await page.evaluate(() => window.events), ['open-start']);
  }
});

scenario('remaining lightbox teardown cancels pending work and preserves native button focus', `
<button id="photo-button" type="button" aria-label="Enlarge mountain lake"><img id="wrapped-photo" class="lightboxed" width="120" height="80" alt="Mountain lake"></button><button id="next-photo">Next</button>`, async page => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
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
