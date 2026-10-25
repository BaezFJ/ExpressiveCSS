# Cascader

Date: 2026-10-25
Roadmap phase: Phase 48, cascader
Branch: `feature/2026-10-25-cascader`
Base: `origin/master` at `a9bbf77ad`
Status: specified 2026-10-25; not implemented

Follow the [mission's agreed scope for components](../../../../mission.md#agreed-scope) and its [product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 48](../../../../roadmap.md#phase-48-cascader). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

Javier picked Phase 48. Phases 42 to 51 are being specified in parallel threads, so this spec skips the "earliest unfinished phase" rule. The roadmap gives Phase 48 no dependencies. Phase 47, tree select, is being specified at the same time on `feature/2026-10-25-tree-select` and has no spec or code yet.

## Current behavior

These facts come from the base commit.

- No component picks a path through nested options. Nothing in `src/ts`, `src/sass` or `docs/src/pages` mentions a cascader.
- `FormSelect` (`src/ts/components/select.ts`) turns a native `<select>` in a `.field` into a `Menu` with `role="listbox"`. Its input gets `role="combobox"`, `aria-haspopup="listbox"` and `aria-controls`, and keeps focus while `aria-activedescendant` points into the list. Native `<optgroup>` gives one level of headings and cannot nest.
- `Menu` (`src/ts/components/menu.ts`) has nested submenus and opens as a manual popover in the top layer, positioned with CSS anchor positioning where the browser has it and with script elsewhere. Its submenus are menus of actions with `role="menu"` and fly out one at a time.
- `.tree` (`semantics.json`, `llm.md` "Tree") is nested lists of native disclosures and links. It takes no ARIA tree roles and submits nothing.
- Chips (`src/ts/components/chips.ts`) submits one form entry per chip through the form-associated `expressive-chips-control` element. It wraps the input, moves `required` to the control, mirrors `disabled` and `form`, restores its starting chips in `formResetCallback`, and skips the control where `ElementInternals.setFormValue` is missing, as in jsdom.
- `Utils.ignoringComposition()` and `restoreAttribute()` live in `src/ts/core/utils.ts`.
- `src/ts/components/registry.ts` lists what AutoInit starts and reads markup options from `data-<name>-options`.

## Scope

A `.cascader` field shows nested options as columns in a popover. Choosing an option opens its children in the next column, choosing a leaf commits the path, and the form submits one entry per level under the field's name, in order.

The intended markup:

```html
<div class="field cascader">
  <input id="place" name="place" type="text">
  <label for="place">Place</label>
  <ul class="cascader-options">
    <li data-value="us">United States
      <ul>
        <li data-value="ca">California
          <ul>
            <li data-value="sf">San Francisco</li>
            <li data-value="la">Los Angeles</li>
          </ul>
        </li>
      </ul>
    </li>
  </ul>
</div>
```

### Expected behavior

- **R1.** AutoInit starts a `Cascader` component on every `.cascader`. Its options come from the nested lists in its `ul.cascader-options`. Each `li` holds a `data-value`, and its label is its own text outside any nested list. An `li` whose nested `ul` holds at least one `li` is a branch; every other `li` is a leaf. The source list stays in the DOM, unchanged and hidden by the stylesheet.
- **R2.** On start, the input becomes `readonly` and gets `role="combobox"`, `aria-haspopup="dialog"`, `aria-expanded="false"` and `aria-controls` naming the popover.
- **R3.** A click on the input, or Enter, Space, ArrowDown or Alt+ArrowDown while it has focus, opens the popover: a manual popover with `role="dialog"`, labelled by the field's label and anchored below the field. It shows the first column, plus one column for each level of the committed path. Focus moves to the committed leaf, or to the first option of the first column when nothing is committed. The input gets `aria-expanded="true"`.
- **R4.** Each column is a `role="listbox"` of `role="option"` elements. The first column is labelled by the field's label, and each later column by the option that opened it. The options on the open path have `aria-selected="true"` and the rest `aria-selected="false"`. A branch option ends in an `aria-hidden` chevron icon. Columns sit side by side in the inline direction, and a column taller than the popover's maximum height scrolls.
- **R5.** Choosing a branch shows its children as the next column and removes any columns after it. A click chooses the branch and keeps focus on it. Enter, Space and ArrowRight choose it and move focus to the first option of the new column.
- **R6.** Within a column, ArrowDown and ArrowUp move focus to the next and previous option without wrapping, and Home and End move to the first and last. ArrowLeft moves focus to the option that opened the column and leaves the columns as they are. ArrowLeft in the first column and ArrowRight on a leaf do nothing. Each column has one tab stop, its focused or selected option.
- **R7.** Under `dir="rtl"`, columns run right to left, and ArrowLeft and ArrowRight swap roles.
- **R8.** Choosing a leaf with a click, Enter or Space commits the path. The input shows the path's labels joined by `" / "`, such as `United States / California / San Francisco`. The popover closes, focus returns to the input, and `input` and `change` fire on the input and bubble. Committing the same path again fires neither.
- **R9.** Escape closes the popover without committing and returns focus to the input. Tab and Shift+Tab inside the popover do the same. A click outside the popover closes it without committing and leaves focus where the click put it. In each case the committed path and the input's text stay as they were.
- **R10.** The component wraps the input in a form-associated `expressive-cascader-control` element and moves the input's `name` to it, as Chips does. The form data holds one entry per level of the committed path under that name, in path order, so San Francisco gives `place=us`, `place=ca` and `place=sf`. With no committed path, the form data holds no entry for the name.
- **R11.** A leaf `li` with `data-selected` sets the starting path. The input shows it without firing `input` or `change`. If several leaves have it, the first in document order wins. `data-selected` on a branch is ignored.
- **R12.** A form reset restores the starting path, or no path, closes the popover if it is open, and fires no `input` or `change`.
- **R13.** With `required` on the input, the control is required instead, the input keeps `aria-required="true"`, and the control fails `checkValidity()` with `valueMissing` until a path is committed. Its message is `Choose an option.`, and `i18n.required` in the options replaces it. In a `.validate` field, the input gets `aria-invalid` and is described by the error text, as `Forms` does for other fields.
- **R14.** A `disabled` input or a disabled `<fieldset>` disables the control. The form data then holds no entry for the name, and the popover does not open.
- **R15.** The instance's `value` getter returns the committed path as an array of values, or an empty array. `open()` and `close()` open and close the popover as R3 and R9 describe.
- **R16.** `destroy()` closes and removes the popover, removes every listener, unwraps the input from the control, and restores the input's `name`, `required`, `readonly`, `role` and `aria-*` attributes. The input keeps its text.
- **R17.** Where `ElementInternals.setFormValue` is missing, as in jsdom, the component skips the control as Chips does. Opening, choosing and committing still work, and R10 to R14 are checked only in browsers.
- **R18.** `semantics.json` gains a `cascader` row. Its rules flag a `role` on the source list or its items, an `li` in `.cascader-options` without `data-value`, an input of a type other than `text`, and an input with no accessible name. The checks never start components.
- **R19.** A `_cascader.scss` partial styles the popover with the menu's surface, elevation and shape tokens and the options with list item tokens. Text-holding boxes, such as option rows and the minimum column width, are sized in `rem()`; borders and gaps stay in pixels. It hides `.cascader-options`. Under forced colors, the selected path and the focus ring stay visible.
- **R20.** `llm.md` gains a "Cascader" section after "Select", with its own component guide, and a docs page documents the markup, keyboard, form value, `data-selected`, `required`, `value`, `open()`, `close()` and `i18n.required`, with a live three-level example. The component decisions data, both AutoInit registry tables in `llm.md`, `docs/src/pages/auto-init.astro`, the changelog's Unreleased section and the hand-written web extensions review get entries, and `npm run build:skill` regenerates the derived files.
- **R21.** `tests/selective-builds.test.js` has reviewed JavaScript and CSS gzip budget lines for this change.

### Exclusions

- Sharing code with Phase 47. The user chose a standalone component, so the cascader does not depend on the tree select.
- Searching or filtering options, and type-ahead within a column.
- Multiple selection, and committing a branch as a partial path. Only a leaf commits.
- Children loaded on demand, and options added or removed after start. A page calls `destroy()` and starts the component again.
- Opening a column on hover.
- An `expressive:*` event or option callback. Native `input` and `change` fire on the input, and R15 gives the path, as Phase 39 decided for currency input.
- A configurable display separator. The input always joins labels with `" / "`.
- An inline column view without a popover.
- Manual screen reader passes. They are listed in validation.md and are not merge conditions.

## Decisions

### Confirmed with the user on 2026-10-25

- The phase is Phase 48, on the existing `feature/2026-10-25-cascader` branch, created from the latest `origin/master`.
- The cascader is standalone. It shares no code with Phase 47 and does not depend on it.
- It opens as a popover of columns from a field, and each column is a listbox. ArrowRight and Enter open the next column, ArrowLeft goes back, and Escape closes.
- The form gets one entry per level under the field's name, in order, like Chips.
- Options come from nested-list markup with `data-value`. Only a leaf commits. Search, multiple selection and lazy-loaded children are out of scope.
- The work splits into five groups: markup and semantics rules; columns; keyboard and ARIA state; the form control; then styles, docs and checks.
- Merge conditions: the roadmap's completion check in Chromium, Firefox and WebKit, the jsdom and semantics tests, the keyboard, ARIA and form state browser tests, and the repository's required CI checks. The user did not choose a manual screen reader pass as a merge condition.

### Proposed in this spec, open to review

- `role="dialog"` for the popover and `aria-haspopup="dialog"` on the input. ARIA lets a combobox popup be a dialog, and a row of listboxes does not fit the single listbox Select uses. Focus moves into the columns, as in a date picker dialog, so the input does not use `aria-activedescendant`.
- Tab and Shift+Tab close the popover and return focus to the input (R9), so a keyboard user leaves the field with a second Tab.
- A click on a branch keeps focus on it (R5), so a pointer user can move across siblings without focus jumping to the next column.
- ArrowLeft keeps the deeper columns visible (R6), so a person can look back without losing the columns they opened.
- The starting path comes from `data-selected` on a leaf (R11), because the author's list is the only place that knows which leaf it means.
- R13's default message `Choose an option.` and its `i18n.required` option, following Chips' `i18n.required`.
- No `expressive:*` event, following Phase 39 (see exclusions).
- The cascader defines its own small control class, `expressive-cascader-control`, with the tech stack's `expressive-` prefix. Chips' `defineControl()` stays in `chips.ts`, since the user chose not to extract shared code in this phase.

### Deferred

None.

## Technical constraints

- TypeScript follows `src/ts/README.md`. `components/` imports from `core/`, never the reverse. Reuse `Utils` and `restoreAttribute()`.
- The popover is a manual popover in the top layer, as Menu's is, with CSS anchor positioning and a script fallback. Menu's positioning helpers are private to `menu.ts`. If they can move to `core/` without changing Menu's behavior or tests, reuse them; otherwise write the smallest positioning the cascader needs. Record which in the implementation notes.
- Listeners that last as long as the instance take `this._events.signal`. `formdata` and `reset` do not leave a shadow root, so any listener on the form goes on `el.getRootNode()` when it has a `host`, as Chips does.
- Key handlers on the input skip IME composition through `Utils.ignoringComposition()`.
- Every new function stays below cyclomatic complexity 5 for the fallow pre-commit gate. Use a key table and small helpers.
- Tests run against built bundles: `npm run build` before browser tests, one browser suite at a time. Tear components down in `finally` blocks.
- Run `npm run build:skill` after the last edit to `llm.md`, `CHANGELOG.md` or tests, because the contract hash covers them.
- No runtime dependency.

## Dependencies

- None from the roadmap. Phase 47 is not a dependency, by the user's choice.
- The component reuses the AutoInit registry and its markup options, Chips' form-associated control pattern, the menu's surface tokens, and the browser test helpers in `tests/chips-form-browser.test.js`.
