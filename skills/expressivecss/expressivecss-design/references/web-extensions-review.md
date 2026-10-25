# Web navigation extensions

Reviewed on 2026-09-13. Google evidence covers the linked rendered prose and textual measurements. Collapsed token tables, image-only measurements, full visual parity, native zoom and spoken assistive-technology output remain unverified. dp values are design references, not automatic CSS-pixel conformance.

Read the linked component guide for the ExpressiveCSS 0.15.0 markup and API contract. RoutePlate runtime assets may differ. The [capability roadmap](../../references/capability-roadmap.md) records source pins and scoped browser results.

## Contents

Footer, Breadcrumbs, Pagination, Scrollspy, Message, Message scroller, Accordion, Data table, Avatar, Skeleton, Empty state, Alert, Stepper, Popover, Drop zone, Tree, Stat, Description list, KPI, Countdown, Line chart, Column chart, Bar chart, Pie chart, Heatmap chart, Radar chart, Radial chart, Mixed chart, Timeline, Command palette, Rating, Aura, Questionnaire, Marquee, Rich text editor, Confetti, Particles, Map, Mega menu, Menubar, Calendar, Tour, Image compare.

Each section lists the relationship, reviewed sections, requirements, and framework comparison, then any verification, feature, or integration gap and the mapped browser scope. Read only the selected component's section.

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

## [Message scroller](../../components/message-scroller.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the reader's place unless they are at the live edge, let them stop following at any time, name the focusable viewport and announce appended messages through a log region.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework owns scroll position, the turn spacer and the button's inert state; the page owns the log region, aria-busy while streaming, and loading history.

Verification gap: Following, release on scrolling up, the inert button, prepend preservation, turn anchoring with the spacer, saved-transcript positions and jump to a message are checked in a browser; announcements in a role="log" viewport, touch and scrollbar dragging, and spoken output remain unverified. Next check: Stream replies into a role="log" viewport with a screen reader in each engine, and check touch scrolling and scrollbar dragging on real devices.

Mapped browser scope: Opening at the end, following streamed text, release on a wheel scroll up, the inert button and resuming from it, following kept through a click on a message, scrollToMessage with a peek and with a missing id, prepend preservation, an appended anchor at the peek with a spacer that clears as the reply grows, and destroy. No spoken-output assertion.

## [Pull-to-refresh](../../components/pull-to-refresh.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Offer a control that refreshes without the gesture, keep the native browser pull from running as well, report the busy state, and do not take scrolling away from a drag that is not a pull.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework reads the touch pull, shows the author's loading indicator, sets aria-busy and announces the start and the finish in its own status region; the page owns the refresh button, the indicator's name, the data loading and the moment the refresh finishes.

Verification gap: The pull threshold, waitUntil() and complete(), short, cancelled, sideways and mouse drags, pulls while scrolled down, inner and surrounding scrollers, a second finger, the busy state, the refresh button by click, Enter and Space, page scrolling, reduced motion and destroy() are checked in a browser, with real touch in Chromium and dispatched touch events in Firefox and WebKit. Real phones, pen input, spoken output from the status region and forced colors remain unverified. Next check: Pull on Chrome and Firefox for Android and Safari on iOS and confirm the browser's own refresh does not run; read a refresh with a screen reader.

Feature gap: Only a downward pull at the top refreshes; there is no pull from the bottom to load more and no nested containers. Next check: None planned.

Mapped browser scope: The contained overscroll, one event and a visible indicator per pull past the threshold, cancelled moves only during a pull, the indicator kept until the page reports the finish, drags that do nothing, repeat refreshes ignored while busy, the refresh button, a container that pulls the page, reduced motion with a :root duration override, and destroy() mid-refresh. No spoken-output assertion.

## [Swipe actions](../../components/swipe-actions.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Offer a single-pointer and keyboard path to every action a swipe reveals (WCAG 2.5.1), keep the actions named and reachable while the row is closed, run nothing on the gesture alone, and do not take scrolling away from a drag that is not a swipe.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework reads the touch swipe, slides the row, keeps the toggle's aria-expanded in step, opens a row when focus reaches its actions and closes it on Escape, an outside tap or an action; the page owns the buttons, their names and what each action does.

