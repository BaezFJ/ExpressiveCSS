# Finished-app baseline: requirements

- Feature: a recorded baseline of finished-app findings from three fixed prompts
- Date: 2026-11-15
- Roadmap phase: [Phase 78: record a finished-app baseline from three fixed prompts](../../../../roadmap.md#phase-78-record-a-finished-app-baseline-from-three-fixed-prompts), in the milestone "apps that feel finished". It depends on [phase 77](../finished-app-rubric/), built earlier on this branch. It serves the "MCP server and skill" row of the [mission](../../../../mission.md#agreed-scope). The [technical constraints](../../../../tech-stack.md) are unaffected: the phase adds evaluation records and changes no framework, skill or generated source.
- Branch: `feature/2026-11-15-milestone-apps-that-feel-finished` (one branch and one PR for the whole milestone)
- Base: the branch at `8746e9ba0`, after phase 77

## Current behavior and need

Phase 77 gave the quality inspector a finished-app rubric whose findings carry `finished-app:<area>` labels, and SKILL.md section 6 defines the countable finding: a confirmed major or critical finding with a label. Nothing yet records how often apps built with the current skill fail the rubric. Phases 79 to 82 change the guidance and must show a drop, and phases 82, 84 and 87 rerun all three prompts at the end of each stage. They need fixed prompts, a fixed procedure and a committed starting count.

## Scope

- Three fixed prompts: a settings form, a list with destructive delete, and a filtered dashboard.
- A written procedure that fixes the build and review commands, what each run can see, the briefs, the confirmation rule and the counting rule, so a later phase repeats it exactly.
- Two builds per prompt with the current skill, each reviewed once with the quality inspector lens.
- The six apps, each review's raw lens block and lint output, the countable findings per app and area, provenance hashes, and a results table, committed under `docs/agents/`.

## Exclusions

- Changes to the skill, the rubric, the framework or the MCP server.
- A scripted harness or a test that reruns the prompts. `scripts/benchmark-expressivecss-skill.mjs` drives the Codex CLI against fixture graders (an implementation benchmark by default, assistance cost as a mode); this phase needs a rubric count, and its reruns happen inside this milestone's later phases.
- Browser-rendered review. Rendered checks (contrast, target size) are outside the rubric. Rubric questions the source can't settle, such as whether Undo restores a row in place, stay Blocked and aren't counted, as the inspector already says.
- Raw transcripts. CONTRIBUTING keeps those out of the checkout. The lens block is the review's output, not a transcript.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| Builds and reviews run as headless Claude Code processes: `claude -p --safe-mode --strict-mcp-config --model claude-opus-5-5 --no-session-persistence --output-format json`, started inside a scratch directory | Decided from evidence (the roadmap's open question, revised after spec review) | A subagent of this session inherits its hooks, its user-level skill copies (the user-level `expressivecss` skill is 0.13.0, the branch has 0.14.0) and its MCP servers. `--safe-mode` turns off CLAUDE.md, skills, plugins, hooks and MCP servers while keeping auth and model selection; a probe on 2026-11-15 with Claude Code 2.1.325 saw only built-in skills and no MCP tools. The full model ID pins the model, and the JSON output records the models used. |
| Two builds per prompt | Decided from evidence (the roadmap's open question) | One build per prompt shows no spread at all. Three or more multiply every later rerun: phases 79 to 82 each rebuild one prompt, and phases 82, 84 and 87 rebuild all three. Two builds show whether a result repeats at a third less cost than three. |
| Each build's directory holds a copy of the built `dist/` and a copy of `skills/expressivecss` as `expressivecss/`, and the brief tells the agent to read `expressivecss/SKILL.md` | Decided from evidence | "With the current skill" means the skill on this branch. A consumer has the package and the skill, not this repository's docs or tests. |
| Reviews use the skill trees from the baseline commit in every later comparison | Decided from evidence (spec review) | The inspector reads the base skill's guides, which phases 79 to 82 change. A reviewer that read newer guides would move the count for reasons other than the apps. Later phases export the recorded commit's `skills/` with `git archive` for the reviewer and give builders the current skill. |
| A reviewer gets a directory with only the app, its lint output and those skill trees, and may only read | Decided from evidence (spec review) | It must not see the sibling apps, `findings.json` or the evals doc, where earlier counts sit. `--allowedTools Read Glob Grep` keeps it read-only. |
| Each labelled finding is confirmed mechanically, and the final severity comes from SKILL.md section 5 | Decided from evidence | SKILL.md section 4 makes a specialist's finding a lead until confirmed, and section 5 has the orchestrator set severity from the anchors. A fixed rule keeps the confirmer from leaning toward a hoped-for result. The confirmer adds no findings of its own. |
| Records live in `docs/agents/finished-app-evals.md` and `docs/agents/evidence/finished-app/2026-11-15-baseline/` | Decided from evidence | CONTRIBUTING allows compact evaluation records with settings, hashes and named checks in `docs/agents/evidence/`, and the other evaluation write-ups sit in `docs/agents/`. Later phases add a dated directory and rows to the same table. |
| Prompts name controls, fields, data and a stand-in request, never a behavior the rubric checks | Decided from evidence | The baseline measures what agents do unprompted. The prompts still have to give every area something to judge, so they name a Save button, specific fields, a delete request and enough rows to page. |

## Requirements

- **R1** `docs/agents/finished-app-evals.md` holds the three prompts verbatim with IDs `settings-form`, `destructive-list` and `filtered-dashboard`:
  - `settings-form` asks for a form with display name, email, phone and website fields and a Save button that sends the form to a named endpoint, with a stand-in request that takes a fixed time and can fail. Loading feedback and the submit flow apply.
  - `destructive-list` asks for a list of five saved addresses, each with a delete action that calls a named endpoint through the same kind of stand-in, plus a way to add one. Destructive actions apply, and loading feedback may.
  - `filtered-dashboard` asks for tabs for three order states, a text filter and pages of 10 rows over 40 sample orders. URL state applies.
  - No prompt and not the shared build brief contains these words: Undo, URL, history, loading, spinner, progress, disabled, autocomplete, inputmode, paste, focus, confirm.
- **R2** The same file states the procedure: both commands in full with their flags, the scratch directory layout for builds and reviews, the build brief and the reviewer brief verbatim, a 30-minute limit per run, the confirmation rule, the severity rule, the counting rule from SKILL.md section 6, and how a later phase rebuilds the baseline `dist/` (a worktree at the recorded commit, `npm ci`, `npm run build`) and exports the baseline skill trees.
- **R3** Six apps are built, two per prompt. Each is the `index.html` the build wrote, plus any local file it references other than `dist/`. They are committed unchanged as `<prompt-id>-run<n>.html` (and `<prompt-id>-run<n>-<file>` for extras) in `docs/agents/evidence/finished-app/2026-11-15-baseline/`. After each build, `git status` in the repository shows no change from that build.
- **R4** Each app gets one review. The lint runs from a worktree at the baseline commit as `node <baseline-worktree>/mcp/expressivecss/lint.mjs index.html > lint.txt 2>&1` in the review directory (the lint reports on stderr), and its output is committed as `lint-<prompt-id>-run<n>.txt`. The raw lens block is committed as `review-<prompt-id>-run<n>.txt`.
- **R5** Confirmation: a labelled finding is confirmed when the cited location exists in the app and shows the behavior the finding states; it is dropped when the source contradicts it, with the reason recorded. Its final severity follows the SKILL.md section 5 anchors. A WCAG overlap keeps both IDs.
- **R6** `findings.json` records the CLI version, the models from each run's JSON output, the commit `dist/` was built from, sha256 hashes of `dist/css/expressive.min.css` and `dist/js/expressive.min.js`, the tree hashes of `skills/expressivecss` and `skills/expressivecss-review`, sha256 hashes of both briefs, and per app: the sha256 of each committed file taken right after its build, the confirmed countable findings (area, severity, location, one line), the dropped findings with reasons, the labelled polish findings, and per-area counts.
- **R7** `finished-app-evals.md` has a results table with one row per date, label, prompt and run, one column per area and a total. The baseline fills six rows. It states how later phases compare: a guidance phase rebuilds its prompt twice and compares its area's count per run with the baseline rows; a stage-closing phase rebuilds all three prompts twice.
- **R8** A run fails when the build produces no `index.html`, the page doesn't load `dist/`, its script doesn't parse, the review returns no lens block, or a run passes its time limit. A failed run is rerun once and both attempts are recorded. A second failure is recorded as a failed run, never dropped and never counted as zero findings.

## Risks considered

- Two at once: each run has its own scratch directory. At most three runs go at once, so a slow build doesn't hold the others back without loading the machine more than the suite does.
- Bad input: not applicable. No new input surface.
- Who must be refused: builds can write only through their own process in their own directory; R3's `git status` check catches a write into the repository. Reviewers may only read.
- Readers: phases 79 to 87 read the prompts, the procedure, the hashes and the table. No test or generated file reads `docs/agents/evidence/` (searched `tests/` and `scripts/`), and `tests/expressivecss-skill-evals.test.js` reads only `expressivecss-skill-evals.md`.
- Committed apps: each loads `dist/` by a relative path that resolves only next to a built `dist/`. The evals doc says so; the files are records, not docs pages.
- Variation: a pinned model, fixed commands and briefs, fixed review skill trees, mechanical confirmation, and per-run rows instead of a mean.
- A broken build that scores low: R8 counts it as a failed run, not as a clean app.
- UI states: not applicable. No interface ships.
- `specs/checklist.md`: the project has none.

## Decisions made while building

- The lint that feeds the reviewer runs from the baseline commit (decided after `/code-review`). Phases 85 to 87 change the lint, and a reviewer reading new lint output could move counts on unchanged apps. Builders don't run the branch's lint either: the skill points them at the published `@expressivecss/mcp-server`, which phases 85 to 87 should keep in mind.
- No confirmation rule beyond R5 (decided after `/code-review`). A labelled finding that matches no finished-app anchor still counts, because SKILL.md section 6 counts every confirmed labelled finding at major or above, and changing that after seeing a result would defeat the fixed rule.
