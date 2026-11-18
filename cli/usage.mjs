import { decodeHTMLAttribute } from 'entities';

// Templates need not be valid HTML or JavaScript. Collect literal evidence
// across files without evaluating templates, configuration or application code.
const words = /(?:^|[\s"'`,(}])\.?([\w-]+(?::[\w-]+)*)(?=$|[\s"'`,)]|\$\{)/g;
const strings = /"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|`((?:\\.|[^`\\])*)`/gs;
const expressionParts = new RegExp([strings.source, /\/\*.*?\*\/|\/\/[^\r\n]*|[{}()]/.source].join('|'), 'gs');
const tags = /<([a-z][\w-]*)(?=[\s/>])((?:[^<>"']|"[^"]*"|'[^']*')*)/gi;
const attributes = /\s+([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)'|(true|false|\d+))\s*\}|([^\s"'=<>`/{}]+)))?/g;
const classAttributes = new Set(['class', 'classname', ':class', 'v-bind:class', 'class:list']);

function addWords(tokens, value) {
  for (const [, word] of value.matchAll(words)) tokens.add(word);
}

function classKeys(tokens, expression) {
  for (const [, double, single, bare] of expression.matchAll(/[{,]\s*(?:"([^"]*)"|'([^']*)'|([\w$-]+))\s*:/g)) {
    addWords(tokens, double ?? single ?? bare);
  }
}

// JSX and Astro expressions can contain comparisons, nested calls, and
// object literals. Only collect object keys inside a class binding or helper.
function boundClassKeys(tokens, source) {
  const bindings = /\b(?:class(?:Name|:list)?\s*=\s*\{|(?:clsx|class[nN]ames)\s*\()/g;
  while (bindings.exec(source)) {
    const start = bindings.lastIndex - 1;
    const open = source[start];
    const close = open === '{' ? '}' : ')';
    expressionParts.lastIndex = start + 1;
    let depth = 1;
    let part;
    while ((part = expressionParts.exec(source))) {
      if (part[0] === open) depth++;
      else if (part[0] === close && --depth === 0) break;
    }
    const end = part ? expressionParts.lastIndex : source.length;
    classKeys(tokens, source.slice(start, end));
    bindings.lastIndex = end;
  }
}

function attribute(tokens, name, value) {
  const key = name.toLowerCase();
  tokens.add(`[${key}]`);
  if (value === undefined) return;
  tokens.add(`[${key}=${value}]`);
  if (key === 'type') tokens.add(`[type=${value.toLowerCase()}]`);
  if (key === 'class' || key === 'classname') {
    // HTML class lists split on ASCII whitespace, including decoded tabs and spaces.
    for (const name of value.split(/[ \t\n\f\r]+/)) if (name) tokens.add(name);
  } else if (classAttributes.has(key)) addWords(tokens, value);
}

function markup(tokens, text) {
  for (const [, tag, attrs] of text.matchAll(tags)) {
    tokens.add(`<${tag.toLowerCase()}`);
    for (const [, name, double, single, jsDouble, jsSingle, primitive, bare] of attrs.matchAll(attributes)) {
      const raw = double ?? single ?? bare;
      const value = raw === undefined ? jsDouble ?? jsSingle ?? primitive : decodeHTMLAttribute(raw);
      attribute(tokens, name, value);
      if (value && classAttributes.has(name.toLowerCase())) classKeys(tokens, value);
      if (name.startsWith('class:')) tokens.add(name.slice(6));
    }
  }
}

function namedAPIs(tokens, names) {
  for (const specifier of names.split(',')) {
    const name = specifier.trim().split(/[\s:=]+/)[0];
    if (name) tokens.add(`api:${name}`);
  }
}

export function collectAPIReferences(tokens, source, scanImports = true) {
  const namespaces = new Set(['Expressive']);
  if (scanImports) {
    const named = /(?:import|export)\s*\{([^}]+)\}\s*from\s*["']@expressivecss\/expressive(?:\/modular)?["']/g;
    for (const [, names] of source.matchAll(named)) namedAPIs(tokens, names);
    const imports = /import\s*\*\s*as\s+([\w$]+)\s*from\s*["']@expressivecss\/expressive(?:\/modular)?["']/g;
    for (const [, alias] of source.matchAll(imports)) namespaces.add(alias);
    const required = /(?:\b(?:var|let|const)\s+(?:\{([^{}]+)\}|([\w$]+))\s*=\s*)?\brequire\s*\(\s*["']@expressivecss\/expressive["']\s*\)(?:\s*\??\.\s*(\w+))?/g;
    for (const [, names, alias, member] of source.matchAll(required)) {
      if (names) namedAPIs(tokens, names);
      if (member) tokens.add(`api:${member}`);
      else if (alias) namespaces.add(alias);
    }
  }
  // Leave the member available as the next receiver in window.Expressive.Snackbar.
  for (const [, alias, name] of source.matchAll(/(?<![\w$])([\w$]+)(?=\s*\??\.\s*(\w+))/g)) {
    if (namespaces.has(alias)) tokens.add(`api:${name}`);
  }
}

function createdElements(tokens, source) {
  for (const [, tag] of source.matchAll(/\b(?:createElement|jsx|jsxs)\(\s*["']([\w-]+)["']/g)) tokens.add(`<${tag}`);
  for (const [, name, , value] of source.matchAll(/\.setAttribute\(\s*["']([\w:-]+)["'](?:\s*,\s*(["'])([\w-]+)\2)?/g)) attribute(tokens, name, value);
  for (const [, name, , value] of source.matchAll(/\.(id|type|role)\s*=\s*(?:(["'])([\w-]+)\2)?/g)) attribute(tokens, name, value);
}

export function collectUsage(tokens, source) {
  markup(tokens, source);
  createdElements(tokens, source);
  boundClassKeys(tokens, source);
  for (const [, ...values] of source.matchAll(strings)) {
    const literal = values.find(value => value !== undefined).replace(/\\(["'`])/g, '$1');
    addWords(tokens, literal);
    if (literal.includes('<')) markup(tokens, literal);
  }
}

function matches(rule, tokens, classes) {
  return !rule.when.length || rule.when.some(set => set.every(token => tokens.has(token)))
    || (classes.size > 0 && rule.classes.some(name => classes.has(name)));
}

function renderUtility(rule, tokens, classes, sheet) {
  if (!rule.rules) return matches(rule, tokens, classes) ? sheet.slice(...rule.span) : '';
  const body = rule.rules.map(child => renderUtility(child, tokens, classes, sheet)).join('');
  return body ? `${rule.open}${body}}` : '';
}

function applyIncludes(index, names, tokens) {
  const partials = new Set();
  const classes = new Set();
  names.forEach(name => {
    if (name.startsWith('components/')) {
      const partial = name.slice(11);
      if (!index.components.some(group => group.name === partial)) throw new Error(`Unknown component partial: ${name}`);
      partials.add(partial);
    } else if (Object.hasOwn(index.apis, name)) {
      tokens.add(`api:${name}`);
    } else {
      classes.add(name);
      tokens.add(name);
    }
  });
  return { partials, classes };
}

function usesAPI([name, api], tokens, classes) {
  return tokens.has(`api:${name}`) || tokens.has(`Expressive_${name}`) || (api.when.length && matches(api, tokens, classes));
}

export function selectedStyles(index, sheet, tokens, includes) {
  const { partials, classes } = applyIncludes(index, includes, tokens);
  // Only authored evidence chooses APIs. Generated picker markup, for example,
  // needs menu styles but does not opt the app into additional initialization.
  const used = Object.entries(index.apis).filter(api => usesAPI(api, tokens, classes));
  for (const [, api] of used) {
    api.tokens.forEach(token => tokens.add(token));
    api.styles.forEach(name => partials.add(name));
  }
  const selected = index.components.filter(partial => partials.has(partial.name) || matches(partial, tokens, classes));
  const components = selected.map(partial => sheet.slice(...partial.span)).join('');
  const utilities = index.utilities.map(rule => renderUtility(rule, tokens, classes, sheet)).join('');
  return {
    css: `${sheet.slice(0, index.baseEnd)}@layer components{${components}}@layer utilities{${utilities}}\n`,
    names: selected.map(partial => partial.name),
  };
}
