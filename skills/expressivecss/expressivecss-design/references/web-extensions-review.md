# Web navigation extensions

Reviewed on 2026-09-13. Google evidence covers the linked rendered prose and textual measurements. Collapsed token tables, image-only measurements, full visual parity, native zoom and spoken assistive-technology output remain unverified. dp values are design references, not automatic CSS-pixel conformance.

Read the linked component guide for the ExpressiveCSS 0.12.0 markup and API contract. RoutePlate runtime assets may differ. The [capability roadmap](../../references/capability-roadmap.md) records source pins and scoped browser results.

## [Footer](../../components/footer.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Use a document footer landmark where appropriate, name distinct navigation groups and preserve meaningful links, reading order and reflow.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The application owns site-level grouping and accessible content.

Verification gap: A document-level contentinfo landmark is checked; section-scoped footers and responsive legal links remain unverified. Next check: Place a document footer outside main and sectioning elements; verify named legal navigation at enlarged text.

Mapped browser scope: Named navigation, document footer, unavailable pagination non-link, named badge count, list checkbox and scoped TOC aria-current. No spoken-output assertion.

## [Breadcrumbs](../../components/breadcrumbs.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Use named hierarchy navigation with real ancestor links and a current-page state. It communicates location, not peer categories.

Framework comparison: No dedicated Google component exists in the reviewed inventory. Native links and current-location semantics remain the web contract.

Verification gap: Named navigation and current-page markup are checked; CSS separator speech and long-path reflow remain unverified. Next check: Inspect assistive-technology output for separators and test translated paths without truncating essential context.

Mapped browser scope: Named navigation, document footer, unavailable pagination non-link, named badge count, list checkbox and scoped TOC aria-current. No spoken-output assertion.

## [Pagination](../../components/pagination.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Name result-page navigation and previous/next actions. Expose the current page and make unavailable actions genuinely unavailable to keyboard users.

Framework comparison: No dedicated Google component exists in the reviewed inventory. Styling does not supply result loading, data ownership or keyboard disabling.

Integration gap: aria-disabled and pointer-events alone cannot disable a link for keyboard users. Next check: Use a non-link unavailable control, verify actual page destinations and preserve current-page state after updates.

Mapped browser scope: Named navigation, document footer, unavailable pagination non-link, named badge count, list checkbox and scoped TOC aria-current. No spoken-output assertion.

## [Scrollspy](../../components/scrollspy.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Use named in-page navigation, real fragment links, stable heading IDs and current-section state. Account for sticky offsets and reduced-motion preferences.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The runtime updates aria-current; native links and application headings own navigation.

Verification gap: A scoped TOC current link is checked; shared observer behavior with different offsets and multiple independent TOCs remains unverified. Next check: Use getActiveElement to select the correct TOC; test independent offsets and teardown before claiming multi-TOC support.

Mapped browser scope: Named navigation, document footer, unavailable pagination non-link, named badge count, list checkbox and scoped TOC aria-current. No spoken-output assertion.

## [Message](../../components/message.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Identify each sender, keep reading order equal to conversation order, name icon-only message actions and announce appended messages through a log region.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework lays out the parts; the page owns the log region, sender names and message actions.

Verification gap: Avatar anchoring, start and end sides in LTR and RTL, and grouped corners are checked in a browser; announcements for appended messages and spoken output remain unverified. Next check: Append messages to a role="log" conversation and inspect assistive-technology output; test enlarged text and RTL.

Mapped browser scope: Avatar level with the bubble bottom and above the footer, start/end edges in LTR and RTL, no gap without an avatar, grouped corner radii and no message landmarks. No spoken-output assertion.

## [Accordion](../../components/accordion.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Expose each header as a button with its expanded state, keep controls out of the header, keep the reading order equal to the visual order and respect reduced motion.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The browser owns the disclosure behavior; the framework draws the tiles and the chevron.

Verification gap: Tile corners, the chevron turn, exclusive groups and the expanded state Chromium reports are checked in a browser; the open animation, enlarged text and spoken output remain unverified. Next check: Toggle items with a screen reader in each engine and confirm the expanded state is announced; test enlarged text and reduced motion.

