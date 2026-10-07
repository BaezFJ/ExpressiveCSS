import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = (dir) => `<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head><body>
<main style="width:600px">
<div class="accordion">
  <details id="a" name="faq" open><summary>First</summary><p>One</p></details>
  <details id="b" name="faq"><summary>Second</summary><p>Two</p></details>
  <details id="c" name="faq"><summary>Third</summary><p>Three</p></details>
</div>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: accordion joins its tiles, turns the chevron and keeps one item open per name`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      // Reduced motion removes the corner and chevron transitions, so computed
      // values are final as soon as an item toggles.
      const page = await browser.newPage({ viewport: { width: 800, height: 600 }, reducedMotion: 'reduce' });
      for (const dir of ['ltr', 'rtl']) {
        await page.setContent(markup(dir));
        const radii = (id) => page.locator(`#${id}`).evaluate((el) => {
          const s = getComputedStyle(el);
          return [s.borderStartStartRadius, s.borderStartEndRadius, s.borderEndStartRadius, s.borderEndEndRadius];
        });
        const turned = (id) => page.locator(`#${id} > summary`).evaluate((el) => getComputedStyle(el, '::after').transform.startsWith('matrix(-1'));

        assert.deepEqual(await radii('a'), ['20px', '20px', '20px', '20px'], `${dir}: open item rounds every corner`);
        assert.deepEqual(await radii('b'), ['4px', '4px', '4px', '4px'], `${dir}: closed middle item takes the grouped shape`);
        assert.deepEqual(await radii('c'), ['4px', '4px', '20px', '20px'], `${dir}: last item keeps its outer corners`);
        assert.equal(await turned('a'), true, `${dir}: open chevron is turned over`);
        assert.equal(await turned('b'), false, `${dir}: closed chevron points down`);

        // The native marker is gone, so the label starts at the 16px inset.
        const inset = await page.locator('#b > summary').evaluate((el) => {
          const range = document.createRange();
          range.selectNodeContents(el.firstChild);
          const text = range.getBoundingClientRect();
          const box = el.getBoundingClientRect();
          return document.dir === 'rtl' ? box.right - text.right : text.left - box.left;
        });
        assert.ok(Math.abs(inset - 16) < 1, `${dir}: label starts at the inset, got ${inset}`);

        assert.equal(await page.locator('#b > p').isVisible(), false, `${dir}: closed panel is hidden`);
        await page.locator('#b > summary').click();
        assert.equal(await page.locator('#b').evaluate((el) => el.open), true);
        assert.equal(await page.locator('#a').evaluate((el) => el.open), false, `${dir}: a shared name closes the other item`);
        assert.equal(await page.locator('#b > p').isVisible(), true, `${dir}: opened panel is shown`);
        assert.deepEqual(await radii('b'), ['20px', '20px', '20px', '20px']);
        assert.equal(await turned('b'), true);

        await page.locator('#c > summary').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#c').evaluate((el) => el.open), true, `${dir}: Enter toggles the focused summary`);
        assert.equal(await page.locator('#b').evaluate((el) => el.open), false, `${dir}: opening by keyboard also closes the other item`);
      }
      // Playwright's role model has no summary role, so read the engine's own
      // tree where it is reachable: the summary must carry the native state.
      // Chromium names the role DisclosureTriangleGrouped inside a name group.
      if (name === 'chromium') {
        const cdp = await page.context().newCDPSession(page);
        const { nodes } = await cdp.send('Accessibility.getFullAXTree');
        const expanded = Object.fromEntries(nodes
          .filter((node) => node.role?.value.startsWith('DisclosureTriangle'))
          .map((node) => [node.name?.value, node.properties?.find((property) => property.name === 'expanded')?.value.value]));
        assert.deepEqual(expanded, { First: false, Second: false, Third: true }, 'each summary reports its expanded state');
      }
    } finally {
      await browser.close();
    }
  });
}
