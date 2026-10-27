# Responsive child sizing

Date: 2026-10-26
Roadmap phase: Phase 60, responsive child sizing
Branch: `feature/2026-10-26-responsive-child-sizing`
Base: `origin/master` at `3b9703956823c9c445a0835067915a0e322152a5`
Status: specified, implementation pending

Follow the [mission's product rules and utility scope](../../../../mission.md#product-rules), [framework constraints](../../../../tech-stack.md#framework-constraints), [styling contracts](../../../../tech-stack.md#styling-contracts) and [roadmap Phase 60](../../../../roadmap.md#phase-60-responsive-child-sizing). Work is in [plan.md](plan.md); checks are in [validation.md](validation.md).

## Phase selection

The user explicitly selected Phase 60. Phase 59 is the earliest unfinished phase, but Phase 60 declares no dependencies. It can proceed independently. Phases 59, 61 and 62 may touch the same helper sources, docs and tests, so later integration must preserve their changes. This specification leaves the roadmap's completion state unchanged.

## Current behavior

Source inspection at the base commit established these facts:

- `src/sass/utilities/_helpers.scss` defines `.flex-1` as `flex: 1 1 0`, `.flex-none` as `flex: none` and `.shrink-0` as `flex-shrink: 0`. These rules follow the base `$_layout` output in that order and have no prefixed copies.
- The same partial emits `$_layout` classes once without a prefix and again inside its final breakpoint loop. `src/sass/abstracts/_breakpoints.scss` supplies the four minimum widths, 600, 840, 1200 and 1600 pixels.
- `src/sass/custom.scss` loads helpers in the `utilities` layer, including when a consumer selects only the `helpers` utility. Sizing declarations use normal importance.
- `docs/src/pages/helpers.astro`, `llm.md` and the hand-maintained `skills/expressivecss/expressivecss-usage/references/helpers.md` describe the current classes. `scripts/gen-expressivecss-skill.mjs` generates derived guidance and contract metadata, but does not generate that helper reference.
- `tests/helpers-browser.test.js` already measures nested flex and grid sizing across the three browser engines. `tests/expressivecss-skill.test.js` checks helper guidance against compiled CSS; `tests/selective-builds.test.js` covers selective Sass builds and gzip budgets.

Authors currently need page CSS to change these child sizing rules at a window-size breakpoint or restore normal shrinking after `.shrink-0`.

## Confirmed decisions

The user confirmed these choices in the feature-spec interview on 2026-10-26:

- Use the base and branch above, with three ordered groups: Sass and regression checks; docs and generated guidance; gzip budget and merge checks.
- Add all four window-size prefixes to the three existing helpers, and add both unprefixed and prefixed `.flex-initial` and `.shrink-1` resets. `.flex-initial` means `flex: 0 1 auto`; `.shrink-1` means `flex-shrink: 1`.
- Preserve existing behavior. Exclude self-alignment, visual ordering and other sizing classes.
- Require breakpoint computed styles and sibling geometry in Chromium, Firefox and WebKit, base compatibility, selective-build coverage, docs, a reviewed gzip budget, generated-data checks, contributor/package checks and visual review before merge.

## Requirements

### R1. Existing sizing helpers gain prefixes

Each of `.flex-1`, `.flex-none` and `.shrink-0` has `medium:`, `expanded:`, `large:` and `extra-large:` variants with the same declaration as its unprefixed form. A prefix applies at and above its minimum width. Larger prefixes override smaller prefixes when they affect the same property, independently of class attribute order. Below a prefix's minimum width, its rule has no effect.

### R2. Both reset helpers are available

`.flex-initial` sets `flex: 0 1 auto`, restoring content-based sizing with shrinking and no growth. `.shrink-1` sets only `flex-shrink: 1`, retaining the element's existing grow factor and basis. Both have all four prefixes. Resets assign explicit values; they do not recover an earlier component or consumer declaration.

### R3. Existing markup retains its sizing behavior

Keep the existing declarations, normal importance and relative precedence of `.flex-1`, `.flex-none` and `.shrink-0`. In particular, `.flex-none` wins over `.flex-1` when both occur, and `.shrink-0` can disable shrinking on either. Existing minimum-size helpers and unrelated responsive helpers retain their behavior. Unlayered consumer CSS can still override these normal utility declarations. A prefixed `flex` shorthand intentionally resets grow, shrink and basis together; a prefixed shrink helper changes only shrink.

### R4. A breakpoint change affects the intended child

In a flex layout, a child switches between base and prefixed sizing at the exact selected breakpoint. A sibling with explicit `.flex-none` sizing retains its requested main-axis space. The behavior works in rows and columns. Shrink resets allow an oversized child with a permitted minimum size to fit beside the fixed sibling; they do not implicitly set `min-width` or `min-height`.

### R5. Full and selective builds share the implementation

Emit the five helper families from `src/sass/utilities/_helpers.scss` through the existing declaration and breakpoint generation pattern. The full bundle and a selective build loading `helpers` contain their base and prefixed forms in the `utilities` layer. A selective build excluding helpers omits them. Add no runtime code, dependency, Sass entry point or public export.

### R6. Authors and agents can use the documented contract

Update `docs/src/pages/helpers.astro`, `llm.md` and the hand-maintained helper reference with the five families, reset values, breakpoint applicability and an example of a flexible child beside a fixed sibling. Explain shorthand resets and when `.min-w-0` or `.min-h-0` is needed. Add an Unreleased changelog entry and regenerate derived guidance from its sources. Guidance must not imply that self-alignment, ordering or other sizing helpers gained prefixes in this phase.

### R7. The change has measured size and merge evidence

Record the measured full CSS gzip size and delta against the implementation branch's merge base in `tests/selective-builds.test.js`. All agreed acceptance, regression, generated-data, contributor and package checks must pass before merge, with the intended visual change reviewed under `CONTRIBUTING.md`. A skipped browser engine does not count as a pass.

## Exclusions and constraints

- No `.flex-auto`, arbitrary grow factors, basis scale, width/height variants, container-query variants or new minimum-size resets.
- No responsive self-alignment or visual ordering; those remain Phases 61 and 62. No axis-gap work from Phase 59.
- No TypeScript behavior, markup semantics, accessibility roles or initialization changes. Existing exports and markup remain compatible.
- Reuse the installed Sass and Playwright tooling, follow `src/sass/README.md`, build before bundle tests and close browsers in `finally` blocks. Run test suites sequentially.
- Regenerate derived files with the existing generators. `semantics.json` needs no change for these declaration-only utilities; run `build:semantics` only if implementation reveals a necessary semantics source change.

## Dependencies and open decisions

There are no roadmap dependencies and no unresolved interview decisions. Implementation has not started. Graph tooling had no usable index for this worktree; the findings above come from direct source reads. No build, runtime test or browser check ran during specification.
