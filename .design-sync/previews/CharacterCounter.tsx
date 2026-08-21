// Character counter. Attaches to an input or textarea carrying `data-length`
// and appends a live count. The counter element itself is created by the
// plugin, so a static card shows the field it attaches to.
export const Basic = () => (
  <div style={{ display: 'grid', gap: 28, maxWidth: 420 }}>
    <div className="field outlined">
      <input id="cc-1" type="text" data-length={40} placeholder=" " defaultValue="Weekly design review" />
      <label htmlFor="cc-1">Title</label>
      <span className="character-counter">20/40</span>
    </div>
  </div>
);
