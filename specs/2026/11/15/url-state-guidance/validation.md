# URL state guidance: validation

Phase 81. Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1 to R3 | Built bundle. | `npm run build`, `node --test tests/data-tables-page.test.js tests/data-tables-page-browser.test.js tests/selective-builds.test.js`. | The new `showPage` tests pass after failing first, in jsdom and all three engines; the budget passes with its new line. | A case misbehaves, an event fires, a server-owned table changes, a pending request wins, or the budget fails. | Pass (2026-11-15): the four jsdom `showPage` tests failed before the method existed, then `tests/data-tables-page.test.js` passed 22 of 22; the browser case passed in Chromium, Firefox and WebKit; `tests/selective-builds.test.js` failed at 111,458 gzip bytes, then passed with the reviewed budget line. |
| V2 | R4, R5, R8 | After group 2. | `node --test tests/expressivecss-skill.test.js`, `npm run check:generated`, semantics and docs-api tests. | The guides carry both App behavior sections under 2 KB with `replaceState`, `showPage`, `sync`, `expressive:sort`, `.active` and "read the whole URL"; everything passes. | A section is missing, over its cap, or a check fails. | Pass (2026-11-15): the guide test failed once on a wording mismatch ("read the whole URL"), then the skill tests passed 48 of 48; `check:generated`, semantics and docs-api passed; the sections are 1,286 and 1,581 bytes. |
| V3 | R6 | Two fixtures and the two baseline dashboards. | Run the browser test, then the script on both baseline dashboards. | The URL-keeping fixture passes and the other fails; both baseline dashboards fail. | A fixture gives the wrong result or a baseline dashboard passes. | Pass (2026-11-15): the browser test passed both fixtures (the guidance fixture restores `?view=shipped&q=a&page=2`, the other fails); the script failed both baseline dashboards ("the view after reload differs"). |
| V4 | R7 | Two rebuilt `filtered-dashboard` apps. | Build, review, confirm, run the script. | Both rebuilds pass the script; counts are recorded; the run set is committed. | A rebuild fails the script after the allowed revisions, or a run set is missing. | Pass (2026-11-15, run set `2026-11-15-phase-81`, builds from `6b485dcd9`): both rebuilds pass the script (tab, filter and page restored after reload and in a fresh page, scroll 0, no errors) and have zero countable findings in every area. |
| V5 | R8 | Clean build. | `npm run verify`, `npm test --prefix mcp/expressivecss`. | All pass; known flakes pass alone. | Any check fails on rerun. | Pass (2026-11-15): at `0782a85ca` verify failed six tests because the npm script added after the last `build:skill` left the contract hash stale (version resolution, guide sync) plus the Firefox navigation-rail flake; after regenerating, at `3ff855827`, verify ran 3,919 tests with one failure, the docker-runner SIGINT flake, which passed alone, and the skipped steps passed (140 pages). The MCP smoke test passed. |

## Human checks

None.

## Merge conditions

All agent-run checks pass, the milestone PR's required CI checks pass, and the repository's reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent). It agreed a method is needed (no existing call reaches local page N quietly) and found gaps, all addressed: `showPage` supersedes a pending page request, keeps a canceled filter, returns the page it shows and keeps its validation in a helper; the plan adds the gzip budget line (about 30 bytes of headroom), `.fallowrc.json` `usedClassMembers`, the docs page and a three-engine browser case; the guidance prefers a query parameter per tab set over a hash (fragment scroll on shared links), restores by moving `.active` before `AutoInit()`, draws the starting tab's view itself, listens on the `.tabs` element, reads the whole URL before restoring, drops the page on sort, writes the size with the page, and keeps URL text out of markup, under a 2 KB cap; the script uses link-tab selectors and `aria-disabled`, scopes to the visible panel, never uses the first tab, checks the view changed before reloading, compares after a reload and a fresh open, fails when page 2 can't be reached, and its fixtures use the shipped `dist/`; the reviewer's possible "undocumented `showPage`" finding is dropped at confirmation; V1 no longer cites a coverage test that doesn't exist and V2 asserts phrases.
