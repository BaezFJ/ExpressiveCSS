// Menu. A `.menu-trigger[data-target]` opens a `<menu id>`; that pairing is the
// JS contract. A closed menu is `display: none; opacity: 0; position: absolute`,
// so the card renders the real menu surface with only those three properties
// overridden — every other style, including the surface and shape tokens, is
// the framework's own.
const open = { display: 'block', opacity: 1, position: 'static' as const };

export const Surface = () => (
  <menu id="menu-preview" style={open}>
    <li><a href="#!">Reply</a></li>
    <li><a href="#!">Forward</a></li>
    <hr />
    <li><a href="#!"><i className="material-icons">archive</i><span>Archive</span></a></li>
    <li><a href="#!"><i className="material-icons">delete</i><span>Delete</span></a></li>
  </menu>
);

export const WithSelection = () => (
  <menu id="menu-preview-2" style={open}>
    <li className="selected"><a href="#!"><i className="material-icons">check</i><span>Newest first</span></a></li>
    <li><a href="#!">Oldest first</a></li>
    <li><a href="#!">Largest first</a></li>
  </menu>
);
