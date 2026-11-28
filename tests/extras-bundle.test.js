// The @expressivecss/extras bundles load after core and reuse it: they import
// `@expressivecss/expressive/core` (ESM) or read `Expressive.core` (IIFE) and
// never carry a copy of Component, Utils or AutoInit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { JSDOM } from "jsdom";

import { ExpressiveExtras } from "./setup.js";
import { parseRules } from "./css.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const { version } = JSON.parse(read("extras/package.json"));
const esm = readdirSync(new URL("../extras/dist/js/", import.meta.url), { recursive: true })
  .filter((file) => file.endsWith(".mjs"))
  .map((file) => read(`extras/dist/js/${file.replaceAll("\\", "/")}`))
  .join("\n");

test("the ESM bundle loads after core and reports the extras version", async () => {
  assert.equal(ExpressiveExtras.version, version);
  const modular = await import("../extras/dist/js/modular.mjs");
  assert.equal(modular.version, version);
});

test("the ESM bundle imports core from the package subpath instead of bundling it", () => {
  assert.match(esm, /from\s*["']@expressivecss\/expressive\/core["']/);
  assert.doesNotMatch(esm, /class Component\b|class Utils\b|function AutoInit\b/);
});

for (const file of ["extras.js", "extras.min.js"]) {
  test(`${file} defines ExpressiveExtras after expressive.js and reads Expressive.core`, () => {
    const iife = read(`extras/dist/js/${file}`);
    assert.doesNotMatch(iife, /class Component\b|class Utils\b|function AutoInit\b/);
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true,
    });
    try {
      assert.throws(() => dom.window.eval(iife), /expressive\.js/, "loading extras first must say what is missing");
      dom.window.eval(read("dist/js/expressive.js"));
      dom.window.eval(iife);
      assert.equal(dom.window.ExpressiveExtras.version, version);
    } finally {
      dom.window.close();
    }
  });
}

test("the stylesheets do not re-emit core tokens, fonts or base styles", () => {
  for (const file of ["extras.css", "extras.min.css"]) {
    const css = read(`extras/dist/css/${file}`);
    assert.doesNotMatch(css, /--md-sys-[\w-]+\s*:|@font-face|\bhtml\s*\{/, file);
  }
});

// The CSS-only components that moved out of core: no rule in core's sheet
// starts at their root any more, and the extras sheet has those rules. A core
// rule may still name one in passing, as the busy button's exclusion names
// .mega-menu.
const MOVED_ROOTS = [
  "aura", "message-bubble", "stats", "description-list", "kpi", "countdown", "timeline", "calendar-year",
  "org-chart", "popover", "skeleton", "empty-state", "marquee", "rating", "color-swatches", "stepper",
  "mega-menu", "tree",
];
const PAGE_FOOTER = "footer:not(.status-bar, :has(> .navigation-bar:only-child))";

test("moved CSS-only components are styled by extras.css, not expressive.css", () => {
  const roots = (file) => parseRules(read(file).replace(/\/\*[\s\S]*?\*\//g, "")).flatMap((rule) => rule.selectors);
  const core = roots("dist/css/expressive.css");
  const extras = roots("extras/dist/css/extras.css");
  for (const name of MOVED_ROOTS) {
    const root = new RegExp(`^[a-z]*\\.${name}(?![\\w-])`);
    assert.ok(!core.some((selector) => root.test(selector)), `expressive.css still styles .${name}`);
    assert.ok(extras.some((selector) => root.test(selector)), `extras.css does not style .${name}`);
  }
  assert.ok(!core.some((selector) => selector.startsWith(PAGE_FOOTER)), "expressive.css still styles the page footer");
  assert.ok(extras.some((selector) => selector.startsWith(PAGE_FOOTER)), "extras.css does not style the page footer");
});
