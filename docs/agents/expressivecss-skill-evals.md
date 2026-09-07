# ExpressiveCSS skill behavioral evaluations

The behavioral suite checks decisions, source changes, and scope boundaries. Reviewed replay data tests the evaluator; only a live run can test whether an agent follows the skill. The suite does not compare preferred prose or calculate an aggregate design score.

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

The three basic implementation cases additionally require operator-owned `completionChecks`. In a live run the evaluator recomputes these from bounded reads of the actual project files, replacing any adapter-supplied values. Setup needs installed package files and a stylesheet import or link; button creation needs an additional enabled, labeled native button; token-only theming needs a valid changed seed with the other inspected sources unchanged. These are static completion checks, not browser or full accessibility passes. Candidate-authored checks do not count.

## Project fixtures

`consumer-current` is a runnable local consumer, with `/dashboard`, `/home`, `/search`, and `/profile` routes, a labeled checkbox form, named drawer, adaptive navigation, and activity-state controls. The evaluator copies the already-built framework from `dist/`, including its fonts, into the temporary installed package. Build first with `npm run build`; no package download is needed to materialize it. Run `npm start` inside the temporary project to start its local server; it prints its URL. `PORT` can select a port, otherwise the OS chooses one.

The readable `fixture.json` describes route, data, state, viewport, locale, direction, theme, and input facts. Activity states are available through `#preview-state` or the `state` query parameter. Permission state is explicitly unavailable. The tooltip host starts without manual initialization, with a remount control for lifecycle tasks.

Setup uses `consumer-empty`, which has no ExpressiveCSS dependency or stylesheet import. The older-version fixture contains an installed 0.7.0 manifest and lockfile for version-resolution tasks. It does not contain a 0.7.0 runtime: browser claims for that version remain blocked until the matching package is available. The runner never substitutes today's bundle for the older package.

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

Trusted trace operations are `read`, `write`, `patch`, `create`, and `delete`. Every event needs a non-empty path, `status: "success"`, a strictly increasing safe-integer sequence, and a strictly increasing valid timestamp. Filesystem digests must match `sha256:<64 lowercase hexadecimal characters>` exactly. Every trusted artifact needs a unique ID, category, criterion ID, component ID, non-empty operator observation, sequence, and timestamp. The evaluator fails the trust invariant if the candidate response contains `toolTrace`, `preRunFilesystemHash`, `postRunFilesystemHash`, `evidenceArtifacts`, `executionEvidence`, or `completionChecks`.

Required artifacts match structured criterion, component, category, capture-role, and dimension fields. Artifact IDs are assigned by the collector and referenced by the response; they do not have to reproduce replay IDs. Additional valid evidence is accepted. Observation prose need not reproduce an expected sentence, and legacy `expectedObservation` metadata is not proof of correctness. Requirement and accessibility evidence binds to its fixture inventory ID. Coverage artifacts use `observedValue` for the measured state or dimension; reviewed older schema-version-3 replays retain their observation-text fallback. Review of the actual files, captures, and observations is still necessary for conclusions beyond the structured checks.

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
terminal(command="node scripts/eval-expressivecss-skill.mjs --adapter=/absolute/path/to/adapter --adapter-arg=value --adapter-timeout-ms=120000 --case=css-only-markup-routing --output=/tmp/expressivecss-eval.json --output-directory=/tmp/expressivecss-eval-artifacts", timeout=180)
```

The input contains `task`, `projectRoot`, and `rootSkill`, plus `skillRoot` and `artifactDirectory`. The candidate-safe `task` has only `id`, `request`, and `projectFixture`; `projectRoot` is a concrete temporary project materialized from the evaluator-owned fixture blueprint. `skillRoot` identifies the selected skill directory for actual guide reads. `artifactDirectory` is an operator output directory outside the disposable project, or null when no output directory was requested. Scoring expectations remain private to the evaluator. The runner invokes the executable directly with an argument array and `shell: false`, places it in a dedicated process group, closes its pipes at the deadline, and escalates from termination to a process-tree kill. The hard adapter timeout defaults to 120000 milliseconds and can be changed with `--adapter-timeout-ms=<milliseconds>`. Provider credentials and configuration stay outside committed fixtures.

Run one case with `--case=<id>`. Use `--responses=<path>` to replay a different saved response set, or `--skill-root=<directory>` to select an immutable baseline or candidate skill. The root text is read once per run. A full suite runs cases sequentially, each with its own adapter timeout; the outer process deadline must allow for the number of selected cases.

The adapter may return bounded `runMetadata`, such as its model identifier and usage telemetry. The runner records `runMetadata.wallTimeMs` independently. Missing provider metrics must remain unavailable, not become zero usage. One measured run is not a performance comparison: use matched baseline/candidate tasks and repeated runs to assess timing, token use, and variance. Since this suite injects the root skill, skill discovery needs a separate trigger evaluation.

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

Case, replay, and root-skill files use bounded file-handle reads. The evaluator rejects symbolic links, non-regular root-skill files, overflow, path escape, and identity or metadata changes during a read. Nonblocking opens prevent a replacement FIFO from hanging the reader. Live adapter output is also bounded by the child-process buffer and then checked against the per-case structural limits.

## Report handling

Reports retain the prompt, selected guides, candidate response, trusted execution evidence, and every invariant result. Before writing a report, the runner redacts secrets in property names and values, credential-shaped keys, common provider tokens, bearer tokens, JWTs, cookies, credential assignments, credentials embedded in URLs, Linux and macOS local paths, and Windows user paths. Redaction is iterative and stops at the same depth, string-count, and traversal limits. Cycles and work beyond the limits become `[TRUNCATED]`.

Adapter exit failures, invalid output, and timeouts become per-case infrastructure failures with elapsed time. The runner retains earlier results and continues with the remaining cases. With `--output-directory`, it keeps redacted snapshots of the inspected source files in each case directory; adapters save their captures and other artifacts there before returning. The report links these directories through relative `artifactsPath` values. Temporary project directories are removed in `finally` blocks, including on failure. Source snapshots and controlled adapter tests do not establish live model or browser success.

Live model evaluations are release evidence, not a normal merge gate, until repeated runs establish acceptable variance. A failed critical invariant blocks a skill release until reviewed. Do not approve a case because the prose sounds plausible.
