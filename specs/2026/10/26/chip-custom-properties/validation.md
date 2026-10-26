# Chip custom properties: validation

Date: 2026-10-26
Roadmap phase: Phase 56, name chip custom properties under `--md-comp-chip`
Branch: `fix/chip-custom-properties`
Base: `origin/master` at `a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20`
Status: feature checks and isolated reruns passed; clean required CI and maintainer visual approval pending

Validate [requirements.md](requirements.md) using [plan.md](plan.md), the [mission's success criteria](../../../../mission.md#success-criteria), [framework testing constraints](../../../../tech-stack.md#framework-testing), and [roadmap Phase 56](../../../../roadmap.md#phase-56-name-chip-custom-properties-under---md-comp-chip).

## Setup and coverage

Use the contributor Node version and lockfile dependencies, or the container commands in [CONTRIBUTING.md](../../../../../CONTRIBUTING.md#verify). Build before tests that read bundles. Require Chromium, Firefox, and WebKit. Run suites sequentially; missing engines and skipped required cases block acceptance. Static fixtures need no initialization. Destroy initialized Chips instances and close browser leases in `finally` blocks.

The commands use existing repository scripts and test files. Phase 56 assertions are implemented. Results below distinguish executed checks from pending checks.

| Requirement | Planned work | Checks | Result |
| --- | --- | --- | --- |
| R1: new chip properties | Groups 1, 2 | V1, V2 | Passed |
| R2: legacy fallback and precedence | Groups 1, 2 | V1, V2 | Passed |
| R3: unchanged defaults and layout | Groups 1, 2 | V1, V2, V3, V5 | Automated checks passed; visual review pending |
| R4: compatible markup and behavior | Groups 1, 2 | V2, V3, V5 | Automated checks passed; visual review pending |
| R5: docs, deprecation, and delivery | Group 3 | V4, V5 | Docs/packages passed; clean CI and visual approval pending |

## Automated checks

### V1. Full and selective compiled CSS

```sh
npm run build
node --test tests/chips-rem.test.js tests/rem-font-sizes.test.js
```

Extend the existing full/selective tests to assert that left/right padding, label size, and direct child Material Symbol size read the new property first and the corresponding legacy property second. Check default values and retained rem dimensions, block padding, gaps, and line height. Keep the existing selective recipe with icons and chips; no unrelated component may become necessary. The font-size guard must continue detecting a fixed px chip font default if default declarations move.

Before the stylesheet change, the new-property assertions must fail. After the change, both full and selective cases pass. Result: passed, including the unchanged font-size guard.

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

Exercise the applicable label/padding assertions on span, button, checkbox-label, outlined/selected, and runtime-generated chips. Include all supported direct child Material Symbol class variants for the icon control. Confirm the new icon property leaves the nested close glyph and avatar dimensions unchanged. Run the matrix against full CSS and a selective icons/chips sheet; keep runtime behavior tests on the full built bundle. Result: passed in Chromium, Firefox, and WebKit with no skips.

### V3. Existing chip, form, layout, and shadow-root regressions

After the build, run sequentially:

```sh
node --test tests/chips.test.js tests/chips-form.test.js
node --test tests/chips-form-browser.test.js tests/reflow-browser.test.js tests/shadow-dom.test.js
```

Retain the existing all-engine scaling and containment cases in V2. At 16px and 32px roots and a 320px viewport, expect long labels to wrap inside their parents with the existing insets, and the editable input and generated chips to stay inside the field. Avatar and close-button boxes, editable input typography, and default nested close glyph sizing retain Phase 53 values.

Expect existing keyboard add/remove, accessible names and focus, checkbox toggling, form values, reset, validity, disabled state, teardown, and reinitialization checks to pass. Supported shadow-only stylesheet adoption and selective styles remain intact. No static semantics check initializes a component. Result: passed, including the existing all-engine chip/form and layout checks.

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

Measure base/head minified CSS using the existing gzip method in `tests/selective-builds.test.js`, including its source-map removal. Record the actual size and delta in the reviewed budget lines. No numeric increase has been approved by this specification. Keep existing selective-build tests passing and investigate unrelated bundle changes. Result: generated-data, docs, MCP, package, and selective-build checks passed. The broad contributor/browser commands reported unrelated failures; all matched isolated reruns passed. Clean required CI remains a merge condition.

## Manual visual review

### V5. Compare rendering and obtain maintainer review

Run the documented visual comparison against the recorded base:

```sh
VISUAL_BASE=a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20 npm run test:visual
npm run test:visual:report
```

The container alternative is `VISUAL_BASE=a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20 npm run test:visual:docker`.

Require valid captures of chip variants in the docs and review the customization fixtures at 16px/32px roots, including long labels, avatars, icons, close controls, and editable fields at 320px width. Capture fixture evidence separately if the visual catalogue does not include it. Default rendering must match the base. Old/new equivalent values must render alike, and precedence examples must show the requested new values. Focus indicators and selected/outlined states stay visible.

BaezFJ must review intended visual differences and record the review in the implementation PR. A broken capture or missing review blocks merge. Screenshot differences require inspection and cannot count as a passing comparison merely because capture completed. Root-size tests do not establish real-device or native zoom behavior. Result: four stable base/head comparisons captured documentation layout differences. Narrow fixture style/bounds checks passed at both root sizes. Agent inspection completed; BaezFJ visual approval remains pending.

## Before implementation can merge

1. R1 to R5 have passing mapped checks, and V1 to V5 have recorded results with no missing required engine or skipped required case.
2. Generated files agree with their sources, selective builds pass, and the measured gzip change has a reviewed budget entry.
3. Visual captures are valid and BaezFJ's required visual review is recorded. Default and legacy customization have no unexplained rendering changes.
4. Required CI passes on an up-to-date branch, review conversations are resolved, and repository review rules are satisfied.

There are no open interview decisions. Feature implementation and the recorded local checks are complete. The broad runs were not clean passes; clean required CI and BaezFJ visual approval remain pending before merge. Nothing in this record authorizes publication.


## Execution evidence on 2026-10-26

The implementation request invoked `incremental-implementation` after the specification interview. The specification was committed as `fd75f4a00`; the shared CSS, regressions, and gzip budget were committed as `b1ab53ebb`. The four CSS reads use new-name-first fallback chains while the legacy defaults remain unchanged. No runtime or dependency code changed.

| Run | Result | Evidence |
| --- | --- | --- |
| Corrected pre-change regression run | 10 passed, 5 expected failures, no skips. New-name reads failed in both compiled sheets and in each browser engine; existing behavior passed. | `.cache/chip-properties-red.log` |
| Post-change compiled styles and chip browser matrix | 15 passed, no failures or skips | `.cache/chip-properties-green.log` |
| Existing chip/form Node regressions | 32 passed, no failures or skips | Same green log |
| Existing form/browser, reflow, and shadow-root regressions | 41 passed, no failures or skips | Same green log |
| Selective consumer builds and gzip budgets | 4 passed, no failures or skips | `.cache/chip-properties-selective.log` |

The focused passing run exported reports to `.cache/container-tests/expressivecss-007e4c61-5858-4d00-b1e5-68504fd34906/`. The selective run exported to `.cache/container-tests/expressivecss-a2b24033-0594-41ec-b28d-17ca56338b33/`.

Minified CSS gzip measured 90,045 bytes at the pinned base and 90,064 bytes after implementation, a 19-byte increase. The base measurement temporarily substituted only the base `_chips.scss` inside the isolated container and restored the head file in `finally`. No other Sass file differs. The budget records 90,064 bytes.

Both generators ran from their source documents. Review confirmed all 98 unrelated component guides differ only in contract hash, and the chip guide retains the new property policy and canonical chip markup examples. The generator keeps only three opening prose paragraphs and the first code example, so the Chips source orders its policy and sizing prose within that limit. No generator logic or capability review pins changed. Generation does not renew review or browser evidence.

The shared skill's referenced `/home/javier/.agents/references/definition-of-done.md` is unavailable. This implementation uses the repository's documented contributor and merge checks instead.


The broad Docker run used the final documentation and generated guidance. Its results are not clean passes:

| Command | Result |
| --- | --- |
| `npm run verify` | 3,201 passed, 3 failed, 6 skipped out of 3,210 tests. Build and typecheck passed. The failed test step prevented this command from reaching generated-data and docs checks. |
| `npm run test:browser` | 1,525 passed, 1 failed, 2 cancelled by timeouts, 6 skipped out of 1,534 tests. All new chip cases passed again in every engine. |
| `npm test --prefix mcp/expressivecss` | Passed, including 8 tools, resources, completion, and response-budget checks. |
| `npm run verify:packages` | Both framework and MCP packages passed in isolated consumers. |

The broad run log is `.cache/chip-properties-verify-final.log`; exported reports are in `.cache/container-tests/expressivecss-0a31b065-7cfa-4aa8-9a4f-50a59ae9be2e/`. Counts from the contributor and browser commands overlap.

Contributor failures were Chromium confetti at `tests/confetti-browser.test.js:92`, where the animation result was already absent; the adapter output-limit test at `tests/expressivecss-codex-adapter.test.js:183`, where its 3-second timeout preceded the expected output-limit error; and Firefox hover-card timing at `tests/hover-card-browser.test.js:49`, where the card had already opened. The separate browser run reported a 60-second Chromium deferred-row focus timeout, a 30-second Firefox keypad timeout, and a Chromium swipe-settling timeout. These files and their component implementations are unchanged by Phase 56. All 16 matched cases passed serial focused reruns with no skips, as recorded below. The remaining contributor checks also passed separately. These reruns do not change the original broad commands' nonzero results.

Each broad command skipped three optional evaluation-SDK checks and three Firefox map checks that need unavailable WebGL2. No Phase 56 chip check was skipped. These skips do not establish support for the skipped environments.


## Follow-up checks and visual evidence

The follow-up log is `.cache/chip-properties-followup.log`. It records a successful build, browser-presence check, and this serial rerun:

```sh
node --test --test-concurrency=1 --test-name-pattern='confetti bursts|oversized streams and guide sets|hovering the link shows|a focus ring in a deferred row|keypad and keyboard type|a vertical drag, a mouse drag' tests/confetti-browser.test.js tests/expressivecss-codex-adapter.test.js tests/hover-card-browser.test.js tests/defer-render-browser.test.js tests/keypad-browser.test.js tests/swipe-actions-browser.test.js
```

All 16 cases passed, with no failures, cancellations, or skips. `npm run check:generated`, `npm run docs:build:astro`, and `npm run docs:verify` passed afterward. Docs verification confirmed 136 pages, 11 aliases, 119 Markdown counterparts, assets, and LLM documents.

The same run compared the Chips page against `a5f90c850` using `VISUAL_BASE=a5f90c8506d23fd7f5a55f18aaf59f9aadd8df20 npm run test:visual -- --grep chips --workers 2`. All four base captures passed. Head captures were stable at compact, expanded, large, and large-dark, and all four comparisons flagged differences after the documentation and customization example changed the page layout. The visual command exited 1; this is not a passing visual comparison or maintainer approval.

Open the retained report at `.cache/container-tests/expressivecss-e7a5a586-a8a8-45ee-9df4-f19fc0fd3e69/report/index.html`. Its `results/` sibling contains actual, expected, and diff PNGs for each variant.

Final narrow review fixtures are in `.cache/container-tests/expressivecss-749cb535-5ece-42e9-8c18-83e740f9e36b/cross-browser/chip-properties-preview/`, with `root-16.png`, `root-32.png`, and the fixture HTML/assets. The final capture log is `.cache/chip-properties-capture.log`. These replace the earlier fixture captures, which used an invalid image placeholder. The final capture checks image loading, equal computed sizing and bounds for equivalent old/new/both-name examples, and absence of horizontal page overflow at a 320px viewport. All assertions passed at 16px and 32px roots. Components and browser resources close in `finally` blocks.

Agent image inspection covered the compact docs capture and the final 32px-root fixture. The latter shows equal old/new/precedence chips, wrapped labels, and contained editable content. This inspection does not supply BaezFJ's required visual approval. The collaborative preview had twice returned `Preview automation snapshot timed out after 15000ms.`; the repository Playwright workflow supplied the retained captures instead.

No push, PR, merge, release, or roadmap completion change was made. Clean required CI and maintainer visual approval remain required before merging.
