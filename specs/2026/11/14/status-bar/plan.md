# Status bar: plan

Ad hoc component, no roadmap phase. Requirements: [requirements.md](requirements.md). Checks: [validation.md](validation.md). Branch `feature/2026-11-14-status-bar` from `origin/master` at `44024884b`.

Groups run in order. Build before every test run, since tests read `dist/`. Don't run two test suites at once.

## 1. Semantics row first

Covers R11. Checks V11.

Prerequisites: none.

- [x] Add the `status-bar` row to `semantics.json` with the four R11 rules and a note that names the component and its limits.
- [x] Add `tests/status-bar.test.js` with fixture markup run through the semantics rule runner: one valid bar, plus a bar with `role="status"`, one with `role="toolbar"`, `nav.status-bar` and an unnamed icon-only button. Watch it fail once before the row exists.
- [x] Run `npm run build:semantics` to regenerate `SEMANTICS.md`.

Done when the semantics tests pass with the row and the four negative fixtures are each flagged by their own rule.

## 2. Bar layout and items

Covers R1, R2, R3, R4, R7, R8, R12. Checks V1, V2, V3, V4, V7, V8, V12.

Prerequisites: group 1. The roster test fails for a partial without a row.

- [x] Create `src/sass/components/_status-bar.scss` with `@use "../abstracts" as *` and a header comment covering anatomy, item kinds, `.end`, why the bar takes no composite role or live region, and the compact-width media query choice. `@forward` it from `src/sass/components/_index.scss`.
- [x] Declare the `--md-comp-status-bar-*` tokens (height, colors, item padding, icon size), with `rem()` for every text or icon box and px for gaps and borders.
- [x] Write the root (R1), items (R2), button and link reset with state layers, focus ring and disabled state (R3), `.end` (R4) and compact-width `data-priority="low"` hiding with in-bar scrolling (R7). Scope every selector under `.status-bar` (R12).
- [x] Add `tests/status-bar-browser.test.js` for Chromium, Firefox and WebKit covering V1 to V4, V7 and V8, with each browser closed in a `finally` block. Watch V7's page-scroll assertion fail once without the overflow handling, and V3's state assertions fail once without the restated fill.
- [x] Add the static selector-scope assertion (V12) to `tests/status-bar.test.js`. Watch it fail once against a temporary unscoped `.end` rule.

Done when V1 to V4, V7, V8 and V12 pass in all three engines.

## 3. Color and modes

Covers R5, R6, R9, R10. Checks V5, V6, V9, V10.

Prerequisites: group 2.

- [x] Add `.vibrant` (R5) through the component tokens, and confirm helper-colored items keep their colors (R6).
- [x] Add the `@media (forced-colors: active)` top border on the bar (R9).
- [x] Add `transition: none` under reduced motion in the component's own rule (R10).
- [x] Extend the browser test with V5, V6, V9 (Chromium forced-colors emulation plus the static media-block check) and V10.
- [x] Confirm no new `color-mix()` uses srgb. The color-roles test rejects srgb mixes, and only the full verify runs it.

Done when V5, V6, V9 and V10 pass.

## 4. Docs and records

Covers R13, R14. Checks V13, V14, V15.

Prerequisites: groups 1 to 3.

- [x] Add `docs/src/pages/status-bar.astro` with every R13 example, live demos labelled by their section, and code samples in `html` fences.
- [x] Add the `status-bar` entry to `docs/src/data/nav.ts` after Toolbars, with `styles: ["components/status-bar"]` and a one-line description.
- [x] Add the Status bar section to `llm.md`.
- [x] Add the `status-bar` record to `docs/src/data/component-decisions.json` in catalogue order, with `"runtime": "css-only"`, `framework-extra` material guidance, alternatives `toolbars` and `page-footer`, and a `capabilityReview` that cites the partial and the browser test.
- [x] Add the hand-written Status bar entry to `skills/expressivecss/expressivecss-design/references/web-extensions-review.md`.
- [x] Update the hardcoded guide counts in `tests/expressivecss-skill.test.js` (two places and the stdout regex), `tests/expressivecss-version-resolution.test.js` and `remaining.length` in `tests/expressivecss-component-decisions.test.js`, and raise the reading budget there if it grows.
- [x] Add the Unreleased entry to `CHANGELOG.md`.

Done when V13 and V15 pass and the docs page renders every R13 example.

## 5. Budget, generation and full checks

Covers R14. Checks V14, V16.

Prerequisites: group 4.

- [ ] Commit groups 1 to 4, then pin `sourceRevision` for the new record to that branch commit, since no master commit holds the files yet. After the squash merge, a follow-up re-pins it to the merge commit.
- [x] Measure the full and selective CSS gzip size from the merge-base build, with the sourceMappingURL comment stripped, and add the reviewed budget line to `tests/selective-builds.test.js`.
- [ ] Run `npm run build:skill` last, after the final source edit, since the contract hash covers the changelog and tests.
- [ ] Run V16: `npm run verify`, `npm test --prefix mcp/expressivecss`, the MCP smoke test and `npm run verify:packages`. Rerun a known flaky test alone before debugging it.
- [ ] Record each V result in validation.md, and copy the human checks into the pull request body as a checklist.

Done when every agent-run check passes and `git status` shows only intended files.
