// Minimal markup for each auto-initialized component.
//
// This table is written by hand rather than derived from components/registry.ts
// on purpose: it is an independent statement of what AutoInit() is supposed to
// wire up, so a wrong selector or a mis-bound class in the registry fails here
// instead of being reproduced by the test.

export const AUTO_INIT_FIXTURES = [
  {
    name: 'Autocomplete',
    selector: '.autocomplete',
    html: `<div class="field"><input class="autocomplete" type="text" id="ac"><label for="ac">A</label></div>`
  },
  {
    // Semantic <article> + <aside>, which is what the docs use and what
    // Cards.Init() has always matched - the registry claimed `.cards`, which
    // no card markup anywhere uses.
    name: 'Cards',
    selector: 'article',
    html: `<article><h3>Title</h3><span class="activator">T</span><aside><h4>Title</h4><p>body</p></aside></article>`
  },
  {
    name: 'Carousel',
    selector: '.carousel',
    html: `<div class="carousel"><a class="carousel-item" href="#one"><img src="http://localhost/1.jpg"></a><a class="carousel-item" href="#two"><img src="http://localhost/2.jpg"></a></div>`
  },
  { name: 'Chips', selector: '.chips', html: `<div class="chips"></div>` },
  { name: 'Datepicker', selector: '.date-picker', html: `<input type="text" class="date-picker">` },
  {
    name: 'Menu',
    selector: '.menu-trigger',
    html: `<a class="button menu-trigger" data-target="menu1">Drop</a><menu id="menu1"><li><a href="#!">one</a></li></menu>`
  },
  {
    name: 'Lightbox',
    selector: '.lightboxed',
    html: `<img class="lightboxed" tabindex="0" role="button" width="100" src="http://localhost/1.jpg" alt="Sample">`
  },
  {
    name: 'Parallax',
    selector: '.parallax',
    html: `<div class="parallax"><img src="http://localhost/1.jpg" alt=""></div>`
  },
  {
    name: 'ScrollSpy',
    selector: '.scrollspy',
    html: `<div id="section1" class="scrollspy section">one</div>`
  },
  {
    name: 'FormSelect',
    selector: 'select',
    html: `<div class="field"><select id="fs"><option value="" disabled selected>Choose</option><option value="1">One</option><option value="2">Two</option></select><label for="fs">Pick</label></div>`
  },
  {
    name: 'NavigationRail',
    selector: '.navigation-rail',
    html: `<nav class="navigation-rail" aria-label="Main"><button type="button" aria-label="Menu"><span class="material-symbols" aria-hidden="true">menu</span></button><a href="#!" aria-current="page"><span class="material-symbols" aria-hidden="true">star</span>Label</a></nav>`
  },
  {
    name: 'Sidenav',
    selector: '.navigation-drawer',
    html: `<nav aria-label="Main"><ul id="slide-out" class="navigation-drawer"><li><a href="#!">First</a></li></ul></nav><a href="#" data-target="slide-out" class="navigation-drawer-trigger">menu</a>`
  },
  {
    name: 'Tabs',
    selector: '.tabs',
    html: `<nav class="tabs" aria-label="Demo"><li class="tab"><a class="active" aria-current="page" href="#tab1">Tab 1</a></li><li class="tab"><a href="#tab2">Tab 2</a></li></nav><div id="tab1">one</div><div id="tab2">two</div>`
  },
  { name: 'Timepicker', selector: '.time-picker', html: `<input type="text" class="time-picker">` },
  {
    name: 'Tooltip',
    selector: '.tooltipped',
    html: `<a class="button tooltipped" data-position="bottom" data-tooltip="Hi">Hover</a>`
  },
  {
    name: 'FloatingActionButton',
    selector: '.fab',
    html: `<div class="fab"><a class="button extra circle" aria-label="Add"><span class="material-symbols" aria-hidden="true">add</span></a><ul><li><a class="button extra circle small red" aria-label="Chart"><span class="material-symbols" aria-hidden="true">chart</span></a></li></ul></div>`
  }
];
