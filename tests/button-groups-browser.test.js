import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');
const browserTest = existsSync(chromium.executablePath()) ? test : test.skip;

browserTest('button-group toggle colors resolve in a browser', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <style>${css}</style>
      <div class="button-group">
        <button id="default-off" class="button" aria-pressed="false">Default</button>
        <button id="default-on" class="button" aria-pressed="true">Default</button>
        <button id="tonal-off" class="button tonal" aria-pressed="false">Tonal</button>
        <button id="tonal-on" class="button tonal" aria-pressed="true">Tonal</button>
        <button id="elevated-off" class="button elevated" aria-pressed="false">Elevated</button>
        <button id="elevated-on" class="button elevated" aria-pressed="true">Elevated</button>
        <button id="outlined-off" class="button outlined" aria-pressed="false">Outlined</button>
        <button id="outlined-on" class="button outlined" aria-pressed="true">Outlined</button>
        <button id="icon-on" class="icon-button filled" aria-pressed="true" aria-label="Favorite">
          <span class="material-symbols">favorite</span>
        </button>
      </div>
    `);

    const colors = await page.evaluate(() => Object.fromEntries(
      [...document.querySelectorAll('.button-group > button')].map((button) => [
        button.id,
        getComputedStyle(button).backgroundColor
      ])
    ));

    for (const id of [
      'default-off',
      'default-on',
      'tonal-off',
      'tonal-on',
      'elevated-off',
      'elevated-on',
      'outlined-on',
      'icon-on'
    ]) {
      assert.notEqual(colors[id], 'rgba(0, 0, 0, 0)', `${id} computed transparent`);
    }
    assert.equal(colors['outlined-off'], 'rgba(0, 0, 0, 0)');
    assert.equal(
      await page.locator('#icon-on > span').evaluate((icon) =>
        getComputedStyle(icon).getPropertyValue('--md-icon-fill').trim()
      ),
      '1'
    );
  } finally {
    await browser.close();
  }
});

browserTest('button-group geometry resolves for overrides, targets, and RTL', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setContent(`
      <style>${css}</style>
      <div id="standard" class="button-group small">
        <button id="inherited" class="button tonal" aria-pressed="true">Inherited</button>
        <button id="override" class="button tonal xlarge" aria-pressed="true">Override</button>
      </div>
      <div id="connected" class="button-group connected xsmall" dir="rtl" style="width: 300px">
        <button id="first" class="button tonal">First</button>
        <button id="middle" class="button tonal">Middle</button>
        <button id="last" class="button tonal">Last</button>
      </div>
    `);

    const standard = await page.evaluate(() => {
      const inherited = document.getElementById('inherited');
      const override = document.getElementById('override');
      return {
        inherited: {
          height: inherited.getBoundingClientRect().height,
          radius: getComputedStyle(inherited).borderTopLeftRadius
        },
        override: {
          height: override.getBoundingClientRect().height,
          radius: getComputedStyle(override).borderTopLeftRadius
        },
        target: {
          minHeight: getComputedStyle(inherited, '::before').minHeight,
          minWidth: getComputedStyle(inherited, '::before').minWidth
        }
      };
    });
    assert.deepEqual(standard, {
      inherited: { height: 40, radius: '12px' },
      override: { height: 136, radius: '28px' },
      target: { minHeight: '48px', minWidth: '48px' }
    });

    const connected = await page.evaluate(() => {
      const items = [...document.querySelectorAll('#connected > button')];
      const first = getComputedStyle(items[0]);
      const middle = getComputedStyle(items[1]);
      const last = getComputedStyle(items[2]);
      return {
        heights: items.map((item) => item.getBoundingClientRect().height),
        widths: items.map((item) => item.getBoundingClientRect().width),
        first: [first.borderTopLeftRadius, first.borderTopRightRadius],
        middle: [middle.borderTopLeftRadius, middle.borderTopRightRadius],
        last: [last.borderTopLeftRadius, last.borderTopRightRadius],
        transition: first.transitionDuration
      };
    });

    assert.deepEqual(connected.heights, [32, 32, 32]);
    assert.ok(connected.widths.every((width) => width >= 48));
    assert.ok(
      Math.max(...connected.widths) - Math.min(...connected.widths) < 1,
      `connected widths were ${connected.widths.join(', ')}`
    );
    assert.deepEqual(connected.first, ['4px', '9999px']);
    assert.deepEqual(connected.middle, ['4px', '4px']);
    assert.deepEqual(connected.last, ['9999px', '4px']);
    assert.equal(connected.transition, '0s');
  } finally {
    await browser.close();
  }
});

browserTest('standard press redistribution keeps its rendered width stable', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <style>${css}</style>
      <div id="group" class="button-group" style="width: max-content">
        <button class="button tonal">Previous action</button>
        <button class="button tonal">A wider center action</button>
        <button class="button tonal">Following action</button>
      </div>
    `);
    await page.addScriptTag({ content: js });
    await page.evaluate(() => Expressive.AutoInit());

    const widths = () => page.evaluate(() => {
      const group = document.getElementById('group');
      const items = [...group.children];
      return {
        group: group.getBoundingClientRect().width,
        items: items.map((item) => item.getBoundingClientRect().width)
      };
    });
    const before = await widths();

    await page.locator('#group > button:nth-child(2)').dispatchEvent('pointerdown', {
      button: 0
    });
    await page.waitForTimeout(250);
    const pressed = await widths();

    assert.ok(pressed.items[1] > before.items[1]);
    assert.ok(Math.abs(pressed.group - before.group) < 1);
    assert.ok(
      Math.abs(
        pressed.items.reduce((sum, width) => sum + width, 0) -
        before.items.reduce((sum, width) => sum + width, 0)
      ) < 1
    );

    await page.locator('#group > button:nth-child(2)').dispatchEvent('focusout');
    await page.waitForTimeout(250);
    const released = await widths();
    assert.ok(Math.abs(released.group - before.group) < 1);
    assert.ok(released.items.every((width, index) => Math.abs(width - before.items[index]) < 1));
  } finally {
    await browser.close();
  }
});

