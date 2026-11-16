import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines, leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const near = (a, b, label = '') => assert.ok(Math.abs(a - b) <= 1, `${label}: ${a}, expected ${b}`);
const box = '<div id="box" class="scroll-area custom" style="height:300px;width:240px"><div id="content" style="height:900px;width:720px"></div></div>';
async function setup(page, html = box, extra = '', dir = 'ltr', root = false) {
  await page.setContent(`<!doctype html><html dir="${dir}" class="${root ? 'scroll-area custom' : ''}"><head><style>${css}\nbody{margin:0}${extra}</style></head><body>${html}</body></html>`);
  await page.evaluate(() => scrollTo(0, 0));
  await page.addScriptTag({content:js});
}
const init = (page, root = false) => page.evaluate(root => { window.area = Expressive.ScrollArea.init(root ? document.documentElement : document.querySelector('#box')); }, root);
const destroy = page => page.evaluate(() => window.area?.destroy());
const geometry = page => page.evaluate(() => {
  const rect = el => { const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}; };
  const el=window.area.el;
  const bars=[...el.parentNode.querySelectorAll(':scope > .scroll-area-bar')];
  const own=el===document.documentElement?[...el.querySelectorAll(':scope > .scroll-area-bar')]:bars;
  return {box:rect(el),client:[el.clientHeight,el.clientWidth],size:[el.scrollHeight,el.scrollWidth],scroll:[el.scrollTop,el.scrollLeft],bars:own.map(bar=>({bar:rect(bar),thumb:rect(bar.firstElementChild),hidden:bar.hidden,display:getComputedStyle(bar).display,position:getComputedStyle(bar).position,z:getComputedStyle(bar).zIndex,touch:getComputedStyle(bar).touchAction,color:getComputedStyle(bar.firstElementChild).backgroundColor}))};
});
function corner(g, width, dir, page = false) {
  const bottom=page?500:g.box.bottom;
  const end=page?(dir==='rtl'?0:600):(dir==='rtl'?g.box.left:g.box.right);
  return {left:dir==='rtl'?end:end-width,right:dir==='rtl'?end+width:end,top:bottom-width,bottom};
}
const intersects = (a,b) => a.left < b.right-.5 && a.right > b.left+.5 && a.top < b.bottom-.5 && a.bottom > b.top+.5;
for (const [engine,type,browserTest] of engines) {
  async function run(body, options={}) {
    const browser=await leaseBrowser(type),page=await browser.newPage({viewport:{width:600,height:500},...options});const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    try {await body(page);assert.deepEqual(errors,[]);} finally {await page.mouse.up().catch(()=>{});await page.evaluate(()=>{window.areas?.forEach(a=>a.destroy());window.shadowArea?.destroy();}).catch(()=>{});await destroy(page).catch(()=>{});await browser.close();}
  }
  for (const dir of ['ltr', 'rtl']) for (const path of ['native', 'listener', 'reduced']) {
    browserTest(`horizontal V2 page geometry ${dir} ${path} (${engine})`, () => run(async page => {
      const styles = { native: '', listener: '.scroll-area-thumb{animation:none!important}', reduced: '' };
      await setup(page, '<div id="content" style="height:1500px;width:1800px"></div>', styles[path], dir, true);
      if (path === 'listener') await page.evaluate(() => { const supports = CSS.supports.bind(CSS); CSS.supports = (...args) => args[0].includes('animation-timeline') ? false : supports(...args); });
      await page.emulateMedia({ reducedMotion: { reduced: 'reduce', native: 'no-preference', listener: 'no-preference' }[path] });
      await init(page, true); await frames(page);
      let g = await geometry(page); const h = g.bars[1];
      near(h.bar.width, 588); near(h.bar.height, 12); near(h.bar.bottom, 500); near(h.thumb.height, 8); near(h.thumb.width, 196); near(h.thumb.top - h.bar.top, 2);
      assert.equal(h.position, 'fixed'); assert.equal(h.z, g.bars[0].z); assert.equal(h.touch, 'none');
      const start = { ltr: 'left', rtl: 'right' }[dir], end = { ltr: 'right', rtl: 'left' }[dir];
      near(h.thumb[start], h.bar[start], 'start');
      for (const progress of [1, .5]) {
        await page.evaluate(({ dir, progress }) => scrollTo(({ ltr: 1, rtl: -1 })[dir] * 1200 * progress, 0), { dir, progress }); await frames(page); g = await geometry(page);
        near(g.bars[1].thumb.left - g.bars[1].bar.left, ({ ltr: progress, rtl: 1 - progress })[dir] * 392, 'progress');
      }
      await destroy(page); await page.evaluate(dir => scrollTo(({ ltr: 1, rtl: -1 })[dir] * 1200, 0), dir);
      await init(page, true); await frames(page); g = await geometry(page); near(g.bars[1].thumb[end], g.bars[1].bar[end], 'initial offset');
    }));
  }
  for (const variant of ['plain', 'border', 'rtl', 'ancestor', 'tokens', 'scrolled']) {
    browserTest(`horizontal V3 container geometry ${variant} (${engine})`, () => run(async page => {
      await setup(page, box.replace('height:900px', 'height:100px'));
      await page.evaluate(variant => {
        const styles = { plain: '', border: 'border:3px solid;padding:10px', rtl: 'border:3px solid;padding:10px;direction:rtl', ancestor: 'border:3px solid;padding:10px', tokens: '--scroll-area-bar-size:14px;--scroll-area-thumb-color:rgb(255,0,0);position:relative;z-index:2', scrolled: '' };
        box.style.cssText += `;${styles[variant]}`;
        if (variant === 'ancestor') document.body.dir = 'rtl';
        if (variant === 'scrolled') box.scrollLeft = 240;
      }, variant);
      await init(page); await frames(page); let g = await geometry(page); const h = g.bars[1];
      const border = { plain: 0, border: 3, rtl: 3, ancestor: 3, tokens: 0, scrolled: 0 }[variant];
      const rtl = ['rtl', 'ancestor'].includes(variant), edge = rtl ? 'left' : 'right';
      near(h.bar.left, g.box.left + border); near(h.bar.right, g.box.right - border); near(h.bar.bottom, g.box.bottom - border);
      near(h.bar.height, variant === 'tokens' ? 14 : 12); near(h.thumb.height, 8); assert.equal(h.position, 'absolute'); assert.equal(g.bars[0].hidden, true);
      near(h.thumb.width, g.client[1] * g.client[1] / g.size[1]);
      assert.equal(h.z, variant === 'tokens' ? '2' : 'auto');
      if (variant === 'tokens') assert.equal(h.color, 'rgb(255, 0, 0)');
      const expected = g.scroll[1] / (g.size[1] - g.client[1]);
      near(h.thumb.left - h.bar.left, (rtl ? 1 + expected : expected) * (h.bar.width - h.thumb.width));
      await page.evaluate(rtl => box.scrollLeft = rtl ? -9999 : 9999, rtl); await frames(page); g = await geometry(page); near(g.bars[1].thumb[edge], g.bars[1].bar[edge]);
    }));
  }
  for (const root of [false, true]) for (const dir of ['ltr', 'rtl']) for (const size of ['12px', '20px', '1rem']) {
    browserTest(`horizontal V4 corner ${root ? 'page' : 'container'} ${dir} ${size} (${engine})`, () => run(async page => {
      await setup(page, root ? '<div id="content" style="height:1500px;width:1800px"></div>' : box, `:root{font-size:16px;--scroll-area-bar-size:${size}}`, dir, root);
      await init(page, root); await frames(page); const width = { '12px': 12, '20px': 20, '1rem': 16 }[size];
      for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1], [.5, .5]]) {
        await page.evaluate(({ root, dir, x, y }) => { const el = root ? document.documentElement : box; el.scrollTo({ left: ({ ltr: 1, rtl: -1 })[dir] * (el.scrollWidth - el.clientWidth) * x, top: (el.scrollHeight - el.clientHeight) * y, behavior: 'instant' }); }, { root, dir, x, y }); await frames(page);
        const g = await geometry(page), c = corner(g, width, dir, root);
        near(g.bars[0].bar.height, g.client[0] - width); near(g.bars[1].bar.width, g.client[1] - width);
        near(g.bars[0].thumb.height, Math.max(48, (g.client[0] - width) * g.client[0] / g.size[0])); near(g.bars[1].thumb.width, Math.max(48, (g.client[1] - width) * g.client[1] / g.size[1]));
        assert.equal(g.bars.some(b => [b.bar, b.thumb].some(rect => intersects(rect, c))), false, JSON.stringify({ g, c }));
        const cx = (c.left + c.right) / 2, cy = (c.top + c.bottom) / 2;
        assert.equal(await page.evaluate(({ cx, cy }) => !!document.elementFromPoint(cx, cy)?.closest('.scroll-area-bar'), { cx, cy }), false);
        await page.mouse.click(cx, cy); await frames(page); assert.deepEqual((await geometry(page)).scroll, g.scroll);
      }
      await page.evaluate(() => { content.style.width = '100px'; area.refresh(); }); await frames(page); let g = await geometry(page); assert.equal(g.bars[1].hidden, true); near(g.bars[0].bar.height, g.client[0]);
      await page.evaluate(() => { content.style.width = '1800px'; area.refresh(); }); await frames(page); g = await geometry(page); near(g.bars[0].bar.height, g.client[0] - width);
    }));
  }
  browserTest(`horizontal V4 growing and media-hidden page measures the first visible corner (${engine})`,()=>run(async page=>{
    for(const forced of engine==='webkit'?[false]:[false,true]) {
      await setup(page,'<div id="content" style="height:400px;width:1800px"></div>','', 'ltr',true);
      if(forced)await page.emulateMedia({forcedColors:'active'});
      await init(page,true);await frames(page);let g=await geometry(page);near(g.bars[1].bar.width,forced?0:600);near(parseFloat(await page.locator('.horizontal').evaluate(el=>el.style.getPropertyValue('--scroll-area-thumb-length'))),200);
      await page.evaluate(()=>content.style.height='1500px');await frames(page);if(forced)await page.emulateMedia({forcedColors:'none'});await page.evaluate(()=>scrollTo(1200,0));await frames(page);g=await geometry(page);near(g.bars[1].bar.width,588);near(g.bars[1].thumb.width,196);near(g.bars[1].thumb.right,g.bars[1].bar.right);await destroy(page);
    }
  }));
  browserTest(`horizontal V5 anchors follow layout, sticky position and missing boxes (${engine})`,()=>run(async page=>{
    await setup(page,`<div id="scroller" style="height:400px;width:400px;overflow:auto"><div id="before"></div>${box}<div style="height:1200px;width:1200px"></div></div>`);await init(page);await frames(page);
    for(const change of [()=>before.style.height='40px',()=>scroller.scrollTo(50,50),()=>box.style.width='200px']) {await page.evaluate(change);await frames(page);const g=await geometry(page);near(g.bars[1].bar.bottom,g.box.bottom);near(g.bars[1].bar.left,g.box.left);near(g.bars[1].bar.width,g.client[1]-12);}
    await destroy(page);await setup(page,`<div id="scroller" style="height:300px;overflow:auto;position:relative"><div style="height:150px"></div>${box}<div style="height:1200px"></div></div>`,'#box{position:sticky;top:0}');await init(page);
    for(const top of [0,100,200,400]) {await page.evaluate(top=>scroller.scrollTop=top,top);await frames(page);const g=await geometry(page);near(g.bars[1].bar.bottom,g.box.bottom);}
    const areas=await page.evaluate(()=>new Promise(resolve=>{box.style.display='none';requestAnimationFrame(()=>resolve([...box.parentElement.querySelectorAll('.scroll-area-bar,.scroll-area-thumb')].map(el=>{const r=el.getBoundingClientRect();return r.width*r.height;})));}));assert.deepEqual(areas,[0,0,0,0]);
  }));
  browserTest(`horizontal V5 framework scrolling bodies clip the anchored bottom bar (${engine})`,()=>run(async page=>{
    const inner='<div style="height:400px"></div>'+box+'<div style="height:1200px"></div>';
    for(const html of [`<div class="scaffold" style="height:400px"><main id="scroller">${inner}</main></div>`,`<dialog open style="height:400px"><h2>Title</h2><div id="scroller">${inner}</div></dialog>`,`<div class="panes" style="height:400px"><div class="pane"><header>Title</header><section id="scroller">${inner}</section></div></div>`,`<div id="scroller" style="height:300px;overflow:auto;position:relative">${inner}</div>`]) {
      await setup(page,html,'dialog{transition:none}');await init(page);await frames(page);
      const hit=await page.evaluate(()=>{const owner=scroller.getBoundingClientRect();scroller.scrollTop=box.getBoundingClientRect().bottom-owner.bottom-100;const bar=box.parentElement.querySelector('.horizontal'),r=bar.getBoundingClientRect();return {below:r.top>owner.bottom,hit:!!document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('.scroll-area-bar')};});assert.equal(hit.below,true);assert.equal(hit.hit,false);await destroy(page);
    }
  }));
  browserTest(`horizontal V6 independent axes, visibility and native bars (${engine})`,()=>run(async page=>{
    for(const [width,height,overflow,expected] of [[720,900,'auto',[false,false]],[720,100,'auto',[true,false]],[100,900,'auto',[false,true]],[100,100,'auto',[true,true]],[720,900,'hidden',[false,true]]]) {
      await setup(page);await page.evaluate(({width,height,overflow})=>{content.style.width=`${width}px`;content.style.height=`${height}px`;box.style.overflowX=overflow;},{width,height,overflow});await init(page);await frames(page);
      let g=await geometry(page);assert.deepEqual(g.bars.map(b=>b.hidden),expected);if(engine!=='firefox')assert.equal(await page.locator('#box').evaluate(el=>getComputedStyle(el).scrollbarWidth),expected.every(Boolean)?'thin':'none');
      await page.evaluate(()=>{box.style.visibility='hidden';area.refresh();});assert.deepEqual((await geometry(page)).bars.map(b=>b.hidden),[true,true]);await page.evaluate(()=>{box.style.visibility='';area.refresh();});assert.deepEqual((await geometry(page)).bars.map(b=>b.hidden),expected);
      await page.evaluate(()=>{content.style.cssText='width:100px;height:100px';});await frames(page);assert.deepEqual((await geometry(page)).bars.map(b=>b.hidden),[true,true]);await destroy(page);
    }
    await setup(page,`<section>${box}</section>`);await init(page);await page.evaluate(()=>{document.body.append(box);area.refresh();});assert.equal(await page.locator('.scroll-area-bar').evaluateAll(bars=>bars.every(bar=>bar.hidden)),true);await destroy(page);
    await setup(page,`<dialog>${box}</dialog>`);await init(page);assert.deepEqual((await geometry(page)).bars.map(b=>b.hidden),[true,true]);await page.evaluate(()=>document.querySelector('dialog').show());await frames(page);assert.deepEqual((await geometry(page)).bars.map(b=>b.hidden),[false,false]);await destroy(page);
    await setup(page,'<div style="height:1500px;width:1800px"></div><dialog></dialog>','', 'ltr',true);await init(page,true);await page.evaluate(()=>document.querySelector('dialog').showModal());assert.deepEqual((await geometry(page)).bars.map(b=>b.display),['none','none']);
  }));
  browserTest(`horizontal V7 transitions settle and scroll does not toggle an idle bar (${engine})`,()=>run(async page=>{
    await setup(page);await init(page);
    for(const [width,height,expected] of [[100,100,[true,true]],[720,100,[true,false]],[720,900,[false,false]],[100,100,[true,true]]]) {
      await page.evaluate(({width,height})=>{content.style.width=`${width}px`;content.style.height=`${height}px`;},{width,height});await frames(page);await frames(page);
      const samples=await page.evaluate(()=>new Promise(resolve=>{let calls=0;const refresh=area.refresh;area.refresh=function(){calls++;return refresh.call(this)};const rows=[];const tick=()=>{rows.push([...box.parentElement.querySelectorAll('.scroll-area-bar')].map(b=>b.hidden));if(rows.length<12)requestAnimationFrame(tick);else{area.refresh=refresh;resolve({calls,rows});}};requestAnimationFrame(tick);}));assert.equal(samples.calls,0);for(const row of samples.rows)assert.deepEqual(row,expected);
    }
    for(const sideways of [false,true]) {
      await page.evaluate(sideways=>{content.style.cssText=sideways?'width:720px;height:100px':'width:100px;height:900px';},sideways);await frames(page);await frames(page);
      const count=await page.evaluate(sideways=>new Promise(resolve=>{let count=0,i=0;const observer=new MutationObserver(records=>count+=records.length);for(const bar of box.parentElement.querySelectorAll('.scroll-area-bar'))observer.observe(bar,{attributes:true,attributeFilter:['hidden']});const tick=()=>{box[sideways?'scrollLeft':'scrollTop']+=10;if(++i<12)requestAnimationFrame(tick);else requestAnimationFrame(()=>{observer.disconnect();resolve(count)});};requestAnimationFrame(tick);}),sideways);assert.equal(count,0,sideways?'sideways idle bar':'upright idle bar');
    }
  }));
  for (const root of [false, true]) for (const mode of ['no-instance', 'destroy', 'custom', 'print', ...(engine === 'webkit' ? [] : ['forced']), ...(!root ? ['unsupported'] : [])]) {
    browserTest(`horizontal V8 ${root ? 'page' : 'container'} ${mode} keeps native access (${engine})`, () => run(async page => {
      await setup(page, root ? '<div id="content" style="height:1500px;width:1800px"></div>' : box, '', 'ltr', root);
      if (mode === 'unsupported') await page.evaluate(() => CSS.supports = () => false);
      if (mode !== 'no-instance') await init(page, root);
      const changes = {
        destroy: () => destroy(page), custom: () => page.evaluate(root => (root ? document.documentElement : box).classList.remove('custom'), root),
        print: () => page.emulateMedia({ media: 'print' }), forced: () => page.emulateMedia({ forcedColors: 'active' }),
      };
      await changes[mode]?.();
      const state = await page.evaluate(root => {
        const el = root ? document.documentElement : box; el.scrollTo(100, 100);
        return { bars: [...document.querySelectorAll('.scroll-area-bar')].map(b => getComputedStyle(b).display), native: getComputedStyle(el).scrollbarWidth, offset: [el.scrollLeft, el.scrollTop] };
      }, root);
      assert.equal(state.bars.every(display => display === 'none'), true, mode);
      if (engine !== 'firefox') assert.notEqual(state.native, 'none');
      assert.deepEqual(state.offset, [100, 100]); await page.mouse.move(100, 100); await page.mouse.wheel(60, 0);
      await page.waitForFunction(root => (root ? document.documentElement : box).scrollLeft > 100, root);
      await page.emulateMedia({ media: 'screen', forcedColors: 'none' });
    }));
  }
  if(engine==='chromium')browserTest('horizontal V8 coarse primary pointer keeps both axes native',()=>run(async page=>{await setup(page);await init(page);assert.deepEqual((await geometry(page)).bars.map(b=>b.display),['none','none']);await page.evaluate(()=>box.scrollTo(100,100));assert.deepEqual(await page.locator('#box').evaluate(el=>[el.scrollLeft,el.scrollTop]),[100,100]);},{hasTouch:true,isMobile:true}));
  browserTest(`horizontal V9 resize and refresh update both tracks (${engine})`,()=>run(async page=>{
    await setup(page,box.replace('height:900px','height:100px'));await init(page);await frames(page);
    for(const [change,length,track] of [[()=>box.style.width='200px',200*200/720,200],[()=>content.style.width='1440px',48,200],[()=>{box.style.width='240px';content.style.width='720px';box.insertAdjacentHTML('beforeend','<div style="height:900px;width:720px"></div>');},76,228]]){await page.evaluate(change);await frames(page);const h=(await geometry(page)).bars[1];near(h.thumb.width,length);near(h.bar.width,track);}await destroy(page);
    await setup(page,'<div id="content" style="height:1500px;width:1800px"></div>','', 'ltr',true);await init(page,true);await page.setViewportSize({width:900,height:500});await frames(page);let g=await geometry(page);near(g.bars[1].thumb.width,888*900/1800);await page.evaluate(()=>{content.style.width='2400px';area.refresh();});await frames(page);g=await geometry(page);near(g.bars[1].thumb.width,888*900/2400);
  }));

}
