import { existsSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
const engines = { chromium, firefox, webkit };
const names = process.argv.length > 2 ? process.argv.slice(2) : Object.keys(engines);
for (const name of names) {
  if (!Object.hasOwn(engines, name)) throw new Error(`Unknown browser: ${name}`);
  if (!existsSync(engines[name].executablePath())) throw new Error(`${name} is required. Run: npx playwright install ${names.join(' ')}`);
}
