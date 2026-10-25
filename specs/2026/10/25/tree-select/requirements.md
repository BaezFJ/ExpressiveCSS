# Tree select

Date: 2026-10-25
Roadmap phase: Phase 47, tree select
Branch: `feature/2026-10-25-tree-select`
Base: `origin/master` at `a9bbf77ad`
Status: groups 1 and 2 implemented 2026-10-25; docs pending; not merged

Follow the [mission's agreed scope for components](../../../../mission.md#agreed-scope) and its [product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 47](../../../../roadmap.md#phase-47-tree-select). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user picked Phase 47. Phases 42 to 51 are being specified in parallel threads, so this spec skips the earliest-unfinished-phase rule. The roadmap gives Phase 47 no dependencies. No other branch or spec directory holds tree select work.

## Current behavior

These facts come from the base commit.

- `FormSelect` (`src/ts/components/select.ts`) turns a native `<select>` into a read-only `<input role="combobox" aria-haspopup="listbox">` and a `<menu role="listbox">` of `li[role="option"]` rows. It hides the native select inside a `.hide-select` wrapper, and the native select still owns form submission, reset, validity and the disabled state. AutoInit claims every `select` (`src/ts/components/registry.ts`, `selector: "select"`). A `browser-default` select stays native.
- FormSelect reads one level of `<optgroup>` as group headings. HTML cannot nest deeper: the parser closes an open `<optgroup>` when the next one starts, so a native select has no tree of its own.
- FormSelect hands the popup to `Menu` (`src/ts/components/menu.ts`), which opens it as a manual popover, places it, and handles keys from one `keydown` listener on the menu element. ArrowRight and ArrowLeft open and close flyout submenus held in `:scope > menu`, not tree branches. Menu's `_rows()` reaches only `:scope > li` and one `ul[role="group"]` level below it. `_makeMenuFocusable()` leaves a menu element whose role is already set to something other than `menu` alone.
- FormSelect's `onOpenEnd` sets `menu.focusedIndex` from the chosen row's position in its parent list, which is only correct for a flat list.
- `.tree` (`src/sass/components/_tree.scss`, `llm.md` "Tree") is CSS only: nested lists of `<details>` disclosures and links. Its `semantics.json` row forbids tree roles inside `.tree`, because native disclosures do not give the arrow-key contract.
- `semantics.json` lists `tree` among its `compositeRoles`. The mission's product rules allow a composite role only where the component implements its tested keyboard contract.

## Scope

A `<select data-tree>` whose options name their parent in `data-parent` shows as a tree in its popup. People expand branches with the keyboard or pointer as the ARIA tree pattern describes, choose one leaf, and the form submits that leaf's value through the native select.

### Expected behavior

- **R1.** AutoInit starts a `TreeSelect` component on every `select[data-tree]`, and FormSelect's AutoInit selector becomes `select:not([data-tree])`. `TreeSelect` extends `FormSelect` with its own `key`, takes the same `classes` and `menuOptions` options, and reads markup options from `data-tree-select-options`. A `browser-default` tree select stays native, as with FormSelect.
- **R2.** The component builds the tree from the select's `<option>` children. An option with `data-parent` is a child of the first option in the select whose `value` equals it; any other option is a root. An option is a branch when another option names it, and a leaf otherwise. Siblings keep document order, wherever they sit in the list. An option becomes a root when its `data-parent` is empty, names no option, or starts a chain of parents that returns to the option itself; the children of such an option stay under it.
- **R3.** The popup has `role="tree"` and takes its name from the select's labels. Each row is an `li[role="treeitem"]`. A branch row has `aria-expanded` and holds its children in a `ul[role="group"]`. A leaf row has `aria-selected="true"` when chosen and `"false"` otherwise, and a disabled leaf has `aria-disabled="true"`. The field has `aria-haspopup="tree"`. Branches start collapsed. Each time the popup opens, the chosen leaf's ancestors expand and focus goes to that leaf, or to the first enabled row when no enabled leaf is chosen, such as when a disabled placeholder is selected.
- **R4.** In the open popup the keys follow the ARIA tree pattern. Like Menu, they skip disabled leaves.
  - ArrowDown and ArrowUp move to the next and previous visible row, without wrapping.
  - ArrowRight opens a closed branch, moves from an open branch to its first child, and does nothing on a leaf.
  - ArrowLeft closes an open branch, and otherwise moves to the parent row. On a closed root row it does nothing.
  - Under `dir="rtl"`, ArrowLeft and ArrowRight swap, as Menu's submenu keys do.
  - Home and End move to the first and last visible row.
  - `*` opens every sibling branch of the focused row.
  - A printable character moves to the next visible row whose text starts with the characters typed so far, with Menu's typeahead timing.
  - Enter and Space choose a leaf and toggle a branch.
  - Escape and Tab close the popup as Menu already does, and Escape returns focus to the field.
- **R5.** Choosing a leaf by key or click selects its native option, fires one native `change` event on the select when the value changed, closes the popup and shows the leaf's text in the field. A disabled leaf does nothing. A click on a branch row toggles it and keeps the popup open. A branch is never chosen.
- **R6.** While the component runs, it sets `disabled` on every branch option, so the form data never carries a branch value and the native default selection skips branches. `destroy()` and `refresh()` restore the attribute on each option the component disabled. A branch row is not shown as disabled. If the markup selects a branch, the field shows its text, as FormSelect shows a disabled placeholder.
- **R7.** Form behavior comes from FormSelect and the native select. The form data and a submit carry the chosen leaf's value under the select's `name`. A form reset restores the default option and updates the field. A `required` tree select with a `value=""` placeholder fails `checkValidity()` and shows the browser's message as FormSelect does. A disabled select does not open.
- **R8.** `refresh()` rebuilds the tree from the current options, keeps open every branch whose value still exists, and keeps focus on a row that survives while the popup is open, as FormSelect's `refresh()` does for its rows.
- **R9.** `FormSelect.init()` on a `select[data-tree]` leaves it alone, as it does for `browser-default`. A page that calls `FormSelect.init(document.querySelectorAll('select'))` then does not wrap a tree select twice.
- **R10.** `destroy()` removes the tree, every listener and the branch `disabled` attributes from R6, and restores the native select as FormSelect's `destroy()` does.
- **R11.** Each level indents and draws a guide line, and a branch row shows a chevron that turns when it opens, matching the `.tree` look. Row boxes are sized in `rem()`. Under `prefers-reduced-motion: reduce` the chevron does not animate. In forced colors the chevron stays visible and the chosen row has an outline. The popup does not take the `.tree` class, because that row's semantics rule forbids tree roles; the two share styles through Sass.
- **R12.** `semantics.json` gains a `tree-select` row whose rules flag `data-tree` on anything but a `<select>`, `data-tree` on a `select[multiple]`, an `<optgroup>` inside `select[data-tree]`, and `option[data-parent]` inside a select without `data-tree`.
- **R13.** `llm.md` gains a "Tree select" section after "Select", with its own component guide, and a docs page documents the markup, the keys, the branch rule from R6, `refresh()` and the exclusions below, with a live example. That example puts `disabled` on branch options and starts with a `value=""` placeholder, so the page also works without script. The "Select" section says a `data-tree` select belongs to TreeSelect. The component decisions data, the changelog's Unreleased section and the hand-written web extensions review get entries, and `npm run build:skill` regenerates the derived files.
- **R14.** `tests/selective-builds.test.js` has reviewed JavaScript and CSS gzip budget lines for this change, and the capability `sourceRevision` pin names a commit that holds the new files.

### Exclusions

- Choosing several leaves, or a checkbox tree. The roadmap asks for one leaf, and R12 flags `multiple`.
- Choosing a branch.
- A search or filter field in the popup.
- Children loaded on demand.
- `<optgroup>` inside a tree select, and nesting through anything but `data-parent`.
- Showing the leaf's path in the field. The field shows the leaf's text, as FormSelect shows the option's text.
- `data-icon` images on tree rows. FormSelect's icon code builds flat rows, and the roadmap does not ask for icons.
- A new `expressive:*` event or option callback. The native `change` event already fires.
- A mutation observer. Pages call `refresh()` after changing options, as with FormSelect.
- Disabling a whole subtree through its branch. R6 uses a branch's `disabled` attribute for the form, so a page disables each leaf instead.
- Manual checks with screen readers. They are listed in validation.md and are not merge conditions.
- Any work for Phase 48. The next section only records what a cascader could reuse.

## Parts a cascader could reuse

Phase 48 is being specified in parallel, and the roadmap leaves open whether it shares code with this phase. Nothing here plans work for it.

- The flat `data-parent` encoding, and the function that turns a select's options into a node tree under R2, including the missing-parent and loop rules. Writing it as a standalone exported helper that takes the options and returns nodes, with no row building, lets a cascader that reads the same markup import it.
- The ancestor path of a leaf, which R3 uses to expand branches on open. It is the path a cascader shows and submits.
- Subclassing FormSelect for its wrapper, labels, validation and reset. A cascader that keeps a native select could do the same, although submitting a whole path needs more than one native value.

The tree keyboard contract and the nested `role="group"` rows are specific to a tree; a cascader's columns are separate lists.

The Phase 48 spec, written the same day on `feature/2026-10-25-cascader` and not yet committed, keeps the cascader standalone: it reads nested `ul.cascader-options` lists and submits through a form-associated element, so it uses none of the parts above. They stay worth noting if that choice changes.

## Decisions

### Confirmed with the user on 2026-10-25

- The phase is Phase 47, on the existing `feature/2026-10-25-tree-select` branch from `origin/master` at `a9bbf77ad`.
- `TreeSelect` is a subclass of `FormSelect` started on `select[data-tree]`, so plain selects keep their current code and bundle path.
- Authors write a flat native `<select data-tree>` in which each child option names its parent's value in `data-parent`. The native select owns submission, reset, validity and the disabled state. Only one leaf can be chosen; multiple selection, search and children loaded on demand are out of scope.
- The work splits into three groups: the tree popup with the roadmap's completion check, then the full keyboard contract and edge cases, then docs and checks.
- Merge conditions: the roadmap's completion check in Chromium, Firefox and WebKit, the full keyboard contract browser tests, the jsdom logic tests, and the repository's required CI checks. A manual screen reader pass is not a merge condition.

### Proposed in this spec, open to review

- R6 sets `disabled` on branch options. Without it, a native single select with no `selected` option picks its first option, which is a root branch, and the form submits it.
- R2's rules for an empty or missing parent, a loop and a duplicate value, so bad markup still renders every option.
- R3 expands the chosen leaf's ancestors on every open and keeps other branches as the person left them.
- R9 makes FormSelect skip `select[data-tree]`, since the documented `FormSelect.init(querySelectorAll('select'))` pattern would otherwise wrap a tree select twice.
- The field shows the leaf's text only, not its path.

### Deferred

None.

### Implementation notes

- R3 changed during group 2: the `<menu>` Menu opens is now `role="presentation"` and holds a `<ul role="tree">`, which `aria-controls` names and the instance exposes as `tree`. Menu styles every `menu[id] > li` row and its first `ul[role="group"]` level (hover, selected, focus, disabled opacity, edge radii, padding), and those rules outranked the tree's on the first two levels. One list further down, none of them apply.
- R3 names the tree as the field is named: its `aria-labelledby`, then its `aria-label`, then its labels.
- R6 also covers a select with no `selected` option. The browser then picks the first option, usually a branch, and disabling it does not move the selection. On start, unless the markup selected it, the component chooses the first enabled leaf, as a form reset would, or nothing. A branch a script selects later stays selected.
- A disabled row takes no pointer events, so a click on it reaches its group. The click handler acts only on a row's label, so such a click does not toggle the branch around it.
- `refresh()` puts focus on the first enabled row, or on the field, when the focused row is gone or disabled. Expanding a chosen leaf's ancestors stops at the tree's own branch rows, so a field inside a page `<li>` leaves that item alone.
- FormSelect's native-focus redirect looked its instance up as `FormSelect`, so a TreeSelect, under its own key, left focus on the hidden select when validation failed. It now uses the instance's own class.
- The chevron is a `tree-chevron` mixin in `src/sass/abstracts/_mixins.scss`, used by `.tree` and the tree select; the compiled `.tree` CSS is byte-identical. The capability pins for `_tree.scss` and `_mixins.scss`, both current at the base commit, were re-pinned. The `select.ts` and `_select.scss` pins were already stale there and stay as they were.
- `FormSelect.init()` on a tree select or a `browser-default` select returns an instance that built nothing, as before. Its `destroy()` used to unwrap the select and reset its tabindex, which broke a TreeSelect on the same control; it now leaves a skipped select alone.
- The chosen row is where the popup opens, so it shows the focus layer over its selected fill. In forced colors its label keeps the Highlight outline and the row's own `<li>` takes a CanvasText ring; a chosen row is always a leaf, so that `<li>` is only its label.
- jsdom puts a disabled selected option in `FormData`, unlike browsers, so the check that a branch never submits runs in a browser.

## Technical constraints

- TypeScript follows `src/ts/README.md`. `components/` imports from `core/`, never the reverse.
- Menu handles keys from a listener on the menu element, so the tree's own row handlers must act on and stop the keys in R4 first, leaving Escape and Tab to Menu. FormSelect's `onOpenEnd` focus code assumes a flat list, so TreeSelect replaces it for R3.
- Listeners that last as long as the instance take `this._events.signal`.
- Every new function stays below cyclomatic complexity 5 for the fallow pre-commit gate. A key table, as Menu's `STEPS` and `Utils._keyIndex()` use, keeps R4 under it.
- Sass follows `src/sass/README.md`. A masked chevron needs the `forced-colors-fill` mixin or the `CanvasText` rule `.tree` uses, and a line in `tests/forced-colors.test.js`.
- Tests run against built bundles: `npm run build` before browser tests, one browser suite at a time.
- Run `npm run build:skill` after the last edit to `llm.md`, `CHANGELOG.md` or tests, because the contract hash covers them.
- No runtime dependency.

## Dependencies

- None from the roadmap. The component reuses FormSelect, Menu's popover and typeahead, `Utils._keyIndex()`, the `.tree` styles through Sass, and the AutoInit registry with its markup options.
