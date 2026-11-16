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
}
