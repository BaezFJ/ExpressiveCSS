---
name: expressivecss-dashboard
description: Design and build ExpressiveCSS dashboards, analytics overviews, admin consoles, and reporting pages with the polish of a Google Material 3 product. Use for KPI rows, charts, data tables, filters, date ranges, and dashboard critique; exclude single-component fixes and token-only theming.
---

# ExpressiveCSS dashboards

Use this guide to build or review a page whose job is to show how something is doing: an analytics overview, an operations console, a sales or finance report, an admin home. It turns the general design workflow into concrete dashboard decisions so the result reads like a Google Material 3 product (Analytics, Search Console, Cloud console) built from ExpressiveCSS components.

## When to use

Read this guide for a new dashboard, a dashboard redesign or refinement, a reporting or admin overview page, or a critique of one. It applies whenever a page combines key figures, charts, tables, or filters over the same data.

## Do not use when

Do not load it for a single chart or table fix, setup-only work, or token-only theming. Those go to the selected component guide, Install, or Theming. It does not replace the [design guide](../expressivecss-design/SKILL.md) workflow or the component contracts; it narrows them for dashboards.

## Reference implementation

Open [analytics-overview.html](./assets/analytics-overview.html) before writing markup. It is a complete, browser-checked dashboard: shell, page header with scope controls, filter chips, key figures, a trend card, live activity, breakdowns, one emphasized insight, a sortable table, and a heatmap. It renders correctly in light and dark schemes and at Compact width. Copy its structure, its small `<style>` block, and its table sort handler, then replace the content with the user's data. Keep the same component choices unless the data calls for a different chart.

Read the [charts guide](../expressivecss-charts/SKILL.md) before adding any chart. It owns chart choice, the shared table contract, number parsing, chart tokens, sparklines and redrawing; this guide adds only the dashboard rules on top. Read the component guide for every component you use, including [stat](../components/stat.md), [data table](../components/data-table.md), [cards](../components/cards.md), [chips](../components/chips.md), [select](../components/select.md), [menu](../components/menu.md), [skeleton](../components/skeleton.md), [empty state](../components/empty-state.md), [navigation rail](../components/navigation-rail.md), [navigation bar](../components/navigation-bar.md), and each selected chart. For page archetypes beyond analytics (operations, sales, finance, admin), read [dashboard recipes](./references/recipes.md).

## 1. Decide what the page answers

A dashboard is a set of answers, not a set of widgets. Before markup, write down:

1. **Reader and cadence.** Who opens it, and how often. A daily glance needs four numbers and one trend. A weekly review can hold breakdowns and a table.
2. **The headline question.** "Are we growing?", "Is anything broken?", "Will we hit the quarter?" This decides the key figures and the widest card.
3. **Scope.** The default time range, the comparison baseline (previous period, same period last year, a target), and the filters that apply to every card.
4. **Follow-up questions.** Each supporting card answers one of them. If a card has no question, cut it.
5. **The next step.** What the reader does after reading: open a report, fix an incident, plan an event. Each card can end in one text-button link to that place.

Use the user's real metric names and data. When you must invent sample data, label it "Sample data" in the page header and keep the numbers internally consistent: totals match breakdowns, percentages add up, changes agree with the trend.

## 2. Page anatomy

Build these regions in this order. Skip a region the questions do not need.

| Region | Component | Notes |
| --- | --- | --- |
| Shell | `nav.navigation-rail` from Medium up, `nav.navigation-bar` on Compact | 3 to 7 peer destinations. Never both at one width. Copy the shell from the reference. |
| App bar | `header > nav` | Product or workspace name and one or two icon actions (search, help, account). Not the page title. |
| Page header | `h1.headline-medium`, freshness line, scope controls | Title on the start side; date range `select` in an outlined `.field` and secondary actions (Export, Share) on the end side. Show when the data was last updated. |
| Filters | Filter chips (`input.chip-input` + `label.chip`) in a named `role="group"` | Only filters that scope every card. A single chip is a button in disguise. |
| Key figures | `dl.stats` | Three to five figures. Each has a label, a value, and a change with its baseline. |
| Primary story | Widest card, usually a line chart | The answer to the headline question. `s12 xl8` beside a narrower companion. |
| Breakdowns | Cards with one chart each | One question per card. `s12 l6 xl4`. |
| Insight | One `article` with the `vibrant` attribute | At most one per page, with a filled button for the next step. |
| Detail | `.data-table` in a card | Exact values people sort and compare. |

