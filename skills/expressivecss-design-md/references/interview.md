# DESIGN.md interview guide

The rounds follow the DESIGN.md section order, so each round fills one or two sections of the file. Questions marked open go in plain text; the rest suit a structured question tool. Put the recommended option first and adapt the wording to what the evidence already shows. `<base>` is the sibling `expressivecss` skill.

## Contents

- Round 1: product and reference
- Round 2: color
- Round 3: type and icons
- Round 4: layout and navigation
- Round 5: shape, depth and motion
- Round 6: components, voice and accessibility
- Conflict table
- Answers that change other sections

## Round 1: product and reference

Fills Overview and seeds the Don'ts. Start the round with the evidence list from section 1 of the skill when there is one.

1. Open: what is the product, who uses it, and what is the one task they come to do? Ask what a finished task looks like, since that sets the region's main action.
2. Open: name one specific thing the interface should feel like: an object, a place, a printed artifact or a craft. If the answer is only adjectives, ask once for a concrete reference and offer two or three examples derived from the product ("a pharmacist's label", "a ferry timetable", "a ceramics studio price card"). If the user names another product's app, ask which quality of it they want (density, calm, speed) and record the quality, not the product.
3. Open: what should it never feel like? Ask for two or three answers; each becomes a Don't.
4. Visual style. Offer the style directions from `<base>/expressivecss-design/references/style-directions.md` only when the product has no established look:

| Option | ExpressiveCSS meaning |
| --- | --- |
| Plain Material 3 Expressive (default) | No style recipe; framework defaults |
| Bold and Dramatic | Display type on one focal heading, one `vibrant` region, `motion="expressive"` |
| Minimalist and Clean | Surface roles only, spacing before cards, outlined or filled cards, no `z-depth-*` |
| Brutalist and Neo-Brutalist | `corners="cut"`, `contrast="high"`, emphasized headline and label roles, sharp icons |
| Organic and Natural | Shape masks on imagery, container roles, rounded filled icons, standard springs |

A four-option tool cannot show all five. Recommend the style that fits the reference, then two others and the plain default; the user can still type the fifth. Record one style for the product.

## Round 2: color

Fills Colors.

1. Brand color. Options: "I have a hex value" (the user types it), "Derive one from the reference", "Keep the ExpressiveCSS default seed" (`#c6a0f6`). When deriving, propose one seed with a one-line reason tied to the reference and ask the user to confirm it.
2. Exact match. Ask only when the user supplied a brand hex: "ExpressiveCSS builds the palette from the seed, so a filled button can land on a slightly different tone than the brand hex. Is close enough fine?" Options: "Close is fine" (seed only), "Primary actions must use the exact hex" (override `--md-sys-color-primary-light` and `-dark` plus the matching `on-primary` pair, measure contrast in both schemes, record the ratio).
3. Color schemes. Options: "Follow the OS, with a user toggle" (no `theme` attribute or `theme="auto"`, plus the `Theme` helper and `data-theme-set` controls), "Follow the OS only", "Light only" (`theme="light"`), "Dark only" (`theme="dark"`). Locking one scheme ignores the user's preference; record why when chosen.
4. Contrast. Options: "Standard, high when the OS asks" (no `contrast` attribute; `prefers-contrast: more` applies high), "Medium by default" (`contrast="medium"`, suits older or low-vision audiences), "High by default" (`contrast="high"`).

Ask about error color only when the seed is red or orange and close to the error role. The error ramp does not follow `--md-source`; keep it distinct from primary so errors never read as brand emphasis.

## Round 3: type and icons

Fills Typography and Iconography.

