# Dashboard recipes

Region maps for common dashboard archetypes. Each one reuses the shell, surfaces, and card pattern from [analytics-overview.html](../assets/analytics-overview.html); only the questions and components change. Pick the closest recipe, then cut regions the reader does not need.

## Analytics overview

The reference implementation. Reader: a product or community lead, weekly.

- Scope: date range select (Last 7, 28, 90 days), comparison with the previous period, audience filter chips.
- Key figures: active users, new users, a conversion or engagement count, and one loss metric (churn, cancellations) whose decrease is good news.
- Hero: line chart of the headline metric, current period against a dashed previous period, beside a "Right now" card with a `display-medium` count, a column sparkline, and a short bar chart of top pages.
- Breakdowns: acquisition sources (bar chart), devices or platforms (donut), one vibrant insight.
- Detail: top content or events table, sorted by the headline metric, beside an activity heatmap.

## Operations and monitoring

Reader: an on-call engineer or support lead, many times a day. The question is "is anything broken?", so status comes before trends.

- Page header: environment or region select, auto-refresh state in the freshness line ("Live · Updated 12 seconds ago"), no Export.
- Alert strip: when something is wrong, one `article.filled.alert` (the error-container card from the guide's section 3) at the top holding the active incident, its impact, and a filled "View incident" button. When nothing is wrong, a one-line inline status ("All systems normal") instead of an empty card. Keep `vibrant` for insights, not incidents.
- Key figures: error rate, p95 latency, availability, open incidents. Mark worsening values `negative`. Use units in the value (`212 ms`, `99.95%`).
- Hero: mixed chart of request volume (`th.column`) against error rate (`th.end` line), or a line chart of latency percentiles with the SLO as a dashed series.
- Breakdowns: radial gauge for capacity or error budget remaining (`data-max` is the budget), bar chart of errors by service.
- Detail: services table with a status column. Status is text plus an icon (`check_circle`, `warning`, `error`), never color alone. Use a `badge` only for counts on navigation.

## Sales and revenue

Reader: a sales manager or founder, weekly and at quarter end. The question is "will we hit the target?".

- Scope: quarter or month select, team or region filter chips.
- Key figures: revenue to date, percent of target, pipeline value, win rate (changes in points).
- Hero: mixed chart of monthly revenue (`th.column`) with a dashed target line, beside a radial gauge of quarter attainment with the target as `data-max`.
- Breakdowns: revenue by plan (column chart, `stacked` when plans add up), deals by stage (bar chart in stage order, not sorted), lead sources (donut, five parts at most).
- Detail: open deals table with `numeric` amount and close date columns, sorted by close date; a heatmap of revenue by rep and month when comparing people.

## Finance and spend

Reader: a finance owner or team lead, monthly. The question is "where is the money going, and are we within budget?".

- Key figures: spend this month, budget remaining, forecast for month end, largest change by category.
- Hero: line chart of cumulative spend with the budget as a dashed series, or a bar chart meter: one row in a `stacked track split` bar chart with `data-max` set to the budget.
- Breakdowns: spend by category (bar chart, `values`), spend by team (column chart, `stacked`).
- Detail: transactions table, `dense`, with `numeric` amounts, a date column, and a category column. Negative amounts keep their sign in text.

## Admin console home

Reader: an administrator, occasionally. The page is a launch point more than a report.

- Key figures: users, licenses used of total, pending requests, security alerts. Fewer charts, more next steps.
- Hero: a radial gauge of license usage beside a short list (`ul.list`) of pending tasks, each row a link to the place where it is resolved.
- Breakdowns: sign-in activity (column chart by day), devices by platform (donut).
- Detail: recent audit events as a `timeline` or table with actor, action, and time.
- Destructive or bulk actions live on their own pages, not on the home dashboard.

## Choosing density

| Reader looks at it | Key figures | Cards below | Table rows |
| --- | --- | --- | --- |
| Many times a day | 4 to 5, live | 3 to 5 | 10, `dense` |
| Weekly | 4 | 5 to 7 | 5 to 10 |
| Monthly or occasionally | 3 to 4 | 3 to 5 | 5, with a link to the full report |

More cards do not make a better dashboard. When a page needs more than about eight cards, split it into tabs inside the page (`nav.tabs`) or separate reports, and keep the overview to the questions every reader asks.