Main content sits directly in `<main>` with 16px padding on Compact and 24px from Medium up. Do not wrap a dashboard in `.container`: its 70% width wastes the space dashboards need. Use the 12-column grid with `.row` for card rows and give the rows 24px of space between them.

Grid spans that hold up from Compact to Extra-large:

- Key figures: one `dl.stats`, which wraps its own tiles. Do not put stat tiles in grid columns.
- Hero row: `s12 xl8` and `s12 xl4`.
- Breakdown row: `s12 l6 xl4` three times. Below Expanded they pair and then stack.
- Detail row: `s12 xl8` table beside `s12 xl4` pattern chart.

A card's height follows the tallest card in its row. Pair cards of similar content height, and push each card's action row to the bottom so ragged content still lines up.

## 3. Surfaces and tokens

Dashboards look like Google products when the page is calm: one neutral surface, quiet filled containers, and color spent only on data and the one emphasized region. Use this block (from the reference) and nothing louder:

```css
.dashboard { padding: 16px; }
@media (width >= 600px) { .dashboard { padding: 24px; } }
.dashboard :is(article, .stats) {
  --md-comp-filled-card-container-color: var(--md-sys-color-surface-container);
  --md-comp-card-container-shape: 24px;
  --md-comp-card-content-padding: 24px;
  --md-comp-card-subhead-color: var(--md-sys-color-on-surface-variant);
  --md-comp-stat-container-color: var(--md-sys-color-surface-container);
  --md-comp-stat-shape: 24px;
}
```

- **Override component tokens on the component.** Cards and stats declare their `--md-comp-*` tokens on their own element, so a value set on `main` or `.dashboard` is ignored. Target the element (`.dashboard article`, `.dashboard .stats`) as above.
- **Cards are `article.filled`.** No shadows and no outlines between dashboard cards; the fill separates them. `surface-container` on `surface` works in both schemes because Material containers get lighter in dark mode.
- **One corner size for every card and tile.** 24px reads as Material 3 Expressive. Charts keep their own small radii.
- **Color roles only.** No hex, no gradients, no per-chart palettes. The charts already take `primary`, `tertiary`, `secondary`, and `on-surface-variant` in series order, and they follow the theme and `--md-source`.
- **One `vibrant` region per page**, on the insight or alert the reader should act on. It remaps surfaces to the tertiary container; the filled button inside still stands out.
- **One filled button per page region.** Scope controls are outlined; card links are text buttons with a trailing `arrow_forward` icon.

Brand a dashboard by setting `--md-source` on `:root`, not by recoloring charts.

## 4. Type and numbers

| Element | Role |
| --- | --- |
| Page title | `h1.headline-medium` |
| Card title | `h2.title-large` inside the card's `header` |
| Card subtitle | `p.subhead` under the title: the metric's scope or unit |
| Key figure value | Stat tile default (`headline-large`, tabular figures) |
| Live or hero number inside a card | `p.display-medium`; at most one per card |
| Freshness and metadata | `body-medium` with `on-surface-variant-text` |

Write numbers the way a careful analyst would:

- Use the locale's grouping (`12,480`), and abbreviate only past five digits (`1.2M`, `48.2K`). Keep one decimal at most.
- Give every change its direction, size, and baseline in text: `+8.2% vs previous 28 days`. The arrow is decoration.
- Use percentage points for changes in a rate: `+0.4 points`, not `+0.4%`.
- Add `negative` to a `.stat-change` when the change is bad news, whatever its direction. Fewer cancellations going down is good news: `down` without `negative`.
- Put units in the card subtitle or the column header. Charts have no y axis labels, so the subtitle has to say what is measured: "Active members per day" or "Revenue ($K)".
- When cell text is not a plain number (`48.2K`, `4.400 €`), put the number in `data-value`.

Titles are sentence case and say what the reader learns: "Where sign-ups come from", not "Acquisition chart". An insight title states the finding: "Saturday events fill fastest".

## 5. Charts on a dashboard

Choose and build each chart with the [charts guide](../expressivecss-charts/SKILL.md). On a dashboard, also:

