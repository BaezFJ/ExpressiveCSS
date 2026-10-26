# Chip custom properties: validation

Date: 2026-10-26
Roadmap phase: Phase 56, name chip custom properties under `--md-comp-chip`
Branch: `fix/chip-custom-properties`
Base: `origin/master` at `a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20`
Status: all implementation acceptance results pending; no checks below have run for Phase 56

Validate [requirements.md](requirements.md) using [plan.md](plan.md), the [mission's success criteria](../../../../mission.md#success-criteria), [framework testing constraints](../../../../tech-stack.md#framework-testing), and [roadmap Phase 56](../../../../roadmap.md#phase-56-name-chip-custom-properties-under---md-comp-chip).

## Setup and coverage

Use the contributor Node version and lockfile dependencies, or the container commands in [CONTRIBUTING.md](../../../../../CONTRIBUTING.md#verify). Build before tests that read bundles. Require Chromium, Firefox, and WebKit. Run suites sequentially; missing engines and skipped required cases block acceptance. Static fixtures need no initialization. Destroy initialized Chips instances and close browser leases in `finally` blocks.

The commands use existing repository scripts and test files. Phase 56 assertions still need implementation; listing a command here does not establish a pass.

| Requirement | Planned work | Checks | Result |
| --- | --- | --- | --- |
| R1: new chip properties | Groups 1, 2 | V1, V2 | Pending |
| R2: legacy fallback and precedence | Groups 1, 2 | V1, V2 | Pending |
| R3: unchanged defaults and layout | Groups 1, 2 | V1, V2, V3, V5 | Pending |
| R4: compatible markup and behavior | Groups 1, 2 | V2, V3, V5 | Pending |
| R5: docs, deprecation, and delivery | Group 3 | V4, V5 | Pending |

## Automated checks

### V1. Full and selective compiled CSS

```sh
npm run build
node --test tests/chips-rem.test.js tests/rem-font-sizes.test.js
```

Extend the existing full/selective tests to assert that left/right padding, label size, and direct child Material Symbol size read the new property first and the corresponding legacy property second. Check default values and retained rem dimensions, block padding, gaps, and line height. Keep the existing selective recipe with icons and chips; no unrelated component may become necessary. The font-size guard must continue detecting a fixed px chip font default if default declarations move.

Before the stylesheet change, the new-property assertions must fail. After the change, both full and selective cases pass. Result: pending.

### V2. Customization matrix in all three engines

```sh
node scripts/check-browser.mjs
node --test tests/chips-rem-browser.test.js
```

Extend the existing browser fixtures. At each root size, read computed label font size, direct child icon font size, and left/right padding. Use explicit chip-local values to test the compatibility promised for old names.

| Case | Author values | Expected result |
| --- | --- | --- |
| Defaults | No sizing overrides | At 16px/32px roots, labels are 14px/28px, icons 18px/36px, horizontal padding 8px, and minimum height 32px/64px. |
| Old names only | `--padding: 12px; --font-size: 20px; --font-size-icon: 22px` | Padding 12px, label 20px, icon 22px at both roots. |
| New names only | `--md-comp-chip-padding: 13px; --md-comp-chip-label-size: 1.25rem; --md-comp-chip-icon-size: 1.5rem` | Padding 13px; label 20px/40px and icon 24px/48px. |
| Mixed controls | New padding 13px, old label 20px, new icon 1.5rem | Each independent control uses its supplied value; no default hides the old label override. |
| Both names | Old values 12px/20px/22px; new values 13px/1.25rem/1.5rem | All new values win. Removing each new value restores its corresponding old value without changing the other controls. |

Also remove all customizations and confirm default restoration. Override the label-large font-size token to `1.25rem` on the root and confirm an otherwise default chip label is 20px/40px. Do not treat syntactically invalid values as absent; CSS applies its native computed-value rules.

Exercise the applicable label/padding assertions on span, button, checkbox-label, outlined/selected, and runtime-generated chips. Include all supported direct child Material Symbol class variants for the icon control. Confirm the new icon property leaves the nested close glyph and avatar dimensions unchanged. Run the matrix against full CSS and a selective icons/chips sheet; keep runtime behavior tests on the full built bundle. Result: pending.

### V3. Existing chip, form, layout, and shadow-root regressions

After the build, run sequentially:

```sh
node --test tests/chips.test.js tests/chips-form.test.js
node --test tests/chips-form-browser.test.js tests/reflow-browser.test.js tests/shadow-dom.test.js
```

Retain the existing all-engine scaling and containment cases in V2. At 16px and 32px roots and a 320px viewport, expect long labels to wrap inside their parents with the existing insets, and the editable input and generated chips to stay inside the field. Avatar and close-button boxes, editable input typography, and default nested close glyph sizing retain Phase 53 values.

Expect existing keyboard add/remove, accessible names and focus, checkbox toggling, form values, reset, validity, disabled state, teardown, and reinitialization checks to pass. Supported shadow-only stylesheet adoption and selective styles remain intact. No static semantics check initializes a component. Result: pending.

### V4. Documentation, generated guidance, budgets, and required suites

Review `docs/src/pages/chips.astro`, `llm.md`, and `CHANGELOG.md` for all three mappings, precedence, unchanged defaults, an example using new names, and legacy deprecation without a removal date. Generated chip guidance must agree.

Regenerate before verification:

```sh
npm run build:semantics
npm run build:skill
```

Then run sequentially:

```sh
npm run verify
npm run test:browser
npm ci --prefix mcp/expressivecss
npm test --prefix mcp/expressivecss
npm run verify:packages
```

`verify` includes build, typecheck, Node tests, generated-data checks, and docs build/verification. Inspect generated changes and any affected provenance records. Regeneration alone does not renew source-review or browser evidence.

Measure base/head minified CSS using the existing gzip method in `tests/selective-builds.test.js`, including its source-map removal. Record the actual size and delta in the reviewed budget lines. No numeric increase has been approved by this specification. Keep existing selective-build tests passing and investigate unrelated bundle changes. Result: pending.

## Manual visual review

### V5. Compare rendering and obtain maintainer review

Run the documented visual comparison against the recorded base:

```sh
VISUAL_BASE=a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20 npm run test:visual
npm run test:visual:report
```

The container alternative is `VISUAL_BASE=a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20 npm run test:visual:docker`.

Require valid captures of chip variants in the docs and review the customization fixtures at 16px/32px roots, including long labels, avatars, icons, close controls, and editable fields at 320px width. Capture fixture evidence separately if the visual catalogue does not include it. Default rendering must match the base. Old/new equivalent values must render alike, and precedence examples must show the requested new values. Focus indicators and selected/outlined states stay visible.

BaezFJ must review intended visual differences and record the review in the implementation PR. A broken capture or missing review blocks merge. Screenshot differences require inspection and cannot count as a passing comparison merely because capture completed. Root-size tests do not establish real-device or native zoom behavior. Result: pending.

## Before implementation can merge

1. R1 to R5 have passing mapped checks, and V1 to V5 have recorded results with no missing required engine or skipped required case.
2. Generated files agree with their sources, selective builds pass, and the measured gzip change has a reviewed budget entry.
3. Visual captures are valid and BaezFJ's required visual review is recorded. Default and legacy customization have no unexplained rendering changes.
4. Required CI passes on an up-to-date branch, review conversations are resolved, and repository review rules are satisfied.

There are no open interview decisions. All implementation checks and merge conditions remain pending. Specification verification checks document consistency only; it does not establish implementation readiness or authorize publication.
