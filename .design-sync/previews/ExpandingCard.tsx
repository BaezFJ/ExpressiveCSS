// ExpandingCard — an <article class="expanding-card"> holding a direct
// <dialog class="expanding-card-dialog">. The card's resting state is the
// compact feed item; the dialog renders nothing until ExpandingCard.Init()
// (or AutoInit()) opens it, so a static card shows the compact form. The
// dialog markup is kept here because it is the component's contract — the
// same hero image must appear in both states for the shared-container
// transition to read.
const hero =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='240'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23006A79'/%3E%3Cstop offset='1' stop-color='%237D5260'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='240' fill='url(%23g)'/%3E%3Ccircle cx='300' cy='70' r='44' fill='%23FFD8E4' opacity='.55'/%3E%3Ccircle cx='120' cy='170' r='60' fill='%23B8E9F2' opacity='.45'/%3E%3C/svg%3E";

const Album = ({ id, title, sub }: { id: string; title: string; sub: string }) => (
  <article className="outlined expanding-card">
    <figure>
      <img src={hero} alt="" />
      <button
        type="button"
        className="expanding-card-trigger"
        aria-label={`Open ${title}`}
        aria-haspopup="dialog"
      />
    </figure>
    <header className="expanding-card-summary">
      <h3>{title}</h3>
      <p className="subhead">{sub}</p>
    </header>
    <dialog id={id} className="expanding-card-dialog" aria-labelledby={`${id}-title`}>
      <button type="button" className="expanding-card-close" aria-label="Back">
        <span className="material-symbols" aria-hidden="true">arrow_back</span>
      </button>
      <figure className="expanding-card-hero"><img src={hero} alt="" /></figure>
      <div className="expanding-card-content">
        <header className="expanding-card-detail-header">
          <h2 id={`${id}-title`}>{title}</h2>
          <div className="expanding-card-actions">
            <button type="button" className="expanding-card-favorite" aria-label="Favorite album">
              <span className="material-symbols" aria-hidden="true">favorite</span>
            </button>
            <button type="button" className="expanding-card-play" aria-label="Play album">
              <span className="material-symbols" aria-hidden="true">play_arrow</span>
            </button>
          </div>
        </header>
        <div className="expanding-card-track">
          <strong>Fragile</strong><small>Glass Souls</small><time dateTime="PT3M34S">3:34</time>
        </div>
        <div className="expanding-card-track">
          <strong>Low Tide</strong><small>Glass Souls</small><time dateTime="PT4M12S">4:12</time>
        </div>
      </div>
    </dialog>
  </article>
);

export const Compact = () => (
  <div style={{ maxWidth: 340 }}>
    <Album id="glass-souls-card" title="Glass Souls" sub="From your recent favorites" />
  </div>
);

export const Feed = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, alignItems: 'start' }}>
    <Album id="feed-glass-souls" title="Glass Souls" sub="From your recent favorites" />
    <Album id="feed-low-tide" title="Low Tide Sessions" sub="Because you played Fragile" />
    <Album id="feed-north-room" title="The North Room" sub="New this week" />
  </div>
);
