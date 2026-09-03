---
name: expressivecss-usage
description: Use ExpressiveCSS markup, layout, and utilities.
---

## ExpressiveCSS usage rules

## When to use

Use this guide for classes, markup, layout, utilities, or component selection and implementation.

## Do not use when

Do not load this guide when the task concerns only setup, visual tokens, or lifecycle code. Use the installation, theming, or runtime guide that owns that work. This guide does not replace a selected component's target-version contract.

1. Identify the installed ExpressiveCSS version before writing classes or JavaScript.
2. Read the applicable component guide in `../components/`, then the linked target-version documentation.
3. Start with the documented native element and exact child structure. Required classes, IDs, `for`, `data-target`, and ARIA relationships are API.
4. Choose the component from the user's job and behavior, not only from a requested visual resemblance.
5. Use one component per job, one persistent peer-navigation pattern at each width, one feedback surface per event, and at most one high-emphasis action per region.
6. Prefer, in order: documented component variants, the grid or layout primitives, single-purpose utilities, then app-specific custom CSS.
7. Use current ExpressiveCSS names only. Do not emit Materialize-era surfaces such as `M`, `.btn`, `.modal`, `.nav-wrapper`, `.brand-logo`, `.card-content`, `.lever`, or `.filled-in`.
8. Add responsive behavior whenever a layout uses the grid, panes, persistent navigation, sheets, or app bars.
9. Keep application CSS unlayered unless the project deliberately participates in the framework's `tokens`, `base`, `components`, and `utilities` cascade layers.
10. Treat the target version's documentation and source as authoritative over cached examples, including these guides.

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

- Use a navigation bar on Compact, a rail or bar on Medium, and a rail or drawer on Expanded and wider when those patterns fit. Never display peer navigation patterns together.
- Use a dialog for a blocking decision, a snackbar for ignorable status, inline text for form validation, a bottom sheet for Compact transient actions, and a menu or side sheet when the wider layout calls for one.
- Use a switch for an immediately applied setting. Use a checkbox when a later Save action commits the choice.
- Keep list-detail layouts to one active pane on Compact.
- Use `.loading-indicator` for a short indeterminate wait; use `.progress` for determinate or longer-running progress.
- Use `.icon-button` for the Material 3 icon-button component. `.button.circle` is the older round common-button form and follows the common-button size ladder.

## Verification

Exercise every reachable window boundary, light and dark schemes, reduced motion, long content, zoom/reflow, and right-to-left layout where relevant. Confirm there are no legacy classes, broken relationships, missing assets, or duplicated navigation and feedback patterns.
