import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const browserTest = existsSync(chromium.executablePath()) ? test : test.skip;

async function cardState(card) {
  return card.evaluate((el) => ({
    shadow: getComputedStyle(el).boxShadow,
    opacity: getComputedStyle(el, '::after').opacity
  }));
}

browserTest('dragged and picked-up states override simultaneous pointer states', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setContent(`
      <style>${css}</style>
      <div id="parking" style="width: 10px; height: 10px"></div>
      ${['dragged', 'picked-up'].flatMap((state) =>
        ['', 'filled', 'outlined'].map((variant) => `
          <article id="${state}-${variant || 'elevated'}" class="${state} ${variant}">
            <a class="primary-action" href="#target">Card</a>
          </article>`)
      ).join('')}
    `);

    for (const state of ['dragged', 'picked-up']) {
      for (const variant of ['elevated', 'filled', 'outlined']) {
        const card = page.locator(`#${state}-${variant}`);
        const action = card.locator('> .primary-action');
        await page.locator('#parking').hover();
        const dragged = await cardState(card);
        assert.equal(dragged.opacity, '0.16', `${state} ${variant} opacity`);

        await action.hover();
        assert.deepEqual(
          await cardState(card),
          dragged,
          `${state} ${variant} changed on hover`
        );

        await page.mouse.down();
        assert.deepEqual(
          await cardState(card),
          dragged,
          `${state} ${variant} changed while active`
        );
        await page.mouse.up();
      }
    }
  } finally {
    await browser.close();
  }
});

browserTest('invalid disclosures keep their panels visible and operable', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setContent(`
      <style>${css}</style>
      <article id="submit-trigger">
        <button type="submit" class="card-reveal-trigger">Submit</button>
        <aside id="submit-details">Submit-trigger details</aside>
      </article>
      <article id="disabled-trigger">
        <button type="button" class="card-reveal-trigger" disabled>Disabled</button>
        <aside id="disabled-details">Disabled-trigger details</aside>
      </article>
      <article id="aria-disabled-trigger">
        <button type="button" class="card-reveal-trigger" aria-disabled="true">Disabled</button>
        <aside id="aria-disabled-details">ARIA-disabled details</aside>
      </article>
      <article id="multiple-panels">
        <button type="button" class="card-reveal-trigger">Multiple</button>
        <aside id="first-details">First panel</aside>
        <aside id="second-details">Second panel</aside>
      </article>
    `);

    for (const panel of await page.locator('article > aside').all()) {
      const state = await panel.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          display: style.display,
          height: style.height,
          opacity: style.opacity,
          pointerEvents: style.pointerEvents,
          visibility: style.visibility
        };
      });
      assert.notEqual(state.display, 'none');
      assert.notEqual(state.height, '0px');
      assert.equal(state.opacity, '1');
      assert.equal(state.pointerEvents, 'auto');
      assert.equal(state.visibility, 'visible');
    }
  } finally {
    await browser.close();
  }
});

browserTest('directly actionable horizontal cards use intrinsic or fixed heights at the breakpoint', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 600, height: 900 } });
    await page.setContent(`
      <style>${css}</style>
      <article id="intrinsic" class="horizontal">
        <a class="primary-action" href="#intrinsic-target">
          <img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
          <h2>Intrinsic card</h2>
          <p>Supporting text</p>
        </a>
      </article>
      <article id="fixed" class="horizontal small">
        <a class="primary-action" href="#fixed-target">
          <img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
          <h2>Fixed card</h2>
          <p>Supporting text</p>
        </a>
      </article>
    `);

    const heights = () => page.evaluate(() => ({
      fixed: document.getElementById('fixed').getBoundingClientRect().height,
      intrinsic: document.getElementById('intrinsic').getBoundingClientRect().height
    }));

    assert.deepEqual(await heights(), { fixed: 300, intrinsic: 240 });

    await page.setViewportSize({ width: 599, height: 900 });
    const compact = await heights();
    assert.ok(compact.intrinsic < 900, `intrinsic compact height was ${compact.intrinsic}`);
    assert.ok(compact.fixed < 300, `fixed compact height was ${compact.fixed}`);
  } finally {
    await browser.close();
  }
});
