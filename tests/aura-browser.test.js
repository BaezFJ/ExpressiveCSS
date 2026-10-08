import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = (dir) => `<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head><body>
<main>
  <div id="button" class="aura"><button class="filled">Upgrade</button></div>
  <div id="card" class="aura dual"><article style="width:200px;height:100px"></article></div>
  <div id="glow" class="aura glow"><article style="width:200px;height:100px"></article></div>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: aura turns a ring around its element, stops under reduced motion and stays out of the accessibility tree`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      const style = (id) => page.locator(`#${id}`).evaluate((el) => {
        const s = getComputedStyle(el);
        const ring = getComputedStyle(el, '::before');
        const r = el.getBoundingClientRect();
        const child = el.firstElementChild.getBoundingClientRect();
        return {
          animation: ring.animationName, direction: ring.animationDirection, angle: ring.getPropertyValue('--md-comp-aura-angle').trim(),
          mask: ring.maskImage, image: ring.backgroundImage, filter: ring.filter, radius: s.borderTopLeftRadius,
          width: r.width - child.width, height: r.height - child.height,
        };
      });

      for (const dir of ['ltr', 'rtl']) {
        await page.setContent(markup(dir));
        const button = await style('button');
        assert.equal(button.animation, 'aura-turn', `${dir}: the light turns`);
        assert.equal(button.direction, dir === 'rtl' ? 'reverse' : 'normal', `${dir}: the turn follows the reading direction`);
        assert.match(button.mask, /linear-gradient/, `${dir}: the ring is masked to the border`);
        assert.deepEqual([button.width, button.height], [4, 4], `${dir}: a 2px ring on each side`);
        assert.equal(button.radius, '10001px', `${dir}: the ring is fully rounded around a button`);

        const card = await style('card');
        assert.equal(card.radius, '14px', `${dir}: the ring follows card corners`);

        const glow = await style('glow');
        assert.equal(glow.mask, 'none', `${dir}: glow fills behind the element`);
        assert.match(glow.filter, /blur/);
      }

      await page.waitForTimeout(300);
      assert.notEqual((await style('button')).angle, '0deg', 'the registered angle animates');

      const tree = await page.locator('main').ariaSnapshot();
      assert.equal(tree.trim(), '- main:\n  - button "Upgrade"\n  - article\n  - article', 'only the wrapped elements reach the accessibility tree');

      await page.emulateMedia({ reducedMotion: 'reduce' });
      const still = await style('button');
      assert.equal(still.animation, 'none', 'reduced motion stops the turn');
      assert.match(still.mask, /linear-gradient/, 'the ring stays');
      assert.match(still.image, /conic-gradient/, 'the ring keeps its gradient');

      // A shadow root ignores @property, so the angle animates unregistered and
      // the gradient falls back to 0deg when nothing sets it.
      const shadow = await browser.newPage({ viewport: { width: 800, height: 600 } });
      await shadow.setContent('<!doctype html><html lang="en"><body><div id="host"></div></body></html>');
      const read = () => shadow.evaluate(async (sheet) => {
        const host = document.querySelector('#host');
        if (!host.shadowRoot) {
          const css = new CSSStyleSheet();
          await css.replace(sheet);
          host.attachShadow({ mode: 'open' }).adoptedStyleSheets = [css];
          host.shadowRoot.innerHTML = '<div class="aura"><button class="filled">Upgrade</button></div>';
        }
        const ring = getComputedStyle(host.shadowRoot.querySelector('.aura'), '::before');
        return { animation: ring.animationName, angle: ring.getPropertyValue('--md-comp-aura-angle').trim(), image: ring.backgroundImage };
      }, css);
      const first = await read();
      assert.equal(first.animation, 'aura-turn', 'shadow root: the light turns');
      assert.match(first.image, /conic-gradient/, 'shadow root: the ring is drawn');
      const angles = new Set([first.angle]);
      for (let i = 0; i < 5; i++) { await shadow.waitForTimeout(120); angles.add((await read()).angle); }
      assert.ok(angles.size > 1, `shadow root: the unregistered angle steps (${[...angles]})`);
      await shadow.emulateMedia({ reducedMotion: 'reduce' });
      const rest = await read();
      assert.equal(rest.animation, 'none', 'shadow root: reduced motion stops the turn');
      assert.equal(rest.angle, '', 'shadow root: nothing sets the angle');
      assert.match(rest.image, /conic-gradient/, 'shadow root: the ring stays at its 0deg fallback');
    } finally {
      await browser.close();
    }
  });
}
