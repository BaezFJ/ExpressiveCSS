// Enforces semantics.json against every surface that states component markup.
//
// Four surfaces state markup and can drift from each other: llm.md (the
// contract LLMs consume), docs/templates/** and docs/src/**/*.astro (what
// humans copy, under the two generators that coexist until the Astro cutover),
// and tests/fixtures.js. website/ is generated from the templates by freeze.py,
// so checking it would check the same thing twice.
//
// A rule runs only while its component is `enforced`. The exempt list is the
// countable backlog of the semantics sweep and only ever shrinks; the roster
// test below makes a component impossible to add without a row, so anything
// new is checked from its first commit.
//
// This file parses markup and never initializes a component: per CLAUDE.md a
// test that leaves a live timer wedges the whole `node --test` run with no
// output at all, and nine components schedule timers.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { AUTO_INIT_FIXTURES } from './fixtures.js';
import { render } from '../scripts/gen-semantics.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const data = JSON.parse(read('semantics.json'));

// --- conformance ------------------------------------------------------------

const FORBID_KINDS = ['forbid', 'forbid-composite-roles'];

/**
 * What a rule actually matches.
 *
 * `forbid-composite-roles` states the component's own selector and is expanded
 * over the vocabulary, so the ten roles are named once in semantics.json rather
 * than once per component - and adding one tightens every such rule instead of
 * leaving each a role short. Expansion is root-only on purpose: a slide may
 * legitimately contain a menu, it just may not *be* one.
 */
function expandedSelector(rule, compositeRoles) {
  if (rule.kind !== 'forbid-composite-roles') return rule.selector;
  return compositeRoles.map((r) => `${rule.selector}[role="${r}"]`).join(', ');
}

/** Top-level comma split: a comma inside `:not(a, b)` belongs to that compound. */
function splitCompounds(selector) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of selector) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  return [...out, cur];
}

/**
 * The composite roles a rule blocks from appearing.
 *
 * Only a compound that forbids the role *categorically* counts. A compound
 * carrying `:not()` or `:has()` is conditional - it rejects some elements that
 * have the role rather than the role itself. `[role="listbox"]:not([aria-label])`
 * forbids unnamed listboxes and withholds nothing; reading it as withholding
 * would demand conformance debt for a rule that is merely requiring a label.
 * The same skip covers the mirror case, `li[aria-selected]:not([role])`, which
 * forbids the *absence* of a role.
 *
 * That trade is deliberate and errs toward missing a withheld role rather than
 * inventing one: a false positive forces a bogus declaration, while a false
 * negative leaves a gap the generated summary already admits to.
 *
 * A bare `[role]` blocks every role, composite ones included - which is how
 * Tabs withholds `tablist` without naming it.
 */
