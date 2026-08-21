// Chips. A .chip is markup; the Chips plugin turns a .chips container into an
// editable tag field. Display-only chips need no JavaScript.
const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
);

export const Basic = () => (
  <Row>
    <div className="chip">Design</div>
    <div className="chip">Engineering</div>
    <div className="chip">Research</div>
  </Row>
);

export const Removable = () => (
  <Row>
    <div className="chip">
      Typography
      <i className="close material-icons">close</i>
    </div>
    <div className="chip">
      Color
      <i className="close material-icons">close</i>
    </div>
  </Row>
);

export const WithLeadingIcon = () => (
  <Row>
    <div className="chip">
      <i className="material-icons">check</i>
      Available
      <i className="close material-icons">close</i>
    </div>
    <div className="chip">
      <i className="material-icons">schedule</i>
      Pending
    </div>
  </Row>
);
