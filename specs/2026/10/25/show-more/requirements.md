# Show-more text collapse

Date: 2026-10-25
Roadmap phase: Phase 42, show-more text collapse
Branch: `feature/2026-10-25-show-more`
Base: `origin/master` at `a9bbf77ad9edd0f44ce584e71f07a485fe6f2933` (#425)
Status: implemented and locally verified 2026-10-25; not pushed

Follow the [mission's agreed scope for components and behaviors](../../../../mission.md#agreed-scope), its [product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 42](../../../../roadmap.md#phase-42-show-more-text-collapse). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user picked Phase 42. Phases 42 to 51 are being specified in parallel threads, so this spec covers Phase 42 only and does not choose the earliest unfinished phase. Its one dependency, Phase 25 (line clamp utilities), is marked completed on 2026-10-23. This spec leaves the roadmap's completion state unchanged.

## Current behavior

These facts come from the base commit.

- `src/sass/utilities/_helpers.scss` has `.line-clamp-1`, `.line-clamp-2`, `.line-clamp-3` and `.line-clamp-none`, with `medium:`, `expanded:`, `large:` and `extra-large:` prefixes. Each count sets `display: -webkit-box`, `-webkit-box-orient: vertical`, `-webkit-line-clamp`, `line-clamp` and `overflow: hidden`.
- Utilities sit in the `utilities` layer after `components`, so a component rule cannot override a clamp class without `!important`. An inline style beats both layers.
- No component or behavior expands clamped text. A page that wants a "Show more" button writes its own script to remove the clamp, set `aria-expanded` and decide whether the button is needed.
- `ExpandingCard` (`src/ts/components/expandingCard.ts`) is the nearest pattern. It records the trigger's `aria-expanded`, `aria-controls`, `tabindex` and `role` before init, sets them, and restores them in `destroy()`. It reports changes through `onOpen` and `onClose` callbacks.
- `Utils.emit(el, type)` fires a bubbling, composed `expressive:<type>` event. Snackbar and Tour already emit `open`.
- The accordion animates its height with `interpolate-size` and `::details-content` where an engine supports them. Nothing else in the framework animates text height.
- Six components already use `ResizeObserver`, among them Tabs, Slider and Carousel.

## Scope

### Requirements

- R1. A `.show-more` element, started by AutoInit, holds a text element with a `line-clamp-1`, `line-clamp-2` or `line-clamp-3` class and an author-written `<button>`. The component gives the button `aria-expanded="false"` and an `aria-controls` that names the text element, adding an id to the text element when it has none.
- R2. Activating the button, by click or by Enter or Space as any `<button>` allows, removes the clamp so the full text shows and sets `aria-expanded="true"`. Activating it again restores the clamp and sets `aria-expanded="false"`. This is the roadmap's completion check.
- R3. While the text is expanded, the button reads "Show less". The author's own button text is the collapsed label. `i18n.showLess` sets the expanded label for the component, and `data-show-less` on the button sets it for one control, the way Copy's `data-copy-message` does. Collapsing puts the author's text back.
- R4. When the clamped text already fits in its lines, the button gets the `hidden` attribute, so it is neither seen nor reached by Tab or a screen reader. The component checks again when the text element's size changes, so narrowing the container until the text is cut shows the button, and widening it until the text fits hides the button again. A window-size prefix such as `line-clamp-3 expanded:line-clamp-none` therefore hides the button on wide windows.
- R5. Expanding and collapsing fire `expressive:open` and `expressive:close` from the `.show-more` element and call the `onOpen` and `onClose` options.
- R6. `destroy()` restores the button's `aria-expanded`, `aria-controls`, `hidden` and label, removes any id the component added, puts the clamp back, and disconnects the size observer.
- R7. `semantics.json` has a `show-more` row. Its rules require the control to be a `<button type="button">` and the text element to carry a `line-clamp-1`, `-2` or `-3` class. The static check does not start components.
- R8. A docs page, a "Show more" section in `llm.md`, both AutoInit registry tables in `llm.md`, `docs/src/pages/auto-init.astro` and the events tables document the markup, the options, the events and the limits under "Technical constraints". The changelog has an Added entry, and the component has a component-decisions entry and a hand-written `web-extensions-review.md` entry.
- R9. The JavaScript bundle's new gzip size, and the CSS bundle's if the component adds Sass, are recorded in reviewed budget lines in `tests/selective-builds.test.js`. The generated skill and MCP copies are current.

### Exclusions

- Height animation. The user chose no transition, so the text opens and closes at once in every engine, and there is no reduced-motion case to handle.
- Line counts other than 1 to 3. The component uses the Phase 25 classes as they are and adds no `--show-more-lines` property.
- Find-in-page inside clamped text. `hidden="until-found"` only works on content hidden with `content-visibility`, and clamped lines are clipped by `overflow: hidden`, so the browser's find bar does not expand them. The docs say so.
- A generated button. The author writes the `<button>` and its label, because static semantics belong to the author's markup.
- Clamping by height or by a character count.

## Decisions

### Confirmed in the interview on 2026-10-25

- Build an AutoInit component. Hiding the button when the text fits needs a measurement, so CSS alone cannot meet the roadmap's outcome.
- Swap the label to "Show less" while expanded, so sighted users see the state that `aria-expanded` gives screen readers.
- No height animation.
- Split the work into four groups, starting with a probe of how each engine measures clamped text, the way Phase 40 probed `content-visibility` before writing CSS.
- The fits and resize browser test is a merge gate in all three engines. It also clicks the button and checks that the text grows and `aria-expanded` flips, so the roadmap's completion check stays a gate inside that test. The jsdom and semantics tests are merge gates too.
- The user did not pick the budget, generated-file and CI option as a separate gate. `tests/selective-builds.test.js` and `npm run check:generated` run in the required CI checks, so they still have to pass before merge.

### Proposals for implementation

These follow from the code and can change during implementation if the code or the probe disagrees.

- Measure overflow while clamped as `scrollHeight - clientHeight > 1`. The 1px allowance absorbs Firefox's rounding at fractional line heights, found in the probe below; a cut line is always far more than 1px.
- Unclamp with an inline `-webkit-line-clamp: unset` and `line-clamp: unset` on the text element, because the utilities layer beats any component rule and a prefixed class such as `medium:line-clamp-2` would beat an added `.line-clamp-none`. Collapse removes the inline properties.
- While expanded, the button stays visible even if the text would now fit clamped, because collapsing is how the person gets back. The fit check runs only while the text is clamped.
- Swap only the button's last non-empty text node, so a leading icon element survives the label change.
- Default `i18n.showLess` is `'Show less'`. The roadmap names no default for the collapsed label, since the author writes it.
- Find the parts with `:scope > :is(.line-clamp-1, .line-clamp-2, .line-clamp-3)` and `:scope > button`. The selector for AutoInit is `.show-more`. Group 2 narrowed the text selector from `[class*="line-clamp-"]`, which also matched `line-clamp-none` and prefixed classes, to the classes the semantics rule names.
- The semantics rule also requires `type="button"`, added in group 2, because a `<button>` without it submits the form it sits in.
- `open()` and `close()` are public methods, as on ExpandingCard, since the click handler needs them anyway. Added in group 2.
- `src/sass/components/_show-more.scss` holds one rule, `.show-more > button[hidden] { display: none; }`. Group 3 found that every `<button>` gets `display: inline-flex` from the button mixin, which beats the browser's `[hidden]` rule, so a hidden button stayed visible and focusable. Tour keeps the same rule for its hidden buttons. With a partial, the `show-more` semantics row left the `additional` list.

- The label is the button's last text node outside an `aria-hidden="true"` element, so an icon before or after the label keeps its ligature text.
- A focused button stays visible even when the text fits, and the fit check runs again on blur. Without that, collapsing text after the container widened hid the button the person had just pressed, and focus fell back to the page. Found and fixed in group 3; V2 covers it.

### Confirmed after the codex review on 2026-10-25

- Keep the branch pin and re-pin `sourceRevision` to the squash merge commit right after merging. The capability check requires every component to list a source file that exists at `sourceRevision`, and `sourceRevision` to be an ancestor of HEAD. `showMore.ts` is on no `master` commit, and the squash merge rewrites branch commits, so no pin passes before and after the merge. The branch pins its group 3 commit `19375f1c6`, as pull-to-refresh, swipe actions, input mask and currency input did. `master` fails the roadmap source-link test until the re-pin lands. Codex flagged this twice. The user chose the follow-up re-pin over a merge commit for this PR or a change to the validation.

### Open decisions

None.

## Technical constraints

- `ResizeObserver` on the text element catches width changes. A web font that swaps in after init can change whether the text is cut without changing the clamped box, whose height stays at N lines, so the observer does not fire. The component also checks again once `document.fonts.ready` settles. A font whose load starts after `ready` has already settled is not caught; a later resize or toggle corrects the button.

### Probe results on 2026-10-25

Plan group 1 ran in Playwright's Chromium, Firefox and WebKit against the base build, with `.line-clamp-2` paragraphs in a 320px container at a 700px window width.

- A five-line paragraph reported `scrollHeight` well above `clientHeight` in every engine (126/36 in Chromium, 184/46 in Firefox, 176/44 in WebKit at `line-height: normal`; 149/42 in all three at `15.5px` with `line-height: 1.37`). A one-line paragraph reported equal values at `line-height: normal`.
- Two words at `15.5px` with `line-height: 1.37`, a 21.23px box, gave `scrollHeight` 22 and `clientHeight` 21 in Firefox, so a plain `>` comparison reports fitting text as cut there. Chromium and WebKit gave 21 and 21.
- A `ResizeObserver` on the paragraph fired when the container widened to 1200px and again when it narrowed to 320px, in all three engines. After widening, the comparison reported the text as fitting; after narrowing, as cut.
- Inline `-webkit-line-clamp: unset` and `line-clamp: unset` on a paragraph with `line-clamp-2 medium:line-clamp-2` showed the full text at the medium width in all three engines (48px to 168px in Chromium, 48px to 192px in Firefox and WebKit), and removing them restored 48px.
- With a 24px line height and a web font held back by the test, an 80-character paragraph was cut in the monospace fallback (72/48) and fit once the font loaded (48/48), in all three engines. The clamped box stayed 48px, and the `ResizeObserver` did not fire. `document.fonts.ready` was pending while the font loaded and resolved after it, in all three engines. The `loadingdone` event fired in Chromium and Firefox but not in WebKit, so the component uses `ready`.
- A clamp class sets `display`, so the text element cannot also be the flex or grid container. The Phase 25 docs already say to put the clamp on a child.
- New functions stay below cyclomatic complexity 5 for the fallow gate.
- A registered component needs its `semantics.json` row, `tests/fixtures.js` entry and `AUTO_INIT_FIXTURES.length` count in the first group that registers it, or the semantics roster and AutoInit tests fail.
- jsdom has no layout, so jsdom tests cover attributes, labels, events and `destroy()`. Anything about measured height or the fit check runs in the browser test.

## Dependencies

Phase 25, line clamp utilities, completed 2026-10-23. No later phase depends on this one.
