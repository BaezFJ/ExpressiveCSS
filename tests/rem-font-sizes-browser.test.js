import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const icon = (id, name = 'info', extra = '') => `<span id="${id}" class="material-symbols${extra}" aria-hidden="true">${name}</span>`;

const markup = `
  <dialog open>${icon('dialog-icon')}<h2>Delete draft?</h2></dialog>
  <dialog class="side-sheet" open><header><h2>Filters</h2><button type="button" aria-label="Close">${icon('header-icon', 'close')}</button></header></dialog>
  <div class="snackbar">${icon('snackbar-icon')}<p>Saved</p><button type="button" class="circle" aria-label="Dismiss">${icon('snackbar-close', 'close')}</button></div>
  <div class="alert">${icon('alert-icon')}<p>Payment failed</p></div>
  <dialog class="command-palette" open><ul><li><a href="#find">${icon('palette-icon', 'search')}Find</a></li></ul></dialog>
  <ul class="list"><li>${icon('list-icon', 'person', ' circle')}<span>Ada</span></li></ul>
  <ul class="tree"><li><span>${icon('tree-icon', 'folder')}Docs</span></li></ul>
  <span class="message-avatar">${icon('message-icon', 'person')}</span>
  <div class="map"><div id="map-popup" class="maplibregl-popup-content"><button id="map-close" type="button" class="maplibregl-popup-close-button" aria-label="Close popup">×</button><p>Depot</p></div></div>
  <ol class="timeline"><li id="timeline-row">${icon('timeline-icon', 'event')}<p>Shipped</p></li></ol>
  <ol class="timeline"><li>${icon('short-icon-1', 'event')}<time>May 2</time></li><li>${icon('short-icon-2', 'event')}<time>May 1</time></li></ol>
  <div class="drop-zone"><label>${icon('drop-icon', 'upload')}Drop files<input type="file"></label></div>
  <fieldset><legend>${icon('legend-icon', 'tune')}Filters</legend></fieldset>
  <div class="file-field"><label id="file-label" class="button">Upload<input id="file-input" type="file"></label></div>
  <div id="plate" class="timepicker-plate"><div id="tick" class="timepicker-tick">12</div></div>`;

// Computed px sizes at a root font size of 16 * scale. Ticks keep their box,
// and the plate its width, because the Timepicker script places ticks in px.
const expected = (scale) => {
  const box = (size) => ({ fontSize: size * scale, width: size * scale, height: size * scale, lineHeight: size * scale });
  return {
    'dialog-icon': box(24),
    'header-icon': box(24),
    'snackbar-icon': box(24),
    'snackbar-close': box(24),
    'legend-icon': box(18),
    'alert-icon': { fontSize: 24 * scale, lineHeight: 20 * scale },
    'palette-icon': { fontSize: 20 * scale },
    'list-icon': { fontSize: 20 * scale },
    'tree-icon': { fontSize: 20 * scale },
    'message-icon': { fontSize: 20 * scale },
    'drop-icon': { fontSize: 32 * scale },
    'file-input': { fontSize: 20 * scale },
    'map-close': { fontSize: 20 * scale, width: 32 * scale, height: 32 * scale },
    'map-popup': { paddingRight: 12 + 32 * scale },
    'timeline-icon': { fontSize: 18 * scale, width: 32 * scale, height: 32 * scale },
    'timeline-row': { paddingLeft: 32 * scale + 16 },
    tick: { fontSize: 15 * scale, width: 40, height: 40 },
    plate: { width: 270 }
  };
};

const measure = (page, wanted) => page.evaluate((wanted) => Object.fromEntries(
  Object.entries(wanted).map(([id, props]) => {
    const style = getComputedStyle(document.getElementById(id));
    return [id, Object.fromEntries(Object.keys(props).map((prop) => [prop, parseFloat(style[prop])]))];
  })
), wanted);

// Space between two short events' badges, which are absolutely placed.
const badgeGap = (page) => page.evaluate(() => {
  const box = (id) => document.getElementById(id).getBoundingClientRect();
  return box('short-icon-2').top - box('short-icon-1').bottom;
});

// The connector line starts below the badge and runs through its centre.
const connector = (page) => page.evaluate(() => {
  const line = getComputedStyle(document.getElementById('timeline-row'), '::after');
  return { top: parseFloat(line.top), left: parseFloat(line.left) };
});

for (const [name, engine, test] of engines) {
  test(`${name}: icons and tick text grow with the root font size`, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css}</style>${markup}`);
      for (const scale of [1, 2]) {
        await page.evaluate((size) => { document.documentElement.style.fontSize = `${size}px`; }, 16 * scale);
        const wanted = expected(scale);
        assert.deepEqual(await measure(page, wanted), wanted, `root ${16 * scale}px`);
        assert.deepEqual(await connector(page), { top: 32 * scale + 4, left: 16 * scale - 0.5 }, `root ${16 * scale}px`);
        assert.ok(await badgeGap(page) >= 8, `badges overlap at root ${16 * scale}px`);
      }
    } finally {
      await browser.close();
    }
  });

  test(`${name}: the file input still covers its label at a doubled root`, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css}</style>${markup}`);
      await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
      const boxes = await page.evaluate(() => {
        const input = document.getElementById('file-input');
        const rect = (el) => el.getBoundingClientRect().toJSON();
        return { input: rect(input), label: rect(input.parentElement), opacity: getComputedStyle(input).opacity };
      });
      assert.equal(boxes.opacity, '0');
      for (const side of ['left', 'top', 'right', 'bottom']) assert.equal(boxes.input[side], boxes.label[side], side);
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#file-label')]);
      assert.equal(chooser.element() !== null, true);
    } finally {
      await browser.close();
    }
  });
}