function rolesBlockedBy(rule, compositeRoles) {
  if (rule.kind === 'forbid-composite-roles') return [...compositeRoles];
  if (rule.kind !== 'forbid') return [];
  const out = new Set();
  for (const compound of splitCompounds(rule.selector)) {
    if (/:(not|has)\(/.test(compound)) continue;
    if (/\[role\]/.test(compound)) {
      compositeRoles.forEach((r) => out.add(r));
      continue;
    }
    for (const r of compositeRoles) {
      // Pinned as bare identifiers below. Guarding here too keeps a malformed
      // entry reporting as a vocabulary failure, not an invalid-regex throw.
      if (!/^[a-z]+$/.test(r)) continue;
      if (new RegExp(`\\[role\\s*[~|^$*]?=\\s*["']?${r}["']?\\s*\\]`).test(compound)) out.add(r);
    }
  }
  return [...out];
}

/**
 * The two ways a component can account for a role its rules block.
 *
 * They are not the same fact. *Withheld* is a promise the code cannot keep yet
 * and will take once it can; *rejected* is a role the component will never take
 * because it implements a different pattern. Recording a rejection as debt
 * states something false about the code, and the reverse check below cannot
 * tell them apart on its own - a blocked role looks identical either way.
 */
const DECLARATIONS = [
  { field: 'conformance', role: 'withheld_role', why: 'blocked_on' },
  { field: 'rejects', role: 'rejected_role', why: 'because' }
];

/** Everything wrong with how a component accounts for the roles it blocks. */
function declarationProblems(name, c, compositeRoles) {
  const out = [];
  const declared = DECLARATIONS.filter((d) => c[d.field]).map((d) => ({ ...d, value: c[d.field] }));

  for (const { field, role, why, value } of declared) {
    for (const k of [role, why, 'rule']) {
      if (!value[k]) out.push(`${name}: ${field} needs ${k}`);
    }
    if (value[role] && !compositeRoles.includes(value[role])) {
      out.push(
        `${name}: ${value[role]} is not a composite role - a component neither withholds nor ` +
          'rejects a role that promises nothing beyond its element'
      );
    }
    const ref = c.rules.find((r) => r.id === value.rule);
    if (value.rule && !ref) {
      out.push(`${name}: ${field} references ${value.rule}, which is not a rule on this component`);
    } else if (ref && !FORBID_KINDS.includes(ref.kind)) {
      out.push(`${name}: ${ref.id} is ${ref.kind}, but keeping a role out is expressed by forbidding`);
    } else if (ref && value[role] && !rolesBlockedBy(ref, compositeRoles).includes(value[role])) {
      out.push(`${name}: ${ref.id} does not block ${value[role]}`);
    }
  }

  // The reverse edge: blocking a role without saying why is what this catches.
  for (const r of c.rules) {
    const blocked = rolesBlockedBy(r, compositeRoles);
    if (!blocked.length) continue;
    if (!declared.length) {
      out.push(
        `${name}: ${r.id} blocks ${blocked.join('/')} but nothing accounts for it - declare ` +
          'conformance debt if the code will keep the promise later, or a rejection if it never will'
      );
      continue;
    }
    // A rule a declaration names is the forward check's business, not this one.
    if (declared.some((d) => d.value.rule === r.id)) continue;
    if (!declared.some((d) => blocked.includes(d.value[d.role]))) {
      out.push(`${name}: ${r.id} blocks ${blocked.join('/')}, which no declaration accounts for`);
    }
  }
  return out;
}

// --- roster -----------------------------------------------------------------

function sassComponents() {
  const out = [];
  const walk = (dir, prefix = '') => {
    for (const e of readdirSync(new URL(`src/sass/components/${dir}`, root), { withFileTypes: true })) {
      if (e.isDirectory()) {
        walk(`${dir}${e.name}/`, `${prefix}${e.name}/`);
        continue;
      }
      if (!e.name.startsWith('_') || e.name === '_index.scss') continue;
      out.push(prefix + e.name.slice(1).replace('.scss', ''));
    }
  };
  walk('');
  return out;
}

// --- surfaces ---------------------------------------------------------------

/** ```html — optionally ```html ignore-semantics: reason */
function examplesFromMarkdown(file) {
  const src = read(file);
  const out = [];
  const re = /^```html([^\n]*)\n([\s\S]*?)^```$/gm;
  let m;
  let n = 0;
  while ((m = re.exec(src))) {
    const info = m[1].trim();
    const line = src.slice(0, m.index).split('\n').length;
    out.push({
      surface: file,
      location: `${file}:${line}`,
      html: m[2],
      ignore: info.startsWith('ignore-semantics'),
      reason: info.replace(/^ignore-semantics:?\s*/, ''),
      hasInfo: info.length > 0,
      n: n++
    });
  }
  return out;
}

/**
 * Two kinds of example live in a template and both are surfaces:
 *   - {% call code() %} … {% endcall %}, the sample a reader copies. Opts out
 *     with code(check=false, reason="…").
 *   - everything else, the live demo the page actually renders. Checking only
 *     the code samples left half of every docs page unchecked, and a demo is
 *     the copy people see working.
 *
 * Jinja is stripped rather than skipped. Skipping was a silent, reasonless
 * escape hatch: the first templated example added would have been waved
 * through without anyone opting it out.
 */
// Statements produce no output and are removed. Expressions DO produce text,
// so they become a placeholder rather than vanishing - deleting them turned
// `<a><span icon/>{{ page.label }}</a>` into an apparently nameless control
// and the accessible-name rule duly flagged the docs' own sidenav.
const stripJinja = (s) =>
  s.replace(/\{%[\s\S]*?%\}/g, '').replace(/\{\{[\s\S]*?\}\}/g, 'x');

// The argument list runs to the `)` that closes the call, not to the first `)`
// in it - a reason is prose and may well contain one ("(pre-0.8.0)"). With
// `[^)]*` such a block matched nothing at all, which is worse than it sounds:
// it was then never removed from the rendered pass either, so an example that
// had properly opted out got checked anyway, and the reason string was
// truncated on top.
const CODE_BLOCK = /\{%\s*call code\((.*?)\)\s*%\}\n([\s\S]*?)\{%\s*endcall\s*%\}/g;

/** Exported for the extractor's own tests: parsing is where this can go quietly wrong. */
export function templateExamples(src, file) {
  const out = [];
  let m;
  CODE_BLOCK.lastIndex = 0;
  while ((m = CODE_BLOCK.exec(src))) {
    const args = m[1];
    out.push({
      surface: 'docs/templates',
      location: `${file}:${src.slice(0, m.index).split('\n').length} (sample)`,
      html: stripJinja(m[2]),
      ignore: /check\s*=\s*false/.test(args),
      reason: (args.match(/reason\s*=\s*["']([^"']*)["']/) ?? [])[1] ?? ''
    });
  }

  // The rendered page, minus the code samples already taken above - they are
  // escaped text there, and taking them twice would let a code-block opt-out
  // be defeated by this pass.
  out.push({
    surface: 'docs/templates',
    location: `${file} (rendered)`,
    html: stripJinja(src.replace(CODE_BLOCK, '')),
    ignore: false,
    reason: ''
  });
  return out;
}

/**
 * The Astro pages, which state the same two kinds of example the Jinja
 * templates do (ADR 0003). Both generators are present until the cutover and a
 * conversion is exactly the moment markup goes quietly wrong, so the migrated
 * pages are a surface of their own rather than something the templates vouch
 * for.
 *
 * Only leaf expressions become the `x` placeholder. An Astro expression can
 * *contain* the markup -- `{NAV.map((group) => (<li>…</li>))}` is the whole
 * drawer -- so replacing every `{...}` wholesale would delete the components
 * that render from the catalogue and quietly drop them from this suite. What
 * is left of the scaffolding parses as text between elements, which no rule
 * reads.
 */
export function astroExamples(src, file) {
  const out = [];
  let m;
  ASTRO_CODE.lastIndex = 0;
  while ((m = ASTRO_CODE.exec(src))) {
    const attrs = m[1];
    out.push({
      surface: 'docs/src',
      location: `${file}:${src.slice(0, m.index).split('\n').length} (sample)`,
      html: unescapeLiteral(m[2]),
      ignore: /check\s*=\s*\{\s*false\s*\}/.test(attrs),
      reason: (attrs.match(/reason\s*=\s*["']([^"']*)["']/) ?? [])[1] ?? ''
    });
  }

  out.push({
    surface: 'docs/src',
    location: `${file} (rendered)`,
    html: stripAstro(src.replace(ASTRO_CODE, '')),
    ignore: false,
    reason: ''
  });
  return out;
}

/**
 * `<Code … code={`…`} />`. The attribute list is everything before `code={`,
 * which is where `check` and `reason` live; matching it as `[^>]*` would stop
 * at the first `>` in the sample itself.
 */
const ASTRO_CODE = /<Code\b([\s\S]*?)code=\{`([\s\S]*?)`\}\s*\/>/g;

/** A template literal's three escapes, undone. */
const unescapeLiteral = (s) =>
  s.replace(/\\(`|\$\{|\\)/g, '$1').trim();

/** Frontmatter, Astro comments, and leaf expressions. */
function stripAstro(src) {
  let out = src.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  // Innermost-first: a group holding markup keeps its braces and is descended
  // into, so only the ones that are pure JavaScript collapse.
  let previous;
  do {
    previous = out;
    out = out.replace(/\{([^{}<]*)\}/g, 'x');
  } while (out !== previous);
  return out;
}

function examplesFromAstro() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(new URL(`docs/src/${dir}`, root), { withFileTypes: true })) {
      if (e.isDirectory()) {
        walk(`${dir}${e.name}/`);
        continue;
      }
      if (!e.name.endsWith('.astro')) continue;
      const file = `docs/src/${dir}${e.name}`;
      out.push(...astroExamples(read(file), file));
    }
  };
  walk('');
  return out;
}

function examplesFromTemplates() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(new URL(`docs/templates/${dir}`, root), { withFileTypes: true })) {
      if (e.isDirectory()) {
        walk(`${dir}${e.name}/`);
        continue;
      }
      if (!e.name.endsWith('.html')) continue;
      const file = `docs/templates/${dir}${e.name}`;
      out.push(...templateExamples(read(file), file));
    }
  };
  walk('');
  return out;
}

/**
 * m3-guidelines.md states markup as inline code spans in prose, not as fenced
 * examples - `<nav aria-label="Breadcrumb"><ol>` inside a sentence. Most are
 * bare element mentions.
 *
 * So only rules marked `fragmentSafe` run against it: the ones that fire on a
 * wrong thing being *present*. Naming `<nav class="toolbar">` teaches a nav
 * misuse wherever it appears, but omitting a label is what a fragment is for.
 *
 * `fragmentSafe` is not the same as `kind: "forbid"`, which is what a first
 * attempt assumed: `fieldset:not(:has(> legend))` forbids, yet what it detects
 * is an omission, and it duly flagged four sentences that merely mention
 * `<fieldset>`.
 */
function examplesFromGuidelines() {
  const file = 'm3-guidelines.md';
  const src = read(file);
  const out = [];
  const re = /`([^`\n]*<[a-z][a-z0-9-]*[^`\n]*)`/g;
  let m;
  while ((m = re.exec(src))) {
    out.push({
      surface: file,
      location: `${file}:${src.slice(0, m.index).split('\n').length} (fragment)`,
      html: m[1],
      fragmentSafe: true,
      ignore: false,
      reason: ''
    });
  }
  return out;
}

function examplesFromFixtures() {
  return AUTO_INIT_FIXTURES.map((f) => ({
    surface: 'tests/fixtures.js',
    location: `tests/fixtures.js (${f.name})`,
    html: f.html,
    ignore: false,
    reason: ''
  }));
}

const examples = [
  ...examplesFromMarkdown('llm.md'),
  ...examplesFromTemplates(),
  ...examplesFromAstro(),
  ...examplesFromFixtures(),
  ...examplesFromGuidelines()
];

// --- rule engine ------------------------------------------------------------

const enforcedRules = Object.entries(data.rows)
  .filter(([, c]) => c.status === 'enforced')
  .flatMap(([name, c]) => c.rules.map((r) => ({ ...r, component: name })));

/**
 * Enough of the accessible-name computation to answer "is this control
 * nameless?" - aria-label, then aria-labelledby, then the text that is left
 * once the aria-hidden subtrees are taken out. Not the full algorithm: no
 * title, no <label>, no alt on a descendant image, because a control relying
 * on those is not what this is looking for.
 */
function accessibleName(el, document) {
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

function violations(html, rules, { fragmentSafe = false } = {}) {
  const { document } = new JSDOM(`<!doctype html><body>${html}</body>`).window;
  const found = [];
  for (const rule of rules) {
    if (fragmentSafe && !rule.fragmentSafe) continue;
    const hits = [...document.querySelectorAll(expandedSelector(rule, data.compositeRoles))];
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

// --- tests ------------------------------------------------------------------

describe('semantics.json', () => {
  test('every component has a row, and no row is stale', () => {
    const roster = [...sassComponents().filter((n) => !(n in data.notComponents)), ...data.additional].sort();
    const rows = Object.keys(data.rows).sort();
    assert.deepEqual(
      rows,
      roster,
      'semantics.json rows must match the component roster exactly - a new component ' +
        'needs a row before it can ship, and a removed one must not leave a row behind'
    );
  });

  test('nothing leaves the roster without a live reason', () => {
    // `notComponents` is how a partial that styles no component of its own stays
    // out of the roster while its Sass stays in the sheet. Unchecked it is also
    // how a real component could dodge needing a row, so each entry has to name
    // a partial that still exists and say why it is not one.
    const partials = sassComponents();
    for (const [name, why] of Object.entries(data.notComponents)) {
      assert.ok(partials.includes(name), `${name}: excluded but has no partial - drop the exclusion`);
      assert.ok(String(why).trim().length > 0, `${name}: an exclusion must state why`);
    }
  });

  test('every row states a kind the vocabulary knows', () => {
    // A row is a component unless it says otherwise. The other two kinds are
    // CONTEXT.md's: a foundation states no markup, a behavior attaches to markup
    // the author already wrote. Their rules still run - the classification says
    // what the row is, not whether it is checked.
    for (const [name, c] of Object.entries(data.rows)) {
      assert.ok((c.kind ?? 'component') in data.rowKinds, `${name}: unknown kind ${c.kind}`);
    }
  });

  test('every rule is well formed', () => {
    for (const [name, c] of Object.entries(data.rows)) {
      assert.ok(['enforced', 'exempt'].includes(c.status), `${name}: bad status ${c.status}`);
      for (const r of c.rules) {
        assert.ok(r.id && r.message, `${name}: rule needs an id and a message`);
        assert.ok(Object.keys(data.ruleKinds).includes(r.kind), `${r.id}: bad kind ${r.kind}`);
        if (r.kind === 'require-attr') assert.ok(r.attr, `${r.id}: require-attr needs attr`);
        if (r.kind === 'forbid-composite-roles') {
          // rolesBlockedBy reports all ten for this kind without reading the
          // selector, so a conditional base would enforce narrower than it claims.
          assert.doesNotMatch(r.selector, /:(not|has)\(/, `${r.id}: a composite-role base must be categorical`);
          // And it must be the component's own root. Scoped to a descendant
          // (`.carousel .indicator`) it would report blocking all ten while
          // leaving the root uncaught - the invariant rests on this.
          assert.doesNotMatch(r.selector, /[\s>+~]/, `${r.id}: a composite-role base must be the component root`);
        }
        // A malformed selector must fail here, not silently match nothing.
        assert.doesNotThrow(
          () =>
            new JSDOM('<!doctype html><body>').window.document.querySelectorAll(
              expandedSelector(r, data.compositeRoles)
            ),
          `${r.id}: invalid selector`
        );
      }
    }
  });

  test('rule ids are unique across components', () => {
    const ids = Object.values(data.rows).flatMap((c) => c.rules.map((r) => r.id));
    assert.equal(new Set(ids).size, ids.length, 'duplicate rule id');
  });

  test('every declaration is well formed, and no blocked role is unaccounted for', () => {
    const problems = Object.entries(data.rows).flatMap(([n, c]) =>
      declarationProblems(n, c, data.compositeRoles)
    );
    assert.deepEqual(problems, [], problems.join('\n'));
  });

  test('a malformed declaration is caught', () => {
    const roles = ['tablist', 'toolbar'];
    const rule = { id: 'x-not-a-tablist', kind: 'forbid', selector: '.x[role]', message: 'm' };
    const bad = (conformance, rules = [rule]) => declarationProblems('x', { rules, conformance }, roles);
    const ok = { withheld_role: 'tablist', blocked_on: 'keyboard model', rule: 'x-not-a-tablist' };

    assert.equal(bad({ ...ok, rule: undefined }).length, 1, 'missing rule');
    assert.equal(bad({ ...ok, blocked_on: undefined }).length, 1, 'missing blocked_on');
    assert.equal(bad({ ...ok, withheld_role: undefined }).length, 1, 'missing role');
    assert.ok(
      bad({ ...ok, withheld_role: 'button' }).some((m) => m.includes('not a composite role')),
      'a simple role is neither withheld nor rejected'
    );
    assert.ok(bad({ ...ok, rule: 'nope' }).some((m) => m.includes('not a rule')), 'dangling rule reference');
    assert.ok(
      bad({ ...ok, rule: 'r' }, [{ id: 'r', kind: 'require-attr', attr: 'role', selector: '.x', message: 'm' }]).some(
        (m) => m.includes('expressed by forbidding')
      ),
      'the referenced rule must forbid'
    );
    assert.ok(
      bad({ withheld_role: 'toolbar', blocked_on: 'k', rule: 'r' }, [
        { id: 'r', kind: 'forbid', selector: '.x[role="tablist"]', message: 'm' }
      ]).some((m) => m.includes('does not block toolbar')),
      'the rule must block the declared role, and says so exactly once'
    );
    assert.ok(bad(undefined).some((m) => m.includes('nothing accounts for it')), 'blocking with no account');
    assert.deepEqual(bad(ok), []);
  });

  test('a rejection accounts for a blocked role without claiming debt', () => {
    const roles = ['tablist'];
    const rules = [{ id: 'x-not-a-tablist', kind: 'forbid', selector: '.x[role="tablist"]', message: 'm' }];
    const rejects = { rejected_role: 'tablist', because: 'implements a different pattern', rule: 'x-not-a-tablist' };

    assert.deepEqual(declarationProblems('x', { rules, rejects }, roles), [], 'a rejection satisfies the reverse edge');
    assert.ok(
      declarationProblems('x', { rules, rejects: { ...rejects, because: undefined } }, roles).some((m) =>
        m.includes('rejects needs because')
      ),
      'a rejection must say why'
    );
    assert.ok(
      declarationProblems('x', { rules, rejects: { ...rejects, rejected_role: 'grid' } }, roles).some((m) =>
        m.includes('not a composite role')
      ),
      'and name a role from the vocabulary'
    );
  });

  test('a component that declares against a composite role blocks every one', () => {
    // Naming one role and leaving the other nine legal reproduces, narrower, the
    // gap the declaration mechanism exists to close: a component that is not a
    // composite widget is not any of them.
    //
    // Known limit: this reads "has a declaration" as "is not a composite widget",
    // which holds for every component today but would not for one that legitimately
    // takes a composite role while withholding another - a Menu implementing
    // `role="menu"` with a tested keyboard model, say, that still withholds
    // `menubar`. Rule 2 permits that, and this test would wrongly forbid it. Give
    // the component a way to record the role it takes before adding such a case;
    // do not weaken this into a warning.
    const slipping = [];
    for (const [name, c] of Object.entries(data.rows)) {
      if (!DECLARATIONS.some((d) => c[d.field])) continue;
      const blocked = new Set(c.rules.flatMap((r) => rolesBlockedBy(r, data.compositeRoles)));
      const missed = data.compositeRoles.filter((r) => !blocked.has(r));
      if (missed.length) slipping.push(`${name}: ${missed.join(', ')}`);
    }
    assert.deepEqual(slipping, [], slipping.join('\n'));
  });

  test('the composite-role vocabulary is pinned', () => {
    assert.deepEqual(
      data.compositeRoles,
      ['combobox', 'grid', 'listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'toolbar', 'tree', 'treegrid'],
      'ARIA 1.2 composite widget roles, plus toolbar for its arrow-key contract. Dropping one ' +
        'silently stops detecting a component that withholds it - which is the whole check'
    );
    for (const r of data.compositeRoles) {
      assert.match(r, /^[a-z]+$/, `${r}: roles are interpolated into a regex, so they must be bare`);
    }
  });

  test('only a categorical prohibition counts as blocking a role', () => {
    const roles = ['tablist', 'listbox'];
    const forbid = (selector) => rolesBlockedBy({ id: 'r', kind: 'forbid', selector, message: 'm' }, roles);

    assert.deepEqual(forbid('.x[role]').sort(), ['listbox', 'tablist'], 'a bare [role] blocks every role');
    assert.deepEqual(forbid('.x[role="listbox"]'), ['listbox']);
    assert.deepEqual(forbid('.x[role~="listbox"]'), ['listbox'], 'the [role~=] family too');

    // Forbids the *absence* of a role, so it withholds nothing.
    assert.deepEqual(forbid('li[aria-selected]:not([role])'), []);
    // Forbids unnamed listboxes, not listboxes. Reading this as withholding
    // would demand conformance debt from a rule that requires a label.
    assert.deepEqual(forbid('[role="listbox"]:not([aria-label])'), []);
    assert.deepEqual(forbid('[role="listbox"]:has(> .bad)'), []);

    // A comma inside :not() must not split the compound.
    assert.deepEqual(forbid('.x:not(.a, .b)[role]'), [], 'still conditional despite the comma');
    assert.deepEqual(forbid('.x:not(.a, .b), .y[role="tablist"]'), ['tablist'], 'the other compound still counts');

    // A malformed vocabulary entry reports as a vocabulary failure, not a regex throw.
    assert.doesNotThrow(() => rolesBlockedBy({ id: 'r', kind: 'forbid', selector: '.x[role="a"]', message: 'm' }, ['a(']));

    // Only forbid rules withhold.
    assert.deepEqual(rolesBlockedBy({ id: 'r', kind: 'require-attr', selector: '.x[role]', attr: 'a', message: 'm' }, roles), []);
  });

  test('SEMANTICS.md is not stale', () => {
    assert.equal(
      read('SEMANTICS.md'),
      render(data),
      'SEMANTICS.md is generated - run `npm run build:semantics`'
    );
  });
});

describe('prose that names markup', () => {
  // The fragment reader only sees `<tag ...>` forms, so a selector-style
  // mention - `nav.toolbar` in a sentence or an anatomy table - was invisible
  // to it. Five declarations of `nav.toolbar` survived the sweep that forbade
  // it, in the very file the sweep had added as a surface.
  //
  // Derived from the rules rather than listed: any fragment-safe forbid rule
  // whose selector is a plain `tag.class` is a shape the prose must not name
  // either. A deliberate negation ("not `nav.toolbar`") is allowed, because
  // saying what something is not is how the docs record a rename.
  const forbiddenShapes = Object.values(data.rows)
    .filter((c) => c.status === 'enforced')
    .flatMap((c) => c.rules)
    .filter((r) => FORBID_KINDS.includes(r.kind) && r.fragmentSafe)
    .flatMap((r) => expandedSelector(r, data.compositeRoles).split(',').map((x) => x.trim()))
    .filter((sel) => /^[a-z]+\.[\w-]+$/.test(sel));

  test('the rules yield shapes to look for', () => {
    assert.ok(forbiddenShapes.length > 0, 'no tag.class forbid rules to derive from');
  });

  test('no document names a shape its own rules forbid', () => {
    const failures = [];
    for (const file of ['llm.md', 'm3-guidelines.md']) {
      const src = read(file);
      for (const m of src.matchAll(/`([^`\n]+)`/g)) {
        const shape = m[1].trim();
        if (!forbiddenShapes.includes(shape)) continue;
        const before = src.slice(Math.max(0, m.index - 24), m.index);
        if (/\b(not|no|never|instead of|rather than)\s+$/i.test(before)) continue;
        const line = src.slice(0, m.index).split('\n').length;
        failures.push(`${file}:${line} names \`${shape}\`, which a forbidding rule rejects`);
      }
    }
    assert.deepEqual(failures, [], `\n  ${failures.join('\n  ')}\n`);
  });
});

