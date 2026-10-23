# Position and inset helpers

Date: 2026-10-23
Roadmap phase: Phase 26, position and inset helpers
Branch: `feature/2026-10-23-position-inset-helpers`
Base: `origin/master` at `3ef49121a`
Status: implemented and locally verified 2026-10-23; not pushed, CI and review pending

Follow the [mission's agreed scope for utilities](../../../../mission.md#agreed-scope), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 26](../../../../roadmap.md#phase-26-position-and-inset-helpers). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user asked for Phase 26 on 2026-10-23. The roadmap gives it no dependencies. Phase 25, line clamp utilities, is earlier and still open, but it is being built on `feature/2026-10-23-line-clamp-utilities`. Both phases edit `src/sass/utilities/_helpers.scss`, `llm.md`, `CHANGELOG.md` and the CSS gzip budget in `tests/selective-builds.test.js`, so whichever merges second rebases and takes a new budget line from its merge base.

## Current behavior

These facts come from the base commit.

- `src/sass/utilities/_helpers.scss` has two positioning classes: `.relative` (`position: relative`) and `.sticky-top` (`position: sticky; top: 0`). Nothing positions an element absolutely or fixed, and nothing sets `inset` or a single edge.
- The `$_layout` map in the same file holds the display, flex and text-align classes that get `medium:`, `expanded:`, `large:` and `extra-large:` prefixes. The two positioning classes are outside it.
- Utilities load in the `utilities` cascade layer, after `components`, so a utility wins over a component rule whatever their specificities.
- Three components use `.fixed` as a modifier. `.navigation-bar.fixed` sets `position: sticky` (`_navigation-bar.scss`). The toolbar's `.fixed` sets `position: fixed` with its own `inset` and transform (`_toolbar.scss`). `.table-of-contents.fixed` sets `position: fixed` (`_table_of_contents.scss`). Cards use `article.sticky`.
- `src/sass/tokens/_stacking.scss` defines the `--expressive-z-*` scale, from `--expressive-z-toolbar: 996` to `--expressive-z-confetti: 10001`. Dialogs, open menus and popovers use the top layer instead.
- `.relative` and `.sticky-top` are documented in the "Display and position" table of `llm.md`, the helpers docs page (`docs/src/pages/helpers.astro`) and the skill's helper reference (`skills/expressivecss/expressivecss-usage/references/helpers.md`).

To overlay a badge, a scrim or a corner button today, an author writes page CSS.

## Confirmed decisions

The user chose these in the interview on 2026-10-23.

- Class names use a `position-` prefix: `.position-absolute`, `.position-fixed` and `.position-static`. A bare `.fixed` would sit in the utilities layer and turn `.navigation-bar.fixed` from sticky to fixed, and it would also override the toolbar and table-of-contents modifiers. `.relative` and `.sticky-top` keep their names, so the set is not uniform; renaming them would break markup.
- `.inset-0` stretches an element over its containing block.
- Logical edge pins ship too: `.top-0`, `.bottom-0`, `.start-0` and `.end-0`. Start and end use `inset-inline-start` and `inset-inline-end`, so they mirror in right-to-left pages. These go past the roadmap's outcome; the user accepted that for badge and corner-button layouts.
- No window-size prefixes. The new classes stay out of `$_layout`.
- No z-index on `.position-fixed`. The docs tell authors to set a `--expressive-z-*` value themselves when a fixed element must sit above framework surfaces.
- Work splits into three groups: CSS and browser tests, then docs, then budget, generated files and verify.
- Validation includes the roadmap's inset check in left-to-right and right-to-left pages, plus an RTL check for the edge pins. The user confirmed this in a follow-up question.

## Requirements

- R1. `.position-absolute` sets `position: absolute`.
- R2. `.position-fixed` sets `position: fixed` and nothing else. It sets no `z-index`.
- R3. `.position-static` sets `position: static`, so an author can undo positioning from a component or another utility.
- R4. `.inset-0` sets `inset: 0`. On a `.position-absolute` child of a `.relative` parent, the child's border box equals the parent's padding box, in left-to-right and right-to-left pages.
- R5. `.top-0` sets `top: 0` and `.bottom-0` sets `bottom: 0`.
- R6. `.start-0` sets `inset-inline-start: 0` and `.end-0` sets `inset-inline-end: 0`. In a right-to-left page, `.start-0` pins to the right edge and `.end-0` to the left.
- R7. A `.position-fixed.inset-0` element covers the viewport and stays there after the page scrolls.
- R8. Existing markup keeps its layout: `.navigation-bar.fixed` stays sticky, the toolbar's `.fixed` and `.table-of-contents.fixed` stay fixed, and `.relative` and `.sticky-top` keep their declarations.
- R9. The new classes have no window-size prefixed forms.
- R10. `llm.md`, the helpers docs page and the skill's helper reference list every new class with its declaration. The docs say that `.position-fixed` adds no z-index and point to the `--expressive-z-*` scale, and that a transformed or filtered ancestor becomes the containing block of a fixed element. `CHANGELOG.md` has an Added entry.
- R11. The CSS gzip budget in `tests/selective-builds.test.js` gets a reviewed line for the change, and generated skill and MCP copies are rebuilt with `npm run build:skill`.

## Exclusions

- Renaming `.relative` or `.sticky-top`, or adding `.position-relative` and `.position-sticky` aliases.
- Non-zero offsets, negative offsets, centering helpers such as Bootstrap's `.translate-middle`, and z-index utility classes.
- Window-size prefixed forms of any positioning class.
- Changes to the component `.fixed` modifiers or to `--expressive-z-*` values.

## Technical constraints

- Sass only, in `src/sass/utilities/_helpers.scss`, next to `.relative` and `.sticky-top`. Plain one-line rules match the file; eight classes need no new map or mixin.
- Logical properties for start and end, as the border helpers in the same file already use.
- Tests run against the built bundle, so `npm run build` runs before the browser tests. Browser tests close their browsers in `finally` blocks.
- No TypeScript changes, so the fallow complexity gate does not apply.

## Dependencies

None in the roadmap. Phase 25 touches the same files; see [Phase selection](#phase-selection).

## Open decisions

None.
