// Dialogs are native <dialog> elements; behaviors/dialogs.ts adds light-dismiss.
// Rendered with `open` so the card shows the dialog rather than its trigger.
//
// The wrapper is load-bearing, not decoration: the dialog's own
// `max-height: min(70vh, calc(100% - 48px))` resolves against its containing
// block, so without a sized, positioned parent it collapses to a sliver.
const Stage = ({ children, h = 300 }: { children: React.ReactNode; h?: number }) => (
  <div style={{ position: 'relative', height: h, width: '100%' }}>{children}</div>
);

export const Basic = () => (
  <Stage>
    <dialog open>
      <h2>Use location services?</h2>
      <p>Let the app use your location to suggest nearby stops and arrival times.</p>
      <form method="dialog">
        <button type="submit" className="text" value="disagree">Disagree</button>
        <button type="submit" value="agree">Agree</button>
      </form>
    </dialog>
  </Stage>
);

export const WithIcon = () => (
  <Stage>
    <dialog open>
      <i className="material-icons">delete</i>
      <h2>Delete this draft?</h2>
      <p>The draft and its three attachments will be removed. This cannot be undone.</p>
      <form method="dialog">
        <button type="submit" className="text" value="cancel">Cancel</button>
        <button type="submit" value="delete">Delete</button>
      </form>
    </dialog>
  </Stage>
);
