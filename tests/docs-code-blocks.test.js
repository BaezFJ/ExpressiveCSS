import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const script = readFileSync(
  new URL('../docs/static/code-blocks.js', import.meta.url),
  'utf8'
);

function docsPage(markup, { clipboard = true, highlighter = true } = {}) {
  const dom = new JSDOM(`<!doctype html><body>${markup}</body>`, {
    runScripts: 'dangerously',
    url: 'https://docs.example.test/',
  });
  const writes = [];
  const highlighted = [];

  if (clipboard) {
    Object.defineProperty(dom.window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (value) => writes.push(value) },
    });
  }
  if (highlighter) {
    dom.window.hljs = {
      configure() {},
      highlightElement(code) {
        highlighted.push(code.className);
        code.innerHTML = `<span class="hljs-tag">${code.innerHTML}</span>`;
      },
    };
  }

  dom.window.eval(script);
  return { dom, highlighted, writes };
}

describe('documentation code blocks', () => {
  test('adds a language label, highlighting, and one copy control', () => {
    const { dom, highlighted } = docsPage(
      '<pre><code>&lt;button&gt;Save&lt;/button&gt;</code></pre>'
    );
    const { document } = dom.window;

    assert.equal(document.querySelectorAll('.code-block').length, 1);
    assert.equal(document.querySelector('.code-language').textContent, 'HTML');
    assert.equal(
      document.querySelector('code').classList.contains('language-html'),
      true
    );
    assert.deepEqual(highlighted, ['language-html']);
    assert.equal(document.querySelectorAll('.code-copy-button').length, 1);

    // Re-running the enhancer must not duplicate controls or re-highlight markup.
    dom.window.eval(script);
    assert.equal(document.querySelectorAll('.code-copy-button').length, 1);
    assert.deepEqual(highlighted, ['language-html']);
  });

  test('copies the original source rather than highlighted markup', async () => {
    const source = "const saved = true;\nconsole.log(saved);";
    const { dom, writes } = docsPage(`<pre><code>${source}</code></pre>`);
    const button = dom.window.document.querySelector('.code-copy-button');

    button.click();
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

    assert.deepEqual(writes, [source]);
    assert.equal(button.dataset.state, 'copied');
    assert.equal(button.querySelector('.code-copy-label').textContent, 'Copied');
  });

  test('keeps readable controls when highlighting is unavailable', () => {
    const { dom } = docsPage('<pre><code>npm install</code></pre>', { highlighter: false });
    const { document } = dom.window;

    assert.equal(document.querySelector('.code-language').textContent, 'Shell');
    assert.equal(document.querySelector('code').textContent, 'npm install');
    assert.ok(document.querySelector('.code-copy-button'));
  });
});
