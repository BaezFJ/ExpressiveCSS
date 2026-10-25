import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaseBrowser, engines } from './browser.js';

// BackToTop in a real engine: the link shows past the threshold, returns to
// the top with focus on its target, and is out of reach while hidden.
const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../dist/js/expressive.js', import.meta.url), 'utf8');

const filler = Array.from({ length: 80 }, (_, i) => `<p>Paragraph ${i}</p>`).join('');
const page = ({ options = '', dir = 'ltr', script = true } = {}) => `<!doctype html><html lang="en" dir="${dir}"><head><style>${css}</style></head><body>
<main id="main"><h1>Title</h1><button id="first" type="button">First</button>${filler}</main>
<a id="top" class="back-to-top button circle extra" href="#main" aria-label="Back to top" ${options}><span class="material-symbols" aria-hidden="true">arrow_upward</span></a>
${script ? `<script>${js}</script><script>Expressive.AutoInit();</script>` : ''}
</body></html>`;

const active = (p) => p.evaluate(() => document.activeElement.id || document.activeElement.tagName);
const shown = (p) => p.locator('#top').evaluate((el) => !el.inert && getComputedStyle(el).visibility === 'visible');
// The observer reports after the next frame, so wait for inert and the
// computed visibility to agree.
const waitShown = (p, value) =>
  p.waitForFunction((value) => {
    const el = document.getElementById('top');
    const visible = getComputedStyle(el).visibility === 'visible';
    return value ? !el.inert && visible : el.inert && !visible;
  }, value);

async function scrollTo(p, y) {
  await p.evaluate((y) => window.scrollTo(0, y), y);
}

