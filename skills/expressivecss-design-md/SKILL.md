---
name: expressivecss-design-md
description: "Interviews the user, then writes or updates a DESIGN.md for an ExpressiveCSS project in the google-labs-code DESIGN.md format, mapped to ExpressiveCSS tokens, components and WCAG 2.2 AA. Use when asked to create, draft, update or lint a DESIGN.md, design brief, brand guide or style guide for ExpressiveCSS. Not for building or reviewing interfaces."
license: MIT
metadata:
  author: BaezFJ
  version: "0.1.0"
  tags: expressivecss, design-md, design-system, interview, accessibility
---

# ExpressiveCSS DESIGN.md interview

Interview the user about their product and brand, then write a `DESIGN.md` that later ExpressiveCSS work reads to keep the interface consistent. The file follows the [DESIGN.md format](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md), version `alpha`: YAML tokens hold exact values and Markdown prose holds the intent. Every decision in it must be something ExpressiveCSS can express with documented markup or tokens, and none may lower the accessibility floor.

The framework knowledge lives in the sibling skill at `../expressivecss/` (call it `<base>`). Its guides, component references and version resolver are the source of truth. This skill adds the interview and the file format.

## Scope

The skill writes one file: `DESIGN.md` at the project root, or the path the project's instructions name. It does not edit CSS, markup or configuration. Applying the decisions, such as setting `--md-source`, loading typefaces or adding root attributes, is a separate task for `<base>`; offer it at the end.

## 1. Gather evidence before asking

Read first, so the interview confirms what the project already shows and asks only about gaps.

1. Look for an existing `DESIGN.md`. If there is one, follow section 5 instead of starting over.
2. Run `node <base>/scripts/resolve-version.mjs --project-root <project>` and note the result. For an idea with no project yet, record "not installed yet" and use the bundled guidance.
3. Search the project's stylesheets and root markup for decisions already made: `--md-source`, `--md-sys-color-*` overrides, `--md-ref-typeface-*`, `--md-sys-shape-corner-*`, `--md-sys-motion-*`, and the `theme`, `contrast`, `corners`, `motion`, `icon-style` and `vibrant` attributes. Note which navigation components exist and how many top-level destinations the product has.
4. Skim the README, brand assets and one representative page for purpose, audience and voice.

What the code does today is evidence of a decision, not approval of it; `<base>/expressivecss-design/references/product-context.md` explains the difference. Show the user what you found as a short list and ask them to confirm or correct it in the first round.

## 2. Run the interview

Read [the interview guide](./references/interview.md). It holds the questions in DESIGN.md section order, the options to offer, and how each answer maps to ExpressiveCSS.

- Ask in rounds of up to four related questions. Use the host's structured question tool when it has one (`AskUserQuestion` in Claude Code): two to four options per question, the recommended option first. Ask open questions, such as the product description, in plain text, and fall back to a numbered list when no tool exists.
- Skip a question the evidence already answers and confirm the observation instead.
- Give every question an ExpressiveCSS default so the user can move fast. When the user asks for defaults, ask only the product round and the brand color question, then mark every other decision as a default in the file.
- Ask about intent and feel, never raw CSS values. The exception is a brand color the user already has as a hex value.
- Push for a specific reference. "Modern, clean, trustworthy" covers a whole region of possible designs, while "a well-thumbed field notebook" or "a 1970s train timetable" names a point and brings its own restrictions. When the user gives only adjectives, ask once for a concrete object, place or printed artifact. Another company's app is a poor reference because copying it borrows their branding; ask which quality of it they want and record that quality.
- Ask what the interface must never feel like. Those answers become the Don'ts.
- Stop after about six rounds. Fill the remaining gaps with defaults and list them as open questions in the file.

## 3. Keep the accessibility floor and the contract

Every DESIGN.md this skill writes commits to WCAG 2.2 AA and to the ExpressiveCSS contract. The user can raise the bar, for example AAA text contrast or medium contrast by default, but cannot lower it. When an answer would break a rule:

1. Name the rule in one sentence.
2. Offer the closest choice that keeps the intent.
3. Record what was adopted. If the user turns down every alternative, list the request under Open questions as not adopted, with the reason. Do not write it as a rule.

The interview guide's conflict table covers the usual cases: pale brand colors, removing focus rings, small targets, status shown only by color, a brand red competing with the error role, perpetual motion, hidden labels and looks that need undocumented CSS.

