#!/usr/bin/env node
import { accessSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { access, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { JSDOM } from 'jsdom';
import * as z from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MAX_COMPONENT_RESPONSE_CHARS = 24_000;
const DEFAULT_QA_MAX_FILES = 300;
const DEFAULT_QA_MAX_MB = 2;
const DEFAULT_COMMAND_TIMEOUT_MS = 120_000;

const SETTINGS = {
  maxComponentResponseChars: Number(process.env.EXPRESSIVECSS_MCP_MAX_COMPONENT_RESPONSE_CHARS || DEFAULT_MAX_COMPONENT_RESPONSE_CHARS),
  maxComponentSkips: Number(process.env.EXPRESSIVECSS_MCP_MAX_COMPONENT_SKIPS || 7),
  qaMaxFiles: Number(process.env.EXPRESSIVECSS_MCP_QA_MAX_FILES || DEFAULT_QA_MAX_FILES),
  qaMaxMb: Number(process.env.EXPRESSIVECSS_MCP_QA_MAX_MB || DEFAULT_QA_MAX_MB),
};

const SKIP_FLAGS = {
  setupExpert: 'SKIP_SETUP_EXPERT',
  rulesEnforcer: 'SKIP_RULES_ENFORCER',
  creativeDirector: 'SKIP_CREATIVE_DIRECTOR',
  pageArchitect: 'SKIP_PAGE_ARCHITECT',
  componentSyntaxExpert: 'SKIP_COMPONENT_SYNTAX_EXPERT',
  qualityInspector: 'SKIP_QUALITY_INSPECTOR',
};

const NEXT_TOOL = {
  setup_expert: 'rules_enforcer',
  rules_enforcer: 'creative_director',
  creative_director: 'page_arcjitect',
  page_architect: 'component_syntax_expert',
  component_syntax_expert: 'quality_inspector',
  quality_inspector: null,
  page_arcjitect: 'component_syntax_expert',
};

const LegacyPatternList = [
  {
    id: 'legacy-btn-class',
    severity: 'high',
    description: 'Replace `.btn` with the ExpressiveCSS button contract (`<button>`, `.button`, or component-specific button classes).',
    pattern: /\bclass(?:Name)?\s*=\s*["'][^"']*\bbtn\b[^"']*["']/g,
  },
  {
    id: 'legacy-card-content',
    severity: 'high',
    description: '`.card-content` was removed; use the component’s documented child structure.',
    pattern: /\bcard-content\b/g,
  },
  {
    id: 'legacy-nav-wrapper',
    severity: 'high',
    description: '`.nav-wrapper` is legacy Materialize structure; use ExpressiveCSS nav components directly.',
    pattern: /\bnav-wrapper\b/g,
  },
  {
    id: 'legacy-brand-logo',
    severity: 'medium',
    description: '`.brand-logo` is Materialize-era naming; prefer native layout semantics in ExpressiveCSS pages.',
    pattern: /\bbrand-logo\b/g,
  },
  {
    id: 'legacy-lever',
    severity: 'medium',
    description: '`.lever` is a Materialize switch token, replace with Expressive switches per component guide.',
    pattern: /\blever\b/g,
  },
  {
    id: 'legacy-filled-in',
    severity: 'medium',
    description: '`.filled-in` is legacy checkbox styling; use ExpressiveCSS checkbox component markup and classes.',
    pattern: /\bfilled-in\b/g,
  },
  {
    id: 'legacy-materialized-name',
    severity: 'medium',
    description: 'Avoid `el["M_"]` / `window.M` instance patterns. Use `el["Expressive_<Component>"]` names.',
    pattern: /\bel\[['"]M_[A-Za-z_]+['"]\]|\bwindow\.M\b/g,
  },
];

const ROLE_TO_ALIAS_COMPONENTS = {
  navigation: ['app-bar', 'navigation-bar', 'navigation-rail', 'navigation-drawer', 'sidenav', 'menu', 'tabs'],
  nav: ['app-bar', 'navigation-bar', 'navigation-rail', 'navigation-drawer', 'sidenav', 'menu', 'breadcrumbs'],
  button: ['buttons', 'icon-buttons', 'button-groups', 'segmented-buttons', 'fab', 'split-button'],
  action: ['buttons', 'icon-buttons', 'fab'],
  menu: ['menu', 'app-bar', 'navigation-bar', 'pagination'],
  card: ['cards', 'media', 'snackbar', 'banners'],
  feedback: ['snackbar', 'banners'],
  dialog: ['dialogs', 'lightbox', 'tooltip'],
  form: ['fieldsets', 'text-fields', 'select', 'checkboxes', 'radio-buttons', 'switches', 'slider', 'chips', 'autocomplete'],
  calendar: ['date-picker', 'time-picker'],
  date: ['date-picker', 'time-picker'],
  surface: ['panes', 'cards', 'tabs', 'navigation-drawer'],
};

const TOOL_DESCRIPTIONS = {
  setup_expert: {
    stage: 'Setup Expert',
    description: 'Onboard a project and verify ExpressiveCSS baseline requirements.',
  },
  rules_enforcer: {
    stage: 'Rules Enforcer',
    description: 'Validate markup and authoring invariants before moving to design and implementation.',
  },
  creative_director: {
    stage: 'Creative Director',
    description: 'Choose components and patterns that best match stated UX goals.',
  },
  page_architect: {
    stage: 'Page Architect',
    description: 'Propose landmarked page architecture, layout, and content flow.',
  },
  page_arcjitect: {
    stage: 'Page Arcjitect',
    description: 'Page Arcjitect spelling used by the requested workflow; equivalent to Page Architect.',
  },
  component_syntax_expert: {
    stage: 'Component Syntax Expert',
    description: 'Return authoritative syntax, contract, and usage constraints for selected components.',
  },
  quality_inspector: {
    stage: 'Quality Inspector',
    description: 'Run checks and report a quality verdict for changed files and target project scope.',
  },
};

const setupSchema = {
  projectRoot: z.string().optional(),
  themes: z.boolean().default(false),
  colors: z.boolean().default(false),
  installHint: z.boolean().default(false),
  workflowId: z.string().optional(),
};

const rulesSchema = {
  projectRoot: z.string().optional(),
  snippet: z.string().min(1),
  targetComponents: z.array(z.string()).optional(),
  workflowId: z.string().optional(),
};

const creativeSchema = {
  projectRoot: z.string().optional(),
  goal: z.string().min(10),
  constraints: z.string().optional(),
  maxSuggestions: z.number().int().min(1).max(12).default(7),
  workflowId: z.string().optional(),
};

const pageArchitectSchema = {
  projectRoot: z.string().optional(),
  pageGoal: z.string().min(8),
  components: z.array(z.string()).default([]),
  viewportTarget: z.enum(['compact', 'medium', 'expanded', 'large', 'extra-large', 'responsive']).default('responsive'),
  includeAccessibility: z.boolean().default(true),
  workflowId: z.string().optional(),
};

const syntaxSchema = {
  projectRoot: z.string().optional(),
  components: z.array(z.string()).min(1).max(12),
  workflowId: z.string().optional(),
};

const inspectSchema = {
  projectRoot: z.string().optional(),
  files: z.array(z.string()).default([]),
  runType: z.enum(['quick', 'standard', 'full']).default('quick'),
  runCommands: z.boolean().default(false),
  workflowId: z.string().optional(),
};

/**
 * Resolve the root of the current checkout and its ExpressiveCSS guides.
 */
async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseCliProjectRoot() {
  const args = process.argv.slice(2);
  const explicit = args.find((arg) => arg.startsWith('--project-root='));
  if (explicit) {
    return path.resolve(explicit.split('=')[1] || process.cwd());
  }
  return resolveRepoRoot(process.cwd());
}

function resolveProjectRoot(projectRoot) {
  return projectRoot ? path.resolve(projectRoot) : parseCliProjectRoot();
}

function resolveRepoRoot(startDir) {
  let current = path.resolve(startDir);
  for (let i = 0; i < 8; i++) {
    const pkgPath = path.join(current, 'package.json');
    const skillPath = path.join(current, 'skills', 'expressivecss', 'components');
    const navPath = path.join(current, 'docs', 'src', 'data', 'nav.ts');

    if (accessSyncBoolean(pkgPath) && accessSyncBoolean(skillPath) && accessSyncBoolean(navPath)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return path.resolve(startDir);
}

function accessSyncBoolean(filePath) {
  try {
    accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizeForMatch(value) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '');
}

function extractSection(text, heading) {
  const marker = `#### ${heading}`;
  const start = text.indexOf(marker);
  if (start === -1) {
    return '';
  }
  const body = text.slice(start + marker.length);
  const next = body.indexOf('\n#### ');
  return (next === -1 ? body : body.slice(0, next)).trim();
}

function extractTitle(text) {
  const match = text.match(/^###\s*(.+)$/m);
  return match ? match[1].trim() : 'Component';
}

function extractFirstCodeBlock(text) {
  const fenced = text.match(/```(?:[a-z0-9+.-]+)?\n([\s\S]*?)```/i);
  if (!fenced) return '';
  return fenced[1].trim();
}

function extractRules(text) {
  if (!text) {
    return [];
  }
  const lines = text.split('\n');
  const rules = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      rules.push(trimmed.replace(/^-\s*/, '').trim());
    }
  }
  return rules;
}

function clampText(input, maxChars) {
  const text = input?.toString() ?? '';
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxChars - 40))}…(truncated)`;
}

function toToolResult(payload) {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(payload, null, 2),
    }],
    structuredContent: payload,
  };
}

function buildStagePayload(tool, result, workflowId) {
  return {
    workflowId: workflowId || randomUUID().slice(0, 12),
    stage: tool,
    nextTool: NEXT_TOOL[tool] || null,
    ...result,
  };
}

function skipTool(toolName) {
  const envKey = SKIP_FLAGS[toolName];
  if (!envKey) {
    return false;
  }
  return process.env[envKey] === 'true';
}

function skippedStage(tool, envKey, workflowId) {
  return toToolResult(buildStagePayload(
    tool,
    {
      skipped: true,
      message: `${TOOL_DESCRIPTIONS[tool].stage} is disabled by ${envKey}.`,
    },
    workflowId,
  ));
}

function tokenize(value) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/gu)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

function buildCatalogCacheKey(projectRoot) {
  return path.resolve(projectRoot || process.cwd());
}

function resolveGuideDirectory(projectRoot) {
  const packageJson = requireSafeJson(path.join(projectRoot, 'package.json'));
  if (packageJson?.name !== '@expressivecss/expressive') {
    return null;
  }
  const candidate = path.join(projectRoot, 'skills', 'expressivecss', 'components');
  return accessSyncBoolean(candidate) ? candidate : null;
}

function parseGuide(file, content) {
  const slug = file.replace(/\.md$/u, '');
  const title = extractTitle(content);
  const contract = extractSection(content, 'Contract');
  const syntax = extractSection(content, 'Syntax');
  const rules = extractRules(extractSection(content, 'Rules'));
  const syntaxCode = extractFirstCodeBlock(syntax);
  const syntaxLangMatch = syntax.match(/```\s*([a-z0-9+.-]+)/i);
  const syntaxLanguage = syntaxLangMatch ? syntaxLangMatch[1].toLowerCase() : 'html';
  const docsMatch = content.match(/\[Component documentation\]\(([^\)]+)\)/);
  const repoMatch = content.match(/https:\/\/github\.com\/BaezFJ\/ExpressiveCSS\/blob\/master\/docs\/src\/pages\/([^\)\s]+)\.astro/);

  return {
    slug,
    title,
    contract: clampText(contract, 1_000),
    syntax: {
      language: syntaxLanguage,
      code: clampText(syntaxCode, Math.max(1_200, Math.floor(SETTINGS.maxComponentResponseChars / 2))),
    },
    rules: rules.length ? rules : [
      'Follow the component contract in the full documentation before adding optional attributes.',
      'Keep runtime-owned state in framework initialization, not in static markup values.',
    ],
    sourceUrl: docsMatch ? docsMatch[1] : null,
    astroSource: repoMatch ? `https://github.com/BaezFJ/ExpressiveCSS/blob/master/docs/src/pages/${repoMatch[1]}.astro` : null,
    text: `${title}\n${contract}\n${rules.join('\n')}`.toLowerCase(),
  };
}

