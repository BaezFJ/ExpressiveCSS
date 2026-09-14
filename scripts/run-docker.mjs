import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const version = lock.packages['node_modules/playwright'].version;
const runtime = process.env.CONTAINER_RUNTIME || 'docker';
const image = 'expressivecss-playwright';
const command = process.argv.slice(2);
const mode = ['--docs', '--visual'].includes(command[0]) ? command.shift() : null;

function run(executable, args, options = {}) {
  const result = spawnSync(executable, args, { cwd, stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw Object.assign(new Error(`${executable} ${args[0]} failed`), { status: result.status ?? 1 });
  return result.stdout?.trim();
}

function timed(label, action) {
  const start = performance.now();
  try { return action(); }
  finally {
    const line = `${label}: ${((performance.now() - start) / 1000).toFixed(2)} seconds`;
    console.log(line);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n\n`);
  }
}

let container, temporary, artifacts;
try {
  timed('Container image build', () => run(runtime, ['build', '-f', 'Dockerfile.playwright', '--build-arg', `PLAYWRIGHT_VERSION=${version}`, '-t', image, '.']));
  if (mode === '--docs') {
    run(runtime, ['compose', 'up', '--abort-on-container-exit', 'docs']);
  } else {
    const name = `expressivecss-${randomUUID()}`;
    artifacts = path.join(cwd, '.cache/container-tests', name);
    mkdirSync(artifacts, { recursive: true });
    if (mode === '--visual') {
      temporary = mkdtempSync(path.join(tmpdir(), 'expressivecss-visual-'));
      run('git', ['bundle', 'create', path.join(temporary, 'repository.bundle'), '--all']);
      const head = run('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: 'pipe' });
      command.unshift('sh', '-c', 'git clone --bare /tmp/repository.bundle .git && git fetch /tmp/repository.bundle "+refs/*:refs/*" && git config core.bare false && git reset --mixed "$1" && shift && npm run test:visual -- "$@"', 'sh', head);
    }
    run(runtime, ['create', '--name', name, '--init', '--ipc=host',
      ...(process.env.CI ? ['-e', 'CI=1'] : []),
      ...(mode === '--visual' && process.env.VISUAL_BASE ? ['-e', `VISUAL_BASE=${process.env.VISUAL_BASE}`] : []),
      image, ...command]);
    container = name;
    if (temporary) run(runtime, ['cp', path.join(temporary, 'repository.bundle'), `${container}:/tmp/repository.bundle`]);
    timed('Container command', () => run(runtime, ['start', '--attach', container]));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = error.status ?? 1;
} finally {
  if (container) {
    for (const directory of ['.cache/cross-browser', 'visual/report', 'visual/results']) {
      try { run(runtime, ['cp', `${container}:/app/${directory}`, artifacts]); }
      catch (error) { console.error(error.message); process.exitCode ||= error.status ?? 1; }
    }
    try { run(runtime, ['rm', '--force', container]); }
    catch (error) { console.error(error.message); process.exitCode ||= 1; }
    console.log(`Test reports: ${artifacts}`);
  }
  if (temporary) rmSync(temporary, { recursive: true, force: true });
}
