---
name: expressivecss-runtime
description: Initializes and destroys ExpressiveCSS JavaScript components, handles dynamic content, repairs remounts and teardown, and inspects interaction performance. Use for Auto Init, manual or shared runtime work, and JavaScript-backed audits. Not for CSS-only audits, static markup without JavaScript behavior, or token changes; a critique needs it only when interaction evidence is in scope.
---

# ExpressiveCSS JavaScript runtime

## Initialization and lifecycle

Reuse the root version resolution and read the selected component guide first. Open the [Auto Init documentation](https://www.expressivecss.com/auto-init.html.md) or the component's page only for missing options, methods, events, conflicts, or version uncertainty.

### Choose one initialization owner

Default to `AutoInit()` for registry defaults. Pass a context and per-component options when needed:

```js
import { AutoInit } from '@expressivecss/expressive';

AutoInit();
AutoInit(document.querySelector('#app'), {
  Tooltip: { position: 'top' },
});
```

Switch to manual initialization only when one element needs options or lifecycle ownership outside Auto Init. Add `no-autoinit` to every manually initialized registry element.

```html
<button class="tooltipped no-autoinit" data-tooltip="Save">Save</button>
```

```js
const instance = Tooltip.init(element, { position: 'top' });
```

Never use `AutoInit()` and `Component.init()` on the same element.

### Lifecycle

Most per-element components follow:

```js
const instance = ComponentName.init(element, options);
const current = ComponentName.getInstance(element);
current?.destroy();
```

AutoInit selects descendants of its context and reconstructs existing instances. Scope it to the incoming route container so persistent shell components keep their instances. When the supplied context is itself a component host, initialize that host explicitly.

Destroy route-owned instances before replacing their HTML, removing their element, or navigating away. Removing DOM alone does not dispose generated portals or shared registry entries.

### Runtime boundaries

- Importing the bundle installs shared document-level behaviors but does not call `AutoInit()`.
- Native dialogs use `showModal()`, `show()`, and `close()`; there is no `Modal` export.
- Snackbar, CharacterCounter, and Slider use their documented explicit or shared paths instead of the Auto Init registry.
- When working in the framework repository, `src/ts/components/registry.ts` is the registry's source of truth. Do not copy a selector table from a prompt.
- Generated overlays must stay in the originating document or shadow root.

### Rules

- Create markup before initialization, and initialize each element once.
- Do not overwrite component state with app JavaScript when CSS or state attributes own `transform`, `opacity`, `display`, or overflow.
- Do not pre-author dynamic ARIA values that the component updates.
- Keep a way to recover the instance wherever teardown can happen.
- Treat timers, global listeners, generated nodes, and instance properties as teardown obligations.

## Runtime performance

Scope initialization to the newly mounted container instead of scanning the whole document on each update. For a reported slowdown, record the same interaction and remount scenario before and after the change, with input, data, and browser settings fixed. Compare long tasks and the listeners, timers, overlays, nodes, and instances retained after teardown. Profile with the browser's existing tools before changing lifecycle ownership.

## Verification

Apply the root [browser evidence protocol](../SKILL.md#browser-evidence) before interaction checks. Then copy this checklist:

- [ ] Every interactive state opens and closes.
- [ ] Keyboard and pointer paths both work.
- [ ] After removing and remounting the owning view, no listener, timer, overlay, generated node, stale ARIA state, or instance survives destruction.
- [ ] The console shows no duplicate initialization or missing target errors.

Fix the first failure, then rerun the full list. Report checks you could not run as unavailable.
