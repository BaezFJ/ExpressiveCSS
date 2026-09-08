---
name: expressivecss-runtime
description: Initialize and destroy ExpressiveCSS JavaScript components, repair remounts, and inspect interaction performance. Use for Auto Init, manual or shared runtime work; exclude CSS-only markup and token changes.
---

## ExpressiveCSS JavaScript runtime

## When to use

Use this guide for interactive components, initialization, dynamic content, remounting, teardown, or a JavaScript-backed Audit.

## Do not use when

Do not load this guide for a CSS-only Audit, static markup with no JavaScript behavior, or visual-token work. Critique does not need it unless interaction evidence is in scope.

Reuse the root version resolution and read the selected component guide. Consult [Auto Init](https://www.expressivecss.com/auto-init.html.md) or component documentation only for missing lifecycle details, conflicts, or version uncertainty.

### Choose one initialization owner

Use `AutoInit()` for registry defaults:

```js
import { AutoInit } from '@expressivecss/expressive';

AutoInit();
```

Pass a context and per-component options when needed:

```js
AutoInit(document.querySelector('#app'), {
  Tooltip: { position: 'top' },
});
```

Use manual initialization when one element needs options or lifecycle ownership outside Auto Init. Add `no-autoinit` to every manually initialized registry element.

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

AutoInit selects descendants of its context and reconstructs existing instances.
Scope it to the incoming route container to preserve persistent shell components;
initialize a component host itself explicitly when it is the supplied context.
Destroy route-owned instances before replacing HTML or navigating away. Removing
DOM alone does not dispose generated portals or shared registry entries.

Create markup before initialization. Destroy an instance before removing its mounted element or tearing down the owning view. Consult the target version's documentation for options, methods, properties, callbacks, and events missing from the selected guide.

### Runtime boundaries

- Importing the bundle installs shared document-level behaviors but does not call `AutoInit()`.
- Native dialogs use `showModal()`, `show()`, and `close()`; there is no `Modal` export.
- Snackbar, CharacterCounter, and Slider use their documented explicit/shared paths rather than the Auto Init registry.
- The registry in `src/ts/components/registry.ts` is runtime truth for the checked-out framework source. Do not copy a stale selector table from a prompt.
- Generated overlays must stay in the originating document or shadow root.

### Rules

- Initialize after markup exists and only once per element.
- Do not overwrite component state with app JavaScript when CSS or state attributes own `transform`, `opacity`, `display`, or overflow.
- Do not pre-author dynamic ARIA values that the component updates.
- Retain or recover the instance when teardown is possible.
- Treat timers, global listeners, generated nodes, and instance properties as teardown obligations.

## Runtime performance

Scope initialization to the newly mounted container. Avoid scanning the document again for each update. For a reported slowdown, record the same interaction and remount scenario before and after the change. Compare long tasks and retained listeners, timers, overlays, nodes, and instances after teardown; keep input, data, and browser settings fixed. Use the existing browser profiler before changing lifecycle ownership.

## Verification

Apply the root [browser evidence protocol](../SKILL.md#browser-evidence) before interaction checks.

Open and close every interactive state, exercise keyboard and pointer paths, remove and remount the owning view, and verify that no listener, timer, overlay, generated node, stale ARIA state, or instance survives destruction. Confirm the console reports no duplicate initialization or missing target errors.
