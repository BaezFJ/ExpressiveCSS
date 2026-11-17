import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 2, `${message}: ${actual} vs ${expected}`);
async function setup(page, body = '<div style="height:300vh">Content</div>', root = 'class="scroll-area custom"', options = '{}') {
  await page.setContent(`<!doctype html><html ${root}><head><style>${css}</style>
    <style>body{margin:0}html{scroll-behavior:auto}</style></head><body>${body}<script>${js}</script></body></html>`);
  await page.evaluate(options => { window.area = Expressive.ScrollArea.init(document.querySelector('.scroll-area.custom'), JSON.parse(options)); }, options);
  await page.waitForFunction(() => document.querySelector('.scroll-area-enhanced'));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function geometry(page, axis = 'vertical') {
  return page.locator(`.scroll-area-bar.${axis}`).evaluate(rail => {
    const r = rail.getBoundingClientRect(), t = rail.querySelector('.scroll-area-thumb').getBoundingClientRect();
    return { top:r.top, bottom:r.bottom, left:r.left, right:r.right, height:r.height, width:r.width,
      thumbTop:t.top, thumbBottom:t.bottom, thumbLeft:t.left, thumbRight:t.right, thumbHeight:t.height, thumbWidth:t.width };
  });
}
for (const [engine, type, browserTest] of engines) {
  browserTest(`custom page bar geometry, growth and native fallback (${engine})`, async () => {
    const browser = await leaseBrowser(type);
    let page;
    try {
      page = await browser.newPage({ viewport:{ width:800, height:600 } });
      await setup(page);
      let box = await geometry(page);
      near(box.thumbHeight, box.height / 3, 'one third thumb');
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForFunction(() => Math.abs(document.querySelector('.scroll-area-thumb').getBoundingClientRect().bottom - innerHeight) < 2);
      await page.evaluate(() => document.body.firstElementChild.style.height = '600vh');
      await page.waitForFunction(() => document.querySelector('.scroll-area-thumb').getBoundingClientRect().height < 110);
      box = await geometry(page);
      near(box.thumbHeight, box.height / 6, 'content growth');
      if (engine !== 'webkit') {
      await page.emulateMedia({ forcedColors:'active' });
      await page.waitForFunction(() => !document.documentElement.classList.contains('scroll-area-enhanced'));
      assert.equal(await page.locator('.scroll-area-bar.vertical').evaluate(el => getComputedStyle(el).display), 'none');
      assert.equal(await page.locator('html').evaluate(el => getComputedStyle(el).scrollbarColor), 'auto');
      await page.emulateMedia({ forcedColors:'none' });
      await page.waitForFunction(() => document.documentElement.classList.contains('scroll-area-enhanced'));
      }
      await page.evaluate(() => area.destroy());
      assert.equal(await page.locator('.scroll-area-bar').count(), 0);
      assert.equal(await page.locator('html').evaluate(el => el.classList.contains('scroll-area-enhanced')), false);
    } finally {
      if (page) await page.evaluate(() => window.area?.destroy());
      await browser.close();
    }
  });
  browserTest(`custom page bar fallback path without ScrollTimeline (${engine})`, async () => {
    const browser = await leaseBrowser(type);
    let page;
    try {
      page = await browser.newPage();
      await page.addInitScript(() => window.ScrollTimeline = undefined);
      // setContent does not navigate; explicitly disable the optional API.
      await page.evaluate(() => window.ScrollTimeline = undefined);
      await setup(page);
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForFunction(() => Math.abs(document.querySelector('.scroll-area-thumb').getBoundingClientRect().bottom - innerHeight) < 2);
    } finally {
      if (page) await page.evaluate(() => window.area?.destroy());
      await browser.close();
    }
  });
  browserTest(`custom page thumb capture, track paging and cancellation (${engine})`, async () => {
    const browser = await leaseBrowser(type);
    let page;
    try {
      page = await browser.newPage({ viewport:{ width:800, height:600 } });
      await setup(page);
      const b = await geometry(page), x = b.right - 8;
      await page.mouse.move(x, b.thumbTop + 10);
      await page.mouse.down();
      await page.mouse.move(x - 100, b.thumbTop + 10 + (b.height - b.thumbHeight) / 2);
      near(await page.evaluate(() => scrollY), 600, 'half travel scrolls half the range');
      await page.mouse.up();
      assert.equal(await page.locator('.dragging').count(), 0);
      await page.evaluate(() => scrollTo(0,0));
      await page.waitForFunction(() => document.querySelector('.scroll-area-thumb').getBoundingClientRect().top < 2);
      await page.mouse.click(x, 500);
      near(await page.evaluate(() => scrollY), 600, 'track pages one viewport');
      await page.mouse.move(x, (await geometry(page)).thumbTop + 10);
      await page.mouse.down();
      await page.evaluate(() => dispatchEvent(new Event('blur')));
      assert.equal(await page.locator('.dragging').count(), 0);
      await page.mouse.up();
    } finally {
      if (page) await page.evaluate(() => window.area?.destroy());
      await browser.close();
    }
  });

  browserTest(`custom container geometry, scroll isolation and layout restoration (${engine})`, async () => {
    const browser = await leaseBrowser(type);
    let page;
    try {
      page = await browser.newPage();
      await setup(page, `<div id="parent" style="display:grid;grid-template-columns:1fr 1fr">
        <div id="before">Before</div><div class="scroll-area custom" tabindex="0" role="region" aria-label="Tags"
          style="height:300px;width:300px;margin:12px;grid-column:2"><div style="height:900px">Tags</div><button>Last</button></div><div id="after">After</div></div>`, '');
      let b = await geometry(page);
      const ratio = await page.locator('.scroll-area.custom').evaluate(el => el.clientHeight / el.scrollHeight);
      near(b.thumbHeight, b.height * ratio, 'container thumb ratio');
      const x = b.right - 8;
      await page.mouse.move(x,b.thumbTop + 10);
      await page.mouse.down();
      await page.mouse.move(x-50,b.thumbTop+10+(b.height-b.thumbHeight)/2);
      await page.mouse.up();
      const expected = await page.locator('.scroll-area.custom').evaluate(el => (el.scrollHeight-el.clientHeight)/2);
      near(await page.locator('.scroll-area.custom').evaluate(el => el.scrollTop), expected, 'container drag');
      assert.equal(await page.evaluate(() => scrollY),0);
      await page.locator('.scroll-area.custom').focus();
      await page.keyboard.press('End');
      await page.waitForFunction(() => document.querySelector('.scroll-area.custom').scrollTop > 500);
      await page.evaluate(() => area.destroy());
      assert.equal(await page.locator('.scroll-area-frame').count(),0);
      assert.deepEqual(await page.locator('.scroll-area.custom').evaluate(el => [el.parentElement.id, el.previousElementSibling.id, el.nextElementSibling.id, el.style.margin,el.style.gridColumn]),['parent','before','after','12px','2']);
    } finally {
      if (page) await page.evaluate(() => window.area?.destroy());
      await browser.close();
    }
  });

  for (const dir of ['ltr','rtl']) for (const root of [true,false]) {
    browserTest(`custom horizontal bar, corner and ${dir} dragging on ${root ? 'page' : 'container'} (${engine})`, async () => {
      const browser = await leaseBrowser(type);
      let page;
      try {
        page = await browser.newPage({ viewport:{ width:800,height:600 } });
        const content = '<div style="width:2400px;height:1800px">Wide content</div>';
        await setup(page,root ? content : `<div class="scroll-area custom" style="width:300px;height:300px">${content}</div>`, `dir="${dir}" ${root ? 'class="scroll-area custom"' : ''}`);
        const h=await geometry(page,'horizontal'), v=await geometry(page);
        assert.ok(h.bottom <= v.bottom + 16 && h.top >= v.bottom - 1, 'vertical track ends before horizontal');
        if (dir === 'rtl') near(h.thumbRight,h.right,'RTL starts at the right');
        else near(h.thumbLeft,h.left,'LTR starts at the left');
        const start=dir==='rtl' ? h.thumbRight-5 : h.thumbLeft+5;
        await page.mouse.move(start,h.bottom-8);
        await page.mouse.down();
        await page.mouse.move(start + (dir==='rtl' ? -1 : 1)*(h.width-h.thumbWidth)/2,h.bottom-8);
        await page.mouse.up();
        const scroll=await page.locator('.scroll-area.custom').evaluate(el => [Math.abs(el.scrollLeft),el.scrollWidth-el.clientWidth]);
        assert.ok(Math.abs(scroll[0]/scroll[1] - .5) < .01, 'horizontal half travel within a rounded pointer pixel');
        await page.waitForFunction(() => {
          const r=document.querySelector('.horizontal'),t=r.firstElementChild.getBoundingClientRect(),b=r.getBoundingClientRect();
          return Math.abs((t.left+t.right)/2-(b.left+b.right)/2)<2;
        });
      } finally {
        if (page) await page.evaluate(() => window.area?.destroy());
        await browser.close();
      }
    });
  }

  browserTest(`custom thumb hover spring and reduced motion (${engine})`, async () => {
    const browser = await leaseBrowser(type);
    let page;
    try {
      page = await browser.newPage();
      await setup(page);
      near((await geometry(page)).thumbWidth,4,'rest width');
      const b=await geometry(page);
      await page.mouse.move(b.right-8,b.thumbTop+10);
      await page.waitForFunction(() => Math.abs(document.querySelector('.vertical .scroll-area-thumb').getBoundingClientRect().width-8)<.1);
      await page.mouse.move(10,10);
      await page.waitForFunction(() => Math.abs(document.querySelector('.vertical .scroll-area-thumb').getBoundingClientRect().width-4)<.1);
      await page.emulateMedia({ reducedMotion:'reduce' });
      assert.equal(await page.locator('.vertical .scroll-area-thumb').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      await page.mouse.move(b.right-8,b.thumbTop+10);
      near((await geometry(page)).thumbWidth,8,'reduced motion hover width');
    } finally {
      if (page) await page.evaluate(() => window.area?.destroy());
      await browser.close();
    }
  });

  browserTest(`custom bars hide while idle and wake at the edge or on scroll (${engine})`, async () => {
    const browser = await leaseBrowser(type);
    let page;
    try {
      page = await browser.newPage();
      await setup(page);
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.vertical')).opacity === '0');
      const b=await geometry(page);
      await page.mouse.move(b.right-2,100);
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.vertical')).opacity === '1');
      await page.waitForTimeout(1100);
      assert.equal(await page.locator('.vertical').evaluate(el => getComputedStyle(el).opacity), '1');
      await page.mouse.move(10,10);
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.vertical')).opacity === '0');
      await page.evaluate(() => scrollTo(0,100));
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.vertical')).opacity === '1');
      await page.emulateMedia({ reducedMotion:'reduce' });
      assert.equal(await page.locator('.vertical').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      await page.evaluate(() => area.destroy());
      assert.equal(await page.locator('.scroll-area-bar').count(),0);
    } finally {
      if (page) await page.evaluate(() => window.area?.destroy());
      await browser.close();
    }
  });

  browserTest(`custom section marks reuse scrollspy targets and follow layout (${engine})`, async () => {
    const browser = await leaseBrowser(type);
    let page;
    try {
      page = await browser.newPage({ viewport:{width:800,height:600} });
      await setup(page,Array.from({length:4},(_,i)=>`<section id="s${i}" class="scrollspy" style="height:600px">Section ${i}</section>`).join(''));
      assert.equal(await page.locator('.scroll-area-mark').count(),4);
      const positions=await page.locator('.scroll-area-mark').evaluateAll(marks=>marks.map(m=>parseFloat(m.style.top)));
      positions.forEach((value,index)=>near(value,index*100/3,'section mark position'));
      await page.locator('#s0').evaluate(el=>el.style.height='1200px');
      await page.waitForFunction(() => Math.abs(parseFloat(document.querySelectorAll('.scroll-area-mark')[1].style.top)-50)<1);
      await page.evaluate(() => { area.destroy(); area=Expressive.ScrollArea.init(document.documentElement,{ sections:'[' }); });
      await page.evaluate(() => new Promise(resolve=>requestAnimationFrame(resolve)));
      assert.equal(await page.locator('.scroll-area-mark').count(),0);
    } finally {
      if (page) await page.evaluate(() => window.area?.destroy());
      await browser.close();
    }
  });

  browserTest(`custom drag label names the current section safely and clears on release (${engine})`, async () => {
    const browser = await leaseBrowser(type);
    let page;
    try {
      page = await browser.newPage({ viewport:{width:800,height:600} });
      await setup(page,Array.from({length:4},(_,i)=>`<section data-scroll-area-section style="height:600px"><h2 style="margin:0">Section ${i+1}</h2></section>`).join(''));
      const b=await geometry(page),x=b.right-7,start=b.thumbTop+10;
      await page.mouse.move(x,start);
      await page.mouse.down();
      await page.mouse.move(x,start+2*(b.height-b.thumbHeight)/3);
      await page.waitForFunction(() => document.querySelector('.scroll-area-label').textContent === 'Section 3');
      assert.equal(await page.locator('.scroll-area-label').isVisible(),true);
      assert.equal(await page.locator('.scroll-area-label').evaluate(el => el.closest('[aria-hidden]').getAttribute('aria-hidden')),'true');
      await page.locator('[data-scroll-area-section]').nth(2).evaluate(el => el.setAttribute('data-scroll-area-label','<img src=x onerror=alert(1)>'));
      await page.waitForFunction(() => document.querySelector('.scroll-area-label').textContent.startsWith('<img'));
      assert.equal(await page.locator('.scroll-area-label img').count(),0);
      await page.mouse.up();
      assert.equal(await page.locator('.scroll-area-label').isVisible(),false);
    } finally {
      if (page) await page.evaluate(() => window.area?.destroy());
      await browser.close();
    }
  });

  browserTest(`custom bars stay inside a shadow root and copy local colors (${engine})`, async () => {
    const browser = await leaseBrowser(type);
    let page;
    try {
      page = await browser.newPage();
      await page.setContent('<div id="host"></div>');
      await page.addScriptTag({content:js});
      await page.evaluate(css => {
        const root=document.querySelector('#host').attachShadow({mode:'open'});
        root.innerHTML=`<style>${css}</style><div class="scroll-area custom" style="height:300px;width:300px;--scroll-area-thumb-color:rgb(12,34,56)" tabindex="0" role="region" aria-label="Tags"><div style="height:900px">Tags</div></div>`;
        window.area=Expressive.ScrollArea.init(root.querySelector('.scroll-area'));
      },css);
      await page.waitForFunction(() => document.querySelector('#host').shadowRoot.querySelector('.scroll-area-enhanced'));
      assert.equal(await page.locator('#host .vertical .scroll-area-thumb').evaluate(el => getComputedStyle(el).backgroundColor),'rgb(12, 34, 56)');
      assert.equal(await page.evaluate(() => document.querySelectorAll('.scroll-area-bar').length),0);
      await page.locator('#host .scroll-area.custom').focus();
      await page.keyboard.press('End');
      await page.waitForFunction(() => document.querySelector('#host').shadowRoot.querySelector('.scroll-area').scrollTop > 500);
      await page.evaluate(() => area.destroy());
      assert.equal(await page.locator('#host .scroll-area-frame').count(),0);
    } finally {
      if (page) await page.evaluate(() => window.area?.destroy());
      await browser.close();
    }
  });
  if (engine !== 'firefox') browserTest(`coarse primary pointer keeps the native scrollbar (${engine})`, async () => {
    const browser = await leaseBrowser(type);
    let page;
    try {
      page = await browser.newPage({ isMobile:true, hasTouch:true });
      await page.setContent(`<!doctype html><html class="scroll-area custom"><style>${css}</style><body><div style="height:300vh">Content</div><script>${js}</script></body></html>`);
      await page.evaluate(() => { window.area=Expressive.ScrollArea.init(document.documentElement); });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      assert.equal(await page.evaluate(() => matchMedia('(pointer: coarse)').matches),true);
      assert.equal(await page.locator('.scroll-area-enhanced').count(),0);
      assert.equal(await page.locator('.vertical').evaluate(el => getComputedStyle(el).display),'none');
    } finally {
      if (page) await page.evaluate(() => window.area?.destroy());
      await browser.close();
    }
  });

  browserTest(`custom bar colors and springs follow runtime theme changes (${engine})`, async () => {
    const browser = await leaseBrowser(type);
    let page;
    try {
      page=await browser.newPage();
      await setup(page);
      const thumb=page.locator('.vertical .scroll-area-thumb');
      const before=await thumb.evaluate(el=>getComputedStyle(el).backgroundColor);
      await page.evaluate(() => { document.documentElement.setAttribute('theme','dark'); document.documentElement.setAttribute('motion','expressive'); });
      await page.waitForFunction(before=>getComputedStyle(document.querySelector('.vertical .scroll-area-thumb')).backgroundColor !== before,before);
      const values=await page.evaluate(() => {
        const root=getComputedStyle(document.documentElement),bar=getComputedStyle(document.querySelector('.vertical'));
        return [root.colorScheme,bar.colorScheme,root.getPropertyValue('--md-sys-motion-spring-fast-spatial'),bar.getPropertyValue('--md-sys-motion-spring-fast-spatial')];
      });
      assert.equal(values[0],values[1]); assert.equal(values[2],values[3]);
    } finally {
      if (page) await page.evaluate(() => window.area?.destroy());
      await browser.close();
    }
  });

  browserTest(`custom frame preserves spacing utilities and grid placement (${engine})`, async () => {
    const browser = await leaseBrowser(type);
    let page;
    try {
      page=await browser.newPage({viewport:{width:800,height:600}});
      await page.setContent(`<style>${css}</style><div style="display:grid;grid-template-columns:1fr 1fr"><span>Before</span><div class="scroll-area custom m-3" style="width:200px;height:300px;grid-column:2"><div style="height:900px">Tags</div></div></div>`);
      const rect=()=>page.locator('.scroll-area.custom').evaluate(el=>{const b=el.getBoundingClientRect();return [b.left,b.top,b.width,b.height];});
      const before=await rect();
      await page.addScriptTag({content:js});
      await page.evaluate(()=>{window.area=Expressive.ScrollArea.init(document.querySelector('.scroll-area'));});
      await page.waitForFunction(()=>document.querySelector('.scroll-area-enhanced'));
      (await rect()).forEach((value,index)=>near(value,before[index],'original layout geometry'));
      await page.evaluate(()=>area.destroy());
      (await rect()).forEach((value,index)=>near(value,before[index],'restored layout geometry'));
    } finally {
      if (page) await page.evaluate(()=>window.area?.destroy());
      await browser.close();
    }
  });

  browserTest(`custom container color aliases follow an ancestor seed change (${engine})`, async () => {
    const browser = await leaseBrowser(type);
    let page;
    try {
      page=await browser.newPage();
      await setup(page, '<div class="scroll-area custom" style="height:300px;--scroll-area-thumb-color:var(--md-sys-color-primary)"><div style="height:900px">Tags</div></div><span id="reference" aria-hidden="true" style="background:var(--md-sys-color-primary)"></span>', '');
      await page.evaluate(async()=>{await document.fonts.ready;for(let i=0;i<4;i++)await new Promise(resolve=>requestAnimationFrame(resolve));});
      const before=await page.locator('.vertical .scroll-area-thumb').evaluate(el=>getComputedStyle(el).backgroundColor);
      await page.evaluate(()=>document.documentElement.style.setProperty('--md-source','#008800'));
      await page.waitForFunction(before=>getComputedStyle(document.querySelector('.vertical .scroll-area-thumb')).backgroundColor!==before,before);
      const colors=await page.evaluate(()=>[getComputedStyle(document.querySelector('.vertical .scroll-area-thumb')).backgroundColor,getComputedStyle(document.getElementById('reference')).backgroundColor]);
      assert.equal(colors[0],colors[1]);
    } finally {
      if (page) await page.evaluate(()=>window.area?.destroy());
      await browser.close();
    }
  });

}
