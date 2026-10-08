import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const card = (id, trend) => `<article class="kpi outlined" id="${id}">
  <dl>
    <dt><span class="kpi-icon material-symbols-outlined" aria-hidden="true">payments</span>Revenue</dt>
    <dd class="kpi-value" id="${id}-value">$48,200</dd>
    <dd class="kpi-trend ${trend}" id="${id}-trend">+12.5%</dd>
  </dl>
  <button type="button" class="icon-button kpi-actions" id="${id}-actions" aria-label="Revenue options">
    <span class="material-symbols-outlined" aria-hidden="true">more_vert</span>
  </button>
  <figure class="line-chart sparkline area" id="${id}-chart">
    <figcaption class="visually-hidden">Revenue, last 4 weeks</figcaption>
    <table><thead><tr><th>Week</th><th>Revenue</th></tr></thead>
    <tbody><tr><th>1</th><td>40</td></tr><tr><th>2</th><td>44</td></tr><tr><th>3</th><td>48</td></tr></tbody></table>
  </figure>
  <div class="kpi-footer" id="${id}-footer">Compared with $42,800 last month</div>
</article>`;

const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<main style="width:360px">${card('a', 'up')}${card('b', 'down negative')}</main>
<span id="error" style="color:var(--md-sys-color-on-error-container);background:var(--md-sys-color-error-container)"></span>
<span id="error-line" style="color:var(--md-sys-color-error)"></span>
</body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: kpi lays out its label, value, trend, actions, chart and footer`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 400, height: 900 } });
      await page.setContent(markup);
      const box = (id) => page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().toJSON());
      const style = (id, pseudo) => page.locator(`#${id}`).evaluate((el, pseudo) => {
        const s = getComputedStyle(el, pseudo);
        return { color: s.color, background: s.backgroundColor, transform: s.transform, size: s.fontSize };
      }, pseudo);

      const [cardBox, value, trend, actions, chart, footer] = await Promise.all(
        ['a', 'a-value', 'a-trend', 'a-actions', 'a-chart', 'a-footer'].map(box));
      assert.ok(Math.abs(value.top + value.height / 2 - (trend.top + trend.height / 2)) < 2, 'the trend sits beside the value');
      assert.ok(actions.right > value.right && actions.top < value.top, 'the actions sit at the end of the label row');
      assert.ok(chart.top >= value.bottom && chart.width > 300, 'the chart spans the card under the value');
      assert.ok(Math.abs(footer.left - cardBox.left) < 2 && Math.abs(footer.right - cardBox.right) < 2, 'the footer runs edge to edge');
      assert.ok(Math.abs(footer.bottom - cardBox.bottom) < 2, 'the footer closes the card');

      assert.equal((await style('a-value')).size, '32px', 'the value uses headline-large');
      assert.equal((await style('a-trend', '::before')).transform, 'none', 'up points up');
      assert.ok((await style('b-trend', '::before')).transform.startsWith('matrix(-1'), 'down points down');
      const error = await style('error');
      const bad = await style('b-trend');
      assert.equal(bad.color, error.color, 'negative takes on-error-container');
      assert.equal(bad.background, error.background, 'negative takes error-container');
      const series = (id) => page.locator(`#${id}`).evaluate((el) => {
        const probe = el.appendChild(document.createElement('span'));
        probe.style.color = 'var(--md-comp-line-chart-color-1)';
        return getComputedStyle(probe).color;
      });
      assert.equal(await series('b-chart'), (await style('error-line')).color, 'negative turns the chart to the error color');
      assert.notEqual(await series('a-chart'), (await style('error-line')).color, 'a good change keeps the chart color');

      const pairs = await page.locator('#a dl').ariaSnapshot();
      assert.match(pairs, /term: Revenue/);
      assert.match(pairs, /definition: \$48,200/);
    } finally {
      await browser.close();
    }
  });
}
