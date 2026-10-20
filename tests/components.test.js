// Behaviour, not just construction: each case drives a component through its
// public API (or a real event) and asserts the DOM state it is supposed to
// produce. jsdom has no layout, so these deliberately assert on classes,
// structure and text - never on measured geometry or transitions.

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { Expressive, resetBody, fire, window } from "./setup.js";

describe("FloatingActionButton", () => {
  beforeEach(resetBody);

  const FAB_MENU = `
    <div class="fab-menu">
      <button type="button" class="button extra circle" aria-label="Create">+</button>
      <ul><li><button type="button">Compose</button></li></ul>
    </div>`;

  test(".fab-menu expands and collapses on the same instance", () => {
    document.body.innerHTML = FAB_MENU;
    const el = document.querySelector(".fab-menu");
    Expressive.AutoInit();
    const instance = Expressive.FloatingActionButton.getInstance(el);
    const trigger = el.querySelector(":scope > button");

    try {
      assert.ok(instance, ".fab-menu did not reach FloatingActionButton");
      assert.equal(trigger.getAttribute("aria-expanded"), "false");
      fire(trigger, "click");
      assert.equal(el.classList.contains("active"), true);
      assert.equal(trigger.getAttribute("aria-expanded"), "true");
      fire(trigger, "click");
      assert.equal(el.classList.contains("active"), false);
      assert.equal(trigger.getAttribute("aria-expanded"), "false");
    } finally {
      instance?.destroy();
    }
  });

  test("destroy removes the aria-expanded and tabindex it added", () => {
    document.body.innerHTML = `
      <div class="fab-menu">
        <a class="button extra circle" aria-label="Create">+</a>
        <ul><li><button type="button">Compose</button></li></ul>
      </div>`;
    const anchor = document.querySelector(".fab-menu > a");
    const instance = Expressive.FloatingActionButton.init(document.querySelector(".fab-menu"));

    assert.equal(anchor.getAttribute("tabindex"), "0");
    instance.destroy();
    assert.equal(anchor.hasAttribute("aria-expanded"), false);
    assert.equal(anchor.hasAttribute("tabindex"), false);
  });

  test("no composite role is promised without the keyboard model", () => {
    // SEMANTICS rule 2. The list used to be given role="menu" and the trigger
    // aria-haspopup="menu", neither of which this component earns: there is no
    // arrow-key navigation over the actions. semantics.json withholds `menu`
    // for both hosts, and this is the half of that a selector cannot see.
    document.body.innerHTML = FAB_MENU;
    const el = document.querySelector(".fab-menu");
    const instance = Expressive.FloatingActionButton.init(el);

    try {
      assert.equal(el.querySelector("ul").getAttribute("role"), null);
      assert.equal(
        el.querySelector(":scope > button").getAttribute("aria-haspopup"),
        null,
      );
    } finally {
      instance.destroy();
    }
  });
});

describe("Tabs", () => {
  beforeEach(resetBody);

  test("select() moves the active link", () => {
    document.body.innerHTML = `
      <nav class="tabs" aria-label="Tabs">
        <a class="active" href="#tab1">Tab 1</a>
        <a href="#tab2">Tab 2</a>
      </nav>
      <div id="tab1">one</div><div id="tab2">two</div>`;
    const instance = Expressive.Tabs.init(document.querySelector(".tabs"));
    const [link1, link2] = document.querySelectorAll(".tabs > a");

    assert.equal(link1.classList.contains("active"), true);

    instance.select("tab2");

    assert.equal(link2.classList.contains("active"), true);
    assert.equal(link1.classList.contains("active"), false);
    instance.destroy();
  });

  test("nav.tabs click hides the old panel and shows the hashed one", () => {
    document.body.innerHTML = `
      <article>
        <nav class="tabs max">
          <a href="#card-test-1">Test 1</a>
          <a class="active" href="#card-test-2">Test 2</a>
          <a href="#card-test-3">Test 3</a>
        </nav>
        <div>
          <div id="card-test-1">Test 1</div>
          <div id="card-test-2">Test 2</div>
          <div id="card-test-3">Test 3</div>
        </div>
      </article>`;
    const instance = Expressive.Tabs.init(document.querySelector(".tabs"));
    try {
      assert.equal(
        document.getElementById("card-test-1").style.display,
        "none",
      );
      assert.equal(
        document.getElementById("card-test-3").style.display,
        "none",
      );

      document.querySelector('a[href="#card-test-1"]').click();

      assert.equal(
        document.getElementById("card-test-1").style.display,
        "",
      );
      assert.equal(
        document.getElementById("card-test-2").style.display,
        "none",
      );
      assert.equal(
        document
          .querySelector('a[href="#card-test-1"]')
          .classList.contains("active"),
        true,
      );
    } finally {
      instance.destroy();
    }
  });
});

