// Range. The plugin behind the slider surface. A .range wrapper holding two
// inputs is a dual-handle range in one host; `centered` grows the active track
// from the midpoint.
const Stack = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gap: 28, maxWidth: 420 }}>{children}</div>
);

export const Dual = () => (
  <Stack>
    <div className="range">
      <input type="range" min={0} max={100} defaultValue={25} aria-label="Range start" />
      <input type="range" min={0} max={100} defaultValue={75} aria-label="Range end" />
    </div>
  </Stack>
);

export const Centered = () => (
  <Stack>
    <div className="range centered">
      <input type="range" min={0} max={100} defaultValue={30} aria-label="Balance" />
    </div>
  </Stack>
);
