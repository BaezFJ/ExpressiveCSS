const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
);

export const Sizes = () => (
  <Row>
    <button type="button" className="button extra circle" aria-label="Compose">
      <i className="material-symbols">mode_edit</i>
    </button>
    <button type="button" className="button extra circle small" aria-label="Edit">
      <i className="material-symbols">edit</i>
    </button>
  </Row>
);

export const Colors = () => (
  <Row>
    <button type="button" className="button extra circle small primary on-primary-text" aria-label="Attach">
      <i className="material-symbols">attach_file</i>
    </button>
    <button type="button" className="button extra circle small secondary on-secondary-text" aria-label="Quote">
      <i className="material-symbols">format_quote</i>
    </button>
    <button type="button" className="button extra circle small tertiary on-tertiary-text" aria-label="Publish">
      <i className="material-symbols">publish</i>
    </button>
    <button type="button" className="button extra circle small error on-error-text" aria-label="Chart">
      <i className="material-symbols">insert_chart</i>
    </button>
  </Row>
);
