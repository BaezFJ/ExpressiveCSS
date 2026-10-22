# AutoInit for markup added later

Date: 2026-10-21
Roadmap phase: Phase 21, AutoInit for markup added later
Branch: `feature/2026-10-21-autoinit-watch`
Base: `origin/master` at `64ea7c64b1fd796a12151a302e62fd0f5aea8198` (#390)
Status: implemented and locally verified 2026-10-21; CI and review pending

Follow the [mission's product rules](../../../../mission.md#product-rules) and its Initialization scope ("Markup can start and configure components without page script"), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 21](../../../../roadmap.md#phase-21-autoinit-for-markup-added-later). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

Phases 17 and 21 are the only roadmap phases without a `Completed` line. Phase 17 (timepicker time range) shipped in #390 with its spec in [timepicker-time-range](../timepicker-time-range/), but the roadmap was not updated after the merge. Phase 21 depends on Phase 20, which is complete. This branch leaves the roadmap unchanged, including Phase 17's entry.

## Current behavior

These facts come from the base commit.

- `AutoInit(context = document.body, options)` in `src/ts/components/registry.ts` walks `AUTO_INIT_COMPONENTS` in order. For each entry it runs `context.querySelectorAll(":is(selector):not(.no-autoinit)")`, applies the entry's `filter` when it has one (only Cards), and calls `initElement(name, el, options?.[name])`. It returns nothing.
- `initElement` merges the element's `data-<name>-options` attribute under the `AutoInit` options and calls `component.init(el, merged)`. Phase 20 made it the one per-element step so this phase could reuse it.
- `querySelectorAll` never matches the context element itself, so `AutoInit(el)` starts components inside `el` but not on it.
- Every component constructor calls `classDef.getInstance(el)?.destroy()` first, so a second `AutoInit()` over the same element replaces its instance with one built from the new options. Instances live on the element as `el.Expressive_<Name>`, and `destroy()` clears that property, so `getInstance(el)` returns `undefined` afterwards.
- AutoInit scans once. Nothing starts components in markup added later, and nothing destroys instances whose elements leave the page. The Alpine section of `docs/src/pages/auto-init.astro` says so and shows a directive as the workaround.
- Some components insert markup that matches registry selectors and start those components themselves. Datepicker renders `<select class="datepicker-select">` month and year controls and builds a FormSelect for each one (`src/ts/components/datepicker.ts`, around lines 1286 to 1380). It destroys and rebuilds them as the calendar changes.
- Several components already use `MutationObserver` on their own elements (Chips, MessageScroller, CommandPalette, Questionnaire, LineChart, Particles, MapView). None watches the page.
- `src/ts/core/utils.ts` and Chips already walk out of shadow roots with `getRootNode()`, and `expressive:*` events cross shadow roots. `AutoInit`'s `context` parameter is typed `HTMLElement`, so it cannot take a `ShadowRoot` today.

A page that inserts markup after load has to call `AutoInit(container)` or each component's `init` itself, and call `destroy()` before removing the element.

## Decisions

### Confirmed in the interview

- Watch mode is turned on with a third argument: `AutoInit(context, options, { watch: true })`. One entry point keeps the docs and the IIFE global unchanged, and existing two-argument calls behave exactly as today.
- The call returns a function that stops watching. The page owns the observer's lifetime.
- Shadow roots are not pierced. A watcher sees only the tree of its own context. `context` may be a `ShadowRoot`, so a page or a custom element watches each root with its own call.
- Removal destroys only elements AutoInit would claim: they match a registry selector, do not carry `.no-autoinit`, and pass the entry's `filter`. Instances that a page or an Alpine directive started on `.no-autoinit` elements stay under that code's control.
- An added element that already has an instance of a component keeps it. This protects options from a direct `init()` call and the FormSelects Datepicker builds for its own selects.
- Attribute changes are not observed. Adding `.menu-trigger` to an element that is already on the page does not start a Menu.
- An element moved within the page keeps its instance.
- The work splits into four ordered task groups, listed in [plan.md](plan.md).

### Proposals for implementation

The interview did not cover these. They follow from the confirmed decisions and the current code, and review can change them.

- `AutoInit` returns the stop function whether or not `watch` is set. Without `watch` it is a no-op. One return type avoids overloads, and the change from `void` breaks no caller.
- The observer watches `childList` with `subtree: true` on `context`, and handles each batch of records in one callback.
- A node counts as moved when it is connected again by the time the callback runs. Removal destroys instances only in removed nodes that are no longer connected. Addition skips added nodes that are no longer inside `context`, which also covers a watched element that is itself detached. An element removed in one batch and added back in a later one is destroyed and then started again.
- Added nodes are started in registry order, as the initial scan does, so Menubar still runs after Menu on markup added in one batch. Each added element is checked itself as well as its descendants.
- Removed elements are destroyed in registry order. A review dropped the reverse order: Menubar's `destroy()` already skips Menus that are gone, so the order changes nothing.
- Constructor errors are not caught, matching the Phase 20 decision. A throw in the callback stops the rest of that batch, and the observer stays connected for later batches. The docs record this limit.
- Calling `AutoInit` with `watch` twice on the same root creates two observers. The second one finds every element already started or already destroyed and does nothing. The docs say to call it once per root.
- `stop()` handles the changes the observer has not delivered yet, then disconnects it. It destroys nothing that is still in the page. A review added the flush, because `disconnect()` alone dropped markup added just before the call.

## Requirements

| ID | Expected behavior |
| --- | --- |
| R1 | `AutoInit(context, options, { watch: true })` runs the initial scan as today, then watches `context` for added and removed nodes. Without the third argument, or with `watch` false, `AutoInit` creates no observer and behaves as it does at the base commit. |
| R2 | `AutoInit` returns a function. Calling it handles the additions and removals not yet delivered, then stops watching and leaves every instance still in the page in place. Without `watch` the function does nothing. |
| R3 | When nodes are added inside a watched `context`, each added element still inside `context` when the callback runs, and each of its descendants, is started in registry order with the same selector, `.no-autoinit` opt-out, `filter`, markup options (`data-<name>-options`) and `AutoInit` options as the initial scan. The added element itself is checked, not only its descendants. |
| R4 | An added element that already has an instance of a component, from a direct `init()`, an earlier scan or the component that inserted it, is not started again for that component. Its instance and options stay as they were. |
| R5 | When nodes are removed and are no longer connected when the callback runs, each element in the removed subtree that matches a registry selector, lacks `.no-autoinit`, passes the entry's `filter` and still has an instance of that component has that instance destroyed. Elements that are connected again by then keep their instances. Elements with `.no-autoinit` are never destroyed by the watcher. |
| R6 | The watcher observes child lists only. Changes to classes or other attributes on connected elements neither start nor destroy components. |
| R7 | `context` may be an element or a `ShadowRoot`. A watcher sees only its own tree: nodes added inside a shadow root under a watched element are not started, and a watcher on the shadow root starts them. Watching a shadow root does not watch the document. |
| R8 | Markup that registered components insert and start themselves, such as Datepicker's month and year selects, keeps the instances those components built. Opening and using Datepicker, Timepicker, Select, Menu and Tooltip with watch mode on creates no extra instances and logs no errors. |
| R9 | Docs and generated guidance describe watch mode: a section on `docs/src/pages/auto-init.astro` with the third argument, the stop function, what counts as added, removed and moved, the shadow-root rule, the `.no-autoinit` rule and the constructor-error limit; an update to the Alpine section, which says AutoInit scans once; the JavaScript initialization section of `llm.md`; and an Unreleased Added entry in `CHANGELOG.md`. `npm run build:skill` regenerates derived files and `npm run check:generated` passes. |
| R10 | The bundle size change has a reviewed gzip budget line in `tests/selective-builds.test.js`. New functions stay below cyclomatic complexity 5 for the fallow pre-commit gate. The framework gains no dependency. |

## Constraints and dependencies

- Depends on Phase 20 (`initElement` in `registry.ts`), which is merged.
- Keep the change in `src/ts/components/registry.ts`, plus the exported types in `src/ts/modular.ts` if the new third-argument type needs exporting. Add no `core/` helper for one caller.
- Read instances through each registry entry's `component.getInstance`. The `AutoInitable` type in `registry.ts` gains `getInstance`.
- Tests run against built bundles. Build before testing. Disconnect watchers and destroy instances in `finally` blocks. jsdom supports `MutationObserver`; tests wait for its callback with a resolved promise or `setTimeout(0)`.
- Don't run two test suites at once, because parallel browser runs flake.
- `semantics.json` does not change. Watch mode adds no role, name or structural rule.

## Out of scope

- Following shadow roots attached inside a watched tree, and closed shadow roots the page has no reference to.
- Starting or destroying components when attributes or classes change.
- Destroying instances on `.no-autoinit` elements or on elements a registry selector does not match.
- Catching constructor errors in the watcher.
- Turning watch mode on from markup, or by default.
- Roadmap edits, including marking Phase 17 completed. That belongs in a separate docs change.
- Release and publication.

### Found during implementation

- The guard in R4 also stops a loop. FormSelect wraps its `<select>` in a `.field`, which moves the select and reports it as added. With the guard removed for a mutation check, the watcher started FormSelect again on every move and the browser sweep never finished. The jsdom and browser checks pass with the guard in place.
- `AutoInit`'s third parameter is an inline `{ watch?: boolean }` type. No exported type was needed, so `src/ts/modular.ts` is unchanged.

## Open decisions

None. Implementation accepted the proposals above as written; review can still change them.
