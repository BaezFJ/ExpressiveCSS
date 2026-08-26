// Behaviour, not just construction: each case drives a component through its
// public API (or a real event) and asserts the DOM state it is supposed to
// produce. jsdom has no layout, so these deliberately assert on classes,
// structure and text - never on measured geometry or transitions.

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { Expressive, resetBody, fire, window } from "./setup.js";

describe("FloatingActionButton", () => {
  beforeEach(resetBody);

  test("open() and close() toggle .active", () => {
    document.body.innerHTML = `
      <div class="fixed-action-btn">
        <a class="button extra circle">+</a>
        <ul><li><a class="button extra circle small">e</a></li></ul>
      </div>`;
    const el = document.querySelector(".fixed-action-btn");
    const instance = Expressive.FloatingActionButton.init(el);
    const trigger = el.querySelector(":scope > a");

    assert.equal(el.classList.contains("active"), false);
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    instance.open();
    assert.equal(el.classList.contains("active"), true);
    assert.equal(trigger.getAttribute("aria-expanded"), "true");
    instance.close();
    assert.equal(el.classList.contains("active"), false);
    instance.destroy();
  });

  test(".click-to-toggle and direction-* in markup are honoured", () => {
    document.body.innerHTML = `
      <div class="fixed-action-btn direction-left click-to-toggle">
        <button type="button" class="button extra circle">+</button>
        <ul><li><button type="button" class="button extra circle small">e</button></li></ul>
      </div>`;
    const el = document.querySelector(".fixed-action-btn");
    const instance = Expressive.FloatingActionButton.init(el);

    assert.equal(instance.options.direction, "left");
    assert.equal(instance.options.hoverEnabled, false);
    instance.destroy();
  });

  test(".fab-menu expands and collapses on the same instance", () => {
    document.body.innerHTML = `
      <div class="fab-menu">
        <button type="button" class="button extra circle" aria-label="Create">+</button>
        <ul><li><button type="button">Compose</button></li></ul>
      </div>`;
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

  test("no composite role is promised without the keyboard model", () => {
    // SEMANTICS rule 2. The list used to be given role="menu" and the trigger
    // aria-haspopup="menu", neither of which this component earns: there is no
    // arrow-key navigation over the actions. semantics.json withholds `menu`
    // for both hosts, and this is the half of that a selector cannot see.
    document.body.innerHTML = `
      <div class="fab-menu">
        <button type="button" class="button extra circle" aria-label="Create">+</button>
        <ul><li><button type="button">Compose</button></li></ul>
      </div>`;
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
      <ul class="tabs">
        <li class="tab"><a class="active" href="#tab1">Tab 1</a></li>
        <li class="tab"><a href="#tab2">Tab 2</a></li>
      </ul>
      <div id="tab1">one</div><div id="tab2">two</div>`;
    const instance = Expressive.Tabs.init(document.querySelector(".tabs"));
    const [link1, link2] = document.querySelectorAll(".tabs .tab a");

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
        "block",
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
      <h3 class="activator">Title</h3>
      <p>body</p>
      <aside>
        <h4>More</h4>
        <p>reveal</p>
      </aside>
    </article>`;

  test("open() keeps the reveal expanded until close()", () => {
    document.body.innerHTML = html;
    const el = document.querySelector("article");
    const reveal = el.querySelector("aside");
    const instance = Expressive.Cards.init(el);

    instance.open();
    assert.equal(instance.isOpen, true);
    assert.equal(reveal.getAttribute("aria-expanded"), "true");
    assert.equal(el.style.transform, "", "open() wrote an inline transform");
    assert.equal(
      reveal.style.transform,
      "",
      "the reveal transform is CSS, not inline",
    );

    instance.open();
    assert.equal(instance.isOpen, true, "a second open() closed the reveal");

    instance.close();
    assert.equal(instance.isOpen, false);
    assert.equal(reveal.getAttribute("aria-expanded"), "false");

    instance.open();
    assert.equal(instance.isOpen, true, "the reveal could not be opened again");
    instance.destroy();
  });

  test("clicking the activator opens the reveal", () => {
    document.body.innerHTML = html;
    const el = document.querySelector("article");
    const instance = Expressive.Cards.init(el);

    const activator = el.querySelector(".activator");
    fire(activator, "click");
    assert.equal(instance.isOpen, true);
    assert.equal(
      el.querySelector("aside").getAttribute("aria-expanded"),
      "true",
    );
    assert.equal(activator.getAttribute("aria-expanded"), "true");

    fire(activator, "click");
    assert.equal(instance.isOpen, false);
    assert.equal(
      el.querySelector("aside").getAttribute("aria-expanded"),
      "false",
    );
    assert.equal(activator.getAttribute("aria-expanded"), "false");
    instance.destroy();
  });

  test("Space toggles a non-native activator without removing it from the tab order", () => {
    document.body.innerHTML = html;
    const el = document.querySelector("article");
    const instance = Expressive.Cards.init(el);
    const activator = el.querySelector(".activator");

    assert.equal(activator.getAttribute("role"), "button");
    assert.equal(activator.tabIndex, 0);
    activator.dispatchEvent(
      new window.KeyboardEvent("keypress", {
        bubbles: true,
        cancelable: true,
        key: " ",
      }),
    );
    assert.equal(instance.isOpen, true);
    assert.equal(activator.tabIndex, 0);

    activator.dispatchEvent(
      new window.KeyboardEvent("keypress", {
        bubbles: true,
        cancelable: true,
        key: " ",
      }),
    );
    assert.equal(instance.isOpen, false);
    instance.destroy();
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
    assert.equal(dialog.getAttribute("aria-expanded"), "true");
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
});

describe("CharacterCounter", () => {
  beforeEach(resetBody);

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

  test("a new snackbar replaces the one that is showing", () => {
    const first = new Expressive.Snackbar({
      text: "First",
      displayLength: Infinity,
    });
    const second = new Expressive.Snackbar({
      text: "Second",
      displayLength: Infinity,
    });
    try {
      assert.equal(first.el.isConnected, false);
      assert.equal(second.el.textContent.trim(), "Second");
      assert.equal(
        document.querySelectorAll("#snackbar-container .snackbar").length,
        1,
      );
    } finally {
      second.dismiss();
    }
  });

  test("an action snackbar stays longer unless displayLength is set", () => {
    const snackbar = new Expressive.Snackbar({
      text: "Archived",
      action: "Undo",
    });
    try {
      assert.equal(snackbar.options.displayLength, 10000);
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

describe("Sidenav", () => {
  beforeEach(resetBody);

  const html = `
    <ul id="slide-out" class="sidenav">
      <li><a href="#!">First</a></li>
      <li><a class="sidenav-close" href="#!">Close</a></li>
    </ul>
    <a href="#" data-target="slide-out" class="sidenav-trigger">menu</a>`;

  test("wraps the list in a dialog host", () => {
    document.body.innerHTML = html;
    const el = document.querySelector(".sidenav");
    const instance = Expressive.Sidenav.init(el);

    assert.equal(el.parentElement.tagName, "DIALOG");
    assert.ok(el.parentElement.classList.contains("sidenav-overlay"));
    instance.destroy();
    assert.equal(el.parentElement.tagName, "BODY");
    assert.equal(document.querySelector("dialog.sidenav-overlay"), null);
  });

  test("does not wrap a parent that is already a sidenav-overlay dialog", () => {
    document.body.innerHTML = `
      <dialog class="sidenav-overlay">
        <ul id="slide-out" class="sidenav"><li><a href="#!">First</a></li></ul>
      </dialog>`;
    const el = document.querySelector(".sidenav");
    const parent = el.parentElement;
    const instance = Expressive.Sidenav.init(el);
    assert.equal(el.parentElement, parent);
    assert.equal(
      parent.parentElement?.classList.contains("sidenav-overlay"),
      false,
    );
    instance.destroy();
  });

  test("does not wrap a dialog.sidenav", () => {
    document.body.innerHTML = `<dialog id="slide-out" class="sidenav"><p>nav</p></dialog>`;
    const el = document.querySelector(".sidenav");
    const instance = Expressive.Sidenav.init(el);
    assert.equal(el.parentElement.tagName, "BODY");
    assert.equal(el.tagName, "DIALOG");
    instance.open();
    assert.equal(el.open, true);
    instance.destroy();
  });

  test("open() and close() toggle the modal dialog", () => {
    document.body.innerHTML = html;
    const el = document.querySelector(".sidenav");
    const trigger = document.querySelector(".sidenav-trigger");
    const instance = Expressive.Sidenav.init(el);
    const dialog = el.parentElement;

    assert.equal(instance.isOpen, false);
    assert.equal(dialog.open, false);
    assert.equal(trigger.getAttribute("aria-expanded"), "false");

    instance.open();
    assert.equal(instance.isOpen, true);
    assert.equal(dialog.open, true);
    assert.equal(trigger.getAttribute("aria-expanded"), "true");

    instance.close();
    assert.equal(instance.isOpen, false);
    assert.equal(dialog.open, false);
    instance.destroy();
  });

  test("a trigger click opens the sidenav", () => {
    document.body.innerHTML = html;
    const el = document.querySelector(".sidenav");
    const instance = Expressive.Sidenav.init(el);

    fire(document.querySelector(".sidenav-trigger"), "click");
    assert.equal(instance.isOpen, true);
    instance.destroy();
  });

  test("sidenav-close closes an overlay sidenav", () => {
    document.body.innerHTML = html;
    const el = document.querySelector(".sidenav");
    const instance = Expressive.Sidenav.init(el);
    instance.open();

    fire(el.querySelector(".sidenav-close"), "click");
    assert.equal(instance.isOpen, false);
    instance.destroy();
  });

  test("a native dialog close event syncs isOpen", () => {
    document.body.innerHTML = html;
    const el = document.querySelector(".sidenav");
    const instance = Expressive.Sidenav.init(el);
    instance.open();
    // jsdom's close() does not fire the event the UA sends for Escape / scrim.
    el.parentElement.dispatchEvent(new window.Event("close"));
    assert.equal(instance.isOpen, false);
    instance.destroy();
  });

  test("opening one sidenav closes another", () => {
    document.body.innerHTML = `
      <ul id="a" class="sidenav"><li><a href="#!">A</a></li></ul>
      <ul id="b" class="sidenav"><li><a href="#!">B</a></li></ul>`;
    const [first, second] = document.querySelectorAll(".sidenav");
    const a = Expressive.Sidenav.init(first);
    const b = Expressive.Sidenav.init(second);
    a.open();
    b.open();
    assert.equal(a.isOpen, false);
    assert.equal(b.isOpen, true);
    a.destroy();
    b.destroy();
  });

  test("does not write body overflow or tabIndex", () => {
    document.body.innerHTML = `
      ${html}
      <nav><div class="nav-wrapper"><ul><li><a href="#!">Top</a></li></ul></div></nav>`;
    const el = document.querySelector(".sidenav");
    const topLink = document.querySelector(".nav-wrapper a");
    const instance = Expressive.Sidenav.init(el);

    instance.open();
    assert.equal(document.body.style.overflow, "");
    assert.equal(topLink.tabIndex, 0);
    assert.equal(el.querySelector("a").tabIndex, 0);

    instance.close();
    assert.equal(document.body.style.overflow, "");
    instance.destroy();
  });

  test("does not write inline transform or transition", () => {
    document.body.innerHTML = html;
    const el = document.querySelector(".sidenav");
    const instance = Expressive.Sidenav.init(el);
    instance.open();
    assert.equal(el.style.transform, "");
    assert.equal(el.style.transition, "");
    assert.equal(el.parentElement.style.transform, "");
    instance.close();
    instance.destroy();
  });

  test("fixed at the Expanded breakpoint does not showModal", () => {
    document.body.innerHTML = `<ul id="nav" class="sidenav sidenav-fixed"><li><a href="#!">A</a></li></ul>`;
    const original = window.matchMedia;
    window.matchMedia = (query) => ({
      matches: query.includes("840"),
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    });
    try {
      const el = document.querySelector(".sidenav");
      const instance = Expressive.Sidenav.init(el);
      instance.open();
      assert.equal(instance.isOpen, false);
      assert.equal(el.parentElement.open, false);
      instance.destroy();
    } finally {
      window.matchMedia = original;
    }
  });

  test("destroy() clears the instance off the element", () => {
    document.body.innerHTML = html;
    const el = document.querySelector(".sidenav");
    const instance = Expressive.Sidenav.init(el);
    instance.destroy();
    assert.equal(Expressive.Sidenav.getInstance(el), undefined);
  });

  test("nested details sections do not need a Collapsible instance", () => {
    document.body.innerHTML = `
      <ul id="slide-out" class="sidenav">
        <li>
          <details name="nav">
            <summary>More</summary>
            <ul><li><a href="#!">Child</a></li></ul>
          </details>
        </li>
      </ul>
      <a href="#" data-target="slide-out" class="sidenav-trigger">menu</a>`;
    const el = document.querySelector(".sidenav");
    const instance = Expressive.Sidenav.init(el);
    assert.equal(Expressive.Collapsible, undefined);
    const details = el.querySelector("details");
    details.open = true;
    assert.equal(details.open, true);
    instance.destroy();
  });
});
