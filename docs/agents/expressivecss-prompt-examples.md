# ExpressiveCSS prompt examples

Copy a prompt into your agent while working in the target application. Replace
angle-bracket placeholders with your paths and product details. These prompts
request application UI built with ExpressiveCSS. Adding a new component to the
framework itself is a separate contribution task.

Name the user's job and what success looks like. "Make it more expressive" leaves
too much undecided. "Help a first-time writer notice Preview before publishing"
gives size, typography, color, containment, shape, and motion a purpose.

Each example can stand alone. The ExpressiveCSS skill supplies version resolution,
component contracts, guide routing, accessibility, and runtime ownership. You do
not need to paste every support guide or ask the agent to read the whole library.

## Adaptable starting prompt

```text
Use the ExpressiveCSS skill to implement <component or page> in <path or route>.

The users are <audience>. They need to <primary task>. Success means <observable
result>. Include <content, actions, and destinations>. Preserve <existing product
identity, behavior, URLs, and constraints>.

Use Material 3 Expressive to make <specific action or content> stand out. Keep
<secondary work> quieter. Choose components by their behavior and explain any
important alternative you reject. Use the installed ExpressiveCSS contracts and
existing project assets. Distinguish supported framework features from local CSS
overrides; verify uncertain capabilities before using them.

Implement the working result in the existing stack. Keep changes within <scope>.
Reuse existing data and services. If a backend is absent, make the demonstration
behavior explicit. Ask only about missing product decisions that would change
the result; resolve ordinary implementation choices from the project.

Render the result at <representative widths>. Exercise <critical interaction>
with keyboard and pointer. Review the actual screenshots, correct visible issues,
and report what was tested, what changed, and what remains unverified. Keep visual
judgments separate from measured behavior and accessibility findings.
```

## Component prompts

### 1. Primary and secondary form actions

```text
Use the ExpressiveCSS skill to build the action area for the form in <file>.
The primary task is Save preferences. Preview preferences is a secondary action
that opens a read-only summary of current values without submitting the form.
Keep the existing save handler and form fields.

Choose supported common-button variants and sizes so Save is clearly primary.
Keep Preview visually quieter and use an explicit non-submitting button type.
Use a short visible label for each action. Add an icon only if an existing project
asset helps users recognize the action. Reuse existing preview behavior or add
only the application code needed for the summary. The buttons themselves should
use the CSS component contract without framework initialization.

Check keyboard activation, visible focus, label wrapping, and the two actions
at 375px and a wide layout. Verify that Preview does not trigger submission and
Save still works. Check focus when opening and leaving the preview. Show the
rendered result and explain the emphasis decision. Keep the change limited to
the action area and preview.
```

### 2. A preference form with the right selection controls

```text
Use the ExpressiveCSS skill to implement a notification-preferences component
in <file>. Users choose exactly one delivery frequency, Daily or Weekly, and
independently choose email and in-app notifications. Save commits these values
through the existing application handler.

Compare a segmented radio control with ordinary radio rows for delivery frequency.
Use native form state for values and appropriate controls for independent choices.
Explain why formatting-style toggle buttons would or would not fit this job.

Give the group a clear heading, visible labels, and brief help only where needed.
Make Save the highest-emphasis action. Keep field containment quiet enough that
it does not compete with the decision. Show the current values and a nonblocking
save confirmation. Preserve values after a failed save and expose a working retry
using the existing handler or a clearly labeled local demo.

Verify keyboard selection, submitted values, error recovery, light/dark appearance,
and long labels at a narrow width. Use matching installed component contracts.
Initialize runtime components only if the selected controls require them.
```

### 3. Navigation that adapts without changing meaning

```text
Use the ExpressiveCSS skill to build navigation for the existing destinations
Home, Projects, and Activity in <layout file>. Preserve their actual URLs and
current-page state. These are application destinations, not panels within a page.

Choose the appropriate navigation components for the available window classes.
Use exactly one visible peer-navigation presentation at a time. Make the compact
layout comfortable to use without covering page actions, and keep the wide layout
from consuming the space needed by the primary task. Explain why tabs would or
would not fit these destinations.

Preserve native link behavior, accessible names, keyboard access, and visible
focus. If a drawer is needed, use its documented runtime ownership and verify
dismissal and focus return. Do not add a drawer just to fill the layout.

Render narrow and wide views and test immediately on both sides of the chosen
breakpoints. Confirm that every destination remains reachable, navigation does
not duplicate, and content has no horizontal overflow.
```

### 4. Feedback for saving, offline work, and deletion

