# Scope and recovery

Use this reference for autonomous implementation, repeated repair loops, or command-assisted MCP verification. A skill describes the workflow; permissions must be enforced by the tool host or server.

## Establish the boundary

Use the current request and existing project instructions to identify allowed files, commands, browser origins, completion checks, and stopping conditions. Reuse authorization already given. Proceed with routine reversible work within that scope; ask only for a missing decision that changes the result or for authority the task does not provide. Do not turn a repair into a dependency upgrade, global redesign, deployment, or publication.

Inspect the working tree before edits. Preserve staged, unstaged, and untracked user work, including changes inside files the task touches. For a repair loop that needs isolation, use the host's sandbox and a disposable checkout or worktree containing the relevant current edits. A worktree based only on HEAD omits those edits. Record the starting file contents or hashes and retain the candidate patch separately before cleanup. A file list in a prompt is an instruction, not a filesystem permission boundary.

Inspect project scripts and their hooks before running them. An allowed script name can still execute arbitrary project code. Apply the host's filesystem and network restrictions; an MCP project-root allowlist only controls where a command starts. Do not infer write permission from a passing check or from tool annotations. For browser checks, use the supplied local origin and existing consumer runner's request restrictions. Authorize mutation requests only when the task covers their effects.

## Verify the current candidate

Choose completion criteria from the user's task: the intended action works, relevant keyboard and responsive behavior survive, and the changed-file diff stays within scope. Keep visual acceptance separate from mechanical checks. Run the same focused scenario after a repair; retain failures as well as passes.

Associate evidence with the files actually inspected. A commit ID alone misses uncommitted changes. The consumer runner hashes its declared sources and scenario; MCP `quality_inspector` returns `inspectionEvidence` with hashes of the bytes read and whether they changed during the call. Optionally pass `expectedSourceHashes` copied from an operator-owned prior result to reject a stale candidate before commands run. Missing or mismatched pins block dependent work. These endpoint comparisons cover only named files, not an atomic revision snapshot or undeclared dependencies. Recheck after subsequent edits.

The MCP operator can narrow commands with `EXPRESSIVECSS_MCP_ALLOWED_SCRIPTS`, a JSON array drawn from `typecheck`, `test`, and `verify:expressivecss`. The server also requires an allowed command root and `runCommands: true`. A denied list blocks the whole requested command sequence. The server stops after a failed, interrupted, or timed-out command, or changed inspected inputs. Read `commandsNotRun` and `blockedChecks`; unrun checks did not pass. Do not edit scripts or server settings to bypass a denial.

## Recover without losing work

After failure, retain the failing command or browser observation, candidate diff, and input hashes. Repair a diagnosed cause within scope, then rerun the relevant check. A changed selector or source fix can justify another attempt. A permission or unavailable-tool failure needs changed authority or capability; repeated identical failures need new evidence before another attempt. Honor any explicit time or attempt budget. Stop dependent work when it is exhausted, required authority is absent, concurrent edits invalidate the baseline, or no supported repair is available. Continue independent authorized work and report the blocker.

Recover in the isolated candidate first. In a shared checkout, reverse only this task's own changes after confirming the touched content still matches the recorded candidate. If someone changed it, preserve both versions and resolve the conflict. Never use a whole-tree reset, clean, stash drop, or checkout of a file merely to make tests pass. Do not restore an old file over newer user edits. MCP verification does not restore files automatically.

Finish with the resulting diff, checks actually completed, remaining failures or unavailable evidence, and the next required decision. Cleanup only resources owned by this attempt, including browser contexts, component instances, timers, servers, and disposable directories after retaining review artifacts. Do not call a stopped or recovered attempt a successful implementation.
