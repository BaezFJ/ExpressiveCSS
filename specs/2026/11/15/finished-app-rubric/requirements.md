# Finished-app rubric: requirements

- Feature: a finished-app rubric in the `expressivecss-review` quality inspector
- Date: 2026-11-15
- Roadmap phase: [Phase 77: add a finished-app rubric to the quality inspector](../../../../roadmap.md#phase-77-add-a-finished-app-rubric-to-the-quality-inspector), in the milestone "apps that feel finished". It serves the "MCP server and skill" row of the [mission](../../../../mission.md#agreed-scope), which says the skill guides loading feedback, Undo, URL state and form submission. The [technical constraints](../../../../tech-stack.md) put skill guidance under data ownership. The review skill's files are not inputs to the generated contract, but `CHANGELOG.md` is, so the changelog entry regenerates the `sourceHash` in `skills/expressivecss/references/contract.json` and `mcp/expressivecss/contract.json`.
- Branch: `feature/2026-11-15-milestone-apps-that-feel-finished` (one branch and one PR for the whole milestone)
- Base: `origin/master` at `d38f43d8e`

## Current behavior and need

`skills/expressivecss-review/agents/quality-inspector.md` checks lifecycle, assets, interaction states and WCAG 2.2. Its states check flags "async actions with no loading indicator", and nothing else about how an app behaves once a person uses it. A page that disables its submit button until every field is valid, deletes a row with no way back, or forgets the selected tab on reload passes the inspector with no finding.

The milestone measures its guidance phases (79 to 82) by rerunning three fixed prompts and counting the inspector's findings. Phase 78 records the baseline count, so this phase must give the inspector rules that produce countable, labelled findings for the four behaviors those phases teach.

## Scope

- A fifth check in the quality inspector, "Finished-app behavior", with four areas: loading feedback, destructive actions, URL state and the form submit flow.
- A label on each rubric finding, `finished-app:<area>`, so phase 78 and later phases can count findings per area.
- Severity anchors for the rubric in `skills/expressivecss-review/SKILL.md`, so the orchestrator scores the same defect the same way every run.
- A static test that keeps the rubric's labels and anchors in place.
- Two fixture pages in this spec directory, `fixtures/settings-a.html` with three defects and `fixtures/settings-b.html` without them, used by the agent-run review checks. The names and the markup don't describe the defects, so the reviewing agent isn't told the answer.
- A CHANGELOG entry.

## Exclusions

- `semantics.json` rows and lint checks. The lint checks of this milestone are phases 85 to 87.
- The MCP `quality_inspector` tool. It runs static file checks and project scripts and never reads the agent file, so it keeps its behavior.
- Guidance in the component guides that tells agents how to build these behaviors. That is phases 79 to 82.
- A minimum spinner duration or a spinner delay as a finding. The inspector cannot observe timing from source, and the milestone keeps it as guidance.
- A change to the report template. Rubric findings sit in section 4 like any other quality finding.
- A skill version bump. The release PR bumps skill versions (`443f46f16` raised `expressivecss-review` to 0.1.2).

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| The rubric lives in the inspector's agent file and the orchestrator's severity anchors, not in `semantics.json` | Decided from evidence (the roadmap's open question) | `semantics.json` rows are markup rules that the lint enforces through selectors (`enforcedRules()` in `scripts/semantics-rules.mjs`). URL state, Undo and a guarded repeat press are behaviors spread across script and markup that no selector expresses. A row the lint can't enforce would also flow into `SEMANTICS.md`, the generated skill and the MCP payloads and cost every agent reading budget. |
| Each finding carries a `finished-app:<area>` label in the inspector's rule field | Decided from evidence | The inspector's return line already has a "WCAG criterion, semantics rule ID, or -" field, and SKILL.md tells the orchestrator to cite rule IDs. A label there needs no new format and lets phase 78 count findings with a text search. |
| The four core failures are major; the typographic and wording details are polish | Decided from evidence | SKILL.md's anchors make "a missing loading, empty, or error state" major and "wrong but working" major. Each core failure leaves the app working but behaving against what people expect. A missing `…` or a placeholder that isn't an example is a detail at the polish level. The inspector proposes these severities itself, so a lone inspector run and the orchestrator agree. |
| A rubric failure that is also a WCAG failure takes the WCAG severity and keeps both IDs | Decided from evidence | A missing `autocomplete` on the user's own data fails SC 1.3.5, blocked paste in a password or code field fails SC 3.3.8, an error not tied to its field fails SC 3.3.1, and a label replaced by an unnamed spinner fails SC 4.1.2. SKILL.md already makes a certain A or AA failure critical and homes it in section 4. Writing both IDs in the rule field scores the defect once and still lets phase 78 count it, since phase 82 teaches `autocomplete` and paste. |
| One finding per control and problem; the same problem repeated on identical rows counts once | Decided from evidence | SKILL.md says "Two defects that one edit fixes count once". A delete button on every row is one fix in the row template. Different controls (a tab strip and a filter field) each need their own wiring, so each is a finding. |
| The rubric applies on a version mismatch; its notes about a component API apply only when the guidance source is known | Decided from evidence | The behavior rules don't depend on class names or markup structure, like the WCAG checks SKILL.md already keeps on a mismatch. A note such as "Tabs never writes the hash" describes one version's runtime, so it follows the version rules in SKILL.md section 2. |
| URL state covers tab, filter or search text and page, not sort | Decided from evidence | Phase 81 teaches exactly those three. A sort finding that no phase teaches would keep the phase 81 comparison from reaching zero. |
| Script-run commands only for loading feedback; native form posts are out | Decided from evidence | A native navigation submit shows the browser's own progress and leaves the page. Phase 79 and phase 83 are about command buttons whose request runs in script. Native constraint validation, which focuses the first invalid field, meets the submit-flow focus rule. |
| Static targets get `[adapt]` notes | Decided from evidence | SKILL.md scores what the target is. A template, fragment or screenshot with no app script has no deleting, fetching or URL code to judge, so the script-dependent rubric gaps there are "Before you adapt it" notes that cost nothing, as SKILL.md section 5 already does for other planned-use gaps. |
| The old "async actions with no loading indicator" clause moves into the loading area | Decided from evidence | Leaving it in the states check would report one defect under two checks. |
| The fixtures live in the spec directory with neutral names | Decided from evidence (spec review) | They exist for this phase's review checks, and phase 78 commits its own prompts and apps. Spec directories don't ship. A name such as `unfinished.html` tells the reviewing agent what to find. |
| Each fixture review runs twice | Decided from evidence (spec review) | One model run proves little about wording that phase 78 will rerun many times. Two runs per fixture catch wording that only sometimes lands without turning the check into a benchmark. |

## Requirements

- **R1** `quality-inspector.md` has a fifth check, "Finished-app behavior", that names four areas with these labels: `finished-app:loading`, `finished-app:destructive`, `finished-app:url-state` and `finished-app:submit-flow`. Each rubric finding puts its label in the rule field of the return line and proposes the severity R8 sets. An area the target can't exercise (no form, no destructive action, no tabs, filters or pages, no script-run command) is listed under CHECKED as not applicable and produces no finding. The inspector's opening line and the lens line in SKILL.md section 3 name the new check.
- **R2** Loading feedback, for commands whose request runs in script. While the request runs, the button keeps a label that names the action ("Save" or "Saving…" both pass), shows progress beside it, and a second press does not run the command again. The inspector flags a button whose label is replaced by a spinner alone or by generic text such as "Loading" or "Please wait", a command with no progress shown while it runs, and a command that a double press runs twice. An in-progress label that doesn't end in the `…` character is polish. A native navigation submit is out of scope.
- **R3** Destructive actions. An action that removes or discards something takes effect at once and offers Undo, usually as a snackbar action, and Undo restores the item in place. A confirmation dialog is for actions that can't be undone. The inspector flags a destructive action with neither Undo nor a confirmation, and an Undo that restores the item somewhere else. A confirmation dialog in front of an action that Undo could reverse is polish.
- **R4** URL state. The selected tab, the filter or search text and the page of a view live in the URL, so reload, a shared link and Back restore the view. The inspector flags each such control whose state a reload loses, or whose URL and view disagree after Back (the page pushes a history entry, with `pushState` or a hash change, and doesn't restore the view on `popstate` or `hashchange`), one finding per control. Writing with `replaceState` and restoring on load passes. The rule notes that Tabs, in the bundled version, reads `location.hash` when it starts but never writes it and doesn't listen for `hashchange`. State inside a dialog, menu or other transient surface is out of scope, and so is sort.
- **R5** Form submit flow. The inspector flags: a submit button disabled before submission starts (for example until every field is valid); fields outside a `<form>` or a form with no submit button, so Enter doesn't submit; errors shown away from their field, or a failed submit that doesn't move focus to the first invalid field (native constraint validation passes); a field that blocks paste; a missing `autocomplete` on a field for the user's own data; and a missing `name`, or a `type` or `inputmode` that gives the wrong keyboard for email, phone, number or URL input. Spellcheck left on for codes, emails or usernames, and a placeholder that isn't an example value ending in `…`, are polish.
- **R6** Counting. One finding per control and problem, and the same problem repeated on identical rows counts once. When a rubric failure is also a certain WCAG A or AA failure (SC 1.3.5, 3.3.1, 3.3.8 or 4.1.2 above), the finding takes the WCAG severity and its rule field holds both the criterion and the label. A countable finding, the unit phase 78 and later phases compare, is a confirmed finding in the final report whose rule field holds a `finished-app:` label at major or critical severity. Polish findings and Blocked items are listed but not counted.
- **R7** Evidence. Without a browser route the inspector judges from source: event handlers, `disabled` attributes, `history.pushState`, `history.replaceState`, `URLSearchParams`, `location.hash`, Snackbar calls with an `action` and `onAction`. Behavior the source can't settle, such as whether Undo restores in place, is listed as Blocked instead of reported or passed. When the target is a static template, fragment or screenshot with no app script, the script-dependent gaps (loading, Undo, URL state) are `[adapt]` notes, not findings.
- **R8** `SKILL.md` adds rubric anchors to its severity list, naming the `finished-app:` labels: the R2 to R5 core failures are major, the R6 WCAG overlaps take the WCAG anchor, and the details named as polish in R2, R3 and R5 are polish. Its merge step tells the orchestrator to keep the `finished-app:<area>` label when it writes a finding into the report, also when the WCAG rule moves the finding to section 4. Its version step says the rubric's behavior rules apply on a mismatch.
- **R9** The states check no longer flags async actions without a loading indicator; that rule lives only in the loading area, so one defect never counts under two checks. The states check keeps its loading, empty and error states for content that loads.
- **R10** `tests/expressivecss-skill.test.js` checks that the inspector names all four labels, that check 3 no longer holds the async-loading clause, and that SKILL.md holds the literal `finished-app:` text in its severity anchors, the label-keeping rule and the mismatch rule.
- **R11** `CHANGELOG.md` gets an Unreleased entry for the rubric. `npm run build:skill` runs after the last edit and regenerates the `sourceHash` in `skills/expressivecss/references/contract.json` and `mcp/expressivecss/contract.json`; `npm run check:generated` and the MCP package tests pass.

## Risks considered

- Two at once: not applicable. The phase changes agent instructions, not runtime code.
- Bad input: not applicable. No new input surface.
- Who must be refused: not applicable. The review stays read-only, and the inspector still runs none of the project's scripts.
- Readers: the MCP `quality_inspector` tool and `scripts/expressivecss-codex-adapter.mjs` use the tool name only, which doesn't change. `README.md` lists the MCP tools (line 41 names Quality Inspector) and says the review uses five specialist subagents; neither changes. `tests/expressivecss-skill.test.js` reads `SKILL.md` and asserts phrases that stay. Phase 78 reads the labels; R1 and R10 fix them.
- False positives: a rubric that flags every page would make the baseline meaningless. V3 reviews a page that meets every rule and expects no rubric finding at major or above.
- Double counting: R6 and R9 keep one defect in one place. After phase 87, the lint will also report paste blocking through the Rules Enforcer; SKILL.md's WCAG-first merge rule already homes that defect in section 4, and the kept label makes it countable once.
- Determinism: V2 and V3 run twice each with fresh subagents, and the fixture names and markup don't describe the defects.
- UI states: not applicable. No interface ships.
- `specs/checklist.md`: the project has none.
