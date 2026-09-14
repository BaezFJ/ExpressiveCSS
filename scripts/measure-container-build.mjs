import assert from 'node:assert/strict';
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function run(args) {
  const result = spawnSync('docker', args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `docker ${args[0]} failed`);
}

if (process.argv.includes('--summary')) {
  const root = process.argv[3] || '/tmp/build-timings';
  const results = readdirSync(root, { recursive: true }).filter(f => f.endsWith('/build-timing.json')).map(f => JSON.parse(readFileSync(`${root}/${f}`)));
  assert.equal(new Set(results.map(r => r.revision)).size, 1);
  const median = values => values.sort((a, b) => a - b)[1];
  const byMode = mode => {
    const rows = results.filter(r => r.mode === mode);
    assert.deepEqual(rows.map(r => r.sample).sort(), ['1', '2', '3']);
    for (const row of rows) assert.ok(Number.isFinite(row.seconds) && row.seconds > 0 && Number.isFinite(row.dependencySeconds) && row.dependencySeconds >= 0);
    return rows;
  };
  const cold = byMode('cold'), cached = byMode('cached');
  const dependency = median(cold.map(r => r.dependencySeconds));
  const coldSeconds = median(cold.map(r => r.seconds)), cachedSeconds = median(cached.map(r => r.seconds));
  const savings = coldSeconds - cachedSeconds;
  const text = `Cold dependency setup: ${dependency.toFixed(1)}s.\n\nCold image build: ${coldSeconds.toFixed(1)}s; cached including download: ${cachedSeconds.toFixed(1)}s; savings: ${savings.toFixed(1)}s.\n\n${dependency > 60 && savings >= 30 ? 'Threshold met. Evaluate production Buildx GHA caching with mode=max before enabling it.' : 'Threshold not met. Leave CI caching disabled.'}\n\nThese measurements use an artifact-transferred local BuildKit cache. Recheck transfer costs when switching to the GHA cache backend.\n`;
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
} else {
  const mode = process.env.BUILD_MODE;
  assert.ok(['cold', 'cached'].includes(mode));
  assert.ok(['1', '2', '3'].includes(process.env.BUILD_SAMPLE));
  const start = Number(readFileSync('/tmp/build-start', 'utf8'));
  assert.ok(Number.isFinite(start) && start > 0);
  const version = JSON.parse(readFileSync('package-lock.json')).packages['node_modules/playwright'].version;
  run(['buildx', 'build', '--load', '-f', 'Dockerfile.playwright', '--build-arg', `PLAYWRIGHT_VERSION=${version}`,
    ...(mode === 'cached' ? ['--cache-from', 'type=local,src=/tmp/container-build-cache'] : ['--no-cache']), '-t', 'expressivecss-benchmark', '.']);
  const seconds = (Date.now() - start) / 1000;
  const container = 'expressivecss-build-measurement';
  run(['create', '--name', container, 'expressivecss-benchmark']);
  let dependencySeconds;
  try {
    run(['cp', `${container}:/tmp/dependency-seconds`, '/tmp/dependency-seconds']);
    dependencySeconds = Number(readFileSync('/tmp/dependency-seconds', 'utf8'));
  } finally { run(['rm', container]); }
  writeFileSync('/tmp/build-timing.json', JSON.stringify({ mode, sample: process.env.BUILD_SAMPLE, revision: process.env.GITHUB_SHA, seconds, dependencySeconds }));
}
