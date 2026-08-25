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
      // A page this branch adds has no baseline, and photographing it against
      // one that does not exist is not a regression. The base pass skips it
      // because the old revision 404s; this is the head side of that.
      if (MODE === 'head' && !existsSync(new URL(`visual/__shots__/${shot}`, root))) {
        test.skip(true, 'no baseline: page is new on this revision');
      }

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

      await expect(page).toHaveScreenshot(shot, { fullPage: true });
    });
  }
}
