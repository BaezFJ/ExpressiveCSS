// Visual regression over the documentation site.
//
// There are no committed baselines. Every run captures the *base* revision
// into visual/__shots__/ and then compares the working tree against it, which
// is why `visual/run.mjs` drives two passes rather than this config being run
// directly. The reasons are in that file's header.
//
// Each pass names the generator that renders its revision. During the Astro
// migration those differ -- Flask serves the base, Astro's built _site/ serves
// the head, and a page is accepted when the two are the same picture. After
// the cutover both passes are `astro` and nothing here needs changing: the
// Flask branch retires with docs/app.py, because run.mjs picks the generator
// from what the revision actually has.
//
// Neither server is the frozen website/. Nothing publishes it any more, its
// root-absolute /dist/... URLs point at a directory git ignores, and it is
// generated output -- which is also why the page list no longer comes from it.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.VISUAL_PORT ?? 5111);

// Absolute, always. A pass points its server at a git worktree while `uv` and
// node still run out of the main checkout, where .venv, uv.lock and
// node_modules live -- and Playwright spawns webServer with its cwd at *this*
// directory, so a relative default resolves to visual/docs/app.py and flask
// exits 2.
const HERE = dirname(fileURLToPath(import.meta.url));
const revision = process.env.VISUAL_ROOT ?? join(HERE, '..');

// Astro is the default: after the cutover it is the only generator left, and
// a default naming the one being retired would be the thing left to clean up.
const generator = process.env.VISUAL_GEN ?? 'astro';
const command =
  generator === 'flask'
    ? `uv run python "${join(HERE, 'serve.py')}" "${join(revision, 'docs/app.py')}" ${port}`
    : `node "${join(HERE, 'serve.mjs')}" "${join(revision, '_site')}" ${port}`;

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
    command,
    // The site root, because it is the one URL both generators publish: Flask
    // serves the landing page there and at /getting-started.html, Astro serves
    // it there and redirects the historic path to it.
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: false,
    // serve.py quiets Werkzeug's per-request access log, so stderr can stay
    // open for the failures worth seeing. Silencing it outright was the first
    // attempt and it cost real time: a server that would not start reported
    // nothing but "Exit code: 1".
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 60_000,
  },
});
