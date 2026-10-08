# Delegating large reviews

Keep the work in one context when it covers a few components. When an Audit or Critique spans many component groups, routes, or window classes, split it into scopes that share no files or findings and hand each to a subagent. A subagent starts without this conversation, so its brief must carry the skill path, resolved framework version and resolver status, task classification, the guides it must read, the files or URLs in scope, the available browser route, and what is out of scope. Ask for findings as rows with rule or criterion ID, file and line or URL, evidence kind (source, browser, unavailable), and status. Merge by ID, drop duplicates, and re-check any finding you will report against its cited evidence. A subagent's claim is a lead until verified.

Brief template:

```text
Skill: <skill-directory> (read SKILL.md, then only the guides listed here)
Framework: ExpressiveCSS <version>, resolver status <match|mismatch|unresolved>
Task: <classification from the routing table>, read-only unless stated
Guides: <guide paths>
Scope: <files, routes, or URLs>; out of scope: <everything else>
Browser route: <tool and origin, or "unavailable: source evidence only">
Return: one row per finding
  | ID | Location | Evidence kind | Status | Observation |
Report checks you could not run as Blocked; do not mark them passed.
```
