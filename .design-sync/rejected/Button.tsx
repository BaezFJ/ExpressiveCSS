// Buttons. ExpressiveCSS is class-based: this is plain markup plus classes,
// which is exactly how a design consumes it — there is nothing to import.
// A bare <button> is the filled common button; the variant is a class.
const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
);

export const Variants = () => (
  <Row>
    <button>Filled</button>
    <button className="tonal">Tonal</button>
    <button className="outlined">Outlined</button>
    <button className="elevated">Elevated</button>
    <button className="text">Text</button>
  </Row>
);

export const WithIcons = () => (
  <Row>
    <button><i className="material-icons">add</i><span>Create</span></button>
    <button className="tonal"><span>Send</span><i className="material-icons">send</i></button>
    <a className="button" href="#!">Link</a>
  </Row>
);

export const IconButtons = () => (
  <Row>
    <button className="circle" aria-label="Add"><i className="material-icons">add</i></button>
    <button className="circle tonal" aria-label="Edit"><i className="material-icons">edit</i></button>
    <button className="circle outlined" aria-label="Share"><i className="material-icons">share</i></button>
    <button className="circle text" aria-label="More"><i className="material-icons">more_vert</i></button>
  </Row>
);

export const Disabled = () => (
  <Row>
    <button disabled>Filled</button>
    <button className="tonal" disabled>Tonal</button>
    <button className="outlined" disabled>Outlined</button>
  </Row>
);