Verification gap: Swipe reveal, the slide limit, short, vertical, mouse, two-finger and cancelled drags, the toggle, focus on an action, Escape, an outside tap, closing after an action, one open row, the event and onToggle, right-to-left pages, reduced motion and destroy() are checked in a browser, with real touch in Chromium and dispatched touch events in Firefox and WebKit. Real phones, flick velocity, pen input, spoken output and forced colors remain unverified. Next check: Swipe on Chrome for Android and Safari on iOS and confirm the browser's back gesture and vertical scrolling still work; read a row's actions with a screen reader.

Feature gap: Actions only on the inline-end side, and no full swipe that runs an action. Next check: None planned.

Mapped browser scope: Swipe reveal with no action run, the keyboard path through the toggle and its actions, short and over-long swipes, drags that do nothing, the toggle, outside tap, Escape and action close, one open row with matching events and callbacks, right-to-left pages, reduced motion with a :root duration override, and destroy() with a row open or mid-swipe. No spoken-output assertion.

## [Input mask](../../components/input-mask.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the field a labelled native input, show the expected format in visible text, leave IME composition alone until it ends, keep the caret where the person is editing, and submit and validate the value the person sees.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The page writes the field, its label, its format hint and the mask; the framework formats typed, pasted, autofilled and composed text to the mask, places the caret, deletes across literals and formats saved and reset values.

Verification gap: Typing, insertText pastes, rejected and overflowing characters, letter and escaped masks, Backspace and Delete across literals, selection deletes, mid-value inserts, composition in both event orders, a CDP composition of full-width digits in Chromium, saved values, reset, listener order, Keypad keys and destroy() are checked in a browser. Real IMEs, Android keyboards, clipboard pastes and spoken output remain unverified, and undo after a formatted edit does nothing. Next check: Type into a masked field with a Japanese IME, Chinese pinyin and Gboard on Android, and read it with VoiceOver and NVDA.

Feature gap: The form submits only the formatted value, and masks cannot change with the value, as card numbers whose grouping depends on the card type would need. Next check: None planned.

Mapped browser scope: Typed and inserted digits formatted with the caret after the last one, form data and submit data, dropped letters, typed literals and overflow, letter and escaped-literal masks, Backspace and Delete next to a literal, a selection delete, a mid-value insert, composition dispatched in both event orders and through CDP, a saved value formatted without events and again after a reset button and form.reset(), field, form and document input listeners, Keypad keys, and destroy(). No spoken-output assertion.

## [Currency input](../../components/currency-input.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the field a labelled native input that names the currency, show the amount in the reader's locale, let people edit a plain number, report text that holds no amount as invalid, and submit a number a server can read whatever the locale.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The page writes the field, its label and the currency code; the framework formats the amount with Intl.NumberFormat on blur, shows a plain number on focus, reads typed and pasted amounts in either decimal mark, sets the validity message and swaps the form data entry for the plain number.

Verification gap: Typing and blur under de with euros, focus editing, change and blur listener order, insertText pastes submitted with Enter under de and en, the validity message and its i18n replacement, saved values, reset and destroy() are checked in a browser, and the parsing rules in jsdom. Mobile decimal keypads and spoken output remain unverified. Next check: Type an amount on iOS Safari and Android Chrome decimal keypads under lang="de", and read the field with VoiceOver and NVDA.

Feature gap: Formatting happens on blur, not while typing; there is no currency picker, no min or max check, and a form that repeats a currency field's name gets one entry for them. Next check: None planned.

Mapped browser scope: A typed amount formatted on blur with the plain number in form data and submit data, the plain number on focus, change and blur listeners reading the formatted text, pasted amounts submitted with Enter under de and en, text with no digit kept and marked invalid with the default and replaced message, a saved value formatted without events and again after a reset button and form.reset(), and destroy() clearing the message. No spoken-output assertion.

## [Loading overlay](../../components/loading-overlay.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Block input to the busy region only, report the busy state and its end to assistive technology, keep focus from being lost for good, and keep the content visibly unavailable in forced colors.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The page owns aria-busy and the indicator's name; the framework follows the attribute, makes the region inert, shows a surface scrim and the indicator, announces the start and the finish in its own status region after the region, and returns focus on clear.

Verification gap: Input blocking by click and Tab, regions busy at start, the author's inert state, the status region and its i18n words, focus return, the scrim and indicator geometry and destroy() are checked in Chromium, Firefox and WebKit, and the forced-colors and reduced-motion rules statically. Spoken output from the status region and real forced-colors themes remain unverified. Next check: Mark a region busy and clear it with VoiceOver and NVDA running, and view it under a Windows high-contrast theme.

Feature gap: The scrim does not follow the content of a region that scrolls itself, and there is no full-page mode or determinate progress. Next check: None planned.

