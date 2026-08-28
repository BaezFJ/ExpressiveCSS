import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const outsideDir = await mkdtemp(path.join(os.tmpdir(), 'expressivecss-mcp-smoke-'));
const outsideFile = path.join(outsideDir, 'outside.txt');
const invalidMarkupFile = path.join(outsideDir, 'invalid.html');
await writeFile(outsideFile, 'outside project root');
await writeFile(invalidMarkupFile, '<nav class="navigation-bar"><a class="active" href="/">Home</a></nav>');
await writeFile(path.join(outsideDir, 'package.json'), JSON.stringify({
  scripts: {
    typecheck: "node -e \"console.log('TOKEN=test-secret-value')\"",
  },
}));
const packageManifest = JSON.parse(await readFile(path.join(packageDir, 'package.json'), 'utf8'));
const guideData = JSON.parse(await readFile(path.join(packageDir, 'component-guides.json'), 'utf8'));
const contractVersion = guideData.frameworkVersion;
const mcpConfig = JSON.parse(await readFile(path.join(packageDir, 'mcp.json'), 'utf8'));
const claudePlugin = JSON.parse(await readFile(path.join(packageDir, '.claude-plugin', 'plugin.json'), 'utf8'));
const cursorPlugin = JSON.parse(await readFile(path.join(packageDir, '.cursor-plugin', 'plugin.json'), 'utf8'));
assert.equal(mcpConfig.mcpServers['expressivecss-mcp'].command, 'npx');
assert.equal(claudePlugin.version, packageManifest.version);
assert.equal(cursorPlugin.version, packageManifest.version);
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(packageDir, 'server.js')],
  cwd: packageDir,
  stderr: 'pipe',
});
const client = new Client({ name: 'expressivecss-mcp-smoke', version: '0.1.0' });

