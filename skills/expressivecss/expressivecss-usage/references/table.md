# Table foundation

Read this after the Usage guide when presenting relational data in a native table. Resolve the installed ExpressiveCSS version first. The [target-version Table documentation](https://www.expressivecss.com/table.html.md), [global Sass](https://github.com/BaezFJ/ExpressiveCSS/blob/master/src/sass/base/_global.scss), and target-version compiled CSS override this summary if they differ.

## Start with table semantics

Use a native `<table>` for data with row and column relationships. Add a `<caption>` that names the data when the surrounding heading does not already do so. Use `<th scope="col">` for column headers and `<th scope="row">` for row headers. Do not use a table for page layout.

```html
<table class="striped responsive-table">
  <caption>Invoice totals by customer</caption>
  <thead>
    <tr>
      <th scope="col">Customer</th>
      <th scope="col">Status</th>
      <th scope="col">Total</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Acme</th>
      <td>Paid</td>
      <td>$840.00</td>
    </tr>
  </tbody>
</table>
```

ExpressiveCSS makes every table full width, collapses borders, colors the header with `on-surface-variant`, separates rows with `outline-variant`, and gives cells 15px by 5px padding.

## Style classes

| Class | Effect | Constraint |
| --- | --- | --- |
| `.striped` | Colors odd body rows and removes their bottom borders. | The stripe uses a hard-coded black alpha color, not a semantic theme token. |
| `.highlight` | Colors a body row on pointer hover with a 250ms background transition. | Hover does not provide keyboard focus or make a row interactive. |
| `.centered` | Centers column headers and body data cells. | Body row headers (`<tbody> <th scope="row">`) remain left-aligned. Numeric or long text often reads better with deliberate per-column alignment. |
| `.responsive-table` | Changes the table below `840px` into a fixed header column beside horizontally scrolling body rows. | It is a structural visual transformation, not a generic overflow wrapper. |

The classes can be combined, but inspect the result instead of assuming each effect composes cleanly. In particular, `.striped` and `.highlight` use hard-coded black alpha colors. Check row contrast and hover feedback in light and dark schemes. Add application overrides with semantic roles when those colors do not work on the chosen surface.

## Responsive behavior

At widths below `840px`, `.responsive-table` changes the table, header group, body group, rows, and cells to block or inline-block layouts. It keeps the header cells in one fixed column and scrolls the body rows horizontally. This preserves all values without squeezing every original column into the viewport, but it no longer looks like the wide row-and-column grid.

The implementation uses physical floats, padding, borders, and text alignment. Test RTL rather than assuming the fixed column moves to the inline start. Also inspect the accessibility tree with a browser and screen reader used by the project because CSS display changes around table descendants can produce browser-specific announcements.

If users need the conventional header row to stay above conventional data rows, wrap a normal table in an application-owned overflow container instead of using `.responsive-table`:

```html
<div class="data-table-scroll">
  <table>
    <!-- caption, head, and body -->
  </table>
</div>
```

Test whether keyboard users can reach overflowed content in every target browser. If the wrapper needs `tabindex="0"`, also give it `role="region"` and an accessible name. Avoid adding a named region around every table when no overflow occurs.

## Interaction rules

A highlighted row is still not a control. Put links or buttons in the relevant cells for row actions. Do not attach activation only to `<tr>`, and do not rely on hover color as the only action cue. Sorting requires a real button in the header and an accurate `aria-sort` value on the sorted header cell. Selection requires explicit controls and selected-state semantics.

## Verification

Check empty cells, long values, many columns, zoom and text resizing, Compact and Medium widths on both sides of `840px`, RTL, light and dark schemes, and keyboard access to any overflow. Confirm captions and header associations remain useful, actions are native controls, focus is visible, and no value becomes unreachable when the body scrolls.
