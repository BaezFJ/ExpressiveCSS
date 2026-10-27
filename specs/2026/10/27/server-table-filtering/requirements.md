# Server-owned table filtering

- Date: 2026-10-27
- Roadmap: Phase 68, server-owned table filtering
- Branch: `feature/2026-10-27-server-table-filtering`
- Base: `b2bff6ec0649a69f7cee3427edc1ef379fa8853b`, local `origin/master`, the merged Phase 67

This follows [Phase 68](../../../../roadmap.md#phase-68-server-owned-table-filtering), the [mission](../../../../mission.md#product-rules) and [technical constraints](../../../../tech-stack.md). The user delegated specification decisions and verification through feature-spec-auto, and separately authorized commits, PR monitoring, fixes and green merges across the remaining phases. The agent owns validation; no personal user approval of this specification is claimed.

## Evidence and decisions

Phase 67 merged as PR #456 at the base commit. Current `DataTables` delegates search input to silent `sync()`, which filters record/detail groups, writes the result count and synchronizes selection. Sorting already uses a cancelable wrapper event through `Utils.emit`. The next eligible phase is 68. Discovery used local merged refs and direct source inspection; no same-feature branch or specification collision was found.

Under delegation, add `expressive:filter` with `{ query }`, where query is trimmed but retains its case. Emit only from marked search input events, before their default local filtering. Follow the sort event's bubbling, composed and cancellation contract. An application must call `preventDefault()` synchronously before awaiting a response.

Cancellation keeps the current rows, order, query text, count and focus unchanged. The application owns fetching, response ordering, errors and the server total. A subsequent explicit `sync()` synchronizes application-provided records without matching the query or rewriting the count. It restores only filter-owned hiding, preserves author-hidden record/detail groups and updates selection and column toggles. Silent synchronization never requests another filter operation.

Keep server ownership privately per wrapper, including during event dispatch, so synchronous replacement plus `sync()` inside a canceling listener works. The next uncanceled input returns that wrapper to normal local filtering. No public configuration or new sync option is needed.

## Requirements

- R1: Each marked search input edit emits exactly one `expressive:filter` from its own wrapper, with the trimmed case-preserving query. The event is bubbling, composed and cancelable. Empty input emits an empty query. Unmarked and out-of-wrapper controls do nothing.
- R2: Without cancellation, Phase 67 filtering, count output and visible-record selection remain unchanged. Programmatic `sync()` stays silent and applies the current local query.
- R3: A canceled input request applies no new local query or count write, reorders no rows and moves no focus. It leaves the existing view untouched until application code changes it. The framework fetches nothing.
- R4: An application may replace rows, write a server count and call `sync()` inside the canceling listener or after an asynchronous response. Replacement records remain visible even when their text does not match the query. Sync emits no filter, change or sort event, preserves the application count, keeps author-hidden details with their records and scopes select-all to enabled visible records. Previous filter-owned hiding is removed during this explicit server-owned sync.
- R5: Ownership is isolated per wrapper, including open shadow roots. A following uncanceled input resumes local filtering and count updates. If a listener dispatches a newer request synchronously, the older request cannot overwrite its outcome. Sorting remains a separate cancelable operation; canceling either request does not cancel the other.
- R6: Update the event table, filtering reference, docs and changelog; regenerate skill/MCP guidance; measure and review gzip size. Run focused Node and three-engine browser checks, contributor checks, MCP smoke and isolated-package verification. Complete independent review, fix findings and perform code simplification before PR merge readiness.

## Exclusions

No networking, debounce, abort controller, response ordering, server total API, paging or page-size control is added. Those responsibilities remain with the application or later phases. Markup, static semantics, public exports and the `sync(wrapper)` signature stay unchanged. Roadmap completion records belong to a separate post-merge documentation PR.

Work and acceptance map to [plan.md](plan.md) and [validation.md](validation.md).
