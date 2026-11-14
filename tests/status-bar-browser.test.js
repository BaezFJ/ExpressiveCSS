// Status bar layout, color and modes in Chromium, Firefox and WebKit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { engines, leaseBrowser } from './browser.js';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

const icon = (name) => `<span class="material-symbols" aria-hidden="true">${name}</span>`;
const bar = (id, cls = '', extra = '') => `<footer class="status-bar ${cls}" id="${id}">
  <button type="button" class="primary on-primary-text" id="${id}-remote" aria-label="Remote">${icon('terminal')}</button>
  <button type="button" id="${id}-branch">${icon('fork_right')}<span>master</span></button>
  <a href="#problems" id="${id}-link">Problems</a>
  <span role="status" id="${id}-pos">Ln 42, Col 7</span>
  <span class="error-container on-error-container-text" id="${id}-err">${icon('error')}<span>3</span></span>
  <button type="button" id="${id}-dis" disabled>Format</button>
  <button type="button" id="${id}-ad" aria-disabled="true">Lint</button>
  <button type="button" class="disabled primary on-primary-text" id="${id}-cd">Deploy</button>
  <button type="button" id="${id}-tog" aria-pressed="true">Wrap</button>
  <span data-priority="low" id="${id}-low">UTF-8</span>
  ${extra}
  <button type="button" class="end" id="${id}-acct" aria-label="Accounts">${icon('account_circle')}</button>
  <button type="button" class="end" id="${id}-bell" aria-label="Notifications">${icon('notifications')}</button>
</footer>`;

const probes = `<div id="probes">${['surface-container', 'primary-container', 'on-primary-container', 'primary', 'on-primary', 'error-container', 'on-error-container']
  .map((role) => `<i id="p-${role}" style="color:var(--md-sys-color-${role})"></i>`).join('')}
  <i id="p-type" style="font-size:var(--md-sys-typescale-body-small-font-size);letter-spacing:var(--md-sys-typescale-body-small-letter-spacing)"></i></div>`;

const page = (body, { dir = 'ltr', root = '' } = {}) => `<!doctype html><html lang="en" dir="${dir}" style="${root}"><head><style>${css}</style>
<style>body{margin:0}
/* No icon font loads here, so a glyph name renders as wide text. Clip it as the font would. */
.material-symbols{overflow:hidden}</style></head><body>${probes}${body}</body></html>`;

const long = `<main style="height:3000px">Content</main>`;

async function open(type, width, html, options = {}) {
  const browser = await leaseBrowser(type);
  const tab = await browser.newPage({ viewport: { width, height: 768 }, ...options });
  await tab.setContent(html);
  const box = (sel) => tab.locator(sel).evaluate((el) => el.getBoundingClientRect().toJSON());
  const style = (sel, prop) => tab.locator(sel).evaluate((el, prop) => getComputedStyle(el)[prop], prop);
  return { browser, tab, box, style };
}

