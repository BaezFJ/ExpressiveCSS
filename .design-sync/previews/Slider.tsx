// Sliders. A bare <label> wrapping a range input is the simple form. The
// variants live on a `.range` WRAPPER — sizes (s/m/l/xl), `centered`, and an
// optional inset leading icon — not on the input itself.
//
// `stops` is deliberately absent: its tick marks are drawn from
// --md-comp-slider-active-fraction, which the Range plugin sets at runtime.
// Range.Init() runs at import, before a card's React tree mounts, so the
// property is never set and the ticks compute to zero width.
const Stack = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gap: 24, maxWidth: 420 }}>{children}</div>
);

export const Basic = () => (
  <Stack>
    <label>
      Volume
      <input type="range" min={0} max={100} defaultValue={40} />
    </label>
  </Stack>
);

export const Sizes = () => (
  <Stack>
    <div className="range s"><input type="range" min={0} max={100} defaultValue={30} aria-label="Small" /></div>
    <div className="range m"><input type="range" min={0} max={100} defaultValue={50} aria-label="Medium" /></div>
    <div className="range l"><input type="range" min={0} max={100} defaultValue={70} aria-label="Large" /></div>
    <div className="range xl"><input type="range" min={0} max={100} defaultValue={85} aria-label="Extra large" /></div>
  </Stack>
);

export const WithIconAndCentered = () => (
  <Stack>
    <div className="range m">
      <i className="material-symbols">volume_up</i>
      <input type="range" min={0} max={100} defaultValue={55} aria-label="Volume" />
    </div>
    <div className="range centered">
      <input type="range" min={0} max={100} defaultValue={30} aria-label="Balance" />
    </div>
  </Stack>
);
