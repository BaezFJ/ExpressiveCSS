#!/usr/bin/env node
import { existsSync, closeSync, constants as fsConstants, fstatSync, lstatSync, openSync, readFileSync, realpathSync } from 'node:fs';
import { lstat, open, readdir, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { JSDOM } from 'jsdom';
import * as z from 'zod/v4';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpError, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { resolveExpressiveVersion } from './scripts/resolve-version.mjs';

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const COMPONENT_DECISIONS = JSON.parse(readFileSync(path.join(SERVER_DIR, 'component-decisions.json'), 'utf8'));
const CAPABILITY_ROADMAP = JSON.parse(readFileSync(path.join(SERVER_DIR, 'capability-roadmap.json'), 'utf8'));
const SERVER_VERSION = JSON.parse(readFileSync(path.join(SERVER_DIR, 'package.json'), 'utf8')).version;
const CAPABILITIES_BY_SLUG = new Map(CAPABILITY_ROADMAP.entries.map((entry) => [entry.slug, entry]));
const COMPONENT_DECISIONS_BY_SLUG = new Map(COMPONENT_DECISIONS.components.map((entry) => [entry.slug, entry]));
const DEFAULT_MAX_COMPONENT_RESPONSE_CHARS = 24_000;
const GUIDANCE_TOOLS = new Set(['setup_expert', 'creative_director', 'page_architect', 'page_arcjitect', 'component_syntax_expert', 'component_catalog']);
const RESPONSE_BUDGET_SETTING = 'EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES';
function configuredResponseBudget(value = '65536') {
  if (!/^\d+$/u.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    throw new Error(`${RESPONSE_BUDGET_SETTING} must be a positive safe integer in decimal bytes.`);
  }
  return Number(value);
}
const DEFAULT_QA_MAX_FILES = 300;
const DEFAULT_QA_MAX_MB = 2;
const DEFAULT_QA_MAX_TOTAL_MB = 16;
const MAX_STATIC_ISSUES = 200;
const MAX_STATIC_ISSUES_PER_REQUEST = 1_000;
const MAX_STATIC_MARKUP_DELIMITERS = 4_000;
// Source locations make parse5 copy a parent's children for each text run, so the cost grows with
// characters times tags. Past this product, semantics findings report 1:1 to stay within the budget.
const MAX_LOCATED_MARKUP_WORK = 100_000_000;
const STATIC_INSPECTION_TIMEOUT_MS = 5_000;
const DEFAULT_COMMAND_TIMEOUT_MS = 120_000;
const MAX_PROJECT_ROOT_CHARS = 4_096;
const MAX_WORKFLOW_ID_CHARS = 256;
const MAX_SNIPPET_CHARS = 500_000;
const MAX_PROMPT_CHARS = 20_000;
const MAX_COMPONENT_NAME_CHARS = 120;
const MAX_FILE_PATH_CHARS = 4_096;
const MAX_CONTRACT_SOURCE_BYTES = 2 * 1024 * 1024;
const MAX_CONTRACT_TOTAL_BYTES = 8 * 1024 * 1024;


function configuredCommandRoots(value) {
  if (!value?.trim()) return [];
  const trimmed = value.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === 'string' && entry.trim()) : [];
    } catch {
      return [];
    }
  }
  return trimmed.split(path.delimiter).map((entry) => entry.trim()).filter(Boolean);
}

const QUALITY_SCRIPTS = ['typecheck', 'test', 'verify:expressivecss'];
// Trusted server configuration can only narrow the built-in list. Invalid input denies all.
function configuredScripts(value) {
  if (value === undefined) return QUALITY_SCRIPTS;
  try {
    const names = JSON.parse(value);
    return Array.isArray(names) && names.every(name => QUALITY_SCRIPTS.includes(name)) ? [...new Set(names)] : [];
  } catch { return []; }
}

const SETTINGS = {
  maxResponseBytes: configuredResponseBudget(process.env[RESPONSE_BUDGET_SETTING]),
  maxComponentResponseChars: Number(process.env.EXPRESSIVECSS_MCP_MAX_COMPONENT_RESPONSE_CHARS || DEFAULT_MAX_COMPONENT_RESPONSE_CHARS),
  maxComponentSkips: Number(process.env.EXPRESSIVECSS_MCP_MAX_COMPONENT_SKIPS || 7),
  qaMaxFiles: Number(process.env.EXPRESSIVECSS_MCP_QA_MAX_FILES || DEFAULT_QA_MAX_FILES),
  qaMaxMb: Number(process.env.EXPRESSIVECSS_MCP_QA_MAX_MB || DEFAULT_QA_MAX_MB),
  qaMaxTotalMb: Number(process.env.EXPRESSIVECSS_MCP_QA_MAX_TOTAL_MB || DEFAULT_QA_MAX_TOTAL_MB),
  commandTimeoutMs: Number(process.env.EXPRESSIVECSS_MCP_COMMAND_TIMEOUT_MS || DEFAULT_COMMAND_TIMEOUT_MS),
  allowedScripts: configuredScripts(process.env.EXPRESSIVECSS_MCP_ALLOWED_SCRIPTS),
  allowedCommandRoots: configuredCommandRoots(process.env.EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS),
};

const SKIP_FLAGS = {
  setupExpert: 'SKIP_SETUP_EXPERT',
  rulesEnforcer: 'SKIP_RULES_ENFORCER',
  creativeDirector: 'SKIP_CREATIVE_DIRECTOR',
  pageArchitect: 'SKIP_PAGE_ARCHITECT',
  componentSyntaxExpert: 'SKIP_COMPONENT_SYNTAX_EXPERT',
  qualityInspector: 'SKIP_QUALITY_INSPECTOR',
};

const LegacyPatternList = [
  {
    id: 'legacy-btn-class',
    severity: 'high',
    description: 'Replace `.btn` with the ExpressiveCSS button contract (`<button>`, `.button`, or component-specific button classes).',
    pattern: /\bclass(?:Name)?\s*=\s*(?:"[^"]*\bbtn\b[^"]*"|'[^']*\bbtn\b[^']*'|`[^`]*\bbtn\b[^`]*`|\{\s*(?:"[^"]*\bbtn\b[^"]*"|'[^']*\bbtn\b[^']*'|`[^`]*\bbtn\b[^`]*`)\s*\}|btn(?=[\s>]))/gu,
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
    description: '`.nav-wrapper` is retired markup structure; use ExpressiveCSS nav components directly.',
    pattern: /\bnav-wrapper\b/g,
  },
  {
    id: 'legacy-brand-logo',
    severity: 'medium',
    description: '`.brand-logo` is retired naming; prefer native layout semantics in ExpressiveCSS pages.',
    pattern: /\bbrand-logo\b/g,
  },
  {
    id: 'legacy-lever',
    severity: 'medium',
    description: '`.lever` is a retired switch token, replace with Expressive switches per component guide.',
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
  {
    id: 'legacy-input-field',
    severity: 'high',
    description: '`.input-field` is retired; use the ExpressiveCSS `.field` contract.',
    pattern: /\binput-field\b/g,
  },
  {
    id: 'legacy-materialize-textarea',
    severity: 'high',
    description: '`.materialize-textarea` is retired; use `.expressive-textarea`.',
    pattern: /\bmaterialize-textarea\b/g,
  },
  {
    id: 'raw-color-in-component-style',
    severity: 'medium',
    description: 'Use a Material semantic color role instead of a raw color in component declarations. Theme seed and token definitions are separate concerns.',
    pattern: /(?<![-\w])(?:color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline-color|fill|stroke)\s*:\s*#[0-9a-fA-F]{3,8}\b/g,
  },
];


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
    description: 'Return complete component rules with detailed syntax by default. Select compact detail to omit prose/examples, includeCapabilities to override component capability detail, sections for documented options/methods, or foundations for typography, shape, or motion. Intentional omissions are disclosed.',
  },
  component_catalog: {
    stage: 'Component Catalogue',
    description: 'List or search bundled components by name, alias or compact description. Search returns bounded, labelled matches; results identify the bundled snapshot and optionally check target-project compatibility.',
  },
  quality_inspector: {
    stage: 'Quality Inspector',
    description: 'Inspect selected files and optionally execute configured project scripts. Scripts may write files or access services; results are scoped evidence, not design approval.',
  },
};

const setupSchema = {
  projectRoot: z.string().max(MAX_PROJECT_ROOT_CHARS).optional(),
  themes: z.boolean().default(false),
  colors: z.boolean().default(false),
  installHint: z.boolean().default(false),
  workflowId: z.string().max(MAX_WORKFLOW_ID_CHARS).optional(),
};

const rulesSchema = {
  projectRoot: z.string().max(MAX_PROJECT_ROOT_CHARS).optional(),
  snippet: z.string().max(MAX_SNIPPET_CHARS),
  targetComponents: z.array(z.string().max(MAX_COMPONENT_NAME_CHARS)).max(12).optional(),
  workflowId: z.string().max(MAX_WORKFLOW_ID_CHARS).optional(),
};

const creativeSchema = {
  projectRoot: z.string().max(MAX_PROJECT_ROOT_CHARS).optional(),
  goal: z.string().min(10).max(MAX_PROMPT_CHARS),
  constraints: z.string().max(MAX_PROMPT_CHARS).optional(),
  maxSuggestions: z.number().int().min(1).max(12).default(7),
  workflowId: z.string().max(MAX_WORKFLOW_ID_CHARS).optional(),
};

const pageArchitectSchema = {
  projectRoot: z.string().max(MAX_PROJECT_ROOT_CHARS).optional(),
  pageGoal: z.string().min(8).max(MAX_PROMPT_CHARS),
  components: z.array(z.string().max(MAX_COMPONENT_NAME_CHARS)).max(12).default([]),
  viewportTarget: z.enum(['compact', 'medium', 'expanded', 'large', 'extra-large', 'responsive']).default('responsive'),
  includeAccessibility: z.boolean().default(true),
  workflowId: z.string().max(MAX_WORKFLOW_ID_CHARS).optional(),
};

const syntaxSchema = {
  projectRoot: z.string().max(MAX_PROJECT_ROOT_CHARS).optional(),
  detail: z.enum(['compact', 'detailed']).default('detailed'),
  includeCapabilities: z.boolean().optional(),
  components: z.array(z.string().max(MAX_COMPONENT_NAME_CHARS)).max(12).default([]),
  foundations: z.array(z.enum(['typography', 'shape', 'motion'])).max(3).default([]),
  sections: z.array(z.enum(['options', 'methods'])).max(2).refine((sections) => new Set(sections).size === sections.length, 'Request each section at most once').default([]),
  workflowId: z.string().max(MAX_WORKFLOW_ID_CHARS).optional(),
};

const catalogSchema = {
  projectRoot: z.string().max(MAX_PROJECT_ROOT_CHARS).optional(),
  workflowId: z.string().max(MAX_WORKFLOW_ID_CHARS).optional(),
  query: z.string().max(256).trim().min(1).optional(),
  limit: z.number().int().min(1).max(50).optional(),
};

const digestSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const inspectionEvidenceSchema = z.object({
  algorithm: z.literal('sha256'),
  files: z.array(z.object({ file: z.string(), sha256: digestSchema, bytes: z.number().int().nonnegative() })),
  expectedMatched: z.boolean().nullable(),
  inputsUnchanged: z.boolean(),
  commandManifestSha256: digestSchema.nullable(),
  scope: z.string(),
});
// Preserve tool-specific fields while validating the shared evidence envelope.
const stageOutputSchema = z.looseObject({
  workflowId: z.string(), stage: z.string(),
  checksPerformed: z.array(z.string()), evidenceSources: z.array(z.string()),
  uncheckedAreas: z.array(z.string()), blockedChecks: z.array(z.string()),
  contractCompatibility: z.string(), contractProvenance: z.string(), coverageStatus: z.string(),
});
const qualityOutputSchema = stageOutputSchema.extend({
  status: z.enum(['pass', 'warn', 'blocked', 'needs_fix']),
  inspectionEvidence: inspectionEvidenceSchema.optional(), // Disabled tools return the shared blocked envelope.
});
const retryRequestSchema = z.discriminatedUnion('name', [
  ['setup_expert', setupSchema], ['creative_director', creativeSchema],
  ['page_architect', pageArchitectSchema], ['page_arcjitect', pageArchitectSchema],
  ['component_syntax_expert', syntaxSchema], ['component_catalog', catalogSchema],
].map(([name, schema]) => z.object({ name: z.literal(name), arguments: z.object(schema).strict() })));
const responseBudgetSchema = z.object({
  maxBytes: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  delivery: z.enum(['complete', 'partial', 'error']),
  omissions: z.array(z.object({
    unit: z.enum(['field', 'component', 'foundation', 'entry', 'suggestion', 'architecture', 'request']),
    index: z.number().int().nonnegative().optional(),
    requested: z.string().optional(), slug: z.string().optional(),
    field: z.enum(['contract', 'syntax', 'capability', 'options', 'methods']).optional(),
    reason: z.literal('byte-budget'),
    recovery: z.number().int().nonnegative(),
  })),
  recoveries: z.array(z.discriminatedUnion('action', [
    z.object({ action: z.literal('retry'), request: retryRequestSchema }),
    z.object({ action: z.literal('increase-budget'), configuration: z.literal(RESPONSE_BUDGET_SETTING) }),
  ])),
});
const guidanceOutputSchema = stageOutputSchema.extend({ responseBudget: responseBudgetSchema });
const syntaxOutputSchema = guidanceOutputSchema.extend({
  // Disabled tools return only the shared blocked envelope.
  detail: z.enum(['compact', 'detailed']).optional(),
  includeCapabilities: z.boolean().optional(),
  found: z.array(z.looseObject({
    requestIndex: z.number().int().nonnegative(),
    omittedFields: z.array(z.object({
      field: z.enum(['contract', 'syntax', 'options', 'methods', 'capability']),
      reason: z.enum(['compact-detail', 'not-requested', 'length-limit', 'byte-budget']),
    })),
  })).optional(),
});
const readAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const inspectSchema = {
  projectRoot: z.string().max(MAX_PROJECT_ROOT_CHARS).optional(),
  files: z.array(z.string().max(MAX_FILE_PATH_CHARS)).max(DEFAULT_QA_MAX_FILES).default([]),
  runType: z.enum(['quick', 'standard', 'full', 'consumer']).default('quick'),
  runCommands: z.boolean().default(false),
  expectedSourceHashes: z.record(z.string().min(1).max(MAX_FILE_PATH_CHARS), digestSchema).refine(value => Object.keys(value).length <= DEFAULT_QA_MAX_FILES, 'Too many source pins').optional(),
  workflowId: z.string().max(MAX_WORKFLOW_ID_CHARS).optional(),
};

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

    if (existsSync(pkgPath) && existsSync(skillPath) && existsSync(navPath)) {
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

function normalizeForMatch(value) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '');
}

