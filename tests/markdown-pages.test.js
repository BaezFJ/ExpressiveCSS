import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { renderMarkdownPage } from '../scripts/generate-markdown-pages.mjs';

const sample = `<!doctype html>
<html><body><main>
  <section id="index-banner">
    <h1 class="docs-page-title">Menu</h1>
    <p class="docs-page-description">Temporary actions beside a trigger.</p>
  </section>
  <div class="container"><div class="row">
    <div class="docs-page-content">
      <div id="anatomy" class="docs-section">
        <p>A <code>&lt;menu&gt;</code> is the surface.</p>
        <span aria-hidden="true">more_vert</span>
        <article data-markdown-ignore><h3>Live demo title</h3><button>Live action</button></article>
        <h5>Retained after demo</h5>
        <h5>Sibling retained heading</h5>
        <img src="/decorative.png" alt="">
        <pre><code>&lt;menu id="actions"&gt;&lt;/menu&gt;</code></pre>
      </div>
      <div id="options" class="docs-section">
        <h3 class="docs-section-title">Options</h3>
        <p>See <a href="/buttons.html#sizes">button sizes</a>.</p>
        <table><thead><tr><th>Name</th><th>Type</th></tr></thead>
          <tbody><tr><td><code>alignment</code></td><td>String</td></tr></tbody></table>
        <h6>Standard menu</h6>
      </div>
    </div>
    <div><nav aria-label="On this page"><ul>
      <li><a href="#anatomy">Anatomy</a></li>
      <li><a href="#options">Options</a></li>
    </ul></nav></div>
  </div></div>
</main></body></html>`;

describe('the documentation HTML-to-Markdown adapter', () => {
  test('keeps the authored content and removes browser-only chrome', () => {
    const markdown = renderMarkdownPage(
      sample,
      new Map([['/buttons.html', '/buttons.html.md']]),
    );

    assert.match(markdown, /^# Menu\n\n> Temporary actions beside a trigger\./);
    assert.match(markdown, /\n## Anatomy\n/);
    assert.match(markdown, /\n## Options\n/);
    assert.match(markdown, /\[button sizes\]\(\/buttons\.html\.md#sizes\)/);
    assert.match(markdown, /```\n<menu id="actions"><\/menu>\n```/);
    assert.match(markdown, /\| Name\s+\| Type\s+\|/);
    assert.match(markdown, /\n### Standard menu\n/);
    assert.doesNotMatch(markdown, /^#{4,6} Standard menu$/m);
    assert.doesNotMatch(markdown, /more_vert|decorative\.png|On this page/);
    assert.doesNotMatch(markdown, /Live demo title|Live action/);
    assert.match(markdown, /^### Retained after demo$/m);
    assert.match(markdown, /^### Sibling retained heading$/m);
    assert.doesNotMatch(markdown, /^#### (?:Retained after demo|Sibling retained heading)$/m);
  });
});
