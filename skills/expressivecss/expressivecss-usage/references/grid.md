# ExpressiveCSS grid reference

Read this after the Usage guide when a task uses containers, rows, columns, offsets, or responsive layout. Reuse the root guide's installed-version resolution. The [target-version Grid documentation](https://www.expressivecss.com/grid.html.md) and [grid Sass](https://github.com/BaezFJ/ExpressiveCSS/blob/master/src/sass/base/_grid.scss) override this summary if they differ.

## Agent procedure

1. Design the Compact layout first and keep DOM order meaningful without CSS positioning.
2. Put each set of columns in a `.row`. Use direct children for predictable auto-placement.
3. Give every column a Compact width such as `.s12`; that width continues into wider windows until another prefix overrides it.
4. Add `.m*`, `.l*`, `.xl*`, or `.xxl*` only where the number of columns changes.
5. Keep each visual line at 12 columns or fewer. Let intentional overflow wrap to a new grid line.
6. Add a row gap or an offset only after the column widths are correct.
7. Test immediately below and above every used breakpoint. Check content fit, zoom/reflow, and RTL without changing meaningful source order.

## Core classes

| Purpose | Classes | Rule |
| --- | --- | --- |
| Bounded page content | `.container` | Centers content; width is 90% on Compact, 85% from Medium, 70% from Expanded, and 75% from Extra-large. The max width is 1280px, then 1920px from Extra-large. |
| Wider bounded content | `.container.wide` | Same responsive percentage, with a 2400px maximum. Use for dashboards or media that need more room. |
| Uncapped content | `.container.max` | Same responsive percentage with no maximum width. |
| Grid parent | `.row` | Creates 12 equal CSS Grid tracks with the default `.g-3` gap. |
| Compact/default spans | `.s1`–`.s12` | Span 1–12 columns at every width unless a wider prefix overrides the span. |
| Medium spans | `.m1`–`.m12` | Apply from 600px. |
| Expanded spans | `.l1`–`.l12` | Apply from 840px. |
| Large spans | `.xl1`–`.xl12` | Apply from 1200px. |
| Extra-large spans | `.xxl1`–`.xxl12` | Apply from 1600px. |
| Section spacing | `.section` | Adds `1rem` block padding. This is not a column class. |

Column classes do not contain a hyphen: use `.m6`, not `.m-6`. A wider span class applies at and above its breakpoint. Because each span class sets the `grid-column` shorthand, the wider span class resets an earlier offset inherited from a narrower prefix.

## Window prefixes

| Window class | Width | Prefix | Example |
| --- | --- | --- | --- |
| Compact | below 600px | `.s` | `.s12` |
| Medium | 600–839px | `.m` | `.m6` |
| Expanded | 840–1199px | `.l` | `.l4` |
| Large | 1200–1599px | `.xl` | `.xl3` |
| Extra-large | 1600px and above | `.xxl` | `.xxl2` |

Do not use device labels such as phone or tablet as breakpoint logic. Reason from the available window or container width and the content's needs.

## Offsets

Use `.offset-{prefix}{1..11}`, for example `.offset-m2` or `.offset-l8`. An offset sets the column's absolute grid start line to `offset + 1`; it does not move the item relative to its natural position.

Repeat an offset at every wider prefix where it must remain active. For example, `.m6.offset-m2.l4` loses the Medium offset when `.l4` applies; use `.m6.offset-m2.l4.offset-l2` to preserve that start line. At each prefix, keep `offset + span` at 12 or less unless overflow is intentional.

```html
<div class="row">
  <aside class="s12 l4">Filters</aside>
  <main class="s12 l6 offset-l6">Results</main>
</div>
```

The Expanded rule above makes the main region start at grid line 7. Prefer ordinary source order, empty tracks, or a different layout when an absolute start would create overlap, unexpected wrapping, or a misleading reading order.

Do not use `push-*` or `pull-*`; those classes are retired.

## Gaps

Apply `.g-0`–`.g-5` to `.row`. A row uses `.g-3` by default even when no gap class is present.

| Class | Gap multiplier | Default result | Extra-large result |
| --- | --- | --- | --- |
| `.g-0` | 0 | 0 | 0 |
| `.g-1` | 0.25 | 0.375rem | 0.5rem |
| `.g-2` | 0.5 | 0.75rem | 1rem |
| `.g-3` | 1 | 1.5rem | 2rem |
| `.g-4` | 1.5 | 2.25rem | 3rem |
| `.g-5` | 3 | 4.5rem | 6rem |

The results assume the default `--gap-size`: 1.5rem below Extra-large and 2rem from Extra-large. Consumer Sass may override the base gutter.

## Copyable patterns

### Stack, then split

```html
<div class="container">
  <div class="row">
    <main class="s12 m8">Main content</main>
    <aside class="s12 m4">Related content</aside>
  </div>
</div>
```

This is one column on Compact and an 8/4 split from Medium upward.

### Responsive card collection

```html
<div class="row g-4">
  <article class="s12 m6 l4 xxl3">Card 1</article>
  <article class="s12 m6 l4 xxl3">Card 2</article>
  <article class="s12 m6 l4 xxl3">Card 3</article>
  <article class="s12 m6 l4 xxl3">Card 4</article>
</div>
```

This renders one, two, three, then four cards per line as space permits.

### Nested grid

```html
<div class="row">
  <main class="s12 l8">
    <div class="row g-2">
      <section class="s12 m6">Nested A</section>
      <section class="s12 m6">Nested B</section>
    </div>
  </main>
  <aside class="s12 l4">Sidebar</aside>
</div>
```

Start a new `.row` for nested columns; do not apply column-span classes to a parent that is not inside a grid.

## Review checklist

- Every column has a Compact `.s*` width.
- Every column is inside the intended `.row`.
- Widths change only at prefixes the layout needs.
- Each intended line totals 12 columns or fewer.
- Gaps are on rows, not copied onto each column.
- Offsets do not alter the meaningful reading, focus, or interaction order.
- No `push-*` or `pull-*` class remains.
- Boundary checks cover 599/600, 839/840, 1199/1200, and 1599/1600 when those switches are reachable.
