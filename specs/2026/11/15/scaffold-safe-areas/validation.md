# Scaffold safe areas: validation

Roadmap [phase 97](../../../../roadmap.md#phase-97-keep-regions-inside-safe-areas). Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

Commands: `npm run build`, then `node --test tests/scaffold-browser.test.js`, then `npm run verify`. "Insets" means the test stylesheet with every `env(safe-area-inset-*)`, with or without a fallback, rewritten to top 40px, right 50px, bottom 20px, left 30px, and no `env(safe-area` left.

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1 | Full scaffold with insets at 1280 × 800. | Measure the bar, rail, toolbar and pane. | Bar top 40; rail left 30 and bottom 780; toolbar right 1206; pane bottom 764. Watch fail before the change. | A region's controls overlap an inset. | Pending |
| V2 | R2 | With insets at 1280 × 800: a tall-rail scaffold; a scaffold without a bar; one with a `.scaffold-rail`. | Measure the rail top, the pane top, the custom rail's left. | 40; 56; 30. Watch fail before the change. | A region that meets the top or the side sits under the inset. | Pending |
| V3 | R3 | Full scaffold with a status bar and insets at 1280 × 800. | Read the status bar's bottom padding; measure it and the rail. | Padding 20px; status bottom 800; rail bottom = status top. | The bottom inset is doubled or missing. | Pending |
| V4 | R4 | Compact scaffold with a navigation bar, toolbar and insets at 390 × 800; the same without a navigation bar. | Scroll the document by 1000px; measure the app bar's first button; read the navigation bar's bottom padding and the toolbar against it; read the root's `scroll-padding-top`; in the second, read the scaffold's bottom padding. | Button top ≥ 40; padding 20px; toolbar bottom = navigation bar top − 16 within 2px; scroll padding top 104px; bottom padding 20px. Watch the button and scroll-padding parts fail before the change. | The bar scrolls under the notch, the navigation bar's inset doubles, or focus lands under the bar. | Pending |
| V5 | R5 | Compact scaffold with insets at 390, rail expanded; then `dir="rtl"` at 700 with the rail expanded. | Read the overlay's paddings. | At 390: top 60px, bottom 36px, left 46px. Under RTL at 700: right 66px, left 16px. Watch fail before the change. | The overlay sits under the notch or home indicator, or takes the wrong side's inset. | Pending |
| V6 | R6 | The phase 88 to 96 scaffold tests (zero insets). | Run them. | All pass. | The inset rules move anything when the insets are zero. | Pending |
| V7 | R7 | After `npm run build:skill`. | Run `check:generated`, selective-builds and component-decisions; grep "viewport-fit" in the docs page and `llm.md` Scaffold section and in `scaffold.md`, and "safe-area" in a new changelog line. | Generated files current, budget and pin hold, records present. | A record is stale or missing, or the budget is exceeded. | Pending |
| V8 | R1 to R7 | Clean build. | Run `npm run verify`, `npm test --prefix mcp/expressivecss` and `npm run verify:packages`. | All pass; a known flake passes on a lone rerun. | Any check fails on rerun. | Pending |

## Human checks

| ID | Covers | Needs | Action | Expected result | Required for merge | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V9 | R1 to R5 | An iPhone with a notch and home indicator | Open a scaffold page with `viewport-fit=cover` in portrait and landscape. | No control sits under the notch or the home indicator; the inset strips show the shell or bar color. | No | Pending |

## Merge conditions

- All agent-run checks pass, with V6 as the regression check.
- The milestone pull request's required CI checks and reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent). Eleven findings, each checked against the source and fixed by revising the spec:
  - Equal left and right test insets couldn't catch a physical/logical mix-up. They are now 30 and 50.
  - V5's bottom check couldn't fail. It now reads paddings.
  - V7's grep couldn't fail. It now looks for "viewport-fit" and "safe-area".
  - The compact scroll padding left out the top inset. It is now in R4 and V4.
  - Regions meeting the top edge (no bar, tall rail with a sheet, custom regions) weren't covered. The approach is now padding on the scaffold itself, which covers every region, with the sticky bar padding its own top below 600px (R1, R2, R4).
  - The overlay side sheet and fixed toolbar weren't covered. They are excluded as overlays the scaffold doesn't place.
  - The inset-strip color claim was wrong. It now says the shell's rest color.
  - Unchecked requirements now have checks.
  - The env() rewrite gets a fallback-tolerant regex and a none-left assert.
  - The docs site's shared layout stays unchanged.
- 2026-11-15, `/code-review high --fix --max-findings all` on `dfc7648ad..HEAD`: eight findings, each checked against the source.
  - Fixed by the review:
    - A duplicate compact bar block was merged.
    - The engine-independent rewrite check moved out of the engine loop.
    - Assertions now cover the compact shell's top padding without a bar and a `.modal` overlay at 1280px.
    - A stale "arrive in later phases" note in the decision record was removed.
  - Also fixed, though the reviewer skipped them:
    - The compact top inset replaced a custom `.scaffold-bar`'s own padding even with zero insets. It now applies only to a header app bar, and the docs tell custom bars to pad themselves.
    - The overlay rail's side inset came out of its 220–360px content. The overlay now widens by the inset, with a test (310px at 390).
    - The app bar's scrolled fill left a seam against the inset strips. From 600px up the bar reaches into the top strip, and into the side strips in the default layout, with a test that its background spans 0–1280 while its content clears the insets.
  - Skipped, outside the phase: moving the insets into the rail's own `_modal-rail` would change rails outside a scaffold. The mixin's comment names the hard-coded values.
  - CSS budget 93,350. The scaffold suite passes 124 of 124.
