import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = (dir) => `<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head><body>
<main style="width:600px;padding:0">
<div role="log" aria-label="Conversation">
  <div id="start" class="message">
    <span class="message-avatar" role="img" aria-label="Oliver">OL</span>
    <div class="message-header">Oliver</div>
    <p class="message-bubble">Alright, let me take a look.</p>
    <div class="message-footer">Delivered</div>
  </div>
  <div id="end" class="message end">
    <span class="message-avatar" role="img" aria-label="You">ME</span>
    <p class="message-bubble">It's a one-line change.</p>
    <div class="message-footer">Read</div>
  </div>
  <div id="bare" class="message"><p class="message-bubble">No avatar.</p></div>
  <div class="message-group">
    <div id="g1" class="message"><span class="message-avatar"></span><p class="message-bubble">One</p></div>
    <div id="g2" class="message"><span class="message-avatar"></span><p class="message-bubble">Two</p></div>
    <div id="g3" class="message"><span class="message-avatar">OL</span><p class="message-bubble">Three</p></div>
  </div>
  <div class="message-group">
    <div id="e1" class="message end"><p class="message-bubble">One</p></div>
    <div id="e2" class="message end"><p class="message-bubble">Two</p></div>
  </div>
</div>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: message layout anchors the avatar, follows its side and joins grouped corners`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
      for (const dir of ['ltr', 'rtl']) {
        await page.setContent(markup(dir));
        const box = (selector) => page.locator(selector).evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        });
        const main = await box('main');
        // Start side in LTR is the left edge; RTL mirrors it.
        const startEdge = (r) => (dir === 'ltr' ? r.left - main.left : main.right - r.right);
        const endEdge = (r) => (dir === 'ltr' ? main.right - r.right : r.left - main.left);

        for (const id of ['start', 'end']) {
          const avatar = await box(`#${id} > .message-avatar`);
          const bubble = await box(`#${id} > .message-bubble`);
          const footer = await box(`#${id} > .message-footer`);
          assert.ok(Math.abs(avatar.bottom - bubble.bottom) < 1, `${dir} ${id}: avatar is level with the bubble bottom`);
          assert.ok(footer.top >= avatar.bottom - 0.5, `${dir} ${id}: footer stays below the avatar`);
        }

        const startAvatar = await box('#start > .message-avatar');
        const startBubble = await box('#start > .message-bubble');
        assert.ok(startEdge(startAvatar) < 1, `${dir}: start avatar sits on the start edge`);
        assert.ok(Math.abs(startEdge(startBubble) - 40) < 1, `${dir}: 32px avatar + 8px gap before the bubble`);

        const endAvatar = await box('#end > .message-avatar');
        const endBubble = await box('#end > .message-bubble');
        const endFooter = await box('#end > .message-footer');
        assert.ok(endEdge(endAvatar) < 1, `${dir}: end avatar sits on the end edge`);
        assert.ok(Math.abs(endEdge(endBubble) - 40) < 1, `${dir}: end bubble keeps the avatar gap`);
        assert.ok(Math.abs(endEdge(endFooter) - 40) < 1, `${dir}: end footer follows the bubble side`);

        assert.ok(startEdge(await box('#bare > .message-bubble')) < 1, `${dir}: no avatar leaves no gap`);

        const radii = (selector) => page.locator(`${selector} .message-bubble`).evaluate((el) => {
          const s = getComputedStyle(el);
          return [s.borderStartStartRadius, s.borderEndStartRadius, s.borderStartEndRadius, s.borderEndEndRadius];
        });
        assert.deepEqual(await radii('#g1'), ['20px', '4px', '20px', '20px']);
        assert.deepEqual(await radii('#g2'), ['4px', '4px', '20px', '20px']);
        assert.deepEqual(await radii('#g3'), ['4px', '20px', '20px', '20px']);
        assert.deepEqual(await radii('#e1'), ['20px', '20px', '20px', '4px']);
        assert.deepEqual(await radii('#e2'), ['20px', '20px', '4px', '20px']);
      }
      assert.equal(await page.getByRole('log').count(), 1);
      assert.equal(await page.getByRole('banner').count(), 0);
      assert.equal(await page.getByRole('contentinfo').count(), 0);
    } finally {
      await browser.close();
    }
  });
}
