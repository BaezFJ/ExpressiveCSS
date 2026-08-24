import { describe, test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

const roles = {
  'display-large': ['brand', '3.5625rem', '4rem', '-0.015625rem', '400'],
  'display-medium': ['brand', '2.8125rem', '3.25rem', '0rem', '400'],
  'display-small': ['brand', '2.25rem', '2.75rem', '0rem', '400'],
  'headline-large': ['brand', '2rem', '2.5rem', '0rem', '400'],
  'headline-medium': ['brand', '1.75rem', '2.25rem', '0rem', '400'],
  'headline-small': ['brand', '1.5rem', '2rem', '0rem', '400'],
  'title-large': ['brand', '1.375rem', '1.75rem', '0rem', '400'],
  'title-medium': ['plain', '1rem', '1.5rem', '0.009375rem', '500'],
  'title-small': ['plain', '0.875rem', '1.25rem', '0.00625rem', '500'],
  'body-large': ['plain', '1rem', '1.5rem', '0.03125rem', '400'],
  'body-medium': ['plain', '0.875rem', '1.25rem', '0.015625rem', '400'],
  'body-small': ['plain', '0.75rem', '1rem', '0.025rem', '400'],
  'label-large': ['plain', '0.875rem', '1.25rem', '0.00625rem', '500'],
  'label-medium': ['plain', '0.75rem', '1rem', '0.03125rem', '500'],
  'label-small': ['plain', '0.6875rem', '1rem', '0.03125rem', '500'],
};

function token(role, property) {
  const match = css.match(
    new RegExp(`--md-sys-typescale-${role}-${property}:\\s*([^;]+);`)
  );
  assert.ok(match, `missing ${role} ${property} token`);
  return match[1].trim();
}

describe('Material 3 typography', () => {
  test('uses customizable Roboto brand/plain tokens with Noto Sans fallback', () => {
    assert.match(css, /--md-ref-typeface-brand:\s*"Roboto";/);
    assert.match(css, /--md-ref-typeface-plain:\s*"Roboto";/);
    assert.match(css, /--md-ref-typeface-fallback:\s*"Noto Sans", sans-serif;/);

    for (const [role, [family]] of Object.entries(roles)) {
      assert.equal(
        token(role, 'font-family-name'),
        `var(--md-ref-typeface-${family}), var(--md-ref-typeface-fallback)`
      );
    }
  });

  test('publishes the baseline scale in M3 web rem units', () => {
    for (const [role, [, size, lineHeight, tracking, weight]] of Object.entries(roles)) {
      assert.equal(token(role, 'font-size'), size, `${role} size`);
      assert.equal(token(role, 'line-height'), lineHeight, `${role} line height`);
      assert.equal(token(role, 'letter-spacing'), tracking, `${role} tracking`);
      assert.equal(token(role, 'font-weight'), weight, `${role} weight`);
    }
  });

  test('does not override the browser root size', () => {
    const typographyHtml = css.match(
      /html \{\s*font-family: var\(--md-ref-typeface-plain\)[\s\S]*?\n  \}/
    );
    assert.ok(typographyHtml, 'missing typography html rule');
    assert.doesNotMatch(typographyHtml[0], /font-size:/);
  });
});
