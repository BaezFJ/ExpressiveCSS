// Bottom sheets are dialog.bottom-sheet; BottomSheets.Init() adds drag-to-dismiss.
// Rendered with `open` inside a sized stage so the sheet has a containing block.
const Stage = ({ children }: { children: React.ReactNode }) => (
  <div style={{ position: 'relative', height: 320, width: '100%', overflow: 'hidden' }}>{children}</div>
);

export const Modal = () => (
  <Stage>
    <dialog className="bottom-sheet" open>
      <h2>Open with</h2>
      <ul className="list">
        <li><i className="material-icons">image</i>Photos</li>
        <li><i className="material-icons">folder</i>Files</li>
        <li><i className="material-icons">cloud</i>Drive</li>
      </ul>
      <form method="dialog">
        <button type="submit" className="text" value="cancel">Cancel</button>
      </form>
    </dialog>
  </Stage>
);
