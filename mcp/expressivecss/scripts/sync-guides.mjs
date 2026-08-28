import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(packageDir, '..', '..');
const sourceDir = path.join(repoRoot, 'skills', 'expressivecss', 'components');
const destination = path.join(packageDir, 'component-guides.json');
const semanticsDestination = path.join(packageDir, 'semantics-data.json');

const files = (await readdir(sourceDir))
  .filter((name) => name.endsWith('.md'))
  .sort();

const guides = [];
for (const file of files) {
  guides.push({
    file,
    content: await readFile(path.join(sourceDir, file), 'utf8'),
  });
}

const packageJson = JSON.parse(await readFile(path.join(repoRoot, 'package.json'), 'utf8'));
const semantics = JSON.parse(await readFile(path.join(repoRoot, 'semantics.json'), 'utf8'));
const generated = `${JSON.stringify({
  schemaVersion: 1,
  frameworkVersion: packageJson.version,
  guides,
}, null, 2)}\n`;
const generatedSemantics = `${JSON.stringify({
  schemaVersion: 1,
  frameworkVersion: packageJson.version,
  semantics,
}, null, 2)}\n`;
if (process.argv.includes('--check')) {
  const current = await readFile(destination, 'utf8').catch(() => '');
  const currentSemantics = await readFile(semanticsDestination, 'utf8').catch(() => '');
  if (current !== generated || currentSemantics !== generatedSemantics) {
    throw new Error('Bundled guides or semantics are stale; run npm run sync:guides');
  }
  console.log(`Verified ${guides.length} bundled guides and normative semantics.`);
} else {
  await writeFile(destination, generated);
  await writeFile(semanticsDestination, generatedSemantics);
  console.log(`Synced ${guides.length} ExpressiveCSS component guides and normative semantics.`);
}
