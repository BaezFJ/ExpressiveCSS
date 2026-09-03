# ExpressiveCSS skill behavioral evaluations

The behavioral suite checks decisions and scope boundaries that string-presence tests cannot prove. It does not compare preferred prose or calculate an aggregate design score.

## Case contract

Cases live in `tests/fixtures/expressivecss-skill-evals/cases.json`. Each case declares:

- the user request and project fixture;
- the expected operating mode;
- fixture-owned route, state, viewport, theme, input, and capture coverage;
- guides that must and must not be read;
- required decision and report fields;
- forbidden edits and candidate content;
- critical invariants expressed as structured assertions with stable IDs.

A run starts with only the root skill in context. A guide counts as loaded only when trusted execution evidence records a successful read of its exact repository-relative path. Listing a guide in the candidate response does not count.

Every critical invariant must be present exactly once and evaluated. Missing, duplicate, unknown, or unevaluated critical IDs fail the case. Mutation tests change guide routes, review statuses, criterion and component bindings, required evidence kinds, coverage records, capture roles, visible-difference classifications, event order, forbidden edits, and no-edit behavior. Refine preservation and Compact/Expanded navigation must match fixture-owned contracts rather than candidate-invented strings. They also reject broad passes synthesized from scoped MCP output and stop live adapters at a bounded timeout. Each mutation must fail for its named invariant.

## Trust boundary

Candidate output and execution evidence are separate fields. Evidence artifacts belong to the operator-controlled `executionEvidence.artifacts` array; candidate-authored `evidenceArtifacts` are rejected. The operator grants trust by selecting the live adapter executable or supplying a reviewed replay file. The evaluator does not infer trust from candidate prose, candidate-authored metadata, `source: "adapter"`, or an `authenticated` boolean. Those values are schema assertions inside an operator-controlled channel, not cryptographic authentication.

Matched-capture pair references remain candidate-controlled, while the referenced artifact metadata is operator-controlled. A pair passes only when the trusted before artifact exactly matches the declared baseline sequence and timestamp, the declared first edit exactly matches the first trusted write, patch, create, or delete event, and the trusted after artifact follows that edit in both sequence and time.

A per-case envelope has this shape:

```json
{
  "candidateResponse": {},
  "executionEvidence": {
    "source": "adapter",
    "toolTrace": [
      {
        "sequence": 1,
        "timestamp": "2026-09-03T00:00:01.000Z",
        "operation": "read",
        "path": "skills/expressivecss/expressivecss-usage/SKILL.md",
        "status": "success"
      }
    ],
    "filesystem": {
      "source": "adapter",
      "independentlyComputed": true,
      "algorithm": "sha256",
      "before": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "after": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    },
    "artifacts": []
  }
}
```

Trusted trace operations are `read`, `write`, `patch`, `create`, and `delete`. Every event needs a non-empty path, `status: "success"`, a strictly increasing safe-integer sequence, and a strictly increasing valid timestamp. Filesystem digests must match `sha256:<64 lowercase hexadecimal characters>` exactly. Every trusted artifact needs a unique ID, category, criterion ID, component ID, observation containing its evaluator-owned expected observation, sequence, and timestamp. The evaluator fails the trust invariant if the candidate response contains `toolTrace`, `preRunFilesystemHash`, `postRunFilesystemHash`, `evidenceArtifacts`, or `executionEvidence`.

Review-row status contracts are closed: `Pass` requires criterion- and component-owned trusted evidence; `Intentional adaptation` additionally requires a rationale and `accessibilityPreserved: true`; `Fail` requires trusted evidence, an observed deviation, and a correction; `Blocked` requires a blocker reason and no evidence; and `Not applicable` requires an applicability reason and no evidence.

## Offline replay

Reviewed replay responses live in `tests/fixtures/expressivecss-skill-evals/passing-responses.json`. The file uses this top-level envelope:

```json
{
  "schemaVersion": 3,
  "responses": {
    "case-id": {
      "candidateResponse": {},
      "executionEvidence": {}
    }
  }
}
```

Run it without network access:

```text
terminal(command="npm run test:skill-evals", timeout=180)
```

Replay proves the evaluator, schemas, redaction, mutation guards, and current case set. It does not prove that a live model follows the skill. A replay is trusted only because the operator selected and reviewed the file.

## Live adapter

Use an operator-controlled executable. For each case, it reads one JSON object from standard input and writes one per-case envelope to standard output:

```text
terminal(command="node scripts/eval-expressivecss-skill.mjs --adapter=/absolute/path/to/adapter --adapter-arg=value --adapter-timeout-ms=120000 --output=/tmp/expressivecss-eval.json", timeout=600)
```

The input contains `task`, `projectRoot`, and `rootSkill`. The candidate-safe `task` has only `id`, `request`, and `projectFixture`; `projectRoot` is a concrete temporary project materialized from the evaluator-owned fixture blueprint. Scoring expectations remain private to the evaluator. The runner invokes the executable directly with an argument array and `shell: false`, places it in a dedicated process group, closes its pipes at the deadline, and escalates from termination to a process-tree kill. The hard adapter timeout defaults to 120000 milliseconds and can be changed with `--adapter-timeout-ms=<milliseconds>`. Provider credentials and configuration stay outside committed fixtures.

Run one case with `--case=<id>`. Use `--responses=<path>` to replay a different saved response set.

## Resource limits

The evaluator fails closed at these limits:

| Input | Limit |
| --- | ---: |
| Case definition file | 1,048,576 bytes |
| Replay file | 1,048,576 bytes |
| Root skill file | 1,048,576 bytes |
| Cases | 22 |
| Replay responses | 22 |
| Trusted trace events | 256 |
| Evidence artifacts | 256 |
| Review and coverage rows | 256 |
| Strings in a per-case envelope | 4,096 |
| Object property names in a per-case envelope | 20,000 |
| One string or property name | 65,536 UTF-8 bytes |
| Object depth | 32 |
| Traversed values | 20,000 |

Case, replay, and root-skill files use bounded file-handle reads. The evaluator rejects symbolic links, non-regular root-skill files, overflow, path escape, and identity or metadata changes during a read. Live adapter output is also bounded by the child-process buffer and then checked against the per-case structural limits.

## Report handling

Reports retain the prompt, selected guides, candidate response, trusted execution evidence, and every invariant result. Before writing a report, the runner redacts secrets in property names and values, credential-shaped keys, common provider tokens, bearer tokens, JWTs, cookies, credential assignments, credentials embedded in URLs, Linux and macOS local paths, and Windows user paths. Redaction is iterative and stops at the same depth, string-count, and traversal limits. Cycles and work beyond the limits become `[TRUNCATED]`.

Live model evaluations are release evidence, not a normal merge gate, until repeated runs establish acceptable variance. A failed critical invariant blocks a skill release until reviewed. Do not approve a case because the prose sounds plausible.
