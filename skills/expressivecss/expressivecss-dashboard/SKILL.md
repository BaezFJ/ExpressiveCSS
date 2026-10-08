---
name: expressivecss-dashboard
description: Designs, builds and reviews ExpressiveCSS dashboards, analytics overviews, admin consoles and reporting pages that read like a Google Material 3 product. Use for KPI rows, charts on a dashboard, data tables, filters, date ranges, loading and empty states, and dashboard critique. Not for a single chart or table fix, setup only, or token-only theming.
---

# ExpressiveCSS dashboards

Use this guide to build or review a page that shows how something is doing: an analytics overview, an operations console, a sales or finance report, an admin home. It narrows the [design guide](../expressivecss-design/SKILL.md) workflow to dashboard decisions so the result reads like a Material 3 product such as Google Analytics or Search Console. A single chart or table fix goes to the component guide, setup to Install, and token-only theming to Theming.

## Start from the reference

Read [analytics-overview.html](./assets/analytics-overview.html) before writing markup. It is a static, browser-checked page with a shell, a page header with scope controls, filter chips, key figures, a trend card, live activity, breakdowns, one emphasized insight, a sortable table and a heatmap. It holds up in light and dark schemes and at Compact width. Copy its structure, its `<style>` block and its table sort handler into the user's page, point the stylesheet and script at the project's install paths, and replace the content with the user's data. Keep its component choices unless the data calls for a different chart.

Then read, as each becomes relevant:

- the [charts guide](../expressivecss-charts/SKILL.md) before adding any chart. It owns chart choice, the table contract, number parsing, honest scales, chart tokens, sparklines and redrawing. This guide adds only dashboard rules.
- the component guide for each component you place: [stat](../components/stat.md), [data table](../components/data-table.md), [cards](../components/cards.md), [chips](../components/chips.md), [select](../components/select.md), [menu](../components/menu.md), [skeleton](../components/skeleton.md), [empty state](../components/empty-state.md), [navigation rail](../components/navigation-rail.md), [navigation bar](../components/navigation-bar.md), and each selected chart.
- [dashboard recipes](./references/recipes.md) when the page is an operations, sales, finance or admin dashboard, or to pick a card and table density.

## Workflow

Copy this checklist and tick it off:

```
- [ ] 1. Write down what the page answers
- [ ] 2. Map regions and grid spans
- [ ] 3. Apply the surface block and color roles
- [ ] 4. Write titles and numbers
- [ ] 5. Build each chart with the charts guide
- [ ] 6. Build cards
- [ ] 7. Add loading, empty, error and stale states per card
- [ ] 8. Check each window size class
- [ ] 9. Review, fix, and review again
```

## 1. Decide what the page answers

A dashboard is a set of answers. Before markup, write down:

1. Who opens it and how often. A daily glance needs four numbers and one trend. A weekly review can hold breakdowns and a table.
2. The headline question, such as "Are we growing?", "Is anything broken?" or "Will we hit the quarter?". It decides the key figures and the widest card.
3. The scope: the default time range, the comparison baseline (previous period, same period last year, a target), and the filters that apply to every card.
4. The follow-up questions. Each supporting card answers one. Cut a card that answers none.
5. The next step the reader takes, such as opening a report, fixing an incident or planning an event. Each card can end in one text-button link to that place.

Use the user's real metric names and data. When you must invent sample data, label it "Sample data" in the page header and keep the numbers consistent: totals match breakdowns, percentages add up, and changes agree with the trend.

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
| Alert | One error-colored card at the top (see section 3) | Only while something is wrong: what broke, the impact, and one filled button to the incident. |
| Insight | One `article` with the `vibrant` attribute | At most one per page, with a filled button for the next step. |
| Detail | `.data-table` in a card | Exact values people sort and compare. |

Main content sits directly in `<main>` with 16px padding on Compact and 24px from Medium up. Do not wrap a dashboard in `.container`; its 70% width wastes the space dashboards need. Use the 12-column grid with `.row` for card rows and 24px between rows.

Grid spans that hold up from Compact to Extra-large:

