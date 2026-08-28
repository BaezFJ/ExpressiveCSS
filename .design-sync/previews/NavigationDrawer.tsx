// NavigationDrawer — the M3 name for the drawer (.sidenav is the alias).
// navigation-drawer-fixed is the docked form: it renders in place instead of
// waiting on open(), which is the only state a static card can show. The
// modal form is the same <ul> with a navigation-drawer-trigger elsewhere on
// the page pointing at its id.
const Stage = ({ children }: { children: React.ReactNode }) => (
  <div style={{ height: 420, display: 'flex' }}>{children}</div>
);

const docked = { position: 'static' as const, transform: 'none' };

const cover =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23006A79'/%3E%3Cstop offset='1' stop-color='%234A4458'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='320' height='180' fill='url(%23g)'/%3E%3C/svg%3E";

const portrait =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23B8E9F2'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23004E5B'/%3E%3Cpath d='M10 64c0-12 10-20 22-20s22 8 22 20z' fill='%23004E5B'/%3E%3C/svg%3E";

export const Docked = () => (
  <Stage>
    <ul className="navigation-drawer navigation-drawer-fixed" style={docked}>
      <li><span className="subheader">Mail</span></li>
      <li><a href="#inbox"><span className="material-symbols" aria-hidden="true">inbox</span>Inbox</a></li>
      <li><a href="#starred"><span className="material-symbols" aria-hidden="true">star</span>Starred</a></li>
      <li><a href="#sent"><span className="material-symbols" aria-hidden="true">send</span>Sent</a></li>
      <li><div className="divider" /></li>
      <li><span className="subheader">Labels</span></li>
      <li><a href="#work"><span className="material-symbols" aria-hidden="true">label</span>Work</a></li>
      <li><a href="#personal"><span className="material-symbols" aria-hidden="true">label</span>Personal</a></li>
    </ul>
  </Stage>
);

export const WithProfileHeader = () => (
  <Stage>
    <ul className="navigation-drawer navigation-drawer-fixed" style={docked}>
      <li>
        <div className="user-view">
          <div className="background"><img src={cover} alt="" /></div>
          <a href="#user" aria-label="Profile"><img className="circle" src={portrait} alt="" /></a>
          <a href="#name"><span className="name">Dana Whitfield</span></a>
          <a href="#email"><span className="email">dana@glasssouls.fm</span></a>
        </div>
      </li>
      <li><a href="#library"><span className="material-symbols" aria-hidden="true">library_music</span>Library</a></li>
      <li><a href="#downloads"><span className="material-symbols" aria-hidden="true">download</span>Downloads</a></li>
      <li><div className="divider" /></li>
      <li><a href="#settings"><span className="material-symbols" aria-hidden="true">settings</span>Settings</a></li>
    </ul>
  </Stage>
);