async function loadGuideCatalog(projectRoot) {
  const root = buildCatalogCacheKey(projectRoot);
  if (catalogCache.has(root)) {
    return catalogCache.get(root);
  }

  const guideDir = resolveGuideDirectory(projectRoot);
  const dirStat = guideDir ? await stat(guideDir).catch(() => null) : null;
  let guideEntries;
  let frameworkVersion;
  let guideSource;

  if (dirStat?.isDirectory()) {
    const files = (await readdir(guideDir)).filter((name) => name.endsWith('.md')).sort();
    guideEntries = await Promise.all(files.map(async (file) => ({
      file,
      content: await readFile(path.join(guideDir, file), 'utf8'),
    })));
    frameworkVersion = requireSafeJson(path.join(projectRoot, 'package.json'))?.version ?? null;
    guideSource = 'framework-source';
  } else {
    const bundledPath = path.join(SERVER_DIR, 'component-guides.json');
    const bundled = JSON.parse(await readFile(bundledPath, 'utf8'));
    if (bundled.schemaVersion !== 1 || !bundled.frameworkVersion || !Array.isArray(bundled.guides)) {
      throw new Error(`Bundled ExpressiveCSS component guide data is invalid at ${bundledPath}`);
    }
    guideEntries = bundled.guides;
    frameworkVersion = bundled.frameworkVersion;
    guideSource = 'bundled';
  }

  const components = new Map();

  for (const entry of guideEntries) {
    const guide = parseGuide(entry.file, entry.content);
    components.set(guide.slug, guide);
  }

  const catalog = {
    generatedAt: new Date().toISOString(),
    projectRoot: path.resolve(projectRoot),
    frameworkVersion,
    guideSource,
    count: components.size,
    components,
  };

  catalogCache.set(root, catalog);
  return catalog;
}

