---
name: expressivecss-charts
description: Build polished, accessible ExpressiveCSS charts from data tables. Covers line, area, column, bar, pie, donut, heatmap, radar, radial, gauge, mixed and sparkline charts, chart cards and KPI dashboards. Use whenever a page with ExpressiveCSS needs a chart, graph, plot or metric tile.
---

# ExpressiveCSS charts

Every ExpressiveCSS chart is a `<figure>` holding a `<figcaption>` and a plain `<table>`. `AutoInit()` reads the table and draws an SVG over it. The table stays in the page, visually hidden, as the text alternative, and it is what shows when JavaScript does not run. Nothing else is needed: no chart library, no canvas, no JSON config.

That design decides most of the work. A good chart here is a good table first: clean headers, numbers the parser can read, a caption that names what the reader is looking at. The visual polish comes from choosing the right chart, putting it in a card with the figure it explains, and tuning a few tokens.

## When to use

Use this guide for any chart, graph, sparkline, gauge or KPI tile in a page that uses ExpressiveCSS, including dashboards and analytics pages. Pair it with [Usage](../expressivecss-usage/SKILL.md) for page layout and [Theming](../expressivecss-theming/SKILL.md) when changing brand colors. The per-chart guides in [components](../components/) hold the generated contract and rule IDs.

## Do not use when

Skip it for charts in projects without ExpressiveCSS, and for plots that need axes with tick labels, scatter plots, logarithmic scales, zooming or thousands of points. Those need a plotting library. Say so instead of forcing the data into an ExpressiveCSS chart.

## Pick the chart from the question

Ask what the reader should conclude, then pick the class. The table structure is the same for all eight, so switching later costs one class name.

| The reader should see | Class | Useful modifiers |
| --- | --- | --- |
| A trend over time | `line-chart` | `area`, `fade`, `stacked`, `sparkline`; `dashed` on a header |
| Amounts compared across periods or categories | `column-chart` | `stacked`, `track`, `fade`, `sparkline` |
| A ranking, or categories with long names | `bar-chart` | `track`, `values`, `stacked`, `split`, `sparkline` |
| Parts of a whole (2 to 6 parts) | `pie-chart` | `donut`, `values`, `sparkline`; `<tfoot>` total |
| A pattern across two categories (day by hour, rep by month) | `heatmap-chart` | `values`; `data-label` on headers |
| Several measures on one scale, compared between series | `radar-chart` | `area`, `points`, `sparkline`; `dashed` on a header |
| Progress toward a goal | `radial-chart` | `gauge`, `sparkline`; `data-max`, `<tfoot>` total |
| Different units together, such as revenue and margin | `mixed-chart` | `column`, `area`, `dashed`, `end` on headers |

Some choices that look reasonable and read badly:

- A pie with more than six slices or slices of similar size. Use a `bar-chart` sorted largest first.
- A line chart for unordered categories. Lines imply something happens between points; use columns or bars.
- A `stacked` chart with negative values. Stacking is defined for positive parts only, and the runtime does not draw it.
- Twenty series in one chart. Series take four colors (pies take six) and then repeat. Split into small multiples or a `data-table`.

## The shared table contract

```html
<figure class="column-chart">
  <figcaption>Subscriptions by plan, Q1 2026</figcaption>
  <table>
    <thead>
      <tr><th>Month</th><th>Basic</th><th>Premium</th></tr>
    </thead>
    <tbody>
      <tr><th>Jan</th><td>5,500</td><td>3,500</td></tr>
      <tr><th>Feb</th><td>6,400</td><td>3,200</td></tr>
      <tr><th>Mar</th><td>7,600</td><td>3,400</td></tr>
    </tbody>
  </table>
</figure>
```

