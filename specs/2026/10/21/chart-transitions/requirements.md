# Chart transitions between datasets

Date: 2026-10-21
Roadmap phase: Phase 22, chart transitions between datasets
Branch: `feature/2026-10-21-chart-transitions`
Base: `origin/master` at `8d45c2c4`, fetched 2026-10-21
Status: implemented 2026-10-21. Local checks pass except the gzip budget test, which fails on this machine for master too (see V9); CI and review pending

Follow the [mission's product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 22](../../../../roadmap.md#phase-22-chart-transitions-between-datasets). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user assigned Phase 22 directly, because several roadmap phases are being built in parallel threads. Earliest-phase selection does not apply. Phase 22 has no dependency. Phase 23, charts that follow their table, is being built at the same time around `update()`, so this change keeps its edits to `update()` small.

Merged history on local refs (fetched 2026-10-21) has `update()` from #360 and the `.toggle` legend from #363. No commit or spec adds transitions between datasets.

## Delegation

The user invoked feature-spec-auto and handed plan, requirements and validation decisions to the agent. No interview took place. The decisions below come from project evidence, and the agent records them here; the user has not reviewed them.

## Current behavior

These facts come from the base commit.

- `LineChart.update()` (`src/ts/components/lineChart.ts`) reads the table again, builds a new plot and removes the old one. Every mark is a new node.
- Lines, areas and `.points` dots are SVG `<path>` elements drawn by `_line()` in a 0 to 100 box. A new path appears at its final shape with no motion.
- Columns (`ColumnChart`), bars (`BarChart`) and mixed chart columns are HTML spans clipped with `clip-path: inset()` from their `--top` and `--bottom`. Under `prefers-reduced-motion: no-preference`, their stylesheets transition `clip-path` over `--md-sys-motion-duration-medium4` with `--md-sys-motion-easing-standard`, and an `@starting-style` rule collapses each new span at the zero line: through `--zero` for columns, and through `--bar-chart-zero-left` and `--bar-chart-zero-right` for bars. So after `update()` every column grows again from zero, not from its old value.
- Pie, radar, radial and heatmap charts override `_draw()` and do not use `_line()` or the column spans. They reach `LineChart.update()`, directly or through `super.update()`, so the recorded old series must be harmless to them.

## Decisions from project evidence

- Duration and easing: `--md-sys-motion-duration-medium4` (400ms) and `--md-sys-motion-easing-standard` (`cubic-bezier(0.2, 0, 0, 1)`). The column, bar and mixed stylesheets already use this pair for their entrance, so lines and columns in one chart move together. `src/sass/tokens/_motion.scss` says components read the tokens, so an override of either token changes the chart's pace too. An easing token that is not a `cubic-bezier()` gives the lines the standard curve.
- Lines and areas animate with an SVG `<animate attributeName="d">` element, because WebKit does not support the CSS `d` property. The agent checked this on 2026-10-21 with Playwright: `CSS.supports('d', 'path("M0,0")')` is false in WebKit and true in Chromium and Firefox. SMIL path animation works in all three engines.
- Columns and bars keep the existing CSS transition. Their `@starting-style` sets `--top` and `--bottom` with `!important` from `--from-top` and `--from-bottom`, which `ColumnChart` writes on each span after `update()`. The `!important` is needed because `--top` and `--bottom` are inline styles. Without the start properties the rule falls back to the zero line, as today. Bars derive `--bar-chart-left` and `--bar-chart-right`, with their RTL swap and split gaps, from `--top` and `--bottom` on the same span, so the one override replaces the bar's `--bar-chart-zero-*` starting inset too. Playwright confirmed that a custom property in `@starting-style` starts the `clip-path` transition in all three engines.
- Matching: a series matches the drawn series of the same table column, the key the `.toggle` legend already uses. Values match by row index, at the new row's position.
- A series or value with no old match grows from its base. For lines and areas that is the plot bottom; for a column, the zero line. In a stack, it grows from where the series below it starts, so the stack stays joined while it moves.
- A series, row or value that goes away is removed at once, as it is today.
- Reduced motion: when `prefers-reduced-motion: reduce` matches, `update()` adds no `<animate>` elements and writes no start positions, so the final shape appears at once. The stylesheets already turn off the column transition under that query.
- An `update()` during a running transition starts the new one from the previous target, not from the shape on screen at that moment. Reading a running SMIL path is not possible in current engines. This is a documented limit.
- Added after the final review: a zero `--md-sys-motion-duration-medium4` skips the line motion. A Playwright probe showed that SVG treats `dur="0s"` as indefinite and holds the old shape in all three engines.

### Documented limits

Found during the final review and left as limits, with a `ponytail:` comment where they live in code:

- An easing token that overshoots, such as `cubic-bezier(0.34, 1.56, 0.64, 1)`, is not a valid SVG spline, so the lines skip their motion while the columns still overshoot.
- In a stacked mixed chart with columns on both scales, a new end-scale column series starts from the top of the start-scale stack instead of its own zero.
- `--from-top` and `--from-bottom` stay on the spans. A chart hidden with `display: none` and shown again replays its columns from the values before the last `update()`, where it used to grow them from zero.

## Opt-in or migration

The roadmap phase makes the transition the behavior of `update()`, and reduced motion already opts readers out. A page needs no change. The changelog carries a migration note instead of a new opt-in option.

## Scope

In scope: line chart lines, areas and points; column chart columns; bar chart bars; mixed chart columns, lines and areas.

Out of scope:

- Pie, radar, radial and heatmap charts, which have their own drawing.
- The axis labels, grid lines, row labels and legend. They switch to the new values at once.
- The first draw. Lines still appear at once and columns still grow from zero.
- A transition on resize, or any new option to turn transitions off. Reduced motion is the opt-out.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | After `update()`, each line path of a line chart moves from the shape the series had before to its new shape over the medium4 duration with the standard easing, read from the two motion tokens on the chart. The area path and `.points` path move the same way. A path whose shape did not change gets no animation. |
| R2 | After `update()`, each column of a column chart, each bar of a bar chart and each column of a mixed chart moves from its old top and bottom to its new ones through the existing `clip-path` transition. |
| R3 | A mixed chart's lines and areas move as R1 describes, alongside its columns. |
| R4 | A series new to the drawing, such as one added to the table or shown again through a `.toggle` legend, grows from its base, as do values at new row indexes or values that replace gaps. A line or unstacked area starts at the plot bottom, a column at the zero line, and a stacked series where the series below it starts. Removed series, rows and values disappear at once. |
| R5 | With `prefers-reduced-motion: reduce`, `update()` draws the final shape at once: no `<animate>` element is added and no running animation is left on the chart. |
| R6 | Existing behavior stays: focus and the highlighted row carry over `update()`, the `.toggle` legend keeps its state, the first draw is unchanged, and pie, radar, radial and heatmap charts draw as before. The existing chart tests pass. |
| R7 | Docs and generated guidance describe the transition. The line, column, bar and mixed sections of `llm.md` and their docs pages say that `update()` moves the marks from their old values and that reduced motion skips it. The unreleased changelog lists it under Added, with a `Migration:` note, since the mission asks for one when existing markup behaves differently: columns stop growing again from zero on `update()`, and lines start to move. No page change is needed. `npm run build:skill` regenerates the derived files and `npm run check:generated` passes. |
| R8 | JS and CSS gzip size changes are recorded in reviewed budget lines in `tests/selective-builds.test.js`. New functions stay below cyclomatic complexity 5 for the fallow pre-commit gate. |

## Constraints and dependencies

- Keep `update()`'s focus and highlight logic as it is. The only addition there records the drawn series before the redraw, so Phase 23 merges with little conflict.
- Add no runtime dependency and no JavaScript animation loop. The browser runs both kinds of motion.
- Tests run against built bundles. Sampling mid-transition must not depend on wall-clock time: pause SVG time with `pauseAnimations()` and `setCurrentTime()`, and pause CSS transitions through `getAnimations()`.
- No markup changes, so `semantics.json` does not change.