function findGuideByName(catalog, rawName) {
  if (!rawName) {
    return null;
  }

  const canonical = normalizeForMatch(rawName);
  const direct = catalog.components.get(canonical);
  if (direct) {
    return direct;
  }

  for (const [slug, guide] of catalog.components.entries()) {
    const titleSlug = normalizeForMatch(guide.title);
    const fileSlug = normalizeForMatch(slug);
    if (titleSlug === canonical || fileSlug === canonical || normalizeForMatch(guide.slug).startsWith(canonical)) {
      return guide;
    }
  }

  // Fuzzy fallback by token overlap.
  const tokens = new Set(tokenize(canonical));
  const scores = [];
  for (const guide of catalog.components.values()) {
    let score = 0;
    for (const token of tokens) {
      if (guide.text.includes(token)) {
        score += 1;
      }
    }
    if (score > 0) {
      scores.push({score, guide});
    }
  }

  if (!scores.length) {
    return null;
  }

  scores.sort((a, b) => b.score - a.score);
  return scores[0].guide;
}

function nearestMatches(catalog, token, limit = 5) {
  const normalized = normalizeForMatch(token);
  const scored = [];
  for (const guide of catalog.components.values()) {
    const slug = normalizeForMatch(guide.slug);
    const title = normalizeForMatch(guide.title);
    let score = 0;
    if (slug.includes(normalized) || title.includes(normalized)) {
      score += 3;
    }
    for (const t of tokenize(guide.text)) {
      if (normalized.includes(t) || t.includes(normalized)) {
        score += 1;
      }
    }
    if (score > 0) {
      scored.push({ score, slug: guide.slug, title: guide.title });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function projectSummary(projectRoot) {
  const summary = {
    projectRoot,
    isExpressiveProject: false,
    dependency: null,
    packageManager: null,
    installGuide: null,
    foundDocs: false,
    foundSkills: false,
    bundledGuides: accessSyncBoolean(path.join(SERVER_DIR, 'component-guides.json')),
  };

  const packagePath = path.join(projectRoot, 'package.json');
  const lockFiles = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'].map((f) => path.join(projectRoot, f));

  if (lockFiles.some((p) => accessSyncBoolean(p))) {
    summary.packageManager = lockFiles.find((p) => accessSyncBoolean(p)).endsWith('package-lock.json')
      ? 'npm'
      : lockFiles.find((p) => accessSyncBoolean(p)).endsWith('yarn.lock')
        ? 'yarn'
        : 'pnpm';
  }

  const packageJson = requireSafeJson(packagePath);
  if (packageJson && typeof packageJson === 'object') {
    if (packageJson.name === '@expressivecss/expressive') {
      summary.isExpressiveProject = true;
      summary.dependency = {
        version: packageJson.version,
        dependencyKind: 'framework source',
      };
    }
    const deps = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
    };
    const expressive = deps['@expressivecss/expressive'];
    if (expressive && !summary.isExpressiveProject) {
      summary.isExpressiveProject = true;
      summary.dependency = {
        version: expressive,
        dependencyKind: (packageJson.dependencies || {})['@expressivecss/expressive'] ? 'dependency' : 'devDependency',
      };
    }
  }

  summary.foundDocs = accessSyncBoolean(path.join(projectRoot, 'docs', 'src', 'data', 'nav.ts'));
  summary.foundSkills = accessSyncBoolean(path.join(projectRoot, 'skills', 'expressivecss', 'SKILL.md'));

  summary.installGuide = summary.isExpressiveProject
    ? 'ExpressiveCSS is already in package.json.'
    : 'Add @expressivecss/expressive and include dist/js/expressive.{mjs,cjs} or npm package import. See install docs.';

  return summary;
}

function frameworkVersionCompatibility(declaredVersion, contractVersion) {
  if (!declaredVersion) {
    return {
      status: 'unknown',
      message: `No ExpressiveCSS dependency version was detected; rules use bundled ${contractVersion} contracts.`,
    };
  }
  const normalized = String(declaredVersion).trim().replace(/^[~^]/u, '');
  if (normalized === contractVersion) {
    return { status: 'match', message: `Rules match ExpressiveCSS ${contractVersion}.` };
  }
  return {
    status: 'review',
    message: `Project declares ${declaredVersion}; this server bundles ${contractVersion} contracts. Confirm differences in the target version's documentation.`,
  };
}

function loadSemanticsContract() {
  if (semanticsCache) {
    return semanticsCache;
  }

  const semanticsPath = path.join(SERVER_DIR, 'semantics-data.json');
  const bundled = JSON.parse(readFileSync(semanticsPath, 'utf8'));
  if (bundled.schemaVersion !== 1 || !bundled.frameworkVersion || !bundled.semantics?.rows) {
    throw new Error(`Bundled ExpressiveCSS semantics are invalid at ${semanticsPath}`);
  }
  semanticsCache = bundled;
  return semanticsCache;
}

function enforcedSemanticRules(data) {
  return Object.entries(data.rows)
    .filter(([, component]) => component.status === 'enforced')
    .flatMap(([component, definition]) => definition.rules.map((rule) => ({ ...rule, component })));
}

function expandedSemanticSelector(rule, compositeRoles) {
  if (rule.kind !== 'forbid-composite-roles') {
    return rule.selector;
  }
  return compositeRoles.map((role) => `${rule.selector}[role="${role}"]`).join(', ');
}

function authoredName(element, document) {
  const label = element.getAttribute('aria-label');
  if (label?.trim()) {
    return label.trim();
  }
  const labelledBy = element.getAttribute('aria-labelledby');
  if (!labelledBy) {
    return '';
  }
  return labelledBy
    .split(/\s+/u)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
    .trim();
}

function accessibleName(element, document) {
  const authored = authoredName(element, document);
  if (authored) {
    return authored;
  }
  const clone = element.cloneNode(true);
  clone.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove());
  return clone.textContent.trim();
}

function inspectSemanticRules(snippet) {
  const { semantics, frameworkVersion } = loadSemanticsContract();
  const { document } = new JSDOM(`<!doctype html><body>${snippet}</body>`).window;
  const issues = [];

  for (const rule of enforcedSemanticRules(semantics)) {
    const hits = [...document.querySelectorAll(expandedSemanticSelector(rule, semantics.compositeRoles))];
    if (rule.kind === 'forbid' || rule.kind === 'forbid-composite-roles') {
      for (const element of hits) {
        issues.push(semanticIssue(rule, element, frameworkVersion));
      }
    } else if (rule.kind === 'require-attr') {
      for (const element of hits) {
        const value = element.getAttribute(rule.attr);
        const valid = rule.equals ? value === rule.equals : value !== null && value !== '';
        if (!valid) {
          issues.push(semanticIssue(rule, element, frameworkVersion));
        }
      }
    } else if (rule.kind === 'require-accessible-name') {
      for (const element of hits) {
        if (!accessibleName(element, document)) {
          issues.push(semanticIssue(rule, element, frameworkVersion));
        }
      }
    }
  }

  const seenLandmarkNames = new Set();
  for (const nav of document.querySelectorAll('nav')) {
    const name = authoredName(nav, document);
    if (!name) {
      continue;
    }
    if (seenLandmarkNames.has(name)) {
      issues.push({
        id: 'duplicate-navigation-landmark-name',
        severity: 'high',
        component: 'landmarks',
        frameworkVersion,
        rule: `Navigation landmarks on one page need distinct names; "${name}" is repeated.`,
        location: { line: 1, column: 1 },
        snippet: nav.outerHTML.slice(0, 140),
      });
    }
    seenLandmarkNames.add(name);
  }

  return issues;
}

function semanticIssue(rule, element, frameworkVersion) {
  return {
    id: rule.id,
    severity: 'high',
    component: rule.component,
    frameworkVersion,
    rule: rule.message,
    location: { line: 1, column: 1 },
    snippet: element.outerHTML.slice(0, 140),
  };
}

function requireSafeJson(filePath) {
  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function lineForMatch(text, index) {
  const prefix = text.slice(0, index);
  const line = prefix.split('\n').length;
  const col = prefix.length - prefix.lastIndexOf('\n');
  return { line, column: col };
}

function inspectAuthoringRules(snippet) {
  const issues = [];

  for (const rule of LegacyPatternList) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : `${rule.pattern.flags}g`);
    let match;
    while ((match = regex.exec(snippet)) !== null) {
      const loc = lineForMatch(snippet, match.index);
      issues.push({
        id: rule.id,
        severity: rule.severity,
        rule: rule.description,
        location: { line: loc.line, column: loc.column },
        snippet: match[0].slice(0, 120),
      });
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
  }

  issues.push(...inspectSemanticRules(snippet));

  return issues;
}

function buildCreativeCandidates(catalog, goal, maxSuggestions, componentsHint = []) {
  const tokens = new Set(tokenize(goal));
  const manualSuggestions = new Map();

  for (const token of tokens) {
    const key = normalizeForMatch(token);
    if (ROLE_TO_ALIAS_COMPONENTS[key]) {
      for (const slug of ROLE_TO_ALIAS_COMPONENTS[key]) {
        manualSuggestions.set(slug, (manualSuggestions.get(slug) || 0) + 2);
      }
    }
  }

  for (const component of componentsHint) {
    const slug = normalizeForMatch(component);
    if (slug && ROLE_TO_ALIAS_COMPONENTS[slug]) {
      for (const mapped of ROLE_TO_ALIAS_COMPONENTS[slug]) {
        manualSuggestions.set(mapped, (manualSuggestions.get(mapped) || 0) + 1);
      }
    }
  }

  const scored = [];
  for (const guide of catalog.components.values()) {
    let score = 0;
    for (const token of tokens) {
      const tokenNorm = normalizeForMatch(token);
      if (guide.text.includes(tokenNorm)) {
        score += 1;
      }
    }
    if (manualSuggestions.has(guide.slug)) {
      score += manualSuggestions.get(guide.slug);
    }
    if (score > 0) {
      const reasonTokens = [];
      for (const token of tokens) {
        if (guide.text.includes(token)) {
          reasonTokens.push(token);
        }
      }
      scored.push({
        slug: guide.slug,
        title: guide.title,
        score,
        why: reasonTokens.length
          ? `Matches: ${reasonTokens.slice(0, 4).join(', ')}`
          : 'Common ExpressiveCSS fit for the goal shape',
        docs: guide.sourceUrl,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));
  return scored.slice(0, maxSuggestions);
}

function buildPageArchitecture(catalog, pageGoal, components = [], viewportTarget = 'responsive', includeAccessibility = true) {
  const selected = [];

  for (const component of components) {
    const guide = findGuideByName(catalog, component);
    if (guide) {
      selected.push(guide.slug);
      continue;
    }
    const matches = nearestMatches(catalog, component, 1);
    if (matches.length) {
      selected.push(matches[0].slug);
    }
  }

  const uniqueSelected = Array.from(new Set(selected));
  const hasAppBar = uniqueSelected.includes('app-bar');
  const primaryNavigation = uniqueSelected.find((slug) => ['navigation-bar', 'navigation-rail', 'navigation-drawer', 'sidenav'].includes(slug));
  const hasTabs = uniqueSelected.includes('tabs');
  const hasBreadcrumbs = uniqueSelected.includes('breadcrumbs');
  const hasFooter = uniqueSelected.includes('footer');
  const hasFeedback = selected.some((slug) => ['snackbar', 'banners', 'tooltips'].includes(slug));
  const structuralComponents = new Set([
    'app-bar',
    'navigation-bar',
    'navigation-rail',
    'navigation-drawer',
    'sidenav',
    'tabs',
    'breadcrumbs',
    'footer',
  ]);
  const contentComponents = uniqueSelected.filter((slug) => !structuralComponents.has(slug));

  const landmarks = [];
  if (hasAppBar) {
    landmarks.push({
      role: 'banner',
      component: 'app-bar',
      purpose: 'Page title and global actions; its child nav is labelled.',
    });
  }
  if (primaryNavigation) {
    landmarks.push({
      role: 'navigation',
      component: primaryNavigation,
      purpose: 'Primary destinations; the component itself owns the labelled navigation landmark.',
    });
  }

  landmarks.push({
    role: 'main',
    component: contentComponents.includes('panes') ? 'panes' : 'authored content',
    purpose: 'Primary feature content and interaction surface.',
  });

  if (hasFooter) {
    landmarks.push({
      role: 'contentinfo',
      component: 'footer',
      purpose: 'Global helper links and closing information.',
    });
  }

  const skeleton = ['<body>'];
  if (hasAppBar) {
    skeleton.push(
      '  <header>',
      '    <nav aria-label="Main">',
      '      <!-- app bar title and actions -->',
      '    </nav>',
      '  </header>',
    );
  }
  if (primaryNavigation === 'navigation-bar') {
    skeleton.push('  <nav class="navigation-bar" aria-label="Primary"><!-- 3–5 destinations; mark one aria-current="page" --></nav>');
  } else if (primaryNavigation === 'navigation-rail') {
    skeleton.push('  <nav class="navigation-rail" aria-label="Primary"><!-- destinations; mark one aria-current="page" --></nav>');
  } else if (primaryNavigation === 'navigation-drawer' || primaryNavigation === 'sidenav') {
    skeleton.push(
      '  <nav aria-label="Primary">',
      '    <ul class="navigation-drawer"><!-- destinations --></ul>',
      '  </nav>',
    );
  }
  skeleton.push('  <main>');
  if (hasBreadcrumbs) {
    skeleton.push('    <nav aria-label="Breadcrumb"><ol><!-- ordered path; final link uses aria-current="page" --></ol></nav>');
  }
  if (hasTabs) {
    skeleton.push('    <nav class="tabs" aria-label="Sections"><!-- section links; active link uses aria-current="page" --></nav>');
  }
  skeleton.push('    <!-- primary page content -->');
  skeleton.push(...contentComponents.slice(0, 4).map((slug) => `    <!-- ${slug} -->`));
  skeleton.push('  </main>');
  if (hasFeedback) {
    skeleton.push('  <div aria-live="polite"><!-- feedback component placeholder --></div>');
  }
  if (hasFooter) {
    skeleton.push('  <footer><!-- footer content --></footer>');
  }
  skeleton.push('</body>');

  const notes = [];
  if (viewportTarget === 'responsive') {
    notes.push('Plan adaptive behavior for compact → expanded → large breakpoints using Material Design 3 size guidance.');
  } else {
    notes.push(`Targeted viewport intent: ${viewportTarget}; verify this still degrades to adjacent breakpoints.`);
  }
  if (includeAccessibility) {
    notes.push('Each landmark and control needs an accessible name and keyboard path before final render.');
  }

  return {
    objective: pageGoal,
    architecture: {
      viewportTarget,
      landmarkOrder: landmarks,
      selectedComponents: uniqueSelected,
      skeleton: skeleton.join('\n'),
    },
    rationale: notes,
  };
}

function summarizeGuide(guide) {
  return {
    slug: guide.slug,
    title: guide.title,
    source: guide.sourceUrl,
    docs: guide.astroSource,
    contract: clampText(guide.contract, 900),
    syntax: {
      language: guide.syntax.language,
      example: clampText(guide.syntax.code, 3_000),
    },
    rules: guide.rules.slice(0, 8),
  };
}

function summarizeProjectFiles(files, projectRoot) {
  const resolvedRoot = realpathSync(path.resolve(projectRoot));
  const absoluteFiles = files.map((filePath) => {
    const requestedPath = path.isAbsolute(filePath)
      ? path.resolve(filePath)
      : path.resolve(resolvedRoot, filePath);
    const exists = accessSyncBoolean(requestedPath);
    const absolute = exists ? realpathSync(requestedPath) : requestedPath;
    return {
      requested: filePath,
      absolute,
      exists,
      insideProject: isPathInside(resolvedRoot, absolute),
    };
  });

  const existing = [];
  const skipped = [];
  const maxFiles = Number.isFinite(SETTINGS.qaMaxFiles) && SETTINGS.qaMaxFiles > 0 ? SETTINGS.qaMaxFiles : DEFAULT_QA_MAX_FILES;
  for (const item of absoluteFiles) {
    if (existing.length >= maxFiles) {
      skipped.push({ ...item, reason: 'file limit reached' });
      continue;
    }
    if (!item.exists) {
      skipped.push({ ...item, reason: 'file does not exist' });
      continue;
    }
    if (!item.insideProject) {
      skipped.push({ ...item, reason: 'file is outside projectRoot' });
      continue;
    }
    if (path.relative(resolvedRoot, item.absolute).split(path.sep).includes('node_modules')) {
      skipped.push({ ...item, reason: 'node_modules is excluded' });
      continue;
    }
    existing.push(item);
  }

  return {
    existing,
    skipped,
  };
}

function isPathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function redactSensitiveText(value) {
  return String(value)
    .replace(/\bBearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]{8,})\b/g, '[REDACTED]')
    .replace(/\b(API[_-]?KEY|TOKEN|PASSWORD|PASSWD|SECRET|CONNECTION[_-]?STRING)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/gi, '$1[REDACTED]@');
}

function findFileViolations(fileInfoList) {
  const findings = [];
  const maxBytes = Math.max(1, SETTINGS.qaMaxMb * 1024 * 1024);

  for (const file of fileInfoList) {
    try {
      const size = statSync(file.absolute).size;
      if (size > maxBytes) {
        findings.push({
          file: file.requested,
          issues: [
            {
              id: 'file-too-large',
              severity: 'low',
              rule: `Skipping file over size limit: ${Math.round(size / 1024 / 1024 * 100) / 100}MB > ${SETTINGS.qaMaxMb}MB`,
              location: null,
              snippet: '',
            },
          ],
        });
        continue;
      }

      const text = readFileSync(file.absolute, 'utf8');
      const issues = inspectAuthoringRules(text);
      if (issues.length > 0) {
        findings.push({
          file: file.requested,
          issues,
        });
      }
    } catch (error) {
      findings.push({
        file: file.requested,
        issues: [
          {
            id: 'read-failure',
            severity: 'low',
            rule: `Unable to read file for lint checks: ${error.message}`,
            location: null,
            snippet: '',
          },
        ],
      });
    }
  }

  return findings;
}

async function runCommandInProject(projectRoot, command, args, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd: projectRoot,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CI: '1',
      },
    });

    let stdout = '';
    let stderr = '';
    let forceKillTimer;
    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      forceKillTimer = setTimeout(() => proc.kill('SIGKILL'), 5_000);
      forceKillTimer.unref();
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => {
      if (stdout.length < 80_000) {
        stdout += chunk.toString();
      }
    });
    proc.stderr.on('data', (chunk) => {
      if (stderr.length < 80_000) {
        stderr += chunk.toString();
      }
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      clearTimeout(forceKillTimer);
      const output = redactSensitiveText(`${stdout}\n${stderr}`);
      resolve({
        command: `${command} ${args.join(' ')}`,
        exitCode: typeof code === 'number' ? code : 1,
        output: clampText(output, 20_000),
      });
    });

    proc.on('error', (error) => {
      clearTimeout(timer);
      clearTimeout(forceKillTimer);
      resolve({
        command: `${command} ${args.join(' ')}`,
        exitCode: 1,
        output: redactSensitiveText(`Failed to run command: ${error.message}`),
      });
    });
  });
}

