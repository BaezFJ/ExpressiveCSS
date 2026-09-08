---
name: expressivecss-usage
description: Write and repair ExpressiveCSS HTML, JSX, templates, layouts, utilities, and component choices. Use for interface implementation and review; exclude setup-only, token-only, and narrow lifecycle tasks.
---

## ExpressiveCSS usage rules

## When to use

Use this guide for classes, markup, layout, utilities, or component selection and implementation.

## Do not use when

Do not load this guide when the task concerns only setup, visual tokens, or lifecycle code. Use the installation, theming, or runtime guide that owns that work. This guide does not replace a selected component's target-version contract.

1. Reuse the root version resolution. Resolve only when loaded directly or dependency evidence changed.
2. Read the selected `../components/` guide. Fetch full matching documentation only for gaps, conflicts, or version uncertainty.
3. Start with the documented native element and exact child structure. Required classes, IDs, `for`, `data-target`, and ARIA relationships are API.
4. Choose the component from the user's job and behavior, not only from a requested visual resemblance.
5. Use one component per job, one persistent peer-navigation pattern at each width, one feedback surface per event, and at most one high-emphasis action per region.
6. Prefer, in order: documented component variants, the grid or layout primitives, single-purpose utilities, then app-specific custom CSS.
7. Use current ExpressiveCSS names only. Do not emit Materialize-era surfaces such as `M`, `.btn`, `.modal`, `.nav-wrapper`, `.brand-logo`, `.card-content`, `.lever`, or `.filled-in`.
8. Add responsive behavior whenever a layout uses the grid, panes, persistent navigation, sheets, or app bars.
9. Keep application CSS unlayered unless the project deliberately participates in the framework's `tokens`, `base`, `components`, and `utilities` cascade layers.
10. Treat the target version's documentation and source as authoritative over cached examples, including these guides.

## Layout, utility, and foundation references

Load only the reference for the feature being changed:

- [Grid reference](./references/grid.md): containers, 12-column classes, offsets, gaps, and responsive boundaries.
- [Helper-class reference](./references/helpers.md): spacing, visibility, alignment, formatting, and native form opt-outs.
- [Media reference](./references/media.md): responsive images, video, embeds, aspect ratios, alternatives, and loading performance.
- [Table reference](./references/table.md): native semantics, styles, narrow-screen layout, and data interaction.
- [Transitions reference](./references/transitions.md): CSS scale motion, hiding, timing, and reduced motion.

## Responsive model

| Window class | Width | Grid prefix |
| --- | --- | --- |
| Compact | below 600 px | `.s` |
| Medium | 600–839 px | `.m` |
| Expanded | 840–1199 px | `.l` |
| Large | 1200–1599 px | `.xl` |
| Extra-large | 1600 px and above | `.xxl` |

Reason in window widths, not device labels. Define the next narrower layout before coding the wider one. Test immediately below and above every switch the feature reaches.

## Component selection rules

Use the component index and selected guide for adaptive choices. Keep inline validation near its control and one active pane on Compact list-detail layouts.

- Use `.loading-indicator` for a short indeterminate wait; use `.progress` for determinate or longer-running progress.
- Use `.icon-button` for the Material 3 icon-button component. `.button.circle` is the older round common-button form and follows the common-button size ladder.

## Verification

Exercise every reachable window boundary, light and dark schemes, reduced motion, long content, zoom/reflow, and right-to-left layout where relevant. Confirm there are no legacy classes, broken relationships, missing assets, or duplicated navigation and feedback patterns.
