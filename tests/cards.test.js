// Material 3 cards: variants, measurements, and interactive states.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');

describe('Cards CSS', () => {
  test('maps the three variants to the M3 container roles', () => {
    assert.match(
      css,
      /--md-comp-elevated-card-container-color:\s*var\(--md-sys-color-surface-container-low\)/
    );
    assert.match(
      css,
      /--md-comp-filled-card-container-color:\s*var\(--md-sys-color-surface-container-highest\)/
    );
    assert.match(
      css,
      /--md-comp-outlined-card-container-color:\s*var\(--md-sys-color-surface\)/
    );
    assert.match(
      css,
      /--md-comp-outlined-card-outline-color:\s*var\(--md-sys-color-outline-variant\)/
    );
  });

  test('uses 12dp shape, 16dp content padding, 8dp collection spacing, and 24dp icons', () => {
    assert.match(css, /--md-comp-card-container-shape:\s*12px/);
    assert.match(
      css,
      /--md-comp-card-media-shape:\s*var\(--md-comp-card-container-shape\)/
    );
    assert.match(css, /--md-comp-card-content-padding:\s*16px/);
    assert.match(css, /--md-comp-card-between-space:\s*8px/);
    assert.match(css, /--md-comp-card-icon-size:\s*24px/);
    assert.match(css, /:where\(\.card-collection\)\s*\{[^}]*gap:\s*var\(--md-comp-card-between-space\)/s);
  });

  test('rounds and clips direct card media, including primary-action media', () => {
    assert.match(
      css,
      /article\s*>\s*img,[^{]+article\s*>\s*\.primary-action\s*>\s*figure\s*\{[^}]*border-radius:\s*var\(--md-comp-card-media-shape\)[^}]*overflow:\s*hidden/s
    );
    assert.match(
      css,
      /article\s*>\s*\.primary-action\s*>\s*figure img\s*\{[^}]*border-radius:\s*var\(--md-comp-card-media-shape\)/s
    );
  });

  test('puts image text and icons on an opaque contrasting bounding shape', () => {
    assert.match(
      css,
      /--md-comp-card-media-overlay-container-color:\s*var\(--md-sys-color-surface\)/
    );
    assert.match(
      css,
      /--md-comp-card-media-overlay-ink-color:\s*var\(--md-sys-color-on-surface\)/
    );
    assert.match(
      css,
      /article\s*>\s*figure\s*>\s*figcaption,[^{]+\{[^}]*background-color:\s*var\(--md-comp-card-media-overlay-container-color\)[^}]*border-radius:\s*var\(--md-comp-card-media-overlay-shape\)/s
    );
    assert.doesNotMatch(
      css,
      /article\s*>\s*figure\s*>\s*figcaption,[^{]+\{[^}]*background:\s*color-mix/s
    );
    assert.match(
      css,
      /figcaption\s*>\s*:is\(\.material-symbols, \.card-icon, svg\)[^{]*\{[^}]*color:\s*inherit/s
    );
  });

  test('uses M3 supporting text color and type roles', () => {
    assert.match(
      css,
      /article\s*>\s*p,[^{]+\{[^}]*font-size:\s*var\(--md-sys-typescale-body-medium-font-size\)[^}]*color:\s*var\(--md-comp-card-supporting-text-color\)/s
    );
    assert.doesNotMatch(
      css,
      /article\s*>\s*p[\s\S]{0,600}color-mix\(in oklab,\s*currentColor 72%/
    );
  });

  test('supports headline, subhead, supporting text, media, and actions anatomy', () => {
    assert.match(
      css,
      /--md-comp-card-headline-color:\s*var\(--md-sys-color-on-surface\)/
    );
    assert.match(
      css,
      /article\s*>\s*p\.subhead,[^{]+\{[^}]*font-size:\s*var\(--md-sys-typescale-title-small-font-size\)[^}]*color:\s*var\(--md-comp-card-subhead-color\)/s
    );
    assert.match(
      css,
      /--md-comp-card-supporting-text-color:\s*var\(--md-sys-color-on-surface-variant\)/
    );
    assert.match(css, /article\s*>\s*figure,[^{]+\.primary-action\s*>\s*figure\s*\{/s);
    assert.match(css, /article\s*>\s*:is\(nav:not\(\.tabs\), \.actions\)\s*\{/);
  });

  test('applies interaction states only through a primary action', () => {
    assert.match(css, /:where\(article\)\s*>\s*\.primary-action\s*\{/);
    assert.match(css, /:has\(>\s*\.primary-action:hover\)::after/);
    assert.match(css, /:has\(>\s*\.primary-action:focus-visible\)::after/);
    assert.match(css, /:has\(>\s*\.primary-action:active\)::after/);
    assert.doesNotMatch(css, /:where\(article\):hover\s*\{/);
  });

  test('uses M3 state-layer and focus-indicator values', () => {
    assert.match(css, /--md-comp-card-hover-state-layer-opacity:\s*0\.08/);
    assert.match(css, /--md-comp-card-focus-state-layer-opacity:\s*0\.10/);
    assert.match(css, /--md-comp-card-pressed-state-layer-opacity:\s*0\.10/);
    assert.match(css, /--md-comp-card-dragged-state-layer-opacity:\s*0\.16/);
    assert.match(css, /--md-comp-card-focus-indicator-thickness:\s*3px/);
    assert.match(css, /--md-comp-card-focus-indicator-offset:\s*2px/);
    assert.match(
      css,
      /--md-comp-card-focus-indicator-color:\s*var\(--md-sys-color-secondary\)/
    );
  });

  test('raises hovered and dragged cards to the specified elevations', () => {
    assert.match(
      css,
      /:not\(\.filled, \.outlined, \.border\):has\(> \.primary-action:hover\)\s*\{[^}]*box-shadow:(?!\s*none)/s
    );
    assert.match(
      css,
      /:is\(\.filled, \.outlined, \.border\):has\(> \.primary-action:hover\)\s*\{[^}]*box-shadow:(?!\s*none)/s
    );
    assert.match(css, /:where\(article\)\.dragged\s*\{[^}]*box-shadow:(?!\s*none)/s);
  });

  test('publishes disabled container and outlined-stroke opacity', () => {
    assert.match(css, /--md-comp-card-disabled-container-opacity:\s*38%/);
    assert.match(css, /--md-comp-outlined-card-disabled-outline-opacity:\s*12%/);
    assert.match(
      css,
      /\.primary-action\[aria-disabled=true\][\s\S]*?pointer-events:\s*none/
    );
  });

  test('expands reveals in flow while keeping the summary and media in place', () => {
    assert.match(
      css,
      /article\s*>\s*aside\s*\{[^}]*position:\s*relative[^}]*height:\s*0[^}]*overflow:\s*clip/s
    );
    assert.match(
      css,
      /article\s*>\s*aside\[aria-expanded=true\]\s*\{[^}]*height:\s*auto[^}]*opacity:\s*1/s
    );
    assert.match(css, /article\s*>\s*figure\s*>\s*\.card-reveal-trigger\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0/s);
    assert.match(
      css,
      /\.card-reveal-trigger:is\(:hover, :focus, :active\)\s*\{[^}]*background:\s*none[^}]*box-shadow:\s*none/s
    );
    assert.doesNotMatch(css, /article\s*>\s*aside\[aria-expanded=true\]\s*\{[^}]*overflow-y:\s*auto/s);
  });
});
