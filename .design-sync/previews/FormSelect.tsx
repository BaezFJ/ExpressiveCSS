// FormSelect — the plugin REPLACES the native <select> with a generated
// .field + <menu>. Un-enhanced it renders as garbled overlapping text (the
// floating label sits on top of the selected value), which is why an earlier
// sync withdrew this card. Initializing on mount fixes it at the root: the
// card then shows the enhanced control the framework actually ships.
//
// The interesting half of a Select is its open menu, and the instance exposes
// the Menu it built (`inst.menu`), so two cells open it — still the real
// component driving itself, never a drawn stand-in.
import { useEffect, useRef } from 'react';

const useFormSelect = (open: boolean) => {
  const ref = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    const el = ref.current;
    const S = (window as any).Expressive?.FormSelect;
    if (!el || !S) return;
    const inst: any = S.init(el);
    if (open) {
      try {
        inst?.menu?.open?.();
      } catch {
        /* menu not built yet — the closed field is still a true render */
      }
    }
    return () => {
      try {
        inst?.destroy?.();
      } catch {
        /* already torn down */
      }
    };
  }, [open]);
  return ref;
};

const Select = ({
  id,
  label,
  children,
  multiple,
  open = false,
  value,
  height = 96,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  multiple?: boolean;
  open?: boolean;
  value?: string | string[];
  height?: number;
}) => {
  const ref = useFormSelect(open);
  return (
    <div style={{ height, maxWidth: 320 }}>
      <div className="field">
        <select
          id={id}
          ref={ref}
          multiple={multiple}
          defaultValue={value ?? (multiple ? [] : '')}
        >
          {children}
        </select>
        <label htmlFor={id}>{label}</label>
      </div>
    </div>
  );
};

const CABIN = (
  <>
    <option value="" disabled>
      Choose your option
    </option>
    <option value="economy">Economy</option>
    <option value="premium">Premium economy</option>
    <option value="business">Business</option>
  </>
);

export const Chosen = () => (
  <Select id="fs-single" label="Cabin class" value="business">
    {CABIN}
  </Select>
);

export const MenuOpen = () => (
  <Select id="fs-open" label="Cabin class" open height={300}>
    {CABIN}
  </Select>
);

export const Optgroups = () => (
  <Select id="fs-groups" label="Assign to" open height={340}>
    <optgroup label="Design">
      <option value="dana">Dana Whitfield</option>
      <option value="ines">Inés Márquez</option>
    </optgroup>
    <optgroup label="Engineering">
      <option value="theo">Theo Park</option>
      <option value="rafi">Rafi Osman</option>
    </optgroup>
  </Select>
);

export const Multiple = () => (
  <Select
    id="fs-multi"
    label="Meal preferences"
    multiple
    value={['vegetarian', 'gluten-free']}
  >
    <option value="vegetarian">Vegetarian</option>
    <option value="vegan">Vegan</option>
    <option value="gluten-free">Gluten free</option>
  </Select>
);
