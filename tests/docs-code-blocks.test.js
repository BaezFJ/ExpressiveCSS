import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const script = readFileSync(
  new URL('../docs/static/code-blocks.js', import.meta.url),
  'utf8'
);

function docsPage(markup, { clipboard = true, scrollWidth = 0 } = {}) {
  const dom = new JSDOM(`<!doctype html><body>${markup}</body>`, {
    runScripts: 'dangerously',
    url: 'https://docs.example.test/',
  });
  // jsdom has no layout, so a sample is as wide as the test says it is.
  Object.defineProperty(dom.window.HTMLPreElement.prototype, 'scrollWidth', {
    configurable: true,
    get: () => scrollWidth,
  });
  const writes = [];

  if (clipboard) {
    Object.defineProperty(dom.window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (value) => writes.push(value) },
    });
  }
  dom.window.eval(script);
  return { dom, writes };
}

describe('documentation code blocks', () => {
  test('adds a language label and one copy control', () => {
    const { dom } = docsPage(
      '<pre data-language="html"><code>&lt;button&gt;Save&lt;/button&gt;</code></pre>'
    );
    const { document } = dom.window;

    assert.equal(document.querySelectorAll('.code-block').length, 1);
    assert.equal(document.querySelector('.code-language').textContent, 'HTML');
    assert.equal(document.querySelectorAll('.code-copy-button').length, 1);

    // Re-running the enhancer must not duplicate controls.
    dom.window.eval(script);
    assert.equal(document.querySelectorAll('.code-copy-button').length, 1);
  });

  test('copies the original source rather than highlighted markup', async () => {
    const source = "const saved = true;\nconsole.log(saved);";
    const { dom, writes } = docsPage(`<pre data-language="javascript"><code><span>${source}</span></code></pre>`);
    const button = dom.window.document.querySelector('.code-copy-button');

    button.click();
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

    assert.deepEqual(writes, [source]);
    assert.equal(button.dataset.state, 'copied');
    assert.equal(button.querySelector('.code-copy-label').textContent, 'Copied');
  });

  test('leaves a pre that Code.astro did not render alone', () => {
    const { dom } = docsPage('<pre><code>npm run build</code></pre>');
    assert.equal(dom.window.document.querySelector('.code-block'), null);
  });

  test('puts only an overflowing sample in the Tab order', () => {
    const narrow = docsPage('<pre data-language="bash"><code>npm install</code></pre>');
    assert.equal(narrow.dom.window.document.querySelector('pre').hasAttribute('tabindex'), false);

    const wide = docsPage('<pre data-language="bash"><code>npm install</code></pre>', { scrollWidth: 900 });
    assert.equal(wide.dom.window.document.querySelector('pre').tabIndex, 0);
  });
});
