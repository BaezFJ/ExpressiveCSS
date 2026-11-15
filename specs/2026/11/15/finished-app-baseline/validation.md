# Finished-app baseline: validation

Phase 78. Requirements: [requirements.md](requirements.md). Plan: [plan.md](plan.md).

## Agent-run checks

Commands: `npm run build`; the build and review commands in `docs/agents/finished-app-evals.md`; `node <repo>/mcp/expressivecss/lint.mjs index.html` in each review directory; `sha256sum`; `npm run verify`.

| ID | Covers | Setup | Action | Expected result | Fails if | Result |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | R1, R2, R5, R7 | `docs/agents/finished-app-evals.md`. | Read it against R1, R2, R5 and R7, and search the prompts and the build brief for the R1 word list. | Three prompts with IDs and the fields, endpoints and data R1 names; both commands with every flag; both layouts; both briefs verbatim; the limit; the confirmation, severity and counting rules; the rebuild steps; a table keyed by date, label, prompt and run. None of the listed words appears in a prompt or the build brief. | Any item is missing, a brief is paraphrased, or a listed word appears. | Pending |
| V2 | R3, R8 | Six build directories. | Run the six builds; after each, run `git status --short` in the repository and `sha256sum` on the app files. | Six apps committed with the hashes recorded in `findings.json` matching `sha256sum` of the committed files; no build changed the repository; each app links `dist/css/expressive.min.css`. A failed run has its rerun recorded. | A committed hash differs from the build-time hash, a build wrote to the repository, a run is missing without a record, or a broken build is counted. | Pending |
| V3 | R4, R5, R6 | The six review directories. | Run six reviews; confirm each labelled finding by R5. | Each `review-*.txt` holds the lens block. Every countable finding in `findings.json` appears in its lens block with a `finished-app:` label, has a location that exists in the app, and has major or critical severity; dropped findings carry a reason; polish findings are listed apart; per-area counts add up; every provenance field in R6 is filled. | A counted finding is absent from its lens block, cites a location that doesn't exist, is polish, or a count doesn't add up, or a provenance field is empty. | Pending |
| V4 | R7 | The evals doc after group 3. | Compare the six baseline rows with `findings.json`. | Each row's per-area numbers and total equal that app's counts. | A row and its app disagree. | Pending |
| V5 | R1 to R8 | Clean build. | Run `npm run verify`. | All checks pass. Known flakes pass on a lone rerun. | Any check fails on rerun. | Pending |

## Human checks

None. The baseline is an agent measurement; no check needs anything an agent lacks.

## Merge conditions

All agent-run checks pass, the milestone PR's required CI checks pass, and the repository's reviews are done.

## Review record

- 2026-11-15, spec review by an independent read-only subagent (Plan agent), given the three spec files, the rubric files, the constitution and the base commit. It found 13 defects and 10 suggestions and no broken links. All were addressed: builds and reviews moved from session subagents to headless `claude -p --safe-mode --strict-mcp-config` processes in scratch directories, because subagents inherit this session's hooks, stale user-level skill copies and MCP servers (a probe confirmed safe mode sees none of them); the full model ID replaces the `opus` alias; reviews in later phases use the baseline skill trees; the reviewer sees only its app; confirmation and severity follow fixed rules; build-time hashes, lens blocks, lint output and provenance hashes are committed; table rows are per prompt and run; the prompts name a Save button, specific fields, a stand-in request with a fixed delay, five addresses and 40 orders in pages of 10, and avoid a listed set of rubric words; a broken build counts as a failed run; the lint command uses the repository path and a file argument; and the claims about source-only judgment and the benchmark were corrected.
