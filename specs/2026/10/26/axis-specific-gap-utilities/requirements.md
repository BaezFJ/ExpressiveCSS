# Axis-specific gap utilities

Date: 2026-10-26
Roadmap phase: Phase 59, axis-specific gap utilities
Branch: `feature/2026-10-26-axis-specific-gap-utilities`
Base: `origin/master` at `3b9703956823c9c445a0835067915a0e322152a5`
Status: specified; implementation and acceptance checks pending

Follow the [mission's product rules](../../../../mission.md#product-rules) and [agreed utility scope](../../../../mission.md#agreed-scope), the [framework stack](../../../../tech-stack.md#framework-stack) and [styling contracts](../../../../tech-stack.md#styling-contracts), and [roadmap Phase 59](../../../../roadmap.md#phase-59-axis-specific-gap-utilities). Task groups are in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Selection and confirmed decisions

Phase 59 is the earliest unfinished phase at the base. Phases 1 through 58 have recorded completion states. Phase 58 completed as a measurement-only experiment after rejecting its CSS candidate. Phase 59 has no dependencies.

The user confirmed Phase 59, this base, and three ordered implementation groups: Sass rules and focused regressions; docs and generated guidance; browser, size and contributor verification. The user chose `gap-x` and `gap-y`, the existing spacing scale and prefixes, and the cascade rules below. All proposed validation checks are required unchanged. No decisions are deferred.

## Current behavior and evidence

`src/sass/utilities/_spacing.scss` owns a shared spacing-value map. It emits `.gap-0` through `.gap-6` as `gap` declarations with `!important`. It repeats that scale inside `bp-up()` for `medium:`, `expanded:`, `large:` and `extra-large:`. It currently has no axis-specific gap classes. Independent gaps therefore require author CSS.

`src/sass/abstracts/_breakpoints.scss` supplies minimum widths of 600, 840, 1200 and 1600 pixels. The unprefixed rules precede those media queries, which appear in increasing width order. The spacing map also contains `auto` for margin utilities, but the gap loops exclude it.

`src/sass/utilities/_index.scss` forwards spacing. `src/sass/custom.scss` loads the complete utility index or the author's selected utility partials inside the utilities cascade layer. Authors can already select `spacing` without selecting `helpers`. The base grid's separate `.g-*` classes are outside this work.

`tests/helpers-browser.test.js` reads built CSS and contains grid, flex, spacing and breakpoint checks. Its shared `engines` helper in `tests/browser.js` covers Chromium, Firefox and WebKit. Some existing checks run only in Chromium, so the new acceptance cases must use the engine loop. `tests/selective-builds.test.js` covers full/default-custom equality, selective compilation and reviewed gzip budgets. The current CSS ceiling is 90,072 gzip bytes; this is a recorded budget, not a fresh measurement.

The helper table and prefix guidance live in `docs/src/pages/helpers.astro` and `llm.md`. The latter owns the API and markup reference used by generated guidance. Inspect `scripts/gen-expressivecss-skill.mjs` and its relevant inputs before regenerating affected output.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | Add `.gap-x-0` through `.gap-x-6` setting only `column-gap`, and `.gap-y-0` through `.gap-y-6` setting only `row-gap`. Use the existing scale: `0`, `0.25rem`, `0.5rem`, `0.75rem`, `1rem`, `1.5rem`, `3rem`. Every declaration has `!important`. Emit no `gap-x-auto` or `gap-y-auto`. |
| R2 | Supply both families unprefixed and with `medium:`, `expanded:`, `large:` and `extra-large:`. Each prefix applies at and above its existing breakpoint. Preserve rem scaling when the root font size changes. Keep the native meanings of `row-gap` and `column-gap` in grid and flex layouts, including RTL. The names do not redefine those properties as physical coordinates or flex main/cross axes. |
| R3 | At each breakpoint level, emit the existing gap shorthand before axis rules so an axis rule overrides that axis regardless of the numeric suffix or HTML class order. Emit each later breakpoint after all earlier ones. A later shorthand resets both axes; a later axis rule overrides only its axis. Zero is a supported reset. Do not promise a winner when authors apply conflicting values from the same family at the same breakpoint. |
| R4 | Preserve existing `.gap-*`, margin, padding and `.g-*` behavior for markup without the new classes. Keep cascade layers, specificity, breakpoint configuration and public Sass exports stable. The full stylesheet and a `custom` build selecting only the `spacing` utility both include the new rules; a build excluding spacing does not. Add no runtime code, dependency, utility partial or author setup requirement. |
| R5 | Update the helpers docs page, `llm.md` and the Unreleased changelog. Document scale, prefixes, native axis meanings and shorthand precedence. Include a live wrapping-grid example combining a base gap with an axis-specific breakpoint override. Regenerate affected skill/MCP guidance from its sources, keeping the existing catalogue and semantics ownership. |
| R6 | Before implementation can merge, pass V1 through V9, record comparable baseline and candidate gzip measurements, review the CSS budget change, satisfy required CI and resolve review conversations. BaezFJ must review intended visual changes. Record missing engines, skips, failures and pending review truthfully. |

## Constraints and exclusions

Extend the existing spacing generator under [Sass architecture](../../../../../src/sass/README.md). Reuse `$spacing-values` and `bp-up()` without copying their values into a second production map. Keep helpers private if a helper is needed. Follow [contributor checks](../../../../../CONTRIBUTING.md#verify) and [development notes](../../../../../docs/development-notes.md#sass-architecture).

Exclude responsive child sizing, self-alignment and ordering from Phases 60 through 62. Also exclude `auto`, negative and arbitrary gap values, new breakpoints, new gap tokens, component default changes and runtime behavior. No semantics rule change is planned because these classes introduce no markup or accessibility requirement. Change source-owned guidance only where this feature affects it; regenerate derived copies rather than editing them.

## Risks

CSS shorthand expansion and source order can make a shorthand override one or both axes. R3 defines the intended ordering and requires direct computed-style checks. A base axis rule intentionally yields to a later breakpoint shorthand. HTML class order cannot change that result.

The new selectors increase CSS size. Measure the increase before updating the reviewed budget; this spec sets no invented numeric allowance. A missing browser engine can cause existing helpers to skip tests, so explicit engine runs are required before acceptance. Tests use built bundles and must run sequentially.
