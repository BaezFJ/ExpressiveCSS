import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const icon = '<span class="material-symbols" aria-hidden="true">star</span>';
const rows = {
  text: '<li>Text only</li>',
  icon: `<li>${icon}Icon row</li>`,
  trailing: `<li>${icon}Icon and trailing<kbd>⌘C</kbd></li>`,
  link: `<li><a href="#">${icon}Link row</a></li>`,
  checkbox: '<li><label><input type="checkbox"> Checkbox row</label></li>',
  radio: '<li><label><input type="radio" name="r"> Radio row</label></li>',
  twoLine: `<li>${icon}Headline<p>Supporting text</p></li>`
};
// A checkbox label beside another control: the item is the row, and the label keeps its own edge.
const nested = '<li id="nested"><label><input type="checkbox" checked> Nested</label><button type="button">Edit</button></li>';
const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<ul class="list" style="max-width: 360px">${Object.entries(rows).map(([id, row]) => row.replace('<li>', `<li id="${id}">`)).join('')}${nested}</ul></body></html>`;

// The vertical middle of the row's content box, of its first line of text, and of its leading element.
const measure = (li) => {
  const grid = li.querySelector(':scope > :is(a, label):only-child') ?? li;
  const box = grid.getBoundingClientRect();
  const style = getComputedStyle(grid);
  const contentMid = box.top + parseFloat(style.paddingTop) + (box.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)) / 2;
  const text = [...grid.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
  const range = document.createRange();
  range.selectNodeContents(text);
  const line = range.getClientRects()[0];
  const lead = grid.querySelector(':scope > :is(.material-symbols, input):first-child')?.getBoundingClientRect();
  const p = grid.querySelector(':scope > p')?.getBoundingClientRect();
  return {
    contentMid,
    textMid: line.top + line.height / 2,
    leadMid: lead ? lead.top + lead.height / 2 : null,
    blockMid: p ? (line.top + p.bottom) / 2 : null
  };
};

for (const [name, engine, test] of engines) {
  test(`${name}: a list row centers its text and its leading element on the row`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 800 } });
      await page.setContent(markup);
      for (const id of Object.keys(rows)) {
        const m = await page.locator(`#${id}`).evaluate(measure);
        if (m.blockMid !== null) {
          assert.ok(Math.abs(m.blockMid - m.contentMid) <= 1.5, `${id}: the two lines sit in the middle (${m.blockMid} vs ${m.contentMid})`);
        } else {
          assert.ok(Math.abs(m.textMid - m.contentMid) <= 1.5, `${id}: the text sits in the middle (${m.textMid} vs ${m.contentMid})`);
        }
        if (m.leadMid !== null) assert.ok(Math.abs(m.leadMid - m.contentMid) <= 1.5, `${id}: the leading element sits in the middle`);
      }

      // The checkmark is drawn on the label, so it has to start where the box does.
      for (const dir of ['ltr', 'rtl']) {
        await page.evaluate((dir) => {
          document.documentElement.dir = dir;
          document.querySelector('#checkbox input').checked = true;
        }, dir);
        const offset = await page.locator('#checkbox label').evaluate((label) => {
          const box = label.querySelector('input').getBoundingClientRect();
          const mark = getComputedStyle(label, '::before');
          const edge = label.getBoundingClientRect();
          return document.documentElement.dir === 'rtl'
            ? (edge.right - parseFloat(mark.right)) - box.right
            : (edge.left + parseFloat(mark.left)) - box.left;
        });
        assert.ok(Math.abs(offset) <= 1, `${dir}: the checkmark sits on the box (${offset}px off)`);
      }
      await page.evaluate(() => { document.documentElement.dir = 'ltr'; });
      const nestedOffset = await page.locator('#nested label').evaluate((label) => {
        const mark = getComputedStyle(label, '::before');
        return label.getBoundingClientRect().left + parseFloat(mark.left) - label.querySelector('input').getBoundingClientRect().left;
      });
      assert.ok(Math.abs(nestedOffset) <= 1, `a label inside a row keeps its mark on its box (${nestedOffset}px off)`);
    } finally {
      await browser.close();
    }
  });
}
