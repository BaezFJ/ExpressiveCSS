import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

const rows = Array.from({ length: 5000 }, (_, i) => `<li><a href="#r${i}">Row ${i}${i === 4999 ? ' zephyr' : ''}</a></li>`).join('');
// The last paragraph renders taller than the reserved size.
const paragraphs = Array.from({ length: 200 }, (_, i) => `<p>Paragraph ${i}${i === 199 ? '<span style="display: block; block-size: 120px"></span>' : ''}</p>`).join('');
const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<ul id="list" class="list defer-render" aria-label="Rows">${rows}</ul>
<div id="stack" class="defer-render">${paragraphs}</div></body></html>`;

// Two frames let the engine decide which rows are on screen.
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const skipped = (locator) => locator.evaluate((el) => !el.checkVisibility({ contentVisibilityAuto: true }));
const height = (locator) => locator.evaluate((el) => el.getBoundingClientRect().height);

for (const [name, engine, test] of engines) {
  test(`${name}: .defer-render skips off-screen rows and renders them when they scroll into view`, { timeout: 60000 }, async () => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.setContent(markup);
      await settle(page);
      const last = page.locator('#list > li').nth(4999);

      // The row reports visible either way; only its contents are skipped.
      assert.equal(await skipped(last.locator('a')), true, 'an off-screen row skips its contents');
      assert.equal(await skipped(page.locator('#list > li a').first()), false, 'an on-screen row renders');

      await last.scrollIntoViewIfNeeded();
      await settle(page);
      assert.equal(await skipped(last.locator('a')), false, 'the row renders once it scrolls into view');
    } finally {
      await browser.close();
    }
  });

  test(`${name}: a skipped row reserves --defer-render-row-size`, { timeout: 60000 }, async () => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.setContent(markup);
      await settle(page);
      const row = page.locator('#list > li').nth(3000);
      assert.equal(await skipped(row.locator('a')), true, 'the measured row is off screen');
      assert.equal(await height(row), 56, 'a list row reserves the list item height');
      assert.equal(await height(page.locator('#stack > p').nth(150)), 56, 'other containers fall back to 3.5rem');

      // Row min-height follows the token too, so only a token under 56px shows the fallback.
      await page.locator('#list').evaluate((el) => el.style.setProperty('--md-comp-list-item-height', '40px'));
      await settle(page);
      assert.equal(await height(row), 40, 'a list row follows the list item height token');

      await page.locator('#list').evaluate((el) => el.style.setProperty('--defer-render-row-size', '6rem'));
      await settle(page);
      assert.equal(await height(row), 96, 'the custom property sets the estimate');

      const tall = page.locator('#stack > p').nth(199);
      assert.equal(await height(tall), 56, 'a tall row reserves the estimate before it renders');
      await tall.scrollIntoViewIfNeeded();
      await settle(page);
      const rendered = await height(tall);
      assert.ok(rendered > 120, `the tall row renders at its real height (${rendered}px)`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await settle(page);
      assert.equal(await skipped(tall.locator('span')), true, 'the tall row is skipped again');
      assert.equal(await height(tall), rendered, 'a skipped row keeps its last rendered height');
    } finally {
      await browser.close();
    }
  });

  test(`${name}: a focus ring in a deferred row stays inside the row`, { timeout: 60000 }, async () => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.setContent(markup);
      await page.keyboard.press('Tab');
      const link = page.locator('#list > li a').first();
      assert.equal(await link.evaluate((el) => el === document.activeElement && el.matches(':focus-visible')), true, 'the first link has a visible focus');

      // Paint containment clips the row, so the outline must not reach past it.
      const { outset, linkBox, rowBox } = await link.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          outset: parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth),
          linkBox: el.getBoundingClientRect().toJSON(),
          rowBox: el.parentElement.getBoundingClientRect().toJSON(),
        };
      });
      assert.ok(outset <= 0, `the outline is drawn inset (outer edge ${outset}px past the link)`);
      assert.ok(linkBox.left >= rowBox.left && linkBox.right <= rowBox.right, 'the link sits inside the row horizontally');
      assert.ok(linkBox.top >= rowBox.top && linkBox.bottom <= rowBox.bottom, 'the link sits inside the row vertically');
    } finally {
      await browser.close();
    }
  });

  test(`${name}: rows with swipe actions are not deferred, so their actions stay visible`, { timeout: 60000 }, async () => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 600, height: 400 } });
      await page.setContent(`<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<ul class="list swipeable defer-render" aria-label="Inbox">
  <li class="swipe-open" style="--swipe-offset: -120px">Label<span class="swipe-actions"><button id="archive" type="button" class="icon-button" aria-label="Archive">A</button></span></li>
  <li>Plain row</li>
</ul></body></html>`);
      // Paint containment would clip the actions, which wait past the row's end.
      const hit = await page.locator('#archive').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('#archive') === el;
      });
      assert.equal(hit, true, 'the open row\'s action takes the pointer');
      const deferred = await page.locator('li').evaluateAll((rows) => rows.map((el) => getComputedStyle(el).contentVisibility));
      assert.deepEqual(deferred, ['visible', 'auto'], 'only the row without swipe actions is deferred');
    } finally {
      await browser.close();
    }
  });

  test(`${name}: an off-screen row's text stays in the accessibility tree and find-in-page`, { timeout: 60000 }, async () => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await page.setContent(markup);
      await settle(page);
      const row = page.locator('#list > li').nth(4999);
      assert.equal(await skipped(row.locator('a')), true, 'the row is skipped');
      // A snapshot of the whole 5,000-row list takes over 30 seconds under load.
      assert.match(await row.ariaSnapshot(), /link "Row 4999 zephyr"/, 'the accessibility tree has the row');
      assert.equal(await page.evaluate(() => window.find('zephyr')), true, 'find-in-page reaches the row');
    } finally {
      await browser.close();
    }
  });
}
