# Validation: tree select

Roadmap phase: Phase 47, tree select. Requirements are in [requirements.md](requirements.md) and the work in [plan.md](plan.md).

Every result is pending, because the feature is not built yet. Browser checks run against built bundles after `npm run build`, one suite at a time. The commands `node --test tests/tree-select-browser.test.js` and `node --test tests/tree-select.test.js` follow the pattern of earlier test files and have not been run, since the files do not exist yet.

The fixture for V1, V3 to V5 and V7 is a `<form>` holding a labelled `<select name="place" data-tree>` with these options, in this order, started by AutoInit, plus a submit button:

- `value=""`, `disabled selected`: Choose a place
- `value="europe"`, `disabled`: Europe
- `value="france"`, `data-parent="europe"`, `disabled`: France
- `value="paris"`, `data-parent="france"`: Paris
- `value="lyon"`, `data-parent="france"`: Lyon
- `value="spain"`, `data-parent="europe"`: Spain
- `value="asia"`, with no `disabled`: Asia
- `value="tokyo"`, `data-parent="asia"`: Tokyo
- `value="kyoto"`, `data-parent="asia"`, `disabled`: Kyoto

Asia has no `disabled` in the markup, so the fixture also checks that the component disables a branch itself.

## Automated checks

| ID | Covers | Setup and action | Expected result | Result |
| --- | --- | --- | --- | --- |
| V1 | R1, R3, R5, R7 | In Chromium, Firefox and WebKit: focus the field and press Enter. Press ArrowRight, ArrowDown, ArrowRight, ArrowDown and Enter. Read `new FormData(form).get('place')` and the entry in a `submit` handler's form data. | The popup opens with `role="tree"` and focus on Europe. Europe and France get `aria-expanded="true"` in turn, and focus reaches Paris. After Enter the popup is closed, the field shows `Paris`, Paris has `aria-selected="true"`, and both form data reads return `paris`. | Passed 2026-10-25 in Chromium, Firefox and WebKit. The tree is the `ul[role="tree"]` inside the popup; see the implementation notes. |
| V2 | R2 | In jsdom, run the tree helper on: the fixture's options; options listed with a child before its parent; a `data-parent` naming no option; an empty `data-parent`; an option naming itself; two options naming each other, one with a child; two options with the same value, one of them named as a parent. | The fixture gives roots Choose a place, Europe and Asia, with France and Spain under Europe and Paris and Lyon under France, in document order. A child listed first still sits under its parent. The missing, empty and self-naming parents give roots. The two looping options both become roots and the child stays under its parent. Children go under the first option with the shared value. | Passed 2026-10-25, through the rendered rows in `tests/tree-select.test.js`. |
| V3 | R4 | In Chromium, Firefox and WebKit, open the popup on the fixture and check each key: ArrowDown and ArrowUp at both ends; ArrowRight on a closed branch, an open branch and a leaf; ArrowLeft on an open branch, a child and a closed root; Home and End; `*` on Europe; typing `t` with Asia open and `ly` with France open; Escape and Tab. Repeat the arrow keys under `dir="rtl"`. | Focus moves over visible, enabled rows only, without wrapping, and skips Kyoto. ArrowRight opens, then moves to the first child, then does nothing. ArrowLeft closes, then moves to the parent, then does nothing. `*` opens Europe and Asia. Typing reaches Tokyo and Lyon. Escape closes and focuses the field; Tab closes. Under `rtl` ArrowLeft and ArrowRight swap. No key chooses a branch. | Passed 2026-10-25 in all three engines, in both directions, with typeahead, Escape and Tab as separate tests. |
| V4 | R5 | In all three engines, with a `change` listener on the select: click Asia twice, click Kyoto, click Tokyo, open again and click Tokyo again. | Each click on Asia toggles it and the popup stays open. Kyoto does nothing. Tokyo closes the popup, shows `Tokyo` and fires one `change`. Choosing Tokyo again fires no `change`. | Passed 2026-10-25 in all three engines. The Kyoto click is forced, since a disabled row takes no pointer events; it also checks that Asia stays open. |
| V5 | R6, R7 | In jsdom: start the fixture and read the branch options; add `required` and call `checkValidity()`; choose Paris, call `form.reset()` and wait a task; start a copy whose markup selects France and read `new FormData(form)`; start a copy on a disabled select and try to open it. | Europe, France and Asia are `disabled`, and the Asia row has no `aria-disabled`. The required select fails `checkValidity()` and shows the browser's message. After reset the field shows `Choose a place`. The France copy shows `France` and its form data has no `place` entry. The disabled copy does not open. | Passed 2026-10-25. The France case reads its form data in a browser, because jsdom includes disabled options. Extra cases: a select with no placeholder chooses the first enabled leaf, and one with no enabled leaf chooses nothing and fails `required`. |
| V6 | R8, R9, R10 | In jsdom: open Europe, add an option under Spain, remove Lyon and call `refresh()`; call `destroy()` and read every option's `disabled` and the DOM; call `FormSelect.init()` on a fresh fixture after AutoInit and count the wrappers. | After `refresh()` Europe is still open, Spain is a branch with its own `disabled`, and Lyon's row is gone. After `destroy()` only Choose a place, Europe, France and Kyoto are `disabled`, as in the markup, and the select is back in its original place with no listeners left. `FormSelect.init()` adds no second wrapper and leaves the TreeSelect instance in place. | Passed 2026-10-25. Extra browser cases: `refresh()` keeps open branches and focus, moves focus off a row that became disabled, and a failed `reportValidity()` moves focus to the field. A jsdom case opens a field inside a page `<li>` and inside a page's own ARIA tree. A code review on 2026-10-25 added a browser check that the chosen row shows focus, jsdom checks that a branch the browser picks by default gives way to the first enabled leaf while one the markup selects stays, and a typeahead check; each guarding mutation now fails a test. |
| V7 | R11 | In all three engines, open the popup with Europe and France open, under `ltr` and `rtl`. Read each level's text start and the chevron's transform before and after opening a branch. In `tests/forced-colors.test.js`, check the compiled CSS for the forced-colors chevron and chosen-row rules and the reduced-motion rule. | Each level's text starts further from the inline start edge than its parent's, on the mirrored side under `rtl`. The chevron turns when a branch opens. The static checks find the forced-colors and reduced-motion rules. | Passed 2026-10-25 in all three engines, in both directions, with sibling alignment and disabled colors at each depth. The reduced-motion check is in `tests/reduced-motion.test.js`. |
| V8 | R12 | In `tests/semantics.test.js`, check `data-tree` on a `<div>`, on a `select[multiple]`, an `<optgroup>` inside `select[data-tree]`, `option[data-parent]` inside a plain select, and the fixture's markup. | The rule flags the first four and passes the fixture. The check does not start components. | Passed 2026-10-25. |
| V9 | R1, R14 | `node --test tests/selective-builds.test.js tests/autoinit.test.js` | Both pass with the reviewed JavaScript and CSS budget lines and the new AutoInit fixture count. | Passed 2026-10-25: after the rebase onto master at `abf25eb0f`, 105,464 JavaScript gzip bytes (+1,857 over master's build) and 90,048 CSS (+345), 47 AutoInit fixtures. The full `npm run verify` passed 2,886 of 2,890; the four failures (sheet spring, swipe drag, codex adapter streams, docker runner SIGINT) passed alone, and typecheck, `check:generated`, the Astro build and `docs:verify` then passed. |
| V10 | R13 | After `npm run build:skill` as the last generation step, run `npm run check:generated` and `node --test tests/expressivecss-skill.test.js tests/expressivecss-version-resolution.test.js tests/expressivecss-component-decisions.test.js tests/docs-astro.test.js`. | Generated files are clean, the guide counts match, and the docs list TreeSelect in both AutoInit tables. | Passed 2026-10-25 with 99 guides after the rebase, and the basic-button reading budget at 49,778 bytes (+296). `npm run docs:build:astro` and `npm run docs:verify` passed (127 pages), the built page's demo chose Paris by keyboard in Chromium with no page errors, and `npm test --prefix mcp/expressivecss` passed. |
| V11 | R13, R14 | The repository's required CI checks on the pull request. | All pass. | Pending |

V1, V3, V4 and V7 run in `tests/tree-select-browser.test.js`, one test per check. V2, V5 and V6 run in `tests/tree-select.test.js`.

## Manual checks

These are not merge conditions.

| ID | Covers | Action | Expected result | Result |
| --- | --- | --- | --- | --- |
| M1 | R3, R4 | With VoiceOver on macOS and NVDA on Windows, open the fixture's popup, move through it, expand Europe and France, and choose Paris. | Each row is read as a tree item with its level, its position and, for a branch, whether it is expanded. The field is read as a combobox with the chosen leaf. | Pending |
| M2 | R5 | On iOS Safari and Android Chrome, tap the field, tap Asia and tap Tokyo. | The first tap opens the popup, Asia opens without closing it, and Tokyo is chosen. | Pending |

## Merge conditions

- V1, the roadmap's completion check, passes in Chromium, Firefox and WebKit.
- V3, the full keyboard contract tests, passes in all three engines.
- V2, V5 and V6, the jsdom logic tests, pass.
- V4 and V7 to V10 pass, so pointer behavior, styles, semantics, budgets, AutoInit and generated files hold.
- V11, the repository's required CI checks and reviews, pass.

A local `npm run verify` run is not a merge condition. The manual checks are not merge conditions.
