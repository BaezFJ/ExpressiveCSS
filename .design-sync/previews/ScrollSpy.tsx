// ScrollSpy highlights the entry matching the section currently in view. It
// needs a scrolling page, so the card shows the navigation surface it drives —
// a .table-of-contents list with one entry marked active.
export const TableOfContents = () => (
  <ul className="section table-of-contents" style={{ maxWidth: 240 }}>
    <li><a href="#intro">Introduction</a></li>
    <li><a className="active" href="#tokens">Tokens</a></li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#api">API</a></li>
  </ul>
);
