# Data table column visibility

Date: 2026-10-23
Roadmap phase: Phase 33, data table column visibility
Branch: `feature/2026-10-23-data-table-column-visibility`
Base: `origin/master` at `d501bacf0`, fetched 2026-10-23
Status: specified; not implemented

Follow the [mission's agreed scope for components](../../../../mission.md#agreed-scope) and its [product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 33](../../../../roadmap.md#phase-33-data-table-column-visibility). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

Phases 25 to 32 merged on 2026-10-23 as #406 to #411, #413 and #414, although the roadmap does not yet mark them complete. Phase 33 is the first unfinished phase. It depends on phase 11, menu checkbox items, which was completed on 2026-10-21.

## Current behavior

These facts come from the base commit.

- `src/ts/behaviors/dataTables.ts` is a document-delegated behavior. It handles select-all, `data-sort` sorting and column resizing, and fires `expressive:change`, `expressive:sort` and `expressive:resize` from the `.data-table` wrapper through `Utils.emit`, which bubbles. `headerColumns()` maps each header cell to its column, counting `colspan` and `rowspan`, and `cellAt()` finds a body row's cell for a column, counting `colspan` only.
- Nothing in the framework hides a column. A page that wants it has to find and hide every cell itself.
- Menu (`src/ts/components/menu.ts`) toggles `aria-checked` on a `li[role="menuitemcheckbox"]` on click, Enter or Space, keeps the menu open on click and Space, and fires `expressive:change` from the trigger with `{ item, checked }`.
- Column resize puts the table under `table-layout: fixed` on the first resize. `freeze()` writes each first-row cell's measured width to its inline style, and `fit()` sets the table's width to the sum of those inline widths. Neither skips a hidden cell, so a hidden first-row cell would count as 0px when frozen, or keep its old width in the sum.
- `.sticky-column` pins each row's `:first-child`, and also its `:nth-child(2)` when the first cell holds only a checkbox. A hidden cell still matches those selectors, so hiding a pinned column would leave the next column unpinned.
- A `tr.data-table-detail` holds one cell that spans the table.

## Scope

People can hide and show data table columns from a menu of checkbox items, and the framework keeps each column's header and cells in step. The feature is opt-in through an attribute on the menu items. The framework owns the hidden state, which the menu item's `aria-checked` records, so a page needs no script to wire the menu.

### Expected behavior

- **R1.** A `li[role="menuitemcheckbox"]` with `data-column="<id>"`, where the id names a header cell in the first header row of a `.data-table`, controls that cell's column. When Menu unchecks the item, the column hides; when Menu checks it, the column shows again.
- **R2.** Hiding a column hides its header cell and the cell of that column in every row of the table's `thead`, `tbody` and `tfoot`, counting `colspan`. A cell that spans several columns, such as a detail row's cell, stays visible. Hidden cells are not rendered and are not in the accessibility tree. Showing the column undoes exactly what hiding did.
- **R3.** When the page loads, each linked item whose `aria-checked` is not `"true"` starts its column hidden. `DataTables.sync(wrapper)` applies the linked items again for a table or menu rendered after the page loaded.
- **R4.** An item whose `data-column` names no element, names an element that is not a first-row header cell of a `.data-table`, or names a header cell spanning several columns toggles as a plain checkbox item, and no table changes. Nothing throws.
- **R5.** A table that no linked item names renders and behaves exactly as on the base commit.
- **R6.** With a column hidden, a `data-sort` header still sorts by its own column. Hidden cells move with their rows, so showing the column again shows each cell in its own row.
- **R7.** After a column resize, hiding or showing a column leaves the other columns' widths unchanged, and the table's width is the sum of its visible columns. A column shown again returns at the width it had when it was hidden. A column that was hidden before the first resize returns no narrower than `--md-comp-data-table-column-min-width`.
- **R8.** Under `.sticky-column`, hiding any column other than the pinned ones keeps the pinned cells at the wrapper's inline-start edge. The docs tell authors to leave the pinned columns, the row header and a checkbox column out of the menu.
- **R9.** A detail row still shows and spans the visible columns when its row is expanded, with a column hidden.
- **R10.** The framework fires no new event. The page saves the state from the menu's `expressive:change`, which carries `{ item, checked }`, and restores it by rendering each item's `aria-checked`, which R3 applies.
- **R11.** `llm.md` and the data table docs page document the `data-column` link, the load-time state, `sync`, how a page saves and restores the state, and the columns to leave out. The changelog's Unreleased section lists the addition, and `npm run build:skill` regenerates the derived files.
- **R12.** The JavaScript gzip budget in `tests/selective-builds.test.js` has a reviewed line for this change, and a CSS line if the stylesheet changes.

### Exclusions

- No new menu or component. The author writes the menu with the existing Menu markup, including its trigger, which can sit in a `.data-table-actions` bar.
- No script API to hide a column. Script changes `aria-checked` on an item and calls `DataTables.sync(wrapper)`.
- No framework storage of the hidden state across reloads.
- No hiding of a header cell that spans several columns, or of a cell in a later row of a grouped header that does not start the column. Body cells with `rowspan` are not handled.
- No guard that stops an author linking a pinned or row header column. The docs cover it.
- No new rule in `semantics.json`.
- No manual visual or screen reader check. The user left both out of the merge conditions.

## Decisions

### Confirmed with the user on 2026-10-23

- The framework owns the hidden state through a link from each menu checkbox item to the header cell it controls. The user chose this over a script-only API (`DataTables.setHidden`) and over shipping both.
- The plan has three groups: hiding and showing with the menu link, then the interplay with sort, resize, sticky column and detail rows, then docs and repository checks.
- The roadmap's browser check and the interplay regressions must pass before merge. The jsdom edge cases, docs and budget checks run and record results, and the repository's required CI checks block merge as usual.

### Proposals for implementation

These are open to change in review.

- Attribute: `data-column` holds a header cell's `id`. An id survives reordering and grouped headers, and `headerColumns()` turns the cell into a column index. Look the id up in the item's root node, so a menu in the same shadow root as its table works.
- Hiding: set the `hidden` attribute on each cell, which removes it from layout and the accessibility tree without new CSS. Mark the cells the framework hid, for example with `data-column-hidden`, so showing a column never unhides a cell the author hid.
- Listener: one document listener for `expressive:change` in `DataTables.Init()`, acting only when `detail.item` matches `[role="menuitemcheckbox"][data-column]`. The data table's own `expressive:change`, whose detail has `selected`, passes through untouched.
- Load-time state: extend the existing `Utils.onDocumentReady` pass and `sync()` to apply the linked items whose ids are headers of that wrapper.
- Resize: make `freeze()` skip hidden first-row cells and `fit()` sum only visible ones. A shown cell keeps its inline width from before it hid. A cell with no inline width under the fixed layout gets its content width, no narrower than the minimum token, through `setWidth`.
- Every new function stays below cyclomatic complexity 5 for the fallow pre-commit gate.

## Technical constraints

- TypeScript follows `src/ts/README.md`, and stylesheet work, if any, follows `src/sass/README.md`. `behaviors/` imports from `core/`, never the reverse.
- Tests run against built bundles: `npm run build` before browser tests, one browser suite at a time.
- Run `npm run build:skill` after the last edit to `llm.md`, `CHANGELOG.md` or tests, because the contract hash covers them.

## Dependencies

- Phase 11, menu checkbox items: completed 2026-10-21. Menu must be initialized for the items to toggle.
- Phase 31, sticky first column, and phase 32, column resize: merged, so R7 and R8 can be tested.
