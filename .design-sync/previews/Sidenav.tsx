// Sidenav. .sidenav-fixed is the docked form — it renders in place rather than
// waiting on open(), which is what a static card can show.
const Stage = ({ children }: { children: React.ReactNode }) => (
  <div style={{ height: 420, display: 'flex' }}>{children}</div>
);

export const Docked = () => (
  <Stage>
    <ul className="sidenav sidenav-fixed" style={{ position: 'static', transform: 'none' }}>
      <li><a className="subheader">Mail</a></li>
      <li><a href="#inbox"><i className="material-icons">inbox</i>Inbox</a></li>
      <li><a href="#starred"><i className="material-icons">star</i>Starred</a></li>
      <li><a href="#sent"><i className="material-icons">send</i>Sent</a></li>
      <li><div className="divider" /></li>
      <li><a className="subheader">Labels</a></li>
      <li><a href="#work"><i className="material-icons">label</i>Work</a></li>
      <li><a href="#personal"><i className="material-icons">label</i>Personal</a></li>
    </ul>
  </Stage>
);
