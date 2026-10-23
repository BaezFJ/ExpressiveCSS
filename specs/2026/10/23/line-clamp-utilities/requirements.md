# Line clamp utilities

Date: 2026-10-23
Roadmap phase: Phase 25, line clamp utilities
Branch: `feature/2026-10-23-line-clamp-utilities`
Base: `origin/master` at `3ef49121a981a0ff664578ed425dbe8dee457d80` (#405)
Status: specified 2026-10-23; not implemented

Follow the [mission's agreed scope for utilities](../../../../mission.md#agreed-scope), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 25](../../../../roadmap.md#phase-25-line-clamp-utilities). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

Phases 1 to 24 are marked completed in the roadmap. Phase 25 is the first phase of the utility gaps milestone and has no dependencies. Phase 42, show-more text collapse, depends on it.

## Current behavior

These facts come from the base commit.

- `src/sass/utilities/_helpers.scss` has `.truncate`, which cuts text to one line with an ellipsis through `white-space: nowrap`. No class cuts text to more than one line.
- Three components clamp their own text to two lines with `display: -webkit-box`, `-webkit-box-orient: vertical`, `-webkit-line-clamp: 2` and `overflow: hidden`: carousel item paragraphs (`_carousel.scss`), navbar text (`_navbar.scss`, which also sets the standard `line-clamp`) and snackbar supporting text (`_snackbar.scss`).
- `_helpers.scss` builds its display, flex and alignment classes from the `$_layout` map. Each entry is a map of declarations, and a loop at the end of the file emits every entry again with the `medium:`, `expanded:`, `large:` and `extra-large:` prefixes inside `bp-up()`.
- The helpers docs page (`docs/src/pages/helpers.astro`) and `llm.md` (the Formatting section) document `.truncate`. `npm run build:skill` copies `llm.md` into the skill and MCP guides.

A page that wants a two-line card description today has to write the four declarations itself.

## Scope

### Requirements

- R1. `.line-clamp-1`, `.line-clamp-2` and `.line-clamp-3` cut an element's text to that many lines. The last visible line ends in an ellipsis when text was cut.
- R2. A clamped element's height equals that many line boxes of its own `line-height` when it has no block padding or border.
- R3. `.line-clamp-none` removes a clamp, so the element shows all its lines again.
- R4. Each of the four classes also comes with the `medium:`, `expanded:`, `large:` and `extra-large:` prefixes. A prefixed class applies from that window size up and wins over the unprefixed class, the way the existing layout prefixes do. For example, `line-clamp-2 expanded:line-clamp-none` clamps on compact and medium windows and shows the full text from Expanded up.
- R5. The helpers docs page and `llm.md` document the classes next to `.truncate`, including the prefixes and the limits under "Technical constraints". The changelog has an Added entry.
- R6. The CSS bundle's new gzip size is recorded in a reviewed budget line in `tests/selective-builds.test.js`, and the generated skill and MCP copies are current.

### Exclusions

- Carousel, navbar and snackbar keep their own clamp declarations. Moving them onto a shared mixin is out of scope.
- No line counts above 3, and no custom-property form such as `--expressive-line-clamp`.
- No runtime script. The show-more control that expands clamped text is Phase 42.
- No two-width browser test of the prefixes; see V3 in [validation.md](validation.md).

## Decisions

### Confirmed in the interview on 2026-10-23

- Ship counts 1 to 3 plus `none`. Card titles and descriptions use one to three lines, and Tailwind's 4 to 6 would add bytes for counts M3 layouts rarely need.
- All four classes take window-size prefixes. `none` is what makes the prefixes useful: a page can clamp on phones and unclamp on wider windows. The mission asks for prefixes where a layout changes.
- Leave the component clamps alone and keep the change to utilities, for the smallest diff.
- Before merge, a browser height test must pass in all three engines, along with the budget line and the generated-file checks. The user did not choose a two-width prefix test or a manual docs check.

### Proposals for implementation

These follow from the code and can change during implementation if the code disagrees.

- Add the four classes as entries in `$_layout`, so the existing prefix loop emits them and the prefixed copies keep the same source order. The map already allows several declarations per entry.
- Each `line-clamp-N` sets `display: -webkit-box`, `-webkit-box-orient: vertical`, `-webkit-line-clamp: N` and `overflow: hidden`, as the components do. Also set the standard `line-clamp: N`, as navbar does, so engines that ship the unprefixed property use it.
- `line-clamp-none` sets `display: block`, `-webkit-box-orient: horizontal`, `-webkit-line-clamp: unset`, `line-clamp: unset` and `overflow: visible`.
- The class name follows Tailwind's `line-clamp-*`, which authors coming from Tailwind already know, and fits the hyphenated helper names in `_helpers.scss`.

### Open decisions

None.

## Technical constraints

- The clamp classes set `display`, so they conflict with `.flex`, `.grid` and the other display classes on the same element. Put the clamp on a child instead. The docs should say so.
- `overflow: hidden` clips at the padding box, so block-end padding on a clamped element shows the top of the next line. The docs should tell authors to pad a wrapper instead.
- Utilities sit in the `utilities` layer after `components`, so a clamp class on a component's own text beats the component's clamp. That matches how the other helpers behave.
- Classes in `$_layout` reach the selective build through the `helpers` utility module, so a `custom.scss` build without `helpers` drops them along with `.truncate`.
- The change is CSS only. It adds nothing to the JavaScript bundle and no markup rule to `semantics.json`.

## Dependencies

None. Phase 42 depends on this phase.
