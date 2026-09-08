# Product context across ExpressiveCSS tasks

The optional [product context reference](../../skills/expressivecss/expressivecss-design/references/product-context.md)
helps agents continue an application's design decisions across pages and tasks.
It reads the nearest relevant project record and supporting implementation,
preserves scope and acceptance status, and updates an existing record only
within authorized work. Without records, the agent uses a labeled working
brief and proceeds with reversible work. There is no required file or schema.

Design links the reference for work across pages. Theming links it directly
for conflicting or shared brand choices. The root routing and required
basic-button reading path are unchanged.

## Focused comparison

The fixture and requests are in
`tests/fixtures/expressivecss-skill-evals/product-context.json`. Both tasks
reuse the runnable account consumer, with a README, current design notes,
an archived exploration, and the consumer's actual theme token source.
The fixture includes a superseded seed note, a booking-only spacing exception,
and an unapproved navigation rename.

1. Plan an Events page without editing. Reuse product decisions, identify
   conflicts, and leave unsupported integration details unresolved.
2. Update existing notes after an explicit approval for roomier Events filters.
   Keep result lists compact, retain the booking exception and proposals,
   correct the obsolete seed note, and change no other file.

Each request runs once against the preceding skill and once against the revised
skill, alternating old/new order. The existing Codex adapter records model
settings, duration, tokens, tool calls, observed complete guide reads, and
before/after file hashes. The operator retains source files before cleanup.
Fixture and evaluator fingerprints accompany each comparison.

File preservation and completion are operator checks. The plan's interpretation
and the updated record's meaning need content review, separate from those
checks. Candidate-authored verification statements are not execution evidence.
These tasks do not measure rendered interface quality, long-term retention,
natural skill discovery, or behavior when no product documents exist. A single
run per configuration does not establish a timing or token improvement.

## Recorded results

The comparison used Codex `gpt-6-astra` with low reasoning effort, ephemeral
runs, and the same tool access for each pair. Planning used a read-only sandbox;
documentation used workspace-write. The baseline was the skill at `f073646`.

| Task | Skill | Seconds | Input tokens | Cached input tokens | Output tokens | Tool calls |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Plan Events | Previous | 54.9 | 141,063 | 80,128 | 2,224 | 7 |
| Plan Events | Revised | 61.4 | 144,334 | 107,264 | 2,307 | 7 |
| Record approval | Previous | 42.9 | 152,780 | 118,272 | 1,218 | 5 |
| Record approval | Revised | 49.1 | 219,213 | 196,352 | 1,380 | 8 |

All four runs completed without infrastructure errors. All 12 operator checks
passed: completed execution, unchanged skill files, and either no consumer
edits or an actual change confined to `docs/design.md`. Agent content review
found that both versions preserved navigation, pending proposals, and local
exceptions. Both planning outputs identified the missing booking destination.
Both documentation outputs corrected the seed from actual source without
inventing an approval date. Human comparison remains pending.

Both revised runs demonstrably read the new reference. The revised guidance
cost more time and total input tokens in these runs; cached input also differed.
The baseline already handled the explicit requests well. This comparison
supports task completion and reference discoverability, not superiority or a
performance gain. The viewer's aggregate variability spans different tasks,
not repeated trials. The unchanged basic-button path reads 30,408 bytes.

Local artifacts live under `.cache/product-context/`: `iteration-1` retains
redacted transcripts, responses, before/after source, telemetry, grading, and
provenance; `review.html` is Skill Creator's generated comparison viewer.
The frozen skills have these hashes:

- Previous: `sha256:8861337aec321717539c0c60e708e09f3550259dd2e7da9926a9e8b33f3abe29`.
- Revised: `sha256:0239bab52ffe768e7d6a6bb9dd7791d3fe2eeec94a66ac62e21192b773fdb4de`.

Verification in a clean temporary checkout passed `npm run test:skill`
with 231 tests and 22 replay cases, `npm run verify` with 998 tests and no
skips, the seven-tool MCP smoke check, and both isolated package checks.
The full suite included the Chromium, Firefox, and WebKit critical flows in
the official Playwright container. The capability collector separately passed
17 mapped checks and refreshed generated skill/MCP provenance. Concurrent
`fallow` manifest edits were excluded from that checkout and left untouched.
