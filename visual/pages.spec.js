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

      // The time and date pickers open on *now*: the minute digit ticked over
      // between the two passes and four timepicker shots failed on a tree with
      // no source change at all. Fixing the clock rather than masking the
      // region keeps the picker itself under test. setFixedTime, not
      // install(): it pins Date without pausing timers, which components own.
      await page.clock.setFixedTime(FIXED_NOW);

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

      // Components own intervals (Snackbar, Slider, Carousel) and Playwright's
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

      // A page this branch adds has no baseline, and photographing it against
      // one that does not exist is not a regression. Only the *comparison* is
      // skipped, and only here at the end: skipping before the navigation
      // above would mean a new page never gets requested at all, so a route
      // that 404s or a component that throws on init would sail through this
      // job green.
      if (MODE === 'head' && !existsSync(new URL(`visual/__shots__/${shot}`, root))) {
        test.skip(true, 'no baseline: page is new on this revision');
      }

      await expect(page).toHaveScreenshot(shot, { fullPage: true });
    });
  }
}
