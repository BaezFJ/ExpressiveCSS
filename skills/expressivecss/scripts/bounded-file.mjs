// Generated from scripts/lib/bounded-file.mjs. Do not edit.
import { constants as fsConstants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import path from 'node:path';

function isPathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export async function readBoundedRegularFile(filePath, byteLimit, label, expectedRoot = null, encoding = 'utf8') {
  const target = path.resolve(filePath);
  let resolvedRoot = null;
  if (expectedRoot) {
    const rootPrefix = path.join(path.resolve(expectedRoot), path.sep);
    if (!target.startsWith(rootPrefix)) {
      throw new Error(`${label} file is outside the repository`);
    }
    resolvedRoot = await realpath(expectedRoot);
    const relative = path.relative(rootPrefix, target);
    let current = resolvedRoot;
    for (const segment of relative.split(path.sep)) {
      current = path.join(current, segment);
      const entry = await lstat(current, { bigint: true });
      if (entry.isSymbolicLink()) throw new Error(`${label} file path contains a symbolic link`);
    }
  }

  const noFollow = Number.isInteger(fsConstants.O_NOFOLLOW) ? fsConstants.O_NOFOLLOW : 0;
  const nonBlocking = Number.isInteger(fsConstants.O_NONBLOCK) ? fsConstants.O_NONBLOCK : 0;
  const handle = await open(target, fsConstants.O_RDONLY | noFollow | nonBlocking);
  try {
    const before = await handle.stat({ bigint: true });
    const pathBefore = await lstat(target, { bigint: true });
    if (pathBefore.isSymbolicLink()) throw new Error(`${label} file is a symbolic link`);
    if (!before.isFile() || !pathBefore.isFile()) throw new Error(`${label} file is not a regular file`);
    if (before.dev !== pathBefore.dev || before.ino !== pathBefore.ino) {
      throw new Error(`${label} file identity changed before reading`);
    }
    if (resolvedRoot) {
      const openedPath = await realpath(`/proc/self/fd/${handle.fd}`).catch(() => realpath(target));
      if (!isPathInside(resolvedRoot, openedPath)) throw new Error(`${label} file is outside the repository`);
    }
    if (before.size > BigInt(byteLimit)) throw new Error(`${label} file exceeds ${byteLimit} bytes`);

    const bytes = Buffer.allocUnsafe(byteLimit + 1);
    let total = 0;
    while (total <= byteLimit) {
      const chunk = await handle.read(bytes, total, byteLimit + 1 - total, total);
      if (chunk.bytesRead === 0) break;
      total += chunk.bytesRead;
    }
    if (total > byteLimit) throw new Error(`${label} file exceeds ${byteLimit} bytes`);

    const after = await handle.stat({ bigint: true });
    const pathAfter = await lstat(target, { bigint: true });
    const handleChanged = before.dev !== after.dev || before.ino !== after.ino
      || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs;
    const pathChanged = pathAfter.isSymbolicLink() || !pathAfter.isFile()
      || after.dev !== pathAfter.dev || after.ino !== pathAfter.ino;
    if (handleChanged || pathChanged) throw new Error(`${label} file changed while reading`);
    const content = bytes.subarray(0, total);
    return encoding === null ? content : content.toString(encoding);
  } finally {
    await handle.close();
  }
}
