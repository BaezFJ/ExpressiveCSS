# Share chart base rules across chart types

Date: 2026-10-26
Roadmap phase: Phase 58, share chart base rules across chart types
Branch: `fix/chart-base-rules`
Base: `origin/master` at `a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20`
Status: evaluated on 2026-10-26; candidate rejected by the size threshold; production Sass restored

Follow the [mission's product rules](../../../../mission.md#product-rules), [framework constraints](../../../../tech-stack.md#framework-constraints), and [roadmap Phase 58](../../../../roadmap.md#phase-58-share-chart-base-rules-across-chart-types). Work groups are in [plan.md](plan.md); checks are in [validation.md](validation.md).

## Phase selection and decisions

The user selected Phase 58 and confirmed its scope, implementation approach and validation on 2026-10-26. It has no dependencies. Phases 55 to 57 remain unfinished at the base; this work does not require or complete them. Phases 52 to 54 have merged implementation evidence in PRs #440 to #442, although their roadmap entries still lack completion lines. Keep the roadmap unchanged during specification.

The confirmed implementation groups are baseline and regression checks, shared rules and size measurement, then compatibility checks, docs and verification. Use the existing write-once mixin pattern with single-class arguments in `:is()`. A saving of at least 1,024 gzip bytes is required to retain the CSS change. There are no deferred decisions.

## Current behavior and evidence

`src/sass/abstracts/_mixins.scss` defines `chart($name)`. Each call emits figure, caption, visually hidden table, plot, cursor, tooltip, labels, legend, swatch, sparkline and forced-colors rules under that chart's class names. Some declarations read chart-specific custom properties and must remain specific to their chart. `_chart-toggle` already uses `$_chart-toggle-written` to emit its rules once.

Twelve component partials call `chart()`: line, column, bar, pie, heatmap, radar, radial, mixed, scatter, funnel, treemap and sankey. `TASKS.md` item M3 lists eleven and omits radial. Its estimated 2.9 KB gzip saving is an unverified upper bound. Org-chart does not call this mixin.

The partials add overrides after their `chart()` calls. For example, radial sets a larger figure gap, heatmap changes plot sizing and background, and sankey changes tooltip placement. Moving base rules can change which declaration wins even when selector specificity stays the same.

`src/sass/custom.scss` loads either the complete component index or the author's `$components` list inside the components layer. Components import only `abstracts`; abstracts emit no CSS until a caller includes a mixin. The Sass API forwards these helpers through `abstracts` and `custom.scss`.

`tests/selective-builds.test.js` checks default/custom equality, configuration and gzip budgets. Its current CSS budget is 90,045 bytes, a recorded ceiling rather than a new measurement. `tests/fixtures/selective-builds.mjs` currently defines tabs and forms consumers. `tests/selective-builds-browser.test.js` compares their full and selective rendering and interaction; it has no chart fixture yet.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | Write shared, name-independent chart declarations once per compiled sheet using a private mixin and the existing write-once pattern. Cover all twelve current `chart()` callers, including radial. Keep chart-specific tokens, token reads and exceptions correct. Every grouping `:is()` introduced for chart classes contains only single-class arguments; each chart-class alternative contributes specificity `0,1,0`. Preserve the complete specificity of existing descendant, state and modifier selectors. |
| R2 | Existing markup renders and behaves as at the base. Preserve public Sass mixin signatures and accepted chart names, component classes, custom properties, cascade layers, keyboard and pointer behavior, focus indicators, accessible tables, table fallback before initialization and restoration after destroy. Keep per-chart overrides effective regardless of which selected chart loads first. Preserve light/dark themes, RTL, forced colors, reduced motion, glass settings and stylesheet adoption in a shadow root. |
| R3 | Selecting any one of the twelve chart partials through `custom.scss` supplies all its shared rules without another chart or a new author-supplied supporting partial. Compiling with no charts emits no shared chart base. The default custom build still equals the complete stylesheet. |
| R4 | Measure the full production minified CSS with the same Node, locked dependencies, Sass settings and gzip method before and after this refactor. Retain the CSS changes only when baseline gzip bytes minus candidate gzip bytes is at least 1,024. Record both sizes, the delta, revisions and method. If the saving is smaller, restore candidate production Sass changes and record the measured result in this spec and `docs/development-notes.md`; ship no CSS changes or lowered budget for this attempt. |
| R5 | For a retained refactor, record the measured CSS budget in `tests/selective-builds.test.js`, add an Unreleased CHANGELOG entry, update affected authoring or architecture guidance, and regenerate derived guidance when its inputs change. Complete chart regressions, contributor and package checks, and required visual review before merge. Results stay pending until the checks run. |

## Scope and exclusions

The shared implementation is in `src/sass/abstracts/_mixins.scss`. Inspect and preserve all twelve caller partials and their downstream selectors. Reuse the existing selective-build fixtures and tests, adapting their tabs/forms assumptions when adding chart cases. Existing chart browser tests supply component-specific markup and interaction assertions.

Exclude org-chart styling, `chart-axis()` refactoring, TypeScript changes, new chart behavior, token renaming, changes to chart markup and the other Sass review phases. Do not add a dependency, chart-selection configuration option, or public helper for this work.

## Technical constraints and risks

Follow [Sass architecture](../../../../../src/sass/README.md) and [development notes](../../../../../docs/development-notes.md#sass-architecture). Keep CSS emission in the existing components layer and retain the one-way dependency on abstracts. Preserve public exports; a private helper must not become a new public Sass API. A built-in chart class list must not silently break existing consumer calls such as `chart("consumer-chart")`.

The main risks are lost chart-specific variables, altered rule order, stronger selectors and missing standalone styles. Shared selectors must not cause one chart's rules to affect a neighboring or nested chart of another type. A no-chart build is a regression case because loading abstracts alone must remain inert.

Tests read built bundles. Build before testing and run suites sequentially. Use Node 24 and the lockfile. Missing browser engines and skipped acceptance cases do not count as passes. Regenerate source-owned guidance through the established commands, and do not renew capability evidence or source pins without the review and checks those records require.

## Implementation outcome on 2026-10-26

The tested write-once candidate saved 855 gzip bytes, below the confirmed 1,024-byte threshold. R4 therefore selects the measurement-only outcome. Production Sass is restored and no CSS, runtime, budget or public API change ships. R1 to R3 and the retained-refactor parts of R5 are inapplicable to this result; their contracts remain requirements for any future attempt. See the measurements and remaining verification results in [validation.md](validation.md).
