// Carousel — the plugin positions every .carousel-item in JS, so a static
// card stacks them into what looks like one flat image. This preview drives
// the real component: Carousel.init() on mount is the only way the card shows
// what the framework actually renders. Nothing here is a lookalike — the
// markup is llm.md's and the layout comes from the shipped plugin.
import { useEffect, useRef } from 'react';

const shot = (a: string, b: string, label: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='480'>` +
      `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
      `<stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/>` +
      `</linearGradient></defs>` +
      `<rect width='640' height='480' fill='url(#g)'/>` +
      `<circle cx='470' cy='140' r='90' fill='#ffffff' opacity='.18'/>` +
      `<circle cx='180' cy='360' r='130' fill='#ffffff' opacity='.12'/>` +
      `<text x='32' y='452' font-family='sans-serif' font-size='34' fill='#ffffff' opacity='.75'>${label}</text>` +
      `</svg>`,
  );

const SHOTS = [
  { src: shot('#00363F', '#4A6267', '01'), alt: 'Mountain lake', title: 'Mountain lake' },
  { src: shot('#1F3B2C', '#5A7A5E', '02'), alt: 'Forest path', title: 'Forest path' },
  { src: shot('#3F2A24', '#8C6A5A', '03'), alt: 'Rocky coastline', title: 'Rocky coastline' },
  { src: shot('#2B2A45', '#6A6A9E', '04'), alt: 'Night harbour', title: 'Night harbour' },
  { src: shot('#452A3A', '#9E6A87', '05'), alt: 'Desert bloom', title: 'Desert bloom' },
];

// Init on mount, destroy on unmount. The instance is the real plugin — the
// card is showing the component, not a drawing of it.
const useCarousel = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const C = (window as any).Expressive?.Carousel;
    if (!el || !C) return;
    const inst = C.init(el);
    return () => {
      const all = Array.isArray(inst) ? inst : [inst];
      all.forEach((i: any) => {
        try {
          i?.destroy?.();
        } catch {
          /* already torn down */
        }
      });
    };
  }, []);
  return ref;
};

const Track = ({ layout, label, count = 5 }: { layout: string; label: string; count?: number }) => {
  const ref = useCarousel();
  return (
    <div className={layout} aria-label={label} ref={ref}>
      {SHOTS.slice(0, count).map((s) => (
        <a className="carousel-item" href="#!" key={s.title}>
          <img src={s.src} alt={s.alt} />
          <span className="carousel-item-content">{s.title}</span>
        </a>
      ))}
    </div>
  );
};

export const MultiBrowse = () => (
  <>
    <Track layout="carousel" label="Featured landscapes" />
    <div className="mt-1">
      <a className="button text" href="#!">Show all</a>
    </div>
  </>
);

export const Hero = () => <Track layout="carousel hero" label="Featured destinations" count={4} />;

export const Uncontained = () => (
  <Track layout="carousel uncontained" label="Travel stories" count={4} />
);
