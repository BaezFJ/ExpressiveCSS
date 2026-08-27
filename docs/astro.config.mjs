// @ts-check
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';

/**
 * The Astro documentation build (ADR 0003).
 *
 * The documentation generator: `npm run docs:dev` serves it and
 * `npm run docs:build` writes `_site/` and verifies it.
 *
 * `format: 'file'` is what keeps the flat `.html` URLs the site already
 * publishes -- Astro's default would turn `/buttons.html` into `/buttons/`.
 *
 * The compiled framework and the docs' own chrome are served from their
 * established `/dist` and `/static` paths by two symlinks in `public/`, which
 * costs no build step and means `npm run watch` shows up on a browser reload.
 */
export default defineConfig({
  site: 'https://www.expressivecss.com',
  outDir: '../_site',
  build: { format: 'file' },
  // Off, because the pages are hand-authored HTML and the compressor collapses
  // the newline between a word and the <code> that follows it -- which is a
  // rendered space, not formatting. `The\n<code>min</code> means` came out as
  // `Themin means`.
  compressHTML: false,
  devToolbar: { enabled: false },
  vite: {
    // Components are bundled before they run, so `import.meta.url` inside one
    // points at the emitted chunk rather than at the source file. The repo root
    // is stamped in from here, where it is still the config file's own URL.
    define: {
      __REPO_ROOT__: JSON.stringify(fileURLToPath(new URL('../', import.meta.url))),
    },
  },
});
