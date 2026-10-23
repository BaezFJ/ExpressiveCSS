# Auto-fill grid utility

Date: 2026-10-23
Roadmap phase: Phase 27, auto-fill grid utility
Branch: `feature/2026-10-23-auto-fill-grid`
Base: `origin/master` at `3ef49121a` (Add framework feature-gap roadmap phases, #405), fetched 2026-10-23
Status: specified, not implemented

Follow the [mission's agreed scope](../../../../mission.md#agreed-scope) and [product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 27](../../../../roadmap.md#phase-27-auto-fill-grid-utility). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user asked for Phase 27 on 2026-10-23. Phases 25 and 26 come earlier and are unfinished, but other threads are working on them (`feature/2026-10-23-line-clamp-utilities` and `t3/spec-phase-26`). Phase 27 has no dependencies, so it can go ahead without them. No later phase depends on it.

## Current behavior

These facts come from the source at the base commit.

- `src/sass/utilities/_helpers.scss` has `.grid` and `.inline-grid` for `display` and the `$_layout` map with window-size prefixes. No class sets `grid-template-columns`.
- `src/sass/base/_grid.scss` has the 12-column `.row` grid with `s`, `m`, `l`, `xl` and `xxl` spans. Its column count is fixed, so a page that wants as many columns as fit has to write its own CSS.
- `src/sass/utilities/_spacing.scss` has `.gap-0` to `.gap-6`, each `!important`, with window-size prefixes.
- Four components write their own repeating track rule:
  - `.card-collection` in `_cards.scss` uses `repeat(auto-fit, minmax(min(100%, var(--md-comp-card-collection-min-card-width)), 1fr))` with a default minimum of `rem(240px)`, exposed through a token for the whole track list.
  - `.stats` in `_stat.scss` uses `repeat(auto-fit, minmax(min(100%, var(--md-comp-stat-min-width)), 1fr))` with a default minimum of `rem(160px)`.
  - `.calendar-year` in `_calendar.scss` uses `repeat(auto-fill, minmax(rem(224px), 1fr))` with no `min(100%, ...)` guard.
  - The mega menu panel in `_mega-menu.scss` uses `repeat(auto-fit, minmax(var(--md-comp-mega-menu-column-width, 200px), 1fr))` with no guard.

The four rules differ in keyword, guard and token, so one shared rule could not replace them without changing at least two layouts.

## Scope

In scope: one utility class, its browser test, its docs and `llm.md` entry, a changelog entry, the gzip budget line, and regenerated skill and MCP data.

Out of scope:

- Moving `.card-collection`, `.stats`, `.calendar-year` or the mega menu onto the utility or a shared mixin. They keep their rules unchanged.
- An `auto-fit` variant, window-size prefixes and a built-in gap.
- Changes to `.row` or the 12-column grid.

## Requirements

- R1. `.grid-auto-fill` makes the element a grid whose columns repeat with `auto-fill`. Each column is at least the minimum width and takes an equal share of the leftover space (`1fr`). The container holds as many columns as fit its content box once gaps are counted.
- R2. The minimum column width comes from `--grid-column-min`, with a fallback of `rem(240px)` (15rem at the default root size). The property can be set on the element or inherited from an ancestor. With no value set, the fallback applies.
- R3. The minimum is wrapped in `min(100%, ...)`. A container narrower than the minimum shows one column as wide as the container and does not overflow sideways.
- R4. Empty tracks stay. With fewer items than the row can hold, each item keeps the width of one column instead of stretching across the row.
- R5. The class sets no gap. Authors pair it with the existing `.gap-*` classes, and the column count accounts for that gap.
- R6. Existing markup renders as before. No existing class, token or component rule changes, and the four components listed under current behavior keep their rules.
- R7. The helpers docs page, `llm.md` and `CHANGELOG.md` describe the class, `--grid-column-min` and its fallback, the one-column behavior in narrow containers and the pairing with `.gap-*`. The regenerated skill and MCP data agree with `llm.md`.
- R8. A reviewed budget line in `tests/selective-builds.test.js` records the CSS bundle's new gzip size.

## Confirmed decisions

The user confirmed all three in the feature-spec interview on 2026-10-23.

- Utility only. The roadmap left open whether the four components move onto the shared rule. They stay as they are. Calendar uses `auto-fill` and the mega menu has no 100% guard, while stat and cards use `auto-fit`, so moving them would change at least two layouts and would need visual review. A later phase can revisit this.
- One `auto-fill` class. The roadmap names the phase "auto-fill", and `auto-fill` keeps column widths equal from row to row when the last row is short. An `auto-fit` partner was left out to keep the class count down.
- No window-size prefixes. The column count already follows the container's width. An author who needs a different minimum at some window size can set `--grid-column-min` in a media query.

## Proposals for implementation

These are not confirmed. The implementer may change them and say so in the pull request.

- Read the property as `var(--grid-column-min, #{rem(240px)})` instead of declaring a default on the class, so a value set on an ancestor reaches the element. `rem()` follows the sizing rule for boxes that hold text.
- Put the class next to `.grid` and `.inline-grid` in `_helpers.scss`, outside `$_layout`, so it gets no prefixed copies.
- Document it in the "Display and position" section of `docs/src/pages/helpers.astro` and in the matching Helpers section of `llm.md`.

## Technical constraints

- Sass only. There is no TypeScript change, no runtime change and no AutoInit entry.
- Utilities sit in a cascade layer after components, so an unlayered page rule that sets `grid-template-columns` still wins over the class.
- Run `npm run build:skill` after the last edit to `llm.md`, `CHANGELOG.md` or tests, because the contract hash covers them.
- Tests run against the built bundles, so build the CSS before running them.

## Dependencies

None. Phases 25 and 26 also edit `_helpers.scss`, the helpers docs page, `llm.md`, `CHANGELOG.md` and the CSS budget line. Whichever branch merges later rebases, takes the master side of the generated hash conflicts, merges `llm.md` by hand and reruns `npm run build:skill`.

## Open decisions

None.