Keep Material recommendations and WCAG criteria apart. Material recommends 48 by 48 dp targets; WCAG 2.2 AA requires 24 by 24 CSS pixels, with exceptions. `<base>/expressivecss-accessibility/SKILL.md` draws the same line. A request that meets WCAG but falls short of a Material recommendation, such as 28 px icon buttons, is the user's call: state the trade-off in one sentence, recommend the Material value, ask which they want, and record the answer with its source. When the user cannot answer, keep the Material value and list the question under Open questions. A request below the WCAG floor is not adopted.

Styling tiers come from `<base>/expressivecss-design/references/style-directions.md`. Markup choices, such as root attributes, type-role classes and component variants, need no special approval. Token overrides, such as a new seed, typefaces or a changed corner scale, are fine once the user has agreed to them in the interview. A look that needs new selectors or undocumented CSS, such as hard offset shadows, thick borders or monospace type, is custom tier: record it only after the user agrees, with the reason. Never invent a class, attribute or variant to complete a look.

## 4. Write the file

Fill in [the template](./references/template.md). It fixes the structure:

- YAML front matter with `version: alpha`, `name` and `description`, then `colors`, `typography`, `rounded`, `spacing`, and an `expressivecss` key for the root attributes, typefaces and framework version. Each top-level key appears once in the whole file.
- `##` sections in the format's order: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts. The extra sections (Motion, Iconography, Accessibility, Open questions, Decision log) go where the template places them; the format keeps sections it does not know.

These rules keep the file true to ExpressiveCSS:

- `colors.primary` is the brand seed that becomes `--md-source`. ExpressiveCSS derives every color role for both schemes from it, so do not invent hex values for other roles. Add a role token only for an override the user asked for, with its light and dark values.
- Typography tokens copy the framework's scale from `<base>/expressivecss-theming/references/typography.md`, with the chosen typefaces as `fontFamily`. Record only the roles the product uses.
- `rounded` and `spacing` use the framework's corner scale and spacing steps listed in the template. When the resolver reports a version other than the bundled one, read the values from the installed package's `src/sass/tokens/_shape.scss`, `src/sass/utilities/_spacing.scss` and `src/sass/components/_panes.scss` instead.
- Leave out `components` tokens unless the user overrode a component's colors. ExpressiveCSS components own their tokens, so the Components prose maps each job to a documented component and variant instead.
- Write prose that says when and why each value applies, and refer to tokens as `{colors.primary}`. The prose carries the design; the tokens give it exact values.
- Name only documented components, classes, attributes and tokens. Check each one against `<base>/references/component-decisions.md`, the selected component guide or the theming references before writing it down.
- Tag each decision with its source: confirmed by the user, observed in the code, or an ExpressiveCSS default.

Before writing, show the user a short summary of the decisions, not the whole file, and ask for corrections. Then write the file. Do not overwrite an existing `DESIGN.md` without the user's agreement.

## 5. Update an existing DESIGN.md

Read the whole file and check it against the template rules. Ask only about the sections the user wants to change and about anything that conflicts with the current code or contract. Keep sections, notes and custom keys you were not asked to change. When a decision changes, edit it in place and add a dated entry to the Decision log naming what it replaced and why, so the earlier reasoning stays on record.

A DESIGN.md written for another framework, for example one with Tailwind-style tokens or a full hand-picked palette, still holds useful intent. Keep its Overview, reference and Don'ts, and translate its values into ExpressiveCSS levers with the user: the main brand color becomes the seed, and other palette entries become overrides only if the user insists on exact values.

## 6. Validate

1. Re-read the file. Check that the front matter parses as YAML, every top-level key appears once, each `{path}` reference resolves to a token, the known sections are in order and no heading repeats.
2. When Node and network access are available, run `npx --yes @google/design.md@0.4.0 lint DESIGN.md` from the directory that holds the file and fix any error. A `missing-sections` or `orphaned-tokens` note is expected when the file relies on framework defaults; mention it instead of padding the file to silence it. If the command cannot run, say so.
3. For every hex pair the user chose explicitly, such as a role override, compute the WCAG contrast ratio and record it next to the pair. Seed-generated roles can only be measured once the theme is applied; the Accessibility section commits to measuring them then.

## 7. Hand off

Report the file path, the decisions left at defaults and the open questions. Offer the next step through `<base>`: apply the theme with `<base>/expressivecss-theming/SKILL.md`, or build a first surface that follows the file with `<base>/expressivecss-design/SKILL.md`.