async function runQualityCommands(projectRoot, runType) {
  const commands = [];
  if (runType === 'standard' || runType === 'full') {
    commands.push(['npm', ['run', 'typecheck'], 180_000]);
  }
  if (runType === 'full') {
    commands.push(['npm', ['run', 'test'], 360_000]);
  }

  const results = [];
  for (const [command, args, timeout] of commands) {
    const result = await runCommandInProject(projectRoot, command, args, timeout);
    results.push(result);
  }

  return results;
}

const catalogCache = new Map();
let semanticsCache;

const setupExpertSchema = z.object(setupSchema);
const rulesSchemaParsed = z.object(rulesSchema);
const creativeSchemaParsed = z.object(creativeSchema);
const architectSchemaParsed = z.object(pageArchitectSchema);
const syntaxSchemaParsed = z.object(syntaxSchema);
const qualitySchemaParsed = z.object(inspectSchema);

async function setupExpertHandler(args) {
  if (skipTool('setupExpert')) {
    return skippedStage('setup_expert', 'SKIP_SETUP_EXPERT', args?.workflowId);
  }

  const parsed = setupExpertSchema.parse(args);
  const workflowId = parsed.workflowId || randomUUID();
  const projectRoot = resolveProjectRoot(parsed.projectRoot);
  const snapshot = projectSummary(projectRoot);
  const checks = [
    {
      check: 'project-manifest',
      passed: snapshot.isExpressiveProject,
      message: snapshot.isExpressiveProject
        ? `Dependency found: ${snapshot.dependency.version} (${snapshot.dependency.dependencyKind})`
        : 'ExpressiveCSS dependency not found in package.json. Use installHint=true for installation guidance.',
    },
    {
      check: 'guide-artifacts',
      passed: snapshot.foundSkills || snapshot.bundledGuides,
      message: snapshot.foundSkills
        ? 'Local component guide set is present.'
        : snapshot.bundledGuides
          ? 'Using the component guides bundled with the MCP package.'
          : 'No local or bundled ExpressiveCSS component guides were found.',
    },
    {
      check: 'docs-catalog',
      passed: snapshot.foundDocs,
      message: snapshot.foundDocs
        ? 'Docs catalogue is present.'
        : 'Project docs catalogue not found at docs/src/data/nav.ts.',
    },
  ];

  const suggestions = [
    'Use `projectRoot` in other tool calls when running outside repository root.',
    'Run Rules Enforcer next once setup checks are satisfied.',
  ];

  if (parsed.installHint && !snapshot.isExpressiveProject) {
    suggestions.push('Install suggestion: npm i @expressivecss/expressive --save');
  }

  if (parsed.themes) {
    checks.push({
      check: 'theme-surface',
      passed: snapshot.isExpressiveProject,
      message: 'Use documented theme extension points and project-level custom properties rather than editing framework internals.',
    });
  }

  if (parsed.colors) {
    checks.push({
      check: 'theme-color-tokens',
      passed: snapshot.isExpressiveProject,
      message: 'Prefer runtime theme configuration and MD3 roles (`--md-sys-*`).',
    });
  }

  const payload = buildStagePayload(
    'setup_expert',
    {
      projectRoot,
      checks,
      packageManager: snapshot.packageManager,
      framework: {
        detectedVersion: snapshot.dependency?.version ?? null,
        contractVersion: loadSemanticsContract().frameworkVersion,
        compatibility: frameworkVersionCompatibility(
          snapshot.dependency?.version,
          loadSemanticsContract().frameworkVersion,
        ),
      },
      recommendations: suggestions,
      installHint: parsed.installHint,
      skipSettings: {
        SKIP_SETUP_EXPERT: process.env.SKIP_SETUP_EXPERT || 'false',
      },
      nextTool: NEXT_TOOL.setup_expert,
    },
    workflowId,
  );

  return toToolResult(payload);
}

