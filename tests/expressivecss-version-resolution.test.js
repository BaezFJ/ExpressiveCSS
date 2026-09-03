import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveExpressiveVersion } from '../scripts/lib/resolve-expressivecss-version.mjs';

const fixturePath = new URL('./fixtures/expressivecss-version-resolution/cases.json', import.meta.url);
const fixtures = JSON.parse(await readFile(fixturePath, 'utf8')).cases;
const roots = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function materialize(files) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'expressivecss-version-'));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  return root;
}

describe('ExpressiveCSS version resolution', () => {
  for (const fixture of fixtures) {
    test(fixture.name, async () => {
      const projectRoot = await materialize(fixture.files);
      const result = await resolveExpressiveVersion({
        projectRoot,
        contractVersion: fixture.contractVersion,
        skillVersion: '0.4.0',
      });
      for (const [key, expected] of Object.entries(fixture.expected)) {
        if (key === 'warningIncludes') {
          assert.ok(result.warnings.some((warning) => warning.includes(expected)), result.warnings.join('\n'));
        } else if (key === 'diagnosticCode') {
          assert.equal(result.diagnostics[0]?.code, expected, `${fixture.name}: diagnosticCode`);
        } else {
          assert.deepEqual(result[key], expected, `${fixture.name}: ${key}`);
        }
      }
      assert.equal(result.declaredRange, result.declaredVersion);
      assert.equal(result.exactInstalledVersion, result.resolutionSource === 'installed-package' ? result.resolvedVersion : null);
      assert.equal(result.skillContractVersion, fixture.contractVersion);
    });
  }

  test('installed package outside the direct manifest range blocks contract use', async () => {
    const projectRoot = await materialize({
      'package.json': '{"name":"consumer","dependencies":{"@expressivecss/expressive":"^0.7.0"}}',
      'node_modules/@expressivecss/expressive/package.json': '{"name":"@expressivecss/expressive","version":"0.8.0"}',
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.0' });

    assert.equal(result.resolvedVersion, '0.8.0');
    assert.equal(result.exactInstalledVersion, '0.8.0');
    assert.equal(result.resolutionSource, 'installed-package');
    assert.equal(result.status, 'unresolved');
    assert.equal(result.currentDocsSafe, false);
    assert.deepEqual(result.diagnostics, [{
      code: 'installed-version-outside-manifest-range',
      severity: 'blocked',
      source: 'installed-package',
      path: 'node_modules/@expressivecss/expressive/package.json',
      message: 'Installed ExpressiveCSS 0.8.0 does not satisfy the direct manifest range ^0.7.0.',
    }]);
  });

  test('treats semver build metadata as precedence-equal to the contract', async () => {
    const projectRoot = await materialize({
      'package.json': '{"name":"consumer","dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'node_modules/@expressivecss/expressive/package.json': '{"name":"@expressivecss/expressive","version":"0.8.0+local.1"}',
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.0' });
    assert.equal(result.resolvedVersion, '0.8.0+local.1');
    assert.equal(result.status, 'match');
    assert.equal(result.contractStatus, 'match');
    assert.equal(result.currentDocsSafe, true);
  });

  test('consumer resolution requires a direct manifest declaration', async () => {
    const projectRoot = await materialize({
      'package.json': '{"name":"consumer"}',
      'node_modules/@expressivecss/expressive/package.json': '{"name":"@expressivecss/expressive","version":"0.8.1"}',
      'package-lock.json': '{not-json',
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.0' });

    assert.equal(result.resolvedVersion, null);
    assert.equal(result.resolutionSource, 'none');
    assert.equal(result.status, 'unresolved');
    assert.deepEqual(result.diagnostics, []);
  });

  test('a package name alone does not prove a framework source checkout', async () => {
    const projectRoot = await materialize({
      'package.json': '{"name":"@expressivecss/expressive","version":"0.8.0","dependencies":{"@expressivecss/expressive":"^0.7.0"}}',
      'node_modules/@expressivecss/expressive/package.json': '{"name":"@expressivecss/expressive","version":"0.7.0"}',
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.7.0' });

    assert.equal(result.resolvedVersion, '0.7.0');
    assert.equal(result.resolutionSource, 'installed-package');
  });

  test('framework source ignores consumer lockfile failures', async () => {
    const projectRoot = await materialize({
      'package.json': '{"name":"@expressivecss/expressive","version":"0.8.0"}',
      'llm.md': '# ExpressiveCSS',
      'semantics.json': '{"rows":{}}',
      'docs/src/data/nav.ts': 'export const NAV = [];',
      'package-lock.json': '{bad-json',
      'yarn.lock': 'also malformed',
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.0' });

    assert.equal(result.resolutionSource, 'framework-source');
    assert.equal(result.resolvedVersion, '0.8.0');
    assert.deepEqual(result.diagnostics, []);
  });

  test('packageManager selects the active lockfile', async () => {
    const projectRoot = await materialize({
      'package.json': '{"packageManager":"pnpm@9.15.0","dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'package-lock.json': '{"lockfileVersion":1,"dependencies":{"@expressivecss/expressive":{"version":"0.7.0"}}}',
      'pnpm-lock.yaml': "lockfileVersion: '9.0'\nimporters:\n  .:\n    dependencies:\n      '@expressivecss/expressive':\n        specifier: ^0.8.0\n        version: 0.8.3\n",
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.3' });

    assert.equal(result.packageManager, 'pnpm');
    assert.equal(result.resolvedVersion, '0.8.3');
    assert.equal(result.resolutionSource, 'lockfile');
  });

  test('multiple lockfiles without packageManager fail closed', async () => {
    const projectRoot = await materialize({
      'package.json': '{"dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'package-lock.json': '{"lockfileVersion":1,"dependencies":{"@expressivecss/expressive":{"version":"0.8.0"}}}',
      'yarn.lock': '# yarn lockfile v1\n\n"@expressivecss/expressive@^0.8.0":\n  version "0.8.1"\n',
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.0' });

    assert.equal(result.packageManager, 'unknown');
    assert.equal(result.resolvedVersion, null);
    assert.equal(result.resolutionSource, 'manifest-only');
    assert.deepEqual(result.diagnostics, [{
      code: 'ambiguous-lockfiles',
      severity: 'blocked',
      source: 'lockfile',
      path: null,
      message: 'Multiple lockfiles exist and package.json does not select one.',
    }]);
    assert.deepEqual(result.candidates, []);
    assert.deepEqual(result.conflicts, []);
  });

  test('supported lockfiles reject resolved versions outside the direct manifest range', async () => {
    const fixtures = [
      {
        name: 'npm',
        files: {
          'package.json': '{"packageManager":"npm@10.0.0","dependencies":{"@expressivecss/expressive":"^0.7.0"}}',
          'package-lock.json': '{"lockfileVersion":3,"packages":{"":{"dependencies":{"@expressivecss/expressive":"^0.7.0"}},"node_modules/@expressivecss/expressive":{"version":"0.8.0"}}}',
        },
      },
      {
        name: 'pnpm',
        files: {
          'package.json': '{"packageManager":"pnpm@9.15.0","dependencies":{"@expressivecss/expressive":"^0.7.0"}}',
          'pnpm-lock.yaml': "lockfileVersion: '9.0'\nimporters:\n  .:\n    dependencies:\n      '@expressivecss/expressive':\n        specifier: ^0.7.0\n        version: 0.8.0\n",
        },
      },
      {
        name: 'yarn',
        files: {
          'package.json': '{"packageManager":"yarn@1.22.22","dependencies":{"@expressivecss/expressive":"^0.7.0"}}',
          'yarn.lock': '# yarn lockfile v1\n\n"@expressivecss/expressive@^0.7.0":\n  version "0.8.0"\n',
        },
      },
    ];

    for (const fixture of fixtures) {
      const projectRoot = await materialize(fixture.files);
      const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.0' });
      assert.equal(result.resolvedVersion, null, fixture.name);
      assert.equal(result.status, 'unresolved', fixture.name);
      assert.equal(result.diagnostics[0]?.code, 'lockfile-version-outside-manifest-range', fixture.name);
      assert.equal(result.diagnostics[0]?.severity, 'blocked', fixture.name);
    }
  });

  test('a malformed npm lockfile returns a blocked diagnostic', async () => {
    const projectRoot = await materialize({
      'package.json': '{"dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'package-lock.json': '{not-json',
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.0' });

    assert.equal(result.packageManager, 'npm');
    assert.equal(result.resolvedVersion, null);
    assert.equal(result.status, 'unresolved');
    assert.equal(result.diagnostics[0]?.code, 'malformed-lockfile');
    assert.equal(result.diagnostics[0]?.severity, 'blocked');
    assert.equal(result.diagnostics[0]?.path, 'package-lock.json');
  });

  test('fails closed on oversized manifests and symbolic-linked lockfiles', async () => {
    const oversizedRoot = await materialize({
      'package.json': 'x'.repeat((1024 * 1024) + 1),
    });
    const oversized = await resolveExpressiveVersion({ projectRoot: oversizedRoot, contractVersion: '0.8.0' });
    assert.equal(oversized.resolvedVersion, null);
    assert.equal(oversized.status, 'unresolved');

    const symlinkRoot = await materialize({
      'package.json': '{"dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'outside-lock.json': '{"lockfileVersion":3,"packages":{"":{"dependencies":{"@expressivecss/expressive":"^0.8.0"}},"node_modules/@expressivecss/expressive":{"version":"0.8.0"}}}',
    });
    await symlink(path.join(symlinkRoot, 'outside-lock.json'), path.join(symlinkRoot, 'package-lock.json'));
    const symlinked = await resolveExpressiveVersion({ projectRoot: symlinkRoot, contractVersion: '0.8.0' });
    assert.equal(symlinked.resolvedVersion, null);
    assert.equal(symlinked.status, 'unresolved');
    assert.ok(symlinked.diagnostics.some((item) => item.severity === 'blocked'));
  });

  test('an unsupported npm lockfile version returns a blocked diagnostic', async () => {
    const projectRoot = await materialize({
      'package.json': '{"dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'package-lock.json': '{"lockfileVersion":99,"dependencies":{"@expressivecss/expressive":{"version":"0.8.0"}}}',
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.0' });

    assert.equal(result.resolvedVersion, null);
    assert.equal(result.diagnostics[0]?.code, 'unsupported-lockfile-version');
    assert.equal(result.diagnostics[0]?.severity, 'blocked');
    assert.match(result.diagnostics[0]?.message, /99/);
  });

  test('npm package-table entries do not resolve without a direct root lock entry', async () => {
    const projectRoot = await materialize({
      'package.json': '{"dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'package-lock.json': '{"lockfileVersion":3,"packages":{"":{"dependencies":{"other":"^1.0.0"}},"node_modules/@expressivecss/expressive":{"version":"0.8.0"}}}',
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.0' });

    assert.equal(result.resolvedVersion, null);
    assert.equal(result.resolutionSource, 'manifest-only');
    assert.equal(result.diagnostics[0]?.code, 'direct-lock-entry-missing');
    assert.equal(result.diagnostics[0]?.severity, 'warning');
  });

  test('npm root specifier must match the manifest declaration', async () => {
    const projectRoot = await materialize({
      'package.json': '{"dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'package-lock.json': '{"lockfileVersion":3,"packages":{"":{"dependencies":{"@expressivecss/expressive":"^0.7.0"}},"node_modules/@expressivecss/expressive":{"version":"0.7.2"}}}',
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.0' });

    assert.equal(result.resolvedVersion, null);
    assert.equal(result.diagnostics[0]?.code, 'lockfile-declaration-mismatch');
    assert.match(result.diagnostics[0]?.message, /\^0\.7\.0.*\^0\.8\.0/);
  });

  test('npm direct entries with malformed versions are blocked', async () => {
    const projectRoot = await materialize({
      'package.json': '{"dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'package-lock.json': '{"lockfileVersion":3,"packages":{"":{"dependencies":{"@expressivecss/expressive":"^0.8.0"}},"node_modules/@expressivecss/expressive":{"version":"latest"}}}',
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.0' });

    assert.equal(result.resolvedVersion, null);
    assert.equal(result.diagnostics[0]?.code, 'malformed-lockfile');
    assert.equal(result.diagnostics[0]?.severity, 'blocked');
  });

  test('pnpm resolves only the target importer and strips peer suffixes', async () => {
    const projectRoot = await materialize({
      'package.json': '{"dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'pnpm-lock.yaml': "lockfileVersion: '9.0'\nimporters:\n  other:\n    dependencies:\n      '@expressivecss/expressive':\n        specifier: ^0.7.0\n        version: 0.7.4\n  .:\n    dependencies:\n      '@expressivecss/expressive':\n        specifier: ^0.8.0\n        version: 0.8.3(peer-lib@2.0.0)\npackages:\n  '@expressivecss/expressive@0.9.0': {}\n",
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.3' });

    assert.equal(result.packageManager, 'pnpm');
    assert.equal(result.resolvedVersion, '0.8.3');
    assert.equal(result.diagnostics.length, 0);
  });

  test('malformed pnpm YAML returns a blocked parse diagnostic', async () => {
    const projectRoot = await materialize({
      'package.json': '{"dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'pnpm-lock.yaml': "lockfileVersion: '9.0'\nimporters:\n\t.:\n\t\tdependencies:\n\t\t\t'@expressivecss/expressive':\n\t\t\t\tversion: 0.8.0\n",
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.0' });

    assert.equal(result.resolvedVersion, null);
    assert.equal(result.diagnostics[0]?.code, 'malformed-lockfile');
    assert.equal(result.diagnostics[0]?.severity, 'blocked');
  });

  test('Yarn Classic selects the descriptor matching the manifest range', async () => {
    const projectRoot = await materialize({
      'package.json': '{"dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'yarn.lock': '# yarn lockfile v1\n\n"@expressivecss/expressive@^0.7.0":\n  version "0.7.4"\n\n"@expressivecss/expressive@^0.8.0":\n  version "0.8.4"\n',
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.4' });

    assert.equal(result.resolvedVersion, '0.8.4');
    assert.equal(result.diagnostics.length, 0);
  });

  test('Yarn Berry matches npm protocol descriptors to the manifest range', async () => {
    const projectRoot = await materialize({
      'package.json': '{"packageManager":"yarn@4.9.0","dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'yarn.lock': '__metadata:\n  version: 8\n\n"@expressivecss/expressive@npm:^0.7.0":\n  version: 0.7.4\n  resolution: "@expressivecss/expressive@npm:0.7.4"\n\n"@expressivecss/expressive@npm:^0.8.0":\n  version: 0.8.5\n  resolution: "@expressivecss/expressive@npm:0.8.5"\n',
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.5' });

    assert.equal(result.resolvedVersion, '0.8.5');
    assert.equal(result.diagnostics.length, 0);
  });

  test('malformed installed metadata blocks lockfile fallback', async () => {
    const projectRoot = await materialize({
      'package.json': '{"dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'node_modules/@expressivecss/expressive/package.json': '{bad-json',
      'package-lock.json': '{"lockfileVersion":1,"dependencies":{"@expressivecss/expressive":{"version":"0.8.0"}}}',
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.0' });

    assert.equal(result.resolvedVersion, null);
    assert.equal(result.resolutionSource, 'manifest-only');
    assert.equal(result.diagnostics[0]?.code, 'malformed-installed-metadata');
    assert.equal(result.diagnostics[0]?.severity, 'blocked');
    assert.equal(result.diagnostics[0]?.path, 'node_modules/@expressivecss/expressive/package.json');
  });

  test('installed metadata is selected but conflicting lockfile evidence blocks the contract', async () => {
    const projectRoot = await materialize({
      'package.json': '{"dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'node_modules/@expressivecss/expressive/package.json': '{"name":"@expressivecss/expressive","version":"0.8.1"}',
      'package-lock.json': '{"lockfileVersion":3,"packages":{"":{"dependencies":{"@expressivecss/expressive":"^0.8.0"}},"node_modules/@expressivecss/expressive":{"version":"0.8.0"}}}',
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.1' });

    assert.equal(result.resolvedVersion, '0.8.1');
    assert.deepEqual(result.candidates, [
      { source: 'installed-package', version: '0.8.1', path: 'node_modules/@expressivecss/expressive/package.json' },
      { source: 'lockfile', version: '0.8.0', path: 'package-lock.json' },
    ]);
    assert.deepEqual(result.conflicts, [{
      code: 'installed-lockfile-version-conflict',
      selected: result.candidates[0],
      other: result.candidates[1],
    }]);
    assert.equal(result.diagnostics[0]?.code, 'installed-lockfile-version-conflict');
    assert.equal(result.diagnostics[0]?.severity, 'blocked');
    assert.equal(result.status, 'unresolved');
    assert.equal(result.currentDocsSafe, false);
    assert.equal(result.documentationMode, 'installed-package');
  });

  test('valid installed metadata does not override a malformed active lockfile', async () => {
    const projectRoot = await materialize({
      'package.json': '{"packageManager":"npm@10.0.0","dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'node_modules/@expressivecss/expressive/package.json': '{"name":"@expressivecss/expressive","version":"0.8.0"}',
      'package-lock.json': '{bad-json',
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.0' });

    assert.equal(result.resolvedVersion, '0.8.0');
    assert.equal(result.resolutionSource, 'installed-package');
    assert.equal(result.diagnostics[0]?.code, 'malformed-lockfile');
    assert.equal(result.diagnostics[0]?.severity, 'blocked');
    assert.equal(result.status, 'unresolved');
    assert.equal(result.currentDocsSafe, false);
    assert.equal(result.documentationMode, 'installed-package');
  });

  test('a missing or invalid contract version is unresolved, never mismatch', async () => {
    for (const contractVersion of [null, 'not-a-version']) {
      const projectRoot = await materialize({
        'package.json': '{"dependencies":{"@expressivecss/expressive":"0.8.0"}}',
        'node_modules/@expressivecss/expressive/package.json': '{"name":"@expressivecss/expressive","version":"0.8.0"}',
      });

      const result = await resolveExpressiveVersion({
        projectRoot,
        contractVersion,
        contractManifestPath: path.join(projectRoot, 'missing-contract.json'),
      });

      assert.equal(result.status, 'unresolved');
      assert.equal(result.contractStatus, 'unresolved');
      assert.equal(result.contractVersion, null);
      assert.equal(result.currentDocsSafe, false);
    }
  });

  test('release links and documentation availability require contract proof', async () => {
    const projectRoot = await materialize({
      'package.json': '{"dependencies":{"@expressivecss/expressive":"0.7.9"}}',
      'node_modules/@expressivecss/expressive/package.json': '{"name":"@expressivecss/expressive","version":"0.7.9"}',
      'contract.json': '{"frameworkVersion":"0.8.0","releaseTags":["v0.8.0"]}',
    });

    const result = await resolveExpressiveVersion({
      projectRoot,
      contractManifestPath: path.join(projectRoot, 'contract.json'),
    });

    assert.equal(result.status, 'mismatch');
    assert.equal(result.matchingTag, null);
    assert.equal(result.documentationMode, 'installed-package');
    assert.deepEqual(result.documentationSources, {
      current: { available: false, url: 'https://www.expressivecss.com' },
      matchingTag: { available: false, url: null },
      installedPackage: {
        available: true,
        path: 'node_modules/@expressivecss/expressive',
        componentDocumentationAvailable: false,
      },
    });
  });

  test('structured diagnostics are stable and sorted on every result', async () => {
    const projectRoot = await materialize({
      'package.json': '{"dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'node_modules/@expressivecss/expressive/package.json': '{bad-json',
      'package-lock.json': '{bad-json',
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.0' });
    const diagnosticKeys = result.diagnostics.map((entry) => `${entry.code}\0${entry.path ?? ''}\0${entry.message}`);

    assert.deepEqual(diagnosticKeys, [...diagnosticKeys].sort());
    assert.deepEqual(Object.keys(result.diagnostics[0]).sort(), ['code', 'message', 'path', 'severity', 'source']);
    assert.ok(Array.isArray(result.candidates));
    assert.ok(Array.isArray(result.conflicts));
    assert.ok(Array.isArray(result.warnings));
  });

  test('packageManager does not fall back to a different lockfile', async () => {
    const projectRoot = await materialize({
      'package.json': '{"packageManager":"pnpm@9.15.0","dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'package-lock.json': '{"lockfileVersion":1,"dependencies":{"@expressivecss/expressive":{"version":"0.8.0"}}}',
    });

    const result = await resolveExpressiveVersion({ projectRoot, contractVersion: '0.8.0' });

    assert.equal(result.packageManager, 'pnpm');
    assert.equal(result.resolvedVersion, null);
    assert.equal(result.diagnostics[0]?.code, 'selected-lockfile-missing');
    assert.equal(result.diagnostics[0]?.severity, 'blocked');
  });

  test('portable copies discover their generated contract manifest', async () => {
    const contractUrls = [
      new URL('../skills/expressivecss/references/contract.json', import.meta.url),
      new URL('../mcp/expressivecss/contract.json', import.meta.url),
    ];
    const contracts = await Promise.all(contractUrls.map((url) => readFile(url, 'utf8').then(JSON.parse)));
    assert.deepEqual(contracts[0], contracts[1]);
    assert.equal(contracts[0].generatedBy, 'scripts/gen-expressivecss-skill.mjs');
    assert.equal(contracts[0].frameworkVersion, '0.8.0');
    assert.match(contracts[0].sourceHash, /^[a-f0-9]{64}$/);
    assert.deepEqual(contracts[0].sources, [
      'llm.md',
      'semantics.json',
      'docs/src/data/nav.ts',
      'docs/src/data/component-decisions.json',
      'package.json',
      'CHANGELOG.md',
    ]);
    const sourceContents = await Promise.all(contracts[0].sources.map(async (source) => [
      source,
      await readFile(new URL(`../${source}`, import.meta.url), 'utf8'),
    ]));
    const independentHash = createHash('sha256');
    for (const [source, content] of sourceContents) independentHash.update(`${source}\0${content}\0`);
    assert.equal(contracts[0].sourceHash, independentHash.digest('hex'));
    assert.ok(contracts[0].releaseTags.includes('v0.8.0'));

    const projectRoot = await materialize({
      'package.json': '{"dependencies":{"@expressivecss/expressive":"^0.8.0"}}',
      'node_modules/@expressivecss/expressive/package.json': '{"name":"@expressivecss/expressive","version":"0.8.0"}',
    });
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL('../skills/expressivecss/scripts/resolve-version.mjs', import.meta.url)),
      '--project-root', projectRoot,
    ], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.skillContractVersion, '0.8.0');
    assert.equal(output.contractSourceHash, contracts[0].sourceHash);
    assert.equal(output.contractStatus, 'match');
  });

  test('generated component guides carry deterministic contract provenance', async () => {
    const directory = new URL('../skills/expressivecss/components/', import.meta.url);
    const names = (await readdir(directory)).filter((name) => name.endsWith('.md'));
    assert.equal(names.length, 46);
    const hashes = new Set();
    for (const name of names) {
      const guide = await readFile(new URL(name, directory), 'utf8');
      assert.match(guide, /Contract: ExpressiveCSS 0\.8\.0/);
      assert.match(guide, /Sources: `llm\.md`, `semantics\.json`, `docs\/src\/data\/nav\.ts`, `docs\/src\/data\/component-decisions\.json`, `package\.json`, `CHANGELOG\.md`/);
      const hash = guide.match(/Contract SHA-256: `([a-f0-9]{64})`/)?.[1];
      assert.ok(hash, `${name} has no contract hash`);
      hashes.add(hash);
      assert.match(guide, /\/tree\/v0\.8\.0/);
    }
    assert.equal(hashes.size, 1, 'generated guides disagree on contract provenance');
  });

  test('generation is byte-identical outside a Git checkout', async () => {
    const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'expressivecss-gitless-'));
    roots.push(projectRoot);
    const inputs = [
      'scripts/gen-expressivecss-skill.mjs',
      'scripts/lib/resolve-expressivecss-version.mjs',
      'llm.md',
      'semantics.json',
      'docs/src/data/nav.ts',
      'docs/src/data/component-decisions.json',
      'package.json',
      'CHANGELOG.md',
      'skills/expressivecss/SKILL.md',
    ];
    for (const input of inputs) {
      const destination = path.join(projectRoot, input);
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(path.join(sourceRoot, input), destination);
    }
    await symlink(path.join(sourceRoot, 'node_modules'), path.join(projectRoot, 'node_modules'), 'dir');

    const generated = spawnSync(process.execPath, ['scripts/gen-expressivecss-skill.mjs'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    assert.equal(generated.status, 0, generated.stderr);

    for (const output of [
      'skills/expressivecss/references/contract.json',
      'skills/expressivecss/references/component-decisions.md',
      'skills/expressivecss/components/app-bar.md',
      'skills/expressivecss/components/time-picker.md',
      'skills/expressivecss/scripts/resolve-version.mjs',
      'mcp/expressivecss/contract.json',
      'mcp/expressivecss/scripts/resolve-version.mjs',
    ]) {
      assert.equal(
        await readFile(path.join(projectRoot, output), 'utf8'),
        await readFile(path.join(sourceRoot, output), 'utf8'),
        `${output} depends on checkout metadata`,
      );
    }

    await writeFile(path.join(projectRoot, 'CHANGELOG.md'), '# Changelog\n');
    const withoutReleaseMetadata = spawnSync(process.execPath, ['scripts/gen-expressivecss-skill.mjs'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    assert.equal(withoutReleaseMetadata.status, 0, withoutReleaseMetadata.stderr);
    const contract = JSON.parse(await readFile(
      path.join(projectRoot, 'skills/expressivecss/references/contract.json'),
      'utf8',
    ));
    const guide = await readFile(path.join(projectRoot, 'skills/expressivecss/components/app-bar.md'), 'utf8');
    assert.equal(contract.matchingTag, null);
    assert.deepEqual(contract.releaseTags, []);
    assert.doesNotMatch(guide, /\[Matching tag\]/);
  });

  test('the packed MCP includes its resolver and starts from the tarball', async () => {
    const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
    const packRoot = await mkdtemp(path.join(os.tmpdir(), 'expressivecss-mcp-pack-'));
    roots.push(packRoot);
    const packed = spawnSync('npm', [
      'pack',
      './mcp/expressivecss',
      '--pack-destination',
      packRoot,
    ], { cwd: sourceRoot, encoding: 'utf8' });
    assert.equal(packed.status, 0, `${packed.stdout}\n${packed.stderr}`);
    const tarball = (await readdir(packRoot)).find((name) => name.endsWith('.tgz'));
    assert.ok(tarball, 'npm pack did not create a tarball');
    const extracted = spawnSync('tar', ['-xzf', path.join(packRoot, tarball), '-C', packRoot], {
      encoding: 'utf8',
    });
    assert.equal(extracted.status, 0, extracted.stderr);
    const resolver = await readFile(path.join(packRoot, 'package/scripts/resolve-version.mjs'), 'utf8');
    assert.match(resolver, /^\/\/ Generated from scripts\/lib\/resolve-expressivecss-version\.mjs\. Do not edit\./);
    await symlink(
      path.join(sourceRoot, 'mcp/expressivecss/node_modules'),
      path.join(packRoot, 'package/node_modules'),
      'dir',
    );
    const started = spawnSync(process.execPath, [path.join(packRoot, 'package/server.js')], {
      cwd: path.join(packRoot, 'package'),
      encoding: 'utf8',
      input: '',
    });
    assert.equal(started.status, 0, started.stderr);
    assert.match(started.stderr, /ExpressiveCSS MCP server running on stdio transport/);
  });

  test('the portable resolver copies stay synchronized', async () => {
    const canonical = await readFile(new URL('../scripts/lib/resolve-expressivecss-version.mjs', import.meta.url), 'utf8');
    const marker = '// Generated from scripts/lib/resolve-expressivecss-version.mjs. Do not edit.\n';
    for (const url of [
      new URL('../skills/expressivecss/scripts/resolve-version.mjs', import.meta.url),
      new URL('../mcp/expressivecss/scripts/resolve-version.mjs', import.meta.url),
    ]) {
      assert.equal(await readFile(url, 'utf8'), `${marker}${canonical}`);
    }
  });
});
