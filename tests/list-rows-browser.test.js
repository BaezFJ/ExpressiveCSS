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

// Rows with and without a leading element, and an item whose only child is a
// plain <button>. The empty leading column used to keep its gutter, so text
// without an icon started a gap further in than the row padding.
const slots = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<ul class="list" style="width: 360px">
  <li id="span"><span>Span only</span></li>
  <li id="block"><div>Title</div><p>Supporting</p></li>
  <li id="bare">Bare headline<p>Supporting text under it</p></li>
  <li id="trail"><span>Span and time</span><time>9:41</time></li>
  <li id="lead">${icon}<span>Icon and span</span><time>9:41</time></li>
  <li id="anchor"><a href="#"><span>Link</span></a></li>
  <li id="lone"><button type="button">Lone button</button></li>
  <li id="styled"><button type="button" class="button">Styled</button></li>
</ul></body></html>`;

// The text's distance from the row's inline start, and the gap before a trailing <time>.
const inset = (li) => {
  const rtl = getComputedStyle(li).direction === 'rtl';
  const edge = li.getBoundingClientRect();
  const from = (box) => (rtl ? edge.right - box.right : box.left - edge.left);
  const text = li.querySelector('span:not(.material-symbols), div, button').getBoundingClientRect();
  const time = li.querySelector('time')?.getBoundingClientRect();
  return { text: from(text), gap: time ? (rtl ? text.left - time.right : time.left - text.right) : null };
};

for (const [name, engine, test] of engines) {
  test(`${name}: a list row without a leading element starts its text at the row padding`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 800 } });
      await page.setContent(slots);
      for (const dir of ['ltr', 'rtl']) {
        await page.evaluate((dir) => { document.documentElement.dir = dir; }, dir);
        for (const id of ['span', 'block', 'trail', 'anchor']) {
          assert.equal((await page.locator(`#${id}`).evaluate(inset)).text, 16, `${dir} ${id}: text at the padding`);
        }
        assert.equal((await page.locator('#trail').evaluate(inset)).gap, 16, `${dir}: the trailing element keeps the gap`);
        // Bare text is not an element, so measure the supporting text under it.
        const bare = await page.locator('#bare').evaluate((li) => {
          const rtl = getComputedStyle(li).direction === 'rtl';
          const edge = li.getBoundingClientRect();
          const p = li.querySelector('p').getBoundingClientRect();
          return rtl ? edge.right - p.right : p.left - edge.left;
        });
        assert.equal(bare, 16, `${dir}: supporting text under bare label text starts at the padding`);
        // 16px padding, a 24px icon and the 16px gap.
        assert.deepEqual(await page.locator('#lead').evaluate(inset), { text: 56, gap: 16 }, `${dir}: a leading icon keeps its column`);
      }
    } finally {
      await browser.close();
    }
  });

  test(`${name}: a plain button that is an item's only child is the row`, { timeout: 30000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 800 } });
      await page.setContent(slots);
      const row = await page.locator('#lone').evaluate((li) => {
        const button = li.firstElementChild;
        const style = getComputedStyle(button);
        const label = document.createRange();
        label.selectNodeContents(button);
        return {
          width: button.getBoundingClientRect().width,
          height: button.getBoundingClientRect().height,
          rowPadding: getComputedStyle(li).paddingLeft,
          textInset: label.getBoundingClientRect().left - button.getBoundingClientRect().left,
          background: style.backgroundColor,
          border: style.borderTopWidth,
          radius: style.borderTopLeftRadius === getComputedStyle(li).borderTopLeftRadius,
          fontSize: style.fontSize
        };
      });
      assert.deepEqual(row, { width: 360, height: 56, rowPadding: '0px', textInset: 16, background: 'rgba(0, 0, 0, 0)', border: '0px', radius: true, fontSize: '16px' });
      await page.getByRole('button', { name: 'Lone button' }).focus();
      assert.notEqual(await page.locator('#lone button').evaluate((el) => getComputedStyle(el).outlineStyle), 'none', 'focus shows a ring');
      // A .button keeps the common button's fill and size.
      const styled = await page.locator('#styled button').evaluate((el) => ({ width: el.getBoundingClientRect().width < 360, background: getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)' }));
      assert.deepEqual(styled, { width: true, background: true });

      // Disabled, by attribute or by class, the row dims like a disabled item
      // and the item takes no pointer, so it shows no hover fill either.
      const enabled = await page.locator('#lone button').evaluate((el) => getComputedStyle(el).color);
      for (const attr of ['disabled', 'class="disabled"', 'aria-disabled="true"']) {
        await page.locator('#lone').evaluate((li, attr) => {
          li.innerHTML = `<button type="button" ${attr}>Lone button</button>`;
          li.parentElement.insertAdjacentHTML('beforeend', '<li id="item" class="disabled">Disabled item</li>');
        }, attr);
        const row = await page.locator('#lone').evaluate((li) => {
          const button = li.firstElementChild;
          const box = button.getBoundingClientRect();
          return {
            color: getComputedStyle(button).color,
            item: getComputedStyle(document.getElementById('item')).color,
            background: getComputedStyle(button).backgroundColor,
            hit: document.elementFromPoint(box.left + 20, box.top + box.height / 2)?.closest('li')?.id ?? null
          };
        });
        assert.notEqual(row.color, enabled, `${attr}: dimmed`);
        assert.equal(row.color, row.item, `${attr}: the disabled item color`);
        assert.equal(row.background, 'rgba(0, 0, 0, 0)', `${attr}: no fill`);
        assert.equal(row.hit, null, `${attr}: the row takes no pointer`);
        await page.locator('#item').evaluate((li) => li.remove());
      }
    } finally {
      await browser.close();
    }
  });
}