function extractSection(text, heading) {
  const marker = `#### ${heading}`;
  const lines = text.split('\n');
  let start = -1;
  let fence = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const delimiter = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/u);
    if (fence) {
      if (delimiter && delimiter[1][0] === fence[0] && delimiter[1].length >= fence.length && !delimiter[2].trim()) fence = null;
      continue;
    }
    if (delimiter) {
      fence = delimiter[1];
      continue;
    }
    if (start === -1) {
      if (line.trim() === marker) start = index + 1;
    } else if (/^ {0,3}#{1,4}(?:\s|$)/u.test(line)) {
      return lines.slice(start, index).join('\n').trim();
    }
  }
  return start === -1 ? '' : lines.slice(start).join('\n').trim();
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

function serializeToolResult(payload) {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(payload, null, GUIDANCE_TOOLS.has(payload.stage) ? undefined : 2),
    }],
    structuredContent: payload,
    ...(payload.responseBudget?.delivery === 'error' ? { isError: true } : {}),
  };
}

function toToolResult(payload, args = {}, guidanceContext) {
  const result = () => serializeToolResult(payload);
  if (!GUIDANCE_TOOLS.has(payload.stage)) return result();
  payload.responseBudget = { maxBytes: SETTINGS.maxResponseBytes, delivery: 'complete', omissions: [], recoveries: [] };
  const fits = () => Buffer.byteLength(JSON.stringify(result()), 'utf8') <= SETTINGS.maxResponseBytes;
  if (fits()) return result();

  const original = structuredClone(payload);
  const context = { workflowId: payload.workflowId, ...(args.projectRoot === undefined ? {} : { projectRoot: args.projectRoot }) };
  const increase = { action: 'increase-budget', configuration: RESPONSE_BUDGET_SETTING };
  const omit = (identity, recovery) => {
    const budget = payload.responseBudget;
    // Share recovery records, especially operator-increase advice, to bound their overhead.
    const key = JSON.stringify(recovery);
    let index = budget.recoveries.findIndex((entry) => JSON.stringify(entry) === key);
    if (index < 0) index = budget.recoveries.push(recovery) - 1;
    budget.omissions.push({ ...identity, reason: 'byte-budget', recovery: index });
    budget.delivery = recovery.action === 'increase-budget' ? 'error' : budget.delivery === 'error' ? 'error' : 'partial';
    payload.status = original.status === 'blocked' || budget.delivery === 'error' ? 'blocked' : 'partial';
    payload.coverageStatus = budget.delivery === 'error' ? 'response-budget-error' : 'partial-response-budget';
  };
  const retry = (arguments_) => ({ action: 'retry', request: retryRequestSchema.parse({ name: payload.stage, arguments: {
    // Catalogue retrieval has no workflow state. Preserve its explicit target without
    // repeating an optional correlation ID for every individually recoverable entry.
    ...(payload.stage === 'component_catalog' ? args.projectRoot === undefined ? {} : { projectRoot: args.projectRoot } : context),
    ...arguments_,
  } }) });
  const recoveryResultFits = (candidate) => {
    candidate.responseBudget = { maxBytes: SETTINGS.maxResponseBytes, delivery: 'complete', omissions: [], recoveries: [] };
    return Buffer.byteLength(JSON.stringify(serializeToolResult(candidate)), 'utf8') <= SETTINGS.maxResponseBytes;
  };

  if (payload.stage === 'component_syntax_expert' && payload.found) {
    const components = payload.found.map((entry, index) => ({ entry, index: entry.requestIndex ?? index }));
    const syntaxRecovery = (entry, field) => {
      const arguments_ = { components: [entry.slug], detail: field === 'contract' || field === 'syntax' ? 'detailed' : 'compact', includeCapabilities: field === 'capability', sections: ['options', 'methods'].includes(field) ? [field] : [] };
      const recovery = retry(arguments_);
      const candidate = buildSyntaxPayload(guidanceContext.catalog, guidanceContext.version, recovery.request.arguments);
      return recoveryResultFits(candidate) ? recovery : increase;
    };
    for (const field of ['capability', 'contract', 'syntax', 'options', 'methods']) {
      for (const { entry, index } of [...components].reverse()) {
        if (!Object.hasOwn(entry, field)) continue;
        const recovery = syntaxRecovery(original.found.find((row) => row.requestIndex === index) ?? entry, field);
        delete entry[field];
        entry.omittedFields = entry.omittedFields.filter((row) => row.field !== field);
        entry.omittedFields.push({ field, reason: 'byte-budget' });
        entry.omittedFields.sort((a, b) => ['contract', 'syntax', 'options', 'methods', 'capability'].indexOf(a.field) - ['contract', 'syntax', 'options', 'methods', 'capability'].indexOf(b.field));
        omit({ unit: 'field', index, requested: args.components?.[index] ?? entry.slug, slug: entry.slug, field }, recovery);
        if (fits()) return result();
      }
    }
    while (payload.found.length) {
      const entry = payload.found.pop();
      const index = entry.requestIndex;
      omit({ unit: 'component', index, requested: args.components?.[index] ?? entry.slug, slug: entry.slug }, syntaxRecovery(original.found.find((row) => row.requestIndex === index), undefined));
      payload.foundCount = payload.found.length;
      if (fits()) return result();
    }
    while (payload.foundations.length) {
      const index = payload.foundations.length - 1;
      const entry = payload.foundations.pop();
      let recovery = retry({ components: [], foundations: [args.foundations[index]], detail: 'compact', includeCapabilities: false });
      const candidate = buildSyntaxPayload(guidanceContext.catalog, guidanceContext.version, recovery.request.arguments);
      if (!recoveryResultFits(candidate)) recovery = increase;
      omit({ unit: 'foundation', index, requested: args.foundations[index], slug: entry.slug }, recovery);
      if (fits()) return result();
    }
  } else if (payload.stage === 'component_catalog' || payload.stage === 'creative_director') {
    const field = payload.stage === 'component_catalog' ? 'entries' : 'suggestions';
    while (payload[field].length) {
      const index = payload[field].length - 1;
      const entry = payload[field].pop();
      const goal = entry.selectionSource === 'native-pattern' ? 'Choose persistent nonblocking inline feedback.' : `Choose ${entry.slug} for this interface.`;
      let recovery = field === 'entries' ? retry({ query: entry.slug, limit: 1 }) : retry({ goal, maxSuggestions: 1 });
      const candidate = (field === 'entries' ? buildCatalogPayload : buildCreativePayload)(guidanceContext.catalog, guidanceContext.version, recovery.request.arguments);
      if (candidate[field][0]?.slug !== entry.slug || !recoveryResultFits(candidate)) recovery = increase;
      omit({ unit: field === 'entries' ? 'entry' : 'suggestion', ...(field === 'entries' ? {} : { index }), slug: entry.slug }, recovery);
      payload.count = payload[field].length;
      if (field === 'suggestions') { payload.omittedCount += 1; payload.truncated = true; }
      if (fits()) return result();
    }
  } else if (payload.architecture) {
    payload.architecture = null;
    omit({ unit: 'architecture' }, increase);
    if (fits()) return result();
  }

  // No guidance is delivered by this error. Preserve actual checks and compatibility evidence.
  const essential = ['workflowId', 'stage', 'checksPerformed', 'evidenceSources', 'uncheckedAreas', 'blockedChecks', 'contractCompatibility', 'contractProvenance', 'contractProvenanceDetails', 'contractVersion', 'sourceHash', 'guideSource', 'capabilityEvidence', 'skipped'];
  payload = Object.fromEntries(essential.filter((key) => Object.hasOwn(original, key)).map((key) => [key, original[key]]));
  payload.status = 'blocked';
  payload.coverageStatus = 'response-budget-error';
  payload.message = 'No requested guidance was delivered. Increase the operator response budget and repeat the request.';
  payload.responseBudget = { maxBytes: SETTINGS.maxResponseBytes, delivery: 'error', omissions: [{ unit: 'request', reason: 'byte-budget', recovery: 0 }], recoveries: [increase] };
  // The final transport check converts this into a protocol error if even evidence cannot fit.
  return result();
}

