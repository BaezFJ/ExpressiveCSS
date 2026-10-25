import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { Expressive, resetBody } from "./setup.js";
import { AUTO_INIT_FIXTURES } from "./fixtures.js";

test("component init returns an empty array for empty element collections", () => {
  const parent = document.createElement("div");
  const names = [...AUTO_INIT_FIXTURES.map(({ name }) => name), "Slider", "CharacterCounter"];
  for (const name of names) {
    for (const elements of [parent.querySelectorAll("*"), parent.children]) {
      const instances = Expressive[name].init(elements);
      assert.deepEqual(instances, [], `${name} with ${elements.constructor.name}`);
      instances.forEach(() => assert.fail("an empty collection must not construct an instance"));
    }
  }
});

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
    assert.equal(AUTO_INIT_FIXTURES.length, 38);
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

  test("re-initializing a scoped date range skips its generated end input", () => {
    document.body.innerHTML = '<div id="scope"><div><input id="start" class="date-picker"></div></div><input id="outside" class="date-picker">';
    const scope = document.getElementById("scope");
    const start = document.getElementById("start");
    const options = { Datepicker: { isDateRange: true, format: "yyyy-mm-dd" } };
    let first;
    let oldEnd;
    try {
      Expressive.AutoInit(scope, options);
      first = Expressive.Datepicker.getInstance(start);
      oldEnd = first.endDateEl;
      Expressive.AutoInit(scope, options);
      const current = Expressive.Datepicker.getInstance(start);
      assert.notEqual(current, first);
      assert.equal(oldEnd.isConnected, false);
      assert.equal(Expressive.Datepicker.getInstance(oldEnd), undefined);
      assert.equal(Expressive.Datepicker.getInstance(current.endDateEl), undefined);
      assert.equal(Expressive.Datepicker.getInstance(document.getElementById("outside")), undefined);
      assert.equal(scope.querySelectorAll("input.date-picker").length, 2);
      assert.equal(scope.querySelectorAll(".datepicker-container").length, 1);
      assert.ok(current.endDateEl.classList.contains("no-autoinit"));

      start.value = "2026-09-20";
      start.dispatchEvent(new window.Event("change", { bubbles: true }));
      current.endDateEl.value = "2026-09-25";
      current.endDateEl.dispatchEvent(new window.Event("change", { bubbles: true }));
      assert.equal(current.date.getDate(), 20);
      assert.equal(current.endDate.getDate(), 25);
      oldEnd.value = "2026-09-30";
      oldEnd.dispatchEvent(new window.Event("change", { bubbles: true }));
      assert.equal(current.endDate.getDate(), 25);
      assert.ok(!first.endDate, "destroyed input listeners must be removed");
    } finally {
      Expressive.Datepicker.getInstance(start)?.destroy();
    }
    assert.equal(scope.querySelectorAll("input").length, 1);
    assert.equal(scope.querySelectorAll(".datepicker-container").length, 0);
    assert.equal(Expressive.Datepicker.getInstance(start), undefined);
  });
});

