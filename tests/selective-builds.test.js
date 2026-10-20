import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { compile, compileString } from 'sass';
import { JSDOM } from 'jsdom';
import { fixtures, consumerBuild, sizes, root } from './fixtures/selective-builds.mjs';

test('modular imports are inert and share the legacy ESM constructors', async () => {
  const dom = new JSDOM('<input type="range"><div class="chips"><span class="chip">Chip<button class="close">Close</button></span></div>');
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const prototype = dom.window.EventTarget.prototype;
  const add = prototype.addEventListener;
  let listeners = 0;
  try {
    await new Promise(resolve => dom.window.addEventListener('load', resolve, { once: true }));
    globalThis.document = dom.window.document;
    prototype.addEventListener = function (...args) { listeners++; return add.apply(this, args); };
    const before = document.body.innerHTML;
    const modular = await import('../dist/js/modular.mjs');
    assert.equal(listeners, 0);
    assert.equal(document.body.innerHTML, before);
    assert.equal(document.querySelector('input').Expressive_Slider, undefined);
    delete globalThis.document;
    const legacy = await import('../dist/js/expressive.mjs');
    assert.deepEqual(Object.keys(modular), Object.keys(legacy));
    for (const key of Object.keys(modular)) assert.equal(modular[key], legacy[key], key);
  } finally {
    prototype.addEventListener = add;
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
    dom.window.close();
  }
});

test('selective consumer builds remove unused components and reduce transfers', async t => {
  const report = {};
  for (const name of Object.keys(fixtures)) {
    const full = await consumerBuild(name, false);
    const selective = await consumerBuild(name, true);
    for (const asset of ['js', 'css']) {
      for (const encoding of ['raw', 'gzip', 'brotli']) {
        assert.ok(selective.sizes[asset][encoding] < full.sizes[asset][encoding], `${name} ${asset} ${encoding}`);
      }
    }
    assert.doesNotMatch(selective.js, /Expressive_Timepicker|Expressive_NavigationDrawer/);
    if (name === 'tabs') assert.doesNotMatch(selective.js, /Expressive_Datepicker|Expressive_FormSelect/);
    // Swipeable tabs scroll their own track, so Tabs pulls in no Carousel.
    if (name === 'tabs') assert.doesNotMatch(selective.js, /Expressive_Carousel/);
    assert.match(selective.js, name === 'tabs' ? /Expressive_Tabs/ : /Expressive_Menu/);
    report[name] = { full: full.sizes, selective: selective.sizes };
  }
  mkdirSync(`${root}/.cache/selective-builds`, { recursive: true });
  writeFileSync(`${root}/.cache/selective-builds/sizes.json`, JSON.stringify(report, null, 2));
  t.diagnostic(JSON.stringify(report));
});