async function rulesEnforcerHandler(args) {
  if (skipTool('rulesEnforcer')) {
    return skippedStage('rules_enforcer', 'SKIP_RULES_ENFORCER', args?.workflowId);
  }

  const parsed = rulesSchemaParsed.parse(args);
  const workflowId = parsed.workflowId || randomUUID();
  const projectRoot = resolveProjectRoot(parsed.projectRoot);
  const catalog = await loadGuideCatalog(projectRoot);
  const snapshot = projectSummary(projectRoot);

  const componentMatches = (parsed.targetComponents || []).map((item) => ({
    requested: item,
    guide: findGuideByName(catalog, item),
  }));

  const issues = inspectAuthoringRules(parsed.snippet);
  const componentEnforcements = [];
  for (const match of componentMatches) {
    if (!match.guide) {
      const near = nearestMatches(catalog, match.requested, 3).map((row) => row.slug);
      componentEnforcements.push({
        component: match.requested,
        status: 'unknown',
        suggestions: near,
      });
    } else {
      componentEnforcements.push({
        component: match.guide.slug,
        status: 'known',
        requiredRules: match.guide.rules.slice(0, 6),
      });
    }
  }

  const blocking = issues.filter((item) => item.severity === 'high');
  const status = blocking.length ? 'needs_fix' : issues.length ? 'warn' : 'pass';

  const payload = buildStagePayload(
    'rules_enforcer',
    {
      projectRoot,
      status,
      framework: {
        detectedVersion: snapshot.dependency?.version ?? null,
        contractVersion: catalog.frameworkVersion,
        guideSource: catalog.guideSource,
        compatibility: frameworkVersionCompatibility(snapshot.dependency?.version, catalog.frameworkVersion),
      },
      issueCount: issues.length,
      blockingIssueCount: blocking.length,
      issues,
      componentChecks: componentEnforcements,
      guidance: {
        alwaysPrefer: 'Read component guides before adding structure.',
        compatibility: 'Avoid Materialize-era selectors and prefer source-of-truth component contracts.',
      },
      nextTool: NEXT_TOOL.rules_enforcer,
    },
    workflowId,
  );

  return toToolResult(payload);
}

