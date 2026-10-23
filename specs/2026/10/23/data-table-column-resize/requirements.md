# Data table column resize

Date: 2026-10-23
Roadmap phase: Phase 32, data table column resize
Branch: `feature/2026-10-23-data-table-column-resize`
Base: `origin/master` at `ddc223f6d`
Status: implemented and locally verified 2026-10-23; CI and review pending

Follow the [mission's agreed scope for components](../../../../mission.md#agreed-scope) and its [product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 32](../../../../roadmap.md#phase-32-data-table-column-resize). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

Phases 25 to 31 merged on 2026-10-23 as #406 to #411 and #413, although the roadmap does not yet mark them complete. Phase 32 is the first unfinished phase, and it has no dependencies.

## Current behavior

These facts come from the base commit.

- `.data-table` is a `<div>` around one native `<table>` and is its scroll container. The table is `width: 100%` with the automatic table layout, so the browser shares out column widths and no column has a width an author or person can set.
- `src/ts/behaviors/dataTables.ts` is a document-delegated behavior. It handles select-all and `data-sort` sorting, and fires `expressive:change` and a cancelable `expressive:sort` from the wrapper through `Utils.emit`. `headerColumns()` already maps each header cell to its column, counting `colspan` and `rowspan`.
- Sorting listens for clicks on `.data-table[data-sort] > table > thead > tr > th > button:not([aria-haspopup], :disabled, [aria-disabled="true"])`, and the Sass draws every `th > button` as a sort control with an arrow. A second button in a header cell would sort the column and draw an arrow today.
- `.sticky-column` pins the first cell of each row, and the second when the first column holds checkboxes. The second cell's offset is `--md-comp-data-table-checkbox-column-width`, so it is correct only while the checkbox column keeps that width.
- `src/ts/behaviors/paneResize.ts` resizes panes from a `<button class="drag-handle">`. Dragging moves the boundary; Left and Right move it 16px (64px with Shift); Home and End jump to the narrowest and widest; a click, Enter or Space steps through narrow, middle and wide as the single-pointer alternative to dragging. It writes the width to a custom property and fires no event. The page saves the width if it wants to restore it.
- `.drag-handle` (`src/sass/components/_drag-handle.scss`) draws M3's vertical handle bar, and llm.md suggests `cursor: col-resize` for a splitter.

## Scope

People can resize a data table column by pointer, keyboard or a single click, and the page hears each new width through an `expressive:resize` event. The feature is opt-in through a handle the author writes in the header cell. It follows the PaneResize model so both resizers behave alike.

### Expected behavior

- **R1.** A `<button type="button" class="drag-handle" aria-label="…">` as the last child of a cell in the first header row makes that cell's column resizable. Columns without a handle, and tables without any handle, render and behave exactly as on the base commit.
- **R2.** Dragging a handle with a pointer moves its column's inline-end edge with the pointer, in left-to-right and right-to-left pages. The page does not scroll or select text during the drag, including on touch. A few pixels of travel still counts as a click.
- **R3.** With the handle focused, the arrow key that points toward the column's inline-end edge widens the column by 16px and the other narrows it, 64px with Shift. In left-to-right pages Right widens; in right-to-left pages Left widens. Home sets the narrowest width and End the widest.
- **R4.** A click on the handle, or Enter or Space, steps the column through narrow, middle and wide widths and wraps back to narrow. This is the single-pointer alternative to dragging that WCAG 2.5.7 asks for. The click that ends a drag does not step.
- **R5.** A column is never narrower than a minimum set by a new token, `--md-comp-data-table-column-min-width`, nor wider than the wrapper's inner width.
- **R6.** Each completed action that changes a width fires one `expressive:resize` from the wrapper with `{ header, column, width }`: once when a drag ends, once per key press, once per click step. `column` counts as `expressive:sort` counts it, and `width` is in CSS pixels. The event is not cancelable. An action that leaves the width unchanged, such as Home at the minimum, fires nothing.
- **R7.** `DataTables.width(header)` returns a resizable column's current width, and `DataTables.setWidth(header, px)` sets it within the R5 bounds without firing an event, so a page can restore saved widths.
- **R8.** Resizing one column leaves the widths of the other columns unchanged. When the columns grow wider than the wrapper, the table scrolls sideways.
- **R9.** A handle never sorts. Pressing or dragging it in a `data-sort` table leaves the rows, `aria-sort` and the sort arrow alone and fires no `expressive:sort`. The handle is not drawn as a sort control.
- **R10.** Under `.sticky-column`, resizing a pinned column keeps it pinned, and the name cell after a checkbox column keeps its offset. The checkbox column takes no handle, and the docs say so.
- **R11.** The handle sits at the header cell's inline-end edge, shows `cursor: col-resize` and a visible focus indicator, and stays visible in forced colors.
- **R12.** `llm.md` and the data table docs page document the handle, keys, click steps, minimum token, event, script methods, the checkbox column limit and how a page saves and restores widths. The events table in llm.md lists `expressive:resize`. An unnamed handle is flagged by the existing `drag-handle-button-is-named` rule in `semantics.json`. The changelog's Unreleased section lists the addition.
- **R13.** The CSS and JavaScript gzip budgets in `tests/selective-builds.test.js` have reviewed lines for this change.

### Exclusions

- The framework does not store widths. The page saves them from the event and restores them with `setWidth`.
- No double-click to fit content, no row resizing and no column reordering.
- No resizing from header cells that span several columns, or from a later row of a grouped header. A handle belongs in a first-row cell with `colspan` 1, because the fixed table layout takes column widths from the first row.
- No `role="separator"` with `aria-valuenow`. The handle is a plain button, as in panes.
- No manual visual or screen reader check. The user left them out of the merge conditions.

## Decisions

### Confirmed with the user on 2026-10-23

- Follow the PaneResize model: an author-written `<button class="drag-handle">` with an `aria-label`, the same keys and step sizes, and click stepping as the single-pointer alternative. The user chose this over framework storage in `localStorage` and over an ARIA window splitter.
- The page saves widths from `expressive:resize`; nothing persists on its own.
- The minimum width comes from a new token with a 48px default.
- The event is `expressive:resize` from the wrapper with `{ header, column, width }`, and `DataTables.setWidth()` and `DataTables.width()` serve script.
- The plan has three groups: pointer drag with the event, then keyboard and click stepping, then docs and checks.
- Merge needs the roadmap's drag and key test, the sort and sticky-column regression test, and the repository checks. The right-to-left, minimum width and click step cases run as tests but do not block merge.

### Proposals for implementation

- Selector: `.data-table > table > thead > tr:first-child > th > button.drag-handle:last-child`, limited to the first row during implementation because the fixed layout reads widths from it. Add `:not(.drag-handle)` to the sort click selector in `dataTables.ts` and to the `th > button` sort rules in `_data-table.scss`.
- Width model: on the first resize or `setWidth`, write every header cell's measured width to its style, set the table to `table-layout: fixed` and set its width to the sum of the columns. Measuring first keeps R8 true, because under the automatic layout and `width: 100%` the browser shares any change among all columns. Write the state to the table's inline style, which is framework state under the product rules. Implemented as proposed: all three engines hold the widths, and V1 confirms the other columns stay within 1px. The sort exclusion in the Sass uses `:where(:not(.drag-handle))`, so the sort rules keep their specificity.
- Minimum: the token is sized with `rem()` per the rem sizing rule, since a column holds text. The Sass sets `min-inline-size: var(--md-comp-data-table-column-min-width)` on resizable header cells, and the script reads the computed `min-width`, which the browser resolves to pixels.
- Click steps: narrow is the minimum, wide is the wrapper's inner width, middle is halfway between, as PaneResize computes them.
- Code home: keep the handlers in `dataTables.ts` next to sorting, reusing `headerColumns`, `Utils.emit`, `Utils.plainKey`, `Utils.closestInPath` and `controllerFor`. Move them to a helper module in `behaviors/` only if the class gets hard to read. Every new function stays below cyclomatic complexity 5.
- Handle drawing: reuse `.drag-handle` and place it at the cell's inline-end edge with logical properties, with `touch-action: none` and `cursor: col-resize`. Implemented that way. A screenshot showed the handle's 24px hit area overlapping the end of a numeric column's sort button, so resizable header cells take `max(cell padding, 24px)` of end padding. `tests/drag-handle.test.js` treated the sort rules' `:not(.drag-handle)` as styling a handle, so its selector filter now ignores that exclusion.
- Semantics rule: dropped during implementation. `drag-handle-button-is-named` already requires an accessible name on every `button.drag-handle`, and a probe showed it flags an unnamed handle in a header cell and passes a named one.

## Technical constraints

- Stylesheet work follows `src/sass/README.md`, and TypeScript follows `src/ts/README.md`. Use logical properties for right-to-left support.
- New functions stay below cyclomatic complexity 5 for the fallow pre-commit gate.
- Tests run against built bundles: `npm run build` before browser tests, one browser suite at a time.
- Run `npm run build:skill` after the last edit to `llm.md`, `CHANGELOG.md`, `semantics.json` or tests, because the contract hash covers them.

## Dependencies

None. `.sticky-column` (phase 31) is merged, so R10 can be tested.