- Key figures: one `dl.stats`, which wraps its own tiles. Do not put stat tiles in grid columns.
- Hero row: `s12 xl8` and `s12 xl4`.
- Breakdown row: `s12 l6 xl4` three times. Below Expanded they pair and then stack.
- Detail row: `s12 xl8` table beside `s12 xl4` pattern chart.

A card's height follows the tallest card in its row. Pair cards of similar content height, and push each card's action row to the bottom so ragged content still lines up.

## 3. Surfaces and tokens

Google products look calm because the page has one neutral surface, quiet filled containers, and color spent only on data and one emphasized region. The reference's "Dashboard surfaces" CSS sets this up: `surface-container` fills, and the same 24px corner and content padding on every card and stat tile. Copy it and add nothing louder. Charts keep their own small radii.

- Cards and stats declare their `--md-comp-*` tokens on their own element, so a value set on `main` or `.dashboard` is ignored. Target the element, as the reference's `.dashboard :is(article, .stats)` selector does.
- Cards are `article.filled`, with no shadows or outlines between them; the fill separates them. `surface-container` on `surface` works in both schemes because Material containers get lighter in dark mode.
- Use color roles only: no hex, gradients or per-chart palettes. Brand a dashboard by setting `--md-source` on `:root`; the charts follow.
- Put the `vibrant` attribute on one region per page, the insight or opportunity the reader should act on. It remaps surfaces to the tertiary container, and the filled button inside still stands out. `vibrant` means emphasis, never alarm.
- Problems take the error roles. An active incident, a failed payment run or a breached limit goes in a card painted with the error container, so it reads as a problem in both schemes:

  ```css
  .dashboard article.alert {
    --md-comp-filled-card-container-color: var(--md-sys-color-error-container);
    --md-comp-card-headline-color: var(--md-sys-color-on-error-container);
    --md-comp-card-subhead-color: var(--md-sys-color-on-error-container);
    --md-comp-card-supporting-text-color: var(--md-sys-color-on-error-container);
    --md-comp-filled-button-container-color: var(--md-sys-color-error);
    --md-comp-filled-button-label-text-color: var(--md-sys-color-on-error);
  }
  ```

  Pair the color with an `error` icon and words ("Active incident"), never color alone.
- Each page region has at most one filled button. Scope controls are outlined; card links are text buttons with a trailing `arrow_forward` icon.

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
- Give every change its direction, size and baseline in text: `+8.2% vs previous 28 days`.
- Use percentage points for changes in a rate: `+0.4 points`, not `+0.4%`.
- Mark bad news with `negative` as the [stat guide](../components/stat.md) describes, whatever the direction. Fewer cancellations is `down` without `negative`.
- Name the unit in the card subtitle or column header, such as "Active members per day" or "Revenue ($K)".

Titles are sentence case and say what the reader learns: "Where sign-ups come from", not "Acquisition chart". An insight title states the finding: "Saturday events fill fastest".

## 5. Charts on a dashboard

Choose and build each chart with the [charts guide](../expressivecss-charts/SKILL.md). On a dashboard, also:

- Give the widest card to the headline trend, usually a `line-chart` with the comparison period or target in a `th.dashed` column.
- Ask one question per chart. A card that needs two charts is two cards, or a `display-medium` figure with a `sparkline` under it.
- Use `values` on a bar chart only when the smallest bar is at least about a sixth of the largest; shorter bars push their text into the next label. Otherwise leave the numbers to the tooltip and table.
- Keep bar categories under about 16 characters so they do not truncate. A full-width card at 390px fits about six x labels like "Sep 9"; for more rows, sample the range or shorten the labels.
- Put exact values in a `.data-table`. Use `numeric` on number columns, `dense` inside cards and `text-nowrap` on dates. Sorting is page state: a header `<button>` does nothing until the page reorders the rows and moves `aria-sort`. Copy the reference's sort handler, or leave the headers as plain text.
- Let the page header's date range scope every card. Add a per-card period switch (the charts guide's recipe 2) only when one card needs its own range, and say so in its subtitle.
- Leave out 3D, rainbow series, a gauge for a number with no limit, and a second scale for an unrelated measure.

