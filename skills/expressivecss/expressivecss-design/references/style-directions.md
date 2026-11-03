# Visual style directions

Four optional looks for a surface: Bold and Dramatic, Minimalist and Clean, Brutalist and Neo-Brutalist, and Organic and Natural. Each one is a recipe of documented ExpressiveCSS markup: attributes, utility classes and component variants. None of them needs application CSS, and a style never overrides the design rules, the component contract, the semantics rules or the accessibility guide. When a look and a rule disagree, the rule wins and the look gives way.

## Contents

- Offering the options
- The CSS boundary
- Bold and Dramatic
- Minimalist and Clean
- Brutalist and Neo-Brutalist
- Organic and Natural
- Checks every style keeps

## Offering the options

Use a style when the user names one, describes one ("make it loud", "strip it back", "raw", "earthy"), or picks one when offered.

Offer the four styles, plus the plain Material default, only when you are building a new surface or a redesign, the user named no look, and the product has no established identity to follow. Ask once, in the same message as any other missing brief decisions, with a one-line description of each look. Do not offer them during Refine, Critique, Audit or a narrow fix: an existing product's look is evidence to preserve, and Refine keeps it.

Apply one style per product surface. Two styles on one page look like an accident. Record the chosen style in the working brief under brand expression.

## The CSS boundary

The styles are written so that markup alone carries them. Keep to these tiers:

1. Markup tier, always allowed: root and subtree attributes (`theme`, `contrast`, `corners`, `motion`, `icon-style`, `vibrant`), color-role classes, type-role classes, text helpers, icon families, `.shape-*` masks, `z-depth-*` helpers, spacing utilities and documented component variants.
2. Token tier, ask first: documented custom properties such as `--md-source`, `--md-ref-typeface-*`, `--md-sys-shape-corner-*` or the glass switch. These are CSS, even when they are one line. Ask before adding one, and give the reason in one sentence, for example: "Organic reads best with an earthy palette, which needs one line setting `--md-source` to a green seed. Add it?" Without a yes, stay in the markup tier.
3. Custom tier, only on explicit request: new selectors, raw colors, borders, shadows, `clip-path` or anything not documented. Add it only when the user asks for it, or after you have asked, explained what the markup tier cannot do, and got a yes. Custom rules still use tokens, keep focus and state styling intact, and pass the same accessibility checks.

When a look depends on something only the custom tier provides, say what is missing and leave it out. Do not approximate it with unsupported classes, and never invent a class, attribute or variant to complete a style.

## Bold and Dramatic

High contrast in size and color, one strong focal point per screen and expressive motion.

| Lever | Markup |
| --- | --- |
| Hero type | `.display-large` or `.display-medium` on one short heading; `.headline-*-emphasized` for section titles |
| Focal region | `vibrant` on one subtree, or `.primary` with `.on-primary-text`, or `.inverse-surface` with `.inverse-on-surface-text` |
| Actions | One `xlarge` or `large` filled button for the region's primary action; tonal or outlined for the rest |
| Motion | `motion="expressive"` on the root or the hero subtree |
| Depth | Elevated cards (the default `<article>`); `.z-depth-3` on at most one neutral custom surface |
| Icons | `.icon-filled` on the focal icons |

Keep display roles for short text, never for paragraphs. Scale and color carry the drama, so the one high-emphasis action per region still holds: several `xlarge` filled buttons compete and none of them reads as the main one. `vibrant` belongs on one focused subtree, not the page. Expressive springs overshoot, so check the reduced-motion path.

## Minimalist and Clean

Lots of space, few colors, flat surfaces and low-emphasis actions.

