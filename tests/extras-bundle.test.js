// The @expressivecss/extras bundles load after core and reuse it: they import
// `@expressivecss/expressive/core` (ESM) or read `Expressive.core` (IIFE) and
// never carry a copy of Component, Utils or AutoInit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { JSDOM } from "jsdom";

import { Expressive, ExpressiveExtras, resetBody } from "./setup.js";
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

const CHARTS = ["line", "column", "bar", "pie", "heatmap", "radar", "radial", "mixed", "scatter", "funnel", "sankey", "treemap"];
const CHART_CLASSES = CHARTS.map((name) => `${name[0].toUpperCase()}${name.slice(1)}Chart`);

// The components that moved out of core: no rule in core's sheet starts at
// their root any more, and the extras sheet has those rules. A core rule may
// still name one in passing, as the busy button's exclusion names .mega-menu.
const MOVED_ROOTS = [
  "aura", "message-bubble", "stats", "description-list", "kpi", "countdown", "timeline", "calendar-year",
  "org-chart", "popover", "skeleton", "empty-state", "marquee", "rating", "color-swatches", "stepper",
  "mega-menu", "tree", ...CHARTS.map((name) => `${name}-chart`),
  "back-to-top", "message-scroller", "pull-to-refresh", "list.swipeable", "show-more", "loading-overlay", "confetti",
  "particles", "lightboxed", "map", "command-palette", "menubar", "scrollspy", "table-of-contents", "tour", "image-compare",
];
const PAGE_FOOTER = "footer:not(.status-bar, :has(> .navigation-bar:only-child))";

test("moved components are styled by extras.css, not expressive.css", () => {
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

test("the charts are exported by extras, not by core", async () => {
  const coreModular = await import("../dist/js/modular.mjs");
  const coreApi = await import("../dist/js/core.mjs");
  const extrasModular = await import("../extras/dist/js/modular.mjs");
  for (const name of CHART_CLASSES) {
    assert.ok(!(name in Expressive) && !(name in coreModular) && !(name in coreApi), `core still exports ${name}`);
    assert.equal(typeof ExpressiveExtras[name], "function", `extras does not export ${name}`);
    assert.equal(extrasModular[name], ExpressiveExtras[name]);
  }
  assert.doesNotMatch(read("dist/css/expressive.css"), /\.(?:line|column|bar|pie|heatmap|radar|radial|mixed|scatter|funnel|sankey|treemap)-chart(?![\w-])/,
    "expressive.css names a chart class");
});

// The interactive components and behaviors that moved in the same release.
const MOVED_INTERACTIVE = [
  "BackToTop", "MessageScroller", "PullToRefresh", "SwipeActions", "ShowMore", "HoverCard", "LoadingOverlay", "Confetti",
  "Particles", "Lightbox", "MapView", "CommandPalette", "Menubar", "ScrollSpy", "Tour", "ImageCompare",
];

test("the moved interactive components and behaviors are exported by extras, not by core", async () => {
  const coreModular = await import("../dist/js/modular.mjs");
  const coreApi = await import("../dist/js/core.mjs");
  const extrasModular = await import("../extras/dist/js/modular.mjs");
  for (const name of MOVED_INTERACTIVE) {
    assert.ok(!(name in Expressive) && !(name in coreModular) && !(name in coreApi), `core still exports ${name}`);
    assert.equal(typeof ExpressiveExtras[name], "function", `extras does not export ${name}`);
    assert.equal(extrasModular[name], ExpressiveExtras[name]);
  }
  // Sortable stays in core: the core Lists page documents it.
  assert.equal(typeof Expressive.Sortable, "function");
});

test("extras imports public core components from the modular entry, sharing their instances", () => {
  assert.match(esm, /from\s*["']@expressivecss\/expressive\/modular["']/);
  assert.doesNotMatch(esm, /class Menu\b/, "extras bundles a copy of Menu");
  try {
    document.body.innerHTML = `<nav class="menubar"><button class="menu-trigger" data-target="file-menu">File</button></nav>
      <ul id="file-menu" class="menu"><li><button>New</button></li></ul>`;
    const bar = ExpressiveExtras.Menubar.init(document.querySelector(".menubar"));
    try {
      assert.ok(Expressive.Menu.getInstance(document.querySelector(".menu-trigger")) instanceof Expressive.Menu,
        "the Menubar's menu is not core's Menu");
    } finally {
      bar.destroy();
    }
  } finally {
    resetBody();
  }
});

test("AutoInit started through core starts the extras charts", () => {
  try {
    document.body.innerHTML = CHARTS.map((name) => `<figure class="${name}-chart"><figcaption>${name}</figcaption><table>
      <thead><tr><th>Name</th><th>A</th><th>B</th></tr></thead>
      <tbody><tr><th>One</th><td>1</td><td>2</td></tr><tr><th>Two</th><td>3</td><td>4</td></tr></tbody></table></figure>`).join("");
    Expressive.AutoInit();
    for (const [i, name] of CHART_CLASSES.entries()) {
      const el = document.querySelector(`.${CHARTS[i]}-chart`);
      assert.ok(ExpressiveExtras[name].getInstance(el), `${name} did not start`);
      ExpressiveExtras[name].getInstance(el).destroy();
    }
  } finally {
    resetBody();
  }
});