Mapped browser scope: A mouse click and Tab blocked while busy and restored after aria-busy="false" or its removal, inert from the start, an author's inert kept, the status region outside the region with default and markup i18n words, focus returned, kept after a move and skipped for a removed control, the scrim covering the region with the indicator centred, and destroy() while busy and at rest. No spoken-output assertion.

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

## [Alert](../../components/alert.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the message in the reading order next to what it describes, convey tone in text as well as color, keep controls out of any live region and return focus when an alert is dismissed.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework lays out the icon, text, actions and close button; the page owns the role, dismissal and focus.

Verification gap: The layout, both tones, enlarged-text wrapping and the authored role are checked in a browser; live announcements and spoken output remain unverified. Next check: Show and update an alert with a screen reader in each engine and confirm status and alert roles are announced once, without the button labels; test forced colors.

Mapped browser scope: Icon, heading, text, close and actions placement, end-aligned actions, 16px corners, title-small heading, underlined links, text start without an icon, secondary and critical container colors, the authored alert role and controls kept inside at 280px. No spoken-output assertion.

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

## [Description list](../../components/description-list.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the native dl so each value stays paired with its label, keep the reading order label before value and let long values wrap.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The browser exposes the pairing; the framework lays out the columns and dividers.

Verification gap: Two columns, the compact stack, one divider per pair, div-wrapped groups and several values per label are checked in a browser; enlarged text and spoken output remain unverified. Next check: Read a description list with a screen reader in each engine and confirm each value is announced with its label; test enlarged text.

Mapped browser scope: Label and value columns, shared rows, div-wrapped groups, stacked extra values, one divider per pair, the compact stacked layout and unchanged reading order. No spoken-output assertion.

## [KPI](../../components/kpi.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Pair the value with its label, state the direction and unit of a change in text, caption the sparkline and name the action after the figure.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework lays out the card, the trend chip and the footer; the page owns the figures, the wording of the change and the chart data.

Verification gap: Part placement, the value type role, arrow direction, the negative chip and chart colors and term-definition pairing are checked in a browser; enlarged text and spoken output remain unverified. Next check: Read a KPI row with a screen reader in each engine and confirm the label, value, trend and sparkline caption are announced in order; test enlarged text at narrow widths.

Mapped browser scope: Trend beside the value, actions in the label row's end corner, chart under the value, an edge-to-edge footer closing the card, the headline value size, up and down arrows, the negative chip and chart colors and term-definition pairs in the accessibility tree. No spoken-output assertion.


## [Countdown](../../components/countdown.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the number in the element's text for assistive technology, avoid announcing every tick and stop the motion when the user asks for reduced motion.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework draws and rolls the digits; the page sets the value, the matching text and any timer or live region around it.

Verification gap: Width, digit positions, the baseline, the roll transition, reduced motion and the accessibility tree text are checked in a browser; spoken output inside role="timer" and aria-live regions remains unverified. Next check: Run a ticking timer and a polite live count with a screen reader in each engine and confirm the timer stays quiet and the live count announces each value once.

Mapped browser scope: Box width per digit count and padding, strip positions for in-range and clamped values, baseline alignment, the translate transition on change, reduced motion and the accessibility tree text. No spoken-output assertion.

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

## [Pie chart](../../components/pie-chart.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the data available as text, name the chart, keep slices distinguishable and their shares readable, and let a keyboard reach every slice the pointer can.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework draws the slices, legend, shares, values, donut total and tooltip from the page's table with the line chart's runtime; the page owns the data, its formatting, the total and the caption.

Verification gap: Drawing, the hidden table, slice geometry and colors, the legend and shares, the donut hole and total, values, zero and missing values, RTL, the tooltip, pointer angle hit testing, keyboard movement and destroy are checked in a browser; screen reader output, forced colors and enlarged text remain unverified. Next check: Read a chart with a screen reader in each engine and confirm the table and the live tooltip are announced; check forced colors and enlarged text.

Feature gap: There are no labels outside the pie, and rows past six reuse the colors. Next check: Add outside labels with leader lines if charts need names on the pie; group small parts into an Other row meanwhile.

Mapped browser scope: Hidden table in the accessibility tree, the named plot, the square plot, slice geometry and colors, gap lines, legend cells and shares, separate instances from line charts, the donut hole and total, values, the sparkline size and focus, destroy restoring the table, pointer angle and keyboard tooltip movement, the active slice and RTL. No spoken-output assertion.

