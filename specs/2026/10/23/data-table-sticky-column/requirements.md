# Data table sticky first column

Date: 2026-10-23
Roadmap phase: Phase 31, data table sticky first column
Branch: `feature/2026-10-23-data-table-sticky-column`
Base: `origin/master` at `7233e5714`
Status: specified, not implemented

Follow the [mission's agreed scope for components](../../../../mission.md#agreed-scope) and its [product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 31](../../../../roadmap.md#phase-31-data-table-sticky-first-column). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

Phases 25 to 30 merged on 2026-10-23 as #406 to #411, although the roadmap does not yet mark them complete. Phase 31 is the first unfinished phase, and it has no dependencies.

## Current behavior

These facts come from the base commit.

- `.data-table` is a `<div>` around one native `<table>`, and the wrapper is the scroll container (`overflow: auto` in `src/sass/components/_data-table.scss`). A wide table scrolls sideways inside it, and every column scrolls with it.
- Header cells (`> table > thead th`) are `position: sticky; top: 0; z-index: 1` with the container color as their background. Body cells have no background of their own.
- Cells use the separate border model with `border-spacing: 0`, so borders travel with sticky cells.
- Row state is painted on the `tr`: hover adds a translucent state layer, and a row whose first cell holds a checked checkbox takes the opaque selected color. A `tr.data-table-detail` row holds one wide cell with the detail color.
- A checkbox cell (`:is(th, td):has(> label > input[type="checkbox"]:only-child)`) gets `width: 1px` and no end padding, so it hugs its box. The checkbox's own size token is scoped to its `label`, so the wrapper cannot read it.
- The docs and tests often put a checkbox column first and the `th scope="row"` name column second (for example `tests/data-table-browser.test.js`).
- `src/ts/behaviors/dataTables.ts` handles sorting and select-all. It does not touch layout.

## Scope

An opt-in class on the wrapper keeps the leading column of a wide data table in view while the other columns scroll sideways. It is CSS only.

### Expected behavior

- **R1.** With the modifier on the `.data-table` wrapper, the first cell of every header, body and footer row stays pinned to the wrapper's inline-start edge while the table scrolls sideways, in left-to-right and right-to-left pages.
- **R2.** When the table's first column holds checkbox cells, the second cell of every pinned row is pinned too, directly after the first, so each row's name stays in view next to its checkbox. The pairing is decided for the whole table, so a row whose first cell is empty (an unselectable row) still pins its name. Under the modifier, the checkbox cell takes a fixed width from a new token in place of its 1px hug, and the second cell's offset uses the same token.
- **R3.** The pinned header cells (the corner) paint above both the scrolled header cells and the pinned body cells. Pinned body cells paint above scrolled body cells and below the sticky header row when the wrapper also scrolls vertically.
- **R4.** Pinned cells are opaque, so scrolled cells never show through them. They show the same hover state layer and selected color as the rest of their row.
- **R5.** The last pinned cell in each row has a divider on its inline-end edge in the table's outline color, so the edge between pinned and scrolled columns is visible.
- **R6.** Without the modifier, a data table renders and behaves exactly as it does on the base commit, including the checkbox cell's width.
- **R7.** `llm.md` and the data table docs page document the modifier, the checkbox pairing and the new token, with an example. The changelog's Unreleased section lists the addition.
- **R8.** The CSS gzip budget in `tests/selective-builds.test.js` has a reviewed line for this change.

### Exclusions

- Detail rows (`tr.data-table-detail`) are not pinned. Their wide cell scrolls with the table.
- The caption is not pinned. It scrolls sideways with the table.
- No pinning of a column chosen by the author, of more than the checkbox and name pair, or of a column at the inline-end edge.
- No scroll-dependent shadow. The divider always shows, because scroll-state container queries are not available in every engine.
- No runtime script and no measurement of column widths.
- No new `semantics.json` rule, and no window-size prefixes.
- No manual visual check. The user left it out of the merge conditions.

## Decisions

### Confirmed with the user on 2026-10-23

- The feature is opt-in through a class on the wrapper, as the mission's product rules require for changed behavior of existing markup.
- The modifier pins the first column, plus the next cell when the first is a checkbox cell. The checkbox column gets a fixed width token so the offset is known without script. The user chose this over pinning the first column only, over author-marked cells, and over measuring widths in `dataTables.ts`.
- The plan has three groups: pinning CSS with its geometry test, then row states with docs, then budget and repository checks.
- Merge needs the geometry test and the row state test, plus `npm run verify`, the MCP tests, `npm run verify:packages` and the budget line.

### Proposals for implementation

- Class name: `.sticky-column`, on the wrapper, next to the existing `.dense` modifier. It pairs with the `.sticky-top` helper. Rename it during review if a better name comes up.
- Token: `--md-comp-data-table-checkbox-column-width`, set on `.data-table`. Its default is the checkbox cell's rendered width on the base commit (cell start padding plus the label's box), measured in all three engines during group 1. It applies only under the modifier, so R6 holds.
- Selectors: `> table > :is(thead, tbody, tfoot) > tr:not(.data-table-detail) > :first-child` for the first cell. The paired `:nth-child(2)` cell is pinned when the wrapper matches `:has(> table > * > tr > :first-child > label > input[type="checkbox"]:only-child)`. Both use `position: sticky` with `inset-inline-start`, so right-to-left pages mirror without extra rules.
- Stacking: under the modifier, scrolled header cells move to `z-index: 2`, pinned header cells to `3`, and pinned body and footer cells use `1`.
- Row state: pinned cells paint the container color, and the row's state goes on top as a background layer, through a private custom property that the hover and selected row rules set. A translucent `tr` background alone would let scrolled cells show through.

## Technical constraints

- Stylesheet work follows `src/sass/README.md`. Borders stay in pixels; the checkbox column width holds a box, so size it with `rem()` if its default contains text- or icon-sized parts.
- Use logical properties (`inset-inline-start`, `border-inline-end`) for right-to-left support.
- Tests run against built bundles, so run `npm run build:css` before the browser tests. Run one browser suite at a time.
- Run `npm run build:skill` after the last edit to `llm.md`, `CHANGELOG.md` or tests, because the contract hash covers them.

## Known limits

- A first cell with `colspan` pins its whole width. The docs should say that the pinned column expects one cell per row.
- If an author restyles the checkbox cell's width, the paired cell's offset no longer matches. The docs point them at the token.

## Dependencies

None. The work touches no TypeScript, so the fallow complexity gate does not apply.