describe("FormSelect", () => {
  beforeEach(resetBody);

  const fieldHtml = `
    <div class="field">
      <select id="pick">
        <option value="" disabled selected>Choose</option>
        <option value="1">One</option>
        <option value="2">Two</option>
      </select>
      <label for="pick">Pick</label>
    </div>`;

  test("builds a menu mirroring the native options", () => {
    document.body.innerHTML = fieldHtml;
    const select = document.querySelector("select");
    Expressive.FormSelect.init(select);

    const wrapper = document.querySelector(".field");
    assert.ok(wrapper, "no .field wrapper was created");

    const items = wrapper.querySelectorAll('menu[role="listbox"] li');
    assert.equal(items.length, 3, "menu does not mirror the three <option>s");
    assert.deepEqual(
      Array.from(items, (li) => li.textContent.trim()),
      ["Choose", "One", "Two"],
    );
  });

  test("reuses an existing .field instead of nesting another", () => {
    document.body.innerHTML = fieldHtml;
    const field = document.querySelector(".field");
    const instance = Expressive.FormSelect.init(
      document.querySelector("select"),
    );

    assert.equal(instance.wrapper, field);
    assert.ok(field.querySelector(":scope > .hide-select"));
    assert.equal(document.querySelectorAll(".field").length, 1);
    assert.equal(field.querySelectorAll(".field").length, 0);
    instance.destroy();
    assert.equal(document.querySelector("select").parentElement, field);
  });

  for (const [name, html] of Object.entries({
    "label before select": '<label for="pick">Pick</label><select id="pick"><option>One</option></select><span>After</span>',
    "label after select": '<span>Before</span><select id="pick"><option>One</option></select><label for="pick">Pick</label>',
    "label in another parent": '<div><span>Before</span><label for="pick">Pick</label><span>After</span></div><select id="pick"><option>One</option></select>',
    "existing field": fieldHtml,
    "multiple labels before and after": '<label id="authored" for="pick">Pick</label><label for="pick">a number</label><select id="pick"><option>One</option></select><div><label id="" for="pick">below</label></div>',
    "multiple labels with existing field": '<div class="field"><label for="pick">Pick</label><select id="pick"><option>One</option></select></div><label for="pick">a number</label>',
    "wrapping and external labels": '<label>Pick<select id="pick"><option>One</option></select></label><label for="pick">a number</label>',
    "external and wrapping labels": '<label for="pick">Pick</label><label for="pick">a number<select id="pick"><option>One</option></select></label>',
    "no label": '<span>Before</span><select id="pick" aria-label="Pick"><option>One</option></select><span>After</span>',
  })) {
    for (const reinitialize of [false, true]) test(`restores authored label and node order: ${name}, reinitialize=${reinitialize}`, () => {
      document.body.innerHTML = html;
      const select = document.querySelector("select");
      const labels = [...select.labels];
      const originalAttributes = labels.map(label => [label.getAttribute("for"), label.getAttribute("id")]);
      const parents = new Set([select.parentNode, ...labels.map(label => label.parentNode)]);
      const originalChildren = [...parents].map(parent => [parent, [...parent.childNodes]]);
      let labelClicks = 0;
      labels.forEach(label => label.addEventListener("click", event => { if (event.target === label) labelClicks++; }));
      for (let cycle = 0; cycle < 2; cycle++) {
        let instance;
        try {
          instance = Expressive.FormSelect.init(select);
          if (reinitialize) instance = Expressive.FormSelect.init(select);
          assert.equal(instance.labelEl, labels[0] ?? null);
          for (const label of labels) {
            assert.equal(label.control, instance.input);
            label.click();
          }
          assert.equal(labelClicks, (cycle + 1) * labels.length, "the original label listeners survive");
        } finally {
          Expressive.FormSelect.getInstance(select)?.destroy();
        }
        for (const [parent, children] of originalChildren) {
          assert.deepEqual([...parent.childNodes], children, "teardown restores the original nodes and removes placeholders");
        }
        labels.forEach((label, index) => {
          assert.deepEqual([label.getAttribute("for"), label.getAttribute("id")], originalAttributes[index]);
          assert.equal(label.control, select);
        });
        assert.deepEqual([...select.labels], labels);
      }
    });
  }

  test("the fake field is a combobox and the caret is not an SVG", () => {
    document.body.innerHTML = fieldHtml;
    const instance = Expressive.FormSelect.init(
      document.querySelector("select"),
    );

    assert.equal(instance.input.getAttribute("role"), "combobox");
    assert.equal(instance.input.getAttribute("aria-haspopup"), "listbox");
    assert.ok(instance.input.id.startsWith("select-input-"));
    assert.equal(instance.wrapper.querySelector("svg"), null);
    assert.ok(instance.wrapper.querySelector(":scope > .caret"));
    instance.destroy();
  });

  test("refresh() rebuilds the menu after options change", () => {
    document.body.innerHTML = fieldHtml;
    const select = document.querySelector("select");
    const instance = Expressive.FormSelect.init(select);
    const menu = instance.menuEl;

    const extra = document.createElement("option");
    extra.value = "3";
    extra.textContent = "Three";
    select.appendChild(extra);
    instance.refresh();

    assert.equal(instance.menuEl, menu, "refresh() replaced the Menu host");
    assert.equal(menu.querySelectorAll("li").length, 4);
    assert.equal(menu.querySelectorAll("li")[3].textContent.trim(), "Three");
    instance.destroy();
  });

  test("refresh() syncs a programmatic value change", () => {
    document.body.innerHTML = fieldHtml;
    const select = document.querySelector("select");
    const instance = Expressive.FormSelect.init(select);

    select.value = "2";
    instance.refresh();

    assert.equal(instance.input.value, "Two");
    assert.ok(
      instance.menuEl.querySelector("li.selected")?.textContent.includes("Two"),
    );
    instance.destroy();
  });

  test("clicking a multi-select checkbox keeps the box in step", () => {
    document.body.innerHTML = `<select multiple><option value="1">One</option></select>`;
    const select = document.querySelector("select");
    const instance = Expressive.FormSelect.init(select);
    try {
      const box = instance.menuEl.querySelector('input[type="checkbox"]');
      fire(box, "click");
      assert.equal(select.options[0].selected, true);
      assert.equal(box.checked, true);
      fire(box, "click");
      assert.equal(select.options[0].selected, false);
      assert.equal(box.checked, false);
    } finally {
      instance.destroy();
    }
  });

  test("clicking a disabled option keeps a single select open", () => {
    document.body.innerHTML = fieldHtml;
    const instance = Expressive.FormSelect.init(document.querySelector("select"));
    try {
      instance.menu.open();
      fire(instance.menuEl.querySelector("li.disabled"), "click");
      assert.equal(instance.menu.isOpen, true);
    } finally {
      instance.destroy();
    }
  });
});

