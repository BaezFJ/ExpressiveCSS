import {
  AutoInit,
  ButtonGroup,
  FloatingActionButton,
  NavigationRail,
  Snackbar,
  type SnackbarOptions,
} from "@expressivecss/expressive/modular";

export function start(root: HTMLElement = document.body) {
  AutoInit(root);

  const rail = NavigationRail.getInstance(root.querySelector<HTMLElement>(".navigation-rail")!);
  const alignment = ButtonGroup.getInstance(root.querySelector<HTMLElement>(".button-group")!);
  const create = FloatingActionButton.getInstance(root.querySelector<HTMLElement>(".fab-menu")!);
  const saved: Partial<SnackbarOptions> = { text: "Saved", action: "Undo" };

  return { rail, alignment, create, saved: new Snackbar(saved) };
}
