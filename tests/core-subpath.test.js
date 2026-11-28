// The `@expressivecss/expressive/core` subpath and the IIFE's `Expressive.core`:
// the extension API @expressivecss/extras builds on. Both must hand out the
// same classes as the main bundle, or an extension's components would extend a
// second copy of Component and register with a second AutoInit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

import { Expressive } from "./setup.js";

const core = await import("../dist/js/core.mjs");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("the core subpath is a package export with types", () => {
  assert.deepEqual(pkg.exports["./core"], { types: "./dist/types/core.d.ts", import: "./dist/js/core.mjs" });
  assert.ok(readFileSync(new URL("../dist/types/core.d.ts", import.meta.url), "utf8").includes("Component"));
});

test("the core subpath shares the main bundle's module instances", () => {
  assert.ok(Expressive.Tabs.prototype instanceof core.Component);
  assert.equal(core.AutoInit, Expressive.AutoInit);
  assert.equal(typeof core.Utils.eventTarget, "function");
});

test("the core subpath exports only what extension components use", () => {
  assert.deepEqual(Object.keys(core).sort(), [
    "AutoInit", "Component", "Utils", "afterAnyFormReset", "afterFormReset", "controllerFor",
    "deepActiveElement", "defined", "formAssociated", "formEventScope", "isRtl", "logicalKey",
    "numberValue", "restoreAttribute", "setActiveDescendant", "svgNode", "toggleIdRef",
    "unwrapControl", "wrapInControl",
  ]);
});

test("the core subpath stays out of the main and modular entries", async () => {
  const modular = await import("../dist/js/modular.mjs");
  assert.equal("core" in modular, false);
  assert.equal("core" in Expressive, false);
});

test("the IIFE exposes the same namespace as Expressive.core", () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true,
  });
  const iife = readFileSync(new URL("../dist/js/expressive.js", import.meta.url), "utf8");
  // Re-exporting index.ts must not let the bundler drop its import-time Init() calls.
  for (const behavior of ["Forms", "Dialogs", "Lists", "DataTables"]) assert.match(iife, new RegExp(`${behavior}\\.Init\\(\\);`));
  try {
    dom.window.eval(iife);
    const global = dom.window.Expressive;
    assert.deepEqual(Object.keys(global.core).sort(), Object.keys(core).sort());
    assert.ok(global.Tabs.prototype instanceof global.core.Component);
    assert.equal(global.core.AutoInit, global.AutoInit);
  } finally {
    dom.window.close();
  }
});
