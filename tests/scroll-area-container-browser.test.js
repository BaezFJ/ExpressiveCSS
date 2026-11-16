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
    finally {
      await page.mouse.up().catch(()=>{});
      await page.evaluate(() => { window.stopWatching?.();window.areas?.forEach(area=>area.destroy());window.shadowArea?.destroy(); }).catch(()=>{});
      await destroy(page).catch(() => {}); await browser.close();
    }
  }
  for (const coarse of (engine === 'chromium' ? [false,true] : [false])) browserTest(`V2 wrapper keeps layout across media (${engine}, coarse=${coarse})`, () => run(async page => {
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
  }, coarse ? {hasTouch:true,isMobile:true} : {}));  browserTest(`V3 preserves scroll, focus and accessible region (${engine})`, () => run(async page => {
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
  browserTest(`V4 container colors retain their color context on refresh (${engine})`, () => run(async page => {
    await setup(page);
    await page.evaluate(() => {
      box.style.colorScheme = 'dark';
      box.style.setProperty('--scroll-area-thumb-color', 'light-dark(red, blue)');
      box.style.setProperty('--scroll-area-track-color', 'light-dark(green, yellow)');
    });
    await init(page);
    const colors = () => page.evaluate(() => {
      const bar = box.nextElementSibling;
      return [getComputedStyle(bar.firstElementChild).backgroundColor, getComputedStyle(bar).backgroundColor,
        getComputedStyle(bar).colorScheme === getComputedStyle(box).colorScheme];
    });
    assert.deepEqual(await colors(), ['rgb(0, 0, 255)', 'rgb(255, 255, 0)', true]);
    await page.evaluate(() => {
      box.style.removeProperty('color-scheme');
      box.style.color = 'rgb(0, 128, 0)';
      box.style.setProperty('--scroll-area-thumb-color', 'currentColor');
      box.style.setProperty('--scroll-area-track-color', 'currentColor');
      area.refresh();
    });
    assert.deepEqual(await colors(), ['rgb(0, 128, 0)', 'rgb(0, 128, 0)', true]);
    if (engine !== 'webkit') {
      await page.emulateMedia({forcedColors:'active'});
      await frames(page);
      await page.emulateMedia({forcedColors:'none'});
      await frames(page);
      assert.deepEqual(await colors(), ['rgb(0, 128, 0)', 'rgb(0, 128, 0)', true]);
    }
    await page.evaluate(() => { box.style.removeProperty('color'); area.refresh(); });
    assert.equal(await page.evaluate(() => getComputedStyle(box.nextElementSibling).color === getComputedStyle(box).color), true);
    await destroy(page);
    await setup(page);
    await page.evaluate(() => {
      box.style.setProperty('--scroll-area-thumb-color', 'light-dark(red, blue)');
      box.style.setProperty('--scroll-area-track-color', 'currentColor');
    });
    await init(page);
    await frames(page);
    await page.evaluate(() => document.documentElement.setAttribute('theme', 'dark'));
    await frames(page);
    let expectedColor = await page.evaluate(() => getComputedStyle(box).color);
    assert.deepEqual(await colors(), ['rgb(0, 0, 255)', expectedColor, true]);
    await page.evaluate(() => { host.style.colorScheme = 'light'; host.style.color = 'rgb(0, 128, 0)'; });
    await frames(page);
    assert.deepEqual(await colors(), ['rgb(255, 0, 0)', 'rgb(0, 128, 0)', true]);
    await page.evaluate(() => { host.style.removeProperty('color'); host.style.removeProperty('color-scheme'); document.documentElement.removeAttribute('theme'); });
    await frames(page);
    expectedColor = await page.evaluate(() => getComputedStyle(box).color);
    assert.deepEqual(await colors(), ['rgb(255, 0, 0)', expectedColor, true]);
    await destroy(page);
    await setup(page);
    await page.evaluate(() => {
      host.style.colorScheme = 'light'; host.style.color = 'black';
      box.style.colorScheme = 'dark'; box.style.color = 'rgb(0, 128, 0)';
      box.style.setProperty('--scroll-area-thumb-color', 'currentColor');
      box.style.setProperty('--scroll-area-track-color', 'currentColor');
    });
    await init(page);
    await page.evaluate(() => { host.style.colorScheme = 'dark'; host.style.color = 'rgb(0, 128, 0)'; });
    await frames(page);
    await page.evaluate(() => box.scrollTop = 1);
    await frames(page);
    await page.evaluate(() => { host.style.colorScheme = 'light'; host.style.color = 'black'; });
    await frames(page);
    assert.deepEqual(await colors(), ['rgb(0, 128, 0)', 'rgb(0, 128, 0)', true]);
    await destroy(page);
    await setup(page);
    await page.emulateMedia({colorScheme:'light'});
    await page.evaluate(() => {
      box.style.color = 'light-dark(red, blue)';
      box.style.setProperty('--scroll-area-thumb-color', 'currentColor');
      box.style.setProperty('--scroll-area-track-color', 'currentColor');
    });
    await init(page);
    await page.evaluate(() => document.documentElement.setAttribute('theme', 'dark'));
    await frames(page);
    assert.deepEqual(await colors(), ['rgb(0, 0, 255)', 'rgb(0, 0, 255)', true]);
    await page.evaluate(() => document.documentElement.removeAttribute('theme'));
    await frames(page);
    assert.deepEqual(await colors(), ['rgb(255, 0, 0)', 'rgb(255, 0, 0)', true]);
    await page.emulateMedia({colorScheme:'dark'});
    await frames(page);
    assert.deepEqual(await colors(), ['rgb(0, 0, 255)', 'rgb(0, 0, 255)', true]);
  }));
  browserTest(`V4 container default thumb follows local theme tokens (${engine})`, () => run(async page => {
    await setup(page);
    await page.evaluate(() => box.style.setProperty('--md-sys-color-on-surface-variant', 'red'));
    await init(page);
    await frames(page);
    const thumb = () => page.evaluate(() => getComputedStyle(box.nextElementSibling.firstElementChild).backgroundColor);
    assert.equal(await thumb(), 'rgb(255, 0, 0)');
    await page.evaluate(() => box.style.setProperty('--md-sys-color-on-surface-variant', 'currentColor'));
    await frames(page);
    assert.equal(await thumb(), await page.evaluate(() => getComputedStyle(box).color));
    await page.evaluate(() => {
      box.style.removeProperty('--md-sys-color-on-surface-variant');
      box.setAttribute('vibrant', '');
    });
    await frames(page);
    const expected = () => page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.backgroundColor = 'var(--md-sys-color-on-surface-variant)';
      box.append(probe);
      try { return getComputedStyle(probe).backgroundColor; }
      finally { probe.remove(); }
    });
    assert.equal(await thumb(), await expected());
    await page.evaluate(() => document.documentElement.setAttribute('theme', 'dark'));
    await frames(page);
    assert.equal(await thumb(), await expected());
    await page.evaluate(() => box.removeAttribute('vibrant'));
    await frames(page);
    assert.equal(await thumb(), await expected());
  }));
  browserTest(`V5 container thumb follows only its own scroll (${engine})`, () => run(async page => {
    await setup(page); await init(page); await frames(page);
    await page.evaluate(() => scrollTo(0,200)); await frames(page);
    let g = await geometry(page); near(g.thumb.top-g.bar.top,0);
    await page.evaluate(() => box.scrollTop = 300); await frames(page);
    g = await geometry(page); near(g.thumb.top-g.bar.top,100);
  }));
  browserTest(`V7 fit and overflow transitions settle without idle measurements (${engine})`, () => run(async page => {
    for (const gutter of ['auto', 'stable both-edges']) {
      await setup(page, fixture, `#box{border:3px solid;padding:10px;scrollbar-gutter:${gutter}}#content{inline-size:900px}`);
      await init(page);
      for (const height of [268, 900, 268]) {
        await page.evaluate(height => content.style.blockSize = `${height}px`, height);
        await frames(page);
        await page.waitForTimeout(100);
        assert.equal((await geometry(page)).hidden, height === 268);
        const idle = await page.evaluate(() => new Promise(resolve => {
          const refresh = area.refresh;
          let calls = 0;
          area.refresh = function() { calls++; return refresh.call(this); };
          setTimeout(() => { area.refresh = refresh; resolve(calls); }, 100);
        }));
        assert.equal(idle, 0, `${gutter}, content height ${height}`);
        assert.equal(await page.evaluate(() => { area.refresh(); return box.nextElementSibling.hidden; }), height === 268);
      }
      await destroy(page);
    }
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
      requestAnimationFrame(() => {const bar=document.querySelector('.scroll-area-bar:not(.horizontal)');resolve([bar.getBoundingClientRect().height,bar.firstElementChild.getBoundingClientRect().height]);});
    }));
    assert.deepEqual(lost,[0,0]);
    await page.evaluate(() => {box.style.display='';area.refresh();host.append(box);area.refresh();});
    assert.equal(await page.locator('.scroll-area-bar:not(.horizontal)').evaluate(el => el.hidden),true);
    await destroy(page);
    await setup(page, `<dialog><section>${box}</section></dialog>`);
    await init(page); assert.equal((await geometry(page)).hidden,true);
    await page.evaluate(() => {content.style.height='1800px';document.querySelector('dialog').show();}); await frames(page);
    assert.equal((await geometry(page)).hidden,false);
    near(await page.locator('.scroll-area-thumb').evaluate(el => parseFloat(getComputedStyle(el).blockSize)),50);
  }));

  browserTest(`V8 native fallback, media and clearance (${engine})`, () => run(async page => {
    await setup(page,fixture+'<div id="native" class="scroll-area custom" style="height:300px;width:240px"><div style="height:900px"></div></div><div id="sideways" class="scroll-area custom" style="height:100px;width:100px"><div style="height:50px;width:500px"></div></div>');
    await page.evaluate(() => {box.insertAdjacentHTML('beforeend','<a class="back-to-top" href="#before">Top</a><div class="fab-menu"><button>Action</button></div>');window.side=Expressive.ScrollArea.init(sideways);});
    await init(page); await frames(page);
    const state = () => page.evaluate(() => [getComputedStyle(box).scrollbarWidth,getComputedStyle(document.querySelector('#box + .scroll-area-bar')).display]);
    assert.deepEqual(await state(),['none','block']);
    if (engine !== 'firefox') assert.deepEqual(await page.evaluate(() => [getComputedStyle(document.querySelector('#native')).scrollbarWidth,getComputedStyle(sideways).scrollbarWidth]),['thin','thin']);
    else {
      const probe=await page.locator('#native').evaluate(el=>{el.style.scrollbarWidth='thin';return [el.style.scrollbarWidth,getComputedStyle(el).scrollbarWidth];});
      console.log('Firefox scrollbar-width probe:',probe);assert.deepEqual(probe,['thin','none']);
      await page.locator('#native').evaluate(el=>el.scrollTop=50);assert.equal(await page.locator('#native').evaluate(el=>el.scrollTop),50);
    }
    assert.deepEqual(await page.evaluate(() => [getComputedStyle(box).getPropertyValue('--scroll-area-bar-clearance'),...['.back-to-top','.fab-menu'].map(s=>getComputedStyle(box.querySelector(s)).insetInlineEnd)]),['','16px','16px']);
    await page.evaluate(() => box.classList.remove('custom'));assert.equal((await state())[1],'none');if (engine !== 'firefox') assert.notEqual((await state())[0],'none');
    await page.evaluate(() => box.classList.add('custom'));assert.deepEqual(await state(),['none','block']);
    for (const media of [...(engine === 'webkit' ? [] : [{forcedColors:'active'}]),{media:'print',forcedColors:'none'}]) {
      await page.emulateMedia(media);assert.equal((await state())[1],'none');if (engine !== 'firefox') assert.notEqual((await state())[0],'none');
    }
    await page.emulateMedia({media:'screen',forcedColors:'none'});await destroy(page);
    if (engine !== 'firefox') assert.equal(await page.locator('#box').evaluate(el=>getComputedStyle(el).scrollbarWidth),'thin');
    await page.evaluate(()=>window.side.destroy());
  }));
  if (engine === 'chromium') browserTest('V2/V8 coarse pointer preserves layout and native bar', () => run(async page => {
    await setup(page);const before=await page.locator('#box').boundingBox();await init(page);
    assert.deepEqual(await page.locator('#box').boundingBox(),before);
    assert.equal(await page.locator('.scroll-area-wrapper').evaluate(el=>getComputedStyle(el).display),'contents');
    assert.equal((await geometry(page)).display,'none');
    assert.notEqual(await page.locator('#box').evaluate(el=>getComputedStyle(el).scrollbarWidth),'none');
  },{hasTouch:true,isMobile:true}));
  for (const owner of ['scaffold','dialog','pane','author']) browserTest(`V16 ${owner} clips a container bar (${engine})`, () => run(async page => {
    await page.setViewportSize({width:1200,height:700});
    const inner = fixture+'<div style="height:1200px"></div>';
    const owners={
      scaffold:`<div class="scaffold" style="height:400px"><main id="scroller">${inner}</main></div>`,
      dialog:`<dialog open style="height:400px"><h2>Title</h2><div id="scroller">${inner}</div></dialog>`,
      pane:`<div class="panes" style="height:400px"><div class="pane"><header>Title</header><section id="scroller">${inner}</section></div></div>`,
      author:`<div id="scroller" style="height:300px;overflow:auto;position:relative">${inner}</div>`,
    };
    await setup(page,'<div style="height:150px"></div>'+owners[owner],'dialog{transition:none}');
    const baseline=await page.locator('#scroller').evaluate(el=>getComputedStyle(el).position);
    await init(page);await frames(page);
    const result=await page.evaluate(()=>{
      const ancestor=scroller.getBoundingClientRect();const r=box.getBoundingClientRect();scroller.scrollTop=r.top-ancestor.top+100;
      const b=document.querySelector('#box + .scroll-area-bar').getBoundingClientRect();
      const hit=y=>document.elementFromPoint(b.x+b.width/2,y)?.closest('.scroll-area-bar')!==null;
      return {position:getComputedStyle(scroller).position,above:hit(ancestor.top-50),below:hit(ancestor.top+50)};
    });
    console.log(`V16 ${engine} ${owner} baseline ${baseline}, active ${result.position}`);
    assert.notEqual(result.position,'static');assert.equal(result.above,false);assert.equal(result.below,true);
    await destroy(page);assert.equal(await page.locator('#scroller').evaluate(el=>getComputedStyle(el).position),baseline);
  }));
  browserTest(`V17 unsupported anchor window keeps native markup (${engine})`, () => run(async page => {
    await setup(page);await page.evaluate(()=>CSS.supports=()=>false);await init(page);
    assert.equal(await page.locator('.scroll-area-wrapper').count(),0);assert.equal(await page.locator('#host > #box').count(),1);
    if (engine !== 'firefox') assert.equal(await page.locator('#box').evaluate(el=>getComputedStyle(el).scrollbarWidth),'thin');await destroy(page);
  }));
  browserTest(`V6 sticky anchor probe (${engine})`, () => run(async page => {
    await setup(page,`<div id="scroller" style="height:300px;overflow:auto;position:relative"><div style="height:150px"></div>${box}<div style="height:1200px"></div></div>`,'#box{position:sticky;top:0}');
    await init(page);
    const differences=[];
    for (const top of [0,100,200,400]) {await page.evaluate(top=>scroller.scrollTop=top,top);await frames(page);const g=await geometry(page);differences.push(g.bar.top-g.box.top);}
    console.log(`Sticky ${engine}: ${JSON.stringify(differences)}`);
    differences.forEach(difference=>near(difference,0,'sticky edge'));
  }));

  browserTest(`V9 drag, track press, capture and selection (${engine})`, () => run(async page => {
    await setup(page,'<input id="field" class="browser-default" value="Selected text">'+fixture);
    await init(page);await frames(page);
    const selected=await page.evaluate(()=>{field.focus({preventScroll:true});field.setSelectionRange(1,8);return [document.activeElement.id,field.selectionStart,field.selectionEnd,getSelection().toString()];});
    const g=await geometry(page),x=g.bar.left+6,y=g.bar.top;
    await page.locator('#box + .scroll-area-bar').evaluate(bar=>{bar.addEventListener('pointermove',e=>window.delivered=[e.clientX,e.clientY]);bar.addEventListener('contextmenu',e=>window.contextCancelled=e.defaultPrevented);});
    await page.mouse.move(x,y+50);await page.mouse.down();
    for(const [at,expected,offset] of [[150,300,100],[250,600,200],[290,600,200],[50,0,0]]) {
      await page.mouse.move(x,y+at,{steps:5});await frames(page);near(await page.locator('#box').evaluate(el=>el.scrollTop),expected);
      const now=await geometry(page);near(now.thumb.top-now.bar.top,offset);assert.equal(await page.evaluate(()=>scrollY),0);
    }
    await page.mouse.move(x-100,y+100,{steps:3});await frames(page);near(await page.locator('#box').evaluate(el=>el.scrollTop),150);
    if(engine!=='firefox') {
      await page.mouse.move(-40,y+150,{steps:3});await frames(page);assert.deepEqual(await page.evaluate(()=>window.delivered),[-40,y+150]);near(await page.locator('#box').evaluate(el=>el.scrollTop),300);
      await page.mouse.up();await page.mouse.move(x,y+250);await frames(page);near(await page.locator('#box').evaluate(el=>el.scrollTop),300);
    } else await page.mouse.up();
    for(const [start,at] of [[0,250],[600,20]]) {
      await page.locator('#box').evaluate((el,start)=>el.scrollTop=start,start);await frames(page);await page.mouse.click(x,y+at);await frames(page);near(await page.locator('#box').evaluate(el=>el.scrollTop),300);
    }
    await page.locator('#box').evaluate(el=>el.scrollTop=0);await frames(page);
    await page.mouse.move(x,y+250);await page.mouse.down();await page.waitForTimeout(1500);await page.mouse.up();near(await page.locator('#box').evaluate(el=>el.scrollTop),300);
    assert.deepEqual(await page.evaluate(()=>[document.activeElement.id,field.selectionStart,field.selectionEnd,getSelection().toString()]),selected);
    assert.equal(await page.locator('#before').evaluate(el=>getSelection().containsNode(el,true)),false);
    await page.mouse.click(x,y+250,{button:'right'});near(await page.locator('#box').evaluate(el=>el.scrollTop),300);
    assert.equal(await page.evaluate(()=>window.contextCancelled),false);
    await page.locator('#box').evaluate(el=>{el.style.scrollBehavior='smooth';el.scrollTo({top:0,behavior:'instant'});});await frames(page);
    await page.mouse.move(x,y+50);await page.mouse.down();await page.mouse.move(x,y+150,{steps:4});await frames(page);near(await page.locator('#box').evaluate(el=>el.scrollTop),300);await page.mouse.up();
  }));
  browserTest(`V9 bar gestures leave ancestor links and click handlers inactive (${engine})`, () => run(async page => {
    await setup(page, `<a id="link" href="#target"><section>${box}</section></a><p id="target">Target</p>`);
    await page.evaluate(() => {
      window.clicks = 0;
      link.addEventListener('click', () => window.clicks++);
      link.addEventListener('contextmenu', e => window.contextCancelled = e.defaultPrevented);
    });
    await init(page);
    await frames(page);
    const g = await geometry(page), x = g.bar.left + 6, y = g.bar.top;
    await page.mouse.click(x, y + 250);
    near(await page.evaluate(() => box.scrollTop), 300);
    assert.deepEqual(await page.evaluate(() => [location.hash, clicks]), ['', 0]);
    await page.evaluate(() => box.scrollTo({top:0, behavior:'instant'}));
    await frames(page);
    await page.mouse.move(x, y + 50);
    await page.mouse.down();
    await page.mouse.move(x, y + 150, {steps:3});
    await page.mouse.up();
    near(await page.evaluate(() => box.scrollTop), 300);
    assert.deepEqual(await page.evaluate(() => [location.hash, clicks]), ['', 0]);
    await page.mouse.click(x, y + 250, {button:'right'});
    assert.equal(await page.evaluate(() => contextCancelled), false);
    await page.mouse.click(g.box.left + 20, y + 20);
    assert.deepEqual(await page.evaluate(() => [location.hash, clicks]), ['#target', 1]);
  }));
  browserTest(`V11 wheel over bar scrolls container then chains (${engine})`, () => run(async page => {
    await setup(page);await init(page);await frames(page);const g=await geometry(page);
    await page.mouse.move(g.bar.left+6,g.bar.top+150);await page.mouse.wheel(0,120);
    await page.waitForFunction(()=>box.scrollTop>0);assert.equal(await page.evaluate(()=>scrollY),0);
    await page.locator('#box').evaluate(el=>el.scrollTop=el.scrollHeight);await frames(page);
    await page.mouse.wheel(0,120);await page.waitForFunction(()=>scrollY>0);
  }));
  browserTest(`V12 drag cancels on modal, inert, class and media changes (${engine})`, () => run(async page => {
    for(const state of ['modal','custom','inert','print',...(engine==='webkit'?[]:['forced'])]) {
      await setup(page,fixture+'<dialog>Modal</dialog>','dialog{transition:none}');await init(page);await frames(page);const g=await geometry(page),x=g.bar.left+6,y=g.bar.top;
      await page.mouse.move(x,y+50);await page.mouse.down();await page.mouse.move(x,y+100,{steps:3});await frames(page);near(await page.locator('#box').evaluate(el=>el.scrollTop),150);
      const change=async enabled=>{
        if(state==='print')await page.emulateMedia({media:enabled?'print':'screen'});
        else if(state==='forced')await page.emulateMedia({forcedColors:enabled?'active':'none'});
        else await page.evaluate(({state,enabled})=>{
          if(state==='modal'){const dialog=document.querySelector('dialog');if(enabled)dialog.showModal();else dialog.close();}
          if(state==='custom')box.classList.toggle('custom',!enabled);
          if(state==='inert')host.inert=enabled;
        },{state,enabled});
      };
      await change(true);await frames(page);await page.mouse.move(x,y+200,{steps:3});near(await page.locator('#box').evaluate(el=>el.scrollTop),150);
      await change(false);await frames(page);await page.mouse.move(x,y+250,{steps:3});near(await page.locator('#box').evaluate(el=>el.scrollTop),150);await page.mouse.up();await destroy(page);
    }
    await setup(page,`<dialog><section>${box}</section></dialog>`,'dialog{transition:none}');await page.evaluate(()=>document.querySelector('dialog').showModal());await init(page);await frames(page);const g=await geometry(page);
    await page.mouse.move(g.bar.left+6,g.bar.top+50);await page.mouse.down();await page.mouse.move(g.bar.left+6,g.bar.top+150,{steps:3});await frames(page);near(await page.locator('#box').evaluate(el=>el.scrollTop),300);await page.mouse.up();
  }));
  browserTest(`V13 destroying a captured container stops the drag (${engine})`, () => run(async page => {
    await setup(page);await init(page);await frames(page);const g=await geometry(page);
    await page.mouse.move(g.bar.left+6,g.bar.top+50);await page.mouse.down();await destroy(page);await page.mouse.move(g.bar.left+6,g.bar.top+150);await page.mouse.up();assert.equal(await page.locator('#box').evaluate(el=>el.scrollTop),0);
    assert.equal(await page.locator('.scroll-area-wrapper,.scroll-area-bar').count(),0);assert.equal(await page.locator('#host > #box').count(),1);
  }));
  browserTest(`V15 page, nested containers and closed shadow root stay independent (${engine})`, () => run(async page => {
    await setup(page,fixture+box.replaceAll('id="box"','id="other"').replaceAll('id="content"','id="otherContent"'));
    await page.evaluate(()=>{
      document.documentElement.className='scroll-area custom';
      content.innerHTML='<div id="nested" class="scroll-area custom" style="height:300px;width:180px"><div style="height:900px"></div></div>';
      window.areas=[document.documentElement,box,other,nested].map(el=>Expressive.ScrollArea.init(el));
    });await frames(page);
    const names=await page.evaluate(()=>[box,other,nested].map(el=>{const b=el.nextElementSibling.getBoundingClientRect(),r=el.getBoundingClientRect();return [el.style.anchorName,b.right-r.right,b.top-r.top];}));
    assert.equal(new Set(names.map(n=>n[0])).size,3);names.forEach(n=>{near(n[1],0);near(n[2],0);});
    const r=await page.locator('#nested + .scroll-area-bar').boundingBox();await page.mouse.move(r.x+6,r.y+50);await page.mouse.down();await page.mouse.move(r.x+6,r.y+150,{steps:4});await page.mouse.up();await frames(page);
    assert.deepEqual(await page.evaluate(()=>[nested.scrollTop,box.scrollTop,other.scrollTop,scrollY]),[300,0,0,0]);
    await page.evaluate(css=>{
      const host=document.createElement('div');document.body.prepend(host);window.shadow=host.attachShadow({mode:'closed'});const sheet=new CSSStyleSheet();sheet.replaceSync(css);shadow.adoptedStyleSheets=[sheet];
      shadow.innerHTML='<div class="scroll-area custom" style="height:300px;width:240px"><div style="height:900px"></div></div>';
      window.shadowArea=Expressive.ScrollArea.init(shadow.firstElementChild);
    },css);await frames(page);
    const sr=await page.evaluate(()=>{const el=shadow.firstElementChild.firstElementChild,b=el.nextElementSibling.getBoundingClientRect(),r=el.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,difference:b.right-r.right};});
    near(sr.difference,0);near(sr.width,12);await page.mouse.move(sr.x+6,sr.y+50);await page.mouse.down();await page.mouse.move(sr.x+6,sr.y+150,{steps:4});await page.mouse.up();await frames(page);
    assert.equal(await page.evaluate(()=>shadow.firstElementChild.firstElementChild.scrollTop),300);
  }));

  browserTest(`V14 watcher draws once and keeps the same instance (${engine})`, () => run(async page => {
    await setup(page,'<div id="host"></div>');
    await page.evaluate(html=>{window.stopWatching=Expressive.AutoInit(document.body,undefined,{watch:true});host.innerHTML=html;},box);
    await page.waitForFunction(()=>Expressive.ScrollArea.getInstance(box));await frames(page);
    await page.evaluate(()=>window.first=Expressive.ScrollArea.getInstance(box));await frames(page);
    assert.equal(await page.evaluate(()=>first===Expressive.ScrollArea.getInstance(box)),true);assert.equal(await page.locator('.scroll-area-wrapper').count(),1);
    const g=await geometry(page);near(g.bar.height,300);near(g.bar.right,g.box.right);
  }));

  browserTest(`V5 idle container stops measuring (${engine})`, () => run(async page => {
    await setup(page);await page.evaluate(()=>{window.measures=0;const original=getComputedStyle;window.getComputedStyle=function(el,...args){if(el===box)window.measures++;return original.call(this,el,...args);};});
    await init(page);await frames(page);await frames(page);const before=await page.evaluate(()=>measures);
    await frames(page);await frames(page);assert.equal(await page.evaluate(()=>measures),before,'unchanged container must not rearm ResizeObserver every frame');
  }));

  browserTest(`V12 hidden anchor ends capture before the queued measurement (${engine})`, () => run(async page => {
    await setup(page);await init(page);await frames(page);await frames(page);const g=await geometry(page),x=g.bar.left+6,y=g.bar.top;
    await page.mouse.move(x,y+50);await page.mouse.down();await page.mouse.move(x,y+100,{steps:3});await frames(page);near(await page.locator('#box').evaluate(el=>el.scrollTop),150);
    await page.evaluate(()=>{window.savedRAF=requestAnimationFrame;window.requestAnimationFrame=()=>999;box.style.display='none';});
    await page.mouse.move(x,y+200,{steps:3});
    await page.evaluate(()=>box.style.display='');await page.mouse.move(x,y+250,{steps:3});
    near(await page.locator('#box').evaluate(el=>el.scrollTop),150,'hidden anchor must end rather than resume its captured drag');
    await page.evaluate(()=>window.requestAnimationFrame=window.savedRAF);await page.mouse.up();
  }));

  browserTest(`V12 shadow container cancels for class, inert host and a second modal (${engine})`, () => run(async page => {
    await setup(page,'<dialog id="inside"><section><div id="mount"></div></section></dialog><dialog id="outside">Outside</dialog>','dialog{transition:none}');
    await page.evaluate(css=>{window.shadow=mount.attachShadow({mode:'closed'});const sheet=new CSSStyleSheet();sheet.replaceSync(css);shadow.adoptedStyleSheets=[sheet];shadow.innerHTML='<div class="scroll-area custom" style="height:300px;width:240px"><div style="height:900px"></div></div>';inside.showModal();window.shadowArea=Expressive.ScrollArea.init(shadow.firstElementChild);},css);
    for(const state of ['custom','inert','modal']) {
      await page.evaluate(()=>{const el=shadowArea.el;el.scrollTo({top:0,behavior:'instant'});shadowArea.refresh();});await frames(page);
      const r=await page.evaluate(()=>{const r=shadowArea.el.nextElementSibling.getBoundingClientRect();return{x:r.x,y:r.y};});
      await page.mouse.move(r.x+6,r.y+50);await page.mouse.down();await page.mouse.move(r.x+6,r.y+100,{steps:3});await frames(page);near(await page.evaluate(()=>shadowArea.el.scrollTop),150);
      await page.evaluate(state=>{if(state==='custom')shadowArea.el.classList.remove('custom');if(state==='inert')mount.inert=true;if(state==='modal')outside.showModal();},state);await frames(page);
      await page.evaluate(state=>{if(state==='custom')shadowArea.el.classList.add('custom');if(state==='inert')mount.inert=false;if(state==='modal')outside.close();},state);await frames(page);
      await page.mouse.move(r.x+6,r.y+200,{steps:3});await frames(page);near(await page.evaluate(()=>shadowArea.el.scrollTop),150);await page.mouse.up();
    }
  }));

  browserTest(`V7 refresh removes stale container styles and measures direct text changes (${engine})`, () => run(async page => {
    await setup(page);await init(page);
    await page.evaluate(()=>{box.style.cssText+=';direction:rtl;border:3px solid;position:relative;z-index:2;--scroll-area-bar-size:14px;--scroll-area-thumb-color:rgb(255,0,0);--scroll-area-track-color:rgb(0,255,0)';area.refresh();});await frames(page);
    let g=await geometry(page);near(g.bar.width,14);near(g.bar.left,g.box.left+3);assert.equal(g.z,'2');assert.equal(g.color,'rgb(255, 0, 0)');
    await page.evaluate(()=>{for(const name of ['direction','border','position','z-index','--scroll-area-bar-size','--scroll-area-thumb-color','--scroll-area-track-color'])box.style.removeProperty(name);area.refresh();});await frames(page);
    g=await geometry(page);near(g.bar.width,12);near(g.bar.right,g.box.right);assert.equal(g.z,'auto');
    assert.deepEqual(await page.locator('#box + .scroll-area-bar').evaluate(bar=>['z-index','--scroll-area-bar-size','--scroll-area-thumb-color','--scroll-area-track-color'].map(name=>bar.style.getPropertyValue(name))),['','','','']);
    const expected=await page.evaluate(()=>{box.style.whiteSpace='pre';box.replaceChildren(document.createTextNode('Tag'));area.refresh();box.firstChild.data+='\nTag'.repeat(100);area.refresh();return Math.min(box.clientHeight,Math.max(48,box.clientHeight**2/box.scrollHeight));});await frames(page);near((await geometry(page)).thumb.height,expected);
  }));

  browserTest(`V3 closed shadow root restores focused content and container state (${engine})`, () => run(async page => {
    await setup(page,'<div id="mount"></div>');
    await page.evaluate(css=>{window.shadow=mount.attachShadow({mode:'closed'});const sheet=new CSSStyleSheet();sheet.replaceSync(css);shadow.adoptedStyleSheets=[sheet];shadow.innerHTML='<div class="scroll-area custom" tabindex="0" role="region" aria-label="Tags" style="height:300px;width:240px;scroll-behavior:smooth"><div style="height:900px;width:600px"><button>Focus</button></div></div>';window.shadowBox=shadow.firstElementChild;},css);
    for(const contentFocus of [true,false]) {
      await page.evaluate(contentFocus=>{window.focused=contentFocus?shadowBox.querySelector('button'):shadowBox;focused.focus({preventScroll:true});shadowBox.scrollTo({top:150,left:20,behavior:'instant'});},contentFocus);
      for(const change of ['init','destroy']) {
        await page.evaluate(change=>{if(change==='init')window.shadowArea=Expressive.ScrollArea.init(shadowBox);else shadowArea.destroy();},change);await frames(page);
        assert.deepEqual(await page.evaluate(()=>[shadowBox.scrollTop,shadowBox.scrollLeft,shadow.activeElement===focused,document.activeElement===mount,shadowBox.getAttribute('role'),shadowBox.getAttribute('aria-label')]),[150,20,true,true,'region','Tags']);
        await page.waitForTimeout(300);assert.deepEqual(await page.evaluate(()=>[shadowBox.scrollTop,shadowBox.scrollLeft,shadow.activeElement===focused]),[150,20,true]);
      }
    }
  }));

  browserTest(`V3 moves preserve focus in descendant open shadow roots (${engine})`, () => run(async page => {
    await setup(page, fixture.replace('></div></div><p', '><div id="mount"></div></div></div><p'));
    await page.evaluate(() => {
      const outer = mount.attachShadow({mode:'open'});
      outer.innerHTML = '<div></div>';
      window.focusRoot = outer.firstElementChild.attachShadow({mode:'open'});
      focusRoot.innerHTML = '<button>Focus</button>';
      focusRoot.firstElementChild.focus({preventScroll:true});
    });
    for (const change of [init, destroy]) {
      await change(page);
      assert.equal(await page.evaluate(() => focusRoot.activeElement === focusRoot.firstElementChild), true);
    }
  }));

  browserTest(`V3 focus restoration permits a listener to destroy the instance (${engine})`, () => run(async page => {
    await setup(page, '<div id="box" class="scroll-area custom"><input id="field"></div>');
    await page.evaluate(() => {
      field.focus();
      field.addEventListener('focus', () => Expressive.ScrollArea.getInstance(box)?.destroy());
      window.area = Expressive.ScrollArea.init(box);
    });
    assert.equal(await page.locator('.scroll-area-wrapper,.scroll-area-bar').count(), 0);
    assert.equal(await page.evaluate(() => Expressive.ScrollArea.getInstance(box)), undefined);
  }));

  browserTest(`V12 nested shadow roots retain modal and inert ownership (${engine})`, () => run(async page => {
    await setup(page, '<dialog id="background">Background</dialog><dialog id="inside"><section><div id="mount"></div></section></dialog>', 'dialog{transition:none}');
    await page.evaluate(css => {
      window.outer = mount.attachShadow({mode:'closed'});
      outer.innerHTML = '<section><div id="inner"></div></section><dialog>Outside</dialog>';
      const inner = outer.querySelector('#inner').attachShadow({mode:'closed'});
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      inner.adoptedStyleSheets = [sheet];
      inner.innerHTML = '<div class="scroll-area custom" style="height:300px;width:240px"><div style="height:900px"></div></div>';
      background.showModal();
      inside.showModal();
      window.shadowArea = Expressive.ScrollArea.init(inner.firstElementChild);
    }, css);
    for (const state of ['outer-inert', 'middle-inert', 'middle-hidden', 'middle-modal']) {
      await page.evaluate(() => { shadowArea.el.scrollTop = 0; shadowArea.refresh(); });
      await frames(page);
      const r = await page.evaluate(() => {
        const r = shadowArea.el.nextElementSibling.getBoundingClientRect();
        return {x:r.x + 6, y:r.y};
      });
      await page.mouse.move(r.x, r.y + 50);
      await page.mouse.down();
      await page.mouse.move(r.x, r.y + 100, {steps:3});
      near(await page.evaluate(() => shadowArea.el.scrollTop), 150, 'enclosing modal permits the drag');
      const change = enabled => page.evaluate(({state, enabled}) => {
        const section = outer.querySelector('section');
        if (state === 'outer-inert') mount.inert = enabled;
        if (state === 'middle-inert') section.inert = enabled;
        if (state === 'middle-hidden') section.hidden = enabled;
        if (state === 'middle-modal') {
          const dialog = outer.querySelector('dialog');
          if (enabled) dialog.showModal(); else dialog.close();
        }
      }, {state, enabled});
      await change(true);
      await frames(page);
      await change(false);
      await frames(page);
      await page.mouse.move(r.x, r.y + 200, {steps:3});
      near(await page.evaluate(() => shadowArea.el.scrollTop), 150, `${state} ends the drag`);
      await page.mouse.up();
    }
  }));

  browserTest(`V12 a modal in the already-focused open shadow root ends capture (${engine})`, () => run(async page => {
    await setup(page, fixture + '<div id="mount"></div>');
    await page.evaluate(() => {
      const outer = mount.attachShadow({mode:'open'});
      outer.innerHTML = '<div></div>';
      window.focusRoot = outer.firstElementChild.attachShadow({mode:'open'});
      focusRoot.innerHTML = '<input><dialog><input autofocus></dialog>';
      focusRoot.querySelector('input').focus({preventScroll:true});
    });
    await init(page);
    await frames(page);
    const g = await geometry(page), x = g.bar.left + 6, y = g.bar.top;
    await page.mouse.move(x, y + 50);
    await page.mouse.down();
    await page.mouse.move(x, y + 100, {steps:3});
    near(await page.evaluate(() => box.scrollTop), 150);
    await page.evaluate(() => focusRoot.querySelector('dialog').showModal());
    await frames(page);
    await page.evaluate(() => focusRoot.querySelector('dialog').close());
    await page.mouse.move(x, y + 200, {steps:3});
    near(await page.evaluate(() => box.scrollTop), 150);
    await page.mouse.up();
  }));

  browserTest(`V12 closed modal owner can destroy and reinitialize around opening (${engine})`, () => run(async page => {
    await setup(page, fixture + '<div id="mount"></div>');
    await page.evaluate(() => {
      window.focusRoot = mount.attachShadow({mode:'closed'});
      focusRoot.innerHTML = '<input><dialog><input autofocus></dialog>';
      focusRoot.querySelector('input').focus({preventScroll:true});
    });
    await init(page);
    await frames(page);
    const g = await geometry(page), x = g.bar.left + 6, y = g.bar.top;
    await page.mouse.move(x, y + 50);
    await page.mouse.down();
    await page.mouse.move(x, y + 100, {steps:3});
    near(await page.evaluate(() => box.scrollTop), 150);
    await page.evaluate(() => { area.destroy(); focusRoot.querySelector('dialog').showModal(); });
    await page.mouse.move(x, y + 150, {steps:3});
    near(await page.evaluate(() => box.scrollTop), 150);
    await page.evaluate(() => focusRoot.querySelector('dialog').close());
    await init(page);
    await page.mouse.move(x, y + 200, {steps:3});
    near(await page.evaluate(() => box.scrollTop), 150);
    await page.mouse.up();
    await frames(page);
    await page.mouse.move(x, y + 100);
    await page.mouse.down();
    await page.mouse.move(x, y + 150, {steps:3});
    await page.mouse.up();
    near(await page.evaluate(() => box.scrollTop), 300);
  }));

  browserTest(`V12 a modal in another closed shadow root ends capture (${engine})`, () => run(async page => {
    await setup(page, fixture + '<div id="mount"></div>');
    await page.evaluate(() => {
      window.shadow = mount.attachShadow({mode:'closed'});
      shadow.innerHTML = '<dialog>Outside</dialog>';
    });
    await init(page);
    await frames(page);
    const g = await geometry(page), x = g.bar.left + 6, y = g.bar.top;
    await page.mouse.move(x, y + 50);
    await page.mouse.down();
    await page.mouse.move(x, y + 100, {steps:3});
    near(await page.evaluate(() => box.scrollTop), 150);
    await page.evaluate(() => shadow.firstElementChild.showModal());
    await frames(page);
    await page.evaluate(() => shadow.firstElementChild.close());
    await page.mouse.move(x, y + 200, {steps:3});
    near(await page.evaluate(() => box.scrollTop), 150, 'a closed-root modal ends rather than pauses capture');
    await page.mouse.up();
  }));

}
