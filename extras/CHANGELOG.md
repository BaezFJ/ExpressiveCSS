# Changelog

## Unreleased

## 0.21.0

- Initial package. It requires `@expressivecss/expressive` 0.21.
- The CSS-only components that moved from core: aura, message, stat,
  description list, KPI, countdown, timeline, calendar, organization chart,
  popover, skeleton, empty state, marquee, rating, color swatches, stepper,
  mega menu, tree and the page footer.
- The twelve charts that moved from core, with the `chart()`, `chart-axis()`
  and `chart-column-motion()` Sass mixins in `abstracts/charts`.
- The interactive components that moved from core: back to top, message
  scroller, pull-to-refresh, swipe actions, show more, hover card, loading
  overlay, confetti, particles, lightbox, map, command palette, menubar and
  scrollspy with the table of contents, plus the `Tour` and `ImageCompare`
  behaviors. Extras imports core's `Menu` from
  `@expressivecss/expressive/modular`, which it leaves external.
- The form extras that moved from core: input mask, currency input, rich
  text editor, tree select, cascader, color picker, keypad, questionnaire and
  the `TransferList` behavior, plus the drop zone with a new `DropZone`
  behavior that holds the file rules, file list and drag marking core's
  `Forms` used to. `TreeSelect` extends core's `FormSelect`, and `DropZone`
  hands other inputs to core's `Forms`, both read from the modular entry.
