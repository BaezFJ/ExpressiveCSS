// Shadow-only loading. The sheet is supported as the *only* stylesheet a shadow
// root has - `shadowRoot.adoptedStyleSheets = [expressive]` with no copy in the
// document - which is what adr/0002-shadow-only-stylesheet-adoption.md commits
// to and what this enforces.
//
// The failure it guards is silent and total, not cosmetic. `:root` matches the
// document element and nothing else - and `html` and `body` are no more
// reachable - so a rule anchored on one never fires inside a shadow root: the
// tokens it declares are simply absent. And an
// undefined custom property makes its whole declaration INVALID AT
// COMPUTED-VALUE TIME - the property falls to its inherited or initial value
// rather than to the rule underneath - so the damage spreads past the token
// that went missing.
//
// It spread further than that here, which is why the split was worth closing
// rather than documenting. tokens/_theme.scss carried `:host` and resolved
// every role as light-dark(var(--md-sys-color-<role>-light), …); the pairs it
// names lived in the `:root`-only block in tokens/_reference.scss. So the half
// that was defined was defined in terms of the half that was not, and a
// shadow-only load lost every colour in the sheet, not just the 338 tokens the
// block declared.
//
// Custom properties inherit through shadow boundaries, so the ordinary setup -
// framework in the document, also adopted into components - was never affected.
// That is exactly why this needs a test: the broken configuration is not the
// one anybody develops in.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

// Comments are stripped before parsing: one sitting between two rules lands in
// the next rule's prelude and hides its selector from the check entirely, which
// is what let :root[theme='light'] - and only that one of the three - pass.
const source = css.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Every declaration block in the sheet, as { selectors, body }.
 *
 * Innermost brace pairs are the declaration blocks: dart-sass flattens all
 * nesting, and no value in the sheet contains a brace. The selector is what
 * follows the previous block's close, so at-rule preludes are skipped by name.
 */
function rules() {
  const out = [];
  for (const [, prelude, body] of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = prelude.slice(prelude.lastIndexOf('}') + 1).trim();
    if (!selector || selector.startsWith('@')) continue;
    out.push({ selectors: splitSelectorList(selector), body });
  }
  return out;
}

/**
 * Split on top-level commas only. A comma inside `:is(…)` or an attribute value
 * is part of one selector, not a separator - splitting on it naively turns
 * `.icon-button:is(:disabled, [disabled])` into a bare `[disabled]` that then
 * looks root-anchored.
 */
function splitSelectorList(selector) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) {
      out.push(selector.slice(start, i));
      start = i + 1;
    }
  }
  out.push(selector.slice(start));
  return out.map((s) => s.trim().replace(/\s+/g, ' '));
}

/**
 * The part of `selector` that pins it to a document, if any.
 *
 * Two shapes qualify, for two different reasons. `:root`, `html` and `body`
 * are *unreachable* from inside a shadow root - there is no document element
 * and no <body> in there - and stay unreachable however the compound
 * continues, so `:root.dark` and `:root:not([theme])` count too. A bare
 * attribute compound like `[vibrant]` is reachable as a descendant but never
 * as the host, which is the case the vibrant remap was written for.
 *
 * Returns null for anything naming a real element - `menu[id][vibrant]` and
 * `.icon-button:is([disabled])` already work inside a shadow tree.
 *
 * `--gap-size` on `body` is why the element anchors are here: `.row` reads it
 * with no fallback, so a grid in a shadow-only load had an invalid `gap`.
 */
function rootAnchor(selector) {
  const [head, root] = /^(:root|html|body)?/.exec(selector);
  if (root) {
    const after = selector.slice(head.length);
    const end = after.search(/[\s>+~]/);
    const compound = end === -1 ? after : after.slice(0, end);
    // An element anchor carries nothing into :host() - `body[dir=rtl]` is an
    // attribute of the document body, not of the shadow host. `:root` is the
    // host's own counterpart, so its compound comes along.
    return { arg: root === ':root' ? compound : '', rest: end === -1 ? '' : after.slice(end) };
  }
  const [attrs] = /^(?:\[[^\]]+\])*/.exec(selector);
  if (!attrs) return null;
  const rest = selector.slice(attrs.length);
  if (rest && !/^[\s>+~]/.test(rest)) return null;
  return { arg: attrs, rest };
}

/** The `:host` selector that reaches the same elements from inside a shadow root. */
function hostTwin({ arg, rest }) {
  return (arg ? `:host(${arg})` : ':host') + rest;
}

// color-scheme rides along with the custom properties because it is a token in
// everything but name: light-dark() resolves against the element's used
// color-scheme, so :root[theme='dark'] with no :host twin means a shadow tree
// cannot be pinned to a theme the way a page can.
const DECLARES_TOKEN = /(^|[\s;{])(--[A-Za-z0-9_-]+|color-scheme)\s*:/;

describe('Shadow-only loading', () => {
  test('every root-anchored rule that declares a token carries its :host twin', () => {
    const missing = [];
    for (const { selectors, body } of rules()) {
      if (!DECLARES_TOKEN.test(body)) continue;
      for (const selector of selectors) {
        const anchor = rootAnchor(selector);
        if (!anchor) continue;
        const twin = hostTwin(anchor);
        if (!selectors.includes(twin)) missing.push(`${selector}  ->  needs ${twin}`);
      }
    }
    assert.deepEqual(
      missing,
      [],
      'a token declared only on :root is undefined in a shadow-only load, and ' +
        'every declaration reading it is then invalid at computed-value time:\n' +
        missing.join('\n')
    );
  });

  test('the reference layer is one of them', () => {
    // The 338-declaration block that made the split fatal rather than partial.
    const ref = rules().find((r) => r.body.includes('--md-source:'));
    assert.ok(ref.selectors.includes(':host'), ref.selectors.join(', '));
  });

  test('a shadow-only load resolves --md-sys-color-* to real values', () => {
    // The pairs light-dark() names have to be declared wherever the roles are,
    // or the roles resolve to an invalid light-dark() and every colour is lost.
    const roles = rules().find((r) => r.body.includes('--md-sys-color-primary:'));
    const pairs = rules().find((r) => r.body.includes('--md-sys-color-primary-light:'));
    assert.ok(roles.selectors.includes(':host'), 'the roles reach a shadow host');
    assert.ok(pairs.selectors.includes(':host'), 'so do the pairs they resolve through');
  });
});
