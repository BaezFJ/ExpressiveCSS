// One browser per engine per test file. Launching dominated browser-test time,
// Firefox's most of all, so tests lease the file's browser instead. A lease
// opens pages and contexts like a Browser, and its close() closes only those.
import { after } from 'node:test';

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