describe("AutoInit options from markup", () => {
  beforeEach(resetBody);

  const names = AUTO_INIT_FIXTURES.map(({ name }) => name);
  /** Destroys every instance AutoInit left in the document. */
  function destroyAll() {
    for (const el of document.body.querySelectorAll("*")) {
      for (const name of names) Expressive[name].getInstance(el)?.destroy();
    }
  }
  /** Starts `html` through AutoInit with console.warn mocked, then runs `check`. */
  function start(t, html, check, options) {
    const warn = t.mock.method(console, "warn", () => {});
    document.body.innerHTML = html;
    try {
      Expressive.AutoInit(document.body, options);
      check(warn.mock.calls.map((call) => String(call.arguments[0])));
    } finally {
      destroyAll();
    }
  }
  const menu = (id, attribute) =>
    `<a class="menu-trigger" id="${id}-trigger" data-target="${id}" data-menu-options='${attribute}'>Open</a><menu id="${id}"><li><a href="#!">one</a></li></menu>`;
  const instance = (name, selector) => Expressive[name].getInstance(document.querySelector(selector));

  test("starts two components with options written in markup", (t) => {
    start(
      t,
      `${menu("m", '{"closeOnClick":false,"inDuration":0}')}
       <a class="tooltipped" data-tooltip="Hi" data-tooltip-options='{"position":"top","enterDelay":50}'>Hover</a>`,
      (warnings) => {
        const menuOptions = instance("Menu", "#m-trigger").options;
        assert.equal(menuOptions.closeOnClick, false);
        assert.equal(menuOptions.inDuration, 0);
        assert.equal(menuOptions.outDuration, Expressive.Menu.defaults.outDuration);
        const tooltipOptions = instance("Tooltip", ".tooltipped").options;
        assert.equal(tooltipOptions.position, "top");
        assert.equal(tooltipOptions.enterDelay, 50);
        assert.equal(tooltipOptions.exitDelay, Expressive.Tooltip.defaults.exitDelay);
        assert.deepEqual(warnings, []);
      },
    );
  });

  test("an invalid value falls back to the default and the rest still apply", (t) => {
    start(
      t,
      `${menu("bad-json", '{"hover":true')}
       ${menu("array", "[1,2]")}
       ${menu("unknown", '{"nope":1,"hover":true}')}
       ${menu("kind", '{"inDuration":"fast","hover":true}')}
       ${menu("callback", '{"onOpenStart":"alert(1)","hover":true}')}
       <input class="autocomplete" id="ac" data-autocomplete-options='{"onSearch":"x"}'>
       <input class="date-picker" id="dp" data-datepicker-options='{"minMonth":1}'>
       <a class="tooltipped" data-tooltip="Hi" data-tooltip-options='{"margin":9}'>Hover</a>`,
      (warnings) => {
        const defaults = Expressive.Menu.defaults;
        for (const id of ["bad-json", "array"]) {
          assert.equal(instance("Menu", `#${id}-trigger`).options.hover, defaults.hover, id);
        }
        for (const id of ["unknown", "kind", "callback"]) {
          assert.equal(instance("Menu", `#${id}-trigger`).options.hover, true, id);
        }
        assert.equal(instance("Menu", "#unknown-trigger").options.nope, undefined);
        assert.equal(instance("Menu", "#kind-trigger").options.inDuration, defaults.inDuration);
        assert.equal(instance("Menu", "#callback-trigger").options.onOpenStart, null);
        assert.equal(instance("Autocomplete", "#ac").options.onSearch, Expressive.Autocomplete.defaults.onSearch);
        assert.equal(instance("Datepicker", "#dp").options.minMonth, undefined);
        assert.equal(instance("Tooltip", ".tooltipped").options.margin, 9);
        assert.equal(warnings.length, 7);
        assert.equal(warnings.filter((w) => w.includes("Menu") && w.includes("data-menu-options")).length, 5);
        for (const key of ["nope", "inDuration", "onOpenStart"]) {
          assert.ok(warnings.some((w) => w.includes(`"${key}"`)), key);
        }
        assert.ok(warnings.some((w) => w.includes("data-autocomplete-options") && w.includes('"onSearch"')));
        assert.ok(warnings.some((w) => w.includes("data-datepicker-options") && w.includes('"minMonth"')));
      },
    );
  });

  test("options passed to AutoInit win, and Tooltip's own attributes keep their precedence", (t) => {
    start(
      t,
      `<a class="tooltipped" id="first" data-tooltip="Hi" data-tooltip-options='{"position":"top","margin":8}'>A</a>
       <a class="tooltipped" id="second" data-tooltip="Hi" data-position="right" data-tooltip-options='{"position":"top"}'>B</a>`,
      () => {
        const first = instance("Tooltip", "#first");
        assert.equal(first.options.position, "left");
        assert.equal(first.options.margin, 8);
        const second = instance("Tooltip", "#second");
        second.open(true);
        assert.equal(second.options.position, "right");
        second.close();
      },
      { Tooltip: { position: "left" } },
    );
  });

  test("markup cannot pollute prototypes or turn on unsafe or internal options", (t) => {
    start(
      t,
      `<input class="autocomplete" id="ac" data-autocomplete-options='{"allowUnsafeHTML":true,"minLength":2}'>
       <input class="date-picker" id="dp" data-datepicker-options='{"maxYear":1,"yearRange":3}'>
       ${menu("proto", '{"__proto__":{"polluted":true},"constructor":{"x":1}}')}`,
      (warnings) => {
        const autocomplete = instance("Autocomplete", "#ac").options;
        assert.equal(autocomplete.allowUnsafeHTML, false);
        assert.equal(autocomplete.minLength, 2);
        const datepicker = instance("Datepicker", "#dp").options;
        assert.equal(datepicker.maxYear, Expressive.Datepicker.defaults.maxYear);
        assert.equal(datepicker.yearRange, 3);
        const menuOptions = instance("Menu", "#proto-trigger").options;
        assert.equal({}.polluted, undefined);
        assert.equal(Object.getPrototypeOf(menuOptions), Object.prototype);
        assert.equal(Object.hasOwn(menuOptions, "polluted"), false);
        assert.equal(Object.hasOwn(menuOptions, "constructor"), false);
        for (const key of ["allowUnsafeHTML", "maxYear", "__proto__", "constructor"]) {
          assert.ok(warnings.some((w) => w.includes(`"${key}"`)), key);
        }
      },
    );
  });

  test("a selected id from markup stays text when script allows unsafe HTML", (t) => {
    start(
      t,
      `<input class="autocomplete" id="ac" data-autocomplete-options='{"isMultiSelect":true,"selected":["<img src=x onerror=alert(1)>"]}'>`,
      () => {
        const autocomplete = instance("Autocomplete", "#ac");
        autocomplete.el.value = "zzz";
        autocomplete.setMenuItems([]);
        assert.equal(autocomplete.container.querySelector("img"), null);
        assert.match(autocomplete.container.textContent, /<img src=x/);
      },
      { Autocomplete: { allowUnsafeHTML: true, data: [{ id: "apple", text: "<b>Apple</b>" }] } },
    );
  });

  test("nested objects and arrays are checked against their defaults", (t) => {
    start(
      t,
      `<input class="time-picker" id="tp" data-timepicker-options='{"i18n":{"done":"Fertig","nope":"x","cancel":5},"twelveHour":false}'>
       <input class="time-picker" id="tp-good" data-timepicker-options='{"i18n":{"done":"Fertig"}}'>
       <button type="button" class="confetti" data-confetti-options='{"colors":["#f00",1],"shapes":["circle",1]}'>Go</button>`,
      (warnings) => {
        const timepicker = instance("Timepicker", "#tp").options;
        assert.deepEqual(timepicker.i18n, Expressive.Timepicker.defaults.i18n);
        assert.equal(timepicker.twelveHour, false);
        const good = instance("Timepicker", "#tp-good").options.i18n;
        assert.equal(good.done, "Fertig");
        assert.equal(good.cancel, Expressive.Timepicker.defaults.i18n.cancel);
        const confetti = instance("Confetti", ".confetti").options;
        // An empty default array accepts any items; a non-empty one sets their kind.
        assert.deepEqual(confetti.colors, ["#f00", 1]);
        assert.deepEqual(confetti.shapes, Expressive.Confetti.defaults.shapes);
        for (const key of ["i18n.nope", "i18n.cancel", "shapes"]) {
          assert.ok(warnings.some((w) => w.includes(`"${key}"`)), key);
        }
        assert.equal(warnings.length, 3);
      },
    );
  });

  test("an option whose default is an element or class instance cannot be replaced from markup", (t) => {
    // Tooltip reads transitionMovement only when it opens, so a stand-in default is safe here.
    const defaults = Expressive.Tooltip.defaults;
    const original = defaults.transitionMovement;
    for (const fallback of [document.body, new (class Holder {})()]) {
      defaults.transitionMovement = fallback;
      try {
        start(t, `<a class="tooltipped" data-tooltip="Hi" data-tooltip-options='{"transitionMovement":{},"margin":3}'>A</a>`, (warnings) => {
          const options = instance("Tooltip", ".tooltipped").options;
          assert.equal(options.transitionMovement, fallback);
          assert.equal(options.margin, 3);
          assert.ok(warnings.some((w) => w.includes('"transitionMovement"')));
        });
      } finally {
        defaults.transitionMovement = original;
      }
    }
  });

  test("an element with two components reads each one's own attribute", (t) => {
    start(
      t,
      `<a class="tooltipped menu-trigger" data-target="both" data-tooltip="More" data-tooltip-options='{"margin":12}' data-menu-options='{"hover":true}'>More</a><menu id="both"><li><a href="#!">one</a></li></menu>`,
      (warnings) => {
        const tooltip = instance("Tooltip", ".tooltipped").options;
        const menuOptions = instance("Menu", ".menu-trigger").options;
        assert.equal(tooltip.margin, 12);
        assert.equal(Object.hasOwn(tooltip, "hover"), false);
        assert.equal(menuOptions.hover, true);
        assert.equal(Object.hasOwn(menuOptions, "margin"), false);
        assert.deepEqual(warnings, []);
      },
    );
  });

  test("multi-word names read a kebab-case attribute", (t) => {
    start(
      t,
      `<div class="field"><select id="fs" data-form-select-options='{"classes":"wide"}'><option value="1">One</option></select><label for="fs">Pick</label></div>`,
      () => assert.equal(instance("FormSelect", "#fs").options.classes, "wide"),
    );
  });

  test("elements without the attribute, opted-out elements and direct init are unchanged", (t) => {
    start(
      t,
      `${menu("plain", "").replace(/ data-menu-options=''/, "")}
       <a class="tooltipped" id="plain-tip" data-tooltip="Hi">A</a>
       <a class="tooltipped no-autoinit" id="out" data-tooltip="Hi" data-tooltip-options='{"margin":20}'>B</a>`,
      (warnings) => {
        assert.deepEqual(
          { ...instance("Menu", "#plain-trigger").options, contextMenu: false },
          { ...Expressive.Menu.defaults },
        );
        assert.equal(instance("Tooltip", "#plain-tip").options.margin, Expressive.Tooltip.defaults.margin);
        const out = document.getElementById("out");
        assert.equal(Expressive.Tooltip.getInstance(out), undefined);
        const direct = Expressive.Tooltip.init(out);
        assert.equal(direct.options.margin, Expressive.Tooltip.defaults.margin);
        assert.deepEqual(warnings, []);
      },
    );
  });

  test("a rejected nested key leaves the whole object at its default", (t) => {
    start(
      t,
      `<div class="menubar" id="bad-bar" aria-label="Editor" data-menubar-options='{"menuOptions":{"constrainWidth":"bad","coverTrigger":true}}'><button type="button" class="menu-trigger" data-target="bar-menu">File</button></div><menu id="bar-menu"><li><button type="button">New</button></li></menu>
       <div class="menubar" id="good-bar" aria-label="View" data-menubar-options='{"menuOptions":{"coverTrigger":true}}'><button type="button" class="menu-trigger" data-target="view-menu">View</button></div><menu id="view-menu"><li><button type="button">Zoom</button></li></menu>`,
      (warnings) => {
        const bad = instance("Menubar", "#bad-bar").options.menuOptions;
        assert.deepEqual(bad, Expressive.Menubar.defaults.menuOptions);
        assert.equal(instance("Menu", "#bad-bar .menu-trigger").options.constrainWidth, false);
        assert.deepEqual(instance("Menubar", "#good-bar").options.menuOptions, { coverTrigger: true });
        assert.deepEqual(warnings.filter((w) => w.includes("menuOptions")).length, 1);
        assert.ok(warnings.some((w) => w.includes('"menuOptions.constrainWidth"')));
      },
    );
  });

  test("nested markup options keep Datepicker's locale names", (t) => {
    start(
      t,
      `<div lang="de-DE"><input class="date-picker" id="dp" data-datepicker-options='{"i18n":{"done":"Fertig"}}'><input class="date-picker" id="plain"></div>`,
      () => {
        const configured = instance("Datepicker", "#dp").options.i18n;
        const plain = instance("Datepicker", "#plain").options.i18n;
        assert.equal(configured.done, "Fertig");
        assert.equal(configured.months[2], plain.months[2]);
        assert.equal(plain.months[2], "März");
      },
    );
  });

  test("markup cannot set the data entries that Chips and Autocomplete build from", (t) => {
    start(
      t,
      `<form><div class="chips" id="chips" data-chips-options='{"allowUserInput":true,"data":[null]}'><input name="tags" required></div></form>
       <div class="field"><input class="autocomplete" id="ac" data-autocomplete-options='{"data":[null],"selected":[1]}'><label for="ac">A</label></div>
       <a class="tooltipped" data-tooltip="Hi" data-tooltip-options='{"margin":7}'>A</a>`,
      (warnings) => {
        const chips = instance("Chips", "#chips");
        assert.equal(chips.options.allowUserInput, true);
        assert.deepEqual(chips.options.data, Expressive.Chips.defaults.data);
        const autocomplete = instance("Autocomplete", "#ac");
        assert.deepEqual(autocomplete.options.data, []);
        assert.deepEqual(autocomplete.options.selected, [1]);
        assert.equal(instance("Tooltip", ".tooltipped").options.margin, 7);
        assert.equal(warnings.filter((w) => w.includes('"data"')).length, 2);
      },
    );
  });
});

