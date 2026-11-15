# Finished-app evaluations

These runs measure whether apps that an agent builds with the ExpressiveCSS skill behave the way people expect: loading feedback, recovery from destructive actions, state kept in the URL, and the form submit flow. An agent builds an app from a fixed prompt, the `expressivecss-review` quality inspector reviews it with its finished-app rubric (check 5), and the confirmed findings are counted. The milestone "apps that feel finished" in `specs/roadmap.md` records a baseline (phase 78), then reruns the prompts after each guidance or framework change.

The counts are a measurement of agent output under one model and one procedure. They are not a design approval, and a run that scores zero still needs a person to try the app.

## Prompts

Each prompt is given verbatim inside the build brief below. The prompts name controls, fields, data and a stand-in request, and leave out every behavior the rubric checks.

### `settings-form`

Rubric areas it exercises: loading feedback, submit flow.

```text
Build an account settings page with ExpressiveCSS. It has a form with display name, email, phone and website fields and a Save button. Save sends the form to POST /api/account. There is no server: stand in for the request with a function that waits 1500 ms, then rejects when the email ends in @example.invalid and resolves otherwise. Show the person whether the save worked.
```

### `destructive-list`

Rubric areas it exercises: destructive actions, and loading feedback when the delete action waits on its request.

```text
Build a saved addresses page with ExpressiveCSS. Show five sample addresses in a list. Each address has a delete action that sends DELETE /api/addresses/:id, and the page has a way to add an address. There is no server: stand in for each request with a function that waits 800 ms and resolves.
```

### `filtered-dashboard`

Rubric areas it exercises: URL state.

```text
Build an orders dashboard with ExpressiveCSS. Generate 40 sample orders, each with an id, customer, date, total and a state of Open, Shipped or Returned. Show tabs for the three states, a text field that filters the orders by customer, and a table of the matching orders, 10 rows per page, with controls to change pages.
```

## Procedure

The baseline commit is `16b6632ada2153e8b185c5c72387d3896d7ad794`, the `commit` field in [the baseline records](evidence/finished-app/2026-11-15-baseline/findings.json). Every later run set reviews and lints from that commit. Locations in `findings.json` cite `index.html`, which maps line for line to the committed `<prompt-id>-run<n>.html`.

### What each run can see

Builds and reviews run as separate headless Claude Code processes in `--safe-mode`, which turns off CLAUDE.md files, user and project skills, plugins, hooks and MCP servers while keeping authentication and model selection. A subagent of an interactive session would inherit that session's hooks, skill copies and MCP servers instead.

A build directory holds:

- `dist/`: a copy of the framework's built `dist/` from the recorded commit.
- `expressivecss/`: a copy of `skills/expressivecss` from the commit under test.
- `build-brief.txt` and `build-result.json`, the build command's input and output.

A review directory holds:

- `index.html` and any local file it references, copied from the build.
- `dist/`: the same copy the build had.
- `expressivecss/` and `expressivecss-review/`: copies of `skills/expressivecss` and `skills/expressivecss-review` from the baseline commit, exported with `git -C <repo> archive <baseline-commit> skills/expressivecss skills/expressivecss-review | tar -x --strip-components=1 -C <review-dir>`. Every comparison reviews with these trees, so a change to the guides moves the builds and not the reviewer.
- `lint.txt`, `review-brief.txt` and `review-result.json`, the review command's inputs and output.
- The review's own `lint.txt`, `review-brief.txt` and `review-result.json`, and nothing else. The reviewer never sees the other apps, `findings.json` or this file. `--allowedTools` doesn't limit paths, so make each review directory with `mktemp -d` outside the repository and away from other run sets.

Run at most three processes at once, each under `timeout 1800`.

### Build command

Run inside the build directory, with the build brief on standard input:

```sh
timeout 1800 claude -p --safe-mode --strict-mcp-config --model claude-opus-5-5 \
  --no-session-persistence --output-format json --permission-mode bypassPermissions \
  < build-brief.txt > build-result.json
```

### Build brief

Replace `{{PROMPT}}` with the prompt text.

```text
You are building a web page in the current directory. The ExpressiveCSS framework's built files are in ./dist and its agent skill is in ./expressivecss. Read ./expressivecss/SKILL.md first and follow it, reading the guides it points you to. Write the whole app as ./index.html and load the framework from dist/ by relative path. Keep scripts inline or in files next to index.html. Work only inside the current directory and don't start servers. When you're done, reply with one line naming the files you wrote.

Task:
{{PROMPT}}
```

After each batch of builds, run `git status --short` in the repository to confirm the build changed nothing there, take the sha256 of each app file, and copy the files unchanged into the evidence directory as `<prompt-id>-run<n>.html` (and `<prompt-id>-run<n>-<file>` for extra files).

### Review command

Run the lint from the baseline commit too, so its output, which the reviewer reads, doesn't change between run sets: create a worktree at the baseline commit (`git worktree add <baseline-worktree> <baseline-commit>`) and run `npm ci --prefix <baseline-worktree>/mcp/expressivecss` once. Then, inside the review directory, run the lint and keep its output:

```sh
node <baseline-worktree>/mcp/expressivecss/lint.mjs index.html > lint.txt 2>&1
timeout 1800 claude -p --safe-mode --strict-mcp-config --model claude-opus-5-5 \
  --no-session-persistence --output-format json --allowedTools Read Glob Grep \
  < review-brief.txt > review-result.json
```

### Reviewer brief

