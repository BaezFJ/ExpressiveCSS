// Parallax. A <figure class="parallax"> holding an image; the plugin offsets
// the image as the page scrolls. A card cannot scroll, so this shows the
// container at rest.
export const Basic = () => (
  <figure className="parallax" style={{ height: 260 }}>
    <img src="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23006A79'/%3E%3Cstop offset='1' stop-color='%234A4458'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='600' height='400' fill='url(%23g)'/%3E%3C/svg%3E" alt="A mountain lake" />
  </figure>
);
