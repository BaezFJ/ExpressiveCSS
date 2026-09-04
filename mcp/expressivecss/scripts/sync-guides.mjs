import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(packageDir, '..', '..');
const sourceDir = path.join(repoRoot, 'skills', 'expressivecss', 'components');
const destination = path.join(packageDir, 'component-guides.json');
const semanticsDestination = path.join(packageDir, 'semantics-data.json');
const decisionsSource = path.join(repoRoot, 'docs', 'src', 'data', 'component-decisions.json');
const decisionsDestination = path.join(packageDir, 'component-decisions.json');
const contractSource = path.join(repoRoot, 'skills', 'expressivecss', 'references', 'contract.json');
const contractDestination = path.join(packageDir, 'contract.json');
const generatedBy = 'mcp/expressivecss/scripts/sync-guides.mjs';

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
const decisions = JSON.parse(await readFile(decisionsSource, 'utf8'));
const contract = JSON.parse(await readFile(contractSource, 'utf8'));
const generated = `${JSON.stringify({
  schemaVersion: 1,
  generatedBy,
  frameworkVersion: packageJson.version,
  guides,
}, null, 2)}\n`;
const generatedSemantics = `${JSON.stringify({
  schemaVersion: 1,
  generatedBy,
  frameworkVersion: packageJson.version,
  semantics,
}, null, 2)}\n`;
const { schemaVersion: decisionSchemaVersion, ...decisionContents } = decisions;
const generatedDecisions = `${JSON.stringify({
  schemaVersion: decisionSchemaVersion,
  generatedBy,
  ...decisionContents,
}, null, 2)}\n`;
if (process.argv.includes('--check')) {
  const current = await readFile(destination, 'utf8').catch(() => '');
  const currentSemantics = await readFile(semanticsDestination, 'utf8').catch(() => '');
  const currentDecisions = await readFile(decisionsDestination, 'utf8').catch(() => '');
  const currentContract = await readFile(contractDestination, 'utf8').catch(() => '');
  const generatedContract = `${JSON.stringify(contract, null, 2)}\n`;
  if (current !== generated || currentSemantics !== generatedSemantics || currentDecisions !== generatedDecisions || currentContract !== generatedContract) {
    throw new Error('Bundled guides, semantics, component decisions, or contract manifest are stale; run npm run build:skill');
  }
  console.log(`Verified ${guides.length} bundled guides and normative semantics.`);
} else {
  await writeFile(destination, generated);
  await writeFile(semanticsDestination, generatedSemantics);
  await writeFile(decisionsDestination, generatedDecisions);
  await writeFile(contractDestination, `${JSON.stringify(contract, null, 2)}\n`);
  console.log(`Synced ${guides.length} ExpressiveCSS component guides and normative semantics.`);
}
