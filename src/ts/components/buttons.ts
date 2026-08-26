import { Component, BaseOptions, InitElements, InitElement, Openable } from "../core/component";
import { Utils } from '../core/utils';

export interface FloatingActionButtonOptions extends BaseOptions {
  /**
   * Direction FAB menu opens.
   * @default "top"
   */
  direction: 'top' | 'right' | 'bottom' | 'left';
  /**
   * true: FAB menu appears on hover (CSS, when the pointer can hover).
   * false: FAB menu toggles on click. `.click-to-toggle` is the markup switch.
   * @default true
   */
  hoverEnabled: boolean;
  /**
   * Expand the FAB into a toolbar on click. Prefer a hover or click menu.
   * `.toolbar` on the element is the markup switch.
   * @default false
   */
  toolbarEnabled: boolean;
}

const _defaults: FloatingActionButtonOptions = {
  direction: 'top',
  hoverEnabled: true,
  toolbarEnabled: false
};

/**
 * Speed dial around a FAB. Open/close is the `.active` class; motion is
 * CSS. Hover is CSS (`:hover` when the pointer can hover). This class
 * toggles the class, wires keyboard / click-outside, and stamps direction.
 *
 * `.fab-menu` runs on the same instance: expanded state is one class and one
 * `aria-expanded`, whichever host it is written on, and the two differ only
 * in their Sass. The direction and hover options are inert there - the FAB
 * menu opens upward and on click, both decided in CSS.
 */
export class FloatingActionButton
  extends Component<FloatingActionButtonOptions>
  implements Openable
{
  isOpen: boolean;

  private _anchor: HTMLElement | null;

  constructor(el: HTMLElement, options: Partial<FloatingActionButtonOptions>) {
    super(el, options, FloatingActionButton);
    this.el['Expressive_FloatingActionButton'] = this;

    const fromMarkup = this._directionFromClass();
    const toolbar = el.classList.contains('toolbar') || options.toolbarEnabled === true;
    const clickToToggle =
      el.classList.contains('click-to-toggle') || options.hoverEnabled === false;

    this.options = {
      ...FloatingActionButton.defaults,
      ...options,
      direction: options.direction ?? fromMarkup ?? FloatingActionButton.defaults.direction,
      hoverEnabled: !clickToToggle,
      toolbarEnabled: toolbar
    };

    this.isOpen = false;
    this._anchor = this.el.querySelector(':scope > a, :scope > button');

    this.el.classList.add(`direction-${this.options.direction}`);
    if (clickToToggle) this.el.classList.add('click-to-toggle');
    if (toolbar) this.el.classList.add('toolbar');

    if (this._anchor) {
      // `aria-expanded` and nothing more. `aria-haspopup="menu"` and
      // `role="menu"` on the list used to go with it, and both were a promise
      // this component does not keep: a menu is a composite widget whose items
      // are reached with the arrow keys, and there is no such keyboard model
      // here (SEMANTICS rule 2). The list is a list of controls reached with
      // Tab, and the trigger is a disclosure.
      this._anchor.setAttribute('aria-expanded', 'false');
      if (
        this._anchor instanceof HTMLAnchorElement &&
        !this._anchor.hasAttribute('href') &&
        this._anchor.tabIndex < 0
      ) {
        this._anchor.tabIndex = 0;
      }
    }
    this._setupEventHandlers();
  }

  static get defaults() {
    return _defaults;
  }

  static init(
    el: HTMLElement,
    options?: Partial<FloatingActionButtonOptions>
  ): FloatingActionButton;
  static init(
    els: InitElements<InitElement>,
    options?: Partial<FloatingActionButtonOptions>
  ): FloatingActionButton[];
  static init(
    els: HTMLElement | InitElements<InitElement>,
    options: Partial<FloatingActionButtonOptions> = {}
  ): FloatingActionButton | FloatingActionButton[] {
    return super.init(els, options, FloatingActionButton);
  }

  static getInstance(el: HTMLElement): FloatingActionButton {
    return el['Expressive_FloatingActionButton'];
  }

  destroy() {
    this.close();
    this._removeEventHandlers();
    this.el['Expressive_FloatingActionButton'] = undefined;
  }

  /**
   * Open FAB.
   */
  open = (): void => {
    if (this.isOpen) return;
    this.isOpen = true;
    this.el.classList.add('active');
    this._anchor?.setAttribute('aria-expanded', 'true');
    // The trigger click is stopPropagation'd, so it is not also an outside click.
    document.addEventListener('click', this._handleDocumentClick);
    document.addEventListener('keydown', this._handleDocumentKeydown);
  };

  /**
   * Close FAB.
   */
  close = (): void => {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.remove('active');
    this._anchor?.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', this._handleDocumentClick);
    document.removeEventListener('keydown', this._handleDocumentKeydown);
  };

  private _directionFromClass(): FloatingActionButtonOptions['direction'] | null {
    const match = [...this.el.classList].find((c) => c.startsWith('direction-'));
    const value = match?.slice('direction-'.length);
    if (value === 'top' || value === 'right' || value === 'bottom' || value === 'left') {
      return value;
    }
    return null;
  }

  private _setupEventHandlers() {
    this.el.addEventListener('click', this._handleFABClick);
    if (this._anchor instanceof HTMLAnchorElement && !this._anchor.hasAttribute('href')) {
      this._anchor.addEventListener('keydown', this._handleAnchorKeydown);
    }
  }

  private _removeEventHandlers() {
    this.el.removeEventListener('click', this._handleFABClick);
    this._anchor?.removeEventListener('keydown', this._handleAnchorKeydown);
  }

  private _handleFABClick = (e: MouseEvent) => {
    e.stopPropagation();
    this._toggle();
  };

  private _handleAnchorKeydown = (e: KeyboardEvent) => {
    if (e.key === Utils.keys.ENTER || e.key === ' ') {
      e.preventDefault();
      this._toggle();
    }
  };

  private _handleDocumentKeydown = (e: KeyboardEvent) => {
    if (e.key === Utils.keys.ESC) this.close();
  };

  private _handleDocumentClick = (e: MouseEvent) => {
    const target = e.target;
    if (!(target instanceof Node) || this.el.contains(target)) return;
    this.close();
  };

  private _toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }
}
