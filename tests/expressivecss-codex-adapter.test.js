import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { hashProject, snapshotProject, runCodex, summarizeEvents, validateVerificationClaims } from '../scripts/expressivecss-codex-adapter.mjs';

async function fixture(check) {
  const directory = await mkdtemp(path.join(tmpdir(), 'expressivecss-codex-test-'));
  const projectRoot = path.join(directory, 'project');
  const skillRoot = path.join(directory, 'skill');
  const artifactDirectory = path.join(directory, 'artifacts');
  const configPath = path.join(directory, 'config.toml');
  const executable = path.join(directory, 'fake-codex');
  try {
    await mkdir(projectRoot);
    await mkdir(skillRoot);
    await writeFile(path.join(projectRoot, 'index.html'), '<button>Save</button>');
    await writeFile(path.join(skillRoot, 'SKILL.md'), '# Root guide');
    await writeFile(configPath, 'model = "test-default"\nmodel_reasoning_effort = "high"\napi_key = "DO_NOT_COPY_CONFIG_SECRET"\n');
    const input = { projectRoot, skillRoot, artifactDirectory, rootSkill: '# Root guide', task: { id: 'example', request: 'Inspect the button.' } };
    const run = async (program, options = {}, extraInput = {}) => {
      await writeFile(executable, `#!${process.execPath}\nconst emit = (value) => process.stdout.write(JSON.stringify(value) + '\\n');\n${program}\n`, { mode: 0o700 });
      return runCodex({ ...input, ...extraInput }, { executable, configPath, timeoutMs: 3000, ...options });
    };
    await check({ directory, projectRoot, skillRoot, artifactDirectory, configPath, executable, input, run });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const completion = `
emit({type:'item.completed', item:{type:'agent_message', text:JSON.stringify({caseId:'example',summary:'Done',executionEvidence:{artifacts:['forged']}})}});
emit({type:'turn.completed', usage:{input_tokens:12,cached_input_tokens:3,output_tokens:4}});`;

test('operator metadata pins config defaults, preserves Unicode and rejects candidate evidence claims', async () => {
  await fixture(async ({ run, configPath }) => {
    await writeFile(configPath, 'model = "unused"\nprofile = "evaluation"\n[profiles.evaluation]\nmodel = "profile-default"\nmodel_reasoning_effort = "high"\napi_key = "DO_NOT_COPY_CONFIG_SECRET"\n');
    const result = await run(`
      let prompt = ''; for await (const chunk of process.stdin) prompt += chunk;
      emit({type:'item.completed',item:{type:'command_execution',exit_code:0,aggregated_output:'# Root guide'}});
      emit({type:'item.completed',item:{type:'agent_message',text:JSON.stringify({summary:'acción ✓', args:process.argv.slice(2), prompt})}});
      emit({type:'turn.completed',usage:{input_tokens:12,cached_input_tokens:3,output_tokens:4}});
    `, {}, { model: 'UNTRUSTED_MODEL', settings: { reasoningEffort: 'low' }, readOnly: true });
    assert.equal(result.runMetadata.infrastructureError, null);
    assert.equal(result.runMetadata.model, 'profile-default');
    assert.equal(result.runMetadata.settings.reasoningEffort, 'high');
    assert.deepEqual(result.runMetadata.usage, { input_tokens: 12, cached_input_tokens: 3, output_tokens: 4 });
    assert.equal(result.runMetadata.toolCalls, 1);
    assert.equal(result.candidateResponse.summary, 'acción ✓');
    assert.ok(result.candidateResponse.args.includes('profile-default'));
    assert.ok(result.candidateResponse.args.includes('model_reasoning_effort="high"'));
    assert.ok(result.candidateResponse.args.includes('read-only'));
    assert.ok(!JSON.stringify(result).includes('DO_NOT_COPY_CONFIG_SECRET'));
    assert.deepEqual(result.runMetadata.observedGuideReads, ['skills/expressivecss/SKILL.md']);
    assert.equal(result.executionEvidence.filesystem.before, result.executionEvidence.filesystem.after);
    assert.deepEqual(result.executionEvidence.artifacts, []);
    const forged = await run(completion);
    assert.deepEqual(forged.candidateResponse.executionEvidence.artifacts, ['forged']);
    assert.deepEqual(forged.executionEvidence.artifacts, []);
  });
});

test('missing usage remains unavailable and unfinished runs fail', async () => {
  await fixture(async ({ run, configPath }) => {
    await writeFile(configPath, 'not valid TOML {');
    const noUsage = await run("emit({type:'item.completed',item:{type:'agent_message',text:'Done'}}); emit({type:'turn.completed'});");
    assert.equal(noUsage.runMetadata.infrastructureError, null);
    assert.deepEqual(noUsage.runMetadata.usage, { input_tokens: null, cached_input_tokens: null, output_tokens: null });
    assert.equal(noUsage.runMetadata.model, null);
    const incomplete = await run("emit({type:'item.completed',item:{type:'agent_message',text:'Done'}});");
    assert.match(incomplete.runMetadata.infrastructureError, /without a completed turn/);
    const failed = await run("emit({type:'turn.failed',error:{message:'API unavailable'}});");
    assert.match(failed.runMetadata.infrastructureError, /failed turn/);
  });
});

test('malformed streams preserve completed events and redact archived output', async () => {
  await fixture(async ({ run, artifactDirectory }) => {
    const result = await run("emit({type:'item.completed',item:{type:'agent_message',text:'TOKEN=private-token-value'}}); process.stdout.write('not-json\\n'); setInterval(() => {}, 1000);");
    assert.ok(result.runMetadata.infrastructureError);
    const transcript = await readFile(path.join(artifactDirectory, 'transcript.json'), 'utf8');
    assert.match(transcript, /item.completed/);
    assert.ok(!transcript.includes('private-token-value'));
    assert.match(await readFile(path.join(artifactDirectory, 'response.json'), 'utf8'), /infrastructureError/);
    const invalid = await run("emit(null);");
    assert.match(invalid.runMetadata.infrastructureError, /Invalid Codex event/);
  });
});

test('timeout reaps the process before collecting state and handles launch failure', async () => {
  await fixture(async ({ run, input, executable, configPath, directory }) => {
    const pidPath = path.join(directory, 'child.pid');
    const result = await run(`const fs = await import('node:fs'); fs.writeFileSync(${JSON.stringify(pidPath)}, String(process.pid)); setInterval(() => {}, 1000);`, { timeoutMs: 700 });
    assert.match(result.runMetadata.infrastructureError, /exceeded 700ms/);
    const pid = Number(await readFile(pidPath, 'utf8'));
    assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
    const missing = await runCodex(input, { executable: `${executable}-missing`, configPath });
    assert.match(missing.runMetadata.infrastructureError, /ENOENT/);
  });
});

test('hashing detects shell edits, empty directories, binary changes and rejects links', async () => {
  await fixture(async ({ run, projectRoot }) => {
    const before = await hashProject(projectRoot);
    await mkdir(path.join(projectRoot, 'empty'));
    assert.notEqual(await hashProject(projectRoot), before);
    const withoutGit = await hashProject(projectRoot);
    await mkdir(path.join(projectRoot, '.git'));
    await writeFile(path.join(projectRoot, '.git/config'), '[core]\n');
    assert.notEqual(await hashProject(projectRoot), withoutGit);
    const firstGitConfig = await snapshotProject(projectRoot);
    await writeFile(path.join(projectRoot, '.git/config'), '[core]\nrepositoryformatversion=0\n');
    assert.notEqual((await snapshotProject(projectRoot)).manifest['.git/config'].sha256, firstGitConfig.manifest['.git/config'].sha256);
    await writeFile(path.join(projectRoot, 'binary'), Buffer.from([0xff]));
    const manifestBefore = await snapshotProject(projectRoot);
    assert.deepEqual(manifestBefore.manifest.empty, { type: 'directory', sha256: null });
    assert.match(manifestBefore.manifest.binary.sha256, /^[a-f0-9]{64}$/);
    const binaryBefore = await hashProject(projectRoot);
    await writeFile(path.join(projectRoot, 'binary'), Buffer.from([0xfe]));
    assert.notEqual(await hashProject(projectRoot), binaryBefore);
    assert.notEqual((await snapshotProject(projectRoot)).manifest.binary.sha256, manifestBefore.manifest.binary.sha256);
    const edited = await run(`const fs = await import('node:fs'); fs.writeFileSync(${JSON.stringify(path.join(projectRoot, 'index.html'))}, 'edited'); ${completion}`, {}, { readOnly: true });
    assert.notEqual(edited.executionEvidence.filesystem.before, edited.executionEvidence.filesystem.after);
    assert.notEqual(edited.executionEvidence.filesystem.beforeManifest['index.html'].sha256, edited.executionEvidence.filesystem.afterManifest['index.html'].sha256);
    assert.equal(edited.executionEvidence.toolTrace.some((entry) => entry.operation === 'patch'), false);
    await symlink('index.html', path.join(projectRoot, 'linked'));
    await assert.rejects(hashProject(projectRoot), /symbolic link/);
  });
});

test('unsafe preflight and post-run files become archived infrastructure errors', async () => {
  await fixture(async ({ run, projectRoot, skillRoot, artifactDirectory }) => {
    const after = await run(`const fs = await import('node:fs'); fs.symlinkSync('index.html', ${JSON.stringify(path.join(projectRoot, 'linked'))}); ${completion}`);
    assert.match(after.runMetadata.infrastructureError, /symbolic link/);
    assert.equal(after.executionEvidence.filesystem.after, null);
    assert.match(await readFile(path.join(artifactDirectory, 'transcript.json'), 'utf8'), /turn.completed/);
    await rm(path.join(projectRoot, 'linked'));
    await symlink('SKILL.md', path.join(skillRoot, 'linked.md'));
    const before = await run(completion);
    assert.match(before.runMetadata.infrastructureError, /symbolic link/);
    assert.equal(before.runMetadata.completedTurns, 0);
    assert.match(await readFile(path.join(artifactDirectory, 'response.json'), 'utf8'), /symbolic link/);
  });
});

test('event totals require complete, nonnegative usage and count tools independently', () => {
  const result = summarizeEvents([
    { type: 'turn.completed', usage: { input_tokens: 10, cached_input_tokens: 2, output_tokens: 3 } },
    { type: 'turn.completed', usage: { input_tokens: 5, cached_input_tokens: -1, output_tokens: 4 } },
    { type: 'item.completed', item: { type: 'command_execution' } },
    { type: 'item.completed', item: { type: 'file_change' } },
    { type: 'item.completed', item: { type: 'mcp_tool_call' } },
  ]);
  assert.deepEqual(result.usage, { input_tokens: 15, cached_input_tokens: null, output_tokens: 7 });
  assert.equal(result.toolCalls, 3);
  assert.equal(result.completedTurns, 2);
});

test('oversized streams and guide sets stop within the operator limits', async () => {
  await fixture(async ({ run, skillRoot }) => {
    const oversized = await run("process.stdout.write('x'.repeat(17 * 1024 * 1024)); setInterval(() => {}, 1000);");
    assert.match(oversized.runMetadata.infrastructureError, /exceeds 16 MiB/);
    await Promise.all(Array.from({ length: 256 }, (_, index) => writeFile(path.join(skillRoot, `guide-${index}.md`), '# Guide')));
    const guides = await run(completion);
    assert.match(guides.runMetadata.infrastructureError, /exceeds 256 Markdown files/);
    assert.equal(guides.runMetadata.completedTurns, 0);
  });
});

test('fixture browser connection preserves the sandbox and operator evidence ownership', async () => {
  await fixture(async ({ run }) => {
    const browserSession = { url: 'http://127.0.0.1:12345/scoped/mcp', capability: { status: 'available' }, records: [{ id: 'browser-2', action: 'inspect', status: 'success', result: { observation: 'actual DOM' } }] };
    const program = `let prompt='';for await(const chunk of process.stdin)prompt+=chunk;emit({type:'item.completed',item:{type:'agent_message',text:JSON.stringify({prompt,args:process.argv.slice(2),verificationChecks:[],verificationErrors:[],browser:{records:['forged']}})}});emit({type:'turn.completed',usage:{input_tokens:1,cached_input_tokens:0,output_tokens:1}});`;
    const result = await run(program, { browserSession }, { readOnly: true });
    assert.equal(result.runMetadata.infrastructureError, null);
    assert.ok(result.candidateResponse.args.includes('read-only'));
    assert.ok(result.candidateResponse.args.includes('mcp_servers.expressivecss_eval_browser.enabled_tools=["browser"]'));
    assert.deepEqual(result.candidateResponse.args.filter((arg) => /approval_mode/.test(arg)), ['mcp_servers.expressivecss_eval_browser.tools.browser.approval_mode="approve"']);
    assert.ok(!result.candidateResponse.args.some((arg) => /approval_policy|danger-full-access|bypass/.test(arg)));
    assert.match(result.candidateResponse.prompt, /Start with inspect/);
    assert.deepEqual(result.executionEvidence.browser.records, browserSession.records);
    browserSession.records[0].status = 'error';
    assert.equal(result.executionEvidence.browser.records[0].status, 'success');
    const blocked = await run(program, { browserSession: { url: null, capability: { status: 'unavailable', error: 'launch returned ECONNREFUSED' }, records: [] } });
    assert.ok(!blocked.candidateResponse.args.some((arg) => arg.includes('mcp_servers.')));
    assert.match(blocked.candidateResponse.prompt, /stop retrying/);
    assert.match(blocked.candidateResponse.prompt, /ECONNREFUSED/);
    await assert.rejects(run(program, { browserSession: { ...browserSession, url: 'https://example.com/mcp' } }), /loopback/);
  });
});

test('verification claims cannot turn missing operations or guessed error codes into evidence', () => {
  const evidence = { browser: { records: [
    { id: 'browser-2', action: 'inspect', status: 'success', result: { consoleErrors: ['Refused to load an image due to Content Security Policy'] } },
    { id: 'browser-3', action: 'click', status: 'error', error: 'Timeout waiting for selector #missing' },
  ] }, commandErrors: [{ command: 'node --check broken.js', exitCode: 1, output: 'SyntaxError: Unexpected token' }], connectorErrors: [{server:'expressivecss_eval_browser',tool:'browser',output:'MCP tool call requires approval, but approval policy is never'}] };
  const valid = { verificationChecks: [{ evidenceId: 'browser-2', status: 'observed' }, { evidenceId: 'browser-3', status: 'failed' }], verificationErrors: [{ source: 'browser', evidenceId: 'browser-3', excerpt: 'Timeout waiting for selector' }, { source: 'command', excerpt: 'SyntaxError: Unexpected token' }] };
  assert.deepEqual(validateVerificationClaims(valid, evidence), []);
  assert.deepEqual(validateVerificationClaims({ ...valid, verificationErrors: [{ source: 'browser', evidenceId: 'browser-2', excerpt: 'Refused to load an image due to Content Security Policy' }] }, evidence), []);
  assert.deepEqual(validateVerificationClaims({ ...valid, verificationErrors: [{ source: 'connector', server: 'expressivecss_eval_browser', tool: 'browser', excerpt: 'MCP tool call requires approval' }] }, evidence), []);
  for (const response of [
    {},
    { ...valid, verificationChecks: [{ evidenceId: 'invented-proof', status: 'observed' }] },
    { ...valid, verificationChecks: [{ evidenceId: 'browser-3', status: 'observed' }] },
    { ...valid, verificationErrors: [{ source: 'browser', evidenceId: 'browser-2', excerpt: 'listen EPERM' }] },
    { ...valid, verificationErrors: [{ source: 'command', excerpt: 'listen EPERM' }] },
    { ...valid, verificationErrors: [{ source: 'command', excerpt: 'error' }] },
    { ...valid, verificationErrors: [{ source: 'connector', server: 'wrong-server', tool: 'browser', excerpt: 'MCP tool call requires approval' }] },
  ]) assert.ok(validateVerificationClaims(response, evidence).length);
  // A compound command's failure cannot corroborate an invented subcommand error.
  assert.ok(validateVerificationClaims({ ...valid, verificationErrors: [{ source: 'command', excerpt: 'mock test failed' }] }, { ...evidence, commandErrors: [{ command: 'node mock.js; chrome', exitCode: 1, output: 'Chrome failed to launch' }] }).length);
});
