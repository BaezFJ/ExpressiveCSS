# CONTEXT

Vocabulary for ExpressiveCSS. Definitions only — this file states no rules and
prescribes no markup. The rules that *use* these terms live in
[`SEMANTICS.md`](SEMANTICS.md), generated from `semantics.json`; how the project
is built lives in [`CLAUDE.md`](CLAUDE.md).

---

**The element is the component.** The naming of the principle that a
component's identity is carried by the HTML element it is written with, rather
than by a class name on a generic one — an article is a card, a footer is the
page footer. Under this reading a class is a modifier of a component, never
what makes it one.

**Static semantics.** Anything about a component knowable without user
interaction: its element, its role, whether it is a landmark, the hiding of
decorative content, and the *presence* of an accessible name. The defining
property is that static semantics are true of the markup as written, before any
script has run.

**Dynamic state.** The runtime *value* of a state that changes as the user
interacts — expanded or collapsed, current or not, selected or not. The
defining property is the mirror of static semantics: only the running component
knows it. The boundary between the two runs through a label: that a control
*has* one is static, its text is authored content, and only a changing value is
dynamic.

**Composite role.** An ARIA role that governs a set of child elements and
thereby promises a keyboard model — `tablist`, `menu`, `listbox`, `grid`. A
composite role is a contract, not a description: declaring it tells assistive
technology the user can drive the widget with arrow keys, and a component that
declares one without implementing that keyboard model is less usable than one
that declares nothing. Distinct from a simple role (`button`, `img`), which
promises nothing beyond what the element already does.

**Display chip.** A chip that presents information and cannot be acted on —
no click target, no toggle, no removal. It is not a control, takes no place in
the tab order, and is a chip only in appearance. Distinct from the assist,
filter, input, and suggestion chips of Material 3, all of which are
interactive.

**Enforced / exempt.** The two states a component holds in the semantics data
file. *Enforced*: its rules run and a violation fails the suite. *Exempt*: its
rules are recorded but do not run, because the component has not been swept
yet.

**Surface.** A place in the repository that states component markup and can
therefore drift from the standard. Generated output is not a surface of its
own — it inherits whatever its source states.

**Sweep.** Bringing one component's markup to the standard across every surface
at once, and moving it from exempt to enforced.
