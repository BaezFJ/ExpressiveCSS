# Chart recipes

Complete patterns built from the shipped examples. Copy the structure, then replace the data. Tables are shortened with `<!-- … -->` where the rows repeat.

## Contents

1. Page skeleton
2. Chart card with a period switch
3. KPI row with sparklines
4. Donut with its total
5. Budget meter
6. Progress gauge
7. Activity heatmap
8. Dashboard section

## 1. Page skeleton

A standalone page needs the stylesheet, the script and one `AutoInit()` call. Paths follow the install guide; with a bundler, import `@expressivecss/expressive/css` and call `AutoInit()` from `@expressivecss/expressive` instead.

```html
<!doctype html>
<html lang="en" theme="light">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="dist/css/expressive.min.css">
  </head>
  <body>
    <main class="container">
      <!-- charts -->
    </main>
    <script src="dist/js/expressive.min.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', () => Expressive.AutoInit());
    </script>
  </body>
</html>
```

`lang` matters: pie shares are formatted in the page's language.

## 2. Chart card with a period switch

The stat answers the question, the chart shows the evidence, and the switch narrows the period. All twelve rows ship in the HTML; the script keeps a copy and shows the last N.

```html
<article class="outlined" id="revenue-card">
  <div class="p-4">
    <div class="flex flex-wrap justify-between align-start gap-3">
      <dl class="stats my-0">
        <div>
          <dt>Revenue</dt>
          <dd>$54,500</dd>
          <dd class="stat-change up">+8.2% from last year</dd>
        </div>
      </dl>
      <div class="button-group connected xsmall" data-selection="single"
           data-selection-required role="group" aria-label="Period">
        <button type="button" class="button tonal" aria-pressed="true"
                data-period="12" data-total="$54,500"
                data-change="+8.2% from last year">Year</button>
        <button type="button" class="button tonal" aria-pressed="false"
                data-period="6" data-total="$28,000"
                data-change="+9.8% from last year">6 months</button>
      </div>
    </div>
    <figure class="line-chart area">
      <figcaption class="visually-hidden">Monthly revenue this year and last year</figcaption>
      <table>
        <thead><tr><th>Month</th><th>This year</th><th class="dashed">Last year</th></tr></thead>
        <tbody>
          <tr><th>Jan</th><td>$4,400</td><td>$4,000</td></tr>
          <tr><th>Feb</th><td>$3,400</td><td>$4,400</td></tr>
          <!-- … through Dec -->
        </tbody>
      </table>
    </figure>
  </div>
</article>

<script>
  const card = document.getElementById('revenue-card');
  const figure = card.querySelector('.line-chart');
  const body = figure.querySelector('tbody');
  const rows = [...body.rows];
  card.querySelectorAll('[data-period]').forEach((button) => {
    button.addEventListener('click', () => {
      body.replaceChildren(...rows.slice(-Number(button.dataset.period)));
      card.querySelector('.stats dd').textContent = button.dataset.total;
      card.querySelector('.stat-change').textContent = button.dataset.change;
      Expressive.LineChart.init(figure);
    });
  });
</script>
```

The `p-4` wrapper gives the stat and chart the card's 16px padding; cards pad only headings and paragraphs themselves. The button group manages `aria-pressed` itself. Compute the stat totals from the same numbers as the table so they agree.

## 3. KPI row with sparklines

A row of short tiles, each a stat with a sparkline filling the rest of the width. Sparklines are not focusable, so the stat text has to carry the point on its own.

```html
<div class="row">
  <div class="s12 m6 l4">
    <article class="outlined">
      <div class="flex align-center justify-between gap-3 p-4">
        <dl class="stats my-0">
          <div>
            <dt>Balance</dt>
            <dd>$5,000</dd>
            <dd class="stat-change up">+25% over 14 days</dd>
          </div>
        </dl>
        <figure class="line-chart sparkline area flex-1 my-0"
                style="--md-comp-line-chart-height: 72px">
          <figcaption class="visually-hidden">Balance over 14 days</figcaption>
          <table>
            <thead><tr><th>Day</th><th>Balance</th></tr></thead>
            <tbody>
              <tr><th>Day 1</th><td>$4,000</td></tr>
              <!-- … -->
            </tbody>
          </table>
        </figure>
      </div>
    </article>
  </div>
  <!-- two more tiles: a column-chart sparkline for orders, a line for churn with `up negative` -->
</div>
```

For a taller tile with the chart under the stat, drop `sparkline` and shrink the plot: `--md-comp-line-chart-height: 120px; --md-comp-line-chart-line-width: 2px; --md-comp-line-chart-grid-color: transparent`.

## 4. Donut with its total

