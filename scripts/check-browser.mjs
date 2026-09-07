import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
if (!existsSync(chromium.executablePath())) {
  throw new Error('Chromium is required. Run: npx playwright install chromium');
}
