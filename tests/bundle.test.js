// Guards the shipped surface a <script> tag consumer sees: the IIFE bundle's
// global name and the version it reports. The docs site calls
// Expressive.AutoInit() on that global, so a rename here breaks the page
// silently otherwise.
//
// This file builds its own jsdom (with runScripts enabled) rather than using
// setup.js, because it needs to *evaluate* the IIFE rather than import the ESM.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const iife = readFileSync(
  new URL("../dist/js/expressive.js", import.meta.url),
  "utf8",
);

// index.ts hand-maintains its `version` export to track package.json. Asserting
// against the manifest rather than a literal catches the two drifting apart,
// which a hardcoded string cannot -- it only catches "someone forgot to edit me".
const { version: pkgVersion } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

describe("IIFE bundle", () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  dom.window.eval(iife);

  test("exposes the Expressive global, not M", () => {
    assert.equal(typeof dom.window.Expressive, "object");
    assert.equal(
      dom.window.M,
      undefined,
      "the old Materialize global is still present",
    );
  });

  test("the global carries AutoInit and the components", () => {
    assert.equal(typeof dom.window.Expressive.AutoInit, "function");
    for (const name of [
      "Sidenav",
      "Tabs",
      "Snackbar",
      "Menu",
      "FormSelect",
      "ExpandingCard",
      "Dialogs",
    ]) {
      assert.equal(
        typeof dom.window.Expressive[name],
        "function",
        `${name} missing from global`,
      );
    }
    assert.equal(
      dom.window.Expressive.Collapsible,
      undefined,
      "retired Collapsible is still on the global",
    );
    assert.equal(
      dom.window.Expressive.Pushpin,
      undefined,
      "retired Pushpin is still on the global",
    );
    assert.equal(
      dom.window.Expressive.Toast,
      undefined,
      "retired Toast is still on the global",
    );
    assert.equal(
      dom.window.Expressive.Dropdown,
      undefined,
      "retired Dropdown is still on the global",
    );
    assert.equal(
      dom.window.Expressive.TapTarget,
      undefined,
      "retired TapTarget is still on the global",
    );
  });

  test("reports ExpressiveCSS own version, matching package.json", () => {
    assert.equal(dom.window.Expressive.version, pkgVersion);
  });
});
