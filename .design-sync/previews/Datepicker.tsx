// Datepicker — the calendar grid is built into the DOM by the plugin, so an
// un-initialized field renders as a bare text input. `openByDefault: true`
// leaves the calendar inline in the layout (llm.md: "that is the reliable way
// to show it"), which is exactly what a static card can photograph. Every
// pixel below is the shipped component; nothing is hand-drawn.
import { useEffect, useRef } from 'react';

// A fixed date so the card shows the same month every time it renders.
const DAY = new Date(2026, 4, 14);

const usePicker = (options: Record<string, unknown>) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = ref.current;
    const D = (window as any).Expressive?.Datepicker;
    if (!el || !D) return;
    const inst = D.init(el, options);
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
  options,
}: {
  id: string;
  label: string;
  options: Record<string, unknown>;
}) => {
  const ref = usePicker(options);
  return (
    <div className="field" style={{ maxWidth: 340 }}>
      <input type="text" className="date-picker" id={id} ref={ref} placeholder=" " />
      <label htmlFor={id}>{label}</label>
    </div>
  );
};

export const Inline = () => (
  <Field
    id="dp-inline"
    label="Departure"
    options={{ openByDefault: true, defaultDate: DAY, setDefaultDate: true }}
  />
);

export const MondayFirstWithClear = () => (
  <Field
    id="dp-monday"
    label="Booking date"
    options={{
      openByDefault: true,
      defaultDate: DAY,
      setDefaultDate: true,
      firstDay: 1,
      showClearBtn: true,
    }}
  />
);

export const DateRange = () => (
  <Field
    id="dp-range"
    label="Stay"
    options={{
      openByDefault: true,
      isDateRange: true,
      defaultDate: DAY,
      setDefaultDate: true,
      defaultEndDate: new Date(2026, 4, 21),
      setDefaultEndDate: true,
    }}
  />
);
