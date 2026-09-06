import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { Expressive, resetBody } from "./setup.js";
import { AUTO_INIT_FIXTURES } from "./fixtures.js";

describe("AutoInit", () => {
  beforeEach(resetBody);

  for (const { name, selector, html } of AUTO_INIT_FIXTURES) {
    test(`constructs ${name} for "${selector}"`, () => {
      document.body.innerHTML = html;
      const el = document.querySelector(selector);
      assert.ok(el, `fixture for ${name} has no element matching ${selector}`);

      Expressive.AutoInit();

      const instance = Expressive[name].getInstance(el);
      assert.ok(
        instance,
        `${name}.getInstance() returned nothing after AutoInit()`,
      );
      assert.ok(
        instance instanceof Expressive[name],
        `instance for ${selector} is ${instance?.constructor?.name}, expected ${name}`,
      );
      assert.equal(
        instance.el,
        el,
        `${name} instance is bound to the wrong element`,
      );
    });
  }

  test("every fixture selector is covered exactly once", () => {
    const selectors = AUTO_INIT_FIXTURES.map((f) => f.selector);
    assert.equal(
      new Set(selectors).size,
      selectors.length,
      "duplicate selector in fixtures",
    );
    assert.equal(AUTO_INIT_FIXTURES.length, 18);
  });

  test("skips elements marked .no-autoinit", () => {
    document.body.innerHTML = `
      <a class="button tooltipped no-autoinit" data-tooltip="Hi">Hover</a>
      <a class="button tooltipped" data-tooltip="Hi">Hover</a>`;
    const [optedOut, normal] = document.querySelectorAll(".tooltipped");

    Expressive.AutoInit();

    assert.equal(Expressive.Tooltip.getInstance(optedOut), undefined);
    assert.ok(Expressive.Tooltip.getInstance(normal));
  });

  test("AutoInit ignores an article reveal without a usable trigger", () => {
    document.body.innerHTML = `
      <article><aside id="orphaned-details"><p>reveal</p></aside></article>
      <article><button class="card-reveal-trigger">Missing type</button><aside id="missing-type-details"><p>reveal</p></aside></article>
      <article><button type="submit" class="card-reveal-trigger">Submit</button><aside id="submit-details"><p>reveal</p></aside></article>
      <article><button type="button" class="card-reveal-trigger">Missing panel ID</button><aside><p>reveal</p></aside></article>
      <article><button type="button" class="card-reveal-trigger" disabled>Disabled</button><aside id="disabled-details"><p>reveal</p></aside></article>
      <article><button type="button" class="card-reveal-trigger" aria-disabled="true">ARIA disabled</button><aside id="aria-disabled-details"><p>reveal</p></aside></article>
      <article><button type="button" class="card-reveal-trigger">Multiple panels</button><aside id="first-details"><p>first</p></aside><aside id="second-details"><p>second</p></aside></article>`;
    const cards = [...document.querySelectorAll("article")];

    Expressive.AutoInit();

    cards.forEach((el) => {
      assert.equal(Expressive.Cards.getInstance(el), undefined);
      assert.notEqual(el.querySelector("aside").inert, true);
    });
  });

  test("AutoInit assigns nested triggers to their closest card", () => {
    document.body.innerHTML = `
      <article id="outer-card">
        <div>
          <article id="inner-card">
            <button type="button" class="card-reveal-trigger" aria-label="Toggle inner details" aria-controls="inner-details">Inner</button>
            <aside id="inner-details"><button type="button">Inner action</button></aside>
          </article>
        </div>
        <aside id="outer-details">Outer details</aside>
      </article>`;
    const outer = document.getElementById("outer-card");
    const inner = document.getElementById("inner-card");
    const trigger = inner.querySelector(".card-reveal-trigger");
    const innerPanel = document.getElementById("inner-details");
    const outerPanel = document.getElementById("outer-details");

    Expressive.AutoInit();

    assert.equal(Expressive.Cards.getInstance(outer), undefined);
    const innerInstance = Expressive.Cards.getInstance(inner);
    assert.ok(innerInstance);
    trigger.click();
    assert.equal(innerInstance.isOpen, true);
    assert.equal(innerPanel.classList.contains("open"), true);
    assert.equal(outerPanel.classList.contains("open"), false);
    assert.notEqual(outerPanel.inert, true);

    innerPanel.dispatchEvent(
      new window.KeyboardEvent("keydown", { bubbles: true, key: "Escape" }),
    );
    assert.equal(innerInstance.isOpen, false);
  });

  test("nested card Escape closes only the closest card", () => {
    document.body.innerHTML = `
      <article id="outer-card">
        <button type="button" class="card-reveal-trigger" aria-label="Toggle outer details" aria-controls="outer-details">Outer</button>
        <div>
          <article id="inner-card">
            <button type="button" class="card-reveal-trigger" aria-label="Toggle inner details" aria-controls="inner-details">Inner</button>
            <aside id="inner-details"><button type="button">Inner action</button></aside>
          </article>
        </div>
        <aside id="outer-details">Outer details</aside>
      </article>`;
    const outer = document.getElementById("outer-card");
    const inner = document.getElementById("inner-card");
    const outerTrigger = outer.querySelector(":scope > .card-reveal-trigger");
    const innerTrigger = inner.querySelector(".card-reveal-trigger");
    const innerPanel = document.getElementById("inner-details");

    Expressive.AutoInit();
    const outerInstance = Expressive.Cards.getInstance(outer);
    const innerInstance = Expressive.Cards.getInstance(inner);

    outerTrigger.click();
    innerTrigger.click();
    assert.equal(outerInstance.isOpen, true);
    assert.equal(innerInstance.isOpen, true);

    innerPanel.dispatchEvent(
      new window.KeyboardEvent("keydown", { bubbles: true, key: "Escape" }),
    );

    assert.equal(innerInstance.isOpen, false);
    assert.equal(outerInstance.isOpen, true);
  });

  test(".no-autoinit is honoured on a card article", () => {
    document.body.innerHTML = `
      <article class="no-autoinit"><button type="button" class="card-reveal-trigger" aria-label="Toggle details" aria-controls="opted-out-details">T</button><aside id="opted-out-details"><p>b</p></aside></article>
      <article><button type="button" class="card-reveal-trigger" aria-label="Toggle details" aria-controls="normal-details">T</button><aside id="normal-details"><p>b</p></aside></article>`;
    const [optedOut, normal] = document.querySelectorAll("article");

    Expressive.AutoInit();

    assert.equal(Expressive.Cards.getInstance(optedOut), undefined);
    assert.ok(
      Expressive.Cards.getInstance(normal),
      "the opted-in card was not initialized",
    );
  });

  test("AutoInit starts Cards on the semantic article markup the docs use", () => {
    document.body.innerHTML = `<article><figure><button type="button" class="card-reveal-trigger" aria-label="Toggle details" aria-controls="autoinit-details">T</button></figure><aside id="autoinit-details"><p>reveal</p></aside></article>`;
    const el = document.querySelector("article");

    Expressive.AutoInit();

    assert.ok(
      Expressive.Cards.getInstance(el),
      "AutoInit did not construct Cards for <article><aside>",
    );
  });

  test("only touches the context it is given", () => {
    document.body.innerHTML = `
      <div id="inside"><a class="button tooltipped" data-tooltip="Hi">Hover</a></div>
      <div id="outside"><a class="button tooltipped" data-tooltip="Hi">Hover</a></div>`;

    Expressive.AutoInit(document.getElementById("inside"));

    assert.ok(
      Expressive.Tooltip.getInstance(
        document.querySelector("#inside .tooltipped"),
      ),
    );
    assert.equal(
      Expressive.Tooltip.getInstance(
        document.querySelector("#outside .tooltipped"),
      ),
      undefined,
    );
  });

  test("re-initializing an element replaces the instance instead of stacking", () => {
    document.body.innerHTML = `<a class="button tooltipped" data-tooltip="Hi">Hover</a>`;
    const el = document.querySelector(".tooltipped");

    Expressive.AutoInit();
    const first = Expressive.Tooltip.getInstance(el);
    Expressive.AutoInit();
    const second = Expressive.Tooltip.getInstance(el);

    assert.ok(first && second);
    assert.notEqual(
      first,
      second,
      "second AutoInit() did not create a new instance",
    );
    assert.equal(second.el, el);
  });
});
