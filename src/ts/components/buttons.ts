import { Component, BaseOptions, InitElements, InitElement, Openable } from "../core/component";
import { Utils } from '../core/utils';

export type FloatingActionButtonOptions = BaseOptions;

const _defaults: FloatingActionButtonOptions = {};

export class FloatingActionButton
  extends Component<FloatingActionButtonOptions>
  implements Openable
{
  isOpen: boolean;
  private _anchor: HTMLElement | null;
  private _list: HTMLElement | null;
  private _listWasInert: boolean;

  constructor(el: HTMLElement, options: Partial<FloatingActionButtonOptions>) {
    super(el, options, FloatingActionButton);
    this.el['Expressive_FloatingActionButton'] = this;
    this.options = { ...FloatingActionButton.defaults, ...options };
    this.isOpen = false;
    this._anchor = this.el.querySelector(':scope > a, :scope > button');
    this._list = this.el.querySelector(':scope > ul, :scope > menu');
    this._listWasInert = this._list?.inert ?? false;
    this.el.classList.remove('active');
    if (this._list) this._list.inert = true;
    this._anchor?.setAttribute('aria-expanded', 'false');
    if (this._anchor instanceof HTMLAnchorElement && !this._anchor.hasAttribute('href')) {
      if (this._anchor.tabIndex < 0) this._anchor.tabIndex = 0;
      this._anchor.addEventListener('keydown', this._handleAnchorKeydown);
    }
    this.el.addEventListener('click', this._handleFABClick);
  }

  static get defaults() {
    return _defaults;
  }

  static init(el: HTMLElement, options?: Partial<FloatingActionButtonOptions>): FloatingActionButton;
  static init(els: InitElements<InitElement>, options?: Partial<FloatingActionButtonOptions>): FloatingActionButton[];
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
    if (this._list) this._list.inert = this._listWasInert;
    this.el.removeEventListener('click', this._handleFABClick);
    this._anchor?.removeEventListener('keydown', this._handleAnchorKeydown);
    this.el['Expressive_FloatingActionButton'] = undefined;
  }

  open = (): void => {
    if (this.isOpen) return;
    this.isOpen = true;
    if (this._list) this._list.inert = false;
    this.el.classList.add('active');
    this._anchor?.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', this._handleDocumentClick);
    document.addEventListener('keydown', this._handleDocumentKeydown);
  };

  close = (): void => {
    if (!this.isOpen) return;
    const focused = (this.el.getRootNode() as Document | ShadowRoot).activeElement;
    if (focused && this._list?.contains(focused)) this._anchor?.focus();
    if (this._list) this._list.inert = true;
    this.isOpen = false;
    this.el.classList.remove('active');
    this._anchor?.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', this._handleDocumentClick);
    document.removeEventListener('keydown', this._handleDocumentKeydown);
  };

  private _handleFABClick = (e: MouseEvent) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const control = target.closest('a, button');
    if (!control || control.matches(':disabled, [aria-disabled="true"]')) return;
    if (control === this._anchor) this._toggle();
    else if (this._list?.contains(control)) this.close();
  };

  private _handleAnchorKeydown = (e: KeyboardEvent) => {
    if (e.key === Utils.keys.ENTER || e.key === ' ') {
      e.preventDefault();
      this._toggle();
    }
  };

  private _handleDocumentKeydown = (e: KeyboardEvent) => {
    if (e.key === Utils.keys.ESC && !e.defaultPrevented) this.close();
  };

  private _handleDocumentClick = (e: MouseEvent) => {
    if (e.composedPath().includes(this.el)) return;
    this.close();
  };

  private _toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }
}
