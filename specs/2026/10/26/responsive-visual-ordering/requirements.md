# Responsive visual ordering: requirements

- Date: 2026-10-26
- Roadmap: [Phase 62: responsive visual ordering](../../../../roadmap.md#phase-62-responsive-visual-ordering), milestone "Responsive layout refinements"
- Branch: `feature/2026-10-26-responsive-visual-ordering`
- Base: `origin/master`, specified at `3b9703956` and rebased onto `66b66a4c0` after phases 59 to 61 merged
- Constitution: [mission](../../../../mission.md#agreed-scope) (Utilities row and product rules), [tech stack](../../../../tech-stack.md#framework-constraints) (framework constraints and testing)

## Current behavior

`src/sass/utilities/_helpers.scss` defines `.order-first { order: -1; }` and `.order-last { order: 1; }` in the "On a flex or grid child" block, outside the `$_layout` map. The loop at the end of that file emits `medium:`, `expanded:`, `large:` and `extra-large:` copies of every `$_layout` entry, so the two order classes have no prefixed copies. No class sets `order: 0`, so once a child has an order class, a wider window cannot restore its source position.

An author who wants a sidebar after the main content on a phone and before it on a laptop has to write page CSS. The framework gap review of 2026-10-26 (item G2) recorded this gap and proposed an `.order-none` reset.

## Scope

Window-size prefixes for the two existing order classes, plus one new reset class with the same prefixes. The change touches the Sass helpers, their tests, the gzip budget and the hand-written documentation.

## Requirements

- **R1.** `.order-first`, `.order-last` and the new `.order-none` each have `medium:`, `expanded:`, `large:` and `extra-large:` variants. A variant applies from its size class's lower bound up (600, 840, 1200 and 1600px).
- **R2.** `.order-none` sets `order: 0`. Unprefixed, it gives a child the default order; prefixed, it returns a child with `.order-first` or `.order-last` to its source position from that size class up.
- **R3.** A prefixed order class overrides an unprefixed one on the same element, and a wider prefix overrides a narrower one, the same way the existing layout prefixes do.
- **R4.** Unprefixed `.order-first` and `.order-last` keep their current declarations (`order: -1` and `order: 1`). Markup that uses them looks the same as before at every window size.
- **R5.** The classes change visual order only. Tab order and the accessibility tree still follow the DOM, and the documentation says so next to every listing of the classes.
- **R6.** The docs helpers page, `llm.md`, the skill's helpers reference and `CHANGELOG.md` list `.order-none` and the prefixed order classes.

## Exclusions

- Numeric order classes such as `.order-1` to `.order-5`. They were offered and declined; `.order-1` would also duplicate `.order-last`.
- Changes to grid `push-*` and `pull-*`, which the grid already removed.
- Window-size prefixes for the other child helpers. Phase 60 covers sizing (`.flex-1`, `.flex-none`, `.shrink-0`) and phase 61 covers `.self-*`.
- Any script, semantics rule or static check that detects reordered focusable content.

## Confirmed decisions

| Decision | Reason |
| --- | --- |
| Move `.order-first` and `.order-last` into `$_layout` and add `.order-none` there. | The existing prefix loop then emits the variants. A second map and loop would do the same job. |
| Name the reset `.order-none`. | The gap review proposed it, and the repository already names resets with `-none` (`.flex-none`, `.line-clamp-none`). |
| Keep the class set to first, last and none. | It covers moving a child to the front, moving it to the end and restoring it, which is the roadmap's outcome. |
| Merge conditions include a Playwright order and Tab check, a gzip budget line, `npm run verify` and `npm run check:generated`, plus the docs and skill updates. | The roadmap's completion check needs the focus check, and the mission requires regression tests and a reviewed gzip budget. |

## Technical constraints

- Follow the [Sass architecture](../../../../../src/sass/README.md). The utilities stay in the `utilities` layer, and `$_layout` entries go through the existing `_declarations` mixin.
- Keep `.order-first` before `.order-last` in the map, so `.order-last` still wins when both are on one element, as it does now.
- Record the compiled CSS change in a reviewed gzip budget line in `tests/selective-builds.test.js`.
- Run `npm run build:skill` after the last edit, because the contract hash covers `CHANGELOG.md` and the tests.

## Dependencies

None in the roadmap. Phases 60 and 61 (#449, #450) moved the sizing and self-alignment classes into `$_layout` first, so the order entries sit after `.self-*` in the map, and the documentation lists include their classes.

## Open decisions

None.
