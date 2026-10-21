# Menu radio groups

Date: 2026-10-21
Roadmap phase: Phase 12, menu radio groups
Branch: `feature/2026-10-21-menu-radio-groups`
Base: `origin/master` at `02f5e3fc47a97530cf7a0d8cae89841a02074785`, fetched 2026-10-21
Status: implemented and locally verified 2026-10-21; required CI and review pending

Follow the [mission's product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 12](../../../../roadmap.md#phase-12-menu-radio-groups). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase eligibility

Phases 1 through 10 are marked completed in the roadmap. Phase 11, menu checkbox items, merged in #376 as `02f5e3fc`, and its [spec](../menu-checkbox-items/) records local validation. The roadmap does not mark Phase 11 completed yet; this workflow leaves the roadmap unchanged. Phase 12 is the first unfinished phase, and its only dependency is Phase 11.

## Current behavior

These facts come from the source at the base commit.

- `_toggleChecked()` in `src/ts/components/menu.ts` flips `aria-checked` only on a `menuitemcheckbox` row. A `menuitemradio` row falls through to the plain path: a click, Enter or Space fires `onItemClick` and `expressive:select` with `{ item }`, then closes the menu while `closeOnClick` is true. Menu never writes `aria-checked` on a radio item.
- Menu treats only the direct `li` children of a list as rows. `_moveFocus()` reads `list.children`, `_focusInitialItem()` and `_focusFocusedItem()` read `menuEl.children`, and type-ahead reads `:scope > li`. Rows inside a nested list cannot be reached by arrow keys or type-ahead.
- An `li` that holds a `menu` is a submenu trigger (`_setupSubmenus()`, `_isSubmenuTriggerClick()`). An `li` that holds a `ul` is not.
- `_makeMenuFocusable()` gives every `li` in the menu `tabindex="0"` unless it is a divider, gap, label or optgroup, so a wrapper `li` around a group would become a focus stop.
- `_setupAccessibility()` walks `menu` elements only. Role-less `li` rows inside a `ul` get no `menuitem` role and no `aria-disabled` from `.disabled`.
- `src/sass/components/_menu.scss` styles rows with `> li` selectors. Rows one level deeper get none of the row styles. `li[aria-checked="true"]` already takes the selected style.
- The Theme behavior (`src/ts/behaviors/theme.ts`) writes `aria-checked` on `menuitemradio` controls that carry `data-theme-set`. The docs theme menu (`#theme-menu` in `docs/src/layouts/DocsLayout.astro`) is a flat list of three `menuitemradio` rows that `docs/static/docs.js` syncs from `onItemClick`.
- The menu docs (`docs/src/pages/menu.astro`, selection section) and the Menu section of `llm.md` tell authors to keep radio items in sync themselves.

A page that wants a single-choice menu today has to write the check and uncheck logic, and there is no supported way to put two choices in one menu.

## Decisions from the interview

The user answered on 2026-10-21.

- Plan: five task groups, tests first. Group markup support (focus movement and Sass) is separate from the radio check logic. Branch from freshly fetched `origin/master`.
- Markup: a group is `<li role="none"><ul role="group" aria-label="…">` holding the radio items as its `li` children. A `ul` keeps groups apart from submenus, which stay `li > menu`. Radio items outside any group act as one group per list, so flat radio menus such as the docs theme menu keep working.
- Closing: click and Enter check the item and close the menu, as they close it today. Space checks the item and keeps the menu open, as the [ARIA APG menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) describes. Choosing an item that is already checked fires no change event.
- Validation: the roadmap's browser check in Chromium, Firefox and WebKit, jsdom edge cases, and docs, generated files and a reviewed gzip budget. Full local contributor runs were not chosen as merge conditions; see [validation.md](validation.md#merge-conditions).

### Agent decisions within the confirmed design

These are proposals made while writing the spec. The user can overturn any of them in review.

- `expressive:change` for a radio item carries the same detail as a checkbox item, `{ item, checked }`, with `checked` always `true`. Listeners can handle both kinds with one handler. The previously checked item is not reported; a listener can query the group.
- `aria-checked` changes on every radio in the group before `onItemClick` runs, matching the Phase 11 order.
- A group may also hold plain `menuitem` and `menuitemcheckbox` rows. They get the same setup, focus movement and styles as other group rows, and only radio rows take part in the single choice.
- A radio item's group is its nearest `[role="group"]` ancestor inside the menu. Without one, the group is the radio rows that are direct children of the same `menu` element.
- Space keeping a radio menu open does not depend on `closeOnClick`. Click and Enter close only while `closeOnClick` is true.
- `semantics.json` gains a forbid rule for a `ul[role="group"]` inside a `menu` that has neither `aria-label` nor `aria-labelledby`, since the group name is the author's static semantics.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | A menu or submenu accepts groups written as `<li role="none"><ul role="group">` with an `aria-label` or `aria-labelledby` on the `ul`. The author writes `role="none"`, `role="group"` and the name. Menu does not make the wrapper `li` a focus stop or give it a `menuitem` role. Rows inside the group get the same setup as direct rows: `role="menuitem"` when they have no role, `aria-disabled="true"` from `.disabled`, and `tabindex`. A `ul` inside an `li` never counts as a submenu. |
| R2 | Up, Down, Home and End move focus through the rows of a list in document order, crossing into and out of groups as if the group rows were direct rows. The wrapper `li` is skipped. Type-ahead and the initial focus on open find rows inside groups. Focus movement still stays within one submenu level. |
| R3 | Rows inside a group look and size the same as direct rows, including hover, focus, disabled and the selected style for `aria-checked="true"`. The group adds no visible box of its own. Authors separate groups with the existing `.divider`, `.gap` or `.label` rows. |
| R4 | Activating an enabled, unchecked `li[role="menuitemradio"]` by click, Enter or Space sets its `aria-checked` to `"true"` and sets `"false"` on every other `menuitemradio` row in its group. Rows in other groups do not change. Activation through the row's own `a` or `button` counts the same as activation on the `li`. |
| R5 | Radio items outside any group form one group per `menu` element: the radio rows that are its direct children. |
| R6 | Activating a radio item that is already checked changes no `aria-checked` value and fires no `expressive:change`. `onItemClick` and `expressive:select` still fire, and the menu closes as R7 describes. |
| R7 | A click or Enter on a radio item closes the menu while `closeOnClick` is true, returning focus the same way a plain item does today. Space checks the item and keeps the menu open, whatever `closeOnClick` says, with focus on the item. |
| R8 | Each change fires exactly one `expressive:change` from the trigger element, with `detail` `{ item, checked: true }`. `onItemClick` and `expressive:select` fire first, in their current order, and every listener reads the new `aria-checked` values. If a callback or listener destroys the instance, later notifications stop, as `_notify` already ensures. |
| R9 | Existing behavior stays. A disabled radio item does not check, fire events or close the menu. Checkbox items keep their Phase 11 behavior, inside or outside a group. Plain items and submenu triggers behave as before. The Theme behavior still marks `[data-theme-set]` controls, and because Menu writes the same values, the two agree. The docs theme menu keeps working. Select and Autocomplete are unchanged. |
| R10 | A group inside a submenu, or inside a Menubar menu, behaves as R1 to R8 describe. |
| R11 | Docs and generated guidance describe the new contract. The menu page's selection section and the Menu section of `llm.md` show the group markup, say that the framework checks radio items, and say when the menu closes. "Keep radio items in sync yourself" goes away. The events table in `llm.md` lists Menu radio items under `expressive:change` with `{ item, checked }`. The unreleased changelog says Menu now checks radio items, that Space on a radio item no longer closes the menu, and that page code syncing radio items can be removed. `semantics.json` gains the group-name rule, `npm run build:semantics` and `npm run build:skill` regenerate the derived files, and `npm run check:generated` passes. |
| R12 | The bundle size change is recorded in reviewed gzip budget lines in `tests/selective-builds.test.js`, for JavaScript and for CSS if the Sass change moves it. New functions stay below cyclomatic complexity 5 for the fallow pre-commit gate. |

## Constraints and dependencies

- Phase 11's `_toggleChecked()`, `_closesOnClick()` and `_closeAfterEnter()` are the starting point. Extend them rather than adding a second activation path.
- `role="none"`, `role="group"`, the group name and `role="menuitemradio"` are static semantics and stay the author's. Menu manages only `aria-checked`, per the mission's product rules.
- Use the existing `_notify` and `Utils.emit` helpers. Add no dependencies and no public option.
- Read the [Sass architecture](../../../../../src/sass/README.md) before changing `_menu.scss`. Text-holding rows keep their `rem()` sizes.
- Tests run against built bundles. Build before testing, and tear instances down in `finally` blocks.

## Out of scope

- Groups written with `aria-owns` or as a flat `li role="group"` header, as Select's optgroup does.
- A group that is also a submenu, or a `menuitemradio` row that opens a submenu.
- Unchecking the last checked radio item, or a required-choice option.
- Writing `aria-checked` on initialization for radio items that lack it.
- A check icon or other new styling for checked items.
- Changes to the Theme behavior or the docs theme menu beyond keeping them working.
- Roadmap edits, release and publication.

## Open decisions

None. The agent decisions above stand unless the user changes them in review.
