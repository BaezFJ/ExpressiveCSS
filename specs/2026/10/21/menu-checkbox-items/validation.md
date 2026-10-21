# Validation: menu checkbox items

Roadmap phase: Phase 11, menu checkbox items. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md).

Results were recorded on 2026-10-21 on branch `feature/2026-10-21-menu-checkbox-items`. Tests run against built bundles, so build first. Browser tests skip an engine whose executable is missing; a skipped engine does not count as a pass.

## Automated checks

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R2, R4 | A menu with two `menuitemcheckbox` items, one starting at `aria-checked="false"`, in Chromium, Firefox and WebKit. A listener counts `expressive:change` on the trigger. | Open the menu by keyboard, press Space on the item twice, then click it once. | `aria-checked` reads `"true"`, `"false"`, `"true"` after each step. The menu stays open throughout, focus stays on the item after each key, and three events arrive with `detail.item` set to the row and `detail.checked` matching the attribute. | Passed 2026-10-21 in Chromium, Firefox and WebKit, none skipped. |
| V2 | R1, R3, R4 | Same menu, default `closeOnClick`, all three engines. | Open the menu by keyboard and press Enter on the unchecked item. | The item reads `aria-checked="true"`, one `expressive:change` arrives, the menu closes and focus returns to the trigger. | Passed 2026-10-21 in Chromium, Firefox and WebKit, none skipped. |
| V3 | R1, R4 | jsdom menu with a checkbox item that has no `aria-checked`, plus `onItemClick` and listeners for `expressive:select` and `expressive:change` that record the attribute they see. | Click the item. | The item reads `aria-checked="true"`. The order is `onItemClick`, `expressive:select`, `expressive:change`, and each saw `"true"`. `detail.checked` is the boolean `true`. | Passed 2026-10-21. |
| V4 | R5 | jsdom checkbox items disabled by `.disabled` and by `aria-disabled="true"`. | Click each, and press Enter and Space on each. | `aria-checked` is unchanged, no `expressive:change` or `expressive:select` fires and the menu stays open. | Passed 2026-10-21. |
| V5 | R3, R5 | jsdom menu with a plain `menuitem`, a `menuitemradio` and a checkbox item; a second menu with `closeOnClick: false`. | Click the plain and radio items; press Enter on the checkbox item in the second menu. | Plain and radio items close the menu as before, their `aria-checked` is unchanged and no `expressive:change` fires. With `closeOnClick: false`, Enter toggles the checkbox item and the menu stays open. | Passed 2026-10-21. |
| V6 | R6 | A checkbox item inside a submenu, and one inside a Menubar menu. | Open each, toggle the item by click and by Space. | Each toggle flips `aria-checked`, fires one `expressive:change` and leaves the menu and submenu open. | Passed 2026-10-21 in jsdom (submenu and Menubar). |
| V7 | R5 | Existing suites. | Run the menu, menubar, context menu, menu field (Select, Autocomplete) and `tests/components.test.js` cases. | All pass, including "preserves radio and checkbox menu item roles". | Passed 2026-10-21: 269 tests across the menu, menubar, context menu, mega menu, menu field, shadow delegation and components suites, run one file at a time. |
| V8 | R7 | Group 3 edits. | `npm run build:skill`, then `npm run check:generated`. Read the menu docs, the Menu section and events table of `llm.md`, and the changelog. | Generation is clean. The docs describe the toggle, when the menu closes and the event detail, and the changelog has the migration note. | Passed 2026-10-21. `semantics.json` needed no change. |
| V9 | R8 | A fresh build. | Run `node --test tests/selective-builds.test.js` . | The test passes with a new reviewed budget line naming this change and its gzip bytes. | Passed 2026-10-21 with `node --test tests/selective-builds.test.js`: JavaScript 89,222 gzip bytes (+168), CSS unchanged. |
| V10 | R1 to R8 | Clean tree on the branch. | `npm run verify`. | Passes. | Passed 2026-10-21: 2,295 passed, 3 optional evaluation-SDK tests skipped. |
| V11 | R7 | Regenerated skill and MCP copies. | `npm test --prefix mcp/expressivecss`. | Passes. | Passed 2026-10-21. |
| V12 | R7, R8 | Built packages. | `npm run verify:packages`. | Passes. | Passed 2026-10-21. |

The browser file from plan group 1 runs with `node --test tests/menu-checkbox-browser.test.js` after `npm run build:js` and `npm run build:css`.  `npm run test:browser` runs every browser test. Run suites one at a time, since parallel browser runs flake.

## Manual checks

None are required for merge. A screen reader pass that hears "checked" and "not checked" announced on toggle is useful but optional.

## Merge conditions

- V1 to V12 pass, with all three engines run for V1, V2 and V6.
- Existing menu, menubar, Select and Autocomplete tests pass (V7).
- The fallow pre-commit gate passes on the new functions.
- Required CI checks pass and the pull request is reviewed.
- The changelog's migration note is present, since existing pages that flip `aria-checked` themselves change behavior.
