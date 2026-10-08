---
name: expressivecss-usage
description: Writes and repairs ExpressiveCSS HTML, JSX, templates, layouts, utilities, and component choices. Use for interface implementation and review, including classes, markup, layout, and component selection. Not for tasks that touch only setup, visual tokens, or lifecycle code; the install, theming, or runtime guide owns those.
---

# ExpressiveCSS usage rules

## Rules

1. Reuse the root version resolution; resolve again only if this guide was loaded directly or dependency evidence changed.
2. Read the selected `../components/` guide. Fetch full matching documentation only for gaps, conflicts, or version uncertainty.
3. Start with the documented native element and exact child structure. Required classes, IDs, `for`, `data-target`, and ARIA relationships are API.
4. Choose the component from the user's job and behavior. A requested visual resemblance alone does not decide it.
5. Use one component per job, one persistent peer-navigation pattern at each width, one feedback surface per event, and at most one high-emphasis action per region.
6. Prefer, in order: documented component variants, the grid or layout classes, single-purpose utilities, then app-specific custom CSS.
7. Use current ExpressiveCSS names only. Do not emit retired markup and APIs such as `M`, `.btn`, `.modal`, `.nav-wrapper`, `.brand-logo`, `.card-content`, `.lever`, or `.filled-in`; the name map in the [design rules](../references/design-rules.md) gives each replacement.
8. Keep application CSS unlayered unless the project deliberately participates in the framework's `tokens`, `base`, `components`, and `utilities` cascade layers.
9. Use the component index and selected guide for adaptive choices. Keep inline validation near its control and one active pane on Compact list-detail layouts.
10. Use `.loading-indicator` for a short indeterminate wait; use `.progress` for determinate or longer-running progress.
11. Use `.icon-button` for the Material 3 icon-button component. `.button.circle` is the older round common-button form and follows the common-button size ladder.

## Responsive behavior

Add responsive behavior whenever a layout uses the grid, panes, persistent navigation, sheets, or app bars. Reason in window classes, not device labels: Compact below 600px, Medium from 600px, Expanded from 840px, Large from 1200px, and Extra-large from 1600px. Define the next narrower layout before coding the wider one, and test immediately below and above every switch the feature reaches.

## References

Read a reference only when the task touches its feature:

- Read the [grid reference](./references/grid.md) before using containers, `.row`, column spans, offsets, or row gaps.
- Read the [helper-class reference](./references/helpers.md) before adding spacing, flex, visibility, alignment, overflow, text, or native form opt-out classes.
- Read the [media reference](./references/media.md) for images, native video, embeds, or image loading performance.
- Read the [table reference](./references/table.md) for a data table or any `.striped`, `.highlight`, `.centered`, or `.responsive-table` class.
- Read the [transitions reference](./references/transitions.md) for `.scale-transition`, `.scale-in`, or `.scale-out`.

## Verification

Exercise every reachable window boundary, light and dark schemes, reduced motion, long content, zoom and reflow, and right-to-left layout where relevant. Confirm there are no legacy classes, broken relationships, missing assets, or duplicated navigation and feedback patterns. Fix what fails and recheck the same cases.