for (const [name, type, run] of engines) {
  run(`${name}: status bar is a 24px sticky row of 24px items`, { timeout: 30000 }, async () => {
    const { browser, tab, box, style } = await open(type, 1024, page(`${long}${bar('a')}`));
    try {
      const bar = await box('#a');
      const viewport = await tab.evaluate(() => ({ width: document.documentElement.clientWidth, height: document.documentElement.clientHeight }));
      assert.equal(bar.height, 24, 'the bar is 24px tall');
      assert.equal(bar.width, viewport.width, 'the bar spans the window');
      assert.equal(await style('#a', 'backgroundColor'), await style('#p-surface-container', 'color'), 'surface-container');
      assert.equal(await style('#a', 'fontSize'), await style('#p-type', 'fontSize'), 'body-small size');
      assert.equal(await style('#a', 'letterSpacing'), await style('#p-type', 'letterSpacing'), 'body-small letter-spacing');

      await tab.evaluate(() => window.scrollTo(0, 1200));
      assert.ok(Math.abs((await box('#a')).bottom - viewport.height) < 1, 'the bar sticks to the window bottom mid-scroll');

      for (const id of ['remote', 'branch', 'link', 'pos', 'err', 'dis', 'low', 'acct', 'bell']) {
        const item = await box(`#a-${id}`);
        assert.ok(item.width >= 24 && item.height >= 24, `${id} is at least 24 x 24`);
      }
      const glyph = await box('#a-branch .material-symbols');
      assert.equal(glyph.width, 16, 'icons are 16px');
      assert.equal(await style('#a-branch', 'columnGap'), '4px', 'icon and text sit 4px apart');

      const acct = await box('#a-acct');
      const bell = await box('#a-bell');
      assert.ok(Math.abs(bell.right - bar.right) < 1, '.end pushes the trailing group to the end');
      assert.ok(Math.abs(acct.right - bell.left) < 1, 'a later .end sits right after the first');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: status bar items drop native chrome and show state`, { timeout: 30000 }, async () => {
    const { browser, tab, style } = await open(type, 1024, page(bar('a')));
    try {
      assert.equal(await style('#a-branch', 'backgroundColor'), 'rgba(0, 0, 0, 0)', 'transparent at rest');
      assert.equal(await style('#a-branch', 'borderTopWidth'), '0px', 'no border');
      assert.equal(await style('#a-branch', 'color'), await style('#a', 'color'), 'inherits the bar color');
      assert.equal(await style('#a-link', 'textDecorationLine'), 'none', 'links are not underlined');

      // Reduced motion turns the item transition off, so a state reads at once.
      await tab.emulateMedia({ reducedMotion: 'reduce' });

      // Keyboard first, while the Tab starting point is still the top of the page.
      await tab.keyboard.press('Tab');
      assert.equal(await tab.evaluate(() => document.activeElement.id), 'a-remote');
      assert.equal(await style('#a-remote', 'outlineStyle'), 'solid', 'focus shows a ring');
      assert.ok(parseFloat(await style('#a-remote', 'outlineOffset')) < 0, 'the ring sits inside the item');
      await tab.keyboard.press('Tab');
      assert.equal(await style('#a-branch', 'backgroundColor'), 'rgba(0, 0, 0, 0)', 'the filled-button focus fill stays out');

      await tab.hover('#a-branch');
      assert.notEqual(await style('#a-branch', 'backgroundImage'), 'none', 'hover paints a state layer');
      assert.equal(await style('#a-branch', 'backgroundColor'), 'rgba(0, 0, 0, 0)', 'the filled-button hover fill stays out');
      await tab.mouse.down();
      assert.equal(await style('#a-branch', 'backgroundColor'), 'rgba(0, 0, 0, 0)', 'the filled-button pressed fill stays out');
      await tab.mouse.up();
      await tab.hover('#a-remote');
      assert.notEqual(await style('#a-remote', 'backgroundImage'), 'none', 'a filled item shows the state layer over its fill');
      await tab.hover('#a-pos');
      assert.equal(await style('#a-pos', 'backgroundImage'), 'none', 'read-only text has no state layer');
      await tab.hover('#a-dis', { force: true });
      assert.equal(await style('#a-dis', 'backgroundImage'), 'none', 'disabled has no state layer');
      for (const id of ['dis', 'ad', 'cd']) assert.equal(await style(`#a-${id}`, 'opacity'), '0.38', `${id} is dimmed`);
      // A mouse click at a disabled item's center must not reach it.
      for (const id of ['ad', 'cd']) {
        const clicked = await tab.locator(`#a-${id}`).evaluate((el) => {
          el.dataset.clicks = '0';
          el.addEventListener('click', () => { el.dataset.clicks = '1'; });
          const r = el.getBoundingClientRect();
          return [r.left + r.width / 2, r.top + r.height / 2];
        });
        await tab.mouse.click(...clicked);
        assert.equal(await tab.locator(`#a-${id}`).getAttribute('data-clicks'), '0', `${id} ignores a mouse click`);
      }
      assert.equal(await style('#a-tog', 'backgroundColor'), 'rgba(0, 0, 0, 0)', 'a toggle item takes no filled toggle color');

      // A mouse click leaves :focus without :focus-visible, and a press reshapes common buttons.
      await tab.hover('#a-branch');
      await tab.mouse.down();
      assert.equal(await style('#a-branch', 'borderTopLeftRadius'), '0px', 'pressing keeps the item square');
      await tab.mouse.up();
      await tab.mouse.move(5, 700);
      assert.equal(await tab.evaluate(() => document.activeElement.id), 'a-branch');
      assert.equal(await style('#a-branch', 'backgroundColor'), 'rgba(0, 0, 0, 0)', 'mouse focus paints no fill');
    } finally {
      await browser.close();
    }
  });

  run(`${name}: status bar colors, vibrant and filled items`, { timeout: 30000 }, async () => {
    const { browser, style } = await open(type, 1024, page(`${bar('a')}${bar('v', 'vibrant')}<div vibrant>${bar('f')}</div>`));
    try {
      const color = (role) => style(`#p-${role}`, 'color');
      assert.equal(await style('#v', 'backgroundColor'), await color('primary-container'), 'vibrant is primary-container');
      assert.equal(await style('#v', 'color'), await color('on-primary-container'), 'vibrant text is on-primary-container');
      assert.notEqual(await style('#f', 'backgroundColor'), await style('#a', 'backgroundColor'), 'the [vibrant] foundation repaints the bar');
      for (const id of ['a', 'v']) {
        assert.equal(await style(`#${id}-remote`, 'backgroundColor'), await color('primary'), `${id}: .primary fills a button item`);
        assert.equal(await style(`#${id}-remote`, 'color'), await color('on-primary'), `${id}: .on-primary-text colors it`);
        assert.equal(await style(`#${id}-err`, 'backgroundColor'), await color('error-container'), `${id}: .error-container fills a text item`);
        assert.equal(await style(`#${id}-err`, 'color'), await color('on-error-container'), `${id}: .on-error-container-text colors it`);
      }
    } finally {
      await browser.close();
    }
  });

  run(`${name}: status bar hides low-priority items below 600px and wraps instead of scrolling`, { timeout: 30000 }, async () => {
    const many = Array.from({ length: 14 }, (_, i) => `<span>Item ${i}</span>`).join('');
    for (const [width, shown] of [[400, false], [599, false], [600, true], [800, true]]) {
      const { browser, style } = await open(type, width, page(bar('a')));
      try {
        assert.equal((await style('#a-low', 'display')) !== 'none', shown, `low item at ${width}px`);
      } finally {
        await browser.close();
      }
    }
    const { browser, tab } = await open(type, 320, page(bar('a', '', many)));
    try {
      const widths = await tab.evaluate(() => ({
        page: [document.scrollingElement.scrollWidth, document.scrollingElement.clientWidth],
        bar: [document.querySelector('#a').scrollWidth, document.querySelector('#a').clientWidth],
      }));
      assert.equal(widths.page[0], widths.page[1], 'the page does not scroll sideways');
      assert.equal(widths.bar[0], widths.bar[1], 'nothing overflows the bar');
      assert.ok((await tab.locator('#a').evaluate((el) => el.offsetHeight)) > 24, 'items that do not fit wrap to another row');
    } finally {
      await browser.close();
    }
  });

run(`${name}: status bar end group, pane footers and badges`, { timeout: 30000 }, async () => {
    const endBar = `<footer class="status-bar" id="e"><span>Ln 1</span><span class="end" data-priority="low">UTF-8</span><button type="button" class="end" id="e-bell" aria-label="Notifications">${icon('notifications')}</button></footer>`;
    const pane = `<section class="pane"><div>Body</div>${bar('p')}</section>`;
    const badge = `<footer class="status-bar" id="b"><button type="button" aria-label="Notifications, 3 new"><span class="material-symbols" id="b-icon" aria-hidden="true">notifications<span class="badge" id="b-badge">3</span></span></button></footer>`;
    const { browser, box, style } = await open(type, 599, page(`${endBar}${pane}${badge}`));
    try {
      assert.ok(Math.abs((await box('#e-bell')).right - (await box('#e')).right) < 1, 'the first visible .end starts the end group when the first .end is hidden');
      assert.equal((await box('#p')).height, 24, 'a pane footer rule leaves the bar 24px tall');
      assert.equal(await style('#p', 'borderTopWidth'), '0px', 'no pane footer divider');
      const glyph = await box('#b-icon');
      const dot = await box('#b-badge');
      assert.ok(Math.abs(dot.left + dot.width / 2 - glyph.right) < 1, 'the badge centers on the end edge of the glyph');
      assert.ok(Math.abs(dot.top + dot.height / 2 - glyph.top) < 1, 'the badge centers on the top edge of the glyph');
    } finally {
      await browser.close();
    }
  });

    run(`${name}: status bar mirrors in RTL and grows with enlarged text`, { timeout: 30000 }, async () => {
    const rtl = await open(type, 1024, page(bar('a'), { dir: 'rtl' }));
    try {
      assert.ok(Math.abs((await rtl.box('#a-bell')).left - (await rtl.box('#a')).left) < 1, 'the end group sits at the left in RTL');
    } finally {
      await rtl.browser.close();
    }
    const short = `<footer class="status-bar" id="a"><button type="button" aria-label="Remote">${icon('terminal')}</button><button type="button">${icon('fork_right')}<span>master</span></button><span role="status">Ln 42, Col 7</span><button type="button" class="end" aria-label="Notifications">${icon('notifications')}</button></footer>`;
    const big = await open(type, 1024, page(short, { root: 'font-size:32px' }));
    try {
      const bar = await big.box('#a');
      assert.ok(bar.height >= 48, `the bar grows with the text (${bar.height}px)`);
      const tops = await big.tab.$$eval('#a > *', (els) => els.filter((el) => el.offsetParent).map((el) => el.getBoundingClientRect().top));
      assert.ok(tops.every((top) => Math.abs(top - tops[0]) < 1), 'items stay on one row');
      const clipped = await big.tab.$$eval('#a > *', (els) => els.some((el) => el.scrollHeight > el.clientHeight + 1));
      assert.equal(clipped, false, 'no item clips its text');
    } finally {
      await big.browser.close();
    }
  });

  if (name === 'chromium') {
    run(`${name}: status bar keeps its edge and focus in forced colors and stays still under reduced motion`, { timeout: 30000 }, async () => {
      const { browser, tab, style } = await open(type, 1024, page(bar('a')), { forcedColors: 'active', reducedMotion: 'reduce' });
      try {
        assert.equal(await style('#a', 'borderTopStyle'), 'solid', 'the bar keeps a top edge');
        assert.equal(await style('#a', 'borderTopWidth'), '1px');
        await tab.keyboard.press('Tab');
        assert.notEqual(await style('#a-remote', 'outlineStyle'), 'none', 'focus stays visible');
        assert.match(await style('#a-branch', 'transitionDuration'), /^0s(, 0s)*$/, 'nothing animates under reduced motion');
      } finally {
        await browser.close();
      }
    });
  }
}