## [Heatmap chart](../../components/heatmap-chart.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the data available as text, name the chart, keep values readable without telling shades apart, and let a keyboard reach every cell the pointer can.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework draws the shaded grid, row and column labels, values, scale and tooltip from the page's table with the line chart's runtime; the page owns the data, its formatting, the short labels and the caption.

Verification gap: Drawing, the hidden table, cell shades and gaps, the fixed scale, values and their text color, short and running labels, the scale ends, RTL, page overflow from a wide table, the tooltip, pointer and keyboard movement round the grid and destroy are checked in Chromium, Firefox and WebKit; screen reader output, forced colors and enlarged text remain unverified. Next check: Read a chart with a screen reader in each engine and confirm the table and the live tooltip are announced; check forced colors and enlarged text.

Feature gap: A wide grid narrows its cells to fit instead of scrolling, and the scale is one color with no diverging or stepped option. Next check: Add a scrolling layout that keeps the tooltip visible if year-long grids must work on phones, and a diverging scale if charts need a midpoint.

Mapped browser scope: Hidden table in the accessibility tree, the named plot, cell shades and gaps, the row height, row and column labels, short and running labels, the scale and its ends, the fixed scale, values and their text color, page overflow, destroy restoring the table, pointer and keyboard movement round the grid, the active cell and RTL. No spoken-output assertion.

## [Radar chart](../../components/radar-chart.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the data available as text, name the chart, keep series distinguishable and every spoke labelled, and let a keyboard reach every row the pointer can.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework draws the grid, shapes, labels, legend, points and tooltip from the page's table with the line chart's runtime; the page owns the data, its formatting, the scale and the caption.

Verification gap: Drawing, the hidden table, the grid, shape geometry and colors, the scale with data-max and clamping, gaps, labels, the legend, area and points, the sparkline, RTL, the tooltip and cursor spoke, nearest-spoke pointer hit testing, keyboard movement and destroy are checked in a browser; screen reader output, forced colors and enlarged text remain unverified. Next check: Read a chart with a screen reader in each engine and confirm the table and the live tooltip are announced; check forced colors and enlarged text.

Feature gap: A gap joins the spokes either side of it rather than breaking the shape, the rings have no value labels, and series past four reuse the colors. Next check: Mark gaps and label the rings if charts need them; keep to three series meanwhile.

Mapped browser scope: Hidden table in the accessibility tree, the named plot, the square plot, rings and spokes, shape geometry from zero to data-max, a joined gap and a clamped value, series colors and the dashed class, points and area, labels on their spokes, the legend, separate instances from line charts, the sparkline size and focus, destroy restoring the table, nearest-spoke pointer and keyboard tooltip movement, the cursor spoke and RTL. No spoken-output assertion.

## [Radial chart](../../components/radial-chart.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the data available as text, name the chart, keep rings distinguishable and their values readable, and let a keyboard reach every ring the pointer can.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework draws the rings, tracks, legend, total and tooltip from the page's table with the line chart's runtime; the page owns the data, its formatting, the maximum, the total and the caption. A running task's progress stays a progress indicator.

Verification gap: Drawing, the hidden table, ring geometry and colors, tracks, the legend, the <tfoot> total, the gauge's half circles, values past the maximum and missing values, thinning crowded rings, RTL, the tooltip, pointer distance hit testing, keyboard movement and destroy are checked in a browser; screen reader output, forced colors and enlarged text remain unverified. Next check: Read a chart with a screen reader in each engine and confirm the table and the live tooltip are announced; check forced colors and enlarged text.

Feature gap: There are no labels on the rings, no gradient or segmented fills, and rings past four reuse the colors. Next check: Add ring-start labels if charts need names on the rings; keep to four rings and use the legend meanwhile.

Mapped browser scope: Hidden table in the accessibility tree, the named plot, the square plot, ring geometry, colors and dash shares, tracks, legend cells, separate instances from line charts, the gauge box and total, thinner crowded rings, the sparkline size and focus, destroy restoring the table, pointer distance and keyboard tooltip movement, the active ring and RTL. No spoken-output assertion.

## [Mixed chart](../../components/mixed-chart.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the data available as text, name the chart, keep series distinguishable without color alone, state each scale's units, and let a keyboard reach every row the pointer can.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework draws the columns, lines, areas, labels, legend and tooltip from the page's table with the line chart's runtime; the page owns the data, its formatting, which series use the second scale, the ranges and the caption.

