// Tabs. A <nav class="tabs"> of anchors; `active` marks the selected tab.
// Secondary tabs add `tabs-secondary`.
export const Primary = () => (
  <nav className="tabs" aria-label="Travel">
    <a href="#flight"><i className="material-icons">flight</i><span>Flight</span></a>
    <a className="active" href="#luggage"><i className="material-icons">luggage</i><span>Luggage</span></a>
    <a href="#explore"><i className="material-icons">explore</i><span>Explore</span></a>
  </nav>
);

export const Secondary = () => (
  <nav className="tabs tabs-secondary" aria-label="Trip">
    <a className="active" href="#travel"><i className="material-icons">flight</i><span>Travel</span></a>
    <a href="#hotel"><i className="material-icons">hotel</i><span>Hotel</span></a>
    <a href="#dining"><i className="material-icons">restaurant</i><span>Dining</span></a>
  </nav>
);

export const TextOnly = () => (
  <nav className="tabs" aria-label="Library">
    <a className="active" href="#recent">Recent</a>
    <a href="#starred">Starred</a>
    <a href="#shared">Shared</a>
  </nav>
);