describe("AutoInit watch mode", () => {
  beforeEach(resetBody);

  const names = AUTO_INIT_FIXTURES.map(({ name }) => name);
  /** Lets the MutationObserver callback run. */
  const settle = () => new Promise((resolve) => setTimeout(resolve));
  /** Appends `html` to `parent` and returns the first element it added. */
  function add(html, parent = document.body) {
    const template = document.createElement("template");
    template.innerHTML = html;
    const first = template.content.firstElementChild;
    parent.append(template.content);
    return first;
  }
  /** Runs `check` with the body watched, then stops watching and destroys every instance. */
  async function watching(check, options) {
    const stop = Expressive.AutoInit(document.body, options, { watch: true });
    try {
      await check(stop);
    } finally {
      stop();
      for (const el of document.body.querySelectorAll("*")) {
        for (const name of names) Expressive[name].getInstance(el)?.destroy();
      }
    }
  }
  const trigger = (id, attributes = "") =>
    `<a class="menu-trigger" id="${id}-trigger" data-target="${id}" ${attributes}>Open</a><menu id="${id}"><li><a href="#!">one</a></li></menu>`;

  test("starts a menu added after the scan with AutoInit and markup options", () =>
    watching(async () => {
      const el = add(trigger("m", `data-menu-options='{"hover":true}'`));
      assert.equal(Expressive.Menu.getInstance(el), undefined, "started before the observer ran");
      await settle();
      const options = Expressive.Menu.getInstance(el)?.options;
      assert.ok(options, "the added menu trigger was not started");
      assert.equal(options.inDuration, 0);
      assert.equal(options.hover, true);
    }, { Menu: { inDuration: 0 } }));

  test("starts every component in an added subtree in registry order, and the added element itself", () =>
    watching(async () => {
      const box = add(`<div>
        <div class="menubar" aria-label="Editor">${trigger("file")}${trigger("edit")}</div>
        <a class="tooltipped" data-tooltip="Hi">Hi</a>
        <div class="field"><select id="s"><option value="1">One</option></select><label for="s">S</label></div>
      </div>`);
      // A text node added and removed first, then an element with whitespace and a comment around
      // it: a watcher that trips on text nodes stops the batch before it starts the element.
      const text = document.createTextNode(" ");
      document.body.append(text);
      text.remove();
      const bare = add(` <a class="tooltipped" data-tooltip="Bare">Bare</a> <!-- note -->`);
      await settle();
      assert.ok(Expressive.Menubar.getInstance(box.querySelector(".menubar")));
      for (const id of ["file", "edit"]) {
        // Menubar runs after Menu and replaces each menu with its own menuOptions.
        assert.equal(Expressive.Menu.getInstance(document.getElementById(`${id}-trigger`)).options.constrainWidth, false, id);
      }
      assert.ok(Expressive.Tooltip.getInstance(box.querySelector(".tooltipped")));
      assert.ok(Expressive.FormSelect.getInstance(box.querySelector("select")));
      assert.ok(Expressive.Tooltip.getInstance(bare), "the added element itself was not started");
    }));

  test("leaves .no-autoinit elements and the instances page code starts on them alone", () =>
    watching(async () => {
      const skipped = add(`<a class="tooltipped no-autoinit" data-tooltip="Hi">Hi</a>`);
      await settle();
      assert.equal(Expressive.Tooltip.getInstance(skipped), undefined);
      const manual = Expressive.Tooltip.init(skipped, {});
      skipped.remove();
      await settle();
      assert.equal(Expressive.Tooltip.getInstance(skipped), manual);
      manual.destroy();
    }));

  test("keeps the instance and options of an element started before it was added", () =>
    watching(async () => {
      const el = document.createElement("a");
      el.className = "tooltipped";
      el.dataset.tooltip = "Hi";
      const instance = Expressive.Tooltip.init(el, { position: "left" });
      document.body.append(el);
      await settle();
      assert.equal(Expressive.Tooltip.getInstance(el), instance);
      assert.equal(instance.options.position, "left");
    }));

  test("ignores class changes on elements already in the page", () =>
    watching(async () => {
      const plain = add(`<a data-tooltip="Hi">Plain</a>`);
      const started = add(`<a class="tooltipped" data-tooltip="Hi">Started</a>`);
      await settle();
      const instance = Expressive.Tooltip.getInstance(started);
      assert.ok(instance);
      plain.classList.add("tooltipped");
      started.classList.remove("tooltipped");
      await settle();
      assert.equal(Expressive.Tooltip.getInstance(plain), undefined);
      assert.equal(Expressive.Tooltip.getInstance(started), instance);
    }));

  test("stop() handles markup added just before it, then stops", () =>
    watching(async (stop) => {
      const added = add(`<a class="tooltipped" data-tooltip="Hi">Added</a>`);
      const removed = add(`<a class="tooltipped" data-tooltip="Hi">Removed</a>`);
      await settle();
      const instance = Expressive.Tooltip.getInstance(removed);
      removed.remove();
      stop();
      assert.ok(Expressive.Tooltip.getInstance(added), "stop() dropped an addition the observer had not delivered");
      assert.equal(Expressive.Tooltip.getInstance(removed), undefined, "stop() dropped a removal the observer had not delivered");
      assert.ok(instance);
    }));

  test("stop() ends watching and keeps the instances already started", () =>
    watching(async (stop) => {
      assert.equal(typeof stop, "function");
      const started = add(`<a class="tooltipped" data-tooltip="Hi">Started</a>`);
      await settle();
      const instance = Expressive.Tooltip.getInstance(started);
      assert.ok(instance);
      stop();
      const later = add(`<a class="tooltipped" data-tooltip="Hi">Later</a>`);
      started.remove();
      await settle();
      assert.equal(Expressive.Tooltip.getInstance(later), undefined);
      assert.equal(Expressive.Tooltip.getInstance(started), instance);
      instance.destroy();
    }));

  for (const { name, selector, html } of AUTO_INIT_FIXTURES) {
    test(`destroys ${name} when its markup is removed`, (t) => {
      const errors = t.mock.method(console, "error", () => {});
      return watching(async () => {
        const box = add(`<div>${html}</div>`);
        await settle();
        const el = box.querySelector(selector);
        assert.ok(Expressive[name].getInstance(el), "not started");
        // Count only teardown errors: jsdom logs that Particles' canvas has no context on start.
        const before = errors.mock.callCount();
        box.remove();
        await settle();
        assert.equal(Expressive[name].getInstance(el), undefined);
        assert.equal(errors.mock.callCount(), before, String(errors.mock.calls[before]?.arguments[0]));
      });
    });
  }

  test("keeps the instance of an element moved within the page", () =>
    watching(async () => {
      const [from, to] = [add("<div></div>"), add("<div></div>")];
      const el = add(trigger("moved"), from);
      await settle();
      const instance = Expressive.Menu.getInstance(el);
      assert.ok(instance);
      to.append(el);
      await settle();
      assert.equal(Expressive.Menu.getInstance(el), instance);
    }));

  test("skips markup removed before the observer runs, and restarts markup added back later", () =>
    watching(async () => {
      const brief = add(`<a class="tooltipped" data-tooltip="Hi">Brief</a>`);
      brief.remove();
      await settle();
      assert.equal(Expressive.Tooltip.getInstance(brief), undefined);
      const el = add(`<a class="tooltipped" data-tooltip="Hi">Back</a>`);
      await settle();
      const first = Expressive.Tooltip.getInstance(el);
      assert.ok(first);
      el.remove();
      await settle();
      assert.equal(Expressive.Tooltip.getInstance(el), undefined);
      document.body.append(el);
      await settle();
      const second = Expressive.Tooltip.getInstance(el);
      assert.ok(second && second !== first, "the element added back was not started again");
    }));

  test("skips an element moved out of the watched element before the observer runs", async () => {
    const box = add("<div></div>");
    const stop = Expressive.AutoInit(box, {}, { watch: true });
    try {
      const el = add(`<a class="tooltipped" data-tooltip="Hi">Out</a>`, box);
      document.body.append(el);
      await settle();
      assert.equal(Expressive.Tooltip.getInstance(el), undefined);
    } finally {
      stop();
    }
  });

  test("watches a shadow root only through its own call", () =>
    watching(async () => {
      const root = add("<div></div>").attachShadow({ mode: "open" });
      const inside = add(`<a class="tooltipped" data-tooltip="Hi">Inside</a>`, root);
      await settle();
      assert.equal(Expressive.Tooltip.getInstance(inside), undefined, "the document watcher entered the shadow root");
      const stop = Expressive.AutoInit(root, {}, { watch: true });
      try {
        assert.ok(Expressive.Tooltip.getInstance(inside), "the shadow root's first scan missed it");
        const later = add(`<a class="tooltipped" data-tooltip="Hi">Later</a>`, root);
        await settle();
        assert.ok(Expressive.Tooltip.getInstance(later), "the shadow root watcher missed an addition");
        later.remove();
        await settle();
        assert.equal(Expressive.Tooltip.getInstance(later), undefined);
        Expressive.Tooltip.getInstance(inside).destroy();
      } finally {
        stop();
      }
      const outside = add(`<a class="tooltipped" data-tooltip="Hi">Outside</a>`);
      await settle();
      assert.ok(Expressive.Tooltip.getInstance(outside));
    }));

  test("without watch, AutoInit creates no observer and returns a function that does nothing", async () => {
    const Original = globalThis.MutationObserver;
    let created = 0;
    globalThis.MutationObserver = class extends Original {
      constructor(callback) {
        super(callback);
        created++;
      }
    };
    try {
      const stops = [Expressive.AutoInit(), Expressive.AutoInit(document.body, {}), Expressive.AutoInit(document.body, {}, { watch: false })];
      assert.equal(created, 0);
      for (const stop of stops) {
        assert.equal(typeof stop, "function");
        stop();
      }
    } finally {
      globalThis.MutationObserver = Original;
    }
    const later = add(`<a class="tooltipped" data-tooltip="Hi">Later</a>`);
    await settle();
    assert.equal(Expressive.Tooltip.getInstance(later), undefined);
  });
});
