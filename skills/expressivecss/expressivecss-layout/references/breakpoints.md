# Breakpoints

Read this when a layout has to change between widths: choosing panes and components per breakpoint, or deciding what to reveal, divide, resize, reposition or swap at the next size. Material's [breakpoints guidance](https://m3.material.io/foundations/layout/breakpoints/overview), last reviewed 2026-11-27, sets the design intent. Material's breakpoints apply to Android and the web; read their dp widths as CSS pixels. The selected component guides define what ExpressiveCSS ships. The widths, grid prefixes and Sass mixins are in the [layout guide](../SKILL.md#breakpoints).

## Contents

- Design for windows, not devices
- What each breakpoint gets
- Breakpoint by breakpoint
- Five questions for the next breakpoint
- Review checklist

## Design for windows, not devices

A breakpoint is the window size at which a layout needs to change to match the available space, device conventions and ergonomics. Every window falls into one of five: compact, medium, expanded, large or extra-large. Designing for five ranges covers far more displays than designing for a list of devices.

Material lists common devices for each range. Use them only to picture who reaches a breakpoint, never as breakpoint logic:

| Breakpoint | Common devices |
| --- | --- |
| Compact | Phone in portrait |
| Medium | Tablet in portrait; unfolded foldable in portrait |
| Expanded | Phone in landscape; tablet in landscape; unfolded foldable in landscape; desktop |
| Large | Desktop |
| Extra-large | Desktop; ultra-wide monitor |

The same device crosses breakpoints. Rotating a phone moves it from compact to expanded, unfolding a foldable moves it up, and multi-window mode or a resized browser window moves it down. On the web the browser window is the window, so a desktop user can reach every breakpoint. Preserve the selected item, scroll position and unsaved input when the layout changes, because the person did not navigate anywhere.

Android also defines compact, medium and expanded height classes. Most layouts scroll vertically, so they rarely need to react to height. ExpressiveCSS has no height mixin; add a `height` media query only when a fixed region, such as a full-height pane or a docked toolbar, would leave too little room for content.

## What each breakpoint gets

Material recommends different components for the same job at different sizes:

| Breakpoint | Panes | Navigation | Communication | Supplemental actions |
| --- | --- | --- | --- | --- |
| Compact | 1 | Navigation bar; modal expanded rail for more destinations | Basic or full-screen dialog | Bottom sheet |
| Medium | 1 (recommended) or 2 | Collapsed rail with one pane, navigation bar with two; modal expanded rail | Basic dialog | Menu |
| Expanded | 1 or 2 (recommended) | Collapsed rail, or a modal or standard expanded rail | Basic dialog | Menu |
| Large | 1 or 2 (recommended) | Collapsed or expanded rail, by the amount of content | Basic dialog | Menu |
| Extra-large | 1 to 3 (recommended) | Expanded rail fits best; collapse it when the panes need room | Basic dialog | Menu |

In ExpressiveCSS terms:

- Navigation bar is `nav.navigation-bar` ([guide](../../components/navigation-bar.md)). Navigation rail is `nav.navigation-rail`, collapsed by default; add `expanded` for the expanded rail and `modal` to keep the overlay at every width ([guide](../../components/navigation-rail.md)). An expanded rail is already modal on compact windows.
- A `<dialog>` is a basic dialog and `dialog.max` is full screen ([guide](../../components/dialogs.md)). Use [bottom sheet](../../components/bottom-sheet.md) on compact and [menu](../../components/menu.md) from medium.
- `.panes` shows one pane below 840px and puts panes side by side from 840px ([guide](../../components/panes.md)). A two-pane medium layout therefore needs grid spans, `.m6` and `.m6` for Material's 50% panes, not the pane pattern.
- The [design rules](../../references/design-rules.md) sections 1.2 and 1.4 hold an older copy of this table and the destination-count rules. Where the tables differ, this one is the newer review.

## Breakpoint by breakpoint

Material's page for each breakpoint adds these details. The pane margins and spacer already match: `.panes` uses 16px margins below 600px and 24px margins and a 24px spacer from 600px.

**Compact (below 600px).** One pane with 16px margins. Put navigation near the bottom edge, where thumbs reach it: a navigation bar, or a modal expanded rail for more destinations.

**Medium (600 to 839px).** One pane is recommended because the width is limited. Use a navigation rail beside a single pane, and a navigation bar with two panes, so the panes keep the full window width. Two panes suit only low-density content, such as settings, and each takes 50% of the window; avoid custom widths. A drag handle can expand either pane to the full width, with the keyboard and non-drag controls the [scaffold reference](../../expressivecss-design/references/scaffold.md#define-scrolling-and-optional-resizing) requires. On a landscape tablet or unfolded foldable the top quarter of the screen is hard to reach, and the very bottom edge is hard for some hands, so keep frequent and essential controls out of both.

**Expanded (840 to 1199px).** Two panes are often best; keep one pane for dense content or media, such as video. Use a collapsed or expanded rail. Put sorting, filtering and secondary navigation inside the pane, with [tabs](../../components/tabs.md) or similar components, not in the rail. A fixed pane is 360px by default, which is the `--md-comp-pane-list-width` and `--md-comp-pane-supporting-width` default. A split pane keeps its spacer centered in the window; do not assume an equal `.panes` split does that beside a rail, as the scaffold reference explains.

**Large (1200 to 1599px) and extra-large (1600px and wider).** These matter most for laptop and desktop web layouts, and some products do not need them; decide from the platform and its users. Two panes are often best, and a single pane suits only dense content or media. Choose a collapsed or expanded rail by the amount of content. The expanded rail fits best at extra-large; collapse it when the panes need room or on pages deeper in the hierarchy. Material's fixed pane grows to 412px here, but ExpressiveCSS keeps 360px; to follow Material, set `--md-comp-pane-list-width: 412px` on the pane container inside a `(min-width: 1200px)` query in a stylesheet loaded after ExpressiveCSS. A split pane keeps its spacer centered even beside an expanded rail. Extra-large can add a standard [side sheet](../../components/side-sheet.md) as a third pane, never more. Watch line length on these widths.

On compact through expanded, the rail can hide on secondary destinations as long as a back button returns to the primary destination. Every breakpoint must hand over to the next one live, without a reload, because the window changes without navigation: a foldable folds or unfolds, a device rotates, split screen or multi-window mode starts or ends, or a free-form browser window is resized.

## Five questions for the next breakpoint

Design one breakpoint first, usually compact, then ask these questions to adapt it to the next size. More space should change what the layout shows, not only make the same thing bigger.

### 1. What should be revealed?

Show at larger sizes what smaller sizes hide behind a control. A rail that opens from a menu button on compact can start expanded on a wide window, showing labels and more destinations. A list-detail layout can show the inbox and the selected conversation together instead of one at a time.

In ExpressiveCSS, the rail's menu button toggles `expanded`, and list-detail panes reveal the detail pane at 840px. Whatever is revealed must still be reachable at the smaller size: a hidden pane needs an open and back path, and a collapsed rail needs its toggle.

### 2. How should the screen be divided?

- Compact and medium: one pane works best.
- Expanded and large: two panes are recommended.
- Extra-large: consider three panes.

Two panes on medium work only for low-density content with clear actions, such as a settings list beside one settings group. Keep one pane on medium when either side is dense, because both panes become too narrow to scan.

Keep a single pane at any size when the task needs focus: a game, a movie, a video call, or a creative tool. An immersive single pane can float its controls over the content, such as a call toolbar.

### 3. What should be resized?

Cards, feeds, lists and panes can grow as the window grows. Resizing can give imagery more room and make text easier to read. A card can change its margins, orientation, type size and density: an ExpressiveCSS horizontal card puts media beside the text from 600px and stacks below that ([cards guide](../../components/cards.md)).

At every breakpoint, keep body text to roughly 40 to 60 characters per line. Wider windows should get larger margins, more columns or larger type, not longer lines. ExpressiveCSS has no line-length utility; set `max-inline-size` in `ch` on the text container, as the empty state does with `40ch`.

### 4. What should be repositioned?

Reflow content into the extra space: move cards into more columns, add a second column, build a richer photo grid, or add negative space. Use grid spans for this ([grid reference](../../expressivecss-usage/references/grid.md)) and keep the source order meaningful, because CSS reordering does not change reading or focus order.

Repositioning also follows ergonomics. Actions sit at the bottom of a compact window where thumbs reach them, and move to the leading edge on medium and expanded windows, for example from a navigation bar to a rail with the FAB at its top.

Decide how internal elements anchor as their container grows. Tabs can stay centered on compact and medium. A FAB can keep a fixed place in the rail. A button's icon and label stay together and centered as the button widens, which ExpressiveCSS buttons already do.

### 5. What should be swapped?

Swap components with the same function when the ergonomics change: a navigation bar on compact becomes a navigation rail on medium or expanded, a modal expanded rail on compact and medium becomes a standard expanded rail from expanded, and a collapsed rail becomes an expanded rail on large and extra-large. A bottom sheet of actions becomes a menu, and a full-screen dialog becomes a basic dialog.

Swap only when both components do the same job and the swap serves a functional or ergonomic purpose. Do not swap a button for a chip or a button for a menu, and think twice before turning list items into cards, because each change alters how people act on the content.

When both components exist in the markup, hide the inactive one with the hide classes in the [helpers reference](../../expressivecss-usage/references/helpers.md). For a bar on compact and a rail from 600px, put `.hide-on-med-and-up` on the bar and `.hide-on-compact-only` on the rail. Avoid the `.show-on-*` classes here: they force `display: block` and break the component's own layout. A hidden component leaves the tab order and the accessibility tree. Never show a navigation bar and a navigation rail at the same width.

## Review checklist

- Each product view has a layout for every breakpoint its users reach, and no layout depends on a device name.
- The pane count matches the table above, with any two-pane medium layout limited to low-density content, split 50/50 and paired with a navigation bar.
- Fixed panes are 360px at expanded and, where the product follows Material, 412px from large; a split pane keeps its spacer centered.
- Each swap pairs components with the same function, and only one set of primary destinations is visible and focusable at each width.
- Body text stays near 40 to 60 characters per line at every breakpoint.
- Selection, scroll position and unsaved input survive crossing a breakpoint, including a rotation or window resize.
- The page was checked on both sides of every boundary it uses: 599/600, 839/840, 1199/1200 and 1599/1600px.
