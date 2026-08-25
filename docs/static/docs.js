// Docs-site glue. The framework bundle only self-initializes Forms/Chips/Waves/
// Range/Cards; everything else needs an explicit AutoInit pass.
document.addEventListener("DOMContentLoaded", () => {
  Expressive.AutoInit();

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

  const DEFAULT_SOURCE = "#006a79";
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

  document.getElementById("wave-trigger")?.addEventListener("click", () => {
    Expressive.Waves.renderWaveEffect(
      document.querySelector(".wave-demo"),
      null,
      { r: 255, g: 0, b: 0 },
    );
  });

  const menuLeft = document.getElementById("menu-left-trigger");
  if (menuLeft) {
    Expressive.Menu.init(menuLeft, {
      alignment: "left",
      constrainWidth: false,
    });
  }

  ["menu-standard-trigger", "menu-grouped-trigger"].forEach((id) => {
    const trigger = document.getElementById(id);
    if (trigger) {
      Expressive.Menu.init(trigger, { constrainWidth: false });
    }
  });

  const menuRight = document.getElementById("menu-right-trigger");
  if (menuRight) {
    Expressive.Menu.init(menuRight, {
      alignment: "right",
      constrainWidth: false,
    });
  }

  const menuHover = document.getElementById("menu-hover-trigger");
  if (menuHover) {
    Expressive.Menu.init(menuHover, {
      hover: true,
      constrainWidth: false,
    });
  }

  const menuNested = document.getElementById("menu-nested-trigger");
  if (menuNested) {
    Expressive.Menu.init(menuNested, {
      constrainWidth: false,
      coverTrigger: false,
    });
  }

  const menuRich = document.getElementById("menu-rich-trigger");
  if (menuRich) {
    Expressive.Menu.init(menuRich, { constrainWidth: false });
  }

  const menuVibrant = document.getElementById("menu-vibrant-trigger");
  if (menuVibrant) {
    Expressive.Menu.init(menuVibrant, { constrainWidth: false });
  }

  const sliders = document.querySelectorAll(".slider");
  if (sliders.length && Expressive.Slider) {
    Expressive.Slider.init(sliders);
  }

  const carouselContent = document.getElementById("carousel-content");
  if (carouselContent) {
    Expressive.Carousel.init(carouselContent, { indicators: true });
  }
  document.getElementById("carousel-prev")?.addEventListener("click", () => {
    Expressive.Carousel.getInstance(
      document.getElementById("carousel-intro"),
    )?.prev();
  });
  document.getElementById("carousel-next")?.addEventListener("click", () => {
    Expressive.Carousel.getInstance(
      document.getElementById("carousel-intro"),
    )?.next();
  });

  const slideOut = document.getElementById("slide-out");
  if (slideOut) {
    Expressive.Sidenav.init(slideOut);
  }

  const slideOutRight = document.getElementById("slide-out-right");
  if (slideOutRight) {
    Expressive.Sidenav.init(slideOutRight, { edge: "right" });
  }

  const swipeTabs = document.getElementById("tabs-swipe");
  if (swipeTabs) {
    Expressive.Tabs.init(swipeTabs, { swipeable: true });
  }

  document.getElementById("snackbar-basic")?.addEventListener("click", () => {
    new Expressive.Snackbar({ text: "Photo saved to album" });
  });

  document.getElementById("snackbar-action")?.addEventListener("click", () => {
    new Expressive.Snackbar({
      text: "Item archived",
      action: "Undo",
      onAction: () => {
        new Expressive.Snackbar({ text: "Item restored" });
      },
    });
  });

  document.getElementById("snackbar-close")?.addEventListener("click", () => {
    new Expressive.Snackbar({
      text: "Can't send photo. Retry in 5 seconds.",
      action: "Retry",
      dismissible: true,
    });
  });

  document.getElementById("snackbar-static")?.addEventListener("click", () => {
    const el = document.getElementById("static-snackbar");
    if (!el) return;
    el.classList.add("active");
    window.clearTimeout(el._hideTimer);
    el._hideTimer = window.setTimeout(
      () => el.classList.remove("active"),
      4000,
    );
  });

  document.getElementById("snackbar-html-1")?.addEventListener("click", () => {
    new Expressive.Snackbar({ snackbarId: "my-snackbar-1" });
  });

  document.getElementById("snackbar-html-2")?.addEventListener("click", () => {
    new Expressive.Snackbar({ snackbarId: "my-snackbar-2" });
  });

  document
    .getElementById("snackbar-callback")
    ?.addEventListener("click", () => {
      new Expressive.Snackbar({
        text: "I will call back when dismissed",
        completeCallback: () => {
          new Expressive.Snackbar({ text: "Your snackbar was dismissed" });
        },
      });
    });

  document.getElementById("snackbar-rounded")?.addEventListener("click", () => {
    new Expressive.Snackbar({ text: "I am a snackbar!", classes: "rounded" });
  });

  document.getElementById("snackbar-top")?.addEventListener("click", () => {
    new Expressive.Snackbar({ text: "Posted from the top", classes: "top" });
  });

  document
    .getElementById("snackbar-dismiss-show")
    ?.addEventListener("click", () => {
      new Expressive.Snackbar({ text: "I am a snackbar!" });
    });

  document
    .getElementById("snackbar-dismiss-one")
    ?.addEventListener("click", () => {
      const snackbarElement = document.querySelector(
        "#snackbar-container .snackbar",
      );
      Expressive.Snackbar.getInstance(snackbarElement)?.dismiss();
    });

  document
    .getElementById("snackbar-dismiss-all")
    ?.addEventListener("click", () => {
      Expressive.Snackbar.dismissAll();
    });

  const initDatepicker = (id, options) => {
    const el = document.getElementById(id);
    if (el) Expressive.Datepicker.init(el, options);
  };
  initDatepicker("datepicker-intro", { openByDefault: true });
  initDatepicker("datepicker-range", {
    openByDefault: true,
    isDateRange: true,
    dateRangeEndEl: "#datepicker-range-end",
  });
  initDatepicker("datepicker-multi", {
    openByDefault: true,
    isMultipleSelection: true,
  });

  const timepicker24 = document.getElementById("timepicker-24");
  if (timepicker24) {
    Expressive.Timepicker.init(timepicker24, { twelveHour: false });
  }

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

  const chipsEmpty = document.getElementById("chips-empty");
  if (chipsEmpty) {
    Expressive.Chips.init(chipsEmpty, { allowUserInput: true });
  }
  const chipsInitial = document.getElementById("chips-initial");
  if (chipsInitial) {
    Expressive.Chips.init(chipsInitial, {
      allowUserInput: true,
      data: [{ id: "Apple" }, { id: "Microsoft" }, { id: "Google" }],
    });
  }
  const chipsPlaceholder = document.getElementById("chips-placeholder");
  if (chipsPlaceholder) {
    Expressive.Chips.init(chipsPlaceholder, {
      allowUserInput: true,
      placeholder: "Enter a tag",
      secondaryPlaceholder: "+Tag",
    });
  }
  const chipsAutocomplete = document.getElementById("chips-autocomplete");
  if (chipsAutocomplete) {
    Expressive.Chips.init(chipsAutocomplete, {
      allowUserInput: true,
      autocompleteOptions: {
        data: [
          { id: 12, text: "Apple" },
          { id: 13, text: "Microsoft" },
          {
            id: 42,
            text: "Google",
            image: "https://picsum.photos/id/64/250/250",
          },
        ],
      },
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
