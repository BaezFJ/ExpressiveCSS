// Browser behavior has a separate required CI job with Chromium installed.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const files = readdirSync('tests').filter((file) => /\.test\.[cm]?js$/.test(file) && !/-browser\.test\.[cm]?js$/.test(file));
const result = spawnSync(process.execPath, ['--test', ...files.map((file) => `tests/${file}`)], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
