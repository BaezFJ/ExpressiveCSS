import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Writes pretty-printed JSON, creating parent directories. Pass flag 'wx' to refuse overwrites. */
export async function saveJson(file, value, flag = 'w') {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { flag });
}
