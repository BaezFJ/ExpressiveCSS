# Desktop

Read this when a page has to work well on a desktop or laptop window, when a mobile layout is being scaled up, or when a flow depends on drag and drop, zoom, refresh, multiple selection, hover actions, context menus or keyboard shortcuts. Material's [desktop guidance](https://m3.material.io/foundations/desktop/overview), reviewed 2026-11-27, sets the design intent. Component guides define what ExpressiveCSS ships.

Contents:

- What desktop means on the web
- Layout
- Components
- Interaction and input
- Review checklist

## What desktop means on the web

A desktop window usually opens at the medium or large breakpoint and can grow to extra-large, but the person can resize it to any width. Design every breakpoint the product reaches, and decide the layout from the window or container width, never from the user agent or the device name.

People expect more from desktop: a higher quality bar, denser information, and fewer steps per task. A desktop page that is the phone layout stretched wide fails that bar even when nothing is broken. Material's principles, with the check for each:

- **Adaptive from the start.** Build the layout and its hierarchy from modular regions so the compact page grows into the wide one, as the [layout workflow](../SKILL.md#workflow-for-a-new-layout) does.
- **More screen, more done.** Fill the extra width with more information, more panes or more columns. Do not scale elements up to fill empty space.
- **Multitasking.** Let people work on two things in the app at once with panes, a supporting pane or a standard side sheet, instead of a new page that hides the first task.
- **Efficiency with clarity.** Shorten task flows, but keep a clear hierarchy so the denser page stays readable.
- **Refined motion.** Small elements moving short distances can use shorter `--md-sys-motion-duration-*` tokens on desktop. Slow down or simplify transitions that move large elements far. `prefers-reduced-motion` still wins.
- **Every input counts.** People switch between touch, pointer and keyboard on the same device, often mid-task. Support all three on every breakpoint.

Input is not tied to width. A laptop can have a touch screen, and a tablet with a folio has a keyboard and trackpad. Use `@media (hover: hover)` and `(pointer: fine)` to refine presentation, such as revealing actions on hover, but never to gate a feature: keyboard and touch users on the same window still need it.

## Layout

- **Use panes from medium up.** Two panes suit list-detail; three can fit at extra-large. Start from the [canonical layouts](./canonical-layouts.md) (feed, list-detail, supporting pane) rather than custom layout CSS.
- **Cap and center a single pane.** When the page keeps one pane on desktop, put its content in a `.container` (centered, percentage width, 1280px maximum and 1920px from extra-large) or give the content a maximum inline size. Full-width text lines and forms read as a stretched phone UI.
- **Switch the navigation bar to a rail at medium and up**, which returns vertical space to the content. At extra-large, consider `.navigation-rail.expanded` by default so labels stay readable. The [breakpoints reference](./breakpoints.md) covers what else changes at each width.
- **Add density where people scan or compare**, such as tables, long lists and dashboards, under the opt-in rules in [grids and spacing](./grids-and-spacing.md#density). Desktop raises the expectation for density; it does not make density automatic.

## Components

- **Keep default component widths and padding.** Full-width buttons and text fields help on a phone but feel imprecise on a large screen. Do not stretch buttons, fields or chips to fill a pane; size the form column instead.
- **Replace bottom sheets from expanded up.** A bottom sheet on desktop needs long pointer travel and covers the main content. ExpressiveCSS bottom sheets stay anchored to the bottom edge and are meant for compact and medium, so switch the component at the breakpoint:
  - Press-and-hold or overflow actions become a context [menu](../../components/menu.md). Its `contextMenu` option (or `data-context-menu`) opens the menu at the pointer on right-click, long press, the menu key or Shift+F10.
  - Complex tools or configuration become a standard [side sheet](../../components/side-sheet.md) opened with `show()`, which has no scrim and leaves the content usable.
  - A modal sheet that asks for a decision becomes a [dialog](../../components/dialogs.md), which keeps the decision in the person's line of sight.
- **Make carousels work with a pointer and keyboard.** Material builds previous and next actions only into hero carousels. An ExpressiveCSS [carousel](../../components/carousel.md) moves with arrow keys but draws no such buttons, so add labelled icon buttons that call `prev()` and `next()`, and reveal them on hover and on `:focus-within`. Keep a nearby Show all link as a persistent route to every item. Wheel, Shift+wheel and two-finger swipes scroll the track natively; the buttons and Show all are the required single-pointer alternative.

## Interaction and input

Every desktop interaction needs three things: a single-click control, keyboard support, and clear hover and focus states.

### Single-click alternatives

Each gesture needs a control that does the same thing with one click or tap. WCAG requires this for dragging ([SC 2.5.7](../../expressivecss-accessibility/references/web-checks.md#dragging-alternatives)) and for multipoint or path gestures such as pinch and swipe ([SC 2.5.1](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html)).

| Gesture | Single-click alternative | In ExpressiveCSS |
| --- | --- | --- |
| Drag and drop to add a file | An add button or a file picker | [Drop zone](../../components/drop-zone.md) is a native file input covering its label, so a click or the keyboard opens the picker |
| Drag to reorder or move | Move up and down buttons, or a Move to menu | [Drag handle](../../components/drag-handle.md) is styling only; the page supplies the operation and its alternatives |
| Pinch or wheel zoom | Zoom in and zoom out icon buttons | [Map](../../components/map.md) documents `zoom-in` and `zoom-out` controls |
| Pull to refresh, or Ctrl+R / Cmd+R | A visible Refresh button | [Pull-to-refresh](../../components/pull-to-refresh.md) requires a `button[data-refresh]` |
| Swipe or long press for row actions | An overflow icon button that opens a menu | [Swipe actions](../../components/swipe-actions.md) have a `[data-swipe-toggle]` button |

On the web, Ctrl+R and Cmd+R reload the browser page. Do not intercept them; the in-app Refresh button is the desktop path for refreshing content.

### Drag and drop

- Pointer drags start at once, without the long press that touch often needs.
- While an item is dragged, apply the dragged state (`--md-sys-state-dragged-state-layer-opacity`) and raised elevation, and make it translucent so drop targets stay visible beneath it.
- Highlight a valid drop target with a border or an insertion point while the item is over it. Over an invalid target, show `cursor: no-drop`.
- When a drop cannot complete, return the item to where it started or fade it out, and say why if the reason is not obvious.

### Zoom and pan

Offer zoom by keyboard, scroll and touch, plus the zoom buttons above.

- Zoom-first content, such as a map, zooms on scroll and pans by click and drag once zoomed in.
- Pan-first content, such as a canvas, pans on scroll (Shift+scroll for horizontal, two-finger swipe on a trackpad) and zooms on Ctrl+scroll or Cmd+scroll. Ctrl+scroll is browser page zoom elsewhere, so cancel it only inside the canvas, with a non-passive `wheel` listener on that element. Never block page zoom for the whole document; text has to scale to 200%.
- Support a two-finger pinch on trackpads and touch screens.

### Secondary actions

Hide secondary actions to save space, but never make them reachable only one way.

- Open element actions such as copy or delete in a context menu from a secondary click, a long press, or an overflow icon button. Keep the visible overflow button: right-click is not discoverable and some people cannot do it.
- Actions can appear when a pointer hovers a row or card. Reveal them on `:focus-within` too, and keep them visible under `@media (hover: none)`. Hover must not be the only way to reach them.

### Multiple selection

Desktop users expect these, alongside a visible checkbox for every item:

- Ctrl+click, or Cmd+click on Apple platforms, to add or remove one item
- Shift+click to select a range
- Click and drag to select a group
- Ctrl+A or Cmd+A to select all

The [data table](../../components/data-table.md) documents per-row checkbox selection and select-all. Modifier clicks, range selection and drag selection are the page's to add; keep each checkbox's checked state in sync with them, and leave Ctrl+A alone while focus is in a text field.

### Keyboard shortcuts

- Use Command on Apple platforms and Ctrl elsewhere. The [command palette](../../components/command-palette.md) toggles with Ctrl+K or Cmd+K and leaves alone any key event the page already handled. Do the same: return early when `event.defaultPrevented` is set or focus is in an editable field.
- Do not take over browser or assistive technology shortcuts, such as reload, new tab, close tab, address bar or find.
- A single-character shortcut without a modifier needs a way to turn it off or remap it, or must work only while its component has focus ([WCAG 2.1.4](https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html)).
- Make shortcuts discoverable. Show them as `<kbd>` in menu items, list rows, tooltips or the command palette, and describe the control's shortcut with `aria-keyshortcuts`.
- Keep Tab order matching the visual order across panes, rails and sheets, and use the documented arrow-key models inside composite components. The [accessibility guide](../../expressivecss-accessibility/SKILL.md) owns focus order and composite roles.

### Hover and focus states

ExpressiveCSS components paint their own hover, focus, pressed and dragged states. Do not override or remove them, and never remove the focus ring. For a custom interactive element, follow the [state layers reference](../../expressivecss-theming/references/state-layers.md): show hover only where hover exists, show focus with `:focus-visible`, and keep the two distinguishable. A state must not depend on color alone.

## Review checklist

- At medium and wider, the page shows more information or more panes than compact, rather than the same content stretched. A single pane is capped and centered.
- The navigation bar becomes a rail at medium; the expanded rail is considered at extra-large.
- Buttons and fields keep default widths. Bottom sheets are replaced by a menu, a standard side sheet or a dialog from expanded up.
- Every drag, zoom, swipe, long press and refresh has a single-click control, and pointer drags start immediately with dragged, target and invalid-target feedback.
- Hover-revealed actions also appear on focus and without hover. Context menus have a visible overflow button.
- Shortcuts use Ctrl or Command, skip editable fields and handled events, leave browser shortcuts alone, and are shown to the user.
- The primary task works with keyboard only, with pointer only, and with touch where the window has it. Report any input you could not test as `Blocked`.
