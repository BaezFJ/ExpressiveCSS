// One browser per engine per test file. Launching dominated browser-test time,
// Firefox's most of all, so tests lease the file's browser instead. A lease
// opens pages and contexts like a Browser, and its close() closes only those.
import { existsSync, readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { chromium, firefox, webkit } from 'playwright';

const requested = process.env.EXPRESSIVECSS_TEST_BROWSER;
if (requested && !['chromium', 'firefox', 'webkit'].includes(requested)) throw new Error(`Unknown EXPRESSIVECSS_TEST_BROWSER: ${requested}`);

// The test function for an engine: test.skip when it is not installed, unless
// the run asked for it by name, so a missing browser cannot pass as skipped.
function runner(name, type) {
  if (existsSync(type.executablePath())) return test;
  if (requested) throw new Error(`EXPRESSIVECSS_TEST_BROWSER=${name}, but ${name} is not installed`);
  return test.skip;
}

// [name, browser type, test] for each engine this run covers.
export const engines = Object.entries({ chromium, firefox, webkit })
  .filter(([name]) => !requested || requested === name)
  .map(([name, type]) => [name, type, runner(name, type)]);

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

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const extras = { js: read('extras/dist/js/extras.js'), css: read('extras/dist/css/extras.css') };

// Runs in the page. When an inline core script (setContent or addScriptTag
// content) assigns `Expressive`, the extras bundle runs at once, as if
// extras.js were the next script, and its sheet follows the core script. So a
// test page can use extras components with only the core script and sheet.
// A page that loads expressive.js from a URL is an application that chooses
// its own scripts, and is left alone.
function loadExtrasAfterCore({ js, css }) {
  let core;
  Object.defineProperty(window, 'Expressive', {
    configurable: true,
    enumerable: true,
    get: () => core,
    set(value) {
      core = value;
      if (window.ExpressiveExtras || !value?.core || document.currentScript?.src) return;
      try {
        (0, eval)(js);
      } catch (error) {
        console.error('Could not load the extras bundle', error);
        return;
      }
      const style = document.createElement('style');
      style.textContent = css;
      if (document.currentScript) document.currentScript.after(style);
      else (document.head ?? document.documentElement).append(style);
    },
  });
}

export async function leaseBrowser(type) {
  const browser = await launch(type);
  const contexts = new Set();
  const newContext = async (options) => {
    const context = await browser.newContext(options);
    contexts.add(context);
    await context.addInitScript(loadExtrasAfterCore, extras);
    return context;
  };
  return {
    newContext,
    // Its own context, as browser.newPage() makes, so the init script also covers the first document.
    newPage: async (options) => (await newContext(options)).newPage(),
    version: () => browser.version(),
    close: async () => { await Promise.all([...contexts].map((context) => context.close())); },
  };
}