Verification gap: Drawing, the hidden table, both scales, gaps, the legend, the tooltip, cursor points and keyboard movement are checked in a browser; screen reader output, forced colors and enlarged text remain unverified. Next check: Read a chart with a screen reader in each engine and confirm the table and the live tooltip are announced; check forced colors and enlarged text.

Feature gap: There are no y axis labels for either scale, no always-on line markers, no stacked columns and no straight-line option. Next check: Add y axis labels to the shared chart parts if charts need them; name the units in the caption meanwhile.

Mapped browser scope: Hidden table, the named plot, column positions on the start scale with an empty slot for a gap, area and dashed line classes and colors, a fixed and a fitted end scale, legend order, separate instances from column charts, a chart of gaps showing its table, and the tooltip and cursor points from the keyboard. No spoken-output assertion.

## [Scatter chart](../../components/scatter-chart.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the data available as text, name the chart, keep series distinguishable, state each scale's units, and let a keyboard reach every point the pointer can.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework draws the points, both axes, the legend and the tooltip from the page's table with the line chart's runtime; the page owns the data, its formatting, the ranges and the caption.

Verification gap: Point placement, gaps, both axes, the tooltip, keyboard steps, the pointer, update() motion, data-watch and the toggle legend are checked in a browser; screen reader output, forced colors and enlarged text remain unverified. Next check: Read a chart with a screen reader in each engine and confirm the table and the live tooltip are announced; check forced colors and enlarged text.

Feature gap: There are no bubble sizes, trend lines or separate x columns per series. Next check: Bubble sizes from a third value column are roadmap phase 35.

Mapped browser scope: Hidden table, the named plot and its role description, the x column read as the axis, one point per row per series at its value in left-to-right and right-to-left pages, gaps, both axes with fixed and fitted ends, keyboard steps in table order, the nearest point by pointer, update() motion, data-watch and the toggle legend. No spoken-output assertion.

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

## [Aura](../../components/aura.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the light decorative and out of the accessibility tree, state the element's importance in text, and stop motion when reduced motion is requested.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework draws the ring and its light; the page says in text why the element matters.

Verification gap: The ring geometry, the turning angle, its reverse in RTL, its stop under reduced motion and the absence of the ring from the accessibility tree are checked in a browser; forced colors and spoken output remain unverified. Next check: Check the Highlight ring in Windows forced colors and confirm with a screen reader that only the wrapped element is announced.

Mapped browser scope: Ring padding and corners around a button and a card, a running registered angle, its reverse in RTL, the glow halo, the stop under reduced motion, a stepped turn and a 0deg resting ring in a shadow-only load, and no aura nodes in the accessibility tree. No spoken-output assertion.

## [Questionnaire](../../components/questionnaire.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Name each question with a legend, show one error per question next to it and move focus to the control to fix, keep hidden questions out of the tab order, let optional questions be skipped and keep the form usable without JavaScript.

Framework comparison: No dedicated Google component exists in the reviewed inventory. Native fieldsets, controls and constraint validation carry the semantics and the answers; the framework shows one question at a time, adds the progress row, Skip and the error state, and moves focus.

Verification gap: Showing one question, required radios, data-required checkboxes that ignore disabled ones, generated and authored errors, aria-invalid and aria-describedby, Enter, Skip clearing an answer, Back focus, a disabled question left out, submit and requestSubmit() opening the first unanswered question, FormData and destroy are checked in a browser; screen reader output, forced colors and enlarged text remain unverified. Next check: Answer a questionnaire with a screen reader in each engine and confirm the question, its description, errors and the progress are announced; check forced colors and enlarged text.

Mapped browser scope: One question shown, the buttons that apply, the progress text and named progressbar, aria-describedby with the description and error, required radio and data-required checkbox errors with focus and aria-invalid, errors clearing on answer, a generated requiredMessage error, a question enabled mid-way, Enter moving on instead of submitting, Back focus, Skip clearing an answer and firing change, submit opening the first unanswered question, FormData without a disabled question and destroy restoring the plain form; a checked disabled checkbox not answering a data-required group, and requestSubmit() opening an unanswered group or a hidden required field. No spoken-output assertion.

## [Marquee](../../components/marquee.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Hide the copy from assistive technology, keep each link reachable once, pause on hover and focus, offer a pause control for long-running motion and stop it when reduced motion is requested.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The page writes the items and their copy; the framework lays out the two groups, runs the loop, pauses it and stops it under reduced motion.

