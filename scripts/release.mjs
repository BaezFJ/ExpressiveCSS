// Release policy shared by validation and publication. No dependencies or shell interpolation.
import assert from 'node:assert/strict';
import { appendFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parseSemver, compareSemver } from './lib/resolve-expressivecss-version.mjs';

const versionPattern = '(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?';
const tagPattern = new RegExp(`^(mcp-)?v${versionPattern}$`);
export function releaseMetadata(tag, manifests, prerelease) {
  assert.equal(typeof tag, 'string', 'Release tag is required');
  assert.ok(!/[\r\n]/.test(tag), 'Release tag must be a single line');
  const match = tagPattern.exec(tag);
  assert.ok(match, 'Expected vX.Y.Z or mcp-vX.Y.Z, optionally with a prerelease suffix');
  const kind = match[1] ? 'mcp' : 'framework';
  const version = tag.slice(kind === 'mcp' ? 5 : 1);
  const isPrerelease = Boolean(match[5]);
  assert.ok(!match[5]?.split('.').some((part) => /^0\d+$/.test(part)), 'Numeric prerelease identifiers cannot have leading zeros');
  assert.equal(prerelease, isPrerelease, 'GitHub prerelease flag must match the version suffix');
  assert.equal(manifests[kind].version, version, 'Release tag must match package version');
  const expectedName = kind === 'mcp' ? '@expressivecss/mcp-server' : '@expressivecss/expressive';
  assert.equal(manifests[kind].name, expectedName, 'Unexpected package name');
  return { kind, directory: kind === 'mcp' ? 'mcp/expressivecss' : '.', name: expectedName, version,
    distTag: isPrerelease ? 'next' : 'latest' };
}
export function assertForwardRelease(version, current) {
  if (!current) return;
  const candidate = parseSemver(version);
  const previous = parseSemver(current);
  assert.ok(candidate && previous, 'Registry version must be valid SemVer');
  assert.ok(compareSemver(candidate, previous) > 0, 'A release must advance its npm dist-tag');
}
export function isCurrentStable(version, latest) {
  return /^\d+\.\d+\.\d+$/.test(version) && version === latest;
}
function npmView(spec) {
  try {
    return JSON.parse(execFileSync('npm', ['view', spec, 'version', '--json'], {
      encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'],
    }));
  } catch (error) {
    // A registry outage or authentication failure is not proof a version is available.
    let code;
    try { code = JSON.parse(String(error.stdout)).error?.code; } catch { /* fail closed below */ }
    if (code === 'E404') return null;
    throw error;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifests = {
    framework: JSON.parse(readFileSync('package.json', 'utf8')),
    mcp: JSON.parse(readFileSync('mcp/expressivecss/package.json', 'utf8')),
  };
  const manual = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  const kind = process.env.RELEASE_PACKAGE;
  if (manual) assert.ok(['framework', 'mcp'].includes(kind), 'Select framework or mcp');
  const tag = manual ? `${kind === 'mcp' ? 'mcp-' : ''}v${manifests[kind].version}` : process.env.RELEASE_TAG;
  const prerelease = manual ? manifests[kind].version.includes('-') : process.env.RELEASE_PRERELEASE === 'true';
  const release = releaseMetadata(tag, manifests, prerelease);
  if (process.argv.includes('--registry')) {
    assert.equal(npmView(`${release.name}@${release.version}`), null, 'Version is already published');
    assertForwardRelease(release.version, npmView(`${release.name}@${release.distTag}`));
  }
  if (process.env.GITHUB_OUTPUT) {
    for (const [key, value] of Object.entries(release)) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
  console.log(JSON.stringify(release));
}
