// Every component, one line each. This is the list - if a component is not
// here it does not exist as far as the bundle is concerned.
//
// Each module also exports its `<Name>Options` interface; import those from the
// component's own module (e.g. `./menu`) when you need the type.

export { Autocomplete } from "./autocomplete";
export { FloatingActionButton } from "./buttons";
export { Cards } from "./cards";
export { ExpandingCard } from "./expandingCard";
export { Carousel } from "./carousel";
export { CharacterCounter } from "./characterCounter";
export { Chips } from "./chips";
export { Datepicker } from "./datepicker";
export { Menu } from "./menu";
export { Lightbox } from "./lightbox";
export { Slider } from "./slider";
export { ScrollSpy } from "./scrollspy";
export { FormSelect } from "./select";
export { NavigationDrawer } from "./navigationDrawer";
export { NavigationRail } from "./navigationRail";
export { Slideshow } from "./slideshow";
export { Tabs } from "./tabs";
export { Timepicker } from "./timepicker";
export { Snackbar } from "./snackbar";
export { Tooltip } from "./tooltip";

// Names retired in 0.8.0, kept so existing imports keep resolving.
//
// `Range` simply moved to the name M3 uses for the component: Slider. The
// slideshow, which held `Slider` until now, is `Slideshow`. That pair is the
// one rename in the set that changes an existing name's *meaning* rather than
// adding a second one, so it is called out in the changelog rather than
// aliased - aliasing `Slider` to the slideshow would defeat the point.
export { Slider as Range } from "./slider";
export { NavigationDrawer as Sidenav } from "./navigationDrawer";
