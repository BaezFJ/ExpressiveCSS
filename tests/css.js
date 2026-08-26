// Shared parser for the tests that assert against the compiled sheet.
//
// Six files read `dist/css/expressive.css` and pick rules out of it. Five of
// them used to do it with `/([^{}]*)\{([^}]*)\}/g`, which is wrong in two ways
// that both fail silently - it finds a rule, just not the one you asked for.
//
// A comment between two rules lands in the next rule's prelude and hides that
// rule's selector entirely; that is how `:root[theme='light']` - and only that
// one of the three - slipped past an earlier draft of the shadow-DOM check. And
// a selector list has to be split on top-level commas only: splitting on every
// comma turns `.icon-button:is(:disabled, [disabled])` into a bare `[disabled]`.

import { readFileSync } from 'node:fs';

/** The compiled sheet, comments stripped. */
export function sheet() {
  const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Every declaration block in `source`, as `{ selector, selectors, body }`.
 *
 * Innermost brace pairs are the declaration blocks: dart-sass flattens all
 * nesting, and no value in the sheet contains a brace. The selector is what
 * follows the enclosing block's brace, so at-rule preludes are skipped by name
 * while the rules nested inside them are kept. `selector` is the whole list as
 * one normalised string; `selectors` is it split.
 */
export function parseRules(source) {
  const out = [];
  for (const [, prelude, body] of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const cut = Math.max(prelude.lastIndexOf('}'), prelude.lastIndexOf('{'));
    const list = prelude.slice(cut + 1).trim();
    if (!list || list.startsWith('@')) continue;
    const selectors = splitSelectorList(list);
    out.push({ selector: selectors.join(', '), selectors, body });
  }
  return out;
}

/**
 * Split a selector list on top-level commas only. A comma inside `:is(…)` or an
 * attribute value is part of one selector, not a separator.
 */
export function splitSelectorList(list) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) {
      out.push(list.slice(start, i));
      start = i + 1;
    }
  }
  out.push(list.slice(start));
  return out.map((s) => s.trim().replace(/\s+/g, ' '));
}
