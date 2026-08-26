// Material 3 expanding-card shared-container motion.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../dist/css/expressive.css", import.meta.url),
  "utf8",
);

describe("Expanding card CSS", () => {
  test("publishes the 500ms emphasized shared-container motion", () => {
    assert.match(css, /--md-comp-expanding-card-motion-duration:\s*500ms/);
    assert.match(
      css,
      /--md-comp-expanding-card-motion-easing:\s*cubic-bezier\(0\.2, 0, 0, 1\)/,
    );
  });

  test("clips a full-screen dialog to the measured card before expansion", () => {
    assert.match(
      css,
      /dialog\.expanding-card-dialog\s*\{[^}]*position:\s*fixed[^}]*inset:\s*0[^}]*height:\s*100dvh[^}]*clip-path:\s*inset\(/s,
    );
    assert.match(
      css,
      /dialog\.expanding-card-dialog\.expanded\s*\{[^}]*clip-path:\s*inset\(0 round var\(--md-comp-expanding-card-expanded-shape\)\)/s,
    );
  });

  test("grows the hero and fades detail content into the expanded surface", () => {
    assert.match(
      css,
      /dialog\.expanding-card-dialog\.expanded\s*>\s*\.expanding-card-hero\s*\{[^}]*height:\s*var\(--md-comp-expanding-card-expanded-media-height\)/s,
    );
    assert.match(
      css,
      /dialog\.expanding-card-dialog\.expanded\s*>\s*\.expanding-card-content\s*\{[^}]*opacity:\s*1[^}]*transform:\s*translateY\(0\)/s,
    );
  });

  test("gives the media trigger a state layer in the pointer states", () => {
    assert.match(
      css,
      /article\.expanding-card\s*>\s*figure\s*>\s*\.expanding-card-trigger\s*\{[^}]*background:\s*none/s,
    );
    for (const [state, token] of [["hover", "hover"], ["active", "pressed"], ["focus-visible", "focus"]]) {
      assert.match(
        css,
        new RegExp(`\\.expanding-card-trigger:${state}\\s*\\{[^}]*--md-comp-card-state-layer-color\\) calc\\(var\\(--md-comp-card-${token}-state-layer-opacity\\)`, "s"),
      );
    }
  });

  test("removes every transition when reduced motion is requested", () => {
    assert.match(
      css,
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?dialog\.expanding-card-dialog,[^{]+\{[^}]*transition:\s*none/s,
    );
  });
});