Mapped browser scope: Outer, inner and open corner radii, chevron rotation, hidden native marker, exclusive name groups, Enter on a focused summary and the expanded state Chromium reports for each summary. No spoken-output assertion.

## [Data table](../../components/data-table.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep native table semantics with column and row headers, expose sort state on the header cell, name selection checkboxes after their rows and make a scrolling region reachable and named.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework styles a native table; the page owns sorting, select-all and the scroll region name.

Verification gap: Table semantics, the sticky header, numeric alignment, the sort arrow and selected rows are checked in a browser; sort announcements, enlarged text and spoken output remain unverified. Next check: Sort and select rows with a screen reader in each engine and confirm the sort state and selection are announced; test enlarged text and RTL.

Mapped browser scope: Table, column header and row counts through the wrapper, sticky header offset after scrolling, end-aligned numeric cells in LTR and RTL, sort arrow opacity and rotation, selected row fill and the named scroll region. No spoken-output assertion.

## [Avatar](../../components/avatar.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Name each person once through alt text or role="img" with a label, hide avatars beside a visible name and keep group counts understandable without the picture.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework draws the circle and group; the page names each person.

Verification gap: Sizes, the circle, the group overlap and named initials are checked in a browser; image loading failures, enlarged text and spoken output remain unverified. Next check: Read a group of avatars with a screen reader and confirm each name and the count are announced once; test enlarged text and RTL.

Mapped browser scope: Default, small and large sizes, circle radius, image and initials names in the accessibility tree, and the group overlap in LTR and RTL. No spoken-output assertion.

## [Skeleton](../../components/skeleton.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep placeholders out of the accessibility tree, report the wait through a status, clear aria-busy when content arrives and stop motion when reduced motion is requested.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework draws the placeholder shapes; the page owns aria-busy and the status message.

Verification gap: The shimmer, its reduced-motion stop and the absence of skeletons from the accessibility tree are checked in a browser; status announcements and spoken output remain unverified. Next check: Load content into an aria-busy region with a screen reader and confirm the status is announced once and the skeletons are not; test forced colors.

Mapped browser scope: Running shimmer animation, its removal under reduced motion, reversed direction in RTL, text and circle geometry and no skeleton nodes in the accessibility tree. No spoken-output assertion.

## [Empty state](../../components/empty-state.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: State what is empty and what to do next in text, keep the heading in the page outline, hide decorative icons and images and announce results that change after a search.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework lays out the parts; the page owns the heading level, wording and actions.

Verification gap: Centering, the icon circle and the actions row are checked in a browser; announcements when a search empties a list and spoken output remain unverified. Next check: Empty a filtered list with a screen reader and confirm the change is announced; test enlarged text and narrow widths.

Mapped browser scope: Centered column, icon circle size and fill, text width cap, centered wrapping actions and an empty alt image left out of the accessibility tree. No spoken-output assertion.

## [Stepper](../../components/stepper.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the steps in an ordered list, mark exactly one current step, convey complete and error states in text as well as color, and keep labels translatable.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework draws the steps and speaks their state; the page keeps aria-current and the state classes current.

Verification gap: Layout in LTR and RTL, indicator fills and glyphs, and the spoken state text are checked in a browser; screen reader output and enlarged text remain unverified. Next check: Move through a checkout with a screen reader in each engine and confirm the step count, the current step and the completed state are announced once.

Mapped browser scope: Row and stack layout in LTR and RTL, supporting text and content placement, current, complete and invalid indicator fills and glyphs, no trailing connector, spoken state text and its token override. No spoken-output assertion.

## [Popover](../../components/popover.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Open on press rather than hover, report the expanded state on the button, return focus on dismissal, keep the panel next in reading order and keep it within the viewport.

Framework comparison: No dedicated Google component exists in the reviewed inventory; the closest is the rich tooltip, which opens on hover. The browser owns the popover behavior; the framework places and styles the panel.

Verification gap: Anchoring and flipping in LTR and RTL, light dismiss, Escape and focus return are checked in a browser, and the expanded state in Chromium; spoken output and engines without anchor positioning remain unverified. Next check: Open a toggletip with a screen reader in each engine and confirm the expanded state and the panel content are reachable; check an engine without anchor positioning.