browserTest('keyboard press changes icon widths and rendered corners', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <style>${css}</style>
      <div id="standard" class="button-group">
        <button class="icon-button filled" aria-label="Previous"><span class="material-symbols" aria-hidden="true">skip_previous</span></button>
        <button class="icon-button filled" aria-label="Play"><span class="material-symbols" aria-hidden="true">play_arrow</span></button>
        <button class="icon-button filled" aria-label="Next"><span class="material-symbols" aria-hidden="true">skip_next</span></button>
      </div>
      <div id="connected" class="button-group connected">
        <button class="button tonal">Left</button>
        <button class="button tonal">Center</button>
        <button class="button tonal">Right</button>
      </div>
    `);
    await page.addScriptTag({ content: js });
    await page.evaluate(() => window.Expressive.AutoInit());

    const metrics = (selector) => page.locator(`${selector} > button`).evaluateAll((items) => ({
      widths: items.map((item) => item.getBoundingClientRect().width),
      centerRadius: Number.parseFloat(getComputedStyle(items[1]).borderStartStartRadius)
    }));

    const standardBefore = await metrics('#standard');
    await page.locator('#standard > button:nth-child(2)').focus();
    await page.keyboard.down('Enter');
    await page.waitForTimeout(250);
    const standardPressed = await metrics('#standard');
    assert.ok(standardPressed.widths[1] > standardBefore.widths[1]);
    assert.ok(standardPressed.centerRadius < standardBefore.centerRadius);
    assert.ok(
      Math.abs(
        standardPressed.widths.reduce((sum, width) => sum + width, 0)
        - standardBefore.widths.reduce((sum, width) => sum + width, 0)
      ) < 1,
      `icon widths changed from ${standardBefore.widths.join(', ')} to ${standardPressed.widths.join(', ')}`
    );
    await page.keyboard.up('Enter');
    await page.waitForTimeout(250);
    const standardReleased = await metrics('#standard');
    assert.ok(standardReleased.widths.every(
      (width, index) => Math.abs(width - standardBefore.widths[index]) < 1
    ));

    const connectedBefore = await metrics('#connected');
    await page.locator('#connected > button:nth-child(2)').focus();
    await page.keyboard.down('Space');
    await page.waitForTimeout(250);
    const connectedPressed = await metrics('#connected');
    assert.ok(connectedPressed.centerRadius < connectedBefore.centerRadius);
    await page.keyboard.up('Space');
    await page.waitForTimeout(250);
    const connectedReleased = await metrics('#connected');
    assert.ok(Math.abs(connectedReleased.centerRadius - connectedBefore.centerRadius) < 0.1);
  } finally {
    await browser.close();
  }
});

browserTest('selection-required skips disabled controls and preserves a selection', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <style>${css}</style>
      <div id="group" class="button-group connected" data-selection="single" data-selection-required>
        <button id="native-disabled" type="button" class="button tonal" aria-pressed="false" disabled>Day</button>
        <button id="aria-disabled" type="button" class="button tonal" aria-pressed="false" aria-disabled="true">Week</button>
        <button id="class-disabled" type="button" class="button tonal disabled" aria-pressed="false">Month</button>
        <button id="selected" type="button" class="button tonal" aria-pressed="false">Quarter</button>
        <button id="other" type="button" class="button tonal" aria-pressed="false">Year</button>
      </div>
      <div id="optional" class="button-group connected" data-selection="single">
        <button id="optional-one" type="button" class="button tonal" aria-pressed="false">List</button>
        <button type="button" class="button tonal" aria-pressed="false">Grid</button>
      </div>
    `);
    await page.addScriptTag({ content: js });
    await page.evaluate(() => window.Expressive.AutoInit());

    const states = () => page.locator('#group > button').evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute('aria-pressed'))
    );
    assert.deepEqual(await states(), ['false', 'false', 'false', 'true', 'false']);

    await page.evaluate(() => {
      for (const id of ['native-disabled', 'aria-disabled', 'class-disabled']) {
        const button = document.getElementById(id);
        button.click();
        button.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
      }
    });
    assert.deepEqual(await states(), ['false', 'false', 'false', 'true', 'false']);
    assert.equal(await page.locator('.button-group-pressed').count(), 0);

    await page.locator('#selected').click();
    assert.deepEqual(await states(), ['false', 'false', 'false', 'true', 'false']);
    await page.locator('#other').click();
    assert.deepEqual(await states(), ['false', 'false', 'false', 'false', 'true']);

    const optionalStates = () => page.locator('#optional > button').evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute('aria-pressed'))
    );
    assert.deepEqual(await optionalStates(), ['false', 'false']);
    await page.locator('#optional-one').click();
    assert.deepEqual(await optionalStates(), ['true', 'false']);
    await page.locator('#optional-one').click();
    assert.deepEqual(await optionalStates(), ['false', 'false']);
  } finally {
    await browser.close();
  }
});

