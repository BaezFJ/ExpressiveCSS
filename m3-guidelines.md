# Material 3 component guidelines for LLMs

This file is the **design contract** for generating UI with ExpressiveCSS.

ExpressiveCSS implements [Material Design 3](https://m3.material.io/) (including the 2025 **M3 Expressive** updates) on the web. Read this file to decide *which* component to use, *how* it is structured, *where* it sits, and *how* it adapts. Read [`llm.md`](llm.md) for markup, class names, tokens, and JavaScript APIs.

Canonical source: [m3.material.io](https://m3.material.io/). Where this file and the live spec disagree, the spec wins for design intent; [`llm.md`](llm.md) wins for what this framework actually ships.

---

## How to use this file

1. Pick a **window size class** for the layout you are generating. Adaptive rules below are load-bearing, not optional polish.
2. Use the **component chooser** to pick one component per job. Do not stack two components that do the same job (navigation bar + rail, dialog + snackbar for the same event, FAB + filled button for the same action).
3. Open the matching **component** section for anatomy, placement, behavior, and the ExpressiveCSS mapping.
4. Emit the **documented HTML**. Do not invent Materialize-era class names (`navbar`, `nav-wrapper`, `brand-logo`, `btn`, `card-content`, `modal-header`, `lever`, `filled-in`, `with-gap`).
5. If a Material 3 component is listed under **Not shipped**, do not fake it with a look-alike. Use the documented substitute, or say it is not available.

---

## Hard rules

These are the mistakes generated Material UIs make most often. Treat them as invariants.

- **One high-emphasis action per region.** A screen may have many buttons. Only one should be filled, a FAB, or an extended FAB.
- **Sentence case** on buttons, chips, tabs, and snackbar actions. Capitalize the first word and proper nouns only. Never `SAVE`, `Save Changes`, or `OK`.
- **48×48 dp minimum hit target** on every interactive control, even when the visible glyph is 18–24 dp.
- **Color roles, never hex.** Use `primary`, `on-surface`, `error`, and the other `--md-sys-color-*` roles. Do not hard-code `#6750A4`.
- **Native HTML first.** `<button>`, `<a class="button">`, `<dialog>`, `<input>`, `<select>`, `<progress>`, `<label>`.
- **A visual icon is not an accessible name.** Icon-only controls need `aria-label` (and a tooltip if the control has no visible text).
- **Do not mix peer navigation components.** Never show a navigation bar and a navigation rail at the same time. Never pin a navigation drawer and a rail as two persistent side columns.
- **Do not put the navigation drawer markup inside the app bar’s `<nav>`.** The trigger may live in the bar; the drawer must not.
- **Do not nest tabs in the app bar.** Tabs are their own bar under the app bar, or inside a pane.
- **Dialogs are high priority. Snackbars are low priority.** Do not use a dialog to say “Saved.” Do not use a snackbar to confirm a destructive action.
- **Switches take effect immediately.** If the user still has to press Save, use checkboxes.
- **Chips come in sets.** A single chip on a screen is almost always a button that was given the wrong component.
- **Selected navigation icons fill.** Outlined at rest, filled (`--md-icon-fill: 1`) when `aria-current="page"` / `aria-selected="true"`. The framework does this for nav destinations; do not fight it with a different icon name.
- **Do not initialize twice.** `AutoInit()` or `Component.init()`, not both. Add `no-autoinit` when you pass options yourself.

---

# 1. Adaptive layout

Material layouts are designed against **window size classes**, not against “phone” or “desktop”. A phone in landscape is often Expanded. A desktop window can be Compact.

## 1.1 Window size classes

| Class | Width | Typical devices | ExpressiveCSS hook |
| --- | --- | --- | --- |
| Compact | `< 600 dp` | Phone portrait | Default; `.s` grid prefix. |
| Medium | `600–839 dp` | Tablet / foldable portrait | `medium`; `.m` grid prefix. |
| Expanded | `840–1199 dp` | Phone landscape, tablet landscape, small desktop | `expanded`; `.l` grid prefix. Panes split at 840dp. |
| Large | `1200–1599 dp` | Desktop | `large`; `.xl` grid prefix. |
| Extra-large | `≥ 1600 dp` | Wide / ultra-wide desktop | `extra-large`; `.xxl` grid prefix. |

These are the implementation boundaries as well as the design vocabulary. Use
the Material class names in reasoning, then emit the matching grid, visibility,
or pane classes.

Hide/show helpers use the same names: `hide-on-compact-only`,
`hide-on-medium-only`, `hide-on-expanded-only`, `hide-on-large-only`,
`hide-on-extra-large-only`, and their `show-on-*` counterparts.

## 1.2 What changes with window size

| Window | Panes | Navigation | Communication | Transient actions |
| --- | --- | --- | --- | --- |
| Compact | 1 | Navigation bar. Modal expanded rail for overflow. | Basic or full-screen dialog | Bottom sheet, snackbar |
| Medium | 1, or 2 if the task is list-detail | Navigation bar **or** collapsed rail — pick one. Modal expanded rail for overflow. | Basic dialog | Menu, snackbar |
| Expanded | 1 or 2 (2 preferred for list-detail) | Collapsed or expanded rail | Basic dialog | Menu, side sheet |
| Large | 1 or 2 | Standard expanded rail, or collapsed rail + expand | Basic dialog | Menu, standard side sheet |
| Extra-large | 1–3 | Standard expanded rail | Basic dialog | Menu, standard side sheet |

On compact, bottom sheets are the right way to offer extra actions. From medium up, prefer a **menu** for the same job. On expanded and larger, optional content that should stay while the page is used is a **standard side sheet**, not a second page.

## 1.3 Canonical pane layouts

Panes are the layout, not a widget. ExpressiveCSS: a `.panes` / `.pane-layout` / `.list-detail` container with two or three `.pane` children. No JavaScript. Give the container a height (`height: 100%`). Compact windows use 16 dp inline margins; every wider layout uses 24 dp margins and 24 dp spacers. The split is 840 dp, from the viewport **or** the container (`container-type: inline-size`).

| Layout | Compact | Expanded+ | ExpressiveCSS |
| --- | --- | --- | --- |
| **List-detail** | One pane at a time. Mark the visible pane `active`. Back control on the detail pane. | 360 dp list + flexible detail, coplanar, 1 dp `outline-variant` divider. | `.list-detail` with `.list-pane` + `.detail-pane` |
| **Supporting pane** | Supporting content is a bottom sheet or a second screen. | Flexible primary + 360–400 dp supporting pane. | `.supporting-pane-layout` / `.panes.supporting` with `.primary-pane` + `.supporting-pane` |
| **Feed** | Single column of cards / list items. | Multi-column grid of the same cards. | 12-column grid, not `.panes` |

Optional overlay content is a **side sheet**, not a fourth pane.

**Do:** list-detail for email, messaging, file browsers, settings-with-preview.

**Don't:** force two panes on compact. Don't use a side sheet as the detail pane.

## 1.4 Navigation by window size

Top-level destinations (Home, Library, Settings) are **peer destinations**. They stay the same on every screen of the product.

| Destinations | Compact | Medium | Expanded+ |
| --- | --- | --- | --- |
| 2–5 peers | Navigation bar (stacked) | Navigation bar (horizontal) **or** collapsed rail | Collapsed or expanded rail |
| 6–7 peers | Modal expanded rail (opened from the app-bar menu button) | Collapsed rail, expand for labels | Expanded rail |
| Nested / many | Modal navigation drawer | Modal drawer or expanded rail | Expanded rail or `navigation-drawer-fixed` for a documentation-style tree |

M3 Expressive (May 2025) **prefers an expanded navigation rail over a navigation drawer** for the same job. In ExpressiveCSS:

- Use `.navigation-rail` / `.navigation-rail.expanded` for 3–7 peer destinations.
- Use `.navigation-drawer` when destinations nest (`<details>` / `<summary>`), when you need a user header, or when a compact screen needs a modal overflow menu that is not a rail.
- `.navigation-drawer.navigation-drawer-fixed` is a persistent sidebar from the `expanded` breakpoint up. Do not combine it with a rail.

The **app bar** is not navigation between app views. It names the current page and holds 1–2 actions. Pair it with a bar, a rail, or a navigation drawer — it does not replace them.

---

# 2. Cross-cutting design

## 2.1 Color roles on components

Use live `--md-sys-color-*` roles. The `-light` / `-dark` pairs are public API for theming, not for component CSS.

| Job | Typical roles |
| --- | --- |
| Most important filled control | `primary` / `on-primary` |
| Tonal / secondary filled control | `secondary-container` / `on-secondary-container` |
| FAB default | `primary-container` / `on-primary-container` |
| Page background | `surface` / `on-surface` |
| Cards, sheets, menus | `surface-container` / `surface-container-low` / `surface-container-high` |
| Supporting / de-emphasized text | `on-surface-variant` |
| Hairlines | `outline` / `outline-variant` |
| Error, badges, destructive | `error` / `on-error` |
| Snackbar | `inverse-surface` / `inverse-on-surface` / `inverse-primary` |
| Modal scrim | `scrim` |

Do not color every button `primary`. Do not recolor badges; the default error mapping is the contrast-safe one.

## 2.2 Emphasis, containment, elevation

Material uses **containment** (fill, outline, shadow, or none) to group related things and to rank actions.

| Emphasis | Typical containment | Use for |
| --- | --- | --- |
| Highest | FAB / extended FAB (elevated, unique shape) | The single most common action on the page |
| High | Filled button (`primary`) | The primary action in a region |
| Medium | Tonal, outlined, elevated button; filled card | Secondary actions, grouping |
| Low | Text button, standard icon button, text list | Actions inside a card, dialog, or sheet |

Elevation is a last resort. Prefer tonal fill or an outline before a shadow. Dialogs, menus, snackbars, and FABs do use elevation because they sit above the page. Cards default to elevation 1; filled and outlined cards use 0.

## 2.3 Shape and size (M3 Expressive)

Buttons, icon buttons, and FABs share a size scale. Default common buttons in this framework are **40 dp** (Material small) with stadium corners. FABs are **56 dp** with 16 dp corners (`circle extra`). Icon buttons are **40 dp** (`circle`).

Scale a control up only to create hierarchy or to match a large window. Extra-large buttons are hero moments, not form chrome.

Selected items (nav destinations, menu rows, list rows, toggle buttons) **change shape** — usually more rounded — as well as color. Do not rely on color alone.

## 2.4 Motion

- Use the framework’s state layers and waves. Do not add custom bounce to FABs or snackbars.
- Opening a modal (`showModal()`) must leave the page inert and unscrolled.
- Drag-dismiss belongs on bottom sheets (handle) and side sheets (header / inner edge), not on dialogs.
- Prefer `prefers-reduced-motion` defaults already in the CSS; do not add a second animation system.

## 2.5 Typography on components

| Slot | Type role |
| --- | --- |
| App bar headline (small) | `title-large` |
| Dialog / sheet headline | `headline-small` or `title-large` |
| Button / chip / menu / tab label | `label-large` (tabs: `title-small`) |
| Body / supporting | `body-medium` or `body-large` |
| Snackbar | `body-medium` |
| Badge | short numeric, ≤ 4 characters |

Do not put `display-large` in an app bar. Do not wrap or truncate button labels.

## 2.6 Icons

Material Symbols, outlined by default. Load the variable font with `opsz,wght,FILL,GRAD` axes. The framework does not ship the files.

- Ligature names from the [Material Symbols catalog](https://fonts.google.com/icons?icon.set=Material+Symbols).
- Default optical size 24 dp; buttons use 18 dp next to a label.
- **Fill** the icon when the parent is selected (nav, rail, list). Do not swap to a different glyph to show selection.
- Style (outlined / rounded / sharp) is the font family (`icon-style` or `--md-icon-font`). Pick one style per product.
- `.material-icons` is a compat alias. Prefer `.material-symbols`.

## 2.7 Accessibility that affects component choice

- Every text field has a visible `<label>`. Placeholder is not a label.
- Every `<input type="checkbox|radio">` and every `.switch` is wrapped in a `<label>`, input first.
- Icon-only buttons: `aria-label`, and usually a plain tooltip.
- Current destination: `aria-current="page"` (nav bar, rail, breadcrumbs, pagination).
- Current tab / list row: `aria-selected="true"` or the documented `active` alias.
- Dialogs: native `<dialog>` so focus trap and Escape come for free. Action buttons go in `<form method="dialog">`.
- Do not put buttons or switches *inside* a menu row that is already an action. One row, one action.
- Carousels on a vertically scrolling page need a “Show all” path that does not require horizontal swiping.
- Badge counts must be available to assistive tech (the host control’s accessible name, e.g. “Mail, 3 unread”).

---

# 3. Component chooser

## 3.1 “How does the user move between top-level views?”

| Situation | Use |
| --- | --- |
| 3–5 peers, compact / medium window | **Navigation bar** |
| 3–7 peers, medium+ window | **Navigation rail** (collapsed; expand for labels) |
| Nested sections, user header, overflow menu | **NavigationDrawer** (modal on compact, `navigation-drawer-fixed` on large) |
| Related content *inside* a page | **Tabs** (not app navigation) |
| Path from home to this page | **Breadcrumbs** |
| Pages of a large collection | **Pagination** or infinite list, not tabs |

## 3.2 “How does the user take an action?”

| Situation | Use |
| --- | --- |
| The single most common action on the page (Create, Compose) | **FAB** or **extended FAB** (extended on large windows) |
| Primary action in a form, dialog, or card | **Filled button** |
| Secondary action next to a filled button | **Tonal** or **outlined** button |
| Action inside a dialog, card, or snackbar | **Text button** |
| Minor action, no room for a label | **Icon button** (`circle`) + tooltip |
| Several related shortcuts from a FAB | **FAB speed-dial** (`.fab`), not a second FAB |
| Frequent actions for *this* page, not destinations | **Toolbar** (floating or docked) |
| Smart / automated action, or a filter / input token | **Chip** (see chip types) |
| Confirm or cancel in a blocking prompt | Dialog **text buttons**, not a FAB |

## 3.3 “How does the product talk back?”

| Priority | User must act? | Use |
| --- | --- | --- |
| Low | No | **Snackbar** (optional action, auto-dismiss) |
| Medium | Optional extra content | **Standard bottom sheet** (compact) or **standard side sheet** (expanded+) |
| High | Yes | **Basic dialog** |
| High + lots of content on compact | Yes | **Full-screen dialog** (`.max`) |
| Blocking + extra on compact | Yes | **Modal bottom sheet** |
| Blocking + extra on expanded+ | Yes | **Modal side sheet** or basic dialog |

## 3.4 “How does the user choose among values?”

| Situation | Use |
| --- | --- |
| One of a short exclusive set | **Radio** |
| Many of a short set, saved later | **Checkbox** |
| Immediate on/off setting | **Switch** |
| One of a long set | **Select** (or autocomplete) |
| Type and pick | **Autocomplete** |
| Value along a range | **Slider** (`input type="range"`, *not* `.slider`) |
| Filter a collection | **Filter chips** |
| Date | **Date picker** |
| Time | **Time picker** |
| Binary action that looks like a setting but is a navigation destination | Neither switch nor checkbox — it is a list row |

## 3.5 “How is content grouped?”

| Situation | Use |
| --- | --- |
| One topic, actionable, scannable | **Card** |
| Many homogeneous rows to find and act on | **List** |
| Related form fields | **Fieldset** |
| Image-first browse | **Carousel** |
| Site-wide links after the page | **Footer** (`<footer>`), not a navigation bar |

---

# 4. Navigation and structure

## 4.1 App bar (top app bar)

**M3:** App bars. **ExpressiveCSS:** `<header>` whose child is `<nav>`. There is no `navbar` / `nav-wrapper` / `brand-logo` class.

**Use when** the page needs a name, a way back or into the menu, and 1–2 actions that apply to the *whole page* (Search, Edit, Send).

**Don't use when** you need to switch between top-level app views — that is a navigation bar or rail. Don't put 4+ trailing actions in the bar; overflow into a `more_vert` menu.

**Variants**

| M3 | When | ExpressiveCSS |
| --- | --- | --- |
| Small (default) | Most pages | Default `<header><nav>` — 64 dp |
| Medium / large | Scrolling pages that can collapse | Taller headline; see the Navbar docs. Do not fake it with `display-large`. |
| Search app bar | Home when search is the product | Not a dedicated component. Use a search field in the bar, or a search destination. |

**Anatomy**

0. Container (`<header>`) — required
1. Leading icon button (menu, back) — optional but usual
2. Headline (`h1`–`h6`) — required in practice
3. Trailing icon buttons (1–2) — optional
4. Text destinations (`<menu>`) — optional, hide below `large`

DOM order is layout: the headline grows; everything after it sits on the end.

**Placement.** Top of the window or the pane. Stays put while body content scrolls. On compact, the leading icon opens the navigation drawer or the modal expanded rail.

**Adaptive.** Compact: leading menu + title + 1–2 icons. Medium+: text destinations may appear in a `<menu>` after the title; still pair with a rail, not with a second nav bar. Large/XL: a medium or large title is acceptable.

**Behavior.** CSS-only. Menus and NavigationDrawer are separate components. A `navigation-drawer-trigger` in the bar is the NavigationDrawer contract, not bar chrome.

**Don't**

- Don't put multiple filled or tonal buttons in the bar. One emphasized trailing action is enough.
- Don't nest `.tabs` in the header.
- Don't put the navigation drawer `<ul>` inside the header `<nav>`.
- Don't use the app bar as a tab bar of top-level views.

---

## 4.2 Navigation bar

**M3:** Navigation bar. **ExpressiveCSS:** `nav.navigation-bar`. CSS-only.

**Use when** the product has **3–5** peer destinations of equal importance, on **compact or medium** windows.

**Don't use when** there are more than five destinations, when destinations change per screen, or on expanded+ windows (use a rail). Don't use it to open a single email or a settings subpage.

**Variants**

| Variant | Window | Layout |
| --- | --- | --- |
| Stacked (default) | Compact | Icon above label, selected pill behind the icon |
| Horizontal | Medium | Icon and label on one row |

**Anatomy**

0. Container — full width, bottom of the window, required
1. Icon — required
2. Label — required (do not ship icon-only destinations unless every destination is icon-only *and* the icons are universal)
3. Active indicator — required, driven by `aria-current="page"`
4. Badge (small or large) — optional, nested in the icon

**Placement.** Bottom of the window, above nothing except a snackbar (snackbars sit in front and may shift up). A FAB sits **above** the bar, trailing, and must not cover it. Do not combine with a docked toolbar.

**Adaptive.** Compact: stacked. Medium: horizontal. Expanded+: **replace** the bar with a rail; do not show both.

**Behavior.** Destinations do not scroll and do not reorder. The selected icon fills. Badges hide once the destination is opened if they meant “unread”.

**Don't**

- Don't use 2 destinations or 6+.
- Don't mix labelled and icon-only items.
- Don't put a FAB on top of the bar.
- Don't use `nav.navigation-bar` as a site footer.

---

## 4.3 Navigation rail

**M3:** Navigation rail (collapsed / expanded; expanded replaces the drawer in M3 Expressive). **ExpressiveCSS:** `nav.navigation-rail`. `AutoInit()` toggles `.expanded` from the menu button.

**Use when** the window is **medium or larger** and there are **3–7** destinations. Put the rail in the **same place on every screen**.

**Don't use when** the window is compact (use a navigation bar; an expanded rail may be *modal* as overflow). Don't use it horizontally.

**Variants**

| Variant | Width | FAB | When |
| --- | --- | --- | --- |
| Collapsed (default) | 96 dp | Icon-only | Medium+ persistent nav |
| Expanded (`.expanded`) | 220–360 dp | Extended FAB | Labels needed, or as the drawer replacement |
| Modal (`.modal`, or expanded on compact) | Overlay + scrim | — | Overflow menu on small windows |

**Anatomy**

0. Container — leading edge, required
1. Menu button — toggles expanded; required if expansion exists
2. Optional FAB / extended FAB
3. 3–7 destinations (icon + label)
4. Active indicator + optional badges
5. Optional alignment spacer / trailing cluster

**Placement.** Start (leading) edge of the window. Offset the rest of the page by `--md-comp-nav-rail-collapsed-width` (or the expanded width). It is the only persistent navigation element.

**Adaptive.** Compact: do not persist a collapsed rail; use a bar, and optionally a modal expanded rail from the app-bar menu. Medium+: collapsed by default. Expanded+ / large: expanded is appropriate, especially with an extended FAB.

**Behavior.** Menu button expands/collapses. On compact, expanded is modal: scrim, Escape, scrim tap. `modal` keeps that overlay at every breakpoint.

**Don't**

- Don't show a rail and a navigation bar together.
- Don't hide the collapsed rail.
- Don't put more than seven destinations; use a navigation drawer tree or an expanded modal rail.
- Don't build a horizontal “rail”.

---

## 4.4 Navigation drawer

**M3:** Navigation drawer. M3 Expressive prefers an **expanded rail** for peer destinations. **ExpressiveCSS:** `ul.navigation-drawer` (`.sidenav` is the old name and still works). `AutoInit()`.

**Use when** destinations nest, when you need a user header, or when compact screens need a modal menu that is not a 3–7 rail.

**Don't use when** 3–7 flat peers would fit a bar or rail. Don't use a drawer as a side sheet (filters, details of the current item).

**Variants**

| Variant | When | ExpressiveCSS |
| --- | --- | --- |
| Modal | Compact, or overflow on any size | Default overlay; framework wraps it in a `<dialog>` |
| Standard / fixed | Large+ persistent sidebar | `.navigation-drawer-fixed` — CSS, no overlay, no resize listener |

**Anatomy**

0. Container (`ul.navigation-drawer`) — required, with an `id`
1. Optional user header (`.user-view`)
2. Destination rows (`li > a` with optional leading icon)
3. Dividers, subheaders, nested `<details>` / `<summary>` (same `name` = accordion)
4. Trigger (`a.navigation-drawer-trigger` / `button.navigation-drawer-trigger` with `data-target`)

**Placement.** Trigger in the app bar. Drawer itself is a sibling of the page, **not** inside `<header> nav`. Modal slides over the content. Fixed occupies the leading column from `large` up.

**Adaptive.** Compact: modal. Large+: `navigation-drawer-fixed` *or* a rail, not both.

**Behavior.** Escape and backdrop tap close the modal. `.navigation-drawer-close` is an explicit close row. Nested sections are HTML `<details>`, not a Collapsible plugin.

**Don't**

- Don't put the `<nav aria-label="Main"><ul class="navigation-drawer">` inside the app bar.
- Don't use a drawer for item-level details (that is a side sheet or the detail pane).
- Don't combine `navigation-drawer-fixed` with `.navigation-rail`.

---

## 4.5 Tabs

**M3:** Tabs (primary / secondary). **ExpressiveCSS:** `nav.tabs` of `a[href="#panel"]`. `AutoInit()`.

**Use when** content on the **same page** is grouped into peer categories (Flight / Luggage / Explore). Tabs can scroll horizontally; you may have as many as needed.

**Don't use when** the groups are sequential (Chapter 1, 2, 3) — use hierarchy, not tabs. Don't use tabs as the app’s top-level navigation (that is a bar or rail). Don't use them as a stepper.

**Variants**

| Variant | Placement | Indicator |
| --- | --- | --- |
| Primary | Top of a content pane, under the app bar | Thick indicator under the selected tab |
| Secondary | Under primary tabs, or inside a card / pane | Lighter indicator for in-page subsets |

**Anatomy**

0. Container — required
1. Icon — optional, but if one tab has an icon, all of them do
2. Badge — optional
3. Label — required, short
4. Divider under the bar
5. Active indicator

**Placement.** Directly under the app bar or at the top of a pane. Not inside the `<header> nav`. Secondary tabs always sit below primary tabs.

**Adaptive.** Tabs may become scrollable on compact. On large screens, prefer showing more tabs without collapsing them into a menu unless there are many.

**Behavior.** Selecting a tab shows its panel; one selected at a time. `AutoInit()` binds hash targets. Mark the selected tab `.active`.

**Don't**

- Don't mix icon+label tabs with label-only tabs.
- Don't use tabs for a linear wizard.
- Don't put tabs in the app bar markup.

---

## 4.6 Breadcrumbs

**M3:** Not a core mobile component; a web wayfinding pattern. **ExpressiveCSS:** `<nav aria-label="Breadcrumb"><ol>`.

**Use when** the page sits more than one level below the root and the user may jump up the tree (docs, settings, catalogs).

**Don't use when** there is only one level, or when a back icon in the app bar is enough (typical compact app screens).

**Anatomy.** Ordered list of links. Last item is the current page (`aria-current="page"`). Separator is `--md-comp-breadcrumb-separator` (default `/`), not an icon-font glyph.

**Placement.** Below the app bar, above the page title or as the first line of the content pane.

**Adaptive.** On compact, consider collapsing earlier crumbs or relying on Back. On expanded+, show the full trail.

---

## 4.7 Pagination

**M3:** Not a mobile component; use for large web collections. **ExpressiveCSS:** `nav.pagination > ol`. CSS-only.

**Use when** a collection is partitioned into numbered pages and jumping to a page matters.

**Don't use when** the content is a continuous feed (use a list + “load more” / infinite scroll) or when tabs would imply categories rather than pages.

**Anatomy.** Previous, page links, next. Current: `aria-current="page"`. Unavailable prev/next: `aria-disabled="true"`.

**Placement.** After the collection, trailing, often center or end aligned.

---

## 4.8 Menu

**M3:** Menus (standard / vibrant). **ExpressiveCSS:** `<menu id>` + `.menu-trigger[data-target]`. `AutoInit()`.

**Use when** the user needs a **temporary list of choices** from a button, icon button, or field. On medium+ windows, menus replace many compact bottom sheets.

**Don't use when** the choices are the app’s top-level destinations (bar / rail), or when the user must compare options persistently (use a select, a list, or a sheet).

**Anatomy**

0. Container (`<menu>`) — required
1. Items (`<li>`), each one action
2. Leading icon — optional
3. Item text — required
4. Trailing icon, kbd, or badge — optional
5. Dividers (`<hr>`) or `.gap` groups
6. Nested `<menu>` inside an `<li>` — flyout, not a second Menu instance
7. `.label` group heading — optional

**Placement.** Opens on click, below the trigger by default. `coverTrigger: true` covers the trigger. Offset ~4 dp. Keep 16 dp from the window edges (the component repositions).

**Adaptive.** Compact: a menu is still valid from an icon button; a modal bottom sheet is better for a long list of actions. Medium+: prefer the menu.

**Behavior.** Hover / `:focus-within` flyouts on fine pointers; `.open` for tap/keyboard. `closeOnClick` ignores the parent row of a submenu. `.selected` / `aria-selected` marks the current choice. Do not start a second `Menu` on the inner `<menu>`.

**Don't**

- Don't put switches or extra buttons inside a row.
- Don't use a vibrant (tertiary) menu except as a rare, high-emphasis overflow.
- Don't use a menu for 2-step confirmation (use a dialog).

---

## 4.9 Panes

Covered in [§1.3](#13-canonical-pane-layouts). Semantic aliases: `.list-pane`, `.detail-pane`, `.primary-pane`, `.supporting-pane`. Mark the compact visible pane `active`.

---

## 4.10 Footer

**M3:** Not a mobile app-bar equivalent. **ExpressiveCSS:** `<footer>` for site chrome.

**Use when** a marketing or docs page needs site maps, legal, or secondary links after the content.

**Don't use when** you need compact app destinations — that is `nav.navigation-bar` as the **only** child of `<footer>`, which the CSS treats as the navigation bar, not a site footer.

**Anatomy.** Column headings, `<nav>` link lists, trailing `<small>` legal bar. Unfilled by default; `filled` / `surface` for a contained bar.

---

# 5. Actions

## 5.1 Common buttons

**M3:** Buttons. **ExpressiveCSS:** `<button>` (filled by default) or `<a class="button">`.

**Use when** the user takes a discrete action with a short label (1–3 words).

**Don't use when** the control is a navigation destination (use a list row, a nav item, or a link styled as text), when the action is the page’s single primary action *and* it should stay visible while scrolling (FAB), or when you have a set of filters (chips).

**Styles, highest emphasis first**

| Style | Class | Roles | Use |
| --- | --- | --- | --- |
| Filled | default | `primary` / `on-primary` | The one primary action in the region |
| Elevated | `elevated` | `surface` / `primary`, elevation 1 | When the filled button would clash with a busy background |
| Tonal | `tonal` | `secondary-container` / `on-secondary-container` | Secondary, still visible |
| Outlined | `outlined` | transparent + `outline` | Secondary, low fill |
| Text | `text` | no container | Dialogs, cards, snackbars, inline |

**Anatomy.** Label (required) + container + optional icon. Put the icon in `<span class="material-symbols" aria-hidden="true">` and wrap the label in its own `<span>` — there is no `icon-left` class; the order of the two spans is the placement. `disabled` on the element.

**Placement.** In the action region of the parent (dialog end-aligned row, card `<nav>`, form end). Don't scatter filled buttons down a scrolling page.

**Adaptive.** Default 40 dp. `small` / `large` / `extra` change size. On large windows, a larger filled button may pair with an extended FAB elsewhere — still only one high-emphasis action per region.

**Behavior.** Sentence case. No wrap, no truncate. Hover 8% state layer, focus/press 10%. Disabled: `on-surface` at 38% on a 12% container.

**Don't**

- Don't put three filled buttons in a row. One filled, the rest tonal/outlined/text.
- Don't use a button for “Next chapter” in a sequence of tabs.
- Don't use ALL CAPS (that was Material 2).

---

## 5.2 Icon buttons

**M3:** Icon buttons (filled / tonal / outlined / standard; default and toggle). **ExpressiveCSS:** `button.circle` (filled default). `text` is standard (transparent). `tonal` and `outlined` match.

**Use when** the action is minor and the icon is unambiguous (search, more, close, favorite). Always provide `aria-label`. Pair with a **plain tooltip**.

**Don't use when** the action is primary (use a labelled button or FAB), or when the icon is unclear.

**Anatomy.** Icon + container. Optional selected/toggle state: fill the icon and change the container; communicate selection with **two** properties (color and shape or weight), not color alone.

**Placement.** App bar trailing, list trailing, sheet headers, toolbars. 48 dp target.

**Sizes.** Default 40 dp. FAB sizes are a different component (`circle extra`).

---

## 5.3 Floating action button

**M3:** FAB, small FAB, large FAB, extended FAB, FAB menu. **ExpressiveCSS:** `circle extra` (56 dp FAB), `extra circle small` (40 dp small FAB), `extend` (extended). Speed-dial: wrap in `.fab`. `AutoInit()`.

**Use when** there is **one** positive, primary action for the screen: Create, Compose, Add. Not every screen needs a FAB.

**Don't use** for destructive actions (Delete), for alerts, for volume/font controls, inside dialogs, or attached to a navigation drawer.

**Variants**

| Variant | ExpressiveCSS | When |
| --- | --- | --- |
| FAB | `circle extra` | Default primary action |
| Small FAB | `extra circle small` | Visual continuity with nearby small controls; not the default |
| Extended FAB | `extend` (icon + `<span>` label) | Large windows, or when the label is needed to explain a non-standard icon |
| Speed-dial | `.fab` + `<ul>` of smaller FABs | Related shortcuts from the same primary action. This is **not** the M3 Expressive FAB *menu* (a labelled menu anchored to the FAB); it is the older speed-dial. |

**Anatomy.** Container + icon (required). Extended: icon + label. Speed-dial: primary FAB + list of related FABs.

**Placement.** Trailing lower corner, 16 dp from the edge on compact, 24 dp on larger windows. Above a navigation bar, never on it. May sit beside a floating toolbar. Offset a snackbar so they do not overlap.

**Adaptive.** Compact: icon FAB. Expanded+: prefer **extended FAB**. Only one FAB per screen. A rail may host the FAB at the top of the rail instead of over the content.

**Behavior.** `.fab` opens on hover when the pointer can hover; add `click-to-toggle` otherwise. Motion is CSS.

**Don't**

- Don't put two FABs on one screen.
- Don't use a FAB labelled “OK” or “Submit” in a form — that is a filled button.
- Don't bounce or pulse a FAB as decoration (`pulse` is a separate, rare attention helper).

---

## 5.4 Toolbars

**M3:** Toolbars (docked / floating), M3 Expressive replacement for the bottom app bar. **ExpressiveCSS:** `div.toolbar`. CSS-only, and not a `<nav>` — a toolbar holds commands, not destinations. Not `div.fab.toolbar` either (that is the FAB-to-toolbar transition).

**Use when** the page has a **cluster of frequent actions** that apply to the current content (formatting, selection actions, playback).

**Don't use** at the same time as a navigation bar. Don't use as top-level app navigation.

**Variants**

| Variant | Shape | When |
| --- | --- | --- |
| Floating (default) | Hugs content, 64 dp, stadium, elevation 2 | Contextual to the body |
| Docked | Full width, square, no elevation, bottom only | Global actions that stay the same across pages — and only if there is no navigation bar |

**Anatomy.** Container (`div.toolbar`, not `<nav>`) + action children (`button` / `a`). Icon in `<span class="material-symbols" aria-hidden="true">`, label in its own `<span>`; an icon-only action needs an `aria-label`. `.active` selected. `.filled` emphasized. Optional vibrant color style.

**Placement.** Floating: over the content, often bottom-center or next to a FAB. Docked: bottom of the window only. 16 dp horizontal padding minimum; 48 dp targets; don't pack too many controls.

**Adaptive.** Compact: keep to a handful of icon buttons. Expanded+: labels may appear. If a navigation bar is present, use a floating toolbar or no toolbar, never a docked one.

---

# 6. Containment

## 6.1 Cards

**M3:** Cards (elevated / filled / outlined). **ExpressiveCSS:** `<article>`. Optional `filled` / `outlined`. No `card-content` / `card-title` / `card-action`.

**Use when** a chunk of content is **one topic**, scannable, and optionally actionable (album, trip, settings group, media item).

**Don't use when** you have a homogeneous index of rows (use a **list**), or when the content *is* the page (don't wrap the whole view in a card).

**Variants**

| Variant | Separation | When |
| --- | --- | --- |
| Elevated (default) | Elevation 1, 2 on hover | Need clear separation from `surface` |
| Filled | Tonal fill, no shadow | Quiet grouping on a busy page |
| Outlined | 1 dp outline, no shadow | When shadows would stack (inside sheets, dialogs) |

**Anatomy** (only the container is required)

0. Container
1. Headline
2. Subhead
3. Supporting text
4. Image / media (`<img>` or `<figure>`)
5. Actions (`<nav>` of buttons — usually text / tonal)

**Placement.** In a feed, a grid, or a supporting pane. Not inside another card.

**Adaptive.** Compact: single column. Expanded+: grid of cards (feed layout). Horizontal media+text is fine when the width allows; stack on compact.

**Behavior.** The whole card may be clickable *or* it may contain buttons, not both in a conflicting way. Prefer a single destination link wrapping the content, *or* an action row, not nested interactive elements that compete.

**Don't**

- Don't put text on an image unless contrast is ≥ 4.5:1 (and M3 recommends avoiding it).
- Don't put a FAB on every card.
- Don't use a card for each row of an inbox — that is a list.

---

## 6.2 Lists

**M3:** Lists. **ExpressiveCSS:** `ul.list` / `ol.list`. CSS-only.

**Use when** people need to **find an item and act on it**. Order logically (alpha, time, priority). Keep rows short.

**Don't use when** each item is a rich, mixed-media topic (card) or a small set of exclusive choices (radios).

**Variants.** Standard (transparent rows, selected pill) and `segmented`.

**Anatomy** (container + label required; everything else optional)

0. Container
1. Label text
2. Supporting text (`<p>`, 1–3 lines)
3. Trailing text / icon / meta / kbd / time
4. Trailing selection control (checkbox, radio, switch)
5. Leading avatar, icon, or media

Leading visual = first `i` / `img` / `input`. Trailing = last `i` / `kbd` / `button` / `time` / `.meta`. Current row: `aria-selected="true"` or `active`.

**Placement.** Full width of the pane. Pair the list pane of a list-detail layout with a list. Don't inset a list like a card unless it is inside a sheet.

**Adaptive.** Compact: one line of supporting text. Expanded+: up to three. Line length 40–60 characters (up to ~120 on extra-large, then increase line height).

**Behavior.** Rows are scannable: leading visuals align, trailing actions align. One primary action per row (the row itself). Trailing icon buttons are for overflow, not a second destination.

**Don't**

- Don't mix wildly different row templates in one list.
- Don't put a switch and a checkbox on the same row.
- Don't wrap each row in a card.

---

## 6.3 Divider

**M3:** Divider. **ExpressiveCSS:** `<hr>`, `.divider`, list/menu `<hr>`.

Use to separate **groups**, not every row. Prefer `outline-variant`. In menus, a `.gap` is the more expressive grouping (M3 Expressive). Don't stack dividers and gaps.

---

# 7. Communication and overlays

## 7.1 Dialogs

**M3:** Dialogs (basic / full-screen). **ExpressiveCSS:** native `<dialog>`. Open with `showModal()`, close with `close()`. `Dialogs.Init()` light-dismisses. There is no Modal plugin. `.max` is full-screen.

**Use when** the product must **block** until the user confirms, dismisses, or finishes one task. High importance only.

**Don't use** for “Saved”, for optional extras, or for a second view of content (use a sheet, a pane, or a page).

**Variants**

| Variant | When | ExpressiveCSS |
| --- | --- | --- |
| Basic | Short title, short body, 1–2 actions. Default. | `<dialog>` — 280–560 dp, 28 dp corners, elevation 3, scrim |
| Full-screen | Compact, lots of content (edit a draft, a calendar) | `<dialog class="max">` — 64 dp header, no scrim |

**Anatomy — basic**

0. Container — required
1. Icon — optional; centers the headline
2. Headline — optional but usual; a specific question, not “Are you sure?”
3. Supporting text
4. Divider — optional, when extra content follows
5. Actions — text buttons, end aligned, 8 dp gap, in `<form method="dialog">` or `<nav>`
6. Scrim

**Anatomy — full-screen:** container, header, close icon, optional headline, confirm text button, optional divider, body.

**Placement.** Centered over the page (basic). Full-screen covers the window. Only one dialog at a time.

**Adaptive.** Compact: basic if the copy is short; full-screen if it is a task. Medium+: basic; almost never full-screen. Don't use a bottom sheet for a two-button confirm — that is a dialog.

**Behavior.** `showModal()` inert-izes the page and stops background scroll. Light-dismiss only if both ends of the pointer gesture land outside the box. Confirm is the last button; dismiss/cancel sits before it. Don't use a filled button in a basic dialog (M3 uses text buttons).

**Don't**

- Don't write headlines like “Warning!” or “Are you sure?”. Ask the actual question: “Discard draft?”
- Don't put a FAB in a dialog.
- Don't stack dialogs.

---

## 7.2 Bottom sheets

**M3:** Bottom sheets (standard / modal). **ExpressiveCSS:** `dialog.bottom-sheet` (alias `.bottom`). `BottomSheets.Init()` drag-dismisses from the top 48 dp handle.

**Use when** compact/medium windows need **secondary content** anchored to the bottom: extra actions, a short list, a player, filters.

**Don't use** as the app’s main view, on expanded+ as the first choice (prefer a menu or side sheet), or for a two-button confirm (dialog).

**Variants**

| Variant | API | Scrim | Page |
| --- | --- | --- | --- |
| Modal | `showModal()` | Yes | Inert |
| Standard | `show()` | No | Interactive |

**Anatomy.** Container (required), drag handle (optional, 32×4 dp in a 48 dp target), scrim (modal only). Content is free-form (lists, media, actions).

**Placement.** Bottom of the window. Max width 640 dp. Never covers the top 72 dp. From `small`, inset 56 dp from the sides. Elevated above content.

**Adaptive.** Compact: full width, the default extra-content surface. ≥ 640 dp: capped width, 56 dp side and top margins. Medium+: consider a menu instead of a modal sheet of actions. Expanded+: prefer a side sheet for persistent extras.

**Behavior.** Drag the handle down to dismiss. Modal: scrim tap or `form method="dialog"` also dismisses. Standard coexists with a scrolling/panning main view (maps, music).

---

## 7.3 Side sheets

**M3:** Side sheets (standard / modal). **ExpressiveCSS:** `dialog.side-sheet` (`.right` default, `.left`). `SideSheets.Init()` drag-dismisses from the header or the inner 24 dp edge.

**Use when** optional content should sit **beside** the main view: inspector, filters, in-app player, thread details. The user can navigate *inside* the sheet; a back icon is that affordance.

**Don't use** as the list-detail **detail pane** (that is a pane). Don't inset the sheet far from the window edge.

**Variants**

| Variant | API | When |
| --- | --- | --- |
| Standard | `show()` | Medium+; page stays interactive; 1 dp inner divider |
| Modal | `showModal()` | Focused task; scrim; 28 dp inner corners |

**Anatomy**

- Standard: container (required), optional divider, headline, close
- Modal: those plus optional back, actions, scrim

Header is 64 dp: optional back, `title-large` headline, close. Last-child `<form method="dialog">` is the action row. Width 400 dp, full height. Color `surface-container-low`.

**Placement.** Trailing edge by default. Slight inset (16 dp) is allowed; large gaps are not. On compact, a side sheet is usually the wrong tool — use a bottom sheet or a full-screen dialog.

**Adaptive.** Compact: avoid. Medium: modal is safer. Expanded+: standard next to the main pane.

**Behavior.** Close, scrim tap (modal), drag inner edge out, Escape. Back moves to the previous region *inside* the sheet, it does not close it.

---

## 7.4 Snackbar

**M3:** Snackbar. **ExpressiveCSS:** `.snackbar`. **Not** in `AutoInit()`. Construct when needed, or pin with `.active`.

**Use when** a process finished or will finish and the message is **low priority**. The user may ignore it.

**Don't use** to confirm Delete, to show errors that block the next step, or to persist a message. Don't stack snackbars.

**Anatomy.** Container (required), supporting text (required, ≤ 2 lines), optional action (one text button), optional close (`.circle` icon button).

**Placement.** Bottom of the UI, in front of content. Inset 8 dp on compact; from `small`, 344–672 dp wide, centered, 24 dp from the bottom. Move up to clear a FAB or navigation bar; **never** sit behind a FAB.

**Adaptive.** Compact: 48–64 dp tall, may grow to two lines. Medium+: single-line when possible, hugging content width.

**Behavior.** One at a time. Default timeout 4 s, 10 s with an action, or `displayLength: Infinity` until the user acts. Action is optional and must not be the only way to complete a required task.

---

## 7.5 Tooltips

**M3:** Tooltips (plain / rich). **ExpressiveCSS:** child `.tooltip` (CSS on hover and keyboard focus). Placement: `top` (M3 default), `bottom`, `left`, `right`. `rich` / `max` for rich. Legacy `.tooltipped` still AutoInits.

**Use when**

- **Plain:** label an icon-only control (“Present now”).
- **Rich:** explain a feature (subhead, body, up to two text buttons / a link).

**Don't use** a plain tooltip on a control that already has a visible text label. Don't put critical information only in a tooltip.

**Anatomy.** Plain: supporting text + container (inverse surface, 4 dp corners, no caret, no elevation, 4 dp gap, 200 dp max). Rich: optional subhead, body, up to two text buttons.

**Placement.** Prefer above. Keep on screen. Inside a `<button>`, the bubble must be a `<span>` (a `<div>` is hoisted). Icon-only hosts still need `.circle` so the span is not treated as a label.

**Behavior.** Hover and keyboard focus. Not a substitute for `aria-label`.

---

## 7.6 Badges

**M3:** Badges (small / large). **ExpressiveCSS:** `span.badge` nested **in the icon**.

**Use when** a navigation destination or icon has a count or an unread state.

**Don't use** as a “chip”, a price tag, or a status on a card. Don't invent badge colors.

**Variants.** Small: empty `span.badge`, 6 dp dot (unread). Large: text, 16 dp stadium, **≤ 4 characters** including `+`.

**Placement.** Upper trailing edge of a 24 dp glyph. Typical hosts: navigation bar, rail, tabs.

**Behavior.** Unread dots disappear after the destination is visited. Default mapping `error` / `on-error` (3:1 contrast). Include the count in the host’s accessible name.

---

# 8. Inputs and selection

## 8.1 Text fields

**M3:** Text fields (filled / outlined). **ExpressiveCSS:** `.field` wrapping the control. Label **after** the control. Default = filled; `outlined` for outlined. `placeholder=" "` (one space) so the label floats with CSS.

**Use when** the user must enter or edit text (name, email, search query in a form — not the Search component).

**Don't use** without a label. Don't use a text field for a value that is always picked from a small set (radios or select).

**Anatomy**

0. Container (`.field`)
1. Leading icon — optional
2. Label — required, always visible (floats on focus / content)
3. Input text
4. Trailing icon — optional (clear, error, password visibility)
5. Active indicator (filled: bottom line; outlined: stroke)
6. Supporting text (`<small>`) — optional (helper or error)
7. Character counter — optional, `CharacterCounter` (not AutoInit)

**Placement.** In a form, full width of the column. Pair with the 12-column grid. Height 56 dp.

**Adaptive.** Filled and outlined are style choices; pick one per product (or per surface). Outlined reads better on colored backgrounds. Both types share the same anatomy so they can mix if needed.

**Behavior.** `Forms.Init()` (import-time) validates `.validate` on `change`. Error: supporting text + error color on the indicator. Disabled: 38% opacity. Never use the placeholder as the only label.

---

## 8.2 Select

**M3:** Exposed dropdown menu from a text field. **ExpressiveCSS:** native `<select>` in `.field`. `AutoInit()` on `select` (opt out with `browser-default` or `no-autoinit`).

**Use when** the user picks **one** (or `multiple`) values from a known list that is too long for radios.

**Don't use** for navigation, for 2–3 options (radios are clearer), or for type-to-search across a large corpus (autocomplete).

**Anatomy.** Field + label + the hidden native select + the generated menu. `outlined` on the field matches outlined text fields.

**Behavior.** `FormSelect` builds the menu from `<option>` / `<optgroup>` **as text nodes** (never `innerHTML`). Keep option labels human-readable.

---

## 8.3 Autocomplete

**M3:** Combo of text field + menu. **ExpressiveCSS:** `.autocomplete` on an input. `AutoInit()`.

**Use when** the user types to filter a list of suggestions (airports, people, tags).

**Don't use** when the full list is short enough to show as a select, or when free text with no suggestions is enough.

**Placement.** Same as a text field. The menu is a docked overlay.

---

## 8.4 Checkboxes, radios, switches

Three **selection controls**. They are not interchangeable.

| Control | Pick | Takes effect | ExpressiveCSS |
| --- | --- | --- | --- |
| Checkbox | Zero or more of a related set | On Save / Submit | `<label><input type="checkbox"> Label</label>` |
| Radio | Exactly one of a related set | On Save / Submit (or immediately if that is the whole form) | `<label><input type="radio" name="g"> Label</label>` |
| Switch | One standalone setting | **Immediately** | `<label class="switch"><input type="checkbox"> Label</label>` |

**Don't**

- Don't use switches in a list that still needs a Save button.
- Don't use radios for multi-select.
- Don't use a checkbox for an on/off setting that applies instantly (that is a switch).
- Don't omit the wrapping `<label>`. Input first, then the text.
- `filled-in` and `with-gap` are no-ops. `.lever` is gone.

**Anatomy.** Checkbox: 18 dp box, 48 dp target, optional indeterminate (`element.indeterminate = true`). Radio: 20 dp ring + inner disc. Switch: 52×32 dp track, 16/24 dp handle, optional on/off icons in the handle (checkmark / X — not a moon or a pencil).

**Placement.** In lists (trailing or leading, consistently) or in forms. Always an inline label.

---

## 8.5 Chips

**M3:** Assist, Filter, Input, Suggestion. **ExpressiveCSS:** `.chip` (CSS). Interactive sets: `.chips` wrapper (JS, AutoInit).

**Use when** several **small tokens** appear together.

| Type | Author | Job | Example |
| --- | --- | --- | --- |
| Assist | Product | Smart action across contexts | “Add to calendar” |
| Filter | Product or user | Filter a collection | “Android”, “Web” |
| Input | User | Discrete entered values | To: Jane |
| Suggestion | Product | Dynamically offered replies / queries | “On my way” |

**Don't** use a single chip. Don't use chips as the primary action of a screen (that is a button). Don't elevate a chip on press.

**Anatomy.** Container + label (≤ 20 characters) + optional leading icon/avatar + trailing icon (required on input chips, optional on filter).

**Placement.** In a set, often horizontally scrollable under a title or above a list. Input chips live **inside** a field.

**Behavior.** Filter chips toggle. Input chips delete via the trailing close. The `.chips` plugin is the input-chip editor, not a generic button group.

---

## 8.6 Sliders

**M3:** Sliders (M3 Expressive sizes and stops). **ExpressiveCSS:** `<input type="range">` in `.range` (or a `<label>`). Plugin: `Expressive.Range` (**not** `Slider` — that name is the carousel). **Not** in `AutoInit()`; `Range.Init()` runs at import.

**Use when** the user picks a value along a continuum (volume, brightness, price) and the result can update live.

**Don't use** for picking among 2–4 discrete named options (radios or a connected button group — the latter is not shipped). Don't put `.slider` on a range input.

**Anatomy.** Inactive track, active track, handle, optional stops, optional value indicator, optional inset icon (not on XS).

**Variants.** Standard (active from start), centered (from midpoint), range (two handles). Horizontal or vertical. Sizes XS (default) → XL. XL is a hero moment.

**Placement.** Full width of the field column, with a visible label. Don't drop a slider in an app bar.

---

## 8.7 Date picker

**M3:** Docked (medium+) or modal / full-screen (compact). **ExpressiveCSS:** `.datepicker` on a text input. `AutoInit()`. **The calendar is inline**, not a modal. Default `openByDefault: false` hides it until you pass `true` or open it from the API.

**Use when** the user must pick a date or a range and a typed ISO string is not enough.

**Don't use** for relative times (“in 2 hours”) — that is a time picker or a select.

**Anatomy (M3).** Text field + calendar (headline, month nav, weekday labels, days, today, selected, actions). ExpressiveCSS inserts the calendar after the input’s **parent** (wrap the input in its own `.field`).

**Adaptive.** M3 would dock the calendar under the field on medium+ and use a dialog on compact. This framework’s picker is the docked/inline model. Don't wrap it in a second `<dialog>` unless you are deliberately building the compact modal pattern yourself.

**Behavior.** Draws are batched. i18n strings are escaped. Don't feed author-controlled HTML into the calendar.

---

## 8.8 Time picker

**M3:** Dial (compact) or input (medium+). **ExpressiveCSS:** `.timepicker` on a text input. `AutoInit()`. **Inline clock**, always visible, appended to the input’s parent. No `openByDefault`.

**Use when** the user picks a time of day.

**Don't use** for durations (that is a slider or a numeric field).

**Adaptive.** 12-hour or 24-hour as documented in `llm.md`. On compact, keep the host field above the fold so the clock is reachable.

---

## 8.9 Fieldsets

**M3:** No fieldset component. **ExpressiveCSS:** native `<fieldset>` + `<legend>` styled as an outlined grouping container so a cluster of fields matches outlined text fields.

**Use when** several controls are one question (shipping address, notification preferences).

**Don't use** as a card or a pane. Don't nest fieldsets deeply.

---

# 9. Display and feedback

## 9.1 Progress and loading

**M3:** Progress indicators (linear / circular; determinate / indeterminate) and a separate **loading indicator** for short waits. **ExpressiveCSS:** `.progress` — native `<progress>` (linear) or the circular spinner markup. CSS-only. The distinct M3 loading-indicator component is **not** shipped; use a circular spinner for short waits.

| Expected wait | What to show |
| --- | --- |
| `< 200 ms` | Nothing — show the result |
| 200 ms–5 s | Circular spinner (indeterminate) |
| `> 5 s` | Progress indicator; determinate if you know the percent |

**Placement.** Linear: along the edge of the container that is loading (often the top of the page or a pane). Circular: centered in the region that is waiting. One indicator per process.

**Don't** show a spinner for instant responses. Don't mix linear and circular for the same process. Don't use `pulse` as a progress indicator.

---

## 9.2 Carousel

**M3:** Carousel (multi-browse, uncontained, hero, full-screen). **ExpressiveCSS:** `.carousel`. Default = 3D coverflow. `.flat` / `carousel-slider` / `fullWidth` = CSS scroll-snap track. `AutoInit()`. This is **not** the Media “slider” (crossfading captions).

**Use when** items are **visual** and the user is browsing, not searching for a specific row (that is a list).

**Don't use** for text-heavy settings, or as the only way to reach items on a vertically scrolling page without a “Show all” path.

**Anatomy.** Track + items (image-first, optional short text). Optional indicators (generated; `destroy()` removes them).

**Adaptive.** Compact: fewer visible items, larger hero. Expanded+: multi-browse (large + medium + small items) if you use a flat track. Full-screen is a vertical immersive gallery, not a header carousel.

**Behavior.** Default coverflow is pointer-driven. Flat is snap-scrolling. Prefer snap for multi-browse / hero.

**Accessibility.** On a vertical page, provide a “Show all” button (or a header arrow) that opens a vertical list of the same items.

---

## 9.3 Icons as content

Covered in [§2.6](#26-icons). Decorative icons next to text can be `aria-hidden="true"` when the label already names the action. Standalone icons cannot.

---

# 10. Framework extras that are not Material 3 components

These exist in ExpressiveCSS. Do not use them as if they were M3 building blocks, and do not substitute them for the components above.

| Extra | What it is | Don't use it as |
| --- | --- | --- |
| Waves | Press ripple. Import-time `Waves.Init()`. | A button style |
| Pulse | Attention halo | A badge or a progress indicator |
| Parallax | CSS `animation-timeline: view()` clip | A hero carousel |
| Lightbox (`.lightboxed`) | Media overlay (renamed from Materialbox) | A dialog, a gallery carousel, or a side sheet |
| Media slider | Crossfading captions | An M3 carousel |
| FAB-to-toolbar | `.fab.toolbar` morph | An M3 toolbar (`div.toolbar`) |

---

# 11. Material 3 components this framework does not ship

Do not invent markup for these. If the user needs the pattern, say it is not available and use the substitute.

| M3 component | Substitute in ExpressiveCSS |
| --- | --- |
| Search bar + search view | Text field with a leading `search` icon, or a destination in the nav. There is no docked search view. |
| Split button | Filled button + a separate `menu-trigger` icon button. Do not glue them into a fake split control. |
| Button groups (standard / connected) | Separate buttons, or filter chips, or radios styled in a `<nav>`. No shape-morphing group. |
| FAB menu (M3 Expressive labelled menu) | `.fab` speed-dial, or a FAB that opens a `<menu>`. |
| Loading indicator (wavy morphing) | Circular `.progress` spinner. |
| Bottom app bar | `div.toolbar` (docked) or a FAB above a navigation bar. |
| Segmented button (legacy name) | Radios, tabs, or chips — not a dedicated segmented control. |

---

# 12. Screen recipes

Generate these skeletons unless the user asks otherwise. Fill in real destinations and actions. Always include `theme` on `<html>` and call `Expressive.AutoInit()` if you use registry components.

## 12.1 Compact app (phone portrait)

- `<header><nav>` small app bar: menu or back, title, 1 action.
- `<main>` one pane of content (list **or** cards, not both for the same data).
- Optional FAB, trailing, above the bar.
- `<footer><nav class="navigation-bar">` with 3–5 peers, `aria-current="page"` on the current one.
- Overflow destinations: modal navigation drawer or modal expanded rail, triggered from the app bar, markup **outside** the header `nav`.

## 12.2 List-detail (tablet / desktop)

- Leading **collapsed rail** (medium) or **expanded rail** (large+), 3–7 peers, optional extended FAB on the rail.
- Small or medium app bar over the panes, not a navigation bar.
- `.list-detail` with `.list-pane` (`.list`) and `.detail-pane`. Compact: one pane, `active`, back on the detail header.
- Item-level extras: standard side sheet on expanded+, bottom sheet on compact.
- Confirmations: basic dialog. Toasts: snackbar.

## 12.3 Settings

- App bar with Back + “Settings”.
- A **list** of destinations; each row is a link, a switch (immediate), or opens a subpage.
- Group with subheaders / fieldsets, not a grid of cards.
- Destructive: a list row that opens a dialog, not a FAB.

## 12.4 Form / editor

- App bar: close, title, one filled or tonal **Save** (or a text button in the bar on compact).
- Compact + lots of fields: full-screen dialog (`.max`) or a dedicated page, not a basic dialog.
- Fields in `.field`, labels always. Related fields in `<fieldset>`.
- Primary submit is a filled button at the end, not a FAB.
- Errors: supporting text on the field, not a snackbar as the only signal.

## 12.5 Marketing / docs page

- App bar with title + text destinations in a `<menu>` from `large` up; navigation-drawer trigger below that.
- `main.container` + 12-column grid.
- Cards for features, lists for indexes, breadcrumbs on nested docs.
- Site `<footer>` (not a navigation bar) for legal and site maps.

---

# 13. Quick anatomy cheat sheet

Required vs optional, for generation. “Host” is the element you put on the page.

| Component | Host | Required children | Current-state hook |
| --- | --- | --- | --- |
| App bar | `header > nav` | Headline | — |
| Navigation bar | `nav.navigation-bar` | 3–5 links, each icon + label | `aria-current="page"` |
| Navigation rail | `nav.navigation-rail` | Menu button, 3–7 links | `aria-current="page"`; `.expanded` |
| NavigationDrawer | `ul.navigation-drawer#id` | `li` rows; separate trigger `[data-target]` | `.active` on `li` |
| Tabs | `nav.tabs` | `a[href="#panel"]` | `.active` |
| Breadcrumbs | `nav > ol` | Links; last current | `aria-current="page"` |
| Pagination | `nav.pagination > ol` | Page links | `aria-current="page"` |
| Menu | `menu#id` + `.menu-trigger` | `li` items | `.selected` / `aria-selected` |
| Panes | `.list-detail` / `.panes` | 2–3 `.pane` | `.active` on compact |
| Button | `button` or `a.button` | Label (or `aria-label` if `circle`) | `disabled` |
| Icon button | `button.circle` | Icon + `aria-label` | — |
| FAB | `button.circle.extra` | Icon + `aria-label` | — |
| FAB speed-dial | `.fab` | Primary FAB + `ul` of FABs | — |
| Toolbar | `div.toolbar` | Action buttons | `.active` |
| Card | `article` | Anything; heading + body typical; optional direct `.primary-action` link | `.dragged`; `aria-disabled` on primary action |
| List | `ul.list` | `li` rows | `aria-selected` / `.active` |
| Dialog | `dialog` | Headline, body, `form method="dialog"` | `showModal()` |
| Bottom sheet | `dialog.bottom-sheet` | Content; optional handle | `showModal()` / `show()` |
| Side sheet | `dialog.side-sheet` | `header` + content | `show()` / `showModal()` |
| Snackbar | `.snackbar` | `<p>` | `.active` / JS |
| Tooltip | child `.tooltip` | Text | hover / focus |
| Badge | `span.badge` inside icon | Empty or ≤4 chars | — |
| Text field | `.field` | Control + `<label>` | `placeholder=" "` |
| Select | `.field > select` | Options | `browser-default` opt-out |
| Checkbox / radio | `label > input` | Label text | `checked` |
| Switch | `label.switch > input` | Label text | `checked` |
| Chip | `.chip` | Label | — |
| Slider | `.range > input[type=range]` | Label | — |
| Date / time | `input.datepicker` / `.timepicker` | Label in `.field` | AutoInit |
| Progress | `progress.progress` or circular markup | `value` if determinate | — |
| Carousel | `.carousel` | Item children | AutoInit |

---

# 14. Name map (Materialize / M2 → M3 / ExpressiveCSS)

If training data or the user says the left column, emit the right.

| Do not emit | Emit |
| --- | --- |
| `M`, `M.AutoInit`, `el.M_*` | `Expressive`, `Expressive.AutoInit`, `el.Expressive_*` |
| `.navbar`, `.nav-wrapper`, `.brand-logo` | `header > nav` |
| “bottom navigation” as `.tabs` | `nav.navigation-bar` |
| “navigation drawer” as the default large-screen nav | `.navigation-rail.expanded` (or `.navigation-drawer-fixed` for trees) |
| `.btn`, `.btn-large`, `.btn-flat` | `<button>`, `large` / `extra`, `text` |
| `.btn-floating` | `circle extra` / `.fab` |
| `.card`, `.card-content`, `.card-title`, `.card-action` | `<article>`, heading, `<p>`, `.actions` |
| `.collection` | `ul.list` |
| `.modal`, `.modal-header`, `.modal-footer` | `<dialog>`, heading, `form method="dialog"` |
| `.toast` | `Expressive.Snackbar` |
| `.materialboxed` | `.lightboxed` |
| `.materialize-textarea` | `.expressive-textarea` |
| `.lever`, `.filled-in`, `.with-gap` | (omit) |
| `Collapsible` | `<details>` / `<summary>` in the navigation drawer or page |
| `.slider` on a range | `.range` + `input[type=range]` |
| Bottom app bar | `div.toolbar` or FAB + navigation bar |

---

# 15. Verification checklist

Before finishing generated UI:

1. Which window size class is this layout for, and what happens at the next class down?
2. Is there exactly one persistent navigation pattern (bar **or** rail **or** fixed navigation drawer)?
3. Is there at most one FAB / filled primary action per region?
4. Are dialogs reserved for blocking work and snackbars for ignorable status?
5. Do icon-only controls have `aria-label` (and a tooltip if appropriate)?
6. Does every field have a `<label>`?
7. Are color roles used instead of hex?
8. Does compact list-detail show one pane with a back control?
9. Are Materialize class names absent?
10. Will `AutoInit()` find each registry component exactly once?

Markup, options, and method names: [`llm.md`](llm.md). Specs: [m3.material.io/components](https://m3.material.io/components).
