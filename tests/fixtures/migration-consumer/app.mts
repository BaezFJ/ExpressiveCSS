import {
  AutoInit,
  ButtonGroup,
  DataTables,
  Dialogs,
  FloatingActionButton,
  FormSelect,
  NavigationRail,
  Snackbar,
  Tooltip,
  type ConfirmOptions,
  type DatepickerOptions,
  type SnackbarOptions,
  type TimepickerOptions,
} from "@expressivecss/expressive/modular";
import { DataTables as RootDataTables } from "@expressivecss/expressive";

export function checkTablePageContract(wrapper: HTMLElement): boolean[] {
  const state = Object.freeze({ page: 2, pageSize: 20, total: 87 });
  const accepted: boolean = DataTables.setPage(wrapper, state);
  const reset: boolean = RootDataTables.setPage(wrapper, null);
  // @ts-expect-error Page state accepts numeric fields only.
  DataTables.setPage(wrapper, { page: '2', pageSize: 20, total: 87 });
  return [accepted, reset];
}

export const manualDatepicker: Partial<DatepickerOptions> = { autoSubmit: false };
export const manualTimepicker: Partial<TimepickerOptions> = { autoSubmit: false };
export const legacySelectOptions: ConstructorParameters<typeof FormSelect>[1] = { classes: "", menuOptions: {} };
const deleteQuestion: ConfirmOptions = { headline: "Delete draft?", text: "The draft is removed.", confirm: "Delete" };
export const confirmDelete = (): Promise<boolean> => Dialogs.confirm(deleteQuestion);

export function checkTooltipContract(tooltip: Tooltip) {
  tooltip.open();
  tooltip.open(true);
  tooltip.open(false);
}

export function start(root: HTMLElement = document.body) {
  AutoInit(root);

  const rail = NavigationRail.getInstance(root.querySelector<HTMLElement>(".navigation-rail")!);
  const alignment = ButtonGroup.getInstance(root.querySelector<HTMLElement>(".button-group")!);
  const create = FloatingActionButton.getInstance(root.querySelector<HTMLElement>(".fab-menu")!);
  const saved: Partial<SnackbarOptions> = { text: "Saved", action: "Undo" };

  return { rail, alignment, create, saved: new Snackbar(saved) };
}
