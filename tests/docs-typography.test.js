import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const docsCss = readFileSync(new URL('../docs/static/docs.css', import.meta.url), 'utf8');
const pageBody = readFileSync(
  new URL('../docs/src/components/PageBody.astro', import.meta.url),
  'utf8'
);
const pageHeader = readFileSync(
  new URL('../docs/src/components/PageHeader.astro', import.meta.url),
  'utf8'
);
const panes = readFileSync(
  new URL('../docs/src/pages/panes.astro', import.meta.url),
  'utf8'
);

describe('Documentation typography', () => {
  test('uses ExpressiveCSS type role classes for the page header', () => {
    // The header takes its roles from framework classes, not docs.css.
    assert.match(pageHeader, /docs-page-title display-small/);
    assert.match(pageHeader, /docs-page-description body-large/);
    assert.doesNotMatch(docsCss, /\.docs-page-title[^{]*\{[^}]*--md-sys-typescale/);
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
    assert.match(pageBody, /class:list=\{\["docs-page-content", \{ wide \}\]\}/);
    assert.match(panes, /<PageBody sections=\{S\} wide>/);
    assert.match(docsCss, /\.docs-page:has\(> \.docs-page-content\.wide\)/);
    assert.doesNotMatch(panes, /panes-page-(?:body|toc)/);
  });
});
