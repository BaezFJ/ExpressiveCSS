import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Copy the woff2 files the compiled sheet names into dist/fonts/.
 *
 * Sources are Fontsource packages (devDependencies). The published package
 * ships the renamed files, not the Fontsource packages themselves.
 */
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
const destDir = join(root, 'dist/fonts');

function pkgPath(specifier, ...parts) {
  return join(dirname(require.resolve(`${specifier}/package.json`)), ...parts);
}

const copies = [
  [
    '@fontsource-variable/material-symbols-outlined',
    'files/material-symbols-outlined-latin-full-normal.woff2',
    'material-symbols-outlined.woff2',
  ],
  [
    '@fontsource-variable/material-symbols-rounded',
    'files/material-symbols-rounded-latin-full-normal.woff2',
    'material-symbols-rounded.woff2',
  ],
  [
    '@fontsource-variable/material-symbols-sharp',
    'files/material-symbols-sharp-latin-full-normal.woff2',
    'material-symbols-sharp.woff2',
  ],
  ['@fontsource/roboto', 'files/roboto-latin-400-normal.woff2', 'roboto-latin-400.woff2'],
  ['@fontsource/roboto', 'files/roboto-latin-500-normal.woff2', 'roboto-latin-500.woff2'],
  ['@fontsource/noto-sans', 'files/noto-sans-latin-400-normal.woff2', 'noto-sans-latin-400.woff2'],
  ['@fontsource/noto-sans', 'files/noto-sans-latin-500-normal.woff2', 'noto-sans-latin-500.woff2'],
];

const licenses = [
  ['@fontsource-variable/material-symbols-outlined', 'LICENSE', 'LICENSE-material-symbols'],
  ['@fontsource/roboto', 'LICENSE', 'LICENSE-roboto'],
  ['@fontsource/noto-sans', 'LICENSE', 'LICENSE-noto-sans'],
];

mkdirSync(destDir, { recursive: true });

for (const [pkg, rel, dest] of [...copies, ...licenses]) {
  const src = pkgPath(pkg, rel);
  if (!existsSync(src)) {
    throw new Error(`missing font source ${src}`);
  }
  copyFileSync(src, join(destDir, dest));
}

console.log(`Copied ${copies.length} font files to dist/fonts/`);
