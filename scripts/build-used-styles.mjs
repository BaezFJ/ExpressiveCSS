// Build the consumer's selection index once, when packing ExpressiveCSS.
// End markers in a temporary Sass tree identify each partial's emitted rules,
// including mixins, nested forms and rules emitted by an _index.scss itself.
import { createHash } from 'node:crypto';
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { compile } from 'sass';
import postcss from 'postcss';
import { parse } from 'css-what';
import { collectUsage } from '../cli/usage.mjs';

// Extras modules import core through its package subpaths; point them at this
// checkout's build, where an installed peer dependency would put them.
const coreSubpaths = {
  '@expressivecss/expressive/core': './dist/js/core.mjs',
  '@expressivecss/expressive/modular': './dist/js/modular.mjs',
};
registerHooks({
  resolve: (specifier, context, next) => Object.hasOwn(coreSubpaths, specifier)
    ? { url: pathToFileURL(resolve(coreSubpaths[specifier])).href, shortCircuit: true } : next(specifier, context),
});

// One index per package: core, then extras, whose generated markup can need core styles.
const packages = [
  { name: '@expressivecss/expressive', root: '.', sass: 'src/sass', entry: 'expressive.scss', sheet: 'expressive.min.css',
    registry: 'components/registry.mjs', table: 'AUTO_INIT_COMPONENTS', extras: false },
  { name: '@expressivecss/extras', root: 'extras', sass: 'extras/src/sass', entry: 'extras.scss', sheet: 'extras.min.css',
    registry: 'components/registry.mjs', table: 'AUTO_INIT', extras: true },
];

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
async function apiCatalogue(pkg, registry) {
  // Build the same TS catalogue the docs use, including on Node versions
  // without native TypeScript loading.
  const { outputFiles } = await build({ entryPoints: ['docs/src/data/nav.ts'], format: 'esm', write: false });
  const { PAGES, isExtrasPage } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);
  // Each package indexes the pages that document its own exports and partials.
  return Object.fromEntries(PAGES.filter(page => isExtrasPage(page.id) === pkg.extras).flatMap(page => (page.exports ?? []).map(name => {
    const selector = registry[name]?.selector;
    const styles = (page.styles ?? []).filter(path => path.startsWith('components/')).map(path => path.slice(11));
    return [name, { ...selection(selector ? matchesFor(selector) : []), styles }];
  })).filter(([name]) => !['AutoInit', 'version'].includes(name)));
}

async function runtimeStyles(vocabulary, pkg) {
  const js = join(pkg.root, 'dist/js');
  const registry = (await import(pathToFileURL(resolve(js, 'internal', pkg.registry))))[pkg.table];
  const modular = await import(pathToFileURL(resolve(js, 'modular.mjs')));
  const apis = await apiCatalogue(pkg, registry);
  const entries = Object.keys(apis).map(name => ({ in: `api:${name}`, out: name }));
  const { outputFiles, metafile } = await build({
    entryPoints: entries, outdir: 'used-entries', bundle: true, format: 'esm', minify: true, write: false, metafile: true,
    logOverride: { 'ignored-bare-import': 'silent' }, supported: { 'template-literal': false },
    // Core is bundled too, so markup extras builds through core (Menubar's menus) counts.
    alias: { ...coreSubpaths, '@expressivecss/extras/modular': './extras/dist/js/modular.mjs' },
    plugins: [{ name: 'public-exports', setup(builder) {
      builder.onResolve({ filter: /^api:/ }, args => ({ path: args.path.slice(4), namespace: 'api' }));
      builder.onLoad({ filter: /.*/, namespace: 'api' }, args => ({
        contents: `export { ${args.path} } from '${pkg.name}/modular'`, resolveDir: process.cwd(),
      }));
    } }],
  });
  // Associate public bindings with the actual chunks shipped by this build.
  // Consumer metafiles identify which chunks contributed bytes after tree shaking.
  const definingChunks = new Map();
  for (const input of Object.keys(metafile.inputs)) {
    if (!input.startsWith(`${js}/chunks/`.replace(/^\.\//, ''))) continue;
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

async function buildIndex(pkg, vocabulary) {
  const temp = mkdtempSync(join(tmpdir(), 'expressive-used-sass-'));
  try {
    cpSync(pkg.sass, temp, { recursive: true });
    const folder = join(temp, 'components');
    for (const file of readdirSync(folder, { recursive: true })) {
      if (!file.endsWith('.scss')) continue;
      const partial = file.replaceAll('\\', '/').replace(/(^|\/)_(?=[^/]+$)/, '$1').slice(0, -5);
      appendFileSync(join(folder, file), `\n/*!used:${partial}*/\n`);
    }

    const compiled = compile(join(temp, pkg.entry), { style: 'compressed', charset: false, loadPaths: ['src/sass'] }).css;
    const sheet = postcss.parse(compiled);
    const layer = name => sheet.nodes.find(node => node.name === 'layer' && node.params === name);
    const components = componentGroups(layer('components'));
    // Store offsets into the shipped stylesheet instead of shipping the CSS twice.
    const full = postcss.parse(readFileSync(join(pkg.root, 'dist/css', pkg.sheet), 'utf8'));
    const css = full.source.input.css;
    const componentLayer = full.nodes.find(node => node.name === 'layer' && node.params === 'components' && node.nodes);
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
    // Extras adds no utilities layer of its own.
    const utilities = full.nodes.find(node => node.name === 'layer' && node.params === 'utilities' && node.nodes)?.nodes.map(utility) ?? [];
    components.forEach(group => group.when.flat().forEach(token => vocabulary.add(token)));
    for (const rule of layerUtilityRules(utilities)) {
      for (const tokens of rule.when) tokens.forEach(token => vocabulary.add(token));
    }
    const apis = await runtimeStyles(vocabulary, pkg);
    mkdirSync(join(pkg.root, 'dist/cli'), { recursive: true });
    const sha256 = createHash('sha256').update(css).digest('hex');
    writeFileSync(join(pkg.root, 'dist/cli/styles.json'), JSON.stringify({ sha256, baseEnd, components, utilities, apis }));
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

// Extras API markup is checked against core's vocabulary as well as its own.
const vocabulary = new Set();
for (const pkg of packages) await buildIndex(pkg, vocabulary);