Verification gap: The group placement, the half-cycle position, the right-to-left and vertical directions, reverse, pausing on hover, focus and .paused, the hidden copy in the accessibility tree and the reduced-motion stop are checked in a browser; spoken output and long-running smoothness remain unverified. Next check: Listen to a marquee with a screen reader in each engine and confirm each item is read once; watch a long strip for a visible jump at the loop point.

Mapped browser scope: A short group filling the strip, the copy one gap after it, the half-cycle position horizontally, in RTL and vertically, reverse, pausing on hover, focus and .paused, one link per item in the accessibility tree and the reduced-motion stop with the copy hidden. No spoken-output assertion.

## [Rich text editor](../../components/rich-text-editor.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Name the editable area, expose formatting state on toggle buttons, keep the toolbar reachable by keyboard and submit the content with its form.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The page supplies Tiptap's Editor class and extensions. The framework mounts the editor from a textarea, names the editable textbox, keeps the textarea in sync and sets the toolbar buttons' pressed and disabled state; the toolbar is the docked M3 toolbar.

Verification gap: Formatting a selection, pressed and disabled toolbar state, textarea sync with input events, label naming and focus, a disabled textarea and destroy are checked in a browser; spoken output, IME composition, paste from other applications and touch selection remain unverified. Next check: Use the editor with a screen reader and an IME in each engine, paste from a word processor, and select text on touch devices.

Mapped browser scope: Hidden textarea, textbox role and name from the label, starting HTML, label click focus, bold and heading commands with aria-pressed and .active, undo disabled state, textarea value and input event, empty value, and destroy. No spoken-output assertion.

## [Confetti](../../components/confetti.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the effect decorative and out of the accessibility tree, never block input, state the outcome in text and draw nothing when reduced motion is requested.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The page marks the trigger or canvas and states the outcome in text; the framework draws the burst in theme colors, keeps its canvas out of the accessibility tree and the pointer's way, and skips it under reduced motion.

Verification gap: The burst origin on a button and on a canvas, theme colors, manualStart, the page canvas in the top layer above a modal dialog with pointer events off and aria-hidden, its removal when the burst ends, destroy and the reduced-motion skip are checked in a browser; frame rate on low-end devices and forced colors remain unverified. Next check: Watch a burst on a low-end phone and in forced colors, and confirm a screen reader announces nothing for it.

Mapped browser scope: A canvas bursting at its center on init, manualStart waiting for fire(), a button bursting from its center in the theme primary color, the page canvas covering the viewport in the top layer with aria-hidden and no pointer events, fire() resolving after it is removed, a burst over an open modal dialog, destroy and the reduced-motion skip. No spoken-output assertion.

## [Particles](../../components/particles.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the effect decorative and out of the accessibility tree, never block input, keep text over it readable and stop motion when reduced motion is requested.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The page places the canvas behind its content and keeps that content readable; the framework draws the dots in the theme color, keeps the canvas out of the accessibility tree and the pointer's way, and holds the dots still under reduced motion.

Verification gap: The canvas covering its box, the on-surface default and the color option, following the pointer only while it is over the canvas, drift, refitting on resize, destroy and the still drawing under reduced motion are checked in a browser; frame rate on low-end devices, forced colors and contrast of text over the dots remain unverified. Next check: Watch a full-width hero of particles on a low-end phone and in forced colors, and check text contrast over the densest area.

Mapped browser scope: The canvas covering its positioned ancestor, a dot fading in where it was placed in the theme on-surface color, following the pointer inside the canvas and holding when it leaves, destroy clearing the canvas, vx drift, the color option, the pixel buffer after a resize and still dots under reduced motion. No spoken-output assertion.

## [Map](../../components/map.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Name the map region, make interactive markers named buttons, return focus when a popup closes, keep tile attribution visible and give the same information in text.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The page supplies MapLibre, names the region and writes markers, popups and controls as HTML; the framework places them, manages popup state and focus, colors data layers from the theme and follows the light or dark scheme.

Verification gap: Marker placement, the popup opened from its marker with aria-expanded, Escape and map-click closing with focus back on the marker, zoom limits, the compass bearing, theme-colored routes, arcs and clusters redrawn after a theme swap, removeOverlay and destroy are checked in a browser; the locate and full screen controls, marker dragging, spoken output, touch gestures and forced colors remain unverified. Next check: Use the map with a screen reader and on a touch device, try locate and full screen with real permissions, drag a marker with the keyboard, and check forced colors.

