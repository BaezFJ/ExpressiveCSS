# Undo snackbar guidance: requirements

- Feature: the snackbar and list guides tell agents to remove an item at once and offer Undo
- Date: 2026-11-15
- Roadmap phase: [Phase 80: guide destructive actions to an Undo snackbar](../../../../roadmap.md#phase-80-guide-destructive-actions-to-an-undo-snackbar), in the milestone "apps that feel finished". It depends on [phase 78](../finished-app-baseline/) and reuses the App behavior channel from [phase 79](../button-loading-guidance/). The [mission](../../../../mission.md#agreed-scope) puts app behavior tied to a component in that component's guide.
- Branch: `feature/2026-11-15-milestone-apps-that-feel-finished`
- Base: the branch at `9bc7bcb67`, after phase 79

## Current behavior and need

The snackbar guide shows an `action: 'Undo'` example with `onAction: function() { /* restore */ }` and nothing about when to use it. The lists guide says nothing about deleting rows. Both phase 78 `destructive-list` builds put `Dialogs.confirm` in front of a delete that could be undone and offered no Undo; the rubric scores that as polish, so the destructive column read 0 while neither app offered Undo. The roadmap's check is behavioral: in the rebuilt app, deleting a row removes it and offers Undo, and Undo restores the row in place.

## Scope

- `### App behavior` in the Snackbar section of `llm.md`: remove at once, Undo as the action with `replace: true`, restore in place, commit when the snackbar closes without Undo, confirmation only for actions that can't be undone, and focus handling.
- `### App behavior` in the Lists section: delete a row with Undo through the snackbar, restore it at its old position, move focus before removing the focused row, and show the empty state when the last row goes.
- The Dialogs `confirm()` example: an action that can't be undone, plus one sentence pointing a reversible removal to the Snackbar's Undo. Both phase 78 apps copied the current "Delete draft?" example.
- Tests for both guides.
- A committed browser script, `scripts/finished-app-delete-undo.mjs`, that drives delete and Undo by role and name in any `destructive-list` build.
- Two rebuilds of `destructive-list` under the phase 78 procedure, reviewed with the baseline trees, plus a Chromium check of delete and Undo on each.
- A CHANGELOG entry and regenerated files.

## Exclusions

- Framework changes to Snackbar or lists.
- The phase 78 rubric: a confirmation in front of a reversible delete stays polish.
- Loading feedback on the delete itself; phase 77's rubric judges an optimistic remove with Undo under destructive.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| The main text goes in the Snackbar guide; the Lists guide carries a short version that points to it | Decided from evidence | The Undo mechanics (`action`, `onAction`, `replace`, `completeCallback`) are Snackbar options in `src/ts/components/snackbar.ts`. The list part is where the row goes back and where focus goes. Splitting by owner keeps each guide's text about its own component, as the mission asks. |
| `replace: true` on each Undo snackbar | Decided from evidence | An action snackbar defaults to `displayLength: Infinity` and queues later ones, so a second removal's Undo waits behind the first; the phase 77 rubric calls a queued Undo polish. `replace` shows the new one at once and runs the old one's `completeCallback`, which commits the earlier removal. |
| Commit in `completeCallback` unless Undo ran, tracked by a flag | Decided from evidence | `completeCallback` runs when the snackbar closes for any reason, including after `onAction` and when replaced (`snackbar.ts`), so the handler needs to know whether Undo ran. |
| Restore by a stored order or the original next sibling, not by index | Decided from evidence | Phase 77's fixture showed an index taken after earlier removals puts rows back in the wrong order. |
| Completion is gated by a browser check; the destructive count is recorded, not gated | Decided from evidence (revised after spec review) | The roadmap's check is behavior (Undo restores in place), which the inspector sends to Blocked without a browser, and a confirmation in front of a reversible delete is only polish, so the count can't fail on its own. The script finds controls by role and name, so it works on any build, and it lives in `scripts/` so stage reruns repeat it. |
| Commit on close is the rule; reverse-on-Undo only for an API that can restore | Decided from evidence (spec review) | The prompt's API has DELETE and POST only, so a reversal would create a new id and race an in-flight DELETE. |
| No time limit on the Undo snackbar, commit on `pagehide` | Decided from evidence (spec review) | `displayLength` defaults to Infinity with an action, which suits WCAG 2.2.1, but then a removal can stay pending until the tab closes; `pagehide` with `fetch(…, { keepalive: true })` commits it. `dismissAll()` there would wait 375ms for `completeCallback`. |

## Requirements

- **R1** The Snackbar section's `### App behavior` says: for a removal people can get back, remove the item at once instead of asking first and keep its data; show a snackbar with `action: 'Undo'` and `replace: true`, and leave `displayLength` unset; in `onAction`, set an undone flag first, then put the item back where it was and focus its first control; commit in `completeCallback` unless the flag is set, and on `pagehide` commit any pending removal with `keepalive`; if the commit fails, put the item back and say so; give every other snackbar on the page `replace: true` too, which commits a pending removal; keep a confirmation dialog for actions that can't be undone. It has one JS example with no class selectors, which `docs-api.test.js` would check, and stays under 2 KB.
- **R2** The Lists section's `### App behavior` says: delete a row at once with Undo in a snackbar (pointing to the Snackbar guide); ignore the second click of a double click (`event.detail > 1`), so the row that slides up isn't deleted too; at Undo time, find the row that followed it by id, or splice the item back into the data and re-render; before removing a row that holds focus, focus the next row's control, else the previous one, else the empty state's action; show the empty state when the last row goes and hide it, and update any count, when Undo restores a row. It stays under 1 KB.
- **R3** `skills/expressivecss/components/snackbar.md` and `lists.md` carry the text after `npm run build:skill`; the snackbar guide's Syntax stays its first example.
- **R4** `tests/expressivecss-skill.test.js` checks both guides' App behavior sections for their key terms (`replace: true`, `onAction`, `completeCallback`, `pagehide`, confirmation; `event.detail`, focus, empty state), their byte caps, and that Syntax and Contract are unchanged.
- **R5** `destructive-list` is rebuilt twice under the procedure, recorded as `2026-11-15-phase-80` with apps, lens blocks, lint, `findings.json` and rows.
- **R6** `scripts/finished-app-delete-undo.mjs` runs in Chromium against each rebuilt app. It snapshots the visible row texts, presses the second visible Delete or Remove button, fails if a dialog opens or the row takes longer than 500ms to leave, presses Undo, and passes when the visible rows equal the snapshot again and still do 2 seconds later with no page error. A second sequence removes two rows in a row and records whether an Undo shows at once for the second. The gating result and the second sequence are recorded per app in `findings.json`, with the destructive count. A gating failure inside the guidance's scope leads to a revision and a repeat of both runs, up to two revisions; every run set is committed. `docs/agents/finished-app-evals.md` names the script for later `destructive-list` reruns.
- **R8** The Dialogs "Confirm from script" example asks about an action that can't be undone, and the text says a removal people can get back should use the Snackbar's Undo instead.
- **R7** CHANGELOG has an Unreleased entry; `npm run build:skill` runs last; `check:generated`, verify and the MCP smoke test pass.

## Risks considered

- Two at once: two quick removals are the queued-Undo case; R1's `replace: true` and commit-on-close cover it.
- Bad input: not applicable.
- Who must be refused: not applicable.
- Readers: the generated guides (the heading check fails the build if a subsection doesn't render), `tests/semantics.test.js` and `docs-api.test.js` read `llm.md` examples, the published `llm.md`. Neither guide is on the basic-button reading path.
- Comparison fairness: reviews keep the baseline trees; the browser check is the same script on both runs.
- UI states: empty list after the last delete (R2), restored row focus (R1, R2).
- `specs/checklist.md`: the project has none.

## Decisions made while building

- The Snackbar text also covers a removal committed on `pagehide`, so a page restored from the back/forward cache can't undo it. It replaces R1's undone flag with one pending flag that Undo, `completeCallback` and `pagehide` each clear first, so a removal is undone or committed once, and the example shows the `pagehide` listener. Run 2's review found that gap; the runs predate the revision and weren't repeated, since the count isn't the gate.
- The browser check is an npm script, `eval:finished-app-undo`, so fallow sees it as an entry and stage reruns find it.
