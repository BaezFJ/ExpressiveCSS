import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = (width) => `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<main style="width:${width}px">
  <dl class="stats">
    <div id="a"><dt>Revenue</dt><dd id="value">$48.2k</dd><dd id="up" class="stat-change up">+12% from last month</dd></div>
    <div id="b"><dt>Churn</dt><dd>3.1%</dd><dd id="bad" class="stat-change up negative">+0.4 points</dd></div>
    <div id="c"><dt>Active users</dt><dd>1,204</dd><dd id="down" class="stat-change down">−2% from last month</dd></div>
  </dl>
  <span id="error" style="color:var(--md-sys-color-error)"></span>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: stats tile their figures, wrap when narrow and mark the change`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
      const top = (id) => page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top);

      await page.setContent(markup(720));
      assert.ok(Math.abs((await top('a')) - (await top('c'))) < 1, 'wide: the tiles share a row');
      await page.setContent(markup(300));
      assert.ok((await top('b')) > (await top('a')), 'narrow: the tiles stack');

      const style = (id, pseudo) => page.locator(`#${id}`).evaluate((el, pseudo) => {
        const s = getComputedStyle(el, pseudo);
        return { color: s.color, transform: s.transform, content: s.content, size: s.fontSize };
      }, pseudo);
      assert.equal((await style('value')).size, '32px', 'the value uses headline-large');
      assert.equal((await style('up', '::before')).transform, 'none', 'up points up');
      assert.ok((await style('down', '::before')).transform.startsWith('matrix(-1'), 'down points down');
      assert.equal((await style('bad')).color, (await style('error')).color, 'negative takes the error color');

      const pairs = await page.locator('dl.stats').ariaSnapshot();
      assert.match(pairs, /term: Revenue/);
      assert.match(pairs, /definition: \$48\.2k/);
    } finally {
      await browser.close();
    }
  });
}
