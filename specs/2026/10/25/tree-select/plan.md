# Plan: tree select

Roadmap phase: Phase 47, tree select. Branch `feature/2026-10-25-tree-select` from `origin/master` at `a9bbf77ad`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order, and each ends in a state that can be committed. Budget lines go into whichever group first changes a bundle's size, because `tests/selective-builds.test.js` fails without them. A registered component also needs its `semantics.json` row and AutoInit fixture in the first group, because the semantics roster and AutoInit tests fail without them.

## 1. Tree popup and the roadmap's completion check

Outcome: a browser test opens a `select[data-tree]`, expands a branch with ArrowRight, chooses a leaf, and finds its value in the form data.

Prerequisites: none.

- [x] Write V1 in a new `tests/tree-select-browser.test.js`, with real keyboard input in Chromium, Firefox and WebKit. Run `npm run build` and the file, and confirm V1 fails.
- [x] Add a standalone exported helper that turns a select's options into a node tree under R2, with no DOM row building, and write V2 for it in a new `tests/tree-select.test.js` (jsdom).
- [x] Add `src/ts/components/treeSelect.ts` with `TreeSelect extends FormSelect`: build `role="tree"` rows from the helper's nodes, set `aria-haspopup="tree"`, disable branch options as R6 describes, and handle ArrowDown, ArrowUp, ArrowRight, Enter and Space on the rows before Menu sees them. Replace FormSelect's `onOpenEnd` focus code so opening expands the chosen leaf's ancestors and focuses it.
- [x] Make FormSelect's constructor skip `select[data-tree]` when it is not constructing a TreeSelect (R9). Export TreeSelect from `components/index.ts` and its types from `modular.ts`, register it in `components/registry.ts` on `select[data-tree]`, and change FormSelect's selector to `select:not([data-tree])`.
- [x] Add the `tree-select` row and its rules to `semantics.json`, the `tests/fixtures.js` entry and the `AUTO_INIT_FIXTURES.length` count in `tests/autoinit.test.js`, and write V8 in `tests/semantics.test.js`. Run `npm run build:semantics`.
- [x] Add `TreeSelect` to both registry tables in `llm.md` and to `docs/src/pages/auto-init.astro`, and run `npm run build:skill`.
- [x] Rebuild and rerun until V1 and V2 pass. Add the reviewed JavaScript budget line.

Completion check: V1 passes in Chromium, Firefox and WebKit, V2 and V8 pass, and `node --test tests/selective-builds.test.js tests/autoinit.test.js` passes.

Covers: R1, R2, R3, R5, R6, R7, R9, R12, R14; V1, V2, V8, V9.

Done 2026-10-25. The code came before V1, so V1 was not seen failing first; it cannot pass without `Expressive.TreeSelect`. A minimal row layout went into this group because the popup was unusable without one.

## 2. Full keyboard contract, edge cases and styles

Outcome: every key in R4 works in all three engines and both directions, and pointer, form, `refresh()`, `destroy()` and styles behave as the requirements say.

Prerequisites: group 1.

- [x] Add V3 to V7 and record which fail.
- [x] Handle ArrowLeft, Home, End, `*` and typeahead over visible rows through a key table and `Utils._keyIndex()`, swap the arrows under `dir="rtl"`, and leave Escape and Tab to Menu.
- [x] Make a click on a branch toggle it without closing, make a disabled leaf inert, and fire `change` only when the value changes.
- [x] Make `refresh()` keep open branches and focus, and restore the branch `disabled` attributes the component set on `refresh()` and `destroy()`.
- [x] Read `src/sass/README.md`, then add the tree select styles next to `src/sass/components/forms/_select.scss`. Share the indent, guide line and chevron with `src/sass/components/_tree.scss` through a mixin or placeholder, size row boxes in `rem()`, drop the chevron transition under reduced motion, and add forced-colors rules with a line in `tests/forced-colors.test.js`.
- [x] Rebuild and rerun until V1 to V8 pass in all three engines. Update the JavaScript budget line and add the CSS one.

Completion check: V1 to V8 pass in Chromium, Firefox and WebKit, and `node --test tests/forced-colors.test.js tests/selective-builds.test.js` passes.

Covers: R4, R5, R6, R7, R8, R10, R11, R14; V3 to V7, V9.

Done 2026-10-25, together with group 1 in one commit, after three Codex review rounds. The fixes they asked for are in the implementation notes in requirements.md.

## 3. Docs, generated files and checks

Outcome: the component is documented, the pin and generated files are current, and CI can pass.

Prerequisites: group 2.

- [ ] Add a "Tree select" section after "Select" in `llm.md`, and a note in the "Select" section that a `data-tree` select belongs to TreeSelect. Add a docs page with a live example whose branch options carry `disabled` and whose first option is a `value=""` placeholder, and add it to the docs catalogue and `docs/src/data/nav.ts`. Cover the markup, the keys, the branch rule, `refresh()` and the exclusions.
- [ ] Add the component to `docs/src/data/component-decisions.json` with its capability entry, and pin `sourceRevision` to a commit that holds the new files.
- [ ] Add an entry to `skills/expressivecss/expressivecss-design/references/web-extensions-review.md`, and an Added entry to the Unreleased section of `CHANGELOG.md`.
- [ ] Update the hardcoded guide counts in `tests/expressivecss-skill.test.js`, `tests/expressivecss-version-resolution.test.js` and `tests/expressivecss-component-decisions.test.js`, and the reading budget if it grows.
- [ ] Run `npm run build`, confirm the budget lines, then run `npm run build:skill` as the last generation step and `npm run check:generated`.
- [ ] Record each result in validation.md.

Completion check: `npm run check:generated` is clean, V9 and V10 pass, V11 runs on the pull request, and every check in validation.md shows a result.

Covers: R13, R14; V9, V10, V11.
