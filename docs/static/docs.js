// Docs-site glue. The framework bundle only self-initializes Forms, Chips,
// Slider, Cards, ExpandingCard, Dialogs, BottomSheets and SideSheets; everything
// else needs an explicit AutoInit pass.

// Frosted glass preview: --expressive-glass on :root reaches every floating
// surface. The head script restores the stored choice before first paint.
function initGlassToggle(toggle) {
  if (!toggle) return;
  const root = document.documentElement;
  toggle.setAttribute(
    "aria-pressed",
    String(root.style.getPropertyValue("--expressive-glass") === "true"),
  );
  toggle.addEventListener("click", () => {
    const on = toggle.getAttribute("aria-pressed") !== "true";
    toggle.setAttribute("aria-pressed", String(on));
    if (on) root.style.setProperty("--expressive-glass", "true");
    else root.style.removeProperty("--expressive-glass");
    try {
      if (on) localStorage.setItem("glass", "true");
      else localStorage.removeItem("glass");
    } catch {
      // private mode / blocked storage
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  Expressive.AutoInit();

  const navigationDialog = document.getElementById("docs-navigation-dialog");
  const navigationTrigger = document.getElementById("docs-navigation-trigger");
  navigationTrigger?.addEventListener("click", () => navigationDialog?.showModal());
  // Return focus to the menu button, or to the current group in the rail
  // when the window has grown past the button's range.
  navigationDialog?.addEventListener("close", () => {
    const target = navigationTrigger?.checkVisibility()
      ? navigationTrigger
      : document.querySelector('.docs-category-rail > [aria-current]');
    target?.focus();
  });

  // The table of contents is a closed disclosure below Large and an open
  // column from Large up.
  const toc = document.querySelector(".docs-toc > details");
  const wide = window.matchMedia("(width >= 1200px)");
  const syncToc = () => {
    if (toc) toc.open = wide.matches;
    // From Large up the menu button is hidden and the rail holds the
    // navigation, so a drawer left open closes and focus goes to the rail.
    if (wide.matches && navigationDialog?.open) navigationDialog.close();
  };
  syncToc();
  wide.addEventListener("change", syncToc);

  // The palette answers to Command+K on Apple platforms.
  if (/Mac|iPhone|iPad/.test(navigator.platform)) {
    document.querySelectorAll(".docs-search-shortcut").forEach((kbd) => {
      kbd.textContent = "\u2318 K";
    });
  }

  const THEME_ICONS = {
    light: "light_mode",
    dark: "dark_mode",
    auto: "contrast",
  };

  const readTheme = () => {
    const current = document.documentElement.getAttribute("theme");
    return current === "light" || current === "dark" || current === "auto"
      ? current
      : "auto";
  };

  const applyTheme = (next) => {
    if (next !== "light" && next !== "dark" && next !== "auto") return;
    document.documentElement.setAttribute("theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // private mode / blocked storage
    }
    const icon = THEME_ICONS[next];
    document
      .querySelectorAll("#theme-toggle > .material-symbols")
      .forEach((el) => {
        el.textContent = icon;
      });
    document.querySelectorAll("#theme-menu [data-theme]").forEach((item) => {
      const selected = item.getAttribute("data-theme") === next;
      item.classList.toggle("selected", selected);
      item.setAttribute("aria-checked", selected ? "true" : "false");
    });
    const toggle = document.getElementById("theme-toggle");
    if (toggle) {
      const label = next === "auto" ? "Theme: auto" : `Theme: ${next}`;
      toggle.title = label;
      toggle.setAttribute("aria-label", label);
    }
  };

  applyTheme(readTheme());

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle && Expressive.Menu) {
    Expressive.Menu.init(themeToggle, {
      alignment: "right",
      constrainWidth: false,
      coverTrigger: false,
      container: document.body,
      onItemClick: (li) => applyTheme(li?.getAttribute("data-theme")),
    });
  }

  document
    .getElementById("page-theme-toggle")
    ?.addEventListener("click", (event) => {
      const item = event.target.closest("[data-theme]");
      if (!item) return;
      event.preventDefault();
      applyTheme(item.getAttribute("data-theme"));
    });

  initGlassToggle(document.getElementById("glass-toggle"));

  const DEFAULT_SOURCE = "#c6a0f6";
  const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

  const normalizeHex = (value) => {
    const raw = String(value ?? "").trim();
    const match = raw.match(HEX);
    if (!match) return null;
    const digits = match[1].toLowerCase();
    if (digits.length === 3) {
      return `#${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`;
    }
    return `#${digits}`;
  };

  const readSource = () => {
    try {
      const stored = normalizeHex(localStorage.getItem("md-source"));
      if (stored) return stored;
    } catch {
      // private mode / blocked storage
    }
    const inline = normalizeHex(
      document.documentElement.style.getPropertyValue("--md-source"),
    );
    if (inline) return inline;
    return (
      normalizeHex(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--md-source",
        ),
      ) ?? DEFAULT_SOURCE
    );
  };

  const persistSource = (hex) => {
    try {
      if (hex === DEFAULT_SOURCE) localStorage.removeItem("md-source");
      else localStorage.setItem("md-source", hex);
    } catch {
      // ignore quota / privacy errors
    }
  };

  const sourceDialog = document.getElementById("source-color-dialog");
  const sourceToggle = document.getElementById("source-color-toggle");
  const sourceInput = document.getElementById("source-color-input");
  const sourceHex = document.getElementById("source-color-hex");
  const sourceSwatches =
    sourceDialog?.querySelectorAll(".source-color-swatch") ?? [];

  const syncSourceUi = (hex) => {
    if (sourceInput) sourceInput.value = hex;
    if (sourceHex) sourceHex.value = hex;
    sourceSwatches.forEach((swatch) => {
      const selected = normalizeHex(swatch.dataset.source) === hex;
      swatch.setAttribute("aria-checked", selected ? "true" : "false");
    });
  };

  const applySource = (value) => {
    const hex = normalizeHex(value);
    if (!hex) return null;
    if (hex === DEFAULT_SOURCE) {
      document.documentElement.style.removeProperty("--md-source");
    } else {
      document.documentElement.style.setProperty("--md-source", hex);
    }
    persistSource(hex);
    syncSourceUi(hex);
    return hex;
  };

  if (sourceDialog && sourceToggle) {
    syncSourceUi(readSource());

    sourceToggle.addEventListener("click", (event) => {
      event.preventDefault();
      syncSourceUi(readSource());
      sourceDialog.showModal();
    });

    sourceSwatches.forEach((swatch) => {
      swatch.addEventListener("click", () =>
        applySource(swatch.dataset.source),
      );
    });

    sourceInput?.addEventListener("input", () =>
      applySource(sourceInput.value),
    );

    sourceHex?.addEventListener("input", () => {
      const hex = normalizeHex(sourceHex.value);
      if (hex) applySource(hex);
    });

    sourceHex?.addEventListener("blur", () => {
      syncSourceUi(readSource());
    });

    document
      .getElementById("source-color-reset")
      ?.addEventListener("click", () => {
        applySource(DEFAULT_SOURCE);
      });
  }

  const containerToggle = document.getElementById("container-toggle-button");
  containerToggle?.addEventListener("click", (event) => {
    event.preventDefault();
    const off = document.body.classList.toggle("containers-off");
    containerToggle.textContent = off
      ? "Turn on Containers"
      : "Turn off Containers";
  });

  const scaleDemo = document.getElementById("scale-demo");
  document
    .getElementById("scale-demo-trigger")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      scaleDemo?.classList.toggle("scale-out");
    });

  const flowDemo = document.getElementById("flow-text-demo");
  document.getElementById("flow-toggle")?.addEventListener("click", (event) => {
    event.preventDefault();
    flowDemo?.classList.toggle("flow-text");
  });

  const carouselMotion = document.getElementById("carousel-motion");
  if (carouselMotion) {
    const carousel = Expressive.Carousel.init(carouselMotion, { interval: 4000, height: 200 });
    const toggle = document.getElementById("carousel-motion-toggle");
    let paused = false;
    toggle.addEventListener("click", () => {
      paused = !paused;
      if (paused) carousel.pause();
      else carousel.start();
      toggle.textContent = paused ? "Resume automatic movement" : "Pause automatic movement";
    });
  }

  // Each snackbar demo button and what it does.
  Object.entries({
    "snackbar-basic": () => new Expressive.Snackbar({ text: "Photo saved to album" }),
    "snackbar-action": () =>
      new Expressive.Snackbar({
        text: "Item archived",
        action: "Undo",
        onAction: () => new Expressive.Snackbar({ text: "Item restored" }),
      }),
    "snackbar-close": () =>
      new Expressive.Snackbar({ text: "Can't send photo. Retry in 5 seconds.", action: "Retry", dismissible: true }),
    "snackbar-static": () => {
      const el = document.getElementById("static-snackbar");
      el.classList.add("active");
      window.clearTimeout(el._hideTimer);
      el._hideTimer = window.setTimeout(() => el.classList.remove("active"), 4000);
    },
    "snackbar-html-1": () =>
      new Expressive.Snackbar({ snackbarId: "my-snackbar-1", displayLength: Infinity, dismissible: true }),
    "snackbar-html-2": () => new Expressive.Snackbar({ snackbarId: "my-snackbar-2" }),
    "snackbar-callback": () =>
      new Expressive.Snackbar({
        text: "I will call back when dismissed",
        completeCallback: () => new Expressive.Snackbar({ text: "Your snackbar was dismissed" }),
      }),
    "snackbar-rounded": () => new Expressive.Snackbar({ text: "I am a snackbar!", classes: "rounded" }),
    "snackbar-top": () => new Expressive.Snackbar({ text: "Posted from the top", classes: "top" }),
    "snackbar-dismiss-show": () => new Expressive.Snackbar({ text: "I am a snackbar!" }),
    "snackbar-dismiss-one": () =>
      Expressive.Snackbar.getInstance(document.querySelector("#snackbar-container .snackbar"))?.dismiss(),
    "snackbar-dismiss-all": () => Expressive.Snackbar.dismissAll(),
  }).forEach(([id, show]) => document.getElementById(id)?.addEventListener("click", show));

  // Markup sets the other pickers' options; these take values it cannot.
  const datepickerRange = document.getElementById("datepicker-range");
  if (datepickerRange) {
    Expressive.Datepicker.init(datepickerRange, {
      openByDefault: true,
      isDateRange: true,
      dateRangeEndEl: "#datepicker-range-end",
    });
  }

  const timepickerRange = document.getElementById("timepicker-range");
  if (timepickerRange) Expressive.Timepicker.init(timepickerRange, { minTime: "09:00", maxTime: "17:30" });

  document
    .querySelectorAll("#input_text_counter, #textarea_counter")
    .forEach((el) => {
      Expressive.CharacterCounter.init(el);
    });

  const indeterminate = document.getElementById("indeterminate-checkbox");
  if (indeterminate) indeterminate.indeterminate = true;

  const autocompleteData = [
    { id: 12, text: "Apple" },
    { id: 13, text: "Microsoft" },
    { id: 42, text: "Google", image: "https://picsum.photos/id/64/250/250" },
  ];
  const autocompleteInput = document.getElementById("autocomplete-input");
  if (autocompleteInput) {
    Expressive.Autocomplete.init(autocompleteInput, {
      minLength: 0,
      data: autocompleteData,
    });
  }
  const autocompleteMulti = document.getElementById("autocomplete-multi");
  if (autocompleteMulti) {
    Expressive.Autocomplete.init(autocompleteMulti, {
      minLength: 0,
      isMultiSelect: true,
      data: autocompleteData,
    });
  }

  const chipsInitial = document.getElementById("chips-initial");
  if (chipsInitial) {
    Expressive.Chips.init(chipsInitial, {
      allowUserInput: true,
      data: [{ id: "Apple" }, { id: "Microsoft" }, { id: "Google" }],
    });
  }
  const chipsAutocomplete = document.getElementById("chips-autocomplete");
  if (chipsAutocomplete) {
    Expressive.Chips.init(chipsAutocomplete, {
      allowUserInput: true,
      autocompleteOptions: { data: autocompleteData },
    });
  }

  const tooltipDemo = document.getElementById("tooltip-method-demo");
  document
    .getElementById("tooltip-open")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      Expressive.Tooltip.getInstance(tooltipDemo)?.open();
    });
  document
    .getElementById("tooltip-close")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      Expressive.Tooltip.getInstance(tooltipDemo)?.close();
    });
});
