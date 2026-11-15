# Button loading guidance: requirements

- Feature: the button guide tells agents how a command button behaves while its request runs
- Date: 2026-11-15
- Roadmap phase: [Phase 79: guide loading feedback on buttons](../../../../roadmap.md#phase-79-guide-loading-feedback-on-buttons), in the milestone "apps that feel finished". It depends on [phase 78](../finished-app-baseline/). The [mission](../../../../mission.md#agreed-scope) puts app behavior tied to a component in that component's guide. The [technical constraints](../../../../tech-stack.md) give `llm.md` the API and markup reference and make the skill's component guides generated copies.
- Branch: `feature/2026-11-15-milestone-apps-that-feel-finished` (one branch and one PR for the whole milestone)
- Base: the branch at `7aa6623b5`, after phase 78

## Current behavior and need

`skills/expressivecss/components/buttons.md` is generated from the Buttons section of `llm.md`. Its Contract keeps the first three paragraphs before the first example (`contractSummary` in `scripts/gen-expressivecss-skill.mjs`), and later subsections appear only by name under "Also documented". The guide says nothing about a button whose command waits on a request. In the phase 78 baseline, both `destructive-list` builds lost a loading finding (a Delete button swapped for a spinner; a Save button relabelled with no progress), and `settings-form` run 1 had an unannounced saving status. The quality inspector's loading area checks that the label stays, progress shows beside it, and a second press does nothing.

Phases 80 to 82 need the same thing for snackbars, lists, tabs, data tables, forms and text fields: a place in a component's guide for app behavior, written once in `llm.md`.

## Scope

- A `### App behavior` subsection convention in `llm.md`: the generator renders that subsection in full in the component's guide, under its own heading, and leaves it out of "Also documented".
- The Buttons section's `### App behavior`: label kept or changed to an in-progress form ending in `…`, progress beside the button, repeat presses ignored, a delay before the indicator and a minimum time once shown, and the result announced through a status region present from the start.
- A test for the convention and the button text, and a reviewed reading budget line.
- A rebuild of the `settings-form` prompt twice under the phase 78 procedure, reviewed with the baseline skill trees, recorded as a new run set.
- A CHANGELOG entry and regenerated files.

The baseline `settings-form` builds already kept their label, showed progress and guarded repeat presses; run 1's one count was an announcement gap its reviewer labelled loading. So the completion check is weak evidence on its own. Each rebuilt run also records, from source, which R2 elements it implements, and the two `destructive-list` loading counts, the real failures, are rechecked at the stage rerun in phase 82.

## Exclusions

- A framework loading state on `.button`. That is phase 83; this guidance uses the shipped `.loading-indicator` and `aria-disabled`.
- Snackbar, list, tab, table and form guidance (phases 80 to 82).
- Rubric or procedure changes.
- The docs site page for buttons. The mission names the skill guide; the docs page can link the subsection later.
- The MCP tools. `parseGuide` in `mcp/expressivecss/server.js` returns only Contract, Syntax, Rules, Options and Methods, so `component_syntax_expert` won't return App behavior. The mission puts this guidance in the skill; adding an MCP section is a tool API change for its own phase.
- `.icon-button` guidance. Both baseline Delete controls were icon buttons, but phase 80's optimistic remove with Undo takes that delete out of loading scope.

## Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| A `### App behavior` subsection in `llm.md`, cut out of the section and rendered in full by the generator | Decided from evidence | The guide is generated, so the text has to live in `llm.md`. The Contract keeps three paragraphs, so a fourth paragraph there would drop existing contract text, and "Also documented" shows only headings. Cutting the subsection out first keeps its examples from becoming the guide's Syntax and its prose from reaching the Contract. One named subsection gives phases 80 to 82 the same channel. |
| The indicator sits beside the button, not inside it | Decided from evidence | `.loading-indicator` is 48px by default (`_loading-indicator.scss`), larger than the 40dp default button, and the shipped button has no slot for it until phase 83. The rubric asks for progress beside the label. |
| Repeat presses are blocked by a pending flag in the `submit` handler plus `aria-disabled="true"`, not `disabled` | Decided from evidence (revised after spec review) | `$expressive-disabled` (`abstracts/_variables.scss`) matches `[aria-disabled="true"]`, and `_buttons.scss` applies `btn-disabled` to it: the disabled paint and `pointer-events: none`. That stops mouse presses but not Enter in a field, which submits the form without a click, so the flag sits in the `submit` handler after `preventDefault()`. Setting `disabled` on the focused button drops focus to `<body>`, which the phase 78 reviewers flagged under 2.4.3. |
| About 300ms before the indicator appears, at least 500ms once shown | Decided from evidence | The roadmap asks for a delay and a minimum and keeps both as guidance. These values avoid a flash for fast requests and a flicker for ones that end just after the indicator appears; the guide states them as approximate. |
| The indicator keeps its required role and name; the words go in one persistent region or a Snackbar | Decided from evidence (revised after spec review) | `semantics.json` enforces `loading-indicator-reports-itself` and `loading-indicator-is-named`, and `tests/semantics.test.js` runs every `llm.md` example through them. The `settings-form` run 1 finding was a named indicator unhidden at the moment of saving, which is unlikely to be announced. A region present from load, whose text changes, or a Snackbar with its own status region, announces the result once. |

## Requirements

- **R1** The generator cuts a component section's App behavior subsection (one level below the component heading) out of the section before it builds the Contract, Syntax, API parts and "Also documented", and renders it in the guide as `#### App behavior`, in full, after the API parts and Related contracts and before "Also documented". It strips a trailing `---` and turns relative links into their text, as `contractSummary` does. A section without the subsection renders exactly as before.
- **R2** `llm.md`'s Buttons section has `### App behavior` saying:
  - while a command's request runs, keep the label or change it to the verb's in-progress form ending in the `…` character, such as "Saving…", never a spinner alone, "Loading" or "Please wait";
  - put a `.loading-indicator` beside the button as a sibling, `hidden` while idle, with its `role="status"` and name, and size it with its tokens so the row doesn't grow;
  - show it after about 300ms and keep it at least 500ms once shown;
  - ignore a second press: return early while a pending flag is set, in the `submit` handler after `preventDefault()` for a form, and set `aria-disabled="true"`, which paints the button disabled and stops pointer presses while keeping focus, where `disabled` drops it;
  - clear the flag, `aria-disabled` and the indicator in `finally`, so a failed request leaves the button usable;
  - announce the result once, in a Snackbar or a `role="status"` region present from load (visible or `.visually-hidden`, never `hidden`) whose text changes;
  - a native form post that leaves the page needs none of this.
  It has one HTML example that passes the enforced semantics rules, and the subsection stays under 1.5 KB.
- **R3** `skills/expressivecss/components/buttons.md` carries that text after `npm run build:skill`. The MCP tools don't return it (see Exclusions).
- **R4** `tests/expressivecss-skill.test.js` checks that the buttons guide's `#### App behavior` comes after `#### Syntax` and before `#### Rules`, holds `…`, `aria-disabled="true"`, `preventDefault()`, `finally`, `300ms`, `500ms` and the native-post exemption, contains no `---`, and that the guide's Syntax and Contract are unchanged and "App behavior" is not under "Also documented". The reading budget test gets a reviewed line for the new bytes.
- **R5** The `settings-form` prompt is rebuilt twice under the procedure in `docs/agents/finished-app-evals.md`, with the current skill for builds and the baseline skill trees and lint for reviews. The run set is recorded as `<date>-phase-79` with apps, lens blocks, lint output, `findings.json` and two result rows.
- **R6** Each rebuilt run records, from source, which R2 elements it implements. The run set records zero countable `finished-app:loading` findings in each run. A confirmed loading finding inside the App behavior text's scope leads to a revision of the text and a repeat of both runs, up to two revisions; a finding outside its scope is recorded and reported without revising. Every run set, including ones that led to a revision, is committed with its rows, and a result above zero after the last revision is reported, never hidden.
- **R7** CHANGELOG has an Unreleased entry, `npm run build:skill` runs after the last edit, and `npm run check:generated` and the MCP smoke test pass.

## Risks considered

- Two at once: not applicable to guidance. The guidance itself covers two presses at once (R2).
- Bad input: not applicable.
- Who must be refused: not applicable.
- Readers: every generated guide (R1 must leave sections without the subsection unchanged; `check:generated` and the guide count catch a change); the MCP `component-guides.json` copy, whose tools don't read the new section; `tests/semantics.test.js`, which runs every `llm.md` example through the enforced rules; `docs-api.test.js`, which checks classes in `llm.md` snippets; the guide-wide tests that reject `](#…)` links and, for buttons, `aria-expanded`; and the published `llm.md`.
- Reading budget: `components/buttons.md` is on the basic-button reading path, now at its 50,469-byte ceiling. R4 raises it with a reviewed line, as earlier additions did.
- Comparison fairness: reviews keep the baseline skill trees, so only the builders see the new guidance.
- UI states: the guidance covers the in-progress, success and failure states of the command.
- `specs/checklist.md`: the project has none.