```html
<article class="outlined">
  <h3>Lead sources</h3>
  <div class="px-4 pb-4">
    <figure class="pie-chart donut values" style="--md-comp-pie-chart-height: 200px">
      <figcaption class="visually-hidden">Lead sources, last six months</figcaption>
      <table>
        <thead><tr><th>Source</th><th>Leads</th></tr></thead>
        <tbody>
          <tr><th>Referrals</th><td>558</td></tr>
          <tr><th>Organic search</th><td>434</td></tr>
          <tr><th>Paid campaigns</th><td>248</td></tr>
        </tbody>
        <tfoot><tr><th>Total leads</th><td>1,240</td></tr></tfoot>
      </table>
    </figure>
  </div>
</article>
```

Sort rows largest first so slices run clockwise from the biggest. Keep it to six rows or fewer; fold the tail into "Other".

## 5. Budget meter

One stacked row with `track` and `data-max` set to the budget. Segments are what is spent; the track is what is left.

```html
<article class="outlined">
  <div class="p-4">
    <dl class="stats my-0">
      <div>
        <dt>Spending limit</dt>
        <dd>$4,200</dd>
        <dd class="stat-change">of $10,000 this month</dd>
      </div>
    </dl>
    <figure class="bar-chart stacked split track" data-max="10000" style="
        --md-comp-bar-chart-bar-height: 100%;
        --md-comp-bar-chart-shape: 8px;
        --md-comp-bar-chart-grid-color: transparent">
      <figcaption class="visually-hidden">Spending by category, April</figcaption>
      <table>
        <thead><tr><th>Month</th><th>Ads</th><th>Software</th><th>Payroll tools</th><th>Team events</th></tr></thead>
        <tbody><tr><th>Apr</th><td>$1,450</td><td>$1,120</td><td>$890</td><td>$740</td></tr></tbody>
      </table>
    </figure>
  </div>
</article>
```

## 6. Progress gauge

```html
<article class="filled">
  <h3>Team capacity</h3>
  <div class="px-4 pb-4">
    <figure class="radial-chart gauge" data-max="25">
      <figcaption class="visually-hidden">Seats filled and offered out of 25</figcaption>
      <table>
        <thead><tr><th>Seats</th><th>Count</th></tr></thead>
        <tbody>
          <tr><th>Filled</th><td>18</td></tr>
          <tr><th>Offered</th><td>21</td></tr>
        </tbody>
        <tfoot><tr><th>Total seats</th><td>25</td></tr></tfoot>
      </table>
    </figure>
  </div>
</article>
```

Drop `gauge` for full concentric rings. For goal completion in percent, leave `data-max` at its default of 100.

## 7. Activity heatmap

Days down the side, hours across. `data-label` shortens headers on the grid while the table and tooltip keep the full text; an empty `data-label` hides a header so only every few columns are labelled.

```html
<figure class="heatmap-chart">
  <figcaption>Support tickets by day and hour</figcaption>
  <table>
    <thead>
      <tr>
        <th>Day</th>
        <th data-label="9am">9:00</th><th data-label="">10:00</th><th data-label="">11:00</th>
        <th data-label="12pm">12:00</th><th data-label="">13:00</th><th data-label="">14:00</th>
        <th data-label="3pm">15:00</th><th data-label="">16:00</th>
      </tr>
    </thead>
    <tbody>
      <tr><th data-label="Mon">Monday</th><td>12</td><td>18</td><td>22</td><td>9</td><td>14</td><td>20</td><td>17</td><td>11</td></tr>
      <!-- … through Friday -->
    </tbody>
  </table>
</figure>
```

To shade in another role, set `--md-comp-heatmap-chart-color: var(--md-sys-color-tertiary)`. Add `values` when the grid is small enough for numbers to fit.

## 8. Dashboard section

KPI tiles on top, the main trend at two thirds width beside a breakdown, then a ranking. Cards stack on phones because every column has `s12`.

```html
<section>
  <h2>Sales overview</h2>
  <dl class="stats">
    <div><dt>Revenue</dt><dd>$48.2k</dd><dd class="stat-change up">+12% from last month</dd></div>
    <div><dt>Orders</dt><dd>1,284</dd><dd class="stat-change up">+5% from last month</dd></div>
    <div><dt>Refund rate</dt><dd>2.1%</dd><dd class="stat-change up negative">+0.3 points from last month</dd></div>
  </dl>
  <div class="row">
    <div class="s12 l8">
      <article class="outlined"><!-- recipe 2: line chart card --></article>
    </div>
    <div class="s12 l4">
      <article class="outlined"><!-- recipe 4: donut by channel --></article>
    </div>
    <div class="s12">
      <article class="outlined">
        <h3>Top products</h3>
        <div class="px-4 pb-4">
          <figure class="bar-chart track values">
            <figcaption class="visually-hidden">Units sold by product, this month</figcaption>
            <table><!-- rows sorted largest first --></table>
          </figure>
        </div>
      </article>
    </div>
  </div>
</section>
```

Charts that compare the same measure side by side should share `data-min` and `data-max`, or a reader will compare bar lengths that are on different scales.