- **Give the widest card to the headline trend.** Usually a `line-chart` of the headline metric, with the comparison period or target in a `th.dashed` column so the current series reads first.
- **One question per chart.** If a card needs two charts to make its point, it is two cards, or a `display-medium` figure with a `sparkline` under it.
- **Keep labels short.** Bar labels past 40% of the width truncate, so keep categories under about 16 characters. A full-width card at 390px fits about six x labels like "Sep 9"; more rows truncate them, so sample the range or shorten the labels.
- **Share scales between comparable charts.** Cards that compare the same measure use the same `data-min` and `data-max`.
- **Exact values go in a `.data-table`, not a chart.** Use `numeric` on number columns, `dense` inside cards and `text-nowrap` on dates. Sorting is page state: a header `<button>` does nothing until the page reorders the rows and moves `aria-sort`. Copy the reference's sort handler, or leave the headers as plain text.
- **Page scope beats card scope.** The page header's date range applies to every card. Add a per-card period switch (the charts guide's chart card recipe) only when that one card needs its own range, and say so in its subtitle.
- **No chart junk:** no 3D, no rainbow series, no gauge for a number with no limit, no second scale for an unrelated measure.

## 6. Cards

```html
<article class="filled">
  <header>
    <h2 class="title-large">Active members</h2>
    <p class="subhead">This period against the previous 28 days</p>
    <button type="button" class="icon-button menu-trigger" data-target="trend-menu" aria-label="Active members options">
      <span class="material-symbols" aria-hidden="true">more_vert</span>
    </button>
    <menu id="trend-menu">
      <li><button type="button">Download CSV</button></li>
    </menu>
  </header>
  <figure class="line-chart">…</figure>
  <div class="actions">
    <a class="button text" href="/reports/members">View members report<span class="material-symbols" aria-hidden="true">arrow_forward</span></a>
  </div>
</article>
```

- The heading and subhead must be direct children of the card's `header`, or they lose the card's type styles. The reference's `<style>` places the overflow button beside them.
- One overflow menu per card at most, named after the card. One action link per card at most.
- Do not nest cards, put stat tiles inside small cards, or wrap a table in a second outline.
- The figure, table, and body content sit 24px from the card edges. The reference's `.dashboard article > :is(figure, .data-table, .card-body)` rule does this. The charts guide's `px-4 pb-4` wrapper matches the default 16px card padding; on a dashboard that raises the padding to 24px, use the reference rule instead so content lines up with the card heading.

## 7. States

A dashboard is used while data is loading, missing, late, or broken. Build each reachable state per card, so one failed query does not blank the page.

| State | Treatment |
| --- | --- |
| Loading | Keep the card header; fill the body with `.skeleton` shapes in the chart's footprint. Set `aria-busy="true"` on the card and add a visually hidden `role="status"` message. |
| No data for the range | `.empty-state` inside the card: what is empty and why ("No events in the last 7 days"), with one action such as widening the range. |
| Query failed | Keep the header; inline message with the cause and a Retry text button. Do not use a snackbar as the only signal. |
| Stale or partial | Say so in the freshness line ("Updated 3 hours ago · Some sources delayed"). |
| Filtered to nothing | Name the active filters and offer to clear them. |

Long names, large numbers (`1,234,567`), translated labels, and right-to-left layouts must not break tiles or overflow cards.

## 8. Adapt across window sizes

- **Compact (<600px):** navigation bar, one column. Key figures wrap two per row. Wide tables scroll inside their focusable `.data-table` region; the page itself must not scroll sideways. Page header controls wrap under the title.
- **Medium and Expanded (600–1199px):** collapsed navigation rail. Breakdown cards pair up; hero cards stack.
- **Large and up (1200px+):** the full 8/4 and 4/4/4 rows. At 1600px and up, keep the grid; do not invent a third hero column.

Charts size to their card, so test their labels at each width rather than fixing heights.

## 9. Review before delivery

Render the page and look at it. Use [the design guide's review steps](../expressivecss-design/SKILL.md#5-review-with-evidence) with these dashboard checks:

- The headline question is answered in the first viewport at 1280px: key figures plus the primary trend.
- Every number has a label, a unit or scope, and a baseline for its change.
- Colors come from roles; there is at most one vibrant region and one filled button per region.
- The charts guide's "Before you finish" list passes for every chart, each card subtitle names its unit, and no truncated label hides meaning.
- Loading, empty, and error states exist for each data card the feature can reach.
- Light and dark schemes, 390px, 840px, and 1440px hold. Nothing overflows horizontally.
- `AutoInit()` runs once; no console errors.
- Run `npx --package @expressivecss/mcp-server expressivecss-lint <files>` on every markup file you touched.

Do not claim a visual check passed when you did not render the page.
