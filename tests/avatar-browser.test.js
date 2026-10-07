import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;
const picture = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='teal'/%3E%3C/svg%3E";

const markup = (dir) => `<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head><body>
<main style="width:600px">
  <img id="img" class="avatar" src="${picture}" alt="Ada Lovelace">
  <span id="mid" class="avatar" role="img" aria-label="Grace Hopper">GH</span>
  <span id="sm" class="avatar small" role="img" aria-label="Small person">SP</span>
  <span id="lg" class="avatar large" role="img" aria-label="Large person">LP</span>
  <p><span id="hidden" class="avatar" aria-hidden="true">HH</span> Hidden Helper</p>
  <div class="avatar-group">
    <span id="g1" class="avatar" role="img" aria-label="One">O</span>
    <span id="g2" class="avatar" role="img" aria-label="Two">T</span>
  </div>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: avatar sizes its circle, names its initials and overlaps a group`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      for (const dir of ['ltr', 'rtl']) {
        await page.setContent(markup(dir));
        const geometry = (id) => page.locator(`#${id}`).evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { width: r.width, height: r.height, left: r.left, right: r.right, radius: getComputedStyle(el).borderTopLeftRadius };
        });

        for (const [id, size] of [['img', 40], ['mid', 40], ['sm', 32], ['lg', 56]]) {
          const g = await geometry(id);
          assert.equal(g.width, size, `${dir} ${id}: width`);
          assert.equal(g.height, size, `${dir} ${id}: height`);
          assert.equal(g.radius, '50%', `${dir} ${id}: circle`);
        }

        const fontSize = (id) => page.locator(`#${id}`).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        assert.ok(await fontSize('lg') > await fontSize('mid'), `${dir}: initials scale with the size`);

        const first = await geometry('g1');
        const second = await geometry('g2');
        const overlap = dir === 'ltr' ? first.right - second.left : second.right - first.left;
        assert.ok(Math.abs(overlap - 8) < 1, `${dir}: group overlaps by 8px, got ${overlap}`);
        assert.match(await page.locator('#g1').evaluate((el) => getComputedStyle(el).boxShadow), /2px/, `${dir}: group ring`);
      }

      assert.equal(await page.getByRole('img', { name: 'Ada Lovelace' }).count(), 1);
      assert.equal(await page.getByRole('img', { name: 'Grace Hopper' }).count(), 1);
      const tree = await page.locator('main').ariaSnapshot();
      assert.doesNotMatch(tree, /\bHH\b/, 'a hidden avatar stays out of the tree');
      assert.match(tree, /Hidden Helper/);
    } finally {
      await browser.close();
    }
  });
}
