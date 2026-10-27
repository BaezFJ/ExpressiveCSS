# Single-select filtering: validation

- Date: 2026-10-26
- Roadmap phase: Phase 63, filter single-select options
- Branch: `feature/2026-10-26-single-select-filtering`
- Base: `origin/master` at `6f74b3701af2347656aec1bae69af77396897609`
- Status: local implementation and automated verification complete on 2026-10-27; human review and PR gates pending

Validate [requirements.md](requirements.md) and [plan.md](plan.md) against the [mission's success criteria](../../../../mission.md#success-criteria), [technical testing constraints](../../../../tech-stack.md#framework-testing) and [Phase 63 completion check](../../../../roadmap.md#phase-63-filter-single-select-options). The user confirmed this acceptance and merge checklist and subsequently requested incremental implementation. The execution record below separates completed checks from pending merge conditions.

## Setup and commands

Use the contributor Node version from `.nvmrc` and install dependencies with `npm ci`. Tests consume built bundles, so run `npm run build` before direct `node --test` commands. Install the three Playwright engines and required system libraries using the contributor instructions, or use the documented container workflow. Run one suite at a time. Fixtures use actual native selects and form submission, not component internals alone. Tear down instances, timers and leased browsers in `finally`.

`tests/select-search.test.js` and `tests/select-search-browser.test.js` now exist and follow the existing runner conventions. Commands below were unexecuted at specification time. The execution record identifies the checks run during implementation. Missing engines or setup are blockers for required checks, not passes.

## Requirement coverage

| Requirement | Plan group | Validation | Result |
| --- | --- | --- | --- |
| R1, opt-in and exclusions | 1, 2, 3 | V1, V7, V9 | Passed locally |
| R2, matching and groups | 1, 2 | V2, V4, V9 | Passed locally |
| R3, native values and events | 1, 2 | V2, V4, V5, V9 | Passed locally |
| R4, controls and accessible feedback | 1, 2, 3 | V3, V6, V8, V9 | Automated pass; V8 pending |
| R5, keyboard and focus | 1, 2, 3 | V4, V5, V7, V8, V9 | Automated pass; V8 pending |
| R6, lifecycle and native forms | 1, 3 | V5, V6, V7 | Passed locally |
| R7, shared compatibility | 1, 3 | V1, V7, V10 | Passed locally |
| R8, styling | 1, 3 | V6, V8, V10 | Automated pass; V8 pending |
| R9, guidance and delivery evidence | 2, 3 | V9, V10 | Local checks pass; merge gates pending |

## Automated checks

### V1. Activation keeps existing paths unchanged

Setup: equivalent enhanced single, default single, multiple, `browser-default` and `data-tree` controls. Initialize searchable mode through script and separately through AutoInit's JSON attribute.

Action: run `node --test tests/select-search.test.js` after the new file exists and bundles are built. Include omitted/false `searchable`, and `searchable: true` passed to the excluded modes. Verify generated control count and native markup after teardown.

Expected: only an opted-in plain enhanced single select gets search. Existing exports and instance keys remain valid. No second wrapper, instance or registry entry appears. Both supported initialization paths behave alike. Excluded modes retain their existing roles and selection behavior.

### V2. Grouped filtering submits the native value

Setup: a named required single select with a disabled placeholder, two optgroups, a disabled option, a disabled group, an ungrouped option and two distinct options sharing a value. At least one option's text differs from its value. Count native changes and record the form's submitted data.

Action: type a mixed-case substring, choose an enabled match by pointer, and submit. Repeat with the keyboard in V4. Exercise leading/trailing whitespace, internal whitespace, empty query, literal regex characters, accented text, no matches, a query matching only a group label, and a query matching only disabled options. Run the new Node file and `node --test tests/select-search-browser.test.js` after creation.

Expected: matching follows R2 exactly. Empty groups disappear, order stays authored, disabled matches stay inert and hidden rows cannot take focus. Query changes leave native option selection, text, disabled attributes and events unchanged. A hidden selected option remains selected until an explicit choice. Submission contains the chosen native option value, never the query. A changed value fires one bubbling change; selecting the same option fires none. Duplicate-value rows retain distinct option identity and the existing value-based event behavior. The roadmap's grouped-filter-and-submit test fails on the base and passes on the implementation.

### V3. Names, roles, status and untrusted strings

Setup: fixtures named by a normal label, multiple labels, `aria-label` and `aria-labelledby`, plus translated `i18n` overrides. Include option/group/message strings containing markup and special characters.

Action: inspect generated roles, names, ID references and focusability before filtering, with no matches, after clearing and after closing. Verify that status text changes when entering and leaving no-results. Assert accessibility structure in a real browser; use Node checks for literal text and unchanged native DOM.

Expected: the searchable trigger controls a named nonmodal dialog; search and status are outside its named listbox. Every visible option has correct selection and disabled state. Headings and status cannot be selected. Only actual zero matches produces the localized polite no-results message. Search has its own label and no form name. Filtering and dismissal leave no active reference to a hidden or removed row. Strings remain text and create no injected element or handler. Ordinary selects retain their existing roles. DOM assertions do not prove spoken announcements; V8 records that limitation.

### V4. Real input follows the keyboard contract

Setup: the V2 form between a preceding and following button. Run every scenario in Chromium, Firefox and WebKit with Playwright's real keyboard input and observable focus assertions.

Action: open with pointer and each trigger key; type and paste a multiword query; exercise Space, Home, End, horizontal arrows and composition. Move from search with both vertical arrows and Tab. Navigate results, return from the first with ArrowUp, use Home/End and select with Enter/Space. Exercise Tab, Shift+Tab, Escape and outside dismissal, including empty and disabled-only results.

Expected: R5 holds without Menu consuming text editing. Navigation skips hidden/disabled rows and group headings, never wraps, and cannot trap focus. Enter in search neither chooses nor submits. Escape preserves selection and restores trigger focus. Forward Tab exits to the following control when required; outside clicks retain their target. Close clears query/status, and reopen shows the full list. Repeat open with `autoFocus: false` and confirm that existing focus stays put while search remains keyboard reachable.

### V5. Reset, refresh, disabled state and cleanup

Setup: an open filtered control with a selected option and callback counters, plus controls with required validity, a disabled fieldset and dynamically edited options.

Action: reset normally and with a canceled reset event. Change the native value and dispatch change, then modify option text/membership/disabled state and call `refresh()`. Refresh with search focus and a nonterminal caret, with focus on a surviving result and with focus on a removed/hidden result. Disable and enable through the select and fieldset with refresh. Destroy while open, reinitialize, reset again and inspect restored markup/listeners/Menu instances.

Expected: R6 holds. Normal reset closes and synchronizes defaults; cancellation preserves state. Refresh applies the current query to current options without losing search caret or surviving row focus. Invalid controls report native validity on the visible field. Disabled controls close and cannot open. Existing callback counts remain correct. Teardown restores native labels, tab index and DOM, leaves no generated nodes or extra Menu instance, and no pending work mutates the destroyed control.

### V6. Popup boundaries, scrolling and styling

Setup: long grouped results in a short viewport, an RTL field, long translated labels and feedback, a control in an open shadow root, and a control inside a native modal dialog. Use the built CSS and JS in every engine.

Action: filter while scrolled, move focus to off-screen results, resize the viewport and inspect popup placement. Repeat with a 200% root font size, forced colors and reduced motion. Assert ID lookup inside the shadow root and interact with search and selection inside the dialog.

Expected: search and no-results text remain reachable and visible; results scroll without clipping focus or covering the field. Text scaling and RTL preserve operability. Focus and selected/disabled states remain distinguishable in forced colors. Reduced motion follows existing behavior. The popup works in the top layer inside a dialog, shadow-root references resolve, and dismissal/refresh still work. Programmatic root-font scaling is not native zoom or a physical-device test.

### V7. Shared regressions and formats

Action: after a build, run `node --test tests/components.test.js tests/form-values.test.js tests/tree-select.test.js tests/injection.test.js tests/teardown.test.js tests/autoinit.test.js`, then `node --test tests/tree-select-browser.test.js tests/menu-top-layer-browser.test.js tests/expressivecss-web-accessibility-browser.test.js`. Run the full browser suite in V10. Add focused tests for any changed shared Menu path, including Autocomplete, default/multiple selection and existing menu callback/focus behavior.

Expected: existing checks pass without weakening assertions. Non-searchable single and multiple selects, TreeSelect, standalone Menu and Autocomplete keep their established keys, selection and teardown. Selective consumer builds and type declarations pass through V10. No new runtime dependency appears and new functions meet the repository's complexity gate.

## Manual checks

### V8. Visual and accessibility review

Action: inspect the live docs example at narrow and wide widths, in RTL, with long translated labels, and with browser-native 200% zoom. Use keyboard-only navigation to filter, select and submit. Run `npm run test:visual` and open `npm run test:visual:report`, or the documented container equivalent. BaezFJ reviews intended UI changes and records the review in the implementation PR.

Expected: the search input and popup fit, text and focus remain readable, and ordinary select examples do not change. Broken or missing captures do not pass. Current-head visual review is required for merge.

A screen-reader spot check of the popup name, search label, options and no-results announcement is recommended when available. Record the browser/assistive technology and actual observations. The interview did not make this additional manual check a separate merge gate. If skipped, report spoken output as unverified. Browser structure assertions cannot substitute for it.

## Documentation and integration checks

### V9. Source guidance and generated files agree

Action: review the live docs example and Select section of `llm.md` against R1 through R9, including all key behaviors and exclusions. Regenerate with `npm run build:semantics` and `npm run build:skill`, then run `npm run check:generated`. Run the docs build through V10. Review the existing select component decision record and any changed evidence or source pin.

Expected: generated files match their sources; no generated copy was edited by hand. Docs document the exact initialization and i18n names, native submission, popup roles and unsupported modes. Static semantics do not initialize runtime components. Evidence states its actual scope; generation alone renews no runtime or visual approval.

### V10. Budgets, required suites and merge gates

Action: measure equivalent minified JS/CSS gzip artifacts at the base and feature head and review the delta in `tests/selective-builds.test.js`. Run `npm run verify`, followed by `npm run test:browser`. Install MCP dependencies with `npm ci --prefix mcp/expressivecss` if needed, run `npm test --prefix mcp/expressivecss`, then `npm run verify:packages`. Use the documented container commands when host prerequisites are unavailable. Run suites sequentially.

Expected: contributor, three-engine browser, generated-data, docs, MCP and isolated package-consumer checks pass. Record measured size and delta rather than inventing a limit in the specification. Review skips individually; none may stand in for required feature coverage. These commands prepare implementation evidence and do not publish packages.

Before merge, all of the following must hold:

1. Every in-scope R1 through R9 behavior passes its mapped checks, including the grouped-filter-and-native-submit completion check in all three engines.
2. Affected regressions, required contributor/MCP/package checks and generated-data checks pass at the implementation head.
3. JS/CSS gzip changes have reviewed budget records, and intended UI changes have the V8 visual review.
4. Required PR CI passes, conversations are resolved, the branch is up to date, and repository review policy is satisfied. During the single-maintainer stage, the maintainer's own PR needs CI but not independent approval, as `CONTRIBUTING.md` states.
5. Any remaining optional evidence limits are disclosed. No required decision or check remains deferred or blocked. No migration is needed because behavior is opt-in; if implementation changes existing behavior, revisit scope and compatibility before merge.

## Execution record, 2026-10-26 to 2026-10-27

The implementation uses Node 24.21.0 and the installed Chromium, Firefox and WebKit engines. Full suites run sequentially under `taskset -c 0-3` to bound browser concurrency. Baseline and final builds use the same lockfile and gzip normalization as `tests/selective-builds.test.js`.

| Check | Result | Evidence |
| --- | --- | --- |
| Base negative control | Both initial search regressions fail because search is absent. | `.cache/phase63/search-red.log` |
| Grouped search, keyboard and lifecycle slices | Build and typecheck passed for each slice. The lifecycle run passed 283 checks without skips. | `.cache/phase63/lifecycle-tests.log` |
| Broader popup and shared regressions | 421 checks passed without skips before the final small fixes. | `.cache/phase63/boundary-tests.log` |
| Final dedicated search checks | All 31 checks pass, including all three engines, option-image classes and focus recovery. | `.cache/phase63/final-fixes.log` |
| First full contributor attempt | 3,315 passes, one WebKit test assertion failure and three Firefox WebGL2 map skips. The failure immediately checked focus after Escape. Tests now use Playwright's waiting focus assertions. | `.cache/phase63/verify.log` |
| Full contributor rerun | 3,317 passes, zero failures and three Firefox WebGL2 map skips. Build, typecheck, generated data and docs checks pass. | `.cache/phase63/verify-final.log` |
| Explicit three-engine browser suite | 1,626 passes, zero failures and the same three map skips. All new search cases run in every engine. | `.cache/phase63/browser-final.log` |
| MCP and isolated package consumers | Live MCP smoke passes, including eight tools, resources, completion and response budgets. Both isolated package consumers pass, including the final constructor type fixture. | `.cache/phase63/mcp-final.log`, `.cache/phase63/packages-final.log` |
| Guidance and docs after final edits | All 48 guidance checks, generated-data checks, the Astro build and site verification pass. | `.cache/phase63/guidance-final.log` |
| Legacy constructor options | Typecheck, the old constructor options shape and all 31 dedicated search checks pass. | `.cache/phase63/constructor-types-final.log` |
| Visual comparison | All 20 base captures succeed. Four Select-page captures differ after the added section and options; 16 control captures are unchanged. The command exits 1 for these image differences. Human approval is pending. | `.cache/phase63/visual-final.log`, `visual/report/index.html` |

The visual command was `VISUAL_BASE=6f74b3701 taskset -c 0-3 npm run test:visual -- --grep '(select|buttons) @' --workers 2`. It covers buttons, icon buttons, select, tree select and radio buttons at compact, expanded, large and large-dark settings. This is a focused visual comparison, not a whole-site visual pass.

Source review also found that an option image carrying class `optgroup` could enter the group-heading lookup. A regression reproduced the null `aria-owns` failure. The shared filter now selects only direct `li.optgroup` headings. The filter correction is in commit `27204ad77`. The final capability source revision is `823ca3aa4`, which also includes the legacy constructor compatibility correction and its compile fixture. `.cache/phase63/image-class-red.log` retains the negative control.

The full contributor and explicit browser runs preceded the final type-only constructor correction. The constructor now accepts `Partial<FormSelectOptions>` so calls using the previous `{ classes, menuOptions }` shape remain valid. The added fixture in `tests/fixtures/migration-consumer/app.mts` fails with TS2739 against the earlier required-field signature and passes against the final declarations. Final repository typechecking, the consumer compile, 31 search checks, guidance checks, MCP smoke and package consumers pass after this correction.

Minified JavaScript and CSS remain byte-identical across that type-only correction. The before/after SHA-256 records are `.cache/phase63/runtime-hashes-before-types.json` and `.cache/phase63/runtime-hashes-after-types.json`. The post-change search tests exercise the rebuilt ESM and browser bundles, and package checks cover the final declarations and consumers. Local direct fixture compilation uses `--ignoreConfig`, which the installed TypeScript requires when a file is supplied from a directory containing `tsconfig.json`; the isolated package consumer has no conflicting config.

Final reviewed sizes are 106,503 gzip bytes for minified JavaScript, up 1,039 from the confirmed base's 105,464, and 90,754 bytes for CSS, up 145 from 90,609. The source-map stripping matches the budget test. Raw artifact gzip sizes include source-map comments and are not these budget numbers. Measurements are in `.cache/phase63/size-comparison.json`.

No new author-markup rule was needed in `semantics.json`: the existing JSON option attribute enables the feature, and runtime code owns the generated dialog and listbox. The generators synchronize all 99 component guides and contract metadata. The historical capability browser collection remains unchanged; generated guidance does not promote these local tests to renewed operator evidence.

Agent review of the live docs verified grouped keyboard selection, trigger focus recovery and reset. Captures are `.cache/phase63/select-search-desktop.png` and `.cache/phase63/select-search-popup.png`. A component taken from that page and isolated from its navigation also fits a 375px viewport with RTL, dark colors, 32px root text and long translated labels/messages. Its popup spans x=16 to x=359 and y=187 to y=435 in a 375x812 viewport. The capture and measurements are `.cache/phase63/select-search-rtl-enlarged.png` and `.cache/phase63/rtl-review.json`. This is programmatic font scaling, not browser-native zoom.

T3's collaborative snapshot operation timed out twice, so the installed Playwright workflow supplied these captures. Astro's agent background mode initially resolved the relative docs root into `docs/docs` and timed out; the foreground `--ignore-lock` invocation served the correct page. The misplaced generated files were moved into `.cache/phase63/astro-background-root`, preserving them outside the tracked source.

Human visual approval, native browser zoom, spoken screen-reader output and physical-device checks have not been performed. PR CI and review are not available because this task does not open or push a PR. Those limits must remain explicit before merge. The supplemental Definition of Done file referenced by the incremental-implementation skill was absent at its resolved path; repository checks in `CONTRIBUTING.md` define the local verification here.
