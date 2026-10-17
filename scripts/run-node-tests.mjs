// Runs the Node tests, or the browser tests with --browser. Browser behavior has
// a separate required CI job with every engine installed.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const browser = process.argv.includes('--browser');
// EXPRESSIVECSS_TEST_SHARD=index/total runs every total-th file. The critical-flow
// file always runs in shard 1, where CI checks its reports.
const [index, total] = (process.env.EXPRESSIVECSS_TEST_SHARD || '1/1').split('/').map(Number);
if (!(index >= 1 && index <= total)) throw new Error(`Invalid EXPRESSIVECSS_TEST_SHARD: ${process.env.EXPRESSIVECSS_TEST_SHARD}`);
const files = readdirSync('tests').filter((file) => /\.test\.[cm]?js$/.test(file) && /-browser\.test\.[cm]?js$/.test(file) === browser).sort()
  .filter((file, position) => file === 'expressivecss-cross-browser.test.js' ? index === 1 : position % total === index - 1);
const result = spawnSync(process.execPath, ['--test', '--test-reporter=spec', '--test-reporter-destination=stdout', '--test-reporter=./scripts/lib/github-annotations.mjs', '--test-reporter-destination=stderr', ...files.map((file) => `tests/${file}`)], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
