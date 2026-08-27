// M3 Expressive vertical menu (md.comp.menus, not baseline md.comp.menu):
// 16dp surface, 4dp items, 12dp end items, tertiary selected.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../dist/css/expressive.css", import.meta.url),
  "utf8",
);
const ELEVATIONS = readFileSync(
  new URL("../src/sass/abstracts/_elevation.scss", import.meta.url),
  "utf8",
);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

describe("Menu", () => {
  test("standard mapping is surface-container-low with tertiary selected", () => {
    assert.match(
      css,
      /--md-comp-menu-container-color:\s*var\(--md-sys-color-surface-container-low\)/,
    );
    assert.match(
      css,
      /--md-comp-menu-item-selected-container-color:\s*var\(\s*--md-sys-color-tertiary-container\s*\)/,
    );
    assert.match(
      css,
      /--md-comp-menu-item-selected-label-text-color:\s*var\(\s*--md-sys-color-on-tertiary-container\s*\)/,
    );
  });

  test("uses the expressive menu shape and 44dp item geometry", () => {
    assert.match(css, /--md-comp-menu-container-shape:\s*16px/);
    assert.match(css, /--md-comp-menu-group-shape:\s*8px/);
    assert.match(
      css,
      /--md-comp-menu-container-inactive-shape:\s*var\(--md-comp-menu-group-shape\)/,
    );
    assert.match(css, /--md-comp-menu-group-padding:\s*2px/);
    assert.match(css, /--md-comp-menu-gap:\s*2px/);
    assert.match(css, /--md-comp-menu-item-container-shape:\s*4px/);
    assert.match(css, /--md-comp-menu-item-edge-shape:\s*12px/);
    assert.match(css, /--md-comp-menu-item-selected-container-shape:\s*12px/);
    assert.match(css, /--md-comp-menu-item-container-height:\s*44px/);
    assert.match(css, /--md-comp-menu-item-leading-space:\s*16px/);
    assert.match(css, /--md-comp-menu-item-trailing-space:\s*16px/);
    assert.match(css, /--md-comp-menu-item-between-space:\s*12px/);
  });

  test("aligns link and button labels to the start edge", () => {
    const item =
      css.match(
        /menu\[id\] > li > a,\s*menu\[id\] > li > button,[^{]*\{([^}]*)\}/s,
      )?.[1] ?? "";

    assert.match(item, /justify-content:\s*flex-start/);
    assert.match(item, /text-align:\s*start/);
  });

  test("end items round to 12dp without inheriting the container radius", () => {
    const first = css.match(
      /menu\[id\] > li:not\([^)]*\):first-child\s*\{[^}]*\}/,
    )[0];
    assert.match(first, /--md-comp-menu-item-edge-shape/);
    assert.doesNotMatch(first, /--md-comp-menu-container-shape/);
  });

  test("state layers are hover 8%, focus and pressed 10%", () => {
    // md.comp.menus.standard.menu-item.{hovered,focused,pressed}.state-layer
    assert.doesNotMatch(css.match(/menu\[id\][\s\S]*?\.menu-trigger/)[0], /\s12%,/);
  });

  test("icons are 20dp", () => {
    assert.match(css, /--md-comp-menu-item-icon-size:\s*20px/);
  });

  test("vibrant uses tertiary-container", () => {
    // `.vibrant` opens a selector list - the class, the attribute on the menu
    // itself, and a menu inside a [vibrant] subtree - so match past the rest
    // of it rather than requiring the brace to follow the class.
    assert.match(
      css,
      /\.vibrant[^{]*\{[^}]*--md-comp-menu-container-color:\s*var\(--md-sys-color-tertiary-container\)/s,
    );
  });

  test("dividers do not span the container", () => {
    assert.match(
      css,
      /menu\[id\][^}]*li\.divider[\s\S]*?width:\s*calc\(100% - 8px\)/,
    );
  });

  test("caps the surface at 280dp and takes elevation from the shared map", () => {
    assert.match(css, /max-width:\s*280px/);
    // M3 puts the menu container at level 2. Sourcing it from $elevations
    // rather than a hand-copied shadow is what keeps it from drifting.
    const level2 = ELEVATIONS.match(/"2":\s*\(([^)]*)\)/)[1].trim();
    const menu = css.match(/menu\[id\]\s*\{[^}]*\}/)[0];
    assert.match(menu, new RegExp("box-shadow:\\s*" + escapeRe(level2)));
  });

  test("supports supporting text, badges, and reduced motion", () => {
    assert.match(css, /\.menu-item-text/);
    assert.match(
      css,
      /\.supporting-text[^}]*font-size:\s*var\(--md-sys-typescale-body-small-font-size\)/s,
    );
    assert.match(css, /> \.badge[^}]*margin-inline-start:\s*auto/s);
    assert.match(
      css,
      /prefers-reduced-motion:\s*reduce[\s\S]*menu\[id\][^{]*\{[^}]*transition:\s*none !important/,
    );
  });

  test("styles checked choices and keeps an open trigger pressed", () => {
    // aria-checked rides the same :is() as .selected, and that rule has to
    // outrank the first/last-child edge shape - hence the :not(.divider).
    assert.match(
      css,
      /menu\[id\] > li:is\(\.selected, \[aria-selected=true\], \[aria-checked=true\]\):not\(\.divider\)\s*\{[^}]*border-radius:\s*var\(--md-comp-menu-item-selected-container-shape\)/,
    );
    assert.match(
      css,
      /\.menu-trigger\[aria-expanded=true\][^{]*\{[^}]*background-image:\s*linear-gradient/,
    );
  });

  test("supports standard and grouped menu layouts", () => {
    assert.match(
      css,
      /menu\[id\]\.grouped\s*\{[^}]*padding:\s*0;[^}]*background-color:\s*transparent;[^}]*box-shadow:\s*none;[^}]*filter:\s*drop-shadow/s,
    );
    assert.match(
      css,
      /menu\[id\]\.grouped > li:not\([^}]+background-color:\s*var\(--md-comp-menu-container-color\)/s,
    );
    assert.match(css, /menu\[id\]\.grouped > li\.gap \+ li:not\(/);
    // md.comp.menus.group.shape is corner.small - a group is its own surface
    // and does not take the container's corner.large radius.
    assert.match(
      css,
      /menu\[id\]\.grouped > li[^{]*first-child[^{]*\{[^}]*border-start-start-radius:\s*var\(--md-comp-menu-group-shape\)/s,
    );
    assert.match(css, /menu\[id\]\.grouped > li:not\([^}]+:has\(\+ li\.gap\)/s);
  });
});
