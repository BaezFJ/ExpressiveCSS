// Autocomplete. A .field with an .autocomplete input; the plugin attaches the
// suggestion menu on input. The field with its optional prefix icon is the
// static surface.
const Stack = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gap: 28, maxWidth: 360 }}>{children}</div>
);

export const Basic = () => (
  <Stack>
    <div className="field">
      <i className="material-symbols prefix">textsms</i>
      <input type="text" id="ac-1" className="autocomplete" placeholder=" " />
      <label htmlFor="ac-1">Autocomplete</label>
    </div>
  </Stack>
);

export const Outlined = () => (
  <Stack>
    <div className="field outlined">
      <i className="material-symbols prefix">search</i>
      <input type="text" id="ac-2" className="autocomplete" placeholder=" " defaultValue="San Fran" />
      <label htmlFor="ac-2">City</label>
      <small>Start typing to see suggestions</small>
    </div>
  </Stack>
);
