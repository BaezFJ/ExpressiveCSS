# Changelog

## Unreleased

## 0.21.0 - 2026-11-27

Initial release. It requires `@expressivecss/expressive` 0.21.0 or a later
0.21 release (peer range `^0.21.0`). These components moved here from core
0.20.0 with their markup, options and events unchanged; core's 0.21.0
changelog has the migration steps.

- Charts: `LineChart`, `ColumnChart`, `BarChart`, `PieChart`, `HeatmapChart`,
  `RadarChart`, `RadialChart`, `MixedChart`, `ScatterChart`, `FunnelChart`,
  `SankeyChart` and `TreemapChart`, with the `chart()`, `chart-axis()` and
  `chart-column-motion()` Sass mixins in `src/sass/abstracts/_charts.scss`.
- Interactive components: `BackToTop`, `MessageScroller`, `PullToRefresh`,
  `SwipeActions`, `ShowMore`, `HoverCard`, `LoadingOverlay`, `Confetti`,
  `Particles`, `Lightbox`, `MapView`, `CommandPalette`, `Menubar` and
  `ScrollSpy` with the table of contents.
- Form components: `InputMask`, `CurrencyInput`, `RichTextEditor`,
  `TreeSelect`, `Cascader`, `ColorPicker`, `Keypad` and `Questionnaire`.
- Behaviors: `ImageCompare`, `Tour`, `TransferList` and the new `DropZone`,
  which holds the drop zone's file rules, file list and drag marking that
  core's `Forms` used to.
- CSS-only components: aura, message, stat, description list, KPI,
  countdown, timeline, calendar, organization chart, popover, skeleton, empty
  state, marquee, rating, color swatches, stepper, mega menu, tree, the page
  footer and the drop zone.
- Builds: `dist/js/extras.mjs` (registers the components with core's
  `AutoInit` and starts the behaviors), `dist/js/modular.mjs` (no side
  effects), `dist/js/extras.js` and `extras.min.js` (IIFE global
  `ExpressiveExtras`), `dist/css/extras.css` and `extras.min.css`, types, and
  the Sass source. Extras imports core through
  `@expressivecss/expressive/core` and `@expressivecss/expressive/modular`, so
  it shares core's classes and `AutoInit` table. There is no CommonJS build.
