# Data table text filtering

- Date: 2026-10-27
- Roadmap: Phase 67
- Branch: `feature/2026-10-27-data-table-text-filtering`
- Base: `db981aa4f83d0d2ee63e5877c1238cc698b2045e`, local `origin/master`, confirmed against the remote before writing

This implements [Phase 67](../../../../roadmap.md#phase-67-data-table-text-filtering) under the [mission](../../../../mission.md#product-rules) and [technical constraints](../../../../tech-stack.md). The user delegated specification decisions, implementation, verification, review, PR monitoring and merge. The agent owns the checks. No user specification approval is claimed.

## Evidence and decisions

`src/ts/behaviors/dataTables.ts` already sorts record/detail groups, delegates document events across open shadow roots, and synchronizes selection and column toggles. It has no per-table component lifecycle. Its select-all currently includes hidden records. Phases 59 through 65 have merged implementation evidence despite stale roadmap labels. Phase 66 is unfinished but Phase 67 has no dependencies. The user explicitly starts at Phase 67.

Under delegation, use an authored `input[type="search"][data-table-filter]` inside the wrapper. Mark searchable header cells with `data-filter`; headers must span one column. Reuse the existing header-column calculation and `data-value` override used by sorting. Search is a trimmed, locale-lowercased substring matched against any chosen column separately. An empty query restores only rows hidden by filtering. Without a marked column, a nonempty query matches no records.

Authors may provide an `output[data-table-filter-count]` inside the wrapper with `role="status"` and `aria-live="polite"`. Its content is the number of matching author-visible records, formatted in the table's language. Authors supply surrounding count wording and accessible names. The framework creates no labels or live regions and moves no focus.

## Requirements

- R1: Filtering is opt-in through the marked search input. Real input events and `DataTables.sync(wrapper)` apply its current value, including prefilled values and replacement records. Unmarked controls and nested tables cannot control another table.
- R2: Only explicitly marked single-column headers contribute search values, including grouped headers. Match text or `data-value`, ignore query case and outer whitespace, and preserve record/detail groups across multiple bodies and sorting.
- R3: Author-hidden records and detail rows stay hidden when the query changes or clears. Filtering leaves expansion attributes intact. Rows hidden with author CSS remain hidden and do not contribute to the count.
- R4: Select-all changes only enabled record checkboxes visible in the current view, including disabled-fieldset handling. Filtered or author-hidden selections remain selected. The existing selection event continues reporting all selected records. The header checkbox reflects the current view, including an empty view.
- R5: Update the authored result count on input and sync, including zero results. Native search keyboard behavior, focus, table roles and open-shadow-root operation remain intact.
- R6: Update docs, `llm.md`, changelog, semantics and generated guidance. Measure the JavaScript gzip delta and update its reviewed budget. Run contributor, browser, MCP and package checks.

## Exclusions

Server filtering and its cancelable event belong to Phase 68. Paging, page size, server paging and file/tree changes belong to later phases. No fetching, generated search controls, new dependencies, theme changes, selection clearing or per-table component abstraction.

Scope and validation map to [plan.md](plan.md) and [validation.md](validation.md). The roadmap's completion labels stay unchanged in this workflow.
