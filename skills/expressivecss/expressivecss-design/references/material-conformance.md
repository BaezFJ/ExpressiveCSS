# Reviewing Material 3 Expressive conformance

Use this reference when the task asks whether an interface or component follows Google's Material 3 Expressive specs, guidelines, or accessibility guidance. Ordinary implementation can use matching bundled contracts without expanding into a full Material review.

## Establish the relevant requirements

For each selected component, follow its Google links and inspect the relevant Specs, Guidelines, and Accessibility sections. Include the Expressive update and any foundation sections needed for the decision. Record the exact URL, section, review date, and requirement. An inventory listing, overview, Android API, or framework version match does not establish that those requirements were reviewed.

Reuse already reviewed material when its content and scope cover the current question. If Google pages conflict, record both statements and their contexts; do not silently combine them. For example, scaffold rail examples can show a toolbar beside navigation while component guidance restricts coexistence. Resolve the applicable variant and task before making a conformance claim. If evidence remains unavailable or contradictory, mark that specific claim Blocked and continue independent checks.

Google owns design intent. The resolved ExpressiveCSS version owns shipped markup and behavior. WCAG defines web conformance criteria, and APG describes keyboard behavior promised by an ARIA pattern. A native Android implementation is useful comparison evidence, not a web API or proof of web accessibility.

## Compare requirement by requirement

Keep the review in the task's existing evidence ledger or report. For each requirement record:

| Google requirement and source | Relevant variant/state | ExpressiveCSS support and evidence | Result or gap |
| --- | --- | --- | --- |
| Exact section and reviewed recommendation | Component, task, width, input path | Target-version source and scoped browser evidence | Supported, intentional web adaptation, missing support, or unverified |

Do not turn these classifications into an aggregate parity score. Map observations to the existing review matrix where possible. Add a source-specific requirement record for Material details the generic matrix does not cover, such as anatomy, spacing, shape, type, adaptive substitutions, or state behavior. A framework contract can pass while a Material requirement remains unmet.

An intentional web adaptation needs a concrete platform or task reason and evidence that usability and accessibility remain intact. It cannot waive a WCAG failure or change a hard Audit result to Pass. Report an unavailable interaction or assistive-technology check as unverified, even if source inspection passes.

Prefer current Expressive components for new designs. The decision index marks compatibility-only components and links their replacements. Retain legacy components or variants for maintenance, an explicit request, or a verified target-version capability gap; state the reason. Do not migrate an existing interface automatically. Google's "no longer recommended" is design guidance, not an API removal or an accessibility failure.

Check variant meaning in the resolved framework contract before replacing it. A current family can contain a legacy variant, and existing class names can already implement the Expressive replacement. Preserve navigation versus actions, form values, required selection, keyboard behavior, focus return, reading order and scroll ownership. If the replacement cannot preserve a required behavior, record the gap and use a supported alternative or retain the legacy component explicitly. Component guides contain the dated Google links and replacement conditions; token-set deprecation does not remove current component styles.

## Report and maintain only reviewed scope

Name the reviewed components, sections, variants, states, and evidence limits. Do not claim full component parity from one screenshot or one successful task path. Update source catalogue review metadata only for material actually inspected; generation must not advance review dates or erase existing gaps. Leave unrelated components' review status unchanged.

See the [priority component review](priority-material-review.md) for the seven components reviewed on 2026-09-13, scoped findings, and unresolved differences.

The remaining components are reviewed in [inputs and choices](inputs-material-review.md), [navigation, actions and sheets](layout-material-review.md), [content and feedback](feedback-material-review.md), and [web navigation extensions](web-extensions-review.md). Each names a scoped check or a concrete verification gap.
