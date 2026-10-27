# Multiple-select filtering: validation

- Date: 2026-10-27
- Roadmap phase: Phase 64, filter multiple-select options
- Branch: `feature/2026-10-27-multiple-select-filtering`
- Base: `origin/master` at `165ce2c04e03d738503898ca7eb5a34f565d668f`
- Status: V1 through V8 passed locally on 2026-10-27; PR merge conditions pending

These checks validate [requirements.md](requirements.md) and [plan.md](plan.md) against the [mission's success criteria](../../../../mission.md#success-criteria), the [testing constraints](../../../../tech-stack.md#framework-testing) and the [Phase 64 completion check](../../../../roadmap.md#phase-64-filter-multiple-select-options). The user chose the merge checks on 2026-10-27.

## Setup

Use the Node version in `.nvmrc` and run `npm ci`, plus `npm ci --prefix mcp/expressivecss` in a worktree. Tests read the built bundles, so run `npm run build` before any direct `node --test` command. Run one suite at a time, because parallel browser runs flake. A missing engine blocks a required check; it does not count as a pass.

The test files below exist at the base. The commands come from Phase 63's validation and `CONTRIBUTING.md` and have not been run for this phase.

## Requirement coverage

| Requirement | Plan group | Checks | Result |
| --- | --- | --- | --- |
| R1, opt-in for multiple | 1, 2 | V1, V7 | Passed locally |
| R2, Phase 63 filtering | 1 | V2 | Passed locally |
| R3, hidden selections | 1 | V2, V5 | Passed locally |
| R4, picking a result | 1 | V2, V4 | Passed locally |
| R5, roles and names | 1 | V3 | Passed locally |
| R6, keyboard and focus | 1, 3 | V4 | Passed locally |
| R7, lifecycle and forms | 1 | V5 | Passed locally |
| R8, shared code and styles | 1, 3 | V3, V6, V8 | Passed locally |
| R9, guidance and evidence | 2, 3 | V7, V8 | Passed locally |

## Automated checks

### V1. Search turns on for multiple selects only where intended

Setup: a multiple select initialized with `searchable: true` through script, another through `data-form-select-options='{"searchable":true}'`, a multiple select without the option, a `data-tree` select and a `browser-default` multiple select.

Action: `node --test tests/select-search.test.js`.

Expected: both opted-in multiple selects get one search field, one status element and one inner listbox. The others keep their current markup and roles. The old case that expected multiple selects to ignore `searchable` is replaced, not skipped.

### V2. Roadmap regression: two picks across queries submit both values

Setup: a named multiple select with two optgroups, a disabled option, and option text that differs from its value, inside a form. Count `change` events.

Action: type a query, pick a match, change the query so the first pick is hidden, pick a second match, then submit. Run in `tests/select-search.test.js` and `tests/select-search-browser.test.js`.

Expected: `FormData.getAll(name)` holds both option values and not the query. Each pick fires one bubbling `change`. Typing and clearing fire none. The trigger lists both choices while the first is hidden. Clearing the query shows both rows checked with `aria-selected="true"`. Picking a row again deselects it with one `change`. The test fails on the base and passes on the branch.

### V3. Roles, names and row styles

Setup: the V2 select named by a label, then by `aria-label`.

Action: inspect the popup in Node and in a real browser, and read the computed style of a selected row.

Expected: the inner listbox has `aria-multiselectable="true"` and the `multiple-select-menu` class. The dialog has no `aria-multiselectable`. Search and status sit outside the listbox. The dialog and listbox take the field's name. A selected row shows its checked checkbox and no single-select check mark. The focus ring stays visible in forced colors. A plain multiple select without search keeps its current markup.

### V4. Keyboard and pointer in three engines

Setup: the V2 form between a button before it and a button after it. Use real Playwright input in Chromium, Firefox and WebKit, inside the document and inside an open shadow root.

Action: open from the trigger, type, ArrowDown to a result, press Space, then Enter on another result. Click a row's checkbox and a row's text. Then try Home, End, Tab, Shift+Tab, Escape and an outside click.

Expected: each pick toggles once, leaves the popup open, keeps the query and keeps focus on the picked row. The checkbox state matches the native option. Tab and Shift+Tab follow the Phase 63 contract and close the popup at its ends. Escape closes and focuses the trigger. Every close clears the query and keeps all selections. Focus never gets trapped.

### V5. Reset, refresh, disable and teardown

Setup: the V2 select with a default selected option and a second option picked while hidden by the query.

Action: run a form reset (uncanceled, then canceled), call `refresh()` while open with a query, disable the fieldset and refresh, submit an empty required multiple select, then `destroy()` and initialize again.

Expected: an uncanceled reset closes, clears the query and restores the default selection only. A canceled reset changes nothing. Refresh keeps the query and focus as R7 states. Disabling closes the popup and blocks reopening. Validation describes the trigger. Teardown leaves the author markup as it was, with no extra Menu instance.

### V6. Shared paths stay the same

Action: `node --test tests/select-search.test.js tests/tree-select.test.js`, the browser files `tests/select-search-browser.test.js` and `tests/tree-select-browser.test.js`, and the existing select, menu and autocomplete tests that `npm run verify` runs.

Expected: single-select search, plain multiple select, TreeSelect, Menu and Autocomplete tests pass without edits to their expectations.

### V7. Docs and generated guidance agree

Action: `npm run build:semantics`, `npm run build:skill`, then `npm run check:generated`. Build the docs and open the select page.

Expected: `llm.md`, the docs page and the changelog describe search on multiple selects and name TreeSelect search as Phase 75. The live example uses `searchable: true` on a multiple select. Generated files have no diff after the build commands.

### V8. Contributor checks, MCP, packages and size

Action: `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one at a time. Measure JS and CSS gzip sizes against the base.

Expected: all pass. The budget lines in `tests/selective-builds.test.js` record the measured sizes. A known flaky test may be rerun alone, and the rerun is recorded here.

## Execution record

All runs were on 2026-10-27 in this worktree, one suite at a time, after `npm ci` in the root and in `mcp/expressivecss`.

- V1, V2 and V5 (Node): `tests/select-search.test.js` passes 13 of 13. The multiple-select cases cover two picks across queries, reset with a hidden pick, required validation on the trigger, refresh with a live query, disabling, and teardown with no extra Menu instance. Canceled reset and focus restoration on refresh are not repeated for multiple selects; the Phase 63 browser test covers that shared code with a single select. Before the source change, the new multiple-select cases failed on the base: the popup kept `role="listbox"` and had no search field. The plain multiple case now passes `searchable: false`, since multiple selects no longer ignore the option.
- V2, V3 and V4 (browser): `tests/select-search-browser.test.js` passes 27 of 27 in Chromium, Firefox and WebKit, including two new multiple-select scenarios per engine. One run alongside `tests/tree-select-browser.test.js` and `tests/menu-field-browser.test.js` passed 200 of 201. The failure was the Phase 63 single-select case "keeps text editing separate from row navigation and restores focus" in Chromium. It passed alone and on a full rerun of the file, so it is recorded as a load flake.
- V3: the native checkbox stays invisible by design, so the browser test clicks the drawn box on the label text. A Chromium screenshot showed searchable and plain multiple rows with the same checkboxes and no single-select check mark. No Sass changed.
- V6: `tests/tree-select-browser.test.js` and `tests/menu-field-browser.test.js` pass, and so do the Node files that touch FormSelect and Menu.
- V7: `npm run build:semantics`, `npm run build:skill` and `npm run check:generated` pass. In the built docs, the multiple-select example opened in Chromium with a multi-selectable listbox, kept the popup open after a Space pick, and showed "Paris, Rome" in the trigger, with no page errors.
- V8: `npm run verify` passed 3,328 of 3,328 tests and built the docs. `npm test --prefix mcp/expressivecss` and `npm run verify:packages` pass. Minified JS is 106,526 gzip bytes, 23 over the base's 106,503. CSS is unchanged at 90,754. The budget line records the JS size.
- Capability record: the `select.ts` and `src` inventory pins were current at the base, so they were re-pinned, and both new browser scenarios were added to the select record. The roadmap `sourceRevision` pointed to `823ca3aa4`, a #452 branch commit that the squash merge dropped, and the ancestor check failed on master CI. A separate commit re-pins it to the #452 squash commit `165ce2c04`.

Noticed and left alone: in both docs search examples the listbox is 280px wide inside a 756px popup. This comes from Phase 63 and is outside this phase.

## Manual checks

The user chose no manual gate for this phase. No screen reader or manual visual review ran. The screenshots above were automated probes.

## Merge conditions

- V1 through V8 pass, with results recorded in the coverage table.
- The V2 regression fails on the base and passes on the branch.
- PR CI passes, review conversations are resolved, and the branch is current with `origin/master`.
- The roadmap completion line is added in a separate change, not in this specification.
