# Plan: transfer list

Roadmap phase: Phase 46, transfer list. Branch `feature/2026-10-25-transfer-list` from `origin/master` at `a9bbf77ad`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order, and each ends in a state that can be committed. Budget lines go into whichever group first changes a bundle's size, because `tests/selective-builds.test.js` fails without them. The new Sass partial needs its `semantics.json` row in the same group, because the semantics roster test fails without it.

## 1. Markup, styles, `add` and the form data

Outcome: checking two rows and pressing `add` puts both in the chosen list, and the form data holds both values in the order they were moved.

Prerequisites: none.

- [x] Write V1 in a new `tests/transfer-list-browser.test.js`, with real clicks in Chromium, Firefox and WebKit, following `tests/sortable-browser.test.js`. Run `npm run build` and the file, and confirm V1 fails.
- [x] Add `src/ts/behaviors/transferList.ts` with `TransferList.Init()`: a document `click` listener for `[data-transfer="add"]` (R2), found with `Utils.closestInPath`, and a capture `formdata` listener on the document that appends the chosen rows' values under `data-name` (R5). Start it in `src/ts/index.ts` and export it from `src/ts/modular.ts`.
- [x] Add `src/sass/components/_transfer-list.scss` and forward it from `src/sass/components/_index.scss`: side-by-side layout with logical properties, stacking below `medium`, each list scrolling inside a maximum block size, and the icon flip under `:dir(rtl)` (R11).
- [x] Add the `transfer-list` row and its three rules to `semantics.json` (R12), write V10 in `tests/semantics.test.js`, and run `npm run build:semantics`.
- [x] Write V2 and V8, then rebuild and rerun until V1, V2, V8 and V10 pass. Add the reviewed JavaScript and CSS budget lines.

Completion check: V1, V2 and V8 pass in Chromium, Firefox and WebKit, and V10 and `node --test tests/selective-builds.test.js` pass.

Covers: R1, R2, R5, R11, R12, R13, R15; V1, V2, V8, V10, V11.

## 2. Other buttons, ordering, focus, announcement, event and reset

Outcome: every button moves rows as the requirements say, and focus, the announcement, the event and form reset behave as R6 to R10 describe.

Prerequisites: group 1.

- [x] Write V3 to V7 and V9, and record which fail.
- [x] Add `remove`, `add-all` and `remove-all`, the order record at the first move and the return to the original slot (R3, R4, R10). Keep each function below cyclomatic complexity 5, with a lookup table for the four buttons.
- [x] Add the empty-press guard (R6), the live region and `TransferList.i18n.moved` (R8), and the `expressive:transfer` event (R9). Check that focus stays on the button (R7).
- [x] Add a capture `reset` listener on the document that restores the recorded rows a task after the reset event, as `currencyInput.ts` waits for the form to reset its fields (R10).
- [x] Rebuild and rerun until V1 to V10 pass. Update the budget lines.

Completion check: V1 to V9 pass, V10 and V11 pass, and a second `Init()` adds no listener (V3).

Covers: R3, R4, R6, R7, R8, R9, R10, R13, R15; V3, V4, V5, V6, V7, V9, V11.

## 3. Docs and generated checks

Outcome: authors and agents can find the transfer list, its markup and its limits, and every generated file agrees with its source.

Prerequisites: group 2.

- [ ] Add the "Transfer list" section to `llm.md` after "Lists" and its sortable and long list subsections (R14), with the markup, the four buttons, the form data, `TransferList.i18n.moved`, `expressive:transfer`, the modular `TransferList.Init()` call and the limits from the requirements' exclusions. Add `expressive:transfer` to the events tables in `llm.md` and `docs/src/pages/auto-init.astro` if they list behavior events.
- [ ] Add `docs/src/pages/transfer-list.astro` with a live example in a form and a form data readout, and add it to the docs catalogue.
- [ ] Add the component decisions entry, the changelog's Unreleased entry and the hand-written entry in `skills/expressivecss/expressivecss-design/references/web-extensions-review.md`.
- [ ] Update the hardcoded guide counts and reading budget in the skill, version-resolution and component-decisions tests, and set the capability `sourceRevision` pin.
- [ ] Run `npm run build:skill` after the last edit, then V12.
- [ ] Open the pull request and wait for V13.

Completion check: V11 and V12 pass, `npm run docs:build:astro` passes, and V13 is green on the pull request.

Covers: R14, R15; V11, V12, V13.