## 6. Cards

The reference's "Active members" card is the pattern: a `header` with an `h2.title-large`, a `p.subhead` and an optional overflow menu, then the figure, then a `div.actions` with one text-button link.

- The heading and subhead must be direct children of the card's `header`, or they lose the card's type styles. The reference's `<style>` places the overflow button beside them.
- One overflow menu per card at most, named after the card. One action link per card at most.
- A list of people or items that need attention gives each row its own action (Message, Review, Retry), with the item named in the accessible name ("Message Maya Patel"). A list with no actions is a report.
- Do not leave a short card stretched beside a tall one. Pair cards of similar height, move the short one into a row of its peers, or give it the supporting figure that makes its point (a sparkline, the numbers behind an insight).
- Do not nest cards, put stat tiles inside small cards, or wrap a table in a second outline.
- The figure, table and body content sit 24px from the card edges through the reference's `.dashboard article > :is(figure, .data-table, .card-body)` rule. Use it instead of the charts guide's `px-4 pb-4` wrapper, which matches the default 16px padding, so content lines up with the card heading.

## 7. States

Build each reachable state per card, so one failed query does not blank the page.

| State | Treatment |
| --- | --- |
| Loading | Keep the card header; fill the body with `.skeleton` shapes in the chart's footprint. Set `aria-busy="true"` on the card and add a visually hidden `role="status"` message. |
| No data for the range | `.empty-state` inside the card: what is empty and why ("No events in the last 7 days"), with one action such as widening the range. |
| Query failed | Keep the header; inline message with the cause and a Retry text button. Do not use a snackbar as the only signal. |
| Stale or partial | Say so in the freshness line ("Updated 3 hours ago · Some sources delayed"). |
| Filtered to nothing | Name the active filters and offer to clear them. |

Long names, large numbers (`1,234,567`), translated labels and right-to-left layouts must not break tiles or overflow cards.

## 8. Adapt across window sizes

- Compact (below 600px): navigation bar, one column. Key figures wrap two per row. Wide tables scroll inside their focusable `.data-table` region, and the page itself does not scroll sideways. Page header controls wrap under the title.
- Medium and Expanded (600 to 1199px): collapsed navigation rail. Breakdown cards pair up; hero cards stack.
- Large and up (1200px and wider): the full 8/4 and 4/4/4 rows. At 1600px and up, keep the grid and do not add a third hero column.

Charts size to their card, so test their labels at each width instead of fixing heights.

## 9. Review before delivery

Render the page and look at it, following [the design guide's review steps](../expressivecss-design/SKILL.md#5-review-with-evidence). Check each item, fix every failure in one grouped edit, then check again:

- The headline question is answered in the first viewport at 1280px: key figures plus the primary trend.
- Every number has a label, a unit or scope, and a baseline for its change. Sample data is labelled and internally consistent.
- Colors come from roles. There is at most one vibrant region and one filled button per region, and problems use the error roles.
- No card has a large empty area, and every attention list row has an action.
- The charts guide's "Before you finish" list passes for every chart, and no truncated label hides meaning.
- Loading, empty and error states exist for each data card the feature can reach.
- Light and dark schemes hold at 390px, 840px and 1440px, with no horizontal overflow.
- `AutoInit()` runs once and the console has no errors.
- The static checks pass on every markup file you touched: `quality_inspector` through MCP, or `npx --package @expressivecss/mcp-server expressivecss-lint <files>`. Linter releases older than the fix for `legacy-card-content` flag the `--md-comp-card-content-padding` token by mistake; treat that one finding as a false positive.

For a dashboard with many cards, the review splits well across subagents following the [delegation reference](../references/delegation.md). Useful independent scopes are the number audit (every figure, change and total checked against the source data, using section 4), the rendered review across schemes and widths, and the per-card state review. Add this guide to each brief, and have reviewers name the card in each finding's location. A small dashboard does not need subagents.

Do not claim a visual check passed when you did not render the page.
