import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseMetadata, assertForwardRelease, isCurrentStable } from '../scripts/release.mjs';

test('release policy rejects mismatches and prevents stable rollback', () => {
  const manifests = {
    framework: { name: '@expressivecss/expressive', version: '0.9.0' },
    mcp: { name: '@expressivecss/mcp-server', version: '0.2.0-rc.1' },
  };
  assert.equal(releaseMetadata('v0.9.0', manifests, false).distTag, 'latest');
  assert.equal(releaseMetadata('mcp-v0.2.0-rc.1', manifests, true).distTag, 'next');
  for (const tag of ['v0.8.0', 'v00.9.0', '../master', 'v0.9.0\n', 'mcp-v0.9.0']) {
    assert.throws(() => releaseMetadata(tag, manifests, false));
  }
  assert.throws(() => releaseMetadata('v0.9.0', manifests, true));
  assert.throws(() => releaseMetadata('mcp-v0.2.0-rc.1', manifests, false));
  assertForwardRelease('0.10.0', '0.9.9');
  assertForwardRelease('1.0.0', '0.99.99');
  assertForwardRelease('0.2.0-rc.1', '0.1.0');
  assertForwardRelease('0.2.0-rc.10', '0.2.0-rc.9');
  assert.throws(() => assertForwardRelease('0.2.0-rc.99999999999999999998', '0.2.0-rc.99999999999999999999'));
  assertForwardRelease('0.2.0-beta', '0.2.0-alpha');
  assertForwardRelease('0.2.0-beta', '0.2.0-9');
  assertForwardRelease('0.2.0-beta.1', '0.2.0-beta');
  assertForwardRelease('0.2.0', '0.2.0-rc.1');
  assert.throws(() => assertForwardRelease('0.2.0-rc.1', '0.2.0-rc.2'));
  assert.throws(() => assertForwardRelease('0.2.0-rc.1', '0.2.0'));
  assert.throws(() => assertForwardRelease('0.2.0-beta', '0.2.0-beta.1'));
  assert.throws(() => assertForwardRelease('0.2.0-9', '0.2.0-beta'));
  assert.throws(() => assertForwardRelease('0.2.0-rc.1', '0.2.0-rc.1'));
  assert.throws(() => assertForwardRelease('0.9.0', '0.9.0'));
  assert.throws(() => assertForwardRelease('0.8.9', '0.9.0'));
  assert.equal(isCurrentStable('0.9.0', '0.9.0'), true);
  assert.equal(isCurrentStable('0.8.0', '0.9.0'), false);
  assert.equal(isCurrentStable('0.9.0-rc.1', '0.9.0-rc.1'), false);
});
