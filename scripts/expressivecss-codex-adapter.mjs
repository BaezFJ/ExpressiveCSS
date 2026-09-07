#!/usr/bin/env node
// Operator-owned bridge: model output is never execution evidence.
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { lstat, mkdir, readdir, realpath, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { parse as parseToml } from 'smol-toml';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { redactValue, readBoundedRegularFile } from './eval-expressivecss-skill.mjs';

async function walkFiles(root, visitFile, visitDirectory = () => {}) {
  const resolvedRoot = await realpath(root);
  if ((await lstat(root)).isSymbolicLink()) throw new Error('Root is a symbolic link');
  let count = 0;
  async function visit(directory) {
    const before = await lstat(directory);
    if (!before.isDirectory() || before.isSymbolicLink() || await realpath(directory) !== directory) {
      throw new Error('Directory contains a symbolic link or changed identity');
    }
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (directory === resolvedRoot && entry.name === '.git') continue;
      const filename = path.join(directory, entry.name);
      const relative = path.relative(resolvedRoot, filename);
      if (++count > 20_000) throw new Error('Directory exceeds 20000 entries');
      if (entry.isSymbolicLink()) throw new Error(`Directory contains a symbolic link: ${relative}`);
      if (entry.isDirectory()) {
        visitDirectory(relative);
        await visit(filename);
      } else if (entry.isFile()) await visitFile(filename, relative, resolvedRoot);
      else throw new Error(`Unsupported directory entry: ${relative}`);
    }
    const after = await lstat(directory);
    if (after.isSymbolicLink() || before.dev !== after.dev || before.ino !== after.ino
        || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) {
      throw new Error('Directory changed while reading');
    }
  }
  await visit(resolvedRoot);
}

export async function hashProject(root) {
  const hash = createHash('sha256');
  let bytes = 0;
  await walkFiles(root, async (filename, relative, resolvedRoot) => {
    const content = await readBoundedRegularFile(filename, 32 * 1024 * 1024, 'project file', resolvedRoot, null);
    bytes += content.length;
    if (bytes > 128 * 1024 * 1024) throw new Error('Project exceeds 128 MiB');
    hash.update('file\0').update(relative).update('\0').update(content).update('\0');
  }, (relative) => hash.update('directory\0').update(relative).update('\0'));
  return `sha256:${hash.digest('hex')}`;
}

// Only expose and pin observed defaults, never arbitrary config or caller metadata.
async function configuredDefaults(configPath) {
  try {
    const config = parseToml(await readBoundedRegularFile(configPath, 1_048_576, 'Codex configuration'));
    const profile = typeof config.profile === 'string' ? config.profiles?.[config.profile] : null;
    const selected = { ...config, ...profile };
    return Object.fromEntries(['model', 'model_reasoning_effort', 'model_provider'].map((key) => [key,
      typeof selected[key] === 'string' && /^[a-zA-Z0-9_.:/-]{1,120}$/.test(selected[key]) ? selected[key] : null]));
  } catch { return { model: null, model_reasoning_effort: null, model_provider: null }; }
}

export function summarizeEvents(events) {
  const completed = events.filter((event) => event.type === 'item.completed').map((event) => event.item);
  const turns = events.filter((event) => event.type === 'turn.completed');
  const usage = turns.length ? Object.fromEntries(['input_tokens', 'cached_input_tokens', 'output_tokens']
    .map((key) => [key, turns.every((event) => Number.isSafeInteger(event.usage?.[key]) && event.usage[key] >= 0)
      ? turns.reduce((sum, event) => sum + event.usage[key], 0) : null])) : null;
  return {
    usage,
    completedTurns: turns.length,
    toolCalls: completed.filter((item) => ['command_execution', 'mcp_tool_call', 'web_search', 'file_change'].includes(item?.type)).length,
    finalMessage: completed.filter((item) => item?.type === 'agent_message').at(-1)?.text ?? '',
    errors: events.filter((event) => event.type === 'error' || event.type === 'turn.failed'),
  };
}