browserTest('connected translated labels remain reachable in a constrained scroller', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 600 } });
    await page.setContent(`
      <style>${css}</style>
      <main id="scroller" style="width: 300px; overflow-x: auto; padding: 5px">
        <div id="group" class="button-group connected" data-selection="single">
          <button id="first" type="button" class="button tonal" aria-pressed="true">An vorheriger Position ausrichten</button>
          <button type="button" class="button tonal" aria-pressed="false">An der Mitte des Inhalts ausrichten</button>
          <button id="last" type="button" class="button tonal" aria-pressed="false">An nächster Position ausrichten</button>
        </div>
      </main>
    `);

    const geometry = await page.evaluate(() => {
      const scroller = document.querySelector('#scroller');
      const group = document.querySelector('#group');
      const buttons = [...group.children];
      return {
        pageOverflow: document.documentElement.scrollWidth - innerWidth,
        scrollable: scroller.scrollWidth > scroller.clientWidth,
        groupWidth: group.getBoundingClientRect().width,
        widths: buttons.map((button) => button.getBoundingClientRect().width),
        labelsFit: buttons.every((button) => button.scrollWidth <= button.clientWidth),
        labelsStayOnOneLine: buttons.every((button) => getComputedStyle(button).whiteSpace === 'nowrap')
      };
    });
    assert.equal(geometry.pageOverflow, 0);
    assert.equal(geometry.scrollable, true);
    assert.equal(geometry.labelsFit, true);
    assert.equal(geometry.labelsStayOnOneLine, true);
    assert.ok(geometry.groupWidth > 300);
    assert.ok(Math.max(...geometry.widths) - Math.min(...geometry.widths) < 1);

    const focusedOutline = () => page.evaluate(() => {
      const scroller = document.querySelector('#scroller');
      const viewport = scroller.getBoundingClientRect();
      const button = document.activeElement;
      const bounds = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      const inset = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
      return {
        id: button.id,
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
        fits: bounds.left - inset >= viewport.left - 0.5
          && bounds.right + inset <= viewport.right + 0.5
          && bounds.top - inset >= viewport.top - 0.5
          && bounds.bottom + inset <= viewport.bottom + 0.5
      };
    });

    await page.keyboard.press('Tab');
    assert.deepEqual(await focusedOutline(), {
      id: 'first', outlineWidth: '3px', outlineOffset: '2px', fits: true
    });
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    assert.deepEqual(await focusedOutline(), {
      id: 'last', outlineWidth: '3px', outlineOffset: '2px', fits: true
    });
  } finally {
    await browser.close();
  }
});
