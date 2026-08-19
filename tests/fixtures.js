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
  { name: 'Datepicker', selector: '.datepicker', html: `<input type="text" class="datepicker">` },
  {
    name: 'Menu',
    selector: '.menu-trigger',
    html: `<a class="button menu-trigger" data-target="menu1">Drop</a><menu id="menu1"><li><a href="#!">one</a></li></menu>`
  },
  {
    name: 'Lightbox',
    selector: '.lightboxed',
    html: `<img class="lightboxed" width="100" src="http://localhost/1.jpg">`
  },
  {
    name: 'Parallax',
    selector: '.parallax',
    html: `<div class="parallax"><img src="http://localhost/1.jpg"></div>`
  },
  {
    name: 'ScrollSpy',
    selector: '.scrollspy',
    html: `<div id="section1" class="scrollspy section">one</div>`
  },
  {
    name: 'FormSelect',
    selector: 'select',
    html: `<div class="field"><select><option value="" disabled selected>Choose</option><option value="1">One</option><option value="2">Two</option></select><label>Pick</label></div>`
  },
  {
    name: 'NavigationRail',
    selector: '.navigation-rail',
    html: `<nav class="navigation-rail" aria-label="Main"><button type="button" aria-label="Menu"><i class="material-symbols">menu</i></button><a href="#!" aria-current="page"><i class="material-symbols">star</i>Label</a></nav>`
  },
  {
    name: 'Sidenav',
    selector: '.sidenav',
    html: `<ul id="slide-out" class="sidenav"><li><a href="#!">First</a></li></ul><a href="#" data-target="slide-out" class="sidenav-trigger">menu</a>`
  },
  {
    name: 'Tabs',
    selector: '.tabs',
    html: `<ul class="tabs"><li class="tab"><a class="active" href="#tab1">Tab 1</a></li><li class="tab"><a href="#tab2">Tab 2</a></li></ul><div id="tab1">one</div><div id="tab2">two</div>`
  },
  {
    name: 'TapTarget',
    selector: '.tap-target',
    html: `<div class="tap-target" data-target="menu-btn"><div class="tap-target-content"><h5>Title</h5></div></div><a id="menu-btn" class="button">menu</a>`
  },
  { name: 'Timepicker', selector: '.timepicker', html: `<input type="text" class="timepicker">` },
  {
    name: 'Tooltip',
    selector: '.tooltipped',
    html: `<a class="button tooltipped" data-position="bottom" data-tooltip="Hi">Hover</a>`
  },
  {
    name: 'FloatingActionButton',
    selector: '.fixed-action-btn',
    html: `<div class="fixed-action-btn"><a class="button extra circle"><i class="material-symbols">add</i></a><ul><li><a class="button extra circle small red"><i class="material-symbols">chart</i></a></li></ul></div>`
  }
];
