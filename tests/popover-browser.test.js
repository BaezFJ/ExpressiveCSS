import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;

const markup = (dir) => `<!doctype html><html lang="en" dir="${dir}"><head><style>${css} body { margin: 0 }</style></head><body>
<main>
  <button id="b" type="button" popovertarget="p" style="position:absolute; inset-inline-start:200px; top:200px; width:80px; height:40px">Storage</button>
  <div id="p" class="popover" popover>
    <h3>Storage</h3>
    <p>Files in the trash count toward your quota.</p>
    <div class="popover-actions"><button id="act" type="button" class="text">Empty trash</button></div>
  </div>
  <button id="tb" type="button" popovertarget="tp" style="position:absolute; inset-inline-start:200px; top:400px; width:80px; height:40px">Top</button>
  <div id="tp" class="popover top" popover>Above</div>
  <button id="eb" type="button" popovertarget="ep" style="position:absolute; inset-inline-start:200px; top:300px; width:80px; height:40px">End</button>
  <div id="ep" class="popover end" popover>After</div>
  <button id="cb" type="button" popovertarget="cp" style="position:absolute; inset-inline-start:700px; top:540px; width:80px; height:40px">Corner</button>
  <div id="cp" class="popover" popover>Flipped into the viewport</div>
</main></body></html>`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => !requested || requested === name)) {
  test(`${name}: popover anchors to its button, flips at the edge and stays open while used`, { timeout: 30000 }, async (t) => {
    if (!existsSync(engine.executablePath())) { t.skip(`${name} is not installed`); return; }
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 }, reducedMotion: 'reduce' });
      for (const dir of ['ltr', 'rtl']) {
        await page.setContent(markup(dir));
        const box = (id) => page.locator(`#${id}`).evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, middle: (r.top + r.bottom) / 2 };
        });
        const open = (id) => page.locator(`#${id}`).evaluate((el) => el.matches(':popover-open'));
        const near = (a, b, label) => assert.ok(Math.abs(a - b) < 1, `${dir}: ${label} (${a} vs ${b})`);

        await page.click('#b');
        assert.equal(await open('p'), true);
        let button = await box('b');
        let panel = await box('p');
        near(panel.top, button.bottom + 4, 'opens 4px below the button');
        if (dir === 'ltr') near(panel.left, button.left, 'start edges align');
        else near(panel.right, button.right, 'start edges align');

        await page.click('#act');
        assert.equal(await open('p'), true, `${dir}: pressing a button inside keeps it open`);
        await page.keyboard.press('Escape');
        assert.equal(await open('p'), false, `${dir}: Escape closes it`);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'b', `${dir}: focus returns to the button`);

        await page.click('#tb');
        button = await box('tb');
        panel = await box('tp');
        near(panel.bottom, button.top - 4, '.top opens above');

        await page.click('#eb');
        assert.equal(await open('tp'), false, `${dir}: opening another auto popover closes the first`);
        button = await box('eb');
        panel = await box('ep');
        if (dir === 'ltr') near(panel.left, button.right + 4, '.end opens after the button');
        else near(panel.right, button.left - 4, '.end opens after the button');
        near(panel.middle, button.middle, '.end centers on the button');

        await page.click('#cb');
        button = await box('cb');
        panel = await box('cp');
        near(panel.bottom, button.top - 4, 'flips above near the bottom edge');
        assert.ok(panel.right <= 800 && panel.left >= 0, `${dir}: stays inside the viewport`);

        await page.mouse.click(20, 20);
        assert.equal(await open('cp'), false, `${dir}: a click outside closes it`);
      }

      if (name === 'chromium') {
        await page.click('#b');
        const cdp = await page.context().newCDPSession(page);
        const { nodes } = await cdp.send('Accessibility.getFullAXTree');
        const button = nodes.find((node) => node.role?.value === 'button' && node.name?.value === 'Storage');
        const expanded = button.properties.find((property) => property.name === 'expanded')?.value.value;
        assert.equal(expanded, true, 'the button reports the open popover as expanded');
      }
    } finally {
      await browser.close();
    }
  });
}
