# Pointer utilities

Date: 2026-10-23
Roadmap phase: Phase 28, pointer utilities
Branch: `feature/2026-10-23-pointer-utilities`
Base: `origin/master` at `3ef49121a`
Status: specified and implemented 2026-10-23; checks recorded in validation.md

Follow the [mission's agreed scope for utilities](../../../../mission.md#agreed-scope), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 28](../../../../roadmap.md#phase-28-pointer-utilities). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user assigned Phase 28 on 2026-10-23. Phases 25 to 27 come earlier in the roadmap but are being specified in parallel on their own branches (`feature/2026-10-23-line-clamp-utilities`, `t3/spec-phase-26` and `t3/phase-27-feature-spec`). Phase 28 has no dependencies, and none of those phases adds pointer or cursor classes, so the order does not block this work. Phases 25 and 26 also edit `src/sass/utilities/_helpers.scss`, the docs helpers page and `llm.md`, so whichever branch merges second will need to rebase and redo its gzip budget line.

## Current behavior

These facts come from the code at `3ef49121a`.

- `src/sass/utilities/_helpers.scss` holds the single-purpose helper classes. It has no class that sets `pointer-events` or `cursor`.
- The helpers load in the `utilities` cascade layer, which `src/sass/custom.scss` declares after `components`. A utility class therefore beats any component rule, whatever its specificity. Unlayered page CSS still beats it.
- Components set `pointer-events: none` and `cursor` internally. Examples are the `btn-disabled` mixin in `src/sass/abstracts/_mixins.scss` and the masks in `src/sass/utilities/_shapes.scss`. `tests/confetti-browser.test.js` already checks that clicks pass through the confetti overlay.
- `llm.md` (line 2384) already warns that `pointer-events: none` stops the pointer only: a link stays in the tab order and still responds to Enter.

Authors who want an overlay that clicks pass through, or a pointer cursor on a clickable card that isn't a link or button, have to write their own CSS today.

## Confirmed decisions

Confirmed with the user on 2026-10-23.

- Three classes ship: `.pointer-events-none`, `.pointer-events-auto` and `.cursor-pointer`. The names follow the spelled-out style of the existing helpers, such as `.min-w-0` and `.w-full`. `.pointer-events-auto` exists so a control inside a pass-through overlay, such as a close button, can still take clicks.
- No window-size prefixes. Pointer behavior does not change with the layout, so the classes stay out of the `$_layout` map.
- No `!important`. The utilities layer already beats component rules. A page that needs to beat its own unlayered CSS can write the declaration itself.
- Three task groups: Sass and the gzip budget, then the browser test, then the docs and generated files.
- One committed browser test: the click-through check the roadmap names, in Chromium, Firefox and WebKit. The user chose not to add committed tests for the cursor value or for keyboard behavior under `.pointer-events-none`.
- Merge also needs the reviewed gzip budget line, `npm run verify`, regenerated skill data and the MCP tests.

## Proposals

These are the agent's suggestions. The implementer can change them without asking.

- Put the three classes in a `// Pointer input` block in `_helpers.scss`, after the text behavior classes and before the responsive media rules.
- Document them in a new "Pointer" subsection of Helpers, between "Formatting" and "Browser defaults", in both `llm.md` and `docs/src/pages/helpers.astro`. The docs page also needs a `{ id: "pointer", label: "Pointer" }` entry in its section list.

## Requirements

| ID | Requirement |
| --- | --- |
| R1 | `.pointer-events-none` sets `pointer-events: none`. A click on an element with the class, or on any descendant without an override, reaches whatever lies underneath. |
| R2 | `.pointer-events-auto` sets `pointer-events: auto`. A descendant of a `.pointer-events-none` element that has this class receives its own clicks. |
| R3 | `.cursor-pointer` sets `cursor: pointer`. |
| R4 | The three classes are emitted inside the `utilities` layer, with no `!important` and no window-size prefixes. A selective build that includes the `helpers` utility includes them. |
| R5 | `llm.md` and the docs helpers page list the three classes with their declarations and an example of a pass-through overlay with a clickable child. |
| R6 | The docs say that `.pointer-events-none` leaves the element and its controls focusable and keyboard operable, and point to `inert` or `disabled` for blocking all input. |
| R7 | The docs say that `.cursor-pointer` changes only the cursor: a clickable element that isn't a link or button still needs a role, a tab stop and key handling, and a `<button>` or `<a href>` is the better choice where one fits. |
| R8 | `CHANGELOG.md` lists the classes under Unreleased, Added. |
| R9 | `tests/selective-builds.test.js` records the new CSS gzip size in a reviewed budget line, and the CSS assertion uses the new size. |
| R10 | The generated skill and MCP data match the updated `llm.md`. |

## Exclusions

- Other cursor values, such as `default`, `not-allowed` or `grab`. A splitter that resizes already uses a one-line page rule, as `llm.md` describes for `.drag-handle`.
- `user-select` classes.
- Blocking keyboard input. Phase 41, the loading overlay, covers a region that takes no pointer or keyboard input.
- Any change to components that set `pointer-events` or `cursor` themselves.

## Technical constraints

- Sass only. The change adds no TypeScript, so the bundles' JavaScript size and the fallow complexity gate are unaffected.
- Run `npm run build:css` before the browser test, since tests read `dist/css/expressive.css`.
- `npm run build:skill` hashes `CHANGELOG.md` and the tests, so run it after the last edit to either.

## Dependencies

None in the roadmap. The rebase note under Phase selection applies if Phases 25 or 26 merge first.

## Open decisions

None.
