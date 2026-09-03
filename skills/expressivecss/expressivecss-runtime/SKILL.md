---
name: expressivecss-runtime
description: Initialize and destroy ExpressiveCSS components.
---

## ExpressiveCSS JavaScript runtime

## When to use

Use this guide for interactive components, initialization, dynamic content, remounting, teardown, or a JavaScript-backed Audit.

## Do not use when

Do not load this guide for a CSS-only Audit, static markup with no JavaScript behavior, or visual-token work. Critique does not need it unless interaction evidence is in scope.

Read [Auto Init](https://www.expressivecss.com/auto-init.html.md) and the selected component guide before writing initialization code.

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

Create markup before initialization. Destroy an instance before removing its mounted element or tearing down the owning view. Re-read the target version's component documentation for exact options, methods, properties, callbacks, and events.

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

## Verification

Open and close every interactive state, exercise keyboard and pointer paths, remove and remount the owning view, and verify that no listener, timer, overlay, generated node, stale ARIA state, or instance survives destruction. Confirm the console reports no duplicate initialization or missing target errors.
