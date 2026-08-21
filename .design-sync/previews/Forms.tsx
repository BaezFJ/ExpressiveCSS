// Forms is a document-level behavior, not a visual component: Forms.Init()
// wires up textarea auto-resize, file inputs and validation state. The card
// shows a realistic form built from the controls it enhances.
//
// No <select>: FormSelect replaces the native element with a generated .field
// and <menu>, so an un-enhanced select renders with its label overlapping the
// value. That state is not worth showing.
export const SignUp = () => (
  <form style={{ display: 'grid', gap: 28, maxWidth: 420 }}>
    <div className="field outlined">
      <input id="f-name" type="text" placeholder=" " />
      <label htmlFor="f-name">Full name</label>
    </div>
    <div className="field outlined">
      <input id="f-email" type="email" placeholder=" " defaultValue="jdoe@example.com" />
      <label htmlFor="f-email">Email</label>
      <small>We only use this for receipts.</small>
    </div>
    <label className="switch"><input type="checkbox" defaultChecked /> Email me product updates</label>
    <label><input type="checkbox" /> I agree to the terms</label>
    <nav style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
      <button type="button" className="text">Cancel</button>
      <button type="button">Create account</button>
    </nav>
  </form>
);
