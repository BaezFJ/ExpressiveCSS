// A larger browser font size raises the root font size, and type is rem. These
// controls size their boxes in rem too, so at a 32px root everything that holds
// text or an icon is twice as large and nothing inside it spills or overlaps.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const browserTest = existsSync(chromium.executablePath()) ? test : test.skip;
const icon = (name) => `<span class="material-symbols" aria-hidden="true">${name}</span>`;

const markup = `
  <button id="button">Save</button>
  <button id="icon-button" class="icon-button" aria-label="Add">${icon('add')}</button>
  <button id="fab" class="circle extra" aria-label="Edit">${icon('edit')}</button>
  <span id="badge" class="badge">999+</span>
  <span id="avatar" class="avatar" role="img" aria-label="Grace Hopper">GH</span>
  <div class="keypad" role="group" aria-label="PIN"><button id="key" type="button" value="1">1</button></div>
  <div class="field">${icon('search').replace('class="', 'id="prefix-icon" class="prefix ')}
    <input id="prefix" type="text" placeholder=" " value="Text"><label for="prefix">Search</label></div>
  <div class="field">
    <input id="suffix" type="text" placeholder=" " value="Text"><label for="suffix">Amount</label>${icon('euro').replace('class="', 'id="suffix-icon" class="suffix ')}</div>
  <div class="field">
    <input id="password" type="password" placeholder=" " value="secret"><label for="password">Password</label>
    <button id="toggle" type="button" class="icon-button suffix password-toggle" aria-pressed="false" aria-label="Show password">${icon('visibility')}${icon('visibility_off')}</button></div>
  <div class="field">
    <input id="quantity" type="number" placeholder=" " value="1"><label for="quantity">Quantity</label>
    <button id="down" type="button" class="icon-button suffix" data-step="down" aria-label="Decrease">${icon('remove')}</button>
    <button id="up" type="button" class="icon-button suffix" data-step="up" aria-label="Increase">${icon('add')}</button></div>`;

// Boxes of every [id], and each field input's content box: where its text may run.
const measure = (page) => page.evaluate(() => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height }; };
  const out = Object.fromEntries([...document.querySelectorAll('[id]')].map((el) => [el.id, box(el)]));
  for (const input of document.querySelectorAll('.field > input')) {
    const s = getComputedStyle(input);
    const r = input.getBoundingClientRect();
    out[`${input.id}-text`] = { left: r.left + parseFloat(s.paddingLeft), right: r.right - parseFloat(s.paddingRight) };
  }
  for (const el of document.querySelectorAll('.badge, .avatar')) out[`${el.id}-fits`] = el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1;
  return out;
});

const at = async (rootSize) => {
  const browser = await leaseBrowser(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 1400 } });
    await page.setContent(`<style>${css} html { font-size: ${rootSize}px } .field { max-width: 40rem }</style>${markup}`);
    return await measure(page);
  } finally {
    await browser.close();
  }
};

browserTest('controls keep their default sizes at a 16px root and double at a 32px root', async () => {
  const [base, large] = [await at(16), await at(32)];
  const defaults = { button: 40, 'icon-button': 40, fab: 56, badge: 16, avatar: 40, key: 72, prefix: 56 };
  for (const [id, height] of Object.entries(defaults)) {
    assert.equal(base[id].height, height, `${id} at 16px`);
    assert.equal(large[id].height, height * 2, `${id} at 32px`);
  }
  assert.ok(large['badge-fits'] && large['avatar-fits'], 'the badge and the avatar still hold their text');
});

browserTest('at a 32px root a field\'s text clears its icons, toggle and stepper buttons', async () => {
  for (const size of [16, 32]) {
    const m = await at(size);
    assert.ok(m['prefix-text'].left >= m['prefix-icon'].right - 0.5, `${size}: the text starts after the leading icon`);
    assert.ok(m['suffix-text'].right <= m['suffix-icon'].left + 0.5, `${size}: the text stops before the trailing icon`);
    assert.ok(m['password-text'].right <= m.toggle.left + 0.5, `${size}: the password stops before the toggle`);
    assert.ok(m['quantity-text'].right <= m.down.left + 0.5, `${size}: the number stops before the stepper`);
    assert.ok(m.down.right <= m.up.left + 0.5, `${size}: the stepper buttons do not overlap`);
  }
});
