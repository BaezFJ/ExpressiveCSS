# Transfer list

Date: 2026-10-25
Roadmap phase: Phase 46, transfer list
Branch: `feature/2026-10-25-transfer-list`
Base: `origin/master` at `a9bbf77ad`, fetched 2026-10-25
Status: specified 2026-10-25; group 1 implemented 2026-10-25

Follow the [mission's agreed scope for components](../../../../mission.md#agreed-scope) and its [product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 46](../../../../roadmap.md#phase-46-transfer-list). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user picked Phase 46. Phases 42 to 51 are being specified in parallel threads, so this spec covers Phase 46 only and skips the usual pick of the earliest unfinished phase. The roadmap lists no dependencies for it. No other branch or spec directory holds work on a transfer list.

## Current behavior

These facts come from the base commit.

- Nothing in `src/ts/` or `llm.md` moves options between two lists. A page that wants the pattern writes its own script.
- A `.list` row can be a `<label>` around a leading `<input>`, and `src/sass/components/_list.scss` paints a row that `:has(:checked)` with the selected pill. Checkbox rows therefore look selected without new styles.
- `src/ts/behaviors/lists.ts` adds Up, Down, Home and End only to rows that are a single link or button. Label rows keep native Tab and Space.
- `src/ts/behaviors/sortable.ts` is a document-delegated behavior with no instance. It moves rows on `[data-move]` button clicks, keeps focus on the moved row, and announces the new position through a polite live region it creates beside the list, with its text in `Sortable.i18n.moved`.
- `src/ts/behaviors/dataTables.ts` shows that a behavior can report changes through a bubbling `expressive:*` event (`expressive:change`, `expressive:resize`).
- `src/ts/components/currencyInput.ts` writes its form entry in a capture `formdata` listener and handles `reset` the same way. `formdata` and `reset` are not composed, so a document listener never sees them for a form inside a shadow root.
- Behaviors start in `src/ts/index.ts` (`Sortable.Init()`, `Lists.Init()`) and are exported from `src/ts/modular.ts`.

## Scope

A `.transfer-list` holds an available list and a chosen list of checkbox rows, with buttons between them. People check rows and press a button to move them, and the form submits the values of the rows in the chosen list.

### Expected behavior

- R1. The markup is a `.transfer-list` container with a `data-name` attribute. It holds a `.list.transfer-available`, a `.transfer-actions` group and a `.list.transfer-chosen`, in that order. Each list has an accessible name through `aria-label` or `aria-labelledby`. Each row is `<li><label><input type="checkbox" value="…"> Text</label></li>`, and the checkbox has no `name`. The actions group holds four `type="button"` buttons with `data-transfer="add"`, `"add-all"`, `"remove"` and `"remove-all"`.
- R2. Pressing `add`, by click, Enter or Space, moves every checked row of the available list whose checkbox is not disabled to the end of the chosen list. Rows that move together keep the order they had in the available list. Moved rows arrive unchecked.
- R3. Pressing `remove` moves every checked, enabled row of the chosen list back to the available list. Each row returns to its original slot: the position it had in the order recorded at the container's first move (R10). A row the page added after that record goes to the end of the available list. Moved rows arrive unchecked.
- R4. `add-all` and `remove-all` move every row of the source list whose checkbox is not disabled, checked or not, with the same ordering as `add` and `remove`. Rows with a disabled checkbox stay where they are.
- R5. When a form holding a `.transfer-list` builds its form data, the behavior appends one entry per row of the chosen list, in the chosen list's order, under the container's `data-name`, with the row's checkbox `value` as the entry value. Rows that start in the chosen list submit too, and so does a chosen row whose own checkbox is disabled, because that only keeps it in place. A container without `data-name`, or with an empty one, adds nothing. A container inside a `<fieldset disabled>`, outside its first legend, adds nothing, as the fieldset's own fields do. A row is a checkbox in the row's own `<label>`, so a list nested inside a row keeps its boxes to itself. The disabled-fieldset, empty-name and nested cases were added after a code review on 2026-10-25. The entries appear in both `new FormData(form)` and the form data of a real submit.
- R6. A button press with nothing to move does nothing: no row moves, no event fires and nothing is announced. The behavior does not disable the buttons, so focus never lands on a disabled control.
- R7. Focus stays on the pressed button after a move.
- R8. After a move, a polite live region beside the container announces how many rows moved and where, from `TransferList.i18n.moved`, which defaults to `'Moved {count} to {list}'`. `{list}` is the destination list's `aria-label`, or the text of its `aria-labelledby` element.
- R9. After a move, the container fires a bubbling `expressive:transfer` event whose `detail` is `{ rows, from, to }`: the moved `<li>` elements in their new order, the source list and the destination list.
- R10. At a container's first move, the behavior records both lists' rows in document order, available rows first. Resetting the form, by a reset button or `form.reset()`, puts every recorded row back in its recorded list and order. The checkboxes return to their default checked state as the browser resets them. A reset before any move changes nothing.
- R11. The lists sit side by side with the actions group between them, and the layout follows the page direction: in a right-to-left page the available list is on the right. Each button's icon points toward its destination list in both directions. Below the `medium` window size the two lists stack, with the actions group between them in a row. Each list scrolls inside a maximum block size so the buttons stay in reach.
- R12. `semantics.json` gains a `transfer-list` row with four rules: a `.transfer-list` without `data-name`; a checkbox with a `name` inside a `.transfer-list`, which would submit its checked state; a `.transfer-available` or `.transfer-chosen` list with neither `aria-label` nor `aria-labelledby`; a `[data-transfer]` button without `type="button"`, which would also submit the form. The fourth rule was added after the 2026-10-25 code review. The semantics tests check the rules without starting components.
- R13. The behavior lives in `src/ts/behaviors/transferList.ts` as `TransferList`, started by `TransferList.Init()` in `src/ts/index.ts` and exported from `src/ts/modular.ts`. Its listeners are delegated from the document, so a `.transfer-list` added to the page later works without a call. A second `Init()` adds nothing.
- R14. `llm.md` gains a "Transfer list" section with the markup, the buttons, the form data, the announcement, the event and the limits in the exclusions. A docs page documents the same with a live example. The component decisions data, the changelog's Unreleased section and the hand-written web extensions review get entries, and `npm run build:skill` regenerates the derived files.
- R15. `tests/selective-builds.test.js` has reviewed JavaScript and CSS gzip budget lines for this change, and the capability `sourceRevision` pin names a commit the test accepts.

### Exclusions

- Forms inside a shadow root. A document-delegated behavior has no per-element listener to attach there, so such a form gets no entries and no reset. The docs say so.
- A `.transfer-list` associated with a form through a `form` attribute instead of sitting inside it.
- Submission without the script. The checkboxes carry no name, so a page with the script blocked submits nothing for the list.
- `required` validity, such as "choose at least one". A form-associated control would provide it; the user chose the lighter behavior.
- Reordering the chosen list, a search field over either list, double-click to move, and drag and drop between lists.
- A script method that moves rows. Pages can check boxes and call `click()` on a button.
- An ARIA listbox and its arrow-key contract. Rows stay native checkboxes, so Tab reaches each one and Space toggles it.
- Manual screen reader, forced-colors and real-device checks as merge conditions. Validation lists them as manual checks.
- Running `npm run verify`, the MCP tests and `verify:packages` locally as a merge condition. The repository's required CI checks stand in for them.

## Decisions

### Confirmed with the user on 2026-10-25

- The lists are `.list` groups of labelled checkbox rows, moved by a document-delegated behavior with no instance or AutoInit entry. The user chose this over a form-associated control, an ARIA multiselect listbox and two native `<select multiple>` elements, accepting the limits above.
- The form gets the chosen values from a `formdata` listener, as `currencyInput.ts` does, under the container's `data-name`.
- Buttons move the checked rows and all rows, both ways. The chosen list keeps the order rows were moved in, and a row moved back returns to its original slot.
- The work splits into three groups: markup, styles, `add` and the form data with the acceptance test; then the other buttons, ordering, focus, announcement, event and reset; then docs and checks.
- Merge conditions: the acceptance test in Chromium, Firefox and WebKit, the regression checks in validation, the repository's required CI checks and a review.

### Proposals open to review

The interview did not settle these. They follow the confirmed choices and the code above, and implementation may change them with a note here.

- Markup, as R1 describes:

  ```html
  <form>
    <div class="transfer-list" data-name="toppings">
      <ul class="list transfer-available" aria-label="Available toppings">
        <li><label><input type="checkbox" value="olives"> Olives</label></li>
        <li><label><input type="checkbox" value="peppers"> Peppers</label></li>
      </ul>
      <div class="transfer-actions">
        <button type="button" class="icon-button" data-transfer="add" aria-label="Add checked toppings">
          <span class="material-symbols" aria-hidden="true">chevron_right</span>
        </button>
        <button type="button" class="icon-button" data-transfer="add-all" aria-label="Add all toppings">
          <span class="material-symbols" aria-hidden="true">keyboard_double_arrow_right</span>
        </button>
        <button type="button" class="icon-button" data-transfer="remove" aria-label="Remove checked toppings">
          <span class="material-symbols" aria-hidden="true">chevron_left</span>
        </button>
        <button type="button" class="icon-button" data-transfer="remove-all" aria-label="Remove all toppings">
          <span class="material-symbols" aria-hidden="true">keyboard_double_arrow_left</span>
        </button>
      </div>
      <ul class="list transfer-chosen" aria-label="Chosen toppings">
        <li><label><input type="checkbox" value="mushrooms"> Mushrooms</label></li>
      </ul>
    </div>
  </form>
  ```

- Buttons stay enabled when nothing can move (R6). Setting `aria-disabled` would need the behavior to read every container's state on load, which a delegated behavior without init does not do.
- The icons flip in right-to-left pages with a `scale: -1 1` under `:dir(rtl)` in the new partial, so authors write one set of icon names.
- The live region and the recorded order live in `WeakMap`s keyed by the container, as `Sortable` keys its regions by list.
- Added in group 1 after a review on 2026-10-25: a button that matches `:disabled` or `[aria-disabled="true"]` moves nothing, as in `Sortable`, because a click on a disabled button's icon still reaches the document listener.

### Deferred

None.

## Technical constraints

- TypeScript follows `src/ts/README.md`, and stylesheet work follows `src/sass/README.md`. `behaviors/` imports from `core/`, never the reverse.
- Every new function stays below cyclomatic complexity 5 for the fallow pre-commit gate.
- Text- and icon-holding boxes use `rem()`; borders and gaps stay in pixels.
- A new Sass partial needs its `semantics.json` row in the same change, because the semantics roster test requires a row for every partial.
- Tests run against built bundles: `npm run build` before browser tests, one browser suite at a time.
- Run `npm run build:skill` after the last edit to `llm.md`, `CHANGELOG.md` or tests, because the contract hash covers them.
- No runtime dependency.

## Dependencies

- None from the roadmap. The behavior reuses the `.list` checkbox row styles, the `Sortable` live region pattern, the `currencyInput.ts` form data pattern and the `expressive:*` event convention.
