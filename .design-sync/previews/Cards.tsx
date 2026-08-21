// Cards. Anatomy is the HTML: <article> is the card, a heading is the headline,
// <p> is supporting text, a direct <nav> is the action row, <img>/<figure> is
// media. There is no card-content / card-title / card-action class.
const Grid = ({ children, w = 300 }: { children: React.ReactNode; w?: number }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${w}px, 1fr))`, gap: 16, alignItems: 'start' }}>
    {children}
  </div>
);

export const Basic = () => (
  <Grid>
    <article>
      <h3>Trip to the coast</h3>
      <p>Two nights in Mendocino, leaving Friday after work. Bring layers — it drops to 48°F after sunset.</p>
      <nav>
        <button className="text">Share</button>
        <button className="tonal">Open</button>
      </nav>
    </article>
  </Grid>
);

export const Variants = () => (
  <Grid w={220}>
    <article>
      <h3>Elevated</h3>
      <p>The default. Surface at elevation 1, rising to 2 on hover.</p>
    </article>
    <article className="filled">
      <h3>Filled</h3>
      <p>Surface-variant at rest, with no shadow.</p>
    </article>
    <article className="outlined">
      <h3>Outlined</h3>
      <p>Surface plus a 1dp outline-variant stroke.</p>
    </article>
  </Grid>
);

export const WithMedia = () => (
  <Grid>
    <article>
      <figure>
        <img
          src="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='220'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23006A79'/%3E%3Cstop offset='1' stop-color='%234A4458'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='220' fill='url(%23g)'/%3E%3C/svg%3E"
          alt=""
        />
        <figcaption>Mendocino</figcaption>
      </figure>
      <p>A direct img is full-bleed across the top. Wrap it in a figure to caption the media itself.</p>
      <nav>
        <button className="text">Details</button>
      </nav>
    </article>
  </Grid>
);
