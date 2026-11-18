// Build the consumer's selection index once, when packing ExpressiveCSS.
// End markers in a temporary Sass tree identify each partial's emitted rules,
// including mixins, nested forms and rules emitted by an _index.scss itself.
import { createHash } from 'node:crypto';
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { compile } from 'sass';
import postcss from 'postcss';
import { parse } from 'css-what';
import { AUTO_INIT_COMPONENTS } from '../dist/js/internal/components/registry.mjs';
import * as modular from '../dist/js/modular.mjs';
import { collectUsage } from '../cli/usage.mjs';

function attributeToken({ name, value, action }) {
  if (name === 'class' && action === 'element') return value;
  return action === 'equals' ? `[${name}=${value}]` : `[${name}]`;
}

// A selector can match only if its positive literals occur in the source.
// States, negation and combinators impose no build-time requirement.
function literal(token) {
  if (token.type === 'tag') return [`<${token.name}`];
  if (token.type === 'attribute') return [attributeToken(token)];
  return [];
}

function alternatives(token) {
  if (Array.isArray(token.data) && ['is', 'where', 'has', 'host', 'host-context'].includes(token.name)) {
    return token.data.flatMap(requirements);
  }
  return [literal(token)];
}

function requirements(selector) {
  return selector.reduce((sets, token) => {
    const choices = alternatives(token);
    return sets.flatMap(set => choices.map(choice => [...set, ...choice]));
  }, [[]]);
}

function matchesFor(selector) {
  return parse(selector).flatMap(requirements);
}

// Once ".tabs" retains a partial, ".tabs > a" adds no selection information.
function minimal(sets) {
  const kept = [];
  const unique = sets.map(set => [...new Set(set)]).sort((a, b) => a.length - b.length);
  for (const set of unique) {
    if (!kept.some(other => other.every(token => set.includes(token)))) kept.push(set);
  }
  return kept;
}

function selection(sets) {
  // Keep every positive class for --include, even if a simpler selector
  // already covers this rule during normal scanning.
  const classes = sets.flat().filter(token => !token.startsWith('<') && !token.startsWith('['));
  return { when: minimal(sets), classes: [...new Set(classes)] };
}

function component(name, nodes) {
  const selectors = [];
  const rules = postcss.root({ nodes });
  rules.walkRules(rule => {
    if (rule.parent.name !== 'keyframes') selectors.push(...matchesFor(rule.selector));
  });
  // :root/:host declarations travel with their component. A token-only
  // partial (e.g. scrim) has no authored selector and is a shared foundation.
  return { name, ...selection(selectors.filter(set => set.length)), css: rules.toString() };
}

function componentGroups(layer) {
  const groups = [];
  let nodes = [];
  for (const node of [...layer.nodes]) {
    if (node.text?.startsWith('!used:')) {
      groups.push(component(node.text.slice(6), nodes));
      nodes = [];
    } else {
      nodes.push(node);
    }
  }
  if (nodes.length) throw new Error('Unattributed component styles after the final partial');
  return groups.filter(group => group.css.length);
}

function utility(node) {
  if (['media', 'supports', 'container'].includes(node.name)) {
    const open = node.source.input.css.slice(node.source.start.offset, node.nodes[0].source.start.offset);
    return { open, rules: node.nodes.map(utility) };
  }
  const selectors = node.type === 'rule' ? matchesFor(node.selector) : [];
  // A component can forward a utility class to an element created outside the
  // scanned template. The emitted selector still enforces its element qualifier.
  const when = selectors.map(set => set.some(token => !token.startsWith('<') && !token.startsWith('['))
    ? set.filter(token => !token.startsWith('<')) : set);
  return { ...selection(when), span: [node.source.start.offset, node.source.end.offset] };
}

function layerUtilityRules(rules) {
  return rules.flatMap(rule => rule.rules ? layerUtilityRules(rule.rules) : [rule]);
}

// Capture the markup each public API can generate, including its transitive
// components (Datepicker -> FormSelect -> Menu). This also works for apps
// compiling JavaScript separately. Only CSS selector tokens go in the index.
async function apiCatalogue() {
  // Build the same TS catalogue the docs use, including on Node versions
  // without native TypeScript loading.
  const { outputFiles } = await build({ entryPoints: ['docs/src/data/nav.ts'], format: 'esm', write: false });
  const { PAGES } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);
  return Object.fromEntries(PAGES.flatMap(page => (page.exports ?? []).map(name => {
    const selector = AUTO_INIT_COMPONENTS[name]?.selector;
    const styles = (page.styles ?? []).filter(path => path.startsWith('components/')).map(path => path.slice(11));
    return [name, { ...selection(selector ? matchesFor(selector) : []), styles }];
  })).filter(([name]) => !['AutoInit', 'version'].includes(name)));
}

