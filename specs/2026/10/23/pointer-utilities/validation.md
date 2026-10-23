# Validation: pointer utilities

Roadmap phase: Phase 28, pointer utilities. Requirements are in [requirements.md](requirements.md) and the work order in [plan.md](plan.md). See [roadmap Phase 28](../../../../roadmap.md#phase-28-pointer-utilities).

Tests run against built bundles, so build first with `npm run build:css`. Run suites one at a time, since parallel runs flake. Every result is pending until the feature is built.

## Automated checks

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V1 | R1, R2 | New test in the `engines` loop of `tests/helpers-browser.test.js`. A `.relative` box holds a target button and a `.pointer-events-none` overlay with `inset: 0` over it. The overlay holds a `.pointer-events-auto` button placed away from the target. | `page.mouse.click` at the target's center, then at the child's center. | The target counts one click and the overlay none from the first click. The child counts one click from the second. Without `.pointer-events-none` on the overlay, the target counts none. | Pending |
| V3 | R9 | Gzip sizes measured from the merge base and the branch. | `node --test tests/selective-builds.test.js` | A reviewed budget line names the pointer utilities with the new size and delta, and the CSS assertion passes at that size. | Pending |
| V4 | R5, R8, R10 | All edits done. | `npm run build:skill`, then `npm run check:generated` | The generator reports no drift. | Pending |
| V5 | R4, R5, R9, R10 | V4 passes. | `npm run verify` | Build, typecheck, tests, generated checks, docs build and docs verify all pass. | Pending |
| V6 | R10 | V5 passes. | `npm test --prefix mcp/expressivecss` | The MCP tests pass. `npm run verify` skips them, so they run separately. | Pending |

## Manual checks

| ID | Covers | Setup | Action | Expected result | Result |
| --- | --- | --- | --- | --- | --- |
| V2 | R1, R2, R3, R4 | `npm run build:css`. A selective build compiled with `$utilities: ("helpers")` through `src/sass/custom.scss`. | Search both outputs for the three classes. | Each class appears once, inside `@layer utilities`, with its one declaration and no `!important`. No prefixed variant such as `.medium\:pointer-events-none` exists. The user chose not to commit a cursor test, so this inspection is manual. | Pending |
| V7 | R5, R6, R7 | The docs dev server, or the `llm.md` diff. | Read the new Pointer section on the helpers page and in `llm.md`. | Both list the three classes with their declarations and show an overlay with a clickable child. Both say that `.pointer-events-none` leaves controls focusable and keyboard operable, and name `inert` or `disabled` for blocking all input. Both say that `.cursor-pointer` only changes the cursor and that a clickable non-button still needs a role, a tab stop and key handling. | Pending |

## Regression coverage

- V5 runs the existing helper, confetti and selective-build tests, which cover the rules this change sits next to.
- The new classes are opt-in. No existing markup carries them, so pages that don't add them render as before.

## Merge conditions

- V1 to V7 pass, and V1 has been seen to fail without the class.
- `npm run verify` and the MCP tests pass on the final commit.
- If Phase 25 or 26 merges first, rebase, rebuild, and redo the gzip budget line from the new merge base before re-running V3 to V6.
- Required CI passes and review conversations are resolved.
