// Right-to-left layout that has to agree across elements.
//
// A text field's icons, label and input padding must agree on a side. They all
// follow the field's dir; an input may carry its own (dir="auto" for mixed
// text, dir="ltr" for an email address on an RTL page), and padding that
// followed the input put the text under the icon.
//
// A date range band must face the rest of the range whether the page, the
// isRTL option, or both mirror the calendar.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const field = (inputDir) => `<div class="field" style="width:320px">
  <span class="material-symbols prefix" aria-hidden="true">search</span>
  <input id="q" type="text" placeholder=" " ${inputDir ? `dir="${inputDir}"` : ''}><label for="q">Search</label>
  <span class="material-symbols suffix" aria-hidden="true">mic</span></div>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: field icons and input padding share the field's direction`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      for (const [pageDir, inputDir] of [['ltr', ''], ['ltr', 'rtl'], ['ltr', 'auto'], ['rtl', ''], ['rtl', 'ltr']]) {
        await page.setContent(`<!doctype html><html lang="en" dir="${pageDir}"><head><style>${css}</style></head><body>${field(inputDir)}</body></html>`);
        const r = await page.evaluate(() => {
          const box = (s) => document.querySelector(s).getBoundingClientRect();
          const cs = getComputedStyle(document.getElementById('q'));
          const input = box('#q');
          return { prefixAtLeft: box('.prefix').left - input.left < input.width / 2, padLeft: cs.paddingLeft, padRight: cs.paddingRight };
        });
        const label = `${pageDir} page, input dir=${inputDir || 'inherited'}`;
        assert.equal(r.prefixAtLeft, pageDir === 'ltr', `${label}: prefix side`);
        assert.deepEqual([r.padLeft, r.padRight], ['52px', '52px'], `${label}: both icons keep their clearance`);
      }
      // One icon: the clearance sits on the icon's side only.
      await page.setContent(`<!doctype html><html lang="en" dir="rtl"><head><style>${css}</style></head><body>
        <div class="field" style="width:320px"><span class="material-symbols prefix">search</span><input id="q" dir="ltr" placeholder=" "><label for="q">Email</label></div></body></html>`);
      const one = await page.evaluate(() => { const cs = getComputedStyle(document.getElementById('q')); return [cs.paddingLeft, cs.paddingRight]; });
      assert.deepEqual(one, ['16px', '52px'], 'rtl field, ltr input: the prefix clearance is on the right, with the icon');

      // A page that sets only CSS direction renders as LTR, but never with the
      // toggle on one side and its clearance on the other.
      await page.setContent(`<!doctype html><html lang="en" style="direction:rtl"><head><style>${css}</style></head><body>
        <div class="field" style="width:320px"><input id="pw" type="password" placeholder=" " value="hunter22"><label id="pl" for="pw">Password</label>
        <button id="eye" type="button" class="icon-button suffix" aria-label="Show password"><span class="material-symbols">visibility</span></button></div></body></html>`);
      const cssOnly = await page.evaluate(() => {
        const box = (id) => document.getElementById(id).getBoundingClientRect();
        const cs = getComputedStyle(document.getElementById('pw'));
        return { eyeAtRight: box('eye').left > box('pw').left + box('pw').width / 2, padRight: cs.paddingRight, labelClear: box('pl').right <= box('eye').left };
      });
      assert.deepEqual(cssOnly, { eyeAtRight: true, padRight: '52px', labelClear: true }, 'CSS-only direction: toggle, clearance and label agree');
    } finally {
      await browser.close();
    }
  });
}

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: a date range band faces the rest of the range in every direction`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
      for (const dir of ['ltr', 'rtl']) for (const isRTL of [false, true]) {
        await page.setContent(`<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head><body><input type="text" id="d"><input type="text" id="end"></body></html>`);
        await page.addScriptTag({ content: js });
        const r = await page.evaluate(async (isRTL) => {
          Expressive.Datepicker.init(document.getElementById('d'), { openByDefault: true, defaultDate: new Date(2024, 4, 13, 12), isDateRange: true, dateRangeEndEl: '#end', isRTL });
          const pause = (ms) => new Promise((done) => setTimeout(done, ms));
          const cell = (day) => document.querySelector(`.datepicker-day-button[data-day="${day}"]`).closest('td');
          await pause(100);
          cell(13).querySelector('button').click();
          await pause(50);
          cell(16).querySelector('button').click();
          await pause(200);
          // Which side of its cell each band sits on, against where the next day is.
          const side = (td) => {
            const r = td.getBoundingClientRect();
            const before = getComputedStyle(td, '::before');
            return r.left + parseFloat(before.left) + parseFloat(before.width) / 2 > r.left + r.width / 2 ? 'right' : 'left';
          };
          const forward = cell(14).getBoundingClientRect().left > cell(13).getBoundingClientRect().left ? 'right' : 'left';
          return { forward, start: side(cell(13)), end: side(cell(16)), mirrored: forward === 'left' };
        }, isRTL);
        const label = `${dir} page, isRTL ${isRTL}`;
        assert.equal(r.mirrored, dir === 'rtl' || isRTL, `${label}: calendar direction`);
        assert.equal(r.start, r.forward, `${label}: the start band faces the next day`);
        assert.notEqual(r.end, r.forward, `${label}: the end band faces the previous day`);
      }
    } finally {
      await browser.close();
    }
  });
}
