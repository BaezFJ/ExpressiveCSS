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
| Data tables need one method; Tabs needs none (the roadmap's open question) | Decided from evidence | Tabs already reads the hash on start and has `select()`. The data table has no way to start on another local page: its first view comes from the framework's own sync at document ready, which runs before app code, so a markup attribute would lose that race, and `setPage()` makes the table server-owned. A method the app calls after load, once its rows exist, avoids that race and is opt-in. |
| `showPage(wrapper, page)` fires no event and doesn't move focus | Decided from evidence | It restores state the app already holds, like `sync()`, which fires none. An event would make the app's own URL listener rewrite the URL it is reading. |
| `showPage` returns false for a wrapper that isn't a paged local `.data-table` or a page that isn't a positive safe integer, and clamps a page past the end | Decided from evidence | Matches `setPage()`'s validation style and `sync()`'s clamping. |
| The guidance uses query parameters for the tab, filter and page | Decided from evidence (revised after spec review) | A hash naming the panel scrolls a shared link to the panel, holds only one tab set, and any in-page anchor overwrites it. A query value per tab set avoids all three; moving `.active` to that tab before `AutoInit()` restores it without firing `expressive:change`, since Tabs starts on `a.active`. |
| Completion is checked by a browser script as well as by review | Decided from evidence | The roadmap's check is a reload that restores all three. The inspector judges from source; the script proves it. |

## Requirements

- **R1** `Expressive.DataTables.showPage(wrapper, page)` shows local page `page` of a `.data-table` wrapper with a direct table and a positive `data-page-size`, clamped to the last page. It keeps the current filter and sort, updates the page controls and status, keeps page-scoped selection rules, supersedes a page request still pending (as `setPage()` does), fires no event, and returns the page it shows. It keeps a canceled, application-owned filter. It returns false, changing nothing, when the wrapper isn't such a table, the table is server-owned (`setPage()` accepted state), or `page` isn't a positive safe integer. Its validation sits in a helper so no function reaches cyclomatic 5.
- **R2** `tests/data-tables-page.test.js` covers R1: a valid page, a clamped page, a filtered table, a canceled filter, the false cases (not a table, no page size, server-owned, bad pages), no `expressive:page` event, a call inside an `expressive:page` listener winning over the pending request, a later `sync()` keeping the page, and later Next and Previous presses continuing from it. `tests/data-tables-page-browser.test.js` adds one case in all three engines for a table in a hidden panel.
- **R3** `llm.md`'s Data table section and `docs/src/pages/data-table.astro` document `showPage`, contrasting it with `setPage` and saying to call it once the rows exist; `src/ts/behaviors/dataTables.ts` documents it in its JSDoc. `.fallowrc.json` lists it in `usedClassMembers` next to `setPage`, and `tests/selective-builds.test.js` gets a reviewed gzip budget line for the added bytes.
- **R4** The Tabs section's `### App behavior` says: keep the selected tab in a query parameter per tab set, written with `history.replaceState` from an `expressive:change` listener on the `.tabs` element; on load, read the whole URL first, then move `.active` to that tab before `AutoInit()` (or call `select(id)` after it, which fires the app's own listeners); Tabs fires nothing for the starting tab, so draw its view after init; a hash also works but scrolls a shared link to the panel; don't push a history entry per change.
- **R5** The Data table section's `### App behavior` says: write the filter query wherever the app applies it (`expressive:filter` for `data-table-filter`) and drop the page, since a new query returns to page 1, and drop it on an uncanceled `expressive:sort` too; write the page (and the size, when a size select exists) on `expressive:page`; use `replaceState`; on load, after reading the whole URL, set the search input's `value` and call `Expressive.DataTables.sync(wrapper)`, then `showPage(wrapper, page)` on the table in the selected panel; put URL values into `.value` or `.textContent`, never markup. Each App behavior stays under 2 KB.
- **R6** `scripts/finished-app-url-state.mjs` runs in Chromium against an app. It finds tabs as `.tabs > a` or `.tabs > li > a` (selected by `.active`), the first visible search input, and a visible Next button that isn't disabled or `aria-disabled`, scoping rows and Next to the visible panel. On tabs other than the first, it tries one-letter filters until Next is enabled, presses Next, and checks the view changed. It snapshots the selected tab, the search value, the visible rows and any page status, compares them after a reload and after opening the same URL in a fresh page, and passes only when both match with no page error. It fails with a reason when no tab, search or page 2 can be reached, and sets a failing exit code. An npm script runs it, and a browser test runs it on two fixtures built on the shipped `dist/`: one that follows the guidance and one that keeps nothing in the URL.
- **R7** `filtered-dashboard` is rebuilt twice under the procedure, recorded as `2026-11-15-phase-81` with apps, lens blocks, lint, `findings.json`, script output and rows. Each rebuild passes the script, and each run records its countable `finished-app:url-state` findings. A script failure inside the guidance's scope leads to a revision and a repeat, up to two revisions; every run set is committed.
- **R8** CHANGELOG lists `showPage` under Added and the guidance; `npm run build:skill` runs last; verify (including any gzip budget) and the MCP smoke test pass.

## Risks considered

- Two at once: `showPage` is synchronous, so a page press can't interleave with it. A filter typed after `showPage` returns to page 1 as before.
- Bad input: `showPage` validates `page` (R1); the guidance reads URL values through `URLSearchParams` and passes numbers.
- Who must be refused: not applicable.
- Readers: `DataTables` exports (index and modular entries), docs coverage tests that check documented methods, `tests/data-tables-*.test.js`, the gzip budget in `tests/selective-builds.test.js`, the generated guides and the published `llm.md`.
- Server-owned tables: R1 refuses them, so `setPage()` state is never overwritten.
- UI states: an empty filter result (`0 / 0`), a page past the end after records change (clamped).
- Silent page resets: a local sort, a tab change that resets paging and `sync()` clamping change the page without `expressive:page`; R5 covers sort, and the URL is rewritten on the next page event.
- Re-entry: restoring with `select()` fires the app's own listeners; R4 and R5 say to read the whole URL first.
- Untrusted URL text: R5 keeps it out of markup.
- `specs/checklist.md`: the project has none.
