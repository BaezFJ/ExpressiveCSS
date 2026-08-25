// Visual regression over the documentation site.
//
// There are no committed baselines. Every run captures the *base* revision
// into visual/__shots__/ and then compares the working tree against it, which
// is why `visual/run.mjs` drives two passes rather than this config being run
// directly. The reasons are in that file's header.
//
// The server is the Flask docs app, not the frozen website/: website/ uses
// root-absolute URLs (/dist/..., /static/...) that only resolve inside the
// _site tree pages.yml assembles, and the app renders the same templates the
// freeze does.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.VISUAL_PORT ?? 5111);

// Absolute, always. The base pass points Flask at a git worktree while `uv`
// still runs out of the main checkout, where .venv and uv.lock live -- and
// Playwright spawns webServer with its cwd at *this* directory, so a relative
// default resolves to visual/docs/app.py and flask exits 2.
const appPath =
  process.env.VISUAL_APP ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'docs/app.py');

export default defineConfig({
  testDir: '.',
  outputDir: 'results',

  // One directory for both passes: the base pass writes it, the head pass
  // reads it. Flat, because the variant is already in the file name.
  snapshotPathTemplate: '{testDir}/__shots__/{arg}{ext}',

  // A visual diff is a report to read, not a line in a log.
  reporter: process.env.CI
    ? [['html', { outputFolder: 'report', open: 'never' }], ['line']]
    : [['html', { outputFolder: 'report', open: 'never' }], ['list']],

  // Screenshots are deterministic or they are broken; a retry that passes is
  // hiding flake rather than fixing it.
  retries: 0,
  workers: process.env.CI ? 4 : undefined,
  fullyParallel: true,
  timeout: 60_000,

  use: {
    baseURL: `http://127.0.0.1:${port}`,
    ...devices['Desktop Chrome'],
    // The docs are built against the last five Chrome and Firefox versions;
    // Chromium alone catches the regressions this is for (sizing, spacing,
    // token values), and doubling the matrix doubles the wall clock.
    reducedMotion: 'reduce',
    // The pickers render local time. Pinning the zone keeps a developer's run
    // and CI's comparable, and stops a machine on a half-hour offset from
    // rendering a different clock face.
    timezoneId: 'UTC',
    locale: 'en-US',
    trace: 'off',
    video: 'off',
  },

  expect: {
    toHaveScreenshot: {
      // An absolute count, deliberately not a ratio. These are full-page
      // screenshots and the docs pages are long: 0.001 of a 1440x9000 page is
      // 12,960 pixels, which swallowed a 20px -> 4px corner radius across
      // every button on the buttons page when this was first written. Real
      // changes are small in absolute terms and the pages they sit on are
      // enormous, so a ratio scales the tolerance with exactly the wrong
      // thing. 100 leaves room for antialiasing on a font that arrived a
      // moment later, and nothing else.
      maxDiffPixels: 100,
      // toHaveScreenshot re-captures until two consecutive frames agree. The
      // default budget is enough on a developer's machine and was not on a CI
      // runner, where the staggered FAB open animation had not finished
      // settling. Finite motion needs room to end; infinite motion is a bug in
      // the fixture and more time will not save it.
      timeout: 15_000,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },

  webServer: {
    command: `uv run flask --app "${appPath}" run --port ${port}`,
    url: `http://127.0.0.1:${port}/getting-started.html`,
    reuseExistingServer: false,
    // Werkzeug writes an access line per request to stderr -- roughly 1,400
    // lines a pass, which buries the results. The spec asserts on the response
    // status instead, so a 500 fails the page that caused it, by name.
    stdout: 'ignore',
    stderr: 'ignore',
    timeout: 60_000,
  },
});
