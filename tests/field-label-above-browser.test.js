// .field.label-above: the label is drawn above the control instead of
// floating. The markup is the floating field's, so the label still follows the
// control and every state rule that reaches it with + or ~ keeps working.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines, leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const icon = (side, name) => `<span class="material-symbols ${side}" aria-hidden="true">${name}</span>`;

const markup = (dir) => `<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head><body>
<main style="width: 320px">
  <div class="field label-above" id="plain">
    <input id="email" type="email" placeholder="name@example.com">
    <label for="email">Email</label>
    <small class="supporting-text" id="help">We never share it</small>
  </div>
  <div class="field label-above outlined" id="outlined">
    <input id="name" type="text" value="Ada">
    <label for="name">Full name</label>
  </div>
  <div class="field label-above" id="icons">
    ${icon('prefix', 'search')}${icon('suffix', 'close')}
    <input id="query" type="text" value="Query">
    <label for="query">A long label that wraps onto a second line in this narrow column</label>
  </div>
  <div class="field label-above" id="invalid">
    <input id="code" type="text" value="x" aria-invalid="true">
    <label for="code">Code</label>
  </div>
  <div class="field label-above" id="disabled">
    <input id="locked" type="text" value="Locked" disabled>
    <label for="locked">Locked</label>
  </div>
  <div class="field label-above" id="counted">
    <textarea id="notes" class="expressive-textarea" data-length="40">Notes</textarea>
    <label for="notes">Notes</label>
    <small class="supporting-text" id="notes-help">Optional</small>
  </div>
  <div class="field" id="floating">
    <input id="floater" type="text" value="Floats">
    <label for="floater">Floating</label>
  </div>
  <span id="primary" style="color: var(--md-sys-color-primary)"></span>
  <span id="error" style="color: var(--md-sys-color-error)"></span>
</main></body></html>`;

const box = (page, selector) => page.locator(selector).evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
});