describe('composed pages', () => {
  // website/ was excluded as a *surface* because it is generated from the
  // templates - checking its fragments would check them twice. A whole page is
  // a different question. Rules like main-not-nested and dialog-is-named are
  // document-level, chrome and content only meet here, and a landmark name is
  // only ambiguous relative to the other landmarks on the same page. The
  // duplicate-name check below has no rule behind it for that reason: there is
  // no fragment it could be written against.
  //
  // 57 pages, well under a second.
  //
  // These read the *committed* website/, which is only as current as the last
  // freeze - a template-only change would leave this passing against a
  // snapshot of the previous state. CI closes that: it re-runs freeze.py and
  // fails if the diff is non-empty, which is the check CLAUDE.md already
  // prescribed for template changes and nothing had automated.
  const pages = readdirSync(new URL('website/', root))
    .filter((f) => f.endsWith('.html'))
    .map((f) => ({ file: `website/${f}`, html: read(`website/${f}`) }));

  test('the frozen site exists to check', () => {
    assert.ok(pages.length > 20, `only ${pages.length} frozen pages - run freeze.py`);
  });

  test('every page satisfies every enforced rule', () => {
    const failures = [];
    for (const { file, html } of pages) {
      for (const v of violations(html, enforcedRules)) {
        failures.push(`${file}\n    [${v.rule.id}] ${v.rule.message}\n    ${v.tag}`);
      }
    }
    assert.deepEqual(failures, [], `\n${failures.slice(0, 12).join('\n\n')}\n`);
  });

  test('no two landmarks on a page share a name', () => {
    // Two <nav>s both called "Main" is a landmark menu with two identical rows,
    // which is the problem labelling them was meant to solve. Shipped once.
    const failures = [];
    for (const { file, html } of pages) {
      const { document } = new JSDOM(html).window;
      const names = [...document.querySelectorAll('nav')].map((n) => {
        const l = n.getAttribute('aria-label');
        if (l) return l.trim();
        const ref = n.getAttribute('aria-labelledby');
        return ref ? (document.getElementById(ref)?.textContent ?? '').trim() : '';
      });
      const seen = new Set();
      for (const n of names) {
        if (n && seen.has(n)) failures.push(`${file}: two landmarks named "${n}"`);
        seen.add(n);
      }
    }
    assert.deepEqual(failures, [], `\n  ${failures.join('\n  ')}\n`);
  });
});

