// Scaffold regions, scrolling and the components it places, in Chromium,
// Firefox and WebKit. Semantics rules run in tests/scaffold.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines, leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const icon = (name) => `<span class="material-symbols" aria-hidden="true">${name}</span>`;
const header = (cls = '') => `<header id="bar" class="${cls}"><div class="bar"><button type="button" aria-label="Menu">${icon('menu')}</button><h1>Mail</h1></div></header>`;
const rail = (n = 4) => `<nav class="navigation-rail" id="rail" aria-label="Primary">${Array.from({ length: n }, (_, i) =>
  `<a href="#d${i}" id="d${i}"${i ? '' : ' aria-current="page"'}>${icon('inbox')}Item ${i}</a>`).join('')}</nav>`;
const tools = (n = 3) => `<div class="toolbar vertical" id="tools">${Array.from({ length: n }, (_, i) =>
  `<button type="button" id="t${i}" aria-label="Action ${i}">${icon('event')}</button>`).join('')}</div>`;
const pane = '<main id="pane" tabindex="-1"><div style="height:3000px">Inbox</div></main>';
const scaffold = ({ bar = header(), nav = rail(), main = pane, trailing = tools(), cls = '' } = {}) =>
  `<div class="scaffold ${cls}" id="s">${bar}${nav}${main}${trailing}</div>`;

const page = (body, { dir = 'ltr', root = '' } = {}) => `<!doctype html><html lang="en" dir="${dir}" style="${root}"><head><style>${css}</style>
<style>/* No icon font loads here, so a glyph name renders as wide text. Clip it as the font would. */
.material-symbols{overflow:hidden}</style></head><body>${body}<script>${js}</script></body></html>`;

async function open(type, html, { width = 1280, height = 800, ...options } = {}) {
  const browser = await leaseBrowser(type);
  const tab = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce', ...options });
  await tab.setContent(html);
  const box = (sel) => tab.locator(sel).evaluate((el) => el.getBoundingClientRect().toJSON());
  const style = (sel, prop) => tab.locator(sel).evaluate((el, prop) => getComputedStyle(el)[prop], prop);
  return { browser, tab, box, style };
}

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1, `${msg}: ${a} vs ${b}`);