| Lever | Markup |
| --- | --- |
| Surfaces | `.surface` and `.surface-container-low` only; no `vibrant`, no accent fills on regions |
| Containment | Spacing before cards; `<article class="outlined">` or `<article class="filled">` when a boundary is needed |
| Actions | One filled or tonal primary action per region; `outlined` and `text` buttons below it |
| Type | `headline-*`, `title-*` and `body-*` roles; reserve `display-*` for a single landing headline, if any |
| Depth | Outlined and filled cards rest at level 0; add no `z-depth-*` helpers |
| Icons | `.material-symbols` (outlined), unfilled, and only where they help recognition |
| Spacing | Larger steps of the framework scale, such as `.p-6` sections and the default `.row` gap |

Minimal does not mean removing labels, focus rings, error text or state changes. Text buttons and outlined fields depend on the `outline` role and their label for affordance, so keep those visible. Keep every target at least 48 by 48 dp even when the visible control is small. Do not hide secondary actions to look cleaner; place them lower in the hierarchy instead.

## Brutalist and Neo-Brutalist

Hard edges, flat blocks of strong color, visible structure and blunt typography.

| Lever | Markup |
| --- | --- |
| Corners | `corners="cut"` on the root or a subtree; `.square` on buttons and icon buttons; `.corner-cut` on a single element |
| Contrast | `contrast="high"` on the root or the styled subtree |
| Depth | Outlined cards; `.z-depth-0` where a flat state is wanted |
| Blocks | `.inverse-surface` with `.inverse-on-surface-text`, or `.primary` with `.on-primary-text`, for full-width bands |
| Type | `.headline-*-emphasized` and `.label-*-emphasized`; `.upper` on short labels only |
| Icons | `icon-style="sharp"` on the root, or `.material-symbols-sharp` on single icons |

`corners="cut"` relies on CSS `corner-shape`; browsers without it, such as Firefox 157, keep rounded corners while the rest of the style still applies. Round indicators and `.circle` stay round. `.upper` changes only the rendering, and long uppercase runs are harder to read, so keep it to labels of a few words. `.z-depth-0` uses `!important` and also removes component shadows; use it on purpose.

Thick black borders, hard offset shadows and monospace type are the usual neo-brutalist signatures. ExpressiveCSS has no markup for them. Offer them as custom-tier or token-tier additions with the reason, for example: "Neo-brutalist usually adds a hard offset shadow. That needs a small custom rule using `--md-sys-color-on-surface`. Want it?"

## Organic and Natural

Soft, rounded forms, warm or earthy tones, filled icons and gentle springs.

| Lever | Markup |
| --- | --- |
| Shapes | `.shape-pebble`, `.shape-bean`, `.shape-scallop-*` or `.shape-bloom-*` on images and avatars |
| Corners | The default round family; `.rounded` for a pill where a button allows it |
| Surfaces | `.secondary-container` and `.tertiary-container` with their `on-*-container-text` pairs; filled cards |
| Icons | `icon-style="rounded"` on the root, or `.material-symbols-rounded` on single icons; `.icon-filled` for selected or decorative icons |
| Type | `body-large` for prose; `.title-*` and `.headline-*` without emphasis |
| Motion | The default standard springs |

Earthy color comes from the brand seed. Changing it is a token-tier `--md-source` override, so ask first; without it, use the secondary and tertiary containers of the existing palette. Shape masks clip shadows, borders, overflow and native video controls. Use them on decorative or content images, check the visible focus of focusable masked elements, and keep the image's `alt` text. Choose square boxes for masked controls.

## Checks every style keeps

- Each job still uses its documented component and native element; a style changes classes and attributes, never the structure the contract requires.
- Pair every fill with its `on-*` foreground, and measure contrast in light and dark schemes after `vibrant`, `contrast` or any token change.
- State never depends on color alone; shape, text or icon changes still mark selection, errors and disabled controls.
- Targets stay at least 48 by 48 dp, focus stays visible, and reduced motion keeps a useful path.
- Forced colors may drop fills and masks; the content and controls must still read without them.
- Report which tier each choice used, and list any part of the look you left out because it needed CSS the user did not approve.
