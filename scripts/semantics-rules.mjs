/**
 * The semantics.json rule engine, shared by the two seams that run it.
 *
 * tests/semantics.test.js runs it over authored fragments -- the examples a
 * reader copies, in llm.md, the documentation pages and tests/fixtures.js.
 * scripts/verify-site.mjs runs it over the built pages, where chrome and
 * content finally meet and document-level rules like main-not-nested become
 * answerable at all.
 *
 * It lives under scripts/ rather than tests/ because a test file cannot be
 * imported without running its tests.
 */

import { JSDOM } from 'jsdom';

export const FORBID_KINDS = ['forbid', 'forbid-composite-roles'];

/**
 * What a rule actually matches.
 *
 * `forbid-composite-roles` states the component's own selector and is expanded
 * over the vocabulary, so the ten roles are named once in semantics.json rather
 * than once per component - and adding one tightens every such rule instead of
 * leaving each a role short. Expansion is root-only on purpose: a slide may
 * legitimately contain a menu, it just may not *be* one.
 */
export function expandedSelector(rule, compositeRoles) {
  if (rule.kind !== 'forbid-composite-roles') return rule.selector;
  return compositeRoles.map((r) => `${rule.selector}[role="${r}"]`).join(', ');
}

/** Every rule of every component the sweep has reached. */
export function enforcedRules(data) {
  return Object.entries(data.rows)
    .filter(([, c]) => c.status === 'enforced')
    .flatMap(([name, c]) => c.rules.map((r) => ({ ...r, component: name })));
}

/**
 * The name an element is given outright, by `aria-label` or `aria-labelledby`.
 * Empty when it has neither.
 *
 * The two callers below diverge on what happens next, which is why this stops
 * here: a control falls back to its own text, a landmark does not. A <nav>
 * full of links is not named by the links in it.
 */
function authoredName(el, document) {
  const label = el.getAttribute('aria-label');
  if (label && label.trim()) return label.trim();
  const ref = el.getAttribute('aria-labelledby');
  if (!ref) return '';
  return ref
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
    .trim();
}

/**
 * Enough of the accessible-name computation to answer "is this control
 * nameless?" - the authored name, then the text that is left once the
 * aria-hidden subtrees are taken out. Not the full algorithm: no title, no
 * <label>, no alt on a descendant image, because a control relying on those is
 * not what this is looking for.
 */
export function accessibleName(el, document) {
  const authored = authoredName(el, document);
  if (authored) return authored;
  const clone = el.cloneNode(true);
  clone.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  return clone.textContent.trim();
}

/**
 * An authored fragment, parsed into a body of its own.
 *
 * Never for a whole document: nesting one inside <body> reparses its <head> in
 * body context, so a rule keyed on anything up there would silently match
 * nothing. Whole pages go through `checkPage`.
 */
export function violations(html, rules, compositeRoles, opts) {
  const { document } = new JSDOM(`<!doctype html><body>${html}</body>`).window;
  return violationsIn(document, rules, compositeRoles, opts);
}

export function violationsIn(document, rules, compositeRoles, { fragmentSafe = false } = {}) {
  const found = [];
  for (const rule of rules) {
    if (fragmentSafe && !rule.fragmentSafe) continue;
    const hits = [...document.querySelectorAll(expandedSelector(rule, compositeRoles))];
    if (FORBID_KINDS.includes(rule.kind)) {
      for (const el of hits) found.push({ rule, tag: el.outerHTML.slice(0, 90) });
    } else if (rule.kind === 'require-attr') {
      for (const el of hits) {
        const v = el.getAttribute(rule.attr);
        const ok = rule.equals ? v === rule.equals : v !== null && v !== '';
        if (!ok) found.push({ rule, tag: el.outerHTML.slice(0, 90) });
      }
    } else if (rule.kind === 'require-idref') {
      for (const el of hits) {
        const ids = (el.getAttribute(rule.attr) ?? '').trim().split(/\s+/).filter(Boolean);
        const container = rule.container ? el.closest(rule.container) : document;
        const targets = container
          ? new Set(container.querySelectorAll(rule.targetSelector))
          : new Set();
        const ok = ids.length > 0 && ids.every((id) => targets.has(document.getElementById(id)));
        if (!ok) found.push({ rule, tag: el.outerHTML.slice(0, 90) });
      }
    } else if (rule.kind === 'require-owned-descendant') {
      for (const el of hits) {
        const ok = [...el.querySelectorAll(rule.descendantSelector)].some((candidate) => {
          if (candidate.closest(rule.ownerSelector) !== el) return false;
          if (!rule.excludeAncestorSelector) return true;
          const excludedAncestor = candidate.closest(rule.excludeAncestorSelector);
          return !excludedAncestor || !el.contains(excludedAncestor);
        });
        if (!ok) found.push({ rule, tag: el.outerHTML.slice(0, 90) });
      }
    } else if (rule.kind === 'require-accessible-name') {
      // The one thing a selector cannot ask. "Has no accessible name" depends
      // on text *nodes*, and CSS cannot see them: `:has(> .icon:only-child)`
      // counts elements, so it flags <a><span icon/>Five</a> - a link that is
      // perfectly well named. This reads the content instead.
      for (const el of hits) {
        if (!accessibleName(el, document)) found.push({ rule, tag: el.outerHTML.slice(0, 90) });
      }
    } else {
      throw new Error(`unknown rule kind: ${rule.kind}`);
    }
  }
  return found;
}

/**
 * The landmarks on one page that share a name.
 *
 * No semantics.json rule can state this: a name is only ambiguous relative to
 * the other landmarks on the same page, and there is no fragment to write it
 * against. Two <nav>s both called "Main" is a landmark menu with two identical
 * rows, which is the problem labelling them was meant to solve. Shipped once.
 */
function duplicateLandmarkNames(document) {
  const seen = new Set();
  const dupes = [];
  for (const nav of document.querySelectorAll('nav')) {
    const name = authoredName(nav, document);
    if (!name) continue;
    if (seen.has(name)) dupes.push(name);
    seen.add(name);
  }
  return dupes;
}

/**
 * One built page, checked as the document it is: every enforced rule, plus the
 * landmark names, which are only ambiguous relative to each other.
 *
 * Parsed once, and as a document rather than a fragment - `<!doctype html>` and
 * `<head>` survive, so a rule may be written against either.
 */
export function checkPage(html, rules, compositeRoles) {
  const { document } = new JSDOM(html).window;
  return {
    violations: violationsIn(document, rules, compositeRoles),
    duplicateNames: duplicateLandmarkNames(document)
  };
}
