import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = (dir) => `<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head><body>
<main style="width:400px">
  <nav aria-label="Files">
    <ul class="tree">
      <li>
        <details id="src" open>
          <summary id="src-row">src</summary>
          <ul id="level2">
            <li><a id="index" href="#index" aria-current="page">index.ts</a></li>
            <li>
              <details id="core">
                <summary id="core-row">core</summary>
                <ul><li><a id="utils" href="#utils">utils.ts</a></li></ul>
              </details>
            </li>
          </ul>
        </details>
      </li>
      <li><a id="readme" href="#readme">README.md</a></li>
    </ul>
  </nav>
  <span id="selected" style="background-color:var(--md-sys-color-secondary-container)"></span>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: tree indents its levels, turns its chevrons and marks the current row`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 }, reducedMotion: 'reduce' });
      for (const dir of ['ltr', 'rtl']) {
        await page.setContent(markup(dir));
        const edge = (id) => page.locator(`#${id}`).evaluate((el) => {
          const r = el.getBoundingClientRect();
          return document.dir === 'rtl' ? -r.right : r.left;
        });
        const chevron = (id) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el, '::before').transform);
        const textStart = (id) => page.locator(`#${id}`).evaluate((el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          const r = range.getBoundingClientRect();
          return document.dir === 'rtl' ? -r.right : r.left;
        });

        assert.ok(Math.abs((await edge('index')) - (await edge('src-row')) - 29) < 1, `${dir}: a level indents 29px past its guide line`);
        assert.ok(Math.abs((await textStart('readme')) - (await textStart('src-row'))) < 1, `${dir}: a leaf's text lines up with a branch's text`);
        assert.equal(await chevron('src-row'), 'none', `${dir}: an open branch points down`);
        const closed = await chevron('core-row');
        assert.ok(closed.startsWith(dir === 'ltr' ? 'matrix(0, -1' : 'matrix(0, 1'), `${dir}: a closed branch points to the end edge, got ${closed}`);
        assert.equal(await page.locator('#utils').isVisible(), false, `${dir}: a closed branch hides its children`);

        await page.click('#core-row');
        assert.equal(await page.locator('#core').evaluate((el) => el.open), true);
        assert.equal(await page.locator('#utils').isVisible(), true, `${dir}: opening a branch shows its children`);

        const fill = (id) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).backgroundColor);
        assert.equal(await fill('index'), await fill('selected'), `${dir}: the current row is filled`);
        assert.equal(await page.locator('#level2').evaluate((el) => getComputedStyle(el).borderInlineStartStyle), 'solid', `${dir}: a level draws a guide line`);
      }
      assert.equal(await page.getByRole('tree').count(), 0, 'no tree role is promised');
      assert.equal(await page.getByRole('link', { name: 'index.ts' }).getAttribute('aria-current'), 'page');
    } finally {
      await browser.close();
    }
  });
}
