# Plan: pull-to-refresh

Roadmap phase: Phase 36, pull-to-refresh. Branch `feature/2026-10-24-pull-to-refresh` from `origin/master` at `591de9f30`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order, and each ends in a state that can be committed. Budget lines go into whichever group first changes a bundle's size, because `tests/selective-builds.test.js` fails without them. A registered component also needs its `semantics.json` row in the first group, because the semantics roster test fails without one.

## 1. Pull past the threshold, refresh and finish

Outcome: a touch pull at the top of a `.pull-to-refresh` container fires one event, shows the indicator, and hides it when the page reports the finish.

Prerequisites: none.

- [ ] Write V1 in a new `tests/pull-to-refresh-browser.test.js`, with CDP touch input in Chromium and dispatched touch events in Firefox and WebKit. Run `npm run build` and the file, and confirm V1 fails.
- [ ] Add `src/ts/components/pullToRefresh.ts` with the `threshold` and `onRefresh` options, `waitUntil()` on the event detail, and `complete()`. Export it from `components/index.ts` and register it in `components/registry.ts`.
- [ ] Add `src/sass/components/_pull-to-refresh.scss` with the indicator position, its return transition and `overscroll-behavior-y: contain`, and forward it from `src/sass/components/_index.scss`.
- [ ] Add the `pull-to-refresh` row to `semantics.json`, the `tests/fixtures.js` entry and the `AUTO_INIT_FIXTURES.length` count in `tests/autoinit.test.js`. Run `npm run build:semantics`.
- [ ] Add `PullToRefresh` to both registry tables in `llm.md` and to `docs/src/pages/auto-init.astro`, which the docs test requires of every registered component, and run `npm run build:skill`.
- [ ] Rebuild and rerun until V1 passes in all three engines. Add the reviewed JavaScript and CSS budget lines.

Completion check: V1 passes in Chromium, Firefox and WebKit, and `node --test tests/selective-builds.test.js tests/autoinit.test.js` passes.

Covers: R1, R4, R7, R12; V1, V8.

## 2. Button, short pulls, busy state, page scrolling and teardown

Outcome: the button and `refresh()` reach the same refresh, and the edge cases behave as the requirements say.

Prerequisites: group 1.

- [ ] Add the V2 to V7 cases and record which fail.
- [ ] Handle `[data-refresh]` clicks and `refresh()`, `aria-busy`, ignored repeats while busy, short pulls, `touchcancel`, scrolled-down starts and mouse drags.
- [ ] Read the page's scroll position when the element does not scroll, and add the `:root:has(.pull-to-refresh)` rule.
- [ ] Make `destroy()` undo the offset, `aria-busy` and the indicator, and end a running refresh silently.
- [ ] Rebuild and rerun the file until V1 to V7 pass. Update the budget lines.

Completion check: V1 to V7 pass in all three engines.

Covers: R2, R3, R5, R6, R8, R9, R10, R12; V2, V3, V4, V5, V6, V7.

## 3. Docs, generated files and checks

Outcome: the component is documented, the pin and generated files are current, and CI can pass.

Prerequisites: group 2.

- [ ] Add a "Pull-to-refresh" section to `llm.md` and a docs page, `docs/src/pages/pull-to-refresh.astro`, with a live example, and add the page to the docs catalogue.
- [ ] Add the component to `docs/src/data/component-decisions.json` with its capability entry, and re-pin `sourceRevision` to a commit on `master`.
- [ ] Add an entry to `skills/expressivecss/expressivecss-design/references/web-extensions-review.md`, and an Added entry to the Unreleased section of `CHANGELOG.md`.
- [ ] Update the hardcoded guide counts in `tests/expressivecss-skill.test.js`, `tests/expressivecss-version-resolution.test.js` and `tests/expressivecss-component-decisions.test.js`, and the reading budget if it grows.
- [ ] Run `npm run build`, confirm the budget lines, then run `npm run build:skill` as the last generation step and `npm run check:generated`.
- [ ] Record each result in validation.md.

Completion check: `npm run check:generated` is clean, V8 passes, and every check in validation.md shows a result.

Covers: R11, R12; V8, V9.
