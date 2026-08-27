/**
 * The documentation page catalogue: every canonical page, its navigation group,
 * its titles, its published route and its legacy aliases.
 *
 * The only page inventory (ADR 0003): the Astro pages, the drawer, the footer,
 * the compatibility redirects and `llms.txt` all read it, and
 * `scripts/verify-site.mjs` checks the built site against it.
 */

/** One documented page. */
export interface DocsPage {
  /** Stable page identity, normally the Astro page basename. */
  id: string;
  /** Link text in the drawer, the footer and `llms.txt`. */
  label: string;
  /** Heading and `<title>`, when the page calls itself something other than its `label`. */
  title?: string;
  /** Leading icon, on the flat top-level entries that carry one. */
  icon?: string;
  /** The published path. Root-absolute, always `.html` -- these URLs are in search results. */
  route: string;
  /** The one-line description in the page banner and in `llms.txt`. */
  description: string;
  /**
   * Other published paths that resolve here: the legacy routes kept for
   * compatibility, and — for the landing page — the canonical site root.
   */
  aliases?: string[];
}

/** One drawer/footer group. A group with no `icon` renders flat. */
export interface DocsGroup {
  label: string;
  icon: string | null;
  blurb?: string;
  pages: DocsPage[];
}

export const NAV: DocsGroup[] = [
  {
    label: "Start",
    icon: null,
    blurb:
      "If ExpressiveCSS has helped you ship a project, open issues and send pull requests to keep the framework moving.",
    pages: [
      {
        id: "index",
        label: "Getting started",
        icon: "home",
        route: "/getting-started.html",
        description:
          "Learn how to start using Expressive and integrate it into your project.",
        aliases: ["/index.html"],
      },
      {
        id: "auto_init",
        label: "Auto Init",
        icon: "bolt",
        route: "/auto-init.html",
        description:
          "Initialize every registered component with one function call.",
      },
    ],
  },
  {
    label: "Foundations",
    icon: "palette",
    pages: [
      {
        id: "color",
        label: "Color",
        route: "/color.html",
        description:
          "One system: the Material Design 3 theme tokens.",
      },
      {
        id: "themes",
        label: "Themes",
        route: "/themes.html",
        description:
          "Light and dark schemes, the theme attribute, and custom tokens.",
      },
      {
        id: "typography",
        label: "Typography",
        route: "/typography.html",
        description:
          "Material Design 3 type, from the HTML.",
      },
      {
        id: "icons",
        label: "Icons",
        route: "/icons.html",
        description:
          "Material Symbols, outlined by default. Axes and style are CSS variables.",
      },
      {
        id: "shadow",
        label: "Elevation",
        title: "Shadow",
        route: "/shadow.html",
        description:
          "Raise or flatten an element with the z-depth elevation classes.",
      },
      {
        id: "grid",
        label: "Grid",
        route: "/grid.html",
        description:
          "Use Expressive's CSS Grid system to format a page in an ordered, comfortable way.",
      },
      {
        id: "helpers",
        label: "Helpers",
        route: "/helpers.html",
        description:
          "An overview of the helper classes for alignment, visibility, spacing, and common CSS properties.",
      },
      {
        id: "media_css",
        label: "Media styles",
        title: "Media Styles",
        route: "/media-css.html",
        description:
          "Responsive images and videos ready to be seen on many devices.",
      },
      {
        id: "table",
        label: "Table",
        route: "/table.html",
        description:
          "Organize data with a few utility classes on a standard HTML table.",
      },
      {
        id: "css_transitions",
        label: "Transitions",
        route: "/css-transitions.html",
        description:
          "Animate content in and out with a few CSS classes.",
      },
      {
        id: "state_layers",
        label: "State layers",
        route: "/state-layers.html",
        description:
          "The translucent overlay a component paints over itself for hover, focus, pressed and dragged.",
      },
    ],
  },
  {
    label: "Structure",
    icon: "view_quilt",
    pages: [
      {
        id: "navbar",
        label: "App bar",
        title: "Navbar",
        route: "/navbar.html",
        description:
          "Material Design 3 top app bars, from the HTML.",
      },
      {
        id: "bottom_app_bar",
        label: "Bottom app bar",
        route: "/bottom-app-bar.html",
        description:
          "This screen's commands at the bottom edge, with an optional FAB — not its destinations.",
      },
      {
        id: "navigation_bar",
        label: "Navigation bar",
        route: "/navigation-bar.html",
        description:
          "Switch between UI views on compact and medium screens.",
      },
      {
        id: "navigation_rail",
        label: "Navigation rail",
        route: "/navigation-rail.html",
        description:
          "Switch between UI views on mid-sized devices.",
      },
      {
        id: "sidenav",
        label: "Sidenav",
        title: "NavigationDrawer",
        route: "/sidenav.html",
        description:
          "A slide-out menu, or a fixed sidebar on Expanded and wider screens.",
        aliases: ["/collapsible.html"],
      },
      {
        id: "panes",
        label: "Panes",
        route: "/panes.html",
        description:
          "Material 3 canonical layouts, from the HTML.",
      },
      {
        id: "footer",
        label: "Footer",
        route: "/footer.html",
        description:
          "Site navigation and extra information at the end of a page.",
      },
      {
        id: "tabs",
        label: "Tabs",
        route: "/tabs.html",
        description:
          "Material Design 3 tabs, from the HTML.",
      },
      {
        id: "breadcrumbs",
        label: "Breadcrumbs",
        route: "/breadcrumbs.html",
        description:
          "The path to this page, from the HTML.",
      },
      {
        id: "pagination",
        label: "Pagination",
        route: "/pagination.html",
        description:
          "A list of pages. The HTML is the component.",
      },
      {
        id: "menu",
        label: "Menu",
        route: "/menu.html",
        description:
          "Material Design 3 menus, from the HTML.",
        aliases: ["/dropdown.html"],
      },
      {
        id: "scrollspy",
        label: "Scrollspy",
        route: "/scrollspy.html",
        description:
          "Highlight the table of contents as the page scrolls.",
      },
    ],
  },
  {
    label: "Components",
    icon: "widgets",
    pages: [
      {
        id: "buttons",
        label: "Buttons",
        route: "/buttons.html",
        description:
          "Material Design 3 common buttons, icon buttons, and FABs — from the HTML.",
      },
      {
        id: "icon_buttons",
        label: "Icon buttons",
        route: "/icon-buttons.html",
        description:
          "A single icon as the whole control, in four styles and five sizes.",
      },
      {
        id: "segmented_buttons",
        label: "Segmented buttons",
        route: "/segmented-buttons.html",
        description:
          "Two to five connected options, one choice or several, with no script behind them.",
      },
      {
        id: "button_groups",
        label: "Button groups",
        route: "/button-groups.html",
        description:
          "Related buttons that bump and reshape against each other, in two variants and five sizes.",
      },
      {
        id: "split_button",
        label: "Split button",
        route: "/split-button.html",
        description:
          "A lead action and a trailing half that opens a menu of related ones, in five sizes.",
      },
      {
        id: "floating_action_button",
        label: "FAB",
        title: "Floating Action Button",
        route: "/floating-action-button.html",
        description:
          "A circular action that can open a menu of related shortcuts.",
      },
      {
        id: "cards",
        label: "Cards",
        route: "/cards.html",
        description:
          "Material Design 3 cards, from the HTML.",
      },
      {
        id: "lists",
        label: "Lists",
        route: "/lists.html",
        description:
          "Continuous vertical indexes of text and images.",
        aliases: ["/collections.html"],
      },
      {
        id: "dialogs",
        label: "Dialogs",
        route: "/dialogs.html",
        description:
          "Important prompts in a user flow. Dedicated to a single task.",
        aliases: ["/modals.html"],
      },
      {
        id: "bottom_sheet",
        label: "Bottom sheet",
        route: "/bottom-sheet.html",
        description:
          "Secondary content anchored to the bottom of the screen.",
      },
      {
        id: "side_sheet",
        label: "Side sheet",
        route: "/side-sheet.html",
        description:
          "Optional content and actions, without interrupting the main view.",
      },
      {
        id: "floating_sheet",
        label: "Floating sheet",
        route: "/floating-sheet.html",
        description:
          "Secondary content on a surface that floats free of every window edge.",
      },
      {
        id: "drag_handle",
        label: "Drag handle",
        route: "/drag-handle.html",
        description:
          "The bar that says a thing can be dragged — and nothing that does the dragging.",
      },
      {
        id: "badges",
        label: "Badges",
        route: "/badges.html",
        description:
          "Notifications, counts, or status on navigation items and icons.",
      },
      {
        id: "tooltips",
        label: "Tooltips",
        route: "/tooltips.html",
        description:
          "Material Design 3 tooltips, from the HTML.",
      },
      {
        id: "snackbar",
        label: "Snackbar",
        route: "/snackbar.html",
        description:
          "Material Design 3 snackbars, from the HTML.",
        aliases: ["/toasts.html"],
      },
      {
        id: "banners",
        label: "Banners",
        route: "/banners.html",
        description:
          "A prominent message that stays put until the user deals with it.",
      },
      {
        id: "preloader",
        label: "Preloader",
        route: "/preloader.html",
        description:
          "Activity and progress. The HTML is the indicator.",
      },
      {
        id: "loading_indicator",
        label: "Loading indicator",
        route: "/loading-indicator.html",
        description:
          "A shape that morphs while it spins, for waits under five seconds.",
      },
      {
        id: "carousel",
        label: "Carousel",
        route: "/carousel.html",
        description:
          "Material 3 adaptive carousels for visual collections.",
      },
      {
        id: "media",
        label: "Lightbox",
        title: "Media",
        route: "/media.html",
        description:
          "Lightbox for enlarge-on-click images.",
      },
      {
        id: "toolbars",
        label: "Toolbars",
        route: "/toolbars.html",
        description:
          "Frequently used actions for the current page.",
      },
      {
        id: "search",
        label: "Search",
        route: "/search.html",
        description:
          "A search bar, and the view it expands into.",
      },
    ],
  },
  {
    label: "Forms",
    icon: "edit",
    pages: [
      {
        id: "fieldsets",
        label: "Fieldsets",
        route: "/fieldsets.html",
        description:
          "Grouped form sections, from the HTML.",
      },
      {
        id: "text_inputs",
        label: "Text fields",
        title: "Text Inputs",
        route: "/text-inputs.html",
        description:
          "Material Design 3 text fields, from the HTML.",
      },
      {
        id: "select",
        label: "Select",
        route: "/select.html",
        description:
          "Choose one option, or several, from a styled menu.",
      },
      {
        id: "checkboxes",
        label: "Checkboxes",
        route: "/checkboxes.html",
        description:
          "Material Design 3 checkboxes, from the HTML.",
      },
      {
        id: "radio_buttons",
        label: "Radio",
        title: "Radio Buttons",
        route: "/radio-buttons.html",
        description:
          "Material Design 3 radios, from the HTML.",
      },
      {
        id: "switches",
        label: "Switches",
        route: "/switches.html",
        description:
          "Material Design 3 switches, from the HTML.",
      },
      {
        id: "sliders",
        label: "Slider",
        route: "/slider.html",
        description:
          "Selections from a range of values.",
        aliases: ["/range.html"],
      },
      {
        id: "chips",
        label: "Chips",
        route: "/chips.html",
        description:
          "Small blocks for contacts, tags, and filters.",
      },
      {
        id: "autocomplete",
        label: "Autocomplete",
        route: "/autocomplete.html",
        description:
          "Suggest values under a text field as the user types.",
      },
      {
        id: "datepicker",
        label: "Date picker",
        title: "Date Picker",
        route: "/datepicker.html",
        description:
          "Select a date, a range, or several dates from a calendar.",
      },
      {
        id: "timepicker",
        label: "Time picker",
        title: "Time Picker",
        route: "/timepicker.html",
        description:
          "Pick a time from a clock face, in 12-hour or 24-hour form.",
      },
    ],
  },
];

/** Every canonical page, in navigation order. */
export const PAGES: DocsPage[] = NAV.flatMap((group) => group.pages);

/** Every legacy path, paired with the canonical route it resolves to. */
export const ALIASES: { from: string; to: string }[] = PAGES.flatMap((page) =>
  (page.aliases ?? []).map((from) => ({ from, to: page.route })),
);
