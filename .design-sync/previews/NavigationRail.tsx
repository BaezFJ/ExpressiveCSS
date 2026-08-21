// Navigation rail. Compact side navigation; aria-current="page" marks the
// destination, and a badge can ride inside the icon.
const Stage = ({ children }: { children: React.ReactNode }) => (
  <div style={{ height: 380, display: 'flex' }}>{children}</div>
);

export const Standard = () => (
  <Stage>
    <nav className="navigation-rail" aria-label="Main">
      <button type="button" aria-label="Menu"><i className="material-symbols">menu</i></button>
      <a className="button extra" href="#!"><i className="material-symbols">edit</i><span>Compose</span></a>
      <a href="#inbox" aria-current="page"><i className="material-symbols">inbox</i>Inbox</a>
      <a href="#starred"><i className="material-symbols">star<span className="badge">3</span></i>Starred</a>
      <a href="#sent"><i className="material-symbols">send</i>Sent</a>
      <a href="#archive"><i className="material-symbols">archive</i>Archive</a>
    </nav>
  </Stage>
);
