/**
 * The documentation page catalogue: every canonical page, its navigation group,
 * its titles, its published route and its legacy aliases.
 *
 * The only page inventory (ADR 0003): the Astro pages, the navigation, the footer,
 * the compatibility redirects and `llms.txt` all read it, and
 * `scripts/verify-site.mjs` checks the built site against it.
 */

/** One documented page. */
export interface DocsPage {
  /** Stable page identity, normally the Astro page basename. */
  id: string;
  /** Link text in the navigation, the footer and `llms.txt`. */
  label: string;
  /** Heading and `<title>`, when the page calls itself something other than its `label`. */
  title?: string;
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

/** One navigation/footer group. */
export interface DocsGroup {
  label: string;
  icon: string;
  blurb?: string;
  pages: DocsPage[];
}

export const NAV: DocsGroup[] = [
  {
    label: "Start",
    icon: "home",
    blurb:
      "If ExpressiveCSS has helped you ship a project, open issues and send pull requests to keep the framework moving.",
    pages: [
      {
        id: "index",
        label: "Getting started",
        route: "/getting-started.html",
        description:
          "Learn how to start using Expressive and integrate it into your project.",
        aliases: ["/index.html"],
      },
      {
        id: "layouts",
        label: "Layout templates",
        route: "/layouts.html",
        description:
          "Preview and copy complete app layouts with navigation, panes, and responsive grids.",
      },
      {
        id: "auto_init",
        label: "Auto Init",
        route: "/auto-init.html",
        description:
          "Initialize every registered component with one function call.",
      },
      {
        id: "banners",
        label: "Banner migration",
        route: "/banners.html",
        description:
          "Replace removed banners with inline messages, snackbars or dialogs.",
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
        id: "scroll-area",
        label: "Scroll area",
        route: "/scroll-area.html",
        description:
          "Style native scrollbars across browsers without replacing native scrolling.",
      },
      {
        id: "shapes",
        label: "Shapes",
        route: "/shapes.html",
        description:
          "Cut images, videos, and buttons to rounded expressive shapes with one class.",
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
        aliases: ["/sidenav.html", "/collapsible.html"],
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
        id: "stepper",
        label: "Stepper",
        route: "/stepper.html",
        description:
          "Progress through a fixed sequence of steps, such as a checkout, with each step's state.",
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
      {
        id: "tree",
        label: "Tree",
        route: "/tree.html",
        description:
          "Nested lists of folders and links that open in place, for file browsers and deep navigation.",
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
        id: "button_groups",
        label: "Button groups",
        route: "/button-groups.html",
        description:
          "Related buttons that bump and reshape against each other, in two variants and five sizes.",
        aliases: ["/segmented-buttons.html"],
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
        id: "message",
        label: "Message",
        route: "/message.html",
        description:
          "One message in a conversation, with an optional avatar, header and footer.",
      },
      {
        id: "accordion",
        label: "Accordion",
        route: "/accordion.html",
        description:
          "Stacked disclosures that open one section of content at a time, on native details.",
      },
      {
        id: "data_table",
        label: "Data table",
        route: "/data-table.html",
        description:
          "Rows of records in a scrolling table with a sticky header, sort state and row selection.",
      },
      {
        id: "stat",
        label: "Stat",
        route: "/stat.html",
        description:
          "Key figures in tiles, each with a label, a value and an optional change.",
      },
      {
        id: "line-chart",
        label: "Line chart",
        route: "/line-chart.html",
        description:
          "Trends over time drawn from a data table, with a tooltip, a legend and a sparkline size.",
      },
      {
        id: "column-chart",
        label: "Column chart",
        route: "/column-chart.html",
        description:
          "Values compared across categories or periods, drawn as columns from a data table, grouped or stacked.",
      },
      {
        id: "bar-chart",
        label: "Bar chart",
        route: "/bar-chart.html",
        description:
          "Ranked or long-labelled categories drawn as horizontal bars from a data table, grouped, stacked or as a meter.",
      },
      {
        id: "pie-chart",
        label: "Pie chart",
        route: "/pie-chart.html",
        description:
          "Parts of a whole drawn as slices from a data table, as a pie or a donut with its total.",
      },
      {
        id: "heatmap-chart",
        label: "Heatmap chart",
        route: "/heatmap-chart.html",
        description:
          "A data table drawn as a grid of cells shaded by value, for patterns across two categories such as days and hours.",
      },
      {
        id: "radar-chart",
        label: "Radar chart",
        route: "/radar-chart.html",
        description:
          "Several measures on one scale drawn as shapes on spokes from a data table, one shape per series.",
      },
      {
        id: "radial-chart",
        label: "Radial chart",
        route: "/radial-chart.html",
        description:
          "Progress toward a goal drawn as rings from a data table, as concentric rings or a half-circle gauge.",
      },
      {
        id: "mixed-chart",
        label: "Mixed chart",
        route: "/mixed-chart.html",
        description:
          "Columns, lines and areas together from one data table, with a second scale for values in other units.",
      },
      {
        id: "timeline",
        label: "Timeline",
        route: "/timeline.html",
        description:
          "Events in order, each with a time, a title and details, joined by a line.",
      },
      {
        id: "dialogs",
        label: "Dialogs",
        route: "/dialogs.html",
        description:
          "Important prompts in a user flow. Dedicated to a single task.",
        aliases: ["/floating-sheet.html", "/modals.html"],
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
        id: "avatar",
        label: "Avatar",
        route: "/avatar.html",
        description:
          "A person or account as a circular image, initials or icon, alone or in an overlapping group.",
      },
      {
        id: "tooltips",
        label: "Tooltips",
        route: "/tooltips.html",
        description:
          "Material Design 3 tooltips, from the HTML.",
      },
      {
        id: "popover",
        label: "Popover",
        route: "/popover.html",
        description:
          "A panel that opens from a button and stays until dismissed, on the native popover attribute.",
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
        id: "skeleton",
        label: "Skeleton",
        route: "/skeleton.html",
        description:
          "Placeholder shapes that hold the layout while content loads.",
      },
      {
        id: "empty_state",
        label: "Empty state",
        route: "/empty-state.html",
        description:
          "What a view shows when it has nothing to list: an icon, a heading, text and actions.",
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
        aliases: ["/bottom-app-bar.html"],
      },
      {
        id: "search",
        label: "Search",
        route: "/search.html",
        description:
          "A search bar, and the view it expands into.",
      },
      {
        id: "command_palette",
        label: "Command palette",
        route: "/command-palette.html",
        description:
          "A searchable list of commands in a dialog, opened from anywhere with a shortcut.",
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
        id: "drop_zone",
        label: "Drop zone",
        route: "/drop-zone.html",
        description:
          "A large target for choosing or dropping files, with a list of what was chosen.",
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
        id: "rating",
        label: "Rating",
        route: "/rating.html",
        description:
          "Stars for choosing or showing a score, on native radio buttons.",
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