- The first column is the category axis. Write each row label as a `<th>`.
- Each further column is a series, named by its header cell. A header cell's classes reach its series (`dashed`, and in mixed charts `column`, `area`, `end`).
- A cell's number is its text without currency signs, percent signs or grouping commas. `$4,400`, `18%` and `5,500` all parse.
- Anything else is a gap: `4.4k`, `(1,200)`, `900K`, `4.400 €`. Put the number in `data-value` and keep the friendly text, which the tooltip shows as written: `<td data-value="900000">900K</td>`.
- An empty cell is a gap too. Line charts break there; grouped columns leave the slot empty.
- `data-min` and `data-max` on the figure fix the value scale. Use them for percentages (`data-max="100"`), for budgets and meters, and to keep several charts on one page comparable.
- Charts have no y axis labels. Put the unit in the caption or a header: "Revenue ($K)", not "Revenue".

The two semantic rules that apply to every chart: the figure holds a table of the data, and the figure has a `<figcaption>`. The caption also names the focusable plot. When a card heading or stat already names the chart, keep the caption and hide it with `class="visually-hidden"`. Removing it leaves the plot unnamed.

## Making it look good

The defaults already follow the theme: series take `primary`, `tertiary`, `secondary` and `on-surface-variant`, grid lines take `outline-variant`, and everything follows light and dark mode. Most polish comes from layout and restraint, not recoloring.

**Put the chart in a card with its number.** A chart alone asks the reader to work out the point. A card that leads with the figure and a comparison, then shows the chart, gives the answer and the evidence. Use `<article class="outlined">` (or `filled`) with a `<dl class="stats">` above the figure:

```html
<article class="outlined">
  <h3>Revenue</h3>
  <div class="px-4 pb-4">
    <dl class="stats">
      <div>
        <dt>This year</dt>
        <dd>$54,500</dd>
        <dd class="stat-change up">+8.2% from last year</dd>
      </div>
    </dl>
    <figure class="line-chart area">
      <figcaption class="visually-hidden">Monthly revenue this year and last year</figcaption>
      <table><!-- … --></table>
    </figure>
  </div>
</article>
```

A card pads its headings and `<p>` elements but nothing else, so a `dl.stats` or chart placed directly in the `<article>` runs into the card's edge. Wrap them in `<div class="px-4 pb-4">` after a heading, or `<div class="p-4">` when the card has none; both match the card's 16px content padding.

`stat-change` takes `up` or `down` for the arrow and `negative` when the change is bad news (rising churn is `up negative`). The arrow is decoration, so say the direction in the text. Do not repeat a figure the KPI row already shows; give the card a different one, such as the share of target.

**Make one series the hero.** With a target, forecast or last year's figures, put `class="dashed"` on that header so the actual series reads first. Order columns so the most important series comes first; it gets `primary`.

**Use modifiers for texture, sparingly.** `area` with one or two series gives a line chart weight. `fade` softens line ends and column bases. `track` on bar and column charts gives each value a visible "out of" and suits rankings and progress. `values` on bars, pies and heatmaps prints the numbers so the reader does not have to hover. Pick one or two per chart.

**Size with tokens, inline or in your stylesheet.** Each chart exposes `--md-comp-<chart>-height` plus a few chart-specific tokens. A compact tile reads better with a shorter plot and no grid:

```html
<figure class="line-chart area" style="--md-comp-line-chart-height: 120px; --md-comp-line-chart-line-width: 2px; --md-comp-line-chart-grid-color: transparent">
```

**Sparklines for KPI rows.** `sparkline` makes a 48px chart with no grid, labels, legend or tooltip, and takes it out of the tab order. Put one beside a stat with `flex-1` so it fills the rest of the tile. The table still carries the data, so the caption still matters.

**Recolor through tokens, not hex values.** To tie a chart to a role, set the series token to a system color: `--md-comp-column-chart-color-1: var(--md-sys-color-tertiary)`. System colors keep light/dark switching and contrast intact; a hard-coded hex value breaks dark mode. For brand-wide changes, change the theme seed (see Theming) and every chart follows.

