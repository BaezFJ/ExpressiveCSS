import { rm } from 'node:fs/promises';
import { EXAMPLE_NAMES, materializeProjectFixture } from './eval-expressivecss-skill.mjs';
import { startFixtureServer } from './expressivecss-eval-browser.mjs';

const name = process.argv[2];
if (process.argv.length !== 3 || !EXAMPLE_NAMES.includes(name)) {
  throw new Error(`Choose one example: ${EXAMPLE_NAMES.join(', ')}. Build the framework first with npm run build.`);
}
const project = await materializeProjectFixture(`example-${name}`);
let server;
try {
  server = await startFixtureServer(project);
  console.log(`${name}: ${server.origin}/dashboard`);
  console.log('Use the treatment control to compare styles. Changes last until reload. Press Ctrl+C to close.');
  await new Promise((resolve) => {
    process.once('SIGINT', resolve);
    process.once('SIGTERM', resolve);
  });
} finally {
  await server?.close();
  await rm(project, { recursive: true, force: true });
}