function buildStagePayload(tool, result, workflowId) {
  return {
    workflowId: workflowId || randomUUID().slice(0, 12),
    stage: tool,
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
      status: 'blocked',
      message: `${TOOL_DESCRIPTIONS[tool].stage} is disabled by ${envKey}.`,
      checksPerformed: [],
      evidenceSources: [],
      uncheckedAreas: ['all requested checks'],
      contractCompatibility: 'unknown',
      contractProvenance: 'unknown',
      coverageStatus: 'skipped',
      blockedChecks: [`${tool} disabled`],
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

async function resolveGuideDirectory(projectRoot) {
  let packageJson = null;
  try {
    const manifest = await readInspectionFile(path.join(projectRoot, 'package.json'), projectRoot, 1 * 1024 * 1024);
    packageJson = JSON.parse(manifest.text);
  } catch {}
  if (packageJson?.name !== '@expressivecss/expressive') {
    return null;
  }
  const candidate = path.join(projectRoot, 'skills', 'expressivecss', 'components');
  return existsSync(candidate) ? candidate : null;
}

function parseGuide(file, content) {
  const slug = file.replace(/\.md$/u, '');
  const title = extractTitle(content);
  const contract = extractSection(content, 'Contract');
  const syntax = extractSection(content, 'Syntax');
  const rules = extractRules(extractSection(content, 'Rules'));
  const options = extractSection(content, 'Options');
  const methods = extractSection(content, 'Methods');
  const syntaxCode = extractFirstCodeBlock(syntax);
  const syntaxLangMatch = syntax.match(/```\s*([a-z0-9+.-]+)/i);
  const syntaxLanguage = syntaxLangMatch ? syntaxLangMatch[1].toLowerCase() : 'html';
  const docsMatch = content.match(/\[Component documentation\]\(([^\)]+)\)/);
  const repoMatch = content.match(/https:\/\/github\.com\/BaezFJ\/ExpressiveCSS\/blob\/master\/docs\/src\/pages\/([^\)\s]+)\.astro/);

  return {
    file,
    slug,
    title,
    contract,
    syntax: {
      language: syntaxLanguage,
      code: syntaxCode,
    },
    rules: rules.length ? rules : [
      'Follow the component contract in the full documentation before adding optional attributes.',
      'Keep runtime-owned state in framework initialization, not in static markup values.',
    ],
    options: options || null,
    methods: methods || null,
    sourceUrl: docsMatch ? docsMatch[1] : null,
    astroSource: repoMatch ? `https://github.com/BaezFJ/ExpressiveCSS/blob/master/docs/src/pages/${repoMatch[1]}.astro` : null,
    text: `${title}\n${contract}\n${rules.join('\n')}`.toLowerCase(),
  };
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

async function readHandleBounded(handle, maxBytes) {
  const chunks = [];
  let totalBytes = 0;
  while (totalBytes <= maxBytes) {
    const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, (maxBytes + 1) - totalBytes));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
    if (bytesRead === 0) break;
    chunks.push(buffer.subarray(0, bytesRead));
    totalBytes += bytesRead;
  }
  return {
    content: totalBytes > maxBytes ? null : Buffer.concat(chunks, totalBytes),
    totalBytes,
  };
}

async function verifyLocalContractProvenance(projectRoot, contract, canonicalSources) {
  if (!contract) {
    return { status: 'missing', expectedHash: null, computedHash: null, missingSources: [] };
  }
  if (
    !Array.isArray(canonicalSources)
    || !Array.isArray(contract.sources)
    || contract.sources.length !== canonicalSources.length
    || contract.sources.some((source, index) => source !== canonicalSources[index])
    || !/^[a-f0-9]{64}$/u.test(contract.sourceHash ?? '')
  ) {
    return { status: 'invalid', expectedHash: contract.sourceHash ?? null, computedHash: null, missingSources: [] };
  }

  const root = await realpath(path.resolve(projectRoot)).catch(() => null);
  if (!root) {
    return { status: 'invalid', expectedHash: contract.sourceHash, computedHash: null, missingSources: [] };
  }

  const missingSources = [];
  const validatedSources = [];
  let aggregateBytes = 0;
  for (const source of contract.sources) {
    const sourcePath = path.resolve(root, source);
    if (!isPathInside(root, sourcePath)) {
      return { status: 'invalid', expectedHash: contract.sourceHash, computedHash: null, missingSources };
    }

    let current = root;
    let sourceStat = null;
    for (const segment of source.split('/')) {
      current = path.join(current, segment);
      sourceStat = await lstat(current).catch(() => null);
      if (!sourceStat) break;
      if (sourceStat.isSymbolicLink()) {
        return { status: 'invalid', expectedHash: contract.sourceHash, computedHash: null, missingSources };
      }
    }
    if (!sourceStat) {
      missingSources.push(source);
      continue;
    }
    const resolvedSourcePath = await realpath(sourcePath).catch(() => null);
    if (!resolvedSourcePath || !isPathInside(root, resolvedSourcePath) || !sourceStat.isFile()) {
      return { status: 'invalid', expectedHash: contract.sourceHash, computedHash: null, missingSources };
    }
    if (sourceStat.size > MAX_CONTRACT_SOURCE_BYTES) {
      return { status: 'invalid', expectedHash: contract.sourceHash, computedHash: null, missingSources };
    }
    aggregateBytes += sourceStat.size;
    if (aggregateBytes > MAX_CONTRACT_TOTAL_BYTES) {
      return { status: 'invalid', expectedHash: contract.sourceHash, computedHash: null, missingSources };
    }
    validatedSources.push({ source, sourcePath: resolvedSourcePath, sourceStat });
  }
  if (missingSources.length) {
    return { status: 'missing', expectedHash: contract.sourceHash, computedHash: null, missingSources };
  }

  const hash = createHash('sha256');
  aggregateBytes = 0;
  for (const { source, sourcePath, sourceStat } of validatedSources) {
    const handle = await open(sourcePath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW).catch(() => null);
    if (!handle) {
      return { status: 'invalid', expectedHash: contract.sourceHash, computedHash: null, missingSources };
    }
    try {
      const openedStat = await handle.stat();
      const currentPathStat = await lstat(sourcePath).catch(() => null);
      const currentResolvedPath = await realpath(sourcePath).catch(() => null);
      const openedResolvedPath = await realpath(`/proc/self/fd/${handle.fd}`).catch(() => currentResolvedPath);
      if (
        !openedStat.isFile()
        || !currentPathStat?.isFile()
        || currentPathStat.isSymbolicLink()
        || !currentResolvedPath
        || !openedResolvedPath
        || !isPathInside(root, currentResolvedPath)
        || currentResolvedPath !== sourcePath
        || openedResolvedPath !== sourcePath
        || !sameFileIdentity(sourceStat, openedStat)
        || !sameFileIdentity(openedStat, currentPathStat)
        || openedStat.size > MAX_CONTRACT_SOURCE_BYTES
      ) {
        return { status: 'invalid', expectedHash: contract.sourceHash, computedHash: null, missingSources };
      }

      const remainingAggregateBytes = Math.max(0, MAX_CONTRACT_TOTAL_BYTES - aggregateBytes);
      const bounded = await readHandleBounded(handle, Math.min(MAX_CONTRACT_SOURCE_BYTES, remainingAggregateBytes));
      aggregateBytes += bounded.totalBytes;
      const finalStat = await handle.stat();
      if (
        !bounded.content
        || aggregateBytes > MAX_CONTRACT_TOTAL_BYTES
        || !sameFileIdentity(openedStat, finalStat)
        || openedStat.size !== finalStat.size
        || openedStat.mtimeMs !== finalStat.mtimeMs
        || openedStat.ctimeMs !== finalStat.ctimeMs
      ) {
        return { status: 'invalid', expectedHash: contract.sourceHash, computedHash: null, missingSources };
      }
      hash.update(`${source}\0${bounded.content.toString('utf8')}\0`);
    } finally {
      await handle.close();
    }
  }
  const computedHash = hash.digest('hex');
  return {
    status: computedHash === contract.sourceHash ? 'verified' : 'stale',
    expectedHash: contract.sourceHash,
    computedHash,
    missingSources,
  };
}

function provenanceBlockReason(provenanceStatus) {
  if (provenanceStatus === 'verified' || provenanceStatus === 'bundled-verified') return null;
  return `local contract provenance is ${provenanceStatus}`;
}

async function loadGuideCatalog(projectRoot) {
  if (!bundledGuideCache) {
    const bundledPath = path.join(SERVER_DIR, 'component-guides.json');
    const bundled = JSON.parse(await readFile(bundledPath, 'utf8'));
    if (bundled.schemaVersion !== 1 || !bundled.frameworkVersion || !Array.isArray(bundled.guides)) {
      throw new Error(`Bundled ExpressiveCSS component guide data is invalid at ${bundledPath}`);
    }
    const bundledContractRead = await readInspectionFile(
      path.join(SERVER_DIR, 'contract.json'),
      SERVER_DIR,
      MAX_CONTRACT_SOURCE_BYTES,
    );
    const bundledContract = JSON.parse(bundledContractRead.text);
    const components = new Map();
    for (const entry of bundled.guides) {
      const guide = parseGuide(entry.file, entry.content);
      components.set(guide.slug, guide);
    }
    bundledGuideCache = {
      frameworkVersion: bundledContract?.frameworkVersion ?? bundled.frameworkVersion ?? null,
      sourceHash: bundledContract?.sourceHash ?? bundled.sourceHash ?? null,
      contractSources: bundledContract?.sources ?? [],
      count: components.size,
      components,
    };
  }

  let provenance;

  const guideDir = projectRoot === undefined ? null : await resolveGuideDirectory(projectRoot);
  const dirStat = guideDir ? await stat(guideDir).catch(() => null) : null;
  const projectResolution = projectRoot === undefined ? null : await resolveExpressiveVersion({
    projectRoot,
    contractVersion: bundledGuideCache.frameworkVersion,
  });
  const isFrameworkSource = projectResolution?.resolutionSource === 'framework-source';
  if (dirStat?.isDirectory()) {
    const localContractPath = path.join(projectRoot, 'skills', 'expressivecss', 'references', 'contract.json');
    const localContractRead = await readInspectionFile(
      localContractPath,
      projectRoot,
      MAX_CONTRACT_SOURCE_BYTES,
    ).catch(() => null);
    let localContract = null;
    try {
      localContract = localContractRead ? JSON.parse(localContractRead.text) : null;
    } catch {
      localContract = null;
    }
    provenance = await verifyLocalContractProvenance(
      projectRoot,
      localContract,
      bundledGuideCache.contractSources,
    );
    const packageCompatible = localContract?.frameworkVersion === bundledGuideCache.frameworkVersion
      && localContract?.sourceHash === bundledGuideCache.sourceHash;
    provenance = {
      ...provenance,
      packageExpectedVersion: bundledGuideCache.frameworkVersion,
      packageExpectedHash: bundledGuideCache.sourceHash,
      ...(provenance.status === 'verified' && !packageCompatible ? { status: 'divergent' } : {}),
    };
  } else if (isFrameworkSource) {
    provenance = {
      status: 'missing',
      expectedHash: bundledGuideCache.sourceHash,
      computedHash: null,
      missingSources: ['skills/expressivecss/components'],
      packageExpectedVersion: bundledGuideCache.frameworkVersion,
      packageExpectedHash: bundledGuideCache.sourceHash,
    };
  } else {
    provenance = {
      status: 'bundled-verified',
      expectedHash: bundledGuideCache.sourceHash,
      computedHash: bundledGuideCache.sourceHash,
      missingSources: [],
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    projectRoot: projectRoot === undefined ? null : path.resolve(projectRoot),
    frameworkVersion: bundledGuideCache.frameworkVersion,
    sourceHash: bundledGuideCache.sourceHash,
    provenance,
    guideSource: 'bundled',
    count: bundledGuideCache.count,
    components: bundledGuideCache.components,
  };
}

function findGuideByName(catalog, rawName, allowFuzzy = true) {
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
    if (titleSlug === canonical || fileSlug === canonical) {
      return guide;
    }
  }

  if (!allowFuzzy) {
    return null;
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

async function projectSummary(projectRoot) {
  const summary = {
    projectRoot,
    isExpressiveProject: false,
    dependency: null,
    packageManager: null,
    installGuide: null,
    foundDocs: false,
    foundSkills: false,
    bundledGuides: existsSync(path.join(SERVER_DIR, 'component-guides.json')),
  };

  const packagePath = path.join(projectRoot, 'package.json');
  const lockFiles = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'].map((f) => path.join(projectRoot, f));

  if (lockFiles.some((p) => existsSync(p))) {
    summary.packageManager = lockFiles.find((p) => existsSync(p)).endsWith('package-lock.json')
      ? 'npm'
      : lockFiles.find((p) => existsSync(p)).endsWith('yarn.lock')
        ? 'yarn'
        : 'pnpm';
  }

  let packageJson = null;
  try {
    const manifest = await readInspectionFile(packagePath, projectRoot, 1 * 1024 * 1024);
    packageJson = JSON.parse(manifest.text);
  } catch {}
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

  summary.foundDocs = existsSync(path.join(projectRoot, 'docs', 'src', 'data', 'nav.ts'));
  summary.foundSkills = existsSync(path.join(projectRoot, 'skills', 'expressivecss', 'SKILL.md'));

  summary.installGuide = summary.isExpressiveProject
    ? 'ExpressiveCSS is already in package.json.'
    : 'Add @expressivecss/expressive and include dist/js/expressive.{mjs,cjs} or npm package import. See install docs.';

  return summary;
}

async function resolveAgainstContract(projectRoot, contractVersion) {
  const version = await resolveExpressiveVersion({ projectRoot, contractVersion });
  if (contractVersion) return version;
  return {
    ...version,
    status: 'unresolved',
    contractStatus: 'unresolved',
    documentationMode: 'unavailable',
    bundledContractSafe: false,
    currentDocsSafe: false,
    documentationSources: {
      ...version.documentationSources,
      bundled: { ...version.documentationSources.bundled, available: false },
    },
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

function markInspectionTruncated(issues, reason) {
  Object.defineProperty(issues, 'truncatedReason', { value: reason, enumerable: false });
  return issues;
}

function inspectionStopReason(issues, maxIssues, deadline) {
  if (issues.length >= maxIssues) return 'issue limit reached';
  if (Date.now() >= deadline) return 'time limit reached';
  return null;
}

function markupStructureExceedsLimit(snippet) {
  let delimiters = 0;
  for (let index = 0; index < snippet.length; index += 1) {
    if (snippet.charCodeAt(index) === 60 && ++delimiters > MAX_STATIC_MARKUP_DELIMITERS) return true;
  }
  return false;
}

function inspectSemanticRules(snippet, maxIssues = MAX_STATIC_ISSUES, deadline = Infinity) {
  const { semantics, frameworkVersion } = loadSemanticsContract();
  if (maxIssues <= 0) return markInspectionTruncated([], 'issue limit reached');
  if (markupStructureExceedsLimit(snippet)) return markInspectionTruncated([], 'markup structure limit reached');
  const prefix = '<!doctype html><body>';
  const includeNodeLocations = snippet.length * (snippet.split('<').length - 1) <= MAX_LOCATED_MARKUP_WORK;
  const dom = new JSDOM(`${prefix}${snippet}</body>`, { includeNodeLocations });
  const { document } = dom.window;
  // Elements the parser creates without a start tag have no source offset, so they report the start.
  const locate = (element) => {
    const offset = includeNodeLocations ? dom.nodeLocation(element)?.startOffset ?? -1 : -1;
    return offset >= prefix.length ? lineForMatch(snippet, offset - prefix.length) : { line: 1, column: 1 };
  };
  const issues = [];

  for (const rule of enforcedSemanticRules(semantics)) {
    const beforeRule = inspectionStopReason(issues, maxIssues, deadline);
    if (beforeRule) return markInspectionTruncated(issues, beforeRule);
    const hits = document.querySelectorAll(expandedSemanticSelector(rule, semantics.compositeRoles));
    if (rule.kind === 'forbid' || rule.kind === 'forbid-composite-roles') {
      for (const element of hits) {
        const stop = inspectionStopReason(issues, maxIssues, deadline);
        if (stop) return markInspectionTruncated(issues, stop);
        issues.push(semanticIssue(rule, element, frameworkVersion, locate(element)));
      }
    } else if (rule.kind === 'require-attr') {
      for (const element of hits) {
        const stop = inspectionStopReason(issues, maxIssues, deadline);
        if (stop) return markInspectionTruncated(issues, stop);
        const value = element.getAttribute(rule.attr);
        const valid = rule.equals ? value === rule.equals : value !== null && value !== '';
        if (!valid) {
          issues.push(semanticIssue(rule, element, frameworkVersion, locate(element)));
        }
      }
    } else if (rule.kind === 'require-accessible-name') {
      for (const element of hits) {
        const stop = inspectionStopReason(issues, maxIssues, deadline);
        if (stop) return markInspectionTruncated(issues, stop);
        if (!accessibleName(element, document)) {
          issues.push(semanticIssue(rule, element, frameworkVersion, locate(element)));
        }
      }
    }
  }

  const seenLandmarkNames = new Set();
  for (const nav of document.querySelectorAll('nav')) {
    const stop = inspectionStopReason(issues, maxIssues, deadline);
    if (stop) return markInspectionTruncated(issues, stop);
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
        location: locate(nav),
        snippet: nav.outerHTML.slice(0, 140),
      });
    }
    seenLandmarkNames.add(name);
  }

  return issues;
}

function semanticIssue(rule, element, frameworkVersion, location) {
  return {
    id: rule.id,
    severity: 'high',
    component: rule.component,
    frameworkVersion,
    rule: rule.message,
    location,
    snippet: element.outerHTML.slice(0, 140),
  };
}

function lineForMatch(text, index) {
  const prefix = text.slice(0, index);
  const line = prefix.split('\n').length;
  const col = prefix.length - prefix.lastIndexOf('\n');
  return { line, column: col };
}

export function inspectAuthoringRules(
  snippet,
  maxIssues = MAX_STATIC_ISSUES,
  deadline = Date.now() + STATIC_INSPECTION_TIMEOUT_MS,
) {
  const issues = [];

  for (const rule of LegacyPatternList) {
    const beforeRule = inspectionStopReason(issues, maxIssues, deadline);
    if (beforeRule) return markInspectionTruncated(issues, beforeRule);
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : `${rule.pattern.flags}g`);
    let match;
    while ((match = regex.exec(snippet)) !== null) {
      const stop = inspectionStopReason(issues, maxIssues, deadline);
      if (stop) return markInspectionTruncated(issues, stop);
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

  const autoInit = /(?:Expressive\.)?AutoInit\s*\(/u.test(snippet);
  const manualInitPattern = /(?<![A-Za-z0-9_$])(?:(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*)?(?:Expressive\.)?[A-Z][A-Za-z0-9]*\.init\s*\(/gu;
  let manualInit;
  while ((manualInit = manualInitPattern.exec(snippet)) !== null) {
    const stop = inspectionStopReason(issues, maxIssues, deadline);
    if (stop) return markInspectionTruncated(issues, stop);
    if (autoInit) {
      const loc = lineForMatch(snippet, manualInit.index);
      issues.push({
        id: 'possible-duplicate-initialization',
        severity: 'medium',
        rule: 'Auto Init and manual component initialization appear together. Prove that manual targets use no-autoinit.',
        location: { line: loc.line, column: loc.column },
        snippet: manualInit[0],
      });
    }
    const initializedBinding = manualInit[1] ?? null;
    const escapedBinding = initializedBinding?.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&') ?? null;
    const hasMatchingTeardown = escapedBinding
      ? new RegExp(`(?:^|[^A-Za-z0-9_$])${escapedBinding}\\.destroy\\s*\\(`, 'u').test(snippet)
      : false;
    if (!hasMatchingTeardown) {
      const loc = lineForMatch(snippet, manualInit.index);
      issues.push({
        id: 'manual-init-without-teardown',
        severity: 'medium',
        rule: 'Manual initialization needs an owned teardown path. Provide destroy() evidence or document why the owner is process-lifetime.',
        location: { line: loc.line, column: loc.column },
        snippet: manualInit[0],
      });
    }
  }

  const semanticIssues = inspectSemanticRules(snippet, maxIssues - issues.length, deadline);
  issues.push(...semanticIssues);
  if (semanticIssues.truncatedReason) return markInspectionTruncated(issues, semanticIssues.truncatedReason);

  return issues;
}

function buildCreativeCandidates(catalog, goal, maxSuggestions, componentsHint = []) {
  const ignoredTokens = new Set(['and', 'for', 'from', 'into', 'the', 'this', 'use', 'user', 'with']);
  const tokens = new Set(tokenize(goal).filter((token) => !ignoredTokens.has(token)));
  const normalizedGoal = normalizeForMatch(goal);
  const hinted = new Set(componentsHint.map(normalizeForMatch));
  const primary = [];
  const rejected = new Set();
  const searchableText = (values) => values
    .flatMap((value) => {
      if (typeof value === 'string') return [value];
      if (value && typeof value === 'object') return Object.values(value).filter((item) => typeof item === 'string');
      return [];
    })
    .join(' ')
    .toLowerCase();

  for (const guide of catalog.components.values()) {
    const decision = COMPONENT_DECISIONS_BY_SLUG.get(guide.slug);
    if (!decision) continue;

    const aliases = Array.isArray(decision.aliases) ? decision.aliases : [];
    const adaptive = decision.adaptive ?? [];
    const positiveText = searchableText([
      ...(decision.jobs ?? []),
      ...(decision.useWhen ?? []),
      ...aliases,
      ...(decision.alternatives ?? []),
      ...(Array.isArray(adaptive) ? adaptive : [adaptive]),
    ]);
    const avoidText = searchableText(decision.avoidWhen ?? []);
    const positiveMatches = [...tokens].filter((token) => positiveText.includes(token));
    const avoidMatches = [...tokens].filter((token) => avoidText.includes(token));
    const aliasMatch = aliases.some((alias) => normalizedGoal.includes(normalizeForMatch(alias)));
    const nameMatch = normalizedGoal.includes(normalizeForMatch(decision.slug))
      || normalizedGoal.includes(normalizeForMatch(decision.title));
    const hintMatch = hinted.has(guide.slug) || aliases.some((alias) => hinted.has(normalizeForMatch(alias)));
    const score = (positiveMatches.length * 2) + (aliasMatch ? 30 : 0) + (nameMatch ? 12 + tokenize(decision.slug).length : 0) + (hintMatch ? 12 : 0);
    const avoidScore = avoidMatches.length * 8;

    if (score <= avoidScore || score === 0) {
      if (avoidMatches.length) rejected.add(guide.slug);
      continue;
    }

    primary.push({
      slug: guide.slug,
      title: guide.title,
      score: score - avoidScore,
      why: positiveMatches.length
        ? `Decision metadata matches: ${positiveMatches.slice(0, 4).join(', ')}`
        : 'Explicit component name or alias match',
      docs: guide.sourceUrl,
      selectionSource: 'decision-catalog',
      confidence: 'primary',
      aliases,
      useWhen: decision.useWhen ?? [],
      avoidWhen: decision.avoidWhen ?? [],
      alternatives: decision.alternatives ?? [],
      adaptive,
      runtime: decision.runtime ?? null,
      guideSource: decision.guideSource ?? null,
      materialGuidance: decision.materialGuidance ?? null,
    });
  }

  primary.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));
  const selectedSlugs = new Set(primary.map((item) => item.slug));
  const fallback = [];
  for (const guide of catalog.components.values()) {
    const decision = COMPONENT_DECISIONS_BY_SLUG.get(guide.slug);
    if (selectedSlugs.has(guide.slug) || rejected.has(guide.slug)) continue;
    const matches = [...tokens].filter((token) => guide.text.includes(token));
    if (!matches.length) continue;
    fallback.push({
      slug: guide.slug,
      title: guide.title,
      score: matches.length,
      why: `Generated guide fallback matches: ${matches.slice(0, 4).join(', ')}`,
      docs: guide.sourceUrl,
      selectionSource: 'fuzzy-fallback',
      confidence: 'fallback',
      aliases: decision?.aliases ?? [],
      useWhen: decision?.useWhen ?? [],
      avoidWhen: decision?.avoidWhen ?? [],
      alternatives: decision?.alternatives ?? [],
      adaptive: decision?.adaptive ?? [],
      runtime: decision?.runtime ?? null,
      guideSource: decision?.guideSource ?? null,
      materialGuidance: decision?.materialGuidance ?? null,
    });
  }
  fallback.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));

  const nativePatterns = [];
  if (/\binline (?:feedback|messages?)\b/i.test(goal)
    || (/\bnon[- ]?blocking\b/i.test(goal) && /\b(?:persistent|offline|until|remain|stays?)\b/i.test(goal))) {
    nativePatterns.push({
      slug: 'inline',
      title: 'Native inline feedback',
      why: 'Keep persistent nonblocking feedback and its actions in the document flow.',
      selectionSource: 'native-pattern',
      confidence: 'primary',
      runtime: 'native',
      useWhen: ['An issue persists while the user can continue working.'],
      avoidWhen: ['Temporary confirmations need snackbar; blocking decisions need dialog.'],
      alternatives: ['snackbar', 'dialogs'],
      guidance: [
        'Use native text and named buttons near the affected content. No banner classes or framework initialization are needed.',
        'Static messages need no live region. For dynamic announcements, update an existing status node and keep action buttons outside it.',
        'The application owns actions, dismissal and logical focus recovery. Allow text and controls to wrap.',
      ],
    });
  }
  const allCandidates = [...nativePatterns, ...primary, ...fallback];
  const suggestions = allCandidates.slice(0, maxSuggestions);
  return {
    suggestions,
    truncated: allCandidates.length > suggestions.length,
    omittedCount: Math.max(0, allCandidates.length - suggestions.length),
  };
}

function buildPageArchitecture(catalog, pageGoal, components = [], viewportTarget = 'responsive', includeAccessibility = true) {
  const selected = [];
  const unresolvedComponents = [];

  for (const component of components) {
    const guide = findGuideByName(catalog, component, false);
    if (guide) {
      selected.push(guide.slug);
      continue;
    }
    unresolvedComponents.push({
      requested: component,
      nearest: nearestMatches(catalog, component, 3).map((match) => match.slug),
    });
  }

  const uniqueSelected = Array.from(new Set(selected));
  const hasAppBar = uniqueSelected.includes('app-bar');
  const primaryNavigation = uniqueSelected.find((slug) => ['navigation-bar', 'navigation-rail'].includes(slug));
  const hasTabs = uniqueSelected.includes('tabs');
  const hasBreadcrumbs = uniqueSelected.includes('breadcrumbs');
  const hasFooter = uniqueSelected.includes('footer');
  const hasFeedback = selected.some((slug) => ['snackbar', 'tooltips'].includes(slug));
  const structuralComponents = new Set([
    'app-bar',
    'navigation-bar',
    'navigation-rail',
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
    unresolvedComponents,
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

function summarizeGuide(guide, { sections, detail, includeCapabilities }) {
  return {
    file: guide.file,
    slug: guide.slug,
    title: guide.title,
    source: guide.sourceUrl,
    docs: guide.astroSource,
    ...(detail === 'detailed' ? {
      contract: clampText(guide.contract, 900),
      syntax: {
        language: guide.syntax.language,
        example: guide.syntax.code,
      },
    } : {}),
    rules: guide.rules,
    ...(sections.includes('options') ? { options: { status: guide.options ? 'documented' : 'absent', markdown: guide.options } } : {}),
    ...(sections.includes('methods') ? { methods: { status: guide.methods ? 'documented' : 'absent', markdown: guide.methods } } : {}),
    omittedFields: [
      ...(detail === 'compact' ? [{ field: 'contract', reason: 'compact-detail' }, { field: 'syntax', reason: 'compact-detail' }] : []),
      ...['options', 'methods'].filter((field) => !sections.includes(field)).map((field) => ({ field, reason: 'not-requested' })),
      ...(!includeCapabilities ? [{ field: 'capability', reason: 'not-requested' }] : []),
      ...(detail === 'detailed' && guide.contract.length > 900 ? [{ field: 'contract', reason: 'length-limit' }] : []),
    ].sort((a, b) => ['contract', 'syntax', 'options', 'methods', 'capability'].indexOf(a.field) - ['contract', 'syntax', 'options', 'methods', 'capability'].indexOf(b.field)),
  };
}

function summarizeProjectFiles(files, projectRoot) {
  const resolvedRoot = realpathSync(path.resolve(projectRoot));
  const absoluteFiles = files.map((filePath) => {
    const requestedPath = path.isAbsolute(filePath)
      ? path.resolve(filePath)
      : path.resolve(resolvedRoot, filePath);
    const exists = existsSync(requestedPath);
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

function commandExecutionPolicy(projectRoot) {
  const resolvedProjectRoot = realpathSync(path.resolve(projectRoot));
  const allowedRoots = SETTINGS.allowedCommandRoots.flatMap((configuredRoot) => {
    try {
      return [realpathSync(path.resolve(configuredRoot))];
    } catch {
      return [];
    }
  });
  const matchedRoot = allowedRoots.find((allowedRoot) => isPathInside(allowedRoot, resolvedProjectRoot)) ?? null;
  return {
    configured: SETTINGS.allowedCommandRoots.length > 0,
    allowed: Boolean(matchedRoot),
    matchedRoot,
    projectRoot: resolvedProjectRoot,
  };
}

function commandEnvironment(projectRoot) {
  const allowedNames = [
    'PATH',
    'SystemRoot',
    'ComSpec',
    'PATHEXT',
    'TMPDIR',
    'TMP',
    'TEMP',
    'LANG',
    'LC_ALL',
  ];
  const env = {
    CI: '1',
    NO_COLOR: '1',
    HOME: path.resolve(projectRoot),
    USERPROFILE: path.resolve(projectRoot),
  };
  for (const name of allowedNames) {
    if (typeof process.env[name] === 'string') env[name] = process.env[name];
  }
  return env;
}

function stopProcessTree(proc, signal) {
  if (!proc.pid) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/pid', String(proc.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    killer.unref();
    return;
  }
  try {
    process.kill(-proc.pid, signal);
  } catch {
    proc.kill(signal);
  }
}

function redactSensitiveText(value) {
  return String(value)
    .replace(/(Authorization\s*:\s*Bearer\s+)[^\s,;]+/giu, '$1[REDACTED]')
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+\/-]{16,}/giu, '$1[REDACTED]')
    .replace(/((?:Set-)?Cookie\s*:\s*)[^\r\n]+/giu, '$1[REDACTED]')
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/gu, '[REDACTED]')
    .replace(/\bglpat-[A-Za-z0-9_-]{20,}\b/gu, '[REDACTED]')
    .replace(/\bnpm_[A-Za-z0-9]{20,}\b/gu, '[REDACTED]')
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/gu, '[REDACTED]')
    .replace(/\bsk-[A-Za-z0-9_-]{20,}\b/gu, '[REDACTED]')
    .replace(/\bAKIA[0-9A-Z]{16}\b/gu, '[REDACTED]')
    .replace(/\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/gu, '[REDACTED]')
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gu, '[REDACTED]')
    .replace(/(["'])(API[_-]?KEY|TOKEN|PASSWORD|PASSWD|SECRET|CLIENT[_-]?SECRET|CLIENTSECRET|CONNECTION[_-]?STRING|ACCESS_TOKEN|REFRESH_TOKEN|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)\1\s*:\s*(["'])[^"'\r\n]*\3/giu, '$1$2$1:$3[REDACTED]$3')
    .replace(/\b(API[_-]?KEY|TOKEN|PASSWORD|PASSWD|SECRET|CLIENT[_-]?SECRET|CLIENTSECRET|CONNECTION[_-]?STRING|ACCESS_TOKEN|REFRESH_TOKEN|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)\s*[:=]\s*[^\s,;]+/giu, '$1=[REDACTED]')
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/giu, '$1[REDACTED]@')
    .replace(/\/(?:home|Users)\/[^/\s"'<>]+(?:\/[^\s"'<>),;\]}]*)?/gu, '[LOCAL_PATH]')
    .replace(/\/(?:private\/)?tmp\/[^\s"'<>),;\]}]+/gu, '[LOCAL_PATH]')
    .replace(/[A-Z]:\\+Users\\+[^\\\s]+(?:\\+[^\s]*)?/giu, '[LOCAL_PATH]');
}

export async function readInspectionFile(filePath, projectRoot, byteLimit) {
  const resolvedRoot = await realpath(projectRoot);
  const noFollow = Number.isInteger(fsConstants.O_NOFOLLOW) ? fsConstants.O_NOFOLLOW : 0;
  const handle = await open(filePath, fsConstants.O_RDONLY | noFollow);
  try {
    const before = await handle.stat({ bigint: true });
    const pathBefore = await lstat(filePath, { bigint: true });
    if (pathBefore.isSymbolicLink()) throw new Error('path is a symbolic link');
    if (!before.isFile() || !pathBefore.isFile()) throw new Error('path is not a regular file');
    if (before.dev !== pathBefore.dev || before.ino !== pathBefore.ino) throw new Error('file identity changed before reading');
    const openedPath = await realpath(`/proc/self/fd/${handle.fd}`).catch(() => realpath(filePath));
    if (!isPathInside(resolvedRoot, openedPath)) throw new Error('opened file is outside projectRoot');
    if (before.size > BigInt(byteLimit)) {
      const error = new Error(`file exceeds ${byteLimit} byte read limit`);
      error.code = 'INSPECTION_FILE_TOO_LARGE';
      throw error;
    }

    const bytes = Buffer.allocUnsafe(byteLimit + 1);
    let total = 0;
    while (total <= byteLimit) {
      const chunk = await handle.read(bytes, total, byteLimit + 1 - total, total);
      if (chunk.bytesRead === 0) break;
      total += chunk.bytesRead;
    }
    if (total > byteLimit) {
      const error = new Error(`file exceeds ${byteLimit} byte read limit`);
      error.code = 'INSPECTION_FILE_TOO_LARGE';
      throw error;
    }

    const after = await handle.stat({ bigint: true });
    const pathAfter = await lstat(filePath, { bigint: true });
    if (pathAfter.isSymbolicLink() || !pathAfter.isFile()
      || before.dev !== after.dev || before.ino !== after.ino
      || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs
      || after.dev !== pathAfter.dev || after.ino !== pathAfter.ino) {
      throw new Error('file changed while reading');
    }
    return { text: bytes.subarray(0, total).toString('utf8'), bytes: total, sha256: createHash('sha256').update(bytes.subarray(0, total)).digest('hex') };
  } finally {
    await handle.close();
  }
}

async function findFileViolations(fileInfoList, projectRoot) {
  const findings = [];
  const sourcePins = [];
  const inspected = [];
  const uninspected = [];
  const perFileMb = Number.isFinite(SETTINGS.qaMaxMb) && SETTINGS.qaMaxMb > 0
    ? SETTINGS.qaMaxMb
    : DEFAULT_QA_MAX_MB;
  const totalMb = Number.isFinite(SETTINGS.qaMaxTotalMb) && SETTINGS.qaMaxTotalMb > 0
    ? SETTINGS.qaMaxTotalMb
    : DEFAULT_QA_MAX_TOTAL_MB;
  const maxBytes = Math.max(1, Math.floor(perFileMb * 1024 * 1024));
  const maxTotalBytes = Math.max(1, Math.floor(totalMb * 1024 * 1024));
  const deadline = Date.now() + STATIC_INSPECTION_TIMEOUT_MS;
  let totalBytes = 0;
  let totalIssues = 0;

  for (let index = 0; index < fileInfoList.length; index += 1) {
    const file = fileInfoList[index];
    if (Date.now() >= deadline || totalIssues >= MAX_STATIC_ISSUES_PER_REQUEST || totalBytes >= maxTotalBytes) {
      const reason = Date.now() >= deadline
        ? 'static inspection time limit reached'
        : totalIssues >= MAX_STATIC_ISSUES_PER_REQUEST
          ? 'static inspection issue limit reached'
          : 'aggregate byte limit reached';
      uninspected.push(...fileInfoList.slice(index).map((entry) => ({ file: entry.requested, reason })));
      break;
    }
    try {
      const remainingBytes = Math.floor(Math.min(maxBytes, maxTotalBytes - totalBytes));
      const read = await readInspectionFile(file.absolute, projectRoot, remainingBytes);
      totalBytes += read.bytes;
      sourcePins.push({ file: file.requested, sha256: read.sha256, bytes: read.bytes });
      const issues = inspectAuthoringRules(
        read.text,
        Math.min(MAX_STATIC_ISSUES, MAX_STATIC_ISSUES_PER_REQUEST - totalIssues),
        deadline,
      );
      totalIssues += issues.length;
      if (issues.length > 0) {
        findings.push({
          file: file.requested,
          issues,
        });
      }
      if (issues.truncatedReason) {
        uninspected.push({ file: file.requested, reason: `static inspection ${issues.truncatedReason}` });
      } else {
        inspected.push(file.requested);
      }
    } catch (error) {
      const aggregateLimit = error.code === 'INSPECTION_FILE_TOO_LARGE' && maxTotalBytes - totalBytes < maxBytes;
      uninspected.push({
        file: file.requested,
        reason: aggregateLimit
          ? 'aggregate byte limit reached'
          : `file read failed: ${error.message}`,
      });
      if (aggregateLimit) {
        uninspected.push(...fileInfoList.slice(index + 1).map((entry) => ({
          file: entry.requested,
          reason: 'aggregate byte limit reached',
        })));
        break;
      }
    }
  }

  return { findings, inspected, uninspected, sourcePins };
}

async function runCommandInProject(projectRoot, manager, script, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
  const args = ['run', script];
  const command = `${manager} ${args.join(' ')}`;
  const configuredTimeout = Number.isFinite(SETTINGS.commandTimeoutMs) && SETTINGS.commandTimeoutMs > 0
    ? SETTINGS.commandTimeoutMs
    : DEFAULT_COMMAND_TIMEOUT_MS;
  const effectiveTimeout = Math.min(timeoutMs, configuredTimeout);
  let directoryFd;
  let pinnedCwd;
  try {
    const directoryFlags = fsConstants.O_RDONLY
      | (fsConstants.O_DIRECTORY ?? 0)
      | (fsConstants.O_NOFOLLOW ?? 0);
    directoryFd = openSync(projectRoot, directoryFlags);
    const descriptorStat = fstatSync(directoryFd, { bigint: true });
    const pathStat = lstatSync(projectRoot, { bigint: true });
    const canonicalRoot = realpathSync(projectRoot);
    if (!descriptorStat.isDirectory() || !pathStat.isDirectory() || pathStat.isSymbolicLink()
      || !sameFileIdentity(descriptorStat, pathStat) || canonicalRoot !== projectRoot) {
      throw new Error('authorized project root changed before command execution');
    }
    pinnedCwd = process.platform === 'linux' ? `/proc/self/fd/${directoryFd}` : canonicalRoot;
  } catch (error) {
    if (directoryFd !== undefined) closeSync(directoryFd);
    return {
      manager,
      command,
      exitStatus: null,
      exitCode: null,
      completed: false,
      timedOut: false,
      spawnError: true,
      output: redactSensitiveText(`Failed to pin command root: ${error.message}`),
    };
  }
  return new Promise((resolve) => {
    const proc = spawn(manager, args, {
      cwd: pinnedCwd,
      shell: false,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: commandEnvironment(projectRoot),
    });
    closeSync(directoryFd);

    let stdout = '';
    let stderr = '';
    let forceKillTimer;
    let timedOut = false;
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!timedOut) clearTimeout(forceKillTimer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      timedOut = true;
      stopProcessTree(proc, 'SIGTERM');
      proc.stdout.destroy();
      proc.stderr.destroy();
      forceKillTimer = setTimeout(() => stopProcessTree(proc, 'SIGKILL'), 50);
      forceKillTimer.unref();
      const output = redactSensitiveText(`${stdout}\n${stderr}`);
      finish({
        manager,
        command,
        exitStatus: null,
        exitCode: null,
        completed: false,
        timedOut: true,
        spawnError: false,
        output: clampText(output, 20_000),
      });
    }, effectiveTimeout);

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
      stopProcessTree(proc, 'SIGKILL'); // Stop descendants before checking the resulting source state.
      const output = redactSensitiveText(`${stdout}\n${stderr}`);
      finish({
        manager,
        command,
        exitStatus: typeof code === 'number' ? code : null,
        exitCode: typeof code === 'number' ? code : 1,
        completed: !timedOut,
        timedOut,
        spawnError: false,
        output: clampText(output, 20_000),
      });
    });

    proc.on('error', (error) => {
      finish({
        manager,
        command,
        exitStatus: null,
        exitCode: null,
        completed: false,
        timedOut: false,
        spawnError: true,
        output: redactSensitiveText(`Failed to run command: ${error.message}`),
      });
    });
  });
}

function qualityCommands(runType) {
  return runType === 'full' ? ['typecheck', 'test'] : runType === 'standard' ? ['typecheck'] : runType === 'consumer' ? ['verify:expressivecss'] : [];
}

// Endpoint comparisons detect stale evidence; they do not lock the checkout or sandbox scripts.
async function pinsUnchanged(projectRoot, pins) {
  for (const pin of pins) {
    try {
      const current = await readInspectionFile(path.resolve(projectRoot, pin.file), projectRoot, pin.bytes);
      if (current.sha256 !== pin.sha256) return false;
    } catch { return false; }
  }
  return true;
}

async function runQualityCommands(projectRoot, commands, packageManager, pins) {
  const results = [];
  let unchanged = true;
  for (const script of commands) {
    unchanged = await pinsUnchanged(projectRoot, pins);
    if (!unchanged) break;
    const result = await runCommandInProject(projectRoot, packageManager, script, script === 'typecheck' ? 180_000 : 360_000);
    results.push(result);
    unchanged = await pinsUnchanged(projectRoot, pins);
    if (!unchanged || !result.completed || result.exitStatus !== 0) break;
  }
  return { results, unchanged };
}

let bundledGuideCache;
let semanticsCache;

const setupExpertSchema = z.object(setupSchema);
const rulesSchemaParsed = z.object(rulesSchema);
const creativeSchemaParsed = z.object(creativeSchema);
const architectSchemaParsed = z.object(pageArchitectSchema);
const syntaxSchemaParsed = z.object(syntaxSchema).refine((value) => value.components.length + value.foundations.length > 0, 'Request at least one component or foundation');
const catalogSchemaParsed = z.object(catalogSchema);
const qualitySchemaParsed = z.object(inspectSchema);

async function setupExpertHandler(args) {
  if (skipTool('setupExpert')) {
    return skippedStage('setup_expert', 'SKIP_SETUP_EXPERT', args?.workflowId);
  }

  const parsed = setupExpertSchema.parse(args);
  const workflowId = parsed.workflowId || randomUUID();
  const projectRoot = resolveProjectRoot(parsed.projectRoot);
  const snapshot = await projectSummary(projectRoot);
  const catalog = await loadGuideCatalog(projectRoot);
  const contractVersion = catalog.frameworkVersion;
  const version = await resolveExpressiveVersion({ projectRoot, contractVersion });
  const provenanceBlock = provenanceBlockReason(catalog.provenance.status);
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
      packageManager: version.packageManager,
      framework: {
        detectedVersion: version.resolvedVersion,
        declaredRange: version.declaredRange,
        resolvedVersion: version.resolvedVersion,
        resolutionSource: version.resolutionSource,
        contractVersion,
        contractCompatibility: version.status,
        compatibility: {
          status: version.status,
          message: version.status === 'match'
            ? `Rules match ExpressiveCSS ${contractVersion}.`
            : version.status === 'mismatch'
              ? `Project resolves ExpressiveCSS ${version.resolvedVersion}; this server bundles ${contractVersion} contracts.`
              : `No exact ExpressiveCSS version was resolved; this server bundles ${contractVersion} contracts.`,
        },
        matchingTag: version.matchingTag,
        documentationMode: version.documentationMode,
        documentationSources: version.documentationSources,
        bundledContractSafe: version.bundledContractSafe,
        currentDocsSafe: version.currentDocsSafe,
        warnings: version.warnings,
        diagnostics: version.diagnostics,
      },
      checksPerformed: ['project manifest', 'package manager detection', 'ExpressiveCSS version resolution', 'guide artifact discovery'],
      evidenceSources: [
        'package.json',
        version.resolutionSource,
        snapshot.foundSkills ? 'local skill guides' : 'bundled MCP guides',
      ],
      uncheckedAreas: ['visual hierarchy', 'rendered responsive behavior', 'keyboard behavior', 'screen-reader announcements'],
      contractCompatibility: version.status,
      contractProvenance: catalog.provenance.status,
      contractProvenanceDetails: catalog.provenance,
      coverageStatus: 'setup-only',
      blockedChecks: [
        ...(version.status === 'match' ? [] : ['target-version contract checks']),
        ...(provenanceBlock ? [provenanceBlock] : []),
      ],
      recommendations: suggestions,
      installHint: parsed.installHint,
      skipSettings: {
        SKIP_SETUP_EXPERT: process.env.SKIP_SETUP_EXPERT || 'false',
      },
    },
    workflowId,
  );

  return toToolResult(payload, { ...parsed, projectRoot });
}

