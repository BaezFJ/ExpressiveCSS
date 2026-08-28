// Tooltip — the bubble is CSS-only and gated on :hover / :focus-visible /
// :focus-within (src/sass/components/_tooltip.scss). A screenshot cannot
// hover, but :focus-within matches on a programmatic .focus(), so focusing
// the activator on mount opens the real bubble with no plugin and no
// hand-drawn stand-in. One activator per cell, because only one element can
// hold focus at a time.
import { useEffect, useRef } from 'react';

const useFocused = () => {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
};

// Room above and below so the bubble is never clipped by the cell.
const Stage = ({ children, pad = 24 }: { children: React.ReactNode; pad?: number }) => (
  <div style={{ padding: `56px ${pad}px`, display: 'flex', gap: 24, alignItems: 'center' }}>
    {children}
  </div>
);

const IconTip = ({
  icon,
  label,
  text,
  position,
}: {
  icon: string;
  label: string;
  text: string;
  position?: string;
}) => {
  const ref = useFocused();
  const id = `tip-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <button
      type="button"
      className="circle"
      aria-label={label}
      aria-describedby={id}
      ref={ref as React.RefObject<HTMLButtonElement>}
    >
      <span className="material-symbols" aria-hidden="true">
        {icon}
      </span>
      <span className={position ? `tooltip ${position}` : 'tooltip'} id={id}>
        {text}
      </span>
    </button>
  );
};

export const Above = () => (
  <Stage>
    <IconTip icon="add" label="Add" text="Add to album" />
  </Stage>
);

export const Below = () => (
  <Stage>
    <IconTip icon="arrow_downward" label="Below" text="Move down" position="bottom" />
  </Stage>
);

export const Start = () => (
  <Stage pad={140}>
    <IconTip icon="arrow_back" label="Start" text="Previous track" position="left" />
  </Stage>
);

export const Rich = () => {
  const ref = useFocused();
  return (
    <div style={{ padding: '24px', maxWidth: 420 }}>
      <div>
        <button type="button" className="tonal" ref={ref as React.RefObject<HTMLButtonElement>}>
          Why this is saved
        </button>
        <div className="tooltip rich bottom">
          <h3>Saved offline</h3>
          <p>This stop is stored on the device so it still opens without a signal.</p>
          <div className="actions">
            <button type="button" className="text">
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