// Resolves once scrollY has held still for ten frames.
const scrollEnd = (p) =>
  p.evaluate(() => new Promise((resolve) => {
    let last = -1;
    let still = 0;
    const tick = () => {
      still = scrollY === last ? still + 1 : 0;
      last = scrollY;
      if (still > 10) resolve(scrollY);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));

async function open(engine, options, contextOptions = {}) {
  const browser = await leaseBrowser(engine);
  const context = await browser.newContext({ viewport: { width: 800, height: 600 }, ...contextOptions });
  const p = await context.newPage();
  await p.setContent(page(options));
  return { browser, p };
}

// Where Tab goes from the button before the link. preventScroll keeps the
// page where it is, since scrolling up to the button would hide the link.
async function tabFromFirst(p) {
  await p.locator('#first').evaluate((el) => el.focus({ preventScroll: true }));
  await p.keyboard.press('Tab');
  return active(p);
}

// Whether the link is hit at its centre, and named in the page's ARIA tree.
async function reachable(p) {
  const hit = await p.locator('#top').evaluate((el) => {
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  });
  const named = (await p.locator('body').ariaSnapshot()).includes('Back to top');
  return { hit, named };
}

for (const [name, engine, test] of engines) {
  test(`${name}: the link returns to the top and focuses its target, by click and by Enter`, { timeout: 60000 }, async () => {
    const { browser, p } = await open(engine);
    try {
      for (const activate of [() => p.locator('#top').click(), async () => { await p.locator('#top').focus(); await p.keyboard.press('Enter'); }]) {
        await scrollTo(p, 2000);
        await waitShown(p, true);
        await activate();
        assert.equal(await scrollEnd(p), 0, 'the page is at the top');
        assert.equal(await active(p), 'main', 'focus is on the target');
        await p.keyboard.press('Tab');
        assert.equal(await active(p), 'first', 'the next Tab reaches the first control after it');
        assert.equal(await p.locator('#main').getAttribute('tabindex'), null, 'the temporary tabindex is gone');
      }
    } finally {
      await browser.close();
    }
  });

  test(`${name}: the link is out of reach above the threshold`, { timeout: 60000 }, async () => {
    const { browser, p } = await open(engine);
    try {
      assert.equal(await shown(p), false, 'hidden at the top');
      assert.notEqual(await tabFromFirst(p), 'top', 'Tab skips it');
      assert.deepEqual(await reachable(p), { hit: false, named: false });

      await scrollTo(p, 2000);
      await waitShown(p, true);
      assert.deepEqual(await reachable(p), { hit: true, named: true }, 'shown past the threshold');
      assert.equal(await tabFromFirst(p), 'top', 'Tab reaches it');

      // A focused link stays shown; that case has its own test.
      await p.evaluate(() => document.activeElement.blur());
      await scrollTo(p, 100);
      await waitShown(p, false);
      assert.notEqual(await tabFromFirst(p), 'top', 'Tab skips it again');
      assert.deepEqual(await reachable(p), { hit: false, named: false }, 'hidden again above the threshold');
    } finally {
      await browser.close();
    }
  });

  test(`${name}: a script that starts after the first paint hides the link at once`, { timeout: 60000 }, async () => {
    const { browser, p } = await open(engine, { script: false });
    try {
      await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      assert.equal(await shown(p), true, 'painted before the script runs');
      await p.addScriptTag({ content: js });
      const style = await p.evaluate(() => {
        Expressive.AutoInit();
        return new Promise((r) => requestAnimationFrame(() => {
          const s = getComputedStyle(document.getElementById('top'));
          r({ visibility: s.visibility, opacity: s.opacity });
        }));
      });
      assert.deepEqual(style, { visibility: 'hidden', opacity: '0' }, 'no fade out at the top of the page');
    } finally {
      await browser.close();
    }
  });

  test(`${name}: a focused link stays until focus leaves, so Home does not drop focus`, { timeout: 60000 }, async () => {
    const { browser, p } = await open(engine);
    try {
      await scrollTo(p, 2000);
      await waitShown(p, true);
      await p.locator('#top').focus();
      await p.keyboard.press('Home');
      assert.equal(await scrollEnd(p), 0, 'Home scrolled to the top');
      assert.equal(await active(p), 'top', 'focus stays on the link');
      assert.equal(await shown(p), true, 'the focused link is not hidden');
      await p.keyboard.press('Shift+Tab');
      await waitShown(p, false);
    } finally {
      await browser.close();
    }
  });

  test(`${name}: the scroll is smooth, and instant under reduced motion`, { timeout: 60000 }, async () => {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const { browser, p } = await open(engine, {}, { reducedMotion });
      try {
        await scrollTo(p, 2000);
        await waitShown(p, true);
        // Read in the same task as the click: an instant scroll has already
        // happened, and a smooth one has not started to move.
        const y = await p.locator('#top').evaluate((el) => {
          el.click();
          return scrollY;
        });
        const fade = await p.locator('#top').evaluate((el) => getComputedStyle(el).transitionDuration);
        if (reducedMotion === 'reduce') {
          assert.equal(y, 0, 'at the top straight away');
          assert.equal(fade, '0s', 'no fade');
        } else {
          assert.ok(y > 0, `not at the top yet (scrollY ${y})`);
          assert.notEqual(fade, '0s', 'the link fades');
        }
        assert.equal(await scrollEnd(p), 0);
      } finally {
        await browser.close();
      }
    }
  });

  test(`${name}: data-back-to-top-options sets the threshold`, { timeout: 60000 }, async () => {
    const { browser, p } = await open(engine, { options: `data-back-to-top-options='{"threshold": "400px"}'` });
    try {
      await scrollTo(p, 300);
      await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      assert.equal(await shown(p), false, 'hidden at 300px');
      await scrollTo(p, 500);
      await waitShown(p, true);
    } finally {
      await browser.close();
    }
  });

  test(`${name}: the link sits at the bottom inline-end corner and works without the script`, { timeout: 60000 }, async () => {
    const browser = await leaseBrowser(engine);
    try {
      const context = await browser.newContext({ viewport: { width: 800, height: 600 } });
      const p = await context.newPage();
      const corner = () => p.locator('#top').evaluate((el) => {
        const r = el.getBoundingClientRect();
        const { clientWidth, clientHeight } = document.documentElement;
        return { bottom: Math.round(clientHeight - r.bottom), end: Math.round(document.dir === 'rtl' ? r.left : clientWidth - r.right) };
      });
      for (const dir of ['ltr', 'rtl']) {
        await p.setContent(page({ dir }));
        await scrollTo(p, 2000);
        await waitShown(p, true);
        assert.deepEqual(await corner(), { bottom: 16, end: 16 }, `16px from the corner in ${dir}`);
      }
      await p.locator('#top').evaluate((el) => el.style.setProperty('--md-comp-back-to-top-offset', '96px'));
      assert.deepEqual(await corner(), { bottom: 96, end: 96 }, 'the offset property moves it');

      await p.setContent(page({ script: false }));
      await scrollTo(p, 2000);
      assert.equal(await shown(p), true, 'visible without the script');
      await p.locator('#top').click();
      assert.equal(await p.evaluate(() => location.hash), '#main');
      assert.ok((await scrollEnd(p)) < 50, 'the link jumps to its target');
    } finally {
      await browser.close();
    }
  });
}
