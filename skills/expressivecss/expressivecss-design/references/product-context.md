# Continue one product across tasks

Use this reference when a surface must fit an existing application, when several pages share a design decision, or when accepted changes need recording. Product context explains the application's choices; the installed framework contract and accessibility requirements still apply.

## Find the existing record

Start with repository instructions and their links to a README, design notes, ADRs, shared layout, or theme documentation. Follow the nearest relevant record and inspect its named source and one representative sibling surface. Search for a missing decision only when it affects the task. Do not read the entire repository or copy its design documentation into the conversation.

Build the working brief from the relevant facts:

- Primary users, tasks, success states, and the action that deserves emphasis.
- Navigation destinations, stable URLs, shell and pane behavior across widths.
- Brand token owners, typography, icon family, imagery, density, and content voice.
- Shared patterns for forms, feedback, empty/error/offline states, and destructive actions.
- Accepted exceptions, including their reason and the routes, states, or audiences they cover.

Reuse links and decisions instead of transcribing token tables or duplicating shared components. Match peers by task and context: a dense administrative table is not a template for a first-use onboarding page. A route-specific exception does not establish a product-wide default.

## Separate decisions from evidence

Keep these distinctions in the brief or the project's existing format, without imposing a new schema:

- **Accepted decision:** a choice explicitly authorized by the user or an identified project decision record. Retain its scope, rationale, and source. Do not invent a reviewer or approval date.
- **Observed implementation:** what the current source or rendered interface does. Link the evidence; implementation alone does not prove that someone approved it.
- **Assumption or proposal:** an inferred default or suggested change, with the unresolved question. Do not later rewrite it as accepted merely because the agent implemented it.

Check dated notes against current tokens, shared components, routes, and the current request. A newer file timestamp alone does not settle a conflict. Follow an explicit current instruction that replaces an older choice and identify what it supersedes. If approved intent and implementation disagree, name both: code describes current behavior, not necessarily intended behavior. Ask only when the conflict changes the result and the task does not resolve it; continue independent work while that decision is pending.

Without design documentation, infer a small working brief from the nearest relevant surfaces and label those inferences. Proceed with reversible work that fits the request. Do not require a product-context file, questionnaire, configuration format, or new tooling before doing routine work.

## Carry useful decisions forward

When an authorized implementation changes a recorded decision, update the existing owning record as part of that work. In a planning or no-edit review task, report the proposed correction without writing files. Create a new record only when the user asks for one or an existing project convention calls for it; otherwise include a short handoff in the response.

Record only what the next task needs: the decision and reason, its scope, the source of acceptance, affected implementation links, and any superseded choice. Follow the project's history convention. Preserve unrelated notes and unresolved proposals; do not turn a local adjustment into a global brand policy. Keep verification evidence separate from approval: a passing contrast check does not approve a new brand, and an approved brand does not establish contrast compliance.

For example, if a user approves a roomier appointment form while keeping the scheduling table dense, record the form exception in the existing design notes with that scope. Leave a proposed navigation rename pending. The next page should inherit the shared navigation and theme, then choose density for its own task rather than copying the exception everywhere.
