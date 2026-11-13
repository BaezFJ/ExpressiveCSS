# DESIGN.md template

Copy the block below into the project's `DESIGN.md` and replace every `<placeholder>`. Delete guidance that does not apply instead of leaving it empty, and delete a whole optional section rather than writing "none". `<base>` is the sibling `expressivecss` skill.

## Filling rules

- The YAML values in the template are the ExpressiveCSS defaults for the bundled version: corner scale from `src/sass/tokens/_shape.scss`, spacing steps from `src/sass/utilities/_spacing.scss`, window margins and pane gap from `src/sass/components/_panes.scss`, and the type scale from `<base>/expressivecss-theming/references/typography.md`. Keep them unless the user chose an override, and say in the prose which values are defaults.
- Keep only the typography roles the product uses, with the framework's size, line height, weight and letter spacing for each role. Replace `Roboto` with the chosen families: the brand typeface on display, headline and `title-large`, the plain typeface on the rest.
- Add a color token only for a value the user chose. An exact role override needs both scheme values, for example `primary-light` and `primary-dark`, plus the matching `on-` pair, with the measured contrast in the prose.
- The `expressivecss` key holds attribute names and typeface names only. Keep hex colors and dimensions out of it, because the DESIGN.md linter warns about token-like values under keys it does not know.
- Use one specific sentence per decision. Prose such as "clean and modern" gives a later agent nothing to apply; "section titles use `headline-small` and never `display-*`" does.

## Template

````markdown
---
version: alpha
name: <Product name>
description: <One sentence naming the product, its audience and its reference.>
colors:
  primary: "<seed hex>"
typography:
  headline-large:
    fontFamily: Roboto
    fontSize: 2rem
    fontWeight: 400
    lineHeight: 2.5rem
    letterSpacing: 0rem
  title-large:
    fontFamily: Roboto
    fontSize: 1.375rem
    fontWeight: 400
    lineHeight: 1.75rem
    letterSpacing: 0rem
  title-medium:
    fontFamily: Roboto
    fontSize: 1rem
    fontWeight: 500
    lineHeight: 1.5rem
    letterSpacing: 0.009375rem
  body-large:
    fontFamily: Roboto
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5rem
    letterSpacing: 0.03125rem
  body-medium:
    fontFamily: Roboto
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.25rem
    letterSpacing: 0.015625rem
  label-large:
    fontFamily: Roboto
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.25rem
    letterSpacing: 0.00625rem
rounded:
  none: 0px
  extra-small: 4px
  small: 8px
  medium: 12px
  large: 16px
  extra-large: 28px
  full: 9999px
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 3rem
  margin-compact: 16px
  margin-medium: 24px
  gutter: 24px
expressivecss:
  version: "<resolved version, or not installed yet>"
  style: <material, bold, minimalist, brutalist or organic>
  theme: <auto, light or dark>
  themeToggle: <true or false>
  contrast: <standard, medium or high>
  corners: <round or cut>
  motion: <standard or expressive>
  iconStyle: <outlined, rounded or sharp>
  typefaceBrand: "<family for display, headline and title-large>"
  typefacePlain: "<family for body, label, title-medium and title-small>"
  typefaceFallback: "<fallback families for extra scripts, or Noto Sans, sans-serif>"
---

## Overview

<Paragraph 1: the product, who uses it, the one task they come to do and what a finished task looks like.>

<Paragraph 2: the specific reference and what it implies for color, type, density and ornament. Name the visual style and why it fits. End with what the interface must never feel like.>

## Colors

Brand seed {colors.primary} is set as `--md-source`. ExpressiveCSS derives every color role for light and dark from it, so components use roles, never hex values.

- Schemes: <follows the OS with a theme toggle, or the locked scheme and why>.
- Contrast: <standard, rising to high when the OS asks; or the raised default and the audience reason>.
- `primary` marks the single most important action in each region.
- Surface and surface-container roles carry most of the page; container roles group related content.
- `vibrant` appears on <the one focal subtree, or "nowhere">.
- Error roles mark errors only and stay distinct from the brand color.
- <Each role override: token names, light and dark values, measured contrast and the reason.>

## Typography

<The families and why they fit the reference. Note who loads the font files and any fallback family for extra scripts.>