async function rulesEnforcerHandler(args) {
  if (skipTool('rulesEnforcer')) {
    return skippedStage('rules_enforcer', 'SKIP_RULES_ENFORCER', args?.workflowId);
  }

  const parsed = rulesSchemaParsed.parse(args);
  const workflowId = parsed.workflowId || randomUUID();
  const projectRoot = resolveProjectRoot(parsed.projectRoot);
  const catalog = await loadGuideCatalog(projectRoot);
  const version = await resolveAgainstContract(projectRoot, catalog.frameworkVersion);
  const hasSnippet = parsed.snippet.trim().length > 0;
  const provenanceBlock = provenanceBlockReason(catalog.provenance.status);

  const componentMatches = (parsed.targetComponents || []).map((item) => ({
    requested: item,
    guide: findGuideByName(catalog, item, false),
  }));

  const issues = hasSnippet ? inspectAuthoringRules(parsed.snippet) : [];
  const inspectionTruncated = Boolean(issues.truncatedReason);
  const componentGuidance = [];
  for (const match of componentMatches) {
    if (!match.guide) {
      const near = nearestMatches(catalog, match.requested, 3).map((row) => row.slug);
      componentGuidance.push({
        kind: 'guidance',
        component: match.requested,
        lookupStatus: 'unknown',
        suggestions: near,
      });
    } else {
      componentGuidance.push({
        kind: 'guidance',
        component: match.guide.slug,
        lookupStatus: 'known',
        guideRules: match.guide.rules.slice(0, 6),
      });
    }
  }

  const blocking = issues.filter((item) => item.severity === 'high');
  const unknownComponents = componentGuidance.filter((item) => item.lookupStatus === 'unknown');
  const contractBlocked = version.status !== 'match';
  const componentValidationBlocked = componentGuidance.length > 0;
  const staticStatus = blocking.length
    ? 'needs_fix'
    : inspectionTruncated
      ? 'blocked'
    : !hasSnippet
      ? 'blocked'
      : issues.length
        ? 'warn'
        : 'pass';
  const reportedStaticStatus = staticStatus === 'pass' ? 'heuristic_pass' : staticStatus;
  const status = staticStatus === 'needs_fix'
    ? 'needs_fix'
    : contractBlocked || provenanceBlock || unknownComponents.length || componentValidationBlocked || inspectionTruncated
      ? 'blocked'
      : staticStatus;

  const payload = buildStagePayload(
    'rules_enforcer',
    {
      projectRoot,
      status,
      staticStatus: reportedStaticStatus,
      scopedStatus: `authored_static_${staticStatus}`,
      reviewComplete: false,
      framework: {
        detectedVersion: version.resolvedVersion,
        declaredRange: version.declaredRange,
        resolvedVersion: version.resolvedVersion,
        resolutionSource: version.resolutionSource,
        contractVersion: catalog.frameworkVersion,
        guideSource: catalog.guideSource,
        contractCompatibility: version.status,
        documentationMode: version.documentationMode,
        documentationSources: version.documentationSources,
        bundledContractSafe: version.bundledContractSafe,
        currentDocsSafe: version.currentDocsSafe,
      },
      issueCount: issues.length,
      blockingIssueCount: blocking.length,
      issues,
      componentGuidance,
      checksPerformed: [
        ...(hasSnippet ? ['heuristic static authoring rules', 'heuristic authored semantics'] : ['target contract resolution']),
        ...(componentGuidance.length ? ['requested component guide lookup'] : []),
      ],
      evidenceSources: hasSnippet
        ? ['supplied snippet', catalog.guideSource, 'bundled normative semantics']
        : [catalog.guideSource],
      uncheckedAreas: [
        'rendered appearance',
        'runtime behavior',
        'keyboard operation',
        'focus',
        'screen-reader announcements',
        ...(componentValidationBlocked ? ['requested component-rule validation'] : []),
      ],
      contractCompatibility: version.status,
      contractProvenance: catalog.provenance.status,
      contractProvenanceDetails: catalog.provenance,
      coverageStatus: hasSnippet ? 'partial-static-evidence' : 'no-evidence',
      blockedChecks: [
        ...(contractBlocked ? ['target-version contract checks'] : []),
        ...(provenanceBlock ? [provenanceBlock] : []),
        ...(unknownComponents.length ? ['unknown requested component contracts'] : []),
        ...(componentValidationBlocked ? ['requested component-rule validation'] : []),
        ...(!hasSnippet ? ['empty snippet'] : []),
        ...(inspectionTruncated ? ['static inspection limit reached'] : []),
      ],
      guidance: {
        alwaysPrefer: 'Read component guides before adding structure.',
        compatibility: 'Avoid retired selectors and prefer source-of-truth component contracts.',
      },
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
  const projectRoot = resolveProjectRoot(parsed.projectRoot);
  const catalog = await loadGuideCatalog(projectRoot);
  const version = await resolveAgainstContract(projectRoot, catalog.frameworkVersion);
  return toToolResult(buildCreativePayload(catalog, version, parsed), { ...parsed, projectRoot }, { catalog, version });
}

function buildCreativePayload(catalog, version, parsed) {
  const workflowId = parsed.workflowId || randomUUID();
  const provenanceBlock = provenanceBlockReason(catalog.provenance.status);
  const contractSafe = version.status === 'match' && !provenanceBlock;

  const hintTokens = parsed.constraints ? tokenize(parsed.constraints) : [];
  const candidateResult = contractSafe
    ? buildCreativeCandidates(catalog, `${parsed.goal} ${hintTokens.join(' ')}`, parsed.maxSuggestions)
    : { suggestions: [], truncated: false, omittedCount: 0 };
  const { suggestions, truncated, omittedCount } = candidateResult;

  return buildStagePayload(
    'creative_director',
    {
      goal: parsed.goal,
      constraints: parsed.constraints || null,
      status: contractSafe ? 'available' : 'blocked',
      contractVersion: catalog.frameworkVersion,
      count: suggestions.length,
      suggestions,
      truncated,
      omittedCount,
      checksPerformed: contractSafe
        ? ['target contract resolution', 'contract provenance validation', 'component decision catalogue ranking', 'native inline-feedback selection']
        : ['target contract resolution', 'contract provenance validation'],
      evidenceSources: contractSafe
        ? [version.resolutionSource, 'bundled:component-decisions.json', `${catalog.guideSource}:component-guides`, 'server:native-inline-feedback']
        : [version.resolutionSource],
      uncheckedAreas: [
        'target-version compatibility',
        'rendered component behavior',
        'responsive behavior',
        'keyboard and focus behavior',
        'screen-reader and accessibility behavior',
      ],
      contractCompatibility: version.status,
      contractProvenance: catalog.provenance.status,
      contractProvenanceDetails: catalog.provenance,
      coverageStatus: contractSafe ? 'component-selection-only' : 'no-contract-guidance',
      blockedChecks: [
        ...(version.status === 'match' ? [] : ['target-version contract checks']),
        ...(provenanceBlock ? [provenanceBlock] : []),
        'rendered validation',
        'interaction validation',
        'accessibility validation',
      ],
    },
    workflowId,
  );
}

async function pageArchitectHandler(args, stage = 'page_architect') {
  if (skipTool('pageArchitect')) {
    return skippedStage(stage, 'SKIP_PAGE_ARCHITECT', args?.workflowId);
  }

  const parsed = architectSchemaParsed.parse(args);
  const workflowId = parsed.workflowId || randomUUID();
  const projectRoot = resolveProjectRoot(parsed.projectRoot);
  const catalog = await loadGuideCatalog(projectRoot);
  const version = await resolveAgainstContract(projectRoot, catalog.frameworkVersion);
  const provenanceBlock = provenanceBlockReason(catalog.provenance.status);
  const contractSafe = version.status === 'match' && !provenanceBlock;

  const candidate = contractSafe
    ? buildPageArchitecture(
      catalog,
      parsed.pageGoal,
      parsed.components,
      parsed.viewportTarget,
      parsed.includeAccessibility,
    )
    : null;
  const unresolvedComponents = candidate?.unresolvedComponents ?? [];
  const architectureSafe = contractSafe && unresolvedComponents.length === 0;
  const architecture = architectureSafe
    ? Object.fromEntries(Object.entries(candidate).filter(([key]) => key !== 'unresolvedComponents'))
    : null;

  const payload = buildStagePayload(
    stage,
    {
      pageGoal: parsed.pageGoal,
      viewportTarget: parsed.viewportTarget,
      accessibilityNotes: parsed.includeAccessibility,
      status: architectureSafe ? 'available' : 'blocked',
      architecture,
      unresolvedComponents,
      contractVersion: catalog.frameworkVersion,
      catalogCount: catalog.count,
      checksPerformed: [
        'target contract resolution',
        'contract provenance validation',
        ...(contractSafe ? ['exact requested component lookup'] : []),
        ...(architectureSafe ? ['semantic skeleton generation'] : []),
      ],
      evidenceSources: contractSafe
        ? [version.resolutionSource, 'bundled:component-decisions.json', `${catalog.guideSource}:component-guides`]
        : [version.resolutionSource],
      uncheckedAreas: [
        'target-version compatibility',
        'rendered layout',
        'responsive behavior',
        'keyboard and focus behavior',
        'screen-reader and accessibility behavior',
      ],
      contractCompatibility: version.status,
      contractProvenance: catalog.provenance.status,
      contractProvenanceDetails: catalog.provenance,
      coverageStatus: architectureSafe ? 'architecture-proposal-only' : 'no-architecture-guidance',
      blockedChecks: [
        ...(version.status === 'match' ? [] : ['target-version contract checks']),
        ...(provenanceBlock ? [provenanceBlock] : []),
        ...(unresolvedComponents.length ? ['exact requested component lookup'] : []),
        'rendered validation',
        'interaction validation',
        'accessibility validation',
      ],
    },
    workflowId,
  );

  return toToolResult(payload, { ...parsed, projectRoot });
}

async function componentSyntaxExpertHandler(args) {
  if (skipTool('componentSyntaxExpert')) {
    return skippedStage('component_syntax_expert', 'SKIP_COMPONENT_SYNTAX_EXPERT', args?.workflowId);
  }

  const parsed = syntaxSchemaParsed.parse(args);
  const projectRoot = resolveProjectRoot(parsed.projectRoot);
  const catalog = await loadGuideCatalog(projectRoot);
  const version = await resolveAgainstContract(projectRoot, catalog.frameworkVersion);
  return toToolResult(buildSyntaxPayload(catalog, version, parsed), { ...parsed, projectRoot }, { catalog, version });
}

function buildSyntaxPayload(catalog, version, parsed) {
  const includeCapabilities = parsed.includeCapabilities ?? parsed.detail === 'detailed';
  const workflowId = parsed.workflowId || randomUUID();
  const provenanceBlock = provenanceBlockReason(catalog.provenance.status);

  const capabilitySafe = version.status === 'match' && !provenanceBlock && CAPABILITY_ROADMAP.frameworkVersion === catalog.frameworkVersion;
  const requested = parsed.components;
  const found = [];
  const missing = [];

  for (const [requestIndex, component] of requested.entries()) {
    const guide = findGuideByName(catalog, component, false);
    if (!guide) {
      const skipLimit = Math.min(Math.max(SETTINGS.maxComponentSkips, 1), 20);
      missing.push({
        requested: component,
        nearest: nearestMatches(catalog, component, skipLimit).map((row) => row.slug),
      });
    } else {
      found.push({
        requestIndex,
        ...summarizeGuide(guide, { ...parsed, includeCapabilities }),
        ...(includeCapabilities ? { capability: capabilitySafe ? CAPABILITIES_BY_SLUG.get(guide.slug) ?? null : null } : {}),
      });
    }
  }

  return buildStagePayload(
    'component_syntax_expert',
    {
      detail: parsed.detail,
      includeCapabilities,
      foundCount: found.length,
      foundations: capabilitySafe ? parsed.foundations.map((slug) => CAPABILITIES_BY_SLUG.get(slug)) : [],
      capabilityEvidence: { status: capabilitySafe ? 'bundled-review-snapshot' : 'blocked', basis: CAPABILITY_ROADMAP.basis, browserRun: capabilitySafe ? CAPABILITY_ROADMAP.browserRun : null },
      contractVersion: catalog.frameworkVersion,
      guideSource: catalog.guideSource,
      found,
      missing,
      status: version.status === 'match' && !provenanceBlock && missing.length === 0 && (!parsed.foundations.length || capabilitySafe) ? 'available' : 'blocked',
      checksPerformed: [...(requested.length ? ['named component contract lookup'] : []), ...(capabilitySafe ? ['bundled capability snapshot lookup'] : [])],
      evidenceSources: [...found.map((component) => `${catalog.guideSource}:${component.file}`), ...(capabilitySafe ? ['bundled:capability-roadmap.json'] : [])],
      uncheckedAreas: [
        'rendered component behavior',
        'visual hierarchy',
        'responsive composition',
        'keyboard and assistive-technology behavior',
      ],
      contractCompatibility: version.status,
      contractProvenance: catalog.provenance.status,
      contractProvenanceDetails: catalog.provenance,
      coverageStatus: !requested.length ? 'named-foundation-review-snapshot' : missing.length ? 'partial-named-component-contracts' : 'named-component-contracts',
      blockedChecks: [
        ...(version.status === 'match' ? [] : ['target-version contract checks']),
        ...(provenanceBlock ? [provenanceBlock] : []),
        ...(missing.length ? ['missing requested component contracts'] : []),
        ...(!capabilitySafe && parsed.foundations.length ? ['requested foundation capability evidence'] : []),
      ],
      maxCharactersPerComponent: SETTINGS.maxComponentResponseChars,
      notes: [
        'Component rules are derived from the generated ExpressiveCSS component guides and should be cross-checked against package docs.',
        'If a component is marked unknown, run Creative Director again with clearer component intent or pass an exact guide slug.',
      ],
    },
    workflowId,
  );
}

async function componentCatalogHandler(args) {
  const parsed = catalogSchemaParsed.parse(args);
  const projectRoot = parsed.projectRoot === undefined ? undefined : path.resolve(parsed.projectRoot);
  const catalog = await loadGuideCatalog(projectRoot);
  const version = projectRoot === undefined ? null : await resolveAgainstContract(projectRoot, catalog.frameworkVersion);
  return toToolResult(buildCatalogPayload(catalog, version, parsed), parsed, { catalog, version });
}

function buildCatalogPayload(catalog, version, parsed) {
  const provenanceBlock = provenanceBlockReason(catalog.provenance.status);
  let entries = [...catalog.components.values()].map((guide) => {
    const decision = COMPONENT_DECISIONS_BY_SLUG.get(guide.slug);
    return {
      slug: guide.slug,
      title: guide.title,
      description: [...(decision?.useWhen ?? []), ...(decision?.jobs ?? [])].find((value) => typeof value === 'string' && value.trim()) ?? null,
      aliases: decision?.aliases ?? [],
      runtime: decision?.runtime ?? null,
      docs: guide.sourceUrl,
    };
  }).sort((a, b) => a.slug.localeCompare(b.slug));

  let search = {};
  if (parsed.query !== undefined) {
    const query = normalizeForMatch(parsed.query);
    const tokens = query.split('-').filter(Boolean);
    const matchOrder = ['exact-name', 'exact-alias', 'heuristic'];
    entries = entries.flatMap((entry) => {
      const names = [entry.slug, entry.title].map(normalizeForMatch);
      const aliases = entry.aliases.map(normalizeForMatch);
      const fields = [...names, ...aliases, normalizeForMatch(entry.description)];
      const matchType = query && names.includes(query) ? 'exact-name'
        : query && aliases.includes(query) ? 'exact-alias'
          : tokens.length && tokens.every((token) => fields.some((field) => field.includes(token))) ? 'heuristic' : null;
      return matchType ? [{ ...entry, matchType }] : [];
    }).sort((a, b) => matchOrder.indexOf(a.matchType) - matchOrder.indexOf(b.matchType) || a.slug.localeCompare(b.slug));
    const totalMatches = entries.length;
    const limit = parsed.limit ?? 10;
    entries = entries.slice(0, limit);
    const omittedCount = totalMatches - entries.length;
    search = { query: parsed.query, limit, totalMatches, omittedCount, truncated: omittedCount > 0 };
  }

  return buildStagePayload('component_catalog', {
    entries,
    count: entries.length,
    ...search,
    contractVersion: catalog.frameworkVersion,
    sourceHash: catalog.sourceHash,
    guideSource: catalog.guideSource,
    status: (!version || version.status === 'match') && !provenanceBlock ? 'available' : 'blocked',
    checksPerformed: [parsed.query === undefined ? 'bundled component catalogue listing' : 'bundled component catalogue search', ...(version ? ['target contract resolution', 'contract provenance validation'] : [])],
    evidenceSources: ['bundled:component-guides.json', 'bundled:component-decisions.json', 'bundled:contract.json', ...(version ? [version.resolutionSource] : [])],
    uncheckedAreas: [
      ...(!version ? ['target-project compatibility', 'target-project provenance'] : []),
      'rendered component behavior', 'visual hierarchy', 'responsive composition', 'keyboard and assistive-technology behavior',
    ],
    contractCompatibility: version?.status ?? 'unknown',
    contractProvenance: catalog.provenance.status,
    contractProvenanceDetails: catalog.provenance,
    coverageStatus: parsed.query === undefined ? 'complete-bundled-catalogue' : search.truncated ? 'partial-search-results' : 'complete-search-results',
    blockedChecks: [
      ...(version && version.status !== 'match' ? ['target-version contract checks'] : []),
      ...(provenanceBlock ? [provenanceBlock] : []),
    ],
  }, parsed.workflowId);
}

async function qualityInspectorHandler(args) {
  if (skipTool('qualityInspector')) {
    return skippedStage('quality_inspector', 'SKIP_QUALITY_INSPECTOR', args?.workflowId);
  }

  const parsed = qualitySchemaParsed.parse(args);
  const workflowId = parsed.workflowId || randomUUID();
  const projectRoot = resolveProjectRoot(parsed.projectRoot);
  const fileSummary = summarizeProjectFiles(parsed.files, projectRoot);
  const catalog = await loadGuideCatalog(projectRoot);
  const contractVersion = catalog.frameworkVersion;
  const version = await resolveExpressiveVersion({ projectRoot, contractVersion });
  const provenanceBlock = provenanceBlockReason(catalog.provenance.status);

  const fileInspection = await findFileViolations(fileSummary.existing, projectRoot);
  const staticFindings = fileInspection.findings;
  const filesUninspected = [
    ...fileSummary.skipped.map((item) => ({ file: item.requested, reason: item.reason })),
    ...fileInspection.uninspected,
  ];
  const highCount = staticFindings.reduce((count, entry) => count + entry.issues.filter((issue) => issue.severity === 'high').length, 0);

  const commandChecks = [];
  const commandsRequested = parsed.runCommands && (['standard', 'full', 'consumer'].includes(parsed.runType));
  const executionPolicy = commandExecutionPolicy(projectRoot);
  const commandRootBlocked = commandsRequested && !executionPolicy.allowed;
  const packageManagerBlocked = commandsRequested && !['npm', 'pnpm', 'yarn'].includes(version.packageManager);
  const commands = commandsRequested ? qualityCommands(parsed.runType) : [];
  const commandScopeBlocked = commands.some(script => !SETTINGS.allowedScripts.includes(script));
  const pins = [...fileInspection.sourcePins];
  const expectedMatched = parsed.expectedSourceHashes === undefined ? null : Object.entries(parsed.expectedSourceHashes)
    .every(([file, sha256]) => pins.some(pin => pin.file === file && pin.sha256 === sha256));
  let commandManifestSha256 = null;
  let manifestBlocked = false;
  if (commandsRequested && !commandRootBlocked && !commandScopeBlocked && !packageManagerBlocked && expectedMatched !== false) {
    try {
      const manifest = await readInspectionFile(path.join(projectRoot, 'package.json'), projectRoot, 1024 * 1024);
      commandManifestSha256 = manifest.sha256;
      pins.push({ file: 'package.json', sha256: manifest.sha256, bytes: manifest.bytes });
    } catch { manifestBlocked = true; }
  }
  let inputsUnchanged = await pinsUnchanged(projectRoot, pins);
  if (commandsRequested && !commandRootBlocked && !commandScopeBlocked && !packageManagerBlocked && !manifestBlocked && expectedMatched !== false && inputsUnchanged) {
    const run = await runQualityCommands(executionPolicy.projectRoot, commands, version.packageManager, pins);
    commandChecks.push(...run.results);
    inputsUnchanged = run.unchanged;
  }
  inputsUnchanged = inputsUnchanged && await pinsUnchanged(projectRoot, pins);
  const commandsNotRun = commands.slice(commandChecks.length);

  const commandBlocked = commandChecks.filter((run) => !run.completed);
  const commandFailed = commandChecks.some((run) => run.completed && run.exitStatus !== 0);
  const completedCommands = commandChecks.filter((run) => run.completed);
  const inspectionPerformed = fileInspection.inspected.length > 0 || completedCommands.length > 0;
  const evidenceStatus = highCount > 0 || commandFailed
    ? 'needs_fix'
    : staticFindings.some((entry) => entry.issues.length > 0) || fileSummary.skipped.length > 0 || !inspectionPerformed
      ? 'warn'
      : 'pass';
  const staticStatus = fileInspection.inspected.length === 0
    ? 'not_run'
    : highCount > 0
      ? 'needs_fix'
      : staticFindings.length > 0
        ? 'warn'
        : 'heuristic_pass';
  const hasBlockedChecks = version.status !== 'match'
    || provenanceBlock
    || filesUninspected.length > 0
    || commandRootBlocked
    || commandScopeBlocked
    || expectedMatched === false
    || !inputsUnchanged
    || manifestBlocked
    || commandsNotRun.length > 0
    || packageManagerBlocked
    || commandBlocked.length > 0
    || !inspectionPerformed;
  const status = evidenceStatus === 'needs_fix'
    ? 'needs_fix'
    : hasBlockedChecks
      ? 'blocked'
      : evidenceStatus;

  const payload = buildStagePayload(
    'quality_inspector',
    {
      projectRoot,
      runType: parsed.runType,
      filesRequested: parsed.files.length,
      coverage: {
        filesInspected: fileInspection.inspected,
        filesUninspected,
        filesInspectedCount: fileInspection.inspected.length,
        filesUninspectedCount: filesUninspected.length,
        commandsRun: completedCommands.length,
        commandsAttempted: commandChecks.length,
        inspectionPerformed,
      },
      filesSkipped: filesUninspected,
      staticFindings,
      inspectionEvidence: {
        algorithm: 'sha256', files: fileInspection.sourcePins, expectedMatched, inputsUnchanged, commandManifestSha256,
        scope: 'Exact inspected bytes and command package.json at observed endpoints only; no lock, whole-revision proof, script sandbox, or automatic rollback.',
      },
      commandChecks: commandChecks.length ? commandChecks : [],
      commandExecutionPolicy: {
        requested: commandsRequested,
        ...executionPolicy,
        allowedScripts: SETTINGS.allowedScripts,
        commandsNotRun,
        stopOnFailure: true,
      },
      status,
      staticStatus,
      scopedStatus: `static_contract_${status}`,
      reviewComplete: false,
      checksPerformed: [
        ...(fileInspection.inspected.length ? ['heuristic static authoring and semantics rules'] : []),
        ...completedCommands.map((run) => run.command),
      ],
      evidenceSources: [
        ...fileInspection.inspected,
        ...completedCommands.map((run) => `command: ${run.command}`),
      ],
      uncheckedAreas: [
        'visual hierarchy',
        'motion behavior',
        'focus visibility and order',
        'rendered responsive composition',
        'screen-reader announcements',
        'contrast unless separately measured',
      ],
      contractCompatibility: version.status,
      contractProvenance: catalog.provenance.status,
      contractProvenanceDetails: catalog.provenance,
      coverageStatus: inspectionPerformed ? 'partial-static-evidence' : 'no-evidence',
      blockedChecks: [
        ...(version.status === 'match' ? [] : ['target-version contract checks']),
        ...(provenanceBlock ? [provenanceBlock] : []),
        ...(!inspectionPerformed ? ['static inspection'] : []),
        ...(filesUninspected.length ? ['some requested files were not inspected'] : []),
        ...(commandRootBlocked ? ['command execution root is not allowlisted'] : []),
        ...(commandScopeBlocked ? ['requested scripts exceed server command scope'] : []),
        ...(expectedMatched === false ? ['expected source hashes do not match inspected files'] : []),
        ...(!inputsUnchanged ? ['inspected inputs changed during verification'] : []),
        ...(manifestBlocked ? ['command manifest could not be pinned'] : []),
        ...commandsNotRun.map(script => `${script} command not run`),
        ...(packageManagerBlocked ? ['package manager could not be detected'] : []),
        ...commandBlocked.map((run) => `${run.command.split(' ').at(-1)} command ${run.timedOut ? 'timed out' : 'could not be launched'}`),
      ],
      recommendations: [
        ...(parsed.runType === 'consumer' ? ['Consumer commands are project-authored. Inspect operator-collected report.json and captures; exit status or printed claims alone do not establish browser conformance.'] : []),
        'If status is warn, resolve medium/high-severity issues before shipping.',
        'Run only authorized checks. On failure, retain evidence and repair within scope; do not widen permissions or reset unrelated work.',
      ],
      limits: {
        maxFiles: SETTINGS.qaMaxFiles,
        maxFileMb: SETTINGS.qaMaxMb,
        commandTimeoutMs: SETTINGS.commandTimeoutMs,
        maxCommandOutputCharacters: 20_000,
      },
    },
    workflowId,
  );

  return toToolResult(payload);
}

const COMPONENT_SECTIONS = ['contract', 'syntax', 'rules', 'options', 'methods'];

function resourceRequiredBytes(result) {
  // A retry's budget field can need more decimal digits. Include those bytes too.
  const retry = structuredClone(result);
  const payload = JSON.parse(retry.contents[0].text);
  let requiredBytes = Buffer.byteLength(JSON.stringify(retry), 'utf8');
  for (;;) {
    payload.responseBudget.maxBytes = requiredBytes;
    retry.contents[0].text = JSON.stringify(payload);
    const measured = Buffer.byteLength(JSON.stringify(retry), 'utf8');
    if (measured <= requiredBytes) return requiredBytes;
    requiredBytes = measured;
  }
}

function resourceBudgetError(uri, result, resources) {
  const requiredBytes = resourceRequiredBytes(result);
  const data = { uri, maxBytes: SETTINGS.maxResponseBytes, requiredBytes, setting: RESPONSE_BUDGET_SETTING };
  if (!resources.sections.has(uri)) {
    return {
      code: -32001,
      message: `Response budget cannot fit the complete catalogue resource. Increase ${RESPONSE_BUDGET_SETTING} to at least ${requiredBytes} and restart.`,
      data,
    };
  }
  // Recover a whole guide through the section URIs whose complete reads fit this budget.
  const fits = (sectionUri) => Buffer.byteLength(JSON.stringify(resources.readers.get(sectionUri)()), 'utf8') <= SETTINGS.maxResponseBytes;
  const sections = resources.sections.get(uri);
  const recoveries = sections.length > 1 ? sections.filter(fits) : [];
  return {
    code: -32001,
    message: `Response budget cannot fit the complete component resource. Read the listed section URIs or increase ${RESPONSE_BUDGET_SETTING} to at least ${requiredBytes} and restart.`,
    data: {
      ...data,
      recoveries,
      unrecoverableSections: sections.filter((sectionUri) => !recoveries.includes(sectionUri)).map((sectionUri) => sectionUri.slice(sectionUri.lastIndexOf('/') + 1)),
    },
  };
}

function bundledResources(catalog, catalogUri, catalogSnapshot) {
  const base = catalogUri.replace('expressivecss://catalogue/', 'expressivecss://components/');
  const jsonResource = (uri, payload) => () => ({
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify({
        ...payload,
        responseBudget: { maxBytes: SETTINGS.maxResponseBytes, delivery: 'complete', omissions: [], recoveries: [] },
      }),
    }],
  });
  const readers = new Map([[catalogUri, jsonResource(catalogUri, { schemaVersion: 1, ...catalogSnapshot })]]);
  // Whole-guide and section URIs map to the section URIs that can recover them.
  const sections = new Map();
  const guides = [];
  const provenanceBlock = provenanceBlockReason(catalog.provenance.status);
  for (const guide of [...catalog.components.values()].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const uri = `${base}/${guide.slug}`;
    const identity = {
      schemaVersion: 1,
      slug: guide.slug,
      title: guide.title,
      docs: guide.sourceUrl,
      repositorySource: guide.astroSource,
      contractVersion: catalog.frameworkVersion,
      sourceHash: catalog.sourceHash,
      guideSource: catalog.guideSource,
    };
    const fields = {
      contract: guide.contract,
      syntax: { language: guide.syntax.language, example: guide.syntax.code },
      rules: guide.rules,
      options: { status: guide.options ? 'documented' : 'absent', markdown: guide.options },
      methods: { status: guide.methods ? 'documented' : 'absent', markdown: guide.methods },
    };
    const evidence = (coverageStatus) => ({
      status: provenanceBlock ? 'blocked' : 'available',
      checksPerformed: ['bundled component guide lookup'],
      evidenceSources: [`${catalog.guideSource}:${guide.file}`, 'bundled:contract.json'],
      uncheckedAreas: catalogSnapshot.uncheckedAreas,
      contractCompatibility: 'unknown',
      contractProvenance: catalog.provenance.status,
      contractProvenanceDetails: catalog.provenance,
      coverageStatus,
      blockedChecks: provenanceBlock ? [provenanceBlock] : [],
    });
    readers.set(uri, jsonResource(uri, { ...identity, ...fields, ...evidence('complete-bundled-guide') }));
    guides.push(guide);
    sections.set(uri, COMPONENT_SECTIONS.map((name) => `${uri}/${name}`));
    for (const name of COMPONENT_SECTIONS) {
      readers.set(`${uri}/${name}`, jsonResource(`${uri}/${name}`, { ...identity, section: name, [name]: fields[name], ...evidence('complete-bundled-guide-section') }));
      sections.set(`${uri}/${name}`, [`${uri}/${name}`]);
    }
  }
  return { base, readers, sections, guides };
}

