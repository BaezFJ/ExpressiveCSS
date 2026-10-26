# Size chips in rem: validation

Date: 2026-10-26
Roadmap phase: Phase 53, size chips in rem
Branch: `fix/chips-rem`
Base: `origin/master` at `e2481457f17e11ea6351616899ec8fd319aba35e`
Status: automated behavior and package checks passed; visual differences captured; maintainer approval pending

This checks [requirements.md](requirements.md) and the work in [plan.md](plan.md), under the [mission](../../../../mission.md#success-criteria), [framework testing constraints](../../../../tech-stack.md#framework-testing), and [roadmap Phase 53](../../../../roadmap.md#phase-53-size-chips-in-rem).

## Setup

Use the contributor Node version and installed lockfile dependencies, or the container workflow in [CONTRIBUTING.md](../../../../../CONTRIBUTING.md#verify). Build the framework before running bundle-reading tests. Require Chromium, Firefox, and WebKit for acceptance. Use `tests/browser.js` to lease browsers and release them in `finally` blocks. Destroy initialized Chips instances and timers in `finally` blocks; static fixtures never need initialization.

The test files `tests/chips-rem.test.js` and `tests/chips-rem-browser.test.js` are implemented. Commands below describe the checks; dated execution evidence appears at the end. Execute test suites sequentially.

## Requirement coverage

| Requirement | Planned work | Acceptance checks | Result |
| --- | --- | --- | --- |
| R1: label-large font-size token | Groups 1, 2 | V1, V2 | Passed |
| R2: rem dimensions | Groups 1, 2 | V1, V2 | Passed |
| R3: wrapping and containment | Groups 1, 2 | V3, V6 | Automated checks passed; visual approval pending |
| R4: compatibility and behavior | Groups 1, 2 | V2, V4, V6 | Automated checks passed; visual approval pending |
| R5: coverage, docs, and delivery | Groups 1, 3 | V1, V5, V6 | Automated checks passed; visual approval pending |

## Automated checks

### V1. Source guard and compiled styles

After `npm run build`, run:

```sh
node --test tests/rem-font-sizes.test.js tests/chips-rem.test.js
```

Expect no chips exemption and no px font-size or font shorthand under components or abstracts outside `rem()`. Check chip font-size custom-property defaults explicitly, including the label token reference and rem icon default. Assert R2's rem declarations, retained px spacing, and existing selectors in the built stylesheet using `tests/css.js`. The test must fail if a chip font default reverts to px. Result: passed; the guard and both compiled-style tests failed before the conversion and pass afterward.

### V2. Default dimensions and customization in all engines

After the build, run:

```sh
node scripts/check-browser.mjs
node --test tests/chips-rem-browser.test.js
```

Set `document.documentElement.style.fontSize` to 16px and 32px in turn. Use short static span/button chips, a checkbox-label chip, an outlined chip, a chip with a direct child icon, an avatar, and an initialized editable Chips field. Read computed styles and element bounds. Expect every R1/R2 value, including the nested close icon's 20px/40px default from the shared button rule. Compare computed minimum height separately from actual height, since wrapped chips may grow.

Override `--md-sys-typescale-label-large-font-size` and expect the default chip label to follow it. Then give a chip explicit `--font-size: 20px`, `--font-size-icon: 22px`, and `--padding: 12px`; expect those values at both root sizes. Overrides must be applied to the chip, where its existing defaults are declared. Result: passed in Chromium, Firefox, and WebKit.

### V3. Wrapping and editable input containment

Use the V2 command and browser file. At both root sizes, exercise long labels with spaces and an unbroken word, static and generated avatar/close variants, and an initialized named-input field in a 320px viewport. Include a 140px parent for the static long-label regression already represented in `tests/reflow-browser.test.js`.

Expect short default chips to be 32px/64px high. Long labels wrap inside their parent and retain at least 4px above and below the lines. Images, icon glyph boxes, and close buttons fit without overlapping the label. The editable input's line box fits its height; its bounds and generated chip bounds stay within the chips field, including the `expressive-chips-control` wrapper. Adding a long chip leaves the input usable on a following flex line. Allow at most 1px for fractional layout bounds, but assert computed font sizes and default dimension values directly. Result: passed in Chromium, Firefox, and WebKit.

### V4. Existing behavior, accessibility, and layout regressions

After the build, run these sequentially:

```sh
node --test tests/chips.test.js tests/chips-form.test.js
node --test tests/chips-form-browser.test.js tests/reflow-browser.test.js
```

Expect existing tests to pass, including the short chip's 32px height and long-label inset at the default root. In the V2/V3 initialized fixture at a 32px root, also type and add a chip, focus and activate its named close button by keyboard, and confirm the remaining form values. Check checkbox-label toggling and its visible focus state. Preserve existing reset, validity, disabled, autocomplete, teardown, and reinitialization behavior through the established tests. No static semantics check may initialize a component. Result: passed in the focused runs and full contributor check.

### V5. Docs, generated guidance, budgets, and required suites

After final edits and regeneration, run the following suites sequentially:

```sh
npm run verify
npm run test:browser
npm ci --prefix mcp/expressivecss
npm test --prefix mcp/expressivecss
npm run verify:packages
```

`verify` includes the build, typecheck, Node tests, generated-file checks, and docs checks. The explicit browser command must complete with all required engines present. Inspect generated diffs for current source provenance and accurate chip guidance. Do not claim generation renewed capability review evidence.

Expect docs and `llm.md` to describe the rem defaults and px spacing accurately, and the changelog to identify the larger-font behavior change. Measure minified CSS gzip with the existing size logic in `tests/selective-builds.test.js`, which `verify` runs. The recorded base CSS budget is 90,074 gzip bytes; confirm the measured base rather than assume the budget is the measurement. Record the implementation's actual size and delta without inventing a permitted increase. Existing selective Sass builds must retain the rules they need. Result: passed. Measured CSS gzip decreased from 90,074 to 90,071 bytes, a 3-byte reduction, and the budget records 90,071. Both package consumers passed.

## Visual review

### V6. Compare rendering and record required review

Run `npm run test:visual`, then open its report with `npm run test:visual:report`, or use the documented container visual workflow. A valid comparison must compare the implementation with its base; a broken capture is a failed prerequisite.

Review chip variants in the docs at a 16px root and the V2/V3 fixture at a 32px root, including long labels, images, leading icons, close controls, and the editable field at 320px width. Capture any fixture evidence needed beyond the existing visual catalogue. Expect the default rendering to match the base, larger-root content to remain readable and contained, and focus indicators and selected/outlined states to remain visible. BaezFJ must review intended visual changes and record the review in the implementation PR, as CONTRIBUTING.md requires.

An additional manual browser-settings or native zoom check was not selected. Automated root-size changes establish only their stated layout assertions. Result: stable base and head captures completed for compact, expanded, large, and large-dark. All four comparisons flagged differences after the docs explanation changed the page layout. The comparison command exited 1 for these screenshot differences; this is not a passing visual check. Maintainer visual approval remains pending.

## Before implementation can merge

1. R1 to R5 pass their mapped checks; V1 to V6 have recorded results. A missing engine, skipped required case, broken capture, or unresolved regression blocks merge.
2. Generated guidance agrees with its sources, selective builds pass, and the actual gzip change has a reviewed budget entry.
3. Required CI passes on an up-to-date branch, review conversations are resolved, and the repository's approval rules and visual review requirement are satisfied.

There are no deferred interview decisions. Visual approval and the repository PR/CI merge conditions remain pending. Local implementation and passing checks do not authorize publication.


## Execution evidence on 2026-10-26

The implementation is committed in `c41796e74` after the specification commit `474eb38ca`. Browser testing corrected the initial close-glyph assumption in R2: the full sheet already uses the shared button icon size of 20px, which becomes 40px at a doubled root. Its box scales from 24px to 48px. No glyph override or runtime change was added.

| Check | Observed result |
| --- | --- |
| Existing focused baseline | 64 passed, none failed or skipped |
| New static regressions before conversion | All three failed on the fixed defaults |
| Focused static, chip, and selective-build checks after conversion | 39 passed, none failed or skipped |
| New chip browser checks | Nine passed across Chromium, Firefox, and WebKit, none skipped |
| `npm run verify` in Docker | Build, typecheck, generated guidance and docs checks passed; 3,201 tests passed, none failed, six skipped |
| `npm run test:browser` in Docker | 1,525 passed, none failed, six skipped; all three engines available |
| MCP smoke tests and `npm run verify:packages` | Passed, including both isolated package consumers |
| CSS gzip, measured with the existing size helper | Base 90,074 bytes; implementation 90,071 bytes; delta -3 bytes |

The full verification command ran sequentially for 540.15 seconds. Its log is [chips-rem-verify.log](../../../../../.cache/chips-rem-verify.log), and reports are under `.cache/container-tests/expressivecss-cb8842ca-ea90-4bdc-b9e3-d83da7768829/`. Test counts overlap because the explicit browser command repeats browser checks included in `verify`.

The six skips in each full run are three optional evaluation SDK checks and three Firefox map checks requiring unavailable WebGL2. No new chip check was skipped. The MCP dependency installation reported one moderate and one high audit finding in unchanged locked dependencies; this task did not update dependencies.

The static docs build and collaborative-browser inspection confirmed 14px/32px label/minimum-height defaults at a 16px root and 28px/64px defaults at a 32px root. A separate 320px-wide fixture using the built stylesheet and runtime showed wrapped labels, avatars, leading icons, a named removal button, and a contained editable input with a 32px font and 64px height. The local enlarged-fixture capture is `/home/javier/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvp4ar9w-637b2988.png`. This inspection does not replace BaezFJ's required visual approval.


The scoped visual command was `VISUAL_BASE=e2481457f17e11ea6351616899ec8fd319aba35e npm run test:visual:docker -- --grep chips --workers 2`. It ran for 93.03 seconds, captured all four baseline cases, and retained expected, actual, and diff images for all four head cases. For example, the compact page changed from 375 by 11,255 pixels to 375 by 11,535 pixels. Open the [visual comparison report](../../../../../.cache/container-tests/expressivecss-518a5e1e-8482-4304-9fc6-57724349128c/report/index.html). The command's log is [chips-rem-visual.log](../../../../../.cache/chips-rem-visual.log). These are captured differences for review, not approved baselines. No implementation PR, CI result, maintainer approval, push, or publication is claimed.
