# Responsive self-alignment

Date: 2026-10-26
Roadmap phase: Phase 61, responsive self-alignment
Branch: `feature/2026-10-26-responsive-self-alignment`
Base: `origin/master` at `3b9703956823c9c445a0835067915a0e322152a5`
Status: specified; not implemented

Follow the [mission's utilities scope and product rules](../../../../mission.md#agreed-scope), [framework constraints](../../../../tech-stack.md#framework-constraints), and [roadmap Phase 61](../../../../roadmap.md#phase-61-responsive-self-alignment). Work groups are in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The maintainer asked for Phase 61. Phases 59 and 60 come earlier and are still open, but Phase 61 lists no dependencies, and other threads are specifying 59, 60 and 62 in parallel. This specification leaves the roadmap's completion state unchanged.

## Current behavior

These facts come from the base commit.

- `src/sass/utilities/_helpers.scss` defines `.self-start`, `.self-center`, `.self-end` and `.self-stretch` as standalone rules after `.contents`. They set `align-self` to `flex-start`, `center`, `flex-end` and `stretch`.
- The same file holds the `$_layout` map. Every entry gets an unprefixed class, and a loop at the end of the file emits `.medium\:`, `.expanded\:`, `.large\:` and `.extra-large\:` copies inside `bp-up()`. The `.self-*` rules sit outside the map, so they have no prefixed forms.
- No class sets `align-self: auto`, so a child with a `.self-*` class cannot go back to its parent's `align-items` at a larger window size.
- The breakpoints are Medium 600px, Expanded 840px, Large 1200px and Extra-large 1600px (`src/sass/abstracts/_breakpoints.scss`).
- `llm.md` and `docs/src/pages/helpers.astro` list the four `.self-*` classes. The `llm.md` paragraph under "Window-size prefixes" names the classes that take a prefix and leaves these out. `skills/expressivecss/expressivecss-usage/references/helpers.md` is generated from `llm.md`.
- `tests/helpers-browser.test.js` has a static prefix check for the line clamps and a Chromium test that switches layout classes across breakpoints.

An author who wants a child centered on a phone and aligned to the end on a wide window has to write page CSS today.

## Confirmed decisions

The interview on 2026-10-26 confirmed these choices.

1. Specify Phase 61 on `feature/2026-10-26-responsive-self-alignment`, branched from the fetched `origin/master`. Work in three groups: Sass, tests, then docs and delivery. Resolve conflicts with Phases 59, 60 and 62 at merge time, since all four touch the same helpers file, docs table and gzip budget.
2. Move the four `.self-*` classes into `$_layout` so they get every window-size prefix, and add `.self-auto`. Leave out `.self-baseline` and grid `justify-self` classes.
3. Validate with a static check that every `.self-*` name appears under each prefix, plus one Chromium browser test across a breakpoint. `npm run verify` and a reviewed gzip budget line stay merge conditions.

## Requirements

### R1. `.self-auto` returns a child to its parent's alignment

Add `.self-auto { align-self: auto; }`. A child with `.self-auto` takes the cross-axis alignment its flex parent sets through `align-items`.

### R2. Every self-alignment class has window-size prefixes

`.self-auto`, `.self-start`, `.self-center`, `.self-end` and `.self-stretch` each get `medium:`, `expanded:`, `large:` and `extra-large:` forms. A prefixed class applies from its size class up and overrides the unprefixed class, like the other `$_layout` prefixes. For example, `self-start expanded:self-end` aligns the child to the start below 840px and to the end from 840px up, and `self-center expanded:self-auto` hands it back to the parent's alignment from 840px up.

### R3. Existing self-alignment and siblings are unchanged

The unprefixed `.self-start`, `.self-center`, `.self-end` and `.self-stretch` keep their names and values, including `flex-start` and `flex-end`, so they still follow the writing direction. A self-alignment class changes only the element it is on. Its siblings keep the parent's `align-items` at every width.

### R4. Docs and delivery records describe the classes

The helpers page and `llm.md` list `.self-auto` with the other `.self-*` classes, and the `llm.md` window-size prefix paragraph names the self-alignment classes. The Unreleased changelog records the new class and prefixes. Regenerate the skill guidance from `llm.md`, and record the measured CSS gzip size and its delta in `tests/selective-builds.test.js`.

## Scope and constraints

The change lives in `src/sass/utilities/_helpers.scss`. Reuse `$_layout`, `_declarations()` and the existing prefix loop; add no mixin, map or breakpoint. Moving the rules into the map changes their position in the output but not their specificity or layer, and no other utility sets `align-self`.

Tests read built bundles. Build first, run suites one at a time, and close browsers in `finally` blocks. Follow [CONTRIBUTING.md](../../../../../CONTRIBUTING.md) and the [Sass architecture](../../../../../src/sass/README.md). Do not hand-edit generated skill or MCP files.

Excluded: `.self-baseline`, `justify-self` and `place-self` classes, responsive sizing (Phase 60), responsive order (Phase 62), gap axes (Phase 59), TypeScript, `semantics.json` and release publication.

## Dependencies and open decisions

There are no phase prerequisites and no open decisions. Phases 59, 60 and 62 edit the same files, so whichever branch merges second resolves the conflicts in `$_layout`, the docs tables, `llm.md`, the changelog and the gzip budget line.