describe("Menu nested menus", () => {
  beforeEach(resetBody);

  const html = `
    <button type="button" class="menu-trigger" data-target="dn">Drop</button>
    <menu id="dn">
      <li><a href="#!">One</a></li>
      <li id="more-row">
        <a href="#!">More</a>
        <menu>
          <li><a href="#!">Nested</a></li>
        </menu>
      </li>
    </menu>`;

  test("does not start a second Menu for the nested menu", () => {
    document.body.innerHTML = html;
    const before = Expressive.Menu._menus.length;
    const instance = Expressive.Menu.init(
      document.querySelector(".menu-trigger"),
    );
    assert.equal(Expressive.Menu._menus.length, before + 1);
    assert.equal(document.getElementById("dn").getAttribute("role"), "menu");
    assert.equal(
      document.querySelector("#dn > li").getAttribute("role"),
      "menuitem",
    );
    assert.equal(
      document.querySelector("#dn li menu").getAttribute("role"),
      "menu",
    );
    assert.equal(
      document.querySelector(".menu-trigger").getAttribute("aria-controls"),
      "dn",
    );
    assert.equal(
      document
        .getElementById("more-row")
        .querySelector("a")
        .getAttribute("aria-haspopup"),
      "menu",
    );
    instance.destroy();
    assert.equal(Expressive.Menu._menus.length, before);
  });

  test("clicking a submenu parent toggles .open and keeps the root open", () => {
    document.body.innerHTML = html;
    const instance = Expressive.Menu.init(
      document.querySelector(".menu-trigger"),
    );
    const more = document.getElementById("more-row");
    instance.open();

    fire(more.querySelector("a"), "click");
    assert.equal(instance.isOpen, true);
    assert.equal(more.classList.contains("open"), true);
    assert.equal(more.querySelector("a").getAttribute("aria-expanded"), "true");

    fire(more.querySelector("a"), "click");
    assert.equal(more.classList.contains("open"), false);
    assert.equal(instance.isOpen, true);

    fire(more.querySelector("a"), "click");
    instance.close();
    assert.equal(more.classList.contains("open"), false);
    instance.destroy();
  });

  test("Space and Arrow Up open the menu and focus its first item", async () => {
    document.body.innerHTML = html;
    const trigger = document.querySelector(".menu-trigger");
    let instance = Expressive.Menu.init(trigger, { inDuration: 0 });

    trigger.dispatchEvent(
      new window.KeyboardEvent("keydown", {
        key: " ",
        bubbles: true,
        cancelable: true,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(instance.isOpen, true);
    assert.equal(document.activeElement.textContent.trim(), "One");
    instance.destroy();

    document.body.innerHTML = html;
    const arrowTrigger = document.querySelector(".menu-trigger");
    instance = Expressive.Menu.init(arrowTrigger, { inDuration: 0 });
    arrowTrigger.dispatchEvent(
      new window.KeyboardEvent("keydown", {
        key: "ArrowUp",
        bubbles: true,
        cancelable: true,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(instance.isOpen, true);
    assert.equal(document.activeElement.textContent.trim(), "One");
    instance.destroy();
  });

  test("disabled items remain focusable but cannot be activated", () => {
    document.body.innerHTML = `
      <button type="button" class="menu-trigger" data-target="disabled-menu">Drop</button>
      <menu id="disabled-menu">
        <li class="disabled"><a href="#!">Redo</a></li>
      </menu>`;
    let clicks = 0;
    const instance = Expressive.Menu.init(
      document.querySelector(".menu-trigger"),
      {
        onItemClick: () => clicks++,
      },
    );
    const row = document.querySelector("#disabled-menu > li");

    assert.equal(row.tabIndex, 0);
    assert.equal(row.getAttribute("aria-disabled"), "true");
    fire(row.querySelector("a"), "click");
    assert.equal(clicks, 0);
    instance.destroy();
  });

  test("preserves radio and checkbox menu item roles", () => {
    document.body.innerHTML = `
      <button type="button" class="menu-trigger" data-target="choice-menu">Choose</button>
      <menu id="choice-menu">
        <li role="menuitemradio" aria-checked="true"><button type="button">One</button></li>
        <li role="menuitemcheckbox" aria-checked="false"><button type="button">Two</button></li>
      </menu>`;
    const instance = Expressive.Menu.init(document.querySelector(".menu-trigger"));
    const items = document.querySelectorAll("#choice-menu > li");

    assert.equal(items[0].getAttribute("role"), "menuitemradio");
    assert.equal(items[0].getAttribute("aria-checked"), "true");
    assert.equal(items[1].getAttribute("role"), "menuitemcheckbox");
    instance.destroy();
  });
});

describe("Cards reveal", () => {
  beforeEach(resetBody);

  const html = `
    <article>
      <figure>
        <button type="button" class="card-reveal-trigger"
                aria-label="Show contact details" aria-controls="card-details"></button>
      </figure>
      <h3>Title</h3>
      <p>body</p>
      <aside id="card-details">
        <a href="#details">More details</a>
      </aside>
    </article>`;

  test("initializes and synchronizes an accessible disclosure", () => {
    document.body.innerHTML = html;
    const el = document.querySelector("article");
    const trigger = el.querySelector(".card-reveal-trigger");
    const reveal = el.querySelector("aside");
    const instance = Expressive.Cards.init(el);

    assert.equal(el.classList.contains("card-reveal-initialized"), true);
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(trigger.getAttribute("aria-controls"), "card-details");
    assert.equal(trigger.getAttribute("role"), null);
    assert.equal(reveal.hasAttribute("aria-expanded"), false);
    assert.equal(reveal.inert, true);

    instance.open();
    assert.equal(instance.isOpen, true);
    assert.equal(trigger.getAttribute("aria-expanded"), "true");
    assert.equal(reveal.classList.contains("open"), true);
    assert.equal(reveal.inert, false);

    instance.open();
    assert.equal(instance.isOpen, true, "a second open() closed the reveal");

    instance.close();
    assert.equal(instance.isOpen, false);
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(reveal.classList.contains("open"), false);
    assert.equal(reveal.inert, true);
    instance.destroy();
    assert.equal(el.classList.contains("card-reveal-initialized"), false);
  });

  test("does not hide a panel when initialized without a usable trigger", () => {
    document.body.innerHTML = `<article><button type="submit" class="card-reveal-trigger">Submit</button><aside id="details">Details</aside></article>`;
    const el = document.querySelector("article");
    const panel = el.querySelector("aside");
    const instance = Expressive.Cards.init(el);

    assert.notEqual(panel.inert, true);
    instance.open();
    assert.equal(instance.isOpen, false);
    assert.equal(panel.classList.contains("open"), false);
    instance.destroy();
  });

  test("does not hide a panel when its only trigger is disabled", () => {
    document.body.innerHTML = `<article><button type="button" class="card-reveal-trigger" disabled>Toggle details</button><aside id="details">Details</aside></article>`;
    const el = document.querySelector("article");
    const panel = el.querySelector("aside");
    const instance = new Expressive.Cards(el);

    assert.equal(el.classList.contains("card-reveal-initialized"), false);
    assert.notEqual(panel.inert, true);
    instance.open();
    assert.equal(instance.isOpen, false);
    instance.destroy();
  });

  test("does not hide a panel when its only trigger is unnamed", () => {
    document.body.innerHTML = `
      <article>
        <button type="button" class="card-reveal-trigger">
          <span aria-hidden="true">more_vert</span>
        </button>
        <aside id="details">Details</aside>
      </article>`;
    const el = document.querySelector("article");
    const panel = el.querySelector("aside");
    const instance = new Expressive.Cards(el);

    assert.equal(el.classList.contains("card-reveal-initialized"), false);
    assert.notEqual(panel.inert, true);
    assert.equal(el.querySelector("button").hasAttribute("aria-expanded"), false);
    instance.open();
    assert.equal(instance.isOpen, false);
    instance.destroy();
  });

  test("destroy preserves panel state when disclosure setup was skipped", () => {
    document.body.innerHTML = `<article><button type="submit" class="card-reveal-trigger">Submit</button><aside id="details" class="open" inert>Details</aside></article>`;
    const el = document.querySelector("article");
    const panel = el.querySelector("aside");
    const instance = new Expressive.Cards(el);

    instance.destroy();

    assert.equal(panel.classList.contains("open"), true);
    assert.equal(panel.hasAttribute("inert"), true);
  });

  test("does not hide an unidentified reveal panel", () => {
    document.body.innerHTML = `<article><button type="button" class="card-reveal-trigger">Toggle details</button><aside>Details</aside></article>`;
    const el = document.querySelector("article");
    const panel = el.querySelector("aside");
    const instance = new Expressive.Cards(el);

    assert.notEqual(panel.inert, true);
    assert.equal(el.querySelector("button").hasAttribute("aria-expanded"), false);
    instance.open();
    assert.equal(instance.isOpen, false);
    assert.equal(panel.classList.contains("open"), false);
    instance.destroy();
  });

  test("does not partially initialize a card with multiple reveal panels", () => {
    document.body.innerHTML = `<article><button type="button" class="card-reveal-trigger">Toggle details</button><aside id="first-details">First</aside><aside id="second-details">Second</aside></article>`;
    const el = document.querySelector("article");
    const panels = [...el.querySelectorAll("aside")];
    const instance = new Expressive.Cards(el);

    assert.deepEqual(
      panels.map((panel) => panel.inert === true),
      [false, false],
    );
    instance.open();
    assert.equal(instance.isOpen, false);
    instance.destroy();
  });

  test("uses the panel id for aria-controls", () => {
    document.body.innerHTML = html.replace(
      'aria-controls="card-details"',
      'aria-controls="wrong-panel"',
    );
    const el = document.querySelector("article");
    const trigger = el.querySelector(".card-reveal-trigger");
    const instance = Expressive.Cards.init(el);

    assert.equal(trigger.getAttribute("aria-controls"), "card-details");
    instance.destroy();
    assert.equal(trigger.getAttribute("aria-controls"), "wrong-panel");
  });

  test("uses the native button click without synthesizing key activation", () => {
    document.body.innerHTML = html;
    const el = document.querySelector("article");
    const trigger = el.querySelector(".card-reveal-trigger");
    const instance = Expressive.Cards.init(el);

    trigger.dispatchEvent(
      new window.KeyboardEvent("keypress", {
        bubbles: true,
        cancelable: true,
        key: " ",
      }),
    );
    assert.equal(instance.isOpen, false);

    fire(trigger, "click");
    assert.equal(instance.isOpen, true);
    fire(trigger, "click");
    assert.equal(instance.isOpen, false);
    instance.destroy();
  });

  test("Escape closes the reveal and returns focus from its contents", () => {
    document.body.innerHTML = html;
    const el = document.querySelector("article");
    const trigger = el.querySelector(".card-reveal-trigger");
    const reveal = el.querySelector("aside");
    const link = reveal.querySelector("a");
    const instance = Expressive.Cards.init(el);

    fire(trigger, "click");
    link.focus();
    assert.equal(document.activeElement, link);
    link.dispatchEvent(
      new window.KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Escape",
      }),
    );

    assert.equal(instance.isOpen, false);
    assert.equal(document.activeElement, trigger);
    instance.destroy();
  });

  test("destroy removes runtime-owned disclosure state", () => {
    document.body.innerHTML = html;
    const el = document.querySelector("article");
    const trigger = el.querySelector(".card-reveal-trigger");
    const reveal = el.querySelector("aside");
    const instance = Expressive.Cards.init(el);

    instance.open();
    instance.destroy();

    assert.equal(reveal.classList.contains("open"), false);
    assert.equal(reveal.inert, false);
    assert.equal(trigger.hasAttribute("aria-expanded"), false);
    assert.equal(trigger.getAttribute("aria-controls"), "card-details");
  });
});

describe("ExpandingCard", () => {
  beforeEach(resetBody);

  const html = `
    <article class="expanding-card">
      <figure>
        <img src="http://localhost/album.jpg" alt="Album art">
        <button type="button" class="expanding-card-trigger">Open album</button>
      </figure>
      <dialog id="album-detail" class="expanding-card-dialog">
        <button type="button" class="expanding-card-close">Back</button>
        <figure class="expanding-card-hero"><img src="http://localhost/album.jpg" alt="Album art"></figure>
        <div class="expanding-card-content">Details</div>
      </dialog>
    </article>`;

  test("opens the full-screen dialog and synchronizes the trigger state", () => {
    document.body.innerHTML = html;
    const el = document.querySelector(".expanding-card");
    const trigger = el.querySelector(".expanding-card-trigger");
    const dialog = el.querySelector(".expanding-card-dialog");
    const instance = Expressive.ExpandingCard.init(el);

    fire(trigger, "click");
    assert.equal(instance.isOpen, true);
    assert.equal(dialog.open, true);
    assert.equal(dialog.classList.contains("expanded"), true);
    // aria-expanded belongs on the trigger; it is not valid on a dialog.
    assert.equal(dialog.hasAttribute("aria-expanded"), false);
    assert.equal(trigger.getAttribute("aria-expanded"), "true");
    assert.equal(trigger.getAttribute("aria-controls"), "album-detail");
    instance.destroy();
  });

  test("the back action reverses the card and returns focus", () => {
    document.body.innerHTML = html;
    const el = document.querySelector(".expanding-card");
    const trigger = el.querySelector(".expanding-card-trigger");
    const dialog = el.querySelector(".expanding-card-dialog");
    const instance = Expressive.ExpandingCard.init(el);
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = () => ({ ...originalMatchMedia(""), matches: true });

    try {
      instance.open();
      fire(dialog.querySelector(".expanding-card-close"), "click");
      assert.equal(instance.isOpen, false);
      assert.equal(dialog.open, false);
      assert.equal(dialog.classList.contains("expanded"), false);
      assert.equal(trigger.getAttribute("aria-expanded"), "false");
      assert.equal(document.activeElement, trigger);
    } finally {
      window.matchMedia = originalMatchMedia;
      instance.destroy();
    }
  });

  test("a native close reports onClose", () => {
    document.body.innerHTML = html;
    const el = document.querySelector(".expanding-card");
    const dialog = el.querySelector(".expanding-card-dialog");
    let closed = 0;
    const instance = Expressive.ExpandingCard.init(el, { onClose: () => closed++ });

    try {
      instance.open();
      dialog.close();
      assert.equal(instance.isOpen, false);
      assert.equal(closed, 1);
    } finally {
      instance.destroy();
    }
  });

  test("destroy restores the trigger it made a button", () => {
    document.body.innerHTML = html.replace(
      '<button type="button" class="expanding-card-trigger">Open album</button>',
      '<div class="expanding-card-trigger">Open album</div>',
    );
    const el = document.querySelector(".expanding-card");
    const trigger = el.querySelector(".expanding-card-trigger");
    const instance = Expressive.ExpandingCard.init(el);

    assert.equal(trigger.getAttribute("role"), "button");
    instance.destroy();
    for (const name of ["aria-expanded", "aria-controls", "tabindex", "role"]) {
      assert.equal(trigger.hasAttribute(name), false, name);
    }
  });
});

describe("CharacterCounter", () => {
  beforeEach(resetBody);

  test("counts a prefilled value and clears its own invalid class on destroy", () => {
    document.body.innerHTML = `<div class="field"><input id="t" type="text" maxlength="3" value="abcd"></div>`;
    const input = document.querySelector("#t");
    const instance = Expressive.CharacterCounter.init(input);

    assert.equal(document.querySelector(".character-counter").textContent, "4/3");
    assert.equal(input.classList.contains("invalid"), true);
    instance.destroy();
    assert.equal(input.classList.contains("invalid"), false);
  });

  test("counts input against maxlength and flags overflow", () => {
    document.body.innerHTML = `<div class="field"><input id="t" type="text" maxlength="5"></div>`;
    const input = document.querySelector("#t");
    Expressive.CharacterCounter.init(input);
    const counter = document.querySelector(".character-counter");
    assert.ok(counter, "no counter element was appended");

    input.value = "abc";
    fire(input, "input", window.InputEvent);
    assert.equal(counter.innerHTML, "3/5");
    assert.equal(input.classList.contains("invalid"), false);

    input.value = "abcdefg";
    fire(input, "input", window.InputEvent);
    assert.equal(counter.innerHTML, "7/5");
    assert.equal(
      input.classList.contains("invalid"),
      true,
      "over-length input was not flagged",
    );
  });
});

describe("Snackbar", () => {
  beforeEach(resetBody);

  test("renders its message into a snackbar container", () => {
    const snackbar = new Expressive.Snackbar({ text: "Saved" });
    try {
      assert.ok(
        document.querySelector("#snackbar-container"),
        "no snackbar container was created",
      );
      assert.ok(snackbar.el.classList.contains("snackbar"));
      assert.equal(snackbar.el.textContent.trim(), "Saved");
      assert.equal(snackbar.el.querySelector("p")?.textContent, "Saved");
      assert.equal(Expressive.Snackbar.getInstance(snackbar.el), snackbar);
    } finally {
      snackbar.dismiss();
    }
  });

  test("renders an action button and a close affordance", () => {
    let acted = false;
    const snackbar = new Expressive.Snackbar({
      text: "Item archived",
      action: "Undo",
      onAction: () => {
        acted = true;
      },
      dismissible: true,
      displayLength: Infinity,
    });
    try {
      const action = snackbar.el.querySelector("button:not(.circle)");
      const close = snackbar.el.querySelector("button.circle");
      assert.ok(action, "action button was not created");
      assert.equal(action.textContent, "Undo");
      assert.ok(close, "close button was not created");

      action.click();
      assert.equal(acted, true, "onAction was not called");
    } finally {
      snackbar.dismiss();
    }
  });

  test("a new snackbar waits for the one on screen, then shows", async () => {
    const shown = [];
    const first = new Expressive.Snackbar({ text: "First", displayLength: Infinity, outDuration: 0 });
    const second = new Expressive.Snackbar({ text: "Second", displayLength: Infinity, outDuration: 0, completeCallback: () => shown.push("second done") });
    const third = new Expressive.Snackbar({ text: "Third", displayLength: Infinity, outDuration: 0, completeCallback: () => shown.push("third done") });
    try {
      assert.equal(first.el.isConnected, true);
      assert.equal(second.el.isConnected, false, "the second waits");
      third.dismiss();
      assert.deepEqual(shown, ["third done"], "a queued snackbar can be dismissed before it shows");
      first.dismiss();
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(first.el.isConnected, false);
      assert.equal(second.el.isConnected, true, "the second shows once the first has gone");
      assert.equal(document.querySelectorAll("#snackbar-container .snackbar").length, 1);
      assert.equal(third.el.isConnected, false, "a dismissed queued snackbar never shows");
    } finally {
      Expressive.Snackbar.dismissAll();
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  });

  test("replace: true takes the place of the one on screen at once", () => {
    const first = new Expressive.Snackbar({ text: "First", displayLength: Infinity });
    const second = new Expressive.Snackbar({ text: "Second", displayLength: Infinity, replace: true });
    try {
      assert.equal(first.el.isConnected, false);
      assert.equal(second.el.textContent.trim(), "Second");
      assert.equal(document.querySelectorAll("#snackbar-container .snackbar").length, 1);
    } finally {
      second.dismiss();
    }
  });

  test("a persistent snackbar a re-render removed does not hold the queue", () => {
    const stuck = new Expressive.Snackbar({ text: "Stuck", displayLength: Infinity });
    document.getElementById("snackbar-container").remove();
    const next = new Expressive.Snackbar({ text: "Next", displayLength: Infinity });
    try {
      assert.equal(next.el.isConnected, true);
      assert.equal(Expressive.Snackbar.getInstance(stuck.el), undefined, "the removed one is let go");
    } finally {
      next.dismiss();
    }
  });

  test("a queued snackbar fires expressive:open when it shows, not when it is made", async () => {
    const opened = [];
    const record = (e) => opened.push(e.target.textContent.trim());
    document.addEventListener("expressive:open", record);
    try {
      const first = new Expressive.Snackbar({ text: "First", displayLength: Infinity, outDuration: 0 });
      new Expressive.Snackbar({ text: "Second", displayLength: Infinity, outDuration: 0 });
      assert.deepEqual(opened, ["First"]);
      first.dismiss();
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.deepEqual(opened, ["First", "Second"]);
    } finally {
      document.removeEventListener("expressive:open", record);
      Expressive.Snackbar.dismissAll();
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  });

  test("a queued snackbar whose template went away is skipped, and the queue goes on", async () => {
    const holder = document.createElement("div");
    holder.innerHTML = '<template id="queued-body"><div><p>From template</p></div></template>';
    document.body.append(holder);
    const done = [];
    const first = new Expressive.Snackbar({ text: "First", displayLength: Infinity, outDuration: 0 });
    new Expressive.Snackbar({ snackbarId: "queued-body", displayLength: Infinity, outDuration: 0, completeCallback: () => done.push("template") });
    const third = new Expressive.Snackbar({ text: "Third", displayLength: Infinity, outDuration: 0 });
    try {
      holder.remove();
      first.dismiss();
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.deepEqual(done, ["template"], "the skipped one still completes");
      assert.equal(third.el.isConnected, true, "the next one shows");
    } finally {
      Expressive.Snackbar.dismissAll();
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  });

  test("after a re-render removes the container, the oldest waiting snackbar shows first", () => {
    new Expressive.Snackbar({ text: "Shown", displayLength: Infinity });
    const older = new Expressive.Snackbar({ text: "Older", displayLength: Infinity });
    document.getElementById("snackbar-container").remove();
    const newer = new Expressive.Snackbar({ text: "Newer", displayLength: Infinity });
    try {
      assert.equal(older.el.isConnected, true, "the one that waited longest shows");
      assert.equal(newer.el.isConnected, false, "the new one waits its turn");
    } finally {
      Expressive.Snackbar.dismissAll();
    }
  });

  test("a copy button inside a template snackbar still gets its confirmation", async () => {
    const holder = document.createElement("div");
    holder.innerHTML = '<template id="copy-body"><div><p>Code</p><button data-copy="abc123">Copy</button></div></template>';
    document.body.append(holder);
    const clipboard = Object.getOwnPropertyDescriptor(window.navigator, "clipboard");
    Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: { writeText: async () => {} } });
    const outer = new Expressive.Snackbar({ snackbarId: "copy-body", displayLength: Infinity, outDuration: 0 });
    try {
      outer.el.querySelector("[data-copy]").click();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const shown = [...document.querySelectorAll("#snackbar-container .snackbar")];
      assert.deepEqual(shown.map((el) => el.textContent.trim()), ["Copied"]);
    } finally {
      if (clipboard) Object.defineProperty(window.navigator, "clipboard", clipboard);
      else delete window.navigator.clipboard;
      Expressive.Snackbar.dismissAll();
      await new Promise((resolve) => setTimeout(resolve, 10));
      holder.remove();
    }
  });

  test("an authored snackbar reopens after a re-render removed its container", () => {
    const holder = document.createElement("div");
    holder.innerHTML = '<div id="authored-body" style="display:none"><p>Saved</p></div>';
    document.body.append(holder);
    new Expressive.Snackbar({ snackbarId: "authored-body", displayLength: Infinity });
    document.getElementById("snackbar-container").remove();
    try {
      const again = new Expressive.Snackbar({ snackbarId: "authored-body", displayLength: Infinity });
      assert.equal(again.el, document.getElementById("authored-body"));
      assert.equal(again.el.isConnected, true);
    } finally {
      Expressive.Snackbar.dismissAll();
      holder.remove();
    }
  });

  test("dismissAll clears the queue as well as the screen", async () => {
    const shown = [];
    new Expressive.Snackbar({ text: "First", displayLength: Infinity, outDuration: 0 });
    const queued = new Expressive.Snackbar({ text: "Second", displayLength: Infinity, outDuration: 0, completeCallback: () => shown.push("second") });
    Expressive.Snackbar.dismissAll();
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(queued.el.isConnected, false);
    assert.deepEqual(shown, ["second"]);
    assert.equal(document.querySelectorAll("#snackbar-container .snackbar").length, 0);
  });

  test("an action snackbar persists with a close control by default", () => {
    const snackbar = new Expressive.Snackbar({
      text: "Archived",
      action: "Undo",
    });
    try {
      assert.equal(snackbar.options.displayLength, Infinity);
      assert.equal(snackbar.options.dismissible, true);
      assert.ok(snackbar.el.querySelector('button[aria-label="Dismiss"]'));
      assert.equal(snackbar.counterTimeout, undefined);
    } finally {
      snackbar.dismiss();
    }
  });

  test("action snackbar options can explicitly retain timed feedback and omit close", () => {
    const snackbar = new Expressive.Snackbar({ text: 'Saved', action: 'Review', displayLength: 4000, dismissible: false });
    try {
      assert.equal(snackbar.options.displayLength, 4000);
      assert.equal(snackbar.options.dismissible, false);
      assert.equal(snackbar.el.querySelector('button.circle'), null);
    } finally {
      snackbar.dismiss();
    }
  });

  test("is a polite live region and does not take focus", () => {
    const snackbar = new Expressive.Snackbar({
      text: "Saved",
      displayLength: Infinity,
    });
    try {
      assert.equal(snackbar.el.getAttribute("role"), "status");
      assert.equal(snackbar.el.getAttribute("aria-live"), "polite");
      assert.notEqual(document.activeElement, snackbar.el);
    } finally {
      snackbar.dismiss();
    }
  });
});