Mapped browser scope: Markers placed with the default dot, the popup without a marker open at init, a marker button opening its popup with aria-expanded, Escape and a map click closing it with focus back on the marker, zoom out disabled at the minimum zoom, zoom in, the compass bearing and reset, route, arcs and clusters in the theme primary color, no count layer without glyphs, all redrawn in the dark primary after a theme change, removeOverlay, destroy restoring the markup and controls, a location arriving after destroy being ignored, and a marker in a shadow root opening its popup. No spoken-output assertion.

## [Keypad and Keyboard](../../components/keypad.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Name the group and every icon key, keep keys from submitting the form, keep the field labelled and usable from a hardware keyboard, and keep keys at a usable target size.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The page writes the keys and labels the field; the framework sizes the keys, presses them with the button-group shape morph, types into the field named by aria-controls with a real input event, and submits through requestSubmit() so validation still runs.

Verification gap: Typing at the caret, maxlength, pattern validation on Enter, Backspace including emoji, Enter submitting a form and adding a new line in a textarea, a one-shot Shift with capitals shown, number inputs, disabled fieldsets, in-field keys, shadow roots, focus staying in the field, the keypad grid and wide keys, keyboard key widths and the number row, the pressed shape and destroy are checked in a browser; screen reader output, forced colors, enlarged text and touch devices remain unverified. Next check: Type a PIN and a message with a screen reader and on a touch device in each engine, and check forced colors and enlarged text.

Mapped browser scope: Digits typed at the caret, maxlength, focus kept in the field on a pointer press, Backspace including emoji, Enter submitting once, a pattern mismatch blocking Enter, onKey values, composed input events from a shadow root, number, decimal and signed input, a disabled fieldset and its legend, a trailing Backspace in the field that runs once for two keypads, for a field inside its keyboard and for a field rendered after init, a password toggle that is not a key, a prefilled untouched field typed at the end, a caret placed at the start kept for keys activated from the keyboard, Shift showing capitals and releasing after one character, space and a textarea new line, three 72px round keypad columns, a two-cell wide key, a tenth-of-row letter key, the half-key indent, a one-and-a-half-key Shift, the space bar filling its row, a 40px number row that types and that hidden drops, the pressed corner, destroy, and the shared listeners leaving with the last keypad. No spoken-output assertion.

## [Mega menu](../../components/mega-menu.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep the top items as links and disclosure buttons in a named nav, expose the expanded state, keep the panel next in the focus order, close on Escape and do not claim menu roles.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework lays out the bar and panel; the browser owns the disclosure.

Verification gap: Panel placement, the expanded state, Escape, focus order into the panel, the turning chevron and stacking on a phone are checked in a browser; screen reader output remains unverified. Next check: Open and close each panel with a screen reader in each engine and confirm the expanded state is announced.

Mapped browser scope: Popover opening from its button, the panel below the bar spanning the window, side-by-side groups, the turning chevron, Tab into the panel, Escape, closed links out of reach and stacked groups on a phone. No spoken-output assertion.

## [Menubar](../../components/menubar.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Name the menubar, give it one tab stop, move between items with Left and Right, open a menu with Down, Enter or Space, move between open menus with Left and Right, and close with Escape back to the bar.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework implements the menubar keyboard contract over its Menu component.

Verification gap: Roles, the roving tab stop, arrow, Home and End movement, opening, moving between open menus, flyout rows, Escape and RTL are checked in a browser; screen reader output remains unverified. Next check: Operate the menubar with a screen reader in each engine and confirm menu and item announcements; check typeahead across the bar.

Mapped browser scope: Menubar and menuitem roles, one tab stop that follows focus, Left, Right, Home and End with wrapping, Down opening on the first item, Right and Left between open menus, flyout rows keeping Right, Escape back to the bar and RTL. No spoken-output assertion.

## [Calendar](../../components/calendar.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Name the month in a caption, keep weekday column headers, mark today in text as well as color, and keep each event a reachable link or text.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework draws the month grid; the page owns dates and navigation.

Verification gap: Equal columns, today, outside days, ellipsized event chips, column headers and the phone width are checked in a browser; screen reader output remains unverified. Next check: Read a month with a screen reader in each engine and confirm the day and weekday are announced with each event.

Mapped browser scope: Seven equal columns, day height, the today mark, muted outside days, event chips that stay inside their day and ellipsize, event links, column headers and the month at phone width. No spoken-output assertion.

## [Tour](../../components/tour.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Let the user start, skip and end the tour, name the card by the step heading, move focus to it and back afterwards, and skip steps whose target is not shown.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The framework steps through authored content; the page decides when to offer the tour.

