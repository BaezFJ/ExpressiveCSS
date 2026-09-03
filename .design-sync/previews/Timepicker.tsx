// Timepicker — the clock dial is built into the DOM by the plugin. Unlike
// Datepicker there is no openByDefault flag: the default options already show
// the clock inline, appended to the input's parent (llm.md). So init on mount
// is the whole trick, and what the card shows is the shipped dial.
import { useEffect, useRef } from 'react';

const useTimepicker = (options: Record<string, unknown>) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = ref.current;
    const T = (window as any).Expressive?.Timepicker;
    if (!el || !T) return;
    const inst = T.init(el, options);
    return () => {
      try {
        inst?.destroy?.();
      } catch {
        /* already torn down */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
};

const Field = ({
  id,
  label,
  options = {},
}: {
  id: string;
  label: string;
  options?: Record<string, unknown>;
}) => {
  const ref = useTimepicker(options);
  // No width constraint. The plugin sizes .timepicker-container itself and the
  // dial sits outside that box at narrow widths — constraining the wrapper does
  // not move it (tried 460 and 620, byte-identical captures). Left to the
  // framework; recorded as a finding in NOTES.md rather than papered over here.
  return (
    <div className="field">
      <input type="text" className="time-picker" id={id} ref={ref} placeholder=" " />
      <label htmlFor={id}>{label}</label>
    </div>
  );
};

export const TwelveHour = () => <Field id="tp-12" label="Lunchtime" />;

export const TwentyFourHour = () => (
  <Field id="tp-24" label="Departure" options={{ twelveHour: false }} />
);
