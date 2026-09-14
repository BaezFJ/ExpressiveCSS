import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const version = lock.packages['node_modules/playwright'].version;
const runtime = process.env.CONTAINER_RUNTIME || 'docker';
const image = 'expressivecss-playwright';
const buildId = randomUUID();
const command = process.argv.slice(2);
const mode = ['--docs', '--visual'].includes(command[0]) ? command.shift() : null;

let active, interrupted, cleaningUp = false, killTimer;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    interrupted ||= signal === 'SIGINT' ? 130 : 143;
    process.exitCode = interrupted;
    if (!active || cleaningUp) return;
    const child = active;
    const kill = value => {
      try {
        if (process.platform === 'win32') child.kill(value);
        else process.kill(-child.pid, value);
      } catch (error) { if (error.code !== 'ESRCH') throw error; }
    };
    child.kill(signal);
    killTimer ||= setTimeout(() => kill('SIGKILL'), 5000).unref();
  });
}

async function run(executable, args, options = {}) {
  if (interrupted && !cleaningUp) throw Object.assign(new Error('Container command interrupted'), { status: interrupted });
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, stdio: 'inherit', detached: process.platform !== 'win32', ...options });
    active = child;
    let output = '';
    child.stdout?.on('data', bytes => { output += bytes; });
    child.on('error', reject);
    child.on('close', code => {
      clearTimeout(killTimer); killTimer = undefined; active = undefined;
      if (code !== 0) reject(Object.assign(new Error(`${executable} ${args[0]} failed`), { status: interrupted || code || 1 }));
      else resolve(output.trim());
    });
  });
}

async function timed(label, action) {
  const start = performance.now();
  try { return await action(); }
  finally {
    const line = `${label}: ${((performance.now() - start) / 1000).toFixed(2)} seconds`;
    console.log(line);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n\n`);
  }
}

let container, temporary, artifacts, created = false, docs = false, built = false;
try {
  await timed('Container image build', () => run(runtime, ['build', '--force-rm', '--label', `io.expressivecss.build=${buildId}`, '-f', 'Dockerfile.playwright', '--build-arg', `PLAYWRIGHT_VERSION=${version}`, '-t', image, '.']));
  built = true;
  if (mode === '--docs') {
    docs = true;
    await run(runtime, ['compose', 'up', '--abort-on-container-exit', 'docs']);
  } else {
    const name = `expressivecss-${randomUUID()}`;
    artifacts = path.join(cwd, '.cache/container-tests', name);
    mkdirSync(artifacts, { recursive: true });
    {
      temporary = mkdtempSync(path.join(tmpdir(), 'expressivecss-git-'));
      await run('git', ['bundle', 'create', path.join(temporary, 'repository.bundle'), '--all']);
      const head = await run('git', ['rev-parse', 'HEAD'], { stdio: 'pipe' });
      if (mode === '--visual') command.unshift('npm', 'run', 'test:visual', '--');
      if (!command.length) command.push('npm', 'run', 'test:browser');
      command.unshift('sh', '-c', 'git clone --bare /tmp/repository.bundle .git && git fetch /tmp/repository.bundle "+refs/*:refs/*" && git config core.bare false && git reset --mixed "$1" && shift && exec "$@"', 'sh', head);
    }
    container = name;
    await run(runtime, ['create', '--name', name, '--init', '--ipc=host',
      ...(process.env.CI ? ['-e', 'CI=1'] : []),
      ...(mode === '--visual' && process.env.VISUAL_BASE ? ['-e', `VISUAL_BASE=${process.env.VISUAL_BASE}`] : []),
      image, ...command]);
    created = true;
    if (temporary) await run(runtime, ['cp', path.join(temporary, 'repository.bundle'), `${container}:/tmp/repository.bundle`]);
    await timed('Container command', () => run(runtime, ['start', '--attach', container]));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = error.status ?? 1;
} finally {
  cleaningUp = true;
  if (interrupted) process.exitCode = interrupted;
  if (interrupted && !built && path.basename(runtime) === 'podman') {
    try {
      const ids = await run(runtime, ['ps', '--all', '--external', '--quiet', '--filter', `label=io.expressivecss.build=${buildId}`], { stdio: 'pipe' });
      if (ids) await run(runtime, ['rm', '--force', ...ids.split(/\s+/)]);
    } catch (error) { console.error(error.message); }
  }
  if (container && !created && interrupted) {
    try { await run(runtime, ['container', 'inspect', container], { stdio: 'pipe' }); created = true; } catch {}
  }
  if (created) {
    if (interrupted) {
      try { await run(runtime, ['stop', '--time', '5', container]); } catch (error) { console.error(error.message); }
    }
    for (const directory of ['.cache/cross-browser', 'visual/report', 'visual/results']) {
      try { await run(runtime, ['cp', `${container}:/app/${directory}`, artifacts]); }
      catch (error) { console.error(error.message); process.exitCode ||= error.status ?? 1; }
    }
    try { await run(runtime, ['rm', '--force', container]); }
    catch (error) { console.error(error.message); process.exitCode ||= 1; }
    console.log(`Test reports: ${artifacts}`);
  }
  if (docs) {
    try { await run(runtime, ['compose', 'down']); }
    catch (error) { console.error(error.message); process.exitCode ||= error.status ?? 1; }
  }
  if (temporary) rmSync(temporary, { recursive: true, force: true });
}