describe('template extractor', () => {
  const wrap = (args, body) =>
    `{% block page %}\n{% call code(${args}) %}\n${body}\n{% endcall %}\n{% endblock %}`;

  test('a sample is extracted and the rendered pass does not double-count it', () => {
    const got = templateExamples(wrap('', '<span class="chip">x</span>'), 'f.html');
    assert.equal(got.length, 2, 'one sample plus the rendered page');
    assert.match(got[0].html, /<span class="chip">x<\/span>/);
    assert.doesNotMatch(got[1].html, /chip/, 'the sample must be cut from the rendered pass');
  });

  test('a reason containing parentheses does not truncate the arguments', () => {
    // With `[^)]*` this matched nothing: the block was not recognised as a
    // sample, so it was never cut from the rendered pass and the opt-out was
    // silently ignored - a green-looking check on markup nobody had exempted.
    const got = templateExamples(
      wrap('check=false, reason="0.7.0 markup (pre-sweep), kept for migration"', '<div class="chip">old</div>'),
      'f.html'
    );
    assert.equal(got.length, 2);
    assert.equal(got[0].ignore, true);
    assert.equal(got[0].reason, '0.7.0 markup (pre-sweep), kept for migration');
    assert.doesNotMatch(got[1].html, /chip/, 'an opted-out sample must still be cut from the rendered pass');
  });

  test('a checked sample stays checked', () => {
    const got = templateExamples(wrap('', '<div class="chip">old</div>'), 'f.html');
    assert.equal(got[0].ignore, false);
  });
});

