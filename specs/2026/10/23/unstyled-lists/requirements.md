# Unstyled lists

Date: 2026-10-23
Roadmap phase: Phase 30, unstyled lists
Branch: `feature/2026-10-23-unstyled-lists`
Base: `origin/master` at `3ef49121a981a0ff664578ed425dbe8dee457d80`
Status: implemented and locally verified 2026-10-23; CI and review pending

Follow the [mission's agreed scope for utilities](../../../../mission.md#agreed-scope) and its [product rules](../../../../mission.md#product-rules), the [framework constraints](../../../../tech-stack.md#framework-constraints) and [roadmap Phase 30](../../../../roadmap.md#phase-30-unstyled-lists). Planned work is in [plan.md](plan.md); acceptance checks are in [validation.md](validation.md).

## Phase selection

The user asked for Phase 30 by number. It has no dependencies. Phases 25 to 29 come first in the roadmap and are unfinished, but none of them is a prerequisite, and Phase 25 is already being built on `feature/2026-10-23-line-clamp-utilities`.

## Current behavior

These facts come from the base commit.

- No utility class removes a list's markers or indentation. A page that wants a bare list writes its own CSS.
- About twenty component partials reset their own lists with `list-style: none` and `padding: 0`, among them `_list.scss`, `_menu.scss`, `_breadcrumb.scss`, `_pagination.scss` and `_tree.scss`, plus the chart label and axis mixins in `abstracts/_mixins.scss`.
- `.list` is the M3 list component (`src/sass/components/_list.scss`), and `semantics.json` has a `list` row for it with two rules.
- `.prose` indents only lists without a class (`:where(ul, ol):not([class])` in `base/_prose.scss`), so a classed list inside `.prose` gets no prose indentation.
- `fieldset.plain` in `components/forms/_fieldset.scss` is the only existing helper that strips a native element's container styling.
- `src/sass/utilities/_helpers.scss` holds the single-purpose classes, and `llm.md` documents them under "Helpers". Its "Formatting" section covers truncation and text wrapping.
- The roadmap records that WebKit drops the list role from a list with `list-style: none`. This spec does not verify that behavior (see "Known limits").

## Scope

One class removes a list's markers and its inline-start indentation. The list keeps its semantics in the markup, and the semantics checks flag it when it lacks `role="list"`.

### Expected behavior

- **R1.** A `ul` or `ol` with the class `list-unstyled` shows no markers on its items and has no inline-start padding, so its items start at the list's inline-start content edge in left-to-right and right-to-left pages.
- **R2.** The class keeps everything else about the list: its block margins, its items' `display: list-item`, and its element and role in the markup.
- **R3.** A nested list inside a `.list-unstyled` list keeps its own markers and indentation unless it also carries the class.
- **R4.** `semantics.json` has a rule that every `ul.list-unstyled` or `ol.list-unstyled` carries `role="list"`. `npm run build:semantics` puts it into `SEMANTICS.md`, and the semantics test applies it to the examples in `llm.md`, the docs pages, the fixtures and the M3 guidelines. The MCP server and skill ship the semantics data, so agents get the rule too.
- **R5.** `llm.md` and the helpers docs page document the class and its declarations, explain why the example carries `role="list"`, and show an example that passes R4. The changelog's Unreleased section lists the addition.
- **R6.** The CSS gzip budget in `tests/selective-builds.test.js` has a reviewed line for this change.

### Exclusions

- No reset of the list's block margins. Authors who want none add the spacing helpers, such as `.m-0`.
- No horizontal or inline list variant.
- No window-size prefixes. The mission asks for them where a layout changes, and markers and indentation do not change layout between window sizes.
- No change to the component partials that already reset their lists. Moving them onto the class would touch markup compatibility for no visible gain.
- No runtime script, and no automatic `role="list"`. Static semantics belong to the author's markup.
- No manual Safari and VoiceOver check. The user left it out of the merge conditions.

## Decisions

### Confirmed with the user on 2026-10-23

- The class is `.list-unstyled`. Bootstrap uses the same name, so authors and agents can guess it. A bare `.unstyled` could be read as a variant of the `.list` component. Tailwind's `list-none` removes only markers, so using that name for a class that also removes padding would mislead.
- The WebKit gap is handled by a `semantics.json` rule that requires `role="list"`, together with the docs note. The rule also fires on lists where the role may not matter, such as inside a `<nav>`. The user accepted that in exchange for a rule that catches a missing role in every checked example and in the MCP guidance.
- The plan has three groups: utility and browser test, then semantics rule and docs, then budget and repository checks. The user chose the semantics rule after picking the three-group split, so the rule went into the second group.
- Merge needs the browser geometry test, the `ariaSnapshot` list-role check and the repository checks.

### Proposals for implementation

- Declarations: `list-style: none` and `padding-inline-start: 0` on the list. `list-style-type` is inherited, so items lose their markers; nested `ul` and `ol` keep theirs because the browser's own stylesheet sets their `list-style-type` directly. The logical property mirrors in right-to-left pages.
- Placement: a "Lists" comment and the class in `src/sass/utilities/_helpers.scss`, after the text-behavior classes. It is not added to the `$_layout` map, which feeds the window-size prefixes.
- Rule: id `list-unstyled-has-list-role`, kind `require-attr`, selector `:is(ul, ol).list-unstyled`, `attr: "role"`, `equals: "list"`, `fragmentSafe: true`, in the `list` row. If the semantics test expects a row's rules to come from its own component's markup, put the rule in a new cross-cutting row described the way `landmarks` is.
- Docs: a "Unstyled lists" subsection under "Formatting" in `llm.md` and in `docs/src/pages/helpers.astro`, after "Text wrapping".

## Technical constraints

- Stylesheet work follows `src/sass/README.md`. Utilities sit in the `utilities` layer, after `components`, so the class wins over component and base rules of the same specificity but loses to unlayered page CSS, like every other helper.
- `semantics.json` owns the markup rule. Regenerate `SEMANTICS.md` with `npm run build:semantics` and the skill and MCP copies with `npm run build:skill`; never edit generated copies by hand. Run `npm run build:skill` after the last edit to `llm.md`, `CHANGELOG.md` or tests, because the contract hash covers them.
- Tests run against built bundles, so run `npm run build:css` before the browser test.
- Browser tests run in Chromium, Firefox and WebKit, one suite at a time.

## Known limits

- Playwright's `ariaSnapshot()` computes roles in its own injected script, not from the engine's accessibility tree. It reports a list in every engine whether or not WebKit keeps the role, so the automated checks cover the markup contract only.
- This phase does not check whether WebKit still drops the list role, or whether it keeps the role inside `<nav>`. The docs repeat the roadmap's statement and recommend `role="list"` either way.

## Dependencies

None. The work touches no TypeScript, so the fallow complexity gate does not apply.