Mapped browser scope: Default, top and end placement against the button in LTR and RTL, both-axis flip at the viewport corner, Escape with focus return, outside click, staying open for an inner button, one auto popover at a time and the Chromium expanded state. No spoken-output assertion.

## [Drop zone](../../components/drop-zone.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep a native, labelled file input reachable by keyboard, show drag feedback that is not color alone, list chosen files in text and validate type and size where the files are used.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The browser owns choosing and dropping files; the framework draws the target, marks a drag and lists the files.

Verification gap: Input coverage, the dragover state, the file list and keyboard focus are checked in a browser with synthetic events; real operating-system drags and spoken output remain unverified. Next check: Drag files from the operating system onto the zone in each engine and confirm the selection and list update; check the list announcement with a screen reader.

Mapped browser scope: Input covering the label, label naming the input, dragover set and cleared by dragenter, dragleave and drop, listed names and sizes, list cleared on an empty selection and keyboard focus ring. No spoken-output assertion.

## [Tree](../../components/tree.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Expose each branch's expanded state, mark the current item, keep every row reachable by keyboard and avoid a tree role without its arrow-key contract.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The browser owns the disclosures and links; the framework draws the rows, guides and chevrons and withholds the tree role.

Verification gap: Indentation, chevrons in LTR and RTL, opening a branch and the current row are checked in a browser; long trees for keyboard users, enlarged text and spoken output remain unverified. Next check: Navigate a deep tree with a keyboard and a screen reader in each engine; measure how many Tab stops a long tree costs and whether arrow-key navigation is needed.

Mapped browser scope: Level indent, leaf and branch text alignment, open and closed chevrons in LTR and RTL, opening a branch, the current row fill, guide lines and no tree role. No spoken-output assertion.

## [Stat](../../components/stat.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Pair every value with its label, state the direction and comparison of a change in text and keep long values from overflowing their tile.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework lays out the tiles; the page owns the figures and the wording of each change.

Verification gap: Tiling, wrapping, the value type role, arrow direction, the negative color and term-definition pairing are checked in a browser; enlarged text and spoken output remain unverified. Next check: Read a stats row with a screen reader in each engine and confirm each label is announced with its value; test enlarged text at narrow widths.

Mapped browser scope: One row when wide and stacked when narrow, the headline value size, up and down arrows, the negative color and term-definition pairs in the accessibility tree. No spoken-output assertion.

## [Line chart](../../components/line-chart.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the data available as text, name the chart, keep series distinguishable and let a keyboard reach every value the pointer can.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework draws the lines, labels, legend and tooltip from the page's table; the page owns the data, its formatting and the caption.

Verification gap: Drawing, the hidden table, gaps, the y range, RTL, the tooltip, keyboard movement, forced-color swatches and destroy are checked in a browser; screen reader output and enlarged text remain unverified. Next check: Read a chart with a screen reader in each engine and confirm the table and the live tooltip are announced; test enlarged text.

Feature gap: There are no y axis value labels; the grid lines carry no numbers. Next check: Add optional y labels if charts need values readable without the tooltip.

Mapped browser scope: Hidden table in the accessibility tree, aria-hidden SVG, series classes and colors, labels, legend, the dashed series, no curve overshoot, gaps, data-min, data-max, data-value, a typographic minus, the area modifier, the sparkline size and focus, destroy restoring the table, pointer and keyboard tooltip movement, the live region, charts inside sized cards and primary actions, headerless tables, the RTL axis and arrows, ambiguous cell text as gaps and forced-color swatches. No spoken-output assertion.

## [Column chart](../../components/column-chart.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the data available as text, name the chart, start columns at zero, keep series distinguishable and let a keyboard reach every value the pointer can.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework draws the columns, labels, legend, band and tooltip from the page's table with the line chart's runtime; the page owns the data, its formatting and the caption.

Verification gap: Drawing, the hidden table, grouped and stacked geometry, gaps, negative values, the y range, RTL, the tooltip, the band, keyboard movement and destroy are checked in a browser; screen reader output, forced colors and enlarged text remain unverified. Next check: Read a chart with a screen reader in each engine and confirm the table and the live tooltip are announced; check forced colors and enlarged text.

