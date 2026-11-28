// AutoInit.register: how an extension package such as @expressivecss/extras
// adds its components to AutoInit. Registration cannot be undone, so this file
// runs in its own process and registers one test component, once.
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { Expressive, resetBody } from "./setup.js";

const core = await import("../dist/js/core.mjs");

class Widget extends core.Component {
  static key = "Expressive_Widget";
  static get defaults() {
    return { label: "plain", count: 1 };
  }
  destroy() {
    this.el.dataset.destroyed = "";
    super.destroy();
  }
}

Expressive.AutoInit.register("TestWidget", { component: Widget, selector: ".test-widget" });

/** Lets the MutationObserver callback run. */
const settle = () => new Promise((resolve) => setTimeout(resolve));

describe("AutoInit.register", () => {
  beforeEach(resetBody);

  test("AutoInit() starts a registered component with its markup options", (t) => {
    t.mock.method(console, "warn", () => {});
    document.body.innerHTML = `
      <div class="test-widget" id="a" data-test-widget-options='{"label":"fancy"}'></div>
      <div class="test-widget no-autoinit" id="b"></div>`;
    const a = document.getElementById("a");
    const b = document.getElementById("b");
    Expressive.AutoInit();
    const instance = Widget.getInstance(a);
    try {
      assert.ok(instance instanceof Widget);
      assert.equal(instance.options.label, "fancy");
      assert.equal(instance.options.count, 1);
      assert.equal(Widget.getInstance(b), undefined, "no-autoinit was not honoured");
    } finally {
      instance?.destroy();
    }
  });

  test("options passed to AutoInit under the registered name apply", () => {
    document.body.innerHTML = `<div class="test-widget"></div>`;
    const el = document.querySelector(".test-widget");
    Expressive.AutoInit(document.body, { TestWidget: { count: 3 } });
    const instance = Widget.getInstance(el);
    try {
      assert.equal(instance?.options.count, 3);
    } finally {
      instance?.destroy();
    }
  });

  test("watch mode starts added markup and destroys removed markup", async () => {
    const stop = Expressive.AutoInit(document.body, {}, { watch: true });
    const box = document.createElement("div");
    try {
      box.innerHTML = `<div class="test-widget"></div><div class="test-widget no-autoinit"></div>`;
      const [started, skipped] = box.children;
      document.body.append(box);
      await settle();
      assert.ok(Widget.getInstance(started), "added markup was not started");
      assert.equal(Widget.getInstance(skipped), undefined);
      box.remove();
      await settle();
      assert.equal(Widget.getInstance(started), undefined, "removed markup was not destroyed");
      assert.ok("destroyed" in started.dataset);
    } finally {
      stop();
      for (const el of box.querySelectorAll(".test-widget")) Widget.getInstance(el)?.destroy();
    }
  });

  test("rejects a name that is already taken, built in or registered", () => {
    assert.throws(() => Expressive.AutoInit.register("TestWidget", { component: Widget, selector: ".other" }), /TestWidget/);
    assert.throws(() => Expressive.AutoInit.register("Tooltip", { component: Widget, selector: ".other" }), /Tooltip/);
  });

  test("rejects a selector the browser cannot parse, leaving the table usable", () => {
    assert.throws(() => Expressive.AutoInit.register("BrokenWidget", { component: Widget, selector: "::[" }));
    document.body.innerHTML = `<div class="test-widget"></div>`;
    Expressive.AutoInit();
    const instance = Widget.getInstance(document.querySelector(".test-widget"));
    try {
      assert.ok(instance);
    } finally {
      instance?.destroy();
    }
  });
});
