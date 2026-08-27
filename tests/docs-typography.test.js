import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const docsCss = readFileSync(new URL('../docs/static/docs.css', import.meta.url), 'utf8');
const pageBody = readFileSync(
  new URL('../docs/src/components/PageBody.astro', import.meta.url),
  'utf8'
);
const panes = readFileSync(
  new URL('../docs/src/pages/panes.astro', import.meta.url),
  'utf8'
);

describe('Documentation typography', () => {
  test('uses ExpressiveCSS display roles for the shared banner', () => {
    assert.match(
      docsCss,
      /\.docs-page-title[\s\S]*--md-sys-typescale-display-medium-font-size/
    );
    assert.match(
      docsCss,
      /@media \(width >= 840px\)[\s\S]*--md-sys-typescale-display-large-font-size/
    );
  });

  test('uses M3 title and body roles for readable documentation prose', () => {
    assert.match(
      docsCss,
      /\.docs-section > \.flow-text:first-child[\s\S]*--md-sys-typescale-title-large-font-size/
    );
    assert.match(
      docsCss,
      /\.docs-section > :is\(ul, ol\)[\s\S]*--md-sys-typescale-body-large-font-size/
    );
    assert.match(docsCss, /max-width:\s*68ch/);
  });

  test('uses body and label roles for technical text and tables', () => {
    assert.match(
      docsCss,
      /\.docs-section > table[\s\S]*--md-sys-typescale-body-medium-font-size/
    );
    assert.match(
      docsCss,
      /\.docs-section > table th[\s\S]*--md-sys-typescale-label-large-font-size/
    );
    assert.match(
      docsCss,
      /:not\(pre\) > code[\s\S]*--md-sys-typescale-body-medium-font-size/
    );
  });

  test('keeps the wide Panes page on the shared content and TOC scaffold', () => {
    assert.match(
      pageBody,
      /contentClass = "s12 m8 offset-m1 xl7 offset-xl1"/
    );
    assert.match(
      panes,
      /<PageBody sections=\{S\} containerClass="panes-page" contentClass="s12 m9 l10" tocClass="m3 l2">/
    );
    assert.doesNotMatch(panes, /panes-page-(?:body|toc)/);
  });
});