describe('astro extractor', () => {
  const wrap = (attrs, body) =>
    `---\nconst x = 1;\n---\n<DocsLayout page="f">\n<Code ${attrs}code={\`\n${body}\n\`} />\n</DocsLayout>\n`;

  test('a sample is extracted and the rendered pass does not double-count it', () => {
    const got = astroExamples(wrap('', '<span class="chip">x</span>'), 'f.astro');
    assert.equal(got.length, 2, 'one sample plus the rendered page');
    assert.match(got[0].html, /<span class="chip">x<\/span>/);
    assert.doesNotMatch(got[1].html, /chip/, 'the sample must be cut from the rendered pass');
  });

  test('an opt-out is read off the attributes and still cut from the rendered pass', () => {
    const got = astroExamples(
      wrap('check={false} reason="0.7.0 markup (pre-sweep), kept for migration" ', '<div class="chip">old</div>'),
      'f.astro'
    );
    assert.equal(got.length, 2);
    assert.equal(got[0].ignore, true);
    assert.equal(got[0].reason, '0.7.0 markup (pre-sweep), kept for migration');
    assert.doesNotMatch(got[1].html, /chip/);
  });

  test('a checked sample stays checked', () => {
    const got = astroExamples(wrap('', '<div class="chip">old</div>'), 'f.astro');
    assert.equal(got[0].ignore, false);
  });

  test("the sample's own > does not truncate the attribute list", () => {
    // `[^>]*` before `code={` stopped at the first `>` in the sample, which
    // meant an opt-out further along the tag was never seen.
    const got = astroExamples(
      `<Code reason="why" check={false} code={\`\n<b>x</b>\n\`} />`,
      'f.astro'
    );
    assert.equal(got[0].ignore, true);
    assert.equal(got[0].reason, 'why');
  });

  test('an expression holding markup keeps it', () => {
    // The drawer and the footer render from the catalogue inside a `.map()`.
    // Collapsing every `{...}` would delete their markup and drop both
    // components out of this suite without failing anything.
    const got = astroExamples(
      `---\n---\n<ul>{NAV.map((g) => (<li><a href={route(g.id)}>{g.label}</a></li>))}</ul>\n`,
      'f.astro'
    );
    assert.match(got[0].html, /<li><a href=x>x<\/a><\/li>/);
  });

  test('frontmatter is not markup', () => {
    const got = astroExamples(`---\nimport X from "./x.astro";\n---\n<p>hi</p>\n`, 'f.astro');
    assert.doesNotMatch(got[0].html, /import/);
  });
});