async function runtimeStyles(vocabulary) {
  const apis = await apiCatalogue();
  const entries = Object.keys(apis).map(name => ({ in: `api:${name}`, out: name }));
  const { outputFiles, metafile } = await build({
    entryPoints: entries, outdir: 'used-entries', bundle: true, format: 'esm', minify: true, write: false, metafile: true,
    logOverride: { 'ignored-bare-import': 'silent' }, supported: { 'template-literal': false },
    plugins: [{ name: 'public-exports', setup(builder) {
      builder.onResolve({ filter: /^api:/ }, args => ({ path: args.path.slice(4), namespace: 'api' }));
      builder.onLoad({ filter: /.*/, namespace: 'api' }, args => ({
        contents: `export { ${args.path} } from '@expressivecss/expressive/modular'`, resolveDir: process.cwd(),
      }));
    } }],
  });
  // Associate public bindings with the actual chunks shipped by this build.
  // Consumer metafiles identify which chunks contributed bytes after tree shaking.
  const definingChunks = new Map();
  for (const input of Object.keys(metafile.inputs)) {
    if (!input.startsWith('dist/js/chunks/')) continue;
    const bindings = await import(pathToFileURL(resolve(input)));
    for (const binding of Object.values(bindings)) definingChunks.set(binding, basename(input));
  }
  for (const file of outputFiles) {
    const name = basename(file.path, '.js');
    const chunk = definingChunks.get(modular[name]);
    if (!chunk) throw new Error(`Missing the JavaScript chunk for ${name}`);
    apis[name].chunk = chunk;
    // Dialogs.confirm passes these tags to textElement(), which constructs the DOM.
    const tokens = new Set(name === 'Dialogs' ? ['<button', '<p', '<h2'] : []);
    collectUsage(tokens, file.text, file.path, 'bundled');
    apis[name].tokens = [...tokens].filter(token => vocabulary.has(token)).sort();
  }
  return apis;
}

const temp = mkdtempSync(join(tmpdir(), 'expressive-used-sass-'));
try {
  cpSync('src/sass', temp, { recursive: true });
  const folder = join(temp, 'components');
  for (const file of readdirSync(folder, { recursive: true })) {
    if (!file.endsWith('.scss')) continue;
    const partial = file.replaceAll('\\', '/').replace(/(^|\/)_(?=[^/]+$)/, '$1').slice(0, -5);
    appendFileSync(join(folder, file), `\n/*!used:${partial}*/\n`);
  }

  const sheet = postcss.parse(compile(join(temp, 'expressive.scss'), { style: 'compressed', charset: false }).css);
  const layer = name => sheet.nodes.find(node => node.name === 'layer' && node.params === name);
  const components = componentGroups(layer('components'));
  // Store offsets into the shipped stylesheet instead of shipping the CSS twice.
  const full = postcss.parse(readFileSync('dist/css/expressive.min.css', 'utf8'));
  const css = full.source.input.css;
  const componentLayer = full.nodes.find(node => node.name === 'layer' && node.params === 'components');
  const baseEnd = componentLayer.source.start.offset;
  let offset = componentLayer.nodes[0].source.start.offset;
  for (const group of components) {
    if (!css.startsWith(group.css, offset)) throw new Error(`CSS and selection index disagree at ${group.name}`);
    const end = offset + group.css.length;
    group.span = [offset, end];
    offset = end;
    delete group.css;
  }
  if (offset !== componentLayer.source.end.offset - 1) throw new Error('Unindexed CSS in the components layer');
  const utilities = full.nodes.find(node => node.name === 'layer' && node.params === 'utilities').nodes.map(utility);
  const vocabulary = new Set(components.flatMap(group => group.when.flat()));
  for (const rule of layerUtilityRules(utilities)) {
    for (const tokens of rule.when) tokens.forEach(token => vocabulary.add(token));
  }
  const apis = await runtimeStyles(vocabulary);
  mkdirSync('dist/cli', { recursive: true });
  const sha256 = createHash('sha256').update(css).digest('hex');
  writeFileSync('dist/cli/styles.json', JSON.stringify({ sha256, baseEnd, components, utilities, apis }));
} finally {
  rmSync(temp, { recursive: true, force: true });
}
