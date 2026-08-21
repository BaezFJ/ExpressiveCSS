// Floating action button. The FAB is a button with `button extra circle`
// (56dp, primary-container, elevation 3); `small` is the 40dp size. Colors come
// from the role utilities.
//
// `.fixed-action-btn` is the fixed-position host that pins a FAB to the viewport
// corner and reveals a speed dial on hover — deliberately not used here, since
// `position: fixed` escapes a preview card and the hover reveal is not static.
//
// NOTE: llm.md documents `.btn-floating` for this component. That class exists
// nowhere in the stylesheet or the TypeScript — use `button extra circle`.
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
