// One browser per engine per test file. Launching dominated browser-test time,
// Firefox's most of all, so tests lease the file's browser instead. A lease
// opens pages and contexts like a Browser, and its close() closes only those.
import { existsSync } from 'node:fs';
import { after, test } from 'node:test';
import { chromium, firefox, webkit } from 'playwright';

const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;
if (requested && !['chromium', 'firefox', 'webkit'].includes(requested)) throw new Error(`Unknown EXPRESSIVECSS_TEST_BROWSER: ${requested}`);

// [name, browser type, test] for each engine this run covers, where `test`
// skips when that engine is not installed.
export const engines = Object.entries({ chromium, firefox, webkit })
  .filter(([name]) => !requested || requested === name)
  .map(([name, type]) => [name, type, existsSync(type.executablePath()) ? test : test.skip]);

const launched = new Map();

after(async () => {
  await Promise.allSettled([...launched.values()].map(async (browser) => (await browser).close()));
});

// Set synchronously so concurrent tests share one launch. A failed launch or a
// crashed browser drops out, and the next lease launches a fresh one.
function launch(type) {
  if (!launched.has(type)) {
    const browser = type.launch().then((browser) => {
      browser.on('disconnected', () => launched.delete(type));
      return browser;
    });
    browser.catch(() => launched.delete(type));
    launched.set(type, browser);
  }
  return launched.get(type);
}

export async function leaseBrowser(type) {
  const browser = await launch(type);
  const contexts = new Set();
  const track = (context) => { contexts.add(context); return context; };
  return {
    newContext: async (options) => track(await browser.newContext(options)),
    newPage: async (options) => { const page = await browser.newPage(options); track(page.context()); return page; },
    version: () => browser.version(),
    close: async () => { await Promise.all([...contexts].map((context) => context.close())); },
  };
}
