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

**Component.** A part of the framework an author writes markup for. The
defining property is authored markup: if there is no element a page author
writes in order to get it, it is not a component, however much style or script
stands behind it. Distinct from a foundation and a behavior, both of which an
author reaches for without writing anything new.

**Foundation.** A token or style system with no markup of its own — color,
typography, elevation, shape, motion, state layers. A foundation is consumed by
components rather than placed on a page, and its surface is custom properties
and utility classes rather than elements.

**Behavior.** Document-level script that attaches to markup the author has
already written, rather than defining markup of its own. The defining property
is that removing a behavior leaves the markup valid and meaningful; removing a
component removes the element.

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

**Roster.** The set of names the semantics data file holds a row for: every Sass
component partial, plus the entries recorded as additional for a component that
has no partial of its own, minus the partials recorded as stating no component.
The defining property is that it is derived rather than authored — a new partial
joins it by existing, so a missing row is a failure rather than an oversight. A
row states which of the three kinds above it is, and is a component unless it
says otherwise.

**Enforced / exempt.** The two states a component holds in the semantics data
file. *Enforced*: its rules run and a violation fails the suite. *Exempt*: its
rules are recorded but do not run, because the component has not been swept
yet.

**Conformance debt.** A promise a component's markup does not yet make because
the code behind it cannot keep it — most often a composite role withheld until
its keyboard model exists. It is recorded per component, naming the role being
withheld and what the withholding is blocked on. Distinct from *exempt*, which
is about whether a component's rules run at all: a fully enforced component can
still carry conformance debt.

**Rejected role.** A composite role a component will never declare, because it
implements a different pattern that the role would misdescribe. The defining
property is that nothing is owed: the code is not behind, it went another way.
Distinct from *conformance debt* in exactly that — debt is a promise deferred
until the code can keep it, a rejection is a promise declined.

**Surface.** A place in the repository that states component markup and can
therefore drift from the standard. Generated output is not a surface of its
own — it inherits whatever its source states.

**Sweep.** Bringing one component's markup to the standard across every surface
at once, and moving it from exempt to enforced.
