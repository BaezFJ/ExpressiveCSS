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
    html: `<div class="input-field"><input class="autocomplete" type="text" id="ac"><label for="ac">A</label></div>`
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
  {
    name: 'Collapsible',
    selector: '.collapsible',
    html: `<ul class="collapsible"><li><div class="collapsible-header">One</div><div class="collapsible-body"><span>Body one</span></div></li><li><div class="collapsible-header">Two</div><div class="collapsible-body"><span>Body two</span></div></li></ul>`
  },
  { name: 'Datepicker', selector: '.datepicker', html: `<input type="text" class="datepicker">` },
  {
    name: 'Dropdown',
    selector: '.dropdown-trigger',
    html: `<a class="dropdown-trigger btn" data-target="dropdown1">Drop</a><ul id="dropdown1" class="dropdown-content"><li><a href="#!">one</a></li></ul>`
  },
  {
    name: 'Lightbox',
    selector: '.lightboxed',
    html: `<img class="lightboxed" width="100" src="http://localhost/1.jpg">`
  },
  {
    name: 'Modal',
    selector: '.modal',
    html: `<div id="modal1" class="modal"><div class="modal-content"><h4>Title</h4></div><div class="modal-footer"><a class="modal-close btn-flat">Close</a></div></div>`
  },
  {
    name: 'Parallax',
    selector: '.parallax',
    html: `<div class="parallax"><img src="http://localhost/1.jpg"></div>`
  },
  { name: 'Pushpin', selector: '.pushpin', html: `<div class="pushpin">pinned</div>` },
  {
    name: 'ScrollSpy',
    selector: '.scrollspy',
    html: `<div id="section1" class="scrollspy section">one</div>`
  },
  {
    name: 'FormSelect',
    selector: 'select',
    html: `<div class="input-field"><select><option value="" disabled selected>Choose</option><option value="1">One</option><option value="2">Two</option></select><label>Pick</label></div>`
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
    html: `<div class="tap-target" data-target="menu-btn"><div class="tap-target-content"><h5>Title</h5></div></div><a id="menu-btn" class="btn">menu</a>`
  },
  { name: 'Timepicker', selector: '.timepicker', html: `<input type="text" class="timepicker">` },
  {
    name: 'Tooltip',
    selector: '.tooltipped',
    html: `<a class="btn tooltipped" data-position="bottom" data-tooltip="Hi">Hover</a>`
  },
  {
    name: 'FloatingActionButton',
    selector: '.fixed-action-btn',
    html: `<div class="fixed-action-btn"><a class="btn-floating btn-large"><i class="material-symbols">add</i></a><ul><li><a class="btn-floating red"><i class="material-symbols">chart</i></a></li></ul></div>`
  }
];
