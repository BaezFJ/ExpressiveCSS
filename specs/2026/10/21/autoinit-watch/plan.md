# Plan: AutoInit for markup added later

Roadmap phase: Phase 21, AutoInit for markup added later. Branch `feature/2026-10-21-autoinit-watch` from `origin/master` at `64ea7c64b`. Requirements are in [requirements.md](requirements.md) and checks in [validation.md](validation.md).

The groups run in order. Each one ends in a state that can be committed. Each group writes its failing tests first, then the code.

## 1. Watch mode and added markup

Outcome: `AutoInit(context, options, { watch: true })` starts components in markup added after the call and returns a working stop function. Calls without the third argument are unchanged.

Prerequisites: none.

- [ ] Add a `describe("AutoInit watch mode")` block to `tests/autoinit.test.js` covering V1 to V4, V8, V9 and V10. Stop each watcher and destroy instances in `finally`.
- [ ] Build with `npm run build:js`, run `node --test tests/autoinit.test.js`, and confirm only the new cases fail.
- [ ] In `src/ts/components/registry.ts`, add the third parameter and return a stop function from `AutoInit`. Create a `MutationObserver` on `context` with `{ childList: true, subtree: true }` only when `watch` is set.
- [ ] Add a helper that starts one added root in registry order: check the root itself with `matches`, then its descendants with `querySelectorAll`, apply `.no-autoinit` and `filter`, skip elements whose `component.getInstance(el)` returns an instance, and call `initElement` with the saved `AutoInit` options. Skip added nodes that are not connected.
- [ ] Add `getInstance` to the `AutoInitable` type. Keep each new function below cyclomatic complexity 5.
- [ ] Rebuild and run `tests/autoinit.test.js`, then `tests/components.test.js` and `tests/bundle.test.js`, one file at a time.

Completion check: V1 to V4 and V8 to V10 pass, and V14 regression files pass.

Covers: R1, R2, R3, R4, R6; V1, V2, V3, V4, V8, V9, V10, V14.

## 2. Destroy on removal

Outcome: removing claimed markup destroys its instances, while moved elements and `.no-autoinit` elements keep theirs.

Prerequisites: group 1.

- [ ] Add jsdom cases for V5, V6 and V7 to the watch-mode block. V5 loops over `AUTO_INIT_FIXTURES` from `tests/fixtures.js`.
- [ ] Confirm they fail against the group 1 build.
- [ ] Add a helper that, for each removed node no longer connected, walks the registry in reverse order, collects the node and its descendants that match the selector without `.no-autoinit` and pass `filter`, and calls `destroy()` on each instance `getInstance` returns.
- [ ] Rebuild and run `tests/autoinit.test.js`. If a component's `destroy()` throws on a detached element, fix it in that component and add the case to V5.

Completion check: V5 to V7 pass and group 1 checks still pass.

Covers: R5; V5, V6, V7.

## 3. Shadow roots and markup components insert

Outcome: a `ShadowRoot` works as a watched context without leaking across roots, and components that insert their own matching markup keep their instances. The roadmap's browser check passes in all three engines.

Prerequisites: group 2.

- [ ] Widen `AutoInit`'s `context` type to accept a `ShadowRoot`, and keep `document.body` as the default.
- [ ] Add jsdom cases for V11 (shadow roots) to the watch-mode block.
- [ ] Add a browser test, proposed name `tests/autoinit-watch-browser.test.js`, following `tests/menu-checkbox-browser.test.js`: one test per engine for V12 (the roadmap check) and V13 (the sweep of components that insert markup). Collect `console.error` and `pageerror` messages.
- [ ] Run `npm run build:js && npm run build:css`, then `node --test tests/autoinit-watch-browser.test.js` (command not yet run on this branch). Fix any instance the watcher replaces or destroys by mistake in the shared helpers, not per component.

Completion check: V11 to V13 pass in Chromium, Firefox and WebKit.

Covers: R7, R8; V11, V12, V13.

## 4. Docs, generated guidance and size budget

Outcome: authors can find and use watch mode, generated guidance agrees with `llm.md`, and the bundle growth is recorded.

Prerequisites: group 3.

- [ ] Add a watch-mode section to `docs/src/pages/auto-init.astro` with an example, the stop function, the added, removed and moved rules, the `.no-autoinit` rule, the shadow-root rule and the constructor-error limit. Update the Alpine section, which says AutoInit scans once, to point at watch mode. Add any new section key the page's section list needs.
- [ ] Update the JavaScript initialization section of `llm.md` by hand, and add an Unreleased Added entry to `CHANGELOG.md`.
- [ ] Add the reviewed gzip budget line in `tests/selective-builds.test.js`, measured from the merge-base build.
- [ ] Run `npm run build:skill` after the last edit, then `npm run check:generated`.
- [ ] Run `npx fallow audit --base origin/master` with `node_modules/.bin` on `PATH`.
- [ ] Run `npm run verify`, then `npm test --prefix mcp/expressivecss` and `npm run verify:packages`, one at a time.

Completion check: V15 to V18 pass.

Covers: R9, R10; V14, V15, V16, V17, V18.
