import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || '.cache/container-tests';
const reports = readdirSync(root, { recursive: true }).filter(file => file.endsWith('/result.json'));
const passed = new Set();
for (const file of reports) {
  const report = JSON.parse(readFileSync(path.join(root, file), 'utf8'));
  assert.equal(report.status, 'passed', file);
  passed.add(`${report.engine}:${report.profile.name}`);
}
const engines = process.env.EXPRESSIVECSS_TEST_BROWSER ? [process.env.EXPRESSIVECSS_TEST_BROWSER] : ['chromium', 'firefox', 'webkit'];
for (const engine of engines) {
  for (const profile of ['keyboard', 'arabic-touch-reflow']) {
    assert.ok(passed.has(`${engine}:${profile}`), `Missing passing report: ${engine}:${profile}`);
  }
}
console.log(`Passing ${engines.join(', ')} reports verified for both profiles.`);