test('every compiled scaffold selector starts at the scaffold or a region class', () => {
  const preludes = [...css.matchAll(/([^{}]*scaffold[^{}]*)\{/g)].map((m) => m[1].trim());
  assert.ok(preludes.length > 5, 'the scaffold rules are in the bundle');
  for (const prelude of preludes) {
    for (const selector of prelude.split(/,(?![^(]*\))/)) assert.match(selector.trim(), /^\.scaffold/, prelude);
  }
});

for (const [name, type, run] of engines) {
  run(`${name}: scaffold places the bar above the rail, pane and toolbar, and only the pane scrolls`, { timeout: 30000 }, async () => {
    const { browser, tab, box, style } = await open(type, page(scaffold()));
    try {
      const bar = await box('#bar');
      const nav = await box('#rail');
      const main = await box('#pane');
      const tb = await box('#tools');
      assert.deepEqual([bar.left, bar.top, bar.width], [0, 0, 1280], 'the bar spans the top');
      near(nav.top, bar.bottom, 'the rail starts below the bar');
      near(nav.left, 0, 'the rail is at the leading edge');
      near(main.left, nav.right, 'the pane follows the rail');
      near(main.top, bar.bottom, 'the pane starts below the bar');
      near(nav.bottom, 800, 'the rail reaches the window bottom');
      near(main.bottom, 800, 'the pane reaches the window bottom');
      near(tb.left - main.right, 24, 'the toolbar sits 24px from the pane');
      near(1280 - tb.right, 24, 'and 24px from the window edge');
      near((tb.top + tb.bottom) / 2, (bar.bottom + 800) / 2, 'the toolbar is centered in its region');
      assert.equal(await style('#s', 'overflowX'), 'clip');
      assert.equal(await style('#tools', 'overflowY'), 'visible', 'the toolbar never clips its tooltips');
      assert.equal(await tab.evaluate(() => document.documentElement.scrollHeight), 800, 'the document does not scroll');

      await tab.locator('#pane').evaluate((el) => el.scrollTo(0, 1200));
      assert.equal(await tab.locator('#pane').evaluate((el) => el.scrollTop), 1200, 'the pane scrolls');
      assert.equal(await tab.evaluate(() => window.scrollY), 0, 'the window does not');
      assert.deepEqual(await box('#bar'), bar, 'the bar stays put');
      assert.deepEqual(await box('#rail'), nav, 'the rail stays put');
      assert.deepEqual(await box('#tools'), tb, 'the toolbar stays put');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: an empty scaffold region takes no space, and region classes place custom content`, { timeout: 30000 }, async () => {
    const custom = `<div class="scaffold" id="s"><div class="scaffold-bar" id="cb" style="height:50px">Bar</div>
      <div class="scaffold-rail" id="cr" style="width:100px">Rail</div><div class="scaffold-pane" id="cp">Pane</div>
      <div class="scaffold-trailing" id="ct" style="width:60px">Tools</div></div>`;
    const group = `<div class="toolbar-group vertical" id="tg"><div class="toolbar vertical">${icon('edit')}</div><button type="button" class="extra circle" aria-label="Compose">${icon('add')}</button></div>`;
    const { browser, tab, box } = await open(type, page(`<div id="host"></div>`));
    try {
      const render = async (html) => {
        await tab.locator('#host').evaluate((el, html) => { el.innerHTML = html; }, html);
      };
      await render(scaffold({ nav: '' }));
      near((await box('#pane')).left, 0, 'no rail: the pane starts at the leading edge');
      await render(scaffold({ trailing: '' }));
      near((await box('#pane')).right, 1280, 'no toolbar: the pane reaches the trailing edge');
      await render(scaffold({ bar: '' }));
      near((await box('#pane')).top, 0, 'no bar: the pane starts at the top');

      await render(custom);
      const [cb, cr, cp, ct] = await Promise.all(['#cb', '#cr', '#cp', '#ct'].map(box));
      assert.deepEqual([cb.top, cb.width, cb.height], [0, 1280, 50], 'the bar class spans the top');
      assert.deepEqual([cr.left, cr.top, cr.width], [0, 50, 100], 'the rail class leads the second row');
      assert.deepEqual([cp.left, cp.right, cp.top, cp.bottom], [100, 1220, 50, 800], 'the pane class fills the middle');
      assert.deepEqual([ct.right, ct.top, ct.bottom], [1280, 50, 800], 'the trailing class fills its region');
      await tab.locator('#cr').evaluate((el) => { el.innerHTML = '<div style="height:2000px">Long</div>'; });
      assert.ok(await tab.locator('#cr').evaluate((el) => { el.scrollTop = 300; return el.scrollTop > 0; }), 'custom rail content scrolls');
      await tab.locator('#ct').evaluate((el) => { el.innerHTML = '<div style="height:2000px">Long</div>'; });
      assert.ok(await tab.locator('#ct').evaluate((el) => { el.scrollTop = 300; return el.scrollTop > 0; }), 'custom trailing content scrolls');

      await render(scaffold({ trailing: group }));
      near(1280 - (await box('#tg')).right, 24, 'a toolbar group takes the trailing region');

      await render(scaffold({ trailing: tools().replace('toolbar vertical', 'toolbar vertical fixed right') }));
      near(1280 - (await box('#tools')).right, 24, 'a fixed toolbar keeps its own inset and gets no scaffold margin');

      await render(scaffold({ bar: header('medium') }));
      const before = await Promise.all(['#bar', '#rail', '#pane', '#tools'].map(box));
      await tab.evaluate(() => { window.appBar = Expressive.AppBar.init(document.querySelector('#bar')); });
      try {
        assert.equal(await tab.locator('#bar + span[aria-hidden]').count(), 1, 'AppBar inserted its sentinel');
        assert.deepEqual(await Promise.all(['#bar', '#rail', '#pane', '#tools'].map(box)), before, 'the sentinel moves no region');
      } finally {
        await tab.evaluate(() => window.appBar.destroy());
      }
    } finally {
      await browser.close();
    }
  });

  run(`${name}: scaffold rail fills its region, scrolls, and widens the pane's column when expanded`, { timeout: 30000 }, async () => {
    const { browser, tab, box } = await open(type, page(scaffold({ nav: rail(14) })));
    try {
      const bar = await box('#bar');
      const nav = await box('#rail');
      near(nav.top, bar.bottom, 'the rail starts at the bar');
      near(nav.bottom, 800, 'the rail stops at the window bottom');
      assert.ok(await tab.locator('#rail').evaluate((el) => {
        el.scrollTop = 50;
        return el.scrollHeight > el.clientHeight && el.scrollTop > 0;
      }), 'the rail scrolls its destinations');

      const left = (await box('#pane')).left;
      await tab.locator('#rail').evaluate((el) => el.classList.add('expanded'));
      const wide = await box('#rail');
      const main = await box('#pane');
      assert.ok(wide.width > nav.width, 'the rail widened');
      near(main.left - left, wide.width - nav.width, 'the pane moved by the width the rail gained');
      near(main.left, wide.right, 'the expanded rail does not overlap the pane');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: a tall trailing toolbar keeps its first action in its region`, { timeout: 30000 }, async () => {
    const { browser, box } = await open(type, page(scaffold({ trailing: tools(20) })), { height: 500 });
    try {
      assert.ok((await box('#t0')).top >= (await box('#bar')).bottom - 1, 'the first action is inside the region');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: panes inside the scaffold's main fill the pane region and scroll pane by pane`, { timeout: 30000 }, async () => {
    const panes = (cls = '') => `<div class="${cls} list-detail" id="lp"><div class="list-pane"><section id="b1"><div style="height:2000px">List</div></section></div>
      <div class="detail-pane"><section id="b2"><div style="height:2000px">Detail</div></section></div></div>`;
    for (const main of [`<main id="pane">${panes('panes')}</main>`, `<main id="pane" class="panes list-detail"><div class="list-pane"><section id="b1"><div style="height:2000px">List</div></section></div><div class="detail-pane"><section id="b2"><div style="height:2000px">Detail</div></section></div></main>`]) {
      const { browser, tab, box } = await open(type, page(scaffold({ main })));
      try {
        const region = await box('#pane');
        const holder = (await tab.locator('#lp').count()) ? await box('#lp') : region;
        near(holder.height, region.height, 'the panes are as tall as the pane region');
        near(region.bottom, 800, 'the pane region reaches the window bottom');
        for (const id of ['#b1', '#b2']) {
          assert.ok(await tab.locator(id).evaluate((el) => { el.scrollTop = 300; return el.scrollTop > 0; }), `${id} scrolls`);
        }
        assert.ok(await tab.locator('#pane').evaluate((el) => el.scrollHeight <= el.clientHeight + 1), 'the pane region itself does not overflow');
        assert.equal(await tab.evaluate(() => window.scrollY), 0, 'nor does the window');
      } finally {
        await browser.close();
      }
    }
  });

  run(`${name}: scaffold mirrors under dir="rtl"`, { timeout: 30000 }, async () => {
    const { browser, box } = await open(type, page(scaffold(), { dir: 'rtl' }));
    try {
      near((await box('#rail')).right, 1280, 'the rail is at the right edge');
      near((await box('#tools')).left, 24, 'the toolbar is 24px from the left edge');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: the scaffold's app bar fills from the pane's scroll, and other bars keep the root timeline`, { timeout: 30000 }, async () => {
    const { browser, tab } = await open(type, page(`${scaffold()}<header id="plain"><div class="bar"><h2>Plain</h2></div></header>`));
    try {
      const supported = await tab.evaluate(() => CSS.supports('timeline-scope', '--a'));
      if (name === 'chromium') assert.ok(supported, 'Chromium supports timeline-scope');
      if (supported) {
        const progress = () => tab.locator('#bar').evaluate((el) => getComputedStyle(el).getPropertyValue('--md-comp-top-app-bar-scroll').trim());
        assert.equal(await progress(), '0', 'at rest while the pane is at its top');
        await tab.locator('#pane').evaluate((el) => el.scrollTo(0, 100));
        await tab.waitForFunction(() => getComputedStyle(document.querySelector('#bar')).getPropertyValue('--md-comp-top-app-bar-scroll').trim() === '1');
      }
      if (await tab.evaluate(() => CSS.supports('animation-timeline', 'scroll()'))) {
        assert.equal(await tab.locator('#plain').evaluate((el) => getComputedStyle(el).animationTimeline), 'scroll(root)', 'a bar outside a scaffold keeps scroll(root)');
      }
    } finally {
      await browser.close();
    }
  });

  run(`${name}: scaffold holds up at 200% text and in print, and leaves its components alone outside it`, { timeout: 30000 }, async () => {
    const outside = `<div style="display:flex"><nav class="navigation-rail" id="lone" aria-label="Lone">${icon('home')}</nav><div class="toolbar vertical" id="lonetools"><button type="button" aria-label="Edit">${icon('edit')}</button></div></div>`;
    const { browser, tab, box, style } = await open(type, page(`${scaffold({ nav: rail(14) })}${outside}`, { root: 'font-size:32px' }));
    try {
      assert.ok((await box('#bar')).height >= 128, 'the bar grows with the text');
      assert.ok(await tab.locator('#pane').evaluate((el) => { el.scrollTop = 500; return el.scrollTop > 0; }), 'the pane still scrolls');
      await tab.locator('#rail').evaluate((el) => { el.scrollTop = el.scrollHeight; });
      assert.ok((await box('#d13')).bottom <= 801, 'the last destination scrolls into the window');

      assert.equal(await style('#lone', 'minHeight'), '800px', 'a rail outside a scaffold keeps 100dvh');
      assert.equal(await style('#lonetools', 'marginRight'), '0px', 'a toolbar outside a scaffold gets no margin');

      await tab.emulateMedia({ media: 'print' });
      assert.equal(await style('#pane', 'overflowY'), 'visible', 'the pane prints whole');
      assert.equal(await style('#s', 'overflowY'), 'visible', 'the shell does not clip in print');
      assert.ok((await box('#s')).height > 3000, 'the shell grows to its content in print');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: a tall-rail scaffold runs the rail and toolbar the full height with the bar over the pane`, { timeout: 30000 }, async () => {
    const { browser, tab, box, style } = await open(type, page(`<div id="host">${scaffold({ cls: 'tall-rail' })}</div>`));
    try {
      const measure = () => Promise.all(['#rail', '#bar', '#pane', '#tools'].map(box));
      let [nav, bar, main, tb] = await measure();
      assert.equal((await style('#s', 'gridTemplateAreas')).replace(/\s+/g, ' '), '"rail bar trailing" "rail pane trailing"');
      assert.deepEqual([nav.left, nav.top], [0, 0], 'the rail starts at the top leading corner');
      near(nav.bottom, 800, 'the rail reaches the window bottom');
      near(bar.left, nav.right, 'the bar starts at the rail');
      near(bar.right, main.right, 'the bar sits over the pane only');
      near(main.top, bar.bottom, 'the pane starts below the bar');
      near(1280 - tb.right, 24, 'the toolbar is 24px from the window edge');
      near(tb.left - main.right, 24, 'and 24px from the pane');
      near((tb.top + tb.bottom) / 2, 400, 'the toolbar is centered in the full height');

      await tab.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
      [nav, bar, main] = await measure();
      assert.deepEqual([nav.top, nav.bottom], [0, 800], 'at 200% text the rail still runs the full height');
      near(main.top, bar.bottom, 'and the taller bar only shortens the pane');
      await tab.evaluate(() => { document.documentElement.style.fontSize = ''; });

      await tab.locator('#rail').evaluate((el) => el.classList.add('expanded'));
      [nav, bar, main] = await measure();
      near(bar.left, nav.right, 'the expanded rail pushes the bar');
      near(main.left, nav.right, 'and the pane');

      await tab.locator('#host').evaluate((el, html) => { el.innerHTML = html; }, scaffold({ cls: 'tall-rail', nav: '', trailing: '' }));
      [, bar, main] = await Promise.all(['#s', '#bar', '#pane'].map(box));
      assert.deepEqual([bar.left, bar.right, main.left, main.right], [0, 1280, 0, 1280], 'empty regions take no space');

      if (name === 'chromium') {
        await tab.locator('#host').evaluate((el, html) => { el.innerHTML = html; }, scaffold({ cls: 'tall-rail' }));
        await tab.locator('#pane').evaluate((el) => el.scrollTo(0, 100));
        await tab.waitForFunction(() => getComputedStyle(document.querySelector('#bar')).getPropertyValue('--md-comp-top-app-bar-scroll').trim() === '1');
      }
    } finally {
      await browser.close();
    }
  });

  run(`${name}: a tall-rail scaffold mirrors under dir="rtl"`, { timeout: 30000 }, async () => {
    const { browser, box } = await open(type, page(scaffold({ cls: 'tall-rail' }), { dir: 'rtl' }));
    try {
      const [nav, bar, tb] = await Promise.all(['#rail', '#bar', '#tools'].map(box));
      assert.deepEqual([nav.right, nav.top], [1280, 0], 'the rail runs down the right edge');
      near(nav.bottom, 800, 'to the bottom');
      near(bar.right, nav.left, 'the bar ends at the rail');
      near(tb.left, 24, 'the toolbar is 24px from the left edge');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: Page Down scrolls a focused scaffold pane`, { timeout: 30000 }, async () => {
    const { browser, tab } = await open(type, page(scaffold()));
    try {
      await tab.locator('#pane').focus();
      await tab.keyboard.press('PageDown');
      await tab.waitForFunction(() => document.querySelector('#pane').scrollTop > 0);
      assert.equal(await tab.evaluate(() => window.scrollY), 0, 'the window does not scroll');
    } finally {
      await browser.close();
    }
  });
}

const [, chromium, runChromium] = engines.find(([name]) => name === 'chromium') ?? [];
if (chromium) {
  runChromium('chromium: the scaffold adds no landmark and keeps banner, navigation and main in order', { timeout: 30000 }, async () => {
    const { browser, tab } = await open(chromium, page(scaffold()));
    try {
      const snapshot = await tab.locator('body').ariaSnapshot();
      const order = ['banner', 'navigation "Primary"', 'main'].map((role) => snapshot.indexOf(`- ${role}`));
      assert.ok(order.every((at) => at >= 0), snapshot);
      assert.deepEqual([...order].sort((a, b) => a - b), order, 'landmarks in source order');
      assert.equal((snapshot.match(/- (banner|navigation|main|region|application)\b/g) ?? []).length, 3, 'no extra landmark');
    } finally {
      await browser.close();
    }
  });
}