async function creativeDirectorHandler(args) {
  if (skipTool('creativeDirector')) {
    return skippedStage('creative_director', 'SKIP_CREATIVE_DIRECTOR', args?.workflowId);
  }

  const parsed = creativeSchemaParsed.parse(args);
  const workflowId = parsed.workflowId || randomUUID();
  const projectRoot = resolveProjectRoot(parsed.projectRoot);
  const catalog = await loadGuideCatalog(projectRoot);

  const hintTokens = parsed.constraints ? tokenize(parsed.constraints) : [];
  const suggestions = buildCreativeCandidates(catalog, `${parsed.goal} ${hintTokens.join(' ')}`, parsed.maxSuggestions);

  const payload = buildStagePayload(
    'creative_director',
    {
      goal: parsed.goal,
      constraints: parsed.constraints || null,
      contractVersion: catalog.frameworkVersion,
      count: suggestions.length,
      suggestions,
      fallback: suggestions.length === 0
        ? ['cards', 'lists', 'text-fields', 'buttons', 'navigation-bar']
        : null,
      nextTool: NEXT_TOOL.creative_director,
    },
    workflowId,
  );

  return toToolResult(payload);
}

async function pageArchitectHandler(args, stage = 'page_architect') {
  if (skipTool('pageArchitect')) {
    return skippedStage(stage, 'SKIP_PAGE_ARCHITECT', args?.workflowId);
  }

  const parsed = architectSchemaParsed.parse(args);
  const workflowId = parsed.workflowId || randomUUID();
  const projectRoot = resolveProjectRoot(parsed.projectRoot);
  const catalog = await loadGuideCatalog(projectRoot);

  const architecture = buildPageArchitecture(
    catalog,
    parsed.pageGoal,
    parsed.components,
    parsed.viewportTarget,
    parsed.includeAccessibility,
  );

  const payload = buildStagePayload(
    stage,
    {
      pageGoal: parsed.pageGoal,
      viewportTarget: parsed.viewportTarget,
      accessibilityNotes: parsed.includeAccessibility,
      architecture,
      contractVersion: catalog.frameworkVersion,
      catalogCount: catalog.count,
      nextTool: NEXT_TOOL[stage],
    },
    workflowId,
  );

  return toToolResult(payload);
}

