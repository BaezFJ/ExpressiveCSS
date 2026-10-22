// An open menu is a manual popover in the top layer: no ancestor clips it,
// Menu writes no styles on its ancestors, and it stays next to its trigger
// under a transform, while a container scrolls, and above a modal dialog.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const items = '<li><button type="button">One</button></li><li><button type="button">Two</button></li><li><button type="button">Three</button></li>';
const frames = 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))';

// The menu's box against its trigger's, and whether the point near the
// menu's bottom-right corner hits the menu, so a clipped menu is caught.
const geometry = (root, id) => {
  const menu = root.getElementById(id);
  const [t, m] = [root.getElementById(`${id}-trigger`).getBoundingClientRect(), menu.getBoundingClientRect()];
  const hit = root.elementFromPoint(m.right - 6, m.bottom - 6);
  return { dx: Math.round(m.left - t.left), dy: Math.round(m.top - t.bottom), open: menu.matches(':popover-open'), visible: menu.contains(hit) };
};

async function page(browserType, body) {
  const browser = await leaseBrowser(browserType);
  const tab = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await tab.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>${body}<script>${js}</script></body></html>`);
  await tab.evaluate(`window.geometry = ${geometry}; window.frames2 = () => ${frames};`);
  return { browser, tab };
}

for (const [engine, browserType, browserTest] of engines) {
  browserTest(`${engine}: a menu in a clipping container opens in the top layer without styling its ancestors`, async () => {
    const { browser, tab } = await page(browserType, `
      <div id="clip" style="margin: 40px; width: 200px; height: 60px; overflow: hidden">
        <button type="button" id="m-trigger" data-target="m">Open</button><menu id="m">${items}</menu>
      </div>
      <div id="host" style="margin: 40px; width: 200px; height: 60px; overflow: hidden"></div>`);
    try {
      const light = await tab.evaluate(async () => {
        Expressive.Menu.init(document.getElementById('m-trigger'), { inDuration: 0 }).open();
        await frames2();
        return { ...geometry(document, 'm'), position: document.getElementById('clip').style.position };
      });
      assert.deepEqual(light, { dx: 0, dy: 0, open: true, visible: true, position: '' });

      const shadow = await tab.evaluate(async (css) => {
        const root = document.getElementById('host').attachShadow({ mode: 'open' });
        root.innerHTML = `<style>${css}</style><div style="overflow: hidden; height: 60px"><button type="button" id="s-trigger" data-target="s">Open</button>
          <menu id="s"><li><button type="button">One</button></li><li><button type="button">Two</button></li><li><button type="button">Three</button></li></menu></div>`;
        Expressive.Menu.init(root.getElementById('s-trigger'), { inDuration: 0 }).open();
        await frames2();
        return geometry(root, 's');
      }, css);
      assert.deepEqual(shadow, { dx: 0, dy: 0, open: true, visible: true }, 'in a shadow root too');

      await tab.evaluate(async () => {
        Expressive.Menu.getInstance(document.getElementById('m-trigger')).close();
        await new Promise((resolve) => setTimeout(resolve, 400));
      });
      assert.equal(await tab.evaluate(() => document.getElementById('m').matches(':popover-open')), false, 'closing leaves the top layer');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a menu in a floating toolbar centred with a transform opens under its trigger and follows scrolling`, async () => {
    const { browser, tab } = await page(browserType, `<div style="height: 2000px"></div>
      <div style="position: fixed; left: 50%; bottom: 200px; transform: translateX(-50%); padding: 8px 120px">
        <button type="button" id="m-trigger" data-target="m">More</button><menu id="m">${items}</menu>
      </div>`);
    try {
      const read = () => tab.evaluate(async () => { await frames2(); return geometry(document, 'm'); });
      await tab.evaluate(() => Expressive.Menu.init(document.getElementById('m-trigger'), { inDuration: 0, constrainWidth: false }).open());
      assert.deepEqual(await read(), { dx: 0, dy: 0, open: true, visible: true });
      await tab.evaluate(() => window.scrollTo(0, 300));
      assert.deepEqual(await read(), { dx: 0, dy: 0, open: true, visible: true }, 'after the page scrolls under the fixed toolbar');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a cover-trigger menu follows its trigger while its container scrolls`, async () => {
    const { browser, tab } = await page(browserType, `
      <div id="scroller" style="margin: 40px; height: 300px; overflow: auto"><div style="height: 1200px; padding-top: 100px">
        <button type="button" id="m-trigger" data-target="m">Open</button><menu id="m">${items}</menu>
      </div></div>`);
    try {
      const top = () => tab.evaluate(async () => {
        await frames2();
        return Math.round(document.getElementById('m').getBoundingClientRect().top - document.getElementById('m-trigger').getBoundingClientRect().top);
      });
      await tab.evaluate(() => Expressive.Menu.init(document.getElementById('m-trigger'), { inDuration: 0, coverTrigger: true }).open());
      assert.equal(await top(), 0, 'covers the trigger');
      await tab.evaluate(() => { document.getElementById('scroller').scrollTop = 60; });
      assert.equal(await top(), 0, 'and still covers it after the container scrolls');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a hover menu stays open while the pointer moves into it and closes when it leaves`, async () => {
    const { browser, tab } = await page(browserType, `<div style="margin: 40px">
      <button type="button" id="m-trigger" data-target="m">Hover</button><menu id="m">${items}</menu></div>`);
    try {
      await tab.evaluate(() => Expressive.Menu.init(document.getElementById('m-trigger'), { hover: true, inDuration: 0, outDuration: 0 }));
      const isOpen = () => tab.evaluate(() => Expressive.Menu.getInstance(document.getElementById('m-trigger')).isOpen);
      await tab.locator('#m-trigger').hover();
      await tab.locator('#m li:nth-child(2) button').hover();
      await tab.waitForTimeout(100);
      assert.equal(await isOpen(), true, 'the menu in the top layer still counts as the menu');
      await tab.mouse.move(700, 500);
      await tab.waitForTimeout(100);
      assert.equal(await isOpen(), false);
    } finally {
      await browser.close();
    }
  });

  browserTest(`${engine}: a menu in a modal dialog opens above it, chooses an item and returns focus without closing the dialog`, async () => {
    const { browser, tab } = await page(browserType, `
      <dialog id="d" style="width: 240px; height: 80px; overflow: auto">
        <button type="button" id="m-trigger" data-target="m">Open</button><menu id="m">${items}</menu>
      </dialog>`);
    try {
      await tab.evaluate(() => {
        const trigger = document.getElementById('m-trigger');
        window.seen = [];
        for (const type of ['open', 'opened', 'select', 'close', 'closed']) trigger.addEventListener(`expressive:${type}`, () => seen.push(type));
        document.getElementById('d').showModal();
        Expressive.Menu.init(trigger, { inDuration: 0, outDuration: 0 });
      });
      await tab.locator('#m-trigger').click();
      await tab.waitForFunction(() => document.activeElement?.closest('#m'));
      const placed = await tab.evaluate(() => {
        const dialog = document.getElementById('d').getBoundingClientRect();
        return { ...geometry(document, 'm'), pastDialog: document.getElementById('m').getBoundingClientRect().bottom > dialog.bottom };
      });
      assert.deepEqual(placed, { dx: 0, dy: 0, open: true, visible: true, pastDialog: true });
      await tab.locator('#m li:last-child button').click();
      await tab.waitForFunction(() => seen.includes('closed'));
      const after = await tab.evaluate(() => ({ seen, dialogOpen: document.getElementById('d').open, focus: document.activeElement.id }));
      assert.deepEqual(after, { seen: ['open', 'opened', 'select', 'close', 'closed'], dialogOpen: true, focus: 'm-trigger' });
    } finally {
      await browser.close();
    }
  });
}
