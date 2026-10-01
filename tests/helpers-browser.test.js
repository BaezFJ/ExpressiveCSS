import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const browserTest = existsSync(chromium.executablePath()) ? test : test.skip;

browserTest('visually-hidden text is off screen but still names its link', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    // An unlayered consumer rule beats every layered declaration unless it is
    // important, which is why the utility is.
    await page.setContent(`<style>${css} .note { position: relative; padding: 8px; }</style>
      <a href="#orders-42">View<span id="hidden" class="visually-hidden note"> order 42</span></a>`);
    const hidden = await page.locator('#hidden').evaluate((el) => {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return { width: box.width, height: box.height, position: style.position, clipPath: style.clipPath, overflow: style.overflow };
    });
    assert.deepEqual(hidden, { width: 1, height: 1, position: 'absolute', clipPath: 'inset(50%)', overflow: 'hidden' });
    assert.equal(await page.getByRole('link', { name: 'View order 42' }).count(), 1);
  } finally {
    await browser.close();
  }
});

browserTest('a plain fieldset drops its container and puts the legend at the content start', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>${css}</style>
      <div id="surface" style="width: 320px">
        <fieldset id="outlined"><legend>Outlined</legend><label><input type="radio" name="a">One</label></fieldset>
        <fieldset id="plain" class="plain"><legend id="legend">Delivery</legend><label id="option"><input type="radio" name="b">Daily</label></fieldset>
      </div>`);
    const geometry = await page.evaluate(() => {
      const rect = (id) => document.getElementById(id).getBoundingClientRect();
      const style = getComputedStyle(document.getElementById('plain'));
      const legend = getComputedStyle(document.getElementById('legend'));
      return {
        border: style.borderTopWidth,
        padding: style.padding,
        margin: style.margin,
        background: style.backgroundColor,
        legendPadding: legend.paddingInlineStart,
        legendMargin: legend.marginInlineStart,
        fieldsetLeft: rect('plain').left,
        legendLeft: rect('legend').left,
        optionLeft: rect('option').left,
        width: rect('plain').width,
        surfaceWidth: rect('surface').width
      };
    });
    assert.equal(geometry.border, '0px');
    assert.equal(geometry.padding, '0px');
    assert.equal(geometry.margin, '0px');
    assert.equal(geometry.background, 'rgba(0, 0, 0, 0)');
    assert.equal(geometry.legendPadding, '0px');
    assert.equal(geometry.legendMargin, '0px');
    assert.equal(geometry.legendLeft, geometry.fieldsetLeft);
    assert.equal(geometry.optionLeft, geometry.fieldsetLeft);
    assert.equal(geometry.width, geometry.surfaceWidth);
  } finally {
    await browser.close();
  }
});

for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.EXPRESSIVECSS_TEST_BROWSER && process.env.EXPRESSIVECSS_TEST_BROWSER !== engine) continue;
  const utilityTest = existsSync(browserType.executablePath()) ? test : test.skip;

  utilityTest(`sizing helpers let nested flex and grid content shrink and scroll (${engine})`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css}
        .horizontal { width: 240px; }
        .grid-layout { display: grid; grid-template-columns: 1fr 40px; }
      </style>
        ${['flex', 'grid-layout'].map((layout, i) => `<div class="horizontal ${layout}">
          <div id="cell-${i}" class="flex-1 min-w-0"><div id="scroll-${i}" class="overflow-x-auto text-nowrap">${'long-content-'.repeat(30)}</div></div>
          <div class="flex-none" style="width: 40px">End</div>
        </div>`).join('')}
        <div class="flex flex-column" style="height: 100px">
          <div class="flex-none" style="height: 20px">Header</div>
          <div id="panel" class="flex-1 min-h-0">
            <div id="vertical" class="overflow-y-auto" style="height: 100%"><div style="height: 240px">Scrollable content</div></div>
          </div>
        </div>
        <div id="clipped" class="overflow-hidden" style="width: 100px; height: 20px"><div style="width: 200px; height: 200px">Clipped content</div></div>`);
      for (const i of [0, 1]) {
        assert.equal(await page.locator(`#cell-${i}`).evaluate(el => el.clientWidth), 200);
        assert.ok(await page.locator(`#scroll-${i}`).evaluate(el => {
          el.scrollLeft = 50;
          return el.scrollWidth > el.clientWidth && el.scrollLeft === 50;
        }), `${i === 0 ? 'flex' : 'grid'} content must scroll within its allocated width`);
      }
      assert.equal(await page.locator('#panel').evaluate(el => el.clientHeight), 80);
      assert.ok(await page.locator('#vertical').evaluate(el => {
        el.scrollTop = 50;
        return el.scrollHeight > el.clientHeight && el.scrollTop === 50;
      }));
      assert.equal(await page.locator('#clipped').evaluate(el => getComputedStyle(el).overflow), 'hidden');
    } finally {
      await browser.close();
    }
  });

  utilityTest(`logical spacing and alignment follow LTR and RTL (${engine})`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css} html { font-size: 16px; } .consumer { margin: 0; padding: 0; }</style>
        <div id="direction" style="text-align: center">
          <div id="spacing" class="consumer ms-2 me-4 ps-1 pe-3"></div>
          <div class="flex" style="width: 200px"><div id="trailing" class="ms-auto" style="width: 40px">End</div></div>
          <div class="flex" style="width: 200px"><div id="leading" class="me-auto" style="width: 40px">Start</div></div>
          <div id="start" class="start-align" style="width: 200px"><span>Text</span></div>
          <div id="end" class="end-align" style="width: 200px"><span>Text</span></div>
        </div>`);
      for (const direction of ['ltr', 'rtl']) {
        await page.locator('#direction').evaluate((el, value) => el.dir = value, direction);
        assert.deepEqual(await page.locator('#spacing').evaluate(el => {
          const style = getComputedStyle(el);
          return [style.marginLeft, style.marginRight, style.paddingLeft, style.paddingRight];
        }), direction === 'ltr' ? ['8px', '16px', '4px', '12px'] : ['16px', '8px', '12px', '4px']);
        for (const [id, right] of [['trailing', direction === 'ltr'], ['leading', direction === 'rtl'], ['start', direction === 'rtl'], ['end', direction === 'ltr']]) {
          assert.ok(await page.locator(`#${id}`).evaluate((el, right) => {
            const text = el.firstElementChild;
            const box = (text ?? el).getBoundingClientRect();
            const container = (text ? el : el.parentElement).getBoundingClientRect();
            return Math.abs(right ? box.right - container.right : box.left - container.left) < 1;
          }, right), `${id} should follow ${direction}`);
        }
      }
    } finally {
      await browser.close();
    }
  });

  utilityTest(`text helpers wrap long values without clipping and restore inherited wrapping (${engine})`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const value = 'unbrokenvalue'.repeat(12);
      await page.setContent(`<style>${css} .text-fixture { width: 120px; font: 20px/20px monospace; }</style>
        <div class="text-fixture text-nowrap"><div id="wrapped" class="break-words text-wrap">${value}</div></div>
        <div id="nowrap" class="text-fixture text-nowrap">A label with several words</div>`);
      assert.deepEqual(await page.locator('#wrapped').evaluate(el => {
        const style = getComputedStyle(el);
        return { wraps: el.clientHeight > 20, fits: el.scrollWidth <= el.clientWidth, overflow: style.overflow, clipPath: style.clipPath, text: el.textContent };
      }), { wraps: true, fits: true, overflow: 'visible', clipPath: 'none', text: value });
      assert.deepEqual(await page.locator('#nowrap').evaluate(el => [el.clientHeight, el.scrollWidth > el.clientWidth]), [20, true]);
    } finally {
      await browser.close();
    }
  });

  utilityTest(`focusable hidden content reveals for keyboard and descendant focus (${engine})`, async () => {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${css} .note { display: block; position: relative; padding: 8px; }</style>
        <button id="before" type="button">Before</button>
        <a id="skip" class="visually-hidden-focusable note" href="#after">Skip to content</a>
        <div id="group" class="visually-hidden-focusable note"><a id="first" href="#after">First action</a><a id="second" href="#after">Second action</a></div>
        <button id="after" type="button">After</button>`);
      const hidden = id => page.locator(`#${id}`).evaluate(el => {
        const style = getComputedStyle(el);
        return style.clipPath === 'inset(50%)' && el.offsetWidth === 1 && el.offsetHeight === 1;
      });
      assert.equal(await hidden('skip'), true);
      assert.equal(await hidden('group'), true);
      assert.equal(await page.getByRole('link', { name: 'Skip to content' }).count(), 1);
      await page.locator('#before').focus();
      for (const [focused, shown] of [['skip', 'skip'], ['first', 'group'], ['second', 'group'], ['after', null]]) {
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), focused);
        for (const id of ['skip', 'group']) {
          assert.equal(await hidden(id), id !== shown, `${id} visibility while ${focused} has focus`);
        }
        if (shown) {
          assert.deepEqual(await page.locator(`#${shown}`).evaluate(el => {
            const style = getComputedStyle(el);
            return [style.clipPath, style.position, style.paddingTop, el.offsetWidth > 1, el.offsetHeight > 1];
          }), ['none', 'relative', '8px', true, true], 'focus restores consumer styling');
        }
      }
    } finally {
      await browser.close();
    }
  });
}
