// Generated from scripts/lib/resolve-expressivecss-version.mjs. Do not edit.
import { constants as fsConstants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_NAME = '@expressivecss/expressive';
const MAX_MANIFEST_BYTES = 1 * 1024 * 1024;
const MAX_LOCKFILE_BYTES = 16 * 1024 * 1024;
const MAX_FRAMEWORK_MARKER_BYTES = 2 * 1024 * 1024;

function readLimit(filePath) {
  const name = path.basename(filePath);
  if (['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'].includes(name)) return MAX_LOCKFILE_BYTES;
  if (['llm.md', 'semantics.json'].includes(name)) return MAX_FRAMEWORK_MARKER_BYTES;
  return MAX_MANIFEST_BYTES;
}

function sameFile(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.size === right.size
    && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
}

async function readBounded(filePath) {
  let handle;
  try {
    const pathBefore = await lstat(filePath, { bigint: true });
    if (pathBefore.isSymbolicLink()) return { error: 'symbolic-link' };
    if (!pathBefore.isFile()) return { error: 'not-regular-file' };
    const noFollow = fsConstants.O_NOFOLLOW ?? 0;
    handle = await open(filePath, fsConstants.O_RDONLY | noFollow);
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || !sameFile(before, pathBefore)) return { error: 'identity-changed' };
    const limit = readLimit(filePath);
    if (before.size > BigInt(limit)) return { error: 'oversized' };
    const buffer = Buffer.alloc(limit + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset > limit) return { error: 'oversized' };
    const after = await handle.stat({ bigint: true });
    const pathAfter = await lstat(filePath, { bigint: true });
    const currentResolved = await realpath(filePath);
    const openedResolved = await realpath(`/proc/self/fd/${handle.fd}`).catch(() => currentResolved);
    if (!sameFile(before, after) || !sameFile(after, pathAfter) || currentResolved !== openedResolved) {
      return { error: 'identity-changed' };
    }
    return { text: buffer.subarray(0, offset).toString('utf8') };
  } catch (error) {
    if (error?.code === 'ENOENT') return { missing: true };
    if (error?.code === 'ELOOP' || error?.code === 'EMLINK') return { error: 'symbolic-link' };
    return { error: 'unreadable' };
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function readText(filePath) {
  const result = await readBounded(filePath);
  return result.text ?? null;
}

async function readJson(filePath) {
  const text = await readText(filePath);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function cleanVersion(value) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/^['"]|['"]$/gu, '').replace(/\(.+\)$/u, '');
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(cleaned)
    ? cleaned
    : null;
}

function parseSemver(value) {
  const cleaned = cleanVersion(value);
  if (!cleaned) return null;
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/u.exec(cleaned);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]?.split('.') ?? [],
  };
}

function versionsHaveEqualPrecedence(left, right) {
  const parsedLeft = parseSemver(left);
  const parsedRight = parseSemver(right);
  return Boolean(parsedLeft && parsedRight && compareSemver(parsedLeft, parsedRight) === 0);
}

function compareSemver(left, right) {
  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] !== right[key]) return left[key] < right[key] ? -1 : 1;
  }
  if (left.prerelease.length === 0 || right.prerelease.length === 0) {
    return left.prerelease.length === right.prerelease.length ? 0 : left.prerelease.length ? -1 : 1;
  }
  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = left.prerelease[index];
    const rightPart = right.prerelease[index];
    if (leftPart === undefined || rightPart === undefined) return leftPart === undefined ? -1 : 1;
    if (leftPart === rightPart) continue;
    const leftNumber = /^\d+$/u.test(leftPart) ? Number(leftPart) : null;
    const rightNumber = /^\d+$/u.test(rightPart) ? Number(rightPart) : null;
    if (leftNumber !== null && rightNumber !== null) return leftNumber < rightNumber ? -1 : 1;
    if (leftNumber !== null || rightNumber !== null) return leftNumber !== null ? -1 : 1;
    return leftPart < rightPart ? -1 : 1;
  }
  return 0;
}

