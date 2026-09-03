# ExpressiveCSS skill behavioral evaluations

The behavioral suite checks decisions and scope boundaries that string-presence tests cannot prove. It does not compare preferred prose and does not calculate an aggregate design score.

## Case contract

Cases live in `tests/fixtures/expressivecss-skill-evals/cases.json`. Each case declares:

- the user request and project fixture;
- the expected operating mode;
- fixture-owned route, state, viewport, theme, input, and capture coverage;
- guides that must and must not be read;
- critical invariants expressed as structured assertions with stable IDs.

A run starts with only the root skill in context. A guide counts as loaded only when the tool trace records a successful read of its exact repository-relative path. Listing a guide in a response does not count.

A candidate response is JSON. It records decisions such as the operating mode, selected and rejected components, evidence records, contract status, and whether editing occurred. Every critical invariant must be present exactly once and evaluated. Missing, duplicate, unknown, or unevaluated critical IDs fail the case.

The mutation tests prove these boundaries by changing exact guide routes, review statuses, criterion or component bindings, required evidence kinds, coverage records, capture roles, visible-difference classifications, event order, and no-edit behavior. They also reject broad passes synthesized from scoped MCP output and stop live adapters at a bounded timeout. Each mutation must fail for its named invariant.

## Offline replay

Reviewed replay responses live in `tests/fixtures/expressivecss-skill-evals/passing-responses.json`. Run them without network access:

```text
terminal(command="npm run test:skill-evals", timeout=180)
```

Replay proves the evaluator, schemas, redaction, mutation guards, and current case set. It does not prove that a live model follows the skill.

## Live adapter

Use an executable that reads one JSON object from standard input and writes one candidate-response JSON object to standard output:

```text
terminal(command="node scripts/eval-expressivecss-skill.mjs --adapter=/absolute/path/to/adapter --adapter-arg=value --adapter-timeout-ms=120000 --output=/tmp/expressivecss-eval.json", timeout=600)
```

The input contains `testCase` and `rootSkill`. The runner invokes the executable directly with an argument array and `shell: false`. The adapter timeout defaults to 120000 milliseconds and can be changed with `--adapter-timeout-ms=<milliseconds>`. Provider credentials and configuration stay outside committed fixtures.

Run one case with `--case=<id>`. Use `--responses=<path>` to replay a different saved response set.

## Report handling

Reports retain the prompt, selected guides, response, tool trace when supplied, and every invariant result. Before writing a report, the runner redacts common credential assignments, credentials embedded in URLs, Linux home paths, and Windows user paths.

Live model evaluations are release evidence, not a normal merge gate, until repeated runs establish acceptable variance. A failed critical invariant blocks a skill release until reviewed. Do not approve a case because the prose sounds plausible.
