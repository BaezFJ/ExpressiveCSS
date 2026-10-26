# Deferred rendering for long lists

Date: 2026-10-25
Roadmap phase: Phase 40, deferred rendering for long lists
Branch: `feature/2026-10-25-deferred-rendering`
Base: `origin/master` at `1ab798978e0200466a3b85d8af9a2783c6dc2b91` (#424)
Status: implemented 2026-10-25; merged as #425

Follow the [mission's agreed scope for utilities](../../../../mission.md#agreed-scope), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 40](../../../../roadmap.md#phase-40-deferred-rendering-for-long-lists). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The roadmap marks Phases 1 to 37 completed. Phases 38 (pattern input mask) and 39 (currency formatting) are not marked yet, but both merged to `master` as #422 and #423. Phase 40 is the first phase of the lower-value gaps milestone and has no dependencies. This spec leaves the roadmap's completion state unchanged.

## Current behavior

These facts come from the base commit.

- Nothing in `src/sass` sets `content-visibility: auto` or `contain-intrinsic-size`. The only `content-visibility` is a transition on the accordion's `::details-content` in `_accordion.scss`.
- A page that renders 5,000 `.list` rows pays layout and paint for every row on first render and on each relayout, whether or not the row is on screen. Avoiding that today means writing page CSS or a virtual list script.
- `.list > li` rows have `min-height: var(--md-comp-list-item-height)`, which `_list.scss` sets to 56px (72px for two-line rows through `--md-comp-list-item-two-line-height`).
- Links, labels and buttons inside list rows use the `focus-visible` mixin from `abstracts/_mixins.scss`: a 3px outline with `outline-offset: 2px`, drawn outside the element. A link that is a row's only child fills the row, so its ring extends 5px past the row's edges.
- Cards already draw an inset ring with `outline-offset: calc(-1 * var(--md-comp-card-focus-indicator-thickness))` in `_mixins.scss`.
- Utility classes live in `src/sass/utilities/` and reach the selective build through `utilities/_index.scss`.

## Scope

### Requirements

- R1. A container class, `.defer-render`, makes the browser skip layout and paint for its direct children while they are off screen. Each direct child gets `content-visibility: auto`. It works on `.list` and on any other block container whose children stack, such as a column of cards.
- R2. Each deferred child reserves an estimated block size while skipped, through `contain-intrinsic-block-size: auto <size>`, so the scrollbar stays close to the list's real length. A custom property, `--defer-render-row-size`, sets the estimate. Inside `.list` the default follows `--md-comp-list-item-height`; elsewhere it falls back to a fixed `rem()` value. The `auto` keyword makes the browser keep a row's last rendered size once it has been on screen.
- R3. Focus rings in deferred rows stay fully visible. Paint containment clips a row's overflow, so inside `.defer-render` the focus ring of a row's interactive content is drawn inside the row box instead of outside it.
- R4. Off-screen rows stay in the DOM and the accessibility tree, and find-in-page reaches their text. This is the reason to use `content-visibility` over a virtual list, and the docs say so.
- R5. The lists docs page and `llm.md` document the class, the custom property, the table limit, the clipping and containing-block effects on row content, and when a virtual list is still the better choice. The changelog has an Added entry.
- R6. The CSS bundle's new gzip size is recorded in a reviewed budget line in `tests/selective-builds.test.js`, and the generated skill and MCP copies are current.
- R7. Rows that hold `.swipe-actions` are not deferred, so an open row's actions stay visible and take the pointer. Found in the code review on 2026-10-25.

### Exclusions

- Tables. Per the CSS Containment spec, layout and paint containment have no effect on internal table boxes such as `<tr>` and `<tbody>`, so `content-visibility` does nothing on table rows. The docs say tables are not supported. Plan group 1 probes this in all three engines. If every engine contradicts the spec, the scope question goes back to the user before group 2.
- A virtual list or any runtime script. The class is CSS only.
- Window-size prefixes. Deferring rows does not change the layout, so `medium:defer-render` and the like are not needed.
- Deferring swipeable rows. Their `.swipe-actions` group sits at `inset-inline-start: 100%`, outside the row, and paint containment would hide it and stop it from taking clicks. The selector skips those rows instead.
- Measuring each row's real height. Authors with mixed row heights set `--defer-render-row-size` to an average.

## Decisions

### Confirmed in the interview on 2026-10-25

- Lists only, through a container class on the list or stack instead of a class on every row. A 5,000-row list then needs one class attribute, not 5,000.
- Draw an inset focus ring inside deferred rows, since the default ring would be clipped.
- Tables are documented as unsupported.
- No virtual list. The roadmap left open "whether any use case still needs a true virtual list". The answer recorded here: one is still needed when the rows are not in the DOM at all, for example a dataset too large to render as markup or one fetched page by page during scrolling. ExpressiveCSS does not ship one, and the docs name that case.
- Start with a three-engine probe, so engine differences shape the CSS before tests are written.
- Merge requires the `checkVisibility` test, the focus-ring test, the off-screen text test, the budget line and the generated-file checks.

### Proposals for implementation

These follow from the code and can change during implementation if the code or the probe disagrees.

- Put the class in a new partial, `src/sass/utilities/_defer-render.scss`, forwarded from `utilities/_index.scss`, so a selective build can include or drop it on its own. Adding it to `$_layout` in `_helpers.scss` would also emit four prefixed copies, which R1 does not need.
- Selector: `.defer-render > *`. No component sets `contain` or `content-visibility` on a list row, so no `:where()` is needed.
- Default size: `contain-intrinsic-block-size: auto var(--defer-render-row-size, var(--md-comp-list-item-height, rem(56px)))`. `.list` defines the list item height token, so lists follow it and other containers fall back to `rem(56px)`. The block-size property leaves the width alone, since `contain-intrinsic-size` with one length would also give a skipped row a 56px intrinsic width.
- Inset ring: inside `.defer-render > *`, give `:focus-visible` content `outline-offset: -3px`, the outline's thickness, the way cards inset theirs.
- The interview's working custom property name, `--expressive-row-size`, became `--defer-render-row-size` during group 2, to match the other utility properties such as `--scroll-area-thumb-color` and `--grid-column-min`.

### Found in the code review on 2026-10-25

- In a `.list.swipeable.defer-render`, an open row's swipe actions were neither painted nor hit by `elementFromPoint` in all three engines, while the same markup without `defer-render` hit the button. The selector is now `.defer-render > :not(:has(> .swipe-actions))`, and the focus-ring rule is nested under it so swipe rows keep their normal ring.
- Two parts of R2 had no test: the list item height fallback, which row `min-height` hides unless the token is under 56px, and the remembered size. V2 now covers both.
- `content-visibility: auto` makes engines compute `contain-intrinsic-block-size` with `auto` even when the declaration leaves it out (Chromium reported `auto 56px` for a declaration without the keyword). The keyword stays in the source to state the intent; a test cannot tell the two apart.
- CSS gzip rose to 86,844 bytes (+19 over the first measurement, +108 from the merge-base).

### Open decisions

None.

## Technical constraints

- `content-visibility: auto` always applies layout, style and paint containment, and adds size containment while the row is skipped. Paint containment clips anything a row draws outside its box: focus rings, box shadows and badges that overhang the edge. R3 handles focus rings; the docs name the rest.
- Layout and paint containment make each row a containing block for absolutely and fixed positioned descendants, and a stacking context. Menus and tooltips that open in the top layer as popovers are unaffected. Anything else positioned outside the row is clipped.
- The `contain-intrinsic-block-size` estimate only affects layout while a row is skipped. A wrong estimate moves the scrollbar thumb as rows render but does not change the final layout.
- `HTMLElement.checkVisibility({ contentVisibilityAuto: true })` returns false for an element inside a row that skips its contents. The row itself still returns true, because the row is not skipped; only its contents are. Tests therefore check an element inside the row.

### Probe results on 2026-10-25

Plan group 1 ran in Playwright's Chromium, Firefox and WebKit against the base build, with `content-visibility: auto` and `contain-intrinsic-size: auto 56px` set inline on each row of a 5,000-row `.list`.

- `checkVisibility({ contentVisibilityAuto: true })` on the link inside row 4,999 returned false before `scrollIntoView()` and true after it, in all three engines. On the `<li>` itself it returned true both times.
- With the same declarations on each `<tr>` of a 5,000-row table, the cell in row 4,999 returned true while off screen in all three engines, so no engine skips table rows. Tables stay out of scope.
- A focused link that fills a deferred row showed no focus ring at all in any engine: the default ring sits wholly outside the row box, and paint containment clipped all of it. With `outline-offset: -3px` the ring showed on all four sides in every engine.
- All three engines have `window.find()`.
- The class is CSS only. It adds nothing to the JavaScript bundle and no markup rule to `semantics.json`.

## Dependencies

None. No later phase depends on this one.
