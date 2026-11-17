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

}
