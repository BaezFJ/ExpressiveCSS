import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines, leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const box = '<div id="box" class="scroll-area custom" style="block-size:300px;inline-size:240px"><div id="content" style="block-size:900px"></div></div>';
const fixture = `<div id="host"><p id="before">Before</p>${box}<p id="after">After</p></div>`;
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const near = (actual, expected, label = '') => assert.ok(Math.abs(actual - expected) <= 1, `${label}: ${actual}, expected ${expected}`);
async function setup(page, html = fixture, extra = '') {
  await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}\nbody{margin:0;min-height:1500px}${extra}</style></head><body>${html}</body></html>`);
  await page.addScriptTag({ content: js });
}
const init = page => page.evaluate(() => { window.area = Expressive.ScrollArea.init(document.querySelector('#box')); });
const destroy = page => page.evaluate(() => { window.area?.destroy(); });
const geometry = page => page.evaluate(() => {
  const el = document.querySelector('#box'), bar = el.parentElement.querySelector(':scope > .scroll-area-bar');
  const rect = x => { const r = x.getBoundingClientRect(); return { top:r.top, bottom:r.bottom, left:r.left, right:r.right, width:r.width, height:r.height }; };
  if (!bar) return null;
  return { box:rect(el), bar:rect(bar), thumb:rect(bar.firstElementChild), hidden:bar.hidden, display:getComputedStyle(bar).display, position:getComputedStyle(bar).position, z:getComputedStyle(bar).zIndex, color:getComputedStyle(bar.firstElementChild).backgroundColor };
});
function checkGeometry(g, variant) {
  const border = ['border','rtl','ancestor'].includes(variant) ? 3 : 0;
  near(g.bar.height,300-border*2,'track height'); near(g.thumb.width,8);
  near(g.bar.top,g.box.top+border); near(g.thumb.height,border ? 94 : 100,'thumb');
  near(g.bar.width,variant === 'tokens' ? 14 : 12); assert.equal(g.position,'absolute');
  if (['rtl','ancestor'].includes(variant)) near(g.bar.left,g.box.left+border);
  else near(g.bar.right,g.box.right-border);
  assert.equal(g.z,variant === 'tokens' ? '2' : 'auto');
  if (variant === 'tokens') assert.equal(g.color,'rgb(255, 0, 0)');
  if (variant === 'scrolled') near(g.thumb.top-g.bar.top,100);
}
for (const [engine, type, browserTest] of engines) {
  async function run(body, options = {}) {
    const browser = await leaseBrowser(type);
    const page = await browser.newPage({ viewport:{ width:600, height:500 }, ...options });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try { await body(page); assert.deepEqual(errors, []); }
    finally { await destroy(page).catch(() => {}); await browser.close(); }
  }
  browserTest(`V2 wrapper keeps layout across media (${engine})`, () => run(async page => {
    const layouts = [
      ['display:block', 'margin:16px auto;max-inline-size:12rem'],
      ['display:flex;flex-direction:column;height:400px', 'flex:1;min-block-size:0'],
      ['display:grid;grid-template-areas:"before" "box" "after";height:400px', 'grid-area:box'],
      ['', ''], ['height:400px', 'block-size:50%'], ['position:relative;height:400px', 'position:absolute;inset:20px'],
    ];
    for (const [index, [hostStyle, boxStyle]] of layouts.entries()) {
      await setup(page, `<div id="host" class="host ${index === 3 ? 'row' : ''}" style="${hostStyle}"><p id="before">Before</p><div id="box" class="scroll-area custom ${index === 3 ? 's6' : ''}" style="inline-size:240px;${boxStyle}"><div style="height:900px"></div></div><p id="after">After</p></div>`, '.host > div:not(.scroll-area){display:flex;padding:8px;margin:8px}');
      const rects = () => page.evaluate(() => ['before','box','after'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); return [r.x,r.y,r.width,r.height]; }));
      for (const media of [{ media:'screen',forcedColors:'none' }, ...(engine === 'webkit' ? [] : [{ forcedColors:'active' }]), { media:'print',forcedColors:'none' }]) {
        await page.emulateMedia(media);
        const before = await rects(); await init(page); await frames(page);
        const after = await rects();
        assert.equal(await page.locator('.scroll-area-wrapper').evaluate(el => getComputedStyle(el).display), 'contents');
        before.flat().forEach((n,i) => assert.ok(Math.abs(n-after.flat()[i]) <= .5, `layout ${index} ${i}: ${n} vs ${after.flat()[i]}`));
        await destroy(page); const restored = await rects();
        before.flat().forEach((n,i) => assert.ok(Math.abs(n-restored.flat()[i]) <= .5));
      }
    }
  }));
  browserTest(`V3 preserves scroll, focus and accessible region (${engine})`, () => run(async page => {
    await setup(page, fixture.replace('class="scroll-area custom"', 'class="scroll-area custom" tabindex="0" role="region" aria-label="Tags"').replace('id="content" style="block-size:900px"', 'id="content" style="block-size:900px;inline-size:600px"').replace('</div></div><p', '<button id="focus">Focus</button></div></div><p'), '#box{scroll-behavior:smooth}');
    for (const focus of ['#focus','#box']) {
      await page.evaluate(focus => { const el = document.querySelector('#box'); document.querySelector(focus).focus({preventScroll:true}); el.scrollTo({top:150,left:20,behavior:'instant'}); }, focus);
      for (const change of [init,destroy]) {
        await change(page); await frames(page);
        for (const delay of [0,300]) {
          if (delay) await page.waitForTimeout(delay);
          assert.deepEqual(await page.evaluate(() => [box.scrollTop,box.scrollLeft,document.activeElement.id]), [150,20,focus.slice(1)]);
          assert.equal(await page.getByRole('region',{name:'Tags'}).count(),1);
        }
      }
    }
  }));
  browserTest(`V4 container geometry, direction, tokens and initial offset (${engine})`, () => run(async page => {
    for (const variant of ['plain','border','rtl','ancestor','tokens','scrolled']) {
      await setup(page);
      await page.evaluate(variant => {
        if (['border','rtl','ancestor'].includes(variant)) box.style.cssText += ';border:3px solid;padding:10px';
        if (variant === 'rtl') box.dir = 'rtl';
        if (variant === 'ancestor') host.dir = 'rtl';
        if (variant === 'tokens') box.style.cssText += ';--scroll-area-bar-size:14px;--scroll-area-thumb-color:rgb(255,0,0);position:relative;z-index:2';
        if (variant === 'scrolled') box.scrollTop = 300;
      }, variant);
      await init(page); await frames(page);
      checkGeometry(await geometry(page),variant);
      await page.evaluate(() => box.scrollTop = box.scrollHeight); await frames(page);
      const end = await geometry(page); near(end.thumb.bottom,end.bar.bottom,'end'); await destroy(page);
    }
  }));
  browserTest(`V5 container thumb follows only its own scroll (${engine})`, () => run(async page => {
    await setup(page); await init(page); await frames(page);
    await page.evaluate(() => scrollTo(0,200)); await frames(page);
    let g = await geometry(page); near(g.thumb.top-g.bar.top,0);
    await page.evaluate(() => box.scrollTop = 300); await frames(page);
    g = await geometry(page); near(g.thumb.top-g.bar.top,100);
  }));
  browserTest(`V6 anchors follow layout and unpositioned ancestor scrolling (${engine})`, () => run(async page => {
    await setup(page, `<div id="scroller" style="height:400px;overflow:auto">${fixture}<div style="height:1200px"></div></div>`);
    await init(page); await frames(page);
    for (const mutation of [() => before.style.height = '80px', () => scroller.scrollTop = 50, () => {host.style.width='300px';box.style.inlineSize='100%';}]) {
      await page.evaluate(mutation); await frames(page); const g = await geometry(page);
      near(g.bar.top,g.box.top); near(g.bar.bottom,g.box.bottom); near(g.bar.right,g.box.right);
    }
  }));
  browserTest(`V7 measurements track content, hidden boxes and moved containers (${engine})`, () => run(async page => {
    await setup(page); await init(page); await frames(page);
    await page.evaluate(() => content.style.height='1800px'); await frames(page); near((await geometry(page)).thumb.height,50);
    await page.evaluate(() => box.insertAdjacentHTML('beforeend','<div style="height:600px"></div>')); await frames(page); near((await geometry(page)).thumb.height,48);
    await page.evaluate(() => box.replaceChildren()); await frames(page); assert.equal((await geometry(page)).hidden,true);
    await page.evaluate(() => box.innerHTML='<div style="height:900px"></div>'); await frames(page); near((await geometry(page)).thumb.height,100);
    await page.evaluate(() => box.style.blockSize='150px'); await frames(page); near((await geometry(page)).thumb.height,48);
    for (const prop of ['overflowY','visibility']) {
      await page.evaluate(prop => {box.style[prop]=prop==='visibility'?'hidden':'hidden';area.refresh();},prop); assert.equal((await geometry(page)).hidden,true);
      await page.evaluate(prop => {box.style[prop]='';area.refresh();},prop); assert.equal((await geometry(page)).hidden,false);
    }
    // Read in the next frame, before ResizeObserver's queued measurement.
    const lost = await page.evaluate(() => new Promise(resolve => {
      box.style.display='none';
      requestAnimationFrame(() => {const bar=document.querySelector('.scroll-area-bar');resolve([bar.getBoundingClientRect().height,bar.firstElementChild.getBoundingClientRect().height]);});
    }));
    assert.deepEqual(lost,[0,0]);
    await page.evaluate(() => {box.style.display='';area.refresh();host.append(box);area.refresh();});
    assert.equal(await page.locator('.scroll-area-bar').evaluate(el => el.hidden),true);
    await destroy(page);
    await setup(page, `<dialog><section>${box}</section></dialog>`);
    await init(page); assert.equal((await geometry(page)).hidden,true);
    await page.evaluate(() => {content.style.height='1800px';document.querySelector('dialog').show();}); await frames(page);
    assert.equal((await geometry(page)).hidden,false);
    near(await page.locator('.scroll-area-thumb').evaluate(el => parseFloat(getComputedStyle(el).blockSize)),50);
  }));

}
