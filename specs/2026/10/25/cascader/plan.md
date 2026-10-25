# Plan: cascader

Roadmap phase: Phase 48, cascader. Branch `feature/2026-10-25-cascader` from `origin/master` at `a9bbf77ad`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order, and each ends in a state that can be committed. Budget lines go into whichever group first changes a bundle's size, because `tests/selective-builds.test.js` fails without them. A registered component needs its `semantics.json` row, its AutoInit fixture and its AutoInit table entries in the first group, because the semantics roster, AutoInit and docs tests fail without them. The roster counts Sass partials, so `_cascader.scss` started in group 1 with the rule that hides the source lists.

Group 4 split into two commits: `329ae15ef` moved Chips' control to `src/ts/core/formControl.ts`, which the fallow duplicate gate required, and `a1c0e42ce` added the cascader's control on top of it.

## 1. Markup, start and semantics rules

Outcome: AutoInit starts a `Cascader` on `.cascader`, reads the nested options, sets the input's combobox attributes, and `semantics.json` checks the markup.

Prerequisites: none.

- [x] Write the start, parsing and `destroy()` parts of V2 in a new `tests/cascader.test.js` (jsdom). Run `npm run build` and the file, and confirm they fail.
- [x] Add `src/ts/components/cascader.ts`: read branches, leaves, labels and `data-selected` from `ul.cascader-options`, set the input's `readonly`, `role`, `aria-haspopup`, `aria-expanded` and `aria-controls`, expose `value`, and restore everything in `destroy()`. Export it from `components/index.ts` and the types from `modular.ts`, and register it in `components/registry.ts` with the selector `.cascader`.
- [x] Add the `cascader` row and its rules to `semantics.json`, write V3 in `tests/semantics.test.js`, and run `npm run build:semantics`.
- [x] Add the `tests/fixtures.js` entry and raise the `AUTO_INIT_FIXTURES.length` count in `tests/autoinit.test.js`.
- [x] Add `Cascader` to both AutoInit registry tables in `llm.md` and to `docs/src/pages/auto-init.astro`.
- [x] Rebuild and rerun until the V2 parts and V3 pass. Add the reviewed JavaScript budget line.

Completion check: the group's V2 cases and V3 pass, and `node --test tests/selective-builds.test.js tests/autoinit.test.js tests/docs-astro.test.js` passes.

Covers: R1, R2, R11, R15, R16, R17, R18, R21; V2, V3, V12.

## 2. Columns and pointer commit

Outcome: a click on the input opens a popover of columns, a click on a branch opens the next column, and a click on a leaf commits the path to the input.

Prerequisites: group 1.

- [x] Write the pointer parts of V1 and V7 in a new `tests/cascader-browser.test.js`, reusing the helpers in `tests/chips-form-browser.test.js`, and confirm they fail.
- [x] Build the manual popover with `role="dialog"`, one `role="listbox"` column per open level, and `role="option"` items with the branch chevron. Anchor it below the field. Check first whether Menu's positioning helpers can move to `core/` without changing Menu's tests, and record the choice in requirements.md under implementation notes.
- [x] Choose branches and leaves on click, show the joined labels in the input, fire `input` and `change` once per new path, and close on a click outside.
- [x] Add `src/sass/components/_cascader.scss` with the column layout and the hidden source list, and forward it from `components/_index.scss`.
- [x] Rebuild and rerun until the pointer parts of V7 pass in all three engines. Add the reviewed CSS budget line and update the JavaScript one.

Completion check: the pointer parts of V7 pass in Chromium, Firefox and WebKit, and `node --test tests/selective-builds.test.js` passes.

Covers: R3, R4, R5, R8, R9, R21; V7, V12.

## 3. Keyboard and ARIA state

Outcome: the cascader works from the keyboard in both directions, with correct ARIA state on the input, the popover and every column.

Prerequisites: group 2.

- [x] Write V4, V5 and V6 and record which fail.
- [x] Add the input keys (Enter, Space, ArrowDown, Alt+ArrowDown) through `Utils.ignoringComposition()`, and the column keys (arrows, Home, End, Enter, Space, Escape, Tab) through a key table, with ArrowLeft and ArrowRight swapped under `dir="rtl"`.
- [x] Keep one tab stop per column, label each column, and keep `aria-selected` and `aria-expanded` in step with the open path.
- [x] Rebuild and rerun until V4 to V7 pass in all three engines. Update the budget line.

Completion check: V4 to V7 pass in Chromium, Firefox and WebKit.

Covers: R2, R3, R4, R5, R6, R7, R8, R9; V4, V5, V6, V7.

## 4. Form control

Outcome: the form submits the committed path as one entry per level, and reset, required and disabled behave like a native field.

Prerequisites: group 3.

- [x] Write V1, V8, V9 and V10 and record which fail.
- [x] Define `expressive-cascader-control` on first use, wrap the input, move `name` and `required` to the control, mirror `disabled` and `form`, and call `setFormValue()` with one entry per level after each commit. Skip the control where `ElementInternals.setFormValue` is missing.
- [x] Restore the starting path in `formResetCallback`, without firing events, and close an open popover. Set `valueMissing` with the `i18n.required` message, and keep the popover shut while disabled.
- [x] Unwrap the control in `destroy()` and extend V2 to cover it.
- [x] Rebuild and rerun until V1 to V10 pass in all three engines. Update the budget line.

Completion check: V1 to V10 pass in Chromium, Firefox and WebKit.

Covers: R10, R11, R12, R13, R14, R16, R17, R21; V1, V2, V8, V9, V10.

## 5. Styles, docs, generated files and checks

Outcome: the cascader matches the menu's look, is documented, the generated files are current, and CI can pass.

Prerequisites: group 4.

- [x] Finish `_cascader.scss` with the menu's surface, elevation and shape tokens, list item tokens, `rem()` sizes and forced colors rules. Write V11 and rerun it.
- [x] Add a "Cascader" section after "Select" in `llm.md`, and a docs page with a live three-level example, added to the docs catalogue and `docs/src/data/nav.ts`.
- [x] Add the component to `docs/src/data/component-decisions.json` with its capability entry and `sourceRevision` pin, an entry to `skills/expressivecss/expressivecss-design/references/web-extensions-review.md`, and an Added entry to the Unreleased section of `CHANGELOG.md`.
- [x] Update the hardcoded guide counts in `tests/expressivecss-skill.test.js`, `tests/expressivecss-version-resolution.test.js` and `tests/expressivecss-component-decisions.test.js`, and the reading budget if it grows.
- [x] Run `npm run build`, confirm both budget lines, then run `npm run build:skill` as the last generation step and `npm run check:generated`.
- [x] Record each result in validation.md.

Completion check: `npm run check:generated` is clean, V11 to V13 pass, V14 runs on the pull request, and every check in validation.md shows a result.

Covers: R19, R20, R21; V11, V12, V13, V14.