async function guideFiles(root) {
  const files = [];
  let bytes = 0;
  if (root) await walkFiles(root, async (filename, _relative, resolvedRoot) => {
    if (!filename.endsWith('.md')) return;
    if (files.length >= 256) throw new Error('Skill exceeds 256 Markdown files');
    const text = await readBoundedRegularFile(filename, 1_048_576, 'guide', resolvedRoot);
    bytes += Buffer.byteLength(text);
    if (bytes > 16 * 1024 * 1024) throw new Error('Skill guides exceed 16 MiB');
    files.push({ filename, text });
  });
  return files;
}

export async function runCodex(input, { executable = 'codex', timeoutMs = 600_000, configPath = path.join(process.env.CODEX_HOME || path.join(homedir(), '.codex'), 'config.toml') } = {}) {
  if (!input?.projectRoot || !input?.task?.request) throw new Error('projectRoot and task.request are required');
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new Error('timeoutMs must be a positive integer');
  const started = performance.now();
  let before = null;
  let guides = [];
  let skillHash = null;
  const defaults = await configuredDefaults(configPath);
  const events = [];
  const trace = [];
  const guideReads = new Set();
  let buffer = '';
  let stderr = '';
  let bytes = 0;
  let sequence = 0;
  let lastTime = 0;
  const record = (operation, filename) => {
    const timestamp = Math.max(Date.now(), lastTime + 1);
    lastTime = timestamp;
    trace.push({ sequence: ++sequence, timestamp: new Date(timestamp).toISOString(), operation, path: filename, status: 'success' });
  };
  const rootText = typeof input.rootSkill === 'string' ? input.rootSkill : input.rootSkill?.content ?? '';
  if (rootText && !input.discovery) record('read', 'skills/expressivecss/SKILL.md'); // Actually supplied by the operator.
  const prompt = input.discovery ? input.task.request : [
    input.task.request,
    `Work in ${input.projectRoot}. The ExpressiveCSS skill directory is ${input.skillRoot}.`,
    rootText ? `The root skill has been read and is supplied below:\n${rootText}` : '',
    'Use the project files as task facts. Do not access evaluation cases, passing responses, grading scripts, or other runs.',
    'Do the requested work and verification. Report blockers honestly. Do not install or upgrade dependencies unless the task requests it.',
    `Return a JSON object with caseId, mode, summary, findings, and any task-specific decision/evidence fields. caseId is ${input.task.id}. Do not manufacture tool traces, filesystem hashes, or verification artifacts.`,
  ].join('\n\n');
  const args = ['exec', '--ephemeral', '--skip-git-repo-check', '--json', '-s', input.readOnly ? 'read-only' : 'workspace-write', '-C', input.projectRoot, '-'];
  if (defaults.model) args.splice(-1, 0, '-m', defaults.model);
  for (const key of ['model_reasoning_effort', 'model_provider']) {
    if (defaults[key]) args.splice(-1, 0, '-c', `${key}=${JSON.stringify(defaults[key])}`);
  }
  const observe = (line) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (!event || typeof event !== 'object' || typeof event.type !== 'string') throw new Error('Invalid Codex event');
    if (events.length >= 20_000) throw new Error('Codex exceeds 20000 events');
    events.push(event);
    const item = event.item;
    if (event.type !== 'item.completed' || !item) return;
    if (item.type === 'command_execution' && item.exit_code === 0 && typeof item.aggregated_output === 'string') {
      // Only count a complete guide visible in successful tool output, not a path in a command or prose.
      for (const guide of guides) if (guide.text && item.aggregated_output.includes(guide.text.trim())) {
        const relative = `skills/expressivecss/${path.relative(input.skillRoot, guide.filename).split(path.sep).join('/')}`;
        guideReads.add(relative);
        record('read', relative);
      }
    }
    if (item.type === 'file_change' && item.status === 'completed') {
      for (const change of item.changes ?? []) record(({ add: 'create', delete: 'delete', update: 'patch' })[change.kind] ?? 'patch', change.path);
    }
  };
  let failure = null;
  try {
    before = await hashProject(input.projectRoot);
    guides = await guideFiles(input.skillRoot);
    skillHash = input.skillRoot ? await hashProject(input.skillRoot) : null;
    await new Promise((resolve, reject) => {
      const child = spawn(executable, args, { shell: false, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
      let settled = false;
      const kill = () => { try { process.kill(process.platform === 'win32' ? child.pid : -child.pid, 'SIGKILL'); } catch {} };
      let pendingError = null;
      const finish = (error, closed = false) => {
        if (settled) return;
        if (error && !closed && child.pid) { pendingError ??= error; kill(); return; }
        settled = true;
        clearTimeout(timer);
        if (pendingError || error) reject(pendingError ?? error); else resolve();
      };
      const timer = setTimeout(() => finish(new Error(`Codex exceeded ${timeoutMs}ms`)), timeoutMs);
      child.on('error', finish);
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdin.on('error', (error) => { if (error.code !== 'EPIPE') finish(error); });
      child.stdout.on('data', (chunk) => {
        if (pendingError) return;
        bytes += Buffer.byteLength(chunk);
        if (bytes > 16 * 1024 * 1024) return finish(new Error('Codex JSONL exceeds 16 MiB'));
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        try { lines.forEach(observe); } catch (error) { finish(error); }
      });
      child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-65_536); });
      child.on('close', (status) => {
        kill(); // Stop background descendants before collecting the final filesystem state.
        try { if (!pendingError && buffer.trim()) observe(buffer); } catch (error) { return finish(error, true); }
        finish(status === 0 ? null : new Error(`Codex exited ${status}: ${stderr}`), true);
      });
      child.stdin.end(prompt);
    });
  } catch (error) { failure = redactValue(error.message); }
  const telemetry = summarizeEvents(events);
  if (!failure && telemetry.errors.length) failure = 'Codex reported a failed turn';
  if (!failure && (!telemetry.completedTurns || !telemetry.finalMessage)) failure = 'Codex ended without a completed turn and final message';
  let after = null;
  try { after = await hashProject(input.projectRoot); }
  catch (error) { failure ??= redactValue(error.message); }
  let candidateResponse;
  try { candidateResponse = JSON.parse(telemetry.finalMessage.replace(/^```json\s*|\s*```$/g, '')); }
  catch { candidateResponse = { caseId: input.task.id, summary: telemetry.finalMessage }; }
  const envelope = {
    candidateResponse,
    executionEvidence: { source: 'adapter', toolTrace: trace, filesystem: { source: 'adapter', independentlyComputed: true, algorithm: 'sha256', before, after }, artifacts: [] },
    runMetadata: { wallTimeMs: performance.now() - started, ...telemetry, observedGuideReads: [...guideReads], guideReadCoverage: 'complete-file tool output only; partial reads and unobservable tools are unavailable; shell edits are covered by filesystem hashes, not the edit trace', infrastructureError: failure, model: defaults.model, modelSource: defaults.model ? 'user-config default pinned in CLI' : 'unavailable', settings: { sandbox: input.readOnly ? 'read-only' : 'workspace-write', ephemeral: true, reasoningEffort: defaults.model_reasoning_effort, provider: defaults.model_provider }, skillHash },
  };
  if (input.artifactDirectory) {
    await mkdir(input.artifactDirectory, { recursive: true });
    await writeFile(path.join(input.artifactDirectory, 'transcript.json'), JSON.stringify(redactValue(events), null, 2));
    await writeFile(path.join(input.artifactDirectory, 'response.json'), JSON.stringify(redactValue(envelope), null, 2));
  }
  return envelope;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  let input = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    input += chunk;
    if (Buffer.byteLength(input) > 1_048_576) throw new Error('Adapter input exceeds 1 MiB');
  }
  const result = await runCodex(JSON.parse(input));
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.runMetadata.infrastructureError) process.exitCode = 1;
}
