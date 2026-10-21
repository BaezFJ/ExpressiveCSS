# Menu checkbox items

Date: 2026-10-21
Roadmap phase: Phase 11, menu checkbox items
Branch: `feature/2026-10-21-menu-checkbox-items`
Base: `origin/master` at `182d9af6490757f744492fc276f36c575b556204`, fetched 2026-10-21
Status: implemented and locally verified; required CI and review pending

Follow the [mission's product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 11](../../../../roadmap.md#phase-11-menu-checkbox-items). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase eligibility

Phases 1 through 10 are marked completed in the roadmap, each with a merged spec. Phase 11 opens the "component gaps" milestone and has no dependency. Phase 12, menu radio groups, depends on it.

## Current behavior

These facts come from the source at the base commit.

- `_setupAccessibility()` in `src/ts/components/menu.ts` gives an `li` without a role `role="menuitem"` and keeps an authored role. `tests/components.test.js` ("preserves radio and checkbox menu item roles") checks that `menuitemradio` and `menuitemcheckbox` survive initialization.
- Nothing in `src/ts` reads or writes `aria-checked` on a `menuitemcheckbox`. The only `aria-checked` writer for menu items is the Theme behavior (`src/ts/behaviors/theme.ts`), and it handles `menuitemradio` and `radio` only.
- `_handleMenuClick()` fires `onItemClick` and `expressive:select` with `{ item }` for any enabled `li`. A disabled row (`.disabled` or `aria-disabled="true"`) stops the click.
- The document click handler closes the menu after any click inside it while `closeOnClick` is true, the default.
- `_handleMenuKeydown()` turns Enter and Space on the focused row into a `click()` on its `a` or `button`, or on the `li` itself. Both keys therefore close the menu the same way a click does.
- `src/sass/components/_menu.scss` already styles `li[aria-checked="true"]` as selected, so a checked item looks checked with no CSS change.
- The menu docs (`docs/src/pages/menu.astro`, selection section) tell authors to give items `role="menuitemcheckbox"` "and synchronize `aria-checked`" themselves.
- Menubar starts one Menu per item (`src/ts/components/menubar.ts`), so its menus share this code. Select and Autocomplete also host a Menu, but their rows are `role="option"` in a `listbox`, so this phase does not touch them.

Today a page that wants a checkbox menu has to write the toggle and re-open the menu after every choice. The mission lists menu checkbox items as one of the gaps that push authors into their own script.

## Decisions from the interview

The user answered on 2026-10-21.

- Plan: four task groups, tests first, as in the earlier phases. Branch from freshly fetched `origin/master`.
- Behavior: the toggle is built in for every `menuitemcheckbox`, with no new option. Click and Space toggle and keep the menu open. Enter toggles and then closes the menu, as the [ARIA APG menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) describes. This settles the roadmap's open question. Because the docs told pages to flip `aria-checked` themselves, the change ships with a migration note.
- Validation: the roadmap's browser check in Chromium, Firefox and WebKit, jsdom edge cases, docs and generated files with a reviewed gzip budget, and the full contributor checks.

### Agent decisions within the confirmed design

These are proposals made while writing the spec. The user can overturn any of them in review.

- Enter closes the menu only when `closeOnClick` is true, so a checkbox item closes under the same option that already governs every other item. With `closeOnClick: false`, Enter toggles and leaves the menu open.
- Click and Space keep the menu open even when `closeOnClick` is true. That is the behavior the roadmap asks for, and `closeOnClick` keeps its meaning for every other item.
- `aria-checked` flips before any callback or event runs, so `onItemClick`, `expressive:select` and `expressive:change` listeners all read the new state.
- The change is reported only through `expressive:change`. No `onItemChange` callback is added; `onItemClick` still fires for every activation. ScrollSpy already emits `change` without a callback, so this follows an existing pattern.
- An `aria-checked` value other than `"true"`, or a missing attribute, counts as unchecked, so the first toggle writes `"true"`.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | Activating an enabled `li[role="menuitemcheckbox"]` by click, Enter or Space flips its `aria-checked` between `"true"` and `"false"`. A missing or other value counts as `"false"`. Activation through the row's own `a` or `button` counts the same as activation on the `li`. |
| R2 | A click or Space on a checkbox item keeps the menu open, whatever `closeOnClick` says. Focus stays on the item, so a person can toggle several items in a row. |
| R3 | Enter on a checkbox item toggles it, then closes the menu when `closeOnClick` is true, returning focus the same way Enter on a plain item does today. With `closeOnClick: false`, the menu stays open. |
| R4 | Each toggle fires exactly one `expressive:change` from the trigger element, with `detail` `{ item, checked }`, where `checked` is a boolean. `onItemClick` and `expressive:select` still fire once per activation, in their current order, before `expressive:change`. If a callback or listener destroys the instance, later notifications stop, as `_notify` already ensures. |
| R5 | Existing behavior stays: a disabled checkbox item does not toggle, fire events or close the menu. Plain `menuitem` and `menuitemradio` items keep their current click, Enter and Space behavior and never fire `expressive:change`. Submenu triggers still open their submenu. Select and Autocomplete are unchanged. |
| R6 | A checkbox item inside a submenu, or inside a Menubar menu, behaves as R1 to R4 describe. |
| R7 | Docs and generated guidance describe the new contract. The menu page's selection section and the Menu section of `llm.md` say the framework toggles `aria-checked` and when the menu closes. The events table in `llm.md` lists Menu under `expressive:change` with `{ item, checked }`. The unreleased changelog carries a migration note: a page that flips `aria-checked` itself in `onItemClick` or a click listener must remove that code, or the two flips cancel out. `npm run build:skill` regenerates the skill and MCP copies, and `semantics.json` changes only if a rule there contradicts the new behavior. |
| R8 | The bundle size change is recorded in a reviewed gzip budget line in `tests/selective-builds.test.js`. New functions stay below cyclomatic complexity 5 for the fallow pre-commit gate. |

## Constraints and dependencies

- The authored `role="menuitemcheckbox"` stays the author's; the framework manages only the dynamic `aria-checked` state, per the mission's product rules.
- Use the existing `_notify` and `Utils.emit` helpers. Add no dependencies and no new public option.
- Tests run against built bundles; build before testing, and tear instances down in `finally` blocks.
- Phase 12 builds on this change for `menuitemradio`. This phase leaves radio items alone.

## Out of scope

- `menuitemradio` groups (Phase 12).
- A `role="menuitemcheckbox"` row that also opens a submenu.
- A tri-state `aria-checked="mixed"` value.
- A check icon or other styling change; the existing selected style covers `aria-checked="true"`.
- Writing `aria-checked` on initialization for items that lack it.
- Roadmap edits, release and publication.

## Open decisions

None. The roadmap's question about Enter is settled above.
