# Data table paging

- Date: 2026-10-27
- Roadmap: [Phase 69](../../../../roadmap.md#phase-69-data-table-paging)
- Branch: `feature/2026-10-27-data-table-paging`
- Base: `963198f89c37d2a5312c9a353d91dc94973b937f`, local `origin/master`, merged Phase 68

The user delegated planning and verification through feature-spec-auto and separately authorized the full implementation, review, simplification, PR monitoring and green-merge sequence. The agent owns acceptance checks. No personal user approval of this specification is claimed. The [mission](../../../../mission.md#product-rules) and [technical constraints](../../../../tech-stack.md) apply.

## Evidence and decisions

Phases 67 and 68 merged as PRs #456 and #457. Their roadmap labels are stale. The shared `DataTables` behavior filters record/detail groups, synchronizes visible-record selection and supports cancelable server filtering. Sorting orders groups within each tbody. Ordinary pagination is CSS-only navigation; its styles already support buttons and `aria-disabled`. No paging branch, specification or markup collision was found in the inspected local refs and sources.

Under delegation, opt in with `data-page-size="10"` on the wrapper. The fixed size must be a positive safe integer. Authors provide `button[type="button"][data-table-page="previous"]` and `button[type="button"][data-table-page="next"]` in a named `nav.pagination` inside that wrapper. Reuse native button keyboard activation. Keep boundary buttons focusable with `aria-disabled`, and ignore unavailable activations. An optional named `output[data-table-page-status]` with `role="status"` and `aria-live="polite"` receives localized page numbers, such as `1 / 3`. Authors supply surrounding language.

Track the current page privately per wrapper. Filter and sort before allocating pages across record groups in DOM order. Reset to the first page after an uncanceled filter or a local sort. Silent synchronization preserves the current page where possible and clamps it after record changes. Preserve every record checkbox's checked state across pages. Do not generate page buttons, move focus into rows or add a page event in this phase.

## Requirements

- R1: Only wrappers with a valid positive safe-integer `data-page-size` use local paging. Authored marked Previous and Next buttons act on their nearest wrapper. Absent or invalid sizes leave records unpaged. Unmarked controls, anchors and ordinary server-rendered pagination links keep their native behavior, even inside a paged wrapper.
- R2: Show one page of author-visible, filter-matching record groups in existing DOM order across all tbody elements. Detail rows remain with their record and consume no page slots. Preserve author `hidden`, CSS hiding and expansion state. Reserve a separate `data-table-page-hidden` row attribute for page hiding. Clear all previous page-owned hiding before filter/count visibility reads, so off-page records can match later filters. Filtering counts all matching records, not only the displayed page.
- R3: Default to page one. Previous and Next move one page within bounds. Update their `aria-disabled` state without making them lose focus or moving focus into the table. The optional status shows localized `current / total`, with `0 / 0` for no records and `1 / 1` for one page. Native-disabled or unavailable controls do nothing. Page changes emit no selection, filter or sort event.
- R4: Select-all changes only enabled record checkboxes on the displayed page. Retain all selections on other pages, author-hidden records and disabled records. The header shows checked or mixed state for the displayed eligible records. Existing selection events continue reporting all selected records. An uncanceled filter or local sort resets to the first page; canceled filter or sort requests apply no page reset. Existing per-body sorting and server-filter count ownership remain intact.
- R5: `DataTables.sync(wrapper)` stays silent, handles appended, removed or replaced records and clamps the current page. Removing or invalidating the size restores rows hidden only by paging during sync. Wrapper state, controls and status stay isolated for independent and nested tables and open shadow roots. Explicit local paging may slice application-provided server-filtered DOM records, but never rewrites the application-owned filter count. This is not server paging.
- R6: Add static authoring rules for the new controls and status without initializing components in static checks. Update `llm.md`, the data table page, changelog and generated guidance. Review gzip deltas, run focused Node and three-engine browser checks and required contributor/MCP/package checks. Complete independent review, fixes, simplification and green CI before merge.

## Exclusions

Phase 70 owns a page-size control. Phase 71 owns cancelable server page requests, server totals and page-state APIs. This phase adds no fetching, page event, generated numbered controls, component instance, public export or new dependency. Standalone pagination stays CSS-only. Keep roadmap completion labels unchanged on this branch; record merged phases in separate post-merge documentation work.

See [plan.md](plan.md) and [validation.md](validation.md).
