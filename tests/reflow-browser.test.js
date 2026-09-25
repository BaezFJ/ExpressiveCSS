import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const browserTest = existsSync(chromium.executablePath()) ? test : test.skip;
const long = 'Download the product import template';

// Box, line count and label inset for every [id] on the page. Lines are the
// distinct top edges of the label's text, leaving out icon ligatures.
const measure = (page) => page.evaluate(() => Object.fromEntries(
  [...document.querySelectorAll('[id]')].map((el) => {
    const box = el.getBoundingClientRect();
    const parent = el.parentElement.getBoundingClientRect();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const text = [];
    while (walker.nextNode()) {
      if (walker.currentNode.parentElement.closest('.material-symbols')) continue;
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      text.push(...[...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0));
    }
    const style = getComputedStyle(el);
    return [el.id, {
      height: box.height,
      lines: new Set(text.map((r) => Math.round(r.top))).size,
      topInset: text.length ? Math.min(...text.map((r) => r.top)) - box.top : 0,
      bottomInset: text.length ? box.bottom - Math.max(...text.map((r) => r.bottom)) : 0,
      insideParent: box.left >= parent.left - 0.5 && box.right <= parent.right + 0.5,
      contentFits: el.scrollWidth <= el.clientWidth + 1,
      whiteSpace: style.whiteSpace
    }];
  })
));

browserTest('a short button label keeps every size at its container height', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
    const sizes = { xsmall: 32, small: 40, medium: 56, large: 96, xlarge: 136 };
    await page.setContent(`<style>${css}</style>
      ${Object.keys(sizes).map((size) => `
        <button id="${size}-filled" class="${size}">Save</button>
        <button id="${size}-outlined" class="${size} outlined"><span class="material-symbols" aria-hidden="true">add</span><span>Save</span></button>
        <a id="${size}-link" class="button ${size} tonal" href="#">Save</a>`).join('')}
      <label id="label" class="button">Upload</label>`);
    const boxes = await measure(page);
    for (const [size, height] of Object.entries(sizes)) {
      for (const kind of ['filled', 'outlined', 'link']) {
        assert.equal(boxes[`${size}-${kind}`].height, height, `${size} ${kind}`);
        assert.equal(boxes[`${size}-${kind}`].lines, 1, `${size} ${kind}`);
      }
    }
    assert.equal(boxes.label.height, 40);
  } finally {
    await browser.close();
  }
});

browserTest('a long button label wraps, grows and stays inside a narrow parent', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
    await page.setContent(`<style>${css}</style>
      <div style="width: 160px">
        <button id="button"><span>${long}</span></button>
      </div>
      <div style="width: 160px">
        <a id="link" class="button outlined" href="#">${long}</a>
      </div>
      <div style="width: 160px">
        <button id="medium" class="medium tonal"><span class="material-symbols" aria-hidden="true">download</span><span>${long}</span></button>
      </div>
      <div style="width: 120px">
        <button id="word"><span>products-import-template.csv</span></button>
      </div>
      <div class="file-field" style="width: 150px">
        <label id="file" class="button">${long}<input type="file"></label>
        <div class="file-path-wrapper"><input class="file-path" type="text" readonly aria-label="Selected file"></div>
      </div>`);
    const boxes = await measure(page);
    for (const [id, minimum] of [['button', 40], ['link', 40], ['medium', 56], ['word', 40], ['file', 48]]) {
      const box = boxes[id];
      assert.equal(box.whiteSpace, 'normal', id);
      assert.ok(box.lines > 1, `${id} kept its label on one line`);
      assert.ok(box.height > minimum, `${id} did not grow past ${minimum}px: ${box.height}`);
      assert.ok(box.insideParent, `${id} overflows its parent`);
      assert.ok(box.contentFits, `${id} label overflows the button`);
      assert.ok(box.topInset >= 4 && box.bottomInset >= 4, `${id} lines touch the edge: ${box.topInset}/${box.bottomInset}`);
    }
  } finally {
    await browser.close();
  }
});

browserTest('enlarged text grows a button instead of overflowing it', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 400, height: 900 } });
    await page.setContent(`<style>${css} html { font-size: 32px; }</style>
      <button id="save">Save</button>`);
    const { save } = await measure(page);
    assert.equal(save.lines, 1);
    assert.ok(save.height > 40, `200% text stayed at ${save.height}px`);
    assert.ok(save.topInset >= 4 && save.bottomInset >= 4);
  } finally {
    await browser.close();
  }
});

browserTest('fixed-geometry buttons and one-line hosts keep one line at a fixed height', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setContent(`<style>${css}</style>
      <div style="width: 120px">
        <button id="circle" class="circle" aria-label="Add"><span class="material-symbols" aria-hidden="true">add</span></button>
        <button id="fab" class="circle extra" aria-label="Edit"><span class="material-symbols" aria-hidden="true">edit</span></button>
        <button id="extend" class="extend small"><span class="material-symbols" aria-hidden="true">edit</span><span>${long}</span></button>
      </div>
      <div class="button-group" style="width: 160px"><button id="group" class="tonal">${long}</button></div>
      <div class="split-button" style="width: 160px">
        <button id="split">${long}</button>
        <button class="menu-trigger" data-target="menu" aria-label="More"><span class="material-symbols" aria-hidden="true">keyboard_arrow_down</span></button>
      </div>
      <div class="toolbar" style="width: 160px"><button id="toolbar">${long}</button></div>`);
    const boxes = await measure(page);
    for (const [id, height] of [['circle', 40], ['fab', 56], ['extend', 56], ['group', 40], ['split', 40], ['toolbar', 48]]) {
      assert.equal(boxes[id].whiteSpace, 'nowrap', id);
      assert.equal(boxes[id].height, height, id);
      assert.ok(boxes[id].lines <= 1, id);
    }
  } finally {
    await browser.close();
  }
});

browserTest('a chip keeps 32dp for a short label and wraps with an inset for a long one', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
    await page.setContent(`<style>${css}</style>
      <span id="short" class="chip">Paid</span>
      <span id="avatar" class="chip"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="">Ana</span>
      <span id="input" class="chip">Ana<button class="close" type="button" aria-label="Remove Ana"><span class="material-symbols" aria-hidden="true">close</span></button></span>
      <div style="width: 140px"><button id="long" type="button" class="chip">${long}</button></div>`);
    const boxes = await measure(page);
    for (const id of ['short', 'avatar', 'input']) assert.equal(boxes[id].height, 32, id);
    assert.ok(boxes.long.lines > 1);
    assert.ok(boxes.long.height > 32);
    assert.ok(boxes.long.insideParent);
    assert.ok(boxes.long.topInset >= 4 && boxes.long.bottomInset >= 4);
  } finally {
    await browser.close();
  }
});
