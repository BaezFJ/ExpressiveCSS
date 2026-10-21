# Validation: menu radio groups

Roadmap phase: Phase 12, menu radio groups. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

Results were recorded on 2026-10-21 on branch `feature/2026-10-21-menu-radio-groups`. Tests run against built bundles, so build first with `npm run build:js` and `npm run build:css`. Browser tests skip an engine whose executable is missing; a skipped engine does not count as a pass. Run suites one at a time, since parallel browser runs flake.

## Automated checks

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R2, R4, R7, R8 | A menu with two named groups of three `menuitemradio` items, one checked in each, separated by a `.divider`, in Chromium, Firefox and WebKit. A listener counts `expressive:change` on the trigger. | Open by keyboard. Press Down from the last row of group 1. Press Up, then Space on an unchecked group 1 item. Click an unchecked group 2 item. Reopen and press Enter on another group 1 item. | Down reaches the first row of group 2. After Space, only that item is checked in group 1, group 2 is unchanged, the menu stays open with focus on the item, and one event arrives. After the click, only that item is checked in group 2, group 1 is unchanged, the menu closes, and one event arrives. After Enter, group 1 changes again, the menu closes, focus returns to the trigger, and one event arrives. Each `detail` is `{ item, checked: true }`. | Passed 2026-10-21 in Chromium, Firefox and WebKit, none skipped. |
| V2 | R1, R2, R3 | A menu with a direct row, a `.label`, a group and a final direct row, in all three engines. | Open by keyboard. Press End, Home and a letter that starts a group row. Compare a group row's box and computed colors with a direct row's, and a checked group row's with a checked direct row's. | Home and End reach the first and last rows, type-ahead focuses the group row, and initial focus lands on the first row. The wrapper `li` never takes focus. Group rows match direct rows in height, padding and selected colors. | Passed 2026-10-21 in Chromium, Firefox and WebKit, none skipped. |
| V3 | R4, R8 | jsdom menu with one group of radio items, plus `onItemClick` and listeners for `expressive:select` and `expressive:change` that record the `aria-checked` values they see. | Click an unchecked item. | The item reads `"true"` and its siblings `"false"`. The order is `onItemClick`, `expressive:select`, `expressive:change`, and each saw the new values. `detail.checked` is the boolean `true`. | Passed 2026-10-21. |
| V4 | R6 | jsdom menu with a checked radio item. | Click it, then press Space and Enter on it. | No `aria-checked` value changes and no `expressive:change` fires. `onItemClick` and `expressive:select` fire each time. Click and Enter close the menu; Space leaves it open. | Passed 2026-10-21. |
| V5 | R5, R7, R9 | jsdom menus with: radio items disabled by `.disabled` and by `aria-disabled="true"`; flat radio items with no group; a group holding a plain item, a checkbox item and radio items; and a radio menu with `closeOnClick: false`. | Activate each item by click, Enter and Space. | Disabled items change nothing, fire nothing and leave the menu open. Flat radio items act as one group. In the mixed group, the plain item closes the menu with no change event, the checkbox item toggles as in Phase 11, and only radio rows uncheck each other. With `closeOnClick: false`, click and Enter check and leave the menu open. | Passed 2026-10-21, in three cases: disabled items, flat items, and the mixed group. |
| V6 | R9 | jsdom Menu of `menuitemradio` items with `data-theme-set="light"`, `"dark"` and `"auto"`, with `Theme.Init()` running. | Click the dark item. | Only the dark item reads `aria-checked="true"`, the root's `theme` is `dark`, and one `expressive:change` fires. | Passed 2026-10-21. |
| V7 | R10 | A group inside a submenu, and a group inside a Menubar menu. | Open each, then check an item by click and by Space. | Each check unchecks only the other radio items of that group and fires one event. Space leaves the menu and submenu open. | Passed 2026-10-21 in jsdom (submenu and Menubar). |
| V8 | R1, R9 | Existing suites. | Run `tests/menu.test.js`, `tests/components.test.js`, `tests/menu-checkbox-browser.test.js`, `tests/menu-keys-placement-browser.test.js`, `tests/menubar-browser.test.js`, `tests/context-menu-browser.test.js`, `tests/mega-menu-browser.test.js` and `tests/menu-field-browser.test.js`, one file at a time with `node --test`. | All pass, including "preserves radio and checkbox menu item roles" and the Phase 11 checkbox cases. | Passed 2026-10-21, one file at a time: menu 34, components 66, menu checkbox 6, keys and placement 27, menubar 3, context menu 9, mega menu 3, menu field 135. A static CSS test now allows the selected rule's selector list to include the group row selector. |
| V9 | R11 | Plan group 4 edits. | `npm run build:semantics`, `npm run build:skill`, then `npm run check:generated`. Read the menu docs, the Menu section and events table of `llm.md`, the changelog and the new `semantics.json` rule. | Generation is clean. The docs show the group markup and describe checking, closing and the event. The changelog has the change note. The rule flags an unnamed `ul[role="group"]` inside a `menu`. | Passed 2026-10-21. The rule matched only the unnamed `ul[role="group"]` in a fixture with one unnamed, one `aria-label` and one `aria-labelledby` group. |
| V10 | R12 | A fresh build. | `node --test tests/selective-builds.test.js`. | The test passes with reviewed budget lines naming this change and its gzip bytes for JavaScript, and for CSS if it moved. | Passed 2026-10-21: JavaScript 89,369 gzip bytes (+147, recorded as +30 and +117) and CSS 84,513 (+447). The CSS growth comes from the group row selector added to every row rule, in menus and submenus. |

V1 and V2 live in `tests/menu-radio-browser.test.js`; run it with `node --test tests/menu-radio-browser.test.js`. The new jsdom cases failed against the bundle built before each change, for the expected reason. The browser cases were written alongside the change and were not run against the old bundle.

## Recommended, not required for merge

`tech-stack.md` asks for `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages` before submitting. The user did not choose them as merge conditions on 2026-10-21. All three passed on 2026-10-21: `npm run verify` ran 2,318 tests with none failing or skipped, the MCP smoke test passed, and `verify:packages` verified the isolated MCP package.

## Known limits

- In a `.grouped` menu, the group wrapper counts as one surface segment. Rows inside it take the state layer on the row itself instead of on its inner button. No test covers this layout.
- The docs theme menu was not clicked through in a browser. V6 covers the Theme behavior in jsdom.

## Manual checks

None are required for merge. These are useful but optional:

- A screen reader pass that hears the group name on entering a group and "checked" on the chosen item.
- Clicking each choice in the docs theme menu and seeing the theme change and the menu close.

## Merge conditions

- V1 to V10 pass, with all three engines run for V1 and V2.
- The existing menu, menubar, context menu, mega menu, Select and Autocomplete tests pass (V8).
- The fallow pre-commit gate passes on the new functions.
- The repository's required CI checks pass and the pull request is reviewed.
- The changelog notes that Menu now checks radio items and that Space keeps a radio menu open.
