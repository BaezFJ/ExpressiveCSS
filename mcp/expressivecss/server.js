#!/usr/bin/env node
import { accessSync, closeSync, constants as fsConstants, fstatSync, lstatSync, openSync, readFileSync, realpathSync } from 'node:fs';
import { access, lstat, open, readdir, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { JSDOM } from 'jsdom';
import * as z from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { resolveExpressiveVersion } from './scripts/resolve-version.mjs';

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const COMPONENT_DECISIONS = JSON.parse(readFileSync(path.join(SERVER_DIR, 'component-decisions.json'), 'utf8'));
const COMPONENT_DECISIONS_BY_SLUG = new Map(COMPONENT_DECISIONS.components.map((entry) => [entry.slug, entry]));
const DEFAULT_MAX_COMPONENT_RESPONSE_CHARS = 24_000;
const DEFAULT_QA_MAX_FILES = 300;
const DEFAULT_QA_MAX_MB = 2;
const DEFAULT_QA_MAX_TOTAL_MB = 16;
const MAX_STATIC_ISSUES = 200;
const MAX_STATIC_ISSUES_PER_REQUEST = 1_000;
const MAX_STATIC_MARKUP_DELIMITERS = 4_000;
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

const SETTINGS = {
  maxComponentResponseChars: Number(process.env.EXPRESSIVECSS_MCP_MAX_COMPONENT_RESPONSE_CHARS || DEFAULT_MAX_COMPONENT_RESPONSE_CHARS),
  maxComponentSkips: Number(process.env.EXPRESSIVECSS_MCP_MAX_COMPONENT_SKIPS || 7),
  qaMaxFiles: Number(process.env.EXPRESSIVECSS_MCP_QA_MAX_FILES || DEFAULT_QA_MAX_FILES),
  qaMaxMb: Number(process.env.EXPRESSIVECSS_MCP_QA_MAX_MB || DEFAULT_QA_MAX_MB),
  qaMaxTotalMb: Number(process.env.EXPRESSIVECSS_MCP_QA_MAX_TOTAL_MB || DEFAULT_QA_MAX_TOTAL_MB),
  commandTimeoutMs: Number(process.env.EXPRESSIVECSS_MCP_COMMAND_TIMEOUT_MS || DEFAULT_COMMAND_TIMEOUT_MS),
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
    description: 'Return authoritative syntax, contract, and usage constraints for selected components.',
  },
  quality_inspector: {
    stage: 'Quality Inspector',
    description: 'Run checks and report a quality verdict for changed files and target project scope.',
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
  components: z.array(z.string().max(MAX_COMPONENT_NAME_CHARS)).min(1).max(12),
  workflowId: z.string().max(MAX_WORKFLOW_ID_CHARS).optional(),
};

const inspectSchema = {
  projectRoot: z.string().max(MAX_PROJECT_ROOT_CHARS).optional(),
  files: z.array(z.string().max(MAX_FILE_PATH_CHARS)).max(DEFAULT_QA_MAX_FILES).default([]),
  runType: z.enum(['quick', 'standard', 'full']).default('quick'),
  runCommands: z.boolean().default(false),
  workflowId: z.string().max(MAX_WORKFLOW_ID_CHARS).optional(),
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
    file,
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

  const guideDir = await resolveGuideDirectory(projectRoot);
  const dirStat = guideDir ? await stat(guideDir).catch(() => null) : null;
  const projectResolution = await resolveExpressiveVersion({
    projectRoot,
    contractVersion: bundledGuideCache.frameworkVersion,
  });
  const isFrameworkSource = projectResolution.resolutionSource === 'framework-source';
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
    projectRoot: path.resolve(projectRoot),
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

  summary.foundDocs = accessSyncBoolean(path.join(projectRoot, 'docs', 'src', 'data', 'nav.ts'));
  summary.foundSkills = accessSyncBoolean(path.join(projectRoot, 'skills', 'expressivecss', 'SKILL.md'));

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
    currentDocsSafe: false,
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
  const { document } = new JSDOM(`<!doctype html><body>${snippet}</body>`).window;
  const issues = [];

  for (const rule of enforcedSemanticRules(semantics)) {
    const beforeRule = inspectionStopReason(issues, maxIssues, deadline);
    if (beforeRule) return markInspectionTruncated(issues, beforeRule);
    const hits = document.querySelectorAll(expandedSemanticSelector(rule, semantics.compositeRoles));
    if (rule.kind === 'forbid' || rule.kind === 'forbid-composite-roles') {
      for (const element of hits) {
        const stop = inspectionStopReason(issues, maxIssues, deadline);
        if (stop) return markInspectionTruncated(issues, stop);
        issues.push(semanticIssue(rule, element, frameworkVersion));
      }
    } else if (rule.kind === 'require-attr') {
      for (const element of hits) {
        const stop = inspectionStopReason(issues, maxIssues, deadline);
        if (stop) return markInspectionTruncated(issues, stop);
        const value = element.getAttribute(rule.attr);
        const valid = rule.equals ? value === rule.equals : value !== null && value !== '';
        if (!valid) {
          issues.push(semanticIssue(rule, element, frameworkVersion));
        }
      }
    } else if (rule.kind === 'require-accessible-name') {
      for (const element of hits) {
        const stop = inspectionStopReason(issues, maxIssues, deadline);
        if (stop) return markInspectionTruncated(issues, stop);
        if (!accessibleName(element, document)) {
          issues.push(semanticIssue(rule, element, frameworkVersion));
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

function lineForMatch(text, index) {
  const prefix = text.slice(0, index);
  const line = prefix.split('\n').length;
  const col = prefix.length - prefix.lastIndexOf('\n');
  return { line, column: col };
}

function inspectAuthoringRules(
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
  const manualInitPattern = /(?:(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*)?(?:Expressive\.)?[A-Z][A-Za-z0-9]*\.init\s*\(/gu;
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
    if (!decision || decision.selectable === false) continue;

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
    const score = (positiveMatches.length * 2) + (aliasMatch ? 30 : 0) + (nameMatch ? 12 : 0) + (hintMatch ? 12 : 0);
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
    if (selectedSlugs.has(guide.slug) || rejected.has(guide.slug)) continue;
    const matches = [...tokens].filter((token) => guide.text.includes(token));
    if (!matches.length) continue;
    const decision = COMPONENT_DECISIONS_BY_SLUG.get(guide.slug);
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

  const allCandidates = [...primary, ...fallback];
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

function summarizeGuide(guide) {
  return {
    file: guide.file,
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

async function readInspectionFile(filePath, projectRoot, byteLimit) {
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
    return { text: bytes.subarray(0, total).toString('utf8'), bytes: total };
  } finally {
    await handle.close();
  }
}

async function findFileViolations(fileInfoList, projectRoot) {
  const findings = [];
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

  return { findings, inspected, uninspected };
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

async function runQualityCommands(projectRoot, runType, packageManager) {
  const commands = [];
  if (runType === 'standard' || runType === 'full') {
    commands.push(['typecheck', 180_000]);
  }
  if (runType === 'full') {
    commands.push(['test', 360_000]);
  }

  const results = [];
  for (const [script, timeout] of commands) {
    const result = await runCommandInProject(projectRoot, packageManager, script, timeout);
    results.push(result);
  }

  return results;
}

let bundledGuideCache;
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
        compatibility: 'Avoid Materialize-era selectors and prefer source-of-truth component contracts.',
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
  const workflowId = parsed.workflowId || randomUUID();
  const projectRoot = resolveProjectRoot(parsed.projectRoot);
  const catalog = await loadGuideCatalog(projectRoot);
  const version = await resolveAgainstContract(projectRoot, catalog.frameworkVersion);
  const provenanceBlock = provenanceBlockReason(catalog.provenance.status);
  const contractSafe = version.status === 'match' && !provenanceBlock;

  const hintTokens = parsed.constraints ? tokenize(parsed.constraints) : [];
  const candidateResult = contractSafe
    ? buildCreativeCandidates(catalog, `${parsed.goal} ${hintTokens.join(' ')}`, parsed.maxSuggestions)
    : { suggestions: [], truncated: false, omittedCount: 0 };
  const { suggestions, truncated, omittedCount } = candidateResult;

  const payload = buildStagePayload(
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
        ? ['target contract resolution', 'contract provenance validation', 'component decision catalogue ranking']
        : ['target contract resolution', 'contract provenance validation'],
      evidenceSources: contractSafe
        ? [version.resolutionSource, 'bundled:component-decisions.json', `${catalog.guideSource}:component-guides`]
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
  const version = await resolveAgainstContract(projectRoot, catalog.frameworkVersion);
  const provenanceBlock = provenanceBlockReason(catalog.provenance.status);

  const requested = parsed.components;
  const found = [];
  const missing = [];

  for (const component of requested) {
    const guide = findGuideByName(catalog, component, false);
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
      status: version.status === 'match' && !provenanceBlock && missing.length === 0 ? 'available' : 'blocked',
      checksPerformed: ['named component contract lookup'],
      evidenceSources: found.map((component) => `${catalog.guideSource}:${component.file}`),
      uncheckedAreas: [
        'rendered component behavior',
        'visual hierarchy',
        'responsive composition',
        'keyboard and assistive-technology behavior',
      ],
      contractCompatibility: version.status,
      contractProvenance: catalog.provenance.status,
      contractProvenanceDetails: catalog.provenance,
      coverageStatus: missing.length ? 'partial-named-component-contracts' : 'named-component-contracts',
      blockedChecks: [
        ...(version.status === 'match' ? [] : ['target-version contract checks']),
        ...(provenanceBlock ? [provenanceBlock] : []),
        ...(missing.length ? ['missing requested component contracts'] : []),
      ],
      maxCharactersPerComponent: SETTINGS.maxComponentResponseChars,
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
  const commandsRequested = parsed.runCommands && (parsed.runType === 'standard' || parsed.runType === 'full');
  const executionPolicy = commandExecutionPolicy(projectRoot);
  const commandRootBlocked = commandsRequested && !executionPolicy.allowed;
  const packageManagerBlocked = commandsRequested && !['npm', 'pnpm', 'yarn'].includes(version.packageManager);
  if (commandsRequested && !commandRootBlocked && !packageManagerBlocked) {
    commandChecks.push(...await runQualityCommands(executionPolicy.projectRoot, parsed.runType, version.packageManager));
  }

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
      commandChecks: commandChecks.length ? commandChecks : [],
      commandExecutionPolicy: {
        requested: commandsRequested,
        ...executionPolicy,
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
        ...(packageManagerBlocked ? ['package manager could not be detected'] : []),
        ...commandBlocked.map((run) => `${run.command.split(' ').at(-1)} command ${run.timedOut ? 'timed out' : 'could not be launched'}`),
      ],
      recommendations: [
        'If status is warn, resolve medium/high-severity issues before shipping.',
        'If runCommands is disabled, pair this call with `runCommands: true` for command verification.',
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
