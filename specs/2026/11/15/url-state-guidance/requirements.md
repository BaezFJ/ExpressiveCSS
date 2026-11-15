# URL state guidance: requirements

- Feature: the tabs and data table guides tell agents to keep the selected tab, filter text and page in the URL, and data tables gain `showPage()` to restore a local page
- Date: 2026-11-15
- Roadmap phase: [Phase 81: guide tabs, filters and pages into the URL](../../../../roadmap.md#phase-81-guide-tabs-filters-and-pages-into-the-url), in the milestone "apps that feel finished". It depends on [phase 78](../finished-app-baseline/) and reuses the App behavior channel from [phase 79](../button-loading-guidance/). The [mission](../../../../mission.md#agreed-scope) puts app behavior in the component's guide, and its product rules make any change to existing behavior opt-in.
- Branch: `feature/2026-11-15-milestone-apps-that-feel-finished`
- Base: the branch at `6f86e1629`, after phase 80

## Current behavior and need

Both phase 78 dashboards wrote nothing to the URL: tab, filter and page were each a finding in both runs (6 of the baseline's 10). Tabs reads `location.hash` when it starts (`tabs.ts` `_setupActiveTabLink`) and has `select(id)`, but never writes the hash. The data table fires `expressive:filter` with `{ query }` and `expressive:page` with `{ page, pageSize }`, and `sync(wrapper)` reapplies a query set from script. Local paging always starts on page 1: the framework syncs every `.data-table` at document ready, before app code, and `setPage()` switches the table to server ownership. An app can only reach page 3 again by replaying Next presses, which fires `expressive:page` and the page status live region on load.

## Scope

- `Expressive.DataTables.showPage(wrapper, page)`: shows a local page, clamped, without events. It changes no existing behavior.
- `### App behavior` in the Tabs section: write the tab to the URL with `replaceState` on `expressive:change`; Tabs restores a hash itself, or `select(id)` restores a query value.
- `### App behavior` in the Data table section: write the filter and page with `replaceState` on `expressive:filter` and `expressive:page`; restore by setting the input and calling `sync`, then `showPage`.
- Docs for `showPage` in `llm.md` and the CHANGELOG.
- A committed browser script, `scripts/finished-app-url-state.mjs`, that chooses a tab, a filter and a page in any `filtered-dashboard` build, reloads, and compares.
- Two rebuilds of `filtered-dashboard`, reviewed with the baseline trees and checked with the script.

## Exclusions

- A `data-page` attribute or a URL-reading option on any component. The app owns the URL and its parameter names.
- Sort in the URL. Phase 77 left sort out of the rubric.
- Server paging. `setPage()` already takes application page state.
- History entries per change (`pushState`). The guidance uses `replaceState`, which the rubric passes and which keeps Back leaving the page instead of stepping through every keystroke.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| Data tables need one method; Tabs needs none (the roadmap's open question) | Decided from evidence | Tabs already reads the hash on start and has `select()`. The data table has no way to start on another local page: its first view comes from the framework's own sync at document ready, which runs before app code, so a markup attribute would lose that race, and `setPage()` makes the table server-owned. A method the app calls after load is order-proof and opt-in. |
| `showPage(wrapper, page)` fires no event and doesn't move focus | Decided from evidence | It restores state the app already holds, like `sync()`, which fires none. An event would make the app's own URL listener rewrite the URL it is reading. |
| `showPage` returns false for a wrapper that isn't a paged local `.data-table` or a page that isn't a positive safe integer, and clamps a page past the end | Decided from evidence | Matches `setPage()`'s validation style and `sync()`'s clamping. |
| The guidance uses query parameters for filter and page, and the hash or a query parameter for the tab | Decided from evidence | Tabs restores a hash with no script; a query parameter needs one `select()` call. Filter text and page numbers belong in the query. |
| Completion is checked by a browser script as well as by review | Decided from evidence | The roadmap's check is a reload that restores all three. The inspector judges from source; the script proves it. |

## Requirements

- **R1** `Expressive.DataTables.showPage(wrapper, page)` shows local page `page` of a `.data-table` wrapper with a direct table and a positive `data-page-size`, clamped to the last page. It keeps the current filter and sort, updates the page controls and status, keeps page-scoped selection rules, fires no event, and returns true. It returns false, changing nothing, when the wrapper isn't such a table, the table is server-owned (`setPage()` accepted state), or `page` isn't a positive safe integer.
- **R2** `tests/data-tables-page.test.js` covers R1: a valid page, a clamped page, a filtered table, the false cases, no `expressive:page` event, and that later Next and Previous presses continue from the shown page.
- **R3** `llm.md`'s Data table section documents `showPage` with an example, and `src/ts/behaviors/dataTables.ts` documents it in its JSDoc. Any docs or export coverage test that lists methods passes.
- **R4** The Tabs section's `### App behavior` says: write the selected tab to the URL with `history.replaceState` on `expressive:change`, as the hash (Tabs selects it on start) or a query value restored with `select(id)` after init; and don't push a history entry per change.
- **R5** The Data table section's `### App behavior` says: on `expressive:filter`, write the query to a query parameter and drop the page, since a new query returns to page 1; on `expressive:page`, write the page; on load, set the search input's value and call `Expressive.DataTables.sync(wrapper)`, then `showPage(wrapper, page)`; use `replaceState`; keep the URL in step when a tab switches tables. Each App behavior stays under 1.5 KB.
- **R6** `scripts/finished-app-url-state.mjs` runs in Chromium against an app. It selects the second tab, types a filter, goes to page 2 when Next is enabled (trying a few one-letter filters until a page 2 exists, and recording which), snapshots the selected tab, the search value and the visible rows, reloads, and passes when all three match and no page error occurred. It records whether page 2 could be reached and sets a failing exit code. An npm script runs it, and a browser test runs it on a small fixture that keeps state in the URL and one that doesn't.
- **R7** `filtered-dashboard` is rebuilt twice under the procedure, recorded as `2026-11-15-phase-81` with apps, lens blocks, lint, `findings.json`, script output and rows. Each rebuild passes the script, and each run records its countable `finished-app:url-state` findings. A script failure inside the guidance's scope leads to a revision and a repeat, up to two revisions; every run set is committed.
- **R8** CHANGELOG lists `showPage` under Added and the guidance; `npm run build:skill` runs last; verify (including any gzip budget) and the MCP smoke test pass.

## Risks considered

- Two at once: `showPage` is synchronous, so a page press can't interleave with it. A filter typed after `showPage` returns to page 1 as before.
- Bad input: `showPage` validates `page` (R1); the guidance reads URL values through `URLSearchParams` and passes numbers.
- Who must be refused: not applicable.
- Readers: `DataTables` exports (index and modular entries), docs coverage tests that check documented methods, `tests/data-tables-*.test.js`, the gzip budget in `tests/selective-builds.test.js`, the generated guides and the published `llm.md`.
- Server-owned tables: R1 refuses them, so `setPage()` state is never overwritten.
- UI states: an empty filter result (page 1 of 0), a page past the end after records change (clamped).
- `specs/checklist.md`: the project has none.
