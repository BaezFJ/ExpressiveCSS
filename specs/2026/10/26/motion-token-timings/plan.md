# Motion token timing plan

Date: 2026-10-26
Roadmap phase: [Phase 57, read motion tokens for hardcoded transition timings](../../../../roadmap.md#phase-57-read-motion-tokens-for-hardcoded-transition-timings)
Branch: `fix/motion-token-timings`
Base: local `origin/master` at `a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20`
Requirements: [requirements.md](requirements.md). Validation: [validation.md](validation.md).

All implementation tasks remain unchecked. Each group has one bounded outcome.

## 1. Establish failing timing regressions

Prerequisites: the base source, installed contributor dependencies and Chromium, Firefox and WebKit. Use the documented container workflow if the host lacks browsers. Build before running tests.

- [x] Add a focused browser test file, proposed as `tests/motion-token-timings-browser.test.js`, using `tests/browser.js`, the built CSS and IIFE, and small Timepicker and expanding-card fixtures based on the existing component browser tests.
- [x] Assert the default canvas duration and expanded-content delay. Override `short3` and `short4` on the page, then override the card's content delay on its article, including `0ms`. Check the relevant transition properties separately so CSS list serialization does not hide either content transition.
- [x] Cover reduced motion with nonzero system and component overrides. Trigger the opacity and expanded-content state changes, assert their final states, and inspect active animations. Exercise both initial reduced motion and a preference change while an effect is active.
- [x] Add small compiled-CSS assertions to the existing expanding-card and reduced-motion tests where needed to cover property wiring and local resets. Keep semantic markup checks static.
- [x] Run the focused checks against the base build. Record failures for the literal duration, literal delay and missing component-property wiring. Existing reduced-motion assertions should pass. Always destroy initialized components and close browser resources in `finally` blocks.

Completion check: V1 to V3 expose the missing token behavior in all three engines; V4 establishes the existing reduced-motion behavior. Record the failures before changing Sass.

Covers R1 to R4. Validation V1 to V5.

## 2. Connect the shared Sass timings

Prerequisites: group 1's failing regression evidence.

- [x] In `src/sass/components/_timepicker.scss`, replace the canvas opacity transition's `175ms` with `var(--md-sys-motion-duration-short3)`.
- [x] In `src/sass/components/_expanding-card.scss`, declare `--md-comp-expanding-card-content-delay: var(--md-sys-motion-duration-short4)` on `article.expanding-card`, beside the existing motion properties. Replace the expanded content's `180ms` delay with `var(--md-comp-expanding-card-content-delay)`.
- [x] Preserve the local reduced-motion rules, selectors and all other transitions. Make no TypeScript changes.
- [x] Rebuild and rerun the focused timing checks and existing component/reduced-motion regressions sequentially. Confirm the new tests now pass in Chromium, Firefox and WebKit without skips.

Completion check: the canvas defaults to 150ms and content delay to 200ms; each responds to its confirmed overrides, and both stop animating under reduced motion. R4's unrelated behavior remains intact.

Covers R1 to R4. Validation V1 to V6.

## 3. Document and verify the change

Prerequisites: group 2 passes.

- [ ] Update `docs/src/pages/timepicker.astro`, the expanding-card section of `docs/src/pages/cards.astro`, and their `llm.md` reference sections. Explain the system-token controls, the new card property, defaults and reduced motion. State that Timepicker's `duration` option and timers remain separate. Add an Unreleased changelog entry for both default changes.
- [ ] Measure CSS gzip and add the reviewed budget line in `tests/selective-builds.test.js`. Regenerate with `npm run build:skill`, and use `npm run build:semantics` only if canonical semantics change. Review affected provenance and regenerate again after final fingerprinted edits.
- [ ] Run generated-data, full contributor, explicit browser, MCP and package checks from V8 sequentially. Record actual outcomes, skips and any isolated reruns in `validation.md`.
- [ ] Run the repository's visual comparison, inspect the target effects with default and custom timings, and obtain BaezFJ's review of intended visual changes before merge. Record the review and report paths.
- [ ] Confirm only the agreed changes ship, every requirement has passing evidence, required CI and reviews are satisfied, and the roadmap completion state remains unchanged by this specification.

Completion check: V7 to V9 have recorded passing results and the merge conditions in `validation.md` are satisfied. Skipped browser engines and a pending visual review leave the associated conditions incomplete.

Covers R5 and regressions for R1 to R4. Validation V6 to V9.
