# Consumer runtime integration findings

This check exercises the shipped bundle in a real Chromium page using the existing
consumer fixture server. It covers a persistent navigation rail, route-local
FormSelect and Tooltip instances, six route replacements with `history.pushState`,
and a fresh Node process without DOM shims. It does not establish compatibility
with every router, rendering framework, browser engine, or component.

## Verified ownership behavior

- Destroying route-local components before replacing their DOM releases generated
  select inputs, option menus, tooltip surfaces, and the select's Menu registry
  entry. The native select regains its label association and tab order.
- `AutoInit(routeContainer)` preserves the navigation rail outside that container.
  Each replacement supports selecting a new native form value through the
  generated control. The shell toggle still works after six replacements.
- `AutoInit(document.body)` reconstructs existing components. It is not an
  initialize-once operation. Use the narrowest containing element to preserve
  shell instances and their application-owned references. The context's
  descendants are selected; initialize the context itself explicitly if it is
  the component being mounted.
- The negative control removes a mounted route without teardown. The observer
  detects one retained Menu registry entry and one tooltip surface with a detached
  trigger. Explicit cleanup removes both. This is a resource observation, not a
  heap-size or garbage-collection measurement.

## Defects reproduced and repaired

| Trigger | Before | Repair and verification |
| --- | --- | --- |
| Destroy Tooltip with pending work | Delayed entry retained one timer and left `isOpen` true after the surface was removed. The source also left exit and animation timeouts uncancelled. | Track the animation timeout and cancel entry, exit, and animation timers in `destroy`; reset open/hover/focus state. Browser checks cover all four pending phases and require zero retained timers. |
| Call AutoInit again on an enhanced select | The Menu registry grew from one to two entries. Generic Menu initialization replaced the generated input's Menu before FormSelect could dispose its owned instance. | Mark the generated input `.no-autoinit`, using the existing ownership contract. FormSelect still initializes its Menu directly. Repeated initialization retains one entry and normal teardown releases it. |

The other direct Menu owner, Autocomplete, initializes the author-provided input
and does not generate a `.menu-trigger`. Datepicker uses FormSelect, so its
generated Menu triggers receive the same ownership fix. No new public API,
package export, or dependency is needed for these repairs.

## Server rendering boundary

Importing the ESM bundle in a fresh Node process succeeds. `Utils.onDocumentReady`
already skips document behavior setup when `document` is absent. Calling
`AutoInit()` in that process raises `ReferenceError: document is not defined`, as
expected for DOM initialization. This probe does not test framework-specific
hydration or importing first on a server and later adding a DOM to that same
process. It provides no evidence that a separate SSR entry point is needed.

## Current integration guidance

Keep a component owner for each mounted route. Destroy its instances before DOM
replacement, including any timers or application listeners owned by the route.
Initialize the incoming subtree after insertion. Keep persistent navigation
outside that subtree. Do not rely on removing DOM nodes to dispose resources.

The bundle also installs document behaviors on import. This work does not add a
bundle-wide disposer, automatically observe removed elements, or guarantee that
all document behaviors can be restarted without duplication. Those are separate
API decisions that need additional consumer evidence.

## Reproduce

```sh
npm run build:js
node --test tests/expressivecss-lifecycle-browser.test.js
```

The focused run passed four tests with Chromium installed: route replacement,
the missing-teardown negative control, Tooltip timers, and the Node import probe.
The browser cases use the repository's existing skip convention when Chromium is
absent; `npm run test:browser` requires Chromium and includes this file.

These checks do not measure performance, audit accessibility, exercise actual
back/forward cache restoration, or claim full SSR integration coverage.

## Consumer verification delivery

The skill now carries a generated, portable browser scenario runner. Its shared
network boundary and bounded file reader are reused by the existing evaluator;
the evaluator's provenance also fingerprints these extracted sources. The fixture
browser retains its narrower asset-path policy. No browser dependency was added.

Use `npm run verify:consumer -- --project-root <app> --scenario <checks.json>
--origin http://127.0.0.1:<port>` in this checkout, or the skill-relative command in
the [consumer verification guide](../../skills/expressivecss/references/consumer-verification.md).
MCP can invoke the same consumer-owned package script through the existing command
allowlist with `runType: "consumer"`. Project stdout is not promoted to trusted
browser evidence, and the MCP does not claim a complete interface review.

The runner keeps per-case results, source/scenario/tool hashes, browser settings,
and screenshots. Fresh contexts isolate cases, failed cases do not discard later
results, changing declared inputs blocks a pass, and no-op save behavior fails its
completion assertion. Regression checks cover unavailable tooling, invalid
scenarios, mutation denial and explicit opt-in, oversized page captures, and a
declared file named `__proto__` whose hash must remain observable.

An operator demonstration used the existing settings example at 375, 768, and
1280 pixels, with explicit light/dark selection and keyboard submission. A
deliberately disabled save confirmation failed all three completion checks; the
restored application passed the identical three scenarios. Initial trial scenarios
incorrectly clicked visually hidden native inputs and failed before saving.
The corrected scenario clicks the visible label and asserts the native state.
Both unsuccessful trial artifacts and the corrected runs remain under
`.cache/consumer-verification/`; `outcomes.json` identifies the final pair.
The compact and expanded final captures were visually inspected.

This demonstrates the portable runner's detection and repair-check workflow, not
an old/new model benchmark, a speed improvement, or autonomous design approval.
The current network policy requires same-origin local assets and preview serving
or disabled HMR. More complex task assertions and retained-resource measurements
continue to use application tests, including the lifecycle tests above.

Final verification passed `npm run verify` with 989 tests and no skips, the
separate skill suite with 228 tests plus 22 replay cases, and
`npm run test:browser:run` with 23 tests against those built bundles. MCP protocol
smoke and both isolated package checks passed. Generated files were refreshed
through `build:semantics` and `build:skill`; the basic-button reading budget still
passes. No new dependencies or public framework APIs were introduced.
