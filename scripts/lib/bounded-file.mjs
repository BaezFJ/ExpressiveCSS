import { constants as fsConstants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import path from 'node:path';

function isPathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

// Codes let callers that report a status instead of throwing map each refusal.
const fail = (message, code) => Object.assign(new Error(message), { code });

export async function readBoundedRegularFile(filePath, byteLimit, label, expectedRoot = null, encoding = 'utf8') {
  const target = path.resolve(filePath);
  let resolvedRoot = null;
  if (expectedRoot) {
    const rootPrefix = path.join(path.resolve(expectedRoot), path.sep);
    if (!target.startsWith(rootPrefix)) {
      throw fail(`${label} file is outside the repository`, 'outside-root');
    }
    resolvedRoot = await realpath(expectedRoot);
    const relative = path.relative(rootPrefix, target);
    let current = resolvedRoot;
    for (const segment of relative.split(path.sep)) {
      current = path.join(current, segment);
      const entry = await lstat(current, { bigint: true });
      if (entry.isSymbolicLink()) throw fail(`${label} file path contains a symbolic link`, 'symbolic-link');
    }
  }

  const noFollow = Number.isInteger(fsConstants.O_NOFOLLOW) ? fsConstants.O_NOFOLLOW : 0;
  const nonBlocking = Number.isInteger(fsConstants.O_NONBLOCK) ? fsConstants.O_NONBLOCK : 0;
  const handle = await open(target, fsConstants.O_RDONLY | noFollow | nonBlocking);
  try {
    const before = await handle.stat({ bigint: true });
    const pathBefore = await lstat(target, { bigint: true });
    if (pathBefore.isSymbolicLink()) throw fail(`${label} file is a symbolic link`, 'symbolic-link');
    if (!before.isFile() || !pathBefore.isFile()) throw fail(`${label} file is not a regular file`, 'not-regular-file');
    if (before.dev !== pathBefore.dev || before.ino !== pathBefore.ino) {
      throw fail(`${label} file identity changed before reading`, 'identity-changed');
    }
    if (resolvedRoot) {
      const openedPath = await realpath(`/proc/self/fd/${handle.fd}`).catch(() => realpath(target));
      if (!isPathInside(resolvedRoot, openedPath)) throw fail(`${label} file is outside the repository`, 'outside-root');
    }
    if (before.size > BigInt(byteLimit)) throw fail(`${label} file exceeds ${byteLimit} bytes`, 'oversized');

    // Size the buffer to the file, not the limit. The spare byte exposes growth
    // and files such as /proc entries that report a smaller size than they hold.
    const capacity = Number(before.size) + 1;
    const bytes = Buffer.allocUnsafe(capacity);
    let total = 0;
    while (total < capacity) {
      const chunk = await handle.read(bytes, total, capacity - total, total);
      if (chunk.bytesRead === 0) break;
      total += chunk.bytesRead;
    }
    if (total > before.size) throw fail(`${label} file changed while reading`, 'identity-changed');

    const after = await handle.stat({ bigint: true });
    const pathAfter = await lstat(target, { bigint: true });
    const handleChanged = before.dev !== after.dev || before.ino !== after.ino
      || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs;
    const pathChanged = pathAfter.isSymbolicLink() || !pathAfter.isFile()
      || after.dev !== pathAfter.dev || after.ino !== pathAfter.ino;
    if (handleChanged || pathChanged) throw fail(`${label} file changed while reading`, 'identity-changed');
    const content = bytes.subarray(0, total);
    return encoding === null ? content : content.toString(encoding);
  } finally {
    await handle.close();
  }
}