async function startServer() {
  const server = new McpServer(
    {
      name: 'ExpressiveCSS MCP',
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.registerTool('setup_expert', {
    description: TOOL_DESCRIPTIONS.setup_expert.description + " Responses share the operator byte budget with explicit whole-unit omissions and recovery.",
    inputSchema: setupSchema,
    outputSchema: guidanceOutputSchema,
    annotations: readAnnotations,
  }, setupExpertHandler);

  server.registerTool('rules_enforcer', {
    description: TOOL_DESCRIPTIONS.rules_enforcer.description,
    inputSchema: rulesSchema,
    outputSchema: stageOutputSchema,
    annotations: readAnnotations,
  }, rulesEnforcerHandler);

  server.registerTool('creative_director', {
    description: TOOL_DESCRIPTIONS.creative_director.description + " Responses share the operator byte budget with explicit whole-unit omissions and recovery.",
    inputSchema: creativeSchema,
    outputSchema: guidanceOutputSchema,
    annotations: readAnnotations,
  }, creativeDirectorHandler);

  server.registerTool('page_architect', {
    description: TOOL_DESCRIPTIONS.page_architect.description + " Responses share the operator byte budget with explicit whole-unit omissions and recovery.",
    inputSchema: pageArchitectSchema,
    outputSchema: guidanceOutputSchema,
    annotations: readAnnotations,
  }, (args) => pageArchitectHandler(args, 'page_architect'));

  server.registerTool('page_arcjitect', {
    description: TOOL_DESCRIPTIONS.page_arcjitect.description + " Responses share the operator byte budget with explicit whole-unit omissions and recovery.",
    inputSchema: pageArchitectSchema,
    outputSchema: guidanceOutputSchema,
    annotations: readAnnotations,
  }, (args) => pageArchitectHandler(args, 'page_arcjitect'));

  server.registerTool('component_syntax_expert', {
    description: TOOL_DESCRIPTIONS.component_syntax_expert.description + " Responses share the operator byte budget with explicit whole-unit omissions and recovery.",
    inputSchema: syntaxSchema,
    outputSchema: syntaxOutputSchema,
    annotations: readAnnotations,
  }, componentSyntaxExpertHandler);

  server.registerTool('component_catalog', {
    description: TOOL_DESCRIPTIONS.component_catalog.description + " Responses share the operator byte budget with explicit whole-unit omissions and recovery.",
    inputSchema: catalogSchema,
    outputSchema: guidanceOutputSchema,
    annotations: readAnnotations,
  }, componentCatalogHandler);

  server.registerTool('quality_inspector', {
    description: TOOL_DESCRIPTIONS.quality_inspector.description,
    inputSchema: inspectSchema,
    outputSchema: qualityOutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  }, qualityInspectorHandler);

  const catalog = await loadGuideCatalog(undefined);
  const catalogUri = `expressivecss://catalogue/${encodeURIComponent(catalog.frameworkVersion)}/${catalog.sourceHash}`;
  const { stage, workflowId, ...snapshot } = buildCatalogPayload(catalog, null, { workflowId: 'catalogue-resource' });
  const resources = bundledResources(catalog, catalogUri, snapshot);
  const readResource = async (uri) => {
    const reader = resources.readers.get(uri);
    if (!reader) throw new McpError(-32002, 'Resource not found. Use resources/list or resources/templates/list to discover the current bundled snapshot.');
    return reader();
  };
  server.registerResource('component_catalog', catalogUri, {
    title: 'ExpressiveCSS component catalogue',
    description: 'Compact component metadata for the current bundled snapshot only. Consumer compatibility remains unchecked.',
    mimeType: 'application/json',
  }, () => readResource(catalogUri));
  server.registerResource('component_guide', new ResourceTemplate(`${resources.base}/{slug}`, {
    list: async () => ({
      resources: resources.guides.map((guide) => ({ uri: `${resources.base}/${guide.slug}`, name: guide.slug, title: `ExpressiveCSS ${guide.title} guide` })),
    }),
  }), {
    title: 'ExpressiveCSS component guide',
    description: 'Complete contract, syntax, rules, Options and Methods for one component in the current bundled snapshot only. Use a canonical slug; consumer compatibility remains unchecked.',
    mimeType: 'application/json',
  }, (uri) => readResource(uri.href));
  server.registerResource('component_guide_section', new ResourceTemplate(`${resources.base}/{slug}/{section}`, { list: undefined }), {
    title: 'ExpressiveCSS component guide section',
    description: `One complete section of a component guide in the current bundled snapshot only. Sections: ${COMPONENT_SECTIONS.join(', ')}. Use a canonical slug; consumer compatibility remains unchecked.`,
    mimeType: 'application/json',
  }, (uri) => readResource(uri.href));
  // SDK v1 normalizes URLs and uses -32602 for missing resources. Require an
  // advertised identity verbatim and return the resource-not-found protocol code.
  server.server.setRequestHandler(ReadResourceRequestSchema, async (request) => readResource(request.params.uri));

  const transport = new StdioServerTransport();
  // Check the wire result after SDK error handling too. SDK exceptions otherwise become
  // unbounded isError results, including validation errors before our handlers run.
  const scopedRequests = new Map();
  const start = transport.start.bind(transport);
  const send = transport.send.bind(transport);
  transport.start = async () => {
    const receive = transport.onmessage;
    transport.onmessage = (message, extra) => {
      if (Object.hasOwn(message, 'id')) {
        if (message.method === 'tools/call' && GUIDANCE_TOOLS.has(message.params?.name)) scopedRequests.set(message.id, 'tool');
        if (message.method === 'resources/read') scopedRequests.set(message.id, { uri: message.params?.uri });
      }
      receive(message, extra);
    };
    await start();
  };
  transport.send = async (message, options) => {
    const kind = scopedRequests.get(message.id);
    scopedRequests.delete(message.id);
    if (kind && Object.hasOwn(message, 'result')
      && Buffer.byteLength(JSON.stringify(message.result), 'utf8') > SETTINGS.maxResponseBytes) {
      const error = kind.uri ? resourceBudgetError(kind.uri, message.result, resources)
        : { code: -32001, message: `Response budget cannot fit a truthful tool result. Increase ${RESPONSE_BUDGET_SETTING}.` };
      message = { jsonrpc: '2.0', id: message.id, error };
    }
    await send(message, options);
  };
  const close = transport.close.bind(transport);
  transport.close = async () => { try { await close(); } finally { scopedRequests.clear(); } };
  await server.connect(transport);
  console.error('ExpressiveCSS MCP server running on stdio transport.');
}

// Only run as the entry point; lint.mjs imports the static checks without starting the server.
if (process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url) {
  startServer().catch((error) => {
    console.error('ExpressiveCSS MCP server failed to start:', error);
    process.exitCode = 1;
  });
}