Verification gap: Placement beside each target, the card name, progress, button visibility, skipped targets, Escape, focus return and cleanup after a scripted close are checked in a browser; screen reader output remains unverified. Next check: Take a tour with a screen reader in each engine and confirm each step is announced when it opens.

Mapped browser scope: Opening from a start button, the card named by the step heading, progress text, skipped missing targets, button visibility per step, placement below each target, releasing the previous target, Escape, focus return and cleanup after hidePopover. No spoken-output assertion.

## [Image compare](../../components/image-compare.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Give both images alt text that says which is which, name the range, and keep it operable by keyboard and pointer.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The browser owns the control; the framework draws the reveal.

Verification gap: The initial position, the reveal by arrow keys, the focus ring, RTL, the named slider and Slider staying off are checked in a browser; screen reader output remains unverified. Next check: Move the divider with a screen reader in each engine and confirm the value is announced.

Mapped browser scope: The initial value applied on load, each image on its side of the divider, arrow keys moving the divider, the handle focus ring, RTL, named native sliders and Slider leaving the range alone. No spoken-output assertion.

## [Organization chart](../../components/org-chart.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Carry the hierarchy in nested lists, expose each manager's expanded state, keep every manager reachable by keyboard, keep the drawn lines silent and avoid a tree role without its arrow-key contract.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The page writes nested lists of disclosures and cards; the framework lays the cards out under their managers, draws the connecting lines and scrolls a wide chart.

Verification gap: Cards side by side under their manager in LTR and RTL, the connector bar and drops, a wide chart scrolling with its start reachable, Enter folding a team away, the caret under reduced motion, the caret in forced colors in Chromium and the nested lists in the accessibility tree are checked in a browser; spoken output, the rest of forced colors and enlarged text remain unverified. Next check: Read a chart with a screen reader in each engine and confirm each list's level and size and each manager's expanded state are announced; check forced colors and 200% text.

Mapped browser scope: Reports side by side below their manager in order, the manager over its reports, the bar stopping at the end reports, the drop from the manager, mirrored order and bar in RTL, a narrow chart scrolling with every card's start reachable, Enter folding a team, the caret under reduced motion, the CanvasText caret in forced colors and nested lists in the accessibility tree. No spoken-output assertion.

## [Color swatches](../../components/color-swatches.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep a native radio group with a legend and a name for every swatch, mark the choice by shape as well as color, show focus and keep the swatch colors under forced colors.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The page writes a fieldset of named radios and sets each swatch's color; the framework draws the chips, the checked ring and the focus ring.

Verification gap: Swatch color, size and shape, the checked ring, the group name, arrow keys, the form value, the focus ring after arrow keys and the swatch color under forced colors are checked in Chromium; other engines, spoken output and enlarged text remain unverified. Next check: Choose a swatch with a keyboard and a screen reader in Firefox and Safari, and confirm each color name and the checked state are announced; check 200% text.

Mapped browser scope: Swatch color, 40px round shape and checked ring, the named group, arrow keys moving the choice, the form value, the focus ring after arrow keys and the swatch color under forced colors. No spoken-output assertion.

## [Color picker](../../components/color-picker.md)

Relationship: none. No dedicated entry in the reviewed [Google component inventory](https://m3.material.io/components). Requirements below are web accessibility guidance, not a Google component specification.

Reviewed sections: No standalone Material component.

Requirements: Keep a native color input as the value, name the group and each control, make every axis reachable by keyboard with its value announced, keep the colors under forced colors and keep Enter in the hex field from submitting the form.

Framework comparison: No dedicated Google component exists in the reviewed inventory. The page writes a named group around a native color input; the framework adds the area slider, the hue range and the hex field, and keeps the native input in sync.

Verification gap: Arrow keys, Shift steps, pointer press and drag with clamping, the unmirrored area in RTL, the hue range, the hex field with Enter and invalid values, the value property, native input changes, the form value and destroy are checked in Chromium, Firefox and WebKit; spoken output, forced colors and touch remain unverified. Next check: Pick a color with a screen reader and with touch in each engine, and confirm the area valuetext and the hex field are announced; check forced colors and 200% text.

Mapped browser scope: Group and control names, Down and Shift+Left steps with valuetext, input, change and onChange order, a press and a drag past the corner in an RTL page, hue changes keeping saturation and brightness, hex Enter without form submission, an invalid hex reverting, the silent value setter, a native input event updating the hue, one submitted field and destroy leaving only the native input. No spoken-output assertion.
