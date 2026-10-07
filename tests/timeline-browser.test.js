import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = (dir) => `<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head><body>
<main style="width:480px">
  <ol id="dots" class="timeline">
    <li id="d1"><time id="t1" datetime="2026-10-06T09:12">9:12 AM</time><h3>Order placed</h3><p>Two items.</p></li>
    <li id="d2"><time datetime="2026-10-06T11:40">11:40 AM</time><h3>Shipped</h3></li>
  </ol>
  <ol class="timeline">
    <li id="i1"><span id="icon" class="material-symbols" aria-hidden="true">chat</span><h3 id="ih">Ada commented</h3></li>
    <li id="i2"><span class="material-symbols" aria-hidden="true">commit</span><h3>Grace pushed</h3></li>
  </ol>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: timeline marks each event, joins it to the next and swaps the dot for an icon`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      for (const dir of ['ltr', 'rtl']) {
        await page.setContent(markup(dir));
        const box = (id) => page.locator(`#${id}`).evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        });
        const pseudo = (id, which) => page.locator(`#${id}`).evaluate((el, which) => {
          const s = getComputedStyle(el, which);
          return { content: s.content, width: s.width, height: s.height };
        }, which);
        const startGap = (child, item) => dir === 'ltr' ? child.left - item.left : item.right - child.right;

        assert.ok(Math.abs(startGap(await box('t1'), await box('d1')) - 32) < 1, `${dir}: text clears the 32px marker column`);
        assert.deepEqual(await pseudo('d1', '::before'), { content: '""', width: '12px', height: '12px' }, `${dir}: a 12px dot marks the event`);
        assert.notEqual((await pseudo('d1', '::after')).content, 'none', `${dir}: a line joins the event to the next`);
        assert.equal((await pseudo('d2', '::after')).content, 'none', `${dir}: the last event has no line`);
        assert.ok((await box('d2')).top - (await box('d1')).bottom < 1, `${dir}: the gap is padding, so the line spans it`);

        assert.equal((await pseudo('i1', '::before')).content, 'none', `${dir}: an icon replaces the dot`);
        const icon = await box('icon');
        assert.deepEqual([Math.round(icon.right - icon.left), Math.round(icon.bottom - icon.top)], [32, 32]);
        assert.ok(Math.abs(startGap(await box('ih'), await box('i1')) - 48) < 1, `${dir}: text clears the icon column`);
      }
      assert.equal(await page.locator('#dots').getByRole('listitem').count(), 2);
    } finally {
      await browser.close();
    }
  });
}
