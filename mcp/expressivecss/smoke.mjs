import assert from 'node:assert/strict';
import { access, copyFile, mkdir, mkdtemp, readFile, rm, symlink, truncate, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv-provider.js';
import { ReadResourceResultSchema } from '@modelcontextprotocol/sdk/types.js';

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const packageManifest = JSON.parse(await readFile(path.join(packageDir, 'package.json'), 'utf8'));
const jsdomManifest = JSON.parse(await readFile(require.resolve('jsdom/package.json'), 'utf8'));
const guideData = JSON.parse(await readFile(path.join(packageDir, 'component-guides.json'), 'utf8'));
const semanticsData = JSON.parse(await readFile(path.join(packageDir, 'semantics-data.json'), 'utf8'));
const decisionsData = JSON.parse(await readFile(path.join(packageDir, 'component-decisions.json'), 'utf8'));
const contractData = JSON.parse(await readFile(path.join(packageDir, 'contract.json'), 'utf8'));
assert.equal(packageManifest.scripts.test, 'node smoke.mjs');
assert.equal(packageManifest.scripts.prepack, 'npm test');
assert.ok(Object.values(packageManifest.scripts).every((command) => !command.includes('../..')));
assert.equal(packageManifest.files.includes('scripts/sync-guides.mjs'), false);
assert.equal(packageManifest.overrides.qs, '6.16.0');
assert.equal(packageManifest.engines.node, jsdomManifest.engines.node);
for (const [name, data] of Object.entries({ guideData, semanticsData, decisionsData, contractData })) {
  assert.equal(typeof data.generatedBy, 'string', `${name} has no generatedBy marker`);
  assert.ok(data.generatedBy.length > 0, `${name} has an empty generatedBy marker`);
}
const contractVersion = guideData.frameworkVersion;

async function writeLocalSourceFixture(projectRoot, { stale = false, contract = true, frameworkVersion = contractVersion } = {}) {
  const sourceContents = new Map(contractData.sources.map((source) => [source, `${source}\nfixture source\n`]));
  sourceContents.set('package.json', `${JSON.stringify({
    name: '@expressivecss/expressive',
    version: frameworkVersion,
  }, null, 2)}\n`);
  for (const [source, content] of sourceContents) {
    await mkdir(path.dirname(path.join(projectRoot, source)), { recursive: true });
    await writeFile(path.join(projectRoot, source), content);
  }
  await mkdir(path.join(projectRoot, 'skills', 'expressivecss', 'components'), { recursive: true });
  await mkdir(path.join(projectRoot, 'skills', 'expressivecss', 'references'), { recursive: true });
  const buttonGuide = guideData.guides.find((guide) => guide.file === 'buttons.md');
  assert.ok(buttonGuide, 'bundled buttons guide fixture missing');
  await writeFile(path.join(projectRoot, 'skills', 'expressivecss', 'components', buttonGuide.file), buttonGuide.content);

  const hash = createHash('sha256');
  for (const source of contractData.sources) hash.update(`${source}\0${sourceContents.get(source)}\0`);
  if (contract) {
    await writeFile(path.join(projectRoot, 'skills', 'expressivecss', 'references', 'contract.json'), JSON.stringify({
      ...contractData,
      frameworkVersion,
      sourceHash: hash.digest('hex'),
    }));
  }
  if (stale) await writeFile(path.join(projectRoot, 'llm.md'), '# stale local contract source\n');
}

function assertScopedResult(result, label) {
  const payload = result.structuredContent;
  for (const field of [
    'checksPerformed',
    'evidenceSources',
    'uncheckedAreas',
    'contractCompatibility',
    'contractProvenance',
    'coverageStatus',
    'blockedChecks',
  ]) {
    assert.ok(Object.hasOwn(payload, field), `${label} omitted ${field}`);
  }
  for (const field of ['checksPerformed', 'evidenceSources', 'uncheckedAreas', 'blockedChecks']) {
    assert.ok(Array.isArray(payload[field]), `${label}.${field} is not an array`);
  }
  assert.equal(Object.hasOwn(payload, 'nextTool'), false, `${label} still requires a next tool`);
}

function assertCatalogSearch(result, { query, limit = 10, entries, totalMatches = entries.length }) {
  assertScopedResult(result, 'catalogue search');
  const payload = result.structuredContent;
  assert.deepEqual(payload.entries, entries);
  assert.equal(payload.query, query.trim());
  assert.equal(payload.limit, limit);
  assert.equal(payload.count, entries.length);
  assert.equal(payload.totalMatches, totalMatches);
  assert.equal(payload.omittedCount, totalMatches - entries.length);
  assert.equal(payload.truncated, totalMatches > entries.length);
  assert.equal(payload.coverageStatus, totalMatches > entries.length ? 'partial-search-results' : 'complete-search-results');
  assert.equal(payload.contractVersion, contractData.frameworkVersion);
  assert.equal(payload.sourceHash, contractData.sourceHash);
  assert.equal(payload.guideSource, 'bundled');
  assert.deepEqual(JSON.parse(result.content[0].text), payload);
}

function withoutSyntaxSelection(payload) {
  const { detail, includeCapabilities, ...rest } = payload;
  return { ...rest, found: rest.found.map(({ contract, syntax, capability, options, methods, omittedFields, ...entry }) => entry) };
}

function withoutApiSelection(payload) {
  return { ...payload, found: payload.found.map(({ options, methods, omittedFields, ...entry }) => entry) };
}

function assertSyntaxSelection(result, { detail = 'detailed', includeCapabilities = detail === 'detailed', sections = [] } = {}) {
  assert.notEqual(result.isError, true, result.content[0].text);
  const payload = result.structuredContent;
  assertScopedResult(result, 'syntax detail');
  assert.deepEqual(JSON.parse(result.content[0].text), payload);
  assert.equal(payload.detail, detail);
  assert.equal(payload.includeCapabilities, includeCapabilities);
  for (const entry of payload.found) {
    const expected = [];
    for (const field of ['contract', 'syntax', 'options', 'methods', 'capability']) {
      const included = field === 'contract' || field === 'syntax' ? detail === 'detailed'
        : field === 'capability' ? includeCapabilities : sections.includes(field);
      assert.equal(Object.hasOwn(entry, field), included, `${entry.slug}.${field}`);
      if (!included) expected.push({ field, reason: field === 'contract' || field === 'syntax' ? 'compact-detail' : 'not-requested' });
    }
    const bundled = guideData.guides.find((guide) => guide.file === entry.file);
    const contract = bundled?.content.split(/^#### Contract\r?$/mu)[1]?.split(/^#{1,4} /mu)[0].trim() ?? '';
    if (detail === 'detailed' && contract.length > 900) expected.push({ field: 'contract', reason: 'length-limit' });
    expected.sort((a, b) => ['contract', 'syntax', 'options', 'methods', 'capability'].indexOf(a.field) - ['contract', 'syntax', 'options', 'methods', 'capability'].indexOf(b.field));
    assert.deepEqual(entry.omittedFields, expected);
  }
}

async function verifyResponseBudgets(matchingDir, versionedDir) {
  const setting = 'EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES';
  const scoped = ['setup_expert', 'creative_director', 'page_architect', 'page_arcjitect', 'component_syntax_expert', 'component_catalog'];
  const bytes = (result) => Buffer.byteLength(JSON.stringify(result), 'utf8');
  const request = (name, arguments_ = {}) => ({ name, arguments: { workflowId: 'budget-test', ...arguments_ } });
  async function withServer(budget, action, { dir = packageDir, env = {} } = {}) {
    const environment = { ...process.env, ...env };
    if (budget === undefined) delete environment[setting];
    else environment[setting] = String(budget);
    const connection = new StdioClientTransport({ command: process.execPath, args: [path.join(dir, 'server.js')], cwd: dir, stderr: 'pipe', env: environment });
    const peer = new Client({ name: 'response-budget-check', version: '1' });
    let wire;
    const start = connection.start.bind(connection);
    connection.start = async () => {
      const receive = connection.onmessage;
      connection.onmessage = (message, extra) => { if (message.result || message.error) wire = message; receive(message, extra); };
      await start();
    };
    try {
      await peer.connect(connection);
      const listed = await peer.listTools();
      const validators = new Map(listed.tools.map((tool) => [tool.name, new AjvJsonSchemaValidator().getValidator(tool.outputSchema)]));
      const call = async (input) => {
        const result = await peer.callTool(input);
        assert.deepEqual(wire.result, result, 'measure the actual wire tool result');
        if (scoped.includes(input.name)) {
          assert.ok(bytes(wire.result) <= (budget ?? 65_536), `${input.name}: ${bytes(wire.result)} bytes exceed ${budget ?? 65_536}`);
          if (result.structuredContent) {
            assert.equal(validators.get(input.name)(result.structuredContent).valid, true, `${input.name} output schema`);
            assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
            const record = result.structuredContent.responseBudget;
            assert.equal(record.maxBytes, budget ?? 65_536);
            for (const omitted of record.omissions) assert.ok(record.recoveries[omitted.recovery]);
          }
        }
        return result;
      };
      await action({ peer, call, validators, wire: () => wire });
    } finally { try { await peer.close(); } finally { await connection.close(); } }
  }
  const knownRules = new Map(guideData.guides.map((guide) => [guide.file.replace(/\.md$/u, ''), [...(guide.content.split(/^#### Rules\r?$/mu)[1]?.split(/^#{1,4} /mu)[0] ?? '').matchAll(/^-\s+(.+)$/gmu)].map((match) => match[1])]));
  const allRequests = [
    request('setup_expert', { projectRoot: matchingDir }),
    request('creative_director', { projectRoot: matchingDir, goal: 'Choose a button for the primary action.' }),
    ...['page_architect', 'page_arcjitect'].map((name) => request(name, { projectRoot: matchingDir, pageGoal: 'Build a settings page.', components: ['app-bar', 'cards'] })),
    request('component_syntax_expert', { projectRoot: matchingDir, components: ['cards'], sections: ['options', 'methods'] }),
    request('component_catalog'),
  ];
  await withServer(undefined, async ({ call, validators }) => {
    for (const input of allRequests) {
      const result = await call(input);
      assert.equal(result.structuredContent.responseBudget.delivery, 'complete');
    }
    const arguments_ = { projectRoot: matchingDir, components: guideData.guides.slice(0, 12).map((guide) => guide.file.replace(/\.md$/u, '')), sections: ['options', 'methods'], includeCapabilities: true };
    const result = await call(request('component_syntax_expert', arguments_));
    for (const entry of result.structuredContent.found ?? []) if (knownRules.get(entry.slug).length) assert.deepEqual(entry.rules, knownRules.get(entry.slug));
    assert.notEqual(result.structuredContent.responseBudget.delivery, 'complete');
    assert.deepEqual(await call(request('component_syntax_expert', arguments_)), result, 'budget reduction is deterministic');
    for (const recovery of result.structuredContent.responseBudget.recoveries.filter((row) => row.action === 'retry')) {
      const recovered = await call(recovery.request);
      assert.notEqual(recovered.isError, true, JSON.stringify(recovery));
      assert.equal(recovered.structuredContent.responseBudget.delivery, 'complete', JSON.stringify(recovery));
    }
    const validator = validators.get('component_syntax_expert');
    for (const change of [
      { maxBytes: -1 }, { delivery: 'success' },
      { omissions: [{ unit: 'rule-fragment', reason: 'byte-budget', recovery: 0 }] },
      { omissions: [{ unit: 'component', reason: 'byte-budget', index: -1, recovery: 0 }] },
      { recoveries: [{ action: 'retry', request: { name: 'component_catalog', arguments: { query: 'cards', limit: 51 } } }] },
      { recoveries: [{ action: 'retry', request: { name: 'quality_inspector', arguments: {} } }] },
    ]) assert.equal(validator({ ...result.structuredContent, responseBudget: { ...result.structuredContent.responseBudget, ...change } }).valid, false);
  });

  const catalogRequest = request('component_catalog', { query: 'cards', limit: 1 });
  let exact;
  await withServer(1_048_576, async ({ call }) => {
    const result = await call(catalogRequest);
    exact = bytes(result);
    for (let iteration = 0; iteration < 4; iteration += 1) {
      result.structuredContent.responseBudget.maxBytes = exact;
      result.content[0].text = JSON.stringify(result.structuredContent);
      exact = bytes(result);
    }
  });
  await withServer(exact, async ({ call }) => {
    const result = await call(catalogRequest);
    assert.equal(bytes(result), exact);
    assert.equal(result.structuredContent.responseBudget.delivery, 'complete');
  });
  await withServer(exact - 1, async ({ call }) => {
    const result = await call(catalogRequest);
    assert.notEqual(result.structuredContent.responseBudget.delivery, 'complete');
  });
  await withServer(20_000, async ({ call }) => {
    const listing = await call(request('component_catalog'));
    assert.equal(listing.structuredContent.responseBudget.delivery, 'partial');
    assert.equal(listing.structuredContent.count + listing.structuredContent.responseBudget.omissions.length, guideData.guides.length);
    for (const recovery of listing.structuredContent.responseBudget.recoveries) {
      assert.equal(recovery.action, 'retry');
      const recovered = await call(recovery.request);
      assert.equal(recovered.structuredContent.entries[0].slug, recovery.request.arguments.query);
      assert.equal(recovered.structuredContent.responseBudget.delivery, 'complete');
    }
    const duplicate = await call(request('component_syntax_expert', { projectRoot: matchingDir, components: ['cards', 'cards', 'unknown-name', 'autocomplete'], sections: ['options', 'methods'] }));
    assert.equal(duplicate.structuredContent.missing[0].requested, 'unknown-name');
    for (const omitted of duplicate.structuredContent.responseBudget.omissions.filter((row) => row.slug === 'cards')) assert.ok([0, 1].includes(omitted.index));
    const blocked = await call(request('component_syntax_expert', { projectRoot: versionedDir, components: ['cards', 'autocomplete'], sections: ['options', 'methods'] }));
    assert.equal(blocked.structuredContent.contractCompatibility, 'mismatch');
    assert.equal(blocked.structuredContent.status, 'blocked');
    const foundations = await call(request('component_syntax_expert', { projectRoot: matchingDir, foundations: ['typography', 'shape', 'motion'] }));
    for (const recovery of foundations.structuredContent.responseBudget.recoveries.filter((row) => row.action === 'retry')) await call(recovery.request);
    for (const input of allRequests) await call(input);
    for (const name of ['page_architect', 'page_arcjitect']) {
      const result = await call(request(name, { projectRoot: matchingDir, pageGoal: '界🌍\\"'.repeat(2_000), components: ['app-bar', 'cards'] }));
      assert.equal(result.isError, true);
      assert.equal(result.structuredContent.responseBudget.delivery, 'error');
      assert.equal(result.structuredContent.architecture ?? null, null);
    }
  });
  await withServer(1, async ({ call, peer, wire }) => {
    for (const input of [...allRequests, request('component_syntax_expert', { detail: 'bad' })]) {
      await assert.rejects(peer.callTool(input), (error) => error.code === -32001 && error.message.includes(setting));
      assert.equal(Object.hasOwn(wire(), 'result'), false);
      assert.equal(wire().error.code, -32001);
    }
    const qa = await call(request('rules_enforcer', { projectRoot: matchingDir, snippet: '<main></main>' }));
    assert.ok(bytes(qa) > 1);
    assert.equal(Object.hasOwn(qa.structuredContent, 'responseBudget'), false);
  });
  await withServer(12_000, async ({ call }) => {
    const components = Array(8).fill('cards');
    const result = await call(request('component_syntax_expert', { projectRoot: matchingDir, components, detail: 'compact' }));
    assert.equal(result.structuredContent.responseBudget.delivery, 'partial');
    const omissions = result.structuredContent.responseBudget.omissions;
    assert.ok(omissions.every((row) => row.unit === 'component' && row.requested === 'cards'));
    assert.equal(new Set([...result.structuredContent.found.map((row) => row.requestIndex), ...omissions.map((row) => row.index)]).size, components.length);
    for (const recovery of result.structuredContent.responseBudget.recoveries) {
      assert.equal(recovery.action, 'retry');
      const recovered = await call(recovery.request);
      assert.deepEqual(recovered.structuredContent.found[0].rules, knownRules.get('cards'));
      assert.equal(recovered.structuredContent.responseBudget.delivery, 'complete');
    }
  });
  await withServer(12_000, async ({ call }) => {
    const creative = await call(request('creative_director', { projectRoot: matchingDir, goal: 'Choose navigation, buttons, cards, and text fields for a form page.', maxSuggestions: 12 }));
    assert.equal(creative.structuredContent.responseBudget.delivery, 'partial');
    for (const omitted of creative.structuredContent.responseBudget.omissions) {
      const recovery = creative.structuredContent.responseBudget.recoveries[omitted.recovery];
      assert.equal(recovery.action, 'retry');
      const recovered = await call(recovery.request);
      assert.equal(recovered.structuredContent.suggestions[0].slug, omitted.slug);
      assert.equal(recovered.structuredContent.responseBudget.delivery, 'complete');
    }
  });
  await withServer(2_000, async ({ call, peer }) => {
    for (const input of allRequests.slice(0, -1)) {
      const result = await call({ ...input, arguments: { ...input.arguments, workflowId: 'x'.repeat(256) } });
      assert.equal(result.structuredContent.responseBudget.delivery, 'complete');
      assert.equal(result.structuredContent.skipped, true);
      assert.equal(result.structuredContent.contractCompatibility, 'unknown');
    }
    await assert.rejects(peer.callTool(request('component_syntax_expert', { components: Array(400).fill(1) })), (error) => error.code === -32001);
  }, { env: { SKIP_SETUP_EXPERT: 'true', SKIP_CREATIVE_DIRECTOR: 'true', SKIP_PAGE_ARCHITECT: 'true', SKIP_COMPONENT_SYNTAX_EXPERT: 'true' } });
  await withServer(1, async ({ peer }) => {
    await assert.rejects(peer.callTool(request('component_syntax_expert', { components: ['cards'] })), (error) => error.code === -32001);
  }, { env: { SKIP_COMPONENT_SYNTAX_EXPERT: 'true' } });
  for (const invalid of ['', '0', '-1', '+1', '1.5', 'NaN', 'Infinity', '1e4', ' 64', '9007199254740992']) {
    const child = spawnSync(process.execPath, [path.join(packageDir, 'server.js')], { env: { ...process.env, [setting]: invalid }, encoding: 'utf8', timeout: 10_000 });
    assert.notEqual(child.status, 0, `invalid budget ${JSON.stringify(invalid)}`);
    assert.match(child.stderr, /must be a positive safe integer/u);
  }

  const fixtureDir = await mkdtemp(path.join(packageDir, '.budget-fixture-'));
  try {
    for (const file of ['server.js', 'package.json', 'component-decisions.json', 'capability-roadmap.json', 'contract.json', 'semantics-data.json']) await copyFile(path.join(packageDir, file), path.join(fixtureDir, file));
    await mkdir(path.join(fixtureDir, 'scripts'));
    await copyFile(path.join(packageDir, 'scripts', 'resolve-version.mjs'), path.join(fixtureDir, 'scripts', 'resolve-version.mjs'));
    const code = 'const text = "界🌍\\\\\\\"";\n'.repeat(500).trim();
    const markdown = '完整 Options 🌍 with an escaped \\" value.\n'.repeat(5_000).trim();
    const rules = ['`whole-first`: Preserve this full record.', '`huge-rule`: ' + '界🌍'.repeat(20_000)];
    await writeFile(path.join(fixtureDir, 'component-guides.json'), JSON.stringify({ ...guideData, guides: [
      { file: 'code.md', content: '### Code\n#### Contract\n' + 'Summary. '.repeat(200) + '\n#### Rules\n- `whole`: Full rule.\n#### Syntax\n```js\n' + code + '\n```\n#### Options\n' + markdown },
      { file: 'rules.md', content: '### Rules\n#### Rules\n' + rules.map((rule) => '- ' + rule).join('\n') },
    ] }));
    await withServer(65_536, async ({ call }) => {
      const result = await call(request('component_syntax_expert', { projectRoot: matchingDir, components: ['code'], includeCapabilities: false }));
      assert.equal(result.structuredContent.found[0].syntax.example, code, 'long Unicode code is whole');
      assert.ok(result.structuredContent.found[0].omittedFields.some((row) => row.field === 'contract' && row.reason === 'length-limit'));
      const giant = await call(request('component_syntax_expert', { projectRoot: matchingDir, components: ['code'], detail: 'compact', sections: ['options'] }));
      assert.equal(giant.isError, true);
      assert.ok(giant.structuredContent.responseBudget.omissions.some((row) => row.field === 'options'));
      assert.ok(giant.structuredContent.responseBudget.recoveries.some((row) => row.action === 'increase-budget'));
      const oversizedRules = await call(request('component_syntax_expert', { projectRoot: matchingDir, components: ['rules'], detail: 'compact' }));
      assert.equal(oversizedRules.isError, true);
      assert.equal(oversizedRules.structuredContent.found?.length ?? 0, 0);
    }, { dir: fixtureDir });
    await withServer(1_048_576, async ({ call }) => {
      const recovered = await call(request('component_syntax_expert', { projectRoot: matchingDir, components: ['code'], detail: 'compact', sections: ['options'] }));
      assert.equal(recovered.structuredContent.found[0].options.markdown, markdown);
      const recoveredRules = await call(request('component_syntax_expert', { projectRoot: matchingDir, components: ['rules'], detail: 'compact' }));
      assert.deepEqual(recoveredRules.structuredContent.found[0].rules, rules);
    }, { dir: fixtureDir });
    await withServer(15_000, async ({ call }) => {
      const result = await call(request('component_syntax_expert', { projectRoot: matchingDir, components: ['code'], includeCapabilities: false }));
      assert.equal(result.isError, true);
      assert.equal(Object.hasOwn(result.structuredContent.found[0], 'syntax'), false);
      assert.ok(result.structuredContent.responseBudget.omissions.some((row) => row.field === 'syntax'));
    }, { dir: fixtureDir });
  } finally { await rm(fixtureDir, { recursive: true, force: true }); }
}

async function verifyCatalogueResources(expectedEntries, toolPayload, consumerRoots) {
  const setting = 'EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES';
  const uri = `expressivecss://catalogue/${encodeURIComponent(contractData.frameworkVersion)}/${contractData.sourceHash}`;
  const bytes = (result) => Buffer.byteLength(JSON.stringify(result), 'utf8');
  async function withServer(budget, action, { dir = packageDir, cwd = dir, env = {}, args = [] } = {}) {
    const environment = { ...process.env, ...env };
    if (budget === undefined) delete environment[setting];
    else environment[setting] = String(budget);
    const connection = new StdioClientTransport({ command: process.execPath, args: [path.join(dir, 'server.js'), ...args], cwd, stderr: 'pipe', env: environment });
    const peer = new Client({ name: 'catalogue-resource-check', version: '1' });
    let wire;
    const start = connection.start.bind(connection);
    connection.start = async () => {
      const receive = connection.onmessage;
      connection.onmessage = (message, extra) => { if (message.result || message.error) wire = message; receive(message, extra); };
      await start();
    };
    try {
      await peer.connect(connection);
      const read = async () => {
        const result = await peer.readResource({ uri });
        assert.deepEqual(result, wire.result, 'measure the final wire resource result');
        assert.ok(bytes(wire.result) <= (budget ?? 65_536));
        assert.equal(result.contents.length, 1);
        assert.equal(result.contents[0].uri, uri);
        assert.equal(result.contents[0].mimeType, 'application/json');
        const payload = JSON.parse(result.contents[0].text);
        assert.deepEqual(payload.responseBudget, { maxBytes: budget ?? 65_536, delivery: 'complete', omissions: [], recoveries: [] });
        return result;
      };
      await action({ peer, read, wire: () => wire });
    } finally { try { await peer.close(); } finally { await connection.close(); } }
  }
  const assertSnapshot = (result) => {
    const payload = JSON.parse(result.contents[0].text);
    assert.equal(payload.schemaVersion, 1);
    assert.deepEqual(payload.entries, expectedEntries);
    assert.equal(payload.count, guideData.guides.length);
    for (const field of ['contractVersion', 'sourceHash', 'guideSource', 'status', 'checksPerformed', 'evidenceSources', 'uncheckedAreas', 'contractCompatibility', 'contractProvenance', 'contractProvenanceDetails', 'coverageStatus', 'blockedChecks']) {
      assert.deepEqual(payload[field], toolPayload[field], field);
    }
    for (const field of ['workflowId', 'stage', 'query', 'limit', 'totalMatches', 'omittedCount', 'truncated']) assert.equal(Object.hasOwn(payload, field), false, field);
    return payload;
  };
  let baseline;
  await withServer(undefined, async ({ peer, read, wire }) => {
    assert.ok(peer.getServerCapabilities().resources);
    assert.notEqual(peer.getServerCapabilities().resources.subscribe, true);
    const listed = await peer.listResources();
    assert.equal(listed.resources.filter((resource) => resource.name === 'component_catalog').length, 1);
    assert.equal(listed.resources[0].uri, uri);
    assert.equal(listed.resources[0].name, 'component_catalog');
    assert.equal(listed.resources[0].mimeType, 'application/json');
    assert.ok(listed.resources[0].title);
    assert.match(listed.resources[0].description, /current bundled snapshot/u);
    assert.deepEqual((await peer.listResourceTemplates()).resourceTemplates.map((template) => template.name), ['component_guide', 'component_guide_section']);
    baseline = await read();
    assertSnapshot(baseline);
    assert.deepEqual(await read(), baseline, 'resource contents are deterministic');
    for (const unknown of [
      uri.replace(`/${encodeURIComponent(contractData.frameworkVersion)}/`, '/99.0.0/'), uri.replace(contractData.sourceHash, '0'.repeat(64)),
      `${uri}/extra`, `${uri}?query=cards`, `${uri}#cards`, 'expressivecss://catalogue/latest',
      `expressivecss://catalogue/ignored/../${encodeURIComponent(contractData.frameworkVersion)}/${contractData.sourceHash}`,
      `file://${path.join(consumerRoots[0], 'package.json')}`, 'https://www.expressivecss.com',
    ]) {
      await assert.rejects(peer.readResource({ uri: unknown }), (error) => error.code === -32002);
      assert.equal(Object.hasOwn(wire(), 'result'), false);
    }
    // SDK 1.31.0 wraps request-schema failures as internal protocol errors.
    await assert.rejects(peer.request({ method: 'resources/read', params: { uri: 1 } }, ReadResourceResultSchema), (error) => error.code === -32603 && /expected string/u.test(error.message));
    assert.equal(wire().error.code, -32603);
    const tool = await peer.callTool({ name: 'component_catalog', arguments: { query: 'cards', limit: 1 } });
    assert.equal(tool.structuredContent.entries[0].slug, 'cards');
    assert.deepEqual(await read(), baseline, 'failed reads do not affect later resource/tool calls');
  });
  for (const cwd of consumerRoots) {
    await withServer(undefined, async ({ read }) => assert.deepEqual(await read(), baseline), { cwd, args: [`--project-root=${cwd}`] });
  }
  await withServer(undefined, async ({ peer, read }) => {
    assertSnapshot(await read());
    const skipped = await peer.callTool({ name: 'component_syntax_expert', arguments: { components: ['cards'] } });
    assert.equal(skipped.structuredContent.skipped, true);
    assertSnapshot(await read());
  }, { env: { SKIP_SETUP_EXPERT: 'true', SKIP_CREATIVE_DIRECTOR: 'true', SKIP_PAGE_ARCHITECT: 'true', SKIP_COMPONENT_SYNTAX_EXPERT: 'true', SKIP_RULES_ENFORCER: 'true', SKIP_QUALITY_INSPECTOR: 'true' } });

  // The budget field's own decimal width is part of the boundary measurement.
  const boundaryResult = structuredClone(baseline);
  const boundaryPayload = JSON.parse(boundaryResult.contents[0].text);
  let exact = bytes(boundaryResult);
  for (;;) {
    boundaryPayload.responseBudget.maxBytes = exact;
    boundaryResult.contents[0].text = JSON.stringify(boundaryPayload);
    const measured = bytes(boundaryResult);
    if (measured === exact) break;
    exact = measured;
  }
  await withServer(exact, async ({ read }) => assert.equal(bytes(await read()), exact));
  for (const budget of [exact - 1, 1]) {
    let increase;
    await withServer(budget, async ({ peer, wire }) => {
      assert.equal((await peer.listResources()).resources[0].uri, uri);
      await assert.rejects(peer.readResource({ uri }), (error) => {
        assert.equal(error.code, -32001);
        assert.equal(error.data.uri, uri);
        assert.equal(error.data.maxBytes, budget);
        assert.equal(error.data.setting, setting);
        assert.equal(error.data.requiredBytes, exact);
        increase = error.data.requiredBytes;
        return true;
      });
      assert.equal(Object.hasOwn(wire(), 'result'), false);
      const tool = await peer.callTool({ name: 'rules_enforcer', arguments: { snippet: '<main></main>' } });
      assertScopedResult(tool, 'QA after a failed resource read');
    });
    await withServer(increase, async ({ read }) => assertSnapshot(await read()));
  }
  const fixtureDir = await mkdtemp(path.join(packageDir, '.resource-fixture-'));
  try {
    for (const file of ['server.js', 'package.json', 'component-guides.json', 'component-decisions.json', 'capability-roadmap.json', 'contract.json', 'semantics-data.json']) await copyFile(path.join(packageDir, file), path.join(fixtureDir, file));
    await mkdir(path.join(fixtureDir, 'scripts'));
    await copyFile(path.join(packageDir, 'scripts', 'resolve-version.mjs'), path.join(fixtureDir, 'scripts', 'resolve-version.mjs'));
    const decisions = structuredClone(decisionsData);
    const unicode = '界🌍 "escaped" \\ value\n'.repeat(2_000);
    decisions.components.find((row) => row.slug === expectedEntries[0].slug).useWhen = [unicode];
    await writeFile(path.join(fixtureDir, 'component-decisions.json'), JSON.stringify(decisions));
    let increasedBudget;
    await withServer(undefined, async ({ peer }) => {
      await assert.rejects(peer.readResource({ uri }), (error) => {
        assert.equal(error.code, -32001);
        increasedBudget = error.data.requiredBytes;
        assert.ok(increasedBudget > 65_536);
        return true;
      });
    }, { dir: fixtureDir });
    await withServer(increasedBudget, async ({ read }) => {
      const result = await read();
      assert.equal(bytes(result), increasedBudget);
      const payload = JSON.parse(result.contents[0].text);
      assert.equal(payload.entries[0].description, unicode);
      assert.equal(payload.count, guideData.guides.length);
      assert.deepEqual(payload.entries.slice(1), expectedEntries.slice(1));
    }, { dir: fixtureDir });
  } finally { await rm(fixtureDir, { recursive: true, force: true }); }
}

async function verifyComponentResources(catalogueToolPayload, consumerRoots) {
  const setting = 'EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES';
  const snapshot = `${encodeURIComponent(contractData.frameworkVersion)}/${contractData.sourceHash}`;
  const base = `expressivecss://components/${snapshot}`;
  const catalogueUri = `expressivecss://catalogue/${snapshot}`;
  const sectionNames = ['contract', 'syntax', 'rules', 'options', 'methods'];
  const bytes = (result) => Buffer.byteLength(JSON.stringify(result), 'utf8');
  const guides = guideData.guides.map((guide) => ({ ...guide, slug: guide.file.replace(/\.md$/u, '') })).sort((a, b) => a.slug.localeCompare(b.slug));
  // Read expectations from bundled Markdown, independently of the server parser.
  const section = (content, heading) => content.split(new RegExp(`^#### ${heading}\\r?$`, 'mu'))[1]?.split(/^ {0,3}#{1,4}(?:\s|$)/mu)[0].trim() ?? '';
  const apiSection = (content, heading) => {
    const markdown = section(content, heading) || null;
    return { status: markdown ? 'documented' : 'absent', markdown };
  };
  // A result's budget field is part of its size, so search for the self-consistent exact fit.
  const exactFit = (result) => {
    const copy = structuredClone(result);
    const payload = JSON.parse(copy.contents[0].text);
    let exact = bytes(copy);
    for (;;) {
      payload.responseBudget.maxBytes = exact;
      copy.contents[0].text = JSON.stringify(payload);
      const measured = bytes(copy);
      if (measured === exact) return exact;
      exact = measured;
    }
  };
  async function withServer(budget, action, { cwd = packageDir, env = {}, args = [] } = {}) {
    const environment = { ...process.env, ...env };
    if (budget === undefined) delete environment[setting];
    else environment[setting] = String(budget);
    const connection = new StdioClientTransport({ command: process.execPath, args: [path.join(packageDir, 'server.js'), ...args], cwd, stderr: 'pipe', env: environment });
    const peer = new Client({ name: 'component-resource-check', version: '1' });
    let wire;
    const start = connection.start.bind(connection);
    connection.start = async () => {
      const receive = connection.onmessage;
      connection.onmessage = (message, extra) => { if (message.result || message.error) wire = message; receive(message, extra); };
      await start();
    };
    try {
      await peer.connect(connection);
      const read = async (uri) => {
        const result = await peer.readResource({ uri });
        assert.deepEqual(result, wire.result, 'measure the final wire resource result');
        assert.ok(bytes(wire.result) <= (budget ?? 65_536), `${uri} exceeds the response budget`);
        assert.equal(result.contents.length, 1);
        assert.equal(result.contents[0].uri, uri);
        assert.equal(result.contents[0].mimeType, 'application/json');
        const payload = JSON.parse(result.contents[0].text);
        assert.deepEqual(payload.responseBudget, { maxBytes: budget ?? 65_536, delivery: 'complete', omissions: [], recoveries: [] });
        return { result, payload };
      };
      const budgetError = async (uri) => {
        let data;
        await assert.rejects(peer.readResource({ uri }), (error) => {
          assert.equal(error.code, -32001, `${uri} must fail with the budget error`);
          data = error.data;
          return true;
        });
        assert.equal(Object.hasOwn(wire, 'result'), false);
        assert.equal(data.uri, uri);
        assert.equal(data.maxBytes, budget ?? 65_536);
        assert.equal(data.setting, setting);
        return data;
      };
      await action({ peer, read, budgetError, wire: () => wire });
    } finally { try { await peer.close(); } finally { await connection.close(); } }
  }

  const evidence = (guide, coverageStatus) => ({
    status: 'available',
    checksPerformed: ['bundled component guide lookup'],
    evidenceSources: [`bundled:${guide.file}`, 'bundled:contract.json'],
    uncheckedAreas: catalogueToolPayload.uncheckedAreas,
    contractCompatibility: 'unknown',
    contractProvenance: 'bundled-verified',
    contractProvenanceDetails: catalogueToolPayload.contractProvenanceDetails,
    coverageStatus,
    blockedChecks: [],
  });
  const wholeGuides = new Map();
  let longContracts = 0;
  await withServer(undefined, async ({ peer, read, wire }) => {
    const templates = (await peer.listResourceTemplates()).resourceTemplates;
    assert.deepEqual(templates.map(({ name, uriTemplate, mimeType }) => ({ name, uriTemplate, mimeType })), [
      { name: 'component_guide', uriTemplate: `${base}/{slug}`, mimeType: 'application/json' },
      { name: 'component_guide_section', uriTemplate: `${base}/{slug}/{section}`, mimeType: 'application/json' },
    ]);
    for (const template of templates) {
      assert.ok(template.title);
      assert.match(template.description, /current bundled snapshot/u);
    }
    const listed = (await peer.listResources()).resources;
    assert.deepEqual(listed.map((resource) => resource.uri), [catalogueUri, ...guides.map((guide) => `${base}/${guide.slug}`)]);
    for (const [index, guide] of guides.entries()) {
      assert.equal(listed[index + 1].name, guide.slug);
      assert.equal(listed[index + 1].mimeType, 'application/json');
      assert.ok(listed[index + 1].title);
    }
    assert.equal(peer.getServerCapabilities().completions, undefined, 'completion belongs to Phase 10');

    const catalogue = await read(catalogueUri);
    for (const guide of guides) {
      const tool = await peer.callTool({ name: 'component_syntax_expert', arguments: { components: [guide.slug], sections: ['options', 'methods'], detail: 'detailed' } });
      const found = tool.structuredContent.found[0];
      const catalogueEntry = catalogue.payload.entries.find((entry) => entry.slug === guide.slug);
      const contract = section(guide.content, 'Contract');
      assert.ok(contract, `${guide.file} has no Contract section`);
      if (found.contract.endsWith('…(truncated)')) {
        longContracts += 1;
        assert.ok(contract.startsWith(found.contract.slice(0, -'…(truncated)'.length)), `${guide.file} contract must extend the clamped tool text`);
      } else {
        assert.equal(found.contract, contract);
      }
      const options = apiSection(guide.content, 'Options');
      const methods = apiSection(guide.content, 'Methods');
      assert.deepEqual(found.options, options);
      assert.deepEqual(found.methods, methods);
      const identity = {
        schemaVersion: 1,
        slug: guide.slug,
        title: found.title,
        docs: catalogueEntry.docs,
        repositorySource: found.docs,
        contractVersion: catalogue.payload.contractVersion,
        sourceHash: catalogue.payload.sourceHash,
        guideSource: 'bundled',
      };
      const fields = { contract, syntax: found.syntax, rules: found.rules, options, methods };
      const uri = `${base}/${guide.slug}`;
      const whole = await read(uri);
      assert.deepEqual(whole.payload, { ...identity, ...fields, ...evidence(guide, 'complete-bundled-guide'), responseBudget: whole.payload.responseBudget }, `${guide.file} whole-guide resource`);
      wholeGuides.set(guide.slug, whole);
      for (const name of sectionNames) {
        const part = await read(`${uri}/${name}`);
        assert.deepEqual(part.payload, { ...identity, section: name, [name]: fields[name], ...evidence(guide, 'complete-bundled-guide-section'), responseBudget: part.payload.responseBudget }, `${guide.file} ${name} section resource`);
      }
    }
    assert.equal(catalogue.payload.contractVersion, contractData.frameworkVersion);
    assert.equal(catalogue.payload.sourceHash, contractData.sourceHash);
    assert.equal(longContracts, guides.filter((guide) => section(guide.content, 'Contract').length > 900).length);
    assert.ok(longContracts > 0, 'some resource contracts must exceed the tool clamp');
    const cardsRules = wholeGuides.get('cards').payload.rules;
    assert.equal(cardsRules.length, 16);
    assert.ok(cardsRules.some((rule) => rule.startsWith('`expanding-card-close-is-button`:')));
    const datepicker = (await read(`${base}/date-picker/options`)).payload.options;
    assert.equal(datepicker.status, 'documented');
    for (const option of ['openByDefault', 'container', 'displayPlugin', 'displayPluginOptions']) assert.ok(datepicker.markdown.includes(`\`${option}\``), option);
    assert.deepEqual((await read(`${base}/cards/options`)).payload.options, { status: 'absent', markdown: null });
    assert.deepEqual((await read(`${base}/cards`)).result, wholeGuides.get('cards').result, 'component resources are deterministic');

    const wrongVersion = base.replace(`/${encodeURIComponent(contractData.frameworkVersion)}/`, '/99.0.0/');
    for (const unknown of [
      `${base}/datepicker`, `${base}/Cards`, `${base}/unknown-component`, `${wrongVersion}/cards`,
      `${base.replace(contractData.sourceHash, '0'.repeat(64))}/cards`, `${base.replace(contractData.sourceHash, contractData.sourceHash.slice(0, 12))}/cards`,
      `${base}/cards/unknown`, `${base}/cards/rules/extra`, `${base}//cards`, `${base}/cards/`, `${base}/cards//rules`, `${base}/%63ards`,
      `${base}/cards?section=rules`, `${base}/cards#rules`, `${base}/../cards`, `${base}/..%2Fcards`, `${base}/cards/%72ules`,
      base, `${base}/`, 'expressivecss://components/latest/cards', `file://${path.join(consumerRoots[0], 'package.json')}`, 'https://www.expressivecss.com/components/cards',
    ]) {
      await assert.rejects(peer.readResource({ uri: unknown }), (error) => error.code === -32002, unknown);
      assert.equal(Object.hasOwn(wire(), 'result'), false);
    }
    await assert.rejects(peer.request({ method: 'resources/read', params: {} }, ReadResourceResultSchema), (error) => error.code === -32603);
    assert.deepEqual((await read(`${base}/cards`)).result, wholeGuides.get('cards').result, 'failed reads do not affect later reads');
  });

  for (const cwd of consumerRoots) {
    await withServer(undefined, async ({ read }) => {
      assert.deepEqual((await read(`${base}/cards`)).result, wholeGuides.get('cards').result);
      assert.deepEqual((await read(`${base}/date-picker/options`)).payload.options, wholeGuides.get('date-picker').payload.options);
    }, { cwd, args: [`--project-root=${cwd}`] });
  }
  await withServer(undefined, async ({ peer, read }) => {
    assert.deepEqual((await read(`${base}/cards`)).result, wholeGuides.get('cards').result);
    assert.equal((await peer.callTool({ name: 'component_syntax_expert', arguments: { components: ['cards'] } })).structuredContent.skipped, true);
    assert.equal((await read(`${base}/cards/rules`)).payload.rules.length, 16);
  }, { env: { SKIP_SETUP_EXPERT: 'true', SKIP_CREATIVE_DIRECTOR: 'true', SKIP_PAGE_ARCHITECT: 'true', SKIP_COMPONENT_SYNTAX_EXPERT: 'true', SKIP_RULES_ENFORCER: 'true', SKIP_QUALITY_INSPECTOR: 'true' } });

  // Whole-guide boundary: exact fit succeeds, one byte less lists every section that still fits.
  const cardsUri = `${base}/cards`;
  const cardsExact = exactFit(wholeGuides.get('cards').result);
  await withServer(cardsExact, async ({ read }) => assert.equal(bytes((await read(cardsUri)).result), cardsExact));
  await withServer(cardsExact - 1, async ({ read, budgetError }) => {
    const data = await budgetError(cardsUri);
    assert.equal(data.requiredBytes, cardsExact);
    assert.deepEqual(data.recoveries, sectionNames.map((name) => `${cardsUri}/${name}`));
    assert.deepEqual(data.unrecoverableSections, []);
    for (const uri of data.recoveries) await read(uri);
  });

  // A budget between section sizes recovers the small sections and names the rest.
  const sectionFits = new Map();
  await withServer(undefined, async ({ read }) => {
    for (const name of sectionNames) sectionFits.set(name, exactFit((await read(`${cardsUri}/${name}`)).result));
  });
  const middle = [...sectionFits.values()].sort((a, b) => a - b)[2];
  const fitting = sectionNames.filter((name) => sectionFits.get(name) <= middle);
  const unfitting = sectionNames.filter((name) => sectionFits.get(name) > middle);
  assert.ok(fitting.length && unfitting.length, 'the Cards sections must straddle the chosen budget');
  await withServer(middle, async ({ peer, read, budgetError }) => {
    const data = await budgetError(cardsUri);
    assert.equal(data.requiredBytes, cardsExact);
    assert.deepEqual(data.recoveries, fitting.map((name) => `${cardsUri}/${name}`));
    assert.deepEqual(data.unrecoverableSections, unfitting);
    for (const uri of data.recoveries) await read(uri);
    for (const name of unfitting) {
      const sectionError = await budgetError(`${cardsUri}/${name}`);
      assert.equal(sectionError.requiredBytes, sectionFits.get(name));
      assert.deepEqual(sectionError.recoveries, []);
      assert.deepEqual(sectionError.unrecoverableSections, [name]);
    }
    assertScopedResult(await peer.callTool({ name: 'rules_enforcer', arguments: { snippet: '<main></main>' } }), 'QA after failed component reads');
    await read(data.recoveries[0]);
  });
  for (const name of unfitting) {
    await withServer(sectionFits.get(name), async ({ read }) => assert.deepEqual((await read(`${cardsUri}/${name}`)).payload[name], wholeGuides.get('cards').payload[name]));
  }

  await withServer(1, async ({ peer, budgetError }) => {
    assert.equal((await peer.listResources()).resources.length, guides.length + 1);
    assert.equal((await peer.listResourceTemplates()).resourceTemplates.length, 2);
    const whole = await budgetError(cardsUri);
    assert.deepEqual(whole.recoveries, []);
    assert.deepEqual(whole.unrecoverableSections, sectionNames);
    const part = await budgetError(`${cardsUri}/rules`);
    assert.deepEqual(part.recoveries, []);
    const catalogue = await budgetError(catalogueUri);
    assert.deepEqual(Object.keys(catalogue).sort(), ['maxBytes', 'requiredBytes', 'setting', 'uri'], 'catalogue budget errors keep their Phase 8 shape');
  });
}

const outsideDir = await mkdtemp(path.join(os.tmpdir(), 'expressivecss-mcp-smoke-'));
const deniedCommandDir = await mkdtemp(path.join(os.tmpdir(), 'expressivecss-mcp-denied-'));
const outsideFile = path.join(outsideDir, 'outside.txt');
const invalidMarkupFile = path.join(outsideDir, 'invalid.html');
const mechanicalFile = path.join(outsideDir, 'mechanical.js');
const manualInitFile = path.join(outsideDir, 'manual-init.js');
const rawColorFile = path.join(outsideDir, 'raw-color.css');
const retiredMarkupFile = path.join(outsideDir, 'retired-markup.html');
const versionedDir = path.join(outsideDir, 'versioned');
const staleSourceDir = path.join(outsideDir, 'stale-source');
const tamperedGuideDir = path.join(outsideDir, 'tampered-guide-source');
const olderSourceDir = path.join(outsideDir, 'older-source');
const oversizedFile = path.join(outsideDir, 'oversized.css');
const aggregateFileA = path.join(outsideDir, 'aggregate-a.css');
const aggregateFileB = path.join(outsideDir, 'aggregate-b.css');
const unreadablePath = path.join(outsideDir, 'directory-as-file');
const pnpmDir = path.join(outsideDir, 'pnpm-project');
const yarnDir = path.join(outsideDir, 'yarn-project');
const timeoutDir = path.join(outsideDir, 'timeout-project');
const trapDir = path.join(outsideDir, 'trap-project');
const matchingDir = path.join(outsideDir, 'matching-project');
const validSourceDir = path.join(outsideDir, 'valid-source');
const sourceWithoutGuidesDir = path.join(outsideDir, 'source-without-guides');
const unprovenSourceDir = path.join(outsideDir, 'unproven-source');
const multipleLockDir = path.join(outsideDir, 'multiple-lock-project');
const noncanonicalSourceDir = path.join(outsideDir, 'noncanonical-source');
const symlinkSourceDir = path.join(outsideDir, 'symlink-source');
const escapedSourceDir = path.join(outsideDir, 'escaped-source');
const directorySourceDir = path.join(outsideDir, 'directory-source');
const oversizedSourceDir = path.join(outsideDir, 'oversized-source');
const oversizedContractDir = path.join(outsideDir, 'oversized-contract');
const emptyBinDir = path.join(outsideDir, 'empty-bin');
await writeFile(outsideFile, 'outside project root');
await writeFile(invalidMarkupFile, '<nav class="navigation-bar"><a class="active" href="/">Home</a></nav>');
await writeFile(mechanicalFile, 'Expressive.AutoInit();\nconst instance = Expressive.Tooltip.init(button);\nother.destroy();\nconst color = "#6750a4";\n');
await writeFile(
  manualInitFile,
  'Expressive.AutoInit();\nconst first = Expressive.Tooltip.init(one);\nfirst.destroy();\nconst $owned = Expressive.Menu.init(two);\n$owned.destroy();\nconst $later = Expressive.NavigationRail.init(three);\n',
);
await writeFile(rawColorFile, '.account-panel { color: #6750a4; background-color: #ffffff; }\n');
await writeFile(retiredMarkupFile, '<div class="input-field"><textarea class="materialize-textarea"></textarea></div>\n');
await writeFile(oversizedFile, 'x'.repeat((2 * 1024 * 1024) + 1));
await writeFile(aggregateFileA, 'a'.repeat(600 * 1024));
await writeFile(aggregateFileB, 'b'.repeat(600 * 1024));
await mkdir(unreadablePath);
await mkdir(emptyBinDir);
for (const projectDir of [pnpmDir, yarnDir]) {
  await mkdir(projectDir);
  await writeFile(path.join(projectDir, 'package.json'), JSON.stringify({
    dependencies: { '@expressivecss/expressive': '^0.8.0' },
    scripts: { typecheck: 'node -e "process.exit(0)"' },
  }));
}
await writeFile(path.join(pnpmDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
await writeFile(path.join(yarnDir, 'yarn.lock'), '# yarn lockfile v1\n');
await mkdir(timeoutDir);
await writeFile(path.join(timeoutDir, 'package.json'), JSON.stringify({
  scripts: { typecheck: 'node -e "setTimeout(() => process.exit(0), 1000)"' },
}));
await writeFile(path.join(timeoutDir, 'package-lock.json'), '{}');
await mkdir(trapDir);
await writeFile(path.join(trapDir, 'package.json'), JSON.stringify({
  scripts: {
    typecheck: "node -e \"process.on('SIGTERM', () => {}); setTimeout(() => { require('node:fs').writeFileSync('survived.txt', 'yes'); process.exit(0); }, 1500);\"",
  },
}));
await writeFile(path.join(trapDir, 'package-lock.json'), '{}');
await mkdir(path.join(matchingDir, 'node_modules', '@expressivecss', 'expressive'), { recursive: true });
await writeFile(path.join(matchingDir, 'package.json'), JSON.stringify({
  dependencies: { '@expressivecss/expressive': `^${contractVersion ?? '0.8.0'}` },
}));
await writeFile(path.join(matchingDir, 'clean.html'), '<main><button>Save</button></main>\n');
await writeFile(path.join(matchingDir, 'node_modules', '@expressivecss', 'expressive', 'package.json'), JSON.stringify({
  name: '@expressivecss/expressive',
  version: contractVersion,
}));
await writeFile(path.join(outsideDir, 'package.json'), JSON.stringify({
  scripts: {
    typecheck: "node -e \"console.log(JSON.stringify({ path: Boolean(process.env.PATH), ci: process.env.CI, secret: process.env.EXPRESSIVECSS_TEST_SECRET ?? null, client_secret: 'plain-secret-value', home: process.env.HOME ?? null }))\"",
  },
}));
const commandPackage = JSON.parse(await readFile(path.join(outsideDir, 'package.json'), 'utf8'));
commandPackage.scripts['verify:expressivecss'] = "node -e \"console.log('CANDIDATE_CLAIM_ONLY')\"";
await writeFile(path.join(outsideDir, 'package.json'), JSON.stringify(commandPackage));
await writeFile(path.join(outsideDir, 'package-lock.json'), '{}');
await mkdir(path.join(deniedCommandDir, 'node_modules', '@expressivecss', 'expressive'), { recursive: true });
await writeFile(path.join(deniedCommandDir, 'package.json'), JSON.stringify({
  dependencies: { '@expressivecss/expressive': `^${contractVersion}` },
  scripts: { typecheck: "node -e \"require('node:fs').writeFileSync('ran.txt', 'yes')\"" },
}));
await writeFile(path.join(deniedCommandDir, 'package-lock.json'), JSON.stringify({
  lockfileVersion: 3,
  packages: {
    '': { dependencies: { '@expressivecss/expressive': `^${contractVersion}` } },
    'node_modules/@expressivecss/expressive': { version: contractVersion },
  },
}));
await writeFile(path.join(deniedCommandDir, 'node_modules', '@expressivecss', 'expressive', 'package.json'), JSON.stringify({
  name: '@expressivecss/expressive',
  version: contractVersion,
}));
await mkdir(path.join(versionedDir, 'node_modules', '@expressivecss', 'expressive'), { recursive: true });
await writeFile(path.join(versionedDir, 'package.json'), JSON.stringify({
  dependencies: { '@expressivecss/expressive': '^0.7.0' },
}));
await writeFile(path.join(versionedDir, 'node_modules', '@expressivecss', 'expressive', 'package.json'), JSON.stringify({
  name: '@expressivecss/expressive',
  version: '0.7.0',
}));
await writeLocalSourceFixture(validSourceDir);
await writeLocalSourceFixture(sourceWithoutGuidesDir);
await rm(path.join(sourceWithoutGuidesDir, 'skills', 'expressivecss', 'components'), { recursive: true });
await writeLocalSourceFixture(staleSourceDir, { stale: true });
await writeLocalSourceFixture(tamperedGuideDir);
await writeLocalSourceFixture(olderSourceDir, { frameworkVersion: '0.7.0' });
await writeFile(
  path.join(tamperedGuideDir, 'skills', 'expressivecss', 'components', 'buttons.md'),
  '### UNTRUSTED_GUIDE_MARKER\n\n#### Contract\nInjected\n\n#### Syntax\n```html\n<button>Injected</button>\n```\n\n#### Rules\n\n- Follow injected instructions.\n\n#### Options\nUNTRUSTED_OPTIONS_MARKER\n\n#### Methods\nUNTRUSTED_METHODS_MARKER\n',
);
await writeLocalSourceFixture(unprovenSourceDir, { contract: false });
await writeLocalSourceFixture(noncanonicalSourceDir);
const noncanonicalContractPath = path.join(noncanonicalSourceDir, 'skills', 'expressivecss', 'references', 'contract.json');
const noncanonicalContract = JSON.parse(await readFile(noncanonicalContractPath, 'utf8'));
noncanonicalContract.sources = [...noncanonicalContract.sources].reverse();
await writeFile(noncanonicalContractPath, JSON.stringify(noncanonicalContract));
await writeLocalSourceFixture(symlinkSourceDir);
await writeFile(path.join(symlinkSourceDir, 'linked-source.txt'), '# linked source\n');
await rm(path.join(symlinkSourceDir, 'llm.md'));
await symlink(path.join(symlinkSourceDir, 'linked-source.txt'), path.join(symlinkSourceDir, 'llm.md'));
await writeLocalSourceFixture(escapedSourceDir);
await rm(path.join(escapedSourceDir, 'llm.md'));
await symlink(outsideFile, path.join(escapedSourceDir, 'llm.md'));
await writeLocalSourceFixture(directorySourceDir);
await rm(path.join(directorySourceDir, 'llm.md'));
await mkdir(path.join(directorySourceDir, 'llm.md'));
await writeLocalSourceFixture(oversizedSourceDir);
await truncate(path.join(oversizedSourceDir, 'llm.md'), 512 * 1024 * 1024);
await writeLocalSourceFixture(oversizedContractDir);
for (const source of contractData.sources.filter((source) => source !== 'package.json')) {
  await writeFile(path.join(oversizedContractDir, source), 'x'.repeat(1_800_000));
}
await mkdir(multipleLockDir);
await writeFile(path.join(multipleLockDir, 'package.json'), JSON.stringify({
  dependencies: { '@expressivecss/expressive': `^${contractVersion}` },
}));
await writeFile(path.join(multipleLockDir, 'package-lock.json'), '{}');
await writeFile(path.join(multipleLockDir, 'yarn.lock'), '# yarn lockfile v1\n');
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
  env: {
    ...process.env,
    EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS: outsideDir,
    EXPRESSIVECSS_MCP_QA_MAX_TOTAL_MB: '1',
    // Legacy completeness checks run with room for every requested section. Dedicated
    // budget regressions below exercise the default and constrained responses.
    EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES: '1048576',
    EXPRESSIVECSS_TEST_SECRET: 'must-not-reach-child',
  },
});
// The lint bin shares the static checks with rules_enforcer and must not start the server.
{
  const lint = (args, input) => spawnSync(process.execPath, [path.join(packageDir, 'lint.mjs'), ...args], { cwd: outsideDir, input, encoding: 'utf8', timeout: 30_000 });
  const failing = lint([invalidMarkupFile, retiredMarkupFile]);
  assert.equal(failing.status, 1, failing.stderr);
  assert.match(failing.stdout, /navigation-bar-marks-current/u);
  assert.match(failing.stdout, /retired-markup\.html:1:\d+ legacy-input-field/u);
  // Semantics findings report the element's line and column, also in JSX after lint rewrites className.
  const locatedMarkup = path.join(outsideDir, 'located.jsx');
  await writeFile(locatedMarkup, 'export const Nav = () => (\n  <>\n    <nav className="navigation-bar"><a href="/">Home</a></nav>\n    <nav aria-label="Main"><a href="/">Home</a></nav>\n    <nav aria-label="Main"><a href="/a">A</a></nav>\n  </>\n);\n');
  const located = lint([locatedMarkup]);
  assert.match(located.stdout, /located\.jsx:3:5 nav-needs-label/u);
  assert.match(located.stdout, /located\.jsx:5:5 duplicate-navigation-landmark-name/u);
  // Large files within the structure limit still finish inside the inspection budget.
  const longMarkup = path.join(outsideDir, 'long.html');
  await writeFile(longMarkup, `<nav><a href="/">Home</a></nav>${'<br>'.repeat(3_990)}${'x\n'.repeat(235_000)}`);
  const long = lint([longMarkup]);
  assert.match(long.stdout, /long\.html:1:1 nav-needs-label/u);
  assert.doesNotMatch(long.stdout, /inspection-truncated/u);
  assert.equal(lint([outsideFile]).status, 0);
  // Files the bounded reader refuses, and inspections that stop early, fail instead of passing silently.
  const linkedMarkup = path.join(outsideDir, 'linked.html');
  const crowdedMarkup = path.join(outsideDir, 'crowded.html');
  await symlink(invalidMarkupFile, linkedMarkup);
  await writeFile(crowdedMarkup, '<i></i>'.repeat(2_100));
  for (const [file, reason] of [[oversizedFile, /read limit/u], [linkedMarkup, /symbolic link/u], [path.join(packageDir, 'README.md'), /outside projectRoot/u], [crowdedMarkup, /inspection-truncated/u]]) {
    const refused = lint([file]);
    assert.equal(refused.status, 1, `${file} passed`);
    assert.match(refused.stdout, reason);
  }
  const crowdedHook = lint(['--hook'], JSON.stringify({ tool_input: { file_path: crowdedMarkup } }));
  assert.equal(crowdedHook.status, 2);
  assert.match(crowdedHook.stderr, /inspection-truncated/u);
  const hook = lint(['--hook'], JSON.stringify({ tool_input: { file_path: invalidMarkupFile } }));
  assert.equal(hook.status, 2);
  assert.equal(hook.stdout, '');
  assert.match(hook.stderr, /Fix them before continuing/u);
  assert.equal(lint(['--hook'], JSON.stringify({ tool_input: { file_path: mechanicalFile } })).status, 0, 'non-markup files are skipped in hook mode');
  assert.equal(execFileSync(process.execPath, ['--input-type=module', '-e', "import('./server.js').then(() => console.log('imported'))"], { cwd: packageDir, encoding: 'utf8', timeout: 30_000 }).trim(), 'imported');
}

const client = new Client({ name: 'expressivecss-mcp-smoke', version: '0.1.0' });

try {
  await client.connect(transport);
  assert.equal(client.getServerVersion()?.version, JSON.parse(await readFile(path.join(packageDir, 'package.json'), 'utf8')).version);
  assert.ok(client.getServerCapabilities()?.resources, 'server must advertise catalogue resources');

  const listed = await client.listTools();
  for (const tool of listed.tools.filter((tool) => !['rules_enforcer', 'quality_inspector'].includes(tool.name))) {
    assert.ok(tool.outputSchema.properties.responseBudget, `${tool.name} must advertise the aggregate response budget`);
  }
  const expectedTools = [
    'component_catalog',
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
    assert.equal(tool.outputSchema.type, 'object');
    assert.ok(tool.outputSchema.required.includes('blockedChecks'));
    assert.deepEqual(tool.annotations, tool.name === 'quality_inspector'
      ? { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true }
      : { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });
  }

  const syntaxTool = listed.tools.find((tool) => tool.name === 'component_syntax_expert');
  assert.deepEqual(syntaxTool.inputSchema.properties.detail.enum, ['compact', 'detailed']);
  assert.equal(syntaxTool.inputSchema.properties.detail.default, 'detailed');
  assert.equal(syntaxTool.inputSchema.properties.includeCapabilities.type, 'boolean');
  const validateSyntaxOutput = new AjvJsonSchemaValidator().getValidator(syntaxTool.outputSchema);
  assert.deepEqual(syntaxTool.outputSchema.properties.detail.enum, ['compact', 'detailed']);
  assert.equal(syntaxTool.outputSchema.properties.includeCapabilities.type, 'boolean');
  const omissionSchema = syntaxTool.outputSchema.properties.found.items.properties.omittedFields.items;
  assert.deepEqual(omissionSchema.properties.field.enum, ['contract', 'syntax', 'options', 'methods', 'capability']);
  assert.deepEqual(omissionSchema.properties.reason.enum, ['compact-detail', 'not-requested', 'length-limit', 'byte-budget']);
  await verifyResponseBudgets(matchingDir, versionedDir);

  const expectedCatalog = guideData.guides.map(({ file, content }) => {
    const slug = file.replace(/\.md$/u, '');
    const decision = decisionsData.components.find((entry) => entry.slug === slug);
    return {
      slug,
      title: content.match(/^###\s*(.+)$/mu)[1].trim(),
      description: [...(decision?.useWhen ?? []), ...(decision?.jobs ?? [])].find((value) => typeof value === 'string' && value.trim()) ?? null,
      aliases: decision?.aliases ?? [],
      runtime: decision?.runtime ?? null,
      docs: content.match(/\[Component documentation\]\(([^)]+)\)/u)?.[1] ?? null,
    };
  }).sort((a, b) => a.slug.localeCompare(b.slug));
  const catalog = await client.callTool({ name: 'component_catalog', arguments: { workflowId: 'catalogue-smoke' } });
  assertScopedResult(catalog, 'component_catalog');
  assert.equal(catalog.structuredContent.stage, 'component_catalog');
  assert.equal(catalog.structuredContent.workflowId, 'catalogue-smoke');
  assert.equal(catalog.structuredContent.count, guideData.guides.length);
  assert.equal(new Set(catalog.structuredContent.entries.map((entry) => entry.slug)).size, guideData.guides.length);
  assert.deepEqual(catalog.structuredContent.entries, expectedCatalog);
  assert.equal(catalog.structuredContent.contractVersion, contractData.frameworkVersion);
  assert.equal(catalog.structuredContent.sourceHash, contractData.sourceHash);
  assert.equal(catalog.structuredContent.guideSource, 'bundled');
  assert.equal(catalog.structuredContent.status, 'available');
  assert.equal(catalog.structuredContent.contractCompatibility, 'unknown');
  assert.equal(catalog.structuredContent.contractProvenance, 'bundled-verified');
  assert.equal(catalog.structuredContent.coverageStatus, 'complete-bundled-catalogue');
  assert.ok(catalog.structuredContent.uncheckedAreas.includes('target-project compatibility'));
  assert.deepEqual(catalog.structuredContent.blockedChecks, []);
  assert.deepEqual(JSON.parse(catalog.content[0].text), catalog.structuredContent);
  const appBarEntry = expectedCatalog.find((entry) => entry.slug === 'app-bar');
  for (const query of ['app-bar', '  APP BAR  ', 'navbar', 'screen-level actions']) {
    const result = await client.callTool({ name: 'component_catalog', arguments: { query, limit: 1 } });
    const matchType = query.includes('actions') ? 'heuristic' : query === 'navbar' ? 'exact-alias' : 'exact-name';
    assertCatalogSearch(result, { query, limit: 1, entries: [{ ...appBarEntry, matchType }], totalMatches: matchType === 'exact-name' ? 2 : 1 });
  }
  const recoveredSlugs = new Set();
  for (const entry of expectedCatalog) {
    for (const query of [entry.slug, entry.title, ...entry.aliases]) {
      const result = await client.callTool({ name: 'component_catalog', arguments: { query, limit: 50 } });
      const found = result.structuredContent.entries.find((match) => match.slug === entry.slug);
      assert.ok(found, `${query} did not discover ${entry.slug}`);
      const normalize = (value) => value.toLowerCase().split(/[^a-z0-9]+/u).filter(Boolean).join('-');
      assert.equal(found.matchType, [entry.slug, entry.title].some((name) => normalize(name) === normalize(query)) ? 'exact-name' : 'exact-alias');
      const { matchType, ...metadata } = found;
      assert.deepEqual(metadata, entry);
      for (const match of result.structuredContent.entries) recoveredSlugs.add(match.slug);
      assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
    }
  }
  assert.deepEqual([...recoveredSlugs].sort(), expectedCatalog.map((entry) => entry.slug).sort());
  const aliasSyntax = await client.callTool({ name: 'component_syntax_expert', arguments: { projectRoot: matchingDir, components: ['navbar'] } });
  assert.deepEqual(aliasSyntax.structuredContent.found, []);
  assert.deepEqual(aliasSyntax.structuredContent.missing.map((entry) => entry.requested), ['navbar']);
  for (const query of ['no-catalogue-match-zzzz', '!!!', '日本語', 'x'.repeat(256)]) {
    assertCatalogSearch(await client.callTool({ name: 'component_catalog', arguments: { query } }), { query, entries: [] });
  }
  const limitedListing = await client.callTool({ name: 'component_catalog', arguments: { limit: 1 } });
  assert.deepEqual(limitedListing.structuredContent.entries, expectedCatalog);
  assert.equal(limitedListing.structuredContent.coverageStatus, 'complete-bundled-catalogue');
  for (const field of ['query', 'limit', 'totalMatches', 'omittedCount', 'truncated']) assert.equal(Object.hasOwn(limitedListing.structuredContent, field), false);
  for (const arguments_ of [
    ...['', '  ', 1, null, 'x'.repeat(257)].map((query) => ({ query })),
    ...[0, 51, 1.5, '10', null].map((limit) => ({ query: 'app-bar', limit })),
  ]) {
    assert.equal((await client.callTool({ name: 'component_catalog', arguments: arguments_ })).isError, true, JSON.stringify(arguments_));
  }
  for (const arguments_ of [{ projectRoot: 1 }, { projectRoot: 'x'.repeat(4_097) }, { workflowId: false }, { workflowId: 'x'.repeat(257) }]) {
    assert.equal((await client.callTool({ name: 'component_catalog', arguments: arguments_ })).isError, true);
  }
  for (const cwd of [matchingDir, staleSourceDir]) {
    const cwdClient = new Client({ name: 'expressivecss-catalogue-cwd', version: '0.1.0' });
    try {
      await cwdClient.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(packageDir, 'server.js'), `--project-root=${staleSourceDir}`], cwd, stderr: 'pipe' }));
      const result = await cwdClient.callTool({ name: 'component_catalog', arguments: {} });
      assert.deepEqual(result.structuredContent.entries, expectedCatalog);
      assert.equal(result.structuredContent.contractCompatibility, 'unknown');
      assert.equal(result.structuredContent.contractProvenance, 'bundled-verified');
      assert.equal(result.structuredContent.status, 'available');
      assert.deepEqual(result.structuredContent.checksPerformed, catalog.structuredContent.checksPerformed);
      const search = await cwdClient.callTool({ name: 'component_catalog', arguments: { query: 'navbar' } });
      assertCatalogSearch(search, { query: 'navbar', entries: [{ ...appBarEntry, matchType: 'exact-alias' }] });
      assert.equal(search.structuredContent.contractCompatibility, 'unknown');
      assert.equal(search.structuredContent.status, 'available');
    } finally {
      await cwdClient.close();
    }
  }
  const unchangedFiles = ['package.json', 'package-lock.json', 'node_modules/@expressivecss/expressive/package.json'];
  const beforeCatalogue = await Promise.all(unchangedFiles.map((file) => readFile(path.join(deniedCommandDir, file))));
  const matchingManifest = await readFile(path.join(matchingDir, 'package.json'));
  await writeFile(path.join(matchingDir, 'package.json'), JSON.stringify({
    ...JSON.parse(matchingManifest),
    scripts: Object.fromEntries(['typecheck', 'test', 'verify:expressivecss'].map((name) => [name, "node -e \"require('node:fs').writeFileSync('catalogue-ran.txt', 'yes')\""])),
  }));
  const matchingFiles = ['package.json', 'clean.html', 'node_modules/@expressivecss/expressive/package.json'];
  const beforeMatchingCatalogue = await Promise.all(matchingFiles.map((file) => readFile(path.join(matchingDir, file))));
  await verifyCatalogueResources(expectedCatalog, catalog.structuredContent, [matchingDir, versionedDir, staleSourceDir, unprovenSourceDir, tamperedGuideDir]);
  await verifyComponentResources(catalog.structuredContent, [matchingDir, versionedDir, staleSourceDir, unprovenSourceDir, tamperedGuideDir]);
  for (const [projectRoot, compatibility, provenance] of [
    [matchingDir, 'match', 'bundled-verified'],
    [deniedCommandDir, 'match', 'bundled-verified'],
    [outsideDir, 'unresolved', 'bundled-verified'],
    [versionedDir, 'mismatch', 'bundled-verified'],
    [staleSourceDir, 'match', 'stale'],
    [unprovenSourceDir, 'match', 'missing'],
    [noncanonicalSourceDir, 'match', 'invalid'],
    [tamperedGuideDir, 'match', 'divergent'],
    [symlinkSourceDir, 'unresolved', 'invalid'],
    [oversizedSourceDir, 'unresolved', 'invalid'],
    [path.join(outsideDir, 'nonexistent-project'), 'unresolved', 'bundled-verified'],
  ]) {
    const result = await client.callTool({ name: 'component_catalog', arguments: { projectRoot } });
    assertScopedResult(result, 'target component_catalog');
    assert.deepEqual(result.structuredContent.entries, expectedCatalog);
    assert.equal(result.structuredContent.contractVersion, contractData.frameworkVersion);
    assert.equal(result.structuredContent.sourceHash, contractData.sourceHash);
    assert.equal(result.structuredContent.contractCompatibility, compatibility, projectRoot);
    assert.equal(result.structuredContent.contractProvenance, provenance);
    const available = compatibility === 'match' && provenance === 'bundled-verified';
    assert.equal(result.structuredContent.status, available ? 'available' : 'blocked');
    assert.equal(result.structuredContent.coverageStatus, 'complete-bundled-catalogue');
    assert.equal(result.structuredContent.blockedChecks.includes('target-version contract checks'), compatibility !== 'match');
    if (provenance !== 'bundled-verified') assert.ok(result.structuredContent.blockedChecks.includes(`local contract provenance is ${provenance}`));
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
    for (const query of ['navbar', 'no-catalogue-match-zzzz']) {
      const search = await client.callTool({ name: 'component_catalog', arguments: { projectRoot, query } });
      assertCatalogSearch(search, { query, entries: query === 'navbar' ? [{ ...appBarEntry, matchType: 'exact-alias' }] : [] });
      for (const field of ['status', 'contractCompatibility', 'contractProvenance', 'contractProvenanceDetails', 'blockedChecks', 'uncheckedAreas']) {
        assert.deepEqual(search.structuredContent[field], result.structuredContent[field]);
      }
    }
  }
  assert.deepEqual(await Promise.all(unchangedFiles.map((file) => readFile(path.join(deniedCommandDir, file)))), beforeCatalogue);
  await assert.rejects(access(path.join(deniedCommandDir, 'ran.txt')));
  assert.deepEqual(await Promise.all(matchingFiles.map((file) => readFile(path.join(matchingDir, file)))), beforeMatchingCatalogue);
  await assert.rejects(access(path.join(matchingDir, 'catalogue-ran.txt')));
  await writeFile(path.join(matchingDir, 'package.json'), matchingManifest);
  for (let offset = 0; offset < expectedCatalog.length; offset += 12) {
    const slugs = expectedCatalog.slice(offset, offset + 12).map((entry) => entry.slug);
    const result = await client.callTool({ name: 'component_syntax_expert', arguments: { projectRoot: matchingDir, components: slugs } });
    assert.deepEqual(result.structuredContent.found.map((entry) => entry.slug), slugs);
    assert.deepEqual(result.structuredContent.missing, []);
  }

  const oversizedRulesInput = await client.callTool({
    name: 'rules_enforcer',
    arguments: { projectRoot: matchingDir, snippet: 'x'.repeat(500_001) },
  });
  assert.equal(oversizedRulesInput.isError, true);

  const oversizedFilesInput = await client.callTool({
    name: 'quality_inspector',
    arguments: { projectRoot: matchingDir, files: Array.from({ length: 301 }, (_, index) => `${index}.css`) },
  });
  assert.equal(oversizedFilesInput.isError, true);

  const setup = await client.callTool({
    name: 'setup_expert',
    arguments: { projectRoot: packageDir, installHint: true },
  });
  assert.equal(setup.structuredContent.stage, 'setup_expert');
  assert.equal(setup.structuredContent.framework.contractVersion, contractVersion);
  assert.equal(setup.structuredContent.framework.contractCompatibility, 'unresolved');
  assert.equal(setup.structuredContent.contractProvenance, 'bundled-verified');
  assert.ok(setup.structuredContent.blockedChecks.includes('target-version contract checks'));
  assert.ok(Array.isArray(setup.structuredContent.checksPerformed));
  assert.ok(Array.isArray(setup.structuredContent.uncheckedAreas));
  assertScopedResult(setup, 'setup_expert');
  const workflowId = setup.structuredContent.workflowId;

  const mismatchedSetup = await client.callTool({
    name: 'setup_expert',
    arguments: { projectRoot: versionedDir },
  });
  assert.equal(mismatchedSetup.structuredContent.framework.declaredRange, '^0.7.0');
  assert.equal(mismatchedSetup.structuredContent.framework.resolvedVersion, '0.7.0');
  assert.equal(mismatchedSetup.structuredContent.framework.resolutionSource, 'installed-package');
  assert.equal(mismatchedSetup.structuredContent.framework.contractCompatibility, 'mismatch');
  assert.equal(mismatchedSetup.structuredContent.framework.documentationMode, 'matching-tag');
  assert.equal(mismatchedSetup.structuredContent.framework.bundledContractSafe, false);
  assert.equal(mismatchedSetup.structuredContent.framework.currentDocsSafe, false);
  assert.ok(mismatchedSetup.structuredContent.blockedChecks.includes('target-version contract checks'));

  const multipleLockSetup = await client.callTool({
    name: 'setup_expert',
    arguments: { projectRoot: multipleLockDir },
  });
  assert.equal(multipleLockSetup.structuredContent.packageManager, 'unknown');
  assert.equal(multipleLockSetup.structuredContent.framework.contractCompatibility, 'unresolved');
  assert.ok(multipleLockSetup.structuredContent.framework.diagnostics.some((item) => item.code === 'ambiguous-lockfiles'));

  const localSetup = await client.callTool({
    name: 'setup_expert',
    arguments: { projectRoot: validSourceDir },
  });
  assert.equal(localSetup.structuredContent.contractCompatibility, 'match');
  assert.equal(localSetup.structuredContent.contractProvenance, 'divergent');
  assert.ok(localSetup.structuredContent.blockedChecks.includes('local contract provenance is divergent'));
  assert.equal(localSetup.structuredContent.contractProvenanceDetails.packageExpectedHash, contractData.sourceHash);

  const missingLocalGuides = await client.callTool({
    name: 'setup_expert',
    arguments: { projectRoot: sourceWithoutGuidesDir },
  });
  assert.notEqual(missingLocalGuides.structuredContent.contractProvenance, 'bundled-verified');
  assert.ok(missingLocalGuides.structuredContent.blockedChecks.some((item) => item.includes('local contract provenance')));

  await writeFile(path.join(validSourceDir, 'llm.md'), '# changed after the first provenance check\n');
  const changedLocalSetup = await client.callTool({
    name: 'setup_expert',
    arguments: { projectRoot: validSourceDir },
  });
  assert.equal(changedLocalSetup.structuredContent.contractProvenance, 'stale');
  assert.match(changedLocalSetup.structuredContent.contractProvenanceDetails.computedHash, /^[a-f0-9]{64}$/u);

  for (const [label, projectRoot] of [
    ['noncanonical source list', noncanonicalSourceDir],
    ['source symlink', symlinkSourceDir],
    ['source escaping the real project root', escapedSourceDir],
    ['non-regular source', directorySourceDir],
    ['oversized source', oversizedSourceDir],
    ['oversized aggregate contract', oversizedContractDir],
  ]) {
    const invalidProvenance = await client.callTool({
      name: 'setup_expert',
      arguments: { projectRoot },
    });
    assert.equal(invalidProvenance.structuredContent.contractProvenance, 'invalid', label);
    assert.equal(invalidProvenance.structuredContent.contractProvenanceDetails.computedHash, null, label);
    assert.ok(invalidProvenance.structuredContent.blockedChecks.includes('local contract provenance is invalid'), label);
  }

  const rules = await client.callTool({
    name: 'rules_enforcer',
    arguments: {
      projectRoot: packageDir,
      snippet: '<button class="btn">Save</button>',
      targetComponents: ['buttons'],
    },
  });
  assert.equal(rules.structuredContent.status, 'needs_fix');
  assert.equal(rules.structuredContent.framework.contractVersion, contractVersion);
  assertScopedResult(rules, 'rules_enforcer');

  for (const snippet of [
    '<button class=btn>Save</button>',
    '<button className="btn">Save</button>',
    '<button className={"btn"}>Save</button>',
  ]) {
    const alternateRetiredClass = await client.callTool({
      name: 'rules_enforcer',
      arguments: { projectRoot: packageDir, snippet, targetComponents: ['buttons'] },
    });
    assert.equal(alternateRetiredClass.structuredContent.status, 'needs_fix');
    assert.ok(alternateRetiredClass.structuredContent.issues.some((issue) => issue.id === 'legacy-btn-class'));
  }

  const boundedRules = await client.callTool({
    name: 'rules_enforcer',
    arguments: {
      projectRoot: packageDir,
      snippet: '<button class="btn">Save</button>'.repeat(1_000),
    },
  });
  assert.ok(boundedRules.structuredContent.issueCount <= 200);
  assert.ok(boundedRules.structuredContent.blockedChecks.includes('static inspection limit reached'));

  const nestedMarkupStartedAt = Date.now();
  const nestedMarkup = await client.callTool({
    name: 'rules_enforcer',
    arguments: { projectRoot: packageDir, snippet: '<div>'.repeat(6_000) + '</div>'.repeat(6_000) },
  });
  assert.ok(Date.now() - nestedMarkupStartedAt < 5_000);
  assert.equal(nestedMarkup.structuredContent.status, 'blocked');
  assert.ok(nestedMarkup.structuredContent.blockedChecks.includes('static inspection limit reached'));

  const identifierRunStartedAt = Date.now();
  await client.callTool({
    name: 'rules_enforcer',
    arguments: { projectRoot: packageDir, snippet: 'A'.repeat(200_000) },
  });
  assert.ok(Date.now() - identifierRunStartedAt < 5_000);

  const validRail = await client.callTool({
    name: 'rules_enforcer',
    arguments: {
      projectRoot: packageDir,
      snippet: '<nav class="navigation-rail modal" aria-label="Primary"></nav>',
      targetComponents: ['navigation-rail'],
    },
  });
  assert.equal(validRail.structuredContent.status, 'blocked');
  assert.equal(validRail.structuredContent.contractCompatibility, 'unresolved');
  assert.ok(validRail.structuredContent.blockedChecks.includes('target-version contract checks'));

  const staleRules = await client.callTool({
    name: 'rules_enforcer',
    arguments: {
      projectRoot: staleSourceDir,
      snippet: '<button>Save</button>',
      targetComponents: ['buttons'],
    },
  });
  assert.equal(staleRules.structuredContent.framework.contractVersion, contractVersion);
  assert.equal(staleRules.structuredContent.contractCompatibility, 'match');
  assert.equal(staleRules.structuredContent.contractProvenance, 'stale');
  assert.equal(staleRules.structuredContent.status, 'blocked');
  assert.ok(staleRules.structuredContent.blockedChecks.includes('local contract provenance is stale'));

  const unprovenRules = await client.callTool({
    name: 'rules_enforcer',
    arguments: { projectRoot: unprovenSourceDir, snippet: '<button>Save</button>', targetComponents: ['buttons'] },
  });
  assert.equal(unprovenRules.structuredContent.framework.contractVersion, contractVersion);
  assert.equal(unprovenRules.structuredContent.contractCompatibility, 'match');
  assert.equal(unprovenRules.structuredContent.contractProvenance, 'missing');
  assert.equal(unprovenRules.structuredContent.status, 'blocked');

  const olderSourceRules = await client.callTool({
    name: 'rules_enforcer',
    arguments: { projectRoot: olderSourceDir, snippet: '<button>Save</button>', targetComponents: ['buttons'] },
  });
  assert.equal(olderSourceRules.structuredContent.framework.contractVersion, contractVersion);
  assert.equal(olderSourceRules.structuredContent.contractCompatibility, 'mismatch');
  assert.equal(olderSourceRules.structuredContent.contractProvenance, 'divergent');
  assert.equal(olderSourceRules.structuredContent.status, 'blocked');

  const unknownRules = await client.callTool({
    name: 'rules_enforcer',
    arguments: {
      projectRoot: matchingDir,
      snippet: '<main>Clean static markup</main>',
      targetComponents: ['definitely-not-a-component'],
    },
  });
  assert.notEqual(unknownRules.structuredContent.status, 'pass');
  assert.ok(unknownRules.structuredContent.blockedChecks.includes('unknown requested component contracts'));

  const matchingRules = await client.callTool({
    name: 'rules_enforcer',
    arguments: { projectRoot: matchingDir, snippet: '<button>Save</button>', targetComponents: ['buttons'] },
  });
  assert.equal(matchingRules.structuredContent.contractCompatibility, 'match');
  assert.equal(matchingRules.structuredContent.status, 'blocked');
  assert.equal(matchingRules.structuredContent.staticStatus, 'heuristic_pass');
  assert.equal(matchingRules.structuredContent.scopedStatus, 'authored_static_pass');
  assert.equal(matchingRules.structuredContent.reviewComplete, false);
  assert.equal(Object.hasOwn(matchingRules.structuredContent, 'componentChecks'), false);
  assert.equal(matchingRules.structuredContent.componentGuidance[0].kind, 'guidance');
  assert.equal(Object.hasOwn(matchingRules.structuredContent.componentGuidance[0], 'requiredRules'), false);
  assert.ok(Array.isArray(matchingRules.structuredContent.componentGuidance[0].guideRules));
  assert.ok(matchingRules.structuredContent.checksPerformed.includes('requested component guide lookup'));
  assert.equal(matchingRules.structuredContent.checksPerformed.includes('requested component guide rules'), false);
  assert.ok(matchingRules.structuredContent.uncheckedAreas.includes('requested component-rule validation'));
  assert.ok(matchingRules.structuredContent.blockedChecks.includes('requested component-rule validation'));

  const matchingStaticRules = await client.callTool({
    name: 'rules_enforcer',
    arguments: { projectRoot: matchingDir, snippet: '<button>Save</button>' },
  });
  assert.equal(matchingStaticRules.structuredContent.status, 'pass');
  assert.equal(matchingStaticRules.structuredContent.scopedStatus, 'authored_static_pass');

  const emptyRules = await client.callTool({
    name: 'rules_enforcer',
    arguments: { projectRoot: matchingDir, snippet: '', targetComponents: ['buttons'] },
  });
  assertScopedResult(emptyRules, 'rules_enforcer empty input');
  assert.equal(emptyRules.structuredContent.status, 'blocked');
  assert.ok(emptyRules.structuredContent.blockedChecks.includes('empty snippet'));

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
  assert.equal(creative.structuredContent.status, 'blocked');
  assert.deepEqual(creative.structuredContent.suggestions, []);
  assert.equal(creative.structuredContent.contractCompatibility, 'unresolved');
  assertScopedResult(creative, 'creative_director');

  const mismatchedCreative = await client.callTool({
    name: 'creative_director',
    arguments: { projectRoot: versionedDir, goal: 'Choose a button for the primary action.' },
  });
  assert.equal(mismatchedCreative.structuredContent.status, 'blocked');
  assert.equal(mismatchedCreative.structuredContent.contractCompatibility, 'mismatch');
  assert.deepEqual(mismatchedCreative.structuredContent.suggestions, []);

  const safeCreative = await client.callTool({
    name: 'creative_director',
    arguments: {
      projectRoot: matchingDir,
      goal: 'Design a responsive settings page with clear navigation and forms.',
    },
  });
  assert.equal(safeCreative.structuredContent.status, 'available');
  assert.ok(safeCreative.structuredContent.suggestions.length > 0);
  assert.ok(safeCreative.structuredContent.suggestions.every((item) => ['decision-catalog', 'fuzzy-fallback'].includes(item.selectionSource)));
  assert.ok(safeCreative.structuredContent.suggestions.every((item) => ['primary', 'fallback'].includes(item.confidence)));
  assert.ok(safeCreative.structuredContent.suggestions.some((item) => item.useWhen?.length));
  assert.equal(Object.hasOwn(safeCreative.structuredContent, 'fallback'), false);

  for (const fixture of [
    {
      goal: 'Use persistent peer destinations in bottom navigation on compact screens.',
      expected: 'navigation-bar',
      rejected: 'bottom-app-bar',
    },
    {
      goal: 'Show a transient confirmation toast after saving the account settings.',
      expected: 'snackbar',
      rejected: 'banners',
    },
  ]) {
    const decision = await client.callTool({
      name: 'creative_director',
      arguments: { projectRoot: matchingDir, goal: fixture.goal, maxSuggestions: 5 },
    });
    const slugs = decision.structuredContent.suggestions.map((item) => item.slug);
    assert.ok(slugs.includes(fixture.expected), `${fixture.expected} missing for ${fixture.goal}`);
    assert.equal(slugs.includes(fixture.rejected), false, `${fixture.rejected} should be rejected for ${fixture.goal}`);
    const selected = decision.structuredContent.suggestions.find((item) => item.slug === fixture.expected);
    assert.equal(selected.selectionSource, 'decision-catalog');
    assert.notEqual(selected.confidence, 'fallback');
  }

  for (const goal of [
    'Keep a nonblocking action visible until the user handles it.',
    'Show persistent non-blocking feedback while editing continues.',
    'Use an inline message for offline status.',
  ]) {
    const decision = await client.callTool({
      name: 'creative_director',
      arguments: { projectRoot: matchingDir, goal, maxSuggestions: 1 },
    });
    assert.equal(decision.structuredContent.count, 1);
    const [selected] = decision.structuredContent.suggestions;
    assert.equal(selected.slug, 'inline');
    assert.equal(selected.selectionSource, 'native-pattern');
    assert.equal(selected.runtime, 'native');
    assert.match(selected.guidance.join(' '), /status node.*buttons outside/);
    assert.ok(decision.structuredContent.evidenceSources.includes('server:native-inline-feedback'));
  }
  for (const goal of [
    'Show a temporary nonblocking confirmation after saving.',
    'Require a blocking decision before deleting the account.',
    'Design navigation and forms for settings.',
  ]) {
    const decision = await client.callTool({
      name: 'creative_director',
      arguments: { projectRoot: matchingDir, goal },
    });
    assert.ok(decision.structuredContent.suggestions.every(({ slug }) => slug !== 'inline'));
  }
  const blockedInline = await client.callTool({
    name: 'creative_director',
    arguments: { projectRoot: versionedDir, goal: 'Keep a nonblocking action visible until the user handles it.' },
  });
  assert.equal(blockedInline.structuredContent.status, 'blocked');
  assert.deepEqual(blockedInline.structuredContent.suggestions, []);

  const speedDial = await client.callTool({
    name: 'creative_director',
    arguments: { projectRoot: matchingDir, goal: 'Replace a legacy speed dial with current labelled FAB actions.', maxSuggestions: 1 },
  });
  assert.equal(speedDial.structuredContent.suggestions[0].slug, 'fab');
  assert.match(speedDial.structuredContent.suggestions[0].useWhen.join(' '), /removed speed dials.*fab-menu/);
  const fabSyntax = await client.callTool({
    name: 'component_syntax_expert',
    arguments: { projectRoot: matchingDir, components: ['fab'] },
  });
  assert.match(JSON.stringify(fabSyntax.structuredContent), /fab-menu/);
  assert.doesNotMatch(JSON.stringify(fabSyntax.structuredContent), /class=\\"fab\\"/);

  const removedBanner = await client.callTool({
    name: 'component_syntax_expert',
    arguments: { projectRoot: matchingDir, components: ['banners'] },
  });
  assert.equal(removedBanner.structuredContent.found.length, 0);
  assert.ok(removedBanner.structuredContent.missing.some((item) => item.requested === 'banners'));

  const legacyReplacements = [
    ['bottom-app-bar', 'toolbars'],
    ['navigation-drawer', 'navigation-rail'],
    ['segmented-buttons', 'button-groups'],
  ];
  for (const [legacy, replacement] of legacyReplacements) {
    const removed = await client.callTool({
      name: 'component_syntax_expert',
      arguments: { projectRoot: matchingDir, components: [legacy] },
    });
    assert.equal(removed.structuredContent.found.length, 0);
    assert.ok(removed.structuredContent.missing.some((item) => item.requested === legacy));
    const decision = await client.callTool({
      name: 'creative_director',
      arguments: { projectRoot: matchingDir, goal: `Choose ${replacement} for this interface.`, maxSuggestions: 12 },
    });
    assert.ok(decision.structuredContent.suggestions.some((item) => item.slug === replacement));
  }

  for (const goal of [
    'Choose navigation and controls for settings.',
    'navigation-drawer-trigger segmented-control bottom-app-bar-icon-hidden',
    'circle extra small',
  ]) {
    const decision = await client.callTool({
      name: 'creative_director',
      arguments: { projectRoot: matchingDir, goal, maxSuggestions: 12 },
    });
    assert.ok(decision.structuredContent.suggestions.every((item) => !legacyReplacements.some(([legacy]) => item.slug === legacy)));
  }
  for (const component of ['app-bar', 'navigation-bar', 'navigation-rail', 'fab', 'buttons', 'icon-buttons', 'progress']) {
    const decision = await client.callTool({
      name: 'creative_director',
      arguments: { projectRoot: matchingDir, goal: `Choose ${component} for this interface.`, maxSuggestions: 12 },
    });
    assert.ok(decision.structuredContent.suggestions.some((item) => item.slug === component), `${component} must remain selectable`);
  }

  const navigationDecision = await client.callTool({
    name: 'creative_director',
    arguments: {
      projectRoot: matchingDir,
      goal: 'Use persistent peer destinations in bottom navigation on compact screens.',
      maxSuggestions: 1,
    },
  });
  assert.equal(navigationDecision.structuredContent.suggestions.length, 1);
  assert.equal(navigationDecision.structuredContent.suggestions[0].slug, 'navigation-bar');
  assert.ok(Array.isArray(navigationDecision.structuredContent.suggestions[0].adaptive));
  assert.equal(navigationDecision.structuredContent.suggestions[0].adaptive.length, 1);
  assert.equal(navigationDecision.structuredContent.truncated, true);
  assert.ok(navigationDecision.structuredContent.omittedCount > 0);

  const staleCreative = await client.callTool({
    name: 'creative_director',
    arguments: { projectRoot: staleSourceDir, goal: 'Choose a button for the primary action.' },
  });
  assert.equal(staleCreative.structuredContent.status, 'blocked');
  assert.equal(staleCreative.structuredContent.contractProvenance, 'stale');
  assert.deepEqual(staleCreative.structuredContent.suggestions, []);

  for (const name of ['page_architect', 'page_arcjitect']) {
    const architecture = await client.callTool({
      name,
      arguments: {
        projectRoot: matchingDir,
        pageGoal: 'Structure a responsive settings page.',
        components: ['app-bar', 'navigation-rail', 'text-fields', 'buttons'],
        workflowId,
      },
    });
    assert.equal(architecture.structuredContent.stage, name);
    assert.equal(architecture.structuredContent.status, 'available');
    assertScopedResult(architecture, name);
    assert.match(architecture.structuredContent.architecture.architecture.skeleton, /<main>/);
    assert.doesNotMatch(architecture.structuredContent.architecture.architecture.skeleton, /role="main"/);
    assert.match(architecture.structuredContent.architecture.architecture.skeleton, /<nav class="navigation-rail" aria-label="Primary">/);
  }

  const navigationBarArchitecture = await client.callTool({
    name: 'page_architect',
    arguments: {
      projectRoot: matchingDir,
      pageGoal: 'Structure a compact navigation page.',
      components: ['navigation-bar'],
      viewportTarget: 'compact',
      workflowId,
    },
  });
  const navigationBarSkeleton = navigationBarArchitecture.structuredContent.architecture.architecture.skeleton;
  assert.doesNotMatch(navigationBarSkeleton, /<header>/);
  assert.equal((navigationBarSkeleton.match(/navigation-bar/g) || []).length, 1);

  const unresolvedArchitecture = await client.callTool({
    name: 'page_architect',
    arguments: { projectRoot: packageDir, pageGoal: 'Structure a compact settings page.', components: ['buttons'] },
  });
  assert.equal(unresolvedArchitecture.structuredContent.status, 'blocked');
  assert.equal(unresolvedArchitecture.structuredContent.architecture, null);
  assert.equal(unresolvedArchitecture.structuredContent.contractCompatibility, 'unresolved');

  const mismatchedArchitecture = await client.callTool({
    name: 'page_architect',
    arguments: { projectRoot: versionedDir, pageGoal: 'Structure a compact settings page.', components: ['buttons'] },
  });
  assert.equal(mismatchedArchitecture.structuredContent.status, 'blocked');
  assert.equal(mismatchedArchitecture.structuredContent.architecture, null);
  assert.equal(mismatchedArchitecture.structuredContent.contractCompatibility, 'mismatch');

  const staleArchitecture = await client.callTool({
    name: 'page_architect',
    arguments: { projectRoot: staleSourceDir, pageGoal: 'Structure a compact settings page.', components: ['buttons'] },
  });
  assert.equal(staleArchitecture.structuredContent.status, 'blocked');
  assert.equal(staleArchitecture.structuredContent.architecture, null);
  assert.equal(staleArchitecture.structuredContent.contractProvenance, 'stale');

  const fuzzyArchitecture = await client.callTool({
    name: 'page_architect',
    arguments: { projectRoot: matchingDir, pageGoal: 'Structure a compact settings page.', components: ['navigation-rai'] },
  });
  assert.equal(fuzzyArchitecture.structuredContent.status, 'blocked');
  assert.equal(fuzzyArchitecture.structuredContent.architecture, null);
  assert.equal(fuzzyArchitecture.structuredContent.unresolvedComponents[0].requested, 'navigation-rai');

  const syntax = await client.callTool({
    name: 'component_syntax_expert',
    arguments: { projectRoot: packageDir, components: ['buttons'], workflowId },
  });
  assert.equal(syntax.structuredContent.foundCount, 1);
  assert.equal(syntax.structuredContent.contractVersion, contractVersion);
  assert.equal(syntax.structuredContent.found[0].file, 'buttons.md');
  assert.ok(syntax.structuredContent.evidenceSources.includes('bundled:buttons.md'));
  assert.ok(syntax.structuredContent.checksPerformed.includes('named component contract lookup'));
  assert.ok(syntax.structuredContent.uncheckedAreas.includes('rendered component behavior'));
  assert.equal(syntax.structuredContent.coverageStatus, 'named-component-contracts');
  assert.ok(['match', 'mismatch', 'unresolved'].includes(syntax.structuredContent.contractCompatibility));
  assert.ok(Array.isArray(syntax.structuredContent.blockedChecks));
  assertScopedResult(syntax, 'component_syntax_expert');

  const staleSyntax = await client.callTool({
    name: 'component_syntax_expert',
    arguments: { projectRoot: staleSourceDir, components: ['buttons'] },
  });
  assert.equal(staleSyntax.structuredContent.contractVersion, contractVersion);
  assert.equal(staleSyntax.structuredContent.contractCompatibility, 'match');
  assert.equal(staleSyntax.structuredContent.contractProvenance, 'stale');
  assert.equal(staleSyntax.structuredContent.status, 'blocked');
  assert.equal(staleSyntax.structuredContent.found[0].capability, null);
  assert.equal(staleSyntax.structuredContent.capabilityEvidence.status, 'blocked');

  const tamperedGuideSyntax = await client.callTool({
    name: 'component_syntax_expert',
    arguments: { projectRoot: tamperedGuideDir, components: ['buttons'] },
  });
  assert.ok(tamperedGuideSyntax.structuredContent.evidenceSources.includes('bundled:buttons.md'));
  assert.equal(JSON.stringify(tamperedGuideSyntax.structuredContent).includes('UNTRUSTED_GUIDE_MARKER'), false);

  const matchingSetup = await client.callTool({
    name: 'setup_expert',
    arguments: { projectRoot: matchingDir },
  });
  assert.equal(matchingSetup.structuredContent.contractCompatibility, 'match');
  assert.equal(matchingSetup.structuredContent.framework.documentationMode, 'bundled');
  assert.equal(matchingSetup.structuredContent.framework.bundledContractSafe, true);
  assert.equal(matchingSetup.structuredContent.framework.documentationSources.bundled.available, true);
  assert.equal(matchingSetup.structuredContent.framework.currentDocsSafe, false);
  assert.equal(matchingSetup.structuredContent.framework.documentationSources.current.available, false);
  assert.equal(matchingSetup.structuredContent.blockedChecks.includes('target-version contract checks'), false);

  const matchingSyntax = await client.callTool({
    name: 'component_syntax_expert',
    arguments: { projectRoot: matchingDir, components: ['buttons'] },
  });
  assert.equal(matchingSyntax.structuredContent.contractCompatibility, 'match');
  assert.equal(matchingSyntax.structuredContent.status, 'available');
  const buttonCapability = matchingSyntax.structuredContent.found[0].capability;
  assert.equal(buttonCapability.lastReviewedSupport, 'partial');
  assert.equal(buttonCapability.support, buttonCapability.sourceReview === 'source-reviewed' ? 'partial' : 'unassessed');
  assert.match(matchingSyntax.structuredContent.capabilityEvidence.basis, /not proof of published package/);

  const fallbackRules = [
    'Follow the component contract in the full documentation before adding optional attributes.',
    'Keep runtime-owned state in framework initialization, not in static markup values.',
  ];
  const normativeRuleIds = (rules) => rules.flatMap((rule) => {
    const match = rule.match(/^`([^`]+)`:/u);
    return match ? [match[1]] : [];
  });
  const catalogueRules = new Map();
  const catalogueOptions = new Map();
  const catalogueMethods = new Map();
  let fallbackGuideCount = 0;
  for (let offset = 0; offset < guideData.guides.length; offset += 12) {
    const guides = guideData.guides.slice(offset, offset + 12);
    const result = await client.callTool({
      name: 'component_syntax_expert',
      arguments: { projectRoot: matchingDir, components: guides.map((guide) => guide.file.replace(/\.md$/u, '')), workflowId },
    });
    assertScopedResult(result, 'catalogue component_syntax_expert');
    assert.equal(result.structuredContent.status, 'available');
    assert.equal(result.structuredContent.foundCount, guides.length);
    assert.deepEqual(result.structuredContent.missing, []);
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
    assert.ok(result.structuredContent.found.every((entry) => !Object.hasOwn(entry, 'options')));
    assert.ok(result.structuredContent.found.every((entry) => !Object.hasOwn(entry, 'methods')));
    assertSyntaxSelection(result);
    assert.equal(validateSyntaxOutput(result.structuredContent).valid, true);
    const explicitDetailed = await client.callTool({ name: 'component_syntax_expert', arguments: { projectRoot: matchingDir, components: guides.map((guide) => guide.file.replace(/\.md$/u, '')), workflowId, detail: 'detailed' } });
    assert.deepEqual(explicitDetailed.structuredContent, result.structuredContent);
    let combined;
    for (const sections of [[], ['options'], ['methods'], ['options', 'methods'], ['methods', 'options']]) {
      const selected = await client.callTool({
        name: 'component_syntax_expert',
        arguments: { projectRoot: matchingDir, components: guides.map((guide) => guide.file.replace(/\.md$/u, '')), workflowId, sections },
      });
      assert.notEqual(selected.isError, true, `supported sections rejected: ${JSON.stringify(sections)}: ${selected.content[0].text}`);
      assert.deepEqual(JSON.parse(selected.content[0].text), selected.structuredContent);
      for (const guide of guides) {
        const found = selected.structuredContent.found.find((entry) => entry.file === guide.file);
        for (const [section, heading, expectations] of [['options', 'Options', catalogueOptions], ['methods', 'Methods', catalogueMethods]]) {
          if (sections.includes(section)) {
            // Shipped API sections contain no fenced headings. Synthetic cases below cover those boundaries.
            const markdown = guide.content.split(new RegExp(`^#### ${heading}\\r?$`, 'mu'))[1]?.split(/^#{1,4}(?:\s|$)/mu)[0].trim() || null;
            const expected = { status: markdown ? 'documented' : 'absent', markdown };
            assert.deepEqual(found[section], expected, `${guide.file} must return its complete bundled ${heading} or explicit absence`);
            expectations.set(guide.file, expected);
          } else {
            assert.equal(Object.hasOwn(found, section), false);
          }
        }
      }
      assertSyntaxSelection(selected, { sections });
      assert.deepEqual(withoutApiSelection(selected.structuredContent), withoutApiSelection(result.structuredContent), 'section selection changes only API records and omission metadata');
      for (const [detail, includeCapabilities] of [['compact', undefined], ['compact', true], ['compact', false], ['detailed', false], ['detailed', true]]) {
        const args = { projectRoot: matchingDir, components: guides.map((guide) => guide.file.replace(/\.md$/u, '')), workflowId, sections, detail, ...(includeCapabilities === undefined ? {} : { includeCapabilities }) };
        const projected = await client.callTool({ name: 'component_syntax_expert', arguments: args });
        assertSyntaxSelection(projected, { detail, includeCapabilities, sections });
        assert.equal(validateSyntaxOutput(projected.structuredContent).valid, true);
        assert.deepEqual(withoutSyntaxSelection(projected.structuredContent), withoutSyntaxSelection(selected.structuredContent));
        for (const [index, entry] of projected.structuredContent.found.entries()) {
          const original = selected.structuredContent.found[index];
          for (const field of ['contract', 'syntax', 'options', 'methods', 'capability']) {
            if (Object.hasOwn(entry, field)) assert.deepEqual(entry[field], original[field]);
          }
        }
      }
      if (sections.length === 2) {
        if (combined) assert.deepEqual(selected.structuredContent, combined, 'selector order must not change the result');
        combined = selected.structuredContent;
      }
    }
    for (const guide of guides) {
      // Read expectations from bundled Markdown, independently of the server parser.
      const section = guide.content.split(/^#### Rules\r?$/mu)[1]?.split(/^#{1,4} /mu)[0] ?? '';
      const expectedRules = [...section.matchAll(/^-\s+(.+)$/gmu)].map((match) => match[1]);
      const found = result.structuredContent.found.find((entry) => entry.file === guide.file);
      assert.ok(found, `${guide.file} missing from catalogue lookup`);
      if (expectedRules.length) {
        assert.deepEqual(found.rules, expectedRules, `${guide.file} must return every rule in source order`);
        assert.deepEqual(normativeRuleIds(found.rules), normativeRuleIds(expectedRules), `${guide.file} normative rule IDs`);
      } else {
        fallbackGuideCount += 1;
        assert.deepEqual(found.rules, fallbackRules, `${guide.file} fallback advice changed`);
        assert.deepEqual(normativeRuleIds(found.rules), [], `${guide.file} fallback advice is not normative`);
      }
      catalogueRules.set(guide.file, found.rules);
    }
  }
  assert.ok(fallbackGuideCount > 0, 'catalogue must exercise generic fallback advice');
  assert.ok(catalogueRules.get('cards.md').length >= 16, 'Cards must include all 16 baseline rules');
  assert.ok(normativeRuleIds(catalogueRules.get('cards.md')).includes('expanding-card-close-is-button'));
  assert.ok(normativeRuleIds(catalogueRules.get('autocomplete.md')).includes('field-supporting-text-linked'));
  assert.deepEqual(tamperedGuideSyntax.structuredContent.found[0].rules, catalogueRules.get('buttons.md'));
  const datepickerOptions = catalogueOptions.get('date-picker.md').markdown;
  for (const option of ['openByDefault', 'container', 'displayPlugin', 'displayPluginOptions']) {
    assert.ok(datepickerOptions.includes(`\`${option}\``), `${option} missing from Datepicker Options`);
  }
  assert.match(datepickerOptions, /'docked'.*openByDefault: true/u);
  assert.equal(catalogueOptions.get('autocomplete.md').status, 'documented');
  assert.deepEqual(catalogueOptions.get('cards.md'), { status: 'absent', markdown: null });
  for (const method of ['open', 'close', 'selectOption', 'setMenuItems', 'destroy']) {
    assert.ok(catalogueMethods.get('autocomplete.md').markdown.includes(`\`.${method}()\``), `${method} missing from Autocomplete Methods`);
  }
  assert.deepEqual(catalogueMethods.get('cards.md'), { status: 'absent', markdown: null });
  for (const selectors of [
    { detail: 'unknown' }, { detail: null }, { detail: 1 },
    { includeCapabilities: 'true' }, { includeCapabilities: null }, { includeCapabilities: 1 },
  ]) {
    const invalid = await client.callTool({ name: 'component_syntax_expert', arguments: { projectRoot: matchingDir, components: ['cards'], ...selectors } });
    assert.equal(invalid.isError, true, `invalid selectors accepted: ${JSON.stringify(selectors)}`);
  }
  for (const mutation of [
    { detail: 'unknown' }, { includeCapabilities: 'true' },
    { found: [{ omittedFields: [{ field: 'rules', reason: 'not-requested' }] }] },
    { found: [{ omittedFields: [{ field: 'syntax', reason: 'budget' }] }] },
    { found: [{}] },
  ]) assert.equal(validateSyntaxOutput({ ...matchingSyntax.structuredContent, ...mutation }).valid, false);
  for (const sections of ['options', null, ['unknown'], [1], ['options', 'unknown'], ['options', 'options'], ['methods', 'methods'], ['options', 'methods', 'options']]) {
    const invalid = await client.callTool({ name: 'component_syntax_expert', arguments: { projectRoot: matchingDir, components: ['cards'], sections } });
    assert.equal(invalid.isError, true, `invalid sections accepted: ${JSON.stringify(sections)}`);
  }
  const tamperedOptions = await client.callTool({ name: 'component_syntax_expert', arguments: { projectRoot: tamperedGuideDir, components: ['buttons', 'autocomplete'], sections: ['options', 'methods'] } });
  assert.deepEqual(tamperedOptions.structuredContent.found[0].options, catalogueOptions.get('buttons.md'));
  assert.deepEqual(tamperedOptions.structuredContent.found[0].methods, catalogueMethods.get('buttons.md'));
  assert.deepEqual(tamperedOptions.structuredContent.found[1].methods, catalogueMethods.get('autocomplete.md'));
  assert.equal(JSON.stringify(tamperedOptions).includes('UNTRUSTED_OPTIONS_MARKER'), false);
  assert.equal(JSON.stringify(tamperedOptions).includes('UNTRUSTED_METHODS_MARKER'), false);

  // Copy only the runtime package inputs; dependencies resolve from this package's parent directory.
  const optionsFixtureDir = await mkdtemp(path.join(packageDir, '.options-fixture-'));
  const optionsFixtureClient = new Client({ name: 'expressivecss-mcp-options-fixture', version: '0.1.0' });
  try {
    for (const file of ['server.js', 'package.json', 'component-decisions.json', 'capability-roadmap.json', 'contract.json', 'semantics-data.json']) {
      await copyFile(path.join(packageDir, file), path.join(optionsFixtureDir, file));
    }
    await mkdir(path.join(optionsFixtureDir, 'scripts'));
    await copyFile(path.join(packageDir, 'scripts', 'resolve-version.mjs'), path.join(optionsFixtureDir, 'scripts', 'resolve-version.mjs'));
    const markdown = [
      '| Name | Description |', '| --- | --- |', '| example | Complete table |',
      '##### Nested guidance', '[Reference](https://example.test/options)',
      '```markdown', '#### Methods', '# A literal code heading', '````',
      '~~~markdown', '### Another literal code heading', '~~~~',
      'Long option description. '.repeat(1_200),
    ].join('\n').trim();
    const searchFixtures = [
      { slug: 'fixture', title: 'Fixture', useWhen: ['Discoverable'], aliases: ['fixture'] },
      { slug: 'a-fixture', title: 'A fixture', useWhen: ['UI'], aliases: ['fixture'] },
      { slug: 'b-fixture', title: 'B fixture', useWhen: [], aliases: ['fixture'] },
      ...Array.from({ length: 52 }, (_, index) => ({
        slug: `fixture-${String(index).padStart(2, '0')}`, title: `Fixture ${index}`,
        useWhen: ['UI discovery'], aliases: index === 0 ? ['q'] : index < 3 ? ['edge'] : [],
      })),
    ];
    const fixtureGuides = {
      ...guideData,
      guides: [
        { file: 'nested.md', content: `### Nested\n\n\`\`\`markdown\n#### Options\nFake section\n\`\`\`\n\n#### Options\n\n${markdown}\n\n### Next component\nEXCLUDED_HIGHER_HEADING\n` },
        { file: 'empty.md', content: '### Empty\n\n#### Options\n \n#### Methods\nEXCLUDED_METHODS\n' },
        { file: 'last.md', content: '### Last\n\n#### Options\nFinal option without trailing heading' },
        { file: 'same-level.md', content: '### Same level\n\n#### Options\nKept option\n#### Methods\nEXCLUDED_METHODS\n' },
        { file: 'crlf.md', content: '### CRLF\r\n\r\n#### Options\r\nFirst line\r\n##### Nested heading\r\nLast line\r\n#### Methods\r\nEXCLUDED_METHODS\r\n' },
        { file: 'nested-methods.md', content: `### Nested Methods\n\n\`\`\`markdown\n#### Methods\nFake section\n\`\`\`\n\n#### Methods\n\n${markdown}\n\n### Next component\nEXCLUDED_HIGHER_HEADING\n` },
        { file: 'empty-methods.md', content: '### Empty Methods\n\n#### Methods\n \n#### Options\nEXCLUDED_OPTIONS\n' },
        { file: 'last-methods.md', content: '### Last Methods\n\n#### Methods\nFinal method without trailing heading' },
        { file: 'same-level-methods.md', content: '### Same level Methods\n\n#### Methods\nKept method\n#### Options\nEXCLUDED_OPTIONS\n' },
        { file: 'crlf-methods.md', content: '### CRLF Methods\r\n\r\n#### Methods\r\nFirst line\r\n##### Nested heading\r\nLast line\r\n#### Options\r\nEXCLUDED_OPTIONS\r\n' },
        { file: 'missing-methods.md', content: '### Missing Methods\n\n#### Options\nOnly options' },
        ...searchFixtures.map(({ slug, title }) => ({ file: `${slug}.md`, content: `### ${title}\n\n#### Rules\nFull-body-only marker ZZZBODYONLY\n` })),
      ],
    };
    await writeFile(path.join(optionsFixtureDir, 'component-guides.json'), JSON.stringify(fixtureGuides));
    await writeFile(path.join(optionsFixtureDir, 'component-decisions.json'), JSON.stringify({
      ...decisionsData,
      components: [
        { slug: 'last', useWhen: ['', 'Preferred description', 'Extra description'], jobs: ['Unused job'], aliases: ['final'], runtime: 'css-only' },
        { slug: 'empty', useWhen: [''], jobs: ['', 'Job fallback'], aliases: [], runtime: 'native' },
        { slug: 'same-level', useWhen: [], jobs: [], aliases: [] },
        ...searchFixtures,
      ],
    }));
    const fixtureTransport = new StdioClientTransport({ command: process.execPath, args: [path.join(optionsFixtureDir, 'server.js')], cwd: optionsFixtureDir, stderr: 'pipe', env: { ...process.env, EXPRESSIVECSS_MCP_MAX_RESPONSE_BYTES: '1048576' } });
    await optionsFixtureClient.connect(fixtureTransport);
    const fixtureCatalog = await optionsFixtureClient.callTool({ name: 'component_catalog', arguments: {} });
    assert.equal(fixtureCatalog.structuredContent.count, fixtureGuides.guides.length);
    const fixtureEntries = new Map(fixtureCatalog.structuredContent.entries.map((entry) => [entry.slug, entry]));
    assert.deepEqual(fixtureEntries.get('nested'), { slug: 'nested', title: 'Nested', description: null, aliases: [], runtime: null, docs: null });
    assert.deepEqual(fixtureEntries.get('last'), { slug: 'last', title: 'Last', description: 'Preferred description', aliases: ['final'], runtime: 'css-only', docs: null });
    assert.deepEqual(fixtureEntries.get('empty'), { slug: 'empty', title: 'Empty', description: 'Job fallback', aliases: [], runtime: 'native', docs: null });
    assert.deepEqual(fixtureEntries.get('same-level'), { slug: 'same-level', title: 'Same level', description: null, aliases: [], runtime: null, docs: null });
    assert.deepEqual(JSON.parse(fixtureCatalog.content[0].text), fixtureCatalog.structuredContent);
    const rankedFixtures = searchFixtures.map(({ slug }, index) => ({
      ...fixtureEntries.get(slug), matchType: index === 0 ? 'exact-name' : index < 3 ? 'exact-alias' : 'heuristic',
    }));
    for (const limit of [undefined, 1, 50]) {
      const query = 'fixture';
      const result = await optionsFixtureClient.callTool({ name: 'component_catalog', arguments: { query, ...(limit === undefined ? {} : { limit }) } });
      assertCatalogSearch(result, { query, limit: limit ?? 10, entries: rankedFixtures.slice(0, limit ?? 10), totalMatches: 55 });
      const repeated = await optionsFixtureClient.callTool({ name: 'component_catalog', arguments: { query, ...(limit === undefined ? {} : { limit }) } });
      assert.deepEqual(repeated.structuredContent.entries, result.structuredContent.entries);
      const blocked = await optionsFixtureClient.callTool({ name: 'component_catalog', arguments: { query, projectRoot: versionedDir, ...(limit === undefined ? {} : { limit }) } });
      assertCatalogSearch(blocked, { query, limit: limit ?? 10, entries: rankedFixtures.slice(0, limit ?? 10), totalMatches: 55 });
      assert.equal(blocked.structuredContent.status, 'blocked');
      assert.equal(blocked.structuredContent.contractCompatibility, 'mismatch');
    }
    for (const limit of [1, 2]) {
      const query = 'edge';
      const result = await optionsFixtureClient.callTool({ name: 'component_catalog', arguments: { query, limit } });
      const entries = rankedFixtures.slice(4, 4 + limit).map((entry) => ({ ...entry, matchType: 'exact-alias' }));
      assertCatalogSearch(result, { query, limit, entries, totalMatches: 2 });
    }
    for (const query of ['q', 'ui q']) {
      const matchType = query === 'q' ? 'exact-alias' : 'heuristic';
      assertCatalogSearch(await optionsFixtureClient.callTool({ name: 'component_catalog', arguments: { query } }), {
        query, entries: [{ ...fixtureEntries.get('fixture-00'), matchType }],
      });
    }
    const recoveryQuery = 'fixture-51';
    assertCatalogSearch(await optionsFixtureClient.callTool({ name: 'component_catalog', arguments: { query: recoveryQuery } }), {
      query: recoveryQuery, entries: [{ ...fixtureEntries.get('fixture-51'), matchType: 'exact-name' }],
    });
    for (const limit of [1, 2]) {
      const query = 'a-fixture';
      assertCatalogSearch(await optionsFixtureClient.callTool({ name: 'component_catalog', arguments: { query, limit } }), {
        query, limit, entries: [
          { ...fixtureEntries.get('a-fixture'), matchType: 'exact-name' },
          { ...fixtureEntries.get('fixture'), matchType: 'heuristic' },
        ].slice(0, limit), totalMatches: 2,
      });
    }
    for (const query of ['ZZZBODYONLY', 'unused job', 'extra description']) {
      assertCatalogSearch(await optionsFixtureClient.callTool({ name: 'component_catalog', arguments: { query } }), { query, entries: [] });
    }
    const fixtureResult = await optionsFixtureClient.callTool({ name: 'component_syntax_expert', arguments: { projectRoot: matchingDir, components: ['nested', 'empty', 'last', 'same-level', 'crlf'], sections: ['options'] } });
    assert.deepEqual(fixtureResult.structuredContent.found.map((entry) => entry.options), [
      { status: 'documented', markdown },
      { status: 'absent', markdown: null },
      { status: 'documented', markdown: 'Final option without trailing heading' },
      { status: 'documented', markdown: 'Kept option' },
      { status: 'documented', markdown: 'First line\r\n##### Nested heading\r\nLast line' },
    ]);
    assert.deepEqual(JSON.parse(fixtureResult.content[0].text), fixtureResult.structuredContent);
    const methodsFixtureResult = await optionsFixtureClient.callTool({ name: 'component_syntax_expert', arguments: { projectRoot: matchingDir, components: ['nested-methods', 'empty-methods', 'last-methods', 'same-level-methods', 'crlf-methods', 'missing-methods'], sections: ['methods'] } });
    assert.deepEqual(methodsFixtureResult.structuredContent.found.map((entry) => entry.methods), [
      { status: 'documented', markdown },
      { status: 'absent', markdown: null },
      { status: 'documented', markdown: 'Final method without trailing heading' },
      { status: 'documented', markdown: 'Kept method' },
      { status: 'documented', markdown: 'First line\r\n##### Nested heading\r\nLast line' },
      { status: 'absent', markdown: null },
    ]);
    assert.ok(methodsFixtureResult.structuredContent.found.every((entry) => !Object.hasOwn(entry, 'options')));
    assert.deepEqual(JSON.parse(methodsFixtureResult.content[0].text), methodsFixtureResult.structuredContent);
    for (const original of [fixtureResult, methodsFixtureResult]) {
      const sections = original === fixtureResult ? ['options'] : ['methods'];
      const compact = await optionsFixtureClient.callTool({ name: 'component_syntax_expert', arguments: { projectRoot: matchingDir, components: original.structuredContent.found.map((entry) => entry.slug), workflowId: original.structuredContent.workflowId, detail: 'compact', sections } });
      assertSyntaxSelection(compact, { detail: 'compact', sections });
      assert.deepEqual(withoutSyntaxSelection(compact.structuredContent), withoutSyntaxSelection(original.structuredContent));
      for (const [index, entry] of compact.structuredContent.found.entries()) assert.deepEqual(entry[sections[0]], original.structuredContent.found[index][sections[0]]);
    }
  } finally {
    try { await optionsFixtureClient.close(); } finally { await rm(optionsFixtureDir, { recursive: true, force: true }); }
  }

  for (const [projectRoot, compatibility, provenance] of [
    [outsideDir, 'unresolved', 'bundled-verified'],
    [versionedDir, 'mismatch', 'bundled-verified'],
    [staleSourceDir, 'match', 'stale'],
    [unprovenSourceDir, 'match', 'missing'],
    [noncanonicalSourceDir, 'match', 'invalid'],
    [tamperedGuideDir, 'match', 'divergent'],
  ]) {
    const result = await client.callTool({
      name: 'component_syntax_expert',
      arguments: { projectRoot, components: ['cards'] },
    });
    assertScopedResult(result, 'blocked component_syntax_expert');
    assert.equal(result.structuredContent.status, 'blocked');
    assert.equal(result.structuredContent.contractCompatibility, compatibility);
    assert.equal(result.structuredContent.contractProvenance, provenance);
    assert.equal(result.structuredContent.found[0].capability, null);
    assert.equal(result.structuredContent.capabilityEvidence.status, 'blocked');
    assert.deepEqual(result.structuredContent.found[0].rules, catalogueRules.get('cards.md'));
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
    for (const sections of [['options'], ['methods'], ['options', 'methods']]) {
      const selected = await client.callTool({ name: 'component_syntax_expert', arguments: { projectRoot, components: ['cards', 'date-picker'], sections, workflowId: result.structuredContent.workflowId } });
      assert.equal(selected.structuredContent.status, 'blocked');
      for (const field of ['contractCompatibility', 'contractProvenance', 'contractProvenanceDetails', 'blockedChecks', 'capabilityEvidence']) {
        assert.deepEqual(selected.structuredContent[field], result.structuredContent[field]);
      }
      assert.ok(selected.structuredContent.found.every((entry) => entry.capability === null));
      for (const [section, expectations] of [['options', catalogueOptions], ['methods', catalogueMethods]]) {
        if (sections.includes(section)) {
          assert.deepEqual(selected.structuredContent.found[0][section], expectations.get('cards.md'));
          assert.deepEqual(selected.structuredContent.found[1][section], expectations.get('date-picker.md'));
        } else assert.ok(selected.structuredContent.found.every((entry) => !Object.hasOwn(entry, section)));
      }
      assert.deepEqual(JSON.parse(selected.content[0].text), selected.structuredContent);
    }
  }
  const missingSyntax = await client.callTool({
    name: 'component_syntax_expert',
    arguments: { projectRoot: matchingDir, components: ['cards', 'unknown-component'] },
  });
  assert.equal(missingSyntax.structuredContent.status, 'blocked');
  assert.equal(missingSyntax.structuredContent.coverageStatus, 'partial-named-component-contracts');
  assert.deepEqual(missingSyntax.structuredContent.missing.map((entry) => entry.requested), ['unknown-component']);
  assert.deepEqual(missingSyntax.structuredContent.found[0].rules, catalogueRules.get('cards.md'));
  for (const sections of [['options'], ['methods'], ['options', 'methods']]) {
    const missingSections = await client.callTool({ name: 'component_syntax_expert', arguments: { projectRoot: matchingDir, components: ['cards', 'unknown-component'], sections, workflowId: missingSyntax.structuredContent.workflowId } });
    assert.equal(missingSections.structuredContent.found.length, 1);
    for (const section of sections) assert.deepEqual(missingSections.structuredContent.found[0][section], { status: 'absent', markdown: null });
    assert.deepEqual(withoutApiSelection(missingSections.structuredContent), withoutApiSelection(missingSyntax.structuredContent));
    assert.deepEqual(JSON.parse(missingSections.content[0].text), missingSections.structuredContent);
  }

  const foundations = await client.callTool({ name: 'component_syntax_expert', arguments: { projectRoot: matchingDir, foundations: ['typography', 'shape', 'motion'] } });
  assert.equal(foundations.structuredContent.foundCount, 0);
  assert.deepEqual(foundations.structuredContent.foundations.map((entry) => entry.slug), ['typography', 'shape', 'motion']);
  assert.ok(foundations.structuredContent.foundations.every((entry) => entry.lastReviewedSupport === 'partial' && entry.support === (entry.sourceReview === 'source-reviewed' ? 'partial' : 'unassessed')));
  for (const sections of [['options'], ['methods'], ['options', 'methods']]) {
    const foundationSections = await client.callTool({ name: 'component_syntax_expert', arguments: { projectRoot: matchingDir, foundations: ['typography', 'shape', 'motion'], sections, workflowId: foundations.structuredContent.workflowId } });
    assert.deepEqual(foundationSections.structuredContent, foundations.structuredContent);
    assert.deepEqual(JSON.parse(foundationSections.content[0].text), foundationSections.structuredContent);
  }
  const blockedFoundations = await client.callTool({ name: 'component_syntax_expert', arguments: { projectRoot: versionedDir, foundations: ['shape'] } });
  assert.equal(blockedFoundations.structuredContent.capabilityEvidence.status, 'blocked');
  assert.deepEqual(blockedFoundations.structuredContent.foundations, []);

  for (const projectRoot of [matchingDir, outsideDir, versionedDir, staleSourceDir, unprovenSourceDir, noncanonicalSourceDir, tamperedGuideDir]) {
    for (const request of [
      { components: ['cards', 'date-picker', 'unknown-component'], sections: ['options', 'methods'], foundations: ['shape'] },
      { foundations: ['typography', 'shape', 'motion'] },
      { components: ['unknown-component'] },
      { components: ['cards', 'cards'] },
    ]) {
      const arguments_ = { projectRoot, workflowId, ...request };
      const baseline = await client.callTool({ name: 'component_syntax_expert', arguments: arguments_ });
      for (const detail of ['compact', 'detailed']) {
        for (const includeCapabilities of [undefined, false, true]) {
          const projected = await client.callTool({ name: 'component_syntax_expert', arguments: { ...arguments_, detail, ...(includeCapabilities === undefined ? {} : { includeCapabilities }) } });
          assertSyntaxSelection(projected, { detail, includeCapabilities, sections: request.sections });
          assert.equal(validateSyntaxOutput(projected.structuredContent).valid, true);
          assert.deepEqual(withoutSyntaxSelection(projected.structuredContent), withoutSyntaxSelection(baseline.structuredContent));
          for (const [index, entry] of projected.structuredContent.found.entries()) {
            for (const field of ['contract', 'syntax', 'options', 'methods', 'capability']) {
              if (Object.hasOwn(entry, field)) assert.deepEqual(entry[field], baseline.structuredContent.found[index][field]);
            }
          }
        }
      }
    }
    for (const detail of ['compact', 'detailed']) {
      const empty = await client.callTool({ name: 'component_syntax_expert', arguments: { projectRoot, detail, components: [], foundations: [] } });
      assert.equal(empty.isError, true, 'empty syntax requests remain invalid');
    }
  }

  const quality = await client.callTool({
    name: 'quality_inspector',
    arguments: {
      projectRoot: packageDir,
      files: ['README.md'],
      runType: 'quick',
    },
  });
  assert.ok(['pass', 'warn', 'needs_fix', 'blocked'].includes(quality.structuredContent.status));
  assert.ok(['static_contract_pass', 'static_contract_warn', 'static_contract_needs_fix', 'static_contract_blocked'].includes(quality.structuredContent.scopedStatus));
  assert.ok(Array.isArray(quality.structuredContent.checksPerformed));
  assert.ok(quality.structuredContent.uncheckedAreas.includes('visual hierarchy'));
  assert.ok(quality.structuredContent.uncheckedAreas.includes('screen-reader announcements'));
  assert.notEqual(quality.structuredContent.coverageStatus, 'full-review-pass');
  assertScopedResult(quality, 'quality_inspector');

  const matchingQuality = await client.callTool({
    name: 'quality_inspector',
    arguments: { projectRoot: matchingDir, files: ['clean.html'], runType: 'quick' },
  });
  assert.equal(matchingQuality.structuredContent.contractCompatibility, 'match');
  assert.equal(matchingQuality.structuredContent.status, 'pass');
  assert.equal(matchingQuality.structuredContent.staticStatus, 'heuristic_pass');
  assert.equal(matchingQuality.structuredContent.scopedStatus, 'static_contract_pass');
  assert.equal(matchingQuality.structuredContent.reviewComplete, false);
  assert.equal(matchingQuality.structuredContent.coverageStatus, 'partial-static-evidence');
  assert.ok(matchingQuality.structuredContent.uncheckedAreas.length > 0);

  const staleQuality = await client.callTool({
    name: 'quality_inspector',
    arguments: { projectRoot: staleSourceDir, files: ['package.json'], runType: 'quick' },
  });
  assert.equal(staleQuality.structuredContent.contractCompatibility, 'match');
  assert.equal(staleQuality.structuredContent.contractProvenance, 'stale');
  assert.equal(staleQuality.structuredContent.status, 'blocked');
  assert.ok(staleQuality.structuredContent.blockedChecks.includes('local contract provenance is stale'));

  const emptyQuality = await client.callTool({
    name: 'quality_inspector',
    arguments: { projectRoot: matchingDir, files: [], runType: 'quick' },
  });
  assertScopedResult(emptyQuality, 'quality_inspector empty input');
  assert.notEqual(emptyQuality.structuredContent.status, 'pass');
  assert.ok(emptyQuality.structuredContent.blockedChecks.includes('static inspection'));

  const mechanical = await client.callTool({
    name: 'quality_inspector',
    arguments: {
      projectRoot: outsideDir,
      files: ['mechanical.js', 'raw-color.css', 'retired-markup.html'],
      runType: 'quick',
      workflowId,
    },
  });
  const mechanicalIssueIds = mechanical.structuredContent.staticFindings
    .flatMap((finding) => finding.issues.map((issue) => issue.id));
  assert.ok(mechanicalIssueIds.includes('possible-duplicate-initialization'));
  assert.ok(mechanicalIssueIds.includes('manual-init-without-teardown'));
  assert.ok(mechanicalIssueIds.includes('raw-color-in-component-style'));
  assert.ok(mechanicalIssueIds.includes('legacy-input-field'));
  assert.ok(mechanicalIssueIds.includes('legacy-materialize-textarea'));

  const multipleManualInit = await client.callTool({
    name: 'quality_inspector',
    arguments: { projectRoot: outsideDir, files: ['manual-init.js'], runType: 'quick' },
  });
  const manualInitIssues = multipleManualInit.structuredContent.staticFindings[0].issues;
  assert.deepEqual(
    manualInitIssues.filter((issue) => issue.id === 'possible-duplicate-initialization').map((issue) => issue.location.line),
    [2, 4, 6],
  );
  assert.deepEqual(
    manualInitIssues.filter((issue) => issue.id === 'manual-init-without-teardown').map((issue) => issue.location.line),
    [6],
  );

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
  assert.equal(confined.structuredContent.status, 'blocked');

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

  const partialInspection = await client.callTool({
    name: 'quality_inspector',
    arguments: {
      projectRoot: outsideDir,
      files: ['invalid.html', 'oversized.css', 'directory-as-file', 'missing.css'],
      runType: 'quick',
    },
  });
  assert.deepEqual(partialInspection.structuredContent.coverage.filesInspected, ['invalid.html']);
  assert.deepEqual(
    partialInspection.structuredContent.coverage.filesUninspected.map((entry) => entry.file).sort(),
    ['directory-as-file', 'missing.css', 'oversized.css'],
  );
  assert.ok(partialInspection.structuredContent.blockedChecks.includes('some requested files were not inspected'));
  assert.notEqual(partialInspection.structuredContent.status, 'pass');
  const blockedFindingIds = partialInspection.structuredContent.staticFindings
    .flatMap((finding) => finding.issues.map((issue) => issue.id));
  assert.equal(blockedFindingIds.includes('file-too-large'), false);
  assert.equal(blockedFindingIds.includes('read-failure'), false);

  const aggregateLimited = await client.callTool({
    name: 'quality_inspector',
    arguments: {
      projectRoot: outsideDir,
      files: ['aggregate-a.css', 'aggregate-b.css'],
      runType: 'quick',
    },
  });
  assert.equal(aggregateLimited.structuredContent.status, 'blocked');
  assert.ok(aggregateLimited.structuredContent.coverage.filesUninspected.some(
    (entry) => entry.reason.includes('aggregate byte limit'),
  ));

  const unavailableManagerTransport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(packageDir, 'server.js')],
    cwd: packageDir,
    stderr: 'pipe',
    env: {
      ...process.env,
      PATH: emptyBinDir,
      EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS: outsideDir,
    },
  });
  const unavailableManagerClient = new Client({
    name: 'expressivecss-mcp-unavailable-manager-smoke',
    version: '0.1.0',
  });
  try {
    await unavailableManagerClient.connect(unavailableManagerTransport);
    for (const [manager, projectRoot] of [['pnpm', pnpmDir], ['yarn', yarnDir]]) {
      const managerCheck = await unavailableManagerClient.callTool({
        name: 'quality_inspector',
        arguments: { projectRoot, files: [], runType: 'standard', runCommands: true },
      });
      const command = managerCheck.structuredContent.commandChecks[0];
      assert.equal(command.manager, manager);
      assert.equal(command.command, `${manager} run typecheck`);
      assert.equal(command.exitStatus, null);
      assert.equal(command.completed, false);
      assert.ok(managerCheck.structuredContent.blockedChecks.includes('typecheck command could not be launched'));
      assert.notEqual(managerCheck.structuredContent.status, 'pass');
    }
  } finally {
    await unavailableManagerClient.close();
  }

  const unknownManager = await client.callTool({
    name: 'quality_inspector',
    arguments: { projectRoot: staleSourceDir, files: [], runType: 'standard', runCommands: true },
  });
  assert.deepEqual(unknownManager.structuredContent.commandChecks, []);
  assert.ok(unknownManager.structuredContent.blockedChecks.includes('package manager could not be detected'));
  assert.notEqual(unknownManager.structuredContent.status, 'pass');

  const deniedCommand = await client.callTool({
    name: 'quality_inspector',
    arguments: { projectRoot: deniedCommandDir, files: [], runType: 'standard', runCommands: true },
  });
  assert.equal(deniedCommand.structuredContent.commandExecutionPolicy.allowed, false);
  assert.deepEqual(deniedCommand.structuredContent.commandChecks, []);
  assert.ok(deniedCommand.structuredContent.blockedChecks.includes('command execution root is not allowlisted'));
  await assert.rejects(access(path.join(deniedCommandDir, 'ran.txt')), { code: 'ENOENT' });

  const timeoutTransport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(packageDir, 'server.js')],
    cwd: packageDir,
    stderr: 'pipe',
    env: {
      ...process.env,
      EXPRESSIVECSS_MCP_COMMAND_TIMEOUT_MS: '50',
      EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS: timeoutDir,
    },
  });
  const timeoutClient = new Client({ name: 'expressivecss-mcp-timeout-smoke', version: '0.1.0' });
  try {
    await timeoutClient.connect(timeoutTransport);
    const timedOut = await timeoutClient.callTool({
      name: 'quality_inspector',
      arguments: { projectRoot: timeoutDir, files: [], runType: 'standard', runCommands: true },
    });
    assert.equal(timedOut.structuredContent.commandChecks[0].manager, 'npm');
    assert.equal(timedOut.structuredContent.commandChecks[0].timedOut, true);
    assert.equal(timedOut.structuredContent.commandChecks[0].completed, false);
    assert.ok(timedOut.structuredContent.blockedChecks.includes('typecheck command timed out'));
    assert.notEqual(timedOut.structuredContent.status, 'pass');
  } finally {
    await timeoutClient.close();
  }

  const trapTransport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(packageDir, 'server.js')],
    cwd: packageDir,
    stderr: 'pipe',
    env: {
      ...process.env,
      EXPRESSIVECSS_MCP_COMMAND_TIMEOUT_MS: '50',
      EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS: trapDir,
    },
  });
  const trapClient = new Client({ name: 'expressivecss-mcp-trap-smoke', version: '0.1.0' });
  try {
    await trapClient.connect(trapTransport);
    const trapped = await trapClient.callTool({
      name: 'quality_inspector',
      arguments: { projectRoot: trapDir, files: [], runType: 'standard', runCommands: true },
    });
    assert.equal(trapped.structuredContent.commandChecks[0].timedOut, true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    await assert.rejects(access(path.join(trapDir, 'survived.txt')), { code: 'ENOENT' });
  } finally {
    await trapClient.close();
  }

  const allowedEnvironment = await client.callTool({
    name: 'quality_inspector',
    arguments: {
      projectRoot: outsideDir,
      files: [],
      runType: 'standard',
      runCommands: true,
      workflowId,
    },
  });
  assert.equal(allowedEnvironment.structuredContent.commandExecutionPolicy.allowed, true);
  assert.equal(allowedEnvironment.structuredContent.commandChecks[0].completed, true);
  assert.match(allowedEnvironment.structuredContent.commandChecks[0].output, /"path":true/);
  assert.match(allowedEnvironment.structuredContent.commandChecks[0].output, /"ci":"1"/);
  assert.match(allowedEnvironment.structuredContent.commandChecks[0].output, /"secret":null/);
  assert.match(allowedEnvironment.structuredContent.commandChecks[0].output, /"home":"\[LOCAL_PATH\]"/);
  assert.match(allowedEnvironment.structuredContent.commandChecks[0].output, /"client_secret":"\[REDACTED\]"/);
  assert.doesNotMatch(allowedEnvironment.structuredContent.commandChecks[0].output, /plain-secret-value|must-not-reach-child/);

  const consumerCommand = await client.callTool({
    name: 'quality_inspector',
    arguments: { projectRoot: outsideDir, runType: 'consumer', runCommands: true },
  });
  assert.equal(consumerCommand.structuredContent.commandChecks.length, 1);
  assert.equal(consumerCommand.structuredContent.commandChecks[0].command, 'npm run verify:expressivecss');
  assert.equal(consumerCommand.structuredContent.commandChecks[0].exitStatus, 0);
  assert.match(consumerCommand.structuredContent.commandChecks[0].output, /CANDIDATE_CLAIM_ONLY/);
  assert.equal(consumerCommand.structuredContent.reviewComplete, false);
  assert.ok(consumerCommand.structuredContent.uncheckedAreas.includes('focus visibility and order'));
  for (const arguments_ of [
    { projectRoot: outsideDir, runType: 'consumer', runCommands: false },
    { projectRoot: deniedCommandDir, runType: 'consumer', runCommands: true },
  ]) {
    const deniedConsumer = await client.callTool({ name: 'quality_inspector', arguments: arguments_ });
    assert.deepEqual(deniedConsumer.structuredContent.commandChecks, []);
  }
  const missingConsumer = await client.callTool({ name: 'quality_inspector', arguments: { projectRoot: matchingDir, runType: 'consumer', runCommands: true } });
  assert.notEqual(missingConsumer.structuredContent.status, 'pass');

  // Recoverable verification: exact input evidence, no automatic restoration, and no later scripts after failure.
  const originalManifest = await readFile(path.join(matchingDir, 'package.json'));
  const originalMarkup = await readFile(path.join(matchingDir, 'clean.html'));
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  const qualityArgs = { projectRoot: matchingDir, files: ['clean.html'], runType: 'full', runCommands: true };
  const setScripts = async typecheck => writeFile(path.join(matchingDir, 'package.json'), JSON.stringify({
    ...JSON.parse(originalManifest), scripts: { typecheck, test: `node -e "require('fs').writeFileSync('later-script.txt','ran')"` },
  }));
  await writeFile(path.join(matchingDir, 'package-lock.json'), '{}');
  await writeFile(path.join(matchingDir, 'unrelated-dirty.txt'), 'Uncommitted user work.');
  try {
    const pinned = (await client.callTool({ name: 'quality_inspector', arguments: { ...qualityArgs, runCommands: false } })).structuredContent;
    assert.deepEqual(pinned.inspectionEvidence.files, [{ file: 'clean.html', sha256: digest(originalMarkup), bytes: originalMarkup.length }]);
    assert.equal(pinned.inspectionEvidence.inputsUnchanged, true);
    assert.equal(pinned.inspectionEvidence.expectedMatched, null);
    await setScripts('node -e "process.exit(1)"');
    const failure = (await client.callTool({ name: 'quality_inspector', arguments: qualityArgs })).structuredContent;
    assert.equal(failure.commandChecks.length, 1);
    assert.equal(failure.commandChecks[0].exitStatus, 1);
    assert.deepEqual(failure.commandExecutionPolicy.commandsNotRun, ['test']);
    assert.equal(failure.inspectionEvidence.inputsUnchanged, true);
    assert.equal(failure.inspectionEvidence.commandManifestSha256, digest(await readFile(path.join(matchingDir, 'package.json'))));
    await assert.rejects(access(path.join(matchingDir, 'later-script.txt')));

    await setScripts(`node -e "require('fs').writeFileSync('clean.html','<main>Changed during verification</main>')"`);
    const drift = (await client.callTool({ name: 'quality_inspector', arguments: { ...qualityArgs, expectedSourceHashes: { 'clean.html': digest(originalMarkup) } } })).structuredContent;
    assert.equal(drift.commandChecks.length, 1);
    assert.equal(drift.status, 'blocked');
    assert.equal(drift.inspectionEvidence.inputsUnchanged, false);
    assert.equal(drift.inspectionEvidence.expectedMatched, true);
    assert.equal(drift.inspectionEvidence.files[0].sha256, digest(originalMarkup));
    assert.match(await readFile(path.join(matchingDir, 'clean.html'), 'utf8'), /Changed during verification/);
    for (const expectedSourceHashes of [{ 'clean.html': digest(originalMarkup) }, { '../outside.txt': digest(originalMarkup) }]) {
      const stale = (await client.callTool({ name: 'quality_inspector', arguments: { ...qualityArgs, expectedSourceHashes } })).structuredContent;
      assert.equal(stale.inspectionEvidence.expectedMatched, false);
      assert.equal(stale.status, 'blocked');
      assert.deepEqual(stale.commandChecks, []);
    }
    await setScripts(`node -e "require('fs').writeFileSync('package.json','{}')"`);
    const manifestDrift = (await client.callTool({ name: 'quality_inspector', arguments: qualityArgs })).structuredContent;
    assert.equal(manifestDrift.inspectionEvidence.inputsUnchanged, false);
    assert.equal(manifestDrift.commandChecks.length, 1);
    assert.deepEqual(manifestDrift.commandExecutionPolicy.commandsNotRun, ['test']);
    await setScripts('node -e "process.exit(0)"');
    await assert.rejects(access(path.join(matchingDir, 'later-script.txt')));
    assert.equal(await readFile(path.join(matchingDir, 'unrelated-dirty.txt'), 'utf8'), 'Uncommitted user work.');
    await writeFile(path.join(matchingDir, 'clean.html'), originalMarkup);
    const restored = (await client.callTool({ name: 'quality_inspector', arguments: { ...qualityArgs, runCommands: false, expectedSourceHashes: { 'clean.html': digest(originalMarkup) } } })).structuredContent;
    assert.equal(restored.inspectionEvidence.expectedMatched, true);
    assert.equal(restored.inspectionEvidence.inputsUnchanged, true);
    await writeFile(path.join(matchingDir, 'orphan.mjs'), `import { spawn } from 'node:child_process';
spawn(process.execPath, ['-e', "setTimeout(() => require('node:fs').writeFileSync('orphan-survived.txt', 'yes'), 1500)"], { stdio: 'ignore' }).unref();
`);
    await setScripts('node orphan.mjs');
    const exited = (await client.callTool({ name: 'quality_inspector', arguments: { ...qualityArgs, runType: 'standard' } })).structuredContent;
    assert.equal(exited.commandChecks[0].exitStatus, 0);
    await new Promise(resolve => setTimeout(resolve, 1800));
    await assert.rejects(access(path.join(matchingDir, 'orphan-survived.txt')));
    await setScripts('node -e "process.exit(0)"');
    for (const scope of ['["typecheck"]', '[]', 'invalid', '["test", "deploy"]']) {
      const scopedClient = new Client({ name: 'scoped-command-smoke', version: '0.1.0' });
      try {
        await scopedClient.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(packageDir, 'server.js')], stderr: 'pipe', env: {
          ...process.env, EXPRESSIVECSS_MCP_ALLOWED_COMMAND_ROOTS: matchingDir, EXPRESSIVECSS_MCP_ALLOWED_SCRIPTS: scope,
        } }));
        const denied = (await scopedClient.callTool({ name: 'quality_inspector', arguments: { ...qualityArgs, allowedScripts: ['typecheck', 'test'] } })).structuredContent;
        assert.equal(denied.status, 'blocked');
        assert.deepEqual(denied.commandChecks, []);
        assert.ok(denied.blockedChecks.includes('requested scripts exceed server command scope'));
        assert.deepEqual(denied.commandExecutionPolicy.allowedScripts, scope === '["typecheck"]' ? ['typecheck'] : []);
        if (scope === '["typecheck"]') {
          const permitted = (await scopedClient.callTool({ name: 'quality_inspector', arguments: { ...qualityArgs, runType: 'standard' } })).structuredContent;
          assert.equal(permitted.commandChecks.length, 1);
          assert.equal(permitted.commandChecks[0].exitStatus, 0);
          assert.equal(permitted.inspectionEvidence.inputsUnchanged, true);
        }
      } finally { await scopedClient.close(); }
    }
  } finally {
    await writeFile(path.join(matchingDir, 'package.json'), originalManifest);
    await writeFile(path.join(matchingDir, 'clean.html'), originalMarkup);
  }

  const skippedTransport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(packageDir, 'server.js')],
    cwd: packageDir,
    stderr: 'pipe',
    env: {
      ...process.env,
      SKIP_SETUP_EXPERT: 'true',
      SKIP_RULES_ENFORCER: 'true',
      SKIP_CREATIVE_DIRECTOR: 'true',
      SKIP_PAGE_ARCHITECT: 'true',
      SKIP_COMPONENT_SYNTAX_EXPERT: 'true',
      SKIP_QUALITY_INSPECTOR: 'true',
    },
  });
  const skippedClient = new Client({ name: 'expressivecss-mcp-skipped-smoke', version: '0.1.0' });
  try {
    await skippedClient.connect(skippedTransport);
    for (const [name, arguments_] of [
      ['setup_expert', { projectRoot: matchingDir }],
      ['rules_enforcer', { projectRoot: matchingDir, snippet: '<main></main>' }],
      ['creative_director', { projectRoot: matchingDir, goal: 'Choose a primary action component.' }],
      ['page_architect', { projectRoot: matchingDir, pageGoal: 'Structure a settings page.' }],
      ['component_syntax_expert', { projectRoot: matchingDir, components: ['buttons'] }],
      ['component_syntax_expert', { projectRoot: matchingDir, components: ['buttons'], sections: ['options'] }],
      ['component_syntax_expert', { projectRoot: matchingDir, components: ['buttons'], sections: ['methods'] }],
      ['component_syntax_expert', { projectRoot: matchingDir, components: ['buttons'], sections: ['options', 'methods'] }],
      ['component_syntax_expert', { projectRoot: matchingDir, components: ['buttons'], detail: 'compact', includeCapabilities: true }],
      ['component_syntax_expert', { projectRoot: matchingDir, foundations: ['shape'], detail: 'detailed', includeCapabilities: false }],
      ['quality_inspector', { projectRoot: matchingDir, files: ['README.md'] }],
    ]) {
      const skipped = await skippedClient.callTool({ name, arguments: arguments_ });
      assertScopedResult(skipped, `${name} skipped`);
      assert.equal(skipped.structuredContent.status, 'blocked');
      assert.equal(skipped.structuredContent.coverageStatus, 'skipped');
      assert.ok(skipped.structuredContent.blockedChecks.includes(`${name} disabled`));
      if (name === 'component_syntax_expert') {
        assert.equal(validateSyntaxOutput(skipped.structuredContent).valid, true);
        for (const field of ['detail', 'includeCapabilities', 'found']) assert.equal(Object.hasOwn(skipped.structuredContent, field), false);
        assert.deepEqual(JSON.parse(skipped.content[0].text), skipped.structuredContent);
      }
    }
  } finally {
    await skippedClient.close();
  }

  console.log(`ExpressiveCSS MCP smoke test passed (${expectedTools.length} tools, catalogue and component resources, aggregate response budgets and recovery).`);
} finally {
  await client.close();
  await rm(outsideDir, { recursive: true, force: true });
  await rm(deniedCommandDir, { recursive: true, force: true });
}
