# Accessibility manual review handoff

Status: pending. Browser automation does not establish manual accessibility or
Material parity. Complete this review before making those claims. This checklist
does not authorize publication.

Side-sheet implementation checks on 2026-09-17 passed 32 sheet regressions across
Chromium, Firefox and WebKit, 60 mapped capability checks, contributor verification
with 949 passing tests and 82 skips, and MCP/package checks. The focused visual
comparison captured 12 intentional differences: eight open-sheet views for
wrapping, RTL corners and header spacing, plus four documentation views for the
added guidance and example. Visual approval remains pending. These automated
results do not complete any manual-review row below.

Run `npm run docs:dev` and open the pages below at `http://localhost:4321`.
Record the tested Git revision and viewport with each result. Use the page's
native controls, not synthetic events. For RTL, set `dir="rtl"` on the tested
component or a containing element in browser developer tools. Repeat with reduced
motion enabled in the operating system.

## Reproducible component checks

| Fixture | Procedure and expected result |
| --- | --- |
| `/menu.html`, `/select.html`, `/autocomplete.html` | Open, select, dismiss, immediately Tab and Shift+Tab. Focus must not return to closing content. Use nested menus in LTR/RTL, Escape from the innermost submenu, and typeahead. Selection fires once. |
| `/chips.html` | Delete first, middle, last and only chips with pointer, close-button Enter/Space, Backspace/Delete. Close buttons return focus to the input; keyboard deletion selects the previous survivor, then first survivor, then input. Check separate action/delete targets and wrapped labels. |
| `/slider.html` | Use keyboard and track clicks on horizontal LTR/RTL, vertical and paired sliders. Verify labels follow handles, values stay ordered, both inputs are reachable and synchronized numeric examples update. Test minimum, maximum and noncentral values after resizing. |
| `/carousel.html` | Use arrows, Home/End, indicators and previous/next controls in horizontal LTR/RTL and vertical examples. Focused items must be visible. Edit embedded inputs without navigation. Start autoplay, pause it, move focus inside, hover, background the tab and change reduced motion. Explicit pause must persist. |
| `/side-sheet.html` | Use “Show RTL long content” and “Show standard RTL content”. Scroll to the last link and activate header close and footer actions. Repeat with `.start` removed and direction changed to LTR, at compact and wide widths. Drag the header/inner edge outward, inward and less than 96px; interrupt with cancellation or closing. No horizontal overflow or stranded drag offset. |
| `/bottom-sheet.html` | Repeat short/outward/cancelled drags after the shared drag changes. Body scrolling must not dismiss. Activate the handle button with keyboard and pointer. |
| `/tabs.html` | Tab through ordinary and overflowing links, activate with Enter, and swipe the swipeable example in LTR/RTL. The selected link must announce the current section and match the visible panel. Selection must not move focus into the panel. Repeat with reduced motion, native zoom, and translated labels. Manual results remain pending. |

## Review record

Panes: at `/panes.html#list-detail`, change `#pane-column` to 839px, 840px,
1199px and 1200px in developer tools while keeping the viewport wide. Select a
list item and return with Back at compact widths. Repeat in RTL, with translated
labels and native 200%/400% zoom. Check independent body scrolling, reading order
and reachable header/footer actions. The application owns the active pane;
supporting content is not automatically stacked. Record actual device and
assistive-technology results below; they remain pending.

App bar/search: at `/navbar.html#search-docs`, focus the search field, enter a
query, close with Escape or Close search, and click the still-focused field to
reopen. Leave and refocus it, too. Dismissal must stay closed and query text must
remain. Repeat in RTL and reduced motion. Test the medium/large bars with long
translated titles and native zoom; keyboard actions must remain reachable during
collapse. Screen-reader announcements, physical mobile keyboards and actual
contrast themes remain pending in the records below.

For every row, enter reviewer, date, physical device, operating system,
browser/assistive-technology version, result and evidence. Keep unavailable checks
pending. Link recordings, screenshots or detailed notes, including failures.

| Check | Reviewer | Date | Device / OS | Browser / AT version | Result | Evidence / revision |
| --- | --- | --- | --- | --- | --- | --- |
| Native browser zoom 200%, all fixtures | Pending | Pending | Pending | Pending | Pending | Pending |
| Native browser zoom 400%, all fixtures | Pending | Pending | Pending | Pending | Pending | Pending |
| NVDA with Firefox or Chrome: names, roles, states, focus recovery | Pending | Pending | Pending | Pending | Pending | Pending |
| VoiceOver with Safari: names, states, reading and focus order | Pending | Pending | Pending | Pending | Pending | Pending |
| Actual Windows contrast themes: tracks, handles, selected states, focus | Pending | Pending | Pending | Pending | Pending | Pending |
| Physical iOS Safari: portrait/landscape, touch, onscreen keyboard | Pending | Pending | Pending | Pending | Pending | Pending |
| Physical Android Chrome: portrait/landscape, touch, onscreen keyboard | Pending | Pending | Pending | Pending | Pending | Pending |
| Translated wrapping and font coverage, LTR/RTL | Pending | Pending | Pending | Pending | Pending | Pending |
| Reduced motion while mounted and explicit pause recovery | Pending | Pending | Pending | Pending | Pending | Pending |

For a failure, record exact reproduction steps and whether it prevents completing
the task. Do not substitute viewport emulation for native zoom, emulated contrast
for Windows themes, or synthetic pointer events for physical touch testing.