try {
  await client.connect(transport);

  const listed = await client.listTools();
  const expectedTools = [
    'setup_expert',
    'rules_enforcer',
    'creative_director',
    'page_architect',
    'page_arcjitect',
    'component_syntax_expert',
    'quality_inspector',
  ];
  assert.deepEqual(listed.tools.map((tool) => tool.name).sort(), expectedTools.sort());
  for (const tool of listed.tools) {
    assert.equal(tool.inputSchema.required?.includes('projectRoot') ?? false, false);
  }

  const setup = await client.callTool({
    name: 'setup_expert',
    arguments: { projectRoot: packageDir, installHint: true },
  });
  assert.equal(setup.structuredContent.stage, 'setup_expert');
  assert.equal(setup.structuredContent.nextTool, 'rules_enforcer');
  assert.equal(setup.structuredContent.framework.contractVersion, contractVersion);
  const workflowId = setup.structuredContent.workflowId;

  const rules = await client.callTool({
    name: 'rules_enforcer',
    arguments: {
      projectRoot: packageDir,
      snippet: '<button class="btn">Save</button>',
      targetComponents: ['buttons'],
      workflowId,
    },
  });
  assert.equal(rules.structuredContent.status, 'needs_fix');
  assert.equal(rules.structuredContent.nextTool, 'creative_director');
  assert.equal(rules.structuredContent.framework.contractVersion, contractVersion);

  const validRail = await client.callTool({
    name: 'rules_enforcer',
    arguments: {
      projectRoot: packageDir,
      snippet: '<nav class="navigation-rail modal" aria-label="Primary"></nav>',
      targetComponents: ['navigation-rail'],
    },
  });
  assert.equal(validRail.structuredContent.status, 'pass');

  const invalidNavigation = await client.callTool({
    name: 'rules_enforcer',
    arguments: {
      projectRoot: packageDir,
      snippet: '<nav class="navigation-bar"><a class="active" href="/">Home</a></nav>',
      targetComponents: ['navigation-bar'],
    },
  });
  const semanticIssueIds = invalidNavigation.structuredContent.issues.map((issue) => issue.id);
  assert.ok(semanticIssueIds.includes('nav-needs-label'));
  assert.ok(semanticIssueIds.includes('navigation-bar-marks-current'));

  const creative = await client.callTool({
    name: 'creative_director',
    arguments: {
      projectRoot: packageDir,
      goal: 'Design a responsive settings page with clear navigation and forms.',
      workflowId,
    },
  });
  assert.ok(creative.structuredContent.suggestions.length > 0);
  assert.equal(creative.structuredContent.nextTool, 'page_arcjitect');

  for (const name of ['page_architect', 'page_arcjitect']) {
    const architecture = await client.callTool({
      name,
      arguments: {
        projectRoot: packageDir,
        pageGoal: 'Structure a responsive settings page.',
        components: ['app-bar', 'navigation-rail', 'text-fields', 'buttons'],
        workflowId,
      },
    });
    assert.equal(architecture.structuredContent.stage, name);
    assert.match(architecture.structuredContent.architecture.architecture.skeleton, /<main>/);
    assert.doesNotMatch(architecture.structuredContent.architecture.architecture.skeleton, /role="main"/);
    assert.match(architecture.structuredContent.architecture.architecture.skeleton, /<nav class="navigation-rail" aria-label="Primary">/);
  }

  const navigationBarArchitecture = await client.callTool({
    name: 'page_architect',
    arguments: {
      projectRoot: packageDir,
      pageGoal: 'Structure a compact navigation page.',
      components: ['navigation-bar'],
      viewportTarget: 'compact',
      workflowId,
    },
  });
  const navigationBarSkeleton = navigationBarArchitecture.structuredContent.architecture.architecture.skeleton;
  assert.doesNotMatch(navigationBarSkeleton, /<header>/);
  assert.equal((navigationBarSkeleton.match(/navigation-bar/g) || []).length, 1);

  const syntax = await client.callTool({
    name: 'component_syntax_expert',
    arguments: { projectRoot: packageDir, components: ['buttons'], workflowId },
  });
  assert.equal(syntax.structuredContent.foundCount, 1);
  assert.equal(syntax.structuredContent.contractVersion, contractVersion);
  assert.equal(syntax.structuredContent.nextTool, 'quality_inspector');

  const quality = await client.callTool({
    name: 'quality_inspector',
    arguments: {
      projectRoot: packageDir,
      files: ['README.md'],
      runType: 'quick',
      workflowId,
    },
  });
  assert.ok(['pass', 'warn', 'needs_fix'].includes(quality.structuredContent.status));
  assert.equal(quality.structuredContent.nextTool, null);

  const confined = await client.callTool({
    name: 'quality_inspector',
    arguments: {
      projectRoot: packageDir,
      files: [outsideFile],
      runType: 'quick',
      workflowId,
    },
  });
  assert.deepEqual(confined.structuredContent.filesSkipped, [{
    file: outsideFile,
    reason: 'file is outside projectRoot',
  }]);
  assert.equal(confined.structuredContent.status, 'needs_fix');

  const semanticQuality = await client.callTool({
    name: 'quality_inspector',
    arguments: {
      projectRoot: outsideDir,
      files: ['invalid.html'],
      runType: 'quick',
      workflowId,
    },
  });
  assert.equal(semanticQuality.structuredContent.status, 'needs_fix');
  const qualityIssueIds = semanticQuality.structuredContent.staticFindings
    .flatMap((finding) => finding.issues.map((issue) => issue.id));
  assert.ok(qualityIssueIds.includes('nav-needs-label'));

  const redacted = await client.callTool({
    name: 'quality_inspector',
    arguments: {
      projectRoot: outsideDir,
      files: [],
      runType: 'standard',
      runCommands: true,
      workflowId,
    },
  });
  assert.match(redacted.structuredContent.commandChecks[0].output, /TOKEN=\[REDACTED\]/);
  assert.doesNotMatch(redacted.structuredContent.commandChecks[0].output, /test-secret-value/);

  console.log(`ExpressiveCSS MCP smoke test passed (${expectedTools.length} tools).`);
} finally {
  await client.close();
  await rm(outsideDir, { recursive: true, force: true });
}