function satisfiesComparator(version, operator, boundary) {
  const comparison = compareSemver(version, boundary);
  if (operator === '>') return comparison > 0;
  if (operator === '>=') return comparison >= 0;
  if (operator === '<') return comparison < 0;
  if (operator === '<=') return comparison <= 0;
  return comparison === 0;
}

function satisfiesSimpleRange(version, range) {
  if (/^(?:\*|x)$/iu.test(range)) return true;
  const wildcard = /^(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?$/iu.exec(range);
  if (wildcard) {
    const [, major, minor, patch] = wildcard;
    return version.major === Number(major)
      && (minor === undefined || /^(?:x|\*)$/iu.test(minor) || version.minor === Number(minor))
      && (patch === undefined || /^(?:x|\*)$/iu.test(patch) || version.patch === Number(patch))
      && version.prerelease.length === 0;
  }

  const shorthand = /^(\^|~)(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/u.exec(range);
  if (shorthand) {
    const lower = parseSemver(shorthand[2]);
    if (!lower) return null;
    const upper = shorthand[1] === '~'
      ? { major: lower.major, minor: lower.minor + 1, patch: 0, prerelease: [] }
      : lower.major > 0
        ? { major: lower.major + 1, minor: 0, patch: 0, prerelease: [] }
        : lower.minor > 0
          ? { major: 0, minor: lower.minor + 1, patch: 0, prerelease: [] }
          : { major: 0, minor: 0, patch: lower.patch + 1, prerelease: [] };
    return compareSemver(version, lower) >= 0 && compareSemver(version, upper) < 0;
  }

  const comparator = /^(>=|<=|>|<|=)?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/u.exec(range);
  if (!comparator) return null;
  const boundary = parseSemver(comparator[2]);
  return boundary ? satisfiesComparator(version, comparator[1] ?? '=', boundary) : null;
}

function versionSatisfiesRange(versionValue, rangeValue) {
  const version = parseSemver(versionValue);
  if (!version || typeof rangeValue !== 'string' || !rangeValue.trim()) return null;
  const alternatives = rangeValue.trim().split(/\s*\|\|\s*/u);
  let unsupported = false;
  for (const alternative of alternatives) {
    const comparators = alternative.trim().split(/\s+/u).filter(Boolean);
    if (comparators.length === 0) {
      unsupported = true;
      continue;
    }
    const prereleaseCore = `${version.major}.${version.minor}.${version.patch}-`;
    if (version.prerelease.length > 0 && !alternative.includes(prereleaseCore)) continue;
    const results = comparators.map((comparator) => satisfiesSimpleRange(version, comparator));
    if (results.every((result) => result === true)) return true;
    if (results.some((result) => result === null)) unsupported = true;
  }
  return unsupported ? null : false;
}

function manifestRange(manifest) {
  return manifest?.dependencies?.[PACKAGE_NAME]
    ?? manifest?.devDependencies?.[PACKAGE_NAME]
    ?? manifest?.peerDependencies?.[PACKAGE_NAME]
    ?? manifest?.optionalDependencies?.[PACKAGE_NAME]
    ?? null;
}

function verifiedLockVersion(version, declaredRange, source, file) {
  const satisfies = versionSatisfiesRange(version, declaredRange);
  if (satisfies === true) return { version, diagnostics: [] };
  return {
    version: null,
    diagnostics: [{
      code: satisfies === false ? 'lockfile-version-outside-manifest-range' : 'unsupported-manifest-range',
      severity: 'blocked',
      source,
      path: file,
      message: satisfies === false
        ? `${file} resolves ${version}, outside manifest range ${JSON.stringify(declaredRange)}.`
        : `Cannot verify ${file} version ${version} against unsupported manifest range ${JSON.stringify(declaredRange)}.`,
    }],
  };
}

function npmLockResolution(lock, declaredRange) {
  if (lock?.lockfileVersion === 1) {
    const entry = lock?.dependencies?.[PACKAGE_NAME];
    const version = cleanVersion(entry?.version);
    if (version) return verifiedLockVersion(version, declaredRange, 'npm', 'package-lock.json');
    return entry
      ? { version: null, diagnostics: [malformedLockVersion('npm', 'package-lock.json')] }
      : { version: null, diagnostics: [directEntryMissing('npm', 'package-lock.json')] };
  }

  const lockedRange = manifestRange(lock?.packages?.['']);
  if (!lockedRange) {
    return { version: null, diagnostics: [directEntryMissing('npm', 'package-lock.json')] };
  }
  if (lockedRange !== declaredRange) {
    return {
      version: null,
      diagnostics: [{
        code: 'lockfile-declaration-mismatch',
        severity: 'warning',
        source: 'npm',
        path: 'package-lock.json',
        message: `package-lock.json declares ${JSON.stringify(lockedRange)}, not manifest range ${JSON.stringify(declaredRange)}.`,
      }],
    };
  }
  const version = cleanVersion(lock?.packages?.[`node_modules/${PACKAGE_NAME}`]?.version);
  return version
    ? verifiedLockVersion(version, declaredRange, 'npm', 'package-lock.json')
    : { version: null, diagnostics: [malformedLockVersion('npm', 'package-lock.json')] };
}

function directEntryMissing(source, file) {
  return {
    code: 'direct-lock-entry-missing',
    severity: 'warning',
    source,
    path: file,
    message: `${file} has no matching direct ${PACKAGE_NAME} entry.`,
  };
}

function malformedLockVersion(source, file) {
  return {
    code: 'malformed-lockfile',
    severity: 'blocked',
    source,
    path: file,
    message: `${file} has no valid resolved ExpressiveCSS version for its direct entry.`,
  };
}

function pnpmLockResolution(text, declaredRange) {
  const lines = text.split(/\r?\n/u);
  if (lines.some((line) => /^\t|^ +\t/u.test(line))) {
    return {
      version: null,
      diagnostics: [{
        code: 'malformed-lockfile',
        severity: 'blocked',
        source: 'pnpm',
        path: 'pnpm-lock.yaml',
        message: 'pnpm-lock.yaml uses tab indentation.',
      }],
    };
  }
  const lockfileVersion = /^lockfileVersion:\s*['"]?([^'"\s]+)['"]?\s*$/u.exec(lines.find((line) => line.startsWith('lockfileVersion:')) ?? '')?.[1];
  const major = Number.parseInt(lockfileVersion ?? '', 10);
  if (!Number.isInteger(major) || major < 6 || major > 9) {
    return {
      version: null,
      diagnostics: [{
        code: lockfileVersion ? 'unsupported-lockfile-version' : 'malformed-lockfile',
        severity: 'blocked',
        source: 'pnpm',
        path: 'pnpm-lock.yaml',
        message: lockfileVersion
          ? `Unsupported pnpm lockfile version ${JSON.stringify(lockfileVersion)}.`
          : 'pnpm-lock.yaml has no valid lockfileVersion.',
      }],
    };
  }

  const importersIndex = lines.findIndex((line) => line === 'importers:');
  const targetIndex = lines.findIndex((line, index) => index > importersIndex && /^ {2}(?:['"]\.['"]|\.):\s*$/u.test(line));
  if (importersIndex < 0 || targetIndex < 0) {
    return { version: null, diagnostics: [directEntryMissing('pnpm', 'pnpm-lock.yaml')] };
  }
  let targetEnd = lines.length;
  for (let index = targetIndex + 1; index < lines.length; index += 1) {
    if (lines[index].trim() && /^\s*/u.exec(lines[index])[0].length <= 2) {
      targetEnd = index;
      break;
    }
  }
  const targetLines = lines.slice(targetIndex + 1, targetEnd);
  const dependencyIndex = targetLines.findIndex((line) => /^ {6}['"]?@expressivecss\/expressive['"]?:\s*$/u.test(line));
  if (dependencyIndex < 0) {
    return { version: null, diagnostics: [directEntryMissing('pnpm', 'pnpm-lock.yaml')] };
  }
  const dependencyLines = [];
  for (let index = dependencyIndex + 1; index < targetLines.length; index += 1) {
    if (targetLines[index].trim() && /^\s*/u.exec(targetLines[index])[0].length <= 6) break;
    dependencyLines.push(targetLines[index]);
  }
  const specifier = /^\s+specifier:\s*['"]?([^'"\s]+)['"]?\s*$/mu.exec(dependencyLines.join('\n'))?.[1] ?? null;
  const rawVersion = /^\s+version:\s*['"]?([^'"\s]+)['"]?\s*$/mu.exec(dependencyLines.join('\n'))?.[1] ?? null;
  if (specifier !== declaredRange) {
    return {
      version: null,
      diagnostics: [{
        code: 'lockfile-declaration-mismatch',
        severity: 'warning',
        source: 'pnpm',
        path: 'pnpm-lock.yaml',
        message: `pnpm-lock.yaml declares ${JSON.stringify(specifier)}, not manifest range ${JSON.stringify(declaredRange)}.`,
      }],
    };
  }
  const version = cleanVersion(rawVersion);
  return version
    ? verifiedLockVersion(version, declaredRange, 'pnpm', 'pnpm-lock.yaml')
    : {
      version: null,
      diagnostics: [{
        code: 'malformed-lockfile',
        severity: 'blocked',
        source: 'pnpm',
        path: 'pnpm-lock.yaml',
        message: 'The target pnpm importer has no valid resolved ExpressiveCSS version.',
      }],
    };
}

function yarnLockResolution(text, declaredRange) {
  const classic = /^# yarn lockfile v1\s*$/mu.test(text);
  const berry = /^__metadata:\s*$/mu.test(text);
  if (!classic && !berry) {
    return {
      version: null,
      diagnostics: [{
        code: 'malformed-lockfile',
        severity: 'blocked',
        source: 'yarn',
        path: 'yarn.lock',
        message: 'yarn.lock has no supported Classic or Berry format marker.',
      }],
    };
  }

  const expected = new Set([
    `${PACKAGE_NAME}@${declaredRange}`,
    `${PACKAGE_NAME}@npm:${declaredRange}`,
  ]);
  const lines = text.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    const header = lines[index];
    if (!header.trim() || /^\s|#/u.test(header) || !header.endsWith(':')) continue;
    const descriptors = [...header.slice(0, -1).matchAll(/"([^"]+)"|'([^']+)'|([^,\s]+)/gu)]
      .map((match) => match[1] ?? match[2] ?? match[3]);
    if (!descriptors.some((descriptor) => expected.has(descriptor))) continue;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const line = lines[cursor];
      if (line.trim() && !/^\s/u.test(line)) break;
      const rawVersion = /^\s+version(?:\s+|:\s*)["']?([^\s"']+)["']?\s*$/u.exec(line)?.[1];
      if (!rawVersion) continue;
      const version = cleanVersion(rawVersion);
      if (version) return verifiedLockVersion(version, declaredRange, 'yarn', 'yarn.lock');
      break;
    }
    return {
      version: null,
      diagnostics: [{
        code: 'malformed-lockfile',
        severity: 'blocked',
        source: 'yarn',
        path: 'yarn.lock',
        message: 'The matching Yarn descriptor has no valid resolved ExpressiveCSS version.',
      }],
    };
  }
  return { version: null, diagnostics: [directEntryMissing('yarn', 'yarn.lock')] };
}

async function resolveLockfile(projectRoot, packageManagerField = null, declaredRange = null) {
  const declaredManager = typeof packageManagerField === 'string'
    ? /^(npm|pnpm|yarn)@/u.exec(packageManagerField)?.[1] ?? null
    : null;
  const lockfiles = [
    { manager: 'npm', file: 'package-lock.json' },
    { manager: 'pnpm', file: 'pnpm-lock.yaml' },
    { manager: 'yarn', file: 'yarn.lock' },
  ];
  const reads = {};
  for (const entry of lockfiles) {
    reads[entry.manager] = { ...entry, ...(await readBounded(path.join(projectRoot, entry.file))) };
  }
  const unreadable = lockfiles
    .map((entry) => reads[entry.manager])
    .filter((entry) => entry.error);
  if (unreadable.length > 0) {
    return {
      packageManager: declaredManager ?? unreadable[0].manager,
      version: null,
      file: unreadable[0].file,
      diagnostics: unreadable.map((entry) => ({
        code: 'unreadable-lockfile',
        severity: 'blocked',
        source: entry.manager,
        path: entry.file,
        message: `${entry.file} could not be read as a regular file (${entry.error}).`,
      })),
    };
  }
  const npmText = reads.npm.text ?? null;
  let npmLock = null;
  if (npmText !== null) {
    try {
      npmLock = JSON.parse(npmText);
    } catch {
      npmLock = null;
    }
  }
  const pnpmText = reads.pnpm.text ?? null;
  const yarnText = reads.yarn.text ?? null;
  const existing = [
    npmText !== null ? 'npm' : null,
    pnpmText !== null ? 'pnpm' : null,
    yarnText !== null ? 'yarn' : null,
  ].filter(Boolean);

  if (existing.length > 1 && !declaredManager) {
    return {
      packageManager: 'unknown',
      version: null,
      file: null,
      diagnostics: [{
        code: 'ambiguous-lockfiles',
        severity: 'blocked',
        source: 'lockfile',
        path: null,
        message: 'Multiple lockfiles exist and package.json does not select one.',
      }],
    };
  }

  const selectedManager = declaredManager ?? existing[0] ?? null;
  if (selectedManager === 'npm' && npmText !== null && !npmLock) {
    return {
      packageManager: 'npm',
      version: null,
      file: 'package-lock.json',
      diagnostics: [{
        code: 'malformed-lockfile',
        severity: 'blocked',
        source: 'npm',
        path: 'package-lock.json',
        message: 'package-lock.json is not valid JSON.',
      }],
    };
  }
  if (selectedManager === 'npm' && ![1, 2, 3].includes(npmLock?.lockfileVersion)) {
    return {
      packageManager: 'npm',
      version: null,
      file: 'package-lock.json',
      diagnostics: [{
        code: 'unsupported-lockfile-version',
        severity: 'blocked',
        source: 'npm',
        path: 'package-lock.json',
        message: `Unsupported npm lockfile version ${JSON.stringify(npmLock?.lockfileVersion)}.`,
      }],
    };
  }
  if (declaredManager && !existing.includes(declaredManager) && existing.length > 0) {
    const selectedFile = {
      npm: 'package-lock.json',
      pnpm: 'pnpm-lock.yaml',
      yarn: 'yarn.lock',
    }[declaredManager];
    return {
      packageManager: declaredManager,
      version: null,
      file: selectedFile,
      diagnostics: [{
        code: 'selected-lockfile-missing',
        severity: 'blocked',
        source: declaredManager,
        path: selectedFile,
        message: `package.json selects ${declaredManager}, but ${selectedFile} is missing.`,
      }],
    };
  }

  if (declaredManager === 'pnpm' && pnpmText !== null) {
    return { packageManager: 'pnpm', file: 'pnpm-lock.yaml', ...pnpmLockResolution(pnpmText, declaredRange) };
  }
  if (declaredManager === 'yarn' && yarnText !== null) {
    return { packageManager: 'yarn', file: 'yarn.lock', ...yarnLockResolution(yarnText, declaredRange) };
  }
  if (declaredManager === 'npm' && npmLock) {
    return { packageManager: 'npm', file: 'package-lock.json', ...npmLockResolution(npmLock, declaredRange) };
  }

  if (npmLock) {
    return { packageManager: 'npm', file: 'package-lock.json', ...npmLockResolution(npmLock, declaredRange) };
  }
  if (pnpmText !== null) {
    return { packageManager: 'pnpm', file: 'pnpm-lock.yaml', ...pnpmLockResolution(pnpmText, declaredRange) };
  }
  if (yarnText !== null) {
    return { packageManager: 'yarn', file: 'yarn.lock', ...yarnLockResolution(yarnText, declaredRange) };
  }

  return { packageManager: declaredManager ?? 'unknown', version: null, file: null };
}

async function bundledContract(explicitPath = null) {
  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    explicitPath,
    path.resolve(scriptDirectory, '../references/contract.json'),
    path.resolve(scriptDirectory, '../contract.json'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    const contract = await readJson(candidate);
    if (contract?.frameworkVersion) return contract;
  }
  return null;
}

export async function resolveExpressiveVersion({
  projectRoot = process.cwd(),
  contractVersion = null,
  skillVersion = null,
  contractManifestPath = null,
} = {}) {
  const root = path.resolve(projectRoot);
  const manifest = await readJson(path.join(root, 'package.json'));
  const declaredRange = manifestRange(manifest);
  const lock = await resolveLockfile(root, manifest?.packageManager, declaredRange);
  const isFrameworkSource = manifest?.name === PACKAGE_NAME
    && cleanVersion(manifest.version)
    && (await Promise.all([
      readText(path.join(root, 'llm.md')),
      readText(path.join(root, 'semantics.json')),
      readText(path.join(root, 'docs', 'src', 'data', 'nav.ts')),
    ])).every((source) => source !== null);
  const warnings = [];
  const diagnostics = isFrameworkSource || !declaredRange ? [] : [...(lock.diagnostics ?? [])];
  const candidates = [];
  const conflicts = [];

  let resolvedVersion = null;
  let resolutionSource = 'none';

  if (isFrameworkSource) {
    resolvedVersion = cleanVersion(manifest.version);
    resolutionSource = 'framework-source';
  } else if (declaredRange) {
    const installedRelativePath = 'node_modules/@expressivecss/expressive/package.json';
    const installedText = await readText(path.join(root, installedRelativePath));
    let installed = null;
    if (installedText !== null) {
      try {
        installed = JSON.parse(installedText);
      } catch {
        installed = null;
      }
    }
    const installedVersion = installed?.name === PACKAGE_NAME ? cleanVersion(installed.version) : null;
    if (installedText !== null && !installedVersion) {
      resolutionSource = 'manifest-only';
      diagnostics.push({
        code: 'malformed-installed-metadata',
        severity: 'blocked',
        source: 'installed-package',
        path: installedRelativePath,
        message: 'Installed ExpressiveCSS package metadata has no valid package name and version.',
      });
    } else if (installedVersion) {
      resolvedVersion = installedVersion;
      resolutionSource = 'installed-package';
      const installedCandidate = {
        source: 'installed-package',
        version: installedVersion,
        path: installedRelativePath,
      };
      candidates.push(installedCandidate);
      const installedSatisfiesRange = versionSatisfiesRange(installedVersion, declaredRange);
      if (installedSatisfiesRange !== true) {
        diagnostics.push({
          code: installedSatisfiesRange === false
            ? 'installed-version-outside-manifest-range'
            : 'unsupported-manifest-range',
          severity: 'blocked',
          source: 'installed-package',
          path: installedRelativePath,
          message: installedSatisfiesRange === false
            ? `Installed ExpressiveCSS ${installedVersion} does not satisfy the direct manifest range ${declaredRange}.`
            : `Cannot verify installed ExpressiveCSS ${installedVersion} against unsupported manifest range ${declaredRange}.`,
        });
      }
      if (lock.version && lock.version !== installedVersion) {
        const lockCandidate = { source: 'lockfile', version: lock.version, path: lock.file };
        candidates.push(lockCandidate);
        conflicts.push({
          code: 'installed-lockfile-version-conflict',
          selected: installedCandidate,
          other: lockCandidate,
        });
        diagnostics.push({
          code: 'installed-lockfile-version-conflict',
          severity: 'blocked',
          source: 'resolution',
          path: lock.file,
          message: `Installed ExpressiveCSS ${installedVersion} differs from ${lock.file} version ${lock.version}.`,
        });
        warnings.push(`Installed ExpressiveCSS ${installedVersion} differs from ${lock.file} version ${lock.version}.`);
      }
    } else if (lock.version) {
      resolvedVersion = lock.version;
      resolutionSource = 'lockfile';
      candidates.push({ source: 'lockfile', version: lock.version, path: lock.file });
    } else {
      resolutionSource = 'manifest-only';
    }
  }

  const contract = await bundledContract(contractManifestPath);
  const normalizedContract = cleanVersion(contractVersion ?? contract?.frameworkVersion ?? '');
  const normalizedSkillVersion = cleanVersion(skillVersion ?? contract?.skillVersion ?? '');
  const hasBlockingDiagnostic = diagnostics.some((diagnostic) => diagnostic.severity === 'blocked');
  const status = hasBlockingDiagnostic || !resolvedVersion || !normalizedContract
    ? 'unresolved'
    : versionsHaveEqualPrecedence(resolvedVersion, normalizedContract)
      ? 'match'
      : 'mismatch';
  const matchingTag = resolvedVersion && Array.isArray(contract?.releaseTags)
    && contract.releaseTags.includes(`v${resolvedVersion}`)
    ? `v${resolvedVersion}`
    : null;
  const documentationMode = status === 'match'
    ? 'current'
    : matchingTag
      ? 'matching-tag'
      : resolutionSource === 'installed-package'
        ? 'installed-package'
        : 'unavailable';
  const documentationSources = {
    current: {
      available: status === 'match',
      url: 'https://www.expressivecss.com',
    },
    matchingTag: {
      available: Boolean(matchingTag),
      url: matchingTag ? `https://github.com/BaezFJ/ExpressiveCSS/tree/${matchingTag}` : null,
    },
    installedPackage: {
      available: resolutionSource === 'installed-package',
      path: resolutionSource === 'installed-package' ? 'node_modules/@expressivecss/expressive' : null,
      componentDocumentationAvailable: false,
    },
  };
  diagnostics.sort((left, right) => `${left.code}\0${left.path ?? ''}\0${left.message}`
    .localeCompare(`${right.code}\0${right.path ?? ''}\0${right.message}`));
  warnings.sort();

  return {
    projectRoot: root,
    packageManager: lock.packageManager,
    declaredRange,
    declaredVersion: declaredRange,
    resolvedVersion,
    exactInstalledVersion: resolutionSource === 'installed-package' ? resolvedVersion : null,
    resolutionSource,
    skillVersion: normalizedSkillVersion,
    skillContractVersion: normalizedContract,
    contractVersion: normalizedContract,
    contractSourceHash: contract?.sourceHash ?? null,
    matchingTag,
    matchingCommit: null,
    status,
    contractStatus: status,
    documentationMode,
    documentationSources,
    currentDocsSafe: status === 'match',
    warnings,
    diagnostics,
    candidates,
    conflicts,
  };
}

function cliArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) continue;
    const [key, ...rest] = argument.slice(2).split('=');
    if (rest.length) values[key] = rest.join('=');
    else if (argv[index + 1] && !argv[index + 1].startsWith('--')) values[key] = argv[index += 1];
    else values[key] = true;
  }
  return values;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  const args = cliArguments(process.argv.slice(2));
  const result = await resolveExpressiveVersion({
    projectRoot: typeof args['project-root'] === 'string' ? args['project-root'] : process.cwd(),
    contractVersion: typeof args['contract-version'] === 'string' ? args['contract-version'] : null,
    skillVersion: typeof args['skill-version'] === 'string' ? args['skill-version'] : null,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
