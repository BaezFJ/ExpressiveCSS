# Plan: show-more text collapse

Roadmap phase: Phase 42, show-more text collapse. Branch `feature/2026-10-25-show-more` from `origin/master` at `a9bbf77ad`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order, and each ends in a state that can be committed. Budget lines go into whichever group first changes a bundle's size, because `tests/selective-builds.test.js` fails without them. The group that registers the component also adds its `semantics.json` row, AutoInit fixture and registry table entries, because the semantics roster, AutoInit and docs tests fail without them.

## 1. Probe how engines measure clamped text

Outcome: the spec records, for Chromium, Firefox and WebKit, whether `scrollHeight > clientHeight` tells cut text from text that fits under `.line-clamp-N`, so group 2 measures the way every engine agrees on.

Prerequisites: none.

- [x] Run `npm run build`. In a throwaway Playwright script against the built CSS, put `.line-clamp-2` on a paragraph that needs five lines and on one that needs one line, at `line-height: normal` and at a fractional font size such as `15.5px`. Read `scrollHeight` and `clientHeight` for each in all three engines.
- [x] Narrow and widen the container and record whether a `ResizeObserver` on the paragraph fires each time.
- [x] Load a web font after the first measurement and record whether the observer fires and whether the measurement changes once `document.fonts.ready` settles.
- [x] Set inline `-webkit-line-clamp: unset` and `line-clamp: unset` on a paragraph that also has `medium:line-clamp-2`, at a medium window width, and confirm the full text shows.
- [x] Write the results in a "Probe results" section of requirements.md. If an engine contradicts a proposal there, update the proposal before group 2. Delete the script.

Completion check: requirements.md has probe results for all three engines, and the proposals agree with them.

Covers: groundwork for R2 and R4; no V check.

## 2. The button expands and collapses the text

Outcome: in a `.show-more` started by AutoInit, activating the button shows the full text and sets `aria-expanded="true"`, and activating it again clamps the text.

Prerequisites: group 1.

- [x] Write the toggle half of V1 in a new `tests/show-more-browser.test.js`. Run `npm run build` and the file, and confirm it fails.
- [x] Add `src/ts/components/showMore.ts`, and its types export in `modular.ts`, with `aria-expanded`, `aria-controls`, the generated id, the inline unclamp, and the `onOpen` and `onClose` options with the `expressive:open` and `expressive:close` events. Export it from `components/index.ts` and register it in `components/registry.ts` with the `.show-more` selector.
- [x] Add the `show-more` row and its rule to `semantics.json`, the `tests/fixtures.js` entry and the `AUTO_INIT_FIXTURES.length` count in `tests/autoinit.test.js`, and write V6 in `tests/semantics.test.js`. Run `npm run build:semantics`.
- [x] Add `ShowMore` to both registry tables in `llm.md`, to `docs/src/pages/auto-init.astro`, and to the events tables in both, then run `npm run build:skill`.
- [x] Rebuild and rerun until the toggle half of V1 passes in all three engines. Add the reviewed JavaScript budget line.

Completion check: the toggle half of V1 passes in Chromium, Firefox and WebKit, and V6 and V7 pass.

Covers: R1, R2, R5, R7, R9; V1, V6, V7.

## 3. Fit check, label and teardown

Outcome: the button hides when the text fits and comes back when the text is cut, reads "Show less" while expanded, and `destroy()` leaves the markup as the author wrote it.

Prerequisites: group 2.

- [x] Write V2 in `tests/show-more-browser.test.js`, and V3, V4 and V5 in a new `tests/show-more.test.js`. Record which fail.
- [x] Add the fit check with a `ResizeObserver` on the text element and a recheck after `document.fonts.ready`, setting and clearing `hidden` on the button. Skip the check while expanded.
- [x] Swap the button's last non-empty text node to `data-show-less` or `i18n.showLess` on expand, and restore it on collapse.
- [x] Make `destroy()` restore the recorded attributes, label and clamp, remove a generated id, and disconnect the observer.
- [x] Keep each new function below cyclomatic complexity 5. Rebuild and rerun until V1 to V5 pass. Update the budget line.

Completion check: V1 and V2 pass in Chromium, Firefox and WebKit, and V3 to V5 pass.

Covers: R3, R4, R5, R6, R9; V1 to V5, V7.

## 4. Docs, generated files and checks

Outcome: the component is documented, the generated files are current, and CI can pass.

Prerequisites: group 3.

- [x] Add a "Show more" section to `llm.md` and a docs page with a live example, added to the docs catalogue. Cover the markup, `data-show-less` and `i18n.showLess`, the window-size prefix case, the find-in-page limit and the clamp-on-a-child rule.
- [x] Add the component to `docs/src/data/component-decisions.json` with its capability entry, and re-pin `sourceRevision`. No `master` commit holds `showMore.ts` yet, so the pin was the group 3 commit `19375f1c6`, then the merge commit `42770bd16` once `master` added two more components; re-pin it to the squash merge commit in a follow-up, as pull-to-refresh did.
- [x] Add an entry to `skills/expressivecss/expressivecss-design/references/web-extensions-review.md` and an Added entry to the Unreleased section of `CHANGELOG.md`.
- [x] Update the hardcoded guide counts in `tests/expressivecss-skill.test.js`, `tests/expressivecss-version-resolution.test.js` and `tests/expressivecss-component-decisions.test.js`, and the reading budget if it grows.
- [x] Run `npm run build` and confirm the budget lines, then run `npm run build:skill` as the last generation step and `npm run check:generated`.
- [x] Record each result in validation.md.

Completion check: V7 and V8 pass, V9 runs on the pull request, and every check in validation.md shows a result.

Covers: R8, R9; V7, V8, V9.

## 5. Code review fixes

Outcome: every guard in `showMore.ts` has a test that fails without it.

Prerequisites: group 4.

- [x] Add a fractional line-height fixture and a focused-resize step to V2, and V10 for a held-back web font and an instance destroyed before it loads.
- [x] Restore the closed state in `destroy()` only when the text is open, remove the empty `style` attribute, and read `fonts` from the element's document.
- [x] Correct the focus-check comment and spec note, and document icon-only buttons.
- [x] Rerun the mutations: the 1px allowance (Firefox), the focus check, the font recheck, the destroyed-instance check, the relabel and the empty style each fail a test.

Completion check: V1 to V10 pass, and each mutation fails at least one test.

Covers: R2, R3, R4, R6, R8; V2, V5, V10.
