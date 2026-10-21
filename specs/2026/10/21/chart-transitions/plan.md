# Chart transitions plan

Phase 22, chart transitions between datasets. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

## 1. Lines and areas move from their old shape

Prerequisites: none.

- [ ] Add a browser test that updates a line chart and samples the line, area and points paths mid-transition with SVG time paused, then checks the final shape and the reduced-motion case.
- [ ] In `update()`, keep the drawn series from before the redraw, or none under reduced motion.
- [ ] Split `_line()` path building so the same code draws the final shape and the start shape, and add an `<animate attributeName="d">` with the motion tokens when they differ.
- [ ] Start a new series, row or value from its base, and a stacked one from the series below.

Completion check: V1, V2, V4 pass in Chromium, Firefox and WebKit. Covers R1, R4, R5.

## 2. Columns and bars move from their old values

Prerequisites: group 1, for the kept series.

- [ ] Add browser tests that update a column chart and a bar chart and sample a column mid-transition with the CSS transition paused.
- [ ] In `ColumnChart._draw()`, write `--from-top` and `--from-bottom` on each span from the old series, or from the segment below for a new stacked one.
- [ ] In the column, bar and mixed stylesheets, make `@starting-style` set `--top` and `--bottom` from those properties, falling back to the zero line.

Completion check: V3, V5 pass in the three engines. Covers R2, R4, R5.

## 3. Mixed charts

Prerequisites: groups 1 and 2.

- [ ] Add a mixed chart case to the browser test: its column and its line both move.

Completion check: V6 passes. Covers R3.

## 4. Regression, docs and budgets

Prerequisites: groups 1 to 3.

- [ ] Run the existing chart tests (V7).
- [ ] Update `llm.md`, the four docs pages and the changelog; run `npm run build:skill` and `npm run check:generated` (V8).
- [ ] Record the gzip budgets (V9) and run `npm run verify` (V10).

Completion check: V7 to V10 pass. Covers R6, R7, R8.