**Lay out dashboards on the grid.** Use `<div class="row">` with `s12 m6 l4` style columns so cards stack on phones. Leave the row's default gap: the grid always has 12 tracks, so a wider gutter such as `g-4` (1.5 times the default) adds up past a phone's width and scrolls the page sideways. Give comparable charts the same `data-min` and `data-max`.

For complete patterns (chart card with a period switch, KPI row with sparklines, a dashboard section, budget meter, gauge), read [recipes](./references/recipes.md).

## Interactivity and updates

Every chart except a sparkline is one Tab stop with a pointer and keyboard tooltip that is a polite live region. You do not add any ARIA, `tabindex` or event handlers for that.

To change data, edit the table and call the chart's `init` again:

```js
const figure = document.querySelector('#revenue .line-chart');
figure.querySelector('tbody').replaceChildren(...newRows);
Expressive.LineChart.init(figure);
```

The classes are `LineChart`, `ColumnChart`, `BarChart`, `PieChart`, `HeatmapChart`, `RadarChart`, `RadialChart` and `MixedChart`. Each instance has `show(index)` (`-1` hides the tooltip) and `destroy()`, which removes the drawing and shows the table. Charts added after page load need `init` or another `AutoInit()` call. With the ES module build, import the class: `import { AutoInit, LineChart } from '@expressivecss/expressive'`.

A period switch is a `button-group connected` with `data-selection="single"`; on click, swap the rows, update the stat text and redraw. The recipe has the full code.

## Chart-specific details worth knowing

- **Line:** `stacked` draws each series on the total of those before it, from zero. An empty cell breaks that series and the ones above it.
- **Column:** the scale always includes zero. Negative columns hang below it.
- **Bar:** height grows with rows (`--md-comp-bar-chart-row-height`, 40px). Labels take up to 40% of the width, then ellipsis. `stacked track` with `data-max` set to a budget makes a single-row meter of spent and left.
- **Pie:** draws the first value column only. A `<tfoot>` row is the total and shows in a `donut`'s hole; it is not a slice. Slices under 5% get no `values` label. Zero and negative cells draw no slice.
- **Heatmap:** shades from `--md-comp-heatmap-chart-empty-color` to `--md-comp-heatmap-chart-color`. `data-label` on a header cell shortens its label on the grid (`data-label="M"` for Monday); an empty `data-label` hides it, which suits hour columns where every third label is enough.
- **Radar:** each row is a spoke. Use 5 to 8 measures on the same scale and set `data-max`. More than three series turns into a tangle.
- **Radial:** each row of the first value column is a ring filled as a share of `data-max` (default 100). `gauge` draws a half circle. A `<tfoot>` row shows in the middle.
- **Mixed:** header classes choose the kind: `column`, `area`, or a line, with `dashed` available. `end` puts a series on a second scale, fixed with `data-end-min` and `data-end-max`. Name both units in the headers. `stacked` is not supported.

Read the full section in the target version's [API reference](https://www.expressivecss.com/llm.md) before using an option not listed here.

## Before you finish

1. Every figure has a `<figcaption>` (visible or `.visually-hidden`) and a `<table>` with a `<thead>`.
2. Every non-plain number (`900K`, `4.4k`, `1.234,5`) has a `data-value`. A chart full of gaps is the most common silent failure.
3. Units appear in the caption, a header or the stat, since no chart has a y axis.
4. Stacked charts have only positive values.
5. The page calls `Expressive.AutoInit()` after the script loads, and code that rewrites a table calls `init` again.
6. Colors come from tokens or `var(--md-sys-color-*)`, so dark mode still works.
7. Stats and charts inside cards sit in a padded wrapper, not directly in the `<article>`.
8. Run `npx --package @expressivecss/mcp-server expressivecss-lint <files>` on touched markup when available. It only inspects files under the directory it runs from, so run it from the project root with relative paths. If you can open the page in a browser, check light and dark mode, a 390px width for sideways scrolling, and Tab to each chart; otherwise say the visual check was not done.