test('default custom Sass matches the complete stylesheet and preserves configuration', () => {
  const options = { style: 'compressed', loadPaths: [`${root}/src/sass`], logger: { warn() {} } };
  const full = compile(`${root}/src/sass/expressive.scss`, options).css;
  assert.equal(compile(`${root}/src/sass/custom.scss`, options).css, full);
  const empty = compileString('@use "custom" with ($components: (), $utilities: (), $expressive-include-fonts: false);', options).css;
  assert.match(empty, /@layer tokens,\s*base,\s*components,\s*utilities/);
  assert.match(empty, /:host/);
  assert.match(empty, /--md-sys-color-primary:/);
  assert.doesNotMatch(empty, /@font-face|\.datepicker|\.tabs/);
  assert.doesNotMatch(empty, /\.scroll-area/);
  const seeded = compileString('@use "expressive" with ($md-source: #6750a4, $expressive-include-fonts: false);', options).css;
  assert.match(seeded, /--md-source: ?#6750a4/);
  const scrollArea = compileString('@use "custom" with ($components: (), $utilities: ("scroll-area"), $expressive-include-fonts: false);', options).css;
  assert.match(scrollArea, /\.scroll-area\{overflow:auto;scrollbar-width:thin/);
  assert.doesNotMatch(scrollArea, /\.datepicker|\.tabs|\.overflow-x-auto/);
  const shapes = compileString('@use "custom" with ($components: (), $utilities: ("shapes"), $expressive-include-fonts: false);', options).css;
  const masks = [...shapes.matchAll(/\.shape-([a-z0-9-]+)\{--shape-mask: ?url\("data:image\/svg\+xml,([^"]+)"\)/g)];
  assert.equal(masks.length, 20);
  for (const [, name, svg] of masks) assert.match(decodeURIComponent(svg), /<path d='M[-\d. MLQ]+Z'\/><\/svg>$/, name);
  assert.match(shapes, /:focus-visible::after\{/);
  assert.doesNotMatch(empty, /\.shape-/);
  const fonts = compileString('@use "custom" with ($components: (), $utilities: (), $expressive-font-path: "/assets/fonts");', options).css;
  assert.match(fonts, /url\("?\/assets\/fonts\/material-symbols-outlined.woff2/);
  assert.throws(() => compileString('@use "custom" with ($components: ("missing-component",));', options), /Can't find stylesheet/);
  assert.match(full, /@container style\(--expressive-glass: ?true\)/);
  assert.doesNotMatch(full, /not style\(--expressive-glass/);
  const glass = compileString('@use "custom" with ($components: ("menu"), $utilities: (), $expressive-include-fonts: false, $expressive-glass: true, $expressive-glass-blur: 24px);', options).css;
  assert.match(glass, /@container not style\(--expressive-glass: ?false\)/);
  assert.match(glass, /backdrop-filter:blur\(var\(--expressive-glass-blur, ?24px\)\)/);
  assert.match(glass, /color-mix\(in oklab, ?var\(--md-comp-menu-container-color\) var\(--expressive-glass-opacity, ?72%\), ?transparent\)/);
  assert.match(glass, /@media ?\(prefers-reduced-transparency: ?reduce\), ?\(prefers-contrast: ?more\)/);
  assert.throws(() => compileString('@use "custom" with ($components: ("menu"), $utilities: (), $expressive-glass: true, $expressive-glass-opacity: 0.7);', options), /must be a percentage/);
});

test('complete minified artifacts stay within the reviewed gzip budgets', () => {
  const js = readFileSync(`${root}/dist/js/expressive.min.js`, 'utf8').replace(/^\/\/# sourceMappingURL=.*\n?/m, '');
  const css = readFileSync(`${root}/dist/css/expressive.min.css`, 'utf8').replace(/\/\*# sourceMappingURL=.*?\*\//, '').trimEnd();
  // Reviewed TypeScript roadmap and cross-browser fixes: 45,117 gzip bytes (+475).
  // Reviewed context menus, the password toggle and drop zone behavior: 45,923 gzip bytes (+804).
  // Reviewed the command palette: 47,077 gzip bytes (+1,154).
  // Reviewed fixes to context menus, the palette, the password toggle and drop zone reset: 47,483 gzip bytes (+406).
  // Reviewed context menu bounds and palette filtering fixes: 47,896 gzip bytes (+413).
  // Reviewed the line chart: 49,845 gzip bytes (+1,949).
  // Reviewed stacked line charts: 50,042 gzip bytes (+197).
  // Reviewed the column chart: 50,458 gzip bytes (+416).
  // Reviewed the bar chart: 50,589 gzip bytes (+131).
  // Reviewed bar chart values past short bars and chart taps: 50,714 gzip bytes (+125).
  // Reviewed the pie chart and its review fixes: 52,188 gzip bytes (+1,474).
  // Reviewed the heatmap chart: 53,108 gzip bytes (+920).
  // Reviewed the heatmap legend range fix: 53,190 gzip bytes (+82).
  // Reviewed heatmap hit testing by position, Escape and pointer focus fixes: 53,329 gzip bytes (+139).
  // Reviewed the radar chart and the shared circular chart hooks: 53,801 gzip bytes (+472).
  // Reviewed the radial chart and its review fixes: 54,640 gzip bytes (+839).
  // Reviewed the mixed chart and per-series chart scales: 54,982 gzip bytes (+342).
  // Reviewed the questionnaire and its requestSubmit validation: 56,500 gzip bytes (+1,518).
  // Reviewed the message scroller: 58,242 gzip bytes (+1,742).
  // Reviewed the rich text editor, which leaves Tiptap to the page: 59,024 gzip bytes (+782).
  // Reviewed carousel snapping held off during programmatic scrolls: 59,050 gzip bytes (+26).
  // Reviewed confetti: 60,733 gzip bytes (+1,683).
  // Reviewed particles: 61,568 gzip bytes (+835).
  // Reviewed the map, which leaves MapLibre to the page: 64,375 gzip bytes (+2,807).
  // Reviewed Autocomplete highlighting inside text nodes for unsafe HTML labels: 64,477 gzip bytes (+102).
  // Reviewed hot-path fixes in Datepicker, Autocomplete, Particles, Carousel and Tabs: 64,617 gzip bytes (+140).
  // Reviewed idle document listeners, repeat Init() calls and hot-path fixes in ScrollSpy, MapView, PieChart, Snackbar, Slider, the heatmap, Menu and Datepicker: 64,860 gzip bytes (+243).
  // Reviewed the 0.14.0 version export: 64,861 gzip bytes (+1).
  // Reviewed the Tabs indicator re-measure after web fonts load: 64,881 gzip bytes (+20).
  // Reviewed the keypad and keyboard, with keys in the field: 65,806 gzip bytes (+925).
  // Reviewed Tooltip and Tabs logging bad markup instead of aborting AutoInit: 65,924 gzip bytes (+118).
  // Reviewed Datepicker reading back its own input value without the default parser: 65,996 gzip bytes (+72).
  // Reviewed Autocomplete leaving Space and Enter to its text field: 66,022 gzip bytes (+26).
  // Reviewed the error summary and pane resizing: 66,862 gzip bytes (+840).
  // Reviewed the splitter's padded bounds and keyboard click after a touch drag, and wrapped select labels: 66,897 gzip bytes (+35).
  // Reviewed the menubar, tour, sortable lists and image compare: 69,030 gzip bytes (+2,133).
  // Reviewed the 1.0 alias removal with scroll-snap swipeable tabs: 69,143 gzip bytes (+113).
  // Reviewed swipeable tabs re-aligning only when the track's width changes: 69,170 gzip bytes (+27).
  // Reviewed document behaviors reading composedPath() inside shadow roots: 69,299 gzip bytes (+129).
  // Reviewed keyboard and focus fixes in Tooltip, Menu, Timepicker and Chips: 69,490 gzip bytes (+191).
  // Reviewed Datepicker typed-date, initial-value and reset fixes, Slider reset and Questionnaire skip: 69,877 gzip bytes (+387).
  // Reviewed docked range end input, document-level menu dismissal, MapView coordinate checks, Tour restart and late Autocomplete results: 70,066 gzip bytes (+189).
  // Reviewed NavigationRail scrim taps measured against the rail's box: 70,109 gzip bytes (+43).
  // Reviewed the time picker sizing its clock face from dialRadius: 69,184 gzip bytes (+14).
  // Reviewed tooltips and snackbars in the top layer over modal dialogs: 69,446 gzip bytes (+262).
  // Reviewed keeping the snackbar out of modal dialogs: 69,325 gzip bytes (-121).
  // Reviewed the character counter floating to inline-end: 69,328 gzip bytes (+3).
  // Reviewed reverting the top-layer tooltip and snackbar: 69,187 gzip bytes (-141).
  // Reviewed isRTL mirroring the date picker through the table's dir: 69,191 gzip bytes (+4).
  // Reviewed the carousel keeping its item when later items share the clamped scroll end: 69,203 gzip bytes (+12).
  // Reviewed the TypeScript review fixes from #312 on top of the Sass review fixes: 70,146 gzip bytes (+943).
  // Reviewed dropping the isRTL table dir and the counter's inline float on top of #312: 70,130 gzip bytes (-16).
  // Reviewed navigation rail side panels opening on hover, pinning on click and closing on Escape: 70,556 gzip bytes (+426).
  // Reviewed a side panel destination never becoming the rail's menu toggle: 70,562 gzip bytes (+6).
  // Reviewed the src/ts review fixes across 23 components and behaviors: 72,163 gzip bytes (+1,601).
  // Reviewed Tabs decoding the href too when matching location.hash: 72,173 gzip bytes (+10).
  // Reviewed swipeable Tabs holding a scroll target until the track arrives: 72,196 gzip bytes (+23).
  // Reviewed the lightbox image reading --expressive-z-lightbox: 72,205 gzip bytes (+9).
  // Reviewed the color picker: 73,629 gzip bytes (+1,424).
  // Reviewed the number stepper in the Forms behavior: 73,769 gzip bytes (+140).
  // Reviewed the confetti overlay reading --expressive-z-confetti: 73,788 gzip bytes (+19).
  // Reviewed the tabs indicator reading the spring tokens: 73,840 gzip bytes (+52).
  // Reviewed tooltips anchored with CSS anchor positioning where supported: 74,099 gzip bytes (+259).
  // Reviewed trigger-opened menus anchored with CSS anchor positioning where supported: 74,386 gzip bytes (+287).
  // Reviewed value axes for the line, column, bar, mixed and radar charts: 75,139 gzip bytes (+753).
  // Reviewed modal date and time pickers and spin-button time fields: 75,723 gzip bytes (+584).
  // Reviewed arrow keys for tabs and for lists of link or button rows: 76,142 gzip bytes (+419).
  // Reviewed expandable bottom sheets switching heights by drag and handle: 76,397 gzip bytes (+255).
  // Reviewed pie chart names outside the slices: 76,703 gzip bytes (+306).
  // Reviewed radial chart ring names at each ring's start: 76,892 gzip bytes (+189).
  // Reviewed pie chart leader lines and gauge ring names: 76,978 gzip bytes (+86).
  // Reviewed pie chart data-other grouping small rows: 77,424 gzip bytes (+446).
  // Reviewed radar chart outlines broken at gaps: 77,562 gzip bytes (+138).
  // Reviewed heatmap diverging and stepped scales and scrolling grids: 77,886 gzip bytes (+324).
  // Reviewed mixed chart stacked columns, and line points and straight lines: 77,966 gzip bytes (+80).
  // Reviewed range columns and bars: 78,189 gzip bytes (+223).
  // Reviewed radial chart segments and gradient fills: 78,435 gzip bytes (+246).
  // Reviewed chart review fixes: segment sizes, stacked ranges, diverging bounds and scrolling tooltips: 78,612 gzip bytes (+177).
  // Reviewed keypad caps lock, layers, hardware key highlight and minlength: 78,993 gzip bytes (+381).
  // Reviewed questionnaire shortcuts, review step and saved progress: 80,137 gzip bytes (+1,144).
  // Reviewed time picker hours stepping round the day: 80,229 gzip bytes (+92).
  // Reviewed autocomplete search abort signal: 80,273 gzip bytes (+44).
  // Reviewed component review fixes: keypad messages, safe restores and shortcut counts: 80,455 gzip bytes (+182).
  // Reviewed heatmap row labels kept in view beside scrolling cells: 80,514 gzip bytes (+59).
  // Reviewed radial gradients that follow the ring: 80,699 gzip bytes (+185).
  // Reviewed runtime spring snap-back for dragged sheets: 81,309 gzip bytes (+610).
  // Reviewed sheet springs ending on close, reduced motion and token overrides: 81,465 gzip bytes (+156).
  // Reviewed shared anchor names, 24-hour time inputs and Tab closing the lightbox: 81,637 gzip bytes (+172).
  // Reviewed expressive:* open and close events with state guards: 81,781 gzip bytes (+144).
  // Reviewed change, select, confirm, cancel, autocomplete and chip events: 82,098 gzip bytes (+317).
  // Reviewed Tooltip, Snackbar, ButtonGroup, ScrollSpy, Tour and Copy events: 82,285 gzip bytes (+187).
  assert.ok(sizes(js).gzip <= 82285, `JavaScript gzip: ${sizes(js).gzip}`);
  // Reviewed accordion, data table, avatar, skeleton and empty state: 50,062 gzip bytes (+387).
  // Reviewed popover, stepper, drop zone and text field add-ons: 51,878 gzip bytes (+1,816).
  // Reviewed timeline, stat, tree, rating, command palette and the kbd keycap: 53,687 gzip bytes (+1,809).
  // Reviewed the disabled star fix: 53,701 gzip bytes (+14).
  // Reviewed disabled palette commands and the RTL popover actions: 53,745 gzip bytes (+44).
  // Reviewed the line chart: 54,625 gzip bytes (+880).
  // Reviewed stacked line charts: 54,635 gzip bytes (+10).
  // Reviewed the column chart: 55,374 gzip bytes (+739).
  // Reviewed the bar chart: 56,396 gzip bytes (+1,022).
  // Reviewed bar chart values past short bars and forced colors: 56,532 gzip bytes (+136).
  // Reviewed the pie chart: 57,343 gzip bytes (+811).
  // Reviewed the heatmap chart: 58,042 gzip bytes (+699).
  // Reviewed heatmap text contrast and the legend range: 58,097 gzip bytes (+55).
  // Reviewed heatmap row label width and gap swatches: 58,103 gzip bytes (+6).
  // Reviewed the radar chart and its label room: 58,869 gzip bytes (+766).
  // Reviewed the radial chart and its review fixes: 59,469 gzip bytes (+600).
  // Reviewed the mixed chart: 60,187 gzip bytes (+718).
  // Reviewed the twenty .shape-* masks: 63,077 gzip bytes (+2,890).
  // Reviewed the height-derived selected button-group corner: 63,119 gzip bytes (+42).
  // Reviewed the aura and its stepped turn for shadow-only loads: 63,985 gzip bytes (+866).
  // Reviewed the countdown digit strips: 64,561 gzip bytes (+576).
  // Reviewed the KPI card: 65,104 gzip bytes (+543).
  // Reviewed the questionnaire: 65,569 gzip bytes (+465).
  // Reviewed the message scroller: 65,721 gzip bytes (+152).
  // Reviewed the marquee: 66,079 gzip bytes (+358).
  // Reviewed the rich text editor: 66,394 gzip bytes (+315).
  // Reviewed <mark> and ::highlight(mark): 66,424 gzip bytes (+30).
  // Reviewed the inline legacy checkbox span: 66,444 gzip bytes (+20).
  // Reviewed the particles canvas: 66,461 gzip bytes (+17).
  // Reviewed the map: 67,259 gzip bytes (+798).
  // Reviewed the 48dp table-of-contents item height token: 67,269 gzip bytes (+10).
  // Reviewed the keypad and keyboard, with two-cell wide keys, a number row and the shared spring: 68,158 gzip bytes (+889).
  // Reviewed the description list, data table bulk actions and row expansion, and resizable panes: 68,410 gzip bytes (+252).
  // Reviewed data table toggles that leave row menus alone: 68,426 gzip bytes (+16).
  // Reviewed the mega menu, menubar, tour, calendar, image compare, sortable rows and color inputs: 70,392 gzip bytes (+1,966).
  // Reviewed the 1.0 alias and legacy color role removal: 68,614 gzip bytes (-1,778).
  // Reviewed touch-action on the sheet drag handle and header: 68,632 gzip bytes (+18).
  // Reviewed disabled guards on FAB menu, toolbar FAB and .hoverable states: 68,676 gzip bytes (+62).
  // Reviewed the shared $disabled selector and host disabled paint for FAB menu items and toolbar FABs: 68,787 gzip bytes (+111).
  // Reviewed forced-colors states for selection, form controls, the datepicker and indicators: 69,228 gzip bytes (+617).
  // Reviewed logical properties and :dir() swaps for right-to-left fields, checkboxes, menus and overlays: 69,311 gzip bytes (+83).
  // Reviewed the popover resets for top-layer tooltips and snackbars: 69,321 gzip bytes (+10).
  // Reviewed the disabled guards from #310 on top of the systemic fixes: 69,392 gzip bytes (+71).
  // Reviewed field padding keyed to the field's direction and the RTL follow-ups: 69,450 gzip bytes (+58).
  // Reviewed the shared disabled selector from #310 on top of the systemic fixes: 69,541 gzip bytes (+91).
  // Reviewed reverting the popover resets for top-layer tooltips and snackbars: 69,528 gzip bytes (-13).
  // Reviewed field label, toggle and padding keyed to :dir() and logical date range bands: 69,633 gzip bytes (+105).
  // Reviewed the sheet touch-action from #312 on top of the Sass review fixes: 69,649 gzip bytes (+16).
  // Reviewed aria-disabled pointer events, page-direction date range bands and the carousel's reduced-motion block on top of #312: 69,701 gzip bytes (+52).
  // Reviewed the organization chart on top of the #315 review commits: 70,262 gzip bytes (+561).
  // Reviewed navigation rail side panels with grouped links: 70,759 gzip bytes (+497).
  // Reviewed side panel destinations laid out as destinations when they come first, at full height: 70,787 gzip bytes (+28).
  // Reviewed md.sys.motion tokens read by every on-scale component transition: 71,199 gzip bytes (+412).
  // Reviewed md.sys.shape.corner tokens read by component shape tokens: 71,539 gzip bytes (+340).
  // Reviewed the --expressive-z-* stacking scale: 71,661 gzip bytes (+122).
  // Reviewed the window-size layout prefixes and the display, sizing, border and corner helpers: 72,680 gzip bytes (+1,019).
  // Reviewed underlined links in running text: 72,725 gzip bytes (+45).
  // Reviewed print styles and the print visibility helpers: 72,957 gzip bytes (+232).
  // Reviewed logical properties for blockquotes and table cells: 72,975 gzip bytes (+18).
  // Reviewed balanced headings and pretty paragraphs: 73,001 gzip bytes (+26).
  // Reviewed .prose for bare long-form HTML: 73,237 gzip bytes (+236).
  // Reviewed .query-container and container-width stacking for horizontal cards and description lists: 73,274 gzip bytes (+37).
  // Reviewed the prefers-contrast: more outline mapping: 73,300 gzip bytes (+26).
  // Reviewed the color swatches component: 73,556 gzip bytes (+256).
  // Reviewed the color picker: 73,988 gzip bytes (+432).
  // Reviewed elevation tokens and the medium and high contrast schemes: 74,095 gzip bytes (+107).
  // Reviewed the number stepper field: 74,167 gzip bytes (+72).
  // Reviewed the fifteen emphasized type roles, their weight tokens and the 700 faces: 74,518 gzip bytes (+351).
  // Reviewed window-size prefixes for margin, padding and .hide, without physical left and right: 76,799 gzip bytes (+2,281).
  // Reviewed the standard and expressive spring tokens, nine 24-sample linear() curves: 77,624 gzip bytes (+825).
  // Reviewed the cut corner family, the corners switch and .corner-cut: 77,790 gzip bytes (+166).
  // Reviewed the Latin Extended, Cyrillic, Greek, Vietnamese and Devanagari text faces at 400, 500 and 700: 78,604 gzip bytes (+814).
  // Reviewed the bottom sheet on the default spatial spring with a 24px bleed: 78,655 gzip bytes (+51).
  // Reviewed the side sheet on the default spatial spring with a 24px bleed: 78,694 gzip bytes (+39).
  // Reviewed the navigation rail resizing on the default spatial spring: 78,746 gzip bytes (+52).
  // Reviewed FAB menu actions on the fast spatial and effects springs: 78,769 gzip bytes (+23).
  // Reviewed the basic dialog entry on the default spatial and fast effects springs: 78,863 gzip bytes (+94).
  // Reviewed the expanding card on the slow spatial, default spatial and fast effects springs: 78,890 gzip bytes (+27).
  // Reviewed every motion duration token set to 0s under reduced motion: 79,004 gzip bytes (+114).
  // Reviewed button groups and the keypad on the spring tokens, dropping two copies of the sampled curve: 78,791 gzip bytes (-213).
  // Reviewed the tabs indicator, switch handle and chip set on springs: 78,870 gzip bytes (+79).
  // Reviewed value axes for the line, column, bar, mixed and radar charts: 79,449 gzip bytes (+579).
  // Reviewed the modal picker dialog fit: 79,497 gzip bytes (+48).
  // Reviewed the expandable bottom sheet's two heights and fallbacks for the chart axis --at: 79,548 gzip bytes (+51).
  // Reviewed pie chart names outside the slices: 79,675 gzip bytes (+127).
  // Reviewed radial chart ring names at each ring's start: 79,745 gzip bytes (+70).
  // Reviewed pie chart leader lines and gauge ring names: 80,094 gzip bytes (+349).
  // Reviewed radar chart outlines broken at gaps: 80,095 gzip bytes (+1).
  // Reviewed heatmap diverging and stepped scales and scrolling grids: 80,253 gzip bytes (+158).
  // Reviewed mixed chart stacked columns, and line points and straight lines: 80,338 gzip bytes (+85).
  // Reviewed range columns and bars: 80,371 gzip bytes (+33).
  // Reviewed radial chart segments and gradient fills: 80,410 gzip bytes (+39).
  // Reviewed chart review fixes: segment sizes, stacked ranges, diverging bounds and scrolling tooltips: 80,415 gzip bytes (+5).
  // Reviewed keypad caps lock, layers, hardware key highlight and minlength: 80,435 gzip bytes (+20).
  // Reviewed questionnaire shortcuts, review step and saved progress: 80,608 gzip bytes (+173).
  // Reviewed common button square shape, toggles and press morph: 81,001 gzip bytes (+393).
  // Reviewed linear progress end stop and wavy indicator: 81,405 gzip bytes (+404).
  // Reviewed heatmap row labels kept in view beside scrolling cells: 81,429 gzip bytes (+24).
  // Reviewed radial gradients that follow the ring: 81,497 gzip bytes (+68).
  // Reviewed wavy circular progress: 82,132 gzip bytes (+635).
  // Reviewed radial gradient reveal and wavy forced colors fixes: 82,210 gzip bytes (+78).
  // Reviewed Noto Sans Arabic, Hebrew and Thai faces: 82,506 gzip bytes (+296).
  // Reviewed runtime spring snap-back for dragged sheets: 82,608 gzip bytes (+102).
  // Reviewed forced-colors edges, glyphs and disabled states: 82,931 gzip bytes (+323).
  // Reviewed forced-colors FAB edges, column track, picker area and aura variants: 82,968 gzip bytes (+37).
  // Reviewed nowrap breadcrumbs and trailing list badges: 82,995 gzip bytes (+27).
  assert.ok(sizes(css).gzip <= 82995, `CSS gzip: ${sizes(css).gzip}`);
});