describe('documented markup', () => {
  test('surfaces yield examples to check', () => {
    // Guards the extractors: a regex that silently stops matching would turn
    // this whole suite into a no-op that passes.
    for (const surface of ['llm.md', 'docs/templates', 'docs/src', 'tests/fixtures.js', 'm3-guidelines.md']) {
      const n = examples.filter((e) => e.surface === surface).length;
      assert.ok(n > 0, `no examples extracted from ${surface}`);
    }
  });

  test('every opt-out states a reason', () => {
    for (const e of examples.filter((e) => e.ignore)) {
      assert.ok(
        e.reason.trim().length > 0,
        `${e.location}: an opt-out must state a reason so a reviewer can tell whether it is still earned`
      );
    }
  });

  test('no markup hides behind a non-html fence', () => {
    // The extractor keys on ```html, so a markup sample tagged ```text is not
    // a documented example as far as this suite is concerned - it is invisible.
    // 37 blocks were in that state, including every Fieldsets example, which
    // is a third of the contract silently unchecked.
    //
    // Walked line by line rather than matched with one regex: an `opening
    // fence' pattern also matches every *closing* fence, which made a first
    // attempt report the prose between blocks.
    const mistagged = [];
    for (const file of ['llm.md', 'm3-guidelines.md']) {
    const lines = read(file).split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('```')) continue;
      const lang = lines[i].slice(3).trim();
      const body = [];
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith('```')) body.push(lines[j++]);
      if (lang !== 'html' && /<[a-z][a-z0-9-]*[\s>/]/.test(body.join('\n'))) {
        mistagged.push(`${file}:${i + 1} (\`\`\`${lang || 'untagged'})`);
      }
      i = j;
    }
    }
    assert.deepEqual(
      mistagged,
      [],
      `these blocks contain markup but are not tagged \`\`\`html, so nothing checks them:\n  ${mistagged.join('\n  ')}`
    );
  });

  test('no unknown info string on an html block', () => {
    for (const e of examples.filter((e) => e.hasInfo && !e.ignore)) {
      assert.fail(`${e.location}: unrecognised fence info "html ${e.reason}"`);
    }
  });

  test('every checked example satisfies the enforced rules', () => {
    const failures = [];
    for (const e of examples) {
      if (e.ignore) continue;
      for (const v of violations(e.html, enforcedRules, { fragmentSafe: e.fragmentSafe }))
        failures.push(`${e.location}\n    [${v.rule.id}] ${v.rule.message}\n    ${v.tag}`);
    }
    assert.deepEqual(failures, [], `\n${failures.join('\n\n')}\n`);
  });
});
