// Scaffold regions, scrolling and the components it places, in Chromium,
// Firefox and WebKit. Semantics rules run in tests/scaffold.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileString } from 'sass';
import { engines, leaseBrowser } from './browser.js';
import { splitSelectorList } from './css.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const icon = (name) => `<span class="material-symbols" aria-hidden="true">${name}</span>`;
const header = (cls = '', controls = '') => `<header id="bar" class="${cls}"><div class="bar"><button type="button" id="menu" aria-label="Menu"${controls ? ` aria-controls="${controls}"` : ''}>${icon('menu')}</button><h1>Mail</h1></div></header>`;
const rail = (n = 4) => `<nav class="navigation-rail" id="rail" aria-label="Primary">${Array.from({ length: n }, (_, i) =>
  `<a href="#d${i}" id="d${i}"${i ? '' : ' aria-current="page"'}>${icon('inbox')}Item ${i}</a>`).join('')}</nav>`;
const tools = (n = 3) => `<div class="toolbar vertical" id="tools">${Array.from({ length: n }, (_, i) =>
  `<button type="button" id="t${i}" aria-label="Action ${i}">${icon('event')}</button>`).join('')}</div>`;
const pane = '<main id="pane" tabindex="-1"><div style="height:3000px">Inbox</div></main>';
const navbar = `<footer id="nb"><nav class="navigation-bar" aria-label="Destinations"><a href="#n1" aria-current="page">${icon('inbox')}Inbox</a><a href="#n2">${icon('send')}Sent</a></nav></footer>`;
const scaffold = ({ bar = header(), nav = rail(), main = pane, trailing = tools(), cls = '', bottom = '' } = {}) =>
  `<div class="scaffold ${cls}" id="s">${bar}${nav}${main}${trailing}${bottom}</div>`;

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
    // The root rules key off a scaffold that is a direct child of <body>.
    for (const selector of splitSelectorList(prelude)) assert.match(selector, /^(\.scaffold|:root:has\(> body > \.scaffold[ )])/, prelude);
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
      near(main.bottom, 784, 'the pane floats 16px above the window bottom');
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
      near((await box('#pane')).left, 16, 'no rail: the pane floats 16px from the leading edge');
      await render(scaffold({ trailing: '' }));
      near((await box('#pane')).right, 1264, 'no toolbar: the pane floats 16px from the trailing edge');
      await render(scaffold({ bar: '' }));
      near((await box('#pane')).top, 16, 'no bar: the pane floats 16px from the top');

      await render(custom);
      const [cb, cr, cp, ct] = await Promise.all(['#cb', '#cr', '#cp', '#ct'].map(box));
      assert.deepEqual([cb.top, cb.width, cb.height], [0, 1280, 50], 'the bar class spans the top');
      assert.deepEqual([cr.left, cr.top, cr.width], [0, 50, 100], 'the rail class leads the second row');
      assert.deepEqual([cp.left, cp.right, cp.top, cp.bottom], [100, 1204, 50, 784], 'the pane class fills the middle, floating with its 16px gaps');
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
        // main floats 16px above the bottom; main.panes keeps the panes layout's own box.
        const isPanes = await tab.locator('#pane').evaluate((el) => el.classList.contains('panes'));
        near(region.bottom, isPanes ? 800 : 784, 'the pane region reaches its bottom edge');
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
      assert.deepEqual([await style('#pane', 'marginBlockEnd'), await style('#pane', 'borderTopLeftRadius')], ['0px', '0px'], 'the pane prints without its floating gap and corners');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: a tall-rail scaffold runs the rail and toolbar the full height with the bar over the pane`, { timeout: 30000 }, async () => {
    const { browser, tab, box, style } = await open(type, page(`<div id="host">${scaffold({ cls: 'tall-rail' })}</div>`));
    try {
      const measure = () => Promise.all(['#rail', '#bar', '#pane', '#tools'].map(box));
      let [nav, bar, main, tb] = await measure();
      assert.equal((await style('#s', 'gridTemplateAreas')).replace(/\s+/g, ' '), '"rail bar trailing" "rail pane trailing" "status status status"');
      assert.deepEqual([nav.left, nav.top], [0, 0], 'the rail starts at the top leading corner');
      near(nav.bottom, 800, 'the rail reaches the window bottom');
      near(bar.left, nav.right, 'the bar starts at the rail');
      near(bar.right, main.right, 'the bar sits over the pane only');
      near(main.top, bar.bottom, 'the pane starts below the bar');
      near(1280 - tb.right, 24, 'the toolbar is 24px from the window edge');
      near(tb.left - main.right, 24, 'and 24px from the pane');
      near((tb.top + tb.bottom) / 2, 400, 'the toolbar is centered in the full height');

      const restHeight = bar.height;
      await tab.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
      [nav, bar, main] = await measure();
      assert.ok(bar.height > restHeight, 'the bar grew with the text');
      near(nav.top, 0, 'at 200% text the rail still starts at the top');
      near(nav.bottom, 800, 'and reaches the window bottom');
      near(main.top, bar.bottom, 'and the taller bar only shortens the pane');
      await tab.evaluate(() => { document.documentElement.style.fontSize = ''; });

      await tab.locator('#rail').evaluate((el) => el.classList.add('expanded'));
      [nav, bar, main] = await measure();
      near(bar.left, nav.right, 'the expanded rail pushes the bar');
      near(main.left, nav.right, 'and the pane');

      await tab.setViewportSize({ width: 500, height: 800 });
      [nav, bar] = await measure();
      near(bar.left, 0, 'below 600px the expanded rail is modal and leaves the grid');
      assert.equal(await style('#rail', 'position'), 'fixed', 'the modal rail is fixed');
      await tab.setViewportSize({ width: 1280, height: 800 });

      await tab.locator('#host').evaluate((el, html) => { el.innerHTML = html; }, scaffold({ cls: 'tall-rail', nav: '', trailing: '' }));
      [bar, main] = await Promise.all(['#bar', '#pane'].map(box));
      assert.deepEqual([bar.left, bar.right, main.left, main.right], [0, 1280, 16, 1264], 'empty regions take no space; the pane keeps its 16px floating gaps');

      if (await tab.evaluate(() => CSS.supports('timeline-scope', '--a'))) {
        await tab.locator('#host').evaluate((el, html) => { el.innerHTML = html; }, scaffold({ cls: 'tall-rail' }));
        assert.equal(await tab.locator('#bar').evaluate((el) => getComputedStyle(el).getPropertyValue('--md-comp-top-app-bar-scroll').trim()), '0', 'the tall-rail bar is at rest while the pane is at its top');
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
      const [nav, bar, main, tb] = await Promise.all(['#rail', '#bar', '#pane', '#tools'].map(box));
      assert.deepEqual([nav.right, nav.top], [1280, 0], 'the rail runs down the right edge');
      near(nav.bottom, 800, 'to the bottom');
      near(bar.right, nav.left, 'the bar ends at the rail');
      near(bar.left, main.left, 'the bar sits over the pane only');
      near(tb.left, 24, 'the toolbar is 24px from the left edge');
      near((tb.top + tb.bottom) / 2, 400, 'the toolbar is centered in the full height');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: on medium windows a scaffold's expanded rail overlays the pane, and from 840px it narrows it`, { timeout: 30000 }, async () => {
    const { browser, tab, box, style } = await open(type, page(`<div id="host"></div>`), { width: 1024 });
    try {
      const render = async (options) => {
        await tab.locator('#host').evaluate((el, html) => { el.innerHTML = html; }, scaffold(options));
      };
      const expand = () => tab.locator('#rail').evaluate((el) => el.classList.add('expanded'));

      await render();
      const narrow = await box('#rail');
      const left = (await box('#pane')).left;
      await expand();
      near((await box('#pane')).left - left, (await box('#rail')).width - narrow.width, 'at 1024px the pane narrows by the width the rail gained');
      assert.notEqual(await style('#rail', 'position'), 'fixed', 'and the rail stays in the grid');

      await tab.setViewportSize({ width: 700, height: 800 });
      for (const cls of ['', 'tall-rail']) {
        await render({ cls });
        const before = await box('#pane');
        await expand();
        assert.equal(await style('#rail', 'position'), 'fixed', `${cls || 'default'}: the rail is an overlay at 700px`);
        assert.deepEqual(await box('#pane'), before, `${cls || 'default'}: the pane keeps its box`);
        const hits = await tab.evaluate(() => [[650, 400], [690, 20]].map(([x, y]) => document.elementFromPoint(x, y)?.id));
        assert.deepEqual(hits, ['rail', 'rail'], `${cls || 'default'}: the scrim covers the pane and the app bar row`);
      }
      await render({ nav: rail().replace('class="navigation-rail"', 'class="navigation-rail" hidden') });
      near((await box('#pane')).left, 16, 'a hidden rail takes no space at 700px; the pane floats 16px in');

      await tab.setViewportSize({ width: 1280, height: 800 });
      await render({ nav: rail().replace('class="navigation-rail"', 'class="navigation-rail modal"') });
      const wide = await box('#pane');
      await expand();
      assert.equal(await style('#rail', 'position'), 'fixed', 'a .modal rail is an overlay at 1280px');
      assert.deepEqual(await box('#pane'), wide, 'and the pane keeps its box');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: Escape and the scrim close a scaffold's medium overlay, and focus returns to the app bar button`, { timeout: 30000 }, async () => {
    const { browser, tab } = await open(type, page(scaffold({ bar: header('', 'rail') })), { width: 700 });
    try {
      await tab.evaluate(() => { window.r = Expressive.NavigationRail.init(document.querySelector('#rail')); });
      const expanded = () => tab.locator('#rail').evaluate((el) => el.classList.contains('expanded'));
      await tab.locator('#menu').click();
      assert.equal(await expanded(), true, 'the app bar button opens the rail');
      await tab.locator('#d1').focus();
      await tab.keyboard.press('Escape');
      assert.equal(await expanded(), false, 'Escape closes the medium overlay');
      assert.equal(await tab.evaluate(() => document.activeElement?.id), 'menu', 'focus returns to the app bar button');
      for (const [x, y] of [[650, 400], [690, 20]]) {
        await tab.evaluate(() => window.r.expand());
        await tab.mouse.click(x, y);
        assert.equal(await expanded(), false, `a scrim click at ${x},${y} closes it`);
      }
    } finally {
      await tab.evaluate(() => window.r?.destroy()).catch(() => {});
      await browser.close();
    }
  });

  run(`${name}: the medium overlay stays inside the scaffold, mirrors under rtl, and leaves the compact overlay alone`, { timeout: 30000 }, async () => {
    const outside = `<nav class="navigation-rail expanded" id="lone" aria-label="Lone"><a href="#x">${icon('home')}X</a></nav>`;
    const { browser, tab, box, style } = await open(type, page(`${outside}<div id="host">${scaffold()}</div>`), { width: 700 });
    try {
      assert.notEqual(await style('#lone', 'position'), 'fixed', 'a rail outside a scaffold is not an overlay at 700px');
      // An author's own docked fixed rail is not an overlay, so Escape leaves it open.
      await tab.evaluate(() => {
        const lone = document.querySelector('#lone');
        lone.style.position = 'fixed';
        window.lone = Expressive.NavigationRail.init(lone);
        lone.querySelector('a').focus();
      });
      await tab.keyboard.press('Escape');
      assert.equal(await tab.evaluate(() => window.lone.isExpanded), true, 'Escape leaves an author-fixed rail outside a scaffold open');
      await tab.evaluate(() => { window.lone.destroy(); document.querySelector('#lone').remove(); });
      await tab.setViewportSize({ width: 500, height: 800 });
      await tab.locator('#rail').evaluate((el) => el.classList.add('expanded'));
      assert.equal(await style('#rail', 'position'), 'fixed', 'the compact overlay is unchanged at 500px');
      await tab.evaluate(() => { document.documentElement.dir = 'rtl'; document.querySelector('#rail').classList.remove('expanded'); });
      await tab.setViewportSize({ width: 700, height: 800 });
      const before = await box('#pane');
      await tab.locator('#rail').evaluate((el) => el.classList.add('expanded'));
      near((await box('#rail')).right, 700, 'under rtl the overlay sits at the right edge');
      assert.deepEqual(await box('#pane'), before, 'and the pane keeps its box');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: collapsing the medium overlay with motion on leaves the pane in place`, { timeout: 30000 }, async () => {
    const { browser, tab, box } = await open(type, page(scaffold()), { width: 700, reducedMotion: 'no-preference' });
    try {
      const before = await box('#pane');
      await tab.locator('#rail').evaluate((el) => el.classList.add('expanded'));
      await tab.waitForTimeout(600);
      assert.deepEqual(await box('#pane'), before, 'open');
      await tab.locator('#rail').evaluate((el) => el.classList.remove('expanded'));
      assert.deepEqual(await box('#pane'), before, 'as the collapse starts');
      near((await box('#rail')).right, before.left, 'the collapsing rail snaps back into its column instead of drawing under the pane');
      await tab.waitForTimeout(600);
      assert.deepEqual(await box('#pane'), before, 'after the collapse');

      await tab.setViewportSize({ width: 1280, height: 800 });
      await tab.locator('#rail').evaluate((el) => el.classList.add('modal'));
      const wide = await box('#pane');
      await tab.locator('#rail').evaluate((el) => el.classList.add('expanded'));
      await tab.waitForTimeout(600);
      await tab.locator('#rail').evaluate((el) => el.classList.remove('expanded'));
      assert.deepEqual(await box('#pane'), wide, 'a .modal rail at 1280px leaves the pane in place');
      near((await box('#rail')).right, wide.left, 'and snaps back into its column as it collapses');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: resizing across 840px switches the expanded rail between pushing and overlaying`, { timeout: 30000 }, async () => {
    const { browser, tab, style } = await open(type, page(scaffold()), { width: 900 });
    try {
      await tab.evaluate(() => { window.r = Expressive.NavigationRail.init(document.querySelector('#rail')); window.r.expand(); });
      const expanded = () => tab.locator('#rail').evaluate((el) => el.classList.contains('expanded'));
      assert.notEqual(await style('#rail', 'position'), 'fixed', 'at 900px the rail pushes the pane');
      await tab.setViewportSize({ width: 700, height: 800 });
      assert.equal(await style('#rail', 'position'), 'fixed', 'at 700px it overlays');
      await tab.locator('#d1').focus();
      await tab.keyboard.press('Escape');
      assert.equal(await expanded(), false, 'Escape closes the overlay');
      await tab.evaluate(() => window.r.expand());
      await tab.setViewportSize({ width: 900, height: 800 });
      await tab.locator('#d1').focus();
      await tab.keyboard.press('Escape');
      assert.equal(await expanded(), true, 'back at 900px Escape leaves the pushing rail open');
    } finally {
      await tab.evaluate(() => window.r?.destroy()).catch(() => {});
      await browser.close();
    }
  });

  run(`${name}: with a custom expanded breakpoint, Escape still closes the overlay the CSS draws`, { timeout: 60000 }, async () => {
    const custom = compileString('@use "custom" with ($breakpoints: ("medium": 600px, "expanded": 1000px, "large": 1200px, "extra-large": 1600px), $expressive-include-fonts: false);',
      { loadPaths: [new URL('../src/sass', import.meta.url).pathname], logger: { warn() {} } }).css;
    const browser = await leaseBrowser(type);
    const tab = await browser.newPage({ viewport: { width: 900, height: 800 }, reducedMotion: 'reduce' });
    try {
      await tab.setContent(page(scaffold()).replace(css, () => custom));
      await tab.evaluate(() => { window.r = Expressive.NavigationRail.init(document.querySelector('#rail')); window.r.expand(); });
      assert.equal(await tab.locator('#rail').evaluate((el) => getComputedStyle(el).position), 'fixed', 'the custom build overlays at 900px');
      await tab.locator('#d1').focus();
      await tab.keyboard.press('Escape');
      assert.equal(await tab.locator('#rail').evaluate((el) => el.classList.contains('expanded')), false, 'Escape closes it');
    } finally {
      await tab.evaluate(() => window.r?.destroy()).catch(() => {});
      await browser.close();
    }
  });

  run(`${name}: below 600px the scaffold scrolls the document with the app bar and navigation bar pinned`, { timeout: 30000 }, async () => {
    const { browser, tab, box, style } = await open(type, page(`<div id="host">${scaffold({ bar: header('', 'rail'), bottom: navbar })}</div>`), { width: 390 });
    try {
      assert.ok((await box('#s')).height > 800, 'the scaffold grows with its content');
      assert.ok(await tab.locator('#pane').evaluate((el) => el.scrollHeight <= el.clientHeight + 1), 'main is not a scroller');
      await tab.evaluate(() => window.scrollTo(0, 1000));
      assert.equal(await tab.evaluate(() => window.scrollY), 1000, 'the window scrolls');
      near((await box('#bar')).top, 0, 'the app bar stays pinned');
      const nb = await box('#nb');
      near(nb.left, 0, 'the navigation bar starts at the edge');
      near(nb.width, 390, 'and spans the window');
      near(nb.bottom, 800, 'and stays at the bottom');
      assert.equal(await tab.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('#nb')?.id, [195, nb.top + nb.height / 2]), 'nb', 'above the content');

      await tab.evaluate(() => window.scrollTo(0, 0));
      await tab.locator('#host').evaluate((el, html) => { el.innerHTML = html; }, scaffold({ bar: header('', 'rail'), bottom: navbar.replace(/<\/?footer[^>]*>/g, '').replace('class="navigation-bar"', 'class="navigation-bar" id="nb"') }));
      await tab.evaluate(() => window.scrollTo(0, 1000));
      near((await box('#nb')).bottom, 800, 'a bare navigation bar child is pinned too');

      await tab.evaluate(() => window.scrollTo(0, 0));
      await tab.locator('#host').evaluate((el, html) => { el.innerHTML = html; }, scaffold({ bottom: navbar.replace('</nav></footer>', '</nav><small>Copyright</small></footer>') }));
      assert.equal(await style('#nb', 'position'), 'static', 'a footer with more than the navigation bar is a page footer, not the region');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: below 600px the collapsed rail is hidden and opens as an overlay from the app bar`, { timeout: 30000 }, async () => {
    const { browser, tab, style } = await open(type, page(scaffold({ bar: header('', 'rail'), bottom: navbar })), { width: 390 });
    try {
      await tab.evaluate(() => { window.r = Expressive.NavigationRail.init(document.querySelector('#rail')); });
      assert.equal(await style('#rail', 'display'), 'none', 'the collapsed rail is hidden');
      const focused = [];
      for (let i = 0; i < 12; i += 1) {
        await tab.keyboard.press('Tab');
        focused.push(await tab.evaluate(() => document.activeElement?.id || ''));
      }
      assert.ok(!focused.some((id) => /^d\d/.test(id)), `no rail destination takes focus: ${focused}`);
      await tab.locator('#menu').focus();
      await tab.keyboard.press('Enter');
      assert.equal(await style('#rail', 'position'), 'fixed', 'the app bar button opens the overlay');
      await tab.locator('#d1').focus();
      await tab.keyboard.press('Escape');
      assert.equal(await style('#rail', 'display'), 'none', 'Escape closes it');
      assert.equal(await tab.evaluate(() => document.activeElement?.id), 'menu', 'and focus returns to the button');
      await tab.evaluate(() => window.r.expand());
      await tab.mouse.click(370, 400);
      assert.equal(await tab.evaluate(() => window.r.isExpanded), false, 'a scrim tap closes it');
    } finally {
      await tab.evaluate(() => window.r?.destroy()).catch(() => {});
      await browser.close();
    }
  });

  run(`${name}: below 600px keyboard focus scrolls clear of the pinned bars`, { timeout: 30000 }, async () => {
    const main = '<main id="pane"><div style="height:700px">Inbox</div><button type="button" id="low">Archive</button><div style="height:1200px"></div></main>';
    const { browser, tab, box } = await open(type, page(scaffold({ bar: header('', 'rail'), main, bottom: navbar })), { width: 390 });
    try {
      assert.equal(Math.round((await box('#nb')).height), 74, 'the navigation bar has its real height: a 32px indicator around the icon');
      await tab.locator('#menu').focus();
      await tab.keyboard.press('Tab');
      assert.equal(await tab.evaluate(() => document.activeElement?.id), 'low', 'Tab reaches the pane button');
      const low = await box('#low');
      const nbTop = (await box('#nb')).top;
      assert.ok(low.bottom <= nbTop + 1, `the focused button is above the navigation bar: ${low.bottom} vs ${nbTop}`);
      assert.ok(low.top >= (await box('#bar')).bottom - 1, 'and below the app bar');
    } finally {
      await browser.close();
    }
  });


  run(`${name}: below 600px the trailing toolbar turns horizontal, keeps its order and stacks under the bars`, { timeout: 30000 }, async () => {
    const group = `<div class="toolbar-group vertical" id="tg"><div class="toolbar vertical" id="tgi">${['a', 'b', 'c'].map((x) => `<button type="button" id="g${x}" aria-label="${x}">${icon('edit')}</button>`).join('')}</div><button type="button" class="extra circle" aria-label="Compose">${icon('add')}</button></div>`;
    const { browser, tab, box, style } = await open(type, page(`<div id="host">${scaffold({ bottom: navbar })}</div>`), { width: 390 });
    try {
      const xs = async () => Promise.all(['#t0', '#t1', '#t2'].map(async (id) => (await box(id)).left));
      assert.equal(await style('#tools', 'flexDirection'), 'row', 'the toolbar is a row');
      assert.equal(await style('#tools', 'zIndex'), '996', 'at the toolbar tier');
      const tb = await box('#tools');
      assert.ok(tb.width > tb.height, 'wider than tall');
      const ltr = await xs();
      assert.ok(ltr[0] < ltr[1] && ltr[1] < ltr[2], `actions run left to right: ${ltr}`);
      await tab.evaluate(() => { document.documentElement.dir = 'rtl'; });
      const rtl = await xs();
      assert.ok(rtl[0] > rtl[1] && rtl[1] > rtl[2], `under rtl they run right to left: ${rtl}`);
      await tab.evaluate(() => { document.documentElement.dir = 'ltr'; });
      await tab.locator('#host').evaluate((el, html) => { el.innerHTML = html; }, scaffold({ trailing: group, bottom: navbar }));
      await tab.locator('#tgi').evaluate((el) => el.insertAdjacentHTML('beforeend', '<span class="max" id="mx"></span>'));
      assert.ok((await box('#mx')).width < 1, 'a .max spacer takes no width of its own in the row');
      for (const id of ['#tg', '#tgi']) {
        assert.equal(await style(id, 'flexDirection'), 'row', `${id} is a row`);
        const b = await box(id);
        assert.ok(b.width > b.height, `${id} is wider than tall`);
      }
    } finally {
      await browser.close();
    }
  });

  run(`${name}: below 600px the toolbar floats centered 16px above the navigation bar`, { timeout: 30000 }, async () => {
    const { browser, tab, box } = await open(type, page(`<div id="host">${scaffold({ bottom: navbar })}</div>`), { width: 390 });
    try {
      for (const y of [0, 1000]) {
        await tab.evaluate((y) => window.scrollTo(0, y), y);
        const tb = await box('#tools');
        const nb = await box('#nb');
        near((tb.left + tb.right) / 2, 195, `centered at scroll ${y}`);
        assert.ok(Math.abs(tb.bottom - (nb.top - 16)) < 2, `16px above the navigation bar at scroll ${y}: ${tb.bottom} vs ${nb.top}`);
      }
      await tab.evaluate(() => window.scrollTo(0, 0));
      await tab.locator('#host').evaluate((el, html) => { el.innerHTML = html; }, scaffold());
      await tab.evaluate(() => window.scrollTo(0, 1000));
      assert.ok(Math.abs((await box('#tools')).bottom - 784) < 2, 'without a navigation bar, 16px above the window bottom');
      await tab.evaluate(() => window.scrollTo(0, 0));
      await tab.locator('#host').evaluate((el, html) => { el.innerHTML = html; }, scaffold({ bottom: navbar }));
      await tab.evaluate(() => { document.documentElement.style.fontSize = '32px'; window.scrollTo(0, 1000); });
      const big = await box('#tools');
      const bigBar = await box('#nb');
      assert.ok(Math.abs(big.bottom - (bigBar.top - 16)) < 2, `at 200% text it stays 16px above the taller navigation bar: ${big.bottom} vs ${bigBar.top}`);
      await tab.evaluate(() => { document.documentElement.style.fontSize = ''; window.scrollTo(0, 0); });
      await tab.locator('#nb').evaluate((el) => { el.hidden = true; });
      await tab.evaluate(() => window.scrollTo(0, 1000));
      assert.ok(Math.abs((await box('#tools')).bottom - 784) < 2, 'a hidden navigation bar leaves the toolbar 16px above the bottom');
      const bare = navbar.replace(/<\/?footer[^>]*>/g, '').replace('class="navigation-bar"', 'class="navigation-bar" id="nb"');
      for (const [label, bottom, hidden] of [['a bare navigation bar child', bare, false], ['a hidden bar in a shown footer', navbar.replace('class="navigation-bar"', 'class="navigation-bar" hidden'), true]]) {
        await tab.evaluate(() => window.scrollTo(0, 0));
        await tab.locator('#host').evaluate((el, html) => { el.innerHTML = html; }, scaffold({ bottom }));
        await tab.evaluate(() => window.scrollTo(0, 1000));
        const tb = await box('#tools');
        const expected = hidden ? 784 : (await box('#nb')).top - 16;
        assert.ok(Math.abs(tb.bottom - expected) < 2, `${label}: ${tb.bottom} vs ${expected}`);
      }
    } finally {
      await browser.close();
    }
  });

  run(`${name}: the end of a compact page scrolls clear of the floating toolbar, and focus does too`, { timeout: 30000 }, async () => {
    const ending = '<main id="pane"><div style="height:2000px">Inbox</div><p id="last">The end</p></main>';
    const focusing = '<main id="pane"><div style="height:640px">Inbox</div><button type="button" id="low">Archive</button><div style="height:1500px"></div></main>';
    const { browser, tab, box } = await open(type, page(`<div id="host">${scaffold({ bar: header('', 'rail'), main: ending, bottom: navbar })}</div>`), { width: 390 });
    try {
      await tab.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      assert.ok((await box('#last')).bottom <= (await box('#tools')).top + 1, 'the last content ends above the toolbar');
      const endTools = await box('#tools');
      assert.ok(endTools.top >= (await box('#pane')).bottom + 15, 'with its 16px top margin');
      assert.ok(Math.abs(endTools.bottom - ((await box('#nb')).top - 16)) < 2, 'and its 16px bottom margin, where it also sticks');
    } finally {
      await browser.close();
    }
    // The scroll padding keys off a scaffold that is a direct child of <body>.
    const direct = await open(type, page(scaffold({ bar: header('', 'rail'), main: focusing, bottom: navbar })), { width: 390 });
    try {
      await direct.tab.locator('#menu').focus();
      await direct.tab.keyboard.press('Tab');
      assert.equal(await direct.tab.evaluate(() => document.activeElement?.id), 'low');
      const low = await direct.box('#low');
      const tb = await direct.box('#tools');
      assert.ok(low.bottom <= tb.top + 1, `the focused button clears the toolbar: ${low.bottom} vs ${tb.top}`);
    } finally {
      await direct.browser.close();
    }
  });

  run(`${name}: below 600px a left or right tooltip on the floating toolbar shows above its action`, { timeout: 30000 }, async () => {
    // Right tooltips too: under rtl the trailing toolbar sits on the left.
    const tip = (side) => tools().replace(`id="t0" aria-label="Action 0">${icon('event')}</button>`, `id="t0" aria-label="Action 0">${icon('event')}<span class="tooltip ${side}" role="tooltip">Calendar</span></button>`);
    const { browser, tab, box } = await open(type, page(`<div id="host">${scaffold({ trailing: tip('left'), bottom: navbar })}</div>`), { width: 390 });
    try {
      for (const side of ['left', 'right']) {
        await tab.locator('#host').evaluate((el, html) => { el.innerHTML = html; }, scaffold({ trailing: tip(side), bottom: navbar }));
        await tab.locator('#t0').hover();
        await tab.waitForTimeout(300);
        const action = await box('#t0');
        const bubble = await box('#t0 .tooltip');
        assert.ok(bubble.bottom <= action.top + 1, `the ${side} bubble sits above the action: ${bubble.bottom} vs ${action.top}`);
        assert.ok(bubble.right > action.left && bubble.left < action.right, `and over it, not beside it (${side})`);
        const shown = await tab.locator('#t0 .tooltip').evaluate((el) => [getComputedStyle(el).opacity, getComputedStyle(el).transform]);
        assert.equal(shown[0], '1', `the ${side} bubble is shown`);
        assert.match(shown[1], /^matrix\(1, 0, 0, 1,/, `at full scale (${side})`);
        await tab.mouse.move(0, 0);
      }
    } finally {
      await browser.close();
    }
  });

  run(`${name}: a fixed vertical toolbar keeps its own layout below 600px`, { timeout: 30000 }, async () => {
    const fixed = tools().replace('class="toolbar vertical"', 'class="toolbar vertical fixed"');
    const { browser, style } = await open(type, page(scaffold({ trailing: fixed, bottom: navbar })), { width: 390 });
    try {
      assert.equal(await style('#tools', 'flexDirection'), 'column');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: the app bar fills from the document's scroll below 600px`, { timeout: 30000 }, async () => {
    const { browser, tab } = await open(type, page(scaffold({ bottom: navbar })), { width: 390 });
    try {
      if (await tab.evaluate(() => CSS.supports('animation-timeline', 'scroll()'))) {
        const progress = () => tab.locator('#bar').evaluate((el) => getComputedStyle(el).getPropertyValue('--md-comp-top-app-bar-scroll').trim());
        assert.equal(await progress(), '0');
        await tab.evaluate(() => window.scrollTo(0, 100));
        await tab.waitForFunction(() => getComputedStyle(document.querySelector('#bar')).getPropertyValue('--md-comp-top-app-bar-scroll').trim() === '1', null, { timeout: 5000 });
      }
    } finally {
      await browser.close();
    }
  });

  run(`${name}: the compact layout puts the toolbar after the pane, hides custom rails and covers the tall rail`, { timeout: 30000 }, async () => {
    const custom = `<div class="scaffold" id="c"><header>Bar</header><div class="scaffold-rail" id="cr">Rail</div><main id="cp">Pane</main></div>`;
    const { browser, tab, box, style } = await open(type, page(`<div id="host">${scaffold({ bottom: navbar })}</div>`), { width: 390 });
    try {
      await tab.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const main = await box('#pane');
      assert.ok((await box('#tools')).top >= main.bottom - 1, 'at the end of the page the toolbar sits after the pane');
      assert.ok((await box('#tools')).width < 300, 'without stretching across the window');
      await tab.locator('#tools').scrollIntoViewIfNeeded();
      assert.ok((await box('#tools')).bottom <= 801, 'and can be scrolled into view');
      await tab.locator('#host').evaluate((el, html) => { el.innerHTML = html; }, scaffold({ cls: 'tall-rail', bottom: navbar }));
      assert.equal(await style('#rail', 'display'), 'none', 'a tall rail hides too');
      near((await box('#pane')).left, 0, 'and the pane starts at the edge');
      await tab.locator('#host').evaluate((el, html) => { el.innerHTML = html; }, custom);
      assert.equal(await style('#cr', 'display'), 'none', 'a .scaffold-rail hides below 600px');
      await tab.locator('#host').evaluate((el, html) => { el.innerHTML = html; }, scaffold({ bar: '<div class="scaffold-bar" id="cb">Bar</div>', bottom: navbar }));
      await tab.evaluate(() => window.scrollTo(0, 1000));
      near((await box('#cb')).top, 0, 'a .scaffold-bar stays pinned');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: the compact layout ends at 599px and the medium layout starts at 600px`, { timeout: 30000 }, async () => {
    const { browser, tab, box, style } = await open(type, page(`<div id="host">${scaffold({ bottom: navbar })}</div>`), { width: 599 });
    try {
      assert.notEqual(await style('#nb', 'display'), 'none', 'the navigation bar shows at 599px');
      assert.equal(await style('#rail', 'display'), 'none', 'the rail hides at 599px');
      near((await box('#pane')).left, 0, 'the pane starts at the edge');
      await tab.locator('#rail').evaluate((el) => el.classList.add('modal'));
      near((await box('#pane')).left, 0, 'a .modal rail holds no column at 599px');
      near((await box('#pane')).width, (await box('#s')).width, 'and the pane spans the scaffold');
      await tab.locator('#rail').evaluate((el) => el.classList.remove('modal'));
      for (const width of [600, 1280]) {
        await tab.setViewportSize({ width, height: 800 });
        assert.equal(await style('#nb', 'display'), 'none', `the navigation bar hides at ${width}px`);
      }
      await tab.setViewportSize({ width: 600, height: 800 });
      near((await box('#pane')).left, 96, 'at 600px the rail holds its collapsed column');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: below 600px panes grow with their content and the AppBar sentinel moves nothing`, { timeout: 30000 }, async () => {
    const main = `<main id="pane"><div class="panes list-detail"><div class="list-pane"><section id="lb"><div style="height:2000px">List</div></section></div><div class="detail-pane"><section>Detail</section></div></div></main>`;
    const { browser, tab, box } = await open(type, page(`<div id="host">${scaffold({ main, bottom: navbar })}</div>`), { width: 390 });
    try {
      assert.ok(await tab.locator('#lb').evaluate((el) => el.scrollHeight <= el.clientHeight + 1), 'the list body does not scroll on its own');
      assert.ok(await tab.evaluate(() => document.documentElement.scrollHeight > 800), 'the document scrolls instead');
      await tab.locator('#host').evaluate((el, html) => { el.innerHTML = html; }, scaffold({ bar: header('medium'), bottom: navbar }));
      const regions = ['#bar', '#pane', '#tools', '#nb'];
      const before = await Promise.all(regions.map(box));
      await tab.evaluate(() => { window.ab = Expressive.AppBar.init(document.querySelector('#bar')); });
      try {
        assert.deepEqual(await Promise.all(regions.map(box)), before, 'the sentinel moves no region');
      } finally {
        await tab.evaluate(() => window.ab.destroy());
      }
    } finally {
      await browser.close();
    }
  });

  const status = (tag = 'footer') => `<${tag} class="status-bar" id="sb"${tag === 'div' ? ' role="region" aria-label="Status"' : ''}><span>Ready</span><button type="button" class="end" aria-label="Notifications">${icon('notifications')}</button></${tag}>`;

  run(`${name}: a status bar spans the scaffold's full width along the bottom`, { timeout: 30000 }, async () => {
    const { browser, tab, box } = await open(type, page('<div id="host"></div>'));
    try {
      for (const [label, html] of [['footer', scaffold({ bottom: status() })], ['div region', scaffold({ bottom: status('div') })]]) {
        await tab.locator('#host').evaluate((el, h) => { el.innerHTML = h; }, html);
        const sb = await box('#sb');
        assert.deepEqual([sb.left, sb.width], [0, 1280], `${label}: full width`);
        near(sb.bottom, 800, `${label}: at the bottom edge`);
        near((await box('#rail')).bottom, sb.top, `${label}: the rail ends at the status bar`);
        near((await box('#pane')).bottom, sb.top - 16, `${label}: the pane floats 16px above it`);
        const tb = await box('#tools');
        near((tb.top + tb.bottom) / 2, ((await box('#bar')).bottom + sb.top) / 2, `${label}: the toolbar is centered above it`);
      }
      await tab.locator('#host').evaluate((el, h) => { el.innerHTML = h; }, scaffold({ cls: 'tall-rail', bottom: status() }));
      const sb = await box('#sb');
      const nav = await box('#rail');
      assert.equal(nav.top, 0);
      near(nav.bottom, sb.top, 'the tall rail ends at the status bar');
      const tb = await box('#tools');
      near((tb.top + tb.bottom) / 2, sb.top / 2, 'the toolbar is centered above it too');
      assert.deepEqual([sb.left, sb.width], [0, 1280], 'and the status bar runs under the rail');
      await tab.setViewportSize({ width: 700, height: 800 });
      await tab.locator('#host').evaluate((el, h) => { el.innerHTML = h; }, scaffold({ bottom: status() }));
      near((await box('#pane')).left, 96, 'at 700px the rail column is still held');
      const held = await box('#sb');
      assert.deepEqual([held.left, held.width], [0, 700], 'with the status bar under the held column');
      near(held.bottom, 800, 'and at the bottom');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: the status bar hides below 600px and grows with the text`, { timeout: 30000 }, async () => {
    const { browser, tab, box, style } = await open(type, page(`<div id="host">${scaffold({ bottom: status() + navbar })}</div>`), { width: 390 });
    try {
      assert.equal(await style('#sb', 'display'), 'none', 'hidden with the navigation bar on compact windows');
      await tab.setViewportSize({ width: 1280, height: 800 });
      await tab.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
      const sb = await box('#sb');
      assert.ok(sb.height >= 48, `the status bar grows: ${sb.height}`);
      near(sb.bottom, 800, 'and stays at the bottom');
      near((await box('#pane')).bottom, sb.top - 16, 'with the pane floating 16px above it');
    } finally {
      await browser.close();
    }
  });

  // Canvas-normalized colors, so color-mix() and rgb() strings compare.
  const rgb = (tab, sel, prop = 'backgroundColor') => tab.locator(sel).evaluate((el, prop) => {
    const ctx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d');
    ctx.fillStyle = getComputedStyle(el)[prop];
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data];
  }, prop);
  // A color-mix() through oklab can round one byte away from the role itself.
  const sameColor = (a, b, msg) => assert.ok(a.every((v, i) => Math.abs(v - b[i]) <= 1), `${msg}: ${a} vs ${b}`);
  const roles = ['surface', 'surface-container', 'surface-container-high', 'surface-container-low'];
  const probes = `<div id="probes">${roles.map((r) => `<i id="p-${r}" style="color:var(--md-sys-color-${r})"></i>`).join('')}</div>`;

  run(`${name}: from 600px up the pane floats as a rounded surface on a surface-container shell`, { timeout: 30000 }, async () => {
    const { browser, tab, box, style } = await open(type, page(`${probes}<div id="host">${scaffold()}</div>`), { width: 1024 });
    try {
      const role = (r) => rgb(tab, `#p-${r}`, 'color');
      sameColor(await rgb(tab, '#s'), await role('surface-container'), 'the shell is surface-container');
      sameColor(await rgb(tab, '#bar'), await role('surface-container'), 'the app bar blends with it');
      sameColor(await rgb(tab, '#pane'), await role('surface'), 'the pane is surface');
      assert.equal(await style('#pane', 'borderTopLeftRadius'), '16px', 'with 16px corners');
      if (await tab.evaluate(() => CSS.supports('timeline-scope', '--a'))) {
        await tab.locator('#pane').evaluate((el) => el.scrollTo(0, 200));
        await tab.waitForFunction(() => getComputedStyle(document.querySelector('#bar')).getPropertyValue('--md-comp-top-app-bar-scroll').trim() === '1', null, { timeout: 5000 });
        sameColor(await rgb(tab, '#bar'), await role('surface-container-high'), 'the scrolled bar fills with surface-container-high');
      }

      const render = (o) => tab.locator('#host').evaluate((el, h) => { el.innerHTML = h; }, scaffold(o));
      await render({ trailing: '' });
      let main = await box('#pane');
      near(main.top, (await box('#bar')).bottom, 'the pane meets the bar');
      near(main.left, (await box('#rail')).right, 'and the rail');
      near(main.bottom, 784, '16px above the bottom');
      near(main.right, 1008, '16px from the trailing edge without a toolbar');
      await render();
      near((await box('#tools')).left - (await box('#pane')).right, 24, 'the toolbar keeps its 24px margin as the gap');
      await render({ nav: '', trailing: '' });
      near((await box('#pane')).left, 16, '16px from the leading edge without a rail');
      await render({ nav: rail().replace('class="navigation-rail"', 'class="navigation-rail" hidden'), trailing: '' });
      near((await box('#pane')).left, 16, 'a hidden rail counts as absent');
      await render({ nav: '<div class="scaffold-rail"></div>', trailing: '' });
      near((await box('#pane')).left, 16, 'an empty custom rail counts as absent');
      await render({ bar: '', trailing: '' });
      near((await box('#pane')).top, 16, 'without a bar the pane floats 16px from the top');
      await render({ trailing: '<div class="scaffold-trailing" id="ct" style="width:60px">Tools</div>' });
      near((await box('#ct')).left - (await box('#pane')).right, 16, 'a custom trailing region gets the 16px gap');
      await render({ trailing: '', bottom: '<footer class="status-bar" id="sb"><span>Ready</span></footer>' });
      near((await box('#pane')).bottom, (await box('#sb')).top - 16, '16px above a status bar');
      await tab.setViewportSize({ width: 700, height: 800 });
      await render({ trailing: '' });
      near((await box('#pane')).left, 96, 'at 700px the pane starts at the held rail column');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: the floating surface stays off compact windows and out of separated panes`, { timeout: 30000 }, async () => {
    const sep = (cls) => `<main id="pane"><div class="${cls}" id="lp"><div class="pane" id="p1"><section>A</section></div><div class="pane"><section>B</section></div></div></main>`;
    const { browser, tab, box, style } = await open(type, page(`${probes}<div id="host">${scaffold()}</div>`), { width: 390 });
    try {
      assert.equal(await style('#s', 'backgroundColor'), 'rgba(0, 0, 0, 0)', 'no shell color below 600px');
      assert.equal(await style('#pane', 'backgroundColor'), 'rgba(0, 0, 0, 0)', 'no pane surface');
      assert.equal(await style('#pane', 'borderTopLeftRadius'), '0px', 'square corners');
      await tab.setViewportSize({ width: 1024, height: 800 });
      const render = (main) => tab.locator('#host').evaluate((el, h) => { el.innerHTML = h; }, scaffold({ main, trailing: '' }));
      for (const cls of ['panes separated', 'pane-layout floating']) {
        await render(sep(cls));
        assert.equal(await style('#pane', 'backgroundColor'), 'rgba(0, 0, 0, 0)', `${cls}: no surface around the cards`);
        assert.equal(await style('#pane', 'borderTopLeftRadius'), '0px', `${cls}: no radius`);
        const main = await box('#pane');
        near(main.right, 1024, `${cls}: no trailing gap`);
        near(main.bottom, 800, `${cls}: no bottom gap`);
        sameColor(await rgb(tab, '#p1'), await rgb(tab, '#p-surface-container-low', 'color'), `${cls}: the panes keep their cards`);
      }
      await render('<main id="pane" class="panes list-detail"><div class="list-pane">A</div><div class="detail-pane">B</div></main>');
      assert.equal(await style('#pane', 'marginInlineEnd'), '24px', 'a panes container keeps its own margins');
      assert.equal(await style('#pane', 'borderTopLeftRadius'), '0px', 'and gets no radius');
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

  runChromium('chromium: under forced colors the floating pane keeps a visible edge', { timeout: 30000 }, async () => {
    const { browser, tab } = await open(chromium, page(scaffold()), { width: 1024, forcedColors: 'active' });
    try {
      const border = await tab.locator('#pane').evaluate((el) => [getComputedStyle(el).borderTopStyle, getComputedStyle(el).borderTopWidth]);
      assert.deepEqual(border, ['solid', '1px']);
    } finally {
      await browser.close();
    }
  });
}
