# Plan: loading overlay

Roadmap phase: Phase 41, loading overlay. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

Work on `feature/2026-10-25-loading-overlay`. Tests run against built bundles, so build before a browser test. Run test files one at a time, since parallel browser runs flake.

## Group 1: engine probe

Prerequisites: none.

- [x] In Chromium, Firefox and WebKit through Playwright, set `inert` on a region holding a button and a text field. Record whether a click on the button fires its handler and whether Tab from a control before the region lands on a control after it.
- [x] Focus the text field, then set `inert` on the region. Record `document.activeElement` afterwards and whether `blur` or `focusout` fires.
- [x] Put an absolutely positioned `::after` with `inset: 0` on a region that scrolls itself, scroll it to the bottom, and screenshot whether the pseudo-element still covers the visible box.
- [x] In Firefox with forced colors on (see the forced-colors memory for the prefs), screenshot a translucent scrim over text with a `.loading-indicator` on top.
- [x] Write the findings into the Technical constraints section of requirements.md. If a result contradicts R2 or R5 in any engine, stop and ask the user before group 2.

Completion check: requirements.md records each engine's result for the four probes, and the probe script is not committed.

Covers R2, R3, R5, R6 (evidence only).

## Group 2: styles

Prerequisites: group 1.

- [x] Add `src/sass/components/_loading-overlay.scss` and forward it from `components/_index.scss`.
- [x] Draw the scrim and centre the `.loading-indicator` child while `[aria-busy="true"]`, hidden otherwise, with a fade on opacity. Use the surface-wash scrim colour the probe settled.
- [x] Use the technique group 1 found for regions that scroll themselves, or record the wrapper rule for the docs.
- [x] Add the forced-colors rule from group 1 and a reduced-motion `transition: none` block.
- [x] Style `.loading-overlay-status` with the `visually-hidden` mixin.
- [x] Run `npm run build:css` and confirm `dist/css/expressive.css` holds the rules.

Completion check: the built CSS contains the `.loading-overlay` rules, and a `custom.scss` build without the partial does not.

Covers R3, R6.

## Group 3: component

Prerequisites: group 2.

- [x] Add the `semantics.json` row before the script, since the roster test fails for a registered component without one.
- [x] Add `src/ts/components/loadingOverlay.ts`: a `Component` with key `Expressive_LoadingOverlay` and `i18n` defaults `{ loading: 'Loading', loaded: 'Loaded' }`.
- [x] On start, insert the `.loading-overlay-status` element after the region and observe `aria-busy` with a filtered `MutationObserver`. Apply the busy state at once if the attribute is already `"true"`.
- [x] On busy: remember the region's `inert` state and the focused element if it is inside the region, set `inert`, and write `i18n.loading` to the status.
- [x] On clear: restore `inert`, write `i18n.loaded`, and refocus the remembered element if it is still connected and focus is on `<body>`, or wherever group 1 found focus goes.
- [x] `destroy()` disconnects the observer, removes the status element and restores `inert`.
- [x] Register it in `src/ts/components/registry.ts` and export it from `src/ts/components/index.ts`. Add the `tests/fixtures.js` entry and bump `AUTO_INIT_FIXTURES.length` in `tests/autoinit.test.js`.
- [x] Keep each function below cyclomatic complexity 5.

Completion check: `npm run build` succeeds, the typecheck passes, and `node --test tests/autoinit.test.js` passes.

Covers R1, R2, R4, R5, R7.

## Group 4: tests

Prerequisites: group 3.

- [x] Add `tests/loading-overlay-browser.test.js`, looping over Chromium, Firefox and WebKit, with cases for V1 to V5 and V7. Tear down components and pages in `finally` blocks.
- [x] ~~Add `tests/loading-overlay.test.js` (jsdom) with cases for V2 and V7.~~ Dropped: jsdom has no `inert`, so V2 and V7 run in the browser file.
- [x] Add the forced-colors line to `tests/forced-colors.test.js` and the reduced-motion check for V6.
- [x] Run each new case against a build without group 3 or without the rule it covers, and confirm it fails.

Completion check: the new files pass in all three engines, and each case fails against its mutation.

Covers R1 to R7.

## Group 5: docs, budget and generated files

Prerequisites: group 4.

- [ ] Add `docs/src/pages/loading-overlay.astro` with a live region and a button that toggles it busy, the markup, `i18n`, the scrolling-region note from group 1, and the rule that the page owns `aria-busy`. Add it to the docs catalogue.
- [ ] Add a Loading overlay section to `llm.md`, and the component to both AutoInit registry tables there and in `docs/src/pages/auto-init.astro`.
- [ ] Add the hand-written entry to `skills/expressivecss/expressivecss-design/references/web-extensions-review.md`, and update the hardcoded guide counts in the skill, version-resolution and component-decisions tests.
- [ ] Add an Added entry to `CHANGELOG.md` under Unreleased.
- [ ] Rebuild, measure CSS and JavaScript gzip sizes from the merge-base build, and add reviewed budget lines to `tests/selective-builds.test.js`.
- [ ] Run `npm run build:skill` after the last edit, since the contract hash covers the changelog and tests, then `npm run check:generated` and `npm run verify`.
- [ ] Run `npm test --prefix mcp/expressivecss` and `npm run verify:packages`.

Completion check: V8 to V10 pass.

Covers R8, R9.
