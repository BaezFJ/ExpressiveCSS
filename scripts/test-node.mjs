// Browser behavior has a separate required CI job with Chromium installed.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const files = readdirSync('tests').filter((file) => file.endsWith('.test.js') && !file.endsWith('-browser.test.js'));
const result = spawnSync(process.execPath, ['--test', ...files.map((file) => `tests/${file}`)], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
