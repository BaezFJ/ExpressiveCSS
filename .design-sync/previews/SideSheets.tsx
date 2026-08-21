// Side sheets are dialog.side-sheet; SideSheets.Init() adds drag-to-dismiss.
const Stage = ({ children }: { children: React.ReactNode }) => (
  <div style={{ position: 'relative', height: 380, width: '100%', overflow: 'hidden' }}>{children}</div>
);

export const Modal = () => (
  <Stage>
    <dialog className="side-sheet" open>
      <h2>Filters</h2>
      <div>
        <p>Narrow the results without leaving the page.</p>
        <ul className="list">
          <li>Unread</li>
          <li>Starred</li>
          <li>Has attachment</li>
        </ul>
      </div>
      <form method="dialog">
        <button type="submit" className="text" value="reset">Reset</button>
        <button type="submit" value="apply">Apply</button>
      </form>
    </dialog>
  </Stage>
);
