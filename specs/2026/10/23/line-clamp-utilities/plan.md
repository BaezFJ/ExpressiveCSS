# Plan: line clamp utilities

Roadmap phase: Phase 25, line clamp utilities. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

Work on `feature/2026-10-23-line-clamp-utilities`. Tests run against built bundles, so run `npm run build:css` before a browser test. Run test files one at a time.

## Group 1: clamp classes

Prerequisites: none.

- [x] Add `line-clamp-1`, `line-clamp-2`, `line-clamp-3` and `line-clamp-none` to `$_layout` in `src/sass/utilities/_helpers.scss`, with the declarations proposed in requirements.md.
- [x] Update the comment above `$_layout` so it names the clamp classes and the display conflict.
- [x] Run `npm run build:css` and confirm `dist/css/expressive.css` holds the four classes and their prefixed copies.

Completion check: the built CSS contains `.line-clamp-2` and `.expanded\:line-clamp-none` inside the Expanded media query.

Covers R1, R3, R4.

## Group 2: browser and build checks

Prerequisites: group 1.

- [x] Add a case to the engine loop in `tests/helpers-browser.test.js` that renders a long paragraph at a fixed width and `line-height` with each clamp class and with `line-clamp-none`, and compares the heights (V1).
- [x] Add the static prefix assertion in the same file (V3).
- [x] Run the file against a build without group 1 and confirm the new cases fail, then against the new build and confirm they pass.

Completion check: `node --test tests/helpers-browser.test.js` passes in Chromium, Firefox and WebKit.

Covers R1, R2, R3, R4.

## Group 3: docs, budget and generated files

Prerequisites: group 2.

- [x] Document the classes after `.truncate` in `docs/src/pages/helpers.astro`, with a live example and its code, the prefix example and the two limits from requirements.md.
- [x] Add the same text to the Formatting section of `llm.md`.
- [x] Add an Added entry to `CHANGELOG.md` under Unreleased.
- [x] Rebuild, measure the CSS gzip size and add a reviewed budget line to `tests/selective-builds.test.js`.
- [x] Run `npm run build:skill` after the last edit, since the contract hash covers the changelog and tests, then `npm run check:generated` and `npm run verify`.

Completion check: V2, V4 and V5 pass.

Covers R5, R6.
