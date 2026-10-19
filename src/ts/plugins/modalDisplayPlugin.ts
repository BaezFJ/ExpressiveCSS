import { DockedDisplayPlugin, DockedDisplayPluginOptions } from './dockedDisplayPlugin';

/**
 * Shows a picker in a modal <dialog>, which the dialog styles draw as a
 * basic dialog over a scrim. The browser keeps focus inside it. Escape or a
 * press on the scrim closes it, and the picker hears that as Cancel; the
 * picker closes it itself through hide() on Ok or Cancel. Focus goes back
 * to the field that opened it.
 */
export class ModalDisplayPlugin {
  /** The fields that open the dialog, as DockedDisplayPlugin keeps them. */
  readonly triggers: HTMLElement[];
  private readonly dialog: HTMLDialogElement;
  private readonly onDismiss: () => void;
  /** Whether the picker, not the user, is closing the dialog. */
  private _settled = false;
  private _opener: HTMLElement | null = null;

  constructor(el: HTMLElement, container: HTMLElement, onDismiss: () => void) {
    this.triggers = [el];
    this.onDismiss = onDismiss;
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'display-modal';
    const label = (el as HTMLInputElement).labels?.[0]?.textContent.trim() || el.getAttribute('aria-label');
    if (label) this.dialog.setAttribute('aria-label', label);
    this.dialog.append(container);
    el.parentElement.append(this.dialog);
    this.dialog.addEventListener('click', this._handleClick);
    this.dialog.addEventListener('close', this._handleClose);
  }

  /**
   * Initializes instance of ModalDisplayPlugin
   * @param el The field that opens the picker
   * @param container The picker
   * @param onDismiss Runs when the user closes the dialog without Ok or Cancel
   */
  static init(el: HTMLElement, container: HTMLElement, onDismiss: () => void): ModalDisplayPlugin {
    return new ModalDisplayPlugin(el, container, onDismiss);
  }

  /** The picker fills the dialog, so a press on the dialog itself is on the scrim. */
  private _handleClick = (e: MouseEvent) => {
    if (e.target === this.dialog) this.dialog.close();
  };

  private _handleClose = () => {
    const dismissed = !this._settled;
    this._settled = false;
    this._opener?.focus({ preventScroll: true });
    if (dismissed) this.onDismiss();
  };

  destroy = () => {
    this.dialog.removeEventListener('click', this._handleClick);
    this.dialog.removeEventListener('close', this._handleClose);
    this.dialog.remove();
  };

  show = () => {
    if (this.dialog.open) return;
    const root = this.dialog.getRootNode() as Document | ShadowRoot;
    this._opener = root.activeElement as HTMLElement | null;
    this.dialog.showModal();
  };

  hide = () => {
    if (!this.dialog.open) return;
    this._settled = true;
    this.dialog.close();
  };
}

export type DisplayPlugin = DockedDisplayPlugin | ModalDisplayPlugin;

/**
 * The display plugin a picker's `displayPlugin` option names: 'docked',
 * 'modal', or none for an inline picker. `onDismiss` is the picker's Cancel.
 */
export function createDisplayPlugin(
  type: string | null,
  el: HTMLElement,
  container: HTMLElement,
  options: Partial<DockedDisplayPluginOptions>,
  onDismiss: () => void
): DisplayPlugin | undefined {
  if (type === 'modal') return ModalDisplayPlugin.init(el, container, onDismiss);
  if (type === 'docked') return DockedDisplayPlugin.init(el, container, options);
  return undefined;
}

/** Ok and Cancel close a modal picker; a docked one stays until a click outside. */
export function hideModal(plugin: DisplayPlugin | undefined) {
  if (plugin instanceof ModalDisplayPlugin) plugin.hide();
}
