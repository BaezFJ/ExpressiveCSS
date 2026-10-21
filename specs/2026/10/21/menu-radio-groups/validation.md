# Validation: menu radio groups

Roadmap phase: Phase 12, menu radio groups. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

Every result is pending; the feature is not built. Tests run against built bundles, so build first with `npm run build:js` and `npm run build:css`. Browser tests skip an engine whose executable is missing; a skipped engine does not count as a pass. Run suites one at a time, since parallel browser runs flake.

## Automated checks

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R2, R4, R7, R8 | A menu with two named groups of three `menuitemradio` items, one checked in each, separated by a `.divider`, in Chromium, Firefox and WebKit. A listener counts `expressive:change` on the trigger. | Open by keyboard. Press Down from the last row of group 1. Press Up, then Space on an unchecked group 1 item. Click an unchecked group 2 item. Reopen and press Enter on another group 1 item. | Down reaches the first row of group 2. After Space, only that item is checked in group 1, group 2 is unchanged, the menu stays open with focus on the item, and one event arrives. After the click, only that item is checked in group 2, group 1 is unchanged, the menu closes, and one event arrives. After Enter, group 1 changes again, the menu closes, focus returns to the trigger, and one event arrives. Each `detail` is `{ item, checked: true }`. | Pending |
| V2 | R1, R2, R3 | A menu with a direct row, a `.label`, a group and a final direct row, in all three engines. | Open by keyboard. Press End, Home and a letter that starts a group row. Compare a group row's box and computed colors with a direct row's, and a checked group row's with a checked direct row's. | Home and End reach the first and last rows, type-ahead focuses the group row, and initial focus lands on the first row. The wrapper `li` never takes focus. Group rows match direct rows in height, padding and selected colors. | Pending |
| V3 | R4, R8 | jsdom menu with one group of radio items, plus `onItemClick` and listeners for `expressive:select` and `expressive:change` that record the `aria-checked` values they see. | Click an unchecked item. | The item reads `"true"` and its siblings `"false"`. The order is `onItemClick`, `expressive:select`, `expressive:change`, and each saw the new values. `detail.checked` is the boolean `true`. | Pending |
| V4 | R6 | jsdom menu with a checked radio item. | Click it, then press Space and Enter on it. | No `aria-checked` value changes and no `expressive:change` fires. `onItemClick` and `expressive:select` fire each time. Click and Enter close the menu; Space leaves it open. | Pending |
| V5 | R5, R7, R9 | jsdom menus with: radio items disabled by `.disabled` and by `aria-disabled="true"`; flat radio items with no group; a group holding a plain item, a checkbox item and radio items; and a radio menu with `closeOnClick: false`. | Activate each item by click, Enter and Space. | Disabled items change nothing, fire nothing and leave the menu open. Flat radio items act as one group. In the mixed group, the plain item closes the menu with no change event, the checkbox item toggles as in Phase 11, and only radio rows uncheck each other. With `closeOnClick: false`, click and Enter check and leave the menu open. | Pending |
| V6 | R9 | jsdom Menu of `menuitemradio` items with `data-theme-set="light"`, `"dark"` and `"auto"`, with `Theme.Init()` running. | Click the dark item. | Only the dark item reads `aria-checked="true"`, the root's `theme` is `dark`, and one `expressive:change` fires. | Pending |
| V7 | R10 | A group inside a submenu, and a group inside a Menubar menu. | Open each, then check an item by click and by Space. | Each check unchecks only the other radio items of that group and fires one event. Space leaves the menu and submenu open. | Pending |
| V8 | R1, R9 | Existing suites. | Run `tests/menu.test.js`, `tests/components.test.js`, `tests/menu-checkbox-browser.test.js`, `tests/menu-keys-placement-browser.test.js`, `tests/menubar-browser.test.js`, `tests/context-menu-browser.test.js`, `tests/mega-menu-browser.test.js` and `tests/menu-field-browser.test.js`, one file at a time with `node --test`. | All pass, including "preserves radio and checkbox menu item roles" and the Phase 11 checkbox cases. | Pending |
| V9 | R11 | Plan group 4 edits. | `npm run build:semantics`, `npm run build:skill`, then `npm run check:generated`. Read the menu docs, the Menu section and events table of `llm.md`, the changelog and the new `semantics.json` rule. | Generation is clean. The docs show the group markup and describe checking, closing and the event. The changelog has the change note. The rule flags an unnamed `ul[role="group"]` inside a `menu`. | Pending |
| V10 | R12 | A fresh build. | `node --test tests/selective-builds.test.js`. | The test passes with reviewed budget lines naming this change and its gzip bytes for JavaScript, and for CSS if it moved. | Pending |

The browser file name in V1 and V2 comes from plan group 1 and does not exist yet. The other commands are the ones Phase 11 ran.

## Recommended, not required for merge

`tech-stack.md` asks for `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages` before submitting. The user did not choose them as merge conditions on 2026-10-21. Run them when time allows and record the results here.

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
