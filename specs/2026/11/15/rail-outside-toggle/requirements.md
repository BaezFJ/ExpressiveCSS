# Rail outside toggle: requirements

- Feature: a button outside a `.navigation-rail` that names the rail in `aria-controls` expands and collapses it
- Date: 2026-11-15
- Roadmap phase: [Phase 90: toggle the rail from outside it](../../../../roadmap.md#phase-90-toggle-the-rail-from-outside-it), in the [scaffold app shells milestone](../../../../roadmap.md#milestone-scaffold-app-shells). It falls under "Components and behaviors" in the [mission](../../../../mission.md); the [technical constraints](../../../../tech-stack.md) framework rules govern it.
- Branch: `feature/2026-11-15-milestone-scaffold-app-shells`, shared by the milestone's one pull request.
- Base: the branch at `4ca1a4bd4`, after phase 89.

## Current behavior and need

`NavigationRail` (`src/ts/components/navigationRail.ts`) toggles `.expanded` from one button: `_findToggle()` takes the rail's first `:scope > button:not(.button, [popovertarget])`, wherever it sits among the children. The CSS styles only a `:first-child` button that is not `.button`, `.icon-button` or `[popovertarget]` as the menu toggle (`_navigation-rail.scss`). `_sync()` sets `aria-expanded` on the rail and that button. When Escape collapses a modal rail with focus inside it, focus goes to that button.

A scaffold's app bar holds the menu button, as Gmail does, so the button sits outside the rail. Nothing connects it today. A rail whose first child is a destination but which has a `<button>` destination later also has that destination misread as the toggle, because `_findToggle()` ignores `:first-child`.

## Scope

- Any enabled `<button>` in the rail's document or shadow root whose `aria-controls` lists the rail's `id`, and that sits outside the rail, toggles the rail.
- Every such button's `aria-expanded` follows the rail at start and on every expand and collapse.
- Escape that collapses a modal rail with focus inside it returns focus to the toggle that last opened the rail.
- The inside toggle must be the rail's first child, as the CSS already requires for its styles.
- Docs on the navigation rail page and the scaffold page, `llm.md`, changelog and JS budget updates.

## Exclusions

- Moving focus into the rail when an outside button opens it. The roadmap asks only for focus to return on Escape, and the inside toggle doesn't move focus either.
- Restoring outside buttons' `aria-expanded` on `destroy()`. The inside toggle's attribute isn't restored either, and the author writes the initial value.
- Toggles that are links or other elements. A toggle is a `<button>`, as the inside one is.
- One button controlling two rails. Both rails toggle, but each writes the button's `aria-expanded`, so the docs say a button controls one rail.
- A toggle in a different shadow root from the rail, such as inside an app bar web component. An ID reference can't cross a shadow boundary.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| Outside toggles are found when they are clicked, through one document click listener that walks `composedPath()` (`Utils.closestInPath`) and accepts a button in the rail's current root node, and they are looked up again on every sync | Decided under delegation | AutoInit's `watch` mode starts components as their markup arrives, but a button is not a component. Looking buttons up at click time connects one added after the rail started with no extra step, and the next sync updates its `aria-expanded`. Reading the root at click time also covers a rail started before it was attached, and a click on the icon inside the button. |
| A rail can have an outside toggle and its own first-child toggle at once, and all of them stay in sync | Decided under delegation | Both are buttons that run the same `toggle()`, so allowing both costs nothing, and a page that moves the menu button into the app bar on some layouts keeps working. |
| Escape returns focus to the toggle that last opened the rail, else the inside toggle, else the first outside toggle, skipping any that are gone, disabled, hidden or no longer name the rail. The opener is recorded by the click handlers only after the rail actually expanded | Decided under delegation | The roadmap asks focus to return to "that button". Recording after a successful expand keeps a cancelled open from leaving a stale opener, and `toggle()` stays a public method with no arguments. |
| `_findToggle()` requires the button to be the first child, as the CSS does; it still accepts an `.icon-button` there | Decided under delegation | A rail driven from outside often has no inside toggle, and without the fix a later `<button>` destination would be taken for the toggle. A menu button that isn't the first child was already unstyled as a toggle. That markup now stops toggling, so the changelog carries a migration note: move the menu button to the rail's first child. An `.icon-button` toggle keeps working, so that case needs no migration. |
| Tokens are matched with `[aria-controls~="<id>"]`, with the id escaped by `CSS.escape` | Decided under delegation | `aria-controls` is an ID reference list, and `~=` matches one token in it. Escaping keeps an id with special characters from breaking the selector. |

## Requirements

- **R1** Clicking an enabled `<button>` outside the rail whose `aria-controls` lists the rail's `id`, or clicking inside it, toggles the rail through `expand()` and `collapse()`, so the open and close callbacks and `expressive:*` events run as for the inside toggle. The click's default action is prevented, so a submit button in an app bar form doesn't submit. A click that page code already prevented is left alone. A disabled button, a button naming another id, and a rail without an `id` do nothing. An inside toggle that also carries `aria-controls` toggles the rail once, not twice.
- **R2** At start and after every expand and collapse, each such button has `aria-expanded` equal to the rail's state, as the inside toggle does. A button added after the rail started gets the right value at the next change and toggles the rail at once.
- **R3** When Escape collapses a modal rail with focus inside it, focus goes to the toggle that last opened the rail. When the rail was opened another way, or that toggle is no longer connected, enabled, rendered (`checkVisibility()`, so a stylesheet's `display: none` counts), outside an `inert` subtree and naming the rail, it goes to the inside toggle if there is one, otherwise the first usable outside toggle. An open that doesn't end expanded records no opener. The existing rules stay: a nested menu or side panel takes Escape first, and focus that a callback moved, or that sat outside the rail, stays where it is.
- **R4** A rail inside a shadow root, open or closed, connects to toggles in that shadow root. Its click listener sits on the shadow root, since a closed root hides its buttons from a document listener.
- **R5** The inside toggle is the first child only, when it is a `<button>` that isn't `.button` or `[popovertarget]`. A `<button>` destination later in a rail whose first child is a link is a destination, not a toggle. A first-child `.icon-button` toggle still works.
- **R6** A rail without an outside button behaves as before; the existing navigation rail tests pass unchanged.
- **R7** In a browser at 390px, activating an app bar button whose `aria-controls` holds the rail's id with Enter expands the modal rail and sets the button's `aria-expanded="true"`. Pressing Escape with focus inside the rail collapses it and focuses the button. This holds in Chromium, Firefox and WebKit.
- **R8** These records change:
  - The navigation rail docs page and its `llm.md` section describe the outside toggle.
  - The scaffold docs and `llm.md` examples give the app bar's menu button `aria-controls` with the rail's `id`, and the scaffold demo is wired the same way.
  - `CHANGELOG.md` gets an entry, and a migration note: a rail menu button that isn't the rail's first child stops toggling, so move it to the first child.
  - The JS gzip budget line in `tests/selective-builds.test.js` is updated.
  - `npm run build:skill` regenerates the guides last.

## Risks considered

- Two at once: two toggles clicked in sequence each call `toggle()`, which reads `isExpanded`, so the state alternates. A callback that cancels the change leaves every button's `aria-expanded` unchanged, because `_sync()` runs only after a change.
- Bad input: an `id` with spaces or quotes is escaped (decision above). A button whose `aria-controls` names the id among other ids still matches. An empty `aria-controls` matches nothing.
- Refusal: a disabled outside button does nothing (R1).
- Other readers: AutoInit `watch` (decision above, R2). The scrim covers an outside button while a modal rail is open, and a click there is a scrim click that collapses the rail, as before. Menus and side panels inside the rail keep their Escape order (R3). A destroyed rail removes its root listener through the shared `AbortSignal`.
- UI states: modal and non-modal rails, compact width (R7), shadow DOM (R4), no JavaScript (the button does nothing, as the inside toggle does today).
- `specs/checklist.md` does not exist in this project.
