import { parse } from '@babel/parser';
import { isReferenced, traverse, traverseFast } from '@babel/types';

export const scriptFile = /\.[cm]?[jt]sx?$/i;
const framework = new Set(['@expressivecss/expressive', '@expressivecss/expressive/modular', '@expressivecss/extras', '@expressivecss/extras/modular']);
const globals = new Set(['Expressive', 'ExpressiveExtras']);

export function parseScript(source, file) {
  const plugins = ['decorators-legacy'];
  if (/\.[cm]?tsx?$/i.test(file)) plugins.push('typescript');
  if (!/\.[cm]?ts$/i.test(file)) plugins.push('jsx');
  return parse(source, { sourceType: 'unambiguous', plugins, createImportExpressions: true,
    allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true, attachComment: false, errorRecovery: true });
}

export function stringValue(node) {
  if (node?.type === 'StringLiteral') return node.value;
  if (node?.type === 'TemplateLiteral' && !node.expressions.length) return node.quasis[0].value.cooked;
}

export function memberName(node) {
  return node?.computed ? stringValue(node.property) : node?.property?.name;
}

function loadsFramework(node) {
  if (node?.type === 'AwaitExpression') return loadsFramework(node.argument);
  if (node?.type === 'ImportExpression') return framework.has(stringValue(node.source));
  return node?.type === 'CallExpression' && node.callee.name === 'require' && framework.has(stringValue(node.arguments[0]));
}

export function collectModuleAPIs(tokens, tree, mode) {
  const locals = new Map();
  const namespaces = new Set(globals);
  const keep = name => tokens.add(`api:${name}`);
  function bind(pattern) {
    if (pattern?.type === 'Identifier') namespaces.add(pattern.name);
    for (const property of pattern?.properties ?? []) {
      if (property.type !== 'ObjectProperty') continue;
      const local = property.value.type === 'AssignmentPattern' ? property.value.left : property.value;
      if (local.type === 'Identifier') locals.set(local.name, property.key.name ?? property.key.value);
    }
  }
  // A bundled module's live framework exports come from esbuild. Separate
  // scripts still use their imported bindings, and CSS-only entry points may re-export them.
  if (mode !== 'bundled') traverseFast(tree, node => {
    if (node.type === 'ImportDeclaration' && node.importKind !== 'type' && framework.has(node.source.value)) {
      for (const spec of node.specifiers) {
        if (spec.type === 'ImportNamespaceSpecifier') namespaces.add(spec.local.name);
        if (spec.type === 'ImportSpecifier' && spec.importKind !== 'type') locals.set(spec.local.name, spec.imported.name ?? spec.imported.value);
      }
    } else if (node.type === 'ExportNamedDeclaration' && mode === 'all' && node.exportKind !== 'type' && framework.has(node.source?.value)) {
      for (const spec of node.specifiers) if (spec.local && spec.exportKind !== 'type') keep(spec.local.name ?? spec.local.value);
    } else if (node.type === 'VariableDeclarator' && loadsFramework(node.init)) {
      bind(node.id);
    } else if (node.type === 'CallExpression' && memberName(node.callee) === 'then' && loadsFramework(node.callee.object)) {
      bind(node.arguments[0]?.params?.[0]);
    }
  });
  if (mode === 'all') for (const name of locals.values()) keep(name);
  traverse(tree, (node, ancestors) => {
    if (mode === 'used' && node.type === 'Identifier' && locals.has(node.name)
      && isReferenced(node, ancestors.at(-1).node, ancestors.at(-2)?.node)) keep(locals.get(node.name));
    if (node.type !== 'MemberExpression' && node.type !== 'OptionalMemberExpression') return;
    const object = node.object;
    const global = globals.has(memberName(object)) && ['window', 'globalThis', 'self'].includes(object.object?.name);
    if (global || namespaces.has(object.name) || (mode !== 'bundled' && loadsFramework(object))) {
      const name = memberName(node);
      if (name) keep(name);
    }
  });
}
