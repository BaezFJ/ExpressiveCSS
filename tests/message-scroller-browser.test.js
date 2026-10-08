import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const message = (i, anchor = i % 2 === 1, lines = 1) =>
  `<div id="m${i}" class="message${anchor ? ' end' : ''}"${anchor ? ' data-scroll-anchor' : ''}><p class="message-bubble">${'Message ' + i + '<br>'.repeat(lines - 1)}</p></div>`;

const markup = (items, attrs = '') => `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<main style="height:400px;width:500px">
  <div class="message-scroller"${attrs}>
    <div class="message-scroller-viewport" role="log" aria-label="Conversation" aria-relevant="additions" tabindex="0">${items}</div>
    <button type="button" class="icon-button tonal message-scroller-button" aria-label="Scroll to latest message">
      <span class="material-symbols" aria-hidden="true">arrow_downward</span>
    </button>
  </div>
</main></body></html>`;

const many = (count) => Array.from({ length: count }, (_, i) => message(i + 1)).join('');

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: message scroller follows output, keeps its place on prepend and anchors new turns`, { timeout: 60000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      await page.setContent(markup(many(30)));
      await page.addScriptTag({ content: js });
      await page.evaluate(() => window.Expressive.AutoInit());

      const state = () => page.evaluate(() => {
        const v = document.querySelector('.message-scroller-viewport');
        return {
          top: v.scrollTop,
          fromEnd: v.scrollHeight - v.scrollTop - v.clientHeight,
          inert: document.querySelector('.message-scroller-button').inert,
          spacer: v.style.getPropertyValue('--md-comp-message-scroller-spacer')
        };
      });
      const offset = (id) => page.evaluate((id) => {
        const v = document.querySelector('.message-scroller-viewport');
        return document.getElementById(id).getBoundingClientRect().top - v.getBoundingClientRect().top;
      }, id);
      const atEnd = () => page.waitForFunction(() => {
        const v = document.querySelector('.message-scroller-viewport');
        return v.scrollHeight - v.scrollTop - v.clientHeight <= 2;
      });
      const frames = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      // Waits until the scroll position has stopped moving: wheel scrolling is
      // animated in some engines.
      const still = () => page.evaluate(() => new Promise((resolve) => {
        const v = document.querySelector('.message-scroller-viewport');
        let last = -1;
        let same = 0;
        const tick = () => {
          same = v.scrollTop === last ? same + 1 : 0;
          last = v.scrollTop;
          if (same >= 5) resolve();
          else requestAnimationFrame(tick);
        };
        tick();
      }));
      const stream = (text) => page.evaluate((text) => {
        document.querySelector('.message-scroller-viewport').lastElementChild.querySelector('.message-bubble').insertAdjacentHTML('beforeend', text);
      }, text);

      let s = await state();
      assert.ok(s.fromEnd <= 2, 'opens at the end');
      assert.equal(s.inert, true, 'the button is inert at the end');

      for (let i = 0; i < 5; i++) await stream('<br>more streamed text');
      await frames();
      assert.ok((await state()).fromEnd <= 2, 'streamed output is followed at the end');

      await page.locator('.message-scroller-viewport').hover();
      await page.mouse.wheel(0, -300);
      await page.waitForFunction(() => {
        const v = document.querySelector('.message-scroller-viewport');
        return v.scrollHeight - v.scrollTop - v.clientHeight > 100;
      });
      await still();
      const released = await state();
      assert.equal(released.inert, false, 'the button is active away from the end');
      await stream('<br>text the reader is not following');
      await frames();
      assert.ok(Math.abs((await state()).top - released.top) <= 1, 'scrolling up releases following');

      await page.locator('.message-scroller-button').click();
      await atEnd();
      await frames();
      assert.equal((await state()).inert, true, 'the button scrolls to the end and goes inert');
      await stream('<br>following again');
      await frames();
      assert.ok((await state()).fromEnd <= 2, 'the button resumes following');

      await page.locator('.message-scroller-viewport > .message:last-child .message-bubble').click();
      await stream('<br>streamed after a click');
      await frames();
      assert.ok((await state()).fromEnd <= 2, 'clicking a message keeps following');

      assert.equal(await page.evaluate(() => window.Expressive.MessageScroller.getInstance(document.querySelector('.message-scroller')).scrollToMessage('nope')), false);
      assert.equal(await page.evaluate(() => window.Expressive.MessageScroller.getInstance(document.querySelector('.message-scroller')).scrollToMessage('m10')), true);
      await page.waitForFunction(() => {
        const v = document.querySelector('.message-scroller-viewport');
        return Math.abs(document.getElementById('m10').getBoundingClientRect().top - v.getBoundingClientRect().top - 64) <= 2;
      });
      await still();

      const before = await offset('m10');
      await page.evaluate(() => {
        const v = document.querySelector('.message-scroller-viewport');
        v.insertAdjacentHTML('afterbegin', Array.from({ length: 5 }, (_, i) => `<div class="message" id="h${i}"><p class="message-bubble">Older ${i}<br>line</p></div>`).join(''));
      });
      await frames();
      assert.ok(Math.abs((await offset('m10')) - before) <= 1, 'prepended history keeps the visible message in place');

      await page.evaluate(() => window.Expressive.MessageScroller.getInstance(document.querySelector('.message-scroller')).scrollToEnd());
      await atEnd();
      await page.evaluate(() => {
        document.querySelector('.message-scroller-viewport').insertAdjacentHTML('beforeend', '<div id="ask" class="message end" data-scroll-anchor><p class="message-bubble">New question</p></div>');
      });
      await page.waitForFunction(() => {
        const v = document.querySelector('.message-scroller-viewport');
        return Math.abs(document.getElementById('ask').getBoundingClientRect().top - v.getBoundingClientRect().top - 64) <= 2;
      });
      await frames();
      s = await state();
      assert.ok(parseFloat(s.spacer) > 0, 'a spacer lets the new turn reach the top');
      assert.ok(Math.abs((await offset('ask')) - 64) <= 2, 'the new turn sits one peek below the top');

      await page.evaluate(() => {
        document.querySelector('.message-scroller-viewport').insertAdjacentHTML('beforeend', '<div id="reply" class="message"><p class="message-bubble">Reply</p></div>');
      });
      await frames();
      assert.ok(Math.abs((await offset('ask')) - 64) <= 2, 'a short reply leaves the turn at the top');
      for (let i = 0; i < 20; i++) await stream('<br>reply line');
      await frames();
      s = await state();
      assert.equal(s.spacer, '', 'the spacer is gone once the reply fills the viewport');
      assert.ok(s.fromEnd <= 2, 'the reply is followed past the bottom');

      await page.evaluate(() => window.Expressive.MessageScroller.getInstance(document.querySelector('.message-scroller')).destroy());
      assert.equal(await page.evaluate(() => window.Expressive.MessageScroller.getInstance(document.querySelector('.message-scroller'))), undefined);
      assert.equal((await state()).inert, false, 'destroy releases the button');
    } finally {
      await browser.close();
    }
  });

  test(`${name}: message scroller opens saved transcripts at the requested position`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      const open = async (items, options) => {
        await page.setContent(markup(items));
        await page.addScriptTag({ content: js });
        return page.evaluate((options) => {
          window.Expressive.MessageScroller.init(document.querySelector('.message-scroller'), options);
          const v = document.querySelector('.message-scroller-viewport');
          const last = v.querySelector(':scope > [data-scroll-anchor]:nth-last-child(-n+2)');
          return {
            top: v.scrollTop,
            fromEnd: v.scrollHeight - v.scrollTop - v.clientHeight,
            anchor: last && last.getBoundingClientRect().top - v.getBoundingClientRect().top
          };
        }, options);
      };

      // A long last reply: the transcript opens on the question that started it.
      let s = await open(many(29) + message(30, false, 20), { defaultScrollPosition: 'last-anchor' });
      assert.ok(Math.abs(s.anchor - 64) <= 2, 'last-anchor opens one peek above the last turn');
      assert.ok(s.fromEnd > 2, 'and not at the end');

      s = await open(many(30), { defaultScrollPosition: 'last-anchor' });
      assert.ok(s.fromEnd <= 2, 'a last turn that fits opens at the end');

      s = await open(many(30), { defaultScrollPosition: 'start' });
      assert.equal(s.top, 0, 'start opens at the top');
    } finally {
      await browser.close();
    }
  });

  test(`${name}: message scroller jumps to a message inside a shadow root`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
      await page.setContent('<!doctype html><html lang="en"><body><div id="host"></div></body></html>');
      await page.addScriptTag({ content: js });
      const result = await page.evaluate(async ({ css, items }) => {
        const root = document.getElementById('host').attachShadow({ mode: 'open' });
        root.innerHTML = `<style>${css}</style><div style="height:400px;width:500px"><div class="message-scroller"><div class="message-scroller-viewport" role="log" aria-label="Conversation" tabindex="0">${items}</div><button type="button" class="message-scroller-button" aria-label="Scroll to latest message">↓</button></div></div>`;
        const scroller = window.Expressive.MessageScroller.init(root.querySelector('.message-scroller'), {});
        const found = scroller.scrollToMessage('m10');
        const v = scroller.viewport;
        for (let i = 0; i < 120; i++) {
          if (Math.abs(root.getElementById('m10').getBoundingClientRect().top - v.getBoundingClientRect().top - 64) <= 2) break;
          await new Promise((r) => requestAnimationFrame(r));
        }
        return { found, offset: root.getElementById('m10').getBoundingClientRect().top - v.getBoundingClientRect().top };
      }, { css, items: many(30) });
      assert.equal(result.found, true, 'scrollToMessage finds a message in a shadow root');
      assert.ok(Math.abs(result.offset - 64) <= 2, 'and scrolls it one peek below the top');

      // Keyboard activation: the button goes inert at the end and hands focus to the viewport.
      await page.waitForFunction(() => !document.getElementById('host').shadowRoot.querySelector('.message-scroller-button').inert);
      await page.evaluate(() => document.getElementById('host').shadowRoot.querySelector('.message-scroller-button').focus());
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => {
        const root = document.getElementById('host').shadowRoot;
        return root.querySelector('.message-scroller-button').inert && root.activeElement === root.querySelector('.message-scroller-viewport');
      });
    } finally {
      await browser.close();
    }
  });
}
