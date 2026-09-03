// M3 Expressive app bar. CSS only. The small bar is already 64dp / title-large.
// Expressive replaces the deprecated medium (headline-small, 112) and large
// (headline-medium, 152) bars with medium-flexible and large-flexible:
// shorter large bar, larger titles, optional subtitle, wrap not truncate.
// Token numbers are md.comp.app-bar.* from Material Web v29.0.16.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRules, sheet } from './css.js';

const css = sheet();
const rules = parseRules(css);

function hasTypescale(body, role) {
  return body.includes(`var(--md-sys-typescale-${role}-font-size)`);
}

describe('App bar M3 Expressive types', () => {
  test('medium flexible is 112dp with a headline-medium title', () => {
    const height = rules.find(
      (r) => r.selector.includes('header.medium') && /min-height:\s*112px/.test(r.body),
    );
    assert.ok(height, 'medium bar is not 112dp');

    const title = rules.find(
      (r) => r.selector.includes('header.medium') && hasTypescale(r.body, 'headline-medium'),
    );
    assert.ok(title, 'medium title is not headline-medium');
    assert.ok(
      !title.body.includes('headline-small-font-size'),
      'medium still uses the deprecated headline-small title',
    );
  });

  test('large flexible is 120dp with a display-small title', () => {
    const height = rules.find(
      (r) => r.selector.includes('header.large') && /min-height:\s*120px/.test(r.body),
    );
    assert.ok(height, 'large bar is not 120dp');
    assert.match(
      height.body,
      /padding-bottom:\s*20px/,
      'large bar padding-bottom is not 20dp (8+48+44+20=120)',
    );
    const withoutSubtitle = rules.filter(
      (r) =>
        r.selector.includes('header.large') &&
        /min-height:\s*152px/.test(r.body) &&
        !r.selector.includes('hgroup'),
    );
    assert.deepEqual(withoutSubtitle, [], 'large still uses 152dp without a subtitle');

    const title = rules.find(
      (r) => r.selector.includes('header.large') && hasTypescale(r.body, 'display-small'),
    );
    assert.ok(title, 'large title is not display-small');
  });

  test('a subtitle is the paragraph inside hgroup, not a class', () => {
    const subtitle = rules.find(
      (r) => /hgroup\s*>\s*p/.test(r.selector) && r.selector.includes('header'),
    );
    assert.ok(subtitle, 'no header hgroup > p subtitle rule');
    assert.doesNotMatch(css, /header[^{]*\.subtitle/);
  });

  test('small subtitle uses label-medium', () => {
    const rule = rules.find(
      (r) =>
        /header:has/.test(r.selector) &&
        /hgroup\s*>\s*p/.test(r.selector) &&
        hasTypescale(r.body, 'label-medium'),
    );
    assert.ok(rule, 'small subtitle is not label-medium');
  });

  test('medium with subtitle is 136dp and the subtitle is label-large', () => {
    const height = rules.find(
      (r) =>
        r.selector.includes('header.medium') &&
        r.selector.includes('hgroup') &&
        /min-height:\s*136px/.test(r.body),
    );
    assert.ok(height, 'medium + subtitle is not 136dp');

    const subtitle = rules.find(
      (r) =>
        r.selector.includes('header.medium') &&
        /hgroup\s*>\s*p/.test(r.selector) &&
        hasTypescale(r.body, 'label-large'),
    );
    assert.ok(subtitle, 'medium subtitle is not label-large');
  });

  test('large with subtitle is 152dp and the subtitle is title-medium', () => {
    const height = rules.find(
      (r) =>
        r.selector.includes('header.large') &&
        r.selector.includes('hgroup') &&
        /min-height:\s*152px/.test(r.body),
    );
    assert.ok(height, 'large + subtitle is not 152dp');
    assert.match(
      height.body,
      /padding-bottom:\s*28px/,
      'large subtitle padding-bottom is not 28dp (8+48+44+24+28=152)',
    );

    const subtitle = rules.find(
      (r) =>
        r.selector.includes('header.large') &&
        /hgroup\s*>\s*p/.test(r.selector) &&
        hasTypescale(r.body, 'title-medium'),
    );
    assert.ok(subtitle, 'large subtitle is not title-medium');
  });

  test('medium and large titles wrap to two lines instead of truncating', () => {
    const titles = rules.filter(
      (r) =>
        (/header\.medium/.test(r.selector) || /header\.large/.test(r.selector)) &&
        /line-clamp:\s*2|-webkit-line-clamp:\s*2/.test(r.body),
    );
    assert.ok(titles.length >= 1, 'medium/large titles do not clamp to two lines');
    for (const rule of titles) {
      assert.doesNotMatch(rule.body, /text-overflow:\s*ellipsis/);
    }
  });

  test('hgroup children do not add a second 12px inset', () => {
    const inner = rules.filter(
      (r) =>
        (/header\.medium/.test(r.selector) || /header\.large/.test(r.selector)) &&
        /hgroup\s*>/.test(r.selector) &&
        !/\.collapsed/.test(r.selector),
    );
    assert.ok(inner.length >= 1, 'no hgroup child rules');
    for (const rule of inner) {
      assert.doesNotMatch(rule.body, /padding:\s*0 12px/);
    }
    assert.ok(
      rules.some(
        (r) =>
          (/header\.medium/.test(r.selector) || /header\.large/.test(r.selector)) &&
          /hgroup/.test(r.selector) &&
          !/hgroup\s*>/.test(r.selector) &&
          /padding:\s*0 12px/.test(r.body),
      ),
      'title slot lost the 12px inset',
    );
  });

  test('center-aligned works on small, medium, and large bars', () => {
    assert.ok(
      rules.some((r) => /header\.center:not/.test(r.selector)),
      'small center rule missing',
    );
    assert.ok(
      rules.some((r) => /header\.center\.medium/.test(r.selector) || /header\.center\.large/.test(r.selector)),
      'center is not available on medium/large',
    );
  });
});

describe('Search app bar', () => {
  test('a search-bar in the header is the type, not a class on the header', () => {
    const slot = rules.find(
      (r) =>
        /header/.test(r.selector) &&
        /search-bar/.test(r.selector) &&
        /flex:\s*1/.test(r.body),
    );
    assert.ok(slot, 'search-bar inside the header is not the title slot');
    assert.doesNotMatch(css, /header\.search[\s,{]/);
  });

  test('search app bar input text is centered', () => {
    const input = rules.find(
      (r) =>
        /header/.test(r.selector) &&
        /search-bar/.test(r.selector) &&
        /input/.test(r.selector) &&
        /text-align:\s*center/.test(r.body),
    );
    assert.ok(input, 'search app bar input is not centered');
  });
});

describe('Collapsed flexible app bar', () => {
  test('medium and large .collapsed is the small 64dp row', () => {
    const collapsed = rules.filter(
      (r) =>
        /\.collapsed/.test(r.selector) &&
        (/header\.medium/.test(r.selector) || /header\.large/.test(r.selector)),
    );
    assert.ok(
      collapsed.some((r) => /min-height:\s*64px/.test(r.body)),
      'collapsed flexible bar is not 64dp',
    );
    assert.ok(
      collapsed.some((r) => /flex-wrap:\s*nowrap/.test(r.body)),
      'collapsed flexible bar still wraps onto two rows',
    );
  });

  test('collapsed title is title-large and single-line', () => {
    const title = rules.find(
      (r) =>
        /\.collapsed/.test(r.selector) &&
        /header\.(?:medium|large)/.test(r.selector) &&
        hasTypescale(r.body, 'title-large'),
    );
    assert.ok(title, 'collapsed title is not title-large');
  });
});
