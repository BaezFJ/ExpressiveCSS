# Plan: deferred rendering for long lists

Roadmap phase: Phase 40, deferred rendering for long lists. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

Work on `feature/2026-10-25-deferred-rendering`. Tests run against built bundles, so run `npm run build:css` before a browser test. Run test files one at a time, since parallel browser runs flake.

## Group 1: engine probe

Prerequisites: none.

- [x] In Chromium, Firefox and WebKit through Playwright, render a 5,000-row `.list` whose rows have `content-visibility: auto` set inline. Record what `checkVisibility({ contentVisibilityAuto: true })` returns for row 4,999 and for the link inside it before and after `scrollIntoView()`.
- [x] Put `content-visibility: auto` on `<tr>` and `<tbody>` in a 5,000-row table, and record whether `checkVisibility({ contentVisibilityAuto: true })` ever returns false for an off-screen row.
- [x] Focus a link that fills a deferred row and screenshot the row's edges, to confirm the default 2px-offset ring is clipped and a `-3px` offset is not.
- [x] Write the findings into the Technical constraints section of requirements.md. If `<tr>` honors containment in all three engines, stop and ask the user whether tables come back into scope.

Completion check: requirements.md records each engine's result for the three probes, and the probe script is not committed.

Covers R1, R3 (evidence only).

## Group 2: the class

Prerequisites: group 1.

- [x] Add `src/sass/utilities/_defer-render.scss` with `.defer-render > *` setting `content-visibility: auto` and `contain-intrinsic-block-size: auto var(--defer-render-row-size, var(--md-comp-list-item-height, rem(56px)))`.
- [x] Inside `.list`, fall back to `--md-comp-list-item-height` before `rem(56px)`.
- [x] Give `:focus-visible` content inside deferred rows `outline-offset: -3px`, and check that it beats the `focus-visible` mixin's offset in `_list.scss`. It does through layer order: utilities come after components.
- [x] Forward the partial from `src/sass/utilities/_index.scss` with a one-line comment like its neighbours.
- [x] Run `npm run build:css` and confirm `dist/css/expressive.css` holds the rules.

Completion check: the built CSS contains `.defer-render>*` with both declarations, and a `custom.scss` build without the partial does not.

Covers R1, R2, R3.

## Group 3: browser tests

Prerequisites: group 2.

- [x] Add `tests/defer-render-browser.test.js`, looping over Chromium, Firefox and WebKit, with a 5,000-row `.list.defer-render` fixture inside a fixed-height scroll container.
- [x] Case for V1: the link in an off-screen row reports `checkVisibility({ contentVisibilityAuto: true })` false, then true after it scrolls into view.
- [x] Case for V2: a skipped row's block size equals `--defer-render-row-size`, and a custom value on the list changes it.
- [x] Case for V3: tab to a link that fills a deferred row and check that the outline sits inside the row box.
- [x] Case for V4: an off-screen row's text appears in the list's ARIA snapshot and is found by `window.find()` where the engine has it.
- [x] Run the file against a build without group 2 and confirm V1 to V3 fail, then against the new build and confirm all cases pass. Tear down the page in `finally` blocks.

Completion check: `node --test tests/defer-render-browser.test.js` passes in all three engines and fails against the base build.

Covers R1, R2, R3, R4.

## Group 4: docs, budget and generated files

Prerequisites: group 3.

- [ ] Document `.defer-render` and `--defer-render-row-size` on `docs/src/pages/lists.astro`, with a live long list, the table limit, the clipping and containing-block effects, and when a virtual list is still needed.
- [ ] Add the same text to the Lists section of `llm.md`.
- [ ] Add an Added entry to `CHANGELOG.md` under Unreleased.
- [ ] Rebuild, measure the CSS gzip size from the merge-base build, and add a reviewed budget line to `tests/selective-builds.test.js`.
- [ ] Run `npm run build:skill` after the last edit, since the contract hash covers the changelog and tests, then `npm run check:generated` and `npm run verify`.
- [ ] Run `npm test --prefix mcp/expressivecss` and `npm run verify:packages`.

Completion check: V5 to V7 pass.

Covers R5, R6.
