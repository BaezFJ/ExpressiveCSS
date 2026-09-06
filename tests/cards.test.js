// Material 3 cards: variants, measurements, and interactive states.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../dist/css/expressive.css', import.meta.url), 'utf8');
const scss = readFileSync(new URL('../src/sass/components/_cards.scss', import.meta.url), 'utf8');
const cardsDocs = readFileSync(new URL('../docs/src/pages/cards.astro', import.meta.url), 'utf8');
const llm = readFileSync(new URL('../llm.md', import.meta.url), 'utf8');

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
    assert.match(css, /--md-comp-card-collection-gap:\s*8px/);
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
    assert.match(css, /article\s*>\s*\.actions\s*\{/);
    assert.doesNotMatch(css, /article\s*>[^\{]*nav[^\{]*\{/);
    assert.doesNotMatch(css, /article\.sticky\s*>\s*:is\(nav/);
    assert.doesNotMatch(css, /\.card-(?:tabs|panel)\b/);
  });

  test('repositions the same direct card slots in horizontal orientation', () => {
    assert.match(css, /--md-comp-card-horizontal-media-width:\s*40%/);
    assert.match(css, /--md-comp-card-horizontal-min-height:\s*240px/);
    assert.match(
      css,
      /article\.horizontal\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:[^}]*var\(--md-comp-card-horizontal-media-width\)/s
    );
    assert.match(
      css,
      /article\.horizontal\s*>\s*img,[^{]+article\.horizontal\s*>\s*figure\s*\{[^}]*grid-column:\s*1[^}]*grid-row:\s*1\s*\/\s*-1/s
    );
    assert.match(
      css,
      /article\.horizontal\s*>\s*\.actions\s*\{[^}]*grid-column:\s*2[^}]*grid-row:\s*4[^}]*align-self:\s*end[^}]*justify-content:\s*flex-end/s
    );
    assert.doesNotMatch(css, /article\.horizontal\s*>\s*div\s*\{/);
    assert.match(
      css,
      /article\.horizontal\s*>\s*\.primary-action\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:[^}]*var\(--md-comp-card-horizontal-media-width\)/s
    );
    assert.match(
      css,
      /article\.horizontal:is\(\.small, \.medium, \.large\):has\(> \.primary-action\)\s*\{[^}]*display:\s*block/s
    );
  });

  test('stacks horizontal cards at the compact breakpoint', () => {
    assert.match(
      css,
      /@media \(width < 600px\)\s*\{[\s\S]*?article\.horizontal,\s*article\.horizontal\.small,\s*article\.horizontal\.medium,\s*article\.horizontal\.large\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*height:\s*auto/s
    );
    assert.match(
      css,
      /@media \(width < 600px\)\s*\{[\s\S]*?article\.horizontal\s*>\s*\.primary-action,\s*article\.horizontal:is\(\.small, \.medium, \.large\)\s*>\s*\.primary-action\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*height:\s*auto/s
    );
  });

  test('sizes picture media inside fixed-height cards', () => {
    assert.match(
      css,
      /article\.small\s*>\s*picture img,[^{]+article\.large\s*>\s*picture img[^{]*\{[^}]*height:\s*100%/s
    );
  });

  test('documents variant-specific collection resting elevations', () => {
    for (const source of [scss, cardsDocs, llm]) {
      assert.match(source, /variant-specific resting(?:\s|\/)*elevation/i);
      assert.doesNotMatch(source, /(?:coplanar at rest|rests? on the same plane)/i);
    }
  });

  test('lays out card collections as grids, lists, mosaics, staggered flows, or carousels', () => {
    assert.match(
      css,
      /:where\(\.card-collection\)\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*var\(--md-comp-card-collection-grid-template-columns\)[^}]*gap:\s*var\(--md-comp-card-collection-gap\)/s
    );
    assert.doesNotMatch(
      css,
      /:where\(\.card-collection article\)[^{]*\{[^}]*box-shadow/s
    );
    assert.match(
      css,
      /\.card-collection\.list\s*\{[^}]*grid-template-columns:[^}]*margin:\s*0/s
    );
    assert.match(css, /\.card-collection\.staggered/);
    assert.match(css, /\.card-collection\.mosaic/);
    assert.match(
      css,
      /\.card-collection\.carousel\s*\{[^}]*--md-comp-carousel-gap:\s*var\(--md-comp-card-collection-gap\)/s
    );
    assert.match(
      css,
      /\.card-collection\.carousel\s*\{[^}]*--md-comp-carousel-uncontained-item-width:\s*var\(\s*--md-comp-card-collection-carousel-card-width\s*\)/s
    );
    assert.doesNotMatch(
      css,
      /\.card-collection-(?:list|staggered|mosaic|carousel)\b/
    );
  });

  test('applies interaction states only through a primary action', () => {
    assert.match(css, /:where\(article\)\s*>\s*\.primary-action\s*\{/);
    assert.match(css, /:has\(>\s*\.primary-action:hover\)::after/);
    assert.match(css, /:has\(>\s*\.primary-action:focus-visible\)::after/);
    assert.match(css, /:has\(>\s*\.primary-action:active\)::after/);
    assert.doesNotMatch(css, /:where\(article\):hover\s*\{/);
  });

  test('uses M3 state-layer and focus-indicator values', () => {
    assert.match(css, /--md-comp-card-hover-state-layer-opacity:\s*var\(--md-sys-state-hover-state-layer-opacity\)/);
    assert.match(css, /--md-comp-card-focus-state-layer-opacity:\s*var\(--md-sys-state-focus-state-layer-opacity\)/);
    assert.match(css, /--md-comp-card-pressed-state-layer-opacity:\s*var\(--md-sys-state-pressed-state-layer-opacity\)/);
    assert.match(css, /--md-comp-card-dragged-state-layer-opacity:\s*var\(--md-sys-state-dragged-state-layer-opacity\)/);
    assert.match(css, /--md-comp-card-focus-indicator-thickness:\s*3px/);
    assert.match(css, /--md-comp-card-focus-indicator-offset:\s*2px/);
    assert.match(
      css,
      /--md-comp-card-focus-indicator-color:\s*var\(--md-sys-color-secondary\)/
    );
  });

  test('uses each variant’s specified hover and dragged elevation', () => {
    assert.match(
      css,
      /:not\(\.filled, \.outlined, \.border\):has\(> \.primary-action:hover\)\s*\{[^}]*box-shadow:\s*0 4px 5px/s
    );
    assert.match(
      css,
      /:is\(\.filled, \.outlined, \.border\):has\(> \.primary-action:hover\)\s*\{[^}]*box-shadow:\s*0 2px 2px/s
    );
    assert.match(
      css,
      /:not\(\.filled, \.outlined, \.border\):is\(\.dragged, \.picked-up\)\s*\{[^}]*z-index:\s*4[^}]*box-shadow:\s*0 16px 24px/s
    );
    assert.match(
      css,
      /:is\(\.filled, \.outlined, \.border\):is\(\.dragged, \.picked-up\)\s*\{[^}]*box-shadow:\s*0 8px 17px/s
    );
  });

  test('keeps level-zero bases overridable by hover and dragged states', () => {
    assert.doesNotMatch(
      css,
      /:where\(article\)\.filled\s*\{[^}]*box-shadow:\s*none\s*!important/s
    );
    assert.doesNotMatch(
      css,
      /:where\(article\):is\(\.outlined, \.border\)\s*\{[^}]*box-shadow:\s*none\s*!important/s
    );
  });

  test('uses each variant’s specified pressed elevation even while hovered', () => {
    assert.match(
      css,
      /:not\(\.filled, \.outlined, \.border\):has\(> \.primary-action:active\)\s*\{[^}]*box-shadow:\s*0 2px 2px/s
    );
    assert.match(
      css,
      /:is\(\.filled, \.outlined, \.border\):has\(> \.primary-action:active\)\s*\{[^}]*box-shadow:\s*none\s*!important/s
    );
  });

  test('keeps disabled elevation and container color variant-specific', () => {
    assert.match(
      css,
      /:not\(\.filled, \.outlined, \.border\):is\(\.disabled, \[aria-disabled=true\]\)[^{]*\{[^}]*box-shadow:\s*0 2px 2px/s
    );
    assert.match(
      css,
      /:not\(\.filled, \.outlined, \.border\):is\(\.disabled, \[aria-disabled=true\]\)[^{]*\{[^}]*var\(--md-sys-color-surface\) var\(--md-comp-card-disabled-container-opacity\)/s
    );
    assert.match(
      css,
      /\.filled:is\(\.disabled, \[aria-disabled=true\]\)[^{]*\{[^}]*box-shadow:\s*none\s*!important[^}]*var\(--md-sys-color-surface-variant\) var\(--md-comp-card-disabled-container-opacity\)/s
    );
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
      /article\.card-reveal-initialized\s*>\s*aside\s*\{[^}]*position:\s*relative[^}]*height:\s*0[^}]*overflow:\s*clip/s
    );
    assert.match(
      css,
      /article\.card-reveal-initialized\s*>\s*aside\.open\s*\{[^}]*height:\s*auto[^}]*opacity:\s*1/s
    );
    assert.match(css, /article\s*>\s*figure\s*>\s*\.card-reveal-trigger\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0/s);
    // The trigger carries its own state layer: the card's ::after keys on
    // `> .primary-action`, which this is not. It reads the card's own
    // opacities, so a per-card override still reaches it.
    for (const [state, token] of [["hover", "hover"], ["active", "pressed"], ["focus-visible", "focus"]]) {
      assert.match(
        css,
        new RegExp(`\\.card-reveal-trigger:${state}\\s*\\{[^}]*--md-comp-card-state-layer-color\\) calc\\(var\\(--md-comp-card-${token}-state-layer-opacity\\)`, "s")
      );
    }
    assert.doesNotMatch(css, /article\s*>\s*aside\[aria-expanded/);
    assert.doesNotMatch(
      css,
      /(?:^|,)\s*article\s*>\s*aside\s*\{[^}]*height:\s*0/s
    );
    assert.doesNotMatch(css, /article\.card-reveal-initialized\s*>\s*aside\.open\s*\{[^}]*overflow-y:\s*auto/s);
    assert.doesNotMatch(
      css,
      /@supports not \(interpolate-size: allow-keywords\)[\s\S]*?card-reveal-fallback-height|@supports not \(interpolate-size: allow-keywords\)[\s\S]*?max-height:\s*320px/
    );
    assert.match(
      css,
      /@supports not \(interpolate-size: allow-keywords\)\s*\{[\s\S]*?article\.card-reveal-initialized\s*>\s*aside\s*\{[^}]*display:\s*none[^}]*transition:\s*none[\s\S]*?article\.card-reveal-initialized\s*>\s*aside\.open\s*\{[^}]*display:\s*block/s
    );
  });

  test('disables card state and reveal transitions for reduced motion', () => {
    assert.match(
      css,
      /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*:where\(article\),\s*:where\(article\)::after,\s*article\s*>\s*figure\s*>\s*\.card-reveal-trigger,\s*article\.card-reveal-initialized\s*>\s*aside\s*\{[^}]*transition:\s*none/s
    );
  });
});