1. Typefaces. Options: "Keep Roboto and Noto Sans" (bundled, no loading work), "One brand family for everything" (`--md-ref-typeface-brand` and `--md-ref-typeface-plain` set to the same family), "A display family for headings and a text family for the rest" (brand covers display, headline and `title-large`; plain covers body, label, `title-medium` and `title-small`). Ask the family names in plain text. Note that the application must load the faces, and the family needs 400, 500 and 700 weights or browsers synthesize them.
2. Languages and scripts. Options: "Latin, Cyrillic, Greek or Vietnamese only" (bundled faces cover them), "Also Arabic or Hebrew" (a fallback family in `--md-ref-typeface-fallback` and right-to-left layout checks), "Also CJK, Thai or Indic scripts" (a fallback family for each script; Devanagari is bundled).
3. Icon style. Options: "Outlined" (default), "Rounded" (`icon-style="rounded"`), "Sharp" (`icon-style="sharp"`). Ask whether selected or focal icons fill (`.icon-filled`); suggest filled for selected states.

Sentence case on buttons, chips, tabs and snackbar actions is a framework rule, so do not ask about text casing for controls.

## Round 4: layout and navigation

Fills Layout. Use the navigation table in `<base>/references/design-rules.md` and the patterns in `<base>/expressivecss-layout/references/canonical-layouts.md`.

1. Devices. Options: "Phones first, works everywhere", "Desktop first, works on phones", "Phones only", "Large screens only". Record the window classes reached. Every option still reflows at 320 CSS pixels for WCAG 1.4.10, so Compact always gets a layout.
2. Top-level destinations. Options: "One page or a single flow", "Two to five", "Six or seven", "More than seven". Map with the design rules: two to five use a navigation bar on Compact and a rail on wider windows; six or seven use a modal expanded rail on Compact and a rail on wider windows; more than seven split into peer categories plus page lists. Never a bar and a rail at the same time.
3. Main screen pattern. Options: "List and detail" (`.panes.list-detail`), "Feed of cards" (cards in a `.row` grid), "Supporting pane" (`.panes.supporting`), "Single column" (forms, reading, checkout). A dashboard answer routes later work to the dashboard guide.
4. Density. Options: "Comfortable" (default), "Compact for data-heavy screens". ExpressiveCSS has no density switch, so compact means smaller documented size variants where a component offers them, tighter spacing steps between related items, and label roles for metadata. Hit areas never drop below 24 by 24 CSS pixels. If compact would take a control below Material's 48 by 48 dp, ask the user with the target-size row of the conflict table.

Ask about right-to-left only if round 3 did not settle it.

## Round 5: shape, depth and motion

Fills Elevation & Depth, Shapes and Motion. Skip questions the chosen style already answers and say so.

1. Corners. Options: "Material rounded" (default scale), "Softer and rounder" (raise `--md-sys-shape-corner-medium`, `-large` and `-extra-large`; token tier), "Tighter and squarer" (lower the same steps; token tier), "Cut corners" (`corners="cut"`; browsers without CSS `corner-shape`, such as Firefox 157, keep rounded corners).
2. Depth. Options: "Tonal surfaces, little shadow" (surface container roles, filled cards), "Flat with outlines" (outlined cards, no `z-depth-*`), "Elevated cards" (default `<article>` cards, at most one `.z-depth-3` custom surface), "Frosted glass on floating surfaces" (`--expressive-glass` on an ancestor; token tier; reduced-transparency and increased-contrast preferences restore solid surfaces).
3. Motion. Options: "Standard springs" (default), "Expressive springs with overshoot" (`motion="expressive"`), "As little motion as possible" (standard springs, no added decorative motion). Reduced motion is always honored: every duration and spring `-duration` token is `0s` under `prefers-reduced-motion: reduce`, and nothing in the file may require motion to understand state.
4. Decorative shapes. Options: "None", "On avatars and images" (`.shape-*` masks such as `pebble` or `scallop-6`), "On one hero image only". Masks clip borders and shadows; focusable masked elements need a visible focus check.

## Round 6: components, voice and accessibility

Fills Components, Accessibility and the rest of Do's and Don'ts.

