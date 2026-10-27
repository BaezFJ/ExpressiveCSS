# Data table page size requirements

Phase 70, 2026-10-27. Branch `feature/2026-10-27-data-table-page-size`, base `dd7649d024c10d00614ce115db4bbe8fcb4d2b4c`.

Sources: [mission](../../../../mission.md), [technical constraints](../../../../tech-stack.md), [roadmap Phase 70](../../../../roadmap.md#phase-70-data-table-page-size), and [local paging](../data-table-paging/requirements.md).

## Evidence and delegated decisions

Phase 69 merged through PR #458 at the base commit after all seventeen CI checks passed. Its shared `DataTables` behavior already pages record/detail groups, preserves selection, and clamps a private numeric page when `sync(wrapper)` sees a different positive safe-integer `data-page-size`. The roadmap requires an authored page-size control and a valid displayed page after its value increases on the last page.

The user delegated planning, specification verification, implementation and acceptance checks through feature-spec-auto, followed by incremental-implementation, review, simplification and PR monitoring. The choices below are agent decisions grounded in the inspected source; no personal user review is claimed.

Use one labelled native single select, `select[data-table-page-size]`, inside an already opted-in `.data-table[data-page-size]`. Native input crosses open shadow roots; native change does not. The existing FormSelect writes the original select and emits a composed change. Handle both events, reading the original select, and skip duplicate work when the accepted numeric size already matches the wrapper. Keep the wrapper attribute authoritative; authors select the matching initial option. This adds no component, generated control, dependency or request event.

## Requirements

- **R1 — Authored size control.** A user input or change from the marked enabled single select accepts a positive safe-integer option value, updates the nearest wrapper's `data-page-size` and reapplies shared paging. Native and FormSelect controls work in documents and open shadow roots. A native input/change pair with the same value applies the size once. No new `expressive:*` event is emitted, and focus stays with the user's control or the existing FormSelect focus contract.
- **R2 — Preserve and clamp the page.** Retain the current numeric page if available, otherwise clamp it to the final page under the new size. With seven records, size two and page four, increasing to four shows page two of two and records five through seven; increasing to three shows page three of three and record seven. Decreasing a size preserves an available page. Empty results remain `0 / 0` with unavailable navigation.
- **R3 — Preserve the pipeline.** Filtering and existing sorting determine eligible records before paging. Details consume no slots and remain with their record. Preserve author hiding, expansion, all checked states and server-filter count ownership. Recompute select-all for enabled displayed records without firing selection, filter or sort events. Matching counts continue covering all matching records across pages.
- **R4 — Reject inactive controls.** Ignore empty, nonnumeric, nonpositive, fractional, infinite and unsafe-integer values without changing the working size or current page. Ignore wrong element types, multiple selects, disabled controls and fieldsets, unavailable selected options, unmarked controls, controls outside a table wrapper, and controls whose nearest wrapper has no valid paging opt-in. Independent and nested wrappers remain isolated. Fixed-size tables without the marker retain Phase 69 behavior.
- **R5 — Keep script ownership explicit.** Initial rendering and silent `DataTables.sync(wrapper)` read the wrapper attribute, preserving the existing public contract. Changing only a select value from script remains silent. To apply that value, dispatch a bubbling composed input/change event; alternatively update the wrapper attribute and call sync. Authors own the select's options and initial selected value, and keep any scripted control presentation aligned. Do not synthesize events or refresh FormSelect from DataTables.
- **R6 — Authoring and evidence.** Authors supply the control's accessible name. Add static native single-select/name rules without initializing components. Update the existing paging docs, `llm.md` and changelog, regenerate committed guidance, review gzip deltas, and verify pointer/keyboard behavior in Chromium, Firefox and WebKit. Complete required contributor, MCP/package, independent review and merge checks.

## Exclusions

Phase 71 owns server page requests, server totals and page-state APIs. This phase adds no server paging, fetching, automatic page-size options, numbered controls, form-reset listener, sorting change, new export or stylesheet treatment. Standalone pagination remains CSS-only. Keep roadmap completion labels unchanged on this feature branch; the separate post-merge documentation PR records completion and closes the final merge gates.
