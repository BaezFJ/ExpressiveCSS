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
 * Enough of the accessible-name computation to answer "is this control
 * nameless?" - aria-label, then aria-labelledby, then the text that is left
 * once the aria-hidden subtrees are taken out. Not the full algorithm: no
 * title, no <label>, no alt on a descendant image, because a control relying
 * on those is not what this is looking for.
 */
export function accessibleName(el, document) {
  const label = el.getAttribute('aria-label');
  if (label && label.trim()) return label.trim();
  const ref = el.getAttribute('aria-labelledby');
  if (ref) {
    const text = ref
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim();
    if (text) return text;
  }
  const clone = el.cloneNode(true);
  clone.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  return clone.textContent.trim();
}

export function violations(html, rules, compositeRoles, { fragmentSafe = false } = {}) {
  const { document } = new JSDOM(`<!doctype html><body>${html}</body>`).window;
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
export function duplicateLandmarkNames(html) {
  const { document } = new JSDOM(html).window;
  const seen = new Set();
  const dupes = [];
  for (const nav of document.querySelectorAll('nav')) {
    const label = nav.getAttribute('aria-label');
    const ref = nav.getAttribute('aria-labelledby');
    const name = (
      label ?? (ref ? (document.getElementById(ref)?.textContent ?? '') : '')
    ).trim();
    if (!name) continue;
    if (seen.has(name)) dupes.push(name);
    seen.add(name);
  }
  return dupes;
}