async function componentSyntaxExpertHandler(args) {
  if (skipTool('componentSyntaxExpert')) {
    return skippedStage('component_syntax_expert', 'SKIP_COMPONENT_SYNTAX_EXPERT', args?.workflowId);
  }

  const parsed = syntaxSchemaParsed.parse(args);
  const workflowId = parsed.workflowId || randomUUID();
  const projectRoot = resolveProjectRoot(parsed.projectRoot);
  const catalog = await loadGuideCatalog(projectRoot);

  const requested = parsed.components;
  const found = [];
  const missing = [];

  for (const component of requested) {
    const guide = findGuideByName(catalog, component);
    if (!guide) {
      const skipLimit = Math.min(Math.max(SETTINGS.maxComponentSkips, 1), 20);
      missing.push({
        requested: component,
        nearest: nearestMatches(catalog, component, skipLimit).map((row) => row.slug),
      });
    } else {
      found.push(summarizeGuide(guide));
    }
  }

  const payload = buildStagePayload(
    'component_syntax_expert',
    {
      foundCount: found.length,
      contractVersion: catalog.frameworkVersion,
      guideSource: catalog.guideSource,
      found,
      missing,
      maxCharactersPerComponent: SETTINGS.maxComponentResponseChars,
      nextTool: NEXT_TOOL.component_syntax_expert,
      notes: [
        'Component rules are derived from the generated ExpressiveCSS component guides and should be cross-checked against package docs.',
        'If a component is marked unknown, run Creative Director again with clearer component intent or pass an exact guide slug.',
      ],
    },
    workflowId,
  );

  return toToolResult(payload);
}