```text
Use the ExpressiveCSS skill to implement feedback in <screen> for three events:
a routine draft save succeeds, a network failure prevents saving, and the user
requests permanent deletion of the draft.

Choose feedback components by interruption and recovery needs. Compare inline
status or Snackbar for routine success, persistent feedback for the save failure,
and confirmation for irreversible deletion. Keep success from interrupting work.
The failure must explain what happened, retain the draft, and offer a functioning
retry. Confirm deletion before performing the destructive action.

Use the existing save/delete services. If this is a prototype, use local state
with explicit demo labeling and no real deletion. Avoid duplicate announcements
when a component already owns live-region behavior. Preserve focus after feedback
and restore it appropriately after a dismissed dialog.

Exercise success, failure, retry, cancel, and confirm using keyboard and pointer.
Verify accessible names, focus behavior, and reduced-motion outcomes. Keep Material
component-fit judgments separate from the measured interaction results.
```

### 5. A media card that supports one clear action

```text
Use the ExpressiveCSS skill to build a reusable workshop card in <component path>.
It contains an existing image, workshop title, date/time, location, availability,
and a View workshop link. Use real supplied content and destination URLs.

Choose a card treatment that makes the title and destination easy to scan. Use
containment to group the workshop, and keep metadata subordinate. If the entire
card is actionable, preserve valid link semantics and avoid nested interactive
controls. Do not add badges or secondary actions without a content requirement.

Preserve the image's intended crop and reserve its dimensions. Choose alt text
based on whether the image conveys information beyond the adjacent text. Distinguish
offscreen cards from a prominent initial-view image when deciding loading behavior.
Do not lazy-load an image identified as the page's LCP candidate.

Check a long title, missing optional image, unavailable workshop, keyboard focus,
and a narrow container. Show the card in its actual page context and verify that
it remains readable in light and dark themes. Use existing assets and CSS where
possible, with no JavaScript solely for decoration.
```

## Complete-page prompts

### 6. Account dashboard with a clear primary task

```text
Use the ExpressiveCSS skill to implement the account dashboard at <route>.
The main task is to review notification preferences, change them, and save.
Include the existing account summary, preferences form, recent activity, and
navigation destinations. Preserve real product names, URLs, data, and handlers.

Build a coherent Material 3 Expressive page. Use the heading, one focused tonal
region, and the primary action to establish hierarchy. Keep account metadata and
activity quieter. Choose where containment adds meaning instead of wrapping every
line or field in a card. Use the product's semantic color roles, supported type
scale, icon family, and scoped shape choices.

On mobile, place the preferences task before secondary activity and keep navigation
from displacing it. On wide screens, use the extra space for related information
while preserving reading order and action priority. Include loading, empty, error,
and long-content activity states with meaningful next steps. Use existing data
services or clearly identified local fixtures.

Implement the working page, then review it at 375px, 768px, and 1280px, plus both
sides of any component breakpoint. Check light/dark themes, keyboard save and
feedback, focus visibility, reduced motion, and enlarged text. Inspect initial-view
and full-page captures, fix visible issues, and separate design judgments from
contract checks and unavailable verification.
```

### 7. A newsletter editor with selective expression

```text
Use the ExpressiveCSS skill to build a newsletter editor at <route>. Community
volunteers write a subject and message, choose simple preview formatting, preview
the result, and save a draft. Preview is the primary task; Save draft is secondary.
Publishing is outside this task.

Make the page welcoming to a first-time writer. Use a supported emphasized heading
and a larger primary Preview action, with a scoped corner treatment. Keep ordinary
writing controls calm and readable. Explain which choices come from the installed
framework and which are application overrides. Do not assume native Android type
or spring APIs are available in this web package.

Use an open writing area and a distinct preview region. Choose controls for Bold
and Italic as independent formatting commands. Preserve safe text rendering unless
the application already has a supported rich-text pipeline. Preview must retain
the draft, move focus sensibly, and provide Edit to return to writing. Save must
show nonblocking feedback through the existing service or explicit local demo.

Implement and render the full page at narrow and wide widths. Test long content,
keyboard formatting, Preview, Edit focus return, and Save. If you add motion,
verify the final visible state with reduced motion and when a transition is
interrupted. Review the whole composition, including the secondary action.
```

### 8. A list-detail reading workflow

```text
Use the ExpressiveCSS skill to implement a reading list at <route>. Users scan
existing article titles and summaries, open an article, mark it read, and return
to their place in the list. Preserve article IDs, destinations, and reading state.

Compare the supported panes/list approach with simpler native links before choosing
the structure. Use a two-region layout only where space supports it. On a narrow
screen, make the active task clear and provide a reliable way back. Keep selection,
read state, browser navigation, and focus behavior consistent across layouts.

Give the selected article room for comfortable reading. Use typography and one
meaningful emphasis change to identify it. Keep the surrounding list easy to scan;
avoid giving every item the same strong fill or oversized heading. Use supplied
content, semantic color roles, and existing assets.

Include empty results, a loading article, a recoverable error, and a long title.
Connect real services where available; otherwise label the local demonstration.
Verify keyboard selection, opening, returning, marking read, and resizing across
the layout change. Review both themes and enlarged text. Initialize only the
components that need runtime support and verify cleanup when the page unmounts.
```

