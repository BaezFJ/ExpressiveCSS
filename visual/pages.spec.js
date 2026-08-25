// One screenshot per page per variant, over the whole documentation site.
//
// The page list is website/*.html -- the frozen site, so this covers exactly
// what ships, and a page added to NAV is covered the moment it is frozen.
//
// The variants are deliberately not a full cross product. Three widths in
// light catch the adaptive regressions (the navigation rail appears at
// Expanded, the drawer at Large), and one dark pass catches the token
// regressions, which are the other half of what breaks here: a rule written
// against a --md-sys-color-*-light pair rather than the live name looks
// perfect until the theme flips. Six combinations would double the wall clock
// to re-photograph the same layout in a second color.

import { readdirSync, existsSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const MODE = process.env.VISUAL_MODE ?? 'head';

/** The M3 window size classes worth photographing, plus one dark pass. */
const VARIANTS = [
  { name: 'compact', width: 375, height: 812, theme: 'light' },
  { name: 'expanded', width: 900, height: 1000, theme: 'light' },
  { name: 'large', width: 1440, height: 1000, theme: 'light' },
  { name: 'large-dark', width: 1440, height: 1000, theme: 'dark' },
];

// A Thursday, mid-morning, mid-month: nothing about it lands on a boundary
// the pickers might render specially.
const FIXED_NOW = new Date('2026-01-15T10:04:00Z');

const root = new URL('../', import.meta.url);

const pages = readdirSync(new URL('website/', root))
  .filter((f) => f.endsWith('.html'))
  .sort();

/** The docs-site chrome, masked identically in both passes. See the note at the shutter. */
const CHROME_MASK = (page) => [page.locator('#nav-mobile')];

for (const file of pages) {
  const slug = file.replace(/\.html$/, '');

  for (const variant of VARIANTS) {
    const shot = `${slug}--${variant.name}.png`;

    test(`${slug} @ ${variant.name}`, async ({ page }) => {
      // The theme is read from localStorage by an inline script in base.html
      // before first paint, so seeding it here avoids photographing a flash of
      // the other scheme. --md-source is cleared for the same reason: a stored
      // seed would re-theme every token.
      await page.addInitScript((theme) => {
        localStorage.setItem('theme', theme);
        localStorage.removeItem('md-source');
      }, variant.theme);

      // A full-page screenshot resizes the viewport to reach beyond it, and
      // Carousel legitimately reacts: it observes its element with a
      // ResizeObserver and recomputes item offsets on a throttled window
      // resize. Whether that recompute lands before or after the pixel
      // readback is a race, and it is the one that failed `carousel @
      // expanded` in CI on a tree with no source change.
      //
      // The state worth photographing is the settled one; the mid-capture
      // resize is the tool perturbing the page, not the framework misbehaving.
      // So record every observer and resize listener as they are registered,
      // and cut them loose once the page has settled -- generic, so a
      // component that starts observing tomorrow is covered without a change
      // here.
      await page.addInitScript(() => {
        const observers = [];
        const Native = window.ResizeObserver;
        if (Native) {
          window.ResizeObserver = class extends Native {
            constructor(callback) {
              super(callback);
              observers.push(this);
            }
          };
        }

        const listeners = [];
        const add = window.addEventListener.bind(window);
        window.addEventListener = (type, fn, options) => {
          if (type === 'resize') listeners.push([fn, options]);
          return add(type, fn, options);
        };

        window.__visualFreezeLayout = () => {
          observers.forEach((o) => o.disconnect());
          listeners.forEach(([fn, options]) => window.removeEventListener('resize', fn, options));
        };
      });

      // highlight.js comes from cdnjs and rewrites every code block after
      // load. code-blocks.js already guards on `window.hljs`, so blocking it
      // leaves the samples unhighlighted and identical on both sides -- far
      // better than a page-sized diff whenever the CDN is slow. Google Fonts
      // is deliberately *not* blocked: icon sizing is exactly the kind of
      // regression this suite exists to catch, and both passes run minutes
      // apart against the same font files.
      await page.route('**/cdnjs.cloudflare.com/**', (r) => r.abort());

      // The 51 demo images come from picsum.photos, and their *arrival* is
      // what broke the first CI run: an image that lands between two
      // stabilisation captures changes the page height, and toHaveScreenshot
      // reported 1440x8729 against 1440x8786 on the parallax and carousel
      // pages. Serving a stand-in of exactly the requested size removes the
      // network from the loop entirely -- these tests are about this
      // framework's CSS, not about a photograph. The size is the last two path
      // segments (/id/1015/800/400).
      await page.route('**picsum.photos/**', (route) => {
        const [, w = '800', h = '600'] = route.request().url().match(/(\d+)\/(\d+)\/?$/) ?? [];
        route.fulfill({
          status: 200,
          contentType: 'image/svg+xml',
          body:
            `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" ` +
            `viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#8a8f98"/>` +
            `<path d="M0 0 L${w} ${h}M${w} 0 L0 ${h}" stroke="#71767e" stroke-width="2"/></svg>`,
        });
      });

      // media-css.html embeds a live YouTube iframe and an MDN video. Neither
      // is this framework's output, both are a network round trip, and a
      // player that renders its poster frame a moment later is one more thing
      // that has to settle before the shutter.
      await page.route('**://www.youtube.com/**', (r) => r.abort());
      await page.route('**://interactive-examples.mdn.mozilla.net/**', (r) => r.abort());

      // The time and date pickers open on *now*, so the minute digit ticked
      // over between the two passes and four timepicker shots failed on a tree
      // with no source change at all.
      //
      // install(), not setFixedTime(). Freezing Date outright looks like the
      // smaller hammer and is the wrong one here: Carousel._autoScroll eases
      // by `amplitude * exp(-elapsed / duration)` where elapsed is a Date.now()
      // delta, so with Date frozen elapsed is always 0, the easing never
      // decays below its threshold, and the carousel never reaches its target.
      // A fake clock that *advances on command* gives both halves: the pickers
      // read one fixed instant at init, and runFor below carries every finite
      // animation to its end deterministically rather than photographing it
      // mid-flight.
      await page.clock.install({ time: FIXED_NOW });

      await page.setViewportSize({ width: variant.width, height: variant.height });

      const response = await page.goto(`/${file}`, { waitUntil: 'load' });
      if (MODE === 'base' && response?.status() === 404) {
        test.skip(true, 'page does not exist on the base revision');
      }
      expect(response?.status(), `GET /${file}`).toBe(200);

      // Icons are a variable font served from Google. Until it is in, every
      // ligature is laid out as text and every icon-adjacent box is the wrong
      // size.
      await page.evaluate(() => document.fonts.ready);

      // `load` covers images the parser found, but not one a component adds,
      // and a half-decoded image is laid out at a different height than a
      // finished one.
      await page.waitForFunction(
        () => Array.from(document.images).every((i) => i.complete),
        null,
        { timeout: 15_000 },
      );

      // Run the fake clock forward far enough for every easing loop to land on
      // its target and every init timeout to have fired. Deterministic by
      // construction: the same number of milliseconds elapses on both passes
      // regardless of how fast the machine is.
      await page.clock.runFor(3000);

      // Components schedule timers (`slideshow` an interval, eight others
      // `setTimeout`s) and Playwright's
      // `animations: 'disabled'` only reaches CSS. Freezing transitions stops
      // a component that is mid-transition when the shutter opens from
      // photographing a half-applied state.
      await page.addStyleTag({
        content: `*, *::before, *::after {
          transition-duration: 0s !important;
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-delay: 0s !important;
        }`,
      });

      // The docs chrome is not the framework, and it moves for reasons this
      // suite cannot sanction: macros/nav.html renders the sidenav *and* the
      // footer from NAV, so documenting one component relinks all 57 pages.
      //
      // Hiding the footer, not masking it, is the whole fix. A mask paints over
      // pixels and leaves the image the same size; the failure was a *dimension*
      // mismatch - 388x7118 against 388x7166, one footer link row taller.
      // Painting that row pink leaves the page 48px taller and still failing.
      // Hidden in both passes, page height stops depending on how many pages
      // are documented.
      //
      // The sidenav is masked instead. Its box is viewport-height either way so
      // it costs no height, and `display: none` on a fixed drawer risks
      // reflowing the content beside it.
      //
      // Both selectors must match the *base* revision too, which is why neither
      // is a hook added to a template. This spec is the head's, but the base
      // pass serves the base worktree's docs/app.py - a new id would exist on
      // one side only, and the footer would be hidden in one pass and not the
      // other. `body > footer` is the chrome's own shape on any revision: it is
      // a sibling of <main>, while the four demo footers on the Footer page sit
      // inside it. #nav-mobile likewise already exists. Component coverage is
      // untouched: the Sidenav page demos ~30 drawers in its body and none of
      // them is #nav-mobile.
      await page.addStyleTag({ content: 'body > footer { display: none !important; }' });

      // A page this branch adds has no baseline, and photographing it against
      // one that does not exist is not a regression. Only the *comparison* is
      // skipped, and only here at the end: skipping before the navigation
      // above would mean a new page never gets requested at all, so a route
      // that 404s or a component that throws on init would sail through this
      // job green.
      if (MODE === 'head' && !existsSync(new URL(`visual/__shots__/${shot}`, root))) {
        test.skip(true, 'no baseline: page is new on this revision');
      }

      // Last thing before the shutter: everything above has settled, so stop
      // the page reacting to the capture's own viewport change.
      await page.evaluate(() => window.__visualFreezeLayout?.());

      // The base pass has to stabilise by hand, and this asymmetry is subtle
      // enough to be worth spelling out. toHaveScreenshot re-captures until
      // two consecutive frames agree -- but only when it has something to
      // compare against. Writing a *missing* snapshot under
      // --update-snapshots is a single shot with no loop, so the baseline
      // could be an unsettled frame while the head pass, which does loop, is
      // settled. That produced a stable-but-wrong diff on a different pair of
      // pages every run: 11,711 pixels on collections, 2,733 on range, with
      // no source change between the two revisions.
      if (MODE === 'base') {
        let previous = null;
        for (let attempt = 0; attempt < 10; attempt++) {
          const frame = await page.screenshot({
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
            mask: CHROME_MASK(page),
          });
          if (previous?.equals(frame)) break;
          previous = frame;
          await page.clock.runFor(150);
        }
      }

      await expect(page).toHaveScreenshot(shot, { fullPage: true, mask: CHROME_MASK(page) });
    });
  }
}
