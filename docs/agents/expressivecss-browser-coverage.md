# Critical browser coverage

The critical-flow suite runs the built framework in Chromium, Firefox and WebKit.
It uses the existing restricted consumer server and Node test runner. No framework
behavior, public exports or dependencies were added for this suite.

## Automated scope

Each engine runs two profiles: 1024px English LTR with keyboard operation, and
375px Arabic RTL with touch events and a 32px root font. Both use reduced motion.
The Arabic profile translates representative content and labels; it is not a
complete localization or font-coverage audit.

Checks cover:

- Native dialog initial focus, background-control exclusion, Escape focus return,
  and backdrop dismissal. Native Tab navigation may visit browser chrome.
- Native popover opening, Escape and focus return, separately from the
  framework's custom Menu behavior.
- Menu opening, focus return and exactly one command activation.
- Tabs switching between reachable panels.
- Native segmented radios and enhanced select values in submitted FormData.
- Three select/tooltip teardown and remount cycles, generated-node and Menu
  registry cleanup, and usable controls after each remount.
- Page overflow, configured direction and root text size, actual delivered touch
  events, browser errors and blocked resource requests.

Touch input is verified through `touchstart` observations. Firefox and WebKit
can deliver emulated taps while reporting zero `navigator.maxTouchPoints`.
Enlarging the root font checks text reflow; it does not establish native zoom
behavior. Desktop WebKit is not a real iPhone or installed Safari. See
[Playwright browser support](https://playwright.dev/docs/browsers) and
[emulation limits](https://playwright.dev/docs/emulation).

## Run and retain evidence

```sh
npm run build
npx playwright install --with-deps chromium firefox webkit
npm run test:browser:critical
```

`npm run test:browser` rebuilds JS/CSS and includes these cases alongside the
existing Chromium suites. Explicit browser commands fail if a required browser
binary is missing; launch/dependency failures also fail the test. Ordinary Node
runs may skip uninstalled browsers, so inspect skip counts.

For a single engine, require it before selecting its cases:

```sh
node scripts/check-browser.mjs firefox
EXPRESSIVECSS_TEST_BROWSER=firefox node --test tests/expressivecss-cross-browser.test.js
```

Each executed case writes a unique directory under `.cache/cross-browser/` with
`result.json`, engine version, profile, assertions reached, observed layout/focus,
and hashes of the built JS/CSS and test source. A case fails if these inputs change during its execution. Successful cases keep a page
screenshot. Failed cases retain a screenshot and Playwright trace when the page
is available. Launch failures retain their error and failed status. Set
`EXPRESSIVECSS_BROWSER_ARTIFACTS` to choose another output directory.

CI installs all three browsers and retains these artifacts for seven days even
when a test fails. The generated-data job builds first because the capability
roadmap fingerprints built inputs; missing build output cannot verify that record.
The Material roadmap's recorded run remains explicitly Chromium-scoped. These
cross-browser results do not expand an existing component parity claim.

On unsupported hosts, use the official Playwright image matching the installed
Playwright version. The local run used `mcr.microsoft.com/playwright:v1.62.1-noble`
with a read-only checkout, network disabled, and a writable artifact directory.
Firefox also ran directly on Fedora; WebKit required the container's libraries.

## Framework follow-ups repaired, September 8, 2026

The original rapid Menu reversal failure came from an uncancelled close timeout
that reset styles after reopening. Menu now cancels superseded animation and
deferred event work on open, close and destroy. Synchronous focus handlers can
also close, reopen or destroy a component; completion callbacks and ARIA updates
respect the resulting lifecycle state. Menu consumers share this repair.

The filled enhanced select's absolutely positioned label overlapped its value
when enlarged or wrapped. Its label now occupies a content-sized row above the
value, preserving leading-icon space and leaving supporting text outside the
filled surface. The fix covers the filled enhanced variant; native and outlined
selects retain their existing layouts. It does not establish native-zoom or
complete language coverage.

`tests/menu-field-browser.test.js` adds six named tests across Chromium, Firefox
and WebKit. Before the repairs, all six reproduced their respective failures.
The critical-flow suite retains its completed-transition checks; the new tests
explicitly exercise reversal, teardown, reentrant focus handlers, and multiline
LTR/RTL labels at 16px and 32px root text sizes. Label geometry checks supplement
page-overflow checks, which could not detect the original internal collision.

The operator capability collection passed 29 tests with unchanged inputs in
`.cache/material-capabilities/run-h2CtTx/report.json`. The catalogue maps the
new Chromium cases; the same test file executes equivalent Firefox and WebKit
cases. Source delta review covers only `menu.ts` and `_select.scss`; unchanged
source pins and upstream review dates are carried forward, not renewed as a full
Material audit. Independent review's prefix-spacing and reentrant-focus findings
were repaired and the six focused tests passed again.

The documentation visual comparison against the pre-fix `HEAD` captured Menu,
Select and Autocomplete at four viewport/theme combinations each. All twelve
baseline/head captures completed; eight Menu/Select snapshots changed (including
updated documentation) and four Autocomplete views were unchanged. Expected
snapshot differences are advisory, not a screenshot-equality pass. The report
is retained in `visual/report/`; native zoom and manual release checks remain
unperformed. An initial anchored page-name filter matched no tests and was
corrected before the accepted capture run.

## Manual release review

Before a framework release, and after changes affecting focus, layout, or input,
record a dated review with the reviewer, OS/device, browser/assistive-technology
versions, route and result. Keep failed or unavailable checks visible. Use the
same task sequence above in an actual consumer or serve the fixture locally.

| Review | Procedure | Current evidence |
| --- | --- | --- |
| Native browser zoom | Use the browser UI at 200% and 400%. Complete the form, open/close overlays, and follow focus. Inspect clipping and reflow; do not substitute CSS zoom, device scale or root font changes. | Not performed |
| Physical touch devices | Complete the flows on representative iOS Safari and Android Chrome devices, including orientation changes and the onscreen keyboard. | Not performed |
| Screen readers | Check names, roles, selected values, modal reading scope, updates and focus recovery with NVDA/Firefox or Chrome and VoiceOver/Safari. | Not performed |
| Visual and language review | Review translated wrapping, text clipping and actual glyph/font coverage at required product widths and text settings. | Sampled desktop/RTL screenshots reviewed; filled enhanced select overlap repaired with dedicated geometry checks. Full language review pending |

These checks complement automation; they are not a comprehensive accessibility
assessment. [W3C evaluation guidance](https://www.w3.org/WAI/test-evaluate/easy-checks/)
describes why preliminary checks alone are insufficient.

## Recorded results

The accepted matrix passed six cases on September 8, 2026 UTC, under Node
v24.18.1 in the official Ubuntu-based Playwright container. Each case completed
all seven assertion groups with unchanged input hashes.

| Engine | Version | English keyboard | Arabic RTL/touch/reflow |
| --- | --- | --- | --- |
| Chromium | 151.0.7922.34 | Pass | Pass |
| Firefox | 153.0 | Pass | Pass |
| WebKit | 26.5 | Pass | Pass |

The container manifest digest was
`sha256:c091b21d9fae78c76e85cd4356431e9b018402f172a214fc7d7a5e9a7e29d8ac`.
The tested source hashes were:

- Test: `c817489e37bda64b8e273fd60dfa885230edbf319c606efbcb690d91b7cab80d`
- Built JS: `262f9a7e9fd63d42a39ea82072142f46863d481c8d7656a64ce2d7ee5336fc97`
- Built CSS: `0ff6adc0674875bf27dd3f009a1de7ea094a15a20baa73b70e09d9797da3d38f`

The accepted run log is `.cache/cross-browser/final.log`; its artifact directories
are recorded there. The Chromium desktop and WebKit compact RTL screenshots were
visually inspected. Functional checks passed; the label overlap described above
remains a visual finding. Earlier failing trial artifacts were retained.

Full contributor verification passed 998 tests with no skips in the container,
plus typecheck, generated data, docs build and site verification. The explicit
browser command passed 29 tests with no skips. The separate skill suite passed
231 tests and 22 replay cases; MCP smoke checks passed for seven tools. The
existing Chromium capability collector passed 17 tests and its snapshots were
regenerated. CI syntax was validated with actionlint 1.7.12.

Both isolated framework/MCP package checks and the final generated-file check
passed. No framework source or stylesheet behavior changed.
No live agent benchmark or hosted CI run was performed.

## Accessibility follow-ups, September 13, 2026

The plain runtime tooltip now remains open while the pointer crosses into the bubble, dismisses on Escape without moving focus, and suppresses transition duration and translation under reduced motion. Its shared animation timer cancels interrupted exits and teardown work. Tooltip content wraps within its width; hidden bubbles retain overflow containment. Filled enhanced-select labels use font metrics to keep Arabic glyphs clear of the selected value. Version 0.10.0 includes these changes.

`tests/expressivecss-web-accessibility-browser.test.js` checks all four tooltip placements, CSS child hover persistence, keyboard dismissal, positive default versus zero reduced transition durations, interrupted exit recovery, native radio navigation, repeated status DOM updates, representative text-spacing geometry, and unobscured focused controls. Status DOM updates do not verify spoken announcements. The editor example test checks unsaved values and focus across pane boundaries.

The complete JavaScript gzip budget increases from 41,215 to 41,454 bytes for these accessibility fixes, a 239-byte increase in the supported Node 24 container. Node 22 measures 41,451 bytes. The stylesheet gzip budget increases from 49,623 to 49,649 bytes, a 26-byte increase. Node 24 measures 49,645 bytes. Selective consumer builds must still reduce all recorded transfer sizes.

Final validation used the matching Playwright container with networking disabled and an isolated source/dependency copy. `npm run verify` passed all 1,044 tests with no skips, generated checks, and documentation verification. `npm run test:browser` passed all 52 cases with no skips across Chromium 151.0.7922.34, Firefox 153.0, and WebKit 26.5. `npm run test:skill` passed 244 tests and replay evaluations on the host. Both MCP smoke checks and isolated package verification passed. The WebKit compact RTL capture was visually inspected. These results cover the named automated paths, not native zoom or screen-reader announcements.

Changed guidance and generated documentation were synchronized to RoutePlate's `.agents`, `.claude`, and MCP copies; its published runtime assets were not changed. Design/accessibility quick validation passed in every copy. Root quick validation still rejects the existing `compatibility` frontmatter key; it was preserved to avoid changing invocation metadata.

## Remaining component verification, September 13, 2026

The remaining 39 components now have requirement-level source reviews across [inputs and choices](../../skills/expressivecss/expressivecss-design/references/inputs-material-review.md), [navigation, actions and sheets](../../skills/expressivecss/expressivecss-design/references/layout-material-review.md), [content and feedback](../../skills/expressivecss/expressivecss-design/references/feedback-material-review.md), and [web navigation extensions](../../skills/expressivecss/expressivecss-design/references/web-extensions-review.md). Each identifies Google sources or the absence of a dedicated component, the web contract, and a scoped browser check or concrete verification gap. Source pins were renewed only for these 39 reviewed components. The seven earlier component reviews and three foundations retain their previous pins and correctly become stale after the source inventory changes.

Version 0.10.0 includes the repairs recorded here for autocomplete, sliders, drawer modality, snackbar timers, Lightbox controls, and reduced-motion progress. Larger gaps remain explicit, including modal calendar behavior, time-picker dial navigation, FAB expanded-state/focus behavior, progress end-stop and wavy variants, and spoken announcement delivery.

The existing web-accessibility browser suite adds 11 scenarios in each of Chromium, Firefox and WebKit. Its 33 new cases passed. Final clean-container `npm run verify` passed 1,078 tests with no skips, typecheck, generated checks, and documentation verification. The explicit `test:browser:run` command passed all 85 cases with no skips after that build. Engines were Chromium 151.0.7922.34, Firefox 153.0 and WebKit 26.5, with Node 24.18.1. `npm run test:skill` passed 245 tests and replay evaluations. Both MCP smoke checks and isolated framework/MCP package verification passed.

The capability collector forces Chromium for mapped suites, which honor the engine selector. Its clean record contains 36 passing checks and no Firefox/WebKit results. The retained raw report is `.cache/material-capabilities/remaining-2026-09-13-report.json`, SHA-256 `2a350d2d15af91570c02373930f38ff70f3bbdb70dfbc1170aaea82a56a29281`. A clean build removed obsolete chunks and correctly invalidated the earlier record; the final collection and all recorded input hashes match the clean output. Firefox and WebKit results are separate browser-run evidence, not relabelled Chromium records.

The reviewed gzip ceilings are 41,863 bytes for JavaScript and 49,675 bytes for CSS. Node 22 measured 41,860 and 49,672 bytes respectively. Selective consumer builds still reduce every recorded transfer size. Full visual-token parity, native browser zoom, real-device behavior and spoken assistive-technology output remain unverified.

Changed guidance was synchronized to RoutePlate's `.agents`, `.claude` and MCP copies with matching bytes and resolving relative links. All 18 nested-skill quick validations passed. The three root checks still reject the existing `compatibility` frontmatter key; invocation metadata was preserved. No runtime assets were installed into RoutePlate and no commit, push or publication was made.

Commit preparation repeated the 36-check Chromium collection and full 1,078-test verification using the tracked lockfile. The unrelated local lockfile edit is excluded. The commit snapshot report is `.cache/material-capabilities/commit-snapshot-report.json`, SHA-256 `bf17b490ad5c06e73a26acc5ab7e79e8d884db0af8b17ba696ba2038db4a3aab`. All checks passed with no skips; the synchronized guidance records this commit snapshot.
