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
  /** The one-line description in the page header and in `llms.txt`. */
  description: string;
  /**
   * The subheading this page sits under in its group's page list. Set it on
   * the first page of each run; the pages after it inherit it until the next.
   */
  section?: string;
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
  pages: DocsPage[];
}

export const NAV: DocsGroup[] = [
  {
    label: "Start",
    icon: "home",
    pages: [
      {
        id: "index",
        label: "Getting started",
        title: "Material Design 3 for the web",
        route: "/getting-started.html",
        description:
          "Build Material Design 3 interfaces from semantic HTML, with light and dark themes and accessible components.",
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
        id: "ai",
        label: "AI agents",
        route: "/ai.html",
        description:
          "Give coding agents the ExpressiveCSS docs, skills, MCP server, and lint checks.",
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
          "Replace removed banners with alerts, snackbars or dialogs.",
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
          "Color roles from the Material Design 3 theme tokens.",
      },
      {
        id: "themes",
        label: "Themes",
        route: "/themes.html",
        description:
          "Light and dark schemes, the theme attribute, and custom tokens.",
      },
      {
        id: "tokens",
        label: "Design tokens",
        route: "/tokens.html",
        description:
          "Every token family in one place: color, type, state, motion, shape, elevation and stacking.",
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
        id: "glass",
        label: "Frosted glass",
        route: "/glass.html",
        description:
          "Blur the page behind floating surfaces with one custom property.",
      },
      {
        id: "grid",
        label: "Grid",
        route: "/grid.html",
        description:
          "Lay out a page with the ExpressiveCSS CSS Grid classes.",
      },
      {
        id: "helpers",
        label: "Helpers",
        route: "/helpers.html",
        description:
          "Helper classes for alignment, visibility, spacing, and common CSS properties.",
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
          "Images and videos that resize to fit the screen.",
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
        id: "mega_menu",
        label: "Mega menu",
        route: "/mega-menu.html",
        description:
          "Site navigation whose top items open wide panels of grouped links, on native popovers.",
      },
      {
        id: "menubar",
        label: "Menubar",
        route: "/menubar.html",
        description:
          "An application's row of menus, such as File, Edit and View, with the menubar keyboard contract.",
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
        section: "Actions",
        label: "Buttons",
        route: "/buttons.html",
        description:
          "Material Design 3 common buttons, icon buttons, and FABs, from the HTML.",
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
        section: "Containment",
        label: "Cards",
        route: "/cards.html",
        description:
          "Material Design 3 cards, from the HTML.",
      },
      {
        id: "aura",
        label: "Aura",
        route: "/aura.html",
        description:
          "A light that runs around the border of the one button or card a screen most needs you to see.",
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
        id: "message_scroller",
        label: "Message scroller",
        route: "/message-scroller.html",
        description:
          "A chat scroll container that anchors turns, follows streamed replies and keeps its place as history loads.",
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
        section: "Data and charts",
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
        id: "description_list",
        label: "Description list",
        route: "/description-list.html",
        description:
          "A record's details as label and value pairs, in two columns that stack on compact screens.",
      },
      {
        id: "kpi",
        label: "KPI",
        route: "/kpi.html",
        description:
          "One key figure in a card, with a trend chip, a sparkline and details.",
      },
      {
        id: "countdown",
        label: "Countdown",
        route: "/countdown.html",
        description:
          "A number from 0 to 999 whose digits roll to each new value.",
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
        id: "calendar",
        label: "Calendar",
        route: "/calendar.html",
        description:
          "A month of days with their events, on a table the page renders.",
      },
      {
        id: "dialogs",
        section: "Dialogs and sheets",
        label: "Dialogs",
        route: "/dialogs.html",
        description:
          "Important prompts in a user flow, each for a single task.",
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
          "The bar that marks a thing as draggable. It does not do the dragging.",
      },
      {
        id: "badges",
        section: "Communication",
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
        id: "org-chart",
        label: "Organization chart",
        route: "/org-chart.html",
        description:
          "A reporting line drawn top down, with each person as a card under their manager.",
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
        id: "tour",
        label: "Tour",
        route: "/tour.html",
        description:
          "A card that walks people through an interface one step at a time, beside each element it explains.",
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
        id: "alert",
        label: "Alert",
        route: "/alert.html",
        description:
          "A message that stays in the page next to the content it is about, with optional actions.",
      },
      {
        id: "carousel",
        section: "Media and motion",
        label: "Carousel",
        route: "/carousel.html",
        description:
          "Material 3 adaptive carousels for visual collections.",
      },
      {
        id: "image_compare",
        label: "Image compare",
        route: "/image-compare.html",
        description:
          "Two images of the same scene with a divider that reveals one over the other.",
      },
      {
        id: "marquee",
        label: "Marquee",
        route: "/marquee.html",
        description:
          "A row of logos, images or text that scrolls without end.",
      },
      {
        id: "confetti",
        label: "Confetti",
        route: "/confetti.html",
        description:
          "Bursts of theme-colored confetti for a moment worth celebrating.",
      },
      {
        id: "particles",
        label: "Particles",
        route: "/particles.html",
        description:
          "Drifting dots behind a section that lean toward the pointer.",
      },
      {
        id: "media",
        label: "Lightbox",
        title: "Media",
        route: "/media.html",
        description:
          "Enlarge an image in a lightbox when it is clicked.",
      },
      {
        id: "map",
        label: "Map",
        route: "/map.html",
        description:
          "An interactive map with markers, popups, routes, arcs, clusters and controls, built on MapLibre.",
      },
      {
        id: "toolbars",
        section: "Search and commands",
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
        id: "rich_text_editor",
        label: "Rich text editor",
        route: "/rich-text-editor.html",
        description:
          "A text field with a formatting toolbar for writing headings, lists and styled text, built on Tiptap.",
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
        id: "color-swatches",
        label: "Color swatches",
        route: "/color-swatches.html",
        description:
          "Pick one color from a preset palette, on native radio buttons.",
      },
      {
        id: "color-picker",
        label: "Color picker",
        route: "/color-picker.html",
        description:
          "Choose any color with a saturation and brightness area, a hue slider and a hex field, over a native color input.",
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
          "Select a value from a range.",
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
      {
        id: "keypad",
        label: "Keypad",
        title: "Keypad and Keyboard",
        route: "/keypad.html",
        description:
          "On-screen keys that type into a text field: a PIN or dial pad, or a full keyboard.",
      },
      {
        id: "questionnaire",
        label: "Questionnaire",
        route: "/questionnaire.html",
        description:
          "A form that asks one question at a time, with single and multiple choice, free text and skippable questions.",
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