for (const [name, engine, browserTest] of engines) {
  browserTest(`${name}: a label-above field draws its label over the control and keeps the control's layout`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 900 }, reducedMotion: 'reduce' });
      for (const dir of ['ltr', 'rtl']) {
        await page.setContent(markup(dir));
        await page.addScriptTag({ content: js });
        await page.evaluate(() => Expressive.CharacterCounter.init(document.getElementById('notes')));

        const field = await box(page, '#plain');
        const label = await box(page, '#plain label');
        const input = await box(page, '#email');
        const help = await box(page, '#help');
        // label-large is 20px tall, then a 4px gap, then the 56px well.
        assert.deepEqual([label.top - field.top, input.top - label.bottom, input.height], [0, 4, 56], `${dir}: label, gap, well`);
        assert.ok(help.top >= input.bottom, `${dir}: supporting text under the well`);
        const text = await page.locator('#plain label').evaluate((el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          const r = range.getBoundingClientRect();
          const f = el.parentElement.getBoundingClientRect();
          return getComputedStyle(el).direction === 'rtl' ? f.right - r.right : r.left - f.left;
        });
        assert.equal(Math.round(text), 16, `${dir}: label text at the 16px inset`);

        // A wrapped label pushes the well down, and the icons follow the well.
        const wrapped = await box(page, '#icons label');
        const query = await box(page, '#query');
        assert.ok(wrapped.height > 30, `${dir}: the long label wraps`);
        assert.equal(query.top - wrapped.bottom, 4, `${dir}: the well follows the wrapped label`);
        for (const side of ['prefix', 'suffix']) {
          const glyph = await box(page, `#icons .${side}`);
          assert.equal(glyph.top + glyph.height / 2, query.top + query.height / 2, `${dir}: ${side} centred on the well`);
        }

        // The supporting text and the counter share the row under the well.
        const notesHelp = await box(page, '#notes-help');
        const counter = await box(page, '#counted .character-counter');
        assert.equal(counter.top, notesHelp.top, `${dir}: counter beside the supporting text`);
        assert.ok(dir === 'rtl' ? counter.left < notesHelp.left : counter.right > notesHelp.right, `${dir}: counter at the end`);
      }
    } finally {
      await browser.close();
    }
  });

  browserTest(`${name}: a label-above field keeps its label linked and colored by the control's state`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 900 }, reducedMotion: 'reduce' });
      await page.setContent(markup('ltr'));
      const color = (selector) => page.locator(selector).evaluate((el) => getComputedStyle(el).color);
      const primary = await color('#primary');
      const error = await color('#error');

      // The label still names the control, and a click on it focuses the control.
      await page.getByLabel('Email').fill('ada@example.com');
      await page.locator('#outlined label').click();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'name');
      assert.equal(await color('#outlined label'), primary, 'focused: primary');

      const outlined = await page.locator('#outlined label').evaluate((el) => {
        const style = getComputedStyle(el);
        return { transform: style.transform, background: style.backgroundColor, position: style.position, fontSize: style.fontSize };
      });
      assert.deepEqual(outlined, { transform: 'none', background: 'rgba(0, 0, 0, 0)', position: 'static', fontSize: '14px' }, 'no float and no notch');

      assert.equal(await color('#invalid label'), error, 'invalid: error');
      const dimmed = await color('#disabled label');
      assert.notEqual(dimmed, await color('#plain label'), 'disabled: dimmed');

      // The floating field is untouched.
      const floating = await page.locator('#floating label').evaluate((el) => ({ position: getComputedStyle(el).position, transform: getComputedStyle(el).transform }));
      assert.equal(floating.position, 'absolute');
      assert.equal(floating.transform, 'matrix(0.75, 0, 0, 0.75, 0, 0)');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${name}: a label-above FormSelect and a stretched label-above field keep the label over the control`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 600 }, reducedMotion: 'reduce' });
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>
        <div style="display: grid; grid-template-columns: 240px 240px; gap: 16px">
          <div class="field label-above" id="select">
            <select id="size" required><option value="">Pick one</option><option>Small</option></select>
            <label for="size">Size</label>
          </div>
          <div class="field label-above" id="tall">
            <input id="city" type="text">
            <label for="city">City</label>
            <small class="supporting-text">A supporting line long enough to wrap in this column</small>
          </div>
        </div></body></html>`);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => Expressive.FormSelect.init(document.getElementById('size')));

      const label = await box(page, '#select > label');
      const trigger = await box(page, '#select > input.menu-trigger');
      const caret = await box(page, '#select > .caret');
      const hidden = await box(page, '#select > .hide-select');
      assert.equal(trigger.top - label.bottom, 4, 'the trigger sits under the label');
      assert.equal(trigger.height, 56);
      assert.equal(caret.top + caret.height / 2, trigger.top + trigger.height / 2, 'the caret centres on the trigger');
      assert.deepEqual([hidden.top, hidden.height], [trigger.top, trigger.height], 'native validation anchors at the trigger');
      assert.equal(await page.locator('#select > label').evaluate((el) => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)', 'the label is outside the well');

      // The grid stretches the select's field to the taller neighbour; its
      // rows stay packed at the top, so both wells line up.
      const city = await box(page, '#city');
      assert.equal(trigger.top, city.top, 'wells line up across the row');
    } finally {
      await browser.close();
    }
  });

  browserTest(`${name}: Datepicker's range and multiple-selection inputs stack under the first in a label-above field`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 800 }, reducedMotion: 'reduce' });
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body><main style="width: 320px">
        <div class="field label-above" id="range"><input id="from" type="text" class="datepicker"><label for="from">Stay</label></div>
        <div class="field label-above" id="many"><input id="days" type="text" class="datepicker"><label for="days">Days</label></div>
      </main></body></html>`);
      await page.addScriptTag({ content: js });
      await page.evaluate(() => {
        Expressive.Datepicker.init(document.getElementById('from'), { isDateRange: true });
        const many = Expressive.Datepicker.init(document.getElementById('days'), { isMultipleSelection: true });
        for (const day of [3, 9, 17]) many.setMultiDate(new Date(2026, 10, day));
        many.setInputValues();
      });
      for (const id of ['range', 'many']) {
        const rows = await page.locator(`#${id}`).evaluate((field) => [...field.querySelectorAll(':scope > input')].map((input) => {
          const r = input.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, height: r.height };
        }));
        assert.ok(rows.length >= 2, `${id}: Datepicker added inputs (${rows.length})`);
        const label = await box(page, `#${id} > label`);
        assert.equal(rows[0].top - label.bottom, 4, `${id}: the first input sits under the label`);
        rows.slice(1).forEach((row, index) => assert.ok(row.top >= rows[index].bottom, `${id}: input ${index + 2} below input ${index + 1}`));
      }
    } finally {
      await browser.close();
    }
  });
}