### 9. A public workshop landing page

```text
Use the ExpressiveCSS skill to create a workshop landing page at <route>.
The primary task is Register for the workshop through <existing destination>.
Use <approved content file> for the event name, date, location, agenda, host details,
accessibility information, and price. Use images from <asset directory>. Clearly
label missing factual content rather than inventing testimonials or availability.

Set a Material 3 Expressive direction appropriate for a local community event.
Give the event title, one relevant image, and Register a clear hierarchy. Use
supported typography, semantic color pairs, and selective shape/containment to
connect the sections. Keep repeated calls to action contextual and avoid filling
the page with competing high-emphasis buttons.

Design mobile first, with useful event facts and the registration path easy to
find. Let larger layouts improve composition without creating empty space between
related facts. Preserve meaningful heading order, landmarks, native links, readable
line lengths, and visible keyboard focus. Add motion only when it explains a state
change and preserve the outcome under reduced motion.

Implement the page in the existing stack. Reserve media dimensions, reuse font and
icon assets, and avoid duplicate loading or unnecessary runtime code. Render at
375px, 768px, and 1280px. Inspect the actual screenshots, verify registration and
in-page links, check text enlargement and contrast, and report unavailable checks.
```

## Follow-up prompts

### Refine an existing result

```text
Use the ExpressiveCSS skill in Refine mode on <page or component>. Improve hierarchy,
typography, spacing, containment, and responsive fit while preserving product
identity, content, URLs, information architecture, and behavior.

Capture the baseline before editing. Identify the few changes that most improve
the primary task and implement them within <allowed files>. Keep important action
and content ranks consistent in light and dark themes. Use supported component
variants and scoped tokens, and preserve the existing runtime ownership.

Capture matching after views using the same route, data, state, viewport, theme,
and motion preference. Exercise the primary task again. Explain the observed
improvements and remaining tradeoffs separately from measured checks. If matching
baseline evidence is unavailable, say so before making comparison claims.
```

### Review quality without editing

```text
Use the ExpressiveCSS skill to Critique, then Audit, <page or component>. Do not
edit files. The primary user task is <task>, and success means <observable result>.

First inspect rendered views and assess component fit, action hierarchy, supported
typography, shape, containment, and motion purpose in the product context. Explain
where a plausible component choice serves the wrong job. Judge the complete flow
as well as the individual controls.

Then check markup, keyboard behavior, focus, accessible names, contrast, relevant
states, responsive behavior, and runtime initialization/cleanup where applicable.
Distinguish Material recommendations, WCAG requirements, and observed browser
behavior. Do not present a design preference as an accessibility violation.

Give prioritized findings with source or browser evidence, user impact, and a
concrete suggested fix. Accept intentional adaptations when the rationale and
evidence support them. Keep unavailable checks explicit. Do not calculate an
aggregate design-quality score or treat static checks as proof of visual quality.
```

## Keep verification proportional

A button change needs checks for that button and the form behavior it can affect.
A full page needs checks for its complete task, composition, relevant states,
themes, and adaptive layouts. Pick representative widths and test component
breakpoint boundaries when adaptation changes. Native browser zoom and a scripted
font-size change are different tests; ask the agent to name the method it used.

For a performance investigation, append this to the relevant prompt:

```text
Capture a baseline and repeat the same browser scenario after the change. Inspect
resource loading, layout shifts, interaction traces, and retained component
resources relevant to the symptom. Record the settings and observations. Keep
laboratory measurements separate from field Core Web Vitals and claim improvement
only when the measurements support it.
```

## Supporting references

- [ExpressiveCSS skill and task routing](../../skills/expressivecss/SKILL.md)
- [Design workflow](../../skills/expressivecss/expressivecss-design/SKILL.md)
- [Component selection](../../skills/expressivecss/references/component-decisions.md)
- [Supported typography](../../skills/expressivecss/expressivecss-theming/references/typography.md)
- [Supported shape overrides](../../skills/expressivecss/expressivecss-theming/references/shape.md)
- [Motion support and limits](../../skills/expressivecss/expressivecss-theming/references/motion.md)
- [Web accessibility checks](../../skills/expressivecss/expressivecss-accessibility/references/web-checks.md)
- [Runnable settings, editor, and list-detail examples](../../skills/expressivecss/assets/examples/README.md)