async function qualityInspectorHandler(args) {
  if (skipTool('qualityInspector')) {
    return skippedStage('quality_inspector', 'SKIP_QUALITY_INSPECTOR', args?.workflowId);
  }

  const parsed = qualitySchemaParsed.parse(args);
  const workflowId = parsed.workflowId || randomUUID();
  const projectRoot = resolveProjectRoot(parsed.projectRoot);
  const fileSummary = summarizeProjectFiles(parsed.files, projectRoot);

  const staticFindings = findFileViolations(fileSummary.existing);
  const highCount = staticFindings.reduce((count, entry) => count + entry.issues.filter((issue) => issue.severity === 'high').length, 0);

  const commandChecks = [];
  if (parsed.runCommands && (parsed.runType === 'standard' || parsed.runType === 'full')) {
    commandChecks.push(...await runQualityCommands(projectRoot, parsed.runType));
  }

  const commandFailed = commandChecks.some((run) => run.exitCode !== 0);
  const inspectionPerformed = fileSummary.existing.length > 0 || commandChecks.length > 0;
  const requestedButUninspected = parsed.files.length > 0 && fileSummary.existing.length === 0;
  const status = highCount > 0 || commandFailed || requestedButUninspected
    ? 'needs_fix'
    : staticFindings.some((entry) => entry.issues.length > 0) || fileSummary.skipped.length > 0 || !inspectionPerformed
      ? 'warn'
      : 'pass';

  const payload = buildStagePayload(
    'quality_inspector',
    {
      projectRoot,
      runType: parsed.runType,
      filesRequested: parsed.files.length,
      coverage: {
        filesInspected: fileSummary.existing.length,
        commandsRun: commandChecks.length,
        inspectionPerformed,
      },
      filesSkipped: fileSummary.skipped.map((item) => ({
        file: item.requested,
        reason: item.reason,
      })),
      staticFindings,
      commandChecks: commandChecks.length ? commandChecks : [],
      status,
      recommendations: [
        'If status is warn, resolve medium/high-severity issues before shipping.',
        'If runCommands is disabled, pair this call with `runCommands: true` for command verification.',
      ],
      nextTool: NEXT_TOOL.quality_inspector,
    },
    workflowId,
  );

  return toToolResult(payload);
}

async function startServer() {
  const server = new McpServer(
    {
      name: 'ExpressiveCSS MCP',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.registerTool('setup_expert', {
    description: TOOL_DESCRIPTIONS.setup_expert.description,
    inputSchema: setupSchema,
  }, setupExpertHandler);

  server.registerTool('rules_enforcer', {
    description: TOOL_DESCRIPTIONS.rules_enforcer.description,
    inputSchema: rulesSchema,
  }, rulesEnforcerHandler);

  server.registerTool('creative_director', {
    description: TOOL_DESCRIPTIONS.creative_director.description,
    inputSchema: creativeSchema,
  }, creativeDirectorHandler);

  server.registerTool('page_architect', {
    description: TOOL_DESCRIPTIONS.page_architect.description,
    inputSchema: pageArchitectSchema,
  }, (args) => pageArchitectHandler(args, 'page_architect'));

  server.registerTool('page_arcjitect', {
    description: TOOL_DESCRIPTIONS.page_arcjitect.description,
    inputSchema: pageArchitectSchema,
  }, (args) => pageArchitectHandler(args, 'page_arcjitect'));

  server.registerTool('component_syntax_expert', {
    description: TOOL_DESCRIPTIONS.component_syntax_expert.description,
    inputSchema: syntaxSchema,
  }, componentSyntaxExpertHandler);

  server.registerTool('quality_inspector', {
    description: TOOL_DESCRIPTIONS.quality_inspector.description,
    inputSchema: inspectSchema,
  }, qualityInspectorHandler);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ExpressiveCSS MCP server running on stdio transport.');
}

startServer().catch((error) => {
  console.error('ExpressiveCSS MCP server failed to start:', error);
  process.exitCode = 1;
});
