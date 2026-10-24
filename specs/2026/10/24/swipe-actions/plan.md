# Plan: swipe actions on list rows

Roadmap phase: Phase 37, swipe actions on list rows. Branch `feature/2026-10-24-swipe-actions` from `origin/master` at `935145a31`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order, and each ends in a state that can be committed. All three were implemented on 2026-10-24, one commit each: `de14a41ac`, `d1b9c1c65` and the group 3 commit. Group 1 wrote the whole component, toggle and keyboard path included, because the fallow gate and V1's keyboard steps needed them; group 2 then added V2 to V8, which found the `destroy()` mid-swipe bug. Writing the docs demo in group 3 found that an action removing its row left a stale open row, which group 3 fixed with a new V4 assertion. Budget lines go into whichever group first changes a bundle's size, because `tests/selective-builds.test.js` fails without them. A registered component also needs its `semantics.json` coverage and AutoInit fixture in the first group, because the semantics roster and AutoInit tests fail without them.

## 1. A swipe reveals a row's actions

Outcome: a touch swipe toward the inline start on a `.list.swipeable` row opens it past half the actions' width and closes it short of that.

Prerequisites: none.

- [x] Write V1 in a new `tests/swipe-actions-browser.test.js`, with CDP touch input in Chromium and dispatched touch events in Firefox and WebKit, as `tests/pull-to-refresh-browser.test.js` does. Run `npm run build` and the file, and confirm V1 fails.
- [x] Add `src/ts/components/swipeActions.ts` with the touch handler, the open and close state, `open(row)`, `close()` and `onToggle`. Export it from `components/index.ts` and register it in `components/registry.ts`.
- [x] Add `src/sass/components/_swipe-actions.scss` with the actions' position, the row clip, `--swipe-offset` and the open transition, and forward it if it is a new file.
- [x] Add the `swipe-actions` row and its rule to `semantics.json`, the `tests/fixtures.js` entry and the `AUTO_INIT_FIXTURES.length` count in `tests/autoinit.test.js`. Run `npm run build:semantics`.
- [x] Add `SwipeActions` to both registry tables in `llm.md` and to `docs/src/pages/auto-init.astro`, and run `npm run build:skill`.
- [x] Rebuild and rerun until V1's swipe half passes in all three engines. Add the reviewed JavaScript and CSS budget lines.

Completion check: V1's swipe steps pass in Chromium, Firefox and WebKit, and `node --test tests/selective-builds.test.js tests/autoinit.test.js` passes.

Covers: R1, R4, R15; V1, V9.

## 2. Toggle, keyboard path and edge cases

Outcome: people who don't swipe reach the actions, and the row behaves as the requirements say in the edge cases.

Prerequisites: group 1.

- [x] Add the V2 to V8 cases and record which fail.
- [x] Handle `[data-swipe-toggle]` and its `aria-expanded` and `aria-controls`, opening on focus, Escape, outside taps and focus, closing after an action, and one open row per list.
- [x] Handle the slide cap, a closing swipe on an open row, vertical-first gestures, mouse drags, a second finger, `touchcancel`, right-to-left pages and reduced motion.
- [x] Make `destroy()` close any open row silently and clear what the component set.
- [x] Rebuild and rerun until V1, including its keyboard steps, passes in all three engines. Run V2 to V8 and record the results. Update the budget lines.

Completion check: V1 passes in Chromium, Firefox and WebKit.

Covers: R2, R3, R5, R6, R7, R8, R9, R10, R11, R12, R13, R15; V1 to V8.

## 3. Docs, generated files and checks

Outcome: the component is documented, the pin and generated files are current, and CI can pass.

Prerequisites: group 2.

- [x] Add a "Swipe actions" section after Pull-to-refresh in `llm.md`, the `expressive:swipetoggle` rows in the events tables of `llm.md` and `auto-init.astro`, the types export in `modular.ts`, and a docs page with a live example, added to the docs catalogue.
- [x] Add the component to `docs/src/data/component-decisions.json` with its capability entry, and re-pin `sourceRevision` to a commit on `master`.
- [x] Add an entry to `skills/expressivecss/expressivecss-design/references/web-extensions-review.md`, and an Added entry to the Unreleased section of `CHANGELOG.md`.
- [x] Update the hardcoded guide counts in `tests/expressivecss-skill.test.js`, `tests/expressivecss-version-resolution.test.js` and `tests/expressivecss-component-decisions.test.js`, and the reading budget if it grows.
- [x] Run `npm run build`, confirm the budget lines, then run `npm run build:skill` as the last generation step and `npm run check:generated`.
- [x] Record each result in validation.md.

Completion check: `npm run check:generated` is clean, V9 and V10 pass, and every check in validation.md shows a result.

Covers: R14, R15; V9, V10.