Replace `{{VERSION}}` with the `version` in `package.json` at the commit `dist/` was built from and `{{LINT}}` with the contents of `lint.txt`.

```text
Read ./expressivecss-review/agents/quality-inspector.md first and follow it exactly. It is your brief. Return only the FINDINGS / CHECKED / BLOCKED / HANDOFFS block it specifies.

Base skill: ./expressivecss
Framework: ExpressiveCSS {{VERSION}}, resolver status unresolved: no project
Guidance source: bundled guides
Target: ./index.html and the local files it references; out of scope: everything else
Browser route: unavailable: source evidence only
Planned use: none stated.
Lint output (already run, do not rerun):
{{LINT}}
Read-only. Do not edit files and do not run commands.
```

### Failed runs

A run fails when the build writes no `index.html`, the page doesn't load `dist/` or its script doesn't parse (check both by loading the page in Chromium with Playwright and looking for the stylesheet, the `Expressive` global and console errors), the review returns no lens block, or the process passes its time limit. Rerun a failed run once and record both attempts. A second failure is recorded as a failed run. It is never dropped and never counted as zero findings.

### Confirming and counting

The person running the comparison confirms each finding whose rule field holds a `finished-app:` label, and adds none of their own:

1. A finding is confirmed when the location it cites exists in the app and shows the behavior it describes. It is dropped when the source contradicts it, and the reason is recorded.
2. Its final severity follows the anchors in `skills/expressivecss-review/SKILL.md` section 5 of the baseline commit. When the same defect is also a certain WCAG A or AA failure, the critical anchor applies and both IDs are kept; an estimated WCAG failure stays major.
3. A countable finding is a confirmed major or critical finding with a label, as SKILL.md section 6 defines it. Labelled polish findings are recorded and not counted.

### Records

Each run set has a directory `evidence/finished-app/<date>-<label>/` holding the apps, `lint-<prompt-id>-run<n>.txt`, `review-<prompt-id>-run<n>.txt` (the lens block) and `findings.json`. `findings.json` records the Claude Code version, the models each run used, the commit `dist/` was built from with the sha256 of `dist/css/expressive.min.css` and `dist/js/expressive.min.js`, the tree hashes of both skills, the sha256 of both briefs (of the template text inside the fenced block, without a final newline, as `awk -v N=4 '/^```text$/{n++; f=(n==N); next} /^```$/{f=0; next} f' docs/agents/finished-app-evals.md | head -c -1 | sha256sum` gives for the build brief; use `N=5` for the reviewer brief), the build commit and the review commit as separate fields, and per app the build-time file hashes, the build and review seconds, the load check, the countable findings, the dropped findings with reasons, the labelled polish findings and the per-area counts.

The committed apps load `dist/` by a relative path, so they render only next to a built `dist/`. To render or re-review baseline apps later, check out the recorded commit in a new worktree, run `npm ci` and `npm run build`, and copy its `dist/`.

### Comparing with the baseline

Each phase's prompt: 79 and 83 use `settings-form` (two of the three baseline loading counts are in `destructive-list`, so a loading change there shows only in a stage rerun); 80 uses `destructive-list`; 81 uses `filtered-dashboard`; 82 uses `settings-form`. Phases 84 to 86 have no prompt of their own, and the stage reruns at 82, 84 and 87 cover them.

A guidance or framework phase rebuilds its own prompt twice with the current skill, reviews both builds with the baseline skill trees, and compares its area's count per run with the baseline rows. A phase that closes a stage rebuilds all three prompts twice. Each run set adds rows below.

## Results

Counts are countable findings per area. A failed run shows `failed` in every column.

| Date | Label | Prompt | Run | Loading | Destructive | URL state | Submit flow | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-15 | baseline | settings-form | 1 | 1 | 0 | 0 | 0 | 1 |
| 2026-11-15 | baseline | settings-form | 2 | 0 | 0 | 0 | 1 | 1 |
| 2026-11-15 | baseline | destructive-list | 1 | 1 | 0 | 0 | 0 | 1 |
| 2026-11-15 | baseline | destructive-list | 2 | 1 | 0 | 0 | 0 | 1 |
| 2026-11-15 | baseline | filtered-dashboard | 1 | 0 | 0 | 3 | 0 | 3 |
| 2026-11-15 | baseline | filtered-dashboard | 2 | 0 | 0 | 3 | 0 | 3 |

Baseline notes, from [the baseline records](evidence/finished-app/2026-11-15-baseline/findings.json):

- Both `destructive-list` builds put a confirmation dialog in front of delete. The rubric scores that as polish, so the destructive column is 0 while neither build offers Undo.
- Both `destructive-list` runs score 1 for loading, for different controls. Run 1's count is the Delete button swapped for a spinner while the request runs; run 2 does the same, and its reviewer passed it. Run 2's count is the Save address button, which changes to "Saving…" with no progress beside it; run 1 shows a loading indicator there.
- Neither `filtered-dashboard` build writes anything to the URL: tab, filter and page are each one finding in both runs.
- Both `settings-form` builds kept the Save label, showed progress beside it and ignored a repeat press. Run 1's reviewer filed a missing announcement (WCAG 4.1.3) under `finished-app:loading`; it counts, because the counting rule counts every confirmed labelled finding at major or above. Run 2's reviewer reported the same gap without a label, so the 1 against 0 comes from labelling, and a later rerun can score a loading finding the button guidance doesn't cover.
- `destructive-list` run 1's reviewer also reported that a delete could start twice. The source contradicts it, so it was dropped; `findings.json` keeps the reason.
