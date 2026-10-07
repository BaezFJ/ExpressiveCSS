import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;
const picture = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='320'%3E%3Crect width='480' height='320' fill='teal'/%3E%3C/svg%3E";

const markup = `<!doctype html><html lang="en"><head><style>${css}</style></head><body>
<main style="width:600px">
  <div id="es" class="empty-state">
    <span id="icon" class="material-symbols" aria-hidden="true">inbox</span>
    <h2 id="heading">No messages yet</h2>
    <p id="text">Messages from your team show up here once someone starts a conversation with you or adds you to a channel.</p>
    <div id="actions" class="empty-state-actions">
      <button class="filled">New message</button>
      <button class="text">Import</button>
    </div>
  </div>
  <div class="empty-state">
    <img id="art" src="${picture}" alt="" width="480" height="320">
    <h2>Start your first trip</h2>
  </div>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: empty state centers its content and rings the leading icon`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
      await page.setContent(markup);
      const box = (selector) => page.locator(selector).evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, width: r.width, height: r.height, center: r.left + r.width / 2 };
      });

      const container = await box('#es');
      for (const id of ['icon', 'heading', 'text', 'actions']) {
        const part = await box(`#${id}`);
        assert.ok(Math.abs(part.center - container.center) < 1, `${id} is centered`);
      }

      const icon = await box('#icon');
      assert.deepEqual([icon.width, icon.height], [96, 96], 'icon sits in a 96px circle');
      assert.equal(await page.locator('#icon').evaluate((el) => getComputedStyle(el).borderTopLeftRadius), '50%');
      assert.notEqual(await page.locator('#icon').evaluate((el) => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');

      const text = await box('#text');
      const cap = await page.locator('#text').evaluate((el) => parseFloat(getComputedStyle(el).maxWidth));
      assert.ok(text.width <= cap + 0.5 && text.width < container.width - 48, 'supporting text is capped');
      assert.equal(await page.locator('#text').evaluate((el) => getComputedStyle(el).textAlign), 'center');

      const buttons = page.locator('#actions > button');
      const first = await buttons.first().evaluate((el) => el.getBoundingClientRect().left);
      const last = await buttons.last().evaluate((el) => el.getBoundingClientRect().right);
      const actions = await box('#actions');
      assert.ok(Math.abs((first - actions.left) - (actions.right - last)) < 1, 'actions are centered as a row');

      const art = await box('#art');
      assert.deepEqual([art.width, art.height], [240, 160], 'illustration is capped and keeps its ratio');
      assert.equal(await page.getByRole('img').count(), 0, 'decorative icon and image stay out of the tree');
      assert.equal(await page.getByRole('heading', { name: 'No messages yet' }).count(), 1);
    } finally {
      await browser.close();
    }
  });
}
