import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const docsCss = readFileSync(new URL('../docs/static/docs.css', import.meta.url), 'utf8');
const pageMacro = readFileSync(
  new URL('../docs/templates/macros/page.html', import.meta.url),
  'utf8'
);
const bannerMacro = readFileSync(
  new URL('../docs/templates/macros/banner.html', import.meta.url),
  'utf8'
);
const baseTemplate = readFileSync(
  new URL('../docs/templates/base.html', import.meta.url),
  'utf8'
);

describe('Documentation typography', () => {
  test('uses ExpressiveCSS display and headline roles in the shared banner', () => {
    assert.match(bannerMacro, /docs-page-title display-large on-primary-container-text/);
    assert.match(
      bannerMacro,
      /docs-page-description headline-small on-primary-container-text/
    );
    assert.match(
      docsCss,
      /\.docs-page-title[\s\S]*--md-sys-typescale-display-medium-font-size/
    );
    assert.match(
      docsCss,
      /@media \(width >= 840px\)[\s\S]*--md-sys-typescale-display-large-font-size/
    );
  });

  test('adds shared prose and section hooks instead of page-specific classes', () => {
    assert.match(pageMacro, /class="section scrollspy docs-section"/);
    assert.match(pageMacro, /docs-section-title \{\{ heading_role \}\}/);
    assert.match(pageMacro, /docs-page-content/);
    assert.match(pageMacro, /'h2': 'headline-large'/);
    assert.match(pageMacro, /'h3': 'headline-medium'/);
    assert.match(pageMacro, /'h4': 'title-large'/);
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

  test('versions the docs stylesheet so typography updates are not served stale', () => {
    assert.match(
      baseTemplate,
      /url_for\('static', filename='docs\.css', v=version\)/
    );
  });
});
