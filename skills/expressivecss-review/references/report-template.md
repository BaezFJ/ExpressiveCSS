# Scored review report template

Use the applicable sections and the scoring rules in `SKILL.md`. Follow any output format the user explicitly requests. Name untested areas so a high score cannot imply a complete review.

```markdown
# ExpressiveCSS interface review

## Framework score: <score>/100
[One or two sentences on framework compliance, code health, and design fidelity.]
Sections: Theme <n>, Layout <n>, Markup <n>, Lifecycle <n>, Rules <n> (out of 20 each)
Not checked: [Blocked areas and why, or "nothing blocked"]

## 1. Theme and tokens
Section score: <n>/20
* Critical issues:
  * [finding]
* Major issues:
  * [finding]
* Polish notes:
  * [finding, then any "Before you adapt it:" notes]

## 2. Layout and grid
Section score: <n>/20
* Critical issues:
  * [finding]
* Major issues:
  * [finding]
* Polish notes:
  * [finding, then any "Before you adapt it:" notes]

## 3. Markup and semantics
Section score: <n>/20
* Critical issues:
  * [finding]
* Major issues:
  * [finding]
* Polish notes:
  * [finding, then any "Before you adapt it:" notes]

## 4. Lifecycle and quality
Section score: <n>/20
* Critical issues:
  * [finding]
* Major issues:
  * [finding]
* Polish notes:
  * [finding, then any "Before you adapt it:" notes]

## 5. Framework rule violations
Section score: <n>/20
* Framework violations:
  * [critical|major|polish] [finding]

## Priorities
1. [Highest-impact fix, with location and the change to make]
2. [Next confirmed fix, if any]
3. [Next confirmed fix, if any]
```