1. Main action. Options: "A filled button per region", "A floating action button for the main create action", "An extended FAB with a label". The design rules allow one high-emphasis action per region; the rest step down to tonal, outlined, text or icon buttons.
2. Destructive actions. Options: "Undo snackbar for reversible actions, dialog for irreversible ones", "Always confirm with a dialog", "Undo snackbar only". A dialog headline states the decision ("Delete 3 photos?") and its confirming button repeats the verb.
3. Voice. Options: "Plain and direct", "Warm and friendly", "Formal", "Playful". Whatever the voice, buttons are verbs ("Save draft"), never "OK", "Yes" or "Submit", and an error says what happened and how to recover, next to the control it concerns.
4. Needs beyond AA (multiple choice). Options: "AA is enough", "Older or low-vision users" (`contrast="medium"` and `body-large` for prose), "AAA contrast for body text" (7:1, measured after the theme is applied), "Heavy keyboard or screen reader use" (keyboard paths and announcements become review criteria in every surface).

## Conflict table

Use this when an answer would break WCAG 2.2 AA or the ExpressiveCSS contract. Name the rule, offer the alternative, record the outcome.

| Request | Rule it breaks | Offer instead |
| --- | --- | --- |
| A pale or neon brand color as button fill or text | Text contrast 4.5:1 (3:1 for large text), non-text contrast 3:1 | Use it as the seed; ExpressiveCSS picks readable tones for each role. An exact-hex fill needs an `on-*` pair that measures at least 4.5:1 in both schemes |
| Light gray body text for a softer look | Text contrast | `on-surface-variant` for secondary text, which the generated scheme keeps readable |
| Remove focus outlines | Focus visible (2.4.7) | Keep the framework focus ring; restyle it with tokens only if it still measures 3:1 against adjacent colors |
| Controls smaller than 24 by 24 CSS pixels | Target size (2.5.8) | Tighter spacing between groups and smaller type roles for metadata, with hit areas unchanged |
| Controls between 24 CSS pixels and 48 dp | Material 48 dp recommendation only; WCAG passes | Ask the user: "Material recommends 48 by 48 dp so targets are easy to hit on touch screens; the smaller size still meets WCAG. Keep 48 dp, or use the smaller size?" Recommend 48 dp. Record the answer, and when the smaller size wins, note in Accessibility which controls sit below the Material recommendation |
| Status shown only by color (red and green dots) | Use of color (1.4.1) | Add an icon, text label or shape change; selected items can change shape as well as color |
| Brand red or orange as primary | Errors must stay distinguishable | Keep the error roles distinct, or choose a different seed hue for primary |
| Placeholder text instead of labels, or icon-only navigation | Labels or instructions (3.3.2), accessible names | Visible labels on fields; labels in the navigation bar and rail, or `aria-label` plus a tooltip for icon-only controls |
| Autoplaying carousels, perpetual or looping decoration | Pause, stop, hide (2.2.2); reduced motion | Motion the user starts, with a pause control; nothing that moves for more than five seconds unasked |
| All-caps button labels | Material sentence-case rule | Write labels in sentence case and render them with `.upper`, only on labels of three words or fewer |
| Thick black borders, hard offset shadows, monospace type | No documented ExpressiveCSS markup | Custom tier: record it only after the user agrees, built from color tokens and checked like everything else |
| A second navigation bar or rail for "more room" | Do not mix peer navigation components | One navigation component per window class, from the navigation table |

If the user declines every alternative, record the request under Open questions as not adopted, with the rule and the date. A later conversation can revisit it; the file never states it as a rule.

## Answers that change other sections

- A dark-only product still needs contrast measured in dark and a forced-colors check.
- An older or low-vision audience raises the contrast level, moves prose to `body-large` and favors standard springs over expressive ones.
- A data-heavy product usually wants list-detail or a dashboard, outlined cards and label roles for metadata, but never smaller hit areas.
- Right-to-left scripts add mirrored layout checks to the Accessibility section and logical spacing in Layout.
- A Brutalist style with `contrast="high"` already exceeds AA for accents; record it as a raised bar.
