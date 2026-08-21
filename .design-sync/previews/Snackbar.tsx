// Snackbar. Anatomy is the HTML: .snackbar is the container, a <p> is the
// supporting text, a trailing <button> is the action and a .circle button is
// the optional close. An optional leading <i> is an icon. The plugin builds
// exactly this markup, so a static card shows the real component.
const Stack = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gap: 16 }}>{children}</div>
);

export const Basic = () => (
  <Stack>
    <div className="snackbar"><p>Message sent</p></div>
  </Stack>
);

export const WithAction = () => (
  <Stack>
    <div className="snackbar">
      <p>Conversation archived</p>
      <button type="button">Undo</button>
    </div>
  </Stack>
);

export const WithIconAndClose = () => (
  <Stack>
    <div className="snackbar">
      <i className="material-symbols">wifi_off</i>
      <p>You are offline. Changes will sync when you reconnect.</p>
      <nav>
        <button type="button">Retry</button>
        <button type="button" className="circle" aria-label="Dismiss">
          <i className="material-symbols">close</i>
        </button>
      </nav>
    </div>
  </Stack>
);