- <Where display roles appear, if anywhere. Display is for short hero text only.>
- Page titles use <headline role>; section titles use <headline or title role>.
- Prose uses `body-large`; dense supporting text uses `body-medium`.
- Controls and metadata use label roles.
- `-emphasized` classes mark <selected items or key figures>; semantic emphasis uses `<strong>`.

## Layout

- Window classes: <Compact first or Expanded first, and which classes the product reaches>. Every screen reflows at 320 CSS pixels.
- Navigation: <component per window class, from the navigation table>.
- Main pattern: <list-detail, feed, supporting pane or single column, and on which screens>.
- Spacing: window margins {spacing.margin-compact} on Compact and {spacing.margin-medium} from Medium, {spacing.gutter} between panes and grid items, `.p-4` or `.p-6` inside sections, `.mb-2` to `.mb-4` between related controls. <Note any change.>
- Density: <comfortable, or compact and what that means here>. Hit areas never shrink.
- Direction: <left-to-right only, or right-to-left support and what mirrors>.

## Elevation & Depth

<Tonal surfaces, outlines, elevated cards or glass, and which surfaces may rise above the rest. Name the card variants in use and any `z-depth-*` limit.>

## Shapes

<The corner family and scale: `corners` value, any `--md-sys-shape-corner-*` overrides and why. Whether selected items change shape. Where `.shape-*` masks appear, if anywhere.>

## Motion

<`motion` value and the feel it gives. What may animate and what never does.> Under `prefers-reduced-motion: reduce` every motion token is zero, and no state depends on motion to be understood.

## Iconography

Material Symbols, `icon-style="<outlined, rounded or sharp>"`. <Whether selected or focal icons use `.icon-filled`.> Decorative icons carry `aria-hidden="true"`; icon-only controls carry an accessible name.

## Components

| Job | ExpressiveCSS component and variant | Rule |
| --- | --- | --- |
| Main action in a region | <Filled button, FAB or extended FAB> | One per region |
| Other actions | Tonal, outlined, text or icon buttons | Ranked below the main action |
| Top-level navigation | <Navigation bar and navigation rail per window class> | Never both at once |
| Page title and page actions | App bar | One or two actions; it is not navigation |
| Grouping | Spacing first; <filled or outlined> cards when a boundary is needed | Cards are `<article>` elements |
| Form input | Text fields, select, checkboxes, radio buttons, switches | Visible labels; errors next to the field |
| Brief feedback | Snackbar | One short sentence, at most one action |
| Decisions that block | Dialogs | Headline states the decision; the confirm button repeats the verb |
| <Other jobs from the interview> | <documented component> | <rule> |

- Destructive actions: <undo snackbar for reversible, dialog for irreversible, or the chosen policy>.
- States: loading names the operation; empty states offer the next action; errors keep the user's input and give a specific recovery; offline states say what still works.
- Voice: <plain, warm, formal or playful, with one example sentence>. Buttons are verbs in sentence case, never "OK", "Yes" or "Submit".

## Accessibility

This product meets WCAG 2.2 AA at minimum<, plus the raised bars chosen in the interview>.

- Text contrast is at least 4.5:1 (3:1 for large text) and non-text contrast at least 3:1, measured in light, dark and any `vibrant` region after the theme is applied.
- Color never carries meaning alone; icons, text or shape back it up.
- Focus is always visible, and every flow works by keyboard.
- Targets measure at least 24 by 24 CSS pixels, and 48 by 48 dp wherever the component contract provides it. <List any controls the user chose to keep below 48 dp, with the reason.>
- Pages reflow at 320 CSS pixels and stay usable at 200% text size.
- Reduced motion, forced colors and increased contrast preferences are honored.
- <Audience-specific commitments: older users, screen reader heavy use, right-to-left scripts.>

## Do's and Don'ts

- Do <a habit the reference implies>.
- Do keep one high-emphasis action per region.
- Do pair every fill with its `on-*` role.
- Don't <each answer to "never feel like", turned into a concrete rule>.
- Don't hard-code hex colors in components; use roles.
- Don't invent classes, attributes or variants; use documented ExpressiveCSS markup or record a custom-tier exception here.

## Open questions

- <Decisions left at defaults, requests not adopted with the rule and date, and anything to confirm later.>

## Decision log

- <YYYY-MM-DD>: Created from the DESIGN.md interview. <Notable choices and their source.>
````
