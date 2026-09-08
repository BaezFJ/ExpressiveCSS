# Repeatable consumer verification

Use this for a working application with a local development server when the task
benefits from repeatable browser checks. Reuse an existing project test first.
This runner exercises declared actions and completion assertions, captures the
page, and reports errors. It does not grade Material design or certify accessibility.

## Run a scenario

The consumer needs its existing `@playwright/test` installation and Chromium.
The runner never installs packages, downloads browsers, starts a server, or edits
application files. If tooling is missing, use the root browser evidence protocol
and report the unavailable check. Do not install a second browser runner by default.

Resolve the target framework version as usual. Start the application's local
preview server, or disable HMR in its development server. HMR WebSockets are
blocked and would fail the scenario. Then run the portable script:

```sh
node "<skill-directory>/scripts/verify-consumer.mjs" \
  --project-root "<application>" \
  --scenario "checks/preferences.json" \
  --origin "http://127.0.0.1:4321" \
  --output ".cache/expressivecss-consumer"
```

Paths in the scenario and `--output` are relative to the consumer project. The
origin must be an explicit HTTP loopback IP. The application must serve its assets
on that same origin. External requests, WebSockets, service workers, downloads,
and popups are unavailable. Requests other than GET/HEAD are blocked by default.
Use `--allow-mutations` only when authorized to exercise writes against that local
test application. GET requests can also have side effects in an application; use
disposable test data. The scenario cannot enable writes or expand the origin.

Example `checks/preferences.json`, adapted to an application's actual controls:

```json
{
  "name": "Save notification preferences",
  "sources": ["package.json", "package-lock.json", "src/preferences.html", "src/preferences.js"],
  "cases": [{
    "name": "Keyboard save on a compact screen",
    "path": "/preferences",
    "width": 375,
    "height": 900,
    "colorScheme": "light",
    "reducedMotion": "reduce",
    "steps": [
      { "action": "expect", "selector": "#email", "property": "checked", "value": false },
      { "action": "click", "selector": "label:has(#email)" },
      { "action": "expect", "selector": "#email", "property": "checked", "value": true },
      { "action": "press", "key": "Tab" },
      { "action": "expect", "selector": "#save", "property": "focused", "value": true },
      { "action": "press", "key": "Enter" },
      { "action": "expect", "selector": "#status", "property": "text", "value": "Preferences saved." }
    ]
  }]
}
```

Supported actions are `click`, `fill`, `press`, `check`, `select`, and `expect`.
`press` sends a key to current browser focus, so assertions can verify real tab
order. `expect` supports exact normalized `text`, `value`, `count`, `checked`,
`visible`, and `focused`. Each case requires a completion assertion. Arbitrary
JavaScript evaluation and shell commands are not part of the scenario format.
For ExpressiveCSS checkboxes with visually hidden native inputs, click their
visible label and assert the input state, as above; do not force a click on hidden
markup. Use existing application tests for more complex assertions or lifecycle instrumentation.

Declare only the cases relevant to the change, including key states and breakpoint
boundaries. Each starts in a fresh browser context. Explicitly interact with a
project's theme control when it overrides the system color preference. A media
setting alone does not prove that the application rendered that theme.

## Read the evidence and repair

Each invocation creates a separate `run-*` directory with a JSON report and
hashed before/after or failure screenshots. Captures use the viewport when the
page exceeds full-page dimension limits and record `clippedToViewport: true`. Reports retain completed
cases even when a later case fails. Every case checks final horizontal overflow,
console/page errors, and blocked requests. Limits are 12 cases, 40 steps per case,
30 seconds per case, 1,000 requests per context, and bounded files and captures.
Exit codes are `0` for declared checks passed, `1` for a failed check, and `2` for
blocked verification. A run with changing declared sources or scenario is blocked.

Review the actual screenshots. Full-page captures can position fixed navigation
over content; inspect an initial viewport separately when that matters. Screenshot
collection alone does not establish visual quality, focus visibility, contrast,
screen-reader behavior, reduced-motion correctness, or performance.

For an implementation task, establish the scenario from the user task before
editing, capture the baseline, fix the observed failure within scope, then rerun
the same scenario. Keep baseline failures as evidence. Stop when the completion
checks pass and visual review is satisfactory, when a product decision is missing,
or when two repair attempts repeat the same failure without new evidence. Continue
independent checks if only part of the task is blocked. No-edit reviews remain no-edit.

Source hashes cover only declared files. Include the lockfile and relevant source
and built assets when claiming results for a particular implementation. The report
also records the scenario, runner files, browser version, settings, and duration.
It does not detect edits elsewhere or prove that a running server serves those
files; confirm the server/build correspondence. Use the same scenario/settings
for comparisons, and preserve evidence before deleting a temporary application.

An operator must own collection when grading an agent. Candidate-authored reports,
changed assertions, or a script that merely prints success are not trusted evidence.
Artifacts remain local and can contain application text or images. Error strings
receive limited credential/URL redaction; screenshots are not redacted. Use synthetic
data or the consuming project's approved review-data policy before sharing.

## Optional MCP invocation

In the consumer, bind the same command and reviewed scenario to the package script
`verify:expressivecss`. Call `quality_inspector` with `runType: "consumer"` and
`runCommands: true`. The existing MCP operator command-root allowlist still applies;
the tool cannot supply shell text, arbitrary script names, or broaden that policy.
The development server must already be running.

MCP reports command completion and captured output, with its existing redaction
and timeout behavior. It does not trust the project script's claims or import its
report as proof. Inspect the operator-collected artifacts separately. MCP remains
optional, and it does not bundle or download Playwright.