Feature gap: There are no y axis value labels or range columns. Next check: Add optional y labels if charts need values readable without the tooltip; add range columns when a page needs them.

Mapped browser scope: Hidden table in the accessibility tree, the named plot, labels, legend, series classes, separate instances from line charts, grouped and stacked column geometry, gaps, negative columns, data-min above zero, the sparkline size and focus, destroy restoring the table, pointer and keyboard tooltip movement, the highlight band and the RTL row order. No spoken-output assertion.

## [Bar chart](../../components/bar-chart.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the data available as text, name the chart, start bars at zero, keep series distinguishable and let a keyboard reach every value the pointer can.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework draws the bars, row labels, values, legend, band and tooltip from the page's table with the column chart's runtime turned on its side; the page owns the data, its formatting and the caption.

Verification gap: Drawing, the hidden table, grouped, stacked and split geometry, values, gaps, negative values, the value range, RTL, the tooltip, the band, keyboard movement and destroy are checked in a browser; screen reader output, forced colors and enlarged text remain unverified. Next check: Read a chart with a screen reader in each engine and confirm the table and the live tooltip are announced; check forced colors and enlarged text.

Feature gap: There are no value axis labels. Next check: Add optional value labels if charts need numbers readable without the tooltip.

Mapped browser scope: Hidden table in the accessibility tree, the named plot, row labels, legend, separate instances from column charts, the plot height from its rows, grouped, stacked and split bar geometry, values, negative bars, RTL bars, the sparkline layout and focus, destroy restoring the table, pointer and keyboard tooltip movement and the highlight band. No spoken-output assertion.

## [Timeline](../../components/timeline.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep events in an ordered list in the order shown, give each a machine-readable time and hide decorative markers and icons.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework draws the markers and line; the page owns the order, times and wording.

Verification gap: Marker and line geometry in LTR and RTL and the icon variant are checked in a browser; long feeds, enlarged text and spoken output remain unverified. Next check: Read a timeline with a screen reader in each engine and confirm the order and times are announced; test enlarged text.

Mapped browser scope: Marker column, dot size, connecting line and its absence on the last event, the icon circle and its column in LTR and RTL. No spoken-output assertion.

## [Command palette](../../components/command-palette.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep focus in the input while the active option moves, report it with aria-activedescendant, announce when nothing matches, return focus on close and let users turn the shortcut off.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The native dialog owns modality and focus return; the framework adds filtering, the combobox and listbox roles and the shortcut.

Verification gap: The shortcut, filtering, arrow and Enter handling, closing, focus return, the native opener and destroy are checked in a browser; screen reader announcements and shortcut conflicts with assistive technology remain unverified. Next check: Run commands with a screen reader in each engine and confirm the active option and the empty message are announced; check that Ctrl+K does not clash with the screen reader or browser.

Mapped browser scope: Combobox and listbox roles, Ctrl+K toggle, input focus, top placement, wrapping arrows, accent-insensitive and keyword filtering, hidden empty groups, the empty message, Enter and click running a command, closing with focus return, the commandfor opener, a fresh search on reopening, Escape, destroy and the keycap style. No spoken-output assertion.

## [Rating](../../components/rating.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep a native radio group with a legend and a name for every star, show focus, fill by more than color where possible and name a read-only display with its value.

Framework comparison: No dedicated Google component exists in the reviewed inventory. Native radios own the keyboard and the form value; the framework draws them as stars.

Verification gap: Star fill, hover preview, native arrow keys, form value, the display fill direction and names are checked in a browser; the focus ring after arrow keys is not drawn in Playwright WebKit, and spoken output remains unverified. Next check: Rate with a keyboard and a screen reader in each engine, including Safari, and confirm the focus ring follows the arrows and each star is announced.

Mapped browser scope: Visible 24px masked radios, fill up to the checked star, Tab entry and arrow keys, focus ring on entry, hover preview, form value, display width and fill direction in LTR and RTL, and the group, radio and image names. No spoken-output assertion.
